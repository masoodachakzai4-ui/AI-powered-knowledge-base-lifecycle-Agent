import {
  ChatMessage,
  Conversation,
  DocumentRecord,
  InstitutionType,
  KnowledgeArticle,
  KnowledgeChunk,
  LifecycleProposal,
  ReviewTask,
  SourceCitation,
  UnansweredQuestion,
  WorkflowRun,
  WorkflowStage,
} from '../types/domain';
import {
  cleanId,
  createNotification,
  logAuditAction,
  updateWorkspaceDoc,
  writeWorkspaceDoc,
} from './firestoreService';

export async function extractUploadedFileViaServer(file: File): Promise<{
  extractedText: string;
  requiresOcr: boolean;
  detectedLanguage: string;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  const base64Data = btoa(binary);

  const response = await fetch('/api/documents/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      base64Data,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to extract document text on server.');
  }

  return response.json();
}

function cleanUndefinedFields<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      out[k] = v;
    }
  }
  return out as T;
}

/**
 * Executes the sequential 4-AI-Agent + Stage 05 Human Reviewer pipeline via the backend
 * sequential workflow engine (`POST /api/workflow-runs/start` + `GET /api/workflow-runs/:runId`)
 * and persists every stage event, chunk, verification report, and Stage 05 Human Review task
 * in real time.
 */
export async function executeSequentialAgentPipeline(params: {
  ownerId: string;
  institutionId: string;
  institutionType: InstitutionType;
  document: DocumentRecord;
  existingDocumentTitles: string[];
  actorName: string;
  simulateUnsupportedClaimTest?: boolean;
  onLiveEvent?: (events: Array<{ id: string; timestamp: string; stageNumber: number; status: string; message: string }>) => void;
}): Promise<{ runId: string; articleId?: string }> {
  const runId = cleanId('run');
  const now = new Date().toISOString();

  // Start workflow on backend sequential engine
  const startRes = await fetch('/api/workflow-runs/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      runId,
      ownerId: params.ownerId,
      institutionId: params.institutionId,
      institutionType: params.institutionType,
      document: params.document,
      existingDocumentTitles: params.existingDocumentTitles,
      simulateUnsupportedClaimTest: Boolean(params.simulateUnsupportedClaimTest),
    }),
  });

  if (!startRes.ok) {
    const errData = await startRes.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to start workflow run on backend.');
  }

  const initialBackendRun = await startRes.json();

  // Initialize WorkflowRun
  const initialRun: WorkflowRun = cleanUndefinedFields({
    id: runId,
    ownerId: params.ownerId,
    institutionId: params.institutionId,
    documentId: params.document.id,
    documentTitle: params.document.title.slice(0, 300),
    currentStage: 1,
    currentStageName: 'STAGE 01: ORCHESTRATOR AGENT',
    status: 'QUEUED',
    progressPercent: 5,
    revisionRound: 0,
    retryCount: 0,
    submittedAt: initialBackendRun.submittedAt || now,
    startedAt: initialBackendRun.startedAt || now,
  });

  await writeWorkspaceDoc('workflow_runs', runId, initialRun);
  await updateWorkspaceDoc('documents', params.document.id, {
    status: 'PROCESSING',
    updatedAt: now,
  });

  // Initialize all 5 stage records
  const backendStages: any[] = Array.isArray(initialBackendRun.stages) ? initialBackendRun.stages : [];
  for (const bStg of backendStages) {
    const stageRecord: WorkflowStage = cleanUndefinedFields({
      id: bStg.id || `stg${bStg.stageNumber}_${runId}`,
      ownerId: params.ownerId,
      institutionId: params.institutionId,
      runId,
      stageNumber: bStg.stageNumber,
      stageName: bStg.stageName,
      status: bStg.status || (bStg.stageNumber === 1 ? 'QUEUED' : 'NOT_STARTED'),
      outputSummary: bStg.outputSummary || 'Waiting for previous stage to complete.',
      inputReference: bStg.inputReference,
      outputReference: bStg.outputReference,
      retryCount: bStg.retryCount || 0,
      revisionCount: bStg.revisionCount || 0,
      startedAt: bStg.startedAt || now,
    });
    await writeWorkspaceDoc('workflow_stages', stageRecord.id, stageRecord);
  }

  await logAuditAction({
    ownerId: params.ownerId,
    institutionId: params.institutionId,
    actorName: params.actorName || 'Stage 01 — Orchestrator Agent',
    actorType: 'AI_AGENT',
    action: 'STARTED_SEQUENTIAL_WORKFLOW_RUN',
    targetType: 'WorkflowRun',
    targetId: runId,
    targetTitle: params.document.title,
    previousStatus: params.document.status,
    newStatus: 'RUNNING',
    reason: `Initiated 5-stage sequential knowledge processing for "${params.document.title}".`,
    workflowRunId: runId,
  });

  // Poll backend GET /api/workflow-runs/:runId until terminal or Stage 05 Human Review gate
  let latestRunState: any = initialBackendRun;
  const maxPolls = 180; // up to ~150 seconds for multi-agent + revision loops
  for (let pollIdx = 0; pollIdx < maxPolls; pollIdx++) {
    await new Promise((r) => setTimeout(r, 850));

    const pollRes = await fetch(`/api/workflow-runs/${runId}`);
    if (!pollRes.ok) continue;
    latestRunState = await pollRes.json();

    if (params.onLiveEvent && Array.isArray(latestRunState.events)) {
      params.onLiveEvent(latestRunState.events);
    }

    // Sync each stage
    if (Array.isArray(latestRunState.stages)) {
      for (const bStg of latestRunState.stages) {
        const stgDocId = bStg.id || `stg${bStg.stageNumber}_${runId}`;
        await updateWorkspaceDoc(
          'workflow_stages',
          stgDocId,
          cleanUndefinedFields({
            status: bStg.status,
            outputSummary: (bStg.outputSummary || '').slice(0, 4800),
            detailsJson: bStg.detailsJson ? String(bStg.detailsJson).slice(0, 48000) : undefined,
            inputReference: bStg.inputReference ? String(bStg.inputReference).slice(0, 1900) : undefined,
            outputReference: bStg.outputReference ? String(bStg.outputReference).slice(0, 1900) : undefined,
            errorMessage: bStg.errorMessage ? String(bStg.errorMessage).slice(0, 1900) : undefined,
            retryCount: Number(bStg.retryCount || 0),
            revisionCount: Number(bStg.revisionCount || 0),
            durationMs: bStg.durationMs !== undefined ? Number(bStg.durationMs) : undefined,
            startedAt: bStg.startedAt || now,
            completedAt: bStg.completedAt,
          })
        );
      }
    }

    // Sync WorkflowRun header
    await updateWorkspaceDoc(
      'workflow_runs',
      runId,
      cleanUndefinedFields({
        articleId: latestRunState.articleId,
        currentStage: latestRunState.currentStage,
        currentStageName: latestRunState.currentStageName,
        status: latestRunState.status,
        progressPercent: latestRunState.progressPercent,
        revisionRound: latestRunState.revisionRound || 0,
        retryCount: latestRunState.retryCount || 0,
        errorMessage: latestRunState.errorMessage ? String(latestRunState.errorMessage).slice(0, 1900) : undefined,
        completedAt: latestRunState.completedAt,
      })
    );

    const terminalOrReviewStatuses = [
      'WAITING_FOR_HUMAN_REVIEW',
      'ACTION_REQUIRED',
      'FAILED',
      'APPROVED',
      'REJECTED',
      'COMPLETED',
    ];
    if (terminalOrReviewStatuses.includes(latestRunState.status)) {
      break;
    }
  }

  // If Stage 01 halted on invalid / OCR-required document or pipeline failed
  if (latestRunState.status === 'FAILED') {
    const isOcr = (latestRunState.errorMessage || '').toLowerCase().includes('ocr') || params.document.status === 'OCR_REQUIRED';
    await updateWorkspaceDoc('documents', params.document.id, {
      status: isOcr ? 'OCR_REQUIRED' : 'FAILED',
      updatedAt: new Date().toISOString(),
    });
    await logAuditAction({
      ownerId: params.ownerId,
      institutionId: params.institutionId,
      actorName: `Stage 0${latestRunState.currentStage || 1} Agent`,
      actorType: 'AI_AGENT',
      action: 'WORKFLOW_RUN_HALTED_ON_ERROR',
      targetType: 'Document',
      targetId: params.document.id,
      targetTitle: params.document.title,
      previousStatus: 'PROCESSING',
      newStatus: isOcr ? 'OCR_REQUIRED' : 'FAILED',
      reason: latestRunState.errorMessage || 'Workflow halted due to validation or processing error.',
      workflowRunId: runId,
    });
    return { runId };
  }

  // Persist generated chunks, article, review task, and lifecycle proposal when Stage 05 is reached
  if (Array.isArray(latestRunState.generatedChunks)) {
    for (const ch of latestRunState.generatedChunks) {
      const chunkRecord: KnowledgeChunk = cleanUndefinedFields({
        id: ch.id || cleanId('chunk'),
        ownerId: params.ownerId,
        institutionId: params.institutionId,
        documentId: params.document.id,
        documentTitle: (ch.documentTitle || params.document.title).slice(0, 300),
        sectionTitle: (ch.sectionTitle || 'Policy Section').slice(0, 300),
        content: (ch.content || '').slice(0, 18000),
        department: (ch.department || params.document.department || 'Admissions').slice(0, 120),
        category: (ch.category || params.document.category || 'Admission Policies').slice(0, 120),
        accessLevel: ch.accessLevel || params.document.accessLevel,
        isApproved: false, // Never approved until Stage 05 Human Reviewer approves!
        effectiveDate: (ch.effectiveDate || params.document.effectiveDate || now.slice(0, 10)).slice(0, 64),
        createdAt: ch.createdAt || new Date().toISOString(),
      });
      await writeWorkspaceDoc('knowledge_chunks', chunkRecord.id, chunkRecord);
    }
  }

  let savedArticleId: string | undefined;

  if (latestRunState.generatedArticle) {
    const rawArt = latestRunState.generatedArticle;
    savedArticleId = rawArt.id || cleanId('art');
    const articleRecord: KnowledgeArticle = cleanUndefinedFields({
      id: savedArticleId!,
      ownerId: params.ownerId,
      institutionId: params.institutionId,
      sourceDocumentId: params.document.id,
      sourceDocumentTitle: params.document.title.slice(0, 300),
      title: (rawArt.title || params.document.title).slice(0, 300),
      summary: (rawArt.summary || 'AI-generated institutional knowledge article draft.').slice(0, 4000),
      contentMarkdown: (rawArt.contentMarkdown || '').slice(0, 190000),
      department: (rawArt.department || params.document.department || 'Admissions').slice(0, 120),
      category: (rawArt.category || params.document.category || 'Admission Policies').slice(0, 120),
      status: 'WAITING_FOR_HUMAN_APPROVAL',
      verificationStatus: rawArt.verificationStatus || 'VERIFIED',
      version: params.document.version || 1,
      effectiveDate: (rawArt.effectiveDate || params.document.effectiveDate || now.slice(0, 10)).slice(0, 64),
      expiryDate: rawArt.expiryDate ? String(rawArt.expiryDate).slice(0, 64) : undefined,
      reviewDate: rawArt.reviewDate ? String(rawArt.reviewDate).slice(0, 64) : undefined,
      accessLevel: params.document.accessLevel,
      sourceReferences: (rawArt.sourceReferences || 'Full Source Document').slice(0, 4500),
      faqsJson: String(rawArt.faqsJson || '[]').slice(0, 45000),
      verificationReportJson: String(rawArt.verificationReportJson || '{}').slice(0, 45000),
      isSampleData: Boolean(params.document.isSampleData),
      createdBy: 'Stage 03 — Knowledge Curator & Author Agent',
      createdAt: rawArt.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await writeWorkspaceDoc('knowledge_articles', articleRecord.id, articleRecord);

    if (latestRunState.generatedReviewTask) {
      const rt = latestRunState.generatedReviewTask;
      const reviewTask: ReviewTask = cleanUndefinedFields({
        id: rt.id || cleanId('rev'),
        ownerId: params.ownerId,
        institutionId: params.institutionId,
        articleId: articleRecord.id,
        documentId: params.document.id,
        runId,
        articleTitle: articleRecord.title,
        department: articleRecord.department,
        category: articleRecord.category,
        verificationStatus: articleRecord.verificationStatus,
        status: 'PENDING_REVIEW',
        createdAt: rt.createdAt || new Date().toISOString(),
      });
      await writeWorkspaceDoc('review_tasks', reviewTask.id, reviewTask);
    }

    if (latestRunState.generatedLifecycleProposal) {
      const lp = latestRunState.generatedLifecycleProposal;
      const createProposal: LifecycleProposal = cleanUndefinedFields({
        id: lp.id || cleanId('prop'),
        ownerId: params.ownerId,
        institutionId: params.institutionId,
        articleId: articleRecord.id,
        documentId: params.document.id,
        targetTitle: articleRecord.title,
        department: articleRecord.department,
        actionType: lp.actionType || (params.document.version > 1 ? 'UPDATE' : 'CREATE'),
        reason: (lp.reason || `New institutional knowledge article generated and verified from "${params.document.title}".`).slice(0, 3800),
        diffSummary: (lp.diffSummary || 'Verified policy statements against source document.').slice(0, 18000),
        status: 'PENDING_APPROVAL',
        createdAt: lp.createdAt || new Date().toISOString(),
      });
      await writeWorkspaceDoc('lifecycle_proposals', createProposal.id, createProposal);
    }

    await updateWorkspaceDoc('documents', params.document.id, {
      department: articleRecord.department,
      category: articleRecord.category,
      effectiveDate: articleRecord.effectiveDate,
      status: 'PROCESSED',
      updatedAt: new Date().toISOString(),
    });

    await createNotification({
      ownerId: params.ownerId,
      institutionId: params.institutionId,
      title: 'Stage 05 Human Approval Required',
      message: `AI pipeline finished verifying "${articleRecord.title}" (${articleRecord.verificationStatus}). Please review and approve in Human Review Workspace.`,
      type: 'REVIEW_REQUIRED',
    });

    await logAuditAction({
      ownerId: params.ownerId,
      institutionId: params.institutionId,
      actorName: 'Stage 04 — Knowledge Verifier Agent',
      actorType: 'AI_AGENT',
      action: 'COMPLETED_AI_STAGES_01_TO_04',
      targetType: 'KnowledgeArticle',
      targetId: articleRecord.id,
      targetTitle: articleRecord.title,
      previousStatus: 'AI-SUGGESTED / DRAFT',
      newStatus: 'WAITING_FOR_HUMAN_APPROVAL',
      reason: `Verification status: ${articleRecord.verificationStatus} after ${latestRunState.revisionRound || 0} revision round(s).`,
      workflowRunId: runId,
    });
  }

  return { runId, articleId: savedArticleId };
}

/**
 * Queries the RAG Knowledge Assistant using only APPROVED and non-retired chunks permitted for the user's role.
 */
export async function askKnowledgeAssistant(params: {
  ownerId: string;
  institutionId: string;
  institutionName: string;
  userId: string;
  userRole: string;
  question: string;
  conversationId?: string;
  approvedChunks: KnowledgeChunk[];
  publishedArticles: KnowledgeArticle[];
}): Promise<{
  conversationId: string;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  citations: SourceCitation[];
  isAnswered: boolean;
}> {
  const now = new Date().toISOString();
  let convId = params.conversationId;

  if (!convId) {
    convId = cleanId('conv');
    const conv: Conversation = {
      id: convId,
      ownerId: params.ownerId,
      institutionId: params.institutionId,
      userId: params.userId,
      title: params.question.slice(0, 80),
      createdAt: now,
      updatedAt: now,
    };
    await writeWorkspaceDoc('conversations', convId, conv);
  }

  const userMsgId = cleanId('msg');
  const userMessage: ChatMessage = {
    id: userMsgId,
    ownerId: params.ownerId,
    institutionId: params.institutionId,
    conversationId: convId,
    role: 'user',
    content: params.question.slice(0, 4000),
    createdAt: now,
  };
  await writeWorkspaceDoc('chat_messages', userMsgId, userMessage);

  // Filter approved chunks by role permission and active published articles
  const publishedByDocId = new Map<string, KnowledgeArticle>();
  for (const art of params.publishedArticles) {
    if (art.status === 'PUBLISHED') {
      publishedByDocId.set(art.sourceDocumentId, art);
    }
  }

  const permittedChunks = params.approvedChunks
    .filter((chunk) => {
      if (!chunk.isApproved) return false;
      const art = publishedByDocId.get(chunk.documentId);
      if (!art || art.status !== 'PUBLISHED') return false;
      if (params.userRole === 'Student' && chunk.accessLevel === 'ADMIN_GOVERNANCE') return false;
      if (params.userRole === 'Student' && chunk.accessLevel === 'FACULTY_STAFF') return false;
      if (params.userRole === 'Parent / Guardian' && chunk.accessLevel !== 'PUBLIC_STUDENT' && chunk.accessLevel !== 'PARENT_GUARDIAN') {
        return false;
      }
      return true;
    })
    .map((chunk) => {
      const art = publishedByDocId.get(chunk.documentId);
      return {
        id: chunk.id,
        articleId: art?.id || chunk.articleId,
        articleTitle: art?.title || chunk.documentTitle,
        documentTitle: chunk.documentTitle,
        sectionTitle: chunk.sectionTitle,
        content: chunk.content,
        department: chunk.department,
        category: chunk.category,
        effectiveDate: art?.effectiveDate || chunk.effectiveDate,
      };
    });

  const response = await fetch('/api/assistant/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: params.question,
      userRole: params.userRole,
      institutionName: params.institutionName,
      approvedChunks: permittedChunks,
    }),
  });

  if (!response.ok) {
    const errPayload = await response.json().catch(() => ({}));
    throw new Error(
      errPayload.error ||
        (response.status === 429
          ? 'AI Quota Exceeded (HTTP 429 RESOURCE_EXHAUSTED). Please switch AI provider or model in Settings.'
          : 'Failed to query Knowledge Assistant.')
    );
  }

  const data = await response.json();
  const citations: SourceCitation[] = Array.isArray(data.citations) ? data.citations : [];

  const asstMsgId = cleanId('msg');
  const assistantMessage: ChatMessage = {
    id: asstMsgId,
    ownerId: params.ownerId,
    institutionId: params.institutionId,
    conversationId: convId,
    role: 'assistant',
    content: (data.answer || '').slice(0, 45000),
    citationsJson: JSON.stringify(citations).slice(0, 19000),
    createdAt: new Date().toISOString(),
  };
  await writeWorkspaceDoc('chat_messages', asstMsgId, assistantMessage);

  // If unanswered, automatically log in unanswered_questions for administrators
  if (!data.isAnswered) {
    const uqId = cleanId('uq');
    const uq: UnansweredQuestion = {
      id: uqId,
      ownerId: params.ownerId,
      institutionId: params.institutionId,
      question: params.question.slice(0, 1900),
      askedByRole: params.userRole.slice(0, 64),
      departmentSuggested: (data.suggestedDepartment || 'Admissions').slice(0, 120),
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };
    await writeWorkspaceDoc('unanswered_questions', uqId, uq);
  }

  return {
    conversationId: convId,
    userMessage,
    assistantMessage,
    citations,
    isAnswered: Boolean(data.isAnswered),
  };
}

export async function fetchAIProviderConfig() {
  const res = await fetch('/api/ai-config');
  if (!res.ok) throw new Error('Failed to load AI provider configuration');
  return res.json();
}

export async function saveAIProviderConfig(config: {
  primaryProvider?: 'openrouter' | 'gemini';
  backupProvider?: 'openrouter' | 'gemini' | 'none';
  openRouterModel?: string;
  geminiModel?: string;
}) {
  const res = await fetch('/api/ai-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Failed to update AI provider configuration');
  return res.json();
}

export async function resetAIProviderQuota() {
  const res = await fetch('/api/ai-config/reset-quota', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset AI quota status');
  return res.json();
}

export async function generateVersionComparisonProposal(params: {
  ownerId: string;
  institutionId: string;
  document: DocumentRecord;
  article?: KnowledgeArticle;
  oldVersionText: string;
  newVersionText: string;
  actorName: string;
}): Promise<LifecycleProposal> {
  const response = await fetch('/api/lifecycle/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentTitle: params.document.title,
      department: params.document.department,
      oldVersionText: params.oldVersionText,
      newVersionText: params.newVersionText,
    }),
  });

  if (!response.ok) {
    const errPayload = await response.json().catch(() => ({}));
    throw new Error(
      errPayload.error ||
        (response.status === 429
          ? 'AI Quota Exceeded (HTTP 429 RESOURCE_EXHAUSTED). Please switch AI provider or model in Settings.'
          : 'Version comparison analysis failed.')
    );
  }

  const analysis = await response.json();
  const propId = cleanId('prop');
  const actionType = (['KEEP', 'UPDATE', 'RETIRE'].includes(analysis.actionType)
    ? analysis.actionType
    : 'UPDATE') as LifecycleProposal['actionType'];

  const proposal: LifecycleProposal = {
    id: propId,
    ownerId: params.ownerId,
    institutionId: params.institutionId,
    articleId: params.article?.id,
    documentId: params.document.id,
    targetTitle: params.document.title.slice(0, 300),
    department: params.document.department.slice(0, 120),
    actionType,
    reason: (analysis.reason || 'Detected policy revision between versions.').slice(0, 3800),
    diffSummary: (analysis.diffSummary || 'Changes detected across policy sections.').slice(0, 18000),
    oldVersionText: params.oldVersionText.slice(0, 90000),
    newVersionText: params.newVersionText.slice(0, 90000),
    status: 'PENDING_APPROVAL',
    createdAt: new Date().toISOString(),
  };

  await writeWorkspaceDoc('lifecycle_proposals', propId, proposal);

  await logAuditAction({
    ownerId: params.ownerId,
    institutionId: params.institutionId,
    actorName: params.actorName,
    actorType: 'AI_AGENT',
    action: `GENERATED_LIFECYCLE_${actionType}_PROPOSAL`,
    targetType: 'LifecycleProposal',
    targetId: propId,
    targetTitle: proposal.targetTitle,
    newStatus: 'PENDING_APPROVAL',
    reason: proposal.reason,
  });

  return proposal;
}
