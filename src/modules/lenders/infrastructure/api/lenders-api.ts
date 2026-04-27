import { z } from "zod";

import { withCorrelationIdHeaders } from "@/modules/shared/infrastructure/observability/client-correlation-id";
import {
  type TechnicalErrorCode,
} from "@/modules/shared/infrastructure/errors/technical-error-codes";
import {
  parseTechnicalErrorResponse,
} from "@/modules/shared/infrastructure/errors/technical-error";

import type { SaveLendersCatalogCommand } from "../../application/commands/save-lenders-catalog-command";
import type { LendersCatalogDocumentResult } from "../../application/results/lenders-catalog-document-result";
import type { StoredLendersCatalogResult } from "../../application/results/stored-lenders-catalog-result";

const lenderSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  notes: z.string().optional(),
  type: z.enum(["bank", "family", "friend", "other"]),
});

const lendersRequestSchema = z.object({
  lenders: z.array(lenderSchema),
});

const lendersCatalogResponseSchema = z.object({
  data: z.object({
    lenders: z.array(lenderSchema),
  }),
});

const storedLendersResponseSchema = z.object({
  data: z.object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
  }),
});

export class LendersApiError extends Error {
  readonly errorCode: TechnicalErrorCode | null;

  constructor(
    message: string,
    options?: ErrorOptions & {
      errorCode?: TechnicalErrorCode | null;
    },
  ) {
    super(message, options);
    this.name = "LendersApiError";
    this.errorCode = options?.errorCode ?? null;
  }
}

export async function getLendersCatalogViaApi(
  fetchImplementation: typeof fetch = fetch,
): Promise<LendersCatalogDocumentResult> {
  const response = await fetchImplementation("/api/storage/lenders", {
    headers: withCorrelationIdHeaders(),
  });
  const responseJson = await response.json();

  if (!response.ok) {
    const parsedError = parseTechnicalErrorResponse(responseJson);

    throw new LendersApiError(
      parsedError?.error ??
        "lenders-api:/api/storage/lenders returned an unexpected error response.",
      {
        errorCode: parsedError?.errorCode ?? null,
      },
    );
  }

  return lendersCatalogResponseSchema.parse(responseJson)
    .data as LendersCatalogDocumentResult;
}

export async function saveLendersCatalogViaApi(
  payload: SaveLendersCatalogCommand,
  fetchImplementation: typeof fetch = fetch,
): Promise<StoredLendersCatalogResult> {
  const normalizedPayload = lendersRequestSchema.parse(payload);
  const response = await fetchImplementation("/api/storage/lenders", {
    body: JSON.stringify(normalizedPayload),
    headers: withCorrelationIdHeaders({
      "Content-Type": "application/json",
    }),
    method: "POST",
  });
  const responseJson = await response.json();

  if (!response.ok) {
    const parsedError = parseTechnicalErrorResponse(responseJson);

    throw new LendersApiError(
      parsedError?.error ??
        "lenders-api:/api/storage/lenders returned an unexpected error response.",
      {
        errorCode: parsedError?.errorCode ?? null,
      },
    );
  }

  return storedLendersResponseSchema.parse(responseJson)
    .data as StoredLendersCatalogResult;
}
