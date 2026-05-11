import { redirect } from "next/navigation";

import type { AppPageSearchParams } from "@/modules/shared/infrastructure/next-app/legacy-page-context";

interface HomePageProps {
  searchParams?: Promise<AppPageSearchParams>;
}

export function getHomeRedirectDestination(
  searchParams: AppPageSearchParams,
): string {
  const monthQuery = Array.isArray(searchParams.month)
    ? searchParams.month[0]
    : searchParams.month;
  const normalizedMonth = monthQuery?.trim();

  return normalizedMonth ? `/gastos?month=${encodeURIComponent(normalizedMonth)}` : "/gastos";
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};

  redirect(getHomeRedirectDestination(resolvedSearchParams));
}
