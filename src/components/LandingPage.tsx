import React from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileCheck2,
  GitCompare,
  GraduationCap,
  Layers,
  Lock,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  Workflow,
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onTryDemo: () => void;
  isSigningIn: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onSignIn,
  onTryDemo,
  isSigningIn,
}) => {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="flex items-center justify-between gap-8 px-6 lg:px-12 py-4 border-b border-slate-200 bg-white sticky top-0 z-30">
        <a
          href="#top"
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 flex items-center gap-2.5"
        >
          <GraduationCap className="w-6 h-6 text-sky-700 shrink-0" />
          <span>EduLifecycle AI</span>
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a href="#overview" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
            Overview
          </a>
          <a href="#agents" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
            Four AI Agents
          </a>
          <a href="#governance" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
            Human Review
          </a>
          <a href="#lifecycle" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
            Knowledge Lifecycle
          </a>
          <a href="#security" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
            Security
          </a>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onSignIn}
            disabled={isSigningIn}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            {isSigningIn ? 'Signing In...' : 'Sign In'}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section id="top" className="px-6 lg:px-12 py-16 lg:py-24 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center">
            <p className="text-xs font-semibold text-sky-700 tracking-wide mb-3">
              Institutional Knowledge Governance Platform · Academies · Schools · Colleges · Universities
            </p>
            <h1
              className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-[1.12] mb-6"
              style={{ textWrap: 'balance' }}
            >
              Your Institution&apos;s Knowledge, Organized and Always Up to Date.
            </h1>
            <p className="text-base lg:text-lg text-slate-600 leading-relaxed mb-8 max-w-2xl">
              An AI-powered educational knowledge platform that helps students, teachers, and administrators find accurate information while keeping institutional knowledge updated.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-8">
              <button
                onClick={onGetStarted}
                disabled={isSigningIn}
                className="px-5 py-3 text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onSignIn}
                disabled={isSigningIn}
                className="px-5 py-3 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign In to Workspace
              </button>
              <button
                onClick={onTryDemo}
                disabled={isSigningIn}
                className="px-5 py-3 text-sm font-semibold text-teal-800 border border-teal-200 bg-teal-50/60 hover:bg-teal-100/70 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Explore Sample Demo University
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>4 Sequential AI Agents</span>
              <span aria-hidden="true">·</span>
              <span>Mandatory Stage 05 Human Governance</span>
              <span aria-hidden="true">·</span>
              <span>Evidence-Grounded RAG Assistant</span>
              <span aria-hidden="true">·</span>
              <span>CREATE / KEEP / UPDATE / RETIRE Lifecycle</span>
            </div>
          </div>

          {/* Right Column: Live 5-Stage Pipeline Architecture Preview */}
          <div className="lg:col-span-5 bg-slate-900 text-white rounded-xl p-6 lg:p-8 flex flex-col justify-between border border-slate-800">
            <div>
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
                <span className="text-xs font-medium text-slate-300">
                  Five-Stage Institutional Governance Pipeline
                </span>
                <span className="text-xs font-mono text-teal-400 tabular-nums">
                  Stages 01–05
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-slate-800/80 border border-slate-700/80">
                  <div className="flex items-center justify-between text-xs text-sky-300 font-mono mb-1">
                    <span>01. Orchestrator Agent</span>
                    <span>Automated AI</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Validates institutional uploads, checks OCR readiness, and coordinates sequential agent execution.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-800/80 border border-slate-700/80">
                  <div className="flex items-center justify-between text-xs text-sky-300 font-mono mb-1">
                    <span>02. Knowledge Intake &amp; Organizer</span>
                    <span>Automated AI</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Extracts PDF/DOCX/TXT text, classifies 16+ academic categories, detects dates, and generates vector chunks.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-800/80 border border-slate-700/80">
                  <div className="flex items-center justify-between text-xs text-sky-300 font-mono mb-1">
                    <span>03. Knowledge Curator &amp; Author</span>
                    <span>Automated AI</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Authors structured AI-SUGGESTED / DRAFT articles, FAQs, and section citations without inventing policy rules.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-800/80 border border-slate-700/80">
                  <div className="flex items-center justify-between text-xs text-teal-300 font-mono mb-1">
                    <span>04. Knowledge Verifier Agent</span>
                    <span>Max 2 Revision Loops</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Audits dates, fee amounts, and scholarship numbers against source text; returns inaccurate drafts for revision.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-teal-950/80 border border-teal-700/70">
                  <div className="flex items-center justify-between text-xs text-teal-200 font-mono mb-1">
                    <span>05. Human Reviewer Stage</span>
                    <span>Human Governance</span>
                  </div>
                  <p className="text-xs text-slate-200">
                    Institutional reviewers inspect the source diff and verification report to Approve, Reject, or Request Changes.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Zero unapproved AI publishing</span>
              <span className="font-mono text-slate-300">RAG Grounded</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem & Product Overview */}
      <section id="overview" className="bg-slate-50 border-y border-slate-200 py-16 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-3">
              Built for Academies, Schools, Colleges, and Universities
            </h2>
            <p className="text-sm lg:text-base text-slate-600 leading-relaxed">
              Educational institutions manage hundreds of admission policies, fee schedules, examination regulations, and scholarship notices across departments. EduLifecycle AI eliminates fragmented documents and outdated answers with one governed institutional repository.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <BookOpen className="w-5 h-5 text-sky-700 mb-3" />
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                01. Adaptive Institutional Taxonomy
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Select Academy, School, College, or University during onboarding. Departments, categories, and role permissions adapt automatically to your academic structure.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <MessageSquare className="w-5 h-5 text-sky-700 mb-3" />
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                02. Evidence-Grounded Knowledge Assistant
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Students and faculty ask natural questions and receive answers strictly grounded in Human-Approved articles with exact document titles, sections, and effective dates.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <GitCompare className="w-5 h-5 text-sky-700 mb-3" />
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                03. Continuous Version &amp; Lifecycle Control
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                When admission deadlines or fee structures change, compare old and new document versions side by side and review AI proposals to CREATE, KEEP, UPDATE, or RETIRE policies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Four AI Agents + Human Review Section */}
      <section id="agents" className="py-16 px-6 lg:px-12 max-w-7xl mx-auto w-full">
        <div className="max-w-3xl mb-12">
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-3">
            Four Specialized AI Agents + Mandatory Human Governance
          </h2>
          <p className="text-sm lg:text-base text-slate-600">
            Every uploaded document passes through four sequential AI stages before entering the Human Review Workspace. No AI-suggested draft is ever published without explicit human approval.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-5 rounded-xl border border-slate-200 bg-white flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono text-sky-700 mb-2">STAGE 01 · AI AGENT</div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">Orchestrator Agent</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Coordinates the knowledge lifecycle, validates uploaded files, checks workspace configuration, tracks stage state, and logs every execution event.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
              Role: Workflow Manager
            </div>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-white flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono text-sky-700 mb-2">STAGE 02 · AI AGENT</div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">Intake &amp; Organizer</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Extracts text from PDF, DOCX, TXT, and CSV files, flags scanned PDFs requiring OCR, identifies effective/expiry dates, and generates semantic embeddings.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
              Role: Classification &amp; Chunking
            </div>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-white flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono text-sky-700 mb-2">STAGE 03 · AI AGENT</div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">Curator &amp; Author</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Transforms raw policy text into structured knowledge articles, summaries, and FAQs marked AI-SUGGESTED / DRAFT while preserving exact dates and fee figures.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
              Role: Knowledge Creation
            </div>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-white flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono text-sky-700 mb-2">STAGE 04 · AI AGENT</div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">Knowledge Verifier</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cross-checks every generated statement, date, fee, and scholarship rule against the source document. Triggers up to 2 revision rounds if issues are detected.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
              Role: Accuracy &amp; Quality Audit
            </div>
          </div>

          <div id="governance" className="p-5 rounded-xl border border-teal-300 bg-teal-50/40 flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono text-teal-800 mb-2">STAGE 05 · HUMAN GOVERNANCE</div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">Human Reviewer</h3>
              <p className="text-xs text-slate-700 leading-relaxed">
                A dedicated human governance gate—not an AI agent. Reviewers inspect the draft, original document, and verification report to Approve, Reject, or Request Changes.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-teal-200/70 text-xs font-medium text-teal-900">
              Role: Institutional Sign-Off
            </div>
          </div>
        </div>
      </section>

      {/* Lifecycle & Security Overview */}
      <section id="lifecycle" className="bg-slate-50 border-t border-slate-200 py-16 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Full Knowledge Lifecycle Management
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Institutional policies evolve every semester. EduLifecycle AI tracks document versions, compares changes section by section, and proposes structured lifecycle decisions for human approval:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <div className="text-xs font-mono font-semibold text-sky-700 mb-1">CREATE</div>
                <p className="text-xs text-slate-600">
                  Author and verify new institutional knowledge articles from newly uploaded policy documents.
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <div className="text-xs font-mono font-semibold text-emerald-700 mb-1">KEEP</div>
                <p className="text-xs text-slate-600">
                  Confirm that current articles remain accurate and aligned with active institutional policy.
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <div className="text-xs font-mono font-semibold text-amber-700 mb-1">UPDATE</div>
                <p className="text-xs text-slate-600">
                  Compare old vs. new policy versions when fees, deadlines, or rules change and publish updated versions.
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <div className="text-xs font-mono font-semibold text-rose-700 mb-1">RETIRE</div>
                <p className="text-xs text-slate-600">
                  Archive expired or withdrawn notices so the Knowledge Assistant never answers from outdated rules.
                </p>
              </div>
            </div>
          </div>

          <div id="security">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Enterprise Security, Tenant Isolation &amp; Audit Governance
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Designed for educational privacy and multi-role access control across Administrators, Knowledge Managers, Human Reviewers, Faculty, and Students.
            </p>
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-lg border border-slate-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Role-Based Access &amp; Tenant Isolation</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Firestore Security Rules and backend checks isolate each institution workspace and restrict faculty-only or admin-only policies from student queries.
                  </p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200 flex items-start gap-3">
                <Lock className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Server-Side Gemini API Protection</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    All Gemini language, verification, and embedding calls execute strictly on the Node.js backend runtime—API keys are never exposed in client code.
                  </p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200 flex items-start gap-3">
                <FileCheck2 className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Comprehensive Audit Trail</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Every document upload, AI stage run, verification report, and human approval decision is logged with timestamps and actor attribution.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white px-6 lg:px-12 py-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            AI-Powered Educational Knowledge Base Lifecycle Agent · Built for Academies, Schools, Colleges &amp; Universities
          </div>
          <div className="flex items-center gap-6">
            <button onClick={onGetStarted} className="hover:text-slate-900 transition-colors cursor-pointer">
              Create Workspace
            </button>
            <button onClick={onTryDemo} className="hover:text-slate-900 transition-colors cursor-pointer">
              Sample Demo Mode
            </button>
            <button onClick={onSignIn} className="hover:text-slate-900 transition-colors cursor-pointer">
              Sign In
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
