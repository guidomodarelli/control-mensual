import type { GetServerSideProps, GetServerSidePropsContext } from "next";

export {
  getReportProviderFilterOptions,
  getRequestedMonthlyExpensesTab,
} from "./gastos";

export default function LegacyMonthlyExpensesRoutePage() {
  return null;
}

function getLegacyMonthlyExpensesDestination(
  context: GetServerSidePropsContext,
): string {
  const params = new URLSearchParams();

  Object.entries(context.query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((currentValue) => {
        params.append(key, currentValue);
      });
      return;
    }

    if (typeof value === "string") {
      params.append(key, value);
    }
  });

  const serializedParams = params.toString();

  return serializedParams.length > 0 ? `/gastos?${serializedParams}` : "/gastos";
}

export const getServerSideProps: GetServerSideProps = async (context) => ({
  redirect: {
    destination: getLegacyMonthlyExpensesDestination(context),
    permanent: false,
  },
});
