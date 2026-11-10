import React, { useState } from 'react';
import {
  Archive,
  Calendar,
  Check,
  FileDiff,
  GitCompare,
  Play,
  RefreshCw,
  X,
} from 'lucide-react';
import { generateVersionComparisonProposal } from '../services/apiService';
import { executeLifecycleProposalDecision } from '../services/firestoreService';
import {
  DocumentRecord,
  DocumentVersion,
  Institution,
  KnowledgeArticle,
  LifecycleProposal,
} from '../types/domain';
import { PageHeroBanner } from './PageHeroBanner';

interface LifecycleManagementViewProps {
  ownerId: string;
  reviewerName: string;
  institution: Institution;
  documents: DocumentRecord[];
  documentVersions: DocumentVersion[];
  articles: KnowledgeArticle[];
  lifecycleProposals: LifecycleProposal[];
}

export const LifecycleManagementView: React.FC<LifecycleManagementViewProps> = ({
  ownerId,
  reviewerName,
  institution,
  documents,
  documentVersions,
  articles,
  lifecycleProposals,
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id || '');
  const [customNewVersionText, setCustomNewVersionText] = useState<string>('');
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const selectedDoc = documents.find((d) => d.id === selectedDocId) || documents[0];
  const docVers = selectedDoc
    ? documentVersions
        .filter((v) => v.documentId === selectedDoc.id)
        .sort((a, b) => a.versionNumber - b.versionNumber)
    : [];

  const oldVerText = docVers[0]?.extractedText || selectedDoc?.extractedText || '';
  const latestVerText =
    customNewVersionText.trim() ||
    (docVers.length > 1 ? docVers[docVers.length - 1].extractedText : selectedDoc?.extractedText || '');

  const handleRunVersionComparison = async () => {
    if (!selectedDoc) return;
    setIsComparing(true);
    setStatusMessage('');
    try {
      const linkedArticle = articles.find((a) => a.sourceDocumentId === selectedDoc.id);
      const proposal = await generateVersionComparisonProposal({
        ownerId,
        institutionId: institution.id,
        document: selectedDoc,
        article: linkedArticle,
        oldVersionText: oldVerText,
        newVersionText: latestVerText,
        actorName: reviewerName,
      });
      setStatusMessage(
        `Generated ${proposal.actionType} proposal for "${selectedDoc.title}". Ready for Human Reviewer approval below.`
      );
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Version comparison failed.');
    } finally {
      setIsComparing(false);
    }
  };

  const handleProposalDecision = async (
    proposal: LifecycleProposal,
    decision: 'APPROVED' | 'REJECTED'
  ) => {
    await executeLifecycleProposalDecision({
      ownerId,
      institutionId: institution.id,
      proposal,
      decision,
      reviewerName,
      articles,
    });
    setStatusMessage(
      `${decision} lifecycle ${proposal.actionType} proposal for "${proposal.targetTitle}". Historical versions preserved.`
    );
  };

  const filteredProposals = lifecycleProposals
    .filter((p) => (actionFilter === 'ALL' ? true : p.actionType === actionFilter))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const pendingProposals = lifecycleProposals.filter((p) => p.status === 'PENDING_APPROVAL').length;
  const approvedProposals = lifecycleProposals.filter((p) => p.status === 'APPROVED').length;

  return (
    <div className="space-y-5">
      <PageHeroBanner
        eyebrow="Continuous Policy Governance & Version Control"
        titlePrefix="Lifecycle,"
        titleHighlight="Management!"
        subtitle="Govern institutional knowledge over time with CREATE, KEEP, UPDATE, and RETIRE proposals. Compare policy versions side-by-side while preserving full historical archives."
        actions={[
          {
            label: 'Compare Policy Versions',
            onClick: handleRunVersionComparison,
            variant: 'primary',
            icon: <GitCompare className="w-4 h-4" />,
          },
          {
            label: 'Inject Sample Policy Update',
            onClick: () =>
              setCustomNewVersionText(
                oldVerText +
                  '\n\n[REVISION NOTICE 2026-10]: Fall Application Deadline extended to July 25, 2026 and Tuition Fee updated.'
              ),
            variant: 'success',
            icon: <FileDiff className="w-4 h-4" />,
          },
        ]}
        kpiCards={[
          {
            label: 'Total Proposals',
            value: lifecycleProposals.length,
            badge: `↑ +${lifecycleProposals.length}`,
            icon: <RefreshCw className="w-4 h-4" />,
            iconBg: 'bg-[#E6F0FF]',
            iconColor: 'text-[#1D63ED]',
          },
          {
            label: 'Pending Approval',
            value: pendingProposals,
            badge: `↑ +${pendingProposals}`,
            icon: <FileDiff className="w-4 h-4" />,
            iconBg: 'bg-[#FFF0E0]',
            iconColor: 'text-[#EA7A13]',
          },
          {
            label: 'Approved Actions',
            value: approvedProposals,
            badge: `↑ +${approvedProposals}`,
            icon: <Check className="w-4 h-4" />,
            iconBg: 'bg-[#E3F7EC]',
            iconColor: 'text-[#109848]',
          },
          {
            label: 'Version Snapshots',
            value: documentVersions.length,
            badge: `↑ Archived`,
            icon: <Archive className="w-4 h-4" />,
            iconBg: 'bg-[#F1E8FF]',
            iconColor: 'text-[#7C3AED]',
          },
        ]}
      />

      {/* Header & Lifecycle Action Summary */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="bg-[#101F3C] text-white px-6 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-[#609BFF]" />
            <h2 className="text-sm font-bold tracking-wide">
              Institutional Knowledge Lifecycle &amp; Version Control
            </h2>
          </div>
          <div className="flex items-center gap-1 p-1 bg-white/10 rounded-xl">
            {['ALL', 'CREATE', 'KEEP', 'UPDATE', 'RETIRE'].map((act) => (
              <button
                key={act}
                onClick={() => setActionFilter(act)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  actionFilter === act
                    ? 'bg-[#029D97] text-white shadow-xs'
                    : 'text-teal-100 hover:text-white'
                }`}
              >
                {act}
              </button>
            ))}
          </div>
        </div>
        <div className="p-6">
          <p className="text-xs text-slate-600 mb-5">
            Continuously govern institutional policies via CREATE, KEEP, UPDATE, and RETIRE proposals. Previous versions are archived and never deleted.
          </p>

        {statusMessage && (
          <div className="mb-4 p-3.5 rounded-lg bg-sky-50 border border-sky-200 text-xs font-medium text-sky-900">
            {statusMessage}
          </div>
        )}

        {/* Lifecycle Proposals List */}
        {filteredProposals.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500">
            No lifecycle proposals match the selected filter.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProposals.map((prop) => (
              <div
                key={prop.id}
                className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-sky-800">{prop.actionType}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-600">{prop.department}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-slate-500">Status: {prop.status}</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400 tabular-nums">
                    {prop.createdAt.slice(0, 10)}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">{prop.targetTitle}</h3>
                <p className="text-xs text-slate-700 leading-relaxed">{prop.reason}</p>

                {prop.diffSummary && (
                  <div className="p-3.5 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-wrap">
                    <div className="font-sans font-semibold text-slate-900 mb-1">
                      Detected Version Changes / Section Diff:
                    </div>
                    {prop.diffSummary}
                  </div>
                )}

                {prop.oldVersionText && prop.newVersionText && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-lg bg-white border border-slate-200">
                      <div className="text-xs font-semibold text-slate-700 mb-1">
                        Previous Archived Version
                      </div>
                      <div className="text-xs font-mono text-slate-600 whitespace-pre-wrap max-h-36 overflow-y-auto">
                        {prop.oldVersionText}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-white border border-sky-200">
                      <div className="text-xs font-semibold text-sky-800 mb-1">
                        New Revised Version
                      </div>
                      <div className="text-xs font-mono text-slate-800 whitespace-pre-wrap max-h-36 overflow-y-auto">
                        {prop.newVersionText}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                  <div className="text-xs text-slate-500">
                    {prop.reviewedBy
                      ? `Reviewed by ${prop.reviewedBy} on ${prop.reviewedAt?.slice(0, 10)}`
                      : 'Requires Stage 05 Human Reviewer approval before taking effect'}
                  </div>

                  {prop.status === 'PENDING_APPROVAL' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleProposalDecision(prop, 'APPROVED')}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#029D97] hover:bg-[#02847F] rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve {prop.actionType}</span>
                      </button>
                      <button
                        onClick={() => handleProposalDecision(prop, 'REJECTED')}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-md flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject Proposal</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Interactive Document Version Comparison & AI Diff Generator */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="bg-[#101F3C] text-white px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-[#609BFF]" />
            <h3 className="text-sm font-bold tracking-wide">
              Document Version Control &amp; Side-by-Side Diff Analyzer
            </h3>
          </div>
          <select
            value={selectedDoc?.id || ''}
            onChange={(e) => {
              setSelectedDocId(e.target.value);
              setCustomNewVersionText('');
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-white/10 text-white border border-white/20 rounded-xl min-w-[260px]"
          >
            {documents.map((d) => (
              <option key={d.id} value={d.id} className="text-slate-900">
                {d.title} (Current v{d.version}.0)
              </option>
            ))}
          </select>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500">
            Compare Version 1 vs. Version 2 (or simulate a policy update) to generate an evidence-grounded KEEP, UPDATE, or RETIRE proposal
          </p>

          {selectedDoc && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-slate-700 mb-1.5">
                    Baseline Archived Version (v1.0)
                  </div>
                  <textarea
                    rows={8}
                    readOnly
                    value={oldVerText}
                    className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-700">
                      New / Revised Policy Text (Editable to Test UPDATE Proposal)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCustomNewVersionText(
                          oldVerText +
                            '\n\n[REVISION NOTICE 2026-10]: Fall Application Deadline extended to July 25, 2026 and Tuition Fee updated.'
                        )
                      }
                      className="text-xs font-semibold text-[#029D97] hover:underline cursor-pointer"
                    >
                      Inject Sample Policy Change
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    value={customNewVersionText || latestVerText}
                    onChange={(e) => setCustomNewVersionText(e.target.value)}
                    className="w-full p-3 text-xs font-mono bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-[#029D97]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-slate-500 font-mono">
                  Saved Version Snapshots for this Document: {docVers.length}
                </div>
                <button
                  onClick={handleRunVersionComparison}
                  disabled={isComparing}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#029D97] hover:bg-[#02847F] rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <GitCompare className="w-4 h-4" />
                  <span>
                    {isComparing
                      ? 'Comparing Versions...'
                      : 'Compare Versions & Generate Lifecycle Proposal'}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Upcoming Document Review & Expiry Schedule */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="bg-[#101F3C] text-white px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#34D399]" />
            <h3 className="text-sm font-bold tracking-wide">
              Institutional Policy Review &amp; Expiration Schedule
            </h3>
          </div>
          <span className="text-xs font-mono text-blue-200">
            {documents.length} Monitored Documents
          </span>
        </div>
        <div className="p-6">
          <p className="text-xs text-slate-500 mb-4">
            Monitors effective dates, scheduled review dates, and policy expiration across departments
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4 font-semibold">Document Title</th>
                  <th className="py-2.5 px-4 font-semibold">Department</th>
                  <th className="py-2.5 px-4 font-semibold">Version</th>
                  <th className="py-2.5 px-4 font-semibold">Effective Date</th>
                  <th className="py-2.5 px-4 font-semibold">Scheduled Review Date</th>
                  <th className="py-2.5 pl-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((docItem) => (
                  <tr key={docItem.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 font-medium text-slate-900">{docItem.title}</td>
                    <td className="py-3 px-4 text-slate-600">{docItem.department}</td>
                    <td className="py-3 px-4 font-mono tabular-nums">v{docItem.version}.0</td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                      {docItem.effectiveDate || 'Active'}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-800">
                      {docItem.reviewDate || docItem.expiryDate || '2027-05-15'}
                    </td>
                    <td className="py-3 pl-4 font-mono text-right text-slate-700">
                      {docItem.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
