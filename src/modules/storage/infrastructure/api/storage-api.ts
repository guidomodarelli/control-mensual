import { z } from "zod";

import { withCorrelationIdHeaders } from "@/modules/shared/infrastructure/observability/client-correlation-id";

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

const storageErrorEnvelopeSchema = z.object({
  error: z.string().trim().min(1),
});

export type StorageSaveRequest = z.infer<typeof storageRequestSchema>;
export type StoredStorageResource = z.infer<typeof storedStorageResourceSchema>;

export class StorageApiError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "StorageApiError";
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
    const parsedError = storageErrorEnvelopeSchema.safeParse(responseJson);

    throw new StorageApiError(
      parsedError.success
        ? parsedError.data.error
        : `storage-api:${endpoint} returned an unexpected error response.`,
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
