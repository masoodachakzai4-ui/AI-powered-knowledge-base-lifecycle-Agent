EduKnowledge AI — AI-Powered Educational Knowledge Base Lifecycle Agent
EduKnowledge AI is an enterprise SaaS knowledge governance and lifecycle management platform built for Universities, Colleges, Schools, and Academies.
Instead of leaving institutional policies scattered across unverified PDFs, Word documents, and spreadsheets, EduKnowledge AI transforms raw policy files into structured, fact-checked, human-approved knowledge articles and powers a strictly grounded RAG Knowledge Assistant with full version control and lifecycle governance.
1. Key Capabilities
A. Multi-Format Institutional Document Intake
Supports PDF, DOCX, TXT, CSV, and Markdown policy documents.
Server-side text extraction with automatic detection of scanned/image-only PDFs (OCR_REQUIRED flag).
Built-in document version control (v1.0 → v2.0) that archives previous snapshots rather than overwriting them.
B. Sequential Five-Stage Workflow (Four AI Agents + Mandatory Human Reviewer)
01. Orchestrator Agent: Validates the uploaded document, checks institutional metadata, creates a unique workflow run ID, and builds the execution plan.
02. Knowledge Intake & Organizer Agent: Cleans extracted text, identifies the department and policy category, detects effective/expiry dates, and segments the document into semantic knowledge_chunks.
03. Knowledge Curator & Author Agent: Drafts a structured institutional knowledge article (AI-SUGGESTED / DRAFT) with an executive summary, clear policy sections, FAQs, and source citations.
04. Knowledge Verifier Agent: Audits every claim, date, percentage, and fee in the draft against the original source document.
Author ↔ Verifier Revision Loop (Max 2 Rounds): If unsupported claims are detected, the Verifier returns structured feedback to the Author Agent for automatic revision before human review.
05. Human Reviewer (Mandatory Governance Gate — Not an AI Agent): No article is ever published automatically. A human reviewer inspects the draft side-by-side with the original document and the Stage 04 Verification Report to Approve & Publish, Request Changes, Save as Pending, or Reject.
C. Strictly Grounded RAG Knowledge Assistant
Answers natural-language questions from students, faculty, and parents using only Human-Approved (PUBLISHED), non-retired knowledge articles permitted for the user's active role.
Every answer includes Verified Source Citations (Article Title, Original Document Title, Section, and Effective Date).
Automatically logs uncovered questions to the Unanswered Questions queue so administrators can identify and fill policy gaps.
D. Knowledge Lifecycle Management & Version Comparison
Continuously governs institutional knowledge with CREATE, KEEP, UPDATE, and RETIRE proposals.
Side-by-side policy version diff analyzer compares archived versions against new revisions while preserving full historical records.
E. Configurable Dual-Provider AI Routing & Quota Protection
Primary Provider: OpenRouter (OPENROUTER_API_KEY) with configurable model selection.
Optional Backup Provider: Google Gemini API (GEMINI_API_KEY) with automatic fallback and HTTP 429 daily-quota protection.
Server-Side Embedding Cache: Reuses previously computed embeddings to minimize API calls and latency.
F. Role-Based Access Control (RBAC) & Immutable Audit Ledger
Supports 7 institutional roles (Platform Administrator, Institution Administrator, Knowledge Manager, Human Reviewer, Teacher / Faculty Member, Student, Parent / Guardian).
Append-only Audit History tracks every human and AI agent action with timestamps, state transitions, and run IDs.
2. Technology Stack
Frontend: React 19, TypeScript, Tailwind CSS (#101F3C Deep Navy & #029D97 Teal Enterprise Theme), Lucide React Icons, Recharts
Backend: Node.js + Express (server.ts), Multer, pdf-parse, mammoth (DOCX extraction)
AI & RAG: OpenRouter API + Google @google/genai SDK (Gemini 2.5 Flash & Embeddings)
Database & Auth: Firebase Authentication & Cloud Firestore (firestore.rules zero-trust tenant isolation)
3. Application Modules (Sidebar Navigation)
Module	Purpose
Dashboard	Real-time institutional KPIs, department/category/lifecycle donut charts, recent activity feed, 5-step onboarding tracker, and 5-stage workflow overview.
Getting Started	Interactive 5-step institutional onboarding roadmap with live completion tracking.
Document Upload	Upload PDF/DOCX/TXT/CSV files, load synthetic sample templates, or upload new versions of existing documents.
Knowledge Library	Searchable, role-filtered repository of governed articles with version history and source document excerpts.
AI Agent Workflow	Pre-flight validation checklist, explicit START KNOWLEDGE PROCESSING trigger, 5-stage visual stepper, Stage Detail Inspector, and Live Execution Queue.
Knowledge Assistant	RAG chat interface with suggested institutional prompts, source citations, user feedback controls, and automatic unanswered-question logging.
Human Review	Side-by-side inspection of AI drafts, original policy text, Stage 04 accuracy audit, and 4 governance decision actions.
Lifecycle Management	Manage CREATE, KEEP, UPDATE, and RETIRE proposals, run side-by-side version diffs, and monitor policy expiration dates.
Unanswered Questions	Tracks questions where no approved policy coverage exists and links directly to document upload or resolution logging.
Audit History	Immutable compliance log of all human and AI agent operations.
Institution Management	Live RBAC role simulator and workspace member management.
Settings	Backend AI provider/model routing configuration, quota reset controls, institution terminology adaptation, and department management.
4. Firestore Database Collections
users — User profiles and active RBAC roles
institutions — University, College, School, or Academy workspaces
workspace_memberships — Role assignments per institution
departments — Academic and administrative departments
documents — Uploaded policy metadata and extracted text
document_versions — Archived historical snapshots of documents
knowledge_chunks — Semantic chunks and embeddings for RAG retrieval
knowledge_articles — AI-drafted and human-approved knowledge articles
article_versions — Version history of knowledge articles
workflow_runs — 5-stage pipeline execution state and stage telemetry
review_tasks — Stage 05 human review queue items
lifecycle_proposals — CREATE, KEEP, UPDATE, and RETIRE governance proposals
conversations & chat_messages — RAG Knowledge Assistant threads and citations
unanswered_questions — Automatically detected knowledge gaps
audit_logs — Append-only compliance and governance ledger
notifications — Workspace alerts for completed runs and pending reviews
5. Environment Variables & Local Setup
Environment Variables (.env)
Env
# Primary AI Provider (OpenRouter)
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openrouter/free

# Optional Backup AI Provider (Google Gemini)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

# Provider Priority ('openrouter' or 'gemini')
AI_PRIMARY_PROVIDER=openrouter
AI_BACKUP_PROVIDER=gemini
Commands
Bash
# Install dependencies
npm install

# Start the full-stack server on Port 3000
npm run dev

# Build for production
npm run build
