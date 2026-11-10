/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import {
  Bell,
  BookOpen,
  Building2,
  CloudUpload,
  GraduationCap,
  HelpCircle,
  History,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  PanelLeft,
  RefreshCw,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Workflow,
  X,
} from 'lucide-react';
import { DashboardView } from './components/DashboardView';
import { DocumentUploadView } from './components/DocumentUploadView';
import {
  AuditHistoryView,
  SettingsView,
  UnansweredQuestionsView,
  UserManagementView,
} from './components/GovernanceViews';
import { GettingStartedView } from './components/GettingStartedView';
import { HumanReviewView } from './components/HumanReviewView';
import { KnowledgeAssistantView } from './components/KnowledgeAssistantView';
import { KnowledgeLibraryView } from './components/KnowledgeLibraryView';
import { LandingPage } from './components/LandingPage';
import { LifecycleManagementView } from './components/LifecycleManagementView';
import { OnboardingFlow } from './components/OnboardingFlow';
import { WorkflowMonitorView } from './components/WorkflowMonitorView';
import { auth, googleProvider } from './firebase';
import { executeSequentialAgentPipeline } from './services/apiService';
import {
  createInstitutionWorkspace,
  getUserProfile,
  markNotificationRead,
  saveUploadedDocument,
  saveUserProfile,
  seedDemoWorkspaceIfNeeded,
  subscribeToWorkspaceData,
  updateUserProfileFields,
} from './services/firestoreService';
import { buildDemoSeedData } from './data/demoSeed';
import {
  ArticleVersion,
  AuditLog,
  ChatMessage,
  Conversation,
  DEFAULT_DEPARTMENTS,
  Department,
  DocumentRecord,
  DocumentVersion,
  Institution,
  InstitutionType,
  KnowledgeArticle,
  KnowledgeChunk,
  LifecycleProposal,
  NotificationItem,
  ReviewTask,
  UnansweredQuestion,
  UserProfile,
  UserRole,
  WorkflowRun,
  WorkflowStage,
  WorkspaceMembership,
} from './types/domain';

type NavTab =
  | 'dashboard'
  | 'getting-started'
  | 'upload'
  | 'library'
  | 'workflow'
  | 'assistant'
  | 'review'
  | 'lifecycle'
  | 'unanswered'
  | 'audit'
  | 'institution'
  | 'settings';

const PREVIEW_OWNER_ID = 'demo_preview_uid';
const PREVIEW_INST_ID = 'inst_demo_preview';
const PREVIEW_SEED = buildDemoSeedData(PREVIEW_OWNER_ID, PREVIEW_INST_ID, 'Muhammad Masood');

const PREVIEW_PROFILE: UserProfile = {
  uid: PREVIEW_OWNER_ID,
  ownerId: PREVIEW_OWNER_ID,
  fullName: 'Muhammad Masood',
  email: 'masoodachakzai4@gmail.com',
  role: 'Institution Administrator',
  institutionId: PREVIEW_INST_ID,
  institutionName: 'Demo University — Sample Workspace',
  department: 'Admissions',
  onboardingCompleted: true,
  createdAt: new Date().toISOString(),
};

const PREVIEW_INSTITUTION: Institution = {
  id: PREVIEW_INST_ID,
  ownerId: PREVIEW_OWNER_ID,
  name: 'Demo University — Sample Workspace',
  type: 'University',
  country: 'United States',
  website: 'https://demo-university.example.edu',
  primaryDepartment: 'Admissions',
  isDemo: true,
  createdAt: new Date().toISOString(),
};

const PREVIEW_DEPARTMENTS: Department[] = DEFAULT_DEPARTMENTS.map((name, idx) => ({
  id: `dept_preview_${idx}`,
  ownerId: PREVIEW_OWNER_ID,
  institutionId: PREVIEW_INST_ID,
  name,
  description: `${name} Academic & Policy Unit`,
  headName: 'Muhammad Masood',
  createdAt: new Date().toISOString(),
}));

const PREVIEW_MEMBERSHIPS: WorkspaceMembership[] = [
  {
    id: 'mem_preview_1',
    ownerId: PREVIEW_OWNER_ID,
    institutionId: PREVIEW_INST_ID,
    userId: PREVIEW_OWNER_ID,
    userEmail: 'masoodachakzai4@gmail.com',
    userName: 'Muhammad Masood',
    role: 'Institution Administrator',
    department: 'Admissions',
    status: 'Active',
    createdAt: new Date().toISOString(),
  },
];

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(PREVIEW_PROFILE);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [showLandingPage, setShowLandingPage] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  // Active Navigation & UI state
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [selectedLibraryArticleId, setSelectedLibraryArticleId] = useState<string | undefined>();
  const [selectedReviewArticleId, setSelectedReviewArticleId] = useState<string | undefined>();
  const [isRunningPipeline, setIsRunningPipeline] = useState<boolean>(false);
  const [isSwitchingDemo, setIsSwitchingDemo] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // Firestore Real-time Workspace Collections (initialized with Demo University seed for instant Dashboard view)
  const [institutions, setInstitutions] = useState<Institution[]>([PREVIEW_INSTITUTION]);
  const [departments, setDepartments] = useState<Department[]>(PREVIEW_DEPARTMENTS);
  const [memberships, setMemberships] = useState<WorkspaceMembership[]>(PREVIEW_MEMBERSHIPS);
  const [documents, setDocuments] = useState<DocumentRecord[]>(PREVIEW_SEED.documents);
  const [documentVersions, setDocumentVersions] = useState<DocumentVersion[]>(PREVIEW_SEED.documentVersions);
  const [articles, setArticles] = useState<KnowledgeArticle[]>(PREVIEW_SEED.articles);
  const [articleVersions, setArticleVersions] = useState<ArticleVersion[]>([]);
  const [chunks, setChunks] = useState<KnowledgeChunk[]>(PREVIEW_SEED.chunks);
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>(PREVIEW_SEED.workflowRuns);
  const [workflowStages, setWorkflowStages] = useState<WorkflowStage[]>(PREVIEW_SEED.workflowStages);
  const [reviewTasks, setReviewTasks] = useState<ReviewTask[]>(PREVIEW_SEED.reviewTasks);
  const [lifecycleProposals, setLifecycleProposals] = useState<LifecycleProposal[]>(PREVIEW_SEED.lifecycleProposals);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unansweredQuestions, setUnansweredQuestions] = useState<UnansweredQuestion[]>(
    PREVIEW_SEED.unansweredQuestions
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(PREVIEW_SEED.auditLogs);
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    PREVIEW_SEED.notifications
  );

  // 1. Listen to Firebase Auth State
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);
      if (u) {
        try {
          const existingProfile = await getUserProfile(u.uid);
          if (existingProfile && existingProfile.onboardingCompleted) {
            setUserProfile(existingProfile);
            setShowOnboarding(false);
            setShowLandingPage(false);
          } else {
            const userName = u.displayName || 'Muhammad Masood';
            const userEmail = u.email || 'masoodachakzai4@gmail.com';
            const demoInst = await seedDemoWorkspaceIfNeeded(u.uid, userEmail, userName);
            const autoProfile: UserProfile = {
              uid: u.uid,
              ownerId: u.uid,
              fullName: userName,
              email: userEmail,
              role: 'Institution Administrator',
              institutionId: demoInst.id,
              institutionName: demoInst.name,
              department: 'Admissions',
              onboardingCompleted: true,
              createdAt: new Date().toISOString(),
            };
            await saveUserProfile(autoProfile);
            setUserProfile(autoProfile);
            setShowOnboarding(false);
            setShowLandingPage(false);
          }
        } catch (err) {
          console.error('Error loading user profile:', err);
          setUserProfile(PREVIEW_PROFILE);
        }
      } else {
        setUserProfile(PREVIEW_PROFILE);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // 2. Attach Real-Time Workspace Listeners once UserProfile & InstitutionId are active
  useEffect(() => {
    if (!authReady || !userProfile?.institutionId) return;
    const ownerUid = firebaseUser?.uid || PREVIEW_OWNER_ID;

    const unsubscribeAll = subscribeToWorkspaceData(
      ownerUid,
      userProfile.institutionId,
      {
        onInstitutions: setInstitutions,
        onDepartments: setDepartments,
        onMemberships: setMemberships,
        onDocuments: setDocuments,
        onDocumentVersions: setDocumentVersions,
        onArticles: setArticles,
        onArticleVersions: setArticleVersions,
        onChunks: setChunks,
        onWorkflowRuns: setWorkflowRuns,
        onWorkflowStages: setWorkflowStages,
        onReviewTasks: setReviewTasks,
        onLifecycleProposals: setLifecycleProposals,
        onConversations: setConversations,
        onChatMessages: setChatMessages,
        onUnansweredQuestions: setUnansweredQuestions,
        onAuditLogs: setAuditLogs,
        onNotifications: setNotifications,
      }
    );

    return () => unsubscribeAll();
  }, [authReady, firebaseUser, userProfile?.institutionId]);

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setIsSigningIn(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const profile = await getUserProfile(cred.user.uid);
      if (profile && profile.onboardingCompleted) {
        setUserProfile(profile);
        setShowOnboarding(false);
        setShowLandingPage(false);
      } else {
        setShowOnboarding(true);
        setShowLandingPage(false);
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in failed');
      setShowLandingPage(false);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleTryDemoFromLanding = async () => {
    setAuthError('');
    setShowLandingPage(false);
    setShowOnboarding(false);
    setActiveTab('dashboard');
  };

  const handleCompleteOnboarding = async (data: {
    fullName: string;
    institutionName: string;
    institutionType: InstitutionType;
    primaryDepartment: string;
    country: string;
    website: string;
    departments: string[];
    role: UserRole;
    loadDemoSample: boolean;
  }) => {
    let current = auth.currentUser;
    if (!current) {
      const cred = await signInWithPopup(auth, googleProvider);
      current = cred.user;
    }
    if (!current) throw new Error('Authentication required');

    const userEmail = current.email || 'admin@institution.edu';
    let targetInst: Institution;

    if (data.loadDemoSample && data.institutionName === 'Demo University — Sample Workspace') {
      targetInst = await seedDemoWorkspaceIfNeeded(current.uid, userEmail, data.fullName);
    } else {
      targetInst = await createInstitutionWorkspace({
        ownerId: current.uid,
        userEmail,
        userName: data.fullName,
        userRole: data.role,
        institutionName: data.institutionName,
        institutionType: data.institutionType,
        country: data.country,
        website: data.website,
        primaryDepartment: data.primaryDepartment,
        departments: data.departments,
        isDemo: false,
      });

      if (data.loadDemoSample) {
        await seedDemoWorkspaceIfNeeded(current.uid, userEmail, data.fullName);
      }
    }

    const profile: UserProfile = {
      uid: current.uid,
      ownerId: current.uid,
      fullName: data.fullName,
      email: userEmail,
      role: data.role,
      institutionId: targetInst.id,
      institutionName: targetInst.name,
      department: data.primaryDepartment,
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
    };

    await saveUserProfile(profile);
    setUserProfile(profile);
    setShowOnboarding(false);
    setActiveTab('dashboard');
  };

  const handleSwitchWorkspace = async (instId: string) => {
    if (!userProfile) return;
    const ownerUid = firebaseUser?.uid || PREVIEW_OWNER_ID;
    if (instId === 'LOAD_DEMO_WORKSPACE') {
      setIsSwitchingDemo(true);
      try {
        const demoInst = await seedDemoWorkspaceIfNeeded(
          ownerUid,
          userProfile.email,
          userProfile.fullName
        );
        await updateUserProfileFields(ownerUid, {
          institutionId: demoInst.id,
          institutionName: demoInst.name,
        });
        setUserProfile({
          ...userProfile,
          institutionId: demoInst.id,
          institutionName: demoInst.name,
        });
      } finally {
        setIsSwitchingDemo(false);
      }
      return;
    }

    const found = institutions.find((i) => i.id === instId);
    if (found) {
      await updateUserProfileFields(ownerUid, {
        institutionId: found.id,
        institutionName: found.name,
      });
      setUserProfile({
        ...userProfile,
        institutionId: found.id,
        institutionName: found.name,
      });
    }
  };

  const handleRunPipelineForDocument = async (
    docRecord: DocumentRecord,
    options?: { simulateUnsupportedClaimTest?: boolean }
  ) => {
    if (!userProfile) return;
    const ownerUid = firebaseUser?.uid || PREVIEW_OWNER_ID;
    const activeInst =
      institutions.find((i) => i.id === userProfile.institutionId) || {
        id: userProfile.institutionId,
        ownerId: ownerUid,
        name: userProfile.institutionName || 'Institution',
        type: 'University' as InstitutionType,
        country: 'United States',
        isDemo: false,
        createdAt: new Date().toISOString(),
      };

    setActiveTab('workflow');
    setIsRunningPipeline(true);
    try {
      await executeSequentialAgentPipeline({
        ownerId: ownerUid,
        institutionId: activeInst.id,
        institutionType: activeInst.type,
        document: docRecord,
        existingDocumentTitles: documents
          .filter((d) => d.id !== docRecord.id)
          .map((d) => d.title),
        actorName: userProfile.fullName,
        simulateUnsupportedClaimTest: options?.simulateUnsupportedClaimTest,
      });
    } finally {
      setIsRunningPipeline(false);
    }
  };

  const handleCreateTestCorruptedDoc = async (): Promise<DocumentRecord> => {
    if (!userProfile) {
      throw new Error('User profile required');
    }
    const ownerUid = firebaseUser?.uid || PREVIEW_OWNER_ID;
    const { document } = await saveUploadedDocument({
      ownerId: ownerUid,
      institutionId: userProfile.institutionId,
      title: '[TEST] Corrupted / Unreadable Scanned PDF Notice',
      fileName: 'Corrupted_Unreadable_Scan.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      department: 'Admissions',
      category: 'Admission Policies',
      accessLevel: 'PUBLIC_STUDENT',
      extractedText: 'Requires OCR',
      requiresOcr: true,
      uploadedBy: userProfile.fullName,
      isSampleData: true,
    });
    return document;
  };

  // Loading state
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#EEF4FB] flex items-center justify-center p-6">
        <div className="text-center space-y-2.5">
          <div className="w-12 h-12 rounded-2xl bg-[#029D97] flex items-center justify-center mx-auto shadow-md">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <div className="text-sm font-bold text-slate-900">
            Initializing EduKnowledge AI Platform...
          </div>
        </div>
      </div>
    );
  }

  // Onboarding Wizard
  if (showOnboarding) {
    return (
      <OnboardingFlow
        currentUser={firebaseUser}
        onGoogleSignIn={handleGoogleSignIn}
        onCompleteOnboarding={handleCompleteOnboarding}
        onBackToLanding={() => setShowOnboarding(false)}
      />
    );
  }

  // Public Landing Page when user explicitly clicks Logout
  if (showLandingPage || !userProfile) {
    return (
      <div>
        {authError && (
          <div className="bg-rose-600 text-white px-6 py-2.5 text-xs text-center font-medium">
            {authError}
          </div>
        )}
        <LandingPage
          onGetStarted={() => {
            setShowLandingPage(false);
            setShowOnboarding(true);
          }}
          onSignIn={handleGoogleSignIn}
          onTryDemo={handleTryDemoFromLanding}
          isSigningIn={isSigningIn}
        />
      </div>
    );
  }

  const activeOwnerId = firebaseUser?.uid || PREVIEW_OWNER_ID;

  const activeInstitution: Institution =
    institutions.find((i) => i.id === userProfile.institutionId) || {
      id: userProfile.institutionId,
      ownerId: activeOwnerId,
      name: userProfile.institutionName || 'Institutional Workspace',
      type: 'University',
      country: 'United States',
      isDemo: userProfile.institutionId.startsWith('inst_demo_'),
      createdAt: userProfile.createdAt,
    };

  const unreadNotifications = notifications.filter((n) => !n.read);
  const pendingReviewCount = articles.filter(
    (a) => a.status === 'WAITING_FOR_HUMAN_APPROVAL'
  ).length;
  const openUnansweredCount = unansweredQuestions.filter((q) => q.status === 'OPEN').length;

  // 12 Functional Sidebar Navigation Items (Matching Reference Image)
  const sidebarItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'getting-started', label: 'Getting Started', icon: Rocket },
    { id: 'upload', label: 'Document Upload', icon: CloudUpload },
    { id: 'library', label: 'Knowledge Library', icon: BookOpen },
    { id: 'workflow', label: 'AI Agent Workflow', icon: Workflow },
    { id: 'assistant', label: 'Knowledge Assistant', icon: MessageSquare },
    {
      id: 'review',
      label: 'Human Review',
      icon: ShieldCheck,
      count: pendingReviewCount > 0 ? pendingReviewCount : undefined,
    },
    { id: 'lifecycle', label: 'Lifecycle Management', icon: RefreshCw },
    {
      id: 'unanswered',
      label: 'Unanswered Questions',
      icon: HelpCircle,
      count: openUnansweredCount > 0 ? openUnansweredCount : undefined,
    },
    { id: 'audit', label: 'Audit History', icon: History },
    { id: 'institution', label: 'Institution Management', icon: Building2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const hasDemoInList = institutions.some((i) => i.isDemo);

  const matchingSearchArticles = globalSearchQuery.trim()
    ? articles
        .filter(
          (a) =>
            a.title.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
            a.category.toLowerCase().includes(globalSearchQuery.toLowerCase())
        )
        .slice(0, 4)
    : [];

  const matchingSearchDocs = globalSearchQuery.trim()
    ? documents
        .filter(
          (d) =>
            d.title.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
            d.department.toLowerCase().includes(globalSearchQuery.toLowerCase())
        )
        .slice(0, 4)
    : [];

  const userInitials = (userProfile.fullName || 'Admin')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const shortRoleLabel =
    userProfile.role === 'Institution Administrator'
      ? 'Administrator'
      : userProfile.role;

  return (
    <div
      className={`min-h-screen flex transition-colors ${
        darkMode ? 'bg-[#0F172A] text-slate-100' : 'bg-[#EAF1FB] text-slate-900'
      }`}
    >
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Executive Deep Navy Sidebar (Matches Reference Image) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0B162C] text-slate-100 flex flex-col border-r border-[#172642] transition-all duration-200 lg:static ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${desktopSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Top EduKnowledge AI Emblem & Brand Header */}
        <div className="px-4 pt-5 pb-3.5 flex flex-col items-center text-center relative">
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div
            onClick={() => setActiveTab('dashboard')}
            className="cursor-pointer flex flex-col items-center group"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#029D97] to-[#017A75] flex items-center justify-center shadow-md border border-[#32C5BE]/30 mb-2 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            {!desktopSidebarCollapsed && (
              <>
                <div className="text-base font-extrabold tracking-tight text-white">
                  EduKnowledge AI
                </div>
                <div className="text-[11px] text-[#8DA6CE] font-medium mt-0.5">
                  Smart Knowledge. Better Learning
                </div>
              </>
            )}
          </div>
        </div>

        {/* Institution Selector Pill Box */}
        {!desktopSidebarCollapsed && (
          <div className="px-3.5 pb-3">
            <div className="relative flex items-center bg-[#12213D] border border-[#22365A] rounded-xl px-3 py-2 shadow-2xs">
              <Building2 className="w-4 h-4 text-[#029D97] shrink-0 mr-2" />
              <select
                value={activeInstitution.id}
                onChange={(e) => handleSwitchWorkspace(e.target.value)}
                aria-label="Current Institutional Workspace"
                className="w-full bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer truncate pr-2"
              >
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id} className="bg-[#0B162C] text-white">
                    {inst.name.replace(' — Sample Workspace', '')}
                  </option>
                ))}
                {!hasDemoInList && (
                  <option value="LOAD_DEMO_WORKSPACE" className="bg-[#0B162C] text-white">
                    + Demo University
                  </option>
                )}
              </select>
            </div>
          </div>
        )}

        {/* 12 Sidebar Navigation Links */}
        <nav className="flex-1 px-3 py-1.5 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileSidebarOpen(false);
                }}
                title={desktopSidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#029D97] text-white font-semibold shadow-sm'
                    : 'text-[#C2D1EA] hover:bg-[#142544] hover:text-white font-medium'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-[#89A5D2]'
                    }`}
                  />
                  {!desktopSidebarCollapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!desktopSidebarCollapsed && item.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md tabular-nums ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-[#029D97]/30 text-[#99F6E4]'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Profile Card, Dark Mode Switch & Crimson Logout Button */}
        <div className="p-3.5 border-t border-[#172642] space-y-2.5">
          {/* User Profile Box */}
          <div className="bg-[#12213D] border border-[#213558] rounded-xl p-2.5 flex items-center gap-2.5">
            {firebaseUser?.photoURL ? (
              <img
                src={firebaseUser.photoURL}
                alt={userProfile.fullName}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover border border-[#029D97]/50 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#029D97] to-[#017570] text-white text-xs font-bold flex items-center justify-center shrink-0 border border-[#32C5BE]/30">
                {userInitials}
              </div>
            )}
            {!desktopSidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">
                  {userProfile.fullName}
                </div>
                <div className="text-[11px] text-[#8DA6CE] truncate">
                  {shortRoleLabel}
                </div>
              </div>
            )}
          </div>

          {/* Dark Mode Row */}
          {!desktopSidebarCollapsed && (
            <div className="flex items-center justify-between px-2 py-1 text-xs text-[#C2D1EA]">
              <div className="flex items-center gap-2">
                <Moon className="w-3.5 h-3.5 text-[#89A5D2]" />
                <span className="font-medium">Dark Mode</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={darkMode}
                onClick={() => setDarkMode(!darkMode)}
                className={`w-9 h-5 rounded-full transition-colors p-0.5 cursor-pointer flex items-center ${
                  darkMode ? 'bg-[#029D97] justify-end' : 'bg-[#253B63] justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </button>
            </div>
          )}

          {/* Crimson Logout Button */}
          <button
            onClick={() => {
              if (firebaseUser) {
                signOut(auth);
              }
              setShowLandingPage(true);
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-[#6B1D27] hover:bg-[#82222E] border border-[#8C2B37] text-xs font-semibold text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
          >
            <LogOut className="w-4 h-4" />
            {!desktopSidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar (Matches Reference Image: Collapse Toggle + Search Bar on Left, Bell + Help + Institution Switcher on Right) */}
        <header className="bg-white border-b border-slate-200/80 px-4 lg:px-7 py-3 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDesktopSidebarCollapsed(!desktopSidebarCollapsed)}
              className="hidden lg:flex p-2 rounded-xl border border-slate-200/90 text-slate-600 hover:bg-slate-100 cursor-pointer"
              title="Toggle sidebar width"
            >
              <PanelLeft className="w-4 h-4" />
            </button>

            {/* Global Search Input */}
            <div className="relative flex-1">
              <div className="flex items-center bg-[#F3F6FB] border border-slate-200/90 rounded-xl px-3.5 py-2 focus-within:bg-white focus-within:border-blue-500 transition-all">
                <input
                  type="text"
                  value={globalSearchQuery}
                  onFocus={() => setShowSearchDropdown(true)}
                  onBlur={() => setTimeout(() => setShowSearchDropdown(false), 180)}
                  onChange={(e) => {
                    setGlobalSearchQuery(e.target.value);
                    setShowSearchDropdown(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && globalSearchQuery.trim()) {
                      setActiveTab('library');
                      setShowSearchDropdown(false);
                    }
                  }}
                  placeholder="Search knowledge, documents..."
                  className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
                <Search className="w-4 h-4 text-slate-500 shrink-0 ml-2" />
              </div>

              {/* Instant Search Results Popover */}
              {showSearchDropdown && globalSearchQuery.trim().length > 0 && (
                <div className="absolute left-0 right-0 top-11 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 z-50 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase px-2">
                    Matching Knowledge Articles &amp; Documents
                  </div>
                  {matchingSearchArticles.length === 0 && matchingSearchDocs.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-slate-500">
                      No matching records for &ldquo;{globalSearchQuery}&rdquo;. Ask the Knowledge Assistant instead!
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {matchingSearchArticles.map((art) => (
                        <button
                          key={art.id}
                          onMouseDown={() => {
                            setSelectedLibraryArticleId(art.id);
                            setActiveTab('library');
                            setShowSearchDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-blue-50 flex items-center justify-between text-xs cursor-pointer"
                        >
                          <span className="font-semibold text-slate-800 truncate">
                            {art.title}
                          </span>
                          <span className="text-[11px] text-blue-600 font-medium shrink-0 ml-2">
                            Article · {art.category}
                          </span>
                        </button>
                      ))}
                      {matchingSearchDocs.map((docItem) => (
                        <button
                          key={docItem.id}
                          onMouseDown={() => {
                            setActiveTab('upload');
                            setShowSearchDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 flex items-center justify-between text-xs cursor-pointer"
                        >
                          <span className="font-medium text-slate-700 truncate">
                            {docItem.title}
                          </span>
                          <span className="text-[11px] text-slate-500 shrink-0 ml-2">
                            Document · {docItem.department}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Top Bar Right Controls: Notification Bell with Badge, Help Button, Institution Selector */}
          <div className="flex items-center gap-2.5 shrink-0 relative">
            {/* Notification Bell with Red Unread Count Badge */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl bg-[#F3F6FB] hover:bg-slate-200/70 text-slate-700 border border-slate-200/80 cursor-pointer transition-colors"
              aria-label="Workspace Notifications"
            >
              <Bell className="w-4 h-4 text-slate-700" />
              {unreadNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow-2xs">
                  {unreadNotifications.length}
                </span>
              )}
            </button>

            {/* Help Pill Button */}
            <button
              onClick={() => setActiveTab('getting-started')}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-[#F3F6FB] hover:bg-slate-200/70 border border-slate-200/80 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Help</span>
            </button>

            {/* Top-Right Institution Switcher Pill */}
            <div className="hidden md:flex items-center bg-[#F3F6FB] border border-slate-200/80 rounded-xl px-3 py-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-700 mr-1.5 shrink-0" />
              <select
                value={activeInstitution.id}
                onChange={(e) => handleSwitchWorkspace(e.target.value)}
                aria-label="Switch Workspace"
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name.replace(' — Sample Workspace', '')}
                  </option>
                ))}
                {!hasDemoInList && (
                  <option value="LOAD_DEMO_WORKSPACE">+ Demo University</option>
                )}
              </select>
            </div>

            {/* Notifications Popover */}
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-50 space-y-2.5 text-slate-900">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-900">
                    Workspace Notifications ({unreadNotifications.length} unread)
                  </span>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">
                    No notifications yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notifications
                      .slice()
                      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                      .slice(0, 8)
                      .map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationRead(n.id)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer ${
                            n.read
                              ? 'bg-slate-50 border-slate-100 text-slate-500'
                              : 'bg-blue-50/60 border-blue-200 text-slate-800'
                          }`}
                        >
                          <div className="font-semibold">{n.title}</div>
                          <div className="mt-0.5">{n.message}</div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Active View Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-[1440px] w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              userProfile={userProfile}
              institution={activeInstitution}
              departments={departments}
              documents={documents}
              articles={articles}
              reviewTasks={reviewTasks}
              workflowRuns={workflowRuns}
              workflowStages={workflowStages}
              lifecycleProposals={lifecycleProposals}
              unansweredQuestions={unansweredQuestions}
              chatMessages={chatMessages}
              auditLogs={auditLogs}
              onNavigate={(tab) => setActiveTab(tab as NavTab)}
              onSwitchToDemoWorkspace={() => handleSwitchWorkspace('LOAD_DEMO_WORKSPACE')}
              isSwitchingDemo={isSwitchingDemo}
            />
          )}

          {activeTab === 'getting-started' && (
            <GettingStartedView
              institution={activeInstitution}
              documents={documents}
              workflowRuns={workflowRuns}
              articles={articles}
              chatMessages={chatMessages}
              onNavigate={(tab) => setActiveTab(tab as NavTab)}
              onSwitchToDemoWorkspace={() => handleSwitchWorkspace('LOAD_DEMO_WORKSPACE')}
              isSwitchingDemo={isSwitchingDemo}
            />
          )}

          {activeTab === 'assistant' && (
            <KnowledgeAssistantView
              ownerId={activeOwnerId}
              userId={activeOwnerId}
              userRole={userProfile.role}
              institution={activeInstitution}
              approvedChunks={chunks}
              publishedArticles={articles}
              conversations={conversations}
              chatMessages={chatMessages}
              onSelectArticle={(articleId) => {
                setSelectedLibraryArticleId(articleId);
                setActiveTab('library');
              }}
            />
          )}

          {activeTab === 'upload' && (
            <DocumentUploadView
              ownerId={activeOwnerId}
              userName={userProfile.fullName}
              institution={activeInstitution}
              departments={departments}
              documents={documents}
              onRunPipelineForDocument={handleRunPipelineForDocument}
            />
          )}

          {activeTab === 'library' && (
            <KnowledgeLibraryView
              userRole={userProfile.role}
              departments={departments}
              articles={articles}
              articleVersions={articleVersions}
              documents={documents}
              selectedArticleId={selectedLibraryArticleId}
              onSelectArticleId={setSelectedLibraryArticleId}
            />
          )}

          {activeTab === 'workflow' && (
            <WorkflowMonitorView
              isAuthenticated={true}
              documents={documents}
              workflowRuns={workflowRuns}
              workflowStages={workflowStages}
              isRunningPipeline={isRunningPipeline}
              onStartPipeline={handleRunPipelineForDocument}
              onCreateTestCorruptedDoc={handleCreateTestCorruptedDoc}
              onNavigateToUpload={() => setActiveTab('upload')}
              onNavigateToReview={(articleId) => {
                setSelectedReviewArticleId(articleId);
                setActiveTab('review');
              }}
            />
          )}

          {activeTab === 'review' && (
            <HumanReviewView
              ownerId={activeOwnerId}
              reviewerName={userProfile.fullName}
              institution={activeInstitution}
              articles={articles}
              documents={documents}
              reviewTasks={reviewTasks}
              initialArticleId={selectedReviewArticleId}
            />
          )}

          {activeTab === 'lifecycle' && (
            <LifecycleManagementView
              ownerId={activeOwnerId}
              reviewerName={userProfile.fullName}
              institution={activeInstitution}
              documents={documents}
              documentVersions={documentVersions}
              articles={articles}
              lifecycleProposals={lifecycleProposals}
            />
          )}

          {activeTab === 'unanswered' && (
            <UnansweredQuestionsView
              unansweredQuestions={unansweredQuestions}
              onNavigateToUpload={() => setActiveTab('upload')}
            />
          )}

          {activeTab === 'audit' && <AuditHistoryView auditLogs={auditLogs} />}

          {activeTab === 'institution' && (
            <UserManagementView
              ownerId={activeOwnerId}
              userProfile={userProfile}
              institution={activeInstitution}
              departments={departments}
              memberships={memberships}
              onRoleChanged={(newRole) =>
                setUserProfile({ ...userProfile, role: newRole })
              }
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              ownerId={activeOwnerId}
              institution={activeInstitution}
              departments={departments}
              onSwitchToDemoWorkspace={() => handleSwitchWorkspace('LOAD_DEMO_WORKSPACE')}
            />
          )}
        </main>
      </div>
    </div>
  );
}
