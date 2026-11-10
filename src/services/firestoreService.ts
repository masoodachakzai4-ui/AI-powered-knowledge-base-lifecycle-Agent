import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { buildDemoSeedData } from '../data/demoSeed';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  ArticleVersion,
  AuditLog,
  ChatMessage,
  Conversation,
  DEFAULT_DEPARTMENTS,
  Department,
  DocumentRecord,
  DocumentVersion,
  Institution,
  KnowledgeArticle,
  KnowledgeChunk,
  LifecycleProposal,
  NotificationItem,
  ReviewTask,
  UnansweredQuestion,
  UserProfile,
  WorkflowRun,
  WorkflowStage,
  WorkspaceMembership,
} from '../types/domain';

export function cleanId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      out[k] = v;
    }
  }
  return out as T;
}

// ============================================================================
// Dual-Mode Store (Cloud Firestore when authenticated + Instant Preview Store)
// ============================================================================
const PREVIEW_OWNER_ID = 'demo_preview_uid';
const PREVIEW_INST_ID = 'inst_demo_preview';

const previewCollections: Record<string, Map<string, any>> = {
  institutions: new Map(),
  departments: new Map(),
  workspace_memberships: new Map(),
  documents: new Map(),
  document_versions: new Map(),
  knowledge_articles: new Map(),
  article_versions: new Map(),
  knowledge_chunks: new Map(),
  workflow_runs: new Map(),
  workflow_stages: new Map(),
  review_tasks: new Map(),
  lifecycle_proposals: new Map(),
  conversations: new Map(),
  chat_messages: new Map(),
  unanswered_questions: new Map(),
  audit_logs: new Map(),
  notifications: new Map(),
};

const previewListeners = new Set<() => void>();

function initPreviewStore() {
  const now = new Date().toISOString();
  const inst: Institution = {
    id: PREVIEW_INST_ID,
    ownerId: PREVIEW_OWNER_ID,
    name: 'Demo University — Sample Workspace',
    type: 'University',
    country: 'United States',
    website: 'https://demo-university.example.edu',
    primaryDepartment: 'Admissions',
    isDemo: true,
    createdAt: now,
  };
  previewCollections.institutions.set(inst.id, inst);

  DEFAULT_DEPARTMENTS.forEach((name, idx) => {
    const id = `dept_preview_${idx}`;
    previewCollections.departments.set(id, {
      id,
      ownerId: PREVIEW_OWNER_ID,
      institutionId: PREVIEW_INST_ID,
      name,
      description: `${name} Academic & Policy Unit`,
      headName: 'Muhammad Masood',
      createdAt: now,
    });
  });

  previewCollections.workspace_memberships.set('mem_preview_1', {
    id: 'mem_preview_1',
    ownerId: PREVIEW_OWNER_ID,
    institutionId: PREVIEW_INST_ID,
    userId: PREVIEW_OWNER_ID,
    userEmail: 'masoodachakzai4@gmail.com',
    userName: 'Muhammad Masood',
    role: 'Institution Administrator',
    department: 'Admissions',
    status: 'Active',
    createdAt: now,
  });

  const seed = buildDemoSeedData(PREVIEW_OWNER_ID, PREVIEW_INST_ID, 'Muhammad Masood');
  seed.documents.forEach((d) => previewCollections.documents.set(d.id, d));
  seed.documentVersions.forEach((v) => previewCollections.document_versions.set(v.id, v));
  seed.articles.forEach((a) => previewCollections.knowledge_articles.set(a.id, a));
  seed.chunks.forEach((c) => previewCollections.knowledge_chunks.set(c.id, c));
  seed.reviewTasks.forEach((r) => previewCollections.review_tasks.set(r.id, r));
  seed.workflowRuns.forEach((w) => previewCollections.workflow_runs.set(w.id, w));
  seed.workflowStages.forEach((s) => previewCollections.workflow_stages.set(s.id, s));
  seed.lifecycleProposals.forEach((p) => previewCollections.lifecycle_proposals.set(p.id, p));
  seed.unansweredQuestions.forEach((u) => previewCollections.unanswered_questions.set(u.id, u));
  seed.auditLogs.forEach((l) => previewCollections.audit_logs.set(l.id, l));
  seed.notifications.forEach((n) => previewCollections.notifications.set(n.id, n));
}

initPreviewStore();

function notifyPreviewListeners() {
  previewListeners.forEach((fn) => fn());
}

export async function writeWorkspaceDoc(colName: string, docId: string, data: Record<string, any>): Promise<void> {
  const cleaned = stripUndefined(data);
  if (!auth.currentUser) {
    if (!previewCollections[colName]) {
      previewCollections[colName] = new Map();
    }
    previewCollections[colName].set(docId, cleaned);
    notifyPreviewListeners();
    return;
  }
  try {
    await setDoc(doc(db, colName, docId), cleaned);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${colName}/${docId}`);
  }
}

export async function updateWorkspaceDoc(colName: string, docId: string, updates: Record<string, any>): Promise<void> {
  const cleaned = stripUndefined(updates);
  if (!auth.currentUser) {
    const col = previewCollections[colName];
    if (col && col.has(docId)) {
      col.set(docId, { ...col.get(docId), ...cleaned });
      notifyPreviewListeners();
    }
    return;
  }
  try {
    await updateDoc(doc(db, colName, docId), cleaned);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${colName}/${docId}`);
  }
}

export async function deleteWorkspaceDoc(colName: string, docId: string): Promise<void> {
  if (!auth.currentUser) {
    const col = previewCollections[colName];
    if (col) {
      col.delete(docId);
      notifyPreviewListeners();
    }
    return;
  }
  try {
    await deleteDoc(doc(db, colName, docId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${colName}/${docId}`);
  }
}

// User Profile
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!auth.currentUser) return null;
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  if (!auth.currentUser) return;
  const path = `users/${profile.uid}`;
  try {
    const payload = stripUndefined({
      uid: profile.uid,
      ownerId: profile.ownerId,
      fullName: (profile.fullName || 'Institutional User').slice(0, 150),
      email: (profile.email || '').slice(0, 256),
      role: (profile.role || 'Institution Administrator').slice(0, 64),
      institutionId: profile.institutionId,
      institutionName: profile.institutionName?.slice(0, 200),
      department: profile.department?.slice(0, 120),
      onboardingCompleted: Boolean(profile.onboardingCompleted),
      createdAt: profile.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'users', profile.uid), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateUserProfileFields(
  uid: string,
  updates: Partial<Pick<UserProfile, 'fullName' | 'role' | 'institutionId' | 'institutionName' | 'department' | 'onboardingCompleted'>>
): Promise<void> {
  if (!auth.currentUser) return;
  const path = `users/${uid}`;
  try {
    await updateDoc(
      doc(db, 'users', uid),
      stripUndefined({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// Institutions
export async function createInstitutionWorkspace(params: {
  ownerId: string;
  userEmail: string;
  userName: string;
  userRole: UserProfile['role'];
  institutionName: string;
  institutionType: Institution['type'];
  country: string;
  website?: string;
  primaryDepartment?: string;
  departments: string[];
  isDemo?: boolean;
}): Promise<Institution> {
  const instId = params.isDemo ? `inst_demo_${params.ownerId.slice(0, 12)}` : cleanId('inst');
  const now = new Date().toISOString();
  const institution: Institution = stripUndefined({
    id: instId,
    ownerId: params.ownerId,
    name: params.institutionName.slice(0, 200),
    type: params.institutionType,
    country: (params.country || 'United States').slice(0, 100),
    website: params.website ? params.website.slice(0, 300) : undefined,
    primaryDepartment: params.primaryDepartment ? params.primaryDepartment.slice(0, 120) : 'Administration',
    isDemo: Boolean(params.isDemo),
    createdAt: now,
  });

  await writeWorkspaceDoc('institutions', instId, institution);

  // Create departments
  const deptList = params.departments.length > 0 ? params.departments : DEFAULT_DEPARTMENTS;
  for (const deptName of deptList) {
    const deptId = cleanId('dept');
    const dept: Department = {
      id: deptId,
      ownerId: params.ownerId,
      institutionId: instId,
      name: deptName.slice(0, 120),
      description: `${deptName} policy and governance unit`,
      headName: params.userName.slice(0, 120),
      createdAt: now,
    };
    await writeWorkspaceDoc('departments', deptId, dept);
  }

  // Create workspace membership
  const memId = cleanId('mem');
  const membership: WorkspaceMembership = {
    id: memId,
    ownerId: params.ownerId,
    institutionId: instId,
    userId: params.ownerId,
    userEmail: params.userEmail.slice(0, 256),
    userName: params.userName.slice(0, 150),
    role: params.userRole,
    department: (params.primaryDepartment || 'Administration').slice(0, 120),
    status: 'Active',
    createdAt: now,
  };
  await writeWorkspaceDoc('workspace_memberships', memId, membership);

  await logAuditAction({
    ownerId: params.ownerId,
    institutionId: instId,
    actorName: params.userName,
    actorType: 'HUMAN',
    action: params.isDemo ? 'INITIALIZED_DEMO_WORKSPACE' : 'CREATED_INSTITUTION_WORKSPACE',
    targetType: 'Institution',
    targetId: instId,
    targetTitle: institution.name,
    newStatus: 'Active',
    reason: `Initialized ${institution.type} workspace with ${deptList.length} departments.`,
  });

  return institution;
}

export async function seedDemoWorkspaceIfNeeded(ownerId: string, userEmail: string, userName: string): Promise<Institution> {
  if (!auth.currentUser) {
    return previewCollections.institutions.get(PREVIEW_INST_ID) as Institution;
  }

  const demoInstId = `inst_demo_${ownerId.slice(0, 12)}`.replace(/[^a-zA-Z0-9_-]/g, '');
  try {
    const existingSnap = await getDoc(doc(db, 'institutions', demoInstId));
    if (existingSnap.exists()) {
      return existingSnap.data() as Institution;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `institutions/${demoInstId}`);
  }

  const now = new Date().toISOString();
  const demoInst: Institution = {
    id: demoInstId,
    ownerId,
    name: 'Demo University — Sample Workspace',
    type: 'University',
    country: 'United States',
    website: 'https://demo-university.example.edu',
    primaryDepartment: 'Admissions',
    isDemo: true,
    createdAt: now,
  };

  await writeWorkspaceDoc('institutions', demoInstId, demoInst);

  for (const deptName of DEFAULT_DEPARTMENTS) {
    const deptId = cleanId('dept');
    await writeWorkspaceDoc('departments', deptId, {
      id: deptId,
      ownerId,
      institutionId: demoInstId,
      name: deptName,
      description: `${deptName} Sample Department`,
      headName: userName.slice(0, 120),
      createdAt: now,
    });
  }

  const memId = cleanId('mem');
  await writeWorkspaceDoc('workspace_memberships', memId, {
    id: memId,
    ownerId,
    institutionId: demoInstId,
    userId: ownerId,
    userEmail: userEmail.slice(0, 256),
    userName: userName.slice(0, 150),
    role: 'Institution Administrator',
    department: 'Admissions',
    status: 'Active',
    createdAt: now,
  });

  const seed = buildDemoSeedData(ownerId, demoInstId, userName);

  for (const docRec of seed.documents) {
    await writeWorkspaceDoc('documents', docRec.id, docRec);
  }
  for (const ver of seed.documentVersions) {
    await writeWorkspaceDoc('document_versions', ver.id, ver);
  }
  for (const art of seed.articles) {
    await writeWorkspaceDoc('knowledge_articles', art.id, art);
  }
  for (const chunk of seed.chunks) {
    await writeWorkspaceDoc('knowledge_chunks', chunk.id, chunk);
  }
  for (const task of seed.reviewTasks) {
    await writeWorkspaceDoc('review_tasks', task.id, task);
  }
  for (const run of seed.workflowRuns) {
    await writeWorkspaceDoc('workflow_runs', run.id, run);
  }
  for (const stg of seed.workflowStages) {
    await writeWorkspaceDoc('workflow_stages', stg.id, stg);
  }
  for (const prop of seed.lifecycleProposals) {
    await writeWorkspaceDoc('lifecycle_proposals', prop.id, prop);
  }
  for (const uq of seed.unansweredQuestions) {
    await writeWorkspaceDoc('unanswered_questions', uq.id, uq);
  }
  for (const al of seed.auditLogs) {
    await writeWorkspaceDoc('audit_logs', al.id, al);
  }
  for (const nf of seed.notifications) {
    await writeWorkspaceDoc('notifications', nf.id, nf);
  }

  return demoInst;
}

// Audit & Notifications
export async function logAuditAction(params: Omit<AuditLog, 'id' | 'createdAt'>): Promise<void> {
  const id = cleanId('audit');
  const record: AuditLog = stripUndefined({
    id,
    ownerId: params.ownerId,
    institutionId: params.institutionId,
    actorName: params.actorName.slice(0, 150),
    actorType: params.actorType,
    action: params.action.slice(0, 200),
    targetType: params.targetType.slice(0, 64),
    targetId: params.targetId.slice(0, 128),
    targetTitle: params.targetTitle.slice(0, 300),
    previousStatus: params.previousStatus?.slice(0, 64),
    newStatus: params.newStatus?.slice(0, 64),
    reason: params.reason?.slice(0, 2000),
    workflowRunId: params.workflowRunId?.slice(0, 128),
    createdAt: new Date().toISOString(),
  });
  await writeWorkspaceDoc('audit_logs', id, record);
}

export async function createNotification(
  params: Omit<NotificationItem, 'id' | 'read' | 'createdAt'>
): Promise<void> {
  const id = cleanId('notif');
  const item: NotificationItem = {
    id,
    ownerId: params.ownerId,
    institutionId: params.institutionId,
    title: params.title.slice(0, 200),
    message: params.message.slice(0, 1000),
    type: params.type,
    read: false,
    createdAt: new Date().toISOString(),
  };
  await writeWorkspaceDoc('notifications', id, item);
}

export async function markNotificationRead(id: string): Promise<void> {
  await updateWorkspaceDoc('notifications', id, { read: true });
}

// Document Creation & Versioning
export async function saveUploadedDocument(params: {
  ownerId: string;
  institutionId: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  department: string;
  category: string;
  effectiveDate?: string;
  expiryDate?: string;
  reviewDate?: string;
  accessLevel: DocumentRecord['accessLevel'];
  extractedText: string;
  requiresOcr: boolean;
  uploadedBy: string;
  isSampleData?: boolean;
  existingDocumentToUpdate?: DocumentRecord;
}): Promise<{ document: DocumentRecord; lifecycleProposalCreated?: LifecycleProposal }> {
  const now = new Date().toISOString();

  if (params.existingDocumentToUpdate) {
    const prev = params.existingDocumentToUpdate;
    const nextVersion = prev.version + 1;
    const updatedDoc: DocumentRecord = stripUndefined({
      ...prev,
      title: params.title.slice(0, 300),
      department: params.department.slice(0, 120),
      category: params.category.slice(0, 120),
      effectiveDate: params.effectiveDate?.slice(0, 64),
      expiryDate: params.expiryDate?.slice(0, 64),
      reviewDate: params.reviewDate?.slice(0, 64),
      version: nextVersion,
      status: params.requiresOcr ? 'OCR_REQUIRED' : 'UPLOADED',
      accessLevel: params.accessLevel,
      extractedText: params.extractedText.slice(0, 190000),
      updatedAt: now,
    });

    await updateWorkspaceDoc('documents', prev.id, {
      title: updatedDoc.title,
      department: updatedDoc.department,
      category: updatedDoc.category,
      effectiveDate: updatedDoc.effectiveDate,
      expiryDate: updatedDoc.expiryDate,
      reviewDate: updatedDoc.reviewDate,
      version: updatedDoc.version,
      status: updatedDoc.status,
      accessLevel: updatedDoc.accessLevel,
      extractedText: updatedDoc.extractedText,
      updatedAt: now,
    });

    const verId = cleanId('docver');
    const verRecord: DocumentVersion = stripUndefined({
      id: verId,
      ownerId: params.ownerId,
      institutionId: params.institutionId,
      documentId: prev.id,
      versionNumber: nextVersion,
      title: `${updatedDoc.title} (v${nextVersion}.0)`,
      extractedText: updatedDoc.extractedText,
      changeSummary: `Uploaded new policy revision v${nextVersion}.0 (${params.fileName})`,
      effectiveDate: params.effectiveDate || now.slice(0, 10),
      createdBy: params.uploadedBy.slice(0, 150),
      createdAt: now,
    });
    await writeWorkspaceDoc('document_versions', verId, verRecord);

    await logAuditAction({
      ownerId: params.ownerId,
      institutionId: params.institutionId,
      actorName: params.uploadedBy,
      actorType: 'HUMAN',
      action: 'UPLOADED_NEW_DOCUMENT_VERSION',
      targetType: 'Document',
      targetId: prev.id,
      targetTitle: updatedDoc.title,
      previousStatus: `v${prev.version}`,
      newStatus: `v${nextVersion}`,
      reason: `New version uploaded from file ${params.fileName}`,
    });

    return { document: updatedDoc };
  }

  const docId = cleanId('doc');
  const newDoc: DocumentRecord = stripUndefined({
    id: docId,
    ownerId: params.ownerId,
    institutionId: params.institutionId,
    title: params.title.slice(0, 300),
    fileName: params.fileName.slice(0, 300),
    fileType: params.fileType.slice(0, 64),
    fileSize: params.fileSize,
    department: params.department.slice(0, 120),
    category: params.category.slice(0, 120),
    language: 'English',
    effectiveDate: (params.effectiveDate || now.slice(0, 10)).slice(0, 64),
    expiryDate: params.expiryDate?.slice(0, 64),
    reviewDate: params.reviewDate?.slice(0, 64),
    version: 1,
    status: params.requiresOcr ? 'OCR_REQUIRED' : 'UPLOADED',
    accessLevel: params.accessLevel,
    extractedText: (params.extractedText || 'Requires OCR').slice(0, 190000),
    isSampleData: Boolean(params.isSampleData),
    uploadedBy: params.uploadedBy.slice(0, 150),
    createdAt: now,
    updatedAt: now,
  });

  await writeWorkspaceDoc('documents', docId, newDoc);

  const verId = cleanId('docver');
  const verRecord: DocumentVersion = stripUndefined({
    id: verId,
    ownerId: params.ownerId,
    institutionId: params.institutionId,
    documentId: docId,
    versionNumber: 1,
    title: `${newDoc.title} (v1.0)`,
    extractedText: newDoc.extractedText,
    changeSummary: 'Initial document upload (Version 1.0)',
    effectiveDate: newDoc.effectiveDate,
    createdBy: params.uploadedBy.slice(0, 150),
    createdAt: now,
  });
  await writeWorkspaceDoc('document_versions', verId, verRecord);

  await logAuditAction({
    ownerId: params.ownerId,
    institutionId: params.institutionId,
    actorName: params.uploadedBy,
    actorType: 'HUMAN',
    action: params.requiresOcr ? 'UPLOADED_DOCUMENT_REQUIRING_OCR' : 'UPLOADED_INSTITUTIONAL_DOCUMENT',
    targetType: 'Document',
    targetId: docId,
    targetTitle: newDoc.title,
    newStatus: newDoc.status,
    reason: `Uploaded ${params.fileName} under ${newDoc.department} / ${newDoc.category}`,
  });

  return { document: newDoc };
}

// Stage 05 Human Reviewer Governance Actions
export async function executeHumanReviewDecision(params: {
  ownerId: string;
  institutionId: string;
  article: KnowledgeArticle;
  reviewTask?: ReviewTask;
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'SAVE_PENDING';
  reviewerName: string;
  reviewerNotes: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const statusMap: Record<typeof params.decision, KnowledgeArticle['status']> = {
    APPROVE: 'PUBLISHED',
    REJECT: 'REJECTED',
    REQUEST_CHANGES: 'REVISION_REQUESTED',
    SAVE_PENDING: 'WAITING_FOR_HUMAN_APPROVAL',
  };
  const taskStatusMap: Record<typeof params.decision, ReviewTask['status']> = {
    APPROVE: 'APPROVED',
    REJECT: 'REJECTED',
    REQUEST_CHANGES: 'CHANGES_REQUESTED',
    SAVE_PENDING: 'SAVED_PENDING',
  };

  const nextArticleStatus = statusMap[params.decision];

  await updateWorkspaceDoc('knowledge_articles', params.article.id, {
    status: nextArticleStatus,
    approvedBy: params.decision === 'APPROVE' ? params.reviewerName.slice(0, 150) : params.article.approvedBy,
    approvedAt: params.decision === 'APPROVE' ? now : params.article.approvedAt,
    updatedAt: now,
  });

  // Save ArticleVersion snapshot
  const artVerId = cleanId('artver');
  const artVer: ArticleVersion = stripUndefined({
    id: artVerId,
    ownerId: params.ownerId,
    institutionId: params.institutionId,
    articleId: params.article.id,
    versionNumber: params.article.version,
    title: params.article.title,
    contentMarkdown: params.article.contentMarkdown,
    changeNotes: params.reviewerNotes || `Human Reviewer decision: ${params.decision}`,
    status: nextArticleStatus,
    reviewerName: params.reviewerName.slice(0, 150),
    createdAt: now,
  });
  await writeWorkspaceDoc('article_versions', artVerId, artVer);

  // Update associated chunks' isApproved flag so RAG Assistant immediately includes/excludes them
  if (!auth.currentUser) {
    for (const [cid, chunk] of previewCollections.knowledge_chunks.entries()) {
      if (chunk.ownerId === params.ownerId && chunk.documentId === params.article.sourceDocumentId) {
        previewCollections.knowledge_chunks.set(cid, {
          ...chunk,
          articleId: params.article.id,
          isApproved: params.decision === 'APPROVE',
        });
      }
    }
    notifyPreviewListeners();
  } else {
    const chunksQuery = query(
      collection(db, 'knowledge_chunks'),
      where('ownerId', '==', params.ownerId),
      where('documentId', '==', params.article.sourceDocumentId)
    );
    const chunkSnaps = await getDocs(chunksQuery);
    for (const cDoc of chunkSnaps.docs) {
      await updateDoc(doc(db, 'knowledge_chunks', cDoc.id), {
        articleId: params.article.id,
        isApproved: params.decision === 'APPROVE',
      });
    }
  }

  if (params.reviewTask) {
    await updateWorkspaceDoc('review_tasks', params.reviewTask.id, {
      status: taskStatusMap[params.decision],
      reviewerNotes: params.reviewerNotes.slice(0, 4000),
      reviewedBy: params.reviewerName.slice(0, 150),
      reviewedAt: now,
    });

    if (params.reviewTask.runId) {
      const wfStatus =
        params.decision === 'APPROVE'
          ? 'APPROVED'
          : params.decision === 'REJECT'
            ? 'REJECTED'
            : params.decision === 'REQUEST_CHANGES'
              ? 'REVISION_REQUIRED'
              : 'WAITING_FOR_HUMAN_REVIEW';

      await updateWorkspaceDoc('workflow_runs', params.reviewTask.runId, {
        status: wfStatus,
        progressPercent: params.decision === 'APPROVE' ? 100 : 90,
        completedAt: params.decision === 'APPROVE' || params.decision === 'REJECT' ? now : undefined,
      });

      if (!auth.currentUser) {
        for (const [sid, sData] of previewCollections.workflow_stages.entries()) {
          if (sData.runId === params.reviewTask.runId && sData.stageNumber === 5) {
            previewCollections.workflow_stages.set(sid, {
              ...sData,
              status: wfStatus,
              outputReference:
                params.decision === 'APPROVE'
                  ? `Published Article "${params.article.title}" (${params.article.id}) by ${params.reviewerName}`
                  : `Decision: ${params.decision} by ${params.reviewerName}`,
              outputSummary: `Stage 05 Human Reviewer (${params.reviewerName}) marked article "${params.article.title}" as ${nextArticleStatus}. Notes: ${params.reviewerNotes || 'Approved for institutional Knowledge Library.'}`,
              completedAt: params.decision === 'APPROVE' || params.decision === 'REJECT' ? now : undefined,
            });
          }
        }
        notifyPreviewListeners();
      } else {
        try {
          const stgQuery = query(
            collection(db, 'workflow_stages'),
            where('ownerId', '==', params.ownerId),
            where('runId', '==', params.reviewTask.runId)
          );
          const stgSnaps = await getDocs(stgQuery);
          for (const sDoc of stgSnaps.docs) {
            const sData = sDoc.data() as WorkflowStage;
            if (sData.stageNumber === 5) {
              await updateDoc(
                doc(db, 'workflow_stages', sDoc.id),
                stripUndefined({
                  status: wfStatus,
                  outputReference:
                    params.decision === 'APPROVE'
                      ? `Published Article "${params.article.title}" (${params.article.id}) by ${params.reviewerName}`
                      : `Decision: ${params.decision} by ${params.reviewerName}`,
                  outputSummary: `Stage 05 Human Reviewer (${params.reviewerName}) marked article "${params.article.title}" as ${nextArticleStatus}. Notes: ${params.reviewerNotes || 'Approved for institutional Knowledge Library.'}`,
                  completedAt: params.decision === 'APPROVE' || params.decision === 'REJECT' ? now : undefined,
                })
              );
            }
          }
        } catch {
          // Ignore if run record was not present
        }
      }
    }
  }

  // Sync decision with backend REST API store
  try {
    const endpoint =
      params.decision === 'APPROVE'
        ? `/api/knowledge/articles/${params.article.id}/approve`
        : params.decision === 'REJECT'
          ? `/api/knowledge/articles/${params.article.id}/reject`
          : `/api/knowledge/articles/${params.article.id}/request-changes`;
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reviewerName: params.reviewerName,
        reviewerNotes: params.reviewerNotes,
        runId: params.reviewTask?.runId,
      }),
    });
  } catch {
    // Non-blocking backend sync
  }

  await createNotification({
    ownerId: params.ownerId,
    institutionId: params.institutionId,
    title: `Human Review: ${params.decision}`,
    message: `"${params.article.title}" was marked ${nextArticleStatus} by ${params.reviewerName}.`,
    type: 'ARTICLE_PUBLISHED',
  });

  await logAuditAction({
    ownerId: params.ownerId,
    institutionId: params.institutionId,
    actorName: params.reviewerName,
    actorType: 'HUMAN',
    action: `STAGE_05_HUMAN_REVIEW_${params.decision}`,
    targetType: 'KnowledgeArticle',
    targetId: params.article.id,
    targetTitle: params.article.title,
    previousStatus: params.article.status,
    newStatus: nextArticleStatus,
    reason: params.reviewerNotes || `Human Reviewer action: ${params.decision}`,
    workflowRunId: params.reviewTask?.runId,
  });
}

// Lifecycle Proposal Decision
export async function executeLifecycleProposalDecision(params: {
  ownerId: string;
  institutionId: string;
  proposal: LifecycleProposal;
  decision: 'APPROVED' | 'REJECTED';
  reviewerName: string;
  articles: KnowledgeArticle[];
}): Promise<void> {
  const now = new Date().toISOString();
  await updateWorkspaceDoc('lifecycle_proposals', params.proposal.id, {
    status: params.decision,
    reviewedBy: params.reviewerName.slice(0, 150),
    reviewedAt: now,
  });

  if (params.decision === 'APPROVED') {
    const linkedArticle = params.articles.find(
      (a) => a.id === params.proposal.articleId || a.sourceDocumentId === params.proposal.documentId
    );
    if (linkedArticle) {
      if (params.proposal.actionType === 'RETIRE') {
        await updateWorkspaceDoc('knowledge_articles', linkedArticle.id, {
          status: 'RETIRED',
          updatedAt: now,
        });
        if (!auth.currentUser) {
          for (const [cid, chunk] of previewCollections.knowledge_chunks.entries()) {
            if (chunk.ownerId === params.ownerId && chunk.documentId === linkedArticle.sourceDocumentId) {
              previewCollections.knowledge_chunks.set(cid, { ...chunk, isApproved: false });
            }
          }
          notifyPreviewListeners();
        } else {
          const chunksQuery = query(
            collection(db, 'knowledge_chunks'),
            where('ownerId', '==', params.ownerId),
            where('documentId', '==', linkedArticle.sourceDocumentId)
          );
          const chunkSnaps = await getDocs(chunksQuery);
          for (const cDoc of chunkSnaps.docs) {
            await updateDoc(doc(db, 'knowledge_chunks', cDoc.id), {
              isApproved: false,
            });
          }
        }
      } else if (params.proposal.actionType === 'UPDATE' && params.proposal.newVersionText) {
        const nextVer = linkedArticle.version + 1;
        await updateWorkspaceDoc('knowledge_articles', linkedArticle.id, {
          version: nextVer,
          updatedAt: now,
        });
      }
    }
  }

  await logAuditAction({
    ownerId: params.ownerId,
    institutionId: params.institutionId,
    actorName: params.reviewerName,
    actorType: 'HUMAN',
    action: `LIFECYCLE_${params.proposal.actionType}_${params.decision}`,
    targetType: 'LifecycleProposal',
    targetId: params.proposal.id,
    targetTitle: params.proposal.targetTitle,
    previousStatus: 'PENDING_APPROVAL',
    newStatus: params.decision,
    reason: params.proposal.reason,
  });
}

// Department & User Management helpers
export async function addCustomDepartment(params: {
  ownerId: string;
  institutionId: string;
  name: string;
  description: string;
  headName: string;
}): Promise<void> {
  const id = cleanId('dept');
  await writeWorkspaceDoc('departments', id, {
    id,
    ownerId: params.ownerId,
    institutionId: params.institutionId,
    name: params.name.slice(0, 120),
    description: params.description.slice(0, 500),
    headName: params.headName.slice(0, 120),
    createdAt: new Date().toISOString(),
  });
}

export async function removeDepartment(id: string): Promise<void> {
  await deleteWorkspaceDoc('departments', id);
}

export async function inviteWorkspaceMember(params: {
  ownerId: string;
  institutionId: string;
  userEmail: string;
  userName: string;
  role: UserProfile['role'];
  department: string;
  actorName: string;
}): Promise<void> {
  const id = cleanId('mem');
  const userId = cleanId('usr');
  await writeWorkspaceDoc('workspace_memberships', id, {
    id,
    ownerId: params.ownerId,
    institutionId: params.institutionId,
    userId,
    userEmail: params.userEmail.slice(0, 256),
    userName: params.userName.slice(0, 150),
    role: params.role,
    department: params.department.slice(0, 120),
    status: 'Active',
    createdAt: new Date().toISOString(),
  });

  await logAuditAction({
    ownerId: params.ownerId,
    institutionId: params.institutionId,
    actorName: params.actorName,
    actorType: 'HUMAN',
    action: 'INVITED_WORKSPACE_MEMBER',
    targetType: 'WorkspaceMembership',
    targetId: id,
    targetTitle: `${params.userName} (${params.userEmail})`,
    newStatus: params.role,
    reason: `Assigned role ${params.role} in ${params.department}`,
  });
}

export async function updateWorkspaceMemberRole(
  membershipId: string,
  newRole: UserProfile['role'],
  department: string
): Promise<void> {
  await updateWorkspaceDoc('workspace_memberships', membershipId, {
    role: newRole,
    department: department.slice(0, 120),
  });
}

// Subscribe to all workspace collections with strict ownerId + institutionId filtering
export function subscribeToWorkspaceData(
  ownerId: string,
  institutionId: string,
  callbacks: {
    onInstitutions: (items: Institution[]) => void;
    onDepartments: (items: Department[]) => void;
    onMemberships: (items: WorkspaceMembership[]) => void;
    onDocuments: (items: DocumentRecord[]) => void;
    onDocumentVersions: (items: DocumentVersion[]) => void;
    onArticles: (items: KnowledgeArticle[]) => void;
    onArticleVersions: (items: ArticleVersion[]) => void;
    onChunks: (items: KnowledgeChunk[]) => void;
    onWorkflowRuns: (items: WorkflowRun[]) => void;
    onWorkflowStages: (items: WorkflowStage[]) => void;
    onReviewTasks: (items: ReviewTask[]) => void;
    onLifecycleProposals: (items: LifecycleProposal[]) => void;
    onConversations: (items: Conversation[]) => void;
    onChatMessages: (items: ChatMessage[]) => void;
    onUnansweredQuestions: (items: UnansweredQuestion[]) => void;
    onAuditLogs: (items: AuditLog[]) => void;
    onNotifications: (items: NotificationItem[]) => void;
  }
) {
  if (!auth.currentUser) {
    const syncPreview = () => {
      const readCol = <T>(colName: string, filterByInst: boolean): T[] => {
        const map = previewCollections[colName];
        if (!map) return [];
        const all = Array.from(map.values()) as any[];
        return all.filter((item) =>
          filterByInst
            ? item.ownerId === ownerId && item.institutionId === institutionId
            : item.ownerId === ownerId
        ) as T[];
      };

      callbacks.onInstitutions(readCol('institutions', false));
      callbacks.onDepartments(readCol('departments', true));
      callbacks.onMemberships(readCol('workspace_memberships', true));
      callbacks.onDocuments(readCol('documents', true));
      callbacks.onDocumentVersions(readCol('document_versions', true));
      callbacks.onArticles(readCol('knowledge_articles', true));
      callbacks.onArticleVersions(readCol('article_versions', true));
      callbacks.onChunks(readCol('knowledge_chunks', true));
      callbacks.onWorkflowRuns(readCol('workflow_runs', true));
      callbacks.onWorkflowStages(readCol('workflow_stages', true));
      callbacks.onReviewTasks(readCol('review_tasks', true));
      callbacks.onLifecycleProposals(readCol('lifecycle_proposals', true));
      callbacks.onConversations(readCol('conversations', true));
      callbacks.onChatMessages(readCol('chat_messages', true));
      callbacks.onUnansweredQuestions(readCol('unanswered_questions', true));
      callbacks.onAuditLogs(readCol('audit_logs', true));
      callbacks.onNotifications(readCol('notifications', true));
    };

    previewListeners.add(syncPreview);
    syncPreview();
    return () => {
      previewListeners.delete(syncPreview);
    };
  }

  const unsubs: Array<() => void> = [];

  const listen = <T>(
    colName: string,
    filterByInst: boolean,
    cb: (items: T[]) => void
  ) => {
    const q = filterByInst
      ? query(collection(db, colName), where('ownerId', '==', ownerId), where('institutionId', '==', institutionId))
      : query(collection(db, colName), where('ownerId', '==', ownerId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as T);
        cb(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, colName);
      }
    );
    unsubs.push(unsub);
  };

  listen('institutions', false, callbacks.onInstitutions);
  listen('departments', true, callbacks.onDepartments);
  listen('workspace_memberships', true, callbacks.onMemberships);
  listen('documents', true, callbacks.onDocuments);
  listen('document_versions', true, callbacks.onDocumentVersions);
  listen('knowledge_articles', true, callbacks.onArticles);
  listen('article_versions', true, callbacks.onArticleVersions);
  listen('knowledge_chunks', true, callbacks.onChunks);
  listen('workflow_runs', true, callbacks.onWorkflowRuns);
  listen('workflow_stages', true, callbacks.onWorkflowStages);
  listen('review_tasks', true, callbacks.onReviewTasks);
  listen('lifecycle_proposals', true, callbacks.onLifecycleProposals);
  listen('conversations', true, callbacks.onConversations);
  listen('chat_messages', true, callbacks.onChatMessages);
  listen('unanswered_questions', true, callbacks.onUnansweredQuestions);
  listen('audit_logs', true, callbacks.onAuditLogs);
  listen('notifications', true, callbacks.onNotifications);

  return () => {
    unsubs.forEach((u) => u());
  };
}
