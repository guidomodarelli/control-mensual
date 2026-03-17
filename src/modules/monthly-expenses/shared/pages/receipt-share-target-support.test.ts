import { isIosShareTargetUnsupported } from "./receipt-share-target-support";

describe("receipt share target platform support", () => {
  it("returns true for iPhone user agents", () => {
    expect(
      isIosShareTargetUnsupported({
        platform: "iPhone",
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1",
      }),
    ).toBe(true);
  });

  it("returns true for iPadOS reporting desktop platform", () => {
    expect(
      isIosShareTargetUnsupported({
        maxTouchPoints: 5,
        platform: "MacIntel",
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1",
      }),
    ).toBe(true);
  });

  it("returns false for non-iOS devices", () => {
    expect(
      isIosShareTargetUnsupported({
        maxTouchPoints: 0,
        platform: "Linux armv8l",
        userAgent:
          "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36",
      }),
    ).toBe(false);
  });

  it("returns false when navigator is not available", () => {
    expect(isIosShareTargetUnsupported()).toBe(false);
  });
});
