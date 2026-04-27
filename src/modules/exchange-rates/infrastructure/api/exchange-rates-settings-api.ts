import { z } from "zod";

import { withCorrelationIdHeaders } from "@/modules/shared/infrastructure/observability/client-correlation-id";
import {
  type TechnicalErrorCode,
} from "@/modules/shared/infrastructure/errors/technical-error-codes";
import {
  parseTechnicalErrorResponse,
} from "@/modules/shared/infrastructure/errors/technical-error";

const exchangeRateSettingsRequestSchema = z.object({
  iibbRateDecimal: z.number(),
});

const exchangeRateSettingsResultSchema = z.object({
  data: z.object({
    iibbRateDecimal: z.number(),
  }),
});

export class ExchangeRateSettingsApiError extends Error {
  readonly errorCode: TechnicalErrorCode | null;

  constructor(
    message: string,
    options?: ErrorOptions & {
      errorCode?: TechnicalErrorCode | null;
    },
  ) {
    super(message, options);
    this.name = "ExchangeRateSettingsApiError";
    this.errorCode = options?.errorCode ?? null;
  }
}

export async function saveGlobalExchangeRateSettingsViaApi(
  payload: z.infer<typeof exchangeRateSettingsRequestSchema>,
  fetchImplementation: typeof fetch = fetch,
): Promise<z.infer<typeof exchangeRateSettingsResultSchema>["data"]> {
  const normalizedPayload = exchangeRateSettingsRequestSchema.parse(payload);
  const response = await fetchImplementation("/api/exchange-rates/settings", {
    body: JSON.stringify(normalizedPayload),
    headers: withCorrelationIdHeaders({
      "Content-Type": "application/json",
    }),
    method: "POST",
  });
  const responseJson = await response.json();

  if (!response.ok) {
    const parsedError = parseTechnicalErrorResponse(responseJson);

    throw new ExchangeRateSettingsApiError(
      parsedError?.error ??
        "exchange-rates-settings-api:/api/exchange-rates/settings returned an unexpected error response.",
      {
        errorCode: parsedError?.errorCode ?? null,
      },
    );
  }

  return exchangeRateSettingsResultSchema.parse(responseJson).data;
}
