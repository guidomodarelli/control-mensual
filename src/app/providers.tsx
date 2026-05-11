"use client";

import { ThemeProvider } from "next-themes";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { useEffect, type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { registerServiceWorker } from "@/modules/shared/infrastructure/pages/register-service-worker";

interface AppProvidersProps {
  children: ReactNode;
  session: Session | null;
}

export function AppProviders({ children, session }: AppProvidersProps) {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <SessionProvider session={session}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        disableTransitionOnChange
        enableColorScheme={false}
        enableSystem
        storageKey="theme"
        themes={["light", "dark"]}
      >
        <TooltipProvider>
          {children}
          <Toaster closeButton position="top-center" richColors />
        </TooltipProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
