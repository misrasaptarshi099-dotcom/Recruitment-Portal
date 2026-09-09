# GDG on Campus Recruitment Portal - Technical Architecture and Work Specification

**[Project Overview (README)](./README.md)** | **[Technical Specification & Architecture (WORK.md)](./WORK.md)**

## 1. Summary

This document serves as an exhaustive technical ledger detailing the complete architectural transformation, system implementations, data models, security hardening, and operational features delivered for the Google Developer Groups (GDG) on Campus Recruitment Portal.

The platform provides an end-to-end recruitment pipeline engineered to automate university-scale talent acquisition across twelve technical and non-technical domains. It transitions chapter operations away from manual spreadsheets and disparate forms into an institutional-grade web application featuring Boyce-Codd Normal Form (BCNF) relational storage, role-based access control (RBAC), distributed sliding-window rate limiting, sub-millisecond Redis edge caching, offline-resilient draft synchronization, an automated transactional email engine, and a progressive three-round candidate evaluation lifecycle.

---

## 2. Engineering Changes, Improvements, and Additions

### 2.1. BCNF Normalization and Atomic Response Storage
- **Relational Normalization Overhaul**: Restructured Firestore storage from monolithic, deeply-nested document schemas into decoupled Boyce-Codd Normal Form (BCNF) relations: `candidates`, `applications`, and `responses`.
- **Field Key Sanitization**: Implemented `sanitizeFieldKey` utility to transform arbitrary, user-defined questionnaire prompt strings into compliant, lowercase snake_case identifiers. The sanitizer strips whitespace, punctuation, and forbidden Firestore FieldPath delimiters (`.`, `/`, `\`, `#`, `$`, `[`, `]`), preventing database driver driver exceptions.
- **Deterministic Primary Keys**: Established deterministic key generation patterns:
  - Candidates: `cand_<normalizedEmailSlug>`
  - Applications: `app_<normalizedEmailSlug>__<deptSlug>`
  - Responses: `resp_app_<normalizedEmailSlug>__<deptSlug>__<sanitizedQuestionKey>`
- **Atomic Transaction Concurrency**: Replaced unchecked writes with `submitApplicationTransaction`, executing atomic read-modify-write cycles within Firestore transactions. This strictly eliminates Time-Of-Check to Time-Of-Use (TOCTOU) race conditions during high-concurrency traffic spikes.
- **Quota and Duplicate Submission Guards**: Built server-side validation enforcing that any given candidate cannot submit duplicate applications for the same department, and cannot exceed a strict global threshold of two distinct department applications per recruitment cycle.
- **Dual-Write Backward Compatibility**: Maintained synchronized dual-writes to the legacy `formData` collection to preserve full compatibility with legacy administrative datatables and export utilities without data regression.

### 2.2. Role-Based Access Control and Security Hardening
- **Institutional Domain Lock**: Configured authentication callbacks to validate the user email domain against the institutional pattern `@vitstudent.ac.in`. Unauthorized authentication attempts are rejected at the OAuth callback boundary.
- **Automated Account Revocation and Session Purge**: Implemented background revocation routines that invalidate sessions and remove records for any non-institutional accounts detected in the identity store.
- **Granular Three-Tier RBAC**:
  - `SUPER_ADMIN`: Unrestricted cluster-wide management, global deadline adjustments, mass broadcast authority, and role delegation rights.
  - `DEPARTMENT_ADMIN` (or `MANAGER`): Strictly isolated to designated departments. Permitted to review submissions, grade tasks, adjust department questionnaires, configure Round 2 briefs, and manage interview slots solely within their authorized domain.
  - `REVIEWER`: Read-only evaluation permissions scoped to assigned departments.
- **Department Boundary Enforcement**: Engineered `canAccessDepartment` guards across all administrative route handlers (`/api/admin/*`). Foreign department queries or mutation attempts immediately abort with an HTTP 403 Forbidden status.
- **Cross-Site Scripting (XSS) Sanitization**: Applied comprehensive sanitization filters to candidate essay answers and task submission URLs, rejecting dangerous protocols (`javascript:`, `data:`, `vbscript:`) and escaping HTML tags prior to persistence.
- **Open Mail Relay Mitigation**: Sealed email dispatch routes behind administrative session checks, role verifications, and recipient domain validation, preventing unauthorized external relay usage.

### 2.3. Distributed Edge Caching and Sliding-Window Rate Limiting
- **Upstash Redis Integration**: Integrated Upstash Redis REST API (`@upstash/redis`) to provide distributed, serverless data caching and distributed rate limiting that functions seamlessly across serverless edge environments.
- **Sliding-Window Lua Limiter**: Authored atomic Redis Lua script utilizing sorted sets (`ZSET`). For each incoming request, the script trims expired entries outside the sliding window, counts active entries, records the current millisecond timestamp, sets key time-to-live (TTL), and computes dynamic `Retry-After` reset intervals.
- **In-Memory Graceful Failover**: Designed `rateLimit` in-memory fallback engine utilizing active sliding-window maps and automatic periodic cleanup timers (every 5 minutes) to ensure rate limiting never fails even if external Redis connectivity drops.
- **Endpoint-Specific Velocity Policies**:
  - Public Track and Deadlines API (`/api/deadlines`): 60 requests per 60 seconds per IP.
  - Form Submissions (`/api/submit-form`): 5 requests per 300 seconds per IP/User.
  - Candidate Task Submissions (`/api/user/submit-task`): 10 requests per 60 seconds.
  - Administrative Management APIs: 30 requests per 60 seconds per Administrator.
  - Transactional Mailer APIs: 5 requests per 600 seconds per Administrator.
- **Sub-Millisecond Configuration Caching**: Added Redis read-through caching for heavy Firestore documents, including global deadlines (`recruitment_config:deadlines`), department questionnaires, and track metadata, cutting database read costs and lowering response latencies.
- **Administrative Cache Invalidation Hooks**: Embedded automatic Redis cache purges upon administrative updates to deadlines, questionnaires, or task parameters to ensure immediate consistency.

### 2.4. Pixel-Industrial Design System and Gamified Experience
- **Retro-Industrial Aesthetic ("Dino Theme")**: Developed a coherent visual language combining Swiss typography, high-contrast monospace displays, and pixel-accented industrial components.
- **Balanced Typographic Hierarchy**: Deployed three primary font families across the platform:
  - Monospace Display: Space Grotesk
  - Retro Pixel Accents: Press Start 2P
  - Body and Interface: Inter
- **De-cluttered Hero Architecture**: Re-engineered the hero view with clean vertical breathing room, high-contrast badges, real-time chapter metrics, and a retro-themed green ASCII Chrome Dino backdrop.
- **Embedded Chrome Dino Arcade Mini-Game**:
  - Implemented an interactive canvas-based endless runner mini-game directly in the candidate interface.
  - Built jumping and collision physics with progressive speed acceleration.
  - Integrated retro sound effects synthesized dynamically using the browser Web Audio API (`AudioContext` square-wave oscillator).
  - Wired atomic score recording via `/api/user/dino-score` utilizing Firestore transactions to track cumulative games played and persist all-time high scores.
- **Dino Rank Tier Engine**: Built mathematical tiering algorithm mapping candidate high scores and application milestones across six ranked designations: Cadet, Operator, Specialist, Vanguard, Architect, and Master.
- **Interactive Department Trees Explorer**: Scroll-driven dual-cluster visualizer mapping twelve departments into Technical (7 tracks) and Non-Technical (5 tracks) clusters with responsive branch animations and prerequisite overviews.

### 2.5. Three-Round Recruitment Lifecycle and Candidate Portal
- **Unified Candidate Dashboard (`/profile`)**:
  - Live three-round progression tracker displaying real-time statuses across all submitted applications.
  - Interactive round cards depicting Round 1 (Screening), Round 2 (Technical Task), and Round 3 (Interview).
- **Submitted Answers Review Modal**: Provided candidates with an accessible dialog to review their submitted essay responses, portfolio links, and questionnaire answers post-submission.
- **Round 2 Task Workflow**:
  - Administrative Task Manager: Department managers author task problem statements, upload resource guidelines (Google Drive, Notion, Figma), and define evaluation criteria.
  - Candidate Task Drawer: Candidates review department-specific briefs and submit project deliverable URLs.
  - Deliverable Protocol Guards: Enforces valid HTTP/HTTPS schemes and rejects invalid strings.
  - Server-Side Submission Deadlines: Validates timestamps against configured Round 2 cutoffs, rejecting late submissions.
- **Round 3 Interview Scheduling Engine**:
  - Bulk Contiguous Slot Generator: Administrative tool computing contiguous 15-minute booking slots between custom time boundaries (e.g., 14:00 to 18:00 produces 16 distinct slots).
  - Self-Service Candidate Slot Picker: Shortlisted candidates select from remaining available slots in real time.
  - Atomic Slot Reservation: Prevents double-booking via transactional Firestore updates with meeting coordinates and room links.

### 2.6. Automated Transactional Mailer Engine
- **Centralized Mailer Architecture (`lib/mailer.js`)**: Built an enterprise-grade Nodemailer engine featuring SMTP connection pooling, transport verification, and error handling.
- **Development Dry-Run Safety Mode**: Automatically detects missing SMTP credentials in local development or CI environments, logging cleanly formatted email payloads to stdout without crashing or throwing exceptions.
- **Responsive Branded HTML Templates**:
  - Round 1 Shortlist Notification
  - Round 1 Rejection Notice
  - Round 2 Task Clearance Notification
  - Round 2 Rejection Notice
  - Round 3 Final Offer / Acceptance Letter
  - Round 3 Interview Slot Confirmation (including date, time, and Google Meet URL)
  - Chapter-Wide Batch Broadcast Announcements
- **Decision State Locking**: Implemented transactional state locking ensuring that once an official decision email is dispatched to a candidate, the application status is locked against accidental administrative modifications, guaranteeing audit compliance and communication integrity.

### 2.7. Real-Time Round 1 Deadline Enforcement
- **Public Deadlines API (`/api/deadlines`)**: Engineered high-throughput, edge-cached endpoint returning per-department cutoff dates and real-time open/closed statuses.
- **Real-Time UI Badging**:
  - Department cards automatically display high-contrast `APPLICATIONS CLOSED` tags upon reaching deadline timestamps.
  - Expired department cards are disabled from mouse and keyboard selection.
  - Selected department arrays automatically filter out closed tracks.
  - Proceed buttons disable dynamically if all selected tracks have expired.
- **Server-Side Route and Submission Guards**:
  - Navigating directly to `/join/[...joinIds]` with expired tracks renders an application closed notice.
  - Form submission API (`/api/submit-form`) cross-references incoming department names against current timestamps, rejecting expired applications with HTTP 403 Forbidden.

### 2.8. Cross-Platform CI/CD Hardening and Webpack Build Resilience
- **GitHub Actions CI Pipeline (`.github/workflows/ci.yml`)**: Multi-phase continuous integration pipeline executing automated ESLint code quality checks, complete BCNF/security/lifecycle unit test suites, and production Next.js compilation.
- **Node 20 Linux Test Interoperability**: Resolved cross-platform ESM and CommonJS interop issues where dynamic route imports required unwrapping `.default` exports on Linux runners.
- **Webpack Font Build Stabilization**: Replaced build-time Google Font fetching via `next/font/google` in `app/layout.js` with direct CSS `@import` rules in `app/globals.css`. This eliminated intermittent runner network timeouts while maintaining identical visual typography.

---

## 3. How Core Subsystems Work

### 3.1. Authentication and Authorization Flow
1. **Candidate Sign-In**: Candidate initiates sign-in using Google Identity Services.
2. **Domain Verification**: Better Auth OAuth callbacks evaluate the incoming email. If the domain does not strictly match `@vitstudent.ac.in`, authentication is aborted and an error is returned.
3. **Session Issuance**: Valid candidates receive secure HTTP-only session cookies.
4. **Role Resolution**: On privileged routes, middleware and route handlers query `recruitment_config/roles` to resolve whether the authenticated email holds `SUPER_ADMIN` or `DEPARTMENT_ADMIN` status, extracting authorized department scopes.

```
Candidate Browser        Next.js Auth Handler       Google OAuth Provider
       │                          │                          │
       ├──── Click Sign In ──────>│                          │
       │                          ├──── Redirect to OAuth ──>│
       │                          │<─── User Authorizes ─────┤
       │                          │
       │                    [Domain Check]
       │                 Is @vitstudent.ac.in?
       │                    ├── No  ──> Abort & Display Rejection
       │                    └── Yes ──> Query Role Config (Super / Dept Admin)
       │<─── Issue Session Cookie ┘
```

### 3.2. Application Submission and Concurrency Control
1. **Client Draft Autosave**: As the candidate inputs responses, entries are debounced and saved into IndexedDB with a fallback to localStorage.
2. **Connectivity Detection**: Form monitors `navigator.onLine`. If connection drops, an offline status bar informs the candidate; upon reconnecting, pending drafts are retained.
3. **Payload Submission**: Submission sends structured candidate profile fields and questionnaire response key-value pairs to `/api/submit-form`.
4. **Rate Limit Gate**: Request passes through `rateLimitAsync` (5 submissions per 300 seconds).
5. **Deadline Verification**: Endpoint verifies whether the target department has passed its Round 1 deadline.
6. **BCNF Transaction Execution**:
   - Acquires Firestore transaction lock.
   - Verifies existing applications for the email (enforcing max 2 applications and duplicate prevention).
   - Upserts candidate metadata in `candidates`.
   - Writes normalized application state in `applications`.
   - Writes individual question-answer records in `responses`.
   - Writes backward-compatible document in `formData`.
   - Clears client-side local drafts upon successful confirmation.

### 3.3. Offline Draft Queue and Client-Side Persistence
- **Storage Engine (`lib/local-store.ts`)**: Encapsulates IndexedDB using `idb-keyval` with automatic failover to browser `localStorage` when IndexedDB is restricted.
- **Chained Write Queue**: Form input events feed into a chained promise queue (`createDraftQueue`) that serializes disk writes, preventing out-of-order write hazards during rapid keyboard input.
- **Revision Tracking**: Draft records include revision counters and ISO timestamps. On form initialization, the latest revision is reconstructed into React Hook Form state.

### 3.4. Dynamic Questionnaire and Task Management
- **Hierarchical Question Overlay**: Baseline department questions are defined in static constants (`constants/departments-data.js`). Administrators can create custom questions via `/api/admin/questions`, stored in `recruitment_config/questionnaires`.
- **Dynamic Consolidation**: Runtime requests merge custom administrative questions over baseline defaults. Department managers can add, reorder, or edit questions specifically for their tracks.
- **Round 2 Task Publishing**: Department managers update `recruitment_config/round2_tasks`, configuring custom task titles, problem statements, reference URLs, and submission instructions per department.

### 3.5. Three-Round Evaluation State Machine
Every candidate application progresses through a deterministic finite-state pipeline:

```
State 1: Round 1 (Screening)
   ├── Status: "pending"
   ├── Transition: Administrator evaluates written responses
   ├── Outcome A: "rejected"    ──> Dispatches Round 1 Rejection Email
   └── Outcome B: "shortlisted" ──> Unlocks Round 2; Dispatches Shortlist Email
                                      │
                                      ▼
State 2: Round 2 (Technical Task)
   ├── Status: "task_assigned"
   ├── Action: Candidate reviews brief & submits deliverable URL
   ├── Status: "task_submitted"
   ├── Transition: Department Manager grades deliverable
   ├── Outcome A: "rejected"    ──> Dispatches Round 2 Rejection Email
   └── Outcome B: "cleared"     ──> Unlocks Round 3; Dispatches Clearance Email
                                      │
                                      ▼
State 3: Round 3 (Interview)
   ├── Status: "interview_pending"
   ├── Action: Candidate selects 15-minute interview slot
   ├── Status: "interview_scheduled"
   ├── Transition: Interview panel evaluates candidate performance
   ├── Outcome A: "not_selected"──> Dispatches Non-Selection Notice
   └── Outcome B: "selected"    ──> Dispatches Official Offer Letter
```

### 3.6. Interview Slot Generation and Reservation Engine
1. **Administrative Generation**:
   - Manager provides department, date, start time (e.g., `14:00`), end time (e.g., `17:00`), and Google Meet link.
   - The engine validates 24-hour time formatting, verifies duration is at least 15 minutes, and calculates discrete 15-minute intervals.
   - For each interval, an atomic ID is created: `slot_<deptSlug>_<date>_<startTime>`.
   - Slots are persisted to `interview_slots` with `isBooked: false`.
2. **Candidate Reservation**:
   - Candidate views unreserved slots matching their shortlisted department.
   - Candidate selects an open slot.
   - A Firestore transaction verifies the slot remains unreserved (`isBooked === false`), tags it with the candidate's email, sets `isBooked: true`, and stores `bookedAt` timestamp.
   - The application record is updated with `selectedInterviewSlot` and `interviewStatus: "scheduled"`.
   - Confirmation email with meeting coordinates is automatically queued.

### 3.7. Transactional Email Dispatch and Decision Locking
- **Dispatch Route (`/api/admin/send-mail/[id]`)**: Evaluates candidate application ID, target round, and recorded decision.
- **Template Synthesis**: Compiles dynamic candidate variables (name, department, round, meeting coordinates) into responsive GDG-branded HTML templates.
- **Delivery**: Transports email via Nodemailer SMTP with connection pooling.
- **Audit Logging**: Appends record to `mail_logs` containing timestamp, recipient, round, decision, and dispatch status.
- **Decision State Lock**: Updates application record with `mailSent: true` and `decisionLocked: true`. Any subsequent status edit without an administrative unlock operation is rejected.

### 3.8. Distributed Sliding-Window Rate Limiter
The rate limiter evaluates client requests using a Lua script executed atomically on Upstash Redis
When velocity limits are exceeded, the API returns HTTP 429 Too Many Requests alongside a `Retry-After: <seconds>` response header.

---

## 4. Brief Database Architecture

The data architecture is hosted on Google Cloud Firestore, structured strictly in accordance with Boyce-Codd Normal Form (BCNF) principles to guarantee that every functional dependency `X -> Y` has `X` as a superkey.

```
                               ┌────────────────────────────────┐
                               │           candidates           │
                               ├────────────────────────────────┤
                               │ PK: candidateId (cand_<email>) │
                               │ UK: email                      │
                               │ UK: registrationNumber         │
                               └───────────────┬────────────────┘
                                               │ 1
                                               │
                                               │ N
                               ┌───────────────▼────────────────┐
                               │          applications          │
                               ├────────────────────────────────┤
                               │ PK: applicationId              │
                               │ FK: candidateEmail             │
                               │ FK: departmentSlug             │
                               └───────────────┬────────────────┘
                                               │ 1
                         ┌─────────────────────┴─────────────────────┐
                         │ N                                         │ N
         ┌───────────────▼────────────────┐          ┌───────────────▼────────────────┐
         │           responses            │          │        interview_slots         │
         ├────────────────────────────────┤          ├────────────────────────────────┤
         │ PK: responseId                 │          │ PK: slotId                     │
         │ FK: applicationId              │          │ FK: bookedByCandidateEmail     │
         │     questionKey                │          │     departmentSlug             │
         │     answer                     │          │     startTime, endTime         │
         └────────────────────────────────┘          └────────────────────────────────┘
```

### 4.1. Collection: `candidates`
Stores unique student demographic, academic, and arcade profiles.

| Field Name | Type | Key Type | Description |
|---|---|---|---|
| `candidateId` | String | PK | Unique identifier (`cand_<emailSlug>`) |
| `email` | String | UK | Normalized student institutional email |
| `registrationNumber` | String | UK / Index | Institutional student registration number |
| `name` | String | Attribute | Full legal name of the candidate |
| `phone` | String | Attribute | Contact phone number |
| `gender` | String | Attribute | Self-reported gender identity |
| `yearOfStudy` | String | Attribute | Current academic year of study |
| `applicationCount` | Number | Counter | Cumulative submitted applications (Max: 2) |
| `dinoHighScore` | Number | Index | Highest verified score achieved in Dino runner |
| `gamesPlayed` | Number | Counter | Cumulative games played in Dino runner |
| `createdAt` | Timestamp | Metadata | Account creation ISO timestamp |
| `updatedAt` | Timestamp | Metadata | Last profile update ISO timestamp |

### 4.2. Collection: `applications`
Stores specific department-track applications submitted by candidates.

| Field Name | Type | Key Type | Description |
|---|---|---|---|
| `applicationId` | String | PK | Deterministic key: `app_<emailSlug>__<deptSlug>` |
| `candidateEmail` | String | FK / Index | Reference to `candidates.email` |
| `department` | String | Attribute | Department track name (e.g., "Web Dev") |
| `departmentSlug` | String | FK / Index | Normalized department identifier (`web_dev`) |
| `status` | String | State | Overall application status: `pending`, `shortlisted`, `rejected` |
| `shortlisted` | Boolean | State / Index | Explicit boolean flag for quick filtering |
| `round1Status` | String | State | Round 1 review outcome: `pending`, `shortlisted`, `rejected` |
| `round1ReviewedBy` | String | Audit | Email of administrator who evaluated Round 1 |
| `round1Feedback` | String | Attribute | Written evaluation notes from Round 1 reviewer |
| `round2Status` | String | State | Round 2 outcome: `not_started`, `assigned`, `submitted`, `cleared`, `rejected` |
| `round2TaskUrl` | String | Attribute | Validated deliverable link submitted by candidate |
| `round2SubmittedAt`| Timestamp | Audit | ISO timestamp of Round 2 task submission |
| `round2Feedback` | String | Attribute | Written grading feedback from Department Manager |
| `round3Status` | String | State | Round 3 outcome: `pending`, `scheduled`, `selected`, `not_selected` |
| `selectedInterviewSlot`| String | FK | Reference to `interview_slots.slotId` |
| `interviewNotes` | String | Attribute | Panel interview scorecard and evaluation notes |
| `mailSent` | Boolean | State | Indicates whether official decision email was sent |
| `decisionLocked` | Boolean | Guard | Prevents modifications once mail is dispatched |
| `submittedAt` | Timestamp | Index | ISO timestamp of initial application submission |

### 4.3. Collection: `responses`
Stores atomic question-and-answer pairs for submitted applications.

| Field Name | Type | Key Type | Description |
|---|---|---|---|
| `responseId` | String | PK | Deterministic key: `resp_<applicationId>__<questionKey>` |
| `applicationId` | String | FK / Index | Reference to parent `applications.applicationId` |
| `questionKey` | String | Index | Sanitized alphanumeric field key |
| `questionText` | String | Attribute | Full prompt text displayed to candidate |
| `answer` | String | Attribute | Candidate response (XSS sanitized) |
| `createdAt` | Timestamp | Metadata | Creation ISO timestamp |

### 4.4. Collection: `recruitment_config`
System-wide and track-specific operational configurations partitioned across dedicated documents:

#### Document: `recruitment_config/deadlines`
- `round1Deadlines`: Map of department slugs to Round 1 cutoff ISO strings.
- `round2Deadlines`: Map of department slugs to Round 2 cutoff ISO strings.
- `round1Deadline`: Global fallback Round 1 cutoff string.
- `round2Deadline`: Global fallback Round 2 cutoff string.
- `updatedAt`: Timestamp of last administrative modification.

#### Document: `recruitment_config/questionnaires`
- `departments`: Map of department slugs to customized question configuration arrays.
- Each question entry contains:
  - `key`: Sanitized question key.
  - `question`: Prompt label.
  - `type`: Input type (`text`, `textarea`, `url`, `select`).
  - `required`: Boolean validation flag.
  - `options`: Select choices (if applicable).

#### Document: `recruitment_config/round2_tasks`
- `departments`: Map of department slugs to task specification objects.
- Each task specification contains:
  - `title`: Problem statement headline.
  - `description`: Detailed technical brief and instructions.
  - `resourceLinks`: Array of external documentation and starter URLs.
  - `deliverableTypes`: Expected delivery formats (e.g., GitHub, Figma, PDF).
  - `evaluationCriteria`: Scoring rubrics for managers.

#### Document: `recruitment_config/roles`
- `superAdmins`: Array of email addresses granted global management privileges.
- `deptManagers`: Map of email addresses to arrays of authorized department track names.
- `updatedAt`: Timestamp of last role update.

### 4.5. Collection: `interview_slots`
Stores available, reserved, and completed 15-minute interview appointments.

| Field Name | Type | Key Type | Description |
|---|---|---|---|
| `slotId` | String | PK | Key: `slot_<deptSlug>_<date>_<startTime>` |
| `department` | String | Attribute | Department track name |
| `departmentSlug` | String | Index | Normalized department identifier |
| `date` | String | Index | Date string (`YYYY-MM-DD`) |
| `startTime` | String | Attribute | 24-hour start time (`HH:mm`) |
| `endTime` | String | Attribute | 24-hour end time (`HH:mm`) |
| `slotLabel` | String | Attribute | Formatted 12-hour label (`02:00 PM - 02:15 PM`) |
| `meetingLink` | String | Attribute | Google Meet URL or physical room coordinates |
| `isBooked` | Boolean | State / Index | Reservation status |
| `bookedByCandidateEmail`| String | FK / Index | Email of candidate who reserved the slot |
| `bookedAt` | Timestamp | Audit | ISO timestamp when reservation occurred |
| `createdAt` | Timestamp | Metadata | Creation ISO timestamp |

### 4.6. Collection: `mail_logs`
Audit log recording every transactional email dispatch.

| Field Name | Type | Key Type | Description |
|---|---|---|---|
| `logId` | String | PK | Unique identifier |
| `recipient` | String | Index | Recipient candidate email address |
| `subject` | String | Attribute | Subject line of the dispatched email |
| `round` | String | Attribute | Target recruitment round (`round1`, `round2`, `round3`, `broadcast`) |
| `decision` | String | Attribute | Decision outcome (`shortlisted`, `cleared`, `selected`, `rejected`) |
| `dispatchedBy` | String | Audit | Email of administrator who authorized dispatch |
| `status` | String | State | Delivery status (`sent`, `failed`, `dry_run`) |
| `timestamp` | Timestamp | Index | ISO timestamp of email dispatch |

### 4.7. Dual-Write Compatibility: `formData`
Maintains backward compatibility with legacy datatable components.
- `id` / `_id`: Matches `applicationId`.
- `Name`, `RegistrationNumber`, `Email`, `Phone`, `Gender`, `Year of Study`, `Department`: Mirrored fields.
- `Questions`: Map of sanitized keys to answers.
- `QuestionDetails`: Array of `{ key, question, answer }` objects.
- `shortlisted`: Boolean review state.
- `createdAt`: Timestamp.

---

## 5. Production Deployment and Infrastructure Specifications

The application is deployed to production on Vercel with the following infrastructure configuration:

- **Hosting Platform**: Vercel (Edge Network and Serverless Functions)
- **Node.js Target Version**: Node 20.x
- **Primary Database**: Google Cloud Firestore (Multi-Region / Production Instance)
- **Caching and Distributed Limiter**: Upstash Redis (Serverless Global REST Endpoint)
- **Email Gateway**: SMTP via Nodemailer with Connection Pooling
- **Identity Provider**: Google OAuth 2.0 Identity Platform (Restricted Institutional Scope)
- **Asset Delivery**: Next.js Edge CDN with WebP/AVIF Image Optimization and CSS Typography Loading
