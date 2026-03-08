import { getLendersCatalog } from "@/modules/lenders/application/use-cases/get-lenders-catalog";
import { saveLendersCatalog } from "@/modules/lenders/application/use-cases/save-lenders-catalog";
import { createLendersApiHandler } from "@/modules/lenders/infrastructure/api/create-lenders-api-handler";
import { GoogleDriveLendersRepository } from "@/modules/lenders/infrastructure/google-drive/repositories/google-drive-lenders-repository";

export default createLendersApiHandler({
  async get({ driveClient }) {
    return getLendersCatalog({
      repository: new GoogleDriveLendersRepository(driveClient),
    });
  },
  async save({ command, driveClient }) {
    return saveLendersCatalog({
      command,
      repository: new GoogleDriveLendersRepository(driveClient),
    });
  },
});
