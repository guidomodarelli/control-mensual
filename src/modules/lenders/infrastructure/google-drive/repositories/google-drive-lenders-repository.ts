import type { drive_v3 } from "googleapis";

import { mapGoogleDriveStorageError } from "@/modules/storage/infrastructure/google-drive/google-drive-storage-error";

import type { StoredLendersCatalog } from "../../../domain/entities/stored-lenders-catalog";
import type { LendersRepository } from "../../../domain/repositories/lenders-repository";
import type { LendersCatalogDocument } from "../../../domain/value-objects/lenders-catalog-document";
import {
  getLendersCatalogFileName,
  mapGoogleDriveLendersFileDtoToStoredCatalog,
  mapLendersCatalogToGoogleDriveFile,
  parseGoogleDriveLendersCatalogContent,
} from "../dto/mapper";

const DRIVE_FILE_FIELDS = "id,name,mimeType";
const DRIVE_FILES_CREATE_ENDPOINT = "drive.files.create";
const DRIVE_FILES_GET_ENDPOINT = "drive.files.get";
const DRIVE_FILES_LIST_ENDPOINT = "drive.files.list";
const DRIVE_FILES_UPDATE_ENDPOINT = "drive.files.update";

function escapeGoogleDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export class GoogleDriveLendersRepository implements LendersRepository {
  constructor(private readonly driveClient: drive_v3.Drive) {}

  async get(): Promise<LendersCatalogDocument | null> {
    const file = await this.findCatalogFile();

    if (!file?.id) {
      return null;
    }

    try {
      const response = await this.driveClient.files.get({
        alt: "media",
        fileId: file.id,
      });

      return parseGoogleDriveLendersCatalogContent(
        response.data,
        "Loading lenders catalog",
      );
    } catch (error) {
      throw mapGoogleDriveStorageError(error, {
        endpoint: DRIVE_FILES_GET_ENDPOINT,
        operation: "google-drive-lenders-repository:get",
      });
    }
  }

  async save(document: LendersCatalogDocument): Promise<StoredLendersCatalog> {
    const serializedDocument = mapLendersCatalogToGoogleDriveFile(document);
    const existingFile = await this.findCatalogFile();

    try {
      if (existingFile?.id) {
        const response = await this.driveClient.files.update({
          fields: DRIVE_FILE_FIELDS,
          fileId: existingFile.id,
          media: {
            body: serializedDocument.content,
            mimeType: serializedDocument.mimeType,
          },
          requestBody: {
            name: serializedDocument.name,
          },
        });

        return mapGoogleDriveLendersFileDtoToStoredCatalog(response.data);
      }

      const response = await this.driveClient.files.create({
        fields: DRIVE_FILE_FIELDS,
        media: {
          body: serializedDocument.content,
          mimeType: serializedDocument.mimeType,
        },
        requestBody: {
          name: serializedDocument.name,
          parents: ["appDataFolder"],
        },
      });

      return mapGoogleDriveLendersFileDtoToStoredCatalog(response.data);
    } catch (error) {
      throw mapGoogleDriveStorageError(error, {
        endpoint: existingFile?.id
          ? DRIVE_FILES_UPDATE_ENDPOINT
          : DRIVE_FILES_CREATE_ENDPOINT,
        operation: "google-drive-lenders-repository:save",
      });
    }
  }

  private async findCatalogFile() {
    try {
      const response = await this.driveClient.files.list({
        fields: `files(${DRIVE_FILE_FIELDS})`,
        pageSize: 1,
        q: `name = '${escapeGoogleDriveQueryValue(getLendersCatalogFileName())}' and 'appDataFolder' in parents and trashed = false`,
        spaces: "appDataFolder",
      });

      return response.data.files?.[0] ?? null;
    } catch (error) {
      throw mapGoogleDriveStorageError(error, {
        endpoint: DRIVE_FILES_LIST_ENDPOINT,
        operation: "google-drive-lenders-repository:findCatalogFile",
      });
    }
  }
}
