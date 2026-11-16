export type UserRole =
  | "SUPERADMIN"
  | "COMPANY_ADMIN"
  | "ADMIN"
  | "BOSS"
  | "DELEGATOR"
  | "DELEGATEE";

export type OrgSubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "PAST_DUE"
  | "SUSPENDED"
  | "EXPIRED"
  | "CANCELLED";

export type SubscriptionTier =
  | "STARTER"
  | "PROFESSIONAL"
  | "ENTERPRISE"
  | "CUSTOM";

export type TaskPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

/**
 * Stored task lifecycle states.
 * NOTE: "OVERDUE" is kept only for compatibility with the Postgres enum and legacy rows.
 * Overdue-ness is DERIVED (see isTaskOverdue in task-utils) and is never written as a status;
 * legacy "OVERDUE" rows are normalized to "IN_PROGRESS" by the task state machine.
 */
export type TaskStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "AWAITING_VERIFICATION"
  | "DONE"
  | "CANCELLED"
  | "OVERDUE";

/** Lifecycle of a deadline extension request (task_revisions.status). */
export type RevisionStatus = "PENDING" | "APPROVED" | "AUTO_APPROVED" | "REJECTED";

/** Delivery state of an outbound notification (notification_logs.status). */
export type NotificationDeliveryStatus = "QUEUED" | "SENT" | "FAILED" | "SIMULATED";

export type TaskFrequency =
  | "ONE_TIME"
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "CUSTOM_INTERVAL";

export type AttachmentType =
  | "PROOF_OF_WORK"
  | "BRIEF_DOCUMENT"
  | "REVISION_JUSTIFICATION";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  website_url?: string | null;
  support_email: string;
  allowed_domains: string[];
  primary_contact_email: string;
  subscription_plan: SubscriptionTier;
  subscription_status: OrgSubscriptionStatus;
  subscription_started_at: string;
  subscription_expires_at: string;
  max_users: number;
  is_suspended: boolean;
  suspended_at?: string | null;
  suspension_reason?: string | null;
  /** Subscription status to restore when the kill switch is lifted. */
  pre_suspension_status?: OrgSubscriptionStatus | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  org_id: string;
  name: string;
  code?: string | null;
  head_user_id?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  org_id?: string | null;
  department_id?: string | null;
  full_name: string;
  email: string;
  phone_number?: string | null;
  role: UserRole;
  is_primary_owner: boolean;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  department?: Department;
  organization?: Organization;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  uploaded_by?: string | null;
  cloudinary_public_id: string;
  file_url: string;
  file_name: string;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  attachment_type: AttachmentType;
  created_at: string;
}

export interface TaskRevision {
  id: string;
  task_id: string;
  requested_by: string;
  previous_target_date: string;
  new_target_date: string;
  reason: string;
  approved_by?: string | null;
  status: RevisionStatus;
  created_at: string;
}

export interface TaskVerification {
  id: string;
  task_id: string;
  verified_by: string;
  status_awarded: TaskStatus;
  score_awarded: number;
  feedback_notes?: string | null;
  verified_at: string;
}

export interface Task {
  id: string;
  task_no: number;
  org_id: string;
  title: string;
  description?: string | null;
  delegator_id: string;
  delegatee_id: string;
  department_id?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  frequency: TaskFrequency;

  // Timeline
  start_date: string;
  initial_target_date: string;
  current_target_date: string;
  completion_date?: string | null;
  revision_count: number;
  max_revision_allowed: number;

  // Verification & Scoring
  verification_needed: boolean;
  is_verified: boolean;
  verified_by?: string | null;
  verified_at?: string | null;

  allocated_score: number;
  actual_score: number;
  delay_days: number;
  score_remarks?: string | null;

  short_link?: string | null;
  recurring_template_id?: string | null;
  /** Set by the monthly archiving worker; archived tasks are hidden from default listings. */
  archived_at?: string | null;

  created_at: string;
  updated_at: string;

  // Joined relations
  delegator?: Profile;
  delegatee?: Profile;
  department?: Department;
  attachments?: TaskAttachment[];
  revisions?: TaskRevision[];
}

export interface RecurringTemplate {
  id: string;
  org_id: string;
  title: string;
  description?: string | null;
  delegator_id: string;
  delegatee_id: string;
  department_id?: string | null;
  priority: TaskPriority;
  frequency: TaskFrequency;
  cron_expression?: string | null;
  recur_delay_days: number;
  verification_needed: boolean;
  allocated_score: number;
  is_active: boolean;
  ends_on?: string | null;
  last_spawned_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HolidayCalendarItem {
  id: string;
  org_id: string;
  holiday_date: string;
  holiday_name: string;
  holiday_type: string;
  created_at: string;
}

export type EmailProvider = "MICROSOFT_365" | "GOOGLE";

export interface SystemSettings {
  org_id: string;
  enable_official_wa: boolean;
  wa_official_phone_id?: string | null;
  wa_official_api_token?: string | null;
  wa_official_template_name?: string | null;
  wa_gateway_username?: string | null;
  wa_gateway_password?: string | null;
  test_mobile_number?: string | null;

  // Active Provider Selection
  email_provider?: EmailProvider;

  // Microsoft 365 SMTP (Separate)
  smtp_host: string;
  smtp_port: number;
  smtp_user?: string | null;
  smtp_app_password?: string | null;
  sender_display_name: string;

  // Google Workspace / Gmail SMTP (Separate)
  google_smtp_user?: string | null;
  google_smtp_app_password?: string | null;
  google_sender_display_name?: string | null;

  cloudinary_cloud_name?: string | null;
  cloudinary_api_key?: string | null;
  cloudinary_api_secret?: string | null;
  cloudinary_upload_preset?: string | null;

  default_task_score: number;
  daily_reminder_hour: number;
  skip_holiday_in_sla: boolean;
  max_revision_gap_days: number;

  column_permissions: Record<string, Record<string, boolean>>;
  updated_at: string;
}

