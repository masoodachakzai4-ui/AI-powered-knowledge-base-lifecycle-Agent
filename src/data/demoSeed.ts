import {
  AuditLog,
  DocumentRecord,
  DocumentVersion,
  KnowledgeArticle,
  KnowledgeChunk,
  LifecycleProposal,
  NotificationItem,
  ReviewTask,
  UnansweredQuestion,
  VerificationReport,
  WorkflowRun,
  WorkflowStage,
} from '../types/domain';

export const DEMO_DISCLAIMER = 'SYNTHETIC DEMO DATA — NOT OFFICIAL INSTITUTIONAL POLICY.';

export function buildDemoSeedData(ownerId: string, institutionId: string, reviewerName: string) {
  const now = new Date().toISOString();
  const docAdmId = `demo_doc_adm_${institutionId}`;
  const docFeeId = `demo_doc_fee_${institutionId}`;
  const docSchId = `demo_doc_sch_${institutionId}`;
  const docCalId = `demo_doc_cal_${institutionId}`;
  const docLibId = `demo_doc_lib_${institutionId}`;

  const documents: DocumentRecord[] = [
    {
      id: docAdmId,
      ownerId,
      institutionId,
      title: '[SAMPLE] Demo University Undergraduate Admission Policy 2026–2027',
      fileName: 'Sample_Admission_Policy_2026_v2.pdf',
      fileType: 'application/pdf',
      fileSize: 184320,
      department: 'Admissions',
      category: 'Admission Policies',
      language: 'English',
      effectiveDate: '2026-09-01',
      expiryDate: '2027-08-31',
      reviewDate: '2027-05-15',
      version: 2,
      status: 'PROCESSED',
      accessLevel: 'PUBLIC_STUDENT',
      isSampleData: true,
      uploadedBy: reviewerName,
      createdAt: now,
      updatedAt: now,
      extractedText: `${DEMO_DISCLAIMER}

DOCUMENT TITLE: Demo University Undergraduate Admission Policy 2026–2027 (Version 2.0)
EFFECTIVE DATE: 2026-09-01
REVIEW DATE: 2027-05-15
ISSUING DEPARTMENT: Office of Undergraduate Admissions

SECTION 1: ELIGIBILITY CRITERIA
1.1 Applicants for Bachelor programmes must hold a High School Equivalency Certificate (12 years of formal schooling) with a minimum cumulative score of 75% (revised from 70% in Version 1.0) or a minimum GPA of 3.0 on a 4.0 scale.
1.2 Engineering and Computer Science applicants must demonstrate at least 78% in Mathematics and Physics.
1.3 International applicants whose primary medium of instruction was not English must submit an IELTS Academic score of 6.5 overall (no band below 6.0) or TOEFL iBT 88.

SECTION 2: REQUIRED DOCUMENTS
2.1 Official High School Transcripts and Graduation Certificate (attested copies).
2.2 National Identity Card or valid Passport copy.
2.3 Two recent passport-sized photographs with white background.
2.4 Statement of Purpose (300 to 500 words).
2.5 Non-refundable Application Processing Fee receipt of $60 USD.

SECTION 3: APPLICATION PROCEDURE & DEADLINES
3.1 All applications must be submitted online via the Demo University Admissions Portal.
3.2 Fall Semester Priority Application Deadline: July 15, 2026 (extended from June 30, 2026 in Version 1.0).
3.3 Entrance Aptitude Assessment Date: July 28, 2026.
3.4 Final Merit List Publication: August 10, 2026.

SECTION 4: CONTACT DEPARTMENT
Office of Undergraduate Admissions, Room 104, Central Administration Building.
Email: admissions-sample@demo-university.edu | Hours: Monday–Friday, 08:30 AM – 04:30 PM.`,
    },
    {
      id: docFeeId,
      ownerId,
      institutionId,
      title: '[SAMPLE] Institutional Tuition & Semester Fee Structure 2026–2027',
      fileName: 'Sample_Fee_Policy_2026.pdf',
      fileType: 'application/pdf',
      fileSize: 142600,
      department: 'Finance',
      category: 'Fee Structures',
      language: 'English',
      effectiveDate: '2026-09-01',
      expiryDate: '2027-08-31',
      reviewDate: '2027-06-01',
      version: 1,
      status: 'PROCESSED',
      accessLevel: 'PUBLIC_STUDENT',
      isSampleData: true,
      uploadedBy: reviewerName,
      createdAt: now,
      updatedAt: now,
      extractedText: `${DEMO_DISCLAIMER}

DOCUMENT TITLE: Institutional Tuition & Semester Fee Structure 2026–2027
EFFECTIVE DATE: 2026-09-01
ISSUING DEPARTMENT: Office of Finance & Student Accounts

SECTION 1: TUITION AND RECURRING SEMESTER FEES
1.1 Bachelor of Science in Computer Science & Engineering: $4,200 USD per semester (15–18 credit hours).
1.2 Bachelor of Business Administration & Humanities: $3,500 USD per semester.
1.3 Laboratory & Technology Infrastructure Fee: $250 USD per semester.
1.4 Student Activity, Health & Library Services Fee: $150 USD per semester.

SECTION 2: ONE-TIME ADMISSION & SECURITY DEPOSITS
2.1 One-Time Enrollment Registration Fee: $300 USD (non-refundable).
2.2 Refundable Institutional Security Deposit: $200 USD (refundable upon graduation clearance).

SECTION 3: PAYMENT DEADLINES & INSTALLMENT POLICY
3.1 Full semester tuition is due 10 calendar days prior to the start of classes (August 22, 2026 for Fall).
3.2 Students may apply for a two-installment payment plan (60% prior to semester commencement, 40% before midterm examinations) with zero administrative surcharge if approved by Finance before August 15, 2026.
3.3 Late Fee Policy: A late payment surcharge of $50 USD applies after the 10-day grace window.

SECTION 4: REFUND SCHEDULE
4.1 100% Tuition Refund (excluding registration fee): Withdrawal before end of Week 1.
4.2 50% Tuition Refund: Withdrawal during Week 2 or Week 3.
4.3 0% Refund: Withdrawal after Week 3.`,
    },
    {
      id: docSchId,
      ownerId,
      institutionId,
      title: '[SAMPLE] Merit & Need-Based Scholarship Policy 2026',
      fileName: 'Sample_Scholarship_Policy_2026.docx',
      fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileSize: 98400,
      department: 'Scholarships',
      category: 'Scholarship Policies',
      language: 'English',
      effectiveDate: '2026-09-01',
      expiryDate: '2027-08-31',
      reviewDate: '2027-04-30',
      version: 1,
      status: 'PROCESSED',
      accessLevel: 'PUBLIC_STUDENT',
      isSampleData: true,
      uploadedBy: reviewerName,
      createdAt: now,
      updatedAt: now,
      extractedText: `${DEMO_DISCLAIMER}

DOCUMENT TITLE: Merit & Need-Based Scholarship Policy 2026
EFFECTIVE DATE: 2026-09-01
ISSUING DEPARTMENT: Financial Aid & Scholarships Office

SECTION 1: CHANCELLOR MERIT SCHOLARSHIP TIERS
1.1 Tier A (100% Tuition Waiver): Awarded to incoming students with >= 92% high school aggregate and top 5% entrance test score.
1.2 Tier B (50% Tuition Waiver): Awarded to incoming students with 85%–91.9% high school aggregate.
1.3 Continuation Requirement: Recipients must maintain a minimum semester CGPA of 3.50 and 85% class attendance with zero disciplinary infractions.

SECTION 2: NEED-BASED FINANCIAL ASSISTANCE GRANT
2.1 Covers between 25% and 75% of semester tuition based on verified household income below $28,000 USD annually.
2.2 Required Documents for Scholarship Application:
- Completed Financial Aid Application Form (Form FA-2026).
- Official Household Income Certificate or last 2 years tax returns.
- Utility & Housing Expense Verification statements.
- Academic Transcripts and Admission Offer Letter.
2.3 Application Deadline: August 18, 2026.`,
    },
    {
      id: docCalId,
      ownerId,
      institutionId,
      title: '[SAMPLE] Academic Calendar & Attendance Schedule 2026–2027',
      fileName: 'Sample_Academic_Calendar_2026.pdf',
      fileType: 'application/pdf',
      fileSize: 164000,
      department: 'Examinations',
      category: 'Academic Regulations',
      language: 'English',
      effectiveDate: '2026-09-01',
      expiryDate: '2027-07-31',
      reviewDate: '2027-03-15',
      version: 1,
      status: 'PROCESSED',
      accessLevel: 'PUBLIC_STUDENT',
      isSampleData: true,
      uploadedBy: reviewerName,
      createdAt: now,
      updatedAt: now,
      extractedText: `${DEMO_DISCLAIMER}

DOCUMENT TITLE: Academic Calendar & Attendance Schedule 2026–2027
EFFECTIVE DATE: 2026-09-01
ISSUING DEPARTMENT: Office of the Registrar & Academic Affairs

SECTION 1: KEY ACADEMIC DATES (FALL SEMESTER 2026)
1.1 New Student Orientation: September 1–2, 2026.
1.2 Commencement of Fall Classes: September 3, 2026.
1.3 Course Add/Drop Deadline: September 14, 2026.
1.4 Midterm Examination Week: October 26 – October 31, 2026.
1.5 Final Examination Period: December 14 – December 23, 2026.
1.6 Winter Semester Break: December 24, 2026 – January 10, 2027.

SECTION 2: MANDATORY ATTENDANCE POLICY
2.1 Every student must maintain a minimum of 75% attendance in lectures and laboratory sessions for each registered course to be eligible to sit for the Final Examination.
2.2 Medical condonation up to 10% (allowing 65% minimum attendance) requires an official hospital discharge summary submitted within 5 working days of return.

SECTION 3: LIBRARY & CAMPUS HOURS DURING SEMESTER
3.1 Central Library is open Monday to Saturday 08:00 AM to 10:00 PM (07:30 AM to Midnight during exam weeks).`,
    },
    {
      id: docLibId,
      ownerId,
      institutionId,
      title: '[SAMPLE] University Examination & Academic Integrity Rules 2026–2027',
      fileName: 'Sample_Examination_Rules_2026.txt',
      fileType: 'text/plain',
      fileSize: 64200,
      department: 'Examinations',
      category: 'Examination Rules',
      language: 'English',
      effectiveDate: '2026-09-01',
      expiryDate: '2027-08-31',
      reviewDate: '2027-06-30',
      version: 1,
      status: 'UPLOADED',
      accessLevel: 'PUBLIC_STUDENT',
      isSampleData: true,
      uploadedBy: reviewerName,
      createdAt: now,
      updatedAt: now,
      extractedText: `${DEMO_DISCLAIMER}

DOCUMENT TITLE: University Examination & Academic Integrity Rules 2026–2027
EFFECTIVE DATE: 2026-09-01
ISSUING DEPARTMENT: Office of the Controller of Examinations

SECTION 1: EXAMINATION HALL CONDUCT & ADMIT SLIP RULES
1.1 Students must display a valid Institutional Student ID Card and official Examination Admit Slip at the entrance of the examination venue.
1.2 Programmable calculators, smartwatches, mobile phones, and wireless earbuds are strictly prohibited inside examination halls.
1.3 Candidates arriving more than 30 minutes after the start of an examination will not be permitted entry.

SECTION 2: GRADING, RE-EVALUATION & MAKE-UP EXAMINATIONS
2.1 Minimum passing grade for undergraduate courses is C (60% or 2.00 GPA points).
2.2 Paper re-checking applications must be filed within 7 calendar days of result publication with a $25 USD administrative fee per paper.
2.3 Deferred/Make-up final examinations are granted only for documented medical emergencies or bereavement approved by the Dean's Committee.`,
    },
  ];

  const documentVersions: DocumentVersion[] = [
    {
      id: `demo_ver_adm_1_${institutionId}`,
      ownerId,
      institutionId,
      documentId: docAdmId,
      versionNumber: 1,
      title: '[SAMPLE] Demo University Undergraduate Admission Policy 2026 (v1.0)',
      changeSummary: 'Initial baseline Admission Policy with 70% minimum score and June 30 deadline.',
      effectiveDate: '2026-01-15',
      createdBy: reviewerName,
      createdAt: '2026-01-15T09:00:00.000Z',
      extractedText: `${DEMO_DISCLAIMER}
DOCUMENT TITLE: Demo University Undergraduate Admission Policy 2026 (Version 1.0)
SECTION 1: ELIGIBILITY CRITERIA
1.1 Applicants for Bachelor programmes must hold a High School Equivalency Certificate with a minimum cumulative score of 70% or a minimum GPA of 2.8 on a 4.0 scale.
SECTION 3: APPLICATION PROCEDURE & DEADLINES
3.2 Fall Semester Priority Application Deadline: June 30, 2026.`,
    },
    {
      id: `demo_ver_adm_2_${institutionId}`,
      ownerId,
      institutionId,
      documentId: docAdmId,
      versionNumber: 2,
      title: '[SAMPLE] Demo University Undergraduate Admission Policy 2026–2027 (v2.0)',
      changeSummary: 'Updated minimum high school score from 70% to 75% (GPA 3.0) and extended Fall deadline from June 30 to July 15, 2026.',
      effectiveDate: '2026-09-01',
      createdBy: reviewerName,
      createdAt: now,
      extractedText: documents[0].extractedText,
    },
  ];

  const artAdmId = `demo_art_adm_${institutionId}`;
  const artFeeId = `demo_art_fee_${institutionId}`;
  const artSchId = `demo_art_sch_${institutionId}`;
  const artCalId = `demo_art_cal_${institutionId}`;

  const articles: KnowledgeArticle[] = [
    {
      id: artAdmId,
      ownerId,
      institutionId,
      sourceDocumentId: docAdmId,
      sourceDocumentTitle: documents[0].title,
      title: 'Undergraduate Admission Requirements & Deadlines 2026–2027 (Sample)',
      summary: `${DEMO_DISCLAIMER} Official guide to undergraduate eligibility criteria (75% minimum aggregate), required admission documents, $60 application fee, and the July 15, 2026 Fall priority deadline.`,
      department: 'Admissions',
      category: 'Admission Policies',
      status: 'PUBLISHED',
      verificationStatus: 'VERIFIED',
      version: 2,
      effectiveDate: '2026-09-01',
      expiryDate: '2027-08-31',
      reviewDate: '2027-05-15',
      accessLevel: 'PUBLIC_STUDENT',
      sourceReferences: 'Section 1 (Eligibility Criteria), Section 2 (Required Documents), Section 3 (Deadlines), Section 4 (Contact Department)',
      isSampleData: true,
      createdBy: 'Stage 03 — Knowledge Curator & Author Agent',
      approvedBy: reviewerName,
      approvedAt: now,
      createdAt: now,
      updatedAt: now,
      contentMarkdown: `> **Notice:** ${DEMO_DISCLAIMER}

### 1. Eligibility Criteria (Section 1)
- **General Bachelor Programmes:** High School Equivalency Certificate (12 years of schooling) with at least **75% cumulative marks** or a **3.0 GPA** on a 4.0 scale.
- **Engineering & Computer Science:** Minimum **78% in Mathematics and Physics**.
- **English Proficiency (International Applicants):** IELTS Academic **6.5 overall** (no band below 6.0) or **TOEFL iBT 88**.

### 2. Required Documents (Section 2)
1. Attested High School Transcripts and Graduation Certificate.
2. National Identity Card or valid Passport copy.
3. Two passport-sized photographs (white background).
4. Statement of Purpose (300–500 words).
5. Non-refundable **$60 USD** Application Processing Fee receipt.

### 3. Application Procedure & Key Dates (Section 3)
- **Submission Portal:** Online via Demo University Admissions Portal.
- **Fall Priority Deadline:** **July 15, 2026**
- **Entrance Aptitude Assessment:** **July 28, 2026**
- **Final Merit List Publication:** **August 10, 2026**

### 4. Contact Department (Section 4)
- **Office:** Office of Undergraduate Admissions, Room 104, Central Administration Building
- **Email:** admissions-sample@demo-university.edu (Mon–Fri, 08:30 AM – 04:30 PM)`,
      faqsJson: JSON.stringify([
        {
          question: 'What are the admission requirements for undergraduate programmes?',
          answer: 'Applicants need 12 years of formal schooling with at least 75% cumulative marks (or 3.0 GPA). Engineering and CS require at least 78% in Mathematics and Physics.',
        },
        {
          question: 'What documents are required for admission?',
          answer: 'Attested High School Transcripts, National ID/Passport copy, 2 passport photos, a 300–500 word Statement of Purpose, and the $60 USD application fee receipt.',
        },
        {
          question: 'When is the Fall application deadline?',
          answer: 'The Fall Semester priority application deadline is July 15, 2026.',
        },
      ]),
      verificationReportJson: JSON.stringify({
        articleTitle: 'Undergraduate Admission Requirements & Deadlines 2026–2027 (Sample)',
        verificationStatus: 'VERIFIED',
        sourceDocuments: [documents[0].title],
        verifiedStatements: [
          'Minimum cumulative score of 75% or 3.0 GPA matches Section 1.1',
          '78% Mathematics and Physics requirement matches Section 1.2',
          '$60 USD application processing fee matches Section 2.5',
          'July 15, 2026 Fall deadline matches Section 3.2',
        ],
        unsupportedStatements: [],
        missingInformation: [],
        conflictingInformation: [],
        reviewWarnings: ['Supersedes v1.0 policy where threshold was 70% and deadline was June 30, 2026.'],
        datesChecked: ['2026-09-01', '2026-07-15', '2026-07-28', '2026-08-10'],
        feesAndNumbersChecked: ['75%', '3.0 GPA', '78%', 'IELTS 6.5', 'TOEFL 88', '$60 USD'],
        accessPermissionValid: true,
        revisionRound: 0,
      } satisfies VerificationReport),
    },
    {
      id: artFeeId,
      ownerId,
      institutionId,
      sourceDocumentId: docFeeId,
      sourceDocumentTitle: documents[1].title,
      title: 'Tuition & Semester Fee Structure 2026–2027 (Sample)',
      summary: `${DEMO_DISCLAIMER} Verified breakdown of semester tuition ($4,200 CS/Engineering; $3,500 Business/Humanities), lab and activity fees, two-installment payment plan, and tuition refund schedule.`,
      department: 'Finance',
      category: 'Fee Structures',
      status: 'PUBLISHED',
      verificationStatus: 'VERIFIED',
      version: 1,
      effectiveDate: '2026-09-01',
      expiryDate: '2027-08-31',
      reviewDate: '2027-06-01',
      accessLevel: 'PUBLIC_STUDENT',
      sourceReferences: 'Section 1 (Tuition & Recurring Fees), Section 2 (One-Time Deposits), Section 3 (Payment Deadlines), Section 4 (Refund Schedule)',
      isSampleData: true,
      createdBy: 'Stage 03 — Knowledge Curator & Author Agent',
      approvedBy: reviewerName,
      approvedAt: now,
      createdAt: now,
      updatedAt: now,
      contentMarkdown: `> **Notice:** ${DEMO_DISCLAIMER}

### 1. Semester Tuition & Recurring Fees (Section 1)
- **B.Sc. Computer Science & Engineering:** **$4,200 USD** per semester (15–18 credit hours)
- **BBA & Humanities:** **$3,500 USD** per semester
- **Laboratory & Technology Fee:** **$250 USD** per semester
- **Student Activity, Health & Library Fee:** **$150 USD** per semester

### 2. One-Time Admission Deposits (Section 2)
- **Enrollment Registration Fee:** **$300 USD** (non-refundable)
- **Institutional Security Deposit:** **$200 USD** (refundable upon graduation clearance)

### 3. Payment Deadlines & Installments (Section 3)
- **Fall Tuition Due Date:** **August 22, 2026** (10 calendar days before classes)
- **Installment Plan:** 60% before semester start and 40% before midterms (zero surcharge if requested before August 15, 2026).
- **Late Payment Surcharge:** **$50 USD** after the 10-day grace window.

### 4. Tuition Refund Schedule (Section 4)
- **Before end of Week 1:** 100% Tuition Refund (excluding registration fee)
- **During Week 2 or Week 3:** 50% Tuition Refund
- **After Week 3:** 0% Refund`,
      faqsJson: JSON.stringify([
        {
          question: 'What is the current fee structure per semester?',
          answer: 'Computer Science & Engineering tuition is $4,200 USD/semester, and Business/Humanities is $3,500 USD/semester, plus a $250 lab fee and $150 student services fee.',
        },
      ]),
      verificationReportJson: JSON.stringify({
        articleTitle: 'Tuition & Semester Fee Structure 2026–2027 (Sample)',
        verificationStatus: 'VERIFIED',
        sourceDocuments: [documents[1].title],
        verifiedStatements: [
          '$4,200 USD CS/Engineering tuition verified against Section 1.1',
          '$3,500 USD Business/Humanities tuition verified against Section 1.2',
          '60%/40% installment schedule verified against Section 3.2',
        ],
        unsupportedStatements: [],
        missingInformation: [],
        conflictingInformation: [],
        reviewWarnings: [],
        datesChecked: ['2026-09-01', '2026-08-22', '2026-08-15'],
        feesAndNumbersChecked: ['$4,200', '$3,500', '$250', '$150', '$300', '$200', '$50'],
        accessPermissionValid: true,
        revisionRound: 0,
      } satisfies VerificationReport),
    },
    {
      id: artCalId,
      ownerId,
      institutionId,
      sourceDocumentId: docCalId,
      sourceDocumentTitle: documents[3].title,
      title: 'Academic Calendar, Attendance & Examination Policy 2026–2027 (Sample)',
      summary: `${DEMO_DISCLAIMER} Approved schedule for Fall 2026 classes, midterm and final examination dates, mandatory 75% attendance rule, and examination hall conduct regulations.`,
      department: 'Examinations',
      category: 'Examination Rules',
      status: 'PUBLISHED',
      verificationStatus: 'VERIFIED',
      version: 1,
      effectiveDate: '2026-09-01',
      expiryDate: '2027-07-31',
      reviewDate: '2027-03-15',
      accessLevel: 'PUBLIC_STUDENT',
      sourceReferences: 'Section 1 (Academic Dates), Section 2 (Attendance Policy), Section 3 (Examination Hall Rules)',
      isSampleData: true,
      createdBy: 'Stage 03 — Knowledge Curator & Author Agent',
      approvedBy: reviewerName,
      approvedAt: now,
      createdAt: now,
      updatedAt: now,
      contentMarkdown: `> **Notice:** ${DEMO_DISCLAIMER}

### 1. Fall 2026 Academic Calendar (Section 1)
- **New Student Orientation:** September 1–2, 2026
- **Fall Classes Begin:** September 3, 2026
- **Course Add/Drop Deadline:** September 14, 2026
- **Midterm Examinations:** October 26 – October 31, 2026
- **Final Examinations:** December 14 – December 23, 2026
- **Winter Break:** December 24, 2026 – January 10, 2027

### 2. Mandatory Attendance Policy (Section 2)
- **Minimum Attendance Requirement:** **75% attendance** in lectures and labs per course is mandatory to sit for the Final Examination.
- **Medical Condonation:** Up to 10% relaxation (minimum 65%) with an official hospital discharge summary submitted within 5 working days.

### 3. Examination Hall Rules (Section 3)
- Must bring valid **Student ID Card** and **Examination Admit Slip**.
- Smartwatches, mobile phones, programmable calculators, and wireless earbuds are strictly forbidden.
- No entry is permitted more than **30 minutes** after exam start.`,
      faqsJson: JSON.stringify([
        {
          question: 'What is the minimum attendance requirement?',
          answer: 'Students must maintain at least 75% attendance in each course to sit for final examinations (or 65% with approved hospital medical condonation).',
        },
      ]),
      verificationReportJson: JSON.stringify({
        articleTitle: 'Academic Calendar, Attendance & Examination Policy 2026–2027 (Sample)',
        verificationStatus: 'VERIFIED',
        sourceDocuments: [documents[3].title],
        verifiedStatements: [
          '75% minimum attendance requirement verified in Section 2.1',
          'Midterm (Oct 26–31) and Final (Dec 14–23) dates verified in Section 1.4 & 1.5',
        ],
        unsupportedStatements: [],
        missingInformation: [],
        conflictingInformation: [],
        reviewWarnings: [],
        datesChecked: ['2026-09-01', '2026-09-03', '2026-10-26', '2026-12-14'],
        feesAndNumbersChecked: ['75%', '10%', '65%', '30 minutes'],
        accessPermissionValid: true,
        revisionRound: 0,
      } satisfies VerificationReport),
    },
    {
      id: artSchId,
      ownerId,
      institutionId,
      sourceDocumentId: docSchId,
      sourceDocumentTitle: documents[2].title,
      title: 'Chancellor Merit & Need-Based Scholarship Policy 2026 (Sample — Pending Human Review)',
      summary: `${DEMO_DISCLAIMER} AI-drafted knowledge article detailing 100% and 50% Chancellor Merit Scholarship tiers, 3.50 CGPA continuation rule, and Need-Based Financial Aid documentation requirements.`,
      department: 'Scholarships',
      category: 'Scholarship Policies',
      status: 'WAITING_FOR_HUMAN_APPROVAL',
      verificationStatus: 'VERIFIED',
      version: 1,
      effectiveDate: '2026-09-01',
      expiryDate: '2027-08-31',
      reviewDate: '2027-04-30',
      accessLevel: 'PUBLIC_STUDENT',
      sourceReferences: 'Section 1 (Chancellor Merit Tiers), Section 2 (Need-Based Grant & Required Documents)',
      isSampleData: true,
      createdBy: 'Stage 03 — Knowledge Curator & Author Agent',
      createdAt: now,
      updatedAt: now,
      contentMarkdown: `> **Notice:** ${DEMO_DISCLAIMER}

### 1. Chancellor Merit Scholarship Tiers (Section 1)
- **Tier A (100% Tuition Waiver):** Minimum **92% high school aggregate** and top 5% entrance assessment score.
- **Tier B (50% Tuition Waiver):** **85% to 91.9%** high school aggregate.
- **Renewal Criteria:** Minimum **3.50 semester CGPA**, **85% attendance**, and zero disciplinary infractions.

### 2. Need-Based Financial Assistance Grant (Section 2)
- **Coverage:** **25% to 75%** tuition waiver for verified household income under **$28,000 USD/year**.
- **Required Scholarship Documents (Section 2.2):**
  1. Completed Financial Aid Form (**Form FA-2026**)
  2. Official Household Income Certificate or last 2 years tax returns
  3. Utility & Housing Expense Verification statements
  4. Academic Transcripts and Admission Offer Letter
- **Application Deadline:** **August 18, 2026**`,
      faqsJson: JSON.stringify([
        {
          question: 'What documents are required for a scholarship?',
          answer: 'Form FA-2026, official household income certificate or 2 years tax returns, utility/housing expense statements, and academic transcripts + admission offer letter by August 18, 2026.',
        },
      ]),
      verificationReportJson: JSON.stringify({
        articleTitle: 'Chancellor Merit & Need-Based Scholarship Policy 2026 (Sample — Pending Human Review)',
        verificationStatus: 'VERIFIED',
        sourceDocuments: [documents[2].title],
        verifiedStatements: [
          'Tier A (100% waiver at >=92%) and Tier B (50% waiver at 85%–91.9%) verified in Section 1.1 & 1.2',
          '3.50 CGPA and 85% attendance renewal requirement verified in Section 1.3',
          '$28,000 USD household income threshold and August 18, 2026 deadline verified in Section 2',
        ],
        unsupportedStatements: [],
        missingInformation: [],
        conflictingInformation: [],
        reviewWarnings: ['Awaiting Stage 05 Human Reviewer sign-off before publication to Knowledge Library.'],
        datesChecked: ['2026-09-01', '2026-08-18'],
        feesAndNumbersChecked: ['100%', '92%', '50%', '85%', '3.50 CGPA', '$28,000 USD'],
        accessPermissionValid: true,
        revisionRound: 0,
      } satisfies VerificationReport),
    },
  ];

  const chunks: KnowledgeChunk[] = [
    {
      id: `demo_chunk_adm_${institutionId}`,
      ownerId,
      institutionId,
      documentId: docAdmId,
      articleId: artAdmId,
      documentTitle: documents[0].title,
      sectionTitle: 'Section 1–4: Admission Eligibility, Documents, Deadlines & Contact',
      content: articles[0].contentMarkdown,
      department: 'Admissions',
      category: 'Admission Policies',
      accessLevel: 'PUBLIC_STUDENT',
      isApproved: true,
      effectiveDate: '2026-09-01',
      createdAt: now,
    },
    {
      id: `demo_chunk_fee_${institutionId}`,
      ownerId,
      institutionId,
      documentId: docFeeId,
      articleId: artFeeId,
      documentTitle: documents[1].title,
      sectionTitle: 'Section 1–4: Tuition, Deposits, Installments & Refunds',
      content: articles[1].contentMarkdown,
      department: 'Finance',
      category: 'Fee Structures',
      accessLevel: 'PUBLIC_STUDENT',
      isApproved: true,
      effectiveDate: '2026-09-01',
      createdAt: now,
    },
    {
      id: `demo_chunk_cal_${institutionId}`,
      ownerId,
      institutionId,
      documentId: docCalId,
      articleId: artCalId,
      documentTitle: documents[3].title,
      sectionTitle: 'Section 1–3: Academic Calendar, 75% Attendance Rule & Exam Policy',
      content: articles[2].contentMarkdown,
      department: 'Examinations',
      category: 'Examination Rules',
      accessLevel: 'PUBLIC_STUDENT',
      isApproved: true,
      effectiveDate: '2026-09-01',
      createdAt: now,
    },
  ];

  const reviewTasks: ReviewTask[] = [
    {
      id: `demo_rev_sch_${institutionId}`,
      ownerId,
      institutionId,
      articleId: artSchId,
      documentId: docSchId,
      runId: `demo_run_sch_${institutionId}`,
      articleTitle: articles[3].title,
      department: 'Scholarships',
      category: 'Scholarship Policies',
      verificationStatus: 'VERIFIED',
      status: 'PENDING_REVIEW',
      createdAt: now,
    },
  ];

  const runId = `demo_run_sch_${institutionId}`;
  const workflowRuns: WorkflowRun[] = [
    {
      id: runId,
      ownerId,
      institutionId,
      documentId: docSchId,
      documentTitle: documents[2].title,
      articleId: artSchId,
      currentStage: 5,
      currentStageName: 'STAGE 05: HUMAN REVIEWER',
      status: 'WAITING_FOR_HUMAN_REVIEW',
      progressPercent: 90,
      revisionRound: 0,
      retryCount: 0,
      submittedAt: now,
      startedAt: now,
    },
  ];

  const workflowStages: WorkflowStage[] = [
    {
      id: `demo_stg_1_${institutionId}`,
      ownerId,
      institutionId,
      runId,
      stageNumber: 1,
      stageName: 'STAGE 01: ORCHESTRATOR AGENT',
      status: 'COMPLETED',
      outputSummary: 'Validated document configuration, initialized 5-stage execution plan, and assigned intake task.',
      inputReference: `Document: ${documents[2].title} (${docSchId})`,
      outputReference: 'Execution Plan (5 steps) · Budget: 6 calls',
      retryCount: 0,
      revisionCount: 0,
      durationMs: 1120,
      detailsJson: JSON.stringify({
        inputReceived: {
          documentId: docSchId,
          documentTitle: documents[2].title,
          fileName: documents[2].fileName,
          fileType: documents[2].fileType,
          textCharacters: documents[2].extractedText.length,
        },
        processingResult: {
          runId,
          valid: true,
          executionPlan: [
            '1. Stage 01 Orchestrator: Validate uploaded document & initialize execution plan.',
            '2. Stage 02 Organizer: Extract text, classify department/category, detect dates, and generate semantic chunks.',
            '3. Stage 03 Curator & Author: Author structured AI-SUGGESTED / DRAFT knowledge article and FAQs.',
            '4. Stage 04 Verifier: Audit generated draft against source document for unsupported claims or date/fee mismatches.',
            '5. Stage 05 Human Reviewer: Hold verified draft in Human Review Workspace for mandatory institutional sign-off.',
          ],
          callBudget: { maxAgentCalls: 6, maxRevisionLoops: 2 },
        },
        outputGenerated: {
          executionPlanSteps: 5,
          inputDocumentCount: 1,
        },
        linkedDocuments: [{ id: docSchId, title: documents[2].title }],
        linkedArticles: [],
      }),
      startedAt: now,
      completedAt: now,
    },
    {
      id: `demo_stg_2_${institutionId}`,
      ownerId,
      institutionId,
      runId,
      stageNumber: 2,
      stageName: 'STAGE 02: KNOWLEDGE INTAKE & ORGANIZER AGENT',
      status: 'COMPLETED',
      outputSummary: 'Extracted text from Sample_Scholarship_Guidelines_2026.docx, classified under Scholarships / Scholarship Policies, effective 2026-09-01.',
      inputReference: `Stage 01 Plan + Document "${documents[2].title}"`,
      outputReference: 'Classified: Scholarships / Scholarship Policies · 2 Chunks (768d embeddings)',
      retryCount: 0,
      revisionCount: 0,
      durationMs: 2480,
      detailsJson: JSON.stringify({
        inputReceived: {
          documentTitle: documents[2].title,
          fileName: documents[2].fileName,
        },
        processingResult: {
          extractedTitle: documents[2].title,
          language: 'English',
          detectedCategory: 'Scholarship Policies',
          departmentMapping: 'Scholarships',
          effectiveDate: '2026-09-01',
          expiryOrReviewDate: '2027-04-30',
          isDuplicateWarning: false,
          embeddingDimension: 768,
        },
        outputGenerated: {
          chunkCount: 2,
          chunkSections: ['Section 1: Chancellor Merit Scholarship Tiers', 'Section 2: Need-Based Financial Assistance Grant'],
        },
        linkedDocuments: [{ id: docSchId, title: documents[2].title }],
        linkedArticles: [],
      }),
      startedAt: now,
      completedAt: now,
    },
    {
      id: `demo_stg_3_${institutionId}`,
      ownerId,
      institutionId,
      runId,
      stageNumber: 3,
      stageName: 'STAGE 03: KNOWLEDGE CURATOR & AUTHOR AGENT',
      status: 'COMPLETED',
      outputSummary: 'Generated structured knowledge article draft with Merit Tiers, Need-Based Grant rules, and FAQ entries.',
      inputReference: 'Stage 02 Extracted Content (2 chunks, Scholarships / Scholarship Policies)',
      outputReference: `Draft Article "${articles[3].title}" (ID: ${artSchId}) · Status: AI-SUGGESTED / DRAFT`,
      retryCount: 0,
      revisionCount: 0,
      durationMs: 3850,
      detailsJson: JSON.stringify({
        inputReceived: {
          sourceDocument: documents[2].title,
          department: 'Scholarships',
          category: 'Scholarship Policies',
          effectiveDate: '2026-09-01',
          revisionRound: 0,
        },
        processingResult: {
          articleId: artSchId,
          articleTitle: articles[3].title,
          status: 'AI-SUGGESTED / DRAFT',
          summary: articles[3].summary,
          sourceReferences: articles[3].sourceReferences,
          faqCount: 1,
        },
        outputGenerated: {
          contentMarkdownPreview: articles[3].contentMarkdown,
        },
        linkedDocuments: [{ id: docSchId, title: documents[2].title }],
        linkedArticles: [{ id: artSchId, title: articles[3].title, status: 'AI-SUGGESTED / DRAFT' }],
      }),
      startedAt: now,
      completedAt: now,
    },
    {
      id: `demo_stg_4_${institutionId}`,
      ownerId,
      institutionId,
      runId,
      stageNumber: 4,
      stageName: 'STAGE 04: KNOWLEDGE VERIFIER AGENT',
      status: 'COMPLETED',
      outputSummary: 'Verified all numerical thresholds (92%, 85%, 3.50 CGPA, $28,000 USD) and August 18, 2026 deadline with zero unsupported claims.',
      inputReference: `Draft Article "${articles[3].title}" (ID: ${artSchId}) + Source Document`,
      outputReference: 'Verification Report: VERIFIED · 3 Verified Claims',
      retryCount: 0,
      revisionCount: 0,
      durationMs: 2910,
      detailsJson: JSON.stringify({
        inputReceived: {
          articleId: artSchId,
          articleTitle: articles[3].title,
          sourceDocumentTitle: documents[2].title,
          revisionRoundsExecuted: 0,
        },
        processingResult: JSON.parse(articles[3].verificationReportJson || '{}'),
        outputGenerated: {
          verificationStatus: 'VERIFIED',
        },
        linkedDocuments: [{ id: docSchId, title: documents[2].title }],
        linkedArticles: [{ id: artSchId, title: articles[3].title, status: 'WAITING_FOR_HUMAN_APPROVAL' }],
      }),
      startedAt: now,
      completedAt: now,
    },
    {
      id: `demo_stg_5_${institutionId}`,
      ownerId,
      institutionId,
      runId,
      stageNumber: 5,
      stageName: 'STAGE 05: HUMAN REVIEWER',
      status: 'WAITING_FOR_HUMAN_REVIEW',
      outputSummary: 'Queued in Human Review Workspace awaiting institutional reviewer approval. Automatic publication is strictly blocked until approved.',
      inputReference: `Verified Draft "${articles[3].title}" (${artSchId}) + Stage 04 Report (VERIFIED)`,
      outputReference: 'Awaiting Human Reviewer Decision (Approve / Reject / Request Changes)',
      retryCount: 0,
      revisionCount: 0,
      detailsJson: JSON.stringify({
        inputReceived: {
          articleId: artSchId,
          articleTitle: articles[3].title,
          verificationStatus: 'VERIFIED',
          sourceDocumentTitle: documents[2].title,
        },
        processingResult: {
          governanceGate: 'STAGE 05: HUMAN REVIEWER (Mandatory Non-AI Stage)',
          status: 'WAITING_FOR_HUMAN_REVIEW',
          allowedActions: ['Approve', 'Reject', 'Request Changes', 'Save as Pending'],
        },
        outputGenerated: {
          reviewTaskId: `demo_rev_sch_${institutionId}`,
        },
        linkedDocuments: [{ id: docSchId, title: documents[2].title }],
        linkedArticles: [{ id: artSchId, title: articles[3].title, status: 'WAITING_FOR_HUMAN_APPROVAL' }],
      }),
      startedAt: now,
    },
  ];

  const lifecycleProposals: LifecycleProposal[] = [
    {
      id: `demo_prop_update_${institutionId}`,
      ownerId,
      institutionId,
      articleId: artAdmId,
      documentId: docAdmId,
      targetTitle: 'Undergraduate Admission Policy 2026–2027 (Version 1.0 → Version 2.0)',
      department: 'Admissions',
      actionType: 'UPDATE',
      reason: 'Version 2.0 raised the minimum high school eligibility score from 70% to 75% (GPA 2.8 → 3.0) and extended the Fall priority deadline from June 30, 2026 to July 15, 2026.',
      diffSummary: '• Section 1.1: Minimum cumulative score increased from 70% (2.8 GPA) to 75% (3.0 GPA).\n• Section 1.2: Added 78% Mathematics & Physics threshold for Engineering/CS.\n• Section 3.2: Fall Priority Application Deadline extended from June 30, 2026 to July 15, 2026.',
      oldVersionText: documentVersions[0].extractedText,
      newVersionText: documentVersions[1].extractedText,
      status: 'PENDING_APPROVAL',
      createdAt: now,
    },
    {
      id: `demo_prop_keep_${institutionId}`,
      ownerId,
      institutionId,
      articleId: artFeeId,
      documentId: docFeeId,
      targetTitle: 'Tuition & Semester Fee Structure 2026–2027',
      department: 'Finance',
      actionType: 'KEEP',
      reason: 'Current published article matches the active 2026–2027 Fee Schedule with no superseding notices and review date set for 2027-06-01.',
      diffSummary: 'No discrepancies detected between source document and published knowledge article.',
      status: 'PENDING_APPROVAL',
      createdAt: now,
    },
    {
      id: `demo_prop_retire_${institutionId}`,
      ownerId,
      institutionId,
      documentId: docAdmId,
      targetTitle: 'Legacy COVID-19 Remote Entrance Exam Waiver Notice (2022–2024)',
      department: 'Examinations',
      actionType: 'RETIRE',
      reason: 'Superseded by Section 3.3 of the 2026–2027 Admission Policy requiring in-person Entrance Aptitude Assessment on July 28, 2026.',
      diffSummary: 'Retire outdated temporary waiver and archive record for historical audit.',
      status: 'PENDING_APPROVAL',
      createdAt: now,
    },
  ];

  const unansweredQuestions: UnansweredQuestion[] = [
    {
      id: `demo_uq_1_${institutionId}`,
      ownerId,
      institutionId,
      question: 'What is the shuttle bus schedule from the North Metro Station to the Engineering Campus?',
      askedByRole: 'Student',
      departmentSuggested: 'Transport',
      status: 'OPEN',
      createdAt: now,
    },
    {
      id: `demo_uq_2_${institutionId}`,
      ownerId,
      institutionId,
      question: 'Are international postdoctoral fellows eligible for on-campus family apartment housing?',
      askedByRole: 'Faculty / Teacher',
      departmentSuggested: 'Hostel',
      status: 'OPEN',
      createdAt: now,
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: `demo_audit_1_${institutionId}`,
      ownerId,
      institutionId,
      actorName: reviewerName,
      actorType: 'HUMAN',
      action: 'STAGE_05_HUMAN_REVIEW_APPROVE',
      targetType: 'KnowledgeArticle',
      targetId: artAdmId,
      targetTitle: articles[0].title,
      previousStatus: 'WAITING_FOR_HUMAN_APPROVAL',
      newStatus: 'PUBLISHED',
      reason: 'Verified against official 2026–2027 Undergraduate Admission Policy v2.0.',
      createdAt: now,
    },
    {
      id: `demo_audit_2_${institutionId}`,
      ownerId,
      institutionId,
      actorName: 'Stage 04 — Knowledge Verifier Agent',
      actorType: 'AI_AGENT',
      action: 'COMPLETED_AI_STAGES_01_TO_04',
      targetType: 'KnowledgeArticle',
      targetId: artSchId,
      targetTitle: articles[3].title,
      previousStatus: 'AI-SUGGESTED / DRAFT',
      newStatus: 'WAITING_FOR_HUMAN_APPROVAL',
      reason: 'All numerical claims (92%, 85%, 3.50 CGPA, $28,000 USD) verified against source policy.',
      workflowRunId: runId,
      createdAt: now,
    },
    {
      id: `demo_audit_3_${institutionId}`,
      ownerId,
      institutionId,
      actorName: reviewerName,
      actorType: 'HUMAN',
      action: 'UPLOADED_NEW_DOCUMENT_VERSION',
      targetType: 'Document',
      targetId: docAdmId,
      targetTitle: documents[0].title,
      previousStatus: 'v1',
      newStatus: 'v2',
      reason: 'Uploaded revised Admission Policy v2.0 with updated 75% minimum score and July 15 deadline.',
      createdAt: now,
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: `demo_notif_1_${institutionId}`,
      ownerId,
      institutionId,
      title: 'Stage 05 Human Approval Required',
      message: 'Chancellor Merit & Need-Based Scholarship Policy 2026 passed Stage 04 Verification and awaits human approval.',
      type: 'REVIEW_REQUIRED',
      read: false,
      createdAt: now,
    },
    {
      id: `demo_notif_2_${institutionId}`,
      ownerId,
      institutionId,
      title: 'Lifecycle UPDATE Proposal Generated',
      message: 'Version 2.0 of Undergraduate Admission Policy detected changes in eligibility threshold (70% → 75%).',
      type: 'LIFECYCLE_ALERT',
      read: false,
      createdAt: now,
    },
  ];

  return {
    documents,
    documentVersions,
    articles,
    chunks,
    reviewTasks,
    workflowRuns,
    workflowStages,
    lifecycleProposals,
    unansweredQuestions,
    auditLogs,
    notifications,
  };
}
