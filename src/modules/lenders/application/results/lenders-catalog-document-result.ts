import type {
  Lender,
  LendersCatalogDocument,
} from "../../domain/value-objects/lenders-catalog-document";
import { createEmptyLendersCatalogDocument } from "../../domain/value-objects/lenders-catalog-document";

export interface LendersCatalogDocumentResult extends LendersCatalogDocument {
  lenders: Lender[];
}

export function toLendersCatalogDocumentResult(
  document: LendersCatalogDocument,
): LendersCatalogDocumentResult {
  return {
    lenders: document.lenders.map((lender) => ({ ...lender })),
  };
}

export function createEmptyLendersCatalogDocumentResult(): LendersCatalogDocumentResult {
  return toLendersCatalogDocumentResult(createEmptyLendersCatalogDocument());
}
