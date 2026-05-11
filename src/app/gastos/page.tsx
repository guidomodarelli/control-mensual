import type { Metadata } from "next";

import MonthlyExpensesPage, {
  getReportProviderFilterOptions,
  getRequestedMonthlyExpensesTab,
} from "@/modules/monthly-expenses/shared/pages/monthly-expenses-page";
import { getMonthlyExpensesServerSidePropsForTab } from "@/modules/monthly-expenses/infrastructure/pages/monthly-expenses-server-props";
import {
  createLegacyPageContext,
  type AppPageSearchParams,
} from "@/modules/shared/infrastructure/next-app/legacy-page-context";

export { getReportProviderFilterOptions, getRequestedMonthlyExpensesTab };

export const metadata: Metadata = {
  title: "Control mensual",
};

interface MonthlyExpensesRoutePageProps {
  searchParams?: Promise<AppPageSearchParams>;
}

export default async function MonthlyExpensesRoutePage({
  searchParams,
}: MonthlyExpensesRoutePageProps) {
  const context = await createLegacyPageContext((await searchParams) ?? {});
  const { props } = await getMonthlyExpensesServerSidePropsForTab(
    context,
    "expenses",
  );

  return <MonthlyExpensesPage {...props} />;
}
