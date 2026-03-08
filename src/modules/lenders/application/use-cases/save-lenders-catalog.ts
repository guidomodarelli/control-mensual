import type { LendersRepository } from "../../domain/repositories/lenders-repository";
import {
  createLendersCatalogDocument,
  type LendersCatalogDocument,
} from "../../domain/value-objects/lenders-catalog-document";
import type { SaveLendersCatalogCommand } from "../commands/save-lenders-catalog-command";
import {
  toStoredLendersCatalogResult,
  type StoredLendersCatalogResult,
} from "../results/stored-lenders-catalog-result";

interface SaveLendersCatalogDependencies {
  command: SaveLendersCatalogCommand;
  repository: LendersRepository;
}

export async function saveLendersCatalog({
  command,
  repository,
}: SaveLendersCatalogDependencies): Promise<StoredLendersCatalogResult> {
  const validatedCatalog: LendersCatalogDocument = createLendersCatalogDocument(
    command,
    "Saving lenders catalog",
  );

  return toStoredLendersCatalogResult(await repository.save(validatedCatalog));
}
