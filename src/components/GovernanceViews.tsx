import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import {
  CheckCircle2,
  HelpCircle,
  Plus,
  Search,
  Settings as SettingsIcon,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { db } from '../firebase';
import {
  addCustomDepartment,
  inviteWorkspaceMember,
  removeDepartment,
  updateUserProfileFields,
  updateWorkspaceMemberRole,
} from '../services/firestoreService';
import {
  AuditLog,
  Department,
  INSTITUTION_TERMINOLOGY,
  Institution,
  InstitutionType,
  UnansweredQuestion,
  UserProfile,
  UserRole,
  WorkspaceMembership,
} from '../types/domain';
import { PageHeroBanner } from './PageHeroBanner';

// 1. UNANSWERED QUESTIONS VIEW
export const UnansweredQuestionsView: React.FC<{
  unansweredQuestions: UnansweredQuestion[];
  onNavigateToUpload: () => void;
}> = ({ unansweredQuestions, onNavigateToUpload }) => {
  const [resolutionText, setResolutionText] = useState<Record<string, string>>({});

  const handleResolve = async (qId: string) => {
    await updateDoc(doc(db, 'unanswered_questions', qId), {
      status: 'RESOLVED',
      resolutionNotes: resolutionText[qId] || 'Addressed via updated departmental policy.',
    });
  };

  const openCount = unansweredQuestions.filter((q) => q.status === 'OPEN').length;
  const resolvedCount = unansweredQuestions.filter((q) => q.status === 'RESOLVED').length;

  return (
    <div className="space-y-5">
      <PageHeroBanner
        eyebrow="Knowledge Gap Detection & Resolution"
        titlePrefix="Unanswered,"
        titleHighlight="Questions!"
        subtitle="Track student and faculty questions where the Knowledge Assistant found no verified policy coverage. Upload missing departmental documents or record official resolutions."
        actions={[
          {
            label: 'Upload Missing Policy Document',
            onClick: onNavigateToUpload,
            variant: 'primary',
            icon: <Plus className="w-4 h-4" />,
          },
        ]}
        kpiCards={[
          {
            label: 'Total Logged Questions',
            value: unansweredQuestions.length,
            badge: `↑ +${unansweredQuestions.length}`,
            icon: <HelpCircle className="w-4 h-4" />,
            iconBg: 'bg-[#E6F0FF]',
            iconColor: 'text-[#1D63ED]',
          },
          {
            label: 'Open Knowledge Gaps',
            value: openCount,
            badge: `↑ +${openCount}`,
            icon: <HelpCircle className="w-4 h-4" />,
            iconBg: 'bg-[#FFF0E0]',
            iconColor: 'text-[#EA7A13]',
          },
          {
            label: 'Resolved Questions',
            value: resolvedCount,
            badge: `↑ +${resolvedCount}`,
            icon: <CheckCircle2 className="w-4 h-4" />,
            iconBg: 'bg-[#E3F7EC]',
            iconColor: 'text-[#109848]',
          },
          {
            label: 'Auto-Detection',
            value: 'Active',
            badge: '↑ RAG Linked',
            icon: <Shield className="w-4 h-4" />,
            iconBg: 'bg-[#F1E8FF]',
            iconColor: 'text-[#7C3AED]',
          },
        ]}
      />

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="bg-[#101F3C] text-white px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-4 h-4 text-[#609BFF]" />
            <h2 className="text-sm font-bold tracking-wide">
              Unanswered Student &amp; Faculty Questions
            </h2>
          </div>
          <button
            onClick={onNavigateToUpload}
            className="px-4 py-1.5 text-xs font-bold text-white bg-[#029D97] hover:bg-[#02847F] rounded-xl cursor-pointer shadow-2xs"
          >
            Upload Missing Policy Document
          </button>
        </div>
        <div className="p-6 space-y-5">
          <p className="text-xs text-slate-600">
            Questions where the RAG Knowledge Assistant found no verified approved policy coverage
          </p>

          {unansweredQuestions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Zero unanswered questions recorded. Try asking an uncovered question in the Knowledge Assistant to see it logged here automatically.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {unansweredQuestions
                .slice()
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((item) => (
                  <div key={item.id} className="py-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        Asked by: <strong className="text-slate-800">{item.askedByRole}</strong> · Suggested Unit:{' '}
                        <strong className="text-sky-700">{item.departmentSuggested || 'Admissions'}</strong>
                      </span>
                      <span className="font-mono tabular-nums">
                        {item.status} · {item.createdAt.slice(0, 16).replace('T', ' ')}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{item.question}</div>

                    {item.status === 'OPEN' ? (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={resolutionText[item.id] || ''}
                          onChange={(e) =>
                            setResolutionText({ ...resolutionText, [item.id]: e.target.value })
                          }
                          placeholder="Enter resolution note or reference to newly uploaded policy..."
                          className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                        />
                        <button
                          onClick={() => handleResolve(item.id)}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#029D97] hover:bg-[#02847F] rounded-lg cursor-pointer"
                        >
                          Mark Resolved
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-emerald-800">
                        Resolution: {item.resolutionNotes}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 2. AUDIT HISTORY VIEW
export const AuditHistoryView: React.FC<{
  auditLogs: AuditLog[];
}> = ({ auditLogs }) => {
  const [search, setSearch] = useState<string>('');
  const [actorFilter, setActorFilter] = useState<string>('ALL');

  const filtered = auditLogs
    .filter((log) => {
      if (actorFilter !== 'ALL' && log.actorType !== actorFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          log.actorName.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.targetTitle.toLowerCase().includes(q) ||
          (log.reason || '').toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const humanLogs = auditLogs.filter((l) => l.actorType === 'HUMAN').length;
  const agentLogs = auditLogs.filter((l) => l.actorType === 'AI_AGENT').length;

  return (
    <div className="space-y-5">
      <PageHeroBanner
        eyebrow="Immutable Governance & Compliance Ledger"
        titlePrefix="Audit,"
        titleHighlight="History!"
        subtitle="Inspect append-only institutional audit logs recording every document upload, AI agent execution stage, human review decision, and lifecycle state transition."
        kpiCards={[
          {
            label: 'Total Audit Records',
            value: auditLogs.length,
            badge: `↑ +${auditLogs.length}`,
            icon: <Shield className="w-4 h-4" />,
            iconBg: 'bg-[#E6F0FF]',
            iconColor: 'text-[#1D63ED]',
          },
          {
            label: 'Human Decisions',
            value: humanLogs,
            badge: `↑ +${humanLogs}`,
            icon: <Users className="w-4 h-4" />,
            iconBg: 'bg-[#E3F7EC]',
            iconColor: 'text-[#109848]',
          },
          {
            label: 'AI Agent Actions',
            value: agentLogs,
            badge: `↑ +${agentLogs}`,
            icon: <CheckCircle2 className="w-4 h-4" />,
            iconBg: 'bg-[#F1E8FF]',
            iconColor: 'text-[#7C3AED]',
          },
          {
            label: 'Filtered View',
            value: filtered.length,
            badge: '↑ Live',
            icon: <Search className="w-4 h-4" />,
            iconBg: 'bg-[#FFF0E0]',
            iconColor: 'text-[#EA7A13]',
          },
        ]}
      />

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="bg-[#101F3C] text-white px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-[#609BFF]" />
            <h2 className="text-sm font-bold tracking-wide">
              Institutional Governance &amp; Agent Audit History
            </h2>
          </div>
          <span className="text-xs font-mono text-blue-200 tabular-nums">
            {filtered.length} Audit Records
          </span>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs text-slate-600">
              Append-only Firestore audit records (`audit_logs`) tracking human and AI agent operations
            </p>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search actor, action, document..."
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <select
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
              >
                <option value="ALL">All Actors</option>
                <option value="HUMAN">Human Governance</option>
                <option value="AI_AGENT">AI Lifecycle Agents</option>
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No matching audit entries found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 pr-4 font-semibold">Timestamp</th>
                    <th className="py-2.5 px-4 font-semibold">Actor</th>
                    <th className="py-2.5 px-4 font-semibold">Action</th>
                    <th className="py-2.5 px-4 font-semibold">Related Document / Article</th>
                    <th className="py-2.5 px-4 font-semibold">State Transition</th>
                    <th className="py-2.5 pl-4 font-semibold">Reason / Run ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-3 pr-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        {log.createdAt.slice(0, 19).replace('T', ' ')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{log.actorName}</div>
                        <div className="text-slate-400 font-mono">{log.actorType}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-sky-800">{log.action}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{log.targetTitle}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {log.previousStatus ? `${log.previousStatus} → ` : ''}
                        {log.newStatus || 'Recorded'}
                      </td>
                      <td className="py-3 pl-4 text-slate-600">
                        <div>{log.reason}</div>
                        {log.workflowRunId && (
                          <div className="text-slate-400 font-mono">Run: {log.workflowRunId}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 3. USER MANAGEMENT & ROLE ACCESS CONTROL VIEW
const ALL_ROLES: UserRole[] = [
  'Platform Administrator',
  'Institution Administrator',
  'Knowledge Manager',
  'Human Reviewer',
  'Teacher / Faculty Member',
  'Student',
  'Parent / Guardian',
];

export const UserManagementView: React.FC<{
  ownerId: string;
  userProfile: UserProfile;
  institution: Institution;
  departments: Department[];
  memberships: WorkspaceMembership[];
  onRoleChanged: (newRole: UserRole) => void;
}> = ({
  ownerId,
  userProfile,
  institution,
  departments,
  memberships,
  onRoleChanged,
}) => {
  const [inviteName, setInviteName] = useState<string>('');
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<UserRole>('Human Reviewer');
  const [inviteDept, setInviteDept] = useState<string>(departments[0]?.name || 'Admissions');
  const [statusMsg, setStatusMsg] = useState<string>('');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    await inviteWorkspaceMember({
      ownerId,
      institutionId: institution.id,
      userName: inviteName.trim(),
      userEmail: inviteEmail.trim(),
      role: inviteRole,
      department: inviteDept,
      actorName: userProfile.fullName,
    });
    setInviteName('');
    setInviteEmail('');
    setStatusMsg(`Added ${inviteName} as ${inviteRole}.`);
  };

  const handleSwitchActiveRole = async (role: UserRole) => {
    await updateUserProfileFields(userProfile.uid, { role });
    onRoleChanged(role);
    setStatusMsg(
      `Switched your active session role to "${role}". Test the Knowledge Library and Assistant to verify role-based filtering!`
    );
  };

  return (
    <div className="space-y-5">
      <PageHeroBanner
        eyebrow="Role-Based Access Control & Workspace Governance"
        titlePrefix="Institution,"
        titleHighlight="Management!"
        subtitle="Manage institutional roles, invite faculty and reviewers, and simulate role-based permissions across Student, Faculty, Reviewer, and Administrator views."
        kpiCards={[
          {
            label: 'Workspace Members',
            value: memberships.length,
            badge: `↑ +${memberships.length}`,
            icon: <Users className="w-4 h-4" />,
            iconBg: 'bg-[#E6F0FF]',
            iconColor: 'text-[#1D63ED]',
          },
          {
            label: 'Configured Roles',
            value: ALL_ROLES.length,
            badge: '↑ RBAC Active',
            icon: <Shield className="w-4 h-4" />,
            iconBg: 'bg-[#E3F7EC]',
            iconColor: 'text-[#109848]',
          },
          {
            label: 'Departments',
            value: departments.length,
            badge: `↑ +${departments.length}`,
            icon: <CheckCircle2 className="w-4 h-4" />,
            iconBg: 'bg-[#F1E8FF]',
            iconColor: 'text-[#7C3AED]',
          },
          {
            label: 'Institution Type',
            value: institution.type,
            badge: '↑ Verified',
            icon: <SettingsIcon className="w-4 h-4" />,
            iconBg: 'bg-[#FFF0E0]',
            iconColor: 'text-[#EA7A13]',
          },
        ]}
      />

      {/* Interactive Role Switcher for Testing RBAC */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="bg-[#101F3C] text-white px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#609BFF]" />
            <h2 className="text-sm font-bold tracking-wide">
              Role-Based Access Control (RBAC) &amp; Live Role Simulator
            </h2>
          </div>
          <span className="text-xs font-mono text-emerald-300">
            Active: {userProfile.role}
          </span>
        </div>
        <div className="p-6">
          <p className="text-xs text-slate-600 mb-4">
            Switch roles below to test how Student, Faculty, Reviewer, and Admin permissions restrict document and knowledge article visibility.
          </p>

          {statusMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
              {statusMsg}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {ALL_ROLES.map((role) => (
              <button
                key={role}
                onClick={() => handleSwitchActiveRole(role)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                  userProfile.role === role
                    ? 'bg-[#029D97] text-white border-[#029D97] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-[#029D97]'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Invite User Form */}
        <form
          onSubmit={handleInvite}
          className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden"
        >
          <div className="bg-[#101F3C] text-white px-6 py-3.5 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#609BFF]" />
            <h3 className="text-xs font-bold tracking-wide">
              Add / Invite Institutional Workspace Member
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Prof. Ahmed Khan"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Institutional Email *</label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="faculty@university.edu"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Role *</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={inviteDept}
                onChange={(e) => setInviteDept(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 text-xs font-bold text-white bg-[#029D97] hover:bg-[#02847F] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Assign Role &amp; Add Member</span>
            </button>
          </div>
        </form>

        {/* Workspace Members List */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="bg-[#101F3C] text-white px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#34D399]" />
              <h3 className="text-xs font-bold tracking-wide">
                Workspace Memberships ({memberships.length})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-blue-200">{institution.name}</span>
          </div>
          <div className="p-6 divide-y divide-slate-100">
            {memberships.map((mem) => (
              <div key={mem.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{mem.userName}</div>
                  <div className="text-xs text-slate-500">
                    {mem.userEmail} · {mem.department || 'Administration'}
                  </div>
                </div>
                <select
                  value={mem.role}
                  onChange={(e) =>
                    updateWorkspaceMemberRole(
                      mem.id,
                      e.target.value as UserRole,
                      mem.department || 'Administration'
                    )
                  }
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// 4. SETTINGS VIEW
export const SettingsView: React.FC<{
  ownerId: string;
  institution: Institution;
  departments: Department[];
  onSwitchToDemoWorkspace: () => Promise<void>;
}> = ({ ownerId, institution, departments, onSwitchToDemoWorkspace }) => {
  const [instName, setInstName] = useState<string>(institution.name);
  const [instType, setInstType] = useState<InstitutionType>(institution.type);
  const [country, setCountry] = useState<string>(institution.country);
  const [newDept, setNewDept] = useState<string>('');
  const [newDeptDesc, setNewDeptDesc] = useState<string>('');
  const [savedMsg, setSavedMsg] = useState<string>('');
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [aiSavedMsg, setAiSavedMsg] = useState<string>('');

  React.useEffect(() => {
    fetch('/api/ai-config')
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (data) setAiStatus(data);
      })
      .catch(() => {});
  }, []);

  const handleUpdateAIConfig = async (patch: {
    primaryProvider?: 'openrouter' | 'gemini';
    backupProvider?: 'openrouter' | 'gemini' | 'none';
    openRouterModel?: string;
    geminiModel?: string;
  }) => {
    const res = await fetch('/api/ai-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json();
      setAiStatus(updated);
      setAiSavedMsg('Updated backend AI provider and model routing.');
    }
  };

  const handleResetQuota = async () => {
    const res = await fetch('/api/ai-config/reset-quota', { method: 'POST' });
    if (res.ok) {
      const updated = await res.json();
      setAiStatus(updated);
      setAiSavedMsg('Reset daily quota pause flags for all providers.');
    }
  };

  const handleSaveInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateDoc(doc(db, 'institutions', institution.id), {
      name: instName.trim().slice(0, 200),
      type: instType,
      country: country.trim().slice(0, 100),
      updatedAt: new Date().toISOString(),
    });
    setSavedMsg('Updated institution settings and adapted terminology.');
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDept.trim()) return;
    await addCustomDepartment({
      ownerId,
      institutionId: institution.id,
      name: newDept.trim(),
      description: newDeptDesc.trim() || `${newDept.trim()} department`,
      headName: 'Department Head',
    });
    setNewDept('');
    setNewDeptDesc('');
  };

  const terminology = INSTITUTION_TERMINOLOGY[instType];

  return (
    <div className="space-y-5">
      <PageHeroBanner
        eyebrow="Platform Configuration & AI Routing"
        titlePrefix="Workspace,"
        titleHighlight="Settings!"
        subtitle="Configure OpenRouter and Gemini backend AI provider routing, customize institutional profile and terminology, and manage academic departments."
        actions={[
          {
            label: 'Switch to Demo University Workspace',
            onClick: onSwitchToDemoWorkspace,
            variant: 'primary',
            icon: <SettingsIcon className="w-4 h-4" />,
          },
          {
            label: 'Reset AI Quota Pause Flags',
            onClick: handleResetQuota,
            variant: 'success',
            icon: <CheckCircle2 className="w-4 h-4" />,
          },
        ]}
        kpiCards={[
          {
            label: 'Primary AI Provider',
            value: aiStatus?.config?.primaryProvider === 'openrouter' ? 'OpenRouter' : 'Gemini',
            badge: '↑ Active',
            icon: <SettingsIcon className="w-4 h-4" />,
            iconBg: 'bg-[#E6F0FF]',
            iconColor: 'text-[#1D63ED]',
          },
          {
            label: 'Backup Provider',
            value:
              aiStatus?.config?.backupProvider === 'gemini'
                ? 'Gemini'
                : aiStatus?.config?.backupProvider === 'openrouter'
                ? 'OpenRouter'
                : 'Disabled',
            badge: '↑ Configured',
            icon: <Shield className="w-4 h-4" />,
            iconBg: 'bg-[#E3F7EC]',
            iconColor: 'text-[#109848]',
          },
          {
            label: 'Departments',
            value: departments.length,
            badge: `↑ +${departments.length}`,
            icon: <Users className="w-4 h-4" />,
            iconBg: 'bg-[#F1E8FF]',
            iconColor: 'text-[#7C3AED]',
          },
          {
            label: 'Embedding Cache',
            value: aiStatus?.embeddingCacheStats?.cachedEntries || 0,
            badge: `↑ ${aiStatus?.embeddingCacheStats?.cacheHits || 0} Reused`,
            icon: <CheckCircle2 className="w-4 h-4" />,
            iconBg: 'bg-[#FFF0E0]',
            iconColor: 'text-[#EA7A13]',
          },
        ]}
      />

      {/* Configurable Backend AI Provider & Model Routing Panel */}
      {aiStatus && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="bg-[#101F3C] text-white px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-[#609BFF]" />
              <h2 className="text-sm font-bold tracking-wide">
                Configurable AI Provider &amp; Model Routing (Backend)
              </h2>
            </div>
            <button
              type="button"
              onClick={handleResetQuota}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#029D97] hover:bg-[#02847F] rounded-xl cursor-pointer self-start"
            >
              Reset Quota Pause Flags
            </button>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-xs text-slate-500">
              1. OpenRouter (Primary Provider) · 2. Gemini API (Optional Backup Provider) · API keys remain strictly in server environment variables
            </p>

            {aiSavedMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                {aiSavedMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Primary AI Provider
                </label>
                <select
                  value={aiStatus.config.primaryProvider}
                  onChange={(e) =>
                    handleUpdateAIConfig({
                      primaryProvider: e.target.value as 'openrouter' | 'gemini',
                      backupProvider: e.target.value === 'openrouter' ? 'gemini' : 'openrouter',
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-900"
                >
                  <option value="openrouter">1. OpenRouter (Primary)</option>
                  <option value="gemini">2. Gemini API</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Optional Backup Provider
                </label>
                <select
                  value={aiStatus.config.backupProvider}
                  onChange={(e) =>
                    handleUpdateAIConfig({
                      backupProvider: e.target.value as 'openrouter' | 'gemini' | 'none',
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-900"
                >
                  <option value="gemini">Gemini API (Backup)</option>
                  <option value="openrouter">OpenRouter (Backup)</option>
                  <option value="none">Disabled (No Backup)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  OpenRouter Model Selection
                </label>
                <select
                  value={aiStatus.config.openRouterModel}
                  onChange={(e) => handleUpdateAIConfig({ openRouterModel: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-mono text-slate-900"
                >
                  {(aiStatus.availableOpenRouterModels || []).map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Gemini Backup Model Selection
                </label>
                <select
                  value={aiStatus.config.geminiModel}
                  onChange={(e) => handleUpdateAIConfig({ geminiModel: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-mono text-slate-900"
                >
                  {(aiStatus.availableGeminiModels || []).map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-slate-500">OpenRouter Status</div>
                <div className="font-mono font-semibold text-emerald-700 mt-0.5">
                  {aiStatus.providers?.openrouter?.configured ? 'CONFIGURED (READY)' : 'NOT CONFIGURED'}
                  {aiStatus.providers?.openrouter?.dailyQuotaExhausted ? ' · QUOTA PAUSED' : ''}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Gemini Backup Status</div>
                <div className="font-mono font-semibold text-slate-800 mt-0.5">
                  {aiStatus.providers?.gemini?.configured ? 'CONFIGURED' : 'NOT CONFIGURED'}
                  {aiStatus.providers?.gemini?.dailyQuotaExhausted ? ' · 429 QUOTA EXHAUSTED' : ''}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Embedding Cache Reuse</div>
                <div className="font-mono font-semibold text-blue-700 tabular-nums mt-0.5">
                  {aiStatus.embeddingCacheStats?.cachedEntries || 0} cached · {aiStatus.embeddingCacheStats?.cacheHits || 0} reused
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={handleSaveInstitution}
          className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden"
        >
          <div className="bg-[#101F3C] text-white px-6 py-3.5 flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-[#609BFF]" />
            <h2 className="text-xs font-bold tracking-wide">
              Institution Profile &amp; Terminology Settings
            </h2>
          </div>

          <div className="p-6 space-y-4">
            {savedMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                {savedMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Institution Name</label>
              <input
                type="text"
                value={instName}
                onChange={(e) => setInstName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Institution Type</label>
              <select
                value={instType}
                onChange={(e) => setInstType(e.target.value as InstitutionType)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              >
                <option value="Academy">Academy</option>
                <option value="School">School</option>
                <option value="College">College</option>
                <option value="University">University</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-900">Active Adapted Terminology ({instType}):</div>
              <div>Learners: {terminology.learnerLabel}</div>
              <div>Educators: {terminology.educatorLabel}</div>
              <div>Organizational Units: {terminology.unitLabel}</div>
            </div>

            <button
              type="submit"
              className="px-4 py-2.5 text-xs font-bold text-white bg-[#029D97] hover:bg-[#02847F] rounded-xl cursor-pointer shadow-xs"
            >
              Save Institution Settings
            </button>
          </div>
        </form>

        {/* Department Management */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="bg-[#101F3C] text-white px-6 py-3.5 flex items-center justify-between">
            <h2 className="text-xs font-bold tracking-wide">
              Configure Institutional Departments ({departments.length})
            </h2>
            <span className="text-[11px] font-mono text-teal-200">{institution.name}</span>
          </div>

          <div className="p-6 space-y-4">
            <form onSubmit={handleCreateDept} className="flex gap-2">
              <input
                type="text"
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                placeholder="New department name..."
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                className="px-3.5 py-2 text-xs font-bold text-white bg-[#029D97] hover:bg-[#02847F] rounded-xl cursor-pointer"
              >
                Add
              </button>
            </form>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {departments.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs"
                >
                  <span className="font-medium text-slate-800">{d.name}</span>
                  <button
                    onClick={() => removeDepartment(d.id)}
                    className="text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={onSwitchToDemoWorkspace}
                className="w-full py-2.5 text-xs font-bold text-white bg-[#029D97] hover:bg-[#02847F] rounded-xl cursor-pointer shadow-xs"
              >
                Open / Switch to &quot;Demo University — Sample Workspace&quot;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Infrastructure & Vector Index Setup Reference */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="bg-[#101F3C] text-white px-6 py-3.5 flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#34D399]" />
          <h3 className="text-xs font-bold tracking-wide">
            Firebase Infrastructure, Security Rules &amp; Vector Index Reference
          </h3>
        </div>
        <div className="p-6 space-y-2 text-xs text-slate-600">
          <p>
            1. <strong>Cloud Firestore &amp; Security Rules:</strong> Connected to database{' '}
            <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
              ai-studio-b3d94fcb-adb4-413e-b38d-93d21830a72f
            </code>{' '}
            with deployed zero-trust tenant isolation (`firestore.rules`).
          </p>
          <p>
            2. <strong>Embeddings &amp; Vector Search Cache:</strong> Semantic embeddings are cached and reused server-side to eliminate redundant API calls. Composite vector index configuration is saved in{' '}
            <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">firestore.indexes.json</code>.
          </p>
        </div>
      </div>
    </div>
  );
};
