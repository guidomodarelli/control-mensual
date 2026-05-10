import type { GetServerSidePropsContext } from "next";

import { getServerSideProps } from "@/pages/compromisos";

function createContext(
  query: GetServerSidePropsContext["query"],
): GetServerSidePropsContext {
  return {
    query,
    req: {} as GetServerSidePropsContext["req"],
    res: {} as GetServerSidePropsContext["res"],
    resolvedUrl: "/compromisos",
  } as unknown as GetServerSidePropsContext;
}

describe("Legacy monthly expenses route", () => {
  it("redirects /compromisos to /gastos", async () => {
    const result = await getServerSideProps(createContext({}));

    expect("redirect" in result && result.redirect?.destination).toBe("/gastos");
    expect(
      "redirect" in result &&
        result.redirect &&
        ("permanent" in result.redirect ? result.redirect.permanent : false),
    ).toBe(false);
  });

  it("preserves query params while redirecting", async () => {
    const result = await getServerSideProps(
      createContext({
        month: "2026-04",
        tab: "expenses",
      }),
    );

    expect("redirect" in result && result.redirect?.destination).toBe(
      "/gastos?month=2026-04&tab=expenses",
    );
  });

  it("preserves repeated query params while redirecting", async () => {
    const result = await getServerSideProps(
      createContext({
        tag: ["a", "b"],
      }),
    );

    expect("redirect" in result && result.redirect?.destination).toBe(
      "/gastos?tag=a&tag=b",
    );
  });
});
