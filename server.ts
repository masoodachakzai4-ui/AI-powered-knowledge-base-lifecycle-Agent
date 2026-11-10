import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  AI_MODELS,
  AIQuotaExceededError,
  analyzeDocumentLifecycleComparison,
  extractFileContent,
  generateTextEmbedding,
  getAIProviderStatus,
  isQuotaOrRateLimitError,
  NO_VERIFIED_INFO_MESSAGE,
  queryKnowledgeAssistantRAG,
  resetProviderQuotaFlags,
  runAuthorAgent,
  runOrchestratorAgent,
  runOrganizerAgent,
  runVerifierAgent,
  updateAIProviderConfig,
} from './src/server/services/geminiAgentService.ts';

dotenv.config({ override: true });

interface BackendStageState {
  id: string;
  runId: string;
  stageNumber: number;
  stageName: string;
  status: string;
  outputSummary: string;
  detailsJson?: string;
  inputReference?: string;
  outputReference?: string;
  errorMessage?: string;
  retryCount: number;
  revisionCount: number;
  durationMs?: number;
  startedAt: string;
  completedAt?: string;
}

interface BackendWorkflowRun {
  id: string;
  ownerId: string;
  institutionId: string;
  documentId: string;
  documentTitle: string;
  articleId?: string;
  currentStage: number;
  currentStageName: string;
  status: string;
  progressPercent: number;
  revisionRound: number;
  retryCount: number;
  errorMessage?: string;
  submittedAt: string;
  startedAt: string;
  completedAt?: string;
  stages: BackendStageState[];
  events: Array<{
    id: string;
    timestamp: string;
    stageNumber: number;
    status: string;
    message: string;
  }>;
  generatedChunks?: any[];
  generatedArticle?: any;
  generatedReviewTask?: any;
  generatedLifecycleProposal?: any;
}

async function executeWithSingleRetry<T>(
  fn: () => Promise<T>,
  onRetry: (err: unknown) => Promise<void>
): Promise<{ result: T; retryCount: number }> {
  try {
    const result = await fn();
    return { result, retryCount: 0 };
  } catch (firstErr) {
    // NEVER retry when daily quota or HTTP 429 rate-limit is exhausted
    if (isQuotaOrRateLimitError(firstErr)) {
      throw firstErr;
    }
    await onRetry(firstErr);
    const result = await fn();
    return { result, retryCount: 1 };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));

  const apiStore: {
    institutions: Record<string, any>;
    documents: Record<string, any>;
    documentVersions: any[];
    workflowRuns: Record<string, BackendWorkflowRun>;
    articles: Record<string, any>;
    proposals: Record<string, any>;
    unansweredQuestions: any[];
    auditLogs: any[];
    notifications: any[];
  } = {
    institutions: {},
    documents: {},
    documentVersions: [],
    workflowRuns: {},
    articles: {},
    proposals: {},
    unansweredQuestions: [],
    auditLogs: [],
    notifications: [],
  };

  // GET /api/health
  app.get('/api/health', (_req, res) => {
    const aiStatus = getAIProviderStatus();
    res.json({
      status: 'ok',
      service: 'AI-Powered Educational Knowledge Base Lifecycle Agent',
      models: {
        AGENT_TEXT: AI_MODELS.AGENT_TEXT,
        OPENROUTER_DEFAULT: AI_MODELS.OPENROUTER_DEFAULT,
        GEMINI_DEFAULT: AI_MODELS.GEMINI_DEFAULT,
        EMBEDDING: AI_MODELS.EMBEDDING,
      },
      aiProviderStatus: aiStatus,
      geminiConfigured: aiStatus.providers.gemini.configured,
      openRouterConfigured: aiStatus.providers.openrouter.configured,
      timestamp: new Date().toISOString(),
    });
  });

  // Configurable AI Provider & Model Selection Endpoints
  app.get('/api/ai-config', (_req, res) => {
    res.json(getAIProviderStatus());
  });

  app.post('/api/ai-config', (req, res) => {
    const updated = updateAIProviderConfig(req.body || {});
    res.json(updated);
  });

  app.post('/api/ai-config/reset-quota', (_req, res) => {
    res.json(resetProviderQuotaFlags());
  });

  // Institutions
  app.get('/api/institutions', (_req, res) => {
    res.json({ institutions: Object.values(apiStore.institutions) });
  });

  app.post('/api/institutions', (req, res) => {
    const inst = req.body;
    if (!inst || !inst.name) {
      res.status(400).json({ error: 'Institution name is required' });
      return;
    }
    const id = inst.id || `inst_${Date.now()}`;
    const record = { ...inst, id, createdAt: inst.createdAt || new Date().toISOString() };
    apiStore.institutions[id] = record;
    res.status(201).json(record);
  });

  // Dashboard Summary
  app.get('/api/dashboard/summary', (_req, res) => {
    const docs = Object.values(apiStore.documents);
    const articles = Object.values(apiStore.articles);
    const runs = Object.values(apiStore.workflowRuns);
    res.json({
      totalDocuments: docs.length,
      publishedArticles: articles.filter((a: any) => a.status === 'PUBLISHED').length,
      pendingReviews: articles.filter((a: any) => a.status === 'WAITING_FOR_HUMAN_APPROVAL').length,
      workflowRunsCount: runs.length,
    });
  });

  // Document Extraction
  app.post('/api/documents/extract', async (req, res) => {
    try {
      const { fileName, mimeType, base64Data, rawText } = req.body || {};
      if (!fileName) {
        res.status(400).json({ error: 'fileName is required' });
        return;
      }
      const extraction = await extractFileContent({
        fileName,
        mimeType: mimeType || 'text/plain',
        base64Data,
        rawText,
      });
      res.json(extraction);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Document extraction failed',
      });
    }
  });

  app.post('/api/documents', (req, res) => {
    const docRecord = req.body;
    if (!docRecord || !docRecord.title) {
      res.status(400).json({ error: 'Document title is required' });
      return;
    }
    const now = new Date().toISOString();
    if (docRecord.existingDocumentId && apiStore.documents[docRecord.existingDocumentId]) {
      const prev = apiStore.documents[docRecord.existingDocumentId];
      const nextVersion = Number(prev.version || 1) + 1;
      const updated = {
        ...prev,
        ...docRecord,
        id: prev.id,
        version: nextVersion,
        updatedAt: now,
      };
      apiStore.documents[prev.id] = updated;
      apiStore.documentVersions.push({
        id: `docver_${Date.now()}_v${nextVersion}`,
        documentId: prev.id,
        versionNumber: nextVersion,
        title: `${updated.title} (v${nextVersion}.0)`,
        extractedText: updated.extractedText || '',
        createdAt: now,
      });
      apiStore.auditLogs.push({
        id: `audit_${Date.now()}_docv`,
        action: 'UPLOADED_NEW_DOCUMENT_VERSION',
        targetType: 'Document',
        targetId: prev.id,
        targetTitle: updated.title,
        previousStatus: `v${prev.version || 1}`,
        newStatus: `v${nextVersion}`,
        createdAt: now,
      });
      res.status(200).json(updated);
      return;
    }

    const id = docRecord.id || `doc_${Date.now()}`;
    const version = Number(docRecord.version || 1);
    const saved = {
      ...docRecord,
      id,
      version,
      status: docRecord.status || 'UPLOADED',
      createdAt: docRecord.createdAt || now,
      updatedAt: now,
    };
    apiStore.documents[id] = saved;
    apiStore.documentVersions.push({
      id: `docver_${Date.now()}_v${version}`,
      documentId: id,
      versionNumber: version,
      title: `${saved.title} (v${version}.0)`,
      extractedText: saved.extractedText || '',
      createdAt: now,
    });
    apiStore.auditLogs.push({
      id: `audit_${Date.now()}_doc`,
      action: 'UPLOADED_INSTITUTIONAL_DOCUMENT',
      targetType: 'Document',
      targetId: id,
      targetTitle: saved.title,
      newStatus: saved.status,
      createdAt: now,
    });
    res.status(201).json(saved);
  });

  app.get('/api/documents', (_req, res) => {
    res.json({ documents: Object.values(apiStore.documents) });
  });

  app.get('/api/document-versions', (_req, res) => {
    res.json({ versions: apiStore.documentVersions });
  });

  app.get('/api/documents/:documentId', (req, res) => {
    const docRecord = apiStore.documents[req.params.documentId];
    if (!docRecord) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    res.json(docRecord);
  });

  // Individual stage endpoints (preserved)
  app.post('/api/agents/stage1-orchestrator', async (req, res) => {
    try {
      const { runId, documentId, documentTitle, extractedText, institutionType, fileType } = req.body || {};
      const result = await runOrchestratorAgent({
        runId,
        documentId: documentId || 'doc',
        documentTitle: documentTitle || 'Untitled Document',
        extractedText: extractedText || '',
        institutionType: institutionType || 'University',
        fileType,
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Stage 01 Orchestrator failed',
      });
    }
  });

  app.post('/api/agents/stage2-organizer', async (req, res) => {
    try {
      const { documentTitle, extractedText, existingDocumentTitles } = req.body || {};
      const result = await runOrganizerAgent({
        documentTitle: documentTitle || 'Untitled Document',
        extractedText: extractedText || '',
        existingDocumentTitles: Array.isArray(existingDocumentTitles) ? existingDocumentTitles : [],
      });
      const embeddingRes = await generateTextEmbedding(
        `${result.extractedTitle} ${result.category} ${extractedText?.slice(0, 1000)}`
      );
      res.json({
        ...result,
        embeddingDimension: embeddingRes.values.length,
        embeddingCached: embeddingRes.cached,
        embeddingSource: embeddingRes.source,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Stage 02 Organizer failed',
      });
    }
  });

  app.post('/api/agents/stage3-author', async (req, res) => {
    try {
      const {
        documentTitle,
        extractedText,
        category,
        department,
        effectiveDate,
        revisionFeedback,
        revisionRound,
        simulateUnsupportedClaimTest,
      } = req.body || {};
      const result = await runAuthorAgent({
        documentTitle: documentTitle || 'Institutional Document',
        extractedText: extractedText || '',
        category: category || 'Admission Policies',
        department: department || 'Admissions',
        effectiveDate: effectiveDate || 'Not specified',
        revisionFeedback,
        revisionRound: Number(revisionRound || 0),
        simulateUnsupportedClaimTest: Boolean(simulateUnsupportedClaimTest),
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Stage 03 Author failed',
      });
    }
  });

  app.post('/api/agents/stage4-verifier', async (req, res) => {
    try {
      const {
        sourceDocumentTitle,
        sourceExtractedText,
        generatedArticleTitle,
        generatedContentMarkdown,
        revisionRound,
      } = req.body || {};
      const result = await runVerifierAgent({
        sourceDocumentTitle: sourceDocumentTitle || 'Institutional Document',
        sourceExtractedText: sourceExtractedText || '',
        generatedArticleTitle: generatedArticleTitle || 'Draft Article',
        generatedContentMarkdown: generatedContentMarkdown || '',
        revisionRound: Number(revisionRound || 0),
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Stage 04 Verifier failed',
      });
    }
  });

  // ============================================================================
  // ACTUAL BACKEND-DRIVEN SEQUENTIAL WORKFLOW ENGINE
  // ============================================================================
  app.post('/api/workflow-runs/start', (req, res) => {
    const {
      runId: requestedRunId,
      ownerId,
      institutionId,
      institutionType,
      document,
      existingDocumentTitles,
      simulateUnsupportedClaimTest,
    } = req.body || {};

    if (!document || !document.id || !document.title) {
      res.status(400).json({ error: 'Valid document record is required to start a workflow run.' });
      return;
    }

    const runId = (requestedRunId || `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`).replace(
      /[^a-zA-Z0-9_-]/g,
      ''
    );
    const now = new Date().toISOString();

    const stageNames: Record<number, string> = {
      1: 'STAGE 01: ORCHESTRATOR AGENT',
      2: 'STAGE 02: KNOWLEDGE INTAKE & ORGANIZER AGENT',
      3: 'STAGE 03: KNOWLEDGE CURATOR & AUTHOR AGENT',
      4: 'STAGE 04: KNOWLEDGE VERIFIER AGENT',
      5: 'STAGE 05: HUMAN REVIEWER',
    };

    const stages: BackendStageState[] = [1, 2, 3, 4, 5].map((num) => ({
      id: `stg${num}_${runId}`,
      runId,
      stageNumber: num,
      stageName: stageNames[num],
      status: num === 1 ? 'QUEUED' : 'NOT_STARTED',
      outputSummary:
        num === 1
          ? 'Queued for Stage 01 Orchestrator validation...'
          : 'Waiting for previous stage to complete.',
      inputReference:
        num === 1 ? `Document: ${document.title} (${document.id})` : `Output of Stage 0${num - 1}`,
      outputReference: 'Pending execution',
      retryCount: 0,
      revisionCount: 0,
      startedAt: now,
    }));

    const runRecord: BackendWorkflowRun = {
      id: runId,
      ownerId: ownerId || document.ownerId || 'user',
      institutionId: institutionId || document.institutionId || 'inst',
      documentId: document.id,
      documentTitle: document.title,
      currentStage: 1,
      currentStageName: stageNames[1],
      status: 'QUEUED',
      progressPercent: 5,
      revisionRound: 0,
      retryCount: 0,
      submittedAt: now,
      startedAt: now,
      stages,
      events: [
        {
          id: `evt_${Date.now()}_0`,
          timestamp: now,
          stageNumber: 1,
          status: 'QUEUED',
          message: `Workflow run ${runId} created and queued for document "${document.title}".`,
        },
      ],
    };

    apiStore.workflowRuns[runId] = runRecord;

    // Kick off asynchronous strict sequential execution on the backend
    (async () => {
      const addEvent = (stageNumber: number, status: string, message: string) => {
        runRecord.events.push({
          id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          stageNumber,
          status,
          message,
        });
      };

      try {
        // ----------------------------------------------------------------------
        // STAGE 01: ORCHESTRATOR AGENT
        // ----------------------------------------------------------------------
        const stg1 = runRecord.stages[0];
        const stg1StartMs = Date.now();
        stg1.startedAt = new Date(stg1StartMs).toISOString();
        stg1.status = 'RUNNING';
        stg1.outputSummary = 'Validating uploaded document, file type, and workspace configuration...';
        runRecord.currentStage = 1;
        runRecord.currentStageName = stg1.stageName;
        runRecord.status = 'RUNNING';
        runRecord.progressPercent = 12;
        addEvent(1, 'RUNNING', 'Stage 01 Orchestrator started validating input document and execution plan.');

        const stage1Out = await runOrchestratorAgent({
          runId,
          documentId: document.id,
          documentTitle: document.title,
          extractedText: document.extractedText || '',
          institutionType: institutionType || 'University',
          fileType: document.fileType,
        });

        const stg1EndMs = Date.now();
        stg1.durationMs = stg1EndMs - stg1StartMs;
        stg1.completedAt = new Date(stg1EndMs).toISOString();

        if (!stage1Out.valid) {
          stg1.status = 'FAILED';
          stg1.errorMessage = stage1Out.errorMessage;
          stg1.outputSummary = stage1Out.errorMessage || 'Document validation failed.';
          stg1.detailsJson = JSON.stringify({
            inputReceived: {
              documentId: document.id,
              documentTitle: document.title,
              fileType: document.fileType,
              characterLength: (document.extractedText || '').length,
            },
            processingResult: stage1Out,
          });
          // Mark downstream stages as NOT_STARTED / SKIPPED_AND_FLAGGED
          for (let i = 1; i < 5; i++) {
            runRecord.stages[i].status = 'SKIPPED_AND_FLAGGED';
            runRecord.stages[i].outputSummary = 'Skipped because Stage 01 halted on invalid/unreadable document.';
          }
          runRecord.status = 'FAILED';
          runRecord.errorMessage = stage1Out.errorMessage;
          runRecord.completedAt = stg1.completedAt;
          addEvent(1, 'FAILED', stage1Out.errorMessage || 'Stage 01 failed.');
          return;
        }

        stg1.status = 'COMPLETED';
        stg1.outputSummary = stage1Out.summary || 'Validated document and created 5-stage execution plan.';
        stg1.outputReference = `Execution Plan (${stage1Out.executionPlan.length} steps) · Budget: ${stage1Out.callBudget.maxAgentCalls} calls`;
        stg1.detailsJson = JSON.stringify({
          inputReceived: {
            documentId: document.id,
            documentTitle: document.title,
            fileName: document.fileName,
            fileType: document.fileType,
            textCharacters: (document.extractedText || '').length,
          },
          processingResult: stage1Out,
          outputGenerated: {
            executionPlan: stage1Out.executionPlan,
            callBudget: stage1Out.callBudget,
            inputDocumentCount: stage1Out.inputDocumentCount,
          },
          linkedDocuments: [{ id: document.id, title: document.title }],
          linkedArticles: [],
        });
        addEvent(1, 'COMPLETED', stg1.outputSummary);

        // ----------------------------------------------------------------------
        // STAGE 02: KNOWLEDGE INTAKE & ORGANIZER AGENT (Starts ONLY after Stage 01)
        // ----------------------------------------------------------------------
        const stg2 = runRecord.stages[1];
        const stg2StartMs = Date.now();
        stg2.startedAt = new Date(stg2StartMs).toISOString();
        stg2.status = 'RUNNING';
        stg2.inputReference = `Stage 01 Plan + Document "${document.title}" (${(document.extractedText || '').length} chars)`;
        stg2.outputSummary = 'Extracting structured metadata, classifying department/category, checking duplicates, and generating embeddings...';
        runRecord.currentStage = 2;
        runRecord.currentStageName = stg2.stageName;
        runRecord.progressPercent = 32;
        addEvent(2, 'RUNNING', 'Stage 02 Organizer started after Stage 01 completion.');

        const { result: stage2Out, retryCount: stg2Retries } = await executeWithSingleRetry(
          () =>
            runOrganizerAgent({
              documentTitle: document.title,
              extractedText: document.extractedText || '',
              existingDocumentTitles: Array.isArray(existingDocumentTitles) ? existingDocumentTitles : [],
            }),
          async (err) => {
            stg2.status = 'RETRYING';
            stg2.retryCount = 1;
            runRecord.status = 'RETRYING';
            runRecord.retryCount += 1;
            addEvent(2, 'RETRYING', `Transient error in Stage 02 (${err instanceof Error ? err.message : 'retry'}); retrying once...`);
          }
        );

        const embeddingRes = await generateTextEmbedding(
          `${stage2Out.extractedTitle} ${stage2Out.category} ${(document.extractedText || '').slice(0, 1000)}`
        );
        const embeddingVec = embeddingRes.values;

        const detectedCategory = (stage2Out.category || document.category || 'Admission Policies').slice(0, 120);
        const detectedDepartment = (stage2Out.department || document.department || 'Admissions').slice(0, 120);
        const detectedEffectiveDate =
          stage2Out.effectiveDate && stage2Out.effectiveDate !== 'Not specified'
            ? stage2Out.effectiveDate.slice(0, 64)
            : document.effectiveDate || new Date().toISOString().slice(0, 10);

        const rawChunks: Array<{ sectionTitle: string; content: string }> =
          Array.isArray(stage2Out.chunks) && stage2Out.chunks.length > 0
            ? stage2Out.chunks
            : [{ sectionTitle: 'Full Document Content', content: (document.extractedText || '').slice(0, 12000) }];

        const generatedChunks = rawChunks.map((ch, idx) => ({
          id: `chunk_${runId}_${idx + 1}`,
          ownerId: runRecord.ownerId,
          institutionId: runRecord.institutionId,
          documentId: document.id,
          documentTitle: document.title.slice(0, 300),
          sectionTitle: (ch.sectionTitle || `Section ${idx + 1}`).slice(0, 300),
          content: (ch.content || '').slice(0, 18000),
          department: detectedDepartment,
          category: detectedCategory,
          accessLevel: document.accessLevel || 'PUBLIC_STUDENT',
          isApproved: false,
          effectiveDate: detectedEffectiveDate,
          createdAt: new Date().toISOString(),
        }));
        runRecord.generatedChunks = generatedChunks;

        const stg2EndMs = Date.now();
        stg2.durationMs = stg2EndMs - stg2StartMs;
        stg2.completedAt = new Date(stg2EndMs).toISOString();
        stg2.retryCount = stg2Retries;
        stg2.status = 'COMPLETED';
        const stg2ProviderNote = stage2Out._aiTelemetry?.fallbackSucceeded
          ? `Backup Provider (${stage2Out._aiTelemetry.modelUsed})`
          : `Primary Provider (${stage2Out._aiTelemetry?.modelUsed || AI_MODELS.AGENT_TEXT})`;
        stg2.outputReference = `Classified: ${detectedDepartment} / ${detectedCategory} · ${generatedChunks.length} Chunks (${embeddingRes.cached ? 'Reused Cached Embedding' : embeddingRes.source}) · ${stg2ProviderNote}`;
        stg2.outputSummary = `Processed "${document.fileName || document.title}" via ${stg2ProviderNote}. Language: ${stage2Out.language || 'English'}. Mapped to ${detectedDepartment} (${detectedCategory}), effective ${detectedEffectiveDate}. Generated ${generatedChunks.length} searchable chunks (${embeddingRes.cached ? 'reused cached embedding' : 'indexed embedding'}).${stage2Out.isDuplicateWarning ? ` Duplicate warning: ${stage2Out.outdatedVersionNote}` : ''}`;
        stg2.detailsJson = JSON.stringify({
          inputReceived: {
            documentTitle: document.title,
            fileName: document.fileName,
            existingWorkspaceDocumentsCount: (existingDocumentTitles || []).length,
          },
          processingResult: {
            extractedTitle: stage2Out.extractedTitle,
            language: stage2Out.language || 'English',
            detectedCategory,
            departmentMapping: detectedDepartment,
            effectiveDate: detectedEffectiveDate,
            expiryOrReviewDate: stage2Out.expiryOrReviewDate,
            isDuplicateWarning: stage2Out.isDuplicateWarning,
            outdatedVersionNote: stage2Out.outdatedVersionNote,
            embeddingDimension: embeddingVec.length || 64,
            embeddingCached: embeddingRes.cached,
            embeddingSource: embeddingRes.source,
            aiProviderUsed: stage2Out._aiTelemetry?.providerUsed,
            aiModelUsed: stage2Out._aiTelemetry?.modelUsed,
            fallbackAttempted: stage2Out._aiTelemetry?.fallbackAttempted,
            fallbackSucceeded: stage2Out._aiTelemetry?.fallbackSucceeded,
          },
          outputGenerated: {
            chunkCount: generatedChunks.length,
            chunkSections: generatedChunks.map((c) => c.sectionTitle),
          },
          linkedDocuments: [{ id: document.id, title: document.title }],
          linkedArticles: [],
        });
        runRecord.status = 'RUNNING';
        addEvent(2, 'COMPLETED', stg2.outputSummary);

        // ----------------------------------------------------------------------
        // STAGE 03 (AUTHOR) ⇄ STAGE 04 (VERIFIER) INTERNAL REVISION LOOP (Max 2 Rounds)
        // Note: Does NOT restart Stage 01 or Stage 02!
        // ----------------------------------------------------------------------
        let revisionRound = 0;
        let stage3Out: any = null;
        let stage4Out: any = null;
        let revisionFeedback = '';
        const revisionHistoryReports: Array<{
          round: number;
          status: string;
          feedback: string;
          timestamp: string;
        }> = [];

        const stg3 = runRecord.stages[2];
        const stg4 = runRecord.stages[3];

        while (revisionRound <= 2) {
          // Run Stage 03 Author
          const stg3StartMs = Date.now();
          if (revisionRound === 0) {
            stg3.startedAt = new Date(stg3StartMs).toISOString();
          }
          stg3.status = 'RUNNING';
          stg3.revisionCount = revisionRound;
          stg3.inputReference =
            revisionRound === 0
              ? `Stage 02 Extracted Content (${generatedChunks.length} chunks, ${detectedDepartment} / ${detectedCategory})`
              : `Stage 04 Verifier Revision Request (Round ${revisionRound}): ${revisionFeedback}`;
          stg3.outputSummary =
            revisionRound === 0
              ? 'Creating structured AI-SUGGESTED / DRAFT knowledge article, summary, and FAQs from Stage 02 output...'
              : `Internal Revision Round ${revisionRound}/2: Authoring corrected article draft based on Stage 04 Verifier feedback...`;
          runRecord.currentStage = 3;
          runRecord.currentStageName = stg3.stageName;
          runRecord.status = revisionRound > 0 ? 'REVISION_REQUIRED' : 'RUNNING';
          runRecord.revisionRound = revisionRound;
          runRecord.progressPercent = 55;
          addEvent(
            3,
            'RUNNING',
            revisionRound === 0
              ? 'Stage 03 Curator & Author started generating draft knowledge article.'
              : `Stage 03 Curator & Author started internal revision round ${revisionRound}/2.`
          );

          const { result: authorRes, retryCount: stg3Retries } = await executeWithSingleRetry(
            () =>
              runAuthorAgent({
                documentTitle: stage2Out.extractedTitle || document.title,
                extractedText: document.extractedText || '',
                category: detectedCategory,
                department: detectedDepartment,
                effectiveDate: detectedEffectiveDate,
                revisionFeedback,
                revisionRound,
                simulateUnsupportedClaimTest: Boolean(simulateUnsupportedClaimTest),
              }),
            async () => {
              stg3.status = 'RETRYING';
              stg3.retryCount += 1;
              runRecord.retryCount += 1;
            }
          );
          stage3Out = authorRes;
          stg3.retryCount += stg3Retries;

          const stg3EndMs = Date.now();
          stg3.durationMs = (stg3.durationMs || 0) + (stg3EndMs - stg3StartMs);
          stg3.completedAt = new Date(stg3EndMs).toISOString();
          stg3.status = 'COMPLETED';

          const draftArticleId = `art_${runId}`;
          stg3.outputReference = `Draft Article "${stage3Out.title}" (ID: ${draftArticleId}) · Status: AI-SUGGESTED / DRAFT`;
          stg3.outputSummary = `Created draft article "${stage3Out.title}" (${draftArticleId}) with ${(stage3Out.faqs || []).length} FAQs and section references (Revision Round ${revisionRound}).`;
          stg3.detailsJson = JSON.stringify({
            inputReceived: {
              sourceDocument: document.title,
              department: detectedDepartment,
              category: detectedCategory,
              effectiveDate: detectedEffectiveDate,
              revisionRound,
              verifierFeedbackReceived: revisionFeedback || 'None (Initial Draft)',
            },
            processingResult: {
              articleId: draftArticleId,
              articleTitle: stage3Out.title,
              status: 'AI-SUGGESTED / DRAFT',
              summary: stage3Out.summary,
              sourceReferences: stage3Out.sourceReferences,
              clarificationNeeded: stage3Out.clarificationNeeded || [],
              faqCount: (stage3Out.faqs || []).length,
            },
            outputGenerated: {
              contentMarkdownPreview: (stage3Out.contentMarkdown || '').slice(0, 1200),
              faqs: stage3Out.faqs || [],
            },
            linkedDocuments: [{ id: document.id, title: document.title }],
            linkedArticles: [{ id: draftArticleId, title: stage3Out.title, status: 'AI-SUGGESTED / DRAFT' }],
          });
          addEvent(3, 'COMPLETED', stg3.outputSummary);

          // Run Stage 04 Verifier (Starts ONLY after Stage 03 finishes its draft)
          const stg4StartMs = Date.now();
          if (revisionRound === 0) {
            stg4.startedAt = new Date(stg4StartMs).toISOString();
          }
          stg4.status = 'RUNNING';
          stg4.revisionCount = revisionRound;
          stg4.inputReference = `Draft Article "${stage3Out.title}" (ID: ${draftArticleId}) + Source Document "${document.title}"`;
          stg4.outputSummary = `Auditing draft "${stage3Out.title}" against source document for dates, fees, eligibility rules, and unsupported claims (Round ${revisionRound})...`;
          runRecord.currentStage = 4;
          runRecord.currentStageName = stg4.stageName;
          runRecord.status = 'RUNNING';
          runRecord.progressPercent = 76;
          addEvent(4, 'RUNNING', `Stage 04 Verifier started auditing draft (Round ${revisionRound}).`);

          const { result: verifierRes, retryCount: stg4Retries } = await executeWithSingleRetry(
            () =>
              runVerifierAgent({
                sourceDocumentTitle: document.title,
                sourceExtractedText: document.extractedText || '',
                generatedArticleTitle: stage3Out.title,
                generatedContentMarkdown: stage3Out.contentMarkdown,
                revisionRound,
              }),
            async () => {
              stg4.status = 'RETRYING';
              stg4.retryCount += 1;
              runRecord.retryCount += 1;
            }
          );
          stage4Out = verifierRes;
          stg4.retryCount += stg4Retries;

          const stg4EndMs = Date.now();
          stg4.durationMs = (stg4.durationMs || 0) + (stg4EndMs - stg4StartMs);
          stg4.completedAt = new Date(stg4EndMs).toISOString();

          revisionHistoryReports.push({
            round: revisionRound,
            status: stage4Out.verificationStatus,
            feedback:
              stage4Out.revisionFeedbackForAuthor ||
              (stage4Out.unsupportedStatements || []).join('; ') ||
              'All statements verified against source document.',
            timestamp: new Date(stg4EndMs).toISOString(),
          });

          if (stage4Out.verificationStatus === 'REVISION_REQUIRED' && revisionRound < 2) {
            revisionFeedback =
              stage4Out.revisionFeedbackForAuthor ||
              (stage4Out.unsupportedStatements || []).join('; ') ||
              'Remove unsupported claims and align strictly with source document figures.';
            stg4.status = 'REVISION_REQUIRED';
            stg4.outputSummary = `Verifier flagged unsupported/inaccurate statements in Round ${revisionRound}: "${revisionFeedback}". Returning to Stage 03 Author for revision.`;
            addEvent(4, 'REVISION_REQUIRED', stg4.outputSummary);
            revisionRound += 1;
            continue;
          }
          break;
        }

        const finalVerificationStatus =
          stage4Out.verificationStatus === 'REVISION_REQUIRED' && revisionRound >= 2
            ? 'ACTION_REQUIRED'
            : stage4Out.verificationStatus || 'VERIFIED';

        stage4Out.verificationStatus = finalVerificationStatus;
        stage4Out.revisionHistoryReports = revisionHistoryReports;

        const articleId = `art_${runId}`;
        stg4.status = finalVerificationStatus === 'ACTION_REQUIRED' ? 'ACTION_REQUIRED' : 'COMPLETED';
        stg4.outputReference = `Verification Report: ${finalVerificationStatus} · ${(stage4Out.verifiedStatements || []).length} Verified Claims`;
        stg4.outputSummary = `Verification completed with status ${finalVerificationStatus} after ${revisionRound} revision round(s). Verified ${(stage4Out.verifiedStatements || []).length} statements, ${(stage4Out.datesChecked || []).length} dates, and ${(stage4Out.feesAndNumbersChecked || []).length} numerical/fee values.`;
        stg4.detailsJson = JSON.stringify({
          inputReceived: {
            articleId,
            articleTitle: stage3Out.title,
            sourceDocumentTitle: document.title,
            revisionRoundsExecuted: revisionRound,
          },
          processingResult: stage4Out,
          outputGenerated: {
            verificationStatus: finalVerificationStatus,
            revisionHistoryReports,
          },
          linkedDocuments: [{ id: document.id, title: document.title }],
          linkedArticles: [{ id: articleId, title: stage3Out.title, status: 'WAITING_FOR_HUMAN_APPROVAL' }],
        });
        addEvent(4, stg4.status, stg4.outputSummary);

        // Prepare generated KnowledgeArticle, ReviewTask, and LifecycleProposal
        const nowFinish = new Date().toISOString();
        const generatedArticle = {
          id: articleId,
          ownerId: runRecord.ownerId,
          institutionId: runRecord.institutionId,
          sourceDocumentId: document.id,
          sourceDocumentTitle: document.title.slice(0, 300),
          title: (stage3Out.title || document.title).slice(0, 300),
          summary: (stage3Out.summary || 'AI-generated institutional knowledge article draft.').slice(0, 4000),
          contentMarkdown: (stage3Out.contentMarkdown || '').slice(0, 190000),
          department: detectedDepartment,
          category: detectedCategory,
          status: 'WAITING_FOR_HUMAN_APPROVAL',
          verificationStatus: finalVerificationStatus,
          version: document.version || 1,
          effectiveDate: detectedEffectiveDate,
          expiryDate: document.expiryDate || stage2Out.expiryOrReviewDate?.slice(0, 64),
          reviewDate: document.reviewDate || stage2Out.expiryOrReviewDate?.slice(0, 64),
          accessLevel: document.accessLevel || 'PUBLIC_STUDENT',
          sourceReferences: (stage3Out.sourceReferences || 'Full Source Document').slice(0, 4500),
          faqsJson: JSON.stringify(stage3Out.faqs || []).slice(0, 45000),
          verificationReportJson: JSON.stringify(stage4Out).slice(0, 45000),
          isSampleData: Boolean(document.isSampleData),
          createdBy: 'Stage 03 — Knowledge Curator & Author Agent',
          createdAt: nowFinish,
          updatedAt: nowFinish,
        };

        const generatedReviewTask = {
          id: `rev_${runId}`,
          ownerId: runRecord.ownerId,
          institutionId: runRecord.institutionId,
          articleId,
          documentId: document.id,
          runId,
          articleTitle: generatedArticle.title,
          department: detectedDepartment,
          category: detectedCategory,
          verificationStatus: finalVerificationStatus,
          status: 'PENDING_REVIEW',
          createdAt: nowFinish,
        };

        const generatedLifecycleProposal = {
          id: `prop_${runId}`,
          ownerId: runRecord.ownerId,
          institutionId: runRecord.institutionId,
          articleId,
          documentId: document.id,
          targetTitle: generatedArticle.title,
          department: detectedDepartment,
          actionType: (document.version || 1) > 1 ? 'UPDATE' : 'CREATE',
          reason:
            (document.version || 1) > 1
              ? `Processed Document Version ${document.version}. Ready for Stage 05 Human Reviewer sign-off.`
              : `New institutional knowledge article generated and verified from "${document.title}".`,
          diffSummary: `Verified ${(stage4Out.verifiedStatements || []).length} policy statements across ${generatedChunks.length} sections.`,
          status: 'PENDING_APPROVAL',
          createdAt: nowFinish,
        };

        runRecord.articleId = articleId;
        runRecord.generatedArticle = generatedArticle;
        runRecord.generatedReviewTask = generatedReviewTask;
        runRecord.generatedLifecycleProposal = generatedLifecycleProposal;
        apiStore.articles[articleId] = generatedArticle;
        apiStore.proposals[generatedLifecycleProposal.id] = generatedLifecycleProposal;

        // ----------------------------------------------------------------------
        // STAGE 05: HUMAN REVIEWER (Human Governance Gate — Never Auto-Published!)
        // ----------------------------------------------------------------------
        const stg5 = runRecord.stages[4];
        stg5.startedAt = nowFinish;
        stg5.status = 'WAITING_FOR_HUMAN_REVIEW';
        stg5.revisionCount = revisionRound;
        stg5.inputReference = `Verified Draft "${generatedArticle.title}" (${articleId}) + Stage 04 Report (${finalVerificationStatus})`;
        stg5.outputReference = `Awaiting Human Reviewer Decision (Approve / Reject / Request Changes)`;
        stg5.outputSummary = `Draft article "${generatedArticle.title}" and its Stage 04 Verification Report (${finalVerificationStatus}) have been delivered to the Human Review Workspace. Automatic publication is strictly blocked until a Human Reviewer approves.`;
        stg5.detailsJson = JSON.stringify({
          inputReceived: {
            articleId,
            articleTitle: generatedArticle.title,
            verificationStatus: finalVerificationStatus,
            sourceDocumentTitle: document.title,
            revisionRounds: revisionRound,
          },
          processingResult: {
            governanceGate: 'STAGE 05: HUMAN REVIEWER (Mandatory Non-AI Stage)',
            status: 'WAITING_FOR_HUMAN_REVIEW',
            allowedActions: ['Approve', 'Reject', 'Request Changes', 'Save as Pending'],
          },
          outputGenerated: {
            reviewTaskId: generatedReviewTask.id,
            lifecycleProposalId: generatedLifecycleProposal.id,
          },
          linkedDocuments: [{ id: document.id, title: document.title }],
          linkedArticles: [{ id: articleId, title: generatedArticle.title, status: 'WAITING_FOR_HUMAN_APPROVAL' }],
        });

        runRecord.currentStage = 5;
        runRecord.currentStageName = stg5.stageName;
        runRecord.status =
          finalVerificationStatus === 'ACTION_REQUIRED'
            ? 'ACTION_REQUIRED'
            : 'WAITING_FOR_HUMAN_REVIEW';
        runRecord.progressPercent = 90;
        addEvent(5, 'WAITING_FOR_HUMAN_REVIEW', stg5.outputSummary);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unexpected backend workflow error';
        const activeStageIdx = Math.max(0, Math.min(4, runRecord.currentStage - 1));
        runRecord.stages[activeStageIdx].status = 'FAILED';
        runRecord.stages[activeStageIdx].errorMessage = errMsg;
        runRecord.stages[activeStageIdx].outputSummary = `Stage failed: ${errMsg}`;
        runRecord.stages[activeStageIdx].completedAt = new Date().toISOString();
        runRecord.status = 'FAILED';
        runRecord.errorMessage = errMsg;
        runRecord.completedAt = new Date().toISOString();
        addEvent(runRecord.currentStage, 'FAILED', errMsg);
      }
    })();

    res.status(202).json(runRecord);
  });

  app.get('/api/workflow-runs', (_req, res) => {
    res.json({ runs: Object.values(apiStore.workflowRuns) });
  });

  app.post('/api/workflow-runs', (req, res) => {
    const run = req.body;
    const id = run?.id || `run_${Date.now()}`;
    apiStore.workflowRuns[id] = { ...run, id };
    res.status(201).json(apiStore.workflowRuns[id]);
  });

  app.get('/api/workflow-runs/:runId', (req, res) => {
    const run = apiStore.workflowRuns[req.params.runId];
    if (!run) {
      res.status(404).json({ error: 'Workflow run not found' });
      return;
    }
    res.json(run);
  });

  app.get('/api/workflow-runs/:runId/events', (req, res) => {
    const run = apiStore.workflowRuns[req.params.runId];
    if (!run) {
      res.status(404).json({ error: 'Workflow run not found' });
      return;
    }
    res.json({ runId: run.id, status: run.status, events: run.events || [] });
  });

  app.get('/api/workflow-runs/:runId/stages/:stageNumber', (req, res) => {
    const run = apiStore.workflowRuns[req.params.runId];
    if (!run) {
      res.status(404).json({ error: 'Workflow run not found' });
      return;
    }
    const stageNum = Number(req.params.stageNumber);
    const stage = (run.stages || []).find((s) => s.stageNumber === stageNum);
    if (!stage) {
      res.status(404).json({ error: 'Workflow stage not found' });
      return;
    }
    res.json(stage);
  });

  // Knowledge Articles REST endpoints
  app.get('/api/knowledge/articles', (_req, res) => {
    res.json({ articles: Object.values(apiStore.articles) });
  });

  app.get('/api/knowledge/articles/:articleId', (req, res) => {
    const article = apiStore.articles[req.params.articleId];
    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }
    res.json(article);
  });

  app.post('/api/knowledge/articles/:articleId/approve', (req, res) => {
    const { articleId } = req.params;
    const { reviewerName, reviewerNotes, runId } = req.body || {};
    const now = new Date().toISOString();
    const existing = apiStore.articles[articleId] || {};
    const updatedArticle = {
      ...existing,
      id: articleId,
      status: 'PUBLISHED',
      approvedBy: reviewerName || 'Human Reviewer',
      approvedAt: now,
    };
    apiStore.articles[articleId] = updatedArticle;
    if (runId && apiStore.workflowRuns[runId]) {
      const r = apiStore.workflowRuns[runId];
      r.status = 'APPROVED';
      r.progressPercent = 100;
      r.completedAt = now;
      if (r.stages?.[4]) {
        r.stages[4].status = 'APPROVED';
        r.stages[4].completedAt = now;
        r.stages[4].outputSummary = `Approved and published by ${reviewerName || 'Human Reviewer'} at ${now}.`;
      }
    }
    apiStore.auditLogs.push({
      id: `audit_${Date.now()}_approve`,
      actorName: reviewerName || 'Human Reviewer',
      actorType: 'HUMAN',
      action: 'STAGE_05_HUMAN_REVIEW_APPROVE',
      targetType: 'KnowledgeArticle',
      targetId: articleId,
      targetTitle: updatedArticle.title || articleId,
      previousStatus: 'WAITING_FOR_HUMAN_APPROVAL',
      newStatus: 'PUBLISHED',
      reason: reviewerNotes || 'Approved for institutional Knowledge Library.',
      createdAt: now,
    });
    res.json({ ...updatedArticle, article: updatedArticle });
  });

  app.post('/api/knowledge/articles/:articleId/reject', (req, res) => {
    const { articleId } = req.params;
    const { reviewerName, reviewerNotes, runId } = req.body || {};
    const now = new Date().toISOString();
    const existing = apiStore.articles[articleId] || {};
    apiStore.articles[articleId] = {
      ...existing,
      id: articleId,
      status: 'REJECTED',
    };
    if (runId && apiStore.workflowRuns[runId]) {
      const r = apiStore.workflowRuns[runId];
      r.status = 'REJECTED';
      r.completedAt = now;
      if (r.stages?.[4]) {
        r.stages[4].status = 'REJECTED';
        r.stages[4].completedAt = now;
        r.stages[4].outputSummary = `Rejected by ${reviewerName || 'Human Reviewer'}: ${reviewerNotes || 'Rejected'}`;
      }
    }
    res.json(apiStore.articles[articleId]);
  });

  app.post('/api/knowledge/articles/:articleId/request-changes', (req, res) => {
    const { articleId } = req.params;
    const existing = apiStore.articles[articleId] || {};
    apiStore.articles[articleId] = {
      ...existing,
      id: articleId,
      status: 'REVISION_REQUESTED',
    };
    res.json(apiStore.articles[articleId]);
  });

  // POST /api/assistant/query — RAG Knowledge Assistant
  app.post('/api/assistant/query', async (req, res) => {
    try {
      const { question, userRole, institutionName, approvedChunks } = req.body || {};
      if (!question || typeof question !== 'string') {
        res.status(400).json({ error: 'Question is required' });
        return;
      }
      const ragResult = await queryKnowledgeAssistantRAG({
        question,
        userRole: userRole || 'Student',
        institutionName: institutionName || 'Institution',
        approvedChunks: Array.isArray(approvedChunks) ? approvedChunks : [],
      });
      if (!ragResult.isAnswered) {
        apiStore.unansweredQuestions.push({
          id: `uq_${Date.now()}`,
          question,
          askedByRole: userRole || 'Student',
          departmentSuggested: ragResult.suggestedDepartment || 'Admissions',
          status: 'OPEN',
          createdAt: new Date().toISOString(),
        });
      }
      res.json({
        ...ragResult,
        fallbackNotice: NO_VERIFIED_INFO_MESSAGE,
      });
    } catch (error) {
      const isQuota = error instanceof AIQuotaExceededError || isQuotaOrRateLimitError(error);
      res.status(isQuota ? 429 : 500).json({
        error: error instanceof Error ? error.message : 'Assistant query failed',
        quotaExceeded: isQuota,
      });
    }
  });

  app.get('/api/unanswered-questions', (_req, res) => {
    res.json({ questions: apiStore.unansweredQuestions });
  });

  // POST /api/lifecycle/compare — AI version comparison
  app.post('/api/lifecycle/compare', async (req, res) => {
    try {
      const { documentTitle, department, oldVersionText, newVersionText } = req.body || {};
      if (!oldVersionText || !newVersionText) {
        res.status(400).json({ error: 'Both oldVersionText and newVersionText are required' });
        return;
      }
      const comparison = await analyzeDocumentLifecycleComparison({
        documentTitle: documentTitle || 'Institutional Policy',
        department: department || 'Academics',
        oldVersionText,
        newVersionText,
      });
      res.json(comparison);
    } catch (error) {
      const isQuota = error instanceof AIQuotaExceededError || isQuotaOrRateLimitError(error);
      res.status(isQuota ? 429 : 500).json({
        error: error instanceof Error ? error.message : 'Lifecycle version comparison failed',
        quotaExceeded: isQuota,
      });
    }
  });

  app.get('/api/lifecycle/proposals', (_req, res) => {
    res.json({ proposals: Object.values(apiStore.proposals) });
  });

  app.post('/api/lifecycle/proposals/:proposalId/approve', (req, res) => {
    const { proposalId } = req.params;
    apiStore.proposals[proposalId] = {
      ...(apiStore.proposals[proposalId] || {}),
      id: proposalId,
      status: 'APPROVED',
      reviewedAt: new Date().toISOString(),
    };
    res.json(apiStore.proposals[proposalId]);
  });

  app.post('/api/lifecycle/proposals/:proposalId/reject', (req, res) => {
    const { proposalId } = req.params;
    apiStore.proposals[proposalId] = {
      ...(apiStore.proposals[proposalId] || {}),
      id: proposalId,
      status: 'REJECTED',
      reviewedAt: new Date().toISOString(),
    };
    res.json(apiStore.proposals[proposalId]);
  });

  app.get('/api/audit-logs', (_req, res) => {
    res.json({ logs: apiStore.auditLogs });
  });

  app.get('/api/notifications', (_req, res) => {
    res.json({ notifications: apiStore.notifications });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
