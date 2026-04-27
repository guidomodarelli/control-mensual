import { z } from "zod";

import { withCorrelationIdHeaders } from "@/modules/shared/infrastructure/observability/client-correlation-id";
import {
  type TechnicalErrorCode,
} from "@/modules/shared/infrastructure/errors/technical-error-codes";
import {
  parseTechnicalErrorResponse,
} from "@/modules/shared/infrastructure/errors/technical-error";

const uploadMonthlyExpenseReceiptRequestSchema = z.object({
  contentBase64: z.string().trim().min(1),
  coveredPayments: z.number().int().positive(),
  expenseDescription: z.string().trim().min(1),
  fileName: z.string().trim().min(1),
  month: z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  mimeType: z.string().trim().min(1),
}).strict();

const deleteMonthlyExpenseReceiptRequestSchema = z.object({
  fileId: z.string().trim().min(1),
}).strict();

const monthlyExpenseReceiptResultSchema = z.object({
  allReceiptsFolderId: z.string().trim().min(1),
  allReceiptsFolderViewUrl: z.string().trim().url(),
  coveredPayments: z.number().int().positive(),
  fileId: z.string().trim().min(1),
  fileName: z.string().trim().min(1),
  fileViewUrl: z.string().trim().url(),
  registeredAt: z.string().datetime(),
  monthlyFolderId: z.string().trim().min(1),
  monthlyFolderViewUrl: z.string().trim().url(),
}).strict();

const monthlyExpenseReceiptSuccessEnvelopeSchema = z.object({
  data: monthlyExpenseReceiptResultSchema,
}).strict();

export type UploadMonthlyExpenseReceiptRequest = z.infer<
  typeof uploadMonthlyExpenseReceiptRequestSchema
>;
export type MonthlyExpenseReceiptResult = z.infer<
  typeof monthlyExpenseReceiptResultSchema
>;

export interface UploadMonthlyExpenseReceiptViaApiOptions {
  fetchImplementation?: typeof fetch;
  onUploadProgress?: (percent: number) => void;
}

const MONTHLY_EXPENSES_RECEIPTS_API_PATH =
  "/api/storage/monthly-expenses-receipts";
const MONTHLY_EXPENSES_RECEIPTS_API_UNEXPECTED_ERROR_MESSAGE =
  "monthly-expenses-receipts-api:/api/storage/monthly-expenses-receipts returned an unexpected error response.";

export class MonthlyExpenseReceiptsApiError extends Error {
  readonly errorCode: TechnicalErrorCode | null;

  constructor(
    message: string,
    options?: ErrorOptions & {
      errorCode?: TechnicalErrorCode | null;
    },
  ) {
    super(message, options);
    this.name = "MonthlyExpenseReceiptsApiError";
    this.errorCode = options?.errorCode ?? null;
  }
}

function parseJsonFromXhrResponse(request: XMLHttpRequest): unknown {
  if (request.response && typeof request.response === "object") {
    return request.response;
  }

  if (typeof request.response === "string" && request.response.trim().length > 0) {
    return JSON.parse(request.response);
  }

  if (typeof request.responseText === "string" && request.responseText.trim().length > 0) {
    return JSON.parse(request.responseText);
  }

  return null;
}

function uploadMonthlyExpenseReceiptViaApiWithXhr(
  payload: UploadMonthlyExpenseReceiptRequest,
  onUploadProgress: (percent: number) => void,
): Promise<MonthlyExpenseReceiptResult> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("POST", MONTHLY_EXPENSES_RECEIPTS_API_PATH);
    request.responseType = "json";

    const headers = withCorrelationIdHeaders({
      "Content-Type": "application/json",
    });
    const normalizedHeaders = new Headers(headers);

    normalizedHeaders.forEach((headerValue, headerName) => {
      request.setRequestHeader(headerName, headerValue);
    });

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) {
        return;
      }

      const progressPercent = Math.min(
        100,
        Math.max(0, Math.round((event.loaded / event.total) * 100)),
      );

      onUploadProgress(progressPercent);
    };

    request.onerror = () => {
      reject(
        new MonthlyExpenseReceiptsApiError(
          "monthly-expenses-receipts-api:/api/storage/monthly-expenses-receipts upload failed due to a network error.",
        ),
      );
    };

    request.onabort = () => {
      reject(
        new MonthlyExpenseReceiptsApiError(
          "monthly-expenses-receipts-api:/api/storage/monthly-expenses-receipts upload was aborted.",
        ),
      );
    };

    request.onload = () => {
      try {
        const responseJson = parseJsonFromXhrResponse(request);

        if (request.status < 200 || request.status >= 300) {
          const parsedError = parseTechnicalErrorResponse(responseJson);

          reject(
            new MonthlyExpenseReceiptsApiError(
              parsedError?.error ??
                MONTHLY_EXPENSES_RECEIPTS_API_UNEXPECTED_ERROR_MESSAGE,
              {
                errorCode: parsedError?.errorCode ?? null,
              },
            ),
          );
          return;
        }

        resolve(monthlyExpenseReceiptSuccessEnvelopeSchema.parse(responseJson).data);
      } catch (error) {
        reject(
          new MonthlyExpenseReceiptsApiError(
            MONTHLY_EXPENSES_RECEIPTS_API_UNEXPECTED_ERROR_MESSAGE,
            {
              cause: error,
            },
          ),
        );
      }
    };

    request.send(JSON.stringify(payload));
  });
}

export async function uploadMonthlyExpenseReceiptViaApi(
  payload: UploadMonthlyExpenseReceiptRequest,
  options: UploadMonthlyExpenseReceiptViaApiOptions = {},
): Promise<MonthlyExpenseReceiptResult> {
  const normalizedPayload = uploadMonthlyExpenseReceiptRequestSchema.parse(payload);

  if (options.onUploadProgress && typeof XMLHttpRequest !== "undefined") {
    return uploadMonthlyExpenseReceiptViaApiWithXhr(
      normalizedPayload,
      options.onUploadProgress,
    );
  }

  const fetchImplementation = options.fetchImplementation ?? fetch;
  const response = await fetchImplementation(MONTHLY_EXPENSES_RECEIPTS_API_PATH, {
    body: JSON.stringify(normalizedPayload),
    headers: withCorrelationIdHeaders({
      "Content-Type": "application/json",
    }),
    method: "POST",
  });
  const responseJson = await response.json();

  if (!response.ok) {
    const parsedError = parseTechnicalErrorResponse(responseJson);

    throw new MonthlyExpenseReceiptsApiError(
      parsedError?.error ??
        MONTHLY_EXPENSES_RECEIPTS_API_UNEXPECTED_ERROR_MESSAGE,
      {
        errorCode: parsedError?.errorCode ?? null,
      },
    );
  }

  return monthlyExpenseReceiptSuccessEnvelopeSchema.parse(responseJson).data;
}

export async function deleteMonthlyExpenseReceiptViaApi(
  payload: z.infer<typeof deleteMonthlyExpenseReceiptRequestSchema>,
  fetchImplementation: typeof fetch = fetch,
): Promise<void> {
  const normalizedPayload = deleteMonthlyExpenseReceiptRequestSchema.parse(payload);
  const searchParams = new URLSearchParams({
    fileId: normalizedPayload.fileId,
  });
  const response = await fetchImplementation(
    `/api/storage/monthly-expenses-receipts?${searchParams.toString()}`,
    {
      headers: withCorrelationIdHeaders(),
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const responseJson = await response.json();
    const parsedError = parseTechnicalErrorResponse(responseJson);

    throw new MonthlyExpenseReceiptsApiError(
      parsedError?.error ??
        "monthly-expenses-receipts-api:/api/storage/monthly-expenses-receipts returned an unexpected error response.",
      {
        errorCode: parsedError?.errorCode ?? null,
      },
    );
  }
}
