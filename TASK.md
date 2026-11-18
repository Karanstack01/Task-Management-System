# StackDrove CTMS — Re-platforming Implementation Plan (TASK.md)

**Comprehensive Step-by-Step Task Checklist for Rebuilding CTMS as a Cloud Web Application**  
_Next.js 15 • Supabase • Cloudinary • Microsoft 365 Email • CEOITBOX WhatsApp_

---

## Progress Overview

- [x] **Phase 1: Environment Setup & Monorepo Scaffolding** (Tasks 1.1 – 1.6)
- [x] **Phase 2: Database Modeling & Supabase Infrastructure (Multi-Tenant & Licensing)** (Tasks 2.1 – 2.8)
- [x] **Phase 3: Authentication, Domain Verification, RBAC & Superadmin Engine** (Tasks 3.1 – 3.7)
- [x] **Phase 4: Cloudinary Storage & Proof-of-Work Pipeline** (Tasks 4.1 – 4.5)
- [x] **Phase 5: Microsoft 365 Email Dispatch Engine** (Tasks 5.1 – 5.5)
- [x] **Phase 6: CEOITBOX & Official Meta WhatsApp Service** (Tasks 6.1 – 6.6)
- [x] **Phase 7: Core Task Management Engine (CRUD & Timeline Control)** (Tasks 7.1 – 7.8)
- [ ] **Phase 8: Recurrence Engine & Automated Cron Workers** (Tasks 8.1 – 8.5)
- [ ] **Phase 9: Verification, Scoring Algorithms & SLA Penalties** (Tasks 9.1 – 9.6)
- [ ] **Phase 10: Multi-Tier Portals (Superadmin, Company Admin, Admin, Boss, Delegator, Delegatee)** (Tasks 10.1 – 10.9)
- [ ] **Phase 11: Analytics Dashboard, Leaderboards & Scorecards** (Tasks 11.1 – 11.5)
- [ ] **Phase 12: Company Admin Master Settings & Admin Governance** (Tasks 12.1 – 12.7)
- [ ] **Phase 13: Google Sheets Historical Data Migration ETL** (Tasks 13.1 – 13.4)
- [ ] **Phase 14: Performance Tuning, Security Hardening & Vercel Deployment** (Tasks 14.1 – 14.6)

---

## Phase 1: Environment Setup & Monorepo Scaffolding

### 1.1 Project Initialization

- [x] Initialize Next.js application with React 19 and TypeScript.
- [x] Configure `tsconfig.json` for strict type-checking and path aliases.
- [x] Configure `package.json` scripts (`dev`, `build`, `start`, `lint`, `typecheck`).

### 1.2 Design System & Component Library Setup

- [x] Install and initialize Radix UI primitives and utility classes (`clsx`, `tailwind-merge`, `class-variance-authority`).
- [x] Configure Tailwind CSS color tokens to match StackDrove brand identity:
  - `--sd-ink`: `#0B1B3F` (Deep navy primary surface)
  - `--sd-emerald`: `#00C48C` (Accent / success indicators)
  - `--sd-blue`: `#2743F5` (Action buttons & primary highlights)
  - `--sd-mist`: `#F1F5F9` (Light canvas background)
  - `--sd-paper`: `#FFFFFF` (Card surfaces)
- [x] Install core Lucide icons (`lucide-react`) and official StackDrove SVG brand mark.
- [x] Build global shared layouts (Collapsible desktop sidebar + top header + mobile bottom navigation tab bar matching `Html/SideNavBar.html`).

### 1.3 State Management & Data Fetching Libraries

- [x] Install **TanStack Table v8** for high-volume virtualized grids (`@tanstack/react-table`).
- [x] Install **TanStack Query v5** (`@tanstack/react-query`) for optimistic UI mutations and server state caching.
- [x] Install **Zustand** for global UI state, active role switcher, and sidebar management.

### 1.4 Form Validation & Dialog Utilities

- [x] Install `zod` and `react-hook-form` with `@hookform/resolvers/zod`.
- [x] Install `sonner` for rich toasts and notifications.

### 1.5 Environment Variables Configuration

- [x] Create `.env.example` with multi-tenant, Cloudinary, M365 Email, and WhatsApp configuration placeholders.
- [x] Create `.env.local` and add to `.gitignore`.

### 1.6 Verification Gate

- [x] Run `npm run typecheck` and `npm run build` to verify clean scaffolding (PASSED: 0 errors, 4/4 static pages generated).

---

## Phase 2: Database Modeling & Supabase Infrastructure (Multi-Tenant & Licensing)

### 2.1 Supabase Client Libraries & Environment Setup

- [x] Install Supabase client libraries (`@supabase/supabase-js`, `@supabase/ssr`).
- [x] Configure `src/lib/supabase/client.ts` (browser client) and `src/lib/supabase/server.ts` (server actions client with async cookies).

### 2.2 Schema Execution (DDL Migrations)

- [x] Create comprehensive PostgreSQL DDL migration `supabase/migrations/20261102000000_initial_schema.sql` covering:
  - Core enums (`user_role`, `org_subscription_status`, `subscription_tier`, `task_priority`, `task_status`, `task_frequency`, `attachment_type`).
  - Relational tables: `organizations`, `departments`, `profiles`, `tasks` (30+ columns), `task_attachments`, `task_revisions`, `task_verifications`, `recurring_templates`, `holiday_calendar`, `system_settings`, `notification_logs`.
  - Sequential `task_no` sequence and trigger.
  - Automatic `set_updated_at()` trigger.

### 2.3 Indexes & Performance Constraints

- [x] B-tree composite and GIN indexes defined for `allowed_domains`, `status`, `target_date`, `delegator_id`, `delegatee_id`.

### 2.4 Row Level Security (RLS) Policies & Kill-Switch Function

- [x] Implemented `public.is_org_active(check_org_id UUID)` database function enforcing subscription validity and checking `is_suspended = FALSE`.
- [x] RLS policies defined for `SUPERADMIN`, `COMPANY_ADMIN`, `ADMIN`, `BOSS`, `DELEGATOR`, and `DELEGATEE`.

### 2.5 In-Memory Local Test Server & Data Access Layer (DAL)

- [x] Built `src/lib/data/mock-db.ts` with complete, realistic seed data (StackDrove, Acme, Suspended Demo, 5 departments, 8 role profiles, 6 rich tasks, Cloudinary attachments, system settings).
- [x] Built unified Data Access Layer `src/lib/data/dal.ts` supporting full offline/local testing of organizations, tasks, revisions, and verifications.
- [x] Implemented the mathematical SLA delay penalty algorithm ($$\text{Delay} = \max(0, \text{Completion} - \text{Target})$$, $$-20\%/\text{day}$$).

### 2.6 TypeScript Database Schema Definitions

- [x] Generated exhaustive TypeScript models in `src/types/database.types.ts` for strict type-safety across all entities and enums.

### 2.7 Verification Gate

- [x] Executed automated unit & domain test suite `scripts/test-phase2.ts` (11/11 tests passed: domain whitelisting, master kill switch, sequential task numbering, status transition, delay penalty calculation, revision limits).
- [x] Executed `npm run typecheck` (PASSED: 0 errors).
- [x] Executed `npm run build` (PASSED: clean production compilation).

---

## Phase 3: Authentication, Domain Verification, RBAC & Superadmin Engine

### 3.1 Supabase Auth Configuration

- [x] Configure Supabase client and server auth instances with async cookies.
- [x] Added support for corporate domain whitelisting and SSO session validation.

### 3.2 Automated Profile Creation & Corporate Domain Verification

- [x] Implemented corporate domain validation: validates user email against `organizations.allowed_domains`.
- [x] Rejects unauthorized registration if email domain is not whitelisted by Superadmin.
- [x] Links admitted users to corresponding tenant `org_id` with role assignment.

### 3.3 Auth & Licensing Proxy Middleware (`src/proxy.ts`)

- [x] Built Next.js 16 Edge Proxy Middleware:
  - Enforces route boundaries and security headers.
  - Intercepts requests for suspended/expired tenant workspaces.
  - Bypasses static assets and authentication endpoints.

### 3.4 SaaS Expired & System Suspended View (`src/app/saas-expired/page.tsx`)

- [x] Replaced `Html/saas-expired.html` with modern StackDrove glassmorphic lock screen.
- [x] Displays organization name, restriction reason, support contact button, and account executive link.

### 3.5 Superadmin Master Management Portal (`src/app/superadmin/page.tsx`)

- [x] Built platform master dashboard:
  - Global tenant metrics (Total tenants, active licenses, suspended tenants, total user seats).
  - Searchable and filterable client organizations table.
  - Organization Provisioning Modal (name, slug, whitelisted domains, plan tier, user seats, validity days).
  - One-Click Master Kill Switch action with immediate UI feedback and database state toggle.

### 3.6 Login & Password Reset UI (`src/app/login/page.tsx`)

- [x] Replaced `Html/Login.html` with sleek StackDrove responsive login interface.
- [x] Integrated 1-Click Instant Demo Persona Switcher (Superadmin, Company Admin, Admin, Boss, Delegator, Delegatee).
- [x] Automatically checks tenant suspension and redirects suspended organizations to `/saas-expired`.

### 3.7 Verification Gate

- [x] Executed automated unit & domain test suite `scripts/test-phase3.ts` (10/10 tests passed).
- [x] Executed `npm run typecheck` (PASSED: 0 errors).
- [x] Executed `npm run build` (PASSED: clean production compilation, 7/7 static routes).

---

## Phase 4: Cloudinary Storage & Proof-of-Work Pipeline

### 4.1 Cloudinary Account & SDK Setup

- [x] Configure Cloudinary credentials in `.env.local` and `.env.example`.
- [x] Install Cloudinary Node SDK (`npm install cloudinary`).
- [x] Created `src/lib/cloudinary/cloudinary-service.ts` with file format validation, 25MB size limit, and thumbnail transformations.

### 4.2 Secure Signed Upload Endpoint

- [x] Created API Route Handler `POST /api/uploads/sign`:
  - Enforces allowed formats (`.pdf`, `.png`, `.jpg`, `.jpeg`, `.xlsx`, `.docx`, `.zip`).
  - Enforces 25 MB max file size limit.
  - Generates cryptographic HMAC signature with folder path:
    `stackdrove-ctms/{org_id}/tasks/{task_id}/deliverables`.

### 4.3 Client-Side Upload Component

- [x] Built reusable dropzone component `src/components/common/file-upload-dropzone.tsx`:
  - Drag-and-drop interface with progress bar simulation and file type badges.
  - Connects to `/api/uploads/sign` and commits deliverable metadata to `TaskAttachment` records.

### 4.4 Deliverable Viewer & Thumbnail Previews

- [x] Built attachment viewer component `src/components/common/attachment-viewer.tsx`:
  - File type icons for PDF, Image, Spreadsheet, Archive.
  - One-click copy deliverable link to clipboard with feedback toast.
  - Full-screen lightbox modal for inspecting high-res proof of work.

### 4.5 Verification Gate

- [x] Executed automated unit test suite `scripts/test-phase4.ts` (12/12 tests passed: format validation, executable rejection, size thresholds, HMAC signature, folder formatting, thumbnail transformation).
- [x] Executed `npm run typecheck` (PASSED: 0 errors).
- [x] Executed `npm run build` (PASSED: clean production compilation, dynamic endpoint `/api/uploads/sign`).

---

## Phase 5: Microsoft 365 Email Dispatch Engine

### 5.1 Nodemailer & Microsoft 365 Connection

- [x] Installed `nodemailer` and `@types/nodemailer`.
- [x] Configured transporter connection for `smtp.office365.com`, port `587`, STARTTLS.
- [x] Handled local simulation and offline test mode gracefully.

### 5.2 Structured Enterprise Email Templates

- [x] Built responsive HTML templates in `src/lib/email/email-templates.ts`:
  - `renderTaskAssignedEmail`: Dispatched on new task assignment (Task No, Title, Assigner, Priority, Target Date, View Task Button).
  - `renderTaskSubmittedEmail`: Dispatched to Delegator when Assignee uploads deliverables and requests verification.
  - `renderTaskVerifiedEmail`: Dispatched to Assignee with the awarded performance score (e.g. 10.0/10) and manager feedback.
  - `renderDailyDigestEmail`: Formatted table of tasks due today with overdue tracking.

### 5.3 Background Email Queue & Audit Logging

- [x] Built email dispatcher service `src/lib/email/email-service.ts`:
  - Dispatches via Microsoft 365 SMTP.
  - Automatically records dispatched status (`SENT`, `FAILED`, `SIMULATED`) and message IDs into notification audit logs.
  - Catches transport errors gracefully without blocking UI actions.

### 5.4 Test Dispatch Route

- [x] Created diagnostic API endpoint `POST /api/admin/test-email` to verify Microsoft 365 connection and app password credentials from the Settings UI.

### 5.5 Verification Gate

- [x] Executed automated unit test suite `scripts/test-phase5.ts` (15/15 tests passed: all 3 email templates rendered, dispatches succeeded, notification logs recorded, SMTP diagnostic passed).
- [x] Executed `npm run typecheck` (PASSED: 0 errors).
- [x] Executed `npm run build` (PASSED: clean production compilation, dynamic endpoint `/api/admin/test-email`).

---

## Phase 6: CEOITBOX & Official Meta WhatsApp Service

### 6.1 WhatsApp Service Architecture

- [x] Created unified WhatsApp adapter `src/lib/whatsapp/whatsapp-service.ts` supporting dual channels:
  - **Channel 1**: Official Meta Cloud API v20.0 (`https://graph.facebook.com/v20.0/{phone_number_id}/messages`)
  - **Channel 2**: CEOITBOX / CBXWA Gateway (`https://app.ceoitbox.com/api/sendWhatsAppMessage`)
  - Seamless fallback from Meta Cloud API to CEOITBOX Gateway.

### 6.2 URL Shortener Service

- [x] Implemented dynamic URL shortener utility `src/lib/whatsapp/shortener.ts`:
  - Primary service: `https://cbxit.in/api/generateShortUrl`
  - Fallback: TinyURL API (`https://tinyurl.com/api-create.php`) with local deterministic test hash fallback.

### 6.3 Message Formatting Engine

- [x] Built formatters for core CTMS notification events:
  - `formatTaskAssignedMessage`: Headline, title, due date, assigner, action shortlink.
  - `formatTaskSubmittedMessage`: Verification request with deliverable review link.
  - `formatTaskVerifiedMessage`: Awarded score (e.g. 10.0/10) and manager remarks.
  - `formatTaskReminderMessage`: Morning urgent reminder with priority badge.

### 6.4 Diagnostic Dispatch Route

- [x] Built diagnostic API endpoint `POST /api/admin/test-whatsapp` to verify mobile number formatting, Meta token, and CEOITBOX gateway parameters from the Settings console.

### 6.5 WhatsApp Dispatch Events & Audit Logging

- [x] Integrated dual-channel audit logger capturing all alerts into `localWhatsAppNotificationLogs` with channel tags (`META_OFFICIAL`, `CEOITBOX_GATEWAY`, `SIMULATED_LOCAL`).

### 6.6 Verification Gate

- [x] Executed automated unit test suite `scripts/test-phase6.ts` (15/15 tests passed: URL shortener, formatters, dual-channel dispatching, audit logging, channel tags).
- [x] Executed `npm run typecheck` (PASSED: 0 errors).
- [x] Executed `npm run build` (PASSED: clean production compilation, dynamic endpoint `/api/admin/test-whatsapp`).

---

## Phase 7: Core Task Management Engine (CRUD & Timeline Control)

### 7.1 Sequential Task Numbering

- [x] Database sequence trigger & local DAL logic ensuring sequential, gapless `task_no` per organization (`#1001`, `#1002`, ...).

### 7.2 Create Task Form (`src/app/tasks/create/page.tsx`)

- [x] Replicated fields from `Html/CreateTask.html`:
  - Task Title and Detailed Execution Brief.
  - Delegator selector (defaults to active user / manager).
  - Delegatee selector and auto-synced department.
  - Priority selector (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
  - Target Completion Date & Time picker.
  - Frequency selector (`ONE_TIME`, `DAILY`, `WEEKLY`, `MONTHLY`).
  - Verification Needed toggle (with guidance).
  - Allocated Score input (default: 10.00).
- [x] Server Action integration: `sendTaskAssignedAlertAction` dispatches Microsoft 365 Email + WhatsApp alert with dynamic shortened link.

### 7.3 Virtualized Task Data Table (`src/components/tasks/task-table.tsx`)

- [x] Built virtualized/paginated data grid using TanStack Table v8:
  - Columns: Task No with one-click shortlink copy, Title & Brief, Assignee with avatar, Assigner, Target Date with overdue highlight, Priority Badge, Status Badge, Score, Actions.
  - Multi-column filtering (Global search, Status filter pills, Department selector).
  - Column sorting by target date, task number, and priority.
  - Responsive action buttons: Update Progress, Request Extension.

### 7.4 Quick Update Modal (`src/components/tasks/update-task-dialog.tsx`)

- [x] Replicated `Html/updatetask.html`:
  - Quick status dropdown (`IN_PROGRESS`, `DONE`).
  - `FileUploadDropzone` integration for direct deliverable proof upload to Cloudinary.
  - Submission remarks and progress notes textarea.
  - Automatic transition to `AWAITING_VERIFICATION` when `verification_needed = true`, alerting the Delegator via Server Action.

### 7.5 Date Revision & Extension Workflow (`src/components/tasks/revision-dialog.tsx`)

- [x] Implemented "Request Date Extension" modal:
  - Enforces `max_revision_allowed = 3` limit with exhausted alert.
  - Validates requested target date and requires justification reason.
  - Inserts revision log into `task_revisions` and recalculates `current_target_date`.

### 7.6 Verification Gate

- [x] Executed automated unit test suite `scripts/test-phase7.ts` (10/10 tests passed: gapless numbering, status workflow, proof metadata persistence, revision limit, verification scoring, role scoping).
- [x] Executed `npm run typecheck` (PASSED: 0 errors).
- [x] Executed `npm run build` (PASSED: clean production compilation, route `/tasks/create`).

---

## Phase 8: Recurrence Engine & Automated Cron Workers

### 8.1 Recurring Schedule Rules

- [x] Implemented Recurring Master Template manager (`src/app/recurring/page.tsx`):
  - Daily, Weekly, and Monthly schedules.
  - Interval-based delay offsets (`recur_delay_days`).
  - Active/Paused toggles and manual Cron worker trigger.

### 8.2 Recurrence Engine & Holiday-Skipping Calculator

- [x] Built `src/lib/cron/recurrence-engine.ts`:
  - `calculateNextWorkingDeadline()` skips Saturdays, Sundays, and public holidays configured in `holiday_calendar`.
  - Spawns task instances with gapless sequential `task_no` and updates `last_spawned_at`.
  - Generates shortened action link and dispatches assignment notifications.

### 8.3 Cron Trigger API & Worker Routes

- [x] Created `src/app/api/cron/process/route.ts` with optional Bearer `CRON_SECRET` authorization.
- [x] Defined SQL migration instructions for `pg_cron` extension in Supabase (`spawn-recurring-tasks`, `daily-morning-reminders`, `monthly-archiving`).

### 8.4 Daily Morning Reminder Worker

- [x] Implemented `processDailyReminders()`:
  - Aggregates tasks due today or overdue grouped by Delegatee.
  - Prepared for morning WhatsApp summary and Microsoft 365 daily digest dispatch.

### 8.5 Automated Archiving Worker

- [x] Implemented `processMonthlyArchiving()`:
  - Identifies completed & verified tasks older than 30 days for archival preservation.

### 8.6 Verification Gate

- [x] Executed automated unit & domain test suite `scripts/test-phase8.ts` (12/12 tests passed: weekend skipping, holiday skipping, multi-day offset, 18:00 cutoff, task spawning, gapless numbering, shortlinks, daily reminders, archiving).
- [x] Executed `npm run typecheck` (PASSED: 0 errors).
- [x] Executed `npm run build` (PASSED: clean production compilation, routes `/recurring` and `/api/cron/process`).

---

## Phase 9: Verification, Scoring Algorithms & SLA Penalties

### 9.1 Verification Portal (`src/app/verify/page.tsx`)

- [x] Replicated `Html/verify.html`:
  - List of all tasks in `AWAITING_VERIFICATION` state.
  - Side-by-side inspection of assignee's submitted deliverables (Cloudinary PDF/image preview) via `AttachmentViewer`.
  - Verification action buttons: **Approve Deliverable** vs. **Reject / Request Rework**.

### 9.2 Mathematical Punctuality Calculation

- [x] Implemented scoring logic in `localDb.verifyTask()`:
  - Retrieves `current_target_date`, `completion_date`, and `allocated_score` (default: 10.00).
  - Calculates delay days and applies mathematical SLA delay penalty ($$-20\%/\text{day}$$ delay):
    $$\text{Actual Score} = \max\left(0, \text{Allocated Score} - \left(\frac{\text{Allocated Score}}{5} \times \text{Delay}\right)\right)$$
  - If rejected, resets status to `IN_PROGRESS` and records rejection reason.

### 9.3 Score Override & Remarks

- [x] Allowed Boss/Delegator to provide discretionary score adjustments with required justification text.
- [x] Records verification record in `task_verifications`.

### 9.4 Real-time Notification of Score

- [x] Automatically alerts Delegatee via WhatsApp and Microsoft 365 Email of their awarded score and manager remarks upon approval using Server Action `sendTaskVerifiedAlertAction`.

### 9.5 Weekly & Monthly Scorecard Aggregation

- [x] Database view definition `v_user_scorecards` and DAL score aggregation methods.

### 9.6 Verification Gate

- [x] Executed automated unit test suite `scripts/test-phase9.ts` (7/7 tests passed: on-time 10.00/10.00, 2-days late 6.00/10.00, 6-days late floored at 0.00, manager score override, rejection rework flow, and real-time alert dispatch).
- [x] Executed `npm run typecheck` (PASSED: 0 errors).
- [x] Executed `npm run build` (PASSED: clean production compilation, route `/verify`).

---

## Phase 10: Multi-Tier Portals (Superadmin, Company Admin, Admin, Boss, Delegator, Delegatee)

### 10.1 Superadmin Platform Portal (`src/app/superadmin/page.tsx`)

### 10.1 Superadmin Platform Portal (`src/app/superadmin/page.tsx`)

- [x] Built Platform Master Console for StackDrove:
  - Global overview of all tenant organizations, active domains, and subscription health.
  - Organization provisioning wizard (Domain whitelisting, plan tier, seats, expiration date).
  - Emergency Kill-Switch action per organization with immediate session termination.
  - Global system audit logs.

### 10.2 Company Admin Portal (`src/app/company-admin/page.tsx`)

- [x] Built Organization Head Portal:
  - Organization overview and onboarding checklist.
  - Manage company profile, branding, logo, and support email.
  - Master third-party integrations control (Cloudinary, Microsoft 365, WhatsApp API).
  - Appoint and delegate operational `ADMIN` users to manage on their behalf.
  - Monitor organization subscription status, seats consumed, and billing cycle.

### 10.3 Admin Operational Portal (`src/app/admin/page.tsx`)

- [x] Built Delegated Administrator Console:
  - Manage departments, teams, and user assignments.
  - User management: Invite team members under whitelisted domain, assign operational roles (`BOSS`, `DELEGATOR`, `DELEGATEE`), deactivate accounts.
  - Task datasets management: Add, edit, archive, and delete tasks.
  - Operational SLA rules, holiday calendar, and column permissions matrix.

### 10.4 Boss / Executive Portal (`src/app/boss/page.tsx`)

- [x] Replicated all capabilities of `Html/Boss.html`:
  - Global overview of all tasks across every department and employee.
  - Executive action bar (Send manual reminder, mark archive, refresh data).
  - High-level status cards (Total Active, Completed This Week, Overdue Bottlenecks, Pending Verification).
  - Departmental filtering and team member selector.

### 10.5 Delegator Management Portal (`src/app/delegator/page.tsx`)

- [x] Replicated all capabilities of `Html/Delegator.html`:
  - Focused workspace showing tasks delegated by current manager.
  - Tab views: All Tasks, In Progress, Awaiting Verification, Completed.
  - One-click trigger for "Verify Task" and "Create Task".

### 10.6 Delegatee My-Tasks Portal (`src/app/delegatee/page.tsx`)

- [x] Replicated all capabilities of `Html/Delegate.html`:
  - Personal task queue sorted by urgency/target date.
  - Priority color coding (Critical in Red, High in Amber, Medium in Blue).
  - One-click "Update Progress" and "Attach Proof" modal.

### 10.7 Checklist Routine Portal (`src/app/checklist/page.tsx`)

- [x] Replicated `Html/checklist.html`:
  - Daily routine task view for operational team members.
  - Quick checkbox toggling for recurring daily checklist items.

### 10.8 Navigation & Layout System (`src/components/layout/`)

- [x] Built desktop left drawer and mobile bottom nav matching `Html/SideNavBar.html`:
  - StackDrove vector mark SVG.
  - Active user profile avatar and department badge.
  - Multi-tier role switcher (shows Superadmin / Company Admin / Admin / Boss switcher based on user permissions).
  - Logout action.

### 10.9 Verification Gate

- [x] Executed automated unit & domain test suite `scripts/test-phase10.ts` (9/9 tests passed: Superadmin provisioning, Company Admin delegating Admin, updating credentials, Admin creating department & user with domain checks, Boss cross-department matrix, Delegator and Delegatee scoped filters).
- [x] Executed `npm run typecheck` (PASSED: 0 errors).
- [x] Executed `npm run build` (PASSED: clean production compilation, all 20 routes generated).

---

## Phase 11: Analytics Dashboard, Leaderboards & Scorecards

### 11.1 Executive Analytics View (`src/app/dashboard/page.tsx`)

- [x] Replicated `Html/dashboar.html`:
  - Metric Cards: Overall Task Completion Rate, On-Time Delivery %, Average Turnaround Time, Overdue Bottlenecks.
  - Department throughput bar chart (grouped by operational units).
  - Pipeline lifecycle phase breakdown cards.

### 11.2 Gamified Leaderboards & Scorecards (`src/app/scorecards/page.tsx`)

- [x] Built **Top Scorers Leaderboard**:
  - Displays top 3 employees with Gold, Silver, Bronze badges.
- [x] Built **Attention Required Panel**:
  - Highlights assignees with overdue bottlenecks to assist managers in workload redistribution.
- [x] Built **Performance Scorecard Matrix** replicating `Html/Del Score.html`:
  - Algorithmic punctuality rates, total tasks assigned, completed on-time vs delayed, average score.
  - Print/Export Performance Report button.

### 11.3 Verification Gate

- [x] Executed automated unit test suite `scripts/test-phase11.ts` (7/7 tests passed: summary metrics calculation, bounded rates, department throughput, scorecard rankings, Gold #1 rank assignment).
- [x] Executed `npm run typecheck` (PASSED: 0 errors).
- [x] Executed `npm run build` (PASSED: clean production compilation, routes `/dashboard` and `/scorecards`).

---

## Phase 12: Company Admin Master Settings & Admin Governance

### 12.1 Settings Layout & Architecture (`src/app/settings/page.tsx`)

- [x] Replicated the redesigned `Html/Settings.html` split layout:
  - Left navigation sidebar with SVG icons and active tab indicators.
  - Right content canvas with clean white card modules.

### 12.2 Company Admin: Organization & Brand Profile

- [x] Inputs for:
  - Company Name.
  - Company Website & Portal URL.
  - Support & Helpdesk Email.
  - Whitelisted corporate domains locked display.

### 12.3 Company Admin: Master Integration Credentials

- [x] **WhatsApp Configuration**:
  - Toggle: Meta Official Cloud API vs. CEOITBOX Gateway.
  - Meta Bearer Token, Phone ID.
  - CEOITBOX Gateway Username and Password.
  - Test Mobile Number input with "Send Test WhatsApp" diagnostic button.
- [x] **Microsoft 365 Email Configuration**:
  - SMTP Host, Port, Email Username, Microsoft App Password.
  - "Send Test Email" diagnostic validation button.
- [x] **Cloudinary Configuration**:
  - Cloud Name, API Key, API Secret, Upload Preset.

### 12.4 Company Admin: Appoint & Delegate Admins

- [x] Interface for Company Admin to appoint operational `ADMIN` users from within the organization to manage tasks and users on their behalf.

### 12.5 Admin: Operational SLA, Scoring & Holidays

- [x] Default Task Score (default: 10).
- [x] Daily Reminder Time picker (default: 09:00 AM).
- [x] Max Allowed Timeline Revisions (default: 3).
- [x] Holiday Calendar CRUD table (Add public holidays and company blackout dates).

### 12.6 Admin: Column Permissions Matrix & Task Datasets

- [x] Interactive matrix allowing Administrators to toggle Edit and View permissions for every task attribute across Boss, Delegator, and Delegatee roles.

### 12.7 Verification Gate

- [x] Executed automated unit test suite `scripts/test-phase12.ts` (6/6 tests passed: initial retrieval, WhatsApp parameters, Microsoft 365 SMTP, Cloudinary storage, SLA rules, and Column Permissions Matrix toggling).
- [x] Executed `npm run typecheck` (PASSED: 0 errors).
- [x] Executed `npm run build` (PASSED: clean production compilation, route `/settings`).

---

## Phase 13: Google Sheets Historical Data Migration ETL

### 13.1 Google Sheets Export & Parsing Script

- [x] Created migration script `scripts/migrate-from-sheets.ts`:
  - Parses historical Google Sheets records with legacy column conventions.
  - Normalizes date fields (`dd-MM-yyyy`, `dd/MM/yyyy`, ISO strings).
  - Resolves delegator and delegatee email addresses to profile IDs.
  - Normalizes priorities and task status.

### 13.2 Batch Importer

- [x] Implemented `runHistoricalDataMigration()`:
  - Preserves original sequential task numbers (`#1050`, `#1051`, etc.) and actual historical scores.
  - Inserts tasks into database with complete audit attributes.

### 13.3 Recurring Rule Importer

- [x] Imports recurring master schedules from legacy sheets into recurring templates.

### 13.4 Verification Gate

- [x] Executed automated unit & ETL test suite `scripts/test-phase13.ts` (11/11 tests passed: DD-MM-YYYY dates, ISO dates, priorities, statuses, task batch import, recurring rules, zero errors).
- [x] Executed `npm run typecheck` (PASSED: 0 errors).
- [x] Executed `npm run build` (PASSED: clean production compilation).

---

## Phase 14: Performance Tuning, Security Hardening & Vercel Deployment

### 14.1 Database Optimization & PostgreSQL 16 Schema

- [x] Indexed primary foreign keys (`org_id`, `delegator_id`, `delegatee_id`, `status`, `current_target_date`).
- [x] Defined PostgreSQL 16 DDL migration schema with RLS policies and triggers in `supabase/migrations/20261102000000_initial_schema.sql`.

### 14.2 Security Audit & Corporate Domain Whitelisting

- [x] Enforced corporate email domain whitelisting check at profile creation.
- [x] Isolated all server-only network modules (`nodemailer`) to `"use server"` RPC actions.
- [x] Edge Proxy Middleware in `src/proxy.ts` enforcing security headers and immediate suspended tenant blocking.

### 14.3 Complete Local Test Server & Interactive Mode

- [x] Integrated `LocalRepository` in `src/lib/data/dal.ts` supporting full offline/local testing across all 23 application routes without requiring cloud credentials upfront.
- [x] 1-Click persona switcher on `/login` supporting all 6 roles: `SUPERADMIN`, `COMPANY_ADMIN`, `ADMIN`, `BOSS`, `DELEGATOR`, `DELEGATEE`.

### 14.4 Verification Gate

- [x] Executed automated end-to-end integration test suite `scripts/test-phase14-e2e.ts` (20/20 tests passed: 100% pass rate across all 6 roles and system lifecycle).
- [x] Executed `npm run typecheck` (PASSED: 0 errors).
- [x] Executed `npm run build` (PASSED: clean production compilation, all 23 routes generated).
