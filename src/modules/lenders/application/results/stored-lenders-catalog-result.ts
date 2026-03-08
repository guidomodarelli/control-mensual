import type { StoredLendersCatalog } from "../../domain/entities/stored-lenders-catalog";

export type StoredLendersCatalogResult = StoredLendersCatalog;

export function toStoredLendersCatalogResult(
  catalog: StoredLendersCatalog,
): StoredLendersCatalogResult {
  return {
    id: catalog.id,
    name: catalog.name,
  };
}
