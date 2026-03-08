import { z } from "zod";

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

const lendersErrorResponseSchema = z.object({
  error: z.string().trim().min(1),
});

export class LendersApiError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "LendersApiError";
  }
}

export async function getLendersCatalogViaApi(
  fetchImplementation: typeof fetch = fetch,
): Promise<LendersCatalogDocumentResult> {
  const response = await fetchImplementation("/api/storage/lenders");
  const responseJson = await response.json();

  if (!response.ok) {
    const parsedError = lendersErrorResponseSchema.safeParse(responseJson);

    throw new LendersApiError(
      parsedError.success
        ? parsedError.data.error
        : "lenders-api:/api/storage/lenders returned an unexpected error response.",
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
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const responseJson = await response.json();

  if (!response.ok) {
    const parsedError = lendersErrorResponseSchema.safeParse(responseJson);

    throw new LendersApiError(
      parsedError.success
        ? parsedError.data.error
        : "lenders-api:/api/storage/lenders returned an unexpected error response.",
    );
  }

  return storedLendersResponseSchema.parse(responseJson)
    .data as StoredLendersCatalogResult;
}
