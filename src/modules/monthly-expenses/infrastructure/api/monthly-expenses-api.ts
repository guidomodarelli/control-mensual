import { z } from "zod";

import { withCorrelationIdHeaders } from "@/modules/shared/infrastructure/observability/client-correlation-id";

import type { SaveMonthlyExpensesCommand } from "../../application/commands/save-monthly-expenses-command";
import type { MonthlyExpensesDocumentResult } from "../../application/results/monthly-expenses-document-result";

const monthlyExpenseItemSchema = z.object({
  currency: z.enum(["ARS", "USD"]),
  description: z.string().trim().min(1),
  id: z.string().trim().min(1),
  loan: z
    .object({
      installmentCount: z.number().int().positive(),
      lenderId: z.string().optional(),
      lenderName: z.string().optional(),
      startMonth: z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    })
    .optional(),
  occurrencesPerMonth: z.number().int().positive(),
  subtotal: z.number().positive(),
});

const monthlyExpensesRequestSchema = z.object({
  items: z.array(monthlyExpenseItemSchema),
  month: z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

const monthlyExpensesErrorEnvelopeSchema = z.object({
  error: z.string().trim().min(1),
});

const monthlyExpensesDocumentEnvelopeSchema = z.object({
  data: z.object({
    items: z.array(
      z.object({
        currency: z.enum(["ARS", "USD"]),
        description: z.string().trim().min(1),
        id: z.string().trim().min(1),
        loan: z
          .object({
            endMonth: z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
            installmentCount: z.number().int().positive(),
            lenderId: z.string().optional(),
            lenderName: z.string().optional(),
            paidInstallments: z.number().int().nonnegative(),
            startMonth: z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
          })
          .optional(),
        occurrencesPerMonth: z.number().int().positive(),
        subtotal: z.number().positive(),
        total: z.number().nonnegative(),
      }),
    ),
    month: z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  }),
});

export class MonthlyExpensesApiError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "MonthlyExpensesApiError";
  }
}

export async function saveMonthlyExpensesDocumentViaApi(
  payload: SaveMonthlyExpensesCommand,
  fetchImplementation: typeof fetch = fetch,
): Promise<void> {
  const normalizedPayload = monthlyExpensesRequestSchema.parse(payload);
  const response = await fetchImplementation("/api/storage/monthly-expenses", {
    body: JSON.stringify(normalizedPayload),
    headers: withCorrelationIdHeaders({
      "Content-Type": "application/json",
    }),
    method: "POST",
  });

  if (!response.ok) {
    const responseJson = await response.json();
    const parsedError =
      monthlyExpensesErrorEnvelopeSchema.safeParse(responseJson);

    throw new MonthlyExpensesApiError(
      parsedError.success
        ? parsedError.data.error
        : "monthly-expenses-api:/api/storage/monthly-expenses returned an unexpected error response.",
    );
  }
}

export async function getMonthlyExpensesDocumentViaApi(
  month: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<MonthlyExpensesDocumentResult> {
  const normalizedMonth = z
    .string()
    .trim()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .parse(month);
  const searchParams = new URLSearchParams({
    month: normalizedMonth,
  });
  const response = await fetchImplementation(
    `/api/storage/monthly-expenses?${searchParams.toString()}`,
    {
      headers: withCorrelationIdHeaders(),
    },
  );
  const responseJson = await response.json();

  if (!response.ok) {
    const parsedError = monthlyExpensesErrorEnvelopeSchema.safeParse(responseJson);

    throw new MonthlyExpensesApiError(
      parsedError.success
        ? parsedError.data.error
        : "monthly-expenses-api:/api/storage/monthly-expenses returned an unexpected error response.",
    );
  }

  return monthlyExpensesDocumentEnvelopeSchema.parse(responseJson)
    .data as MonthlyExpensesDocumentResult;
}
