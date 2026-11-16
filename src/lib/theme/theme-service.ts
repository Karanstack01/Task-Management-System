export type ThemeMode = "light" | "dark";
export type ThemePreference = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "stackdrove_theme_pref";

/**
 * Returns the currently active theme ('light' or 'dark').
 */
export function getCurrentTheme(): ThemeMode {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * Returns user's stored preference ('light', 'dark', or 'system').
 */
export function getThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved;
    }
  } catch {}
  return "system";
}

/**
 * Resolves effective ThemeMode for a given preference.
 */
export function resolveThemeMode(pref: ThemePreference): ThemeMode {
  if (pref === "dark") return "dark";
  if (pref === "light") return "light";
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

/**
 * Applies the specified theme directly to documentElement and persists to localStorage.
 */
export function applyTheme(theme: ThemeMode, preference?: ThemePreference): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
  } else {
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
  }

  try {
    if (preference) {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  } catch {
    // localStorage may be unavailable in private browsing modes
  }

  // Dispatch custom event for synchronized UI updates
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent("stackdrove:theme-change", {
          detail: { theme, preference: preference || theme },
        })
      );
    } catch {
      // Ignore if CustomEvent is unsupported
    }
  }
}

/**
 * Sets theme preference ('light', 'dark', or 'system') and applies corresponding mode.
 */
export function setThemePreference(preference: ThemePreference): void {
  const effectiveMode = resolveThemeMode(preference);
  applyTheme(effectiveMode, preference);
}

/**
 * Initializes theme on initial mount from localStorage or system preference.
 */
export function initTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";

  const pref = getThemePreference();
  const effectiveTheme = resolveThemeMode(pref);
  applyTheme(effectiveTheme, pref);

  // Listen to OS system preference changes in case preference === 'system'
  try {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = (e: MediaQueryListEvent) => {
      const currentPref = getThemePreference();
      if (currentPref === "system") {
        applyTheme(e.matches ? "dark" : "light", "system");
      }
    };
    mediaQuery.removeEventListener("change", handleSystemChange);
    mediaQuery.addEventListener("change", handleSystemChange);
  } catch {}

  return effectiveTheme;
}

/**
 * Executes the Circular Wipe View Transition opening outward from the given trigger element.
 */
export function wipeThemeTransition(
  origin?: Element | null,
  targetTheme?: ThemeMode
): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const current = getCurrentTheme();
  const nextTheme = targetTheme ?? (current === "dark" ? "light" : "dark");

  // Determine origin center coordinates
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;

  if (origin) {
    const rect = origin.getBoundingClientRect();
    x = rect.left + rect.width / 2;
    y = rect.top + rect.height / 2;
  }

  // Calculate the hypotenuse from button center to the furthest viewport corner
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  // Set CSS variables for CSS keyframe animation
  document.documentElement.style.setProperty("--wipe-x", `${x}px`);
  document.documentElement.style.setProperty("--wipe-y", `${y}px`);
  document.documentElement.style.setProperty("--wipe-radius", `${endRadius}px`);

  // Fallback for browsers or environments without View Transitions API
  if (
    typeof document.startViewTransition !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    applyTheme(nextTheme);
    return;
  }

  // Start the native view transition
  try {
    const transition = document.startViewTransition(() => {
      applyTheme(nextTheme);
    });

    if (transition && transition.ready) {
      transition.ready
        .then(() => {
          try {
            document.documentElement.animate(
              {
                clipPath: [
                  `circle(0px at ${x}px ${y}px)`,
                  `circle(${endRadius}px at ${x}px ${y}px)`,
                ],
              },
              {
                duration: 550,
                easing: "cubic-bezier(.65, 0, .35, 1)",
                pseudoElement: "::view-transition-new(root)",
              }
            );
          } catch {
            // Browser might not support pseudoElement in Web Animations API,
            // CSS keyframe @keyframes circle-wipe handles it as fallback
          }
        })
        .catch(() => {
          applyTheme(nextTheme);
        });
    }
  } catch {
    applyTheme(nextTheme);
  }
}
