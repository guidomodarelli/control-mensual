import type { NextApiHandler, NextApiRequest } from "next";
import type { drive_v3 } from "googleapis";
import { z } from "zod";

import {
  GoogleOAuthAuthenticationError,
  GoogleOAuthConfigurationError,
} from "@/modules/auth/infrastructure/oauth/google-oauth-token";
import { GoogleDriveStorageError } from "@/modules/storage/infrastructure/google-drive/google-drive-storage-error";

const lenderSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  notes: z.string().optional(),
  type: z.enum(["bank", "family", "friend", "other"]),
});

const lendersRequestBodySchema = z.object({
  lenders: z.array(lenderSchema),
});

async function getDefaultDriveClient(request: NextApiRequest) {
  const { getGoogleDriveClientFromRequest } = await import(
    "@/modules/auth/infrastructure/google-drive/google-drive-client"
  );

  return getGoogleDriveClientFromRequest(request);
}

export function createLendersApiHandler<TGetResult, TSaveResult>({
  get,
  getDriveClient = getDefaultDriveClient,
  save,
}: {
  get: (dependencies: { driveClient: drive_v3.Drive }) => Promise<TGetResult>;
  getDriveClient?: (request: NextApiRequest) => Promise<drive_v3.Drive>;
  save: (dependencies: {
    command: z.infer<typeof lendersRequestBodySchema>;
    driveClient: drive_v3.Drive;
    request: NextApiRequest;
  }) => Promise<TSaveResult>;
}): NextApiHandler {
  return async function lendersApiHandler(request, response) {
    if (request.method !== "GET" && request.method !== "POST") {
      response.setHeader("Allow", "GET, POST");

      return response.status(405).json({
        error: "lenders only supports GET and POST requests on this endpoint.",
      });
    }

    try {
      const driveClient = await getDriveClient(request);

      if (request.method === "GET") {
        return response.status(200).json({
          data: await get({ driveClient }),
        });
      }

      const parsedBody = lendersRequestBodySchema.safeParse(request.body);

      if (!parsedBody.success) {
        return response.status(400).json({
          error:
            "lenders requires a JSON body with unique lenders, valid types, and non-empty ids and names.",
        });
      }

      return response.status(201).json({
        data: await save({
          command: parsedBody.data,
          driveClient,
          request,
        }),
      });
    } catch (error) {
      if (error instanceof GoogleOAuthAuthenticationError) {
        return response.status(401).json({
          error:
            "Google authentication is required before reading or saving lenders in Drive.",
        });
      }

      if (error instanceof GoogleOAuthConfigurationError) {
        return response.status(500).json({
          error:
            "Google OAuth server configuration is incomplete for lenders Drive storage.",
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
              "The current Google session is missing the Drive permissions required to manage lenders. Sign out, connect Google again, and approve Drive access.",
          });
        }

        if (error.code === "insufficient_permissions") {
          return response.status(403).json({
            error:
              "Google Drive denied permission to manage lenders. Verify the selected Google account can access app data and try again.",
          });
        }

        if (error.code === "invalid_payload") {
          return response.status(400).json({
            error:
              "Google Drive rejected the lenders payload. Check the catalog values and try again.",
          });
        }
      }

      if (error instanceof Error) {
        return response.status(400).json({
          error: error.message,
        });
      }

      return response.status(500).json({
        error: "We could not manage lenders in Google Drive. Try again later.",
      });
    }
  };
}
