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

// Module-level handlers so initTheme() can be called more than once (React strict mode, remounts)
// without stacking listeners.
function handleSystemChange(e: MediaQueryListEvent) {
  // Only follow the OS while the user has chosen "System".
  if (getThemePreference() === "system") {
    applyTheme(e.matches ? "dark" : "light", "system");
  }
}

function handleStorageChange(e: StorageEvent) {
  // Another tab changed the preference: mirror it here.
  if (e.key !== THEME_STORAGE_KEY) return;
  const pref = getThemePreference();
  applyTheme(resolveThemeMode(pref), pref);
}

/**
 * Initializes theme on initial mount from localStorage or system preference, and keeps it in sync with
 * the operating system (while the preference is "system") and with other browser tabs.
 */
export function initTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";

  const pref = getThemePreference();
  const effectiveTheme = resolveThemeMode(pref);
  applyTheme(effectiveTheme, pref);

  try {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.removeEventListener("change", handleSystemChange);
    mediaQuery.addEventListener("change", handleSystemChange);
    window.removeEventListener("storage", handleStorageChange);
    window.addEventListener("storage", handleStorageChange);
  } catch {}

  return effectiveTheme;
}

/**
 * Switches to a light / dark / system preference. Plays the circular wipe when the visible theme actually changes
 * (e.g. choosing "System" while the OS already matches the current theme changes nothing on screen).
 */
export function setThemePreferenceAnimated(preference: ThemePreference, origin?: Element | null): void {
  const target = resolveThemeMode(preference);
  if (target === getCurrentTheme()) {
    applyTheme(target, preference);
    return;
  }
  wipeThemeTransition(origin, target, preference);
}

/**
 * Executes the Circular Wipe View Transition opening outward from the given trigger element.
 */
export function wipeThemeTransition(
  origin?: Element | null,
  targetTheme?: ThemeMode,
  /** The preference to remember. Omit for an explicit light/dark choice. */
  preference?: ThemePreference
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
    applyTheme(nextTheme, preference);
    return;
  }

  // Start the native view transition
  try {
    const transition = document.startViewTransition(() => {
      applyTheme(nextTheme, preference);
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
          applyTheme(nextTheme, preference);
        });
    }
  } catch {
    applyTheme(nextTheme, preference);
  }
}
