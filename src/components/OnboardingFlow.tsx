import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  GraduationCap,
  Plus,
  Shield,
  Sparkles,
  Trash2,
  UserCheck,
} from 'lucide-react';
import {
  DEFAULT_DEPARTMENTS,
  INSTITUTION_TERMINOLOGY,
  InstitutionType,
  UserRole,
} from '../types/domain';

interface OnboardingFlowProps {
  currentUser: {
    uid: string;
    email: string | null;
    displayName: string | null;
  } | null;
  onGoogleSignIn: () => Promise<void>;
  onCompleteOnboarding: (data: {
    fullName: string;
    institutionName: string;
    institutionType: InstitutionType;
    primaryDepartment: string;
    country: string;
    website: string;
    departments: string[];
    role: UserRole;
    loadDemoSample: boolean;
  }) => Promise<void>;
  onBackToLanding: () => void;
}

const ROLES: Array<{ role: UserRole; description: string; permissions: string }> = [
  {
    role: 'Institution Administrator',
    description: 'Full control over institutional workspace, departments, users, documents, and governance.',
    permissions: 'Manage workspace, departments, users, upload/process documents, approve articles, manage lifecycle.',
  },
  {
    role: 'Platform Administrator',
    description: 'Platform-wide configuration and multi-institution oversight.',
    permissions: 'All institutional and platform-level administrative permissions.',
  },
  {
    role: 'Knowledge Manager',
    description: 'Uploads policy documents, runs the 4 AI agents, and monitors lifecycle proposals.',
    permissions: 'Upload documents, trigger AI workflow runs, create lifecycle proposals, view library.',
  },
  {
    role: 'Human Reviewer',
    description: 'Stage 05 governance specialist who audits verification reports and approves/rejects drafts.',
    permissions: 'Inspect drafts, verification reports, and source text; Approve, Reject, or Request Changes.',
  },
  {
    role: 'Teacher / Faculty Member',
    description: 'Searches academic and faculty policies, queries the Knowledge Assistant, and flags outdated info.',
    permissions: 'Access public + faculty knowledge articles, use Knowledge Assistant, report outdated policies.',
  },
  {
    role: 'Student',
    description: 'Searches approved student policies and asks institutional questions in the Knowledge Assistant.',
    permissions: 'Access approved student-level articles and query the RAG Knowledge Assistant.',
  },
  {
    role: 'Parent / Guardian',
    description: 'Views approved admission, fee, and student handbook policies authorized for guardians.',
    permissions: 'Access public student & parent-authorized knowledge articles and assistant.',
  },
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  currentUser,
  onGoogleSignIn,
  onCompleteOnboarding,
  onBackToLanding,
}) => {
  const [step, setStep] = useState<number>(currentUser ? 2 : 1);
  const [fullName, setFullName] = useState<string>(currentUser?.displayName || '');
  const [email, setEmail] = useState<string>(currentUser?.email || '');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [institutionName, setInstitutionName] = useState<string>('');
  const [institutionType, setInstitutionType] = useState<InstitutionType>('University');
  const [primaryDepartment, setPrimaryDepartment] = useState<string>('Admissions');
  const [country, setCountry] = useState<string>('United States');
  const [website, setWebsite] = useState<string>('');
  const [departments, setDepartments] = useState<string[]>([...DEFAULT_DEPARTMENTS]);
  const [newDeptName, setNewDeptName] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('Institution Administrator');
  const [loadDemoSample, setLoadDemoSample] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleStep1Auth = async () => {
    setError('');
    if (!currentUser) {
      try {
        setSubmitting(true);
        await onGoogleSignIn();
        setStep(2);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed. Please sign in with Google.');
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    setStep(2);
  };

  const handleAddDepartment = () => {
    const trimmed = newDeptName.trim();
    if (!trimmed) return;
    if (!departments.includes(trimmed)) {
      setDepartments([...departments, trimmed]);
    }
    setNewDeptName('');
  };

  const handleRemoveDepartment = (dept: string) => {
    if (departments.length <= 1) return;
    setDepartments(departments.filter((d) => d !== dept));
  };

  const handleFinish = async () => {
    if (!institutionName.trim() && !loadDemoSample) {
      setError('Please provide an institution name in Step 2.');
      setStep(2);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onCompleteOnboarding({
        fullName: fullName.trim() || currentUser?.displayName || 'Institutional Administrator',
        institutionName: loadDemoSample && !institutionName.trim()
          ? 'Demo University — Sample Workspace'
          : institutionName.trim(),
        institutionType,
        primaryDepartment: primaryDepartment.trim() || 'Admissions',
        country: country.trim() || 'United States',
        website: website.trim(),
        departments,
        role: selectedRole,
        loadDemoSample,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding setup.');
    } finally {
      setSubmitting(false);
    }
  };

  const terminology = INSTITUTION_TERMINOLOGY[institutionType];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 lg:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <GraduationCap className="w-6 h-6 text-sky-700" />
          <span className="text-base font-bold text-slate-900">
            EduLifecycle AI · Institutional Onboarding
          </span>
        </div>
        <button
          onClick={onBackToLanding}
          className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Landing Page</span>
        </button>
      </header>

      <div className="flex-1 max-w-4xl w-full mx-auto px-6 py-10">
        {/* 5-Step Progress Indicator */}
        <div className="grid grid-cols-5 gap-2 mb-8">
          {[
            { num: 1, label: '01. Account' },
            { num: 2, label: '02. Institution' },
            { num: 3, label: '03. Workspace' },
            { num: 4, label: '04. User Role' },
            { num: 5, label: '05. Guided Setup' },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                if (currentUser || s.num === 1) setStep(s.num);
              }}
              className={`py-2.5 px-3 rounded-lg text-left border transition-colors cursor-pointer ${
                step === s.num
                  ? 'bg-slate-900 text-white border-slate-900'
                  : step > s.num
                    ? 'bg-sky-50 text-sky-900 border-sky-200'
                    : 'bg-white text-slate-500 border-slate-200'
              }`}
            >
              <div className="text-xs font-semibold truncate">{s.label}</div>
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-6 lg:p-8">
          {/* STEP 1: CREATE ACCOUNT */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Step 1: Create Your Institutional Account</h2>
              <p className="text-sm text-slate-600 mb-6">
                Authenticate securely with Firebase Authentication to initialize your institutional knowledge workspace.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. Sarah Jenkins"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Institutional Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@university.edu"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Institution Name *</label>
                  <input
                    type="text"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    placeholder="e.g., Westbridge National University or Horizon STEM Academy"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Firebase Google Sign-In Verification
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {currentUser
                      ? `Signed in as ${currentUser.email} (${currentUser.displayName || 'Verified User'})`
                      : 'Click below to sign in with Google via Firebase Authentication and continue to Step 2.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleStep1Auth}
                  disabled={submitting}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {currentUser ? 'Continue to Step 2' : submitting ? 'Authenticating...' : 'Authenticate with Google & Continue'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: INSTITUTION SETUP */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Step 2: Institution Profile &amp; Type</h2>
              <p className="text-sm text-slate-600 mb-6">
                Select your institution type so categories, terminology, and governance defaults adapt to your academic model.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {(['Academy', 'School', 'College', 'University'] as InstitutionType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setInstitutionType(type)}
                    className={`p-4 rounded-lg border text-left transition-colors cursor-pointer ${
                      institutionType === type
                        ? 'bg-sky-50 border-sky-600 text-slate-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Building2 className="w-5 h-5 text-sky-700 mb-2" />
                    <div className="text-sm font-semibold">{type}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {INSTITUTION_TERMINOLOGY[type].unitLabel}
                    </div>
                  </button>
                ))}
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 mb-6 text-xs text-slate-600">
                <span className="font-semibold text-slate-900">Adapted Terminology ({institutionType}):</span>{' '}
                Learners: {terminology.learnerLabel} · Educators: {terminology.educatorLabel} · Units: {terminology.unitLabel}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Institution Name *</label>
                  <input
                    type="text"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    placeholder="e.g., Metropolitan University of Science"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Your Full Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Administrator Name"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Primary Department or Faculty *</label>
                  <input
                    type="text"
                    value={primaryDepartment}
                    onChange={(e) => setPrimaryDepartment(e.target.value)}
                    placeholder="e.g., Office of Admissions & Registrar"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Country *</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="United States"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Institution Website (Optional)</label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://www.university.edu"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!institutionName.trim()) {
                      setError('Please enter your Institution Name.');
                      return;
                    }
                    setError('');
                    setStep(3);
                  }}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue to Workspace Departments</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: WORKSPACE SETUP */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Step 3: Configure Institutional Departments</h2>
              <p className="text-sm text-slate-600 mb-6">
                Customize the departments and academic units that will own documents and knowledge articles in your workspace.
              </p>

              <div className="flex items-center gap-2 mb-6">
                <input
                  type="text"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDepartment()}
                  placeholder="Add custom department (e.g., Postgraduate Research, Career Services)..."
                  className="flex-1 px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                />
                <button
                  type="button"
                  onClick={handleAddDepartment}
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Department</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
                {departments.map((dept) => (
                  <div
                    key={dept}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50"
                  >
                    <span className="text-sm font-medium text-slate-800">{dept}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDepartment(dept)}
                      className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Remove department"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue to Role Assignment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: USER ROLE */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Step 4: Select Your Primary Institutional Role</h2>
              <p className="text-sm text-slate-600 mb-6">
                Role-based access control governs which documents, review queues, and administrative tools you can access. You can also test other roles later from User Management.
              </p>

              <div className="space-y-3 mb-6">
                {ROLES.map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => setSelectedRole(item.role)}
                    className={`w-full p-4 rounded-lg border text-left transition-colors cursor-pointer ${
                      selectedRole === item.role
                        ? 'bg-sky-50 border-sky-600'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-900">{item.role}</span>
                      <span className="text-xs font-mono text-sky-700">
                        {selectedRole === item.role ? 'Selected' : 'Select Role'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mb-1">{item.description}</p>
                    <p className="text-xs text-slate-500">Permissions: {item.permissions}</p>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue to Guided Setup</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: GUIDED SETUP CHECKLIST */}
          {step === 5 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Step 5: Institutional Readiness &amp; Guided Setup</h2>
              <p className="text-sm text-slate-600 mb-6">
                Review your institutional lifecycle checklist before entering your workspace dashboard.
              </p>

              <div className="space-y-2.5 mb-6">
                {[
                  { title: '1. Complete institution profile', done: Boolean(institutionName.trim()) },
                  { title: `2. Configure departments (${departments.length} departments configured)`, done: departments.length > 0 },
                  { title: '3. Upload institutional documents (PDF, DOCX, TXT, CSV)', done: false },
                  { title: '4. Process documents with the 4 sequential AI Agents', done: false },
                  { title: '5. Review generated knowledge & verification report in Stage 05', done: false },
                  { title: '6. Publish approved knowledge to the Knowledge Library', done: false },
                  { title: '7. Start answering student & faculty questions with Knowledge Assistant', done: false },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50"
                  >
                    <span className="text-sm font-medium text-slate-800">{item.title}</span>
                    <span className="text-xs font-mono text-slate-600">
                      {item.done ? 'Configured' : 'Next in Workspace'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-lg border border-teal-200 bg-teal-50/50 mb-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={loadDemoSample}
                    onChange={(e) => setLoadDemoSample(e.target.checked)}
                    className="mt-1 rounded border-slate-300"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      Also initialize &quot;Demo University — Sample Workspace&quot; (Optional)
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Keep your real institution workspace clean with zero synthetic statistics, or check this box if you want to immediately explore labelled sample policies (&quot;SAMPLE DEMO DATA — NOT OFFICIAL INSTITUTIONAL POLICY&quot;). You can switch between your real workspace and Demo University at any time.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={submitting}
                  className="px-6 py-3 text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{submitting ? 'Creating Workspace...' : 'Complete Setup & Enter Dashboard'}</span>
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
