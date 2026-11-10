import React, { useState } from 'react';
import {
  BookOpen,
  Calendar,
  Eye,
  FileText,
  Filter,
  Search,
  Shield,
  X,
} from 'lucide-react';
import {
  ArticleVersion,
  DEFAULT_CATEGORIES,
  Department,
  DocumentRecord,
  FAQItem,
  KnowledgeArticle,
  UserRole,
} from '../types/domain';
import { PageHeroBanner } from './PageHeroBanner';

interface KnowledgeLibraryViewProps {
  userRole: UserRole;
  departments: Department[];
  articles: KnowledgeArticle[];
  articleVersions: ArticleVersion[];
  documents: DocumentRecord[];
  selectedArticleId?: string;
  onSelectArticleId: (id: string | undefined) => void;
}

export const KnowledgeLibraryView: React.FC<KnowledgeLibraryViewProps> = ({
  userRole,
  departments,
  articles,
  articleVersions,
  documents,
  selectedArticleId,
  onSelectArticleId,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [versionFilter, setVersionFilter] = useState<string>('ALL');

  // Role-based access enforcement
  const roleFilteredArticles = articles.filter((art) => {
    if (userRole === 'Student') {
      return art.status === 'PUBLISHED' && art.accessLevel === 'PUBLIC_STUDENT';
    }
    if (userRole === 'Parent / Guardian') {
      return (
        art.status === 'PUBLISHED' &&
        (art.accessLevel === 'PUBLIC_STUDENT' || art.accessLevel === 'PARENT_GUARDIAN')
      );
    }
    if (userRole === 'Teacher / Faculty Member') {
      return (
        art.status === 'PUBLISHED' &&
        (art.accessLevel === 'PUBLIC_STUDENT' || art.accessLevel === 'FACULTY_STAFF')
      );
    }
    return true;
  });

  const filteredArticles = roleFilteredArticles.filter((art) => {
    if (categoryFilter !== 'ALL' && art.category !== categoryFilter) return false;
    if (departmentFilter !== 'ALL' && art.department !== departmentFilter) return false;
    if (statusFilter !== 'ALL' && art.status !== statusFilter) return false;
    if (versionFilter !== 'ALL' && String(art.version) !== versionFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        art.title.toLowerCase().includes(q) ||
        art.summary.toLowerCase().includes(q) ||
        art.department.toLowerCase().includes(q) ||
        art.category.toLowerCase().includes(q) ||
        art.sourceDocumentTitle.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const detailArticle = selectedArticleId
    ? roleFilteredArticles.find((a) => a.id === selectedArticleId)
    : undefined;

  const detailSourceDoc = detailArticle
    ? documents.find((d) => d.id === detailArticle.sourceDocumentId)
    : undefined;

  const detailVersions = detailArticle
    ? articleVersions
        .filter((v) => v.articleId === detailArticle.id)
        .sort((a, b) => b.versionNumber - a.versionNumber)
    : [];

  let detailFaqs: FAQItem[] = [];
  if (detailArticle?.faqsJson) {
    try {
      detailFaqs = JSON.parse(detailArticle.faqsJson);
    } catch {
      detailFaqs = [];
    }
  }

  const publishedCount = roleFilteredArticles.filter((a) => a.status === 'PUBLISHED').length;
  const pendingCount = roleFilteredArticles.filter(
    (a) => a.status === 'WAITING_FOR_HUMAN_APPROVAL'
  ).length;

  return (
    <div className="space-y-5">
      <PageHeroBanner
        eyebrow={`Governed Institutional Knowledge Repository · Active Role: ${userRole}`}
        titlePrefix="Explore Verified"
        titleHighlight="Knowledge Library"
        subtitle="Browse, search, and inspect human-approved knowledge articles, version histories, and original source citations."
        kpiCards={[
          {
            label: 'Accessible Articles',
            value: roleFilteredArticles.length,
            badge: `+${roleFilteredArticles.length}`,
            icon: BookOpen,
            color: 'blue',
          },
          {
            label: 'Published & Approved',
            value: publishedCount,
            badge: `+${publishedCount}`,
            icon: Shield,
            color: 'green',
          },
          {
            label: 'Awaiting Review',
            value: pendingCount,
            badge: `+${pendingCount}`,
            icon: Calendar,
            color: 'orange',
          },
          {
            label: 'Source Documents',
            value: documents.length,
            badge: `+${documents.length}`,
            icon: FileText,
            color: 'purple',
          },
        ]}
      />

      {/* Search and Multi-Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="bg-[#101F3C] text-white px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-[#609BFF]" />
            <h2 className="text-sm font-bold tracking-wide">
              Institutional Knowledge Library
            </h2>
          </div>
          <span className="text-xs font-mono text-blue-200 tabular-nums">
            Showing {filteredArticles.length} of {roleFilteredArticles.length} accessible articles
          </span>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600">
            Centralized repository of governed educational knowledge articles (Active Role: <strong>{userRole}</strong>)
          </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, summary, source document..."
              className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
          >
            <option value="ALL">All Categories</option>
            {DEFAULT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="WAITING_FOR_HUMAN_APPROVAL">Waiting Review</option>
              <option value="REVISION_REQUESTED">Revision Requested</option>
              <option value="RETIRED">Retired</option>
            </select>

            <select
              value={versionFilter}
              onChange={(e) => setVersionFilter(e.target.value)}
              className="w-24 px-2 py-2 text-xs border border-slate-300 rounded-lg"
            >
              <option value="ALL">Any Ver</option>
              <option value="1">v1.0</option>
              <option value="2">v2.0</option>
              <option value="3">v3.0</option>
            </select>
          </div>
        </div>
        </div>
      </div>

      {/* Article Detail Modal / Expanded Panel */}
      {detailArticle && (
        <div className="bg-white rounded-xl border-2 border-sky-600 p-6 space-y-6">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
                <span>{detailArticle.department}</span>
                <span aria-hidden="true">·</span>
                <span>{detailArticle.category}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">Version {detailArticle.version}.0</span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-sky-700">{detailArticle.status}</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">{detailArticle.title}</h3>
            </div>
            <button
              onClick={() => onSelectArticleId(undefined)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Close Detail View</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <div>
              <div className="text-slate-500">Source Document</div>
              <div className="font-semibold text-slate-900 mt-0.5">{detailArticle.sourceDocumentTitle}</div>
            </div>
            <div>
              <div className="text-slate-500">Effective / Review Date</div>
              <div className="font-mono text-slate-900 tabular-nums mt-0.5">
                {detailArticle.effectiveDate || 'Active'} / {detailArticle.reviewDate || 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Created By</div>
              <div className="text-slate-900 mt-0.5">{detailArticle.createdBy}</div>
            </div>
            <div>
              <div className="text-slate-500">Approved By</div>
              <div className="font-semibold text-emerald-800 mt-0.5">
                {detailArticle.approvedBy || 'Pending Human Reviewer'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              <div className="text-xs font-semibold text-slate-700">Article Content:</div>
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-sm leading-relaxed whitespace-pre-wrap text-slate-800">
                {detailArticle.contentMarkdown}
              </div>

              {detailFaqs.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-semibold text-slate-800">
                    Generated Frequently Asked Questions:
                  </div>
                  {detailFaqs.map((faq, idx) => (
                    <div key={idx} className="p-3.5 rounded-lg border border-slate-200 bg-white">
                      <div className="text-xs font-semibold text-slate-900 mb-1">
                        Q: {faq.question}
                      </div>
                      <div className="text-xs text-slate-600">A: {faq.answer}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-4 space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="text-xs font-semibold text-slate-900 mb-2">
                  Original Source Document Excerpt
                </div>
                <div className="text-xs font-mono text-slate-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {detailSourceDoc?.extractedText || 'Original source text archived.'}
                </div>
              </div>

              {detailVersions.length > 0 && (
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <div className="text-xs font-semibold text-slate-900 mb-2">
                    Article Version History ({detailVersions.length})
                  </div>
                  <div className="space-y-2 text-xs">
                    {detailVersions.map((ver) => (
                      <div key={ver.id} className="p-2.5 rounded border border-slate-100 bg-slate-50">
                        <div className="font-mono font-semibold text-slate-800">
                          Version {ver.versionNumber}.0 · {ver.status}
                        </div>
                        <div className="text-slate-600 mt-0.5">{ver.changeNotes}</div>
                        <div className="text-slate-400 font-mono mt-0.5">
                          {ver.reviewerName} · {ver.createdAt.slice(0, 10)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Articles Table / List */}
      {filteredArticles.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500">
          No knowledge articles match your current filters and role permissions.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredArticles.map((art) => (
            <div
              key={art.id}
              className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
            >
              <div className="space-y-1.5 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-800">{art.department}</span>
                  <span aria-hidden="true">·</span>
                  <span>{art.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">v{art.version}.0</span>
                  <span aria-hidden="true">·</span>
                  <span>Approval Status: {art.status}</span>
                  <span aria-hidden="true">·</span>
                  <span>Access: {art.accessLevel}</span>
                </div>

                <h3 className="text-base font-bold text-slate-900">{art.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{art.summary}</p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-slate-500 font-mono tabular-nums">
                  <span>Source: {art.sourceDocumentTitle}</span>
                  <span>Effective: {art.effectiveDate || 'N/A'}</span>
                  <span>Review Date: {art.reviewDate || art.expiryDate || 'N/A'}</span>
                  <span>Updated: {(art.updatedAt || art.createdAt).slice(0, 10)}</span>
                  <span>Created by: {art.createdBy}</span>
                  <span>Approved by: {art.approvedBy || 'Pending'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onSelectArticleId(art.id)}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#029D97] hover:bg-[#02847F] rounded-xl flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-2xs transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Article &amp; Source</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
