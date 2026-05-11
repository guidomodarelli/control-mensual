import type { StorageBootstrapResult } from "../results/storage-bootstrap";

interface GetStorageBootstrapInput {
  isGoogleOAuthConfigured: boolean;
  requiredScopes: readonly string[];
}

export function getStorageBootstrap({
  isGoogleOAuthConfigured,
  requiredScopes,
}: GetStorageBootstrapInput): StorageBootstrapResult {
  return {
    architecture: {
      dataStrategy: "ssr-first",
      middleendLocation: "src/modules",
      routing: "app-router",
    },
    authStatus: isGoogleOAuthConfigured ? "configured" : "pending",
    requiredScopes: [...requiredScopes],
    storageTargets: [
      {
        id: "userFiles",
        requiredScope: "https://www.googleapis.com/auth/drive.file",
        writesUserVisibleFiles: true,
      },
    ],
  };
}
