import type { NextApiHandler, NextApiRequest } from "next";

import {
  GoogleOAuthAuthenticationError,
  GoogleOAuthConfigurationError,
} from "@/modules/auth/infrastructure/oauth/google-oauth-token";
import type { TursoDatabase } from "@/modules/shared/infrastructure/database/drizzle/turso-database";
import { TursoConfigurationError } from "@/modules/shared/infrastructure/database/turso-server-config";

async function getDefaultUserSubject(request: NextApiRequest) {
  const { getAuthenticatedUserSubjectFromRequest } = await import(
    "@/modules/auth/infrastructure/next-auth/authenticated-user-subject"
  );

  return getAuthenticatedUserSubjectFromRequest(request);
}

async function getDefaultDatabase(): Promise<TursoDatabase> {
  const { createMigratedTursoDatabase } = await import(
    "@/modules/shared/infrastructure/database/drizzle/turso-database"
  );

  return createMigratedTursoDatabase();
}

export function createMonthlyExpensesLoansReportApiHandler<TResult>({
  getDatabase = getDefaultDatabase,
  getUserSubject = getDefaultUserSubject,
  load,
}: {
  getDatabase?: () => Promise<TursoDatabase> | TursoDatabase;
  getUserSubject?: (request: NextApiRequest) => Promise<string>;
  load: (dependencies: {
    database: TursoDatabase;
    userSubject: string;
  }) => Promise<TResult>;
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
      const userSubject = await getUserSubject(request);
      const database = await getDatabase();

      return response.status(200).json({
        data: await load({ database, userSubject }),
      });
    } catch (error) {
      if (error instanceof GoogleOAuthAuthenticationError) {
        return response.status(401).json({
          error:
            "Google authentication is required before loading monthly expenses reports.",
        });
      }

      if (error instanceof GoogleOAuthConfigurationError) {
        return response.status(500).json({
          error:
            "Google OAuth server configuration is incomplete for monthly expenses report loading.",
        });
      }

      if (error instanceof TursoConfigurationError) {
        return response.status(500).json({
          error:
            "Database server configuration is incomplete for monthly expenses report loading.",
        });
      }

      if (error instanceof Error) {
        return response.status(400).json({
          error: error.message,
        });
      }

      return response.status(500).json({
        error: "We could not load the monthly expenses report right now. Try again later.",
      });
    }
  };
}
