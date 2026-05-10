import type {
  GetServerSideProps,
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";

import MonthlyExpensesPage, {
  getReportProviderFilterOptions,
  getRequestedMonthlyExpensesTab,
  type MonthlyExpensesPageProps,
} from "@/modules/monthly-expenses/shared/pages/monthly-expenses-page";

export { getReportProviderFilterOptions, getRequestedMonthlyExpensesTab };

export default function MonthlyExpensesRoutePage(
  props: InferGetServerSidePropsType<typeof getServerSideProps>,
) {
  return <MonthlyExpensesPage {...props} />;
}

export const getServerSideProps: GetServerSideProps<MonthlyExpensesPageProps> =
  async (context: GetServerSidePropsContext) => {
    const { getMonthlyExpensesServerSidePropsForTab } = await import(
      "@/modules/monthly-expenses/infrastructure/pages/monthly-expenses-server-props"
    );

    return getMonthlyExpensesServerSidePropsForTab(context, "expenses");
  };
