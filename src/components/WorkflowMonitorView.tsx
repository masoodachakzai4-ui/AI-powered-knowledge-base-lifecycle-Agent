import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  FlaskConical,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Upload,
  UserCheck,
  Workflow,
  XCircle,
} from 'lucide-react';
import {
  DocumentRecord,
  WorkflowRun,
  WorkflowStage,
} from '../types/domain';
import { PageHeroBanner } from './PageHeroBanner';

interface WorkflowMonitorViewProps {
  isAuthenticated?: boolean;
  documents: DocumentRecord[];
  workflowRuns: WorkflowRun[];
  workflowStages: WorkflowStage[];
  isRunningPipeline: boolean;
  onStartPipeline: (
    docRecord: DocumentRecord,
    options?: { simulateUnsupportedClaimTest?: boolean }
  ) => Promise<void>;
  onCreateTestCorruptedDoc?: () => Promise<DocumentRecord>;
  onNavigateToUpload?: () => void;
  onNavigateToReview: (articleId?: string) => void;
}

type QueueFilter = 'All' | 'Queued' | 'Running' | 'Completed' | 'Failed' | 'Waiting for Review';

const SUPPORTED_MIME_KEYWORDS = ['pdf', 'word', 'docx', 'text', 'txt', 'csv', 'plain'];

function normalizeStatusKey(rawStatus?: string): string {
  if (!rawStatus) return 'NOT_STARTED';
  const u = rawStatus.toUpperCase().trim();
  if (u === 'NOT STARTED' || u === 'NOT_STARTED') return 'NOT_STARTED';
  if (u === 'QUEUED') return 'QUEUED';
  if (u === 'RUNNING') return 'RUNNING';
  if (u === 'COMPLETED') return 'COMPLETED';
  if (u === 'RETRYING') return 'RETRYING';
  if (u === 'REVISION REQUIRED' || u === 'REVISION_REQUIRED') return 'REVISION_REQUIRED';
  if (u === 'ACTION REQUIRED' || u === 'ACTION_REQUIRED') return 'ACTION_REQUIRED';
  if (u === 'SKIPPED_AND_FLAGGED' || u === 'SKIPPED') return 'SKIPPED_AND_FLAGGED';
  if (u === 'FAILED') return 'FAILED';
  if (u.includes('WAITING') || u.includes('HUMAN')) return 'WAITING_FOR_HUMAN_REVIEW';
  if (u === 'APPROVED') return 'APPROVED';
  if (u === 'REJECTED') return 'REJECTED';
  return u;
}

function getStageColorClasses(rawStatus?: string, isSelected?: boolean) {
  const key = normalizeStatusKey(rawStatus);
  const ring = isSelected ? 'ring-2 ring-sky-600 ring-offset-2' : '';

  switch (key) {
    case 'NOT_STARTED':
    case 'SKIPPED_AND_FLAGGED':
      return {
        card: `bg-slate-50 border-slate-200 text-slate-600 ${ring}`,
        badge: 'bg-slate-200 text-slate-700',
        dot: 'bg-slate-400',
        label: key === 'SKIPPED_AND_FLAGGED' ? 'SKIPPED & FLAGGED' : 'NOT STARTED',
      };
    case 'QUEUED':
      return {
        card: `bg-sky-50/60 border-sky-200 text-sky-900 ${ring}`,
        badge: 'bg-sky-100 text-sky-800 border border-sky-200',
        dot: 'bg-sky-400',
        label: 'QUEUED',
      };
    case 'RUNNING':
    case 'RETRYING':
      return {
        card: `bg-sky-50 border-sky-500 text-sky-950 shadow-xs ${ring}`,
        badge: 'bg-sky-600 text-white',
        dot: 'bg-sky-600 animate-ping',
        label: key,
      };
    case 'COMPLETED':
    case 'APPROVED':
      return {
        card: `bg-emerald-50/50 border-emerald-300 text-emerald-950 ${ring}`,
        badge: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
        dot: 'bg-emerald-600',
        label: key,
      };
    case 'REVISION_REQUIRED':
    case 'ACTION_REQUIRED':
    case 'WAITING_FOR_HUMAN_REVIEW':
      return {
        card: `bg-amber-50/60 border-amber-300 text-amber-950 ${ring}`,
        badge: 'bg-amber-100 text-amber-900 border border-amber-300',
        dot: 'bg-amber-500',
        label: key === 'WAITING_FOR_HUMAN_REVIEW' ? 'WAITING FOR HUMAN REVIEW' : key.replace(/_/g, ' '),
      };
    case 'FAILED':
    case 'REJECTED':
      return {
        card: `bg-rose-50/60 border-rose-300 text-rose-950 ${ring}`,
        badge: 'bg-rose-100 text-rose-800 border border-rose-300',
        dot: 'bg-rose-600',
        label: key,
      };
    default:
      return {
        card: `bg-white border-slate-200 text-slate-800 ${ring}`,
        badge: 'bg-slate-100 text-slate-700',
        dot: 'bg-slate-400',
        label: key,
      };
  }
}

export const WorkflowMonitorView: React.FC<WorkflowMonitorViewProps> = ({
  isAuthenticated = true,
  documents,
  workflowRuns,
  workflowStages,
  isRunningPipeline,
  onStartPipeline,
  onCreateTestCorruptedDoc,
  onNavigateToUpload,
  onNavigateToReview,
}) => {
  const sortedRuns = workflowRuns
    .slice()
    .sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''));

  const [selectedRunId, setSelectedRunId] = useState<string>(sortedRuns[0]?.id || '');
  const [selectedDocIdToRun, setSelectedDocIdToRun] = useState<string>(documents[0]?.id || '');
  const [selectedStageNumber, setSelectedStageNumber] = useState<number>(1);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('All');
  const [simulateUnsupportedClaimTest, setSimulateUnsupportedClaimTest] = useState<boolean>(false);
  const [backendHealthy, setBackendHealthy] = useState<boolean>(true);
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [isUpdatingProvider, setIsUpdatingProvider] = useState<boolean>(false);
  const [liveEvents, setLiveEvents] = useState<
    Array<{ id: string; timestamp: string; stageNumber: number; status: string; message: string }>
  >([]);

  const queueRef = useRef<HTMLDivElement>(null);
  const startPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedDocIdToRun && documents.length > 0) {
      setSelectedDocIdToRun(documents[0].id);
    }
  }, [documents, selectedDocIdToRun]);

  useEffect(() => {
    if (sortedRuns.length > 0 && (!selectedRunId || !sortedRuns.some((r) => r.id === selectedRunId))) {
      setSelectedRunId(sortedRuns[0].id);
    }
  }, [sortedRuns, selectedRunId]);

  const refreshAIStatus = async () => {
    try {
      const res = await fetch('/api/ai-config');
      if (res.ok) {
        const data = await res.json();
        setAiStatus(data);
        setBackendHealthy(true);
      }
    } catch {
      setBackendHealthy(false);
    }
  };

  // Verify backend & AI configuration availability
  useEffect(() => {
    refreshAIStatus();
  }, [isRunningPipeline]);

  const handleUpdateProviderConfig = async (patch: {
    primaryProvider?: 'openrouter' | 'gemini';
    backupProvider?: 'openrouter' | 'gemini' | 'none';
    openRouterModel?: string;
    geminiModel?: string;
  }) => {
    setIsUpdatingProvider(true);
    try {
      const res = await fetch('/api/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const updated = await res.json();
        setAiStatus(updated);
      }
    } finally {
      setIsUpdatingProvider(false);
    }
  };

  const handleResetQuotaPause = async () => {
    setIsUpdatingProvider(true);
    try {
      const res = await fetch('/api/ai-config/reset-quota', { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        setAiStatus(updated);
      }
    } finally {
      setIsUpdatingProvider(false);
    }
  };

  const activeRun = sortedRuns.find((r) => r.id === selectedRunId) || sortedRuns[0];

  // Auto-follow active stage while a run is executing
  useEffect(() => {
    if (activeRun && normalizeStatusKey(activeRun.status) === 'RUNNING') {
      setSelectedStageNumber(activeRun.currentStage || 1);
    }
  }, [activeRun?.currentStage, activeRun?.status]);

  // Fetch live execution events for active run
  useEffect(() => {
    if (!activeRun?.id) return;
    let cancelled = false;
    const loadEvents = async () => {
      try {
        const res = await fetch(`/api/workflow-runs/${activeRun.id}/events`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (Array.isArray(data.events)) {
            setLiveEvents(data.events);
          }
        }
      } catch {
        // Ignore if run was loaded from historical Firestore seed
      }
    };
    loadEvents();
    const timer =
      normalizeStatusKey(activeRun.status) === 'RUNNING' ||
      normalizeStatusKey(activeRun.status) === 'QUEUED' ||
      normalizeStatusKey(activeRun.status) === 'REVISION_REQUIRED'
        ? setInterval(loadEvents, 1000)
        : undefined;
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [activeRun?.id, activeRun?.status, activeRun?.currentStage]);

  const activeStages: WorkflowStage[] = [1, 2, 3, 4, 5].map((num) => {
    const existing = activeRun
      ? workflowStages.find((s) => s.runId === activeRun.id && s.stageNumber === num)
      : undefined;
    if (existing) return existing;
    const defaultNames: Record<number, string> = {
      1: 'STAGE 01: ORCHESTRATOR AGENT',
      2: 'STAGE 02: KNOWLEDGE INTAKE & ORGANIZER AGENT',
      3: 'STAGE 03: KNOWLEDGE CURATOR & AUTHOR AGENT',
      4: 'STAGE 04: KNOWLEDGE VERIFIER AGENT',
      5: 'STAGE 05: HUMAN REVIEWER',
    };
    return {
      id: `placeholder_${num}`,
      ownerId: '',
      institutionId: '',
      runId: activeRun?.id || '',
      stageNumber: num,
      stageName: defaultNames[num],
      status: 'NOT_STARTED',
      outputSummary: 'Waiting for workflow execution to start.',
      startedAt: '',
    };
  });

  const inspectedStage =
    activeStages.find((s) => s.stageNumber === selectedStageNumber) || activeStages[0];

  let parsedStageDetails: any = null;
  if (inspectedStage?.detailsJson) {
    try {
      parsedStageDetails = JSON.parse(inspectedStage.detailsJson);
    } catch {
      parsedStageDetails = null;
    }
  }

  // Pre-flight validation for selected document
  const selectedDocument = documents.find((d) => d.id === selectedDocIdToRun) || documents[0];
  const validationChecks = {
    userAuthenticated: Boolean(isAuthenticated),
    documentExists: Boolean(selectedDocument && selectedDocument.id),
    fileTypeSupported: Boolean(
      selectedDocument &&
        SUPPORTED_MIME_KEYWORDS.some(
          (kw) =>
            (selectedDocument.fileType || '').toLowerCase().includes(kw) ||
            (selectedDocument.fileName || '').toLowerCase().includes(kw)
        )
    ),
    documentAccessible: Boolean(
      selectedDocument && typeof selectedDocument.extractedText === 'string'
    ),
    aiAndDatabaseConfigured: backendHealthy,
  };

  const canStartWorkflow =
    validationChecks.userAuthenticated &&
    validationChecks.documentExists &&
    validationChecks.fileTypeSupported &&
    validationChecks.documentAccessible &&
    validationChecks.aiAndDatabaseConfigured &&
    !isRunningPipeline;

  // Filtered Live Execution Queue
  const filteredQueueRuns = sortedRuns.filter((run) => {
    const key = normalizeStatusKey(run.status);
    if (queueFilter === 'All') return true;
    if (queueFilter === 'Queued') return key === 'QUEUED' || key === 'NOT_STARTED';
    if (queueFilter === 'Running')
      return key === 'RUNNING' || key === 'RETRYING' || key === 'REVISION_REQUIRED';
    if (queueFilter === 'Completed') return key === 'COMPLETED' || key === 'APPROVED';
    if (queueFilter === 'Failed') return key === 'FAILED' || key === 'REJECTED';
    if (queueFilter === 'Waiting for Review')
      return key === 'WAITING_FOR_HUMAN_REVIEW' || key === 'ACTION_REQUIRED';
    return true;
  });

  const handleStartProcessing = async () => {
    if (!selectedDocument || !canStartWorkflow) return;
    await onStartPipeline(selectedDocument, { simulateUnsupportedClaimTest });
  };

  const waitingReviewRuns = sortedRuns.filter(
    (r) =>
      normalizeStatusKey(r.status) === 'WAITING_FOR_HUMAN_REVIEW' ||
      normalizeStatusKey(r.status) === 'ACTION_REQUIRED'
  ).length;
  const completedRunsCount = sortedRuns.filter(
    (r) =>
      normalizeStatusKey(r.status) === 'COMPLETED' ||
      normalizeStatusKey(r.status) === 'APPROVED'
  ).length;

  return (
    <div className="space-y-5">
      {/* Dashboard-Style Hero Banner & 4 KPI Cards */}
      <PageHeroBanner
        eyebrow="Sequential 4-Agent Pipeline + Mandatory Stage 05 Human Governance"
        titlePrefix="Process Your Institutional"
        titleHighlight="Knowledge Workflow"
        subtitle="Upload educational documents, let four sequential AI agents organize and verify information, and approve knowledge in Stage 05 before publishing."
        actions={[
          ...(onNavigateToUpload
            ? [
                {
                  label: 'Select Documents (Upload New)',
                  onClick: onNavigateToUpload,
                  variant: 'primary-blue' as const,
                  icon: Upload,
                },
              ]
            : []),
          {
            label: 'Select Existing Documents',
            onClick: () => startPanelRef.current?.scrollIntoView({ behavior: 'smooth' }),
            variant: 'outline-white' as const,
            icon: FileText,
          },
          {
            label: 'Start New Workflow',
            onClick: handleStartProcessing,
            variant: 'primary-green' as const,
            icon: Play,
            disabled: !canStartWorkflow,
          },
          {
            label: `View Previous Runs (${workflowRuns.length})`,
            onClick: () => queueRef.current?.scrollIntoView({ behavior: 'smooth' }),
            variant: 'outline-white' as const,
            icon: Clock,
          },
        ]}
        kpiCards={[
          {
            label: 'Total Workflow Runs',
            value: workflowRuns.length,
            badge: `+${workflowRuns.length}`,
            icon: Workflow,
            color: 'blue',
            onClick: () => queueRef.current?.scrollIntoView({ behavior: 'smooth' }),
          },
          {
            label: 'Waiting Human Review',
            value: waitingReviewRuns,
            badge: `+${waitingReviewRuns}`,
            icon: UserCheck,
            color: 'orange',
            onClick: () => onNavigateToReview(activeRun?.articleId),
          },
          {
            label: 'Completed / Approved',
            value: completedRunsCount,
            badge: `+${completedRunsCount}`,
            icon: CheckCircle2,
            color: 'green',
          },
          {
            label: 'Uploaded Documents',
            value: documents.length,
            badge: `+${documents.length}`,
            icon: FileText,
            color: 'purple',
            onClick: onNavigateToUpload,
          },
        ]}
      />

      {/* =====================================================================
          SECTION 6: WORKFLOW START SCREEN & AI PROVIDER CONFIGURATION
          ===================================================================== */}
      <div
        ref={startPanelRef}
        className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden"
      >
        <div className="bg-[#101F3C] text-white px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Workflow className="w-4 h-4 text-[#609BFF]" />
            <h2 className="text-xs font-bold tracking-wide">
              Start Sequential AI Workflow &amp; Configure Provider Routing
            </h2>
          </div>
          <span className="text-[11px] font-mono text-blue-200">
            1. OpenRouter (Primary) · 2. Gemini API (Backup)
          </span>
        </div>

        <div className="p-6 space-y-6">

        {/* Configurable AI Provider & Model Selector (1. OpenRouter Primary, 2. Gemini Backup) */}
        {aiStatus && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-slate-900 uppercase tracking-wider">
                  Backend AI Provider &amp; Model Routing
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="font-mono text-emerald-700 font-semibold">
                  1. Primary: {aiStatus.config.primaryProvider === 'openrouter' ? 'OpenRouter' : 'Gemini API'}
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="font-mono text-slate-600">
                  2. Backup: {aiStatus.config.backupProvider === 'none' ? 'Disabled' : aiStatus.config.backupProvider === 'gemini' ? 'Gemini API' : 'OpenRouter'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                Embedding Cache: {aiStatus.embeddingCacheStats?.cachedEntries || 0} vectors · {aiStatus.embeddingCacheStats?.cacheHits || 0} reused
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Primary AI Provider
                </label>
                <select
                  value={aiStatus.config.primaryProvider}
                  disabled={isUpdatingProvider || isRunningPipeline}
                  onChange={(e) =>
                    handleUpdateProviderConfig({
                      primaryProvider: e.target.value as 'openrouter' | 'gemini',
                      backupProvider: e.target.value === 'openrouter' ? 'gemini' : 'openrouter',
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-900"
                >
                  <option value="openrouter">1. OpenRouter (Primary Recommended)</option>
                  <option value="gemini">2. Gemini API</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Optional Backup Provider
                </label>
                <select
                  value={aiStatus.config.backupProvider}
                  disabled={isUpdatingProvider || isRunningPipeline}
                  onChange={(e) =>
                    handleUpdateProviderConfig({
                      backupProvider: e.target.value as 'openrouter' | 'gemini' | 'none',
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-900"
                >
                  <option value="gemini">Gemini API (Backup)</option>
                  <option value="openrouter">OpenRouter (Backup)</option>
                  <option value="none">Disabled (No Backup)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  OpenRouter Model
                </label>
                <select
                  value={aiStatus.config.openRouterModel}
                  disabled={isUpdatingProvider || isRunningPipeline}
                  onChange={(e) => handleUpdateProviderConfig({ openRouterModel: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono text-slate-900"
                >
                  {(aiStatus.availableOpenRouterModels || []).map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Gemini Backup Model
                </label>
                <select
                  value={aiStatus.config.geminiModel}
                  disabled={isUpdatingProvider || isRunningPipeline}
                  onChange={(e) => handleUpdateProviderConfig({ geminiModel: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono text-slate-900"
                >
                  {(aiStatus.availableGeminiModels || []).map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Clear HTTP 429 Quota Exceeded Alert Banner */}
        {((activeRun?.errorMessage &&
          (activeRun.errorMessage.includes('429') ||
            activeRun.errorMessage.toLowerCase().includes('quota') ||
            activeRun.errorMessage.includes('RESOURCE_EXHAUSTED'))) ||
          aiStatus?.providers?.gemini?.dailyQuotaExhausted ||
          aiStatus?.providers?.openrouter?.dailyQuotaExhausted) && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-amber-950">
                  AI Provider Rate-Limit / Daily Quota Notice (HTTP 429 RESOURCE_EXHAUSTED)
                </div>
                <p className="text-amber-900 leading-relaxed">
                  {activeRun?.errorMessage &&
                  (activeRun.errorMessage.includes('429') ||
                    activeRun.errorMessage.toLowerCase().includes('quota') ||
                    activeRun.errorMessage.includes('RESOURCE_EXHAUSTED'))
                    ? activeRun.errorMessage
                    : aiStatus?.providers?.gemini?.lastError ||
                      aiStatus?.providers?.openrouter?.lastError ||
                      'Daily quota was reached on one of the configured providers. Automatic retries against exhausted daily quotas are paused.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {aiStatus?.config?.primaryProvider !== 'openrouter' && (
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateProviderConfig({
                      primaryProvider: 'openrouter',
                      backupProvider: 'gemini',
                      openRouterModel: 'openrouter/free',
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-[#029D97] hover:bg-[#02847F] text-white font-semibold cursor-pointer"
                >
                  Use OpenRouter as Primary
                </button>
              )}
              <button
                type="button"
                onClick={handleResetQuotaPause}
                className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-semibold cursor-pointer"
              >
                Reset Quota Status
              </button>
            </div>
          </div>
        )}

        {/* Document Selection + Pre-Flight Validation + Confirmation Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Cols: Document Selector & Workflow Confirmation Summary */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                1. Select Institutional Document to Process
              </label>
              <select
                value={selectedDocIdToRun}
                onChange={(e) => setSelectedDocIdToRun(e.target.value)}
                disabled={isRunningPipeline}
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 bg-white"
              >
                {documents.length === 0 ? (
                  <option value="">No documents available — Upload a document first</option>
                ) : (
                  documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} (v{d.version}.0 · {d.department} · {d.status})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Workflow Confirmation Summary */}
            {selectedDocument ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Workflow Confirmation Summary
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    Doc ID: {selectedDocument.id.slice(0, 16)}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <div className="text-slate-500">File Name</div>
                    <div className="font-semibold text-slate-900 truncate mt-0.5">
                      {selectedDocument.fileName}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Department / Category</div>
                    <div className="font-semibold text-slate-900 truncate mt-0.5">
                      {selectedDocument.department} · {selectedDocument.category}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Version &amp; Status</div>
                    <div className="font-mono font-semibold text-slate-900 mt-0.5">
                      v{selectedDocument.version}.0 · {selectedDocument.status}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Extracted Content</div>
                    <div className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                      {(selectedDocument.extractedText || '').length.toLocaleString()} chars
                    </div>
                  </div>
                </div>

                {/* Optional Diagnostic Test Controls for Verifier Loop & Corrupted PDF */}
                <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simulateUnsupportedClaimTest}
                      onChange={(e) => setSimulateUnsupportedClaimTest(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                    />
                    <span className="font-medium">
                      Test Mode: Inject unsupported claim in Round 0 to demonstrate Author ↔ Verifier Revision Loop
                    </span>
                  </label>

                  {onCreateTestCorruptedDoc && (
                    <button
                      type="button"
                      onClick={async () => {
                        const badDoc = await onCreateTestCorruptedDoc();
                        setSelectedDocIdToRun(badDoc.id);
                      }}
                      className="text-xs font-semibold text-amber-800 bg-amber-100/80 hover:bg-amber-200/80 px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer"
                    >
                      <FlaskConical className="w-3.5 h-3.5" />
                      <span>Create Unreadable/Corrupted Test PDF</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                No documents found in this workspace. Click &quot;Select Documents (Upload New)&quot; above to upload a PDF, DOCX, TXT, or CSV file first.
              </div>
            )}
          </div>

          {/* Right 5 Cols: Pre-Flight Validation Checklist & Prominent START KNOWLEDGE PROCESSING Button */}
          <div className="lg:col-span-5 bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Pre-Execution Validation Checks
            </div>

            <ul className="space-y-2 text-xs">
              {[
                { label: 'User is authenticated', ok: validationChecks.userAuthenticated },
                { label: 'Selected document exists in workspace', ok: validationChecks.documentExists },
                {
                  label: 'File type is supported (PDF, DOCX, TXT, CSV)',
                  ok: validationChecks.fileTypeSupported,
                },
                { label: 'Document stream is accessible', ok: validationChecks.documentAccessible },
                {
                  label: 'AI & Cloud Firestore configurations active',
                  ok: validationChecks.aiAndDatabaseConfigured,
                },
              ].map((chk) => (
                <li key={chk.label} className="flex items-center justify-between gap-2">
                  <span className="text-slate-700">{chk.label}</span>
                  {chk.ok ? (
                    <span className="inline-flex items-center gap-1 font-mono font-semibold text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>READY</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-mono font-semibold text-rose-700">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>MISSING</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={handleStartProcessing}
              disabled={!canStartWorkflow}
              className="w-full py-3.5 px-5 text-sm font-bold tracking-wide text-white bg-[#029D97] hover:bg-[#02847F] active:bg-[#016F6B] rounded-xl flex items-center justify-center gap-2.5 shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunningPipeline ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>EXECUTING SEQUENTIAL AI PIPELINE...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>START KNOWLEDGE PROCESSING</span>
                </>
              )}
            </button>

            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              Stages 01–04 execute strictly in sequence on the backend. Clicking a stage card below inspects its live output without starting a new run.
            </p>
          </div>
        </div>
        </div>
      </div>

      {/* =====================================================================
          SECTION 5: FIVE-STAGE SEQUENTIAL WORKFLOW STEPPER
          ===================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="bg-[#101F3C] text-white px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Workflow className="w-4 h-4 text-[#609BFF]" />
            <h2 className="text-xs font-bold tracking-wide">
              Five-Stage Sequential AI Workflow &amp; Human Governance
            </h2>
            {activeRun && (
              <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded-md bg-white/10 text-blue-200">
                Run: {activeRun.id.slice(0, 16)}
              </span>
            )}
          </div>

          {sortedRuns.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-200">Inspect Run:</span>
              <select
                value={activeRun?.id || ''}
                onChange={(e) => setSelectedRunId(e.target.value)}
                className="px-3 py-1 text-xs font-mono border border-[#22365A] rounded-xl bg-[#12213D] text-white focus:outline-none"
              >
                {sortedRuns.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id.slice(0, 14)} · {r.documentTitle.slice(0, 26)} ({r.status})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          <p className="text-xs text-slate-600">
            Automated AI Processing (Stages 01–04) is visually separated from Mandatory Human Governance (Stage 05). Click any stage card below to inspect its live inputs, outputs, and execution telemetry.
          </p>

        {/* Status Color Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
          <span className="font-semibold text-slate-800">Stage Status Legend:</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <span>Queued</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span>Running</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span>Completed / Approved</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Revision Required / Waiting for Human Review</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            <span>Failed / Rejected</span>
          </span>
        </div>

        {/* Visual Separation: Left 4 Columns = Automated AI Agents (01-04) | Right 1 Column = Human Reviewer (05) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
          {/* Automated AI Processing Container (Stages 01 - 04) */}
          <div className="xl:col-span-9 rounded-2xl border border-blue-200/80 bg-blue-50/20 p-4 flex flex-col justify-between space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Automated AI Agent Pipeline (Stages 01 – 04)
                </span>
              </div>
              <span className="text-xs font-mono text-blue-700 font-medium">
                Author ↔ Verifier Revision Loop (Max 2 Rounds)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {activeStages.slice(0, 4).map((stg) => {
                const isSelected = selectedStageNumber === stg.stageNumber;
                const colors = getStageColorClasses(stg.status, isSelected);
                const normKey = normalizeStatusKey(stg.status);
                const exactTitles: Record<number, string> = {
                  1: '01. Orchestrator Agent',
                  2: '02. Knowledge Intake and Organizer Agent',
                  3: '03. Knowledge Curator and Author Agent',
                  4: '04. Knowledge Verifier Agent',
                };
                const shortRoles: Record<number, string> = {
                  1: 'AI AGENT · WORKFLOW MANAGER',
                  2: 'AI AGENT · INTAKE & CHUNKING',
                  3: 'AI AGENT · DRAFT AUTHOR',
                  4: 'AI AGENT · FACT & POLICY AUDITOR',
                };

                return (
                  <button
                    key={stg.stageNumber}
                    type="button"
                    onClick={() => setSelectedStageNumber(stg.stageNumber)}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between bg-white ${colors.card}`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                          STAGE 0{stg.stageNumber}
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${colors.badge}`}>
                          {colors.label}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-slate-900 leading-snug">
                        {exactTitles[stg.stageNumber]}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        {shortRoles[stg.stageNumber]}
                      </div>

                      <p className="text-xs text-slate-700 mt-3 line-clamp-3 leading-relaxed">
                        {stg.outputSummary}
                      </p>
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 tabular-nums">
                        <span>
                          {stg.durationMs !== undefined
                            ? `Duration: ${(stg.durationMs / 1000).toFixed(2)}s`
                            : stg.startedAt
                              ? `Start: ${stg.startedAt.slice(11, 19)}`
                              : 'Not started'}
                        </span>
                        {(normKey === 'COMPLETED' || normKey === 'APPROVED') && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        {normKey === 'RUNNING' && (
                          <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                        )}
                      </div>

                      {((stg.revisionCount || 0) > 0 || (stg.retryCount || 0) > 0) && (
                        <div className="flex items-center gap-2 text-[10px] font-mono text-amber-800">
                          {(stg.revisionCount || 0) > 0 && <span>Revisions: {stg.revisionCount}/2</span>}
                          {(stg.retryCount || 0) > 0 && <span>Retries: {stg.retryCount}/1</span>}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Author ↔ Verifier Revision Loop Banner */}
            <div className="px-3.5 py-2.5 rounded-xl bg-white border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <RefreshCw className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>
                  <strong className="text-slate-900">03. Author ↔ 04. Verifier Revision Loop:</strong> Automated fact-checking returns drafts with unsupported claims to Stage 03 for up to <strong>2 revision rounds</strong>.
                </span>
              </div>
              {activeRun && (
                <span className="font-mono font-semibold text-blue-800 shrink-0 tabular-nums">
                  Revision Round: {activeRun.revisionRound || 0} / 2
                </span>
              )}
            </div>
          </div>

          {/* Stage 05: Human Governance Gate (Visually Separated) */}
          {(() => {
            const stg5 = activeStages[4];
            const isSelected = selectedStageNumber === 5;
            const colors = getStageColorClasses(stg5.status, isSelected);
            const normKey = normalizeStatusKey(stg5.status);
            return (
              <div className="xl:col-span-3 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/20 p-4 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                    Human Governance
                  </span>
                  <span className="text-[11px] font-mono font-bold text-emerald-800">
                    NON-AI GATE
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedStageNumber(5)}
                  className={`flex-1 p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between bg-white ${colors.card}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-900 text-white">
                        STAGE 05
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${colors.badge}`}>
                        {colors.label}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-900 leading-snug">
                      05. Human Reviewer — NOT AN AI AGENT
                    </div>
                    <div className="text-[11px] font-mono text-emerald-800 mt-0.5">
                      MANDATORY INSTITUTIONAL SIGN-OFF
                    </div>

                    <p className="text-xs text-slate-700 mt-3 line-clamp-3 leading-relaxed">
                      {stg5.outputSummary}
                    </p>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-mono text-slate-600">
                    <span>Human Governance</span>
                    {(normKey === 'COMPLETED' || normKey === 'APPROVED') && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateToReview(activeRun?.articleId)}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#029D97] hover:bg-[#02847F] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Open Human Review</span>
                </button>
              </div>
            );
          })()}
        </div>
        </div>
      </div>

      {/* =====================================================================
          SECTION 16: STAGE DETAIL INSPECTOR
          ===================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="bg-[#101F3C] text-white px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 text-[11px] font-mono font-bold rounded-md bg-[#029D97] text-white">
              STAGE 0{inspectedStage.stageNumber} DETAIL INSPECTOR
            </span>
            <h3 className="text-xs font-bold tracking-wide text-white">
              {inspectedStage.stageName}
            </h3>
            <span
              className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md ${
                getStageColorClasses(inspectedStage.status).badge
              }`}
            >
              {getStageColorClasses(inspectedStage.status).label}
            </span>
          </div>

          {inspectedStage.stageNumber === 5 && activeRun?.articleId && (
            <button
              type="button"
              onClick={() => onNavigateToReview(activeRun.articleId)}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#029D97] hover:bg-[#02847F] rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Open in Stage 05 Human Review Workspace</span>
            </button>
          )}
        </div>

        <div className="p-6 space-y-6">

        {/* 10 Required Inspector Telemetry Fields */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <div className="text-slate-500">Agent / Reviewer Name</div>
            <div className="font-semibold text-slate-900 mt-0.5">
              {inspectedStage.stageNumber === 5
                ? 'Human Reviewer (Institutional Governance)'
                : inspectedStage.stageName}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Stage Status</div>
            <div className="font-mono font-semibold text-sky-800 mt-0.5">
              {inspectedStage.status}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Start &amp; End Time</div>
            <div className="font-mono text-slate-900 tabular-nums mt-0.5">
              {inspectedStage.startedAt ? inspectedStage.startedAt.slice(11, 19) : '—'} →{' '}
              {inspectedStage.completedAt ? inspectedStage.completedAt.slice(11, 19) : 'Active'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Execution Duration</div>
            <div className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
              {inspectedStage.durationMs !== undefined
                ? `${(inspectedStage.durationMs / 1000).toFixed(2)}s (${inspectedStage.durationMs}ms)`
                : '—'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Revision / Retry Count</div>
            <div className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
              Revisions: {inspectedStage.revisionCount ?? activeRun?.revisionRound ?? 0} · Retries:{' '}
              {inspectedStage.retryCount ?? 0}
            </div>
          </div>
        </div>

        {/* Input Reference & Output Reference */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Input Received by Stage 0{inspectedStage.stageNumber}
            </div>
            <div className="text-xs font-mono text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
              {inspectedStage.inputReference ||
                (activeRun
                  ? `Document: ${activeRun.documentTitle} (${activeRun.documentId})`
                  : 'No input recorded yet')}
            </div>
            {parsedStageDetails?.inputReceived && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {Object.entries(parsedStageDetails.inputReceived).map(([k, v]) => (
                  <div key={k} className="bg-slate-50 px-2.5 py-1.5 rounded border border-slate-100">
                    <span className="text-slate-500">{k}: </span>
                    <span className="font-mono font-medium text-slate-900">
                      {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Output Generated &amp; Summary
            </div>
            <div className="text-xs font-mono text-sky-900 bg-sky-50/70 p-3 rounded-lg border border-sky-200 mb-2">
              {inspectedStage.outputReference || inspectedStage.outputSummary}
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {inspectedStage.outputSummary}
            </p>
          </div>
        </div>

        {/* Error Details if Stage Failed */}
        {(inspectedStage.errorMessage || (inspectedStage.stageNumber === activeRun?.currentStage && activeRun?.errorMessage)) && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Stage Error Details / Action Required:</div>
              <div className="mt-1 font-mono">
                {inspectedStage.errorMessage || activeRun?.errorMessage}
              </div>
            </div>
          </div>
        )}

        {/* Stage-Specific Structured Processing Result */}
        {parsedStageDetails?.processingResult && (
          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Actual Stage 0{inspectedStage.stageNumber} Processing Result &amp; Artifacts
            </div>

            {/* Stage 01 Specific View */}
            {inspectedStage.stageNumber === 1 && (
              <div className="space-y-3 text-xs">
                <div className="flex flex-wrap gap-3">
                  <span className="px-2.5 py-1 rounded bg-white border border-slate-200 font-mono">
                    Run ID: <strong>{activeRun?.id}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded bg-white border border-slate-200 font-mono">
                    Input Document Count: <strong>{parsedStageDetails.processingResult.inputDocumentCount || 1}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded bg-white border border-slate-200 font-mono">
                    Valid for Intake: <strong>{String(parsedStageDetails.processingResult.valid)}</strong>
                  </span>
                </div>
                {Array.isArray(parsedStageDetails.processingResult.executionPlan) && (
                  <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                    <div className="font-semibold text-slate-900 mb-2">Orchestrator Execution Plan:</div>
                    <ul className="space-y-1 text-slate-700 font-mono">
                      {parsedStageDetails.processingResult.executionPlan.map((step: string, i: number) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Stage 02 Specific View */}
            {inspectedStage.stageNumber === 2 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="text-slate-500">Extracted Title</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {parsedStageDetails.processingResult.extractedTitle}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="text-slate-500">Language &amp; Category</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {parsedStageDetails.processingResult.language} · {parsedStageDetails.processingResult.detectedCategory}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="text-slate-500">Department Mapping</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {parsedStageDetails.processingResult.departmentMapping}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="text-slate-500">Chunks &amp; Effective Date</div>
                  <div className="font-mono font-semibold text-slate-900 mt-0.5">
                    {parsedStageDetails.outputGenerated?.chunkCount || 1} chunks · {parsedStageDetails.processingResult.effectiveDate}
                  </div>
                </div>
              </div>
            )}

            {/* Stage 03 Specific View */}
            {inspectedStage.stageNumber === 3 && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="text-slate-500">Generated Article Title</div>
                    <div className="font-semibold text-slate-900 mt-0.5">
                      {parsedStageDetails.processingResult.articleTitle}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="text-slate-500">Article ID &amp; Draft Status</div>
                    <div className="font-mono font-semibold text-amber-800 mt-0.5">
                      {parsedStageDetails.processingResult.articleId} · {parsedStageDetails.processingResult.status}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="text-slate-500">Source References &amp; FAQs</div>
                    <div className="font-semibold text-slate-900 mt-0.5">
                      {parsedStageDetails.processingResult.faqCount} FAQs · {parsedStageDetails.processingResult.sourceReferences}
                    </div>
                  </div>
                </div>
                {parsedStageDetails.outputGenerated?.contentMarkdownPreview && (
                  <div className="p-3.5 bg-white rounded-lg border border-slate-200 font-mono text-xs text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {parsedStageDetails.outputGenerated.contentMarkdownPreview}
                  </div>
                )}
              </div>
            )}

            {/* Stage 04 Specific View */}
            {inspectedStage.stageNumber === 4 && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="text-slate-500">Verification Decision</div>
                    <div className="font-mono font-bold text-emerald-800 mt-0.5">
                      {parsedStageDetails.processingResult.verificationStatus}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="text-slate-500">Verified Claims Count</div>
                    <div className="font-mono font-semibold text-slate-900 mt-0.5">
                      {(parsedStageDetails.processingResult.verifiedStatements || []).length} verified statements
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="text-slate-500">Dates &amp; Fee Values Audited</div>
                    <div className="font-mono font-semibold text-slate-900 mt-0.5">
                      {(parsedStageDetails.processingResult.datesChecked || []).length} dates ·{' '}
                      {(parsedStageDetails.processingResult.feesAndNumbersChecked || []).length} numbers
                    </div>
                  </div>
                </div>

                {Array.isArray(parsedStageDetails.processingResult.revisionHistoryReports) &&
                  parsedStageDetails.processingResult.revisionHistoryReports.length > 0 && (
                    <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-2">
                      <div className="font-bold text-slate-900">
                        Author ⇄ Verifier Revision Round History:
                      </div>
                      {parsedStageDetails.processingResult.revisionHistoryReports.map((rep: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-start justify-between gap-3">
                          <div>
                            <span className="font-mono font-bold text-slate-900">
                              Round {rep.round}: {rep.status}
                            </span>
                            <p className="text-slate-600 mt-0.5">{rep.feedback}</p>
                          </div>
                          <span className="font-mono text-[11px] text-slate-400 shrink-0">
                            {rep.timestamp?.slice(11, 19)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            )}

            {/* Linked Documents & Linked Articles Footer */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-500 font-semibold">Linked Documents:</span>
                {(parsedStageDetails.linkedDocuments || []).map((ld: any) => (
                  <span
                    key={ld.id}
                    className="px-2.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-slate-800"
                  >
                    {ld.title} ({ld.id.slice(0, 12)})
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-500 font-semibold">Linked Articles:</span>
                {(parsedStageDetails.linkedArticles || []).length === 0 ? (
                  <span className="text-slate-400">Generated in Stage 03</span>
                ) : (
                  (parsedStageDetails.linkedArticles || []).map((la: any) => (
                    <button
                      key={la.id}
                      type="button"
                      onClick={() => onNavigateToReview(la.id)}
                      className="px-2.5 py-0.5 rounded bg-teal-50 border border-teal-200 font-mono text-teal-900 hover:bg-teal-100 cursor-pointer"
                    >
                      {la.title} ({la.status})
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Live Backend Execution Event Stream */}
        {liveEvents.length > 0 && (
          <div className="p-4 rounded-xl bg-slate-900 text-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-sky-400">
              <span>LIVE SEQUENTIAL BACKEND EVENT LOG ({activeRun?.id})</span>
              <span>{liveEvents.length} events</span>
            </div>
            <div className="space-y-1.5 max-h-44 overflow-y-auto font-mono text-xs">
              {liveEvents.map((ev) => (
                <div key={ev.id} className="flex items-start gap-3 text-slate-300">
                  <span className="text-slate-500 shrink-0 tabular-nums">
                    {ev.timestamp.slice(11, 19)}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-800 text-sky-300 shrink-0">
                    STAGE 0{ev.stageNumber} · {ev.status}
                  </span>
                  <span className="text-slate-100">{ev.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* =====================================================================
          SECTION 15: LIVE EXECUTION QUEUE
          ===================================================================== */}
      <div
        ref={queueRef}
        className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden"
      >
        <div className="bg-[#101F3C] text-white px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-[#609BFF]" />
            <h2 className="text-xs font-bold tracking-wide">
              Live Execution Queue &amp; Workflow Run History
            </h2>
          </div>

          {/* 6 Required Queue Filters */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-white/10 rounded-xl">
            {(['All', 'Queued', 'Running', 'Completed', 'Failed', 'Waiting for Review'] as QueueFilter[]).map(
              (flt) => (
                <button
                  key={flt}
                  type="button"
                  onClick={() => setQueueFilter(flt)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    queueFilter === flt
                      ? 'bg-[#029D97] text-white shadow-xs'
                      : 'text-teal-100 hover:text-white'
                  }`}
                >
                  {flt}
                </button>
              )
            )}
          </div>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-xs text-slate-600">
            Real-time queue of all workflow runs persisted in Cloud Firestore across this institution workspace
          </p>

        {filteredQueueRuns.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
            No workflow runs match filter &quot;{queueFilter}&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3">Run ID</th>
                  <th className="py-3 px-3">Document Name</th>
                  <th className="py-3 px-3">Current Stage</th>
                  <th className="py-3 px-3">Queue Status</th>
                  <th className="py-3 px-3">Submitted / Started</th>
                  <th className="py-3 px-3">Completed Time</th>
                  <th className="py-3 px-3">Error Status</th>
                  <th className="py-3 px-3">Human Approval Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQueueRuns.map((run) => {
                  const norm = normalizeStatusKey(run.status);
                  const badgeStyle = getStageColorClasses(run.status).badge;
                  const humanStatus =
                    norm === 'APPROVED'
                      ? 'Approved & Published'
                      : norm === 'REJECTED'
                        ? 'Rejected by Reviewer'
                        : norm === 'WAITING_FOR_HUMAN_REVIEW' || norm === 'ACTION_REQUIRED'
                          ? 'Pending Stage 05 Review'
                          : norm === 'FAILED'
                            ? 'Halted Before Stage 05'
                            : 'In AI Pipeline';

                  return (
                    <tr
                      key={run.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        activeRun?.id === run.id ? 'bg-sky-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {run.id.slice(0, 16)}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900 max-w-[220px] truncate">
                        {run.documentTitle}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                        Stage 0{run.currentStage} · {run.currentStageName.replace(/^STAGE 0\d:\s*/, '')}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded font-mono font-semibold ${badgeStyle}`}>
                          {run.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                        {(run.submittedAt || run.startedAt || '').slice(0, 19).replace('T', ' ')}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                        {run.completedAt ? run.completedAt.slice(11, 19) : '—'}
                      </td>
                      <td className="py-3 px-3 text-rose-700 max-w-[180px] truncate">
                        {run.errorMessage ? run.errorMessage : <span className="text-slate-400">None</span>}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">
                        {humanStatus}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRunId(run.id);
                              setSelectedStageNumber(run.currentStage || 1);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-[#029D97] bg-[#E4F7F6] border border-[#96E0DC] hover:bg-[#CBECEB] rounded-lg cursor-pointer"
                          >
                            Inspect
                          </button>
                          {run.articleId && (
                            <button
                              type="button"
                              onClick={() => onNavigateToReview(run.articleId)}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-[#029D97] hover:bg-[#02847F] rounded-lg cursor-pointer"
                            >
                              Stage 05 Review
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
