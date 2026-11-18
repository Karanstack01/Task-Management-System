import {
  Organization,
  Department,
  Profile,
  Task,
  TaskAttachment,
  RecurringTemplate,
  HolidayCalendarItem,
  SystemSettings,
} from "@/types/database.types";

/**
 * Starting state of a fresh install: NO demo data.
 * The only record that exists is the platform SUPERADMIN, who then creates companies, users and tasks.
 *
 * The matching sign-in credential lives in Supabase Auth (see scripts/create-superadmin.mjs) — never in code.
 */
export const SUPERADMIN_EMAIL = "stackdrove@gmail.com";

export const initialOrganizations: Organization[] = [];
export const initialDepartments: Department[] = [];

export const initialProfiles: Profile[] = [
  {
    id: "user-superadmin",
    org_id: null,
    department_id: null,
    full_name: "StackDrove Superadmin",
    email: SUPERADMIN_EMAIL,
    phone_number: null,
    role: "SUPERADMIN",
    is_primary_owner: false,
    avatar_url: null,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

export const initialTasks: Task[] = [];
export const initialAttachments: TaskAttachment[] = [];
export const initialHolidays: HolidayCalendarItem[] = [];
export const initialRecurringTemplates: RecurringTemplate[] = [];

/** Blank per-workspace defaults. Credentials are entered in Settings → Integrations, never pre-filled. */
export const initialSystemSettings: SystemSettings = {
  org_id: "",
  enable_official_wa: false,
  wa_official_phone_id: "",
  wa_official_api_token: "",
  wa_official_template_name: "",
  wa_gateway_username: "",
  wa_gateway_password: "",
  test_mobile_number: "",

  email_provider: "MICROSOFT_365",

  smtp_host: "smtp.office365.com",
  smtp_port: 587,
  smtp_user: "",
  smtp_app_password: "",
  sender_display_name: "StackDrove CTMS",

  google_smtp_user: "",
  google_smtp_app_password: "",
  google_sender_display_name: "StackDrove CTMS",

  cloudinary_cloud_name: "",
  cloudinary_api_key: "",
  cloudinary_api_secret: "",
  cloudinary_upload_preset: "",

  default_task_score: 10.0,
  daily_reminder_hour: 9,
  skip_holiday_in_sla: true,
  max_revision_gap_days: 5,

  column_permissions: {
    title: { BOSS: true, DELEGATOR: true, DELEGATEE: true },
    description: { BOSS: true, DELEGATOR: true, DELEGATEE: true },
    priority: { BOSS: true, DELEGATOR: true, DELEGATEE: false },
    allocated_score: { BOSS: true, DELEGATOR: true, DELEGATEE: false },
    actual_score: { BOSS: true, DELEGATOR: true, DELEGATEE: false },
    revisions: { BOSS: true, DELEGATOR: true, DELEGATEE: true },
  },
  updated_at: "2026-01-01T00:00:00Z",
};
