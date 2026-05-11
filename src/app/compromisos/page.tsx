import { redirect } from "next/navigation";

import type { AppPageSearchParams } from "@/modules/shared/infrastructure/next-app/legacy-page-context";

interface LegacyMonthlyExpensesRoutePageProps {
  searchParams?: Promise<AppPageSearchParams>;
}

export function getLegacyMonthlyExpensesDestination(
  searchParams: AppPageSearchParams,
): string {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((currentValue) => params.append(key, currentValue));
      return;
    }

    if (typeof value === "string") {
      params.append(key, value);
    }
  });

  const serializedParams = params.toString();

  return serializedParams.length > 0 ? `/gastos?${serializedParams}` : "/gastos";
}

export default async function LegacyMonthlyExpensesRoutePage({
  searchParams,
}: LegacyMonthlyExpensesRoutePageProps) {
  redirect(getLegacyMonthlyExpensesDestination((await searchParams) ?? {}));
}
