import { z } from "zod";

import { withCorrelationIdHeaders } from "@/modules/shared/infrastructure/observability/client-correlation-id";

import type { MonthlyExpensesLoansReportResult } from "../../application/results/monthly-expenses-loans-report-result";

const monthlyExpensesReportEntrySchema = z.object({
  activeLoanCount: z.number().int().nonnegative(),
  direction: z.enum(["payable", "receivable"]),
  expenseDescriptions: z.array(z.string()),
  firstDebtMonth: z.string().nullable(),
  lenderId: z.string().nullable(),
  lenderName: z.string().trim().min(1),
  lenderType: z.enum(["bank", "family", "friend", "other", "unassigned"]),
  latestRecordedMonth: z.string().nullable(),
  remainingAmount: z.number().nonnegative(),
  trackedLoanCount: z.number().int().nonnegative(),
});

const monthlyExpensesReportSchema = z.object({
  data: z.object({
    entries: z.array(monthlyExpensesReportEntrySchema),
    summary: z.object({
      activeLoanCount: z.number().int().nonnegative(),
      lenderCount: z.number().int().nonnegative(),
      netRemainingAmount: z.number(),
      payableRemainingAmount: z.number().nonnegative(),
      receivableRemainingAmount: z.number().nonnegative(),
      remainingAmount: z.number().nonnegative(),
      trackedLoanCount: z.number().int().nonnegative(),
    }),
  }),
});

const monthlyExpensesReportErrorSchema = z.object({
  error: z.string().trim().min(1),
});

export class MonthlyExpensesReportApiError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "MonthlyExpensesReportApiError";
  }
}

export async function getMonthlyExpensesLoansReportViaApi(
  fetchImplementation: typeof fetch = fetch,
): Promise<MonthlyExpensesLoansReportResult> {
  const response = await fetchImplementation("/api/storage/monthly-expenses-report", {
    headers: withCorrelationIdHeaders(),
  });
  const responseJson = await response.json();

  if (!response.ok) {
    const parsedError = monthlyExpensesReportErrorSchema.safeParse(responseJson);

    throw new MonthlyExpensesReportApiError(
      parsedError.success
        ? parsedError.data.error
        : "monthly-expenses-report-api:/api/storage/monthly-expenses-report returned an unexpected error response.",
    );
  }

  return monthlyExpensesReportSchema.parse(responseJson)
    .data as MonthlyExpensesLoansReportResult;
}
