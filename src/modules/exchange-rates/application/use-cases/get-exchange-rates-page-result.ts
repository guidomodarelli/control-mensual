import type { ExchangeRatesRepository } from "../../domain/repositories/exchange-rates-repository";
import type { GlobalExchangeRateSettingsRepository } from "../../domain/repositories/global-exchange-rate-settings-repository";
import type { MonthlyExchangeRateSnapshotsRepository } from "../../domain/repositories/monthly-exchange-rate-snapshots-repository";

import type { ExchangeRatesPageResult } from "../results/exchange-rates-page-result";
import { getMonthlyExchangeRateSnapshot } from "./get-monthly-exchange-rate-snapshot";

export async function getExchangeRatesPageResult({
  canEditIibb,
  exchangeRatesRepository,
  maxSelectableMonth,
  minSelectableMonth,
  month,
  monthlyExchangeRateSnapshotsRepository,
  settingsRepository,
}: {
  canEditIibb: boolean;
  exchangeRatesRepository: ExchangeRatesRepository;
  maxSelectableMonth: string;
  minSelectableMonth: string;
  month: string;
  monthlyExchangeRateSnapshotsRepository: MonthlyExchangeRateSnapshotsRepository;
  settingsRepository: GlobalExchangeRateSettingsRepository;
}): Promise<ExchangeRatesPageResult> {
  const snapshot = await getMonthlyExchangeRateSnapshot({
    exchangeRatesRepository,
    month,
    monthlyExchangeRateSnapshotsRepository,
    settingsRepository,
  });

  return {
    blueRate: snapshot.blueRate,
    canEditIibb,
    iibbRateDecimal: snapshot.iibbRateDecimalUsed,
    loadErrorCode: null,
    loadError: null,
    maxSelectableMonth,
    minSelectableMonth,
    officialRate: snapshot.officialRate,
    selectedMonth: snapshot.month,
    solidarityRate: snapshot.solidarityRate,
  };
}
