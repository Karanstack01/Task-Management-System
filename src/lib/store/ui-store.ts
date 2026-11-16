import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type RoleType =
  | "SUPERADMIN"
  | "COMPANY_ADMIN"
  | "ADMIN"
  | "BOSS"
  | "DELEGATOR"
  | "DELEGATEE";

export type SectionId =
  | "workspaces"
  | "platform"
  | "tasks"
  | "insights"
  | "settings";

/** Cookie the proxy checks to tell signed-in from signed-out requests. */
export const SESSION_COOKIE = "ctms_session";

function writeSessionCookie(active: boolean) {
  if (typeof document === "undefined") return;
  document.cookie = active
    ? `${SESSION_COOKIE}=1; Path=/; SameSite=Lax`
    : `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

interface UIState {
  sidebarOpen: boolean; // Mobile drawer state
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  siderowOpen: boolean; // Secondary siderow drawer panel state
  toggleSiderow: () => void;
  setSiderowOpen: (open: boolean) => void;

  activeSection: SectionId;
  setActiveSection: (sec: SectionId) => void;

  /**
   * SESSION: signed out (activeUserId = null) ⇄ signed in (activeUserId set).
   * activeRole is the role the UI is currently rendered as (the header "view as" switcher can change it).
   */
  activeUserId: string | null;
  activeRole: RoleType;
  setActiveRole: (role: RoleType) => void;
  startSession: (userId: string, role: RoleType) => void;
  endSession: () => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: false, // Default closed on mobile
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

      siderowOpen: true, // Default open on desktop
      toggleSiderow: () => set((state) => ({ siderowOpen: !state.siderowOpen })),
      setSiderowOpen: (open: boolean) => set({ siderowOpen: open }),

      activeSection: "workspaces",
      setActiveSection: (sec: SectionId) => set({ activeSection: sec }),

      activeUserId: null,
      activeRole: "COMPANY_ADMIN",
      setActiveRole: (role: RoleType) => set({ activeRole: role }),
      startSession: (userId: string, role: RoleType) => {
        writeSessionCookie(true);
        set({ activeUserId: userId, activeRole: role });
      },
      endSession: () => {
        writeSessionCookie(false);
        set({ activeUserId: null, activeRole: "COMPANY_ADMIN", activeSection: "workspaces" });
      },

      searchQuery: "",
      setSearchQuery: (query: string) => set({ searchQuery: query }),
    }),
    {
      name: "stackdrove_user_session",
      storage: createJSONStorage(() => localStorage),
      // Only the session survives reloads; drawers/search are per-visit UI state.
      partialize: (s) => ({ activeUserId: s.activeUserId, activeRole: s.activeRole }),
      // Rehydrated on the client after mount (see SessionHydrator) to avoid SSR hydration mismatches.
      skipHydration: true,
    }
  )
);
