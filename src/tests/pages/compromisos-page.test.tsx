import { getLegacyMonthlyExpensesDestination } from "@/app/compromisos/page";

describe("Legacy monthly expenses route", () => {
  it("redirects /compromisos to /gastos", () => {
    const destination = getLegacyMonthlyExpensesDestination({});

    expect(destination).toBe("/gastos");
  });

  it("preserves query params while redirecting", () => {
    const destination = getLegacyMonthlyExpensesDestination({
        month: "2026-04",
        tab: "expenses",
      });

    expect(destination).toBe("/gastos?month=2026-04&tab=expenses");
  });

  it("preserves repeated query params while redirecting", () => {
    const destination = getLegacyMonthlyExpensesDestination({
        tag: ["a", "b"],
      });

    expect(destination).toBe("/gastos?tag=a&tag=b");
  });
});
