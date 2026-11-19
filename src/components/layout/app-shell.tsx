"use client";

import React, { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useUIStore } from "@/lib/store/ui-store";
import { useActiveOrgId, useActiveProfile } from "@/lib/hooks/use-active-org";
import { localDb } from "@/lib/data/dal";
import { Building2 } from "lucide-react";

/**
 * AppShell manages application-wide framing:
 * When on authentication routes (/login) or system lockouts (/saas-expired),
 * it completely exits the system shell, suppressing the sidebar, header,
 * mobile nav, and inner padding so the user is entirely outside the CTMS system.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Pages read the signed-in user's company on first render, so hold them back until the saved session is restored.
  const sessionReady = useSyncExternalStore(
    (onChange) => useUIStore.persist.onFinishHydration(onChange),
    () => useUIStore.persist.hasHydrated(),
    () => false
  );

  const orgId = useActiveOrgId();
  const profile = useActiveProfile();
  const managedOrgId = useUIStore((s) => s.managedOrgId);
  const setManagedOrgId = useUIStore((s) => s.setManagedOrgId);
  const orgs = profile?.role === "SUPERADMIN" ? ((localDb as unknown as { organizations: { id: string; name: string }[] }).organizations ?? []) : [];

  const isStandalone =
    pathname?.startsWith("/auth") ||
    pathname === "/login" ||
    pathname?.startsWith("/login") ||
    pathname === "/saas-expired" ||
    pathname?.startsWith("/saas-expired") ||
    pathname === "/terms" ||
    pathname?.startsWith("/terms") ||
    pathname === "/privacy" ||
    pathname?.startsWith("/privacy") ||
    pathname === "/support" ||
    pathname?.startsWith("/support");

  if (isStandalone) {
    return (
      <main className="w-full min-h-screen relative z-10 overflow-x-hidden">
        {children}
      </main>
    );
  }

  return (
    // `app-canvas` paints the gradient backdrop (see globals.css). This root never scrolls (pages scroll inside it),
    // so the backdrop stays fixed while glass panels move over it.
    <div className="app-canvas flex h-screen w-full relative overflow-hidden">
      {/* Subtle Minimal Specular Light for Apple Glass Refraction */}
      <div
        className="pointer-events-none fixed -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-white/60 via-white/20 to-transparent dark:from-white/[0.03] dark:via-transparent dark:to-transparent blur-3xl z-0"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed top-0 right-1/4 w-[500px] h-[250px] rounded-full bg-gradient-to-b from-white/40 via-transparent to-transparent dark:from-white/[0.02] dark:via-transparent dark:to-transparent blur-3xl z-0"
        aria-hidden="true"
      />
      <div key={`progress-${pathname}`} className="route-progress" aria-hidden="true" />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-transparent transition-colors duration-300 relative z-10">
        <Header />
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto overflow-x-hidden relative z-10">
          {orgs.length > 0 && (
            <div className="max-w-7xl mx-auto mb-4 flex items-center gap-2 text-xs text-[#666666] dark:text-[#A3A3A3]">
              <Building2 size={14} />
              <span className="font-semibold">Managing company</span>
              <select
                value={managedOrgId && orgs.some((o) => o.id === managedOrgId) ? managedOrgId : orgs[0].id}
                onChange={(e) => setManagedOrgId(e.target.value)}
                className="apple-input px-2.5 py-1 text-xs font-semibold"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}
          {/* Keyed by route and company so every switch replays the enter animation and reloads that company's data. */}
          <div key={`${pathname}:${orgId}`} className="page-enter">
            {sessionReady ? children : null}
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}

