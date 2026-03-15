type RegisterServiceWorkerOptions = {
  navigatorRef?: Pick<Navigator, "serviceWorker">;
  nodeEnv?: string;
};

export function registerServiceWorker({
  navigatorRef = typeof navigator === "undefined" ? undefined : navigator,
  nodeEnv = process.env.NODE_ENV,
}: RegisterServiceWorkerOptions = {}): void {
  if (nodeEnv !== "production") {
    return;
  }

  if (!navigatorRef?.serviceWorker) {
    return;
  }

  void navigatorRef.serviceWorker.register("/sw.js").catch(() => undefined);
}
