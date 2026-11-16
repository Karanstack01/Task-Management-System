"use client";

import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { initTheme } from "@/lib/theme/theme-service";
import { useUIStore } from "@/lib/store/ui-store";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initTheme();
    // Restore the persisted session (role + user) after hydration.
    void useUIStore.persist.rehydrate();
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-center"
        expand={true}
        visibleToasts={4}
        gap={8}
        toastOptions={{
          style: {
            background: "transparent",
            border: "none",
            padding: 0,
            boxShadow: "none",
          },
        }}
      />
    </QueryClientProvider>
  );
}

