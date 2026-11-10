import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  X,
} from 'lucide-react';
import { executeHumanReviewDecision } from '../services/firestoreService';
import {
  DocumentRecord,
  Institution,
  KnowledgeArticle,
  ReviewTask,
  VerificationReport,
} from '../types/domain';
import { PageHeroBanner } from './PageHeroBanner';

interface HumanReviewViewProps {
  ownerId: string;
  reviewerName: string;
  institution: Institution;
  articles: KnowledgeArticle[];
  documents: DocumentRecord[];
  reviewTasks: ReviewTask[];
  initialArticleId?: string;
}

export const HumanReviewView: React.FC<HumanReviewViewProps> = ({
  ownerId,
  reviewerName,
  institution,
  articles,
  documents,
  reviewTasks,
  initialArticleId,
}) => {
  const reviewCandidates = articles.filter(
    (a) =>
      a.status === 'WAITING_FOR_HUMAN_APPROVAL' ||
      a.status === 'AI-SUGGESTED / DRAFT' ||
      a.status === 'REVISION_REQUESTED' ||
      a.id === initialArticleId
  );

  const [selectedArticleId, setSelectedArticleId] = useState<string>(
    initialArticleId || reviewCandidates[0]?.id || articles[0]?.id || ''
  );
  const [reviewerNotes, setReviewerNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<string>('');

  const activeArticle =
    articles.find((a) => a.id === selectedArticleId) ||
    reviewCandidates[0] ||
    articles[0];

  const sourceDoc = activeArticle
    ? documents.find((d) => d.id === activeArticle.sourceDocumentId)
    : undefined;

  const matchingTask = activeArticle
    ? reviewTasks.find((t) => t.articleId === activeArticle.id)
    : undefined;

  let verificationReport: VerificationReport | null = null;
  if (activeArticle?.verificationReportJson) {
    try {
      verificationReport = JSON.parse(activeArticle.verificationReportJson);
    } catch {
      verificationReport = null;
    }
  }

  const handleDecision = async (
    decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'SAVE_PENDING'
  ) => {
    if (!activeArticle) return;
    setIsSubmitting(true);
    setBannerMessage('');
    try {
      await executeHumanReviewDecision({
        ownerId,
        institutionId: institution.id,
        article: activeArticle,
        reviewTask: matchingTask,
        decision,
        reviewerName,
        reviewerNotes:
          reviewerNotes.trim() || `Stage 05 Human Reviewer action: ${decision}`,
      });
      setReviewerNotes('');
      setBannerMessage(
        decision === 'APPROVE'
          ? `Approved and published "${activeArticle.title}" to the Knowledge Library and RAG Knowledge Assistant.`
          : `Recorded decision (${decision}) for "${activeArticle.title}".`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingCount = articles.filter(
    (a) => a.status === 'WAITING_FOR_HUMAN_APPROVAL' || a.status === 'AI-SUGGESTED / DRAFT'
  ).length;
  const approvedCount = articles.filter((a) => a.status === 'PUBLISHED').length;
  const revisionCount = articles.filter((a) => a.status === 'REVISION_REQUESTED').length;

  return (
    <div className="space-y-5">
      <PageHeroBanner
        eyebrow="Stage 05 · Mandatory Human Publication Gate"
        titlePrefix="Human Review,"
        titleHighlight="Workspace!"
        subtitle="Inspect AI-generated knowledge drafts alongside the original source document and Stage 04 Verification Report. No article is ever published to the Knowledge Library without human approval."
        actions={
          activeArticle
            ? [
                {
                  label: 'Approve & Publish Draft',
                  onClick: () => handleDecision('APPROVE'),
                  variant: 'success',
                  icon: <Check className="w-4 h-4" />,
                },
                {
                  label: 'Request Changes',
                  onClick: () => handleDecision('REQUEST_CHANGES'),
                  variant: 'secondary',
                  icon: <RefreshCw className="w-4 h-4" />,
                },
              ]
            : undefined
        }
        kpiCards={[
          {
            label: 'Waiting Approval',
            value: pendingCount,
            badge: `↑ +${pendingCount}`,
            icon: <Clock className="w-4 h-4" />,
            iconBg: 'bg-[#FFF0E0]',
            iconColor: 'text-[#EA7A13]',
          },
          {
            label: 'Published Articles',
            value: approvedCount,
            badge: `↑ +${approvedCount}`,
            icon: <CheckCircle2 className="w-4 h-4" />,
            iconBg: 'bg-[#E3F7EC]',
            iconColor: 'text-[#109848]',
          },
          {
            label: 'Revision Requested',
            value: revisionCount,
            badge: `↑ +${revisionCount}`,
            icon: <AlertTriangle className="w-4 h-4" />,
            iconBg: 'bg-[#FFE8EA]',
            iconColor: 'text-[#E11D48]',
          },
          {
            label: 'Source Documents',
            value: documents.length,
            badge: `↑ +${documents.length}`,
            icon: <FileText className="w-4 h-4" />,
            iconBg: 'bg-[#E6F0FF]',
            iconColor: 'text-[#1D63ED]',
          },
        ]}
      />

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="bg-[#101F3C] text-white px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-4 h-4 text-[#34D399]" />
            <span className="text-xs font-mono font-bold tracking-wider text-emerald-300">
              STAGE 05 — HUMAN REVIEWER (NOT AN AI AGENT)
            </span>
          </div>
          <span className="text-[11px] text-blue-200">
            Mandatory Institutional Publication Gate
          </span>
        </div>
        <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Select Draft Article for Side-by-Side Inspection
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Compare the AI-generated draft against the original uploaded policy text and Stage 04 accuracy audit.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={activeArticle?.id || ''}
              onChange={(e) => {
                setSelectedArticleId(e.target.value);
                setBannerMessage('');
              }}
              className="px-3.5 py-2 text-xs font-semibold border border-slate-300 rounded-xl min-w-[260px] bg-slate-50 focus:bg-white focus:outline-none focus:border-[#155EEF]"
            >
              {articles.length === 0 ? (
                <option value="">No generated articles available</option>
              ) : (
                articles.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.status}] {a.title} (v{a.version}.0)
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {bannerMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900">
          {bannerMessage}
        </div>
      )}

      {!activeArticle ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-500">
          No knowledge articles are waiting for human review. Upload a document and run the 4 AI Agents to generate a draft.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): AI-Generated Draft vs Original Source Document */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="bg-[#101F3C] text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#609BFF]" />
                  <span className="text-xs font-bold tracking-wide">
                    AI-Generated Knowledge Article Draft
                  </span>
                </div>
                <span className="text-[11px] font-mono text-emerald-300">
                  Status: {activeArticle.status} · v{activeArticle.version}.0
                </span>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-200">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {activeArticle.title}
                    </h3>
                  </div>
                  <div className="text-xs text-slate-500 font-mono tabular-nums">
                    Effective: {activeArticle.effectiveDate || 'N/A'}
                  </div>
                </div>

                <div className="mb-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  <span className="font-semibold text-slate-900">Executive Summary: </span>
                  {activeArticle.summary}
                </div>

                <div className="mb-4">
                  <div className="text-xs font-semibold text-slate-700 mb-2">
                    AI-Generated Structured Knowledge Article Content:
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs leading-relaxed whitespace-pre-wrap font-mono text-slate-800 max-h-96 overflow-y-auto">
                    {activeArticle.contentMarkdown}
                  </div>
                </div>

                <div className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Source References Cited: </span>
                  {activeArticle.sourceReferences || 'Full Document'}
                </div>
              </div>
            </div>

            {/* Original Source Document Comparison */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="bg-[#101F3C] text-white px-6 py-3.5 flex items-center justify-between">
                <h4 className="text-xs font-bold tracking-wide">
                  Original Source Document: {activeArticle.sourceDocumentTitle}
                </h4>
                <span className="text-[11px] font-mono text-blue-200">
                  {sourceDoc?.fileName || 'Source Record'}
                </span>
              </div>
              <div className="p-6">
                <div className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">
                  {sourceDoc?.extractedText || 'Source document text stored in workspace.'}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Stage 04 Verification Report & 4 Governance Decision Buttons */}
          <div className="lg:col-span-5 space-y-6">
            {/* Verification Report Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="bg-[#101F3C] text-white px-6 py-3.5 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-blue-300">STAGE 04 OUTPUT</div>
                  <h4 className="text-xs font-bold tracking-wide">
                    Knowledge Verifier Accuracy Report
                  </h4>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-300">
                  {verificationReport?.verificationStatus || activeArticle.verificationStatus}
                </span>
              </div>
              <div className="p-6 space-y-4">

              {verificationReport ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="font-semibold text-emerald-800 mb-1">
                      Verified Statements ({verificationReport.verifiedStatements.length}):
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-slate-700">
                      {verificationReport.verifiedStatements.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  {verificationReport.datesChecked.length > 0 && (
                    <div>
                      <div className="font-semibold text-slate-800 mb-1">Dates &amp; Deadlines Checked:</div>
                      <div className="font-mono text-slate-600">
                        {verificationReport.datesChecked.join(' · ')}
                      </div>
                    </div>
                  )}

                  {verificationReport.feesAndNumbersChecked.length > 0 && (
                    <div>
                      <div className="font-semibold text-slate-800 mb-1">
                        Fees, Percentages &amp; Numbers Audited:
                      </div>
                      <div className="font-mono text-slate-600">
                        {verificationReport.feesAndNumbersChecked.join(' · ')}
                      </div>
                    </div>
                  )}

                  {verificationReport.unsupportedStatements.length > 0 && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900">
                      <div className="font-semibold mb-1">Unsupported Statements Flagged:</div>
                      <ul className="list-disc pl-4 space-y-1">
                        {verificationReport.unsupportedStatements.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {verificationReport.missingInformation.length > 0 && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                      <div className="font-semibold mb-1">Missing Information:</div>
                      <ul className="list-disc pl-4 space-y-1">
                        {verificationReport.missingInformation.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {verificationReport.reviewWarnings.length > 0 && (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                      <div className="font-semibold text-slate-900 mb-1">Reviewer Warnings:</div>
                      <ul className="list-disc pl-4 space-y-1">
                        {verificationReport.reviewWarnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {Array.isArray(verificationReport.revisionHistoryReports) &&
                    verificationReport.revisionHistoryReports.length > 0 && (
                      <div className="p-3 rounded-lg bg-sky-50/60 border border-sky-200 text-slate-800 space-y-1.5">
                        <div className="font-semibold text-sky-950">
                          Stage 03 ⇄ Stage 04 Revision History ({verificationReport.revisionHistoryReports.length} round(s)):
                        </div>
                        {verificationReport.revisionHistoryReports.map((rep, idx) => (
                          <div key={idx} className="text-[11px] bg-white p-2 rounded border border-sky-100">
                            <span className="font-mono font-bold text-sky-900">
                              Round {rep.round} ({rep.status}):{' '}
                            </span>
                            <span className="text-slate-700">{rep.feedback}</span>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  Verification status: {activeArticle.verificationStatus}
                </div>
              )}
              </div>
            </div>

            {/* Stage 05 Human Reviewer Action Panel */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="bg-[#101F3C] text-white px-6 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#34D399]" />
                  <h4 className="text-xs font-bold tracking-wide">
                    Stage 05 Human Reviewer Decision
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-blue-200">
                  Reviewer: {reviewerName}
                </span>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Reviewer Governance Notes / Audit Reason
                  </label>
                  <textarea
                    rows={3}
                    value={reviewerNotes}
                    onChange={(e) => setReviewerNotes(e.target.value)}
                    placeholder="Enter verification sign-off notes or requested revision instructions..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#155EEF]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleDecision('APPROVE')}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 text-xs font-bold text-white bg-[#029D97] hover:bg-[#02847F] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>1. Approve &amp; Publish</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDecision('REJECT')}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    <X className="w-4 h-4" />
                    <span>2. Reject Draft</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDecision('REQUEST_CHANGES')}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 text-xs font-bold text-amber-950 bg-amber-100 border border-amber-300 hover:bg-amber-200 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>3. Request Changes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDecision('SAVE_PENDING')}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 text-xs font-bold text-slate-800 bg-slate-100 border border-slate-300 hover:bg-slate-200 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>4. Save as Pending</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
