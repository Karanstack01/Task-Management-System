import {
  Organization,
  Department,
  Profile,
  Task,
  TaskAttachment,
  TaskRevision,
  TaskVerification,
  HolidayCalendarItem,
  SystemSettings,
  RecurringTemplate,
  UserRole,
  TaskStatus,
  TaskPriority,
  TaskFrequency,
  AttachmentType,
} from "@/types/database.types";
import {
  initialOrganizations,
  initialDepartments,
  initialProfiles,
  initialTasks,
  initialAttachments,
  initialSystemSettings,
  initialHolidays,
  initialRecurringTemplates,
} from "./mock-db";
import { isTaskOverdue, getRevisionBlockReason, calculateSlaScore } from "./task-utils";
import {
  normalizeStatus,
  planStatusChange,
  planVerification,
  TaskTransitionError,
  VerificationDecision,
} from "./task-state-machine";
import { getOrgAccessState, planReactivate, planSuspend } from "./org-lifecycle";

/** Task fields editable through the "Edit Details" form. Status changes go through updateTaskStatus. */
export type TaskDetailUpdates = Partial<
  Pick<
    Task,
    | "title"
    | "description"
    | "department_id"
    | "delegatee_id"
    | "priority"
    | "frequency"
    | "current_target_date"
    | "initial_target_date"
    | "verification_needed"
    | "allocated_score"
  >
>;

export interface StatusChangeOptions {
  /** Role of the acting user; omit only for trusted system jobs. */
  actorRole?: UserRole;
  /** Attachments the caller knows about (e.g. just uploaded via the API route). */
  knownAttachments?: TaskAttachment[];
  /** Effective time of the change (backdated imports / tests). Defaults to now. */
  completionDate?: string;
  deliverables?: {
    fileName: string;
    fileUrl: string;
    cloudinaryPublicId: string;
    uploadedBy: string;
  };
}

const STORAGE_KEY = "stackdrove_ctms_data_v1";

/** "@Acme.com", "name@acme.com" and "acme.com" all become "acme.com". */
function normalizeDomains(input: string[]): string[] {
  return Array.from(
    new Set(
      input
        .map((d) => d.trim().toLowerCase())
        .map((d) => (d.includes("@") ? d.slice(d.lastIndexOf("@") + 1) : d))
        .filter(Boolean)
    )
  );
}

// Browser-persisted state (localStorage) for local development & system testing
class LocalRepository {
  private organizations: Organization[] = [...initialOrganizations];
  private departments: Department[] = [...initialDepartments];
  private profiles: Profile[] = [...initialProfiles];
  private tasks: Task[] = [...initialTasks];
  private attachments: TaskAttachment[] = [...initialAttachments];
  private revisions: TaskRevision[] = [];
  private verifications: TaskVerification[] = [];
  private holidays: HolidayCalendarItem[] = [...initialHolidays];
  private templates: RecurringTemplate[] = [...initialRecurringTemplates];
  private settings: Record<string, SystemSettings> = {};

  constructor() {
    this.load();
  }

  /** Restores data saved by a previous visit so test data survives page reloads. */
  private load() {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      this.organizations = (s.organizations ?? []).map((o: Organization) => ({
        ...o,
        allowed_domains: normalizeDomains(o.allowed_domains ?? []),
      }));
      this.departments = s.departments ?? [];
      this.profiles = s.profiles ?? [];
      this.tasks = s.tasks ?? [];
      this.attachments = s.attachments ?? [];
      this.revisions = s.revisions ?? [];
      this.verifications = s.verifications ?? [];
      this.holidays = s.holidays ?? [];
      this.templates = s.templates ?? [];
      this.settings = s.settings ?? {};
      // The platform superadmin must always exist.
      for (const p of initialProfiles) {
        if (!this.profiles.some((x) => x.id === p.id)) this.profiles.unshift({ ...p });
      }
    } catch {
      // Corrupt or unavailable storage: start clean.
    }
  }

  /** Called after every data operation (see the localDb proxy below). */
  persist() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          organizations: this.organizations,
          departments: this.departments,
          profiles: this.profiles,
          tasks: this.tasks,
          attachments: this.attachments,
          revisions: this.revisions,
          verifications: this.verifications,
          holidays: this.holidays,
          templates: this.templates,
          settings: this.settings,
        })
      );
    } catch {
      // Quota exceeded / private mode: keep working in memory.
    }
  }

  /** Wipes every company, user and task, leaving only the platform superadmin. */
  resetAllData() {
    this.organizations = [];
    this.departments = [];
    this.profiles = initialProfiles.map((p) => ({ ...p }));
    this.tasks = [];
    this.attachments = [];
    this.revisions = [];
    this.verifications = [];
    this.holidays = [];
    this.templates = [];
    this.settings = {};
  }

  // -------------------------------------------------------------
  // ORGANIZATIONS & TENANT LICENSING (SUPERADMIN ENGINE)
  // -------------------------------------------------------------
  async getOrganizations(): Promise<Organization[]> {
    return [...this.organizations];
  }

  async getOrganizationById(orgId: string): Promise<Organization | null> {
    return this.organizations.find((o) => o.id === orgId) || null;
  }

  async provisionOrganization(data: {
    name: string;
    slug: string;
    allowed_domains: string[];
    primary_contact_email: string;
    subscription_plan?: Organization["subscription_plan"];
    max_users?: number;
    days_valid?: number;
  }): Promise<Organization> {
    const days = data.days_valid || 365;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const newOrg: Organization = {
      id: `org-${Date.now()}`,
      name: data.name,
      slug: data.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      logo_url: null,
      website_url: `https://${data.allowed_domains[0] || "example.com"}`,
      support_email: data.primary_contact_email,
      allowed_domains: normalizeDomains(data.allowed_domains),
      primary_contact_email: data.primary_contact_email,
      subscription_plan: data.subscription_plan || "PROFESSIONAL",
      subscription_status: "ACTIVE",
      subscription_started_at: new Date().toISOString(),
      subscription_expires_at: expiresAt,
      max_users: data.max_users || 50,
      is_suspended: false,
      suspended_at: null,
      suspension_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.organizations.push(newOrg);

    // The primary contact becomes the workspace's first COMPANY_ADMIN so they can sign in
    // (with Google / Microsoft, or a password) and set up the rest of the company.
    const contact = data.primary_contact_email.trim().toLowerCase();
    if (contact && !this.profiles.some((p) => p.email.toLowerCase() === contact)) {
      this.profiles.push({
        id: `user-${Date.now()}`,
        org_id: newOrg.id,
        department_id: null,
        full_name: contact.split("@")[0],
        email: contact,
        phone_number: null,
        role: "COMPANY_ADMIN",
        is_primary_owner: true,
        avatar_url: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    return newOrg;
  }

  async updateOrganization(
    orgId: string,
    patch: Partial<
      Pick<
        Organization,
        | "name"
        | "slug"
        | "website_url"
        | "primary_contact_email"
        | "allowed_domains"
        | "subscription_plan"
        | "max_users"
        | "subscription_expires_at"
      >
    >
  ): Promise<Organization | null> {
    const org = this.organizations.find((o) => o.id === orgId);
    if (!org) return null;
    const next = { ...patch };
    if (next.allowed_domains) next.allowed_domains = normalizeDomains(next.allowed_domains);
    if (next.slug) next.slug = next.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    Object.assign(org, next, { updated_at: new Date().toISOString() });
    return { ...org };
  }

  /** Updates the editable parts of a person's own profile (name, phone, picture). */
  async updateProfile(
    userId: string,
    patch: Partial<Pick<Profile, "full_name" | "phone_number" | "avatar_url">>
  ): Promise<Profile | null> {
    const profile = this.profiles.find((p) => p.id === userId);
    if (!profile) return null;
    Object.assign(profile, patch, { updated_at: new Date().toISOString() });
    return { ...profile };
  }

  // Master Kill Switch (Superadmin Control)
  async toggleOrganizationKillSwitch(
    orgId: string,
    isSuspended: boolean,
    reason?: string
  ): Promise<Organization | null> {
    const org = this.organizations.find((o) => o.id === orgId);
    if (!org) return null;

    // Suspension remembers the billing state; reactivation restores it (and respects expiry).
    const patch = isSuspended ? planSuspend(org, reason) : planReactivate(org);
    Object.assign(org, patch, { updated_at: new Date().toISOString() });

    return { ...org };
  }

  /** Persists EXPIRED for tenants past their expiry date (run by the cron worker). */
  async sweepExpiredOrganizations(now = new Date()): Promise<number> {
    let count = 0;
    for (const org of this.organizations) {
      if (org.is_suspended) continue;
      const state = getOrgAccessState(org, now);
      if (state.status === "EXPIRED" && org.subscription_status !== "EXPIRED") {
        org.subscription_status = "EXPIRED";
        org.updated_at = now.toISOString();
        count++;
      }
    }
    return count;
  }

  // -------------------------------------------------------------
  // PROFILES & RBAC
  // -------------------------------------------------------------
  async getProfiles(orgId?: string | null): Promise<Profile[]> {
    if (!orgId) return [...this.profiles];
    return this.profiles.filter((p) => p.org_id === orgId);
  }

  async getProfileById(userId: string): Promise<Profile | null> {
    const profile = this.profiles.find((p) => p.id === userId);
    if (!profile) return null;

    const department = this.departments.find((d) => d.id === profile.department_id);
    const organization = this.organizations.find((o) => o.id === profile.org_id);

    return {
      ...profile,
      department: department || undefined,
      organization: organization || undefined,
    };
  }

  async createProfile(data: {
    fullName: string;
    email: string;
    phoneNumber?: string;
    role: UserRole;
    orgId: string;
    departmentId?: string;
  }): Promise<{ profile: Profile | null; error?: string }> {
    // 1. Domain verification check
    const org = await this.getOrganizationById(data.orgId);
    if (!org) return { profile: null, error: "Organization not found" };

    const emailDomain = data.email.split("@")[1]?.toLowerCase();
    if (!emailDomain || !org.allowed_domains.includes(emailDomain)) {
      return {
        profile: null,
        error: `Email domain '@${emailDomain}' is not whitelisted for organization '${org.name}'. Authorized domains: ${org.allowed_domains.join(", ")}`,
      };
    }

    const newProfile: Profile = {
      id: `user-${Date.now()}`,
      org_id: data.orgId,
      department_id: data.departmentId || null,
      full_name: data.fullName,
      email: data.email.toLowerCase(),
      phone_number: data.phoneNumber || null,
      role: data.role,
      is_primary_owner: false,
      avatar_url: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop`,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.profiles.push(newProfile);
    return { profile: newProfile };
  }

  async updateProfileRole(userId: string, role: UserRole): Promise<Profile | null> {
    const profile = this.profiles.find((p) => p.id === userId);
    if (!profile) return null;
    if (role === "SUPERADMIN" || profile.role === "SUPERADMIN") {
      throw new Error("The platform SUPERADMIN role can't be granted or revoked from a workspace.");
    }
    if (profile.is_primary_owner && role !== "COMPANY_ADMIN") {
      throw new Error("The primary workspace owner must remain a COMPANY_ADMIN.");
    }
    if (!profile.is_active) {
      throw new Error("Reactivate this user before changing their role.");
    }
    profile.role = role;
    profile.updated_at = new Date().toISOString();
    return { ...profile };
  }

  // -------------------------------------------------------------
  // DEPARTMENTS
  // -------------------------------------------------------------
  async getDepartments(orgId: string): Promise<Department[]> {
    return this.departments.filter((d) => d.org_id === orgId);
  }

  async createDepartment(data: {
    orgId: string;
    name: string;
    code?: string;
    headUserId?: string;
  }): Promise<Department> {
    const newDept: Department = {
      id: `dept-${Date.now()}`,
      org_id: data.orgId,
      name: data.name,
      code: data.code || data.name.substring(0, 4).toUpperCase(),
      head_user_id: data.headUserId || null,
      created_at: new Date().toISOString(),
    };

    this.departments.push(newDept);
    return newDept;
  }

  // -------------------------------------------------------------
  // TASKS & TRANSACTIONAL ENGINE
  // -------------------------------------------------------------
  async getTasks(params?: {
    orgId?: string;
    role?: UserRole;
    userId?: string;
    status?: TaskStatus;
    departmentId?: string;
    search?: string;
    includeArchived?: boolean;
  }): Promise<Task[]> {
    let result = [...this.tasks];

    // Archived tasks are hidden from working views unless explicitly requested
    if (!params?.includeArchived) {
      result = result.filter((t) => !t.archived_at);
    }

    // Filter by Org
    if (params?.orgId) {
      result = result.filter((t) => t.org_id === params.orgId);
    }

    // Role-Scoped Permissions:
    if (params?.role === "DELEGATEE" && params.userId) {
      result = result.filter((t) => t.delegatee_id === params.userId);
    } else if (params?.role === "DELEGATOR" && params.userId) {
      result = result.filter((t) => t.delegator_id === params.userId);
    }
    // Boss, Admin, Company Admin, Superadmin see all org tasks

    // Filter by Status (legacy statuses are compared in their normalized form)
    if (params?.status) {
      result = result.filter((t) => normalizeStatus(t.status) === params.status);
    }

    // Filter by Department
    if (params?.departmentId) {
      result = result.filter((t) => t.department_id === params.departmentId);
    }

    // Keyword Search
    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.task_no.toString().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    // Join relations
    return result.map((t) => {
      const delegator = this.profiles.find((p) => p.id === t.delegator_id);
      const delegatee = this.profiles.find((p) => p.id === t.delegatee_id);
      const dept = this.departments.find((d) => d.id === t.department_id);
      const atts = this.attachments.filter((a) => a.task_id === t.id);
      const revs = this.revisions.filter((r) => r.task_id === t.id);

      return {
        ...t,
        status: normalizeStatus(t.status),
        delegator: delegator || undefined,
        delegatee: delegatee || undefined,
        department: dept || undefined,
        attachments: atts,
        revisions: revs,
      };
    });
  }

  async getTaskById(taskId: string): Promise<Task | null> {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return null;
    return this.withRelations(task);
  }

  private withRelations(task: Task): Task {
    const delegator = this.profiles.find((p) => p.id === task.delegator_id);
    const delegatee = this.profiles.find((p) => p.id === task.delegatee_id);
    const dept = this.departments.find((d) => d.id === task.department_id);
    const atts = this.attachments.filter((a) => a.task_id === task.id);
    const revs = this.revisions.filter((r) => r.task_id === task.id);

    return {
      ...task,
      status: normalizeStatus(task.status),
      delegator: delegator || undefined,
      delegatee: delegatee || undefined,
      department: dept || undefined,
      attachments: atts,
      revisions: revs,
    };
  }

  private requireTask(taskId: string): Task {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) throw new TaskTransitionError("NOT_FOUND", "Task not found.");
    return task;
  }

  /** Counts distinct proof-of-work attachments from storage plus any the caller already holds. */
  private countProof(taskId: string, known: TaskAttachment[] = []): number {
    const ids = new Set<string>();
    for (const a of [...this.attachments.filter((x) => x.task_id === taskId), ...known]) {
      if (a.attachment_type === "PROOF_OF_WORK") ids.add(a.id);
    }
    return ids.size;
  }

  async createTask(data: {
    orgId: string;
    title: string;
    description?: string;
    delegatorId: string;
    delegateeId: string;
    departmentId?: string;
    priority?: TaskPriority;
    initialTargetDate: string;
    frequency?: TaskFrequency;
    verificationNeeded?: boolean;
    allocatedScore?: number;
    recurringTemplateId?: string;
    startDate?: string;
  }): Promise<Task> {
    const nextTaskNo =
      this.tasks.length > 0 ? Math.max(...this.tasks.map((t) => t.task_no)) + 1 : 1001;

    const newTask: Task = {
      id: `task-uuid-${nextTaskNo}`,
      task_no: nextTaskNo,
      org_id: data.orgId,
      title: data.title,
      description: data.description || null,
      delegator_id: data.delegatorId,
      delegatee_id: data.delegateeId,
      department_id: data.departmentId || null,
      priority: data.priority || "MEDIUM",
      status: "PENDING",
      frequency: data.frequency || "ONE_TIME",
      start_date: data.startDate || new Date().toISOString().split("T")[0],
      initial_target_date: data.initialTargetDate,
      current_target_date: data.initialTargetDate,
      completion_date: null,
      revision_count: 0,
      max_revision_allowed: 3,
      verification_needed: data.verificationNeeded ?? true,
      is_verified: false,
      allocated_score: data.allocatedScore || 10.0,
      actual_score: 0.0,
      delay_days: 0,
      short_link: `https://cbxit.in/t/${nextTaskNo}`,
      recurring_template_id: data.recurringTemplateId || null,
      archived_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.tasks.unshift(newTask);
    return newTask;
  }

  // Full Task Detail Update (Delegator / Task Generator).
  // Deliberately cannot change status — use updateTaskStatus so lifecycle rules apply.
  async updateTask(taskId: string, updates: TaskDetailUpdates): Promise<Task | null> {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return null;

    // Scoring inputs are frozen once work is submitted or signed off.
    const status = normalizeStatus(task.status);
    const scoringLocked = status === "AWAITING_VERIFICATION" || status === "DONE";
    if (scoringLocked) {
      if (
        updates.verification_needed !== undefined &&
        updates.verification_needed !== task.verification_needed
      ) {
        throw new TaskTransitionError(
          "INVALID_TRANSITION",
          "Verification can't be toggled after work is submitted. Reject or reopen the task first."
        );
      }
      if (
        updates.allocated_score !== undefined &&
        Number(updates.allocated_score) !== Number(task.allocated_score)
      ) {
        throw new TaskTransitionError(
          "INVALID_TRANSITION",
          "The allocated score can't change after work is submitted. Reject or reopen the task first."
        );
      }
    }

    if (updates.title !== undefined) task.title = updates.title;
    if (updates.description !== undefined) task.description = updates.description;
    if (updates.department_id !== undefined) task.department_id = updates.department_id;
    if (updates.delegatee_id !== undefined) task.delegatee_id = updates.delegatee_id;
    if (updates.priority !== undefined) task.priority = updates.priority;
    if (updates.frequency !== undefined) task.frequency = updates.frequency;
    if (updates.current_target_date !== undefined) task.current_target_date = updates.current_target_date;
    if (updates.initial_target_date !== undefined) task.initial_target_date = updates.initial_target_date;
    if (updates.verification_needed !== undefined) task.verification_needed = updates.verification_needed;
    if (updates.allocated_score !== undefined) task.allocated_score = updates.allocated_score;

    task.updated_at = new Date().toISOString();
    return this.withRelations(task);
  }

  // Delete Task and associated artifacts (Delegator / Task Generator)
  async deleteTask(taskId: string): Promise<boolean> {
    const index = this.tasks.findIndex((t) => t.id === taskId);
    if (index === -1) return false;

    this.tasks.splice(index, 1);
    this.attachments = this.attachments.filter((a) => a.task_id !== taskId);
    this.revisions = this.revisions.filter((r) => r.task_id !== taskId);
    return true;
  }

  /**
   * The only way to change a task's status. Validates the transition with the task state machine
   * and throws TaskTransitionError (code PROOF_REQUIRED, FORBIDDEN, INVALID_TRANSITION, …) if refused.
   */
  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    options: StatusChangeOptions = {}
  ): Promise<Task> {
    const task = this.requireTask(taskId);
    const { deliverables } = options;

    const proofCount =
      this.countProof(taskId, options.knownAttachments) + (deliverables ? 1 : 0);
    const plan = planStatusChange(task, status, {
      actorRole: options.actorRole,
      proofCount,
      now: options.completionDate ? new Date(options.completionDate) : undefined,
    });

    if (deliverables) {
      const att: TaskAttachment = {
        id: `att-${Date.now()}`,
        task_id: taskId,
        uploaded_by: deliverables.uploadedBy,
        cloudinary_public_id: deliverables.cloudinaryPublicId,
        file_url: deliverables.fileUrl,
        file_name: deliverables.fileName,
        file_size_bytes: 1024000,
        mime_type: "application/pdf",
        attachment_type: "PROOF_OF_WORK",
        created_at: new Date().toISOString(),
      };
      this.attachments.push(att);
    }

    Object.assign(task, plan.patch, { updated_at: new Date().toISOString() });
    return this.withRelations(task);
  }

  async getTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
    return this.attachments.filter((a) => a.task_id === taskId);
  }

  // Zero-Database-Blob Architecture: Save strictly metadata references to Cloudinary hosted files
  async addAttachment(data: {
    taskId: string;
    uploadedBy?: string;
    cloudinaryPublicId: string;
    fileUrl: string;
    fileName: string;
    fileSizeBytes?: number;
    mimeType?: string;
    attachmentType?: AttachmentType;
  }): Promise<TaskAttachment> {
    const att: TaskAttachment = {
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      task_id: data.taskId,
      uploaded_by: data.uploadedBy || null,
      cloudinary_public_id: data.cloudinaryPublicId,
      file_url: data.fileUrl,
      file_name: data.fileName,
      file_size_bytes: data.fileSizeBytes || null,
      mime_type: data.mimeType || "application/octet-stream",
      attachment_type: data.attachmentType || "PROOF_OF_WORK",
      created_at: new Date().toISOString(),
    };
    this.attachments.push(att);
    return att;
  }

  // SLA Verification & Punctuality Scoring Engine (AWAITING_VERIFICATION → DONE | IN_PROGRESS)
  async verifyTask(
    taskId: string,
    decision: VerificationDecision,
    opts: { verifiedBy: string; actorRole?: UserRole; remarks?: string; overrideScore?: number }
  ): Promise<Task> {
    const task = this.requireTask(taskId);
    const plan = planVerification(task, decision, opts);

    Object.assign(task, plan.patch, { updated_at: new Date().toISOString() });

    this.verifications.push({
      id: `v-${Date.now()}`,
      task_id: taskId,
      verified_by: opts.verifiedBy,
      status_awarded: plan.to,
      score_awarded: plan.to === "DONE" ? task.actual_score : 0,
      feedback_notes: task.score_remarks,
      verified_at: new Date().toISOString(),
    });

    return this.withRelations(task);
  }

  /**
   * Timeline extension. Within the revision allowance an extension is applied immediately:
   * - recorded as APPROVED with approved_by when a manager approves it (approvedBy given),
   * - recorded as AUTO_APPROVED (approved_by = null) for self-service requests.
   */
  async requestDateRevision(
    taskId: string,
    requestedBy: string,
    newTargetDate: string,
    reason: string,
    opts: { approvedBy?: string } = {}
  ): Promise<{ task: Task | null; error?: string }> {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return { task: null, error: "Task not found" };

    const blocked = getRevisionBlockReason(task);
    if (blocked) return { task: null, error: blocked };

    const newDateTime = new Date(newTargetDate).getTime();
    if (isNaN(newDateTime)) {
      return { task: null, error: "Invalid target date format provided." };
    }

    const currentDateTime = new Date(task.current_target_date).getTime();
    if (newDateTime <= currentDateTime) {
      return {
        task: null,
        error: "Requested extension date must be strictly after the current deadline.",
      };
    }

    const prevDate = task.current_target_date;
    task.revision_count += 1;
    task.current_target_date = newTargetDate;
    task.updated_at = new Date().toISOString();

    const revision: TaskRevision = {
      id: `rev-${Date.now()}`,
      task_id: taskId,
      requested_by: requestedBy,
      previous_target_date: prevDate,
      new_target_date: newTargetDate,
      reason,
      approved_by: opts.approvedBy ?? null,
      status: opts.approvedBy ? "APPROVED" : "AUTO_APPROVED",
      created_at: new Date().toISOString(),
    };

    this.revisions.push(revision);
    return { task: this.withRelations(task) };
  }

  /** Records a declined extension request; the deadline and revision count are unchanged. */
  async declineDateRevision(
    taskId: string,
    requestedBy: string,
    requestedTargetDate: string,
    reason: string,
    declinedBy: string
  ): Promise<{ task: Task | null; error?: string }> {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return { task: null, error: "Task not found" };

    this.revisions.push({
      id: `rev-${Date.now()}`,
      task_id: taskId,
      requested_by: requestedBy,
      previous_target_date: task.current_target_date,
      new_target_date: requestedTargetDate,
      reason,
      approved_by: declinedBy,
      status: "REJECTED",
      created_at: new Date().toISOString(),
    });
    return { task: this.withRelations(task) };
  }

  /** Moves verified tasks older than the cutoff out of working views. Returns how many were archived. */
  async archiveCompletedTasks(orgId: string, olderThan: Date): Promise<number> {
    const now = new Date().toISOString();
    let count = 0;
    for (const t of this.tasks) {
      if (t.org_id !== orgId || t.archived_at) continue;
      const finishedAt = t.verified_at || t.completion_date;
      const isFinal = t.status === "DONE" || t.status === "CANCELLED";
      if (isFinal && finishedAt && new Date(finishedAt).getTime() < olderThan.getTime()) {
        t.archived_at = now;
        count++;
      }
    }
    return count;
  }

  // -------------------------------------------------------------
  // SYSTEM SETTINGS & MASTER INTEGRATIONS
  // -------------------------------------------------------------
  async getSystemSettings(orgId: string): Promise<SystemSettings> {
    if (!this.settings[orgId]) {
      this.settings[orgId] = { ...initialSystemSettings, org_id: orgId };
    }
    return { ...this.settings[orgId] };
  }

  async updateSystemSettings(
    orgId: string,
    updates: Partial<SystemSettings>
  ): Promise<SystemSettings> {
    const current = await this.getSystemSettings(orgId);
    this.settings[orgId] = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return { ...this.settings[orgId] };
  }

  // -------------------------------------------------------------
  // HOLIDAYS
  // -------------------------------------------------------------
  async getHolidays(orgId: string): Promise<HolidayCalendarItem[]> {
    return this.holidays.filter((h) => h.org_id === orgId);
  }

  async addHoliday(data: {
    orgId: string;
    holidayDate: string;
    holidayName: string;
    holidayType?: string;
  }): Promise<HolidayCalendarItem> {
    const newHol: HolidayCalendarItem = {
      id: `hol-${Date.now()}`,
      org_id: data.orgId,
      holiday_date: data.holidayDate,
      holiday_name: data.holidayName,
      holiday_type: data.holidayType || "PUBLIC",
      created_at: new Date().toISOString(),
    };
    this.holidays.push(newHol);
    return newHol;
  }

  // -------------------------------------------------------------
  // RECURRING TEMPLATES
  // -------------------------------------------------------------
  async getRecurringTemplates(orgId: string): Promise<RecurringTemplate[]> {
    return this.templates.filter((t) => t.org_id === orgId);
  }

  async getRecurringTemplateById(id: string): Promise<RecurringTemplate | null> {
    return this.templates.find((t) => t.id === id) || null;
  }

  async createRecurringTemplate(data: {
    orgId: string;
    title: string;
    description?: string;
    delegatorId: string;
    delegateeId: string;
    departmentId?: string;
    priority: TaskPriority;
    frequency: TaskFrequency;
    recurDelayDays: number;
    verificationNeeded: boolean;
    allocatedScore?: number;
  }): Promise<RecurringTemplate> {
    const newTemplate: RecurringTemplate = {
      id: `rec-tpl-${Date.now()}`,
      org_id: data.orgId,
      title: data.title,
      description: data.description || null,
      delegator_id: data.delegatorId,
      delegatee_id: data.delegateeId,
      department_id: data.departmentId || null,
      priority: data.priority,
      frequency: data.frequency,
      recur_delay_days: data.recurDelayDays,
      verification_needed: data.verificationNeeded,
      allocated_score: data.allocatedScore ?? 10.0,
      is_active: true,
      last_spawned_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.templates.push(newTemplate);
    return newTemplate;
  }

  async updateRecurringTemplate(
    id: string,
    updates: Partial<RecurringTemplate>
  ): Promise<RecurringTemplate | null> {
    const template = this.templates.find((t) => t.id === id);
    if (!template) return null;

    Object.assign(template, updates, { updated_at: new Date().toISOString() });
    return { ...template };
  }

  async deleteRecurringTemplate(id: string): Promise<boolean> {
    const initialLen = this.templates.length;
    this.templates = this.templates.filter((t) => t.id !== id);
    return this.templates.length < initialLen;
  }

  // -------------------------------------------------------------
  // ANALYTICS & SCORECARDS AGGREGATION ENGINE
  // -------------------------------------------------------------
  async getUserScorecards(orgId: string) {
    const orgProfiles = this.profiles.filter(
      (p) => p.org_id === orgId && (p.role === "DELEGATEE" || p.role === "DELEGATOR")
    );
    // Archived tasks still count toward history; cancelled work counts for nobody.
    const orgTasks = this.tasks.filter((t) => t.org_id === orgId && t.status !== "CANCELLED");

    const scorecards = orgProfiles.map((p) => {
      const assigned = orgTasks.filter((t) => t.delegatee_id === p.id);
      const completed = assigned.filter((t) => t.status === "DONE");
      const onTime = completed.filter((t) => t.delay_days === 0);
      const delayed = completed.filter((t) => t.delay_days > 0);
      const activeOverdue = assigned.filter((t) => isTaskOverdue(t));

      // Punctuality rate of completed deliverables
      const punctualityRate =
        completed.length > 0
          ? Math.round((onTime.length / completed.length) * 100)
          : assigned.length > 0
          ? Math.max(0, 100 - activeOverdue.length * 20)
          : 100;

      const completionRate =
        assigned.length > 0 ? Math.round((completed.length / assigned.length) * 100) : 0;

      // Algorithmic SLA calculation:
      // Base: 10.0
      // Deductions: -2.0 per delayed day on completed tasks
      // Deductions: -0.4 per active overdue task in active queue
      // First-time bonus: +0.2 if onTime / completed is 100% and completed >= 2
      let calculatedScore = 10.0;
      if (completed.length > 0) {
        const totalCompletedScore = completed.reduce((sum, t) => {
          const score = calculateSlaScore(t.allocated_score || 10.0, t.delay_days || 0, t.actual_score);
          return sum + score;
        }, 0);
        calculatedScore = totalCompletedScore / completed.length;
      }

      // Penalty for unresolved overdue items in queue
      if (activeOverdue.length > 0) {
        calculatedScore = Math.max(1.0, calculatedScore - activeOverdue.length * 0.4);
      }

      // First-pass bonus for high performers with clean delivery
      if (completed.length >= 2 && delayed.length === 0) {
        calculatedScore = Math.min(10.0, calculatedScore + 0.2);
      }

      const averageScore = Number(calculatedScore.toFixed(1));

      const dept = this.departments.find((d) => d.id === p.department_id);

      const tier: "ELITE" | "ON_TARGET" | "NEEDS_ATTENTION" =
        averageScore >= 9.0 ? "ELITE" : averageScore >= 7.5 ? "ON_TARGET" : "NEEDS_ATTENTION";

      const trend =
        averageScore >= 9.0 ? 5.2 : averageScore >= 8.0 ? 2.4 : -3.5;

      const taskSummaries = assigned.map((t) => ({
        id: t.id,
        task_no: t.task_no,
        title: t.title,
        status: t.status,
        priority: t.priority,
        current_target_date: t.current_target_date,
        completion_date: t.completion_date,
        delay_days: t.delay_days,
        allocated_score: t.allocated_score || 10.0,
        actual_score: t.actual_score || 0.0,
        is_overdue: isTaskOverdue(t),
      }));

      return {
        userId: p.id,
        fullName: p.full_name,
        email: p.email,
        role: p.role,
        avatarUrl: p.avatar_url || null,
        departmentName: dept?.name || "General",
        departmentId: p.department_id || null,
        totalTasks: assigned.length,
        completedTasks: completed.length,
        onTimeTasks: onTime.length,
        delayedTasks: delayed.length,
        activeOverdueTasks: activeOverdue.length,
        punctualityRate,
        completionRate,
        averageScore,
        rank: 1,
        tier,
        trend,
        tasks: taskSummaries,
      };
    });

    // Sort descending by average score then punctuality rate then completed count
    scorecards.sort((a, b) => {
      if (b.averageScore !== a.averageScore) {
        return b.averageScore - a.averageScore;
      }
      if (b.punctualityRate !== a.punctualityRate) {
        return b.punctualityRate - a.punctualityRate;
      }
      return b.completedTasks - a.completedTasks;
    });

    // Assign rank
    scorecards.forEach((sc, idx) => {
      sc.rank = idx + 1;
    });

    return scorecards;
  }

  async getAnalyticsSummary(orgId: string) {
    const orgTasks = this.tasks.filter((t) => t.org_id === orgId && t.status !== "CANCELLED");
    const orgDepts = this.departments.filter((d) => d.org_id === orgId);

    const totalTasks = orgTasks.length;
    const completedTasks = orgTasks.filter((t) => t.status === "DONE");
    const onTimeTasks = completedTasks.filter((t) => t.delay_days === 0);
    const overdueTasks = orgTasks.filter((t) => isTaskOverdue(t));

    const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
    const onTimeDeliveryRate =
      completedTasks.length > 0 ? Math.round((onTimeTasks.length / completedTasks.length) * 100) : 100;

    const departmentBreakdown = orgDepts.map((d) => {
      const deptTasks = orgTasks.filter((t) => t.department_id === d.id);
      const done = deptTasks.filter((t) => t.status === "DONE").length;
      const overdue = deptTasks.filter((t) => isTaskOverdue(t)).length;

      return {
        departmentName: d.name,
        code: d.code,
        total: deptTasks.length,
        completed: done,
        overdue,
      };
    });

    const DAY = 86400000;
    const now = Date.now();
    const openTasks = orgTasks.filter((t) => ["PENDING", "IN_PROGRESS", "OVERDUE"].includes(t.status));

    // Real average turnaround: start -> completion, in days, over completed tasks
    const turnarounds = completedTasks
      .map((t) => {
        const s = new Date(t.start_date || t.created_at).getTime();
        const e = new Date(t.completion_date || t.updated_at).getTime();
        return isNaN(s) || isNaN(e) ? null : Math.max(0, (e - s) / DAY);
      })
      .filter((v): v is number => v !== null);
    const averageTurnaroundDays =
      turnarounds.length > 0
        ? Number((turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length).toFixed(1))
        : 0;

    const priorities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
    const priorityBreakdown = priorities.map((p) => {
      const open = openTasks.filter((t) => t.priority === p);
      return {
        priority: p,
        open: open.length,
        overdue: open.filter((t) => isTaskOverdue(t)).length,
        done: completedTasks.filter((t) => t.priority === p).length,
      };
    });

    // Deadline health of open work
    const daysToDue = (t: { current_target_date: string }) =>
      (new Date(t.current_target_date).getTime() - now) / DAY;
    const aging = {
      overdueOver7: openTasks.filter((t) => daysToDue(t) < -7).length,
      overdue3to7: openTasks.filter((t) => daysToDue(t) >= -7 && daysToDue(t) < -3).length,
      overdue0to3: openTasks.filter((t) => daysToDue(t) >= -3 && daysToDue(t) < 0).length,
      dueIn3: openTasks.filter((t) => daysToDue(t) >= 0 && daysToDue(t) < 3).length,
      dueIn7: openTasks.filter((t) => daysToDue(t) >= 3 && daysToDue(t) < 7).length,
      later: openTasks.filter((t) => daysToDue(t) >= 7).length,
    };

    // Weekly created vs completed, last 8 weeks (oldest first)
    const weekly = Array.from({ length: 8 }, (_, i) => {
      const end = now - (7 - i) * 7 * DAY + 7 * DAY;
      const start = end - 7 * DAY;
      const inWeek = (iso?: string | null) => {
        if (!iso) return false;
        const ts = new Date(iso).getTime();
        return ts >= start && ts < end;
      };
      return {
        label: new Date(start).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        created: orgTasks.filter((t) => inWeek(t.created_at)).length,
        completed: completedTasks.filter((t) => inWeek(t.completion_date || t.updated_at)).length,
      };
    });

    // Workload per assignee
    const workload = this.profiles
      .filter((p) => p.org_id === orgId)
      .map((p) => {
        const mine = openTasks.filter((t) => t.delegatee_id === p.id);
        return {
          userId: p.id,
          name: p.full_name,
          open: mine.length,
          overdue: mine.filter((t) => isTaskOverdue(t)).length,
        };
      })
      .filter((w) => w.open > 0)
      .sort((a, b) => b.open - a.open)
      .slice(0, 6);

    // Most delayed open tasks
    const topOverdue = overdueTasks
      .map((t) => ({
        id: t.id,
        taskNo: t.task_no,
        title: t.title,
        priority: t.priority,
        assignee: this.profiles.find((p) => p.id === t.delegatee_id)?.full_name || "Unassigned",
        daysLate: Math.max(1, Math.ceil(-daysToDue(t))),
      }))
      .sort((a, b) => b.daysLate - a.daysLate)
      .slice(0, 5);

    const revised = orgTasks.filter((t) => (t.revision_count || 0) > 0).length;

    return {
      totalTasks,
      completedCount: completedTasks.length,
      pendingCount: orgTasks.filter((t) => t.status === "PENDING").length,
      inProgressCount: orgTasks.filter((t) => t.status === "IN_PROGRESS").length,
      awaitingVerificationCount: orgTasks.filter((t) => t.status === "AWAITING_VERIFICATION").length,
      overdueCount: overdueTasks.length,
      openCount: openTasks.length,
      completionRate,
      onTimeDeliveryRate,
      averageTurnaroundDays,
      revisionRate: totalTasks > 0 ? Math.round((revised / totalTasks) * 100) : 0,
      priorityBreakdown,
      aging,
      weekly,
      workload,
      topOverdue,
      departmentBreakdown,
    };
  }
}

// Singleton Local Server Repository
const repository = new LocalRepository();

/** Saves to localStorage after every operation so nothing entered during testing is lost on reload. */
export const localDb: LocalRepository = new Proxy(repository, {
  get(target, prop) {
    const value = Reflect.get(target, prop, target);
    if (typeof value !== "function" || prop === "persist" || prop === "constructor") return value;
    return (...args: unknown[]) => {
      const result = (value as (...a: unknown[]) => unknown).apply(target, args);
      if (result instanceof Promise) {
        return result.then((r) => {
          target.persist();
          return r;
        });
      }
      target.persist();
      return result;
    };
  },
});

