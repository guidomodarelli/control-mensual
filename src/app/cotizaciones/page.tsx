import type { Metadata } from "next";

import ExchangeRatesPage from "@/modules/exchange-rates/shared/pages/exchange-rates-page";
import { getExchangeRatesServerSideProps } from "@/modules/exchange-rates/infrastructure/pages/exchange-rates-server-props";
import {
  createLegacyPageContext,
  type AppPageSearchParams,
} from "@/modules/shared/infrastructure/next-app/legacy-page-context";

export const metadata: Metadata = {
  title: "Cotizaciones del dolar",
};

interface ExchangeRatesRoutePageProps {
  searchParams?: Promise<AppPageSearchParams>;
}

export default async function ExchangeRatesRoutePage({
  searchParams,
}: ExchangeRatesRoutePageProps) {
  const context = await createLegacyPageContext((await searchParams) ?? {});
  const { props } = await getExchangeRatesServerSideProps(context);

  return <ExchangeRatesPage {...props} />;
}
