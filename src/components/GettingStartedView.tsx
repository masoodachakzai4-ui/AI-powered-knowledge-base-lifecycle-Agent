import React from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Circle,
  CloudUpload,
  Lightbulb,
  MessageSquare,
  Play,
  Rocket,
  Settings,
  Upload,
  UserCheck,
  Workflow,
} from 'lucide-react';
import {
  ChatMessage,
  DocumentRecord,
  Institution,
  KnowledgeArticle,
  WorkflowRun,
} from '../types/domain';
import { PageHeroBanner } from './PageHeroBanner';

interface GettingStartedViewProps {
  institution: Institution;
  documents: DocumentRecord[];
  workflowRuns: WorkflowRun[];
  articles: KnowledgeArticle[];
  chatMessages: ChatMessage[];
  onNavigate: (tab: string) => void;
  onSwitchToDemoWorkspace?: () => Promise<void>;
  isSwitchingDemo?: boolean;
  compact?: boolean;
}

export const GettingStartedView: React.FC<GettingStartedViewProps> = ({
  institution,
  documents,
  workflowRuns,
  articles,
  chatMessages,
  onNavigate,
  onSwitchToDemoWorkspace,
  isSwitchingDemo,
  compact = false,
}) => {
  const hasWorkspace = Boolean(institution?.id);
  const hasDocuments = documents.length > 0;
  const hasProcessedWorkflow = workflowRuns.length > 0 || articles.length > 0;
  const hasApprovedArticles = articles.some((a) => a.status === 'PUBLISHED');
  const hasAskedAssistant = chatMessages.some((m) => m.role === 'user');

  const steps = [
    {
      num: 1,
      number: 'STEP 1',
      shortTitle: '1. Create Workspace',
      title: 'STEP 1: Create Institution Workspace.',
      plainDescription:
        'Set up your university, college, or school profile and organize your academic and administrative departments.',
      completed: hasWorkspace,
      targetTab: 'institution',
      actionLabel: 'View Workspace Profile',
      icon: Building2,
      kpiColor: 'blue' as const,
    },
    {
      num: 2,
      number: 'STEP 2',
      shortTitle: '2. Upload Documents',
      title: 'STEP 2: Upload Educational Documents.',
      plainDescription:
        'Upload official policy files (PDF, Word DOCX, TXT, or CSV) such as admission rules, fee schedules, or scholarship guidelines.',
      completed: hasDocuments,
      targetTab: 'upload',
      actionLabel: 'Upload Documents',
      icon: CloudUpload,
      kpiColor: 'green' as const,
    },
    {
      num: 3,
      number: 'STEP 3',
      shortTitle: '3. Process with AI Agents',
      title: 'STEP 3: Process Documents with Four AI Agents.',
      plainDescription:
        'Let the four sequential AI agents validate your file, organize topics, draft a clear article, and check every date and number.',
      completed: hasProcessedWorkflow,
      targetTab: 'workflow',
      actionLabel: 'Open AI Agent Workflow',
      icon: Settings,
      kpiColor: 'purple' as const,
    },
    {
      num: 4,
      number: 'STEP 4',
      shortTitle: '4. Review & Approve',
      title: 'STEP 4: Review and Approve Knowledge Articles.',
      plainDescription:
        'Inspect the AI-verified draft alongside your original document and approve it before anyone can see it in the library.',
      completed: hasApprovedArticles,
      targetTab: 'review',
      actionLabel: 'Review Pending Articles',
      icon: UserCheck,
      kpiColor: 'orange' as const,
    },
    {
      num: 5,
      number: 'STEP 5',
      shortTitle: '5. Start Asking Questions',
      title: 'STEP 5: Ask Questions Using Knowledge Assistant.',
      plainDescription:
        'Ask everyday questions about admissions, fees, scholarships, or exams and receive accurate answers with official source citations.',
      completed: hasAskedAssistant,
      targetTab: 'assistant',
      actionLabel: 'Ask Knowledge Assistant',
      icon: MessageSquare,
      kpiColor: 'teal' as const,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const nextStep = steps.find((s) => !s.completed) || steps[steps.length - 1];

  const getRecommendationMessage = () => {
    if (!hasDocuments) {
      return 'Upload your educational documents to get started.';
    }
    if (!hasProcessedWorkflow) {
      return 'Process your uploaded documents with the four sequential AI agents.';
    }
    if (!hasApprovedArticles) {
      return 'Review and approve your AI-verified article draft in Stage 05 Human Review.';
    }
    if (!hasAskedAssistant) {
      return 'Ask a question in the Knowledge Assistant using your approved articles.';
    }
    return 'All 5 onboarding milestones are complete! Continue uploading policies or managing lifecycles.';
  };

  if (compact) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="bg-[#101F3C] text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-[#47DCD6]" />
            <h2 className="text-xs font-bold tracking-wide">Getting Started</h2>
          </div>
          <span className="text-xs font-mono text-teal-200">
            {completedCount}/5 Steps ({progressPercent}%)
          </span>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs font-bold text-slate-800">
            Let&apos;s build your institution&apos;s knowledge base.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 relative">
            {steps.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <button
                  key={step.number}
                  onClick={() => onNavigate(step.targetTab)}
                  className="flex flex-col items-center text-center group cursor-pointer relative"
                >
                  {idx < steps.length - 1 && (
                    <div
                      aria-hidden="true"
                      className="hidden sm:flex items-center justify-center absolute top-5 left-[62%] w-[76%] pointer-events-none"
                    >
                      <div className="h-[1.5px] w-full bg-slate-300" />
                      <ArrowRight className="w-3 h-3 text-slate-400 -ml-1.5 shrink-0" />
                    </div>
                  )}
                  <div className="w-10 h-10 rounded-full bg-[#029D97] text-white flex items-center justify-center shadow-xs z-10">
                    <StepIcon className="w-4 h-4" />
                  </div>
                  <div className="text-[11px] font-bold text-slate-800 mt-2">
                    {step.shortTitle}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Dashboard-Style Hero Banner & 5 Milestone KPI Cards */}
      <PageHeroBanner
        eyebrow={`Institutional Onboarding Guide · ${completedCount} of 5 Steps Completed (${progressPercent}%)`}
        titlePrefix="Getting Started with"
        titleHighlight={institution.name.replace(' — Sample Workspace', '')}
        subtitle="Follow these five simple steps to turn your institution's policy documents into verified, human-approved knowledge articles."
        actions={[
          {
            label: `Start Here: ${nextStep.actionLabel}`,
            onClick: () => onNavigate(nextStep.targetTab),
            variant: 'primary-blue',
            icon: Upload,
          },
          {
            label: 'Open Knowledge Assistant',
            onClick: () => onNavigate('assistant'),
            variant: 'outline-white',
            icon: MessageSquare,
          },
          {
            label: 'Start AI Workflow',
            onClick: () => onNavigate('workflow'),
            variant: 'primary-green',
            icon: Play,
          },
        ]}
        kpiCards={steps.map((st) => ({
          label: st.shortTitle,
          value: st.completed ? 'Done' : 'Pending',
          badge: st.completed ? '✓ Complete' : 'Open',
          icon: st.icon,
          color: st.kpiColor,
          onClick: () => onNavigate(st.targetTab),
        }))}
      />

      {/* Interactive 5-Step Connected Visual Stepper Card (Matching Reference Dashboard Card) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="bg-[#101F3C] text-white px-5 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-[#47DCD6]" />
            <h2 className="text-xs font-bold tracking-wide">
              Five-Step Institutional Knowledge Base Setup Roadmap
            </h2>
          </div>
          <span className="text-xs font-mono text-teal-200 tabular-nums">
            Progress: {progressPercent}%
          </span>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-sm font-bold text-slate-900">
              Let&apos;s build your institution&apos;s knowledge base.
            </p>
            <div className="w-full sm:w-56 h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#029D97] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 relative py-2">
            {steps.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <button
                  key={step.number}
                  onClick={() => onNavigate(step.targetTab)}
                  className="flex flex-col items-center text-center group cursor-pointer relative"
                >
                  {idx < steps.length - 1 && (
                    <div
                      aria-hidden="true"
                      className="hidden sm:flex items-center justify-center absolute top-6 left-[60%] w-[80%] pointer-events-none"
                    >
                      <div
                        className={`h-[2px] w-full ${
                          step.completed ? 'bg-[#029D97]' : 'bg-slate-300'
                        }`}
                      />
                      <ArrowRight
                        className={`w-3.5 h-3.5 -ml-1.5 shrink-0 ${
                          step.completed ? 'text-[#029D97]' : 'text-slate-400'
                        }`}
                      />
                    </div>
                  )}

                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm transition-transform group-hover:scale-105 z-10 ${
                      step.completed
                        ? 'bg-[#029D97] text-white'
                        : 'bg-[#02847F] text-white'
                    }`}
                  >
                    <StepIcon className="w-5 h-5" />
                  </div>

                  <div className="text-xs font-bold text-slate-900 mt-2.5">
                    {step.shortTitle}
                  </div>
                  <div
                    className={`text-[11px] font-semibold mt-0.5 ${
                      step.completed ? 'text-[#029D97]' : 'text-[#02847F]'
                    }`}
                  >
                    {step.completed ? 'Completed ✓' : 'Click to Open'}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="bg-[#E4F7F6] border border-[#96E0DC] rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-[#015E5A]">
              <Lightbulb className="w-4 h-4 text-[#F59E0B] shrink-0" />
              <span>
                <strong className="font-bold text-[#029D97]">Next Step:</strong>{' '}
                {getRecommendationMessage()}
              </span>
            </div>
            <button
              onClick={() => onNavigate(nextStep.targetTab)}
              className="px-4 py-2 text-xs font-bold text-white bg-[#029D97] hover:bg-[#02847F] rounded-xl flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-2xs transition-colors"
            >
              <span>Start Here</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Detailed 5 Step Cards with Deep Navy Headers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map((step) => {
          const IconComponent = step.icon;
          const isNext = step.number === nextStep.number && !step.completed;
          return (
            <div
              key={step.number}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col justify-between"
            >
              <div className="bg-[#101F3C] text-white px-5 py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <IconComponent className="w-4 h-4 text-[#47DCD6]" />
                  <h3 className="text-xs font-bold tracking-wide">{step.title}</h3>
                </div>
                {step.completed ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#029D97] text-white">
                    Completed
                  </span>
                ) : isNext ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#029D97] text-white">
                    Recommended Next
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/10 text-teal-200">
                    Pending
                  </span>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  {step.plainDescription}
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-mono text-slate-400">
                    {step.completed ? 'Milestone Verified' : 'Ready to Execute'}
                  </span>
                  <button
                    onClick={() => onNavigate(step.targetTab)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors ${
                      isNext
                        ? 'bg-[#029D97] text-white hover:bg-[#02847F]'
                        : step.completed
                          ? 'bg-[#E4F7F6] text-[#029D97] hover:bg-[#CBECEB]'
                          : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    <span>{step.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Sample Demo Workspace Card */}
        {onSwitchToDemoWorkspace && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col justify-between">
            <div className="bg-[#101F3C] text-white px-5 py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Workflow className="w-4 h-4 text-[#47DCD6]" />
                <h3 className="text-xs font-bold tracking-wide">
                  Explore Pre-Loaded Demo University Policies
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/10 text-teal-200">
                Optional Sample Data
              </span>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Want to test all 5 stages right away with pre-loaded university policies? Switch to the clearly labelled &ldquo;Demo University — Sample Workspace&rdquo; at any time.
              </p>

              <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                <button
                  onClick={onSwitchToDemoWorkspace}
                  disabled={isSwitchingDemo}
                  className="px-4 py-2 text-xs font-bold bg-[#029D97] hover:bg-[#02847F] text-white rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>
                    {isSwitchingDemo ? 'Loading Sample Workspace...' : 'Load Demo University'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
