import type { LendersRepository } from "../../domain/repositories/lenders-repository";
import { createEmptyLendersCatalogDocument } from "../../domain/value-objects/lenders-catalog-document";
import {
  toLendersCatalogDocumentResult,
  type LendersCatalogDocumentResult,
} from "../results/lenders-catalog-document-result";

interface GetLendersCatalogDependencies {
  repository: LendersRepository;
}

export async function getLendersCatalog({
  repository,
}: GetLendersCatalogDependencies): Promise<LendersCatalogDocumentResult> {
  const storedCatalog = await repository.get();

  return toLendersCatalogDocumentResult(
    storedCatalog ?? createEmptyLendersCatalogDocument(),
  );
}
