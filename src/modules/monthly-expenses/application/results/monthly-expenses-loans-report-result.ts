import type { LenderType } from "@/modules/lenders/domain/value-objects/lenders-catalog-document";

export type MonthlyExpensesLoanReportLenderType = LenderType | "unassigned";

export interface MonthlyExpensesLoanReportEntry {
  activeLoanCount: number;
  expenseDescriptions: string[];
  firstDebtMonth: string | null;
  lenderId: string | null;
  lenderName: string;
  lenderType: MonthlyExpensesLoanReportLenderType;
  latestRecordedMonth: string | null;
  remainingAmount: number;
  trackedLoanCount: number;
}

export interface MonthlyExpensesLoansReportResult {
  entries: MonthlyExpensesLoanReportEntry[];
  summary: {
    activeLoanCount: number;
    lenderCount: number;
    remainingAmount: number;
    trackedLoanCount: number;
  };
}

export function createEmptyMonthlyExpensesLoansReportResult(): MonthlyExpensesLoansReportResult {
  return {
    entries: [],
    summary: {
      activeLoanCount: 0,
      lenderCount: 0,
      remainingAmount: 0,
      trackedLoanCount: 0,
    },
  };
}
