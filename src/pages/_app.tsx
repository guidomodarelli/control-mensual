import "@/styles/globals.css";
import "@/styles/globals.scss";

import { Inter, Geist_Mono } from "next/font/google";
import type { AppProps } from "next/app";
import { ThemeProvider } from "next-themes";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const interSans = Inter({
  subsets: ["latin"],
  variable: "--font-inter-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

type PagePropsWithSession = {
  session?: Session | null;
};

export default function App({
  Component,
  pageProps,
}: AppProps<PagePropsWithSession>) {
  const { session, ...restPageProps } = pageProps;

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    async function loadReactGrabCodexProvider() {
      await import("react-grab");
      await import("@react-grab/codex/client");
    }

    void loadReactGrabCodexProvider();
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
          <div className={`${interSans.className} ${interSans.variable} ${geistMono.variable}`}>
            <Component {...restPageProps} />
            <Toaster closeButton position="top-center" richColors />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
