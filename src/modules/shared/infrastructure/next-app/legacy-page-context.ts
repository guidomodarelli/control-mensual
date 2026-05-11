import type { GetServerSidePropsContext } from "next";
import { cookies, headers } from "next/headers";

type SearchParamsValue = string | string[] | undefined;

export type AppPageSearchParams = Record<string, SearchParamsValue>;

function getCookieHeader(cookieValues: Record<string, string>): string {
  return Object.entries(cookieValues)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

export async function createLegacyPageContext(
  searchParams: AppPageSearchParams = {},
): Promise<GetServerSidePropsContext> {
  const requestCookies = await cookies();
  const requestHeaders = await headers();
  const cookieValues = Object.fromEntries(
    requestCookies.getAll().map((cookie) => [cookie.name, cookie.value]),
  );
  const normalizedHeaders = Object.fromEntries(requestHeaders.entries());
  const query = Object.fromEntries(
    Object.entries(searchParams).filter(([, value]) => value !== undefined),
  ) as GetServerSidePropsContext["query"];
  const request = {
    cookies: cookieValues,
    headers: {
      ...normalizedHeaders,
      cookie: normalizedHeaders.cookie ?? getCookieHeader(cookieValues),
    },
    method: "GET",
    url: "",
  };

  return {
    query,
    req: request,
    res: {},
  } as GetServerSidePropsContext;
}
