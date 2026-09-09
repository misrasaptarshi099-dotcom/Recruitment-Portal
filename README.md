# GDG on Campus Recruitment Portal

**[Project Overview (README)](./README.md)** | **[Technical Specification & Architecture (WORK.md)](./WORK.md)**

Live Deployment: https://recruitment-portal-liart.vercel.app

A modern, full-stack recruitment platform engineered for Google Developer Groups (GDG) on Campus. The system powers end-to-end candidate lifecycle management across twelve technical and creative tracks, featuring a three-round progressive evaluation pipeline, role-based access control, distributed rate limiting, and automated communication dispatch.

---

## Table of Contents

- [Overview](#overview)
- [Technical Architecture (WORK.md)](./WORK.md)
- [Live Deployment](#live-deployment)
- [System Architecture](#system-architecture)
- [User Roles and Permissions](#user-roles-and-permissions)
- [Recruitment Pipeline Stages](#recruitment-pipeline-stages)
- [Key Features](#key-features)
  - [Department Explorer and Dynamic Deadline Enforcement](#department-explorer-and-dynamic-deadline-enforcement)
  - [Offline Draft Persistence and Network Resilience](#offline-draft-persistence-and-network-resilience)
  - [Custom Questionnaires and Task Management](#custom-questionnaires-and-task-management)
  - [Interview Slot Scheduling Engine](#interview-slot-scheduling-engine)
  - [Central Mailer and Communication Engine](#central-mailer-and-communication-engine)
  - [Distributed Sliding-Window Rate Limiting](#distributed-sliding-window-rate-limiting)
  - [Gamified Candidate Experience](#gamified-candidate-experience)
- [Security and Compliance](#security-and-compliance)
- [Technical Stack](#technical-stack)
- [Environment Configuration](#environment-configuration)
- [Installation and Local Setup](#installation-and-local-setup)
- [Testing and Verification](#testing-and-verification)

---

## Overview

The portal automates and structures university chapter recruitment, replacing manual spreadsheets and disparate forms with a unified web application. The platform handles candidate discovery, institutional authentication, multi-track application submission, screening reviews, take-home task evaluations, interview scheduling, and transactional notification broadcasts.

---

## Live Deployment

The production deployment is hosted on Vercel:
https://recruitment-portal-liart.vercel.app

All public routes (track explorer, deadlines API, sign-in) are globally accessible. Candidate submissions and profile views require institutional authentication. Administrative panels require designated role clearances.

---

## System Architecture

The application is built on Next.js App Router with React Server Components and dynamic route handlers:

- **Presentation Layer**: React 18, Tailwind CSS, Framer Motion, Lucide icons, and custom pixel/terminal design system primitives.
- **API and Middleware Layer**: Next.js Route Handlers enforcing IP-based sliding window rate limits, session validation, and role-based request guards.
- **Authentication**: Better Auth with Google OAuth integration, enforcing an institutional domain restriction (@vitstudent.ac.in).
- **Data Persistence**: Google Cloud Firestore as the primary document store, structured in Boyce-Codd Normal Form (BCNF) principles.
- **Distributed Caching and Limiting**: Upstash Redis running atomic Lua scripts for cluster-wide rate limiting and sub-millisecond configuration caching.
- **Client Storage**: IndexedDB draft engine with localStorage fallback for client-side form persistence.
- **Communications**: Node.js central mailer with SMTP connection pooling and dry-run safety modes.

---

## User Roles and Permissions

The portal implements strict Role-Based Access Control (RBAC) with three distinct operational roles:

### 1. Candidate
- Institutional domain lock: Sign-in requires an active institutional Google account (@vitstudent.ac.in).
- Track exploration: Access the interactive Department Trees explorer to inspect descriptions, technical stacks, and prerequisites for 12 departments.
- Multi-track application: Select up to two distinct department tracks per recruitment cycle.
- Draft persistence: Automatically autosave essay answers and details locally during typing, even when offline.
- Real-time status tracking: Monitor Round 1 (Screening), Round 2 (Task Assignment), and Round 3 (Interview) statuses from the candidate profile dashboard.
- Self-service scheduling: Book 15-minute interview time slots when invited to Round 3.
- Interactive terminal: Play the integrated Chrome Dino runner mini-game with score tracking and competitive rank tiers.

### 2. Department Manager
- Department-scoped administrative privileges: Managers have access restricted strictly to their assigned department or departments.
- Application filtering: Review candidates, filter by evaluation status (Pending, Shortlisted, Cleared, Rejected), and search by registration number, name, or email.
- Response review: Inspect structured questionnaire responses, portfolio links, and submission timestamps.
- Questionnaire customization: Edit, reorder, or add custom screening questions for their assigned department track.
- Round 2 task authoring: Configure department-specific task briefs, instruction guidelines, resource links (Google Drive, Figma, GitHub, Notion), and Round 2 submission deadlines.
- Task evaluation: Review candidate task links, enter evaluation feedback, and record advancement decisions.
- Interview slot generation: Define daily interview windows (start time and end time) to generate contiguous 15-minute candidate booking slots.
- Decision locking and mailing: Review candidate outcomes and dispatch official notification emails with send-state locking to prevent post-dispatch modifications.
- Boundary enforcement: Any administrative API request targeting an unassigned department returns HTTP 403 Forbidden.

### 3. Super Administrator
- Unrestricted system oversight: Full management across all 12 departments and global configurations.
- Role management console: Assign or revoke Department Manager privileges and configure department assignment scopes.
- Global deadline configuration: Configure chapter-wide Round 1 screening cutoffs and Round 2 task deadlines.
- Mass broadcast messaging: Dispatch batch announcements and programmatic email broadcasts to segmented candidate cohorts.
- Account maintenance: Audit active sessions, revoke access, and purge non-institutional or unauthorized accounts.

---

## Recruitment Pipeline Stages

```
[Candidate Track Selection]
           │
           ▼
[Round 1: Screening Application]
    ├── Essay Questions & Technical Questionnaire
    ├── Client-Side Autosave & Real-Time Deadline Guard
    └── Administrator Review & Shortlisting
           │
           ├── (Rejected) ──> [Notification Email]
           ▼ (Shortlisted)
[Round 2: Technical & Creative Task]
    ├── Custom Department Problem Statement & Task Brief
    ├── Candidate Deliverable URL Submission
    └── Department Manager Grading & Task Clearance
           │
           ├── (Rejected) ──> [Notification Email]
           ▼ (Cleared)
[Round 3: Technical & Personal Interview]
    ├── 15-Minute Contiguous Slot Generation
    ├── Candidate Self-Service Slot Reservation
    ├── Live Panel Evaluation & Scorecard
    └── Final Decision (Selected / Not Selected)
           │
           ▼
[Official Offer / Decision Notification Email]
```

---

## Key Features

### Department Explorer and Dynamic Deadline Enforcement
- **Interactive Dual Trees**: Visual representation dividing seven technical tracks (Web Dev, App Dev, Data Science, Cloud and DevOps, Blockchain, Game Dev, Competitive Programming) and five non-technical tracks (Design, UI/UX, Management, Publicity, Outreach).
- **Public Deadlines API (`/api/deadlines`)**: Serves cached deadline timestamps and closed status flags with a 5-minute Redis TTL and automatic invalidation on administrative updates.
- **Real-Time UI Badging**: When a department's Round 1 cutoff date passes:
  - The department card displays an `APPLICATIONS CLOSED` tag.
  - The card is disabled from pointer and keyboard selection.
  - Expired tracks are automatically removed from existing selections.
  - The "Proceed to Form" button remains disabled until at least one valid, open track is chosen.
- **Server-Side Guard**: Direct navigation to `/join/[...joinIds]` verifies track deadlines, rendering a dedicated "Applications Closed" state if deadlines have passed. Submission endpoints return HTTP 403 Forbidden for expired tracks.

### Offline Draft Persistence and Network Resilience
- **IndexedDB Draft Queue**: Form responses are automatically synced to an IndexedDB store with a fallback to localStorage.
- **Debounced Updates**: Typing triggers debounced writes to minimize local storage wear while preventing data loss on accidental tab closure.
- **Network Status Bar**: Detects browser online and offline transitions (`navigator.onLine`), displaying visual connectivity indicators and re-triggering draft saves upon reconnecting.

### Custom Questionnaires and Task Management
- **Dynamic Question Schemas**: Administrators can customize questions per department via `/api/admin/questions`. Custom questions seamlessly overlay baseline questionnaire defaults.
- **Safe Input Normalization**: Form field names and question identifiers are sanitized to alphanumeric snake_case to preserve normalization standards.
- **Round 2 Task Publisher**: Managers configure task briefs and reference URLs with validation ensuring all links use valid HTTP/HTTPS schemes.

### Interview Slot Scheduling Engine
- **Cumulative 15-Minute Generation**: Computes contiguous 15-minute booking slots from administrative time ranges (for example, 14:00 to 17:00 generates twelve distinct slots).
- **Atomic Booking**: Candidates choose from available unreserved slots. Double-booking is prevented through server-side concurrency controls.
- **Meeting Information Delivery**: Booking confirmations provide candidates with their scheduled slot time, assigned department, and Google Meet or room coordinates.

### Central Mailer and Communication Engine
- **Branded Notification Templates**: Formats responsive HTML emails with GDG on Campus styling, preheaders, clear action buttons, and sign-offs.
- **Multi-Stage Decision Notifications**: Specialized email templates for Round 1 Shortlist, Round 1 Rejection, Round 2 Clearance, Round 2 Rejection, and Round 3 Final Acceptance.
- **Decision State Locking**: Once an official decision email is dispatched, candidate decision statuses are locked against accidental modification to guarantee communication integrity.
- **Dry-Run Safety**: When SMTP credentials are not configured in local development, the mailer safely logs formatted dispatch previews without failing.

### Distributed Sliding-Window Rate Limiting
- **Redis Sorted Set Algorithm**: Implemented via Upstash Redis REST using an atomic Lua script (`lib/rate-limit.ts`). Each request logs a millisecond timestamp in a sorted set, prunes expired entries, and computes current velocity.
- **Standardized Headers**: Returns HTTP 429 Too Many Requests along with standard `Retry-After` headers when thresholds are exceeded.
- **Endpoint-Specific Windows**:
  - Email dispatch: 5 requests per 10 minutes.
  - Form submission: 5 requests per 5 minutes.
  - Admin management endpoints: 30 requests per minute.
  - Public configuration and deadline checks: 60 requests per minute.

### Gamified Candidate Experience
- **Terminal Runner (GDG Dino)**: Integrated desktop and mobile compatible endless runner styled with GDG brand colors.
- **Atomic High Score Updates**: Preserves top scores and tracks cumulative games played via Firestore transactions.
- **Rank Tiering System**: Maps candidate scores across progressive tiers (Cadet, Operator, Specialist, Vanguard, Architect, Master).

---

## Security and Compliance

- **Domain Isolation**: Restricts authentication strictly to institutional emails ending in `@vitstudent.ac.in`. Non-institutional authentications are blocked.
- **XSS and Injection Mitigation**: All candidate text inputs and deliverable URLs are processed through sanitization filters before database persistence.
- **Serverless Secrets Isolation**: All third-party credentials, database keys, and tokens remain isolated on the server runtime and are never exposed to client bundles.
- **Session Integrity**: API handlers validate session cookies through Better Auth middleware before fulfilling privileged requests.

---

## Technical Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, Server Components) |
| Runtime | Node.js (v18+) |
| Language | JavaScript (ES2022) / TypeScript |
| Styling | Tailwind CSS, Framer Motion, Vanilla CSS Modules |
| Database | Google Cloud Firestore |
| Cache & Rate Limiter | Upstash Redis (REST API, Lua Scripting) |
| Authentication | Better Auth, Google Identity Services |
| Email Dispatch | Nodemailer (SMTP Connection Pooling) |
| Form Validation | React Hook Form, Zod |
| Icons & UI Components | Lucide React, Material Symbols SVG, Radix UI Primitives |
| Local Client Storage | IndexedDB (idb-keyval), LocalStorage |

---

## Environment Configuration

Create a `.env.local` file in the project root containing the necessary configuration variables. Do not commit `.env.local` to source control.

```bash
# Application URLs
NEXT_PUBLIC_APP_URL="http://localhost:3000"
BETTER_AUTH_URL="http://localhost:3000"

# Authentication (Better Auth)
BETTER_AUTH_SECRET="your-32-character-random-secret"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"

# Google Cloud Firestore
FIRESTORE_PROJECT_ID="your-gcp-project-id"
FIRESTORE_CLIENT_EMAIL="your-service-account@your-gcp-project-id.iam.gserviceaccount.com"
FIRESTORE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Upstash Redis (Distributed Rate Limiting & Edge Caching)
UPSTASH_REDIS_REST_URL="https://your-database-id.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-rest-token"

# SMTP Mailer (Optional in local development; enables live email dispatch)
EMAIL_SERVICE="gmail"
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USERNAME="chapter-email@gmail.com"
EMAIL_PASSWORD="your-app-specific-password"
EMAIL_FROM="GDG on Campus <chapter-email@gmail.com>"
```

---

## Testing and Verification

The repository includes comprehensive automated test suites covering normalization, access controls, rate limiting, and candidate lifecycle progression:

### Run All Unit and Integration Tests
```bash
npm test
```
Executes:
- Boyce-Codd Normal Form response sanitization and storage checks (`bcnf.test.js`).
- Role-based access control, institutional domain locks, and XSS sanitization (`security.test.js`).
- Edge CDN caching, questions filtering, and offline draft queue resolution (`caching-and-draft.test.js`).
- Three-round state transitions, interview slot generation, and deadline resolvers (`profile-and-task.test.js`).
- Department questionnaires and task configuration merges (`questionnaire-and-task-config.test.js`).

### Run Upstash Redis Rate Limiting Verification
```bash
npm run test:upstash
```
Validates:
- Live REST connectivity and pipeline execution to Upstash Redis.
- Sliding window velocity evaluation and 429 Too Many Requests enforcement.
- Active key TTL expiration and database cleanup.
- Real-time HTTP endpoint throttling on port 3000.

### Code Quality and Build Checks
```bash
# Run Next.js linter
npm run lint

# Compile optimized production bundle
npm run build
```