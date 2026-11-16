# StackDrove CTMS — Enterprise Centralized Task Management System

A cloud-native, enterprise-grade Centralized Task Management System (CTMS) built with Next.js 16 (App Router & Turbopack), Tailwind CSS, Lucide icons, Supabase PostgreSQL, and Cloudinary zero-blob proof verification pipeline.

## 🚀 Key Features

- **Role-Based Workspace Governance**: Dual-rail navigation with discrete portal views for Superadmin, Company Admin, Delegator (Manager), Delegatee (Staff), and Executive Boss.
- **Task Delegation & Tracking Protocol**:
  - Interactive Kanban board with multi-stage Apple card elevation.
  - Interactive Table and List views with department, priority, and status filtering.
  - Multi-tier SLA deadline management and automated punctuality scoring.
- **Custom Recurrence Engine**:
  - Advanced cadence scheduling supporting daily, weekly (with day-of-week selection), monthly (by day of month or ordinal weekday, e.g., "2nd Saturday"), and annual recurrence.
  - Automated background cron spawning via `/api/cron/process`.
- **Automatic Department Auto-Fill**:
  - Assignee selection automatically detects and populates the assignee's assigned department.
- **Cloudinary Proof of Work Verification**:
  - File upload dropzone with signed delivery proof pipeline.
  - Verification queue requiring manager signoff before tasks can be completed.
- **Automated Multi-Channel Notifications**:
  - Instant dispatch via Resend/Google SMTP email and WhatsApp alerts.
- **Enterprise Design System**:
  - Strict high-contrast Inter typography, dark/light theme switching, and refined Apple-grade physics.

## 🛠️ Tech Stack

- **Framework**: Next.js 16.4 (App Router, Turbopack)
- **Styling**: Tailwind CSS with custom glassmorphic & Apple-grade elevation system
- **State Management**: React 19 Client & Server Components, Zustand
- **Database**: Supabase PostgreSQL with local DAL fallback
- **File Storage**: Cloudinary Signed Asset Pipeline
- **Notifications**: Server Actions with Resend & WhatsApp API

## 🏁 Getting Started

First, install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to explore the platform.
