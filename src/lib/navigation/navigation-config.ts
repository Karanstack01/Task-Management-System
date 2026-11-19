import React from "react";
import {
  Crown,
  Building2,
  ShieldCheck,
  Briefcase,
  UserCheck,
  CheckSquare,
  ListTodo,
  BarChart3,
  Award,
  Settings,
  PlusCircle,
  Clock,
  Sparkles,
  Users,
  Bell,
  Plug,
  Sliders,
  CreditCard,
  Shield,
  FileSpreadsheet,
  Kanban,
} from "lucide-react";
import { RoleType, SectionId } from "@/lib/store/ui-store";

export interface NavItemConfig {
  id: string;
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeType?: "chartreuse" | "red" | "blue" | "default";
  roles?: RoleType[];
}

export interface NavSectionConfig {
  id: SectionId;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  description: string;
  defaultHref: string;
  items: NavItemConfig[];
}

export const NAV_SECTIONS: NavSectionConfig[] = [
  {
    id: "workspaces",
    label: "Workspaces",
    shortLabel: "Workspaces",
    icon: Briefcase,
    description: "Operational task matrices & personal boards",
    defaultHref: "/delegatee",
    items: [
      {
        id: "boss",
        title: "Executive (Boss)",
        href: "/boss",
        icon: Briefcase,
        roles: ["SUPERADMIN", "COMPANY_ADMIN", "ADMIN", "BOSS"],
      },
      {
        id: "delegator",
        title: "Delegator (Manager)",
        href: "/delegator",
        icon: UserCheck,
        roles: ["SUPERADMIN", "COMPANY_ADMIN", "ADMIN", "BOSS", "DELEGATOR"],
      },
      {
        id: "delegatee",
        title: "My Tasks (Delegatee)",
        href: "/delegatee",
        icon: ListTodo,
        roles: ["SUPERADMIN", "COMPANY_ADMIN", "ADMIN", "BOSS", "DELEGATOR", "DELEGATEE"],
      },
      {
        id: "checklist",
        title: "Daily Checklist",
        href: "/checklist",
        icon: CheckSquare,
        roles: ["SUPERADMIN", "COMPANY_ADMIN", "ADMIN", "BOSS", "DELEGATOR", "DELEGATEE"],
      },
    ],
  },
  {
    id: "platform",
    label: "Platform & Governance",
    shortLabel: "Platform",
    icon: Crown,
    description: "Enterprise licensing & governance controls",
    defaultHref: "/superadmin",
    items: [
      {
        id: "superadmin",
        title: "Superadmin Hub",
        href: "/superadmin",
        icon: Crown,
        roles: ["SUPERADMIN"],
        badge: "Root",
        badgeType: "default",
      },
      {
        id: "company_admin",
        title: "Company Admin",
        href: "/company-admin",
        icon: Building2,
        roles: ["SUPERADMIN", "COMPANY_ADMIN"],
      },
      {
        id: "admin",
        title: "Admin Console",
        href: "/admin",
        icon: ShieldCheck,
        roles: ["SUPERADMIN", "COMPANY_ADMIN", "ADMIN"],
      },
    ],
  },
  {
    id: "tasks",
    label: "Task Actions",
    shortLabel: "Tasks",
    icon: ListTodo,
    description: "Task dispatch, QA queue & automation",
    defaultHref: "/tasks",
    items: [
      {
        id: "all_tasks",
        title: "Tasks & Kanban",
        href: "/tasks",
        icon: Kanban,
        badge: "Live",
      },
      {
        id: "create_task",
        title: "Create Task",
        href: "/tasks/create",
        icon: PlusCircle,
        roles: ["SUPERADMIN", "COMPANY_ADMIN", "ADMIN", "BOSS", "DELEGATOR"],
      },
      {
        id: "verify",
        title: "Verification Queue",
        href: "/verify",
        icon: Clock,
        roles: ["SUPERADMIN", "COMPANY_ADMIN", "ADMIN", "BOSS", "DELEGATOR"],
      },
      {
        id: "recurring",
        title: "Recurring Schedules",
        href: "/recurring",
        icon: Sparkles,
        roles: ["SUPERADMIN", "COMPANY_ADMIN", "ADMIN", "BOSS", "DELEGATOR"],
      },
    ],
  },
  {
    id: "insights",
    label: "Insights & Analytics",
    shortLabel: "Insights",
    icon: BarChart3,
    description: "Operational metrics & performance leaderboards",
    defaultHref: "/dashboard",
    items: [
      {
        id: "dashboard",
        title: "Analytics Dashboard",
        href: "/dashboard",
        icon: BarChart3,
        roles: ["SUPERADMIN", "COMPANY_ADMIN", "ADMIN", "BOSS", "DELEGATOR"],
      },
      {
        id: "scorecards",
        title: "Scorecards & Ranks",
        href: "/scorecards",
        icon: Award,
        roles: ["SUPERADMIN", "COMPANY_ADMIN", "ADMIN", "BOSS", "DELEGATOR", "DELEGATEE"],
      },
    ],
  },
  {
    id: "settings",
    label: "System Settings",
    shortLabel: "Settings",
    icon: Settings,
    description: "Workspace configuration, branding & security",
    defaultHref: "/settings?tab=organization",
    items: [
      {
        id: "org_profile",
        title: "Organization Profile",
        href: "/settings?tab=organization",
        icon: Building2,
        roles: ["SUPERADMIN", "COMPANY_ADMIN", "ADMIN"],
      },
      {
        id: "team_roles",
        title: "Team & Roles",
        href: "/settings?tab=team_roles",
        icon: Users,
        roles: ["SUPERADMIN", "COMPANY_ADMIN", "ADMIN", "BOSS"],
      },
      {
        id: "notifications",
        title: "Notifications",
        href: "/settings?tab=notifications",
        icon: Bell,
        roles: ["SUPERADMIN", "COMPANY_ADMIN", "ADMIN", "BOSS", "DELEGATOR", "DELEGATEE"],
      },
      {
        id: "integrations",
        title: "Integrations",
        href: "/settings?tab=integrations",
        icon: Plug,
        badge: "6 live",
        roles: ["SUPERADMIN", "COMPANY_ADMIN", "ADMIN"],
      },
      {
        id: "sla_automation",
        title: "AI & Automation",
        href: "/settings?tab=sla_automation",
        icon: Sliders,
        roles: ["SUPERADMIN", "COMPANY_ADMIN", "ADMIN"],
      },
      {
        id: "billing",
        title: "Billing",
        href: "/settings?tab=billing",
        icon: CreditCard,
        roles: ["SUPERADMIN", "COMPANY_ADMIN"],
      },
      {
        id: "security",
        title: "Security & Compliance",
        href: "/settings?tab=security",
        icon: Shield,
        badge: "SOC 2",
        roles: ["SUPERADMIN", "COMPANY_ADMIN", "ADMIN"],
      },
      {
        id: "audit_logs",
        title: "Audit Logs",
        href: "/settings?tab=audit_logs",
        icon: FileSpreadsheet,
        badge: "Protected",
        roles: ["SUPERADMIN", "COMPANY_ADMIN", "ADMIN"],
      },
    ],
  },
];

export function isItemAllowed(item: NavItemConfig, role: RoleType): boolean {
  if (!item.roles || item.roles.length === 0) return true;
  return item.roles.includes(role);
}

export function isSectionAllowed(sec: NavSectionConfig, role: RoleType): boolean {
  return sec.items.some((item) => isItemAllowed(item, role));
}

export function getAccessibleSections(role: RoleType): NavSectionConfig[] {
  return NAV_SECTIONS.filter((sec) => isSectionAllowed(sec, role));
}

export function getDefaultHrefForRole(sec: NavSectionConfig, role: RoleType): string {
  const allowedItems = sec.items.filter((item) => isItemAllowed(item, role));
  if (allowedItems.length > 0) {
    return allowedItems[0].href;
  }
  return sec.defaultHref;
}

export function getSectionByPath(pathname: string): SectionId {
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/superadmin") || pathname.startsWith("/company-admin") || pathname.startsWith("/admin")) return "platform";
  if (pathname.startsWith("/tasks") || pathname.startsWith("/verify") || pathname.startsWith("/recurring")) return "tasks";
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/scorecards")) return "insights";
  return "workspaces";
}
