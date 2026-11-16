// StackDrove CTMS - Enterprise Email Templates (Cross-Client & Outlook Compatible)
import { getAppUrl } from "@/lib/integrations/app-url";

function escapeHtml(value: string): string {
  return String(value).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

export interface TaskAssignedEmailProps {
  taskNo: number;
  title: string;
  delegatorName: string;
  priority: string;
  targetDate: string;
  shortLink?: string;
}

export interface TaskSubmittedEmailProps {
  taskNo: number;
  title: string;
  delegateeName: string;
  deliverableName: string;
  deliverableUrl: string;
  verifyLink?: string;
}

export interface TaskVerifiedEmailProps {
  taskNo: number;
  title: string;
  score: number;
  delayDays: number;
  remarks: string;
  verifiedByName: string;
}

export interface DailyDigestEmailProps {
  recipientName: string;
  tasks: Array<{ taskNo: number; title: string; priority: string; targetDate: string }>;
  overdueCount: number;
}

const baseEmailWrapper = (title: string, bodyContent: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F1F5F9; margin: 0; padding: 20px; color: #0B1B3F; }
    .email-container { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 12px rgba(11, 27, 63, 0.05); }
    .email-header { background-color: #0B1B3F; padding: 24px; text-align: center; }
    .email-header h1 { color: #FFFFFF; font-size: 18px; margin: 0; font-weight: 800; letter-spacing: 0.5px; }
    .email-header span { color: #00C48C; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; display: block; margin-top: 4px; }
    .email-body { padding: 32px 28px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .badge-critical { background-color: #FEE2E2; color: #DC2626; }
    .badge-high { background-color: #FEF3C7; color: #D97706; }
    .badge-medium { background-color: #DBEAFE; color: #2563EB; }
    .btn { display: inline-block; background-color: #0B1B3F; color: #FFFFFF !important; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-top: 20px; }
    .btn:hover { background-color: #142857; }
    .info-box { background: #F8FAFC; border-left: 4px solid #00C48C; padding: 16px; border-radius: 4px; margin: 16px 0; }
    .email-footer { background: #F8FAFC; padding: 18px; text-align: center; font-size: 11px; color: #64748B; border-top: 1px solid #E2E8F0; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>StackDrove CTMS</h1>
      <span>Enterprise Task Automation</span>
    </div>
    <div class="email-body">
      ${bodyContent}
    </div>
    <div class="email-footer">
      Sent automatically by StackDrove CTMS.<br>
      © ${new Date().getFullYear()} StackDrove Technologies. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

export function renderTaskAssignedEmail(props: TaskAssignedEmailProps): { subject: string; html: string } {
  const subject = `[Task Assigned] #${props.taskNo} - ${props.title}`;
  const priorityClass =
    props.priority === "CRITICAL"
      ? "badge-critical"
      : props.priority === "HIGH"
      ? "badge-high"
      : "badge-medium";

  const html = baseEmailWrapper(
    subject,
    `
    <h2 style="font-size: 20px; margin-top: 0; color: #0B1B3F;">New Task Assigned to You</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #475569;">
      A new task has been delegated to you by <strong>${props.delegatorName}</strong>. Please review the deliverables and complete by the SLA deadline.
    </p>

    <div class="info-box">
      <div style="font-size: 12px; color: #64748B; margin-bottom: 4px;">TASK NUMBER</div>
      <div style="font-size: 16px; font-weight: 800; color: #0B1B3F; margin-bottom: 12px;">#${props.taskNo}</div>

      <div style="font-size: 12px; color: #64748B; margin-bottom: 4px;">TITLE</div>
      <div style="font-size: 14px; font-weight: 600; color: #0B1B3F; margin-bottom: 12px;">${props.title}</div>

      <div style="display: flex; gap: 20px;">
        <div>
          <span style="font-size: 11px; color: #64748B; display: block;">PRIORITY</span>
          <span class="badge ${priorityClass}">${props.priority}</span>
        </div>
        <div style="margin-left: 20px;">
          <span style="font-size: 11px; color: #64748B; display: block;">DEADLINE</span>
          <span style="font-size: 13px; font-weight: 700; color: #0B1B3F;">${new Date(props.targetDate).toLocaleDateString()}</span>
        </div>
      </div>
    </div>

    <center>
      <a href="${props.shortLink || `${getAppUrl()}/delegatee`}" class="btn">
        View Task & Update Progress →
      </a>
    </center>
  `
  );

  return { subject, html };
}

export function renderTaskSubmittedEmail(props: TaskSubmittedEmailProps): { subject: string; html: string } {
  const subject = `[Verification Needed] #${props.taskNo} - Proof Submitted by ${props.delegateeName}`;

  const html = baseEmailWrapper(
    subject,
    `
    <h2 style="font-size: 20px; margin-top: 0; color: #0B1B3F;">Deliverable Awaiting Your Verification</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #475569;">
      <strong>${props.delegateeName}</strong> has submitted proof of work for task <strong>#${props.taskNo}</strong>. Please inspect the deliverable and award the performance score.
    </p>

    <div class="info-box">
      <div style="font-size: 12px; color: #64748B; margin-bottom: 4px;">TASK TITLE</div>
      <div style="font-size: 14px; font-weight: 700; color: #0B1B3F; margin-bottom: 12px;">${props.title}</div>

      <div style="font-size: 12px; color: #64748B; margin-bottom: 4px;">ATTACHED DELIVERABLE</div>
      <div style="font-size: 13px; font-weight: 600; color: #2743F5;">
        <a href="${props.deliverableUrl}" target="_blank" style="color: #2743F5; text-decoration: underline; display: inline-flex; align-items: center; gap: 6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>${props.deliverableName}</span>
        </a>
      </div>
    </div>

    <center>
      <a href="${props.verifyLink || `${getAppUrl()}/verify`}" class="btn" style="background-color: #00C48C; color: #0B1B3F !important;">
        Inspect & Verify Task →
      </a>
    </center>
  `
  );

  return { subject, html };
}

export function renderTaskVerifiedEmail(props: TaskVerifiedEmailProps): { subject: string; html: string } {
  const subject = `[Task Verified] #${props.taskNo} - Score Awarded: ${props.score.toFixed(1)}/10`;

  const html = baseEmailWrapper(
    subject,
    `
    <h2 style="font-size: 20px; margin-top: 0; color: #0B1B3F;">Your Task Has Been Verified</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #475569;">
      Task <strong>#${props.taskNo} (${props.title})</strong> has been verified by <strong>${props.verifiedByName}</strong>.
    </p>

    <div style="text-align: center; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin: 16px 0;">
      <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748B;">AWARDED PUNCTUALITY SCORE</span>
      <div style="font-size: 36px; font-weight: 900; color: #00C48C; margin: 4px 0;">
        ${props.score.toFixed(1)} <span style="font-size: 16px; color: #64748B;">/ 10.0</span>
      </div>
      <div style="font-size: 12px; color: ${props.delayDays > 0 ? "#DC2626" : "#059669"}; font-weight: 600;">
        ${props.delayDays > 0 ? `Delayed by ${props.delayDays} day(s) (-${props.delayDays * 20}% penalty)` : "Delivered strictly on time (Full Marks)"}
      </div>
    </div>

    <div class="info-box">
      <div style="font-size: 12px; color: #64748B; margin-bottom: 4px;">MANAGER REMARKS</div>
      <div style="font-size: 13px; color: #0B1B3F; font-style: italic;">"${props.remarks}"</div>
    </div>

    <center>
      <a href="${getAppUrl()}/scorecards" class="btn">
        View My Performance Scorecard →
      </a>
    </center>
  `
  );

  return { subject, html };
}

export function renderDailyDigestEmail(props: DailyDigestEmailProps): { subject: string; html: string } {
  const subject =
    props.overdueCount > 0
      ? `[Reminder] ${props.tasks.length} task(s) need attention - ${props.overdueCount} overdue`
      : `[Reminder] ${props.tasks.length} task(s) due today`;

  const rows = props.tasks
    .map(
      (t) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #E2E8F0;font-size:13px;font-weight:700;color:#0B1B3F;">#${t.taskNo}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#0B1B3F;">${escapeHtml(t.title)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #E2E8F0;font-size:12px;color:#475569;">${escapeHtml(t.priority)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #E2E8F0;font-size:12px;color:#475569;">${escapeHtml(t.targetDate)}</td>
      </tr>`
    )
    .join("");

  const html = baseEmailWrapper(
    subject,
    `
    <h2 style="font-size: 20px; margin-top: 0; color: #0B1B3F;">Task Follow-up Reminder</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #475569;">
      Hi <strong>${escapeHtml(props.recipientName)}</strong>, the following tasks assigned to you are due today or overdue.
      ${props.overdueCount > 0 ? `<strong style="color:#DC2626;">${props.overdueCount} overdue.</strong>` : ""}
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #E2E8F0;border-radius:8px;border-collapse:separate;">
      <thead>
        <tr style="background:#F8FAFC;">
          <th align="left" style="padding:8px 10px;font-size:11px;color:#64748B;">TASK</th>
          <th align="left" style="padding:8px 10px;font-size:11px;color:#64748B;">TITLE</th>
          <th align="left" style="padding:8px 10px;font-size:11px;color:#64748B;">PRIORITY</th>
          <th align="left" style="padding:8px 10px;font-size:11px;color:#64748B;">DUE</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <center>
      <a href="${getAppUrl()}/delegatee" class="btn">Open My Tasks &amp; Update Status →</a>
    </center>
  `
  );

  return { subject, html };
}

