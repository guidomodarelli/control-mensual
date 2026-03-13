import { createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "node:path";

import {
  requireTursoServerConfig,
} from "../turso-server-config";
import * as schema from "./schema";

export type TursoDatabase = LibSQLDatabase<typeof schema>;
const migrationsFolder = path.resolve(process.cwd(), "drizzle");

export function createTursoDatabase(): TursoDatabase {
  const config = requireTursoServerConfig();
  const client = createClient({
    authToken: config.authToken,
    url: config.url,
  });

  return drizzle(client, {
    schema,
  });
}

export async function createMigratedTursoDatabase(): Promise<TursoDatabase> {
  const database = createTursoDatabase();

  await migrate(database, {
    migrationsFolder,
  });

  return database;
}
