import type { StoredLendersCatalog } from "../entities/stored-lenders-catalog";
import type { LendersCatalogDocument } from "../value-objects/lenders-catalog-document";

export interface LendersRepository {
  get(): Promise<LendersCatalogDocument | null>;
  save(document: LendersCatalogDocument): Promise<StoredLendersCatalog>;
}
