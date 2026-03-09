import type { drive_v3 } from "googleapis";

import { VISIBLE_DRIVE_FOLDER_NAME } from "@/modules/storage/shared/visible-drive-folder-name";

import { mapGoogleDriveStorageError } from "./google-drive-storage-error";

const DRIVE_FILES_CREATE_ENDPOINT = "drive.files.create";
const DRIVE_FILES_LIST_ENDPOINT = "drive.files.list";
const DRIVE_FOLDER_FIELDS = "id,name,mimeType";
const DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

function escapeGoogleDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export async function findVisibleDriveFolder({
  driveClient,
  operation,
}: {
  driveClient: drive_v3.Drive;
  operation: string;
}) {
  try {
    const response = await driveClient.files.list({
      fields: `files(${DRIVE_FOLDER_FIELDS})`,
      orderBy: "modifiedTime desc",
      pageSize: 1,
      q: `name = '${escapeGoogleDriveQueryValue(VISIBLE_DRIVE_FOLDER_NAME)}' and mimeType = '${DRIVE_FOLDER_MIME_TYPE}' and trashed = false`,
    });

    return response.data.files?.[0] ?? null;
  } catch (error) {
    throw mapGoogleDriveStorageError(error, {
      endpoint: DRIVE_FILES_LIST_ENDPOINT,
      operation,
    });
  }
}

export async function getOrCreateVisibleDriveFolder({
  driveClient,
  operation,
}: {
  driveClient: drive_v3.Drive;
  operation: string;
}) {
  const existingFolder = await findVisibleDriveFolder({
    driveClient,
    operation: `${operation}:findFolder`,
  });

  if (existingFolder?.id) {
    return existingFolder;
  }

  try {
    const response = await driveClient.files.create({
      fields: DRIVE_FOLDER_FIELDS,
      requestBody: {
        mimeType: DRIVE_FOLDER_MIME_TYPE,
        name: VISIBLE_DRIVE_FOLDER_NAME,
      },
    });

    if (!response.data.id) {
      throw new Error("Google Drive did not return an id for the visible folder.");
    }

    return response.data;
  } catch (error) {
    throw mapGoogleDriveStorageError(error, {
      endpoint: DRIVE_FILES_CREATE_ENDPOINT,
      operation,
    });
  }
}
