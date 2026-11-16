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
import { isTaskOverdue, getRevisionBlockReason } from "./task-utils";
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

// In-Memory state for local development & immediate test execution
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
  private settings: Record<string, SystemSettings> = {
    "org-sd-01": { ...initialSystemSettings },
  };

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
      allowed_domains: data.allowed_domains.map((d) => d.replace(/^@/, "").toLowerCase()),
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
    return newOrg;
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

      const punctualityRate =
        assigned.length > 0 ? Math.round((onTime.length / assigned.length) * 100) : 100;

      const totalScore = completed.reduce((sum, t) => sum + (t.actual_score || 0), 0);
      const averageScore = completed.length > 0 ? Number((totalScore / completed.length).toFixed(1)) : 10.0;

      const dept = this.departments.find((d) => d.id === p.department_id);

      return {
        userId: p.id,
        fullName: p.full_name,
        email: p.email,
        role: p.role,
        departmentName: dept?.name || "General",
        totalTasks: assigned.length,
        completedTasks: completed.length,
        onTimeTasks: onTime.length,
        delayedTasks: delayed.length,
        punctualityRate,
        averageScore,
        rank: 1,
      };
    });

    // Sort descending by average score then punctuality rate
    scorecards.sort((a, b) => {
      if (b.averageScore !== a.averageScore) {
        return b.averageScore - a.averageScore;
      }
      return b.punctualityRate - a.punctualityRate;
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

    return {
      totalTasks,
      completedCount: completedTasks.length,
      inProgressCount: orgTasks.filter((t) => t.status === "IN_PROGRESS").length,
      awaitingVerificationCount: orgTasks.filter((t) => t.status === "AWAITING_VERIFICATION").length,
      overdueCount: overdueTasks.length,
      completionRate,
      onTimeDeliveryRate,
      averageTurnaroundDays: 2.4,
      departmentBreakdown,
    };
  }
}

// Singleton Local Server Repository
export const localDb = new LocalRepository();

