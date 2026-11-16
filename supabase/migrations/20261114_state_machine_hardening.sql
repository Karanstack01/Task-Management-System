-- ============================================================================
-- STACKDROVE CTMS — STATE MACHINE HARDENING
-- Mirrors the application state machines at the database level so they hold
-- regardless of which client writes:
--   * src/lib/data/task-state-machine.ts   (task lifecycle + verification)
--   * src/lib/data/task-utils.ts           (revision eligibility, derived OVERDUE)
--   * src/lib/data/org-lifecycle.ts        (subscription / kill switch)
--   * src/lib/cron/recurrence-engine.ts    (idempotent recurring spawns)
-- ============================================================================

-- 1. NEW STATE COLUMNS -------------------------------------------------------

-- Billing state to restore when the kill switch is lifted.
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS pre_suspension_status org_subscription_status;

-- Set by the monthly archiving worker; archived tasks are hidden from working views.
ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tasks_org_archived ON tasks(org_id, archived_at);

-- 2. "OVERDUE" IS DERIVED, NOT STORED ----------------------------------------
-- (The enum value is kept for compatibility; the trigger below refuses to write it.)
UPDATE tasks
SET status = 'IN_PROGRESS', completion_date = NULL, actual_score = 0, delay_days = 0
WHERE status = 'OVERDUE';

-- 3. CLOSED VOCABULARIES FOR VARCHAR STATUS COLUMNS ---------------------------
ALTER TABLE task_revisions ALTER COLUMN status SET DEFAULT 'PENDING';
ALTER TABLE task_revisions DROP CONSTRAINT IF EXISTS task_revisions_status_check;
ALTER TABLE task_revisions ADD CONSTRAINT task_revisions_status_check
    CHECK (status IN ('PENDING', 'APPROVED', 'AUTO_APPROVED', 'REJECTED'));

ALTER TABLE notification_logs DROP CONSTRAINT IF EXISTS notification_logs_status_check;
ALTER TABLE notification_logs ADD CONSTRAINT notification_logs_status_check
    CHECK (status IN ('QUEUED', 'SENT', 'FAILED', 'SIMULATED'));

-- 4. RECURRING SPAWNS ARE IDEMPOTENT -----------------------------------------
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_recurring_template_id_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_recurring_template_id_fkey
    FOREIGN KEY (recurring_template_id) REFERENCES recurring_templates(id) ON DELETE SET NULL;

-- At most one spawned task per template per day, even if the cron fires twice.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tasks_template_spawn_day
    ON tasks(recurring_template_id, start_date)
    WHERE recurring_template_id IS NOT NULL;

-- 5. HELPERS -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.calc_delay_days(target TIMESTAMPTZ, completed TIMESTAMPTZ)
RETURNS INT AS $$
    SELECT GREATEST(0, CEIL(EXTRACT(EPOCH FROM (completed - target)) / 86400.0))::INT;
$$ LANGUAGE sql IMMUTABLE;

-- 20% of the allocated score per day late, floored at 0 (matches calculateSlaScore).
CREATE OR REPLACE FUNCTION public.calc_sla_score(allocated NUMERIC, delay INT)
RETURNS NUMERIC AS $$
    SELECT ROUND(GREATEST(0, allocated - (allocated / 5.0) * delay), 2);
$$ LANGUAGE sql IMMUTABLE;

-- 6. TASK LIFECYCLE TRIGGER ----------------------------------------------------
--   PENDING ⇄ IN_PROGRESS → AWAITING_VERIFICATION → (approve) DONE
--   AWAITING_VERIFICATION → IN_PROGRESS (reject / withdraw)
--   PENDING | IN_PROGRESS → DONE only when verification is not required
--   DONE → IN_PROGRESS (reopen) · {open states} → CANCELLED → PENDING (restore)
CREATE OR REPLACE FUNCTION public.enforce_task_lifecycle()
RETURNS TRIGGER AS $$
DECLARE
    v_from        task_status := CASE WHEN OLD.status = 'OVERDUE' THEN 'IN_PROGRESS'::task_status ELSE OLD.status END;
    v_to          task_status := NEW.status;
    v_actor       UUID        := auth.uid();
    v_role        user_role   := public.current_user_role();
    v_is_manager  BOOLEAN;
    v_revision    BOOLEAN     := COALESCE(current_setting('ctms.revision_in_progress', true), '') = 'on';
BEGIN
    -- Trusted contexts (service role / cron) have no auth.uid(): lifecycle rules still apply, role rules don't.
    v_is_manager := v_actor IS NULL
        OR v_role IN ('SUPERADMIN', 'COMPANY_ADMIN', 'ADMIN')
        OR (v_role = 'DELEGATOR' AND v_actor = OLD.delegator_id);

    IF v_to = 'OVERDUE' AND OLD.status IS DISTINCT FROM 'OVERDUE' THEN
        RAISE EXCEPTION 'OVERDUE is derived from the deadline and cannot be stored' USING ERRCODE = 'check_violation';
    END IF;

    -- ---- Delegatee column guard -------------------------------------------
    IF NOT v_is_manager THEN
        IF NEW.title IS DISTINCT FROM OLD.title
            OR NEW.description IS DISTINCT FROM OLD.description
            OR NEW.org_id IS DISTINCT FROM OLD.org_id
            OR NEW.delegator_id IS DISTINCT FROM OLD.delegator_id
            OR NEW.delegatee_id IS DISTINCT FROM OLD.delegatee_id
            OR NEW.department_id IS DISTINCT FROM OLD.department_id
            OR NEW.priority IS DISTINCT FROM OLD.priority
            OR NEW.frequency IS DISTINCT FROM OLD.frequency
            OR NEW.verification_needed IS DISTINCT FROM OLD.verification_needed
            OR NEW.allocated_score IS DISTINCT FROM OLD.allocated_score
            OR NEW.max_revision_allowed IS DISTINCT FROM OLD.max_revision_allowed
            OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
            OR NEW.verified_by IS DISTINCT FROM OLD.verified_by
            OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
            OR NEW.archived_at IS DISTINCT FROM OLD.archived_at
            OR (NOT v_revision AND (
                   NEW.current_target_date IS DISTINCT FROM OLD.current_target_date
                OR NEW.initial_target_date IS DISTINCT FROM OLD.initial_target_date
                OR NEW.revision_count IS DISTINCT FROM OLD.revision_count))
        THEN
            RAISE EXCEPTION 'Assignees may only update task progress (status / completion)' USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    IF v_to IS NOT DISTINCT FROM OLD.status THEN
        -- No status change: score fields may only be edited by managers (already guarded above
        -- for delegatees); nothing else to enforce.
        IF NOT v_is_manager AND (NEW.actual_score IS DISTINCT FROM OLD.actual_score
                                 OR NEW.delay_days IS DISTINCT FROM OLD.delay_days) THEN
            RAISE EXCEPTION 'Scores are awarded by the system' USING ERRCODE = 'insufficient_privilege';
        END IF;
        RETURN NEW;
    END IF;

    -- ---- Allowed transitions ----------------------------------------------
    IF NOT (
           (v_from = 'PENDING'               AND v_to IN ('IN_PROGRESS', 'AWAITING_VERIFICATION', 'DONE', 'CANCELLED'))
        OR (v_from = 'IN_PROGRESS'           AND v_to IN ('PENDING', 'AWAITING_VERIFICATION', 'DONE', 'CANCELLED'))
        OR (v_from = 'AWAITING_VERIFICATION' AND v_to IN ('IN_PROGRESS', 'DONE', 'CANCELLED'))
        OR (v_from = 'DONE'                  AND v_to = 'IN_PROGRESS')
        OR (v_from = 'CANCELLED'             AND v_to = 'PENDING')
        OR (v_from = 'IN_PROGRESS'           AND v_to = 'IN_PROGRESS') -- legacy OVERDUE normalization
    ) THEN
        RAISE EXCEPTION 'Invalid task transition % -> %', OLD.status, v_to USING ERRCODE = 'check_violation';
    END IF;

    -- ---- Role rules -------------------------------------------------------
    IF NOT v_is_manager THEN
        IF v_to = 'CANCELLED' OR v_from IN ('CANCELLED', 'DONE') THEN
            RAISE EXCEPTION 'Only the delegator or an admin can cancel, restore or reopen a task' USING ERRCODE = 'insufficient_privilege';
        END IF;
        IF v_from = 'AWAITING_VERIFICATION' AND v_to = 'DONE' THEN
            RAISE EXCEPTION 'Only the delegator or an admin can approve deliverables' USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    -- ---- State entry effects (server-authoritative derived fields) ----------
    IF v_to IN ('PENDING', 'IN_PROGRESS', 'CANCELLED') THEN
        NEW.completion_date := NULL;
        NEW.is_verified     := FALSE;
        NEW.verified_by     := NULL;
        NEW.verified_at     := NULL;
        NEW.actual_score    := 0;
        NEW.delay_days      := 0;

    ELSIF v_to = 'AWAITING_VERIFICATION' THEN
        IF NOT NEW.verification_needed THEN
            RAISE EXCEPTION 'Task does not require verification; complete it directly' USING ERRCODE = 'check_violation';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM task_attachments a
                       WHERE a.task_id = NEW.id AND a.attachment_type = 'PROOF_OF_WORK') THEN
            RAISE EXCEPTION 'Proof-of-work attachment required before submission' USING ERRCODE = 'check_violation';
        END IF;
        NEW.completion_date := COALESCE(NEW.completion_date, NOW());
        NEW.is_verified     := FALSE;
        NEW.verified_by     := NULL;
        NEW.verified_at     := NULL;
        NEW.actual_score    := 0;
        NEW.delay_days      := 0;

    ELSIF v_to = 'DONE' THEN
        IF v_from = 'AWAITING_VERIFICATION' THEN
            -- Approval: must be attributed; manager may override the score within [0, allocated].
            IF NOT NEW.is_verified OR NEW.verified_by IS NULL THEN
                RAISE EXCEPTION 'Approval must set is_verified and verified_by' USING ERRCODE = 'check_violation';
            END IF;
            NEW.verified_at  := COALESCE(NEW.verified_at, NOW());
            NEW.delay_days   := public.calc_delay_days(NEW.current_target_date, OLD.completion_date);
            NEW.completion_date := OLD.completion_date;
            -- A score supplied with the approval is a manager override (clamped); otherwise compute it.
            -- (OLD.actual_score is always 0 while awaiting verification.)
            IF NEW.actual_score IS DISTINCT FROM OLD.actual_score THEN
                NEW.actual_score := LEAST(NEW.allocated_score, GREATEST(0, NEW.actual_score));
            ELSE
                NEW.actual_score := public.calc_sla_score(NEW.allocated_score, NEW.delay_days);
            END IF;
        ELSE
            -- Direct sign-off is only for tasks that need no verification.
            IF NEW.verification_needed THEN
                RAISE EXCEPTION 'Task requires verification; submit it for review instead' USING ERRCODE = 'check_violation';
            END IF;
            NEW.completion_date := COALESCE(NEW.completion_date, NOW());
            NEW.is_verified     := FALSE;
            NEW.verified_by     := NULL;
            NEW.verified_at     := NULL;
            NEW.delay_days      := public.calc_delay_days(NEW.current_target_date, NEW.completion_date);
            NEW.actual_score    := public.calc_sla_score(NEW.allocated_score, NEW.delay_days);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_tasks_lifecycle ON tasks;
CREATE TRIGGER trigger_tasks_lifecycle
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION public.enforce_task_lifecycle();

-- New tasks created by users always start in the backlog with no completion / verification state.
-- Trusted service-role inserts (auth.uid() IS NULL, e.g. historical imports) are left as-is,
-- except that OVERDUE is never stored.
CREATE OR REPLACE FUNCTION public.enforce_task_initial_state()
RETURNS TRIGGER AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        IF NEW.status = 'OVERDUE' THEN
            NEW.status := 'IN_PROGRESS';
        END IF;
        RETURN NEW;
    END IF;
    NEW.status          := 'PENDING';
    NEW.completion_date := NULL;
    NEW.is_verified     := FALSE;
    NEW.verified_by     := NULL;
    NEW.verified_at     := NULL;
    NEW.actual_score    := 0;
    NEW.delay_days      := 0;
    NEW.revision_count  := 0;
    NEW.archived_at     := NULL;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tasks_initial_state ON tasks;
CREATE TRIGGER trigger_tasks_initial_state
    BEFORE INSERT ON tasks
    FOR EACH ROW EXECUTE FUNCTION public.enforce_task_initial_state();

-- 7. DEADLINE EXTENSIONS (the only path that may move a delegatee's deadline) --
CREATE OR REPLACE FUNCTION public.request_task_revision(
    p_task_id UUID,
    p_new_target_date TIMESTAMPTZ,
    p_reason TEXT
) RETURNS task_revisions AS $$
DECLARE
    v_task     tasks;
    v_actor    UUID := auth.uid();
    v_role     user_role := public.current_user_role();
    v_manager  BOOLEAN;
    v_revision task_revisions;
BEGIN
    SELECT * INTO v_task FROM tasks WHERE id = p_task_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Task not found';
    END IF;
    IF NOT public.is_org_active(v_task.org_id) THEN
        RAISE EXCEPTION 'Workspace is not active' USING ERRCODE = 'insufficient_privilege';
    END IF;

    v_manager := v_role IN ('SUPERADMIN', 'COMPANY_ADMIN', 'ADMIN')
        OR (v_role = 'DELEGATOR' AND v_actor = v_task.delegator_id);
    IF NOT v_manager AND v_actor IS DISTINCT FROM v_task.delegatee_id THEN
        RAISE EXCEPTION 'Not allowed to extend this task' USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF v_task.status NOT IN ('PENDING', 'IN_PROGRESS', 'OVERDUE') THEN
        RAISE EXCEPTION 'Deadline extensions are only possible while work is still open' USING ERRCODE = 'check_violation';
    END IF;
    IF v_task.revision_count >= v_task.max_revision_allowed THEN
        RAISE EXCEPTION 'Maximum revision limit of % reached', v_task.max_revision_allowed USING ERRCODE = 'check_violation';
    END IF;
    IF p_new_target_date <= v_task.current_target_date THEN
        RAISE EXCEPTION 'Requested date must be after the current deadline' USING ERRCODE = 'check_violation';
    END IF;

    PERFORM set_config('ctms.revision_in_progress', 'on', true);
    UPDATE tasks
       SET current_target_date = p_new_target_date,
           revision_count      = revision_count + 1
     WHERE id = p_task_id;
    PERFORM set_config('ctms.revision_in_progress', 'off', true);

    INSERT INTO task_revisions (task_id, requested_by, previous_target_date, new_target_date, reason, approved_by, status)
    VALUES (p_task_id, v_actor, v_task.current_target_date, p_new_target_date, p_reason,
            CASE WHEN v_manager THEN v_actor ELSE NULL END,
            CASE WHEN v_manager THEN 'APPROVED' ELSE 'AUTO_APPROVED' END)
    RETURNING * INTO v_revision;

    RETURN v_revision;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. ORGANIZATION LIFECYCLE ----------------------------------------------------
-- Kill switch ON remembers the billing state; OFF restores it (respecting expiry).
CREATE OR REPLACE FUNCTION public.enforce_org_lifecycle()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_suspended AND NOT OLD.is_suspended THEN
        NEW.pre_suspension_status := CASE WHEN OLD.subscription_status = 'SUSPENDED'
                                          THEN 'ACTIVE'::org_subscription_status
                                          ELSE OLD.subscription_status END;
        NEW.subscription_status   := 'SUSPENDED';
        NEW.suspended_at          := COALESCE(NEW.suspended_at, NOW());
    ELSIF NOT NEW.is_suspended AND OLD.is_suspended THEN
        NEW.subscription_status := COALESCE(OLD.pre_suspension_status, 'ACTIVE');
        IF NEW.subscription_status = 'SUSPENDED' THEN
            NEW.subscription_status := 'ACTIVE';
        END IF;
        IF NEW.subscription_status <> 'CANCELLED' AND NEW.subscription_expires_at <= NOW() THEN
            NEW.subscription_status := 'EXPIRED';
        END IF;
        NEW.pre_suspension_status := NULL;
        NEW.suspended_at          := NULL;
        NEW.suspension_reason     := NULL;
    ELSIF NOT NEW.is_suspended AND NEW.subscription_status = 'SUSPENDED' THEN
        RAISE EXCEPTION 'Use is_suspended (the kill switch) to suspend an organization' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_orgs_lifecycle ON organizations;
CREATE TRIGGER trigger_orgs_lifecycle
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION public.enforce_org_lifecycle();

-- Persist expiry for tenants past their end date (call from pg_cron or the cron route).
CREATE OR REPLACE FUNCTION public.sweep_expired_organizations()
RETURNS INT AS $$
DECLARE
    v_count INT;
BEGIN
    UPDATE organizations
       SET subscription_status = 'EXPIRED'
     WHERE is_suspended = FALSE
       AND subscription_status IN ('TRIAL', 'ACTIVE', 'PAST_DUE')
       AND subscription_expires_at <= NOW();
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. ACCOUNT STATE: deactivated users lose access ------------------------------
-- Tighten every tenant policy by requiring an active profile for the caller.
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN AS $$
    SELECT COALESCE((SELECT is_active FROM profiles WHERE id = auth.uid()), FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

DROP POLICY IF EXISTS "Company Admins and Admins manage tasks" ON tasks;
CREATE POLICY "Company Admins and Admins manage tasks" ON tasks FOR ALL USING (
    public.is_org_active(org_id) AND public.is_active_user() AND
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.org_id = tasks.org_id AND profiles.role IN ('COMPANY_ADMIN', 'ADMIN'))
);

DROP POLICY IF EXISTS "Boss views org tasks" ON tasks;
CREATE POLICY "Boss views org tasks" ON tasks FOR SELECT USING (
    public.is_org_active(org_id) AND public.is_active_user() AND
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.org_id = tasks.org_id AND profiles.role = 'BOSS')
);

DROP POLICY IF EXISTS "Delegators manage their delegated tasks" ON tasks;
CREATE POLICY "Delegators manage their delegated tasks" ON tasks FOR ALL USING (
    public.is_org_active(org_id) AND public.is_active_user() AND
    delegator_id = auth.uid()
);

DROP POLICY IF EXISTS "Delegatees view assigned tasks" ON tasks;
CREATE POLICY "Delegatees view assigned tasks" ON tasks FOR SELECT USING (
    public.is_org_active(org_id) AND public.is_active_user() AND
    delegatee_id = auth.uid()
);

-- Column-level limits for delegatees are enforced by enforce_task_lifecycle().
DROP POLICY IF EXISTS "Delegatees update assigned tasks" ON tasks;
CREATE POLICY "Delegatees update assigned tasks" ON tasks FOR UPDATE USING (
    public.is_org_active(org_id) AND public.is_active_user() AND
    delegatee_id = auth.uid()
) WITH CHECK (
    delegatee_id = auth.uid()
);
