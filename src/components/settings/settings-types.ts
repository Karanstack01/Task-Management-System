export type SettingsTabId =
  | "organization"
  | "team_roles"
  | "notifications"
  | "integrations"
  | "sla_automation"
  | "billing"
  | "security"
  | "audit_logs";

export interface IntegrationItem {
  id: string;
  name: string;
  category: "messaging" | "email_docs" | "storage" | "accounting" | "visibility" | "crm" | "telematics";
  categoryLabel: string;
  description: string;
  status: "connected" | "needs_attention" | "available";
  syncMeta: string;
  logo: string;
  iconBg: string;
  isPopular?: boolean;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  environment: "production" | "sandbox";
  scopes: string[];
  lastUsed: string;
  createdDate: string;
  expiresIn: string;
}

export interface InvoiceItem {
  id: string;
  invoiceNo: string;
  date: string;
  amount: string;
  status: "paid" | "pending";
  pdfUrl?: string;
}

export interface ActiveSessionItem {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface SecurityEventItem {
  id: string;
  type: "sign_in" | "blocked" | "key_rotated" | "two_factor";
  title: string;
  location: string;
  timestamp: string;
  actor: string;
}

export interface AuditLogItem {
  id: string;
  time: string;
  actor: {
    name: string;
    type: "agent" | "human";
    role: string;
    avatarUrl?: string;
    initials: string;
  };
  action: string;
  target: string;
  source: string;
}

export interface RetentionPolicySettings {
  peopleActions: string;
  agentActions: string;
  signIns: string;
  exportsAndApi: string;
  legalHold: boolean;
}
