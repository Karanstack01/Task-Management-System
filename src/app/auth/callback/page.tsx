"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resolveSignIn, signOutEverywhere } from "@/lib/auth/sign-in";
import { useUIStore, RoleType } from "@/lib/store/ui-store";

const HOME: Record<RoleType, string> = {
  SUPERADMIN: "/superadmin",
  COMPANY_ADMIN: "/company-admin",
  ADMIN: "/admin",
  BOSS: "/boss",
  DELEGATOR: "/delegator",
  DELEGATEE: "/delegatee",
};

/** Landing page for Google / Microsoft sign-in: finishes the handshake, then opens the right workspace. */
export default function AuthCallbackPage() {
  const router = useRouter();
  const startSession = useUIStore((s) => s.startSession);
  const [message, setMessage] = useState("Completing sign-in…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // the one-time auth code can only be used once (React strict mode runs effects twice)
    ran.current = true;

    (async () => {
      const fail = async (reason: string) => {
        await signOutEverywhere();
        router.replace(`/login?error=${encodeURIComponent(reason)}`);
      };

      const params = new URLSearchParams(window.location.search);
      const providerError = params.get("error_description") || params.get("error");
      if (providerError) return fail(providerError);

      const supabase = createClient();
      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) return fail(error.message);
      }

      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (!email) return fail("The identity provider did not return an email address.");

      setMessage("Checking workspace access…");
      const result = await resolveSignIn(email);
      if (result.status === "no_profile") {
        return fail(`${email} has not been added to any workspace. Ask your administrator to add this email.`);
      }
      if (result.status === "inactive") return fail("Your account has been deactivated.");
      if (result.status === "workspace_missing") return fail("Your organization could not be found.");
      if (result.status === "blocked") {
        await signOutEverywhere();
        router.replace(
          `/saas-expired?org=${encodeURIComponent(result.orgName)}&reason=${encodeURIComponent(result.reason)}`
        );
        return;
      }

      startSession(result.user.id, result.user.role);
      router.replace(HOME[result.user.role]);
    })();
  }, [router, startSession]);

  return (
    <div className="min-h-screen flex items-center justify-center gap-3 text-sm text-[#666666] dark:text-neutral-400">
      <Loader2 className="w-4 h-4 animate-spin" />
      {message}
    </div>
  );
}
