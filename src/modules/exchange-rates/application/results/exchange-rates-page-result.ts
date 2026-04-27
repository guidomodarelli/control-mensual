type TechnicalErrorCode = `E${number}${number}${number}${number}`;

export interface ExchangeRatesPageResult {
  blueRate: number;
  canEditIibb: boolean;
  iibbRateDecimal: number;
  loadErrorCode: TechnicalErrorCode | null;
  loadError: string | null;
  maxSelectableMonth: string;
  minSelectableMonth: string;
  officialRate: number;
  selectedMonth: string;
  solidarityRate: number;
}
