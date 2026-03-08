import type { NextApiHandler, NextApiRequest } from "next";
import type { drive_v3 } from "googleapis";

import {
  GoogleOAuthAuthenticationError,
  GoogleOAuthConfigurationError,
} from "@/modules/auth/infrastructure/oauth/google-oauth-token";
import { GoogleDriveStorageError } from "@/modules/storage/infrastructure/google-drive/google-drive-storage-error";

async function getDefaultDriveClient(request: NextApiRequest) {
  const { getGoogleDriveClientFromRequest } = await import(
    "@/modules/auth/infrastructure/google-drive/google-drive-client"
  );

  return getGoogleDriveClientFromRequest(request);
}

export function createMonthlyExpensesLoansReportApiHandler<TResult>({
  getDriveClient = getDefaultDriveClient,
  load,
}: {
  getDriveClient?: (request: NextApiRequest) => Promise<drive_v3.Drive>;
  load: (dependencies: { driveClient: drive_v3.Drive }) => Promise<TResult>;
}): NextApiHandler {
  return async function monthlyExpensesLoansReportApiHandler(request, response) {
    if (request.method !== "GET") {
      response.setHeader("Allow", "GET");

      return response.status(405).json({
        error:
          "monthly-expenses-report only supports GET requests on this endpoint.",
      });
    }

    try {
      const driveClient = await getDriveClient(request);

      return response.status(200).json({
        data: await load({ driveClient }),
      });
    } catch (error) {
      if (error instanceof GoogleOAuthAuthenticationError) {
        return response.status(401).json({
          error:
            "Google authentication is required before loading monthly expenses reports from Drive.",
        });
      }

      if (error instanceof GoogleOAuthConfigurationError) {
        return response.status(500).json({
          error:
            "Google OAuth server configuration is incomplete for monthly expenses report loading.",
        });
      }

      if (error instanceof GoogleDriveStorageError) {
        if (error.code === "api_disabled") {
          return response.status(503).json({
            error:
              "Google Drive API is not enabled for this project yet. Enable drive.googleapis.com in Google Cloud and try again.",
          });
        }

        if (error.code === "invalid_scope") {
          return response.status(403).json({
            error:
              "The current Google session is missing the Drive permissions required to read monthly expenses reports. Sign out, connect Google again, and approve Drive access.",
          });
        }

        if (error.code === "insufficient_permissions") {
          return response.status(403).json({
            error:
              "Google Drive denied permission to read monthly expenses reports. Verify the selected Google account can read the required files and try again.",
          });
        }
      }

      if (error instanceof Error) {
        return response.status(400).json({
          error: error.message,
        });
      }

      return response.status(500).json({
        error:
          "We could not load the monthly expenses report from Google Drive. Try again later.",
      });
    }
  };
}
