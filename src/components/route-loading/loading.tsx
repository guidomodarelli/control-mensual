import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

import styles from "./loading.module.scss";

const SECTION_PATHS = new Set([
  "/cotizaciones",
  "/gastos",
  "/prestamistas",
  "/reportes/deudas",
]);
const INITIAL_LOADING_DURATION_MS = 450;

function getPathnameFromUrl(url: string): string {
  try {
    return new URL(url, "http://localhost").pathname;
  } catch {
    return url.split("?")[0]?.split("#")[0] ?? url;
  }
}

function getSectionPath(url: string): string | null {
  const pathname = getPathnameFromUrl(url);

  return SECTION_PATHS.has(pathname) ? pathname : null;
}

export function Loading() {
  const router = useRouter();
  const currentSectionPathRef = useRef(getSectionPath(router.asPath));
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const isVisible = isInitialLoading || isRouteLoading;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsInitialLoading(false);
    }, INITIAL_LOADING_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    currentSectionPathRef.current = getSectionPath(router.asPath);
  }, [router.asPath]);

  useEffect(() => {
    const handleRouteChangeStart = (nextUrl: string) => {
      const nextSectionPath = getSectionPath(nextUrl);

      setIsRouteLoading(
        Boolean(nextSectionPath) &&
          nextSectionPath !== currentSectionPathRef.current,
      );
    };

    const handleRouteChangeEnd = (nextUrl: string) => {
      currentSectionPathRef.current = getSectionPath(nextUrl);
      setIsRouteLoading(false);
    };

    router.events.on("routeChangeStart", handleRouteChangeStart);
    router.events.on("routeChangeComplete", handleRouteChangeEnd);
    router.events.on("routeChangeError", handleRouteChangeEnd);

    return () => {
      router.events.off("routeChangeStart", handleRouteChangeStart);
      router.events.off("routeChangeComplete", handleRouteChangeEnd);
      router.events.off("routeChangeError", handleRouteChangeEnd);
    };
  }, [router.events]);

  if (!isVisible) {
    return null;
  }

  return (
    <div aria-live="polite" className={styles.overlay} role="status">
      <div className={styles.indicator}>
        <span aria-hidden="true" className={styles.spinner} />
        <span>Cargando sección...</span>
      </div>
    </div>
  );
}
