"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListTodo, CheckSquare, PlusCircle, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();

  const links = [
    { title: "My Tasks", href: "/delegatee", icon: ListTodo },
    { title: "Checklist", href: "/checklist", icon: CheckSquare },
    { title: "New Task", href: "/tasks/create", icon: PlusCircle, highlight: true },
    { title: "Analytics", href: "/dashboard", icon: BarChart3 },
    { title: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/85 dark:bg-[#0E0F17]/90 backdrop-blur-2xl border-t border-black/[0.08] dark:border-white/[0.08] flex items-center justify-around px-2 z-30 shadow-[0_-4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_-4px_30px_rgba(0,0,0,0.7)] transition-colors select-none">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;

        if (link.highlight) {
          return (
            <Link
              key={link.href}
              href={link.href}
              className="relative -top-3.5 w-12 h-12 rounded-full bg-[#111111] dark:bg-white text-white dark:text-[#111111] flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.25)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.25)] ring-4 ring-[#EEF1F6] dark:ring-[#0A0B10] active:scale-95 transition-all cursor-pointer"
              title={link.title}
            >
              <Icon size={22} className="stroke-[2.5]" />
            </Link>
          );
        }

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex flex-col items-center gap-1 text-[10px] font-semibold transition-all py-1 px-2 rounded-lg",
              isActive
                ? "text-[#111111] dark:text-white"
                : "text-[#86868B] dark:text-[#A1A1A6] hover:text-[#111111] dark:hover:text-white"
            )}
          >
            <Icon size={18} className={cn(isActive && "stroke-[2.2]")} />
            <span>{link.title}</span>
            {isActive && (
              <span className="w-1 h-1 rounded-full bg-[#111111] dark:bg-white -mt-0.5" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

