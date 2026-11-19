"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, Eye, EyeOff, Loader2, Sun, Moon, Laptop } from "lucide-react";
import { useUIStore, RoleType } from "@/lib/store/ui-store";
import { resolveSignIn, signInWithPassword, signOutEverywhere, startOAuth, isProviderEnabled, type OAuthProviderId } from "@/lib/auth/sign-in";
import { notify } from "@/lib/notifications/toast-service";
import {
  getThemePreference,
  setThemePreference,
  ThemePreference,
} from "@/lib/theme/theme-service";
import { LoginShowcase } from "@/components/auth/login-showcase";

/**
 * Authentic Official Google 'G' Multi-Color SVG
 */
function GoogleLogo({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

/**
 * Authentic Official Microsoft 4-Color Square SVG
 */
function MicrosoftLogo({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { startSession } = useUIStore();

  // Form states
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<OAuthProviderId | null>(null);

  // Theme switcher state (light, dark, system)
  const [themePref, setThemePref] = useState<ThemePreference>("system");


  useEffect(() => {
    setThemePref(getThemePreference());
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ preference: ThemePreference }>;
      if (customEvent.detail?.preference) {
        setThemePref(customEvent.detail.preference);
      }
    };
    window.addEventListener("stackdrove:theme-change", handler);
    return () => window.removeEventListener("stackdrove:theme-change", handler);
  }, []);

  const handleThemeChange = (pref: ThemePreference) => {
    setThemePref(pref);
    setThemePreference(pref);
  };

  const routeForRole = (role: RoleType) => {
    if (role === "SUPERADMIN") return "/superadmin";
    if (role === "COMPANY_ADMIN") return "/company-admin";
    if (role === "ADMIN") return "/admin";
    if (role === "BOSS") return "/boss";
    if (role === "DELEGATOR") return "/delegator";
    return "/delegatee";
  };

  /** Where to go after sign-in: the page the proxy bounced us from, else the role's home. */
  const destinationFor = (role: RoleType) => {
    try {
      const next = new URLSearchParams(window.location.search).get("next");
      if (next && next.startsWith("/") && !next.startsWith("//")) return next;
    } catch {}
    return routeForRole(role);
  };

  /** Finishes a verified sign-in: maps the email to a workspace user and opens their home page. */
  const finishSignIn = async (email: string, via: string): Promise<boolean> => {
    const result = await resolveSignIn(email);
    switch (result.status) {
      case "no_profile":
        await signOutEverywhere();
        notify.error("No workspace access", {
          description: `${email} has not been added to any company yet. Ask your administrator to add this email.`,
        });
        return false;
      case "inactive":
        await signOutEverywhere();
        notify.error("Account Deactivated", {
          description: "Your account has been deactivated. Contact your workspace administrator.",
        });
        return false;
      case "workspace_missing":
        await signOutEverywhere();
        notify.error("Workspace Not Found", { description: "Your organization could not be loaded." });
        return false;
      case "blocked":
        await signOutEverywhere();
        notify.error("Workspace unavailable", { description: "Redirecting to subscription lock screen..." });
        router.push(
          `/saas-expired?org=${encodeURIComponent(result.orgName)}&reason=${encodeURIComponent(result.reason)}`
        );
        return false;
      case "ok":
        startSession(result.user.id, result.user.role);
        notify.success(`Welcome back, ${result.user.full_name}!`, {
          description: `Signed in ${via} as ${result.user.role}`,
        });
        router.push(destinationFor(result.user.role));
        return true;
    }
  };

  // Show errors sent back from the Google / Microsoft callback.
  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get("error");
    if (err) notify.error("Sign-in failed", { description: err });
  }, []);

  // Google & Microsoft sign-in: real OAuth through Supabase Auth (redirects away, returns via /auth/callback)
  const handleOAuthLogin = async (provider: OAuthProviderId) => {
    const label = provider === "google" ? "Google" : "Microsoft";
    setOauthProvider(provider);
    setLoading(true);
    try {
      if (!(await isProviderEnabled(provider))) {
        notify.error(`${label} sign-in is not enabled`, {
          description: `Turn on the ${label} provider in Supabase → Authentication → Providers (see SUPABASE_SETUP.md).`,
        });
        return;
      }
      const { error } = await startOAuth(provider);
      if (error) {
        notify.error(`${label} sign-in failed`, { description: error });
        return;
      }
      return; // browser is redirecting to the provider
    } catch {
      notify.error("Single Sign-On Failed", { description: "Could not reach the identity provider." });
    } finally {
      // Keep the spinner while the redirect happens; clear it only on failure paths.
      setLoading(false);
      setOauthProvider(null);
    }
  };

  // Email + password sign-in, verified by Supabase Auth
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = identifier.trim();
    if (!email || !password) {
      notify.warning("Email and password required", { description: "Enter your email and password to continue." });
      return;
    }

    setLoading(true);
    try {
      const { email: verified, error } = await signInWithPassword(email, password);
      if (error || !verified) {
        notify.error("Sign-in failed", {
          description: error === "Invalid login credentials" ? "Incorrect email or password." : error || "Could not sign in.",
        });
        return;
      }
      await finishSignIn(verified, "with password");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F1F1F1] dark:bg-[#0A0A0A] text-[#111111] dark:text-white select-none overflow-hidden">
      <LoginShowcase />

      {/* =========================================================================
          RIGHT SIDE: High-Contrast Minimal Login Form
          (Light/Dark/System Switcher, Google & Microsoft SSO, Clean Minimal Fields)
          ========================================================================= */}
      <div className="flex flex-col justify-between items-center w-full lg:w-1/2 min-h-screen px-6 sm:px-12 py-8 bg-white dark:bg-[#0B0B0E]">
        {/* Top Header: Logo on Mobile + Theme Switcher (Light / Dark / System) */}
        <div className="w-full flex items-center justify-between mb-4">
          <div className="lg:hidden flex items-center">
            <img
              src="/sd/stackdrove-logo-light.svg"
              alt="StackDrove"
              className="h-7 w-auto object-contain dark:hidden select-none pointer-events-none"
            />
            <img
              src="/sd/stackdrove-logo-dark.svg"
              alt="StackDrove"
              className="h-7 w-auto object-contain hidden dark:block select-none pointer-events-none"
            />
          </div>
          <div className="hidden lg:block" />

          {/* Apple-Style Theme Switcher: Light | Dark | System */}
          <div className="flex items-center p-0.5 rounded-lg bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.1] text-xs">
            <button
              type="button"
              onClick={() => handleThemeChange("light")}
              title="Light Mode"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                themePref === "light"
                  ? "bg-white text-[#111111] shadow-xs"
                  : "text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white"
              }`}
            >
              <Sun size={12} />
              <span className="hidden sm:inline">Light</span>
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange("dark")}
              title="Dark Mode"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                themePref === "dark"
                  ? "bg-[#111111] dark:bg-white dark:text-[#111111] text-white shadow-xs"
                  : "text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white"
              }`}
            >
              <Moon size={12} />
              <span className="hidden sm:inline">Dark</span>
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange("system")}
              title="System Preference"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                themePref === "system"
                  ? "bg-white dark:bg-white/20 text-[#111111] dark:text-white shadow-xs"
                  : "text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white"
              }`}
            >
              <Laptop size={12} />
              <span className="hidden sm:inline">System</span>
            </button>
          </div>
        </div>

        {/* Center Container: Minimal Clean Form */}
        <div className="w-full max-w-[400px] my-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111] dark:text-white">
              Welcome Back
            </h2>
            <p className="text-xs sm:text-sm text-[#666666] dark:text-neutral-400">
              Sign in to continue.
            </p>
          </div>

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email or username field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#111111] dark:text-neutral-300 block">
                Email or username
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your email or username"
                  required
                  className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111111] text-sm text-[#111111] dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#111111] dark:focus:ring-white transition-all"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#111111] dark:text-neutral-300 block">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full h-11 pl-10 pr-10 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111111] text-sm text-[#111111] dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#111111] dark:focus:ring-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[#111111] dark:text-neutral-300 font-medium">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-[#111111] focus:ring-0 cursor-pointer"
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                onClick={() =>
                  notify.info("Password Recovery", {
                    description: "Please contact your workspace administrator to reset credentials.",
                  })
                }
                className="font-semibold text-[#111111] dark:text-white hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            {/* Primary Action Button (Sign in) */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-[#111111] text-white hover:bg-neutral-800 dark:bg-white dark:text-[#111111] dark:hover:bg-neutral-100 font-bold text-sm tracking-wide transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 mt-2"
            >
              {loading && !oauthProvider ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Divider: Or continue with */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-[#0B0B0E] px-3 text-[#666666] dark:text-neutral-400 font-medium">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google & Microsoft SSO Options Only */}
          <div className="space-y-2.5">
            {/* Continue with Google */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleOAuthLogin("google")}
              className="w-full h-11 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-white/[0.05] text-[#111111] dark:text-white font-medium text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.99]"
            >
              {loading && oauthProvider === "google" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <GoogleLogo className="w-4 h-4" />
              )}
              <span>Continue with Google</span>
            </button>

            {/* Continue with Microsoft */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleOAuthLogin("microsoft")}
              className="w-full h-11 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-white/[0.05] text-[#111111] dark:text-white font-medium text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.99]"
            >
              {loading && oauthProvider === "microsoft" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <MicrosoftLogo className="w-4 h-4" />
              )}
              <span>Continue with Microsoft</span>
            </button>
          </div>
        </div>

        {/* Footer Legal Links */}
        <div className="flex items-center justify-center gap-6 text-xs text-neutral-400 font-medium pt-8">
          <Link
            href="/terms"
            className="hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
          >
            Privacy
          </Link>
          <Link
            href="/support"
            className="hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
          >
            Support
          </Link>
        </div>
      </div>
    </div>
  );
}
