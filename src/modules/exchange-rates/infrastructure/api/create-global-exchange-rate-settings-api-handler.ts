import type { NextApiHandler, NextApiRequest } from "next";
import { z } from "zod";

import {
  getAuthenticatedUserEmailFromRequest,
} from "@/modules/auth/infrastructure/next-auth/authenticated-user-email";
import {
  isGoogleAdminEmail,
} from "@/modules/auth/infrastructure/next-auth/google-admin-allowlist";
import {
  GoogleOAuthAuthenticationError,
  GoogleOAuthConfigurationError,
} from "@/modules/auth/infrastructure/oauth/google-oauth-token";
import type { TursoDatabase } from "@/modules/shared/infrastructure/database/drizzle/turso-database";
import { TursoConfigurationError } from "@/modules/shared/infrastructure/database/turso-server-config";
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

import type { SaveGlobalExchangeRateSettingsCommand } from "../../application/commands/save-global-exchange-rate-settings-command";

const globalExchangeRateSettingsRequestBodySchema = z.object({
  iibbRateDecimal: z.number(),
});

async function getDefaultDatabase(): Promise<TursoDatabase> {
  const { createMigratedTursoDatabase } = await import(
    "@/modules/shared/infrastructure/database/drizzle/turso-database"
  );

  return createMigratedTursoDatabase();
}

export function createGlobalExchangeRateSettingsApiHandler<TResult>({
  getDatabase = getDefaultDatabase,
  getUserEmail = getAuthenticatedUserEmailFromRequest,
  save,
}: {
  getDatabase?: () => Promise<TursoDatabase> | TursoDatabase;
  getUserEmail?: (request: NextApiRequest) => Promise<string>;
  save: (dependencies: {
    command: SaveGlobalExchangeRateSettingsCommand;
    database: TursoDatabase;
    request: NextApiRequest;
    userEmail: string;
  }) => Promise<TResult>;
}): NextApiHandler {
  return async function globalExchangeRateSettingsApiHandler(request, response) {
    const requestContext = createRequestLogContext(request);

    if (request.method !== "POST") {
      appLogger.warn(
        "global exchange rate settings API received an unsupported method",
        {
          context: {
            ...requestContext,
            operation: "global-exchange-rate-settings-api:method-not-allowed",
          },
        },
      );
      response.setHeader("Allow", "POST");

      return response.status(405).json({
        error:
          "global-exchange-rate-settings only supports POST requests on this endpoint.",
      });
    }

    const parsedBody = globalExchangeRateSettingsRequestBodySchema.safeParse(
      request.body,
    );

    if (!parsedBody.success) {
      appLogger.warn(
        "global exchange rate settings API received an invalid payload",
        {
          context: {
            ...requestContext,
            operation: "global-exchange-rate-settings-api:invalid-payload",
          },
        },
      );

      return response.status(400).json({
        error:
          "global-exchange-rate-settings requires a JSON body with a numeric iibbRateDecimal value.",
      });
    }

    try {
      const userEmail = await getUserEmail(request);

      if (!isGoogleAdminEmail(userEmail)) {
        return response.status(403).json({
          error:
            "Only Google admins can update the global IIBB configuration.",
        });
      }

      const database = await getDatabase();
      const result = await save({
        command: parsedBody.data,
        database,
        request,
        userEmail,
      });

      return response.status(200).json({
        data: result,
      });
    } catch (error) {
      appLogger.error("global exchange rate settings API request failed", {
        context: {
          ...requestContext,
          operation: "global-exchange-rate-settings-api:post",
        },
        error,
      });

      if (error instanceof GoogleOAuthAuthenticationError) {
        return response.status(401).json({
          ...createTechnicalErrorEnvelope(
            "Google authentication is required before saving the global IIBB configuration.",
            TECHNICAL_ERROR_CODES.GOOGLE_AUTHENTICATION_REQUIRED,
          ),
        });
      }

      if (error instanceof GoogleOAuthConfigurationError) {
        return response.status(500).json({
          ...createTechnicalErrorEnvelope(
            "Google OAuth server configuration is incomplete for global IIBB configuration.",
            TECHNICAL_ERROR_CODES.GOOGLE_OAUTH_CONFIGURATION_INCOMPLETE,
          ),
        });
      }

      if (error instanceof TursoConfigurationError) {
        return response.status(500).json({
          ...createTechnicalErrorEnvelope(
            "Database server configuration is incomplete for global IIBB configuration.",
            TECHNICAL_ERROR_CODES.TURSO_CONFIGURATION_INCOMPLETE,
          ),
        });
      }

      if (error instanceof Error) {
        return response.status(400).json({
          error: error.message,
        });
      }

      return response.status(500).json({
        ...createTechnicalErrorEnvelope(
          "We could not save the global IIBB configuration right now. Try again later.",
          TECHNICAL_ERROR_CODES.EXCHANGE_RATES_SETTINGS_API_UNEXPECTED_ERROR,
        ),
      });
    }
  };
}
