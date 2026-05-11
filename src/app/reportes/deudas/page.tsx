import type { Metadata } from "next";

import MonthlyExpensesPage from "@/modules/monthly-expenses/shared/pages/monthly-expenses-page";
import { getMonthlyExpensesServerSidePropsForTab } from "@/modules/monthly-expenses/infrastructure/pages/monthly-expenses-server-props";
import {
  createLegacyPageContext,
  type AppPageSearchParams,
} from "@/modules/shared/infrastructure/next-app/legacy-page-context";

export const metadata: Metadata = {
  title: "Reporte de deudas",
};

interface DebtsReportRoutePageProps {
  searchParams?: Promise<AppPageSearchParams>;
}

export default async function DebtsReportRoutePage({
  searchParams,
}: DebtsReportRoutePageProps) {
  const context = await createLegacyPageContext((await searchParams) ?? {});
  const { props } = await getMonthlyExpensesServerSidePropsForTab(
    context,
    "debts",
  );

  return <MonthlyExpensesPage {...props} />;
}
