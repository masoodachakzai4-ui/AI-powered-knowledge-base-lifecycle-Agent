import React from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CalendarX2,
  CheckCircle2,
  Clock,
  CloudUpload,
  FileText,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  PieChart as PieChartIcon,
  Play,
  RefreshCw,
  Rocket,
  Settings,
  Tag,
  Upload,
  UserCheck,
  Workflow,
} from 'lucide-react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { DEMO_DISCLAIMER } from '../data/demoSeed';
import {
  AuditLog,
  ChatMessage,
  Department,
  DocumentRecord,
  Institution,
  KnowledgeArticle,
  LifecycleProposal,
  ReviewTask,
  UnansweredQuestion,
  UserProfile,
  WorkflowRun,
  WorkflowStage,
} from '../types/domain';

interface DashboardViewProps {
  userProfile?: UserProfile | null;
  institution: Institution;
  departments: Department[];
  documents: DocumentRecord[];
  articles: KnowledgeArticle[];
  reviewTasks: ReviewTask[];
  workflowRuns: WorkflowRun[];
  workflowStages?: WorkflowStage[];
  lifecycleProposals: LifecycleProposal[];
  unansweredQuestions: UnansweredQuestion[];
  chatMessages: ChatMessage[];
  auditLogs?: AuditLog[];
  onNavigate: (tab: string) => void;
  onSwitchToDemoWorkspace: () => Promise<void>;
  isSwitchingDemo: boolean;
}

const DONUT_COLORS_DEPT = ['#029D97', '#10A352', '#7C3AED', '#F59E0B', '#0EA5E9', '#EC4899'];
const DONUT_COLORS_CAT = ['#029D97', '#10A352', '#8B5CF6', '#F59E0B', '#06B6D4', '#F43F5E'];
const DONUT_COLORS_LIFECYCLE = ['#10A352', '#029D97', '#F59E0B', '#EF4444', '#64748B'];

function formatRelativeTime(isoString?: string): string {
  if (!isoString) return 'Just now';
  const diffMs = Date.now() - new Date(isoString).getTime();
  if (Number.isNaN(diffMs) || diffMs < 60_000) return 'Just now';
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function formatDurationBadge(durationMs?: number): string {
  if (!durationMs || durationMs <= 0) return '';
  if (durationMs < 1000) return `(${durationMs} ms)`;
  const secs = Math.max(1, Math.round(durationMs / 1000));
  return `(${secs}s)`;
}

function formatStageStatusForStepper(rawStatus?: string): {
  label: string;
  textColor: string;
  circleBg: string;
  isComplete: boolean;
  isRunning: boolean;
} {
  if (!rawStatus) {
    return {
      label: 'Queued',
      textColor: 'text-slate-500',
      circleBg: 'bg-slate-200 text-slate-600',
      isComplete: false,
      isRunning: false,
    };
  }
  const u = rawStatus.toUpperCase().trim();
  if (u === 'COMPLETED' || u === 'APPROVED') {
    return {
      label: u === 'APPROVED' ? 'Approved' : 'Completed',
      textColor: 'text-[#109848] font-semibold',
      circleBg: 'bg-[#109848] text-white',
      isComplete: true,
      isRunning: false,
    };
  }
  if (u === 'RUNNING' || u === 'RETRYING') {
    return {
      label: 'Running',
      textColor: 'text-[#029D97] font-semibold',
      circleBg: 'bg-[#029D97] text-white animate-pulse',
      isComplete: false,
      isRunning: true,
    };
  }
  if (u.includes('WAITING') || u.includes('HUMAN')) {
    return {
      label: 'Waiting for Human Review',
      textColor: 'text-amber-700 font-semibold',
      circleBg: 'bg-slate-300 text-slate-800',
      isComplete: false,
      isRunning: false,
    };
  }
  if (u.includes('REVISION') || u.includes('ACTION')) {
    return {
      label: 'Revision Required',
      textColor: 'text-amber-700 font-semibold',
      circleBg: 'bg-amber-500 text-white',
      isComplete: false,
      isRunning: false,
    };
  }
  if (u === 'FAILED' || u === 'REJECTED') {
    return {
      label: u === 'REJECTED' ? 'Rejected' : 'Failed',
      textColor: 'text-rose-600 font-semibold',
      circleBg: 'bg-rose-600 text-white',
      isComplete: false,
      isRunning: false,
    };
  }
  return {
    label: 'Queued',
    textColor: 'text-slate-500',
    circleBg: 'bg-slate-200 text-slate-600',
    isComplete: false,
    isRunning: false,
  };
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  userProfile,
  institution,
  documents,
  articles,
  workflowRuns,
  workflowStages = [],
  lifecycleProposals,
  unansweredQuestions,
  chatMessages,
  auditLogs = [],
  onNavigate,
  onSwitchToDemoWorkspace,
  isSwitchingDemo,
}) => {
  const publishedArticles = articles.filter((a) => a.status === 'PUBLISHED');
  const pendingReviews = articles.filter((a) => a.status === 'WAITING_FOR_HUMAN_APPROVAL');
  const processingDocs = documents.filter((d) => d.status === 'PROCESSING');
  const updateRequiredCount = lifecycleProposals.filter(
    (p) => p.actionType === 'UPDATE' && p.status === 'PENDING_APPROVAL'
  ).length;

  const todayIso = new Date().toISOString().slice(0, 10);
  const expiredDocs = documents.filter(
    (d) => d.status === 'EXPIRED' || (d.expiryDate && d.expiryDate < todayIso)
  );
  const openUnanswered = unansweredQuestions.filter((q) => q.status === 'OPEN');

  // Panel 1: Documents by Department (Donut + Percentages)
  const deptCountsMap = new Map<string, number>();
  for (const docItem of documents) {
    deptCountsMap.set(docItem.department, (deptCountsMap.get(docItem.department) || 0) + 1);
  }
  const totalDocsForPct = Math.max(1, documents.length);
  const deptChartData = Array.from(deptCountsMap.entries())
    .map(([name, value]) => ({
      name,
      value,
      pct: Math.round((value / totalDocsForPct) * 100),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Panel 2: Knowledge by Category (Donut + Percentages)
  const catCountsMap = new Map<string, number>();
  for (const art of articles) {
    catCountsMap.set(art.category, (catCountsMap.get(art.category) || 0) + 1);
  }
  const totalArticlesForPct = Math.max(1, articles.length);
  const catChartData = Array.from(catCountsMap.entries())
    .map(([name, value]) => ({
      name: name.replace(' Policies', '').replace(' Guidelines', '').replace(' Rules', ''),
      fullName: name,
      value,
      pct: Math.round((value / totalArticlesForPct) * 100),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Panel 3: Document Lifecycle Status (Donut + Percentages)
  const retiredCount =
    articles.filter((a) => a.status === 'RETIRED').length + expiredDocs.length;
  const rawLifecycleItems = [
    { name: 'Approved', value: publishedArticles.length },
    { name: 'Under Review', value: pendingReviews.length + processingDocs.length },
    { name: 'Update', value: updateRequiredCount },
    { name: 'Retired', value: retiredCount },
  ];
  const totalLifecycleCount = Math.max(
    1,
    rawLifecycleItems.reduce((acc, item) => acc + item.value, 0)
  );
  const lifecycleChartData = rawLifecycleItems.map((item) => ({
    ...item,
    pct:
      rawLifecycleItems.reduce((a, b) => a + b.value, 0) === 0
        ? 0
        : Math.round((item.value / totalLifecycleCount) * 100),
  }));
  const activeLifecycleSlices = lifecycleChartData.filter((d) => d.value > 0);

  // Panel 4: Recent Activity (from real Audit Logs)
  const recentAuditItems = auditLogs
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  // Latest workflow run for the Dashboard AI Agent Workflow Overview
  const sortedRuns = workflowRuns
    .slice()
    .sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''));
  const latestRun = sortedRuns[0];
  const latestRunStages = latestRun
    ? workflowStages.filter((s) => s.runId === latestRun.id)
    : [];

  const getStageRecord = (stageNum: number) =>
    latestRunStages.find((s) => s.stageNumber === stageNum);

  // Getting Started Onboarding Milestones
  const hasWorkspace = Boolean(institution?.id);
  const hasDocuments = documents.length > 0;
  const hasProcessedWorkflow = workflowRuns.length > 0 || articles.length > 0;
  const hasApprovedArticles = publishedArticles.length > 0;
  const hasAskedAssistant = chatMessages.some((m) => m.role === 'user');

  const gettingStartedSteps = [
    {
      num: 1,
      shortTitle: '1. Create Workspace',
      fullTitle: 'STEP 1: Create Institution Workspace',
      completed: hasWorkspace,
      tab: 'institution',
      icon: Building2,
    },
    {
      num: 2,
      shortTitle: '2. Upload Documents',
      fullTitle: 'STEP 2: Upload Educational Documents',
      completed: hasDocuments,
      tab: 'upload',
      icon: CloudUpload,
    },
    {
      num: 3,
      shortTitle: '3. Process with AI Agents',
      fullTitle: 'STEP 3: Process Documents with Four AI Agents',
      completed: hasProcessedWorkflow,
      tab: 'workflow',
      icon: Settings,
    },
    {
      num: 4,
      shortTitle: '4. Review & Approve',
      fullTitle: 'STEP 4: Review and Approve Knowledge Articles',
      completed: hasApprovedArticles,
      tab: 'review',
      icon: CheckCircle2,
    },
    {
      num: 5,
      shortTitle: '5. Start Asking Questions',
      fullTitle: 'STEP 5: Ask Questions Using Knowledge Assistant',
      completed: hasAskedAssistant,
      tab: 'assistant',
      icon: MessageSquare,
    },
  ];

  const nextOnboardingStep =
    gettingStartedSteps.find((s) => !s.completed) || gettingStartedSteps[1];

  const nextStepCalloutText = !hasDocuments
    ? 'Upload your educational documents to get started.'
    : !hasProcessedWorkflow
      ? 'Process your uploaded documents with the four sequential AI agents.'
      : !hasApprovedArticles
        ? 'Review and approve your AI-verified draft in Human Review.'
        : 'Ask questions in the Knowledge Assistant or upload new policies.';

  // 8 KPI Cards (Matching Reference Image Layout & Database-Derived Counts)
  const kpiCards = [
    {
      label: 'Total Documents',
      value: documents.length,
      badge: `+${documents.length}`,
      tab: 'upload',
      icon: FileText,
      iconBoxClass: 'bg-[#E4F7F6] text-[#029D97]',
    },
    {
      label: 'Approved Articles',
      value: publishedArticles.length,
      badge: `+${publishedArticles.length}`,
      tab: 'library',
      icon: BookOpen,
      iconBoxClass: 'bg-[#E3F7EC] text-[#109848]',
    },
    {
      label: 'Pending Reviews',
      value: pendingReviews.length,
      badge: `+${pendingReviews.length}`,
      tab: 'review',
      icon: Clock,
      iconBoxClass: 'bg-[#FFF0E0] text-[#EA7A13]',
    },
    {
      label: 'Documents Processing',
      value: processingDocs.length,
      badge: `+${processingDocs.length}`,
      tab: 'workflow',
      icon: Settings,
      iconBoxClass: 'bg-[#F1E8FF] text-[#7C3AED]',
    },
    {
      label: 'Documents Requiring Updates',
      value: updateRequiredCount,
      badge: `+${updateRequiredCount}`,
      tab: 'lifecycle',
      icon: RefreshCw,
      iconBoxClass: 'bg-[#E4F7F6] text-[#029D97]',
    },
    {
      label: 'Expired Documents',
      value: expiredDocs.length,
      badge: `+${expiredDocs.length}`,
      tab: 'lifecycle',
      icon: CalendarX2,
      iconBoxClass: 'bg-[#FFE8E8] text-[#E11D48]',
    },
    {
      label: 'Unanswered Questions',
      value: openUnanswered.length,
      badge: `+${openUnanswered.length}`,
      tab: 'unanswered',
      icon: HelpCircle,
      iconBoxClass: 'bg-[#E4F7F6] text-[#029D97]',
    },
    {
      label: 'Total Workflow Runs',
      value: workflowRuns.length,
      badge: `+${workflowRuns.length}`,
      tab: 'workflow',
      icon: CheckCircle2,
      iconBoxClass: 'bg-[#E3F7EC] text-[#109848]',
    },
  ];

  // Five-Stage Workflow Stepper Items (Section 5)
  const fiveWorkflowStages = [
    {
      num: 1,
      shortLabel: '01. Orchestrator Agent',
      compactTitle: '1. Orchestrator',
      isHuman: false,
    },
    {
      num: 2,
      shortLabel: '02. Knowledge Intake and Organizer Agent',
      compactTitle: '2. Organizer',
      isHuman: false,
    },
    {
      num: 3,
      shortLabel: '03. Knowledge Curator and Author Agent',
      compactTitle: '3. Author',
      isHuman: false,
    },
    {
      num: 4,
      shortLabel: '04. Knowledge Verifier Agent',
      compactTitle: '4. Verifier',
      isHuman: false,
    },
    {
      num: 5,
      shortLabel: '05. Human Reviewer — NOT AN AI AGENT',
      compactTitle: '5. Human Review',
      isHuman: true,
    },
  ];

  const getWorkflowBannerSummary = () => {
    if (!latestRun) {
      return 'No workflow runs executed yet. Select "Start AI Workflow" to run Stages 01–04 followed by Stage 05 Human Review.';
    }
    if (latestRun.status === 'WAITING_FOR_HUMAN_REVIEW' || latestRun.status === 'ACTION_REQUIRED') {
      return `Stages 1–4 completed for "${latestRun.documentTitle}". Waiting for human review in Stage 05...`;
    }
    if (latestRun.status === 'APPROVED') {
      return `All 5 stages completed and approved by Human Reviewer for "${latestRun.documentTitle}".`;
    }
    if (latestRun.status === 'RUNNING') {
      return `Executing Stage 0${latestRun.currentStage} (${latestRun.currentStageName}) for "${latestRun.documentTitle}"...`;
    }
    if (latestRun.status === 'FAILED') {
      return `Workflow halted at Stage 0${latestRun.currentStage}: ${latestRun.errorMessage || 'Inspect AI Agent Workflow details.'}`;
    }
    return `Latest workflow run status: ${latestRun.status}`;
  };

  return (
    <div className="space-y-5">
      {/* Demo Workspace Notice */}
      {institution.isDemo && (
        <div className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-slate-900">
          <div className="text-xs text-amber-900">
            <span className="font-mono font-bold mr-2">{DEMO_DISCLAIMER}</span>
            <span>
              Viewing real Firestore records in <strong>{institution.name}</strong>.
            </span>
          </div>
          <button
            onClick={() => onNavigate('upload')}
            className="text-xs font-semibold text-amber-950 underline hover:text-amber-700 cursor-pointer shrink-0"
          >
            Upload New Policy →
          </button>
        </div>
      )}

      {/* =====================================================================
          SECTION 3: HERO BANNER WITH CAMPUS GRAPHIC & THREE PRIMARY ACTIONS
          ===================================================================== */}
      <div className="relative rounded-2xl overflow-hidden border border-[#B2E6E3] bg-gradient-to-r from-[#DFF5F4] via-[#EBFAF9] to-[#CEEFED] shadow-xs">
        {/* Decorative Architectural Campus Graphic on Right (Pure SVG/CSS Matching Reference Banner) */}
        <div
          aria-hidden="true"
          className="hidden lg:block absolute inset-y-0 right-0 w-[44%] pointer-events-none overflow-hidden"
        >
          {/* Diagonal Sky & Ribbon Accents */}
          <div className="absolute -left-12 inset-y-0 w-28 bg-gradient-to-r from-[#EBFAF9] via-[#EBFAF9]/90 to-transparent z-10" />
          <div className="absolute -right-8 -bottom-10 w-64 h-28 bg-[#029D97]/20 -rotate-12 rounded-3xl" />
          <div className="absolute right-12 -top-10 w-48 h-24 bg-[#029D97]/15 rotate-12 rounded-3xl" />

          {/* Illustrated University Campus Facade SVG */}
          <svg
            viewBox="0 0 500 220"
            className="w-full h-full object-cover object-right opacity-95"
            preserveAspectRatio="xMaxYMid slice"
          >
            <defs>
              <linearGradient id="skyGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#B8EBE8" />
                <stop offset="100%" stopColor="#7FD8D3" />
              </linearGradient>
              <linearGradient id="brickGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D99B72" />
                <stop offset="100%" stopColor="#B8764E" />
              </linearGradient>
            </defs>
            <rect width="500" height="220" fill="url(#skyGrad)" />
            {/* Soft Clouds */}
            <circle cx="140" cy="45" r="26" fill="#FFFFFF" fillOpacity="0.55" />
            <circle cx="170" cy="48" r="20" fill="#FFFFFF" fillOpacity="0.55" />
            <circle cx="390" cy="38" r="24" fill="#FFFFFF" fillOpacity="0.45" />
            {/* Campus Lawn */}
            <path d="M80 185 Q280 168 500 185 L500 220 L80 220 Z" fill="#1E8E4E" />
            {/* Left & Right Wings */}
            <rect x="135" y="96" width="95" height="90" fill="url(#brickGrad)" stroke="#F8FAFC" strokeWidth="2" />
            <rect x="330" y="96" width="95" height="90" fill="url(#brickGrad)" stroke="#F8FAFC" strokeWidth="2" />
            {/* Wing Roofs */}
            <polygon points="128,96 182,68 235,96" fill="#334E68" />
            <polygon points="325,96 378,68 432,96" fill="#334E68" />
            {/* Central Classical Hall */}
            <rect x="215" y="74" width="130" height="112" fill="#E6AD86" stroke="#FFFFFF" strokeWidth="2.5" />
            {/* Classical Pediment Roof */}
            <polygon points="205,74 280,32 355,74" fill="#243B53" stroke="#FFFFFF" strokeWidth="2.5" />
            <circle cx="280" cy="56" r="9" fill="#F8FAFC" />
            {/* Pillars */}
            <rect x="232" y="84" width="8" height="96" fill="#F8FAFC" />
            <rect x="258" y="84" width="8" height="96" fill="#F8FAFC" />
            <rect x="294" y="84" width="8" height="96" fill="#F8FAFC" />
            <rect x="320" y="84" width="8" height="96" fill="#F8FAFC" />
            {/* Arch Entrance */}
            <rect x="269" y="138" width="22" height="48" rx="11" fill="#1E293B" />
            {/* Windows */}
            {[152, 178, 204].map((x) => (
              <rect key={`lw-${x}`} x={x} y="112" width="14" height="22" rx="2" fill="#E4F7F6" stroke="#FFFFFF" strokeWidth="1.5" />
            ))}
            {[152, 178, 204].map((x) => (
              <rect key={`lw2-${x}`} x={x} y="146" width="14" height="22" rx="2" fill="#E4F7F6" stroke="#FFFFFF" strokeWidth="1.5" />
            ))}
            {[346, 372, 398].map((x) => (
              <rect key={`rw-${x}`} x={x} y="112" width="14" height="22" rx="2" fill="#E4F7F6" stroke="#FFFFFF" strokeWidth="1.5" />
            ))}
            {[346, 372, 398].map((x) => (
              <rect key={`rw2-${x}`} x={x} y="146" width="14" height="22" rx="2" fill="#E4F7F6" stroke="#FFFFFF" strokeWidth="1.5" />
            ))}
            {/* Trees */}
            <circle cx="125" cy="165" r="24" fill="#15803D" />
            <circle cx="445" cy="155" r="32" fill="#166534" />
            <circle cx="475" cy="168" r="26" fill="#15803D" />
            {/* Diagonal #029D97 Accent Ribbon */}
            <polygon points="395,220 500,155 500,220" fill="#029D97" />
            <polygon points="435,220 500,178 500,220" fill="#02847F" />
          </svg>
        </div>

        {/* Left Banner Content */}
        <div className="relative z-10 p-5 sm:p-6 lg:px-7 lg:py-6 max-w-3xl space-y-3.5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#029D97] bg-white/85 backdrop-blur-xs px-2.5 py-0.5 rounded-md border border-[#96E0DC]">
              <span>Welcome to Your Educational Knowledge Workspace</span>
              <span aria-hidden="true">·</span>
              <span>{institution.name.replace(' — Sample Workspace', '')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Good Morning,{' '}
              <span className="text-[#029D97]">
                {userProfile?.fullName || 'Administrator'}!
              </span>
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-700">
              Manage, verify and maintain your institution&apos;s knowledge in one intelligent platform.
            </p>
          </div>

          {/* Three Primary Actions with #029D97 Executive Theme */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              onClick={() => onNavigate('upload')}
              className="px-4 py-2.5 text-xs font-bold text-white bg-[#029D97] hover:bg-[#02847F] rounded-xl flex items-center gap-2 shadow-sm cursor-pointer transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Document</span>
            </button>

            <button
              onClick={() => onNavigate('assistant')}
              className="px-4 py-2.5 text-xs font-bold text-[#029D97] bg-white/95 hover:bg-white border border-[#74D2CD] rounded-xl flex items-center gap-2 shadow-2xs cursor-pointer transition-all"
            >
              <MessageSquare className="w-4 h-4 text-[#029D97]" />
              <span>Open Knowledge Assistant</span>
            </button>

            <button
              onClick={() => onNavigate('workflow')}
              className="px-4 py-2.5 text-xs font-bold text-white bg-[#029D97] hover:bg-[#02847F] rounded-xl flex items-center gap-2 shadow-sm cursor-pointer transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start AI Workflow</span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          SECTION 3B: EIGHT PROFESSIONAL KPI CARDS (8-COLUMN DESKTOP GRID)
          ===================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
        {kpiCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <button
              key={card.label}
              onClick={() => onNavigate(card.tab)}
              className="bg-white rounded-2xl border border-slate-200/80 p-3.5 text-left hover:border-[#029D97] hover:shadow-md transition-all cursor-pointer shadow-2xs flex flex-col justify-between group"
            >
              <div>
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${card.iconBoxClass}`}
                >
                  <IconComponent className="w-5 h-5" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums leading-none">
                  {card.value}
                </div>
                <div className="text-[11px] font-semibold text-slate-600 mt-1.5 leading-snug line-clamp-1">
                  {card.label}
                </div>
              </div>
              <div className="mt-2.5">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#E4F7F6] text-[#029D97] tabular-nums">
                  ↑ {card.badge}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Honest Empty Workspace Banner when 0 documents exist */}
      {documents.length === 0 && (
        <div className="p-4 rounded-2xl bg-white border border-[#96E0DC] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div>
            <h3 className="text-xs font-bold text-slate-900">
              Your Workspace Currently Has 0 Uploaded Documents
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              All eight KPI cards above display live database records (0). Upload your first institutional policy or load the sample Demo University workspace.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('upload')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#029D97] hover:bg-[#02847F] rounded-xl cursor-pointer"
            >
              Upload First Document
            </button>
            <button
              onClick={onSwitchToDemoWorkspace}
              disabled={isSwitchingDemo}
              className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer disabled:opacity-50"
            >
              {isSwitchingDemo ? 'Loading Demo...' : 'Load Demo University'}
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 4: FOUR PROFESSIONAL VISUALIZATION PANELS (4-COLUMN ROW)
          ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Panel 1: Documents by Department */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
          <div className="bg-[#101F3C] text-white px-4 py-2.5 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#609BFF] shrink-0" />
            <h2 className="text-xs font-bold tracking-wide truncate">
              Documents by Department
            </h2>
          </div>

          <div className="p-4 flex-1 flex items-center justify-between gap-2 min-h-[168px]">
            {deptChartData.length > 0 ? (
              <>
                <div className="w-32 h-32 relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deptChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={54}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {deptChartData.map((_entry, index) => (
                          <Cell
                            key={`dept-${index}`}
                            fill={DONUT_COLORS_DEPT[index % DONUT_COLORS_DEPT.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-extrabold text-slate-900 font-mono tabular-nums leading-none">
                      {documents.length}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 mt-0.5">
                      Total
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-1.5 min-w-0">
                  {deptChartData.map((item, idx) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between gap-1.5 text-xs"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              DONUT_COLORS_DEPT[idx % DONUT_COLORS_DEPT.length],
                          }}
                        />
                        <span className="text-slate-700 font-medium truncate text-[11px]">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 font-mono tabular-nums text-[11px] shrink-0">
                        {item.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="w-full text-center text-xs text-slate-400 py-8">
                No department documents uploaded yet.
              </div>
            )}
          </div>
        </div>

        {/* Panel 2: Knowledge by Category */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
          <div className="bg-[#101F3C] text-white px-4 py-2.5 flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#609BFF] shrink-0" />
            <h2 className="text-xs font-bold tracking-wide truncate">
              Knowledge by Category
            </h2>
          </div>

          <div className="p-4 flex-1 flex items-center justify-between gap-2 min-h-[168px]">
            {catChartData.length > 0 ? (
              <>
                <div className="w-32 h-32 relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={catChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={54}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {catChartData.map((_entry, index) => (
                          <Cell
                            key={`cat-${index}`}
                            fill={DONUT_COLORS_CAT[index % DONUT_COLORS_CAT.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-extrabold text-slate-900 font-mono tabular-nums leading-none">
                      {articles.length}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 mt-0.5">
                      Articles
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-1.5 min-w-0">
                  {catChartData.map((item, idx) => (
                    <div
                      key={item.fullName}
                      className="flex items-center justify-between gap-1.5 text-xs"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              DONUT_COLORS_CAT[idx % DONUT_COLORS_CAT.length],
                          }}
                        />
                        <span className="text-slate-700 font-medium truncate text-[11px]">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 font-mono tabular-nums text-[11px] shrink-0">
                        {item.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="w-full text-center text-xs text-slate-400 py-8">
                Run AI Workflow to generate categorized articles.
              </div>
            )}
          </div>
        </div>

        {/* Panel 3: Document Lifecycle Status */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
          <div className="bg-[#101F3C] text-white px-4 py-2.5 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-[#609BFF] shrink-0" />
            <h2 className="text-xs font-bold tracking-wide truncate">
              Document Lifecycle Status
            </h2>
          </div>

          <div className="p-4 flex-1 flex items-center justify-between gap-2 min-h-[168px]">
            {activeLifecycleSlices.length > 0 ? (
              <>
                <div className="w-32 h-32 relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={activeLifecycleSlices}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={54}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {activeLifecycleSlices.map((_entry, index) => (
                          <Cell
                            key={`life-${index}`}
                            fill={
                              DONUT_COLORS_LIFECYCLE[
                                index % DONUT_COLORS_LIFECYCLE.length
                              ]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-extrabold text-slate-900 font-mono tabular-nums leading-none">
                      {documents.length}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 mt-0.5">
                      Docs
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-1.5 min-w-0">
                  {lifecycleChartData.map((item, idx) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between gap-1.5 text-xs"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              DONUT_COLORS_LIFECYCLE[
                                idx % DONUT_COLORS_LIFECYCLE.length
                              ],
                          }}
                        />
                        <span className="text-slate-700 font-medium truncate text-[11px]">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 font-mono tabular-nums text-[11px] shrink-0">
                        {item.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="w-full text-center text-xs text-slate-400 py-8">
                No lifecycle records yet.
              </div>
            )}
          </div>
        </div>

        {/* Panel 4: Recent Activity */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
          <div className="bg-[#101F3C] text-white px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="w-4 h-4 text-[#609BFF] shrink-0" />
              <h2 className="text-xs font-bold tracking-wide truncate">
                Recent Activity
              </h2>
            </div>
            <button
              onClick={() => onNavigate('audit')}
              className="text-[11px] font-semibold text-[#7FB2FF] hover:text-white flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-4 flex-1 flex flex-col justify-center min-h-[168px]">
            {recentAuditItems.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-6">
                No recent workspace activity recorded yet.
              </div>
            ) : (
              <div className="relative pl-4 space-y-2.5 before:content-[''] before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-slate-200">
                {recentAuditItems.map((log, idx) => {
                  const dotColors = [
                    'bg-[#109848]',
                    'bg-[#1D63ED]',
                    'bg-[#0D9488]',
                    'bg-[#F59E0B]',
                    'bg-[#E11D48]',
                  ];
                  return (
                    <div
                      key={log.id}
                      className="relative flex items-center justify-between gap-2 text-xs"
                    >
                      <span
                        className={`absolute -left-[15px] w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                          dotColors[idx % dotColors.length]
                        }`}
                      />
                      <span className="font-semibold text-slate-800 truncate text-[11px]">
                        {log.targetTitle || log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap shrink-0">
                        {formatRelativeTime(log.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          SECTION 4A & 4B / 5: BOTTOM TWO-COLUMN ROW
          Left: Getting Started (5 Onboarding Steps)
          Right: AI Agent Workflow (Stages 01–04 AI Agents + Stage 05 Human Reviewer)
          ===================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        {/* Left Card (6 cols): Getting Started */}
        <div className="xl:col-span-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col justify-between">
          <div className="bg-[#101F3C] text-white px-5 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-[#609BFF]" />
              <h2 className="text-xs font-bold tracking-wide">Getting Started</h2>
            </div>
            <button
              onClick={() => onNavigate('getting-started')}
              className="text-[11px] font-semibold text-[#7FB2FF] hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <span>Full Guide</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between space-y-5">
            <div>
              <p className="text-xs font-bold text-slate-800 mb-4">
                Let&apos;s build your institution&apos;s knowledge base.
              </p>

              {/* 5 Connected Circular Onboarding Steps */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 relative">
                {gettingStartedSteps.map((step, idx) => {
                  const StepIcon = step.icon;
                  return (
                    <button
                      key={step.num}
                      onClick={() => onNavigate(step.tab)}
                      title={step.fullTitle}
                      className="flex flex-col items-center text-center group cursor-pointer relative"
                    >
                      {/* Connector Arrow on Desktop */}
                      {idx < gettingStartedSteps.length - 1 && (
                        <div
                          aria-hidden="true"
                          className="hidden sm:flex items-center justify-center absolute top-5 left-[62%] w-[76%] pointer-events-none"
                        >
                          <div className="h-[1.5px] w-full bg-slate-300" />
                          <ArrowRight className="w-3 h-3 text-slate-400 -ml-1.5 shrink-0" />
                        </div>
                      )}

                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 z-10 ${
                          step.completed
                            ? 'bg-[#029D97] text-white'
                            : 'bg-[#029D97] text-white'
                        }`}
                      >
                        <StepIcon className="w-4 h-4" />
                      </div>

                      <div className="text-[11px] font-bold text-slate-800 mt-2 leading-tight">
                        {step.shortTitle}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 hidden sm:block line-clamp-1">
                        {step.completed ? 'Completed' : 'Open Step'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Callout Bar with "Start Here ->" Button */}
            <div className="bg-[#E4F7F6] border border-[#96E0DC] rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-800">
                <Lightbulb className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <span>
                  <strong className="font-bold text-[#029D97]">Next Step:</strong>{' '}
                  {nextStepCalloutText}
                </span>
              </div>
              <button
                onClick={() => onNavigate(nextOnboardingStep.tab)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#029D97] hover:bg-[#02847F] rounded-xl flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-2xs transition-colors"
              >
                <span>Start Here</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Card (6 cols): AI Agent Workflow (Five-Stage Sequential Pipeline) */}
        <div className="xl:col-span-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col justify-between">
          <div className="bg-[#101F3C] text-white px-5 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Workflow className="w-4 h-4 text-[#029D97]" />
              <h2 className="text-xs font-bold tracking-wide">AI Agent Workflow</h2>
              <span className="hidden sm:inline-block text-[10px] font-medium text-[#99F6E4] bg-white/10 px-2 py-0.5 rounded-md">
                Author ↔ Verifier Loop (Max 2 Rounds)
              </span>
            </div>
            <button
              onClick={() => onNavigate('workflow')}
              className="text-[11px] font-semibold text-[#5EEAD4] hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <span>View Details</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between space-y-5">
            {/* 5-Stage Sequential Stepper (Stages 01-04 Automated AI + Stage 05 Separate Human Reviewer) */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 mb-3">
                <span>
                  <strong>Stages 01–04:</strong> Automated AI Agents
                </span>
                <span className="text-emerald-800 font-semibold">
                  <strong>Stage 05:</strong> Human Reviewer — NOT AN AI AGENT
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 relative">
                {fiveWorkflowStages.map((stg, idx) => {
                  const stageRecord = getStageRecord(stg.num);
                  const statusInfo = formatStageStatusForStepper(stageRecord?.status);
                  const durBadge = formatDurationBadge(stageRecord?.durationMs);

                  return (
                    <button
                      key={stg.num}
                      onClick={() => onNavigate(stg.isHuman ? 'review' : 'workflow')}
                      title={stg.shortLabel}
                      className={`flex flex-col items-center text-center group cursor-pointer relative ${
                        stg.isHuman
                          ? 'sm:border-l sm:border-dashed sm:border-slate-300 sm:pl-2'
                          : ''
                      }`}
                    >
                      {/* Connector Line + Arrow */}
                      {idx < fiveWorkflowStages.length - 1 && (
                        <div
                          aria-hidden="true"
                          className="hidden sm:flex items-center justify-center absolute top-5 left-[62%] w-[76%] pointer-events-none"
                        >
                          <div
                            className={`h-[1.5px] w-full ${
                              statusInfo.isComplete ? 'bg-[#109848]' : 'bg-slate-300'
                            }`}
                          />
                          <ArrowRight
                            className={`w-3 h-3 -ml-1.5 shrink-0 ${
                              statusInfo.isComplete ? 'text-[#109848]' : 'text-slate-400'
                            }`}
                          />
                        </div>
                      )}

                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 z-10 ${statusInfo.circleBg}`}
                      >
                        {stg.isHuman ? (
                          <UserCheck className="w-4 h-4" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                      </div>

                      <div className="text-[11px] font-bold text-slate-900 mt-2 leading-tight">
                        {stg.compactTitle}
                      </div>
                      <div className={`text-[10px] mt-0.5 leading-tight ${statusInfo.textColor}`}>
                        {statusInfo.label}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono tabular-nums mt-0.5">
                        {stg.isHuman ? 'Not an AI Agent' : durBadge || 'Sequential'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Live Workflow Status Banner */}
            <div
              onClick={() =>
                onNavigate(
                  latestRun?.status === 'WAITING_FOR_HUMAN_REVIEW' ? 'review' : 'workflow'
                )
              }
              className={`rounded-xl px-4 py-2.5 border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                latestRun?.status === 'FAILED'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-[#E5F7ED] border-[#A8E6C3] text-[#0D6832] hover:bg-[#D8F3E5]'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-medium min-w-0">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#109848]" />
                <span className="truncate">{getWorkflowBannerSummary()}</span>
              </div>
              <span className="text-[11px] font-bold underline shrink-0">
                {latestRun?.status === 'WAITING_FOR_HUMAN_REVIEW'
                  ? 'Review Draft →'
                  : 'Inspect →'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
