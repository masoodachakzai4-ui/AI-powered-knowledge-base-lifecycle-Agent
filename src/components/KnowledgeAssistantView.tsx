import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import {
  AlertOctagon,
  BookOpen,
  CheckCircle2,
  FileText,
  HelpCircle,
  MessageSquare,
  Plus,
  Send,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { db } from '../firebase';
import { askKnowledgeAssistant } from '../services/apiService';
import {
  ChatMessage,
  Conversation,
  Institution,
  KnowledgeArticle,
  KnowledgeChunk,
  SourceCitation,
  UserRole,
} from '../types/domain';
import { PageHeroBanner } from './PageHeroBanner';

interface KnowledgeAssistantViewProps {
  ownerId: string;
  userId: string;
  userRole: UserRole;
  institution: Institution;
  approvedChunks: KnowledgeChunk[];
  publishedArticles: KnowledgeArticle[];
  conversations: Conversation[];
  chatMessages: ChatMessage[];
  onSelectArticle: (articleId: string) => void;
}

const PRIMARY_SUGGESTED_QUESTIONS = [
  'What are the admission requirements?',
  'What is the current fee structure?',
  'How can I apply for a scholarship?',
  'What are the examination rules?',
  'Show me the academic calendar.',
];

const EDUCATIONAL_QUESTION_EXAMPLES = [
  { category: 'Admissions', question: 'What are the admission requirements?' },
  { category: 'Fees', question: 'What is the current fee structure?' },
  { category: 'Scholarships', question: 'How can I apply for a scholarship?' },
  { category: 'Examinations', question: 'What are the examination rules?' },
  { category: 'Academics', question: 'Show me the academic calendar.' },
  { category: 'Admissions Docs', question: 'What documents are required for admission?' },
  { category: 'Attendance', question: 'What is the minimum attendance requirement?' },
  { category: 'Library', question: 'What are the library opening hours?' },
  { category: 'Hostel', question: 'What is the hostel application procedure?' },
  { category: 'Contact', question: 'How can I contact the admissions department?' },
  {
    category: 'Unverified Test',
    question: 'Does the university provide submarine pilot training scholarships in Antarctica?',
  },
];

export const KnowledgeAssistantView: React.FC<KnowledgeAssistantViewProps> = ({
  ownerId,
  userId,
  userRole,
  institution,
  approvedChunks,
  publishedArticles,
  conversations,
  chatMessages,
  onSelectArticle,
}) => {
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(
    conversations[0]?.id
  );
  const [questionInput, setQuestionInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const activeMessages = chatMessages
    .filter((m) => m.conversationId === activeConversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const handleSendQuestion = async (qText?: string) => {
    const queryText = (qText ?? questionInput).trim();
    if (!queryText || isLoading) return;
    setQuestionInput('');
    setError('');
    setIsLoading(true);

    try {
      const result = await askKnowledgeAssistant({
        ownerId,
        institutionId: institution.id,
        institutionName: institution.name,
        userId,
        userRole,
        question: queryText,
        conversationId: activeConversationId,
        approvedChunks,
        publishedArticles,
      });
      setActiveConversationId(result.conversationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve answer from Knowledge Assistant.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (
    messageId: string,
    feedback: 'HELPFUL' | 'NOT_HELPFUL' | 'REPORTED_INCORRECT'
  ) => {
    try {
      await updateDoc(doc(db, 'chat_messages', messageId), { feedback });
    } catch (err) {
      console.error('Feedback update error:', err);
    }
  };

  const approvedCount = publishedArticles.filter((a) => a.status === 'PUBLISHED').length;

  return (
    <div className="space-y-5">
      <PageHeroBanner
        eyebrow="RAG Grounded Institutional Assistant"
        titlePrefix="Knowledge,"
        titleHighlight="Assistant!"
        subtitle="Ask natural-language questions about admissions, fees, scholarships, exams, and institutional policies. Answers are grounded strictly in human-approved knowledge articles with full source citations."
        actions={[
          {
            label: 'Start New Conversation',
            onClick: () => setActiveConversationId(undefined),
            variant: 'primary',
            icon: <Plus className="w-4 h-4" />,
          },
          {
            label: 'Ask Admission Requirements',
            onClick: () => handleSendQuestion('What are the admission requirements?'),
            variant: 'success',
            icon: <MessageSquare className="w-4 h-4" />,
          },
        ]}
        kpiCards={[
          {
            label: 'Approved Articles',
            value: approvedCount,
            badge: `↑ +${approvedCount}`,
            icon: <CheckCircle2 className="w-4 h-4" />,
            iconBg: 'bg-[#E3F7EC]',
            iconColor: 'text-[#109848]',
          },
          {
            label: 'Indexed Chunks',
            value: approvedChunks.length,
            badge: '↑ RAG Ready',
            icon: <BookOpen className="w-4 h-4" />,
            iconBg: 'bg-[#E6F0FF]',
            iconColor: 'text-[#1D63ED]',
          },
          {
            label: 'Conversations',
            value: conversations.length,
            badge: `↑ +${conversations.length}`,
            icon: <MessageSquare className="w-4 h-4" />,
            iconBg: 'bg-[#F1E8FF]',
            iconColor: 'text-[#7C3AED]',
          },
          {
            label: 'Suggested Prompts',
            value: EDUCATIONAL_QUESTION_EXAMPLES.length,
            badge: '↑ Verified',
            icon: <HelpCircle className="w-4 h-4" />,
            iconBg: 'bg-[#FFF0E0]',
            iconColor: 'text-[#EA7A13]',
          },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Conversation History & Example Questions */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="bg-[#101F3C] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
                <h2 className="text-xs font-bold tracking-wide">RAG Governance Scope</h2>
              </div>
              <span className="text-[11px] font-mono font-semibold text-emerald-300 tabular-nums">
                {approvedCount} Approved
              </span>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                The Knowledge Assistant retrieves strictly from Human-Approved, non-retired articles permitted for your active role (<span className="font-semibold text-slate-900">{userRole}</span>). Draft and rejected articles are never used.
              </p>
              <button
                onClick={() => setActiveConversationId(undefined)}
                className="w-full py-2.5 px-3 text-xs font-bold text-white bg-[#029D97] hover:bg-[#02847F] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Start New Conversation</span>
              </button>
            </div>
          </div>

          {/* Example Questions */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="bg-[#101F3C] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#609BFF]" />
                <h3 className="text-xs font-bold tracking-wide">
                  Suggested Institutional Questions
                </h3>
              </div>
              <span className="text-[11px] text-blue-200 font-mono">
                {EDUCATIONAL_QUESTION_EXAMPLES.length} Prompts
              </span>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-500 mb-3">
                Click any question below to query verified institutional knowledge
              </p>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {EDUCATIONAL_QUESTION_EXAMPLES.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendQuestion(item.question)}
                    disabled={isLoading}
                    className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-blue-600 hover:bg-blue-50/40 text-left transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <div className="text-xs font-mono text-blue-700 mb-0.5">{item.category}</div>
                    <div className="text-xs font-medium text-slate-800">{item.question}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Previous Conversations */}
          {conversations.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="bg-[#101F3C] text-white px-5 py-3.5 flex items-center justify-between">
                <h3 className="text-xs font-bold tracking-wide">Recent Conversations</h3>
                <span className="text-[11px] font-mono text-blue-200">{conversations.length}</span>
              </div>
              <div className="p-5 space-y-1.5 max-h-48 overflow-y-auto">
                {conversations
                  .slice()
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setActiveConversationId(conv.id)}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs truncate transition-colors cursor-pointer ${
                        activeConversationId === conv.id
                          ? 'bg-[#029D97] text-white font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {conv.title}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

      {/* Right Column: Chat Thread & Evidence Citations */}
      <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col min-h-[640px]">
        <div className="bg-[#101F3C] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#609BFF]" />
              <h2 className="text-sm font-bold tracking-wide">
                Institutional Knowledge Assistant
              </h2>
            </div>
            <p className="text-xs text-blue-200/90 mt-0.5">
              {institution.name} · Grounded answers with verified section &amp; effective date citations
            </p>
          </div>
          <span className="text-xs font-mono text-blue-200 bg-white/10 px-2.5 py-1 rounded-lg">
            Role: {userRole}
          </span>
        </div>

        {/* Quick Suggested Question Prompts Bar */}
        <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1">
            Suggested:
          </span>
          {PRIMARY_SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleSendQuestion(q)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-700 text-xs font-medium text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[520px]">
          {activeMessages.length === 0 ? (
            <div className="py-10 text-center max-w-xl mx-auto space-y-5">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  Ask About Approved Institutional Policies
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Every answer is grounded strictly in human-approved knowledge articles and includes source document, section, and effective date citations.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                {PRIMARY_SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSendQuestion(q)}
                    disabled={isLoading}
                    className="p-3 rounded-xl border border-slate-200 hover:border-blue-600 hover:bg-blue-50/30 text-xs font-medium text-slate-800 transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {approvedCount === 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  Note: There are currently 0 published articles in this workspace. Approve a draft in the Human Review Workspace or switch to Demo University to test verified answers.
                </div>
              )}
            </div>
          ) : (
            activeMessages.map((msg) => {
              let citations: SourceCitation[] = [];
              if (msg.citationsJson) {
                try {
                  citations = JSON.parse(msg.citationsJson);
                } catch {
                  citations = [];
                }
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-2xl rounded-xl p-4 ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-50 border border-slate-200 text-slate-900'
                    }`}
                  >
                    <div className="text-xs font-mono opacity-75 mb-1.5">
                      {msg.role === 'user' ? `You (${userRole})` : 'Institutional Knowledge Assistant'}
                    </div>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>

                    {/* Citations Block */}
                    {msg.role === 'assistant' && citations.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
                        <div className="text-xs font-semibold text-slate-800">
                          Verified Source References:
                        </div>
                        {citations.map((cit, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-3 rounded-lg bg-white border border-slate-200 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-sky-800">
                                Related Article: {cit.articleTitle}
                              </span>
                              <button
                                onClick={() => onSelectArticle(cit.articleId)}
                                className="text-xs font-semibold text-sky-700 hover:underline cursor-pointer"
                              >
                                View Article
                              </button>
                            </div>
                            <div className="text-slate-600">
                              Original Document: <span className="font-medium text-slate-800">{cit.documentTitle}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-slate-500">
                              <span>Relevant Section: {cit.sectionTitle}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">
                                Effective Date: {cit.effectiveDate || 'Active'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* User Feedback Controls */}
                    {msg.role === 'assistant' && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center gap-3">
                        <span className="text-xs text-slate-500">Feedback:</span>
                        <button
                          onClick={() => handleFeedback(msg.id, 'HELPFUL')}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                            msg.feedback === 'HELPFUL'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>Helpful</span>
                        </button>
                        <button
                          onClick={() => handleFeedback(msg.id, 'NOT_HELPFUL')}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                            msg.feedback === 'NOT_HELPFUL'
                              ? 'bg-amber-50 border-amber-300 text-amber-800 font-semibold'
                              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          <span>Not Helpful</span>
                        </button>
                        <button
                          onClick={() => handleFeedback(msg.id, 'REPORTED_INCORRECT')}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                            msg.feedback === 'REPORTED_INCORRECT'
                              ? 'bg-rose-50 border-rose-300 text-rose-800 font-semibold'
                              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <AlertOctagon className="w-3.5 h-3.5" />
                          <span>Report Incorrect Information</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {isLoading && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-mono">
              Generating question embeddings &amp; retrieving approved institutional chunks...
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
              {error}
            </div>
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendQuestion();
          }}
          className="p-4 border-t border-slate-200 flex items-center gap-3"
        >
          <input
            type="text"
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            placeholder="Ask an institutional question (e.g., What are the admission requirements?)"
            className="flex-1 px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
          />
          <button
            type="submit"
            disabled={isLoading || !questionInput.trim()}
            className="px-5 py-2.5 text-xs font-bold text-white bg-[#029D97] hover:bg-[#02847F] rounded-xl flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <span>Ask Assistant</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
      </div>
    </div>
  );
};
