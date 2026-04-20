import { monotonicFactory } from "ulid";

const createMonotonicUlid = monotonicFactory();

/**
 * Generates sortable identifiers for monthly expense rows.
 *
 * ULID keeps lexicographic order aligned with creation time,
 * allowing stable ordering when persistence sorts by id.
 */
export function createMonthlyExpenseId(): string {
  return createMonotonicUlid();
}
