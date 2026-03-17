type NavigatorLike = {
  maxTouchPoints?: number;
  platform?: string;
  userAgent?: string;
};

export function isIosShareTargetUnsupported(
  navigatorLike?: NavigatorLike | null,
): boolean {
  if (!navigatorLike) {
    return false;
  }

  const userAgent = navigatorLike.userAgent ?? "";

  if (/iPad|iPhone|iPod/i.test(userAgent)) {
    return true;
  }

  const platform = navigatorLike.platform ?? "";
  const maxTouchPoints = Number(navigatorLike.maxTouchPoints ?? 0);

  return platform === "MacIntel" && maxTouchPoints > 1;
}
