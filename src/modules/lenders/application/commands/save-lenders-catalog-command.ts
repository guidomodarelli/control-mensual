import type {
  LenderInput,
  LendersCatalogDocumentInput,
} from "../../domain/value-objects/lenders-catalog-document";

export interface SaveLendersCatalogCommand extends LendersCatalogDocumentInput {
  lenders: LenderInput[];
}
