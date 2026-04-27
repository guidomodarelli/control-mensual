import { z } from "zod";

import { withCorrelationIdHeaders } from "@/modules/shared/infrastructure/observability/client-correlation-id";
import {
  type TechnicalErrorCode,
} from "@/modules/shared/infrastructure/errors/technical-error-codes";
import {
  parseTechnicalErrorResponse,
} from "@/modules/shared/infrastructure/errors/technical-error";

const storageRequestSchema = z.object({
  content: z.string().trim().min(1),
  mimeType: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

const storedStorageResourceSchema = z.object({
  id: z.string().trim().min(1),
  mimeType: z.string().trim().min(1),
  name: z.string().trim().min(1),
  viewUrl: z.string().trim().url().nullable().optional(),
});

const storageSuccessEnvelopeSchema = z.object({
  data: storedStorageResourceSchema,
});

export type StorageSaveRequest = z.infer<typeof storageRequestSchema>;
export type StoredStorageResource = z.infer<typeof storedStorageResourceSchema>;

export class StorageApiError extends Error {
  readonly errorCode: TechnicalErrorCode | null;

  constructor(
    message: string,
    options?: ErrorOptions & {
      errorCode?: TechnicalErrorCode | null;
    },
  ) {
    super(message, options);
    this.name = "StorageApiError";
    this.errorCode = options?.errorCode ?? null;
  }
}

async function postStorageRequest(
  endpoint: string,
  payload: StorageSaveRequest,
  fetchImplementation: typeof fetch = fetch,
): Promise<StoredStorageResource> {
  const normalizedPayload = storageRequestSchema.parse(payload);
  const response = await fetchImplementation(endpoint, {
    body: JSON.stringify(normalizedPayload),
    headers: withCorrelationIdHeaders({
      "Content-Type": "application/json",
    }),
    method: "POST",
  });
  const responseJson = await response.json();

  if (!response.ok) {
    const parsedError = parseTechnicalErrorResponse(responseJson);

    throw new StorageApiError(
      parsedError?.error ??
        `storage-api:${endpoint} returned an unexpected error response.`,
      {
        errorCode: parsedError?.errorCode ?? null,
      },
    );
  }

  return storageSuccessEnvelopeSchema.parse(responseJson).data;
}

export async function saveApplicationSettingsViaApi(
  payload: StorageSaveRequest,
  fetchImplementation: typeof fetch = fetch,
): Promise<StoredStorageResource> {
  return postStorageRequest(
    "/api/storage/application-settings",
    payload,
    fetchImplementation,
  );
}

export async function saveUserFileViaApi(
  payload: StorageSaveRequest,
  fetchImplementation: typeof fetch = fetch,
): Promise<StoredStorageResource> {
  return postStorageRequest("/api/storage/user-files", payload, fetchImplementation);
}
