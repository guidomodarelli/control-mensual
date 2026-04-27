import { z } from "zod";

import { withCorrelationIdHeaders } from "@/modules/shared/infrastructure/observability/client-correlation-id";
import {
  type TechnicalErrorCode,
} from "@/modules/shared/infrastructure/errors/technical-error-codes";
import {
  parseTechnicalErrorResponse,
} from "@/modules/shared/infrastructure/errors/technical-error";

import type { MonthlyExpensesCopyableMonthsResult } from "../../application/results/monthly-expenses-copyable-months-result";

const monthlyExpensesCopyableMonthsSchema = z.object({
  data: z.object({
    defaultSourceMonth: z.string().nullable(),
    sourceMonths: z.array(z.string()),
    targetMonth: z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  }).strict(),
}).strict();

export class MonthlyExpensesCopyableMonthsApiError extends Error {
  readonly errorCode: TechnicalErrorCode | null;

  constructor(
    message: string,
    options?: ErrorOptions & {
      errorCode?: TechnicalErrorCode | null;
    },
  ) {
    super(message, options);
    this.name = "MonthlyExpensesCopyableMonthsApiError";
    this.errorCode = options?.errorCode ?? null;
  }
}

export async function getMonthlyExpensesCopyableMonthsViaApi(
  targetMonth: string,
  options?: {
    signal?: AbortSignal;
  },
  fetchImplementation?: typeof fetch,
): Promise<MonthlyExpensesCopyableMonthsResult> {
  const resolvedFetchImplementation = fetchImplementation ?? globalThis.fetch;

  if (!resolvedFetchImplementation) {
    throw new Error(
      "monthly-expenses-copyable-months-api requires a fetch implementation.",
    );
  }

  const normalizedTargetMonth = z
    .string()
    .trim()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .parse(targetMonth);
  const searchParams = new URLSearchParams({
    targetMonth: normalizedTargetMonth,
  });
  const response = await resolvedFetchImplementation(
    `/api/storage/monthly-expenses-copyable-months?${searchParams.toString()}`,
    {
      headers: withCorrelationIdHeaders(),
      signal: options?.signal,
    },
  );
  const responseJson = await response.json();

  if (!response.ok) {
    const parsedError = parseTechnicalErrorResponse(responseJson);

    throw new MonthlyExpensesCopyableMonthsApiError(
      parsedError?.error ??
        "monthly-expenses-copyable-months-api returned an unexpected error response.",
      {
        errorCode: parsedError?.errorCode ?? null,
      },
    );
  }

  return monthlyExpensesCopyableMonthsSchema.parse(responseJson)
    .data as MonthlyExpensesCopyableMonthsResult;
}
