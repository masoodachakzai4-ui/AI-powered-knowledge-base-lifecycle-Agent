import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Play,
  Sparkles,
  Upload,
} from 'lucide-react';
import { DEMO_DISCLAIMER } from '../data/demoSeed';
import { extractUploadedFileViaServer } from '../services/apiService';
import { saveUploadedDocument } from '../services/firestoreService';
import {
  AccessLevel,
  DEFAULT_CATEGORIES,
  Department,
  DocumentRecord,
  Institution,
} from '../types/domain';
import { PageHeroBanner } from './PageHeroBanner';

interface DocumentUploadViewProps {
  ownerId: string;
  userName: string;
  institution: Institution;
  departments: Department[];
  documents: DocumentRecord[];
  onRunPipelineForDocument: (docRecord: DocumentRecord) => Promise<void>;
}

const SAMPLE_TEMPLATES = [
  {
    title: '[SAMPLE] Undergraduate Admission Policy 2026–2027 (Updated Deadline)',
    department: 'Admissions',
    category: 'Admission Policies',
    effectiveDate: '2026-09-01',
    reviewDate: '2027-05-15',
    content: `${DEMO_DISCLAIMER}

DOCUMENT TITLE: Undergraduate Admission Policy 2026–2027
EFFECTIVE DATE: 2026-09-01
REVIEW DATE: 2027-05-15
DEPARTMENT: Admissions

SECTION 1: ELIGIBILITY REQUIREMENTS
1.1 Candidates applying for undergraduate admission must complete 12 years of Higher Secondary Education with a minimum aggregate of 75% (or 3.0 CGPA).
1.2 Computer Science and Engineering applicants must achieve at least 78% in Mathematics and Physics.
1.3 International students require IELTS Academic 6.5 or TOEFL iBT 88.

SECTION 2: REQUIRED ADMISSION DOCUMENTS
- Attested High School Transcripts and Certificate
- Valid National Identity Card or Passport copy
- Two recent passport-size photographs
- Statement of Purpose (300–500 words)
- Non-refundable $60 USD Application Processing Fee receipt

SECTION 3: APPLICATION DEADLINE & ENTRANCE TEST
- Fall Priority Application Deadline: July 15, 2026
- Institutional Aptitude Test: July 28, 2026
- Final Merit List Announcement: August 10, 2026

SECTION 4: CONTACT INFORMATION
Office of Admissions, Room 104, Central Administration Building. Email: admissions-sample@demo-university.edu`,
  },
  {
    title: '[SAMPLE] Central Library & Hostel Governance Rules 2026',
    department: 'Library',
    category: 'Library Rules',
    effectiveDate: '2026-09-01',
    reviewDate: '2027-06-30',
    content: `${DEMO_DISCLAIMER}

DOCUMENT TITLE: Central Library & Hostel Governance Rules 2026
EFFECTIVE DATE: 2026-09-01
DEPARTMENT: Library & Student Residence

SECTION 1: LIBRARY TIMINGS & BORROWING RULES
1.1 Regular Opening Hours: Monday–Saturday 08:00 AM – 10:00 PM; Sunday 10:00 AM – 06:00 PM.
1.2 Exam Week Extended Hours: 07:30 AM – 12:00 Midnight daily.
1.3 Borrowing Quota: Undergraduate students may borrow up to 4 books for 14 days. Faculty may borrow up to 10 books for 30 days.
1.4 Overdue Fine: $0.50 USD per book per overdue day.

SECTION 2: HOSTEL APPLICATION PROCEDURE
2.1 Submit the Online Hostel Application Form via the Student Affairs Portal by August 20, 2026.
2.2 Required attachments: Medical Fitness Certificate and two emergency guardian contacts.
2.3 Hostel Fee: $950 USD per semester (shared twin room) or $1,350 USD (single occupancy).`,
  },
];

export const DocumentUploadView: React.FC<DocumentUploadViewProps> = ({
  ownerId,
  userName,
  institution,
  departments,
  documents,
  onRunPipelineForDocument,
}) => {
  const [title, setTitle] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<string>('application/pdf');
  const [fileSize, setFileSize] = useState<number>(0);
  const [department, setDepartment] = useState<string>(departments[0]?.name || 'Admissions');
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>('2026-09-01');
  const [expiryDate, setExpiryDate] = useState<string>('2027-08-31');
  const [reviewDate, setReviewDate] = useState<string>('2027-05-15');
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('PUBLIC_STUDENT');
  const [extractedText, setExtractedText] = useState<string>('');
  const [requiresOcr, setRequiresOcr] = useState<boolean>(false);
  const [isSampleData, setIsSampleData] = useState<boolean>(institution.isDemo);
  const [updateExistingDocId, setUpdateExistingDocId] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError('File size exceeds the 15 MB institutional limit.');
      return;
    }

    setError('');
    setStatusMessage('');
    setFileName(file.name);
    setFileType(file.type || 'application/octet-stream');
    setFileSize(file.size);
    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
    }

    setIsExtracting(true);
    try {
      const result = await extractUploadedFileViaServer(file);
      setExtractedText(result.extractedText);
      setRequiresOcr(result.requiresOcr);
      if (result.requiresOcr) {
        setStatusMessage(
          'Notice: This PDF appears to be a scanned image without extractable text. It has been flagged as requiring OCR.'
        );
      } else {
        setStatusMessage(
          `Extracted ${result.extractedText.length.toLocaleString()} characters (${result.detectedLanguage}). Ready for AI processing.`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract text from file.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleLoadSampleTemplate = (tpl: (typeof SAMPLE_TEMPLATES)[0]) => {
    setTitle(tpl.title);
    setFileName(`${tpl.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.pdf`);
    setFileType('application/pdf');
    setFileSize(tpl.content.length * 12);
    setDepartment(tpl.department);
    setCategory(tpl.category);
    setEffectiveDate(tpl.effectiveDate);
    setReviewDate(tpl.reviewDate);
    setExtractedText(tpl.content);
    setRequiresOcr(false);
    setIsSampleData(true);
    setStatusMessage('Loaded synthetic sample policy template (marked SAMPLE DEMO DATA).');
  };

  const handleSaveDocument = async (runPipelineImmediately: boolean) => {
    if (!title.trim()) {
      setError('Please enter a Document Title.');
      return;
    }
    if (!extractedText.trim() && !requiresOcr) {
      setError('Please upload a file, load a sample template, or provide document text.');
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      const finalCategory = customCategory.trim() ? customCategory.trim() : category;
      const existingDoc = updateExistingDocId
        ? documents.find((d) => d.id === updateExistingDocId)
        : undefined;

      const { document: savedDoc } = await saveUploadedDocument({
        ownerId,
        institutionId: institution.id,
        title: title.trim(),
        fileName: fileName || `${title.trim().replace(/\s+/g, '_')}.txt`,
        fileType,
        fileSize: fileSize || extractedText.length,
        department,
        category: finalCategory,
        effectiveDate,
        expiryDate,
        reviewDate,
        accessLevel,
        extractedText,
        requiresOcr,
        uploadedBy: userName,
        isSampleData,
        existingDocumentToUpdate: existingDoc,
      });

      setStatusMessage(`Saved "${savedDoc.title}" (Version ${savedDoc.version}.0) to Firestore.`);

      if (runPipelineImmediately && !requiresOcr) {
        await onRunPipelineForDocument(savedDoc);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save document.');
    } finally {
      setIsSaving(false);
    }
  };

  const readyDocsCount = documents.filter((d) => d.status !== 'OCR_REQUIRED').length;
  const ocrDocsCount = documents.filter((d) => d.status === 'OCR_REQUIRED').length;

  return (
    <div className="space-y-5">
      <PageHeroBanner
        eyebrow={`Institutional Document Intake · ${institution.name.replace(' — Sample Workspace', '')}`}
        titlePrefix="Upload & Manage"
        titleHighlight="Educational Documents"
        subtitle="Upload official PDF, Word DOCX, TXT, or CSV policies and launch the 4-stage AI knowledge pipeline."
        actions={SAMPLE_TEMPLATES.map((tpl) => ({
          label: `Load ${tpl.category} Sample`,
          onClick: () => handleLoadSampleTemplate(tpl),
          variant: 'outline-white' as const,
          icon: FileText,
        }))}
        kpiCards={[
          {
            label: 'Total Documents',
            value: documents.length,
            badge: `+${documents.length}`,
            icon: FileText,
            color: 'blue',
          },
          {
            label: 'Ready for AI Pipeline',
            value: readyDocsCount,
            badge: `+${readyDocsCount}`,
            icon: CheckCircle2,
            color: 'green',
          },
          {
            label: 'Active Departments',
            value: departments.length,
            badge: `+${departments.length}`,
            icon: Sparkles,
            color: 'purple',
          },
          {
            label: 'Requires OCR Flag',
            value: ocrDocsCount,
            badge: `+${ocrDocsCount}`,
            icon: AlertTriangle,
            color: 'orange',
          },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Document Upload & Metadata Form */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="bg-[#101F3C] text-white px-6 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Upload className="w-4 h-4 text-[#609BFF]" />
              <h2 className="text-sm font-bold tracking-wide">
                Institutional Document Upload &amp; Intake
              </h2>
            </div>
            <span className="text-[11px] text-blue-200 font-medium">
              Stage 01–04 Ready
            </span>
          </div>

          <div className="p-6 space-y-5">
            <p className="text-xs text-slate-600">
              Upload PDF, DOCX, TXT, or CSV policies. Server-side extraction identifies scanned PDFs requiring OCR and prepares text for Stage 01–04 AI processing.
            </p>

            {/* Quick Sample Loaders */}
            <div className="p-3.5 rounded-xl bg-[#E4F7F6] border border-[#96E0DC]">
              <div className="text-xs font-bold text-[#015E5A] mb-2">
                Quick Test: Load Synthetic Sample Educational Document
              </div>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_TEMPLATES.map((tpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLoadSampleTemplate(tpl)}
                    className="px-3 py-1.5 text-xs font-semibold text-[#029D97] bg-white border border-[#74D2CD] hover:bg-[#E4F7F6] rounded-xl transition-colors cursor-pointer shadow-2xs"
                  >
                    Load {tpl.category} Sample
                  </button>
                ))}
              </div>
            </div>

          {error && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
              {error}
            </div>
          )}

          {statusMessage && (
            <div
              className={`p-3.5 rounded-lg border text-xs ${
                requiresOcr
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              {statusMessage}
            </div>
          )}

          {/* File Picker */}
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center hover:border-sky-600 transition-colors">
            <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2" />
            <label className="text-xs font-semibold text-sky-700 hover:underline cursor-pointer">
              <span>Select PDF, DOCX, TXT, or CSV file</span>
              <input
                type="file"
                accept=".pdf,.docx,.txt,.csv,.md"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <p className="text-xs text-slate-500 mt-1">
              {isExtracting
                ? 'Extracting text on server...'
                : fileName
                  ? `Selected: ${fileName} (${(fileSize / 1024).toFixed(1)} KB)`
                  : 'Maximum file size: 15 MB · Metadata and chunks stored in Cloud Firestore'}
            </p>
          </div>

          {/* Version Control Option: New Document vs Update Existing */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Version Control Mode
            </label>
            <select
              value={updateExistingDocId}
              onChange={(e) => {
                const id = e.target.value;
                setUpdateExistingDocId(id);
                const found = documents.find((d) => d.id === id);
                if (found) {
                  setTitle(found.title);
                  setDepartment(found.department);
                  setCategory(found.category);
                }
              }}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
            >
              <option value="">Create New Institutional Document (Version 1.0)</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  Upload New Version for: {d.title} (Current v{d.version}.0 → v{d.version + 1}.0)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Document Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., University Admission Policy 2026"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Department *</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              >
                {DEFAULT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Custom Category (Optional Override)
              </label>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Or enter a custom category..."
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Role Access Permission *
              </label>
              <select
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value as AccessLevel)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              >
                <option value="PUBLIC_STUDENT">Public &amp; Student Authorized</option>
                <option value="FACULTY_STAFF">Faculty &amp; Staff Only</option>
                <option value="ADMIN_GOVERNANCE">Administrators &amp; Reviewers Only</option>
                <option value="PARENT_GUARDIAN">Students, Parents &amp; Guardians</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Effective Date
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Review / Expiry Date
              </label>
              <input
                type="date"
                value={reviewDate}
                onChange={(e) => {
                  setReviewDate(e.target.value);
                  setExpiryDate(e.target.value);
                }}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Extracted Document Text (Editable / Paste Policy Content) *
              </label>
              <button
                type="button"
                onClick={() => {
                  setExtractedText('');
                  setRequiresOcr(true);
                  setStatusMessage(
                    'Simulated scanned PDF without extractable text: Document marked as OCR_REQUIRED.'
                  );
                }}
                className="text-xs text-amber-700 hover:underline cursor-pointer"
              >
                Test Scanned PDF (Requires OCR Flag)
              </button>
            </div>
            <textarea
              rows={9}
              value={extractedText}
              onChange={(e) => {
                setExtractedText(e.target.value);
                if (e.target.value.trim().length > 25) setRequiresOcr(false);
              }}
              placeholder="Upload a PDF/DOCX/TXT file above or paste institutional policy text here..."
              className="w-full px-3.5 py-2.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => handleSaveDocument(false)}
              disabled={isSaving || isExtracting}
              className="px-4 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer disabled:opacity-50"
            >
              Save Metadata Only
            </button>
            <button
              type="button"
              onClick={() => handleSaveDocument(true)}
              disabled={isSaving || isExtracting || requiresOcr}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#029D97] hover:bg-[#02847F] rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isSaving ? 'Starting Pipeline...' : 'Save & Run 4-Agent AI Pipeline'}</span>
            </button>
          </div>
          </div>
        </div>

        {/* Right Column: Existing Uploaded Documents & Storage Note */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="bg-[#101F3C] text-white px-5 py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#609BFF]" />
                <h3 className="text-xs font-bold tracking-wide">
                  Uploaded Institutional Documents ({documents.length})
                </h3>
              </div>
            </div>
            <div className="p-5">
            <p className="text-xs text-slate-500 mb-4">
              Click &quot;Run 4 AI Agents&quot; on any uploaded document to start a new 5-stage workflow run
            </p>

            {documents.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No documents uploaded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto pr-1">
                {documents.map((docItem) => (
                  <div key={docItem.id} className="py-3.5 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{docItem.title}</div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>{docItem.department}</span>
                          <span aria-hidden="true">·</span>
                          <span>{docItem.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">v{docItem.version}.0</span>
                          <span aria-hidden="true">·</span>
                          <span>{docItem.accessLevel}</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-semibold text-slate-700 shrink-0">
                        {docItem.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-400 font-mono">
                        Effective: {docItem.effectiveDate || 'N/A'}
                      </span>
                      {docItem.status !== 'OCR_REQUIRED' ? (
                        <button
                          onClick={() => onRunPipelineForDocument(docItem)}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#029D97] hover:bg-[#02847F] rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Run 4 AI Agents</span>
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-amber-800">
                          Requires OCR before AI processing
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-600 space-y-1.5">
            <div className="font-semibold text-slate-900">
              Document Persistence &amp; Cloud Storage Note
            </div>
            <p>
              Extracted document text, version snapshots (`document_versions`), and semantic chunks (`knowledge_chunks`) are persisted directly in your connected Cloud Firestore database (`{institution.id}`).
            </p>
            <p>
              To also store raw binary PDFs in Cloud Storage for Firebase (`storage.rules` included), ensure the Blaze plan and default Storage bucket are enabled in your Firebase Console.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
