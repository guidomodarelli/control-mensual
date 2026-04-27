import type { NextApiHandler, NextApiRequest } from "next";
import type { drive_v3 } from "googleapis";
import { z } from "zod";

import {
  GoogleOAuthAuthenticationError,
  GoogleOAuthConfigurationError,
} from "@/modules/auth/infrastructure/oauth/google-oauth-token";
import {
  MonthlyExpenseReceiptFolderConflictError,
} from "@/modules/monthly-expenses/application/errors/monthly-expense-receipt-folder-conflict-error";
import {
  GoogleDriveStorageError,
} from "@/modules/storage/infrastructure/google-drive/google-drive-storage-error";
import {
  appLogger,
  createRequestLogContext,
} from "@/modules/shared/infrastructure/observability/app-logger";
import {
  TECHNICAL_ERROR_CODES,
} from "@/modules/shared/infrastructure/errors/technical-error-codes";
import {
  createTechnicalErrorEnvelope,
} from "@/modules/shared/infrastructure/errors/technical-error";

import type {
  UploadMonthlyExpenseReceiptCommand,
} from "../../application/commands/upload-monthly-expense-receipt-command";

const uploadMonthlyExpenseReceiptBodySchema = z.object({
  contentBase64: z.string().trim().min(1),
  coveredPayments: z.number().int().positive(),
  expenseDescription: z.string().trim().min(1),
  fileName: z.string().trim().min(1),
  month: z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  mimeType: z.string().trim().min(1),
}).strict();

const deleteMonthlyExpenseReceiptQuerySchema = z.object({
  fileId: z.string().trim().min(1),
}).strict();

async function getDefaultDriveClient(request: NextApiRequest) {
  const { getGoogleDriveClientFromRequest } = await import(
    "@/modules/auth/infrastructure/google-drive/google-drive-client"
  );

  return getGoogleDriveClientFromRequest(request);
}

export function createMonthlyExpenseReceiptsApiHandler<TResult>({
  getDriveClient = getDefaultDriveClient,
  remove,
  upload,
}: {
  getDriveClient?: (request: NextApiRequest) => Promise<drive_v3.Drive>;
  remove: (dependencies: {
    command: {
      fileId: string;
    };
    driveClient: drive_v3.Drive;
    request: NextApiRequest;
  }) => Promise<void>;
  upload: (dependencies: {
    command: UploadMonthlyExpenseReceiptCommand;
    driveClient: drive_v3.Drive;
    request: NextApiRequest;
  }) => Promise<TResult>;
}): NextApiHandler {
  return async function monthlyExpenseReceiptsApiHandler(request, response) {
    const requestContext = createRequestLogContext(request);

    if (request.method !== "POST" && request.method !== "DELETE") {
      appLogger.warn(
        "monthly-expense-receipts API received an unsupported method",
        {
          context: {
            ...requestContext,
            operation: "monthly-expense-receipts-api:method-not-allowed",
          },
        },
      );

      response.setHeader("Allow", "POST, DELETE");

      return response.status(405).json({
        error:
          "monthly-expense-receipts only supports POST and DELETE requests on this endpoint.",
      });
    }

    if (request.method === "DELETE") {
      const rawFileId = Array.isArray(request.query.fileId)
        ? request.query.fileId[0]
        : request.query.fileId;
      const parsedQuery = deleteMonthlyExpenseReceiptQuerySchema.safeParse({
        fileId: rawFileId,
      });

      if (!parsedQuery.success) {
        return response.status(400).json({
          error:
            "monthly-expense-receipts requires fileId for DELETE requests.",
        });
      }

      try {
        const driveClient = await getDriveClient(request);
        await remove({
          command: parsedQuery.data,
          driveClient,
          request,
        });

        response.status(204).end();
        return;
      } catch (error) {
        appLogger.error("monthly-expense-receipts API delete request failed", {
          context: {
            ...requestContext,
            operation: "monthly-expense-receipts-api:delete",
          },
          error,
        });

        if (error instanceof GoogleOAuthAuthenticationError) {
          return response.status(401).json({
            ...createTechnicalErrorEnvelope(
              "Google authentication is required before deleting monthly expense receipts.",
              TECHNICAL_ERROR_CODES.GOOGLE_AUTHENTICATION_REQUIRED,
            ),
          });
        }

        if (error instanceof GoogleOAuthConfigurationError) {
          return response.status(500).json({
            ...createTechnicalErrorEnvelope(
              "Google OAuth server configuration is incomplete for monthly expense receipt deletions.",
              TECHNICAL_ERROR_CODES.GOOGLE_OAUTH_CONFIGURATION_INCOMPLETE,
            ),
          });
        }

        if (error instanceof GoogleDriveStorageError) {
          if (error.code === "api_disabled") {
            return response.status(503).json({
              ...createTechnicalErrorEnvelope(
                "Google Drive API is not enabled for this project yet. Enable drive.googleapis.com in Google Cloud and try again.",
                TECHNICAL_ERROR_CODES.GOOGLE_DRIVE_API_DISABLED,
              ),
            });
          }

          if (error.code === "invalid_scope") {
            return response.status(403).json({
              ...createTechnicalErrorEnvelope(
                "The current Google session is missing the Drive permissions required to delete receipts. Sign out, connect Google again, and approve Drive access.",
                TECHNICAL_ERROR_CODES.GOOGLE_DRIVE_INVALID_SCOPE,
              ),
            });
          }

          if (error.code === "insufficient_permissions") {
            return response.status(403).json({
              ...createTechnicalErrorEnvelope(
                "Google Drive denied permission to delete this receipt. Verify the selected Google account can update Drive files and try again.",
                TECHNICAL_ERROR_CODES.GOOGLE_DRIVE_INSUFFICIENT_PERMISSIONS,
              ),
            });
          }
        }

        if (error instanceof Error) {
          return response.status(400).json({
            error: error.message,
          });
        }

        return response.status(500).json({
          ...createTechnicalErrorEnvelope(
            "We could not delete the monthly expense receipt right now. Try again later.",
            TECHNICAL_ERROR_CODES.MONTHLY_EXPENSES_RECEIPTS_API_DELETE_UNEXPECTED_ERROR,
          ),
        });
      }
    }

    const parsedBody = uploadMonthlyExpenseReceiptBodySchema.safeParse(request.body);

    if (!parsedBody.success) {
      appLogger.warn(
        "monthly-expense-receipts API received an invalid payload",
        {
          context: {
            ...requestContext,
            operation: "monthly-expense-receipts-api:invalid-payload",
          },
        },
      );

      return response.status(400).json({
        error:
          "monthly-expense-receipts requires fileName, mimeType, contentBase64, coveredPayments, expenseDescription, and month.",
      });
    }

    try {
      const driveClient = await getDriveClient(request);
      const result = await upload({
        command: parsedBody.data,
        driveClient,
        request,
      });

      return response.status(201).json({
        data: result,
      });
    } catch (error) {
      appLogger.error("monthly-expense-receipts API request failed", {
        context: {
          ...requestContext,
          operation: "monthly-expense-receipts-api:upload",
        },
        error,
      });

      if (error instanceof GoogleOAuthAuthenticationError) {
        return response.status(401).json({
          ...createTechnicalErrorEnvelope(
            "Google authentication is required before uploading monthly expense receipts.",
            TECHNICAL_ERROR_CODES.GOOGLE_AUTHENTICATION_REQUIRED,
          ),
        });
      }

      if (error instanceof GoogleOAuthConfigurationError) {
        return response.status(500).json({
          ...createTechnicalErrorEnvelope(
            "Google OAuth server configuration is incomplete for monthly expense receipt uploads.",
            TECHNICAL_ERROR_CODES.GOOGLE_OAUTH_CONFIGURATION_INCOMPLETE,
          ),
        });
      }

      if (error instanceof MonthlyExpenseReceiptFolderConflictError) {
        return response.status(409).json({
          error:
            "A receipt folder with the same description already exists. Rename the expense description and try again.",
        });
      }

      if (error instanceof GoogleDriveStorageError) {
        if (error.code === "api_disabled") {
          return response.status(503).json({
            ...createTechnicalErrorEnvelope(
              "Google Drive API is not enabled for this project yet. Enable drive.googleapis.com in Google Cloud and try again.",
              TECHNICAL_ERROR_CODES.GOOGLE_DRIVE_API_DISABLED,
            ),
          });
        }

        if (error.code === "invalid_scope") {
          return response.status(403).json({
            ...createTechnicalErrorEnvelope(
              "The current Google session is missing the Drive permissions required to upload receipts. Sign out, connect Google again, and approve Drive access.",
              TECHNICAL_ERROR_CODES.GOOGLE_DRIVE_INVALID_SCOPE,
            ),
          });
        }

        if (error.code === "insufficient_permissions") {
          return response.status(403).json({
            ...createTechnicalErrorEnvelope(
              "Google Drive denied permission to upload this receipt. Verify the selected Google account can create Drive files and try again.",
              TECHNICAL_ERROR_CODES.GOOGLE_DRIVE_INSUFFICIENT_PERMISSIONS,
            ),
          });
        }
      }

      if (error instanceof Error) {
        return response.status(400).json({
          error: error.message,
        });
      }

      return response.status(500).json({
        ...createTechnicalErrorEnvelope(
          "We could not upload the monthly expense receipt right now. Try again later.",
          TECHNICAL_ERROR_CODES.MONTHLY_EXPENSES_RECEIPTS_API_UPLOAD_UNEXPECTED_ERROR,
        ),
      });
    }
  };
}
