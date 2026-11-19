"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Bell,
  Plug,
  Sliders,
  CreditCard,
  Shield,
  FileSpreadsheet,
} from "lucide-react";
import { SettingsTabId } from "@/components/settings/settings-types";
import { OrganizationTab } from "@/components/settings/organization-tab";
import { TeamRolesTab } from "@/components/settings/team-roles-tab";
import { NotificationsTab } from "@/components/settings/notifications-tab";
import { IntegrationsTab } from "@/components/settings/integrations-tab";
import { SlaAutomationTab } from "@/components/settings/sla-automation-tab";
import { BillingTab } from "@/components/settings/billing-tab";
import { SecurityTab } from "@/components/settings/security-tab";
import { AuditLogsTab } from "@/components/settings/audit-logs-tab";
import { useUIStore, RoleType } from "@/lib/store/ui-store";

interface NavTabItem {
  id: SettingsTabId;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  roles?: RoleType[];
}

const SETTINGS_TABS: NavTabItem[] = [
  {
    id: "organization",
    label: "Organization",
    icon: Building2,
    roles: ["SUPERADMIN", "COMPANY_ADMIN", "ADMIN"],
  },
  {
    id: "team_roles",
    label: "Team & roles",
    icon: Users,
    roles: ["SUPERADMIN", "COMPANY_ADMIN", "ADMIN", "BOSS"],
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    roles: ["SUPERADMIN", "COMPANY_ADMIN", "ADMIN", "BOSS", "DELEGATOR", "DELEGATEE"],
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Plug,
    badge: "6 live",
    badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    roles: ["SUPERADMIN", "COMPANY_ADMIN", "ADMIN"],
  },
  {
    id: "sla_automation",
    label: "AI & automation",
    icon: Sliders,
    roles: ["SUPERADMIN", "COMPANY_ADMIN", "ADMIN"],
  },
  {
    id: "billing",
    label: "Billing",
    icon: CreditCard,
    roles: ["SUPERADMIN", "COMPANY_ADMIN"],
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    badge: "SOC 2",
    badgeColor: "bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand",
    roles: ["SUPERADMIN", "COMPANY_ADMIN", "ADMIN"],
  },
  {
    id: "audit_logs",
    label: "Audit logs",
    icon: FileSpreadsheet,
    badge: "Protected",
    roles: ["SUPERADMIN", "COMPANY_ADMIN", "ADMIN"],
  },
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") as SettingsTabId | null;
  const { setActiveSection, activeRole } = useUIStore();

  // Role-filtered tabs
  const allowedTabs = useMemo(() => {
    return SETTINGS_TABS.filter(
      (tab) => !tab.roles || tab.roles.includes(activeRole)
    );
  }, [activeRole]);

  // Initial tab resolution
  const [activeTab, setActiveTab] = useState<SettingsTabId>(() => {
    if (tabParam && allowedTabs.some((t) => t.id === tabParam)) {
      return tabParam;
    }
    return allowedTabs[0]?.id || "notifications";
  });

  useEffect(() => {
    setActiveSection("settings");
    // Ensure activeTab is permitted for current role
    const isCurrentAllowed = allowedTabs.some((t) => t.id === activeTab);
    if (!isCurrentAllowed && allowedTabs.length > 0) {
      const fallback = allowedTabs[0].id;
      setActiveTab(fallback);
      router.replace(`/settings?tab=${fallback}`, { scroll: false });
    } else if (tabParam && tabParam !== activeTab && allowedTabs.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeRole, allowedTabs, activeTab, setActiveSection, router]);

  const handleSelectTab = (id: SettingsTabId) => {
    setActiveTab(id);
    router.replace(`/settings?tab=${id}`, { scroll: false });
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      {/* Mobile-Friendly Horizontal Pill Scroller (Only visible when siderow is hidden or on small screens) */}
      <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {allowedTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSelectTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                isActive
                  ? "bg-[#111111] dark:bg-white dark:text-[#111111] text-white shadow-xs"
                  : "bg-white dark:bg-[#111111] border border-black/[0.06] dark:border-white/[0.08] text-[#666666] dark:text-slate-300"
              }`}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Settings Content: seamlessly rendered on the full-height canvas with smooth tab switch transition */}
      <div key={activeTab} className="tab-switch-enter">
        {activeTab === "organization" && <OrganizationTab />}
        {activeTab === "team_roles" && <TeamRolesTab />}
        {activeTab === "notifications" && <NotificationsTab />}
        {activeTab === "integrations" && <IntegrationsTab />}
        {activeTab === "sla_automation" && <SlaAutomationTab />}
        {activeTab === "billing" && <BillingTab />}
        {activeTab === "security" && <SecurityTab />}
        {activeTab === "audit_logs" && <AuditLogsTab />}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#111111] dark:border-white" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
