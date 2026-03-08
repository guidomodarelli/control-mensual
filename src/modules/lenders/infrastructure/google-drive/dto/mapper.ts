import { z } from "zod";

import type { StoredLendersCatalog } from "../../../domain/entities/stored-lenders-catalog";
import {
  createLendersCatalogDocument,
  LENDER_TYPES,
  type LendersCatalogDocument,
} from "../../../domain/value-objects/lenders-catalog-document";
import type { GoogleDriveLendersFileDto } from "./google-drive-lenders-file.dto";

const googleDriveLenderSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  notes: z.string().optional(),
  type: z.enum(LENDER_TYPES),
});

const googleDriveLendersCatalogSchema = z.object({
  lenders: z.array(googleDriveLenderSchema),
});

const LENDERS_CATALOG_FILE_NAME = "lenders-catalog.json";
const LENDERS_CATALOG_MIME_TYPE = "application/json";

export function getLendersCatalogFileName(): string {
  return LENDERS_CATALOG_FILE_NAME;
}

export function mapLendersCatalogToGoogleDriveFile(
  document: LendersCatalogDocument,
): {
  content: string;
  mimeType: string;
  name: string;
} {
  return {
    content: JSON.stringify(
      {
        lenders: document.lenders.map(({ id, name, notes, type }) => ({
          ...(notes ? { notes } : {}),
          id,
          name,
          type,
        })),
      },
      null,
      2,
    ),
    mimeType: LENDERS_CATALOG_MIME_TYPE,
    name: LENDERS_CATALOG_FILE_NAME,
  };
}

export function mapGoogleDriveLendersFileDtoToStoredCatalog(
  dto: GoogleDriveLendersFileDto,
): StoredLendersCatalog {
  if (!dto.id || !dto.name) {
    throw new Error(
      "Cannot map a Google Drive lenders catalog DTO without id and name.",
    );
  }

  return {
    id: dto.id,
    name: dto.name,
  };
}

export function parseGoogleDriveLendersCatalogContent(
  content: unknown,
  operationName: string,
): LendersCatalogDocument {
  try {
    const rawContent =
      typeof content === "string" ? JSON.parse(content) : content ?? {};
    const parsedDto = googleDriveLendersCatalogSchema.parse(rawContent);

    return createLendersCatalogDocument(parsedDto, operationName);
  } catch (error) {
    throw new Error(
      `${operationName} could not parse the stored lenders catalog.`,
      { cause: error },
    );
  }
}
