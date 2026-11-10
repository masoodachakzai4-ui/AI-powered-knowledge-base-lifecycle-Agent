export type InstitutionType = 'Academy' | 'School' | 'College' | 'University';

export type UserRole =
  | 'Platform Administrator'
  | 'Institution Administrator'
  | 'Knowledge Manager'
  | 'Human Reviewer'
  | 'Teacher / Faculty Member'
  | 'Student'
  | 'Parent / Guardian';

export type AccessLevel = 'PUBLIC_STUDENT' | 'FACULTY_STAFF' | 'ADMIN_GOVERNANCE' | 'PARENT_GUARDIAN';

export type WorkflowStatus =
  | 'NOT_STARTED'
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'RETRYING'
  | 'REVISION_REQUIRED'
  | 'ACTION_REQUIRED'
  | 'SKIPPED_AND_FLAGGED'
  | 'FAILED'
  | 'WAITING_FOR_HUMAN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'Not Started'
  | 'Queued'
  | 'Running'
  | 'Completed'
  | 'Revision Required'
  | 'Retrying'
  | 'Action Required'
  | 'Waiting for Human Approval'
  | 'Approved'
  | 'Rejected'
  | 'Failed';

export type ArticleStatus =
  | 'AI-SUGGESTED / DRAFT'
  | 'WAITING_FOR_HUMAN_APPROVAL'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'REVISION_REQUESTED'
  | 'RETIRED';

export type LifecycleActionType = 'CREATE' | 'KEEP' | 'UPDATE' | 'RETIRE';

export interface UserProfile {
  uid: string;
  ownerId: string;
  fullName: string;
  email: string;
  role: UserRole;
  institutionId: string;
  institutionName?: string;
  department?: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Institution {
  id: string;
  ownerId: string;
  name: string;
  type: InstitutionType;
  country: string;
  website?: string;
  primaryDepartment?: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Department {
  id: string;
  ownerId: string;
  institutionId: string;
  name: string;
  description?: string;
  headName?: string;
  createdAt: string;
}

export interface WorkspaceMembership {
  id: string;
  ownerId: string;
  institutionId: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: UserRole;
  department?: string;
  status: 'Active' | 'Invited' | 'Suspended';
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  ownerId: string;
  institutionId: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  department: string;
  category: string;
  language?: string;
  effectiveDate?: string;
  expiryDate?: string;
  reviewDate?: string;
  version: number;
  status: 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'OCR_REQUIRED' | 'EXPIRED' | 'RETIRED';
  accessLevel: AccessLevel;
  extractedText: string;
  isSampleData: boolean;
  uploadedBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DocumentVersion {
  id: string;
  ownerId: string;
  institutionId: string;
  documentId: string;
  versionNumber: number;
  title: string;
  extractedText: string;
  changeSummary: string;
  effectiveDate?: string;
  createdBy: string;
  createdAt: string;
}

export interface KnowledgeChunk {
  id: string;
  ownerId: string;
  institutionId: string;
  documentId: string;
  articleId?: string;
  documentTitle: string;
  sectionTitle: string;
  content: string;
  department: string;
  category: string;
  accessLevel: AccessLevel;
  isApproved: boolean;
  effectiveDate?: string;
  createdAt: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface VerificationReport {
  articleTitle: string;
  verificationStatus: 'VERIFIED' | 'VERIFIED WITH WARNINGS' | 'REVISION_REQUIRED' | 'ACTION_REQUIRED';
  sourceDocuments: string[];
  verifiedStatements: string[];
  unsupportedStatements: string[];
  missingInformation: string[];
  conflictingInformation: string[];
  reviewWarnings: string[];
  datesChecked: string[];
  feesAndNumbersChecked: string[];
  accessPermissionValid: boolean;
  revisionRound: number;
  revisionHistoryReports?: Array<{
    round: number;
    status: string;
    feedback: string;
    timestamp: string;
  }>;
}

export interface KnowledgeArticle {
  id: string;
  ownerId: string;
  institutionId: string;
  sourceDocumentId: string;
  sourceDocumentTitle: string;
  title: string;
  summary: string;
  contentMarkdown: string;
  department: string;
  category: string;
  status: ArticleStatus;
  verificationStatus: 'VERIFIED' | 'VERIFIED WITH WARNINGS' | 'REVISION_REQUIRED' | 'ACTION_REQUIRED' | 'PENDING';
  version: number;
  effectiveDate?: string;
  expiryDate?: string;
  reviewDate?: string;
  accessLevel: AccessLevel;
  sourceReferences?: string;
  faqsJson?: string;
  verificationReportJson?: string;
  isSampleData: boolean;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ArticleVersion {
  id: string;
  ownerId: string;
  institutionId: string;
  articleId: string;
  versionNumber: number;
  title: string;
  contentMarkdown: string;
  changeNotes?: string;
  status: string;
  reviewerName?: string;
  createdAt: string;
}

export interface WorkflowRun {
  id: string;
  ownerId: string;
  institutionId: string;
  documentId: string;
  documentTitle: string;
  articleId?: string;
  currentStage: number;
  currentStageName: string;
  status: WorkflowStatus;
  progressPercent: number;
  revisionRound: number;
  retryCount?: number;
  errorMessage?: string;
  submittedAt?: string;
  startedAt: string;
  completedAt?: string;
}

export interface WorkflowStage {
  id: string;
  ownerId: string;
  institutionId: string;
  runId: string;
  stageNumber: number;
  stageName: string;
  status: WorkflowStatus;
  outputSummary: string;
  detailsJson?: string;
  inputReference?: string;
  outputReference?: string;
  errorMessage?: string;
  retryCount?: number;
  revisionCount?: number;
  durationMs?: number;
  startedAt: string;
  completedAt?: string;
}

export interface ReviewTask {
  id: string;
  ownerId: string;
  institutionId: string;
  articleId: string;
  documentId: string;
  runId?: string;
  articleTitle: string;
  department: string;
  category: string;
  verificationStatus: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'SAVED_PENDING';
  reviewerNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface LifecycleProposal {
  id: string;
  ownerId: string;
  institutionId: string;
  articleId?: string;
  documentId: string;
  targetTitle: string;
  department: string;
  actionType: LifecycleActionType;
  reason: string;
  diffSummary?: string;
  oldVersionText?: string;
  newVersionText?: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  ownerId: string;
  institutionId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SourceCitation {
  articleId: string;
  articleTitle: string;
  documentTitle: string;
  sectionTitle: string;
  effectiveDate?: string;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  ownerId: string;
  institutionId: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  citationsJson?: string;
  feedback?: 'HELPFUL' | 'NOT_HELPFUL' | 'REPORTED_INCORRECT';
  createdAt: string;
}

export interface UnansweredQuestion {
  id: string;
  ownerId: string;
  institutionId: string;
  question: string;
  askedByRole: string;
  departmentSuggested?: string;
  status: 'OPEN' | 'ASSIGNED' | 'RESOLVED';
  resolutionNotes?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  ownerId: string;
  institutionId: string;
  actorName: string;
  actorType: 'HUMAN' | 'AI_AGENT';
  action: string;
  targetType: string;
  targetId: string;
  targetTitle: string;
  previousStatus?: string;
  newStatus?: string;
  reason?: string;
  workflowRunId?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  ownerId: string;
  institutionId: string;
  title: string;
  message: string;
  type: 'REVIEW_REQUIRED' | 'ARTICLE_PUBLISHED' | 'LIFECYCLE_ALERT' | 'UNANSWERED_QUERY' | 'WORKFLOW_EVENT';
  read: boolean;
  createdAt: string;
}

export const DEFAULT_DEPARTMENTS = [
  'Admissions',
  'Academics',
  'Examinations',
  'Finance',
  'Scholarships',
  'Student Affairs',
  'Library',
  'Hostel',
  'Transport',
  'Information Technology',
];

export const DEFAULT_CATEGORIES = [
  'Admission Policies',
  'Fee Structures',
  'Scholarship Policies',
  'Academic Calendars',
  'Examination Rules',
  'Attendance Policies',
  'Course Information',
  'Timetables',
  'Student Handbooks',
  'Faculty Guidelines',
  'Library Rules',
  'Hostel Policies',
  'Transport Information',
  'Campus Rules',
  'Student Affairs',
  'IT Guidelines',
];

export const INSTITUTION_TERMINOLOGY: Record<
  InstitutionType,
  {
    learnerLabel: string;
    educatorLabel: string;
    unitLabel: string;
    programLabel: string;
  }
> = {
  Academy: {
    learnerLabel: 'Trainees & Learners',
    educatorLabel: 'Instructors & Mentors',
    unitLabel: 'Training Tracks',
    programLabel: 'Certificate & Bootcamp Programs',
  },
  School: {
    learnerLabel: 'Students & Pupils',
    educatorLabel: 'Teachers & Class Advisors',
    unitLabel: 'Grade Wings & Departments',
    programLabel: 'Academic Streams',
  },
  College: {
    learnerLabel: 'Undergraduate Students',
    educatorLabel: 'Faculty & Lecturers',
    unitLabel: 'Academic Departments',
    programLabel: 'Degree & Diploma Programs',
  },
  University: {
    learnerLabel: 'Undergraduate & Graduate Students',
    educatorLabel: 'Professors & Faculty Members',
    unitLabel: 'Faculties & Departments',
    programLabel: 'Undergraduate, Masters & Doctoral Programs',
  },
};
