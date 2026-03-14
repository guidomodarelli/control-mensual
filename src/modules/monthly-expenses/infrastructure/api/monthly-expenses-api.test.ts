import { getMonthlyExpensesDocumentViaApi } from "./monthly-expenses-api";

describe("monthly-expenses-api client", () => {
  it("sends x-correlation-id header on GET requests", async () => {
    const fetchImplementation = jest.fn().mockResolvedValue({
      json: async () => ({
        data: {
          items: [],
          month: "2026-03",
        },
      }),
      ok: true,
    });

    await getMonthlyExpensesDocumentViaApi("2026-03", fetchImplementation);

    const options = fetchImplementation.mock.calls[0]?.[1] as
      | RequestInit
      | undefined;
    const headers = new Headers(options?.headers);

    expect(headers.get("x-correlation-id")).toEqual(expect.any(String));
  });
});
