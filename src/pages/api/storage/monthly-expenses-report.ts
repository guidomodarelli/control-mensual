import { getLendersCatalog } from "@/modules/lenders/application/use-cases/get-lenders-catalog";
import { GoogleDriveLendersRepository } from "@/modules/lenders/infrastructure/google-drive/repositories/google-drive-lenders-repository";
import { getMonthlyExpensesLoansReport } from "@/modules/monthly-expenses/application/use-cases/get-monthly-expenses-loans-report";
import { createMonthlyExpensesLoansReportApiHandler } from "@/modules/monthly-expenses/infrastructure/api/create-monthly-expenses-loans-report-api-handler";
import { GoogleDriveMonthlyExpensesRepository } from "@/modules/monthly-expenses/infrastructure/google-drive/repositories/google-drive-monthly-expenses-repository";

export default createMonthlyExpensesLoansReportApiHandler({
  async load({ driveClient }) {
    const lendersCatalog = await getLendersCatalog({
      repository: new GoogleDriveLendersRepository(driveClient),
    });

    return getMonthlyExpensesLoansReport({
      lenders: lendersCatalog.lenders,
      repository: new GoogleDriveMonthlyExpensesRepository(driveClient),
    });
  },
});
