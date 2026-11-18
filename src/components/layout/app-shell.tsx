"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";

/**
 * AppShell manages application-wide framing:
 * When on authentication routes (/login) or system lockouts (/saas-expired),
 * it completely exits the system shell, suppressing the sidebar, header,
 * mobile nav, and inner padding so the user is entirely outside the CTMS system.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isStandalone =
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
          {/* Keyed by route so every section switch replays the enter + stagger animation. */}
          <div key={pathname} className="page-enter">
            {children}
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}

