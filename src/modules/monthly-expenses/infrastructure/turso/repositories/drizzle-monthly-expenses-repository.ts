import { and, asc, eq, inArray, sql } from "drizzle-orm";

import {
  expenseMonthsTable,
  expensePaymentRecordsTable,
  expenseReceiptsTable,
  expensesTable,
  monthlyExpensesDocumentsTable,
} from "@/modules/shared/infrastructure/database/drizzle/schema";
import type { TursoDatabase } from "@/modules/shared/infrastructure/database/drizzle/turso-database";

import type { StoredMonthlyExpensesDocument } from "../../../domain/entities/stored-monthly-expenses-document";
import type { MonthlyExpensesRepository } from "../../../domain/repositories/monthly-expenses-repository";
import {
  createMonthlyExpensesDocument,
  type MonthlyExpenseItem,
  type MonthlyExpensesDocument,
} from "../../../domain/value-objects/monthly-expenses-document";
import {
  createMonthlyExpensesFileName,
  mapMonthlyExpensesDocumentToGoogleDriveFile,
  parseGoogleDriveMonthlyExpensesContent,
} from "../../google-drive/dto/mapper";

interface NormalizedExpenseRow {
  allReceiptsFolderId: string | null;
  allReceiptsFolderViewUrl: string | null;
  currency: string;
  description: string;
  exchangeRateBlueRate: number | null;
  exchangeRateMonth: string | null;
  exchangeRateOfficialRate: number | null;
  exchangeRateSolidarityRate: number | null;
  expenseId: string;
  isPaid: number;
  loanInstallmentCount: number | null;
  loanLenderId: string | null;
  loanLenderName: string | null;
  loanStartMonth: string | null;
  manualCoveredPayments: number;
  month: string;
  monthlyFolderId: string | null;
  monthlyFolderViewUrl: string | null;
  occurrencesPerMonth: number;
  paymentLink: string | null;
  receiptShareMessage: string | null;
  receiptSharePhoneDigits: string | null;
  receiptShareStatus: string | null;
  requiresReceiptShare: number;
  subtotal: number;
}

function toBooleanInteger(value: boolean): number {
  return value ? 1 : 0;
}

function getDuplicatedExpenseIds(items: readonly MonthlyExpenseItem[]): string[] {
  const seenExpenseIds = new Set<string>();
  const duplicatedExpenseIds = new Set<string>();

  for (const item of items) {
    if (seenExpenseIds.has(item.id)) {
      duplicatedExpenseIds.add(item.id);
      continue;
    }

    seenExpenseIds.add(item.id);
  }

  return Array.from(duplicatedExpenseIds);
}

function hasDuplicatedExpenseIds(items: readonly MonthlyExpenseItem[]): boolean {
  return getDuplicatedExpenseIds(items).length > 0;
}

interface MonthlyExpensesPersistenceExecutor {
  delete: TursoDatabase["delete"];
  insert: TursoDatabase["insert"];
  select: TursoDatabase["select"];
}

function buildOrderedCreatedAtIso(baseTimestamp: number, index: number): string {
  return new Date(baseTimestamp + index).toISOString();
}

function getPreferredAllReceiptsFolder(item: MonthlyExpenseItem): {
  id: string | null;
  viewUrl: string | null;
} {
  const folderIdFromFolders = item.folders?.allReceiptsFolderId?.trim() ?? "";
  const folderViewUrlFromFolders = item.folders?.allReceiptsFolderViewUrl?.trim() ?? "";

  if (folderIdFromFolders && folderViewUrlFromFolders) {
    return {
      id: folderIdFromFolders,
      viewUrl: folderViewUrlFromFolders,
    };
  }

  const firstReceipt = item.receipts[0];

  if (!firstReceipt) {
    return {
      id: null,
      viewUrl: null,
    };
  }

  return {
    id: firstReceipt.allReceiptsFolderId,
    viewUrl: firstReceipt.allReceiptsFolderViewUrl,
  };
}

function getPreferredMonthlyFolder(item: MonthlyExpenseItem): {
  id: string | null;
  viewUrl: string | null;
} {
  const folderIdFromFolders = item.folders?.monthlyFolderId?.trim() ?? "";
  const folderViewUrlFromFolders = item.folders?.monthlyFolderViewUrl?.trim() ?? "";

  if (folderIdFromFolders && folderViewUrlFromFolders) {
    return {
      id: folderIdFromFolders,
      viewUrl: folderViewUrlFromFolders,
    };
  }

  const firstReceipt = item.receipts[0];

  if (!firstReceipt) {
    return {
      id: null,
      viewUrl: null,
    };
  }

  return {
    id: firstReceipt.monthlyFolderId,
    viewUrl: firstReceipt.monthlyFolderViewUrl,
  };
}

export class DrizzleMonthlyExpensesRepository
  implements MonthlyExpensesRepository
{
  constructor(
    private readonly database: TursoDatabase,
    private readonly userSubject: string,
  ) {}

  private async getLegacyDocumentByMonth(
    month: string,
  ): Promise<MonthlyExpensesDocument | null> {
    const rows = await this.database
      .select({
        payloadJson: monthlyExpensesDocumentsTable.payloadJson,
      })
      .from(monthlyExpensesDocumentsTable)
      .where(
        and(
          eq(monthlyExpensesDocumentsTable.userSubject, this.userSubject),
          eq(monthlyExpensesDocumentsTable.month, month),
        ),
      )
      .limit(1);
    const row = rows[0];

    if (!row) {
      return null;
    }

    return parseGoogleDriveMonthlyExpensesContent(
      row.payloadJson,
      "Loading monthly expenses from database",
    );
  }

  private async removeOrphanedExpenses(
    databaseExecutor: MonthlyExpensesPersistenceExecutor,
    expenseIds: string[],
  ): Promise<void> {
    for (const expenseId of expenseIds) {
      const rows = await databaseExecutor
        .select({
          month: expenseMonthsTable.month,
        })
        .from(expenseMonthsTable)
        .where(
          and(
            eq(expenseMonthsTable.userSubject, this.userSubject),
            eq(expenseMonthsTable.expenseId, expenseId),
          ),
        )
        .limit(1);

      if (rows.length > 0) {
        continue;
      }

      await databaseExecutor
        .delete(expensesTable)
        .where(
          and(
            eq(expensesTable.userSubject, this.userSubject),
            eq(expensesTable.expenseId, expenseId),
          ),
        );
    }
  }

  private async saveNormalizedDocumentWithExecutor(
    databaseExecutor: MonthlyExpensesPersistenceExecutor,
    document: MonthlyExpensesDocument,
  ): Promise<void> {
    const duplicatedExpenseIds = getDuplicatedExpenseIds(document.items);

    if (duplicatedExpenseIds.length > 0) {
      await this.clearNormalizedMonthWithExecutor(
        databaseExecutor,
        document.month,
      );

      return;
    }

    const nowIso = new Date().toISOString();
    const createdAtBaseTimestamp = Date.now();
    const currentExpenseIds = document.items.map((item) => item.id);

    const existingRowsForMonth = await databaseExecutor
      .select({
        expenseId: expenseMonthsTable.expenseId,
      })
      .from(expenseMonthsTable)
      .where(
        and(
          eq(expenseMonthsTable.userSubject, this.userSubject),
          eq(expenseMonthsTable.month, document.month),
        ),
      );

    const existingExpenseIds = existingRowsForMonth.map((row) => row.expenseId);
    const deletedExpenseIds = existingExpenseIds.filter(
      (expenseId) => !currentExpenseIds.includes(expenseId),
    );

    if (deletedExpenseIds.length > 0) {
      await databaseExecutor
        .delete(expensePaymentRecordsTable)
        .where(
          and(
            eq(expensePaymentRecordsTable.userSubject, this.userSubject),
            eq(expensePaymentRecordsTable.month, document.month),
            inArray(expensePaymentRecordsTable.expenseId, deletedExpenseIds),
          ),
        );

      await databaseExecutor
        .delete(expenseReceiptsTable)
        .where(
          and(
            eq(expenseReceiptsTable.userSubject, this.userSubject),
            eq(expenseReceiptsTable.month, document.month),
            inArray(expenseReceiptsTable.expenseId, deletedExpenseIds),
          ),
        );

      await databaseExecutor
        .delete(expenseMonthsTable)
        .where(
          and(
            eq(expenseMonthsTable.userSubject, this.userSubject),
            eq(expenseMonthsTable.month, document.month),
            inArray(expenseMonthsTable.expenseId, deletedExpenseIds),
          ),
        );

      await this.removeOrphanedExpenses(databaseExecutor, deletedExpenseIds);
    }

    if (currentExpenseIds.length > 0) {
      await databaseExecutor
        .delete(expensePaymentRecordsTable)
        .where(
          and(
            eq(expensePaymentRecordsTable.userSubject, this.userSubject),
            eq(expensePaymentRecordsTable.month, document.month),
            inArray(expensePaymentRecordsTable.expenseId, currentExpenseIds),
          ),
        );

      await databaseExecutor
        .delete(expenseReceiptsTable)
        .where(
          and(
            eq(expenseReceiptsTable.userSubject, this.userSubject),
            eq(expenseReceiptsTable.month, document.month),
            inArray(expenseReceiptsTable.expenseId, currentExpenseIds),
          ),
        );
    }

    for (const [itemIndex, item] of document.items.entries()) {
      const allReceiptsFolder = getPreferredAllReceiptsFolder(item);
      const monthlyFolder = getPreferredMonthlyFolder(item);
      const createdAtIso = buildOrderedCreatedAtIso(
        createdAtBaseTimestamp,
        itemIndex,
      );

      await databaseExecutor
        .insert(expensesTable)
        .values({
          allReceiptsFolderId: allReceiptsFolder.id,
          allReceiptsFolderViewUrl: allReceiptsFolder.viewUrl,
          createdAtIso,
          currency: item.currency,
          description: item.description,
          expenseId: item.id,
          loanInstallmentCount: item.loan?.installmentCount ?? null,
          loanLenderId: item.loan?.lenderId ?? null,
          loanLenderName: item.loan?.lenderName ?? null,
          loanStartMonth: item.loan?.startMonth ?? null,
          paymentLink: item.paymentLink ?? null,
          receiptShareMessage: item.receiptShareMessage ?? null,
          receiptSharePhoneDigits: item.receiptSharePhoneDigits ?? null,
          requiresReceiptShare: toBooleanInteger(item.requiresReceiptShare === true),
          updatedAtIso: nowIso,
          userSubject: this.userSubject,
        })
        .onConflictDoUpdate({
          set: {
            allReceiptsFolderId: allReceiptsFolder.id,
            allReceiptsFolderViewUrl: allReceiptsFolder.viewUrl,
            currency: item.currency,
            description: item.description,
            loanInstallmentCount: item.loan?.installmentCount ?? null,
            loanLenderId: item.loan?.lenderId ?? null,
            loanLenderName: item.loan?.lenderName ?? null,
            loanStartMonth: item.loan?.startMonth ?? null,
            paymentLink: item.paymentLink ?? null,
            receiptShareMessage: item.receiptShareMessage ?? null,
            receiptSharePhoneDigits: item.receiptSharePhoneDigits ?? null,
            requiresReceiptShare: toBooleanInteger(item.requiresReceiptShare === true),
            updatedAtIso: nowIso,
          },
          target: [expensesTable.userSubject, expensesTable.expenseId],
        });

      await databaseExecutor
        .insert(expenseMonthsTable)
        .values({
          exchangeRateBlueRate: document.exchangeRateSnapshot?.blueRate ?? null,
          exchangeRateMonth: document.exchangeRateSnapshot?.month ?? null,
          exchangeRateOfficialRate:
            document.exchangeRateSnapshot?.officialRate ?? null,
          exchangeRateSolidarityRate:
            document.exchangeRateSnapshot?.solidarityRate ?? null,
          expenseId: item.id,
          isPaid: toBooleanInteger(item.isPaid === true),
          manualCoveredPayments: item.manualCoveredPayments,
          month: document.month,
          monthlyFolderId: monthlyFolder.id,
          monthlyFolderViewUrl: monthlyFolder.viewUrl,
          occurrencesPerMonth: item.occurrencesPerMonth,
          receiptShareStatus: item.receiptShareStatus ?? null,
          subtotal: item.subtotal,
          updatedAtIso: nowIso,
          userSubject: this.userSubject,
        })
        .onConflictDoUpdate({
          set: {
            exchangeRateBlueRate: document.exchangeRateSnapshot?.blueRate ?? null,
            exchangeRateMonth: document.exchangeRateSnapshot?.month ?? null,
            exchangeRateOfficialRate:
              document.exchangeRateSnapshot?.officialRate ?? null,
            exchangeRateSolidarityRate:
              document.exchangeRateSnapshot?.solidarityRate ?? null,
            isPaid: toBooleanInteger(item.isPaid === true),
            manualCoveredPayments: item.manualCoveredPayments,
            monthlyFolderId: monthlyFolder.id,
            monthlyFolderViewUrl: monthlyFolder.viewUrl,
            occurrencesPerMonth: item.occurrencesPerMonth,
            receiptShareStatus: item.receiptShareStatus ?? null,
            subtotal: item.subtotal,
            updatedAtIso: nowIso,
          },
          target: [
            expenseMonthsTable.userSubject,
            expenseMonthsTable.expenseId,
            expenseMonthsTable.month,
          ],
        });

      if (item.receipts.length > 0) {
        await databaseExecutor.insert(expenseReceiptsTable).values(
          item.receipts.map((receipt) => ({
            allReceiptsFolderId: receipt.allReceiptsFolderId,
            allReceiptsFolderViewUrl: receipt.allReceiptsFolderViewUrl,
            coveredPayments: receipt.coveredPayments ?? 1,
            expenseId: item.id,
            fileId: receipt.fileId,
            fileName: receipt.fileName,
            fileViewUrl: receipt.fileViewUrl,
            month: document.month,
            monthlyFolderId: receipt.monthlyFolderId,
            monthlyFolderViewUrl: receipt.monthlyFolderViewUrl,
            registeredAtIso: receipt.registeredAt ?? null,
            userSubject: this.userSubject,
          })),
        );
      }

      if (item.paymentRecords && item.paymentRecords.length > 0) {
        await databaseExecutor.insert(expensePaymentRecordsTable).values(
          item.paymentRecords.map((paymentRecord) => ({
            coveredPayments: paymentRecord.coveredPayments,
            expenseId: item.id,
            month: document.month,
            paymentRecordId: paymentRecord.id,
            receiptFileId: paymentRecord.receipt?.fileId ?? null,
            registeredAtIso: paymentRecord.registeredAt ?? null,
            userSubject: this.userSubject,
          })),
        );
      }
    }
  }

  private async clearNormalizedMonthWithExecutor(
    databaseExecutor: MonthlyExpensesPersistenceExecutor,
    month: string,
  ): Promise<void> {
    const existingRowsForMonth = await databaseExecutor
      .select({
        expenseId: expenseMonthsTable.expenseId,
      })
      .from(expenseMonthsTable)
      .where(
        and(
          eq(expenseMonthsTable.userSubject, this.userSubject),
          eq(expenseMonthsTable.month, month),
        ),
      );
    const existingExpenseIds = existingRowsForMonth.map((row) => row.expenseId);

    if (existingExpenseIds.length === 0) {
      return;
    }

    await databaseExecutor
      .delete(expensePaymentRecordsTable)
      .where(
        and(
          eq(expensePaymentRecordsTable.userSubject, this.userSubject),
          eq(expensePaymentRecordsTable.month, month),
          inArray(expensePaymentRecordsTable.expenseId, existingExpenseIds),
        ),
      );

    await databaseExecutor
      .delete(expenseReceiptsTable)
      .where(
        and(
          eq(expenseReceiptsTable.userSubject, this.userSubject),
          eq(expenseReceiptsTable.month, month),
          inArray(expenseReceiptsTable.expenseId, existingExpenseIds),
        ),
      );

    await databaseExecutor
      .delete(expenseMonthsTable)
      .where(
        and(
          eq(expenseMonthsTable.userSubject, this.userSubject),
          eq(expenseMonthsTable.month, month),
          inArray(expenseMonthsTable.expenseId, existingExpenseIds),
        ),
      );

    await this.removeOrphanedExpenses(databaseExecutor, existingExpenseIds);
  }

  private async saveNormalizedDocument(
    document: MonthlyExpensesDocument,
  ): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await this.saveNormalizedDocumentWithExecutor(transaction, document);
    });
  }

  private async getByMonthFromNormalized(
    month: string,
  ): Promise<MonthlyExpensesDocument | null> {
    const rows = await this.database
      .select({
        allReceiptsFolderId: expensesTable.allReceiptsFolderId,
        allReceiptsFolderViewUrl: expensesTable.allReceiptsFolderViewUrl,
        currency: expensesTable.currency,
        description: expensesTable.description,
        exchangeRateBlueRate: expenseMonthsTable.exchangeRateBlueRate,
        exchangeRateMonth: expenseMonthsTable.exchangeRateMonth,
        exchangeRateOfficialRate: expenseMonthsTable.exchangeRateOfficialRate,
        exchangeRateSolidarityRate: expenseMonthsTable.exchangeRateSolidarityRate,
        expenseId: expenseMonthsTable.expenseId,
        isPaid: expenseMonthsTable.isPaid,
        loanInstallmentCount: expensesTable.loanInstallmentCount,
        loanLenderId: expensesTable.loanLenderId,
        loanLenderName: expensesTable.loanLenderName,
        loanStartMonth: expensesTable.loanStartMonth,
        manualCoveredPayments: expenseMonthsTable.manualCoveredPayments,
        month: expenseMonthsTable.month,
        monthlyFolderId: expenseMonthsTable.monthlyFolderId,
        monthlyFolderViewUrl: expenseMonthsTable.monthlyFolderViewUrl,
        occurrencesPerMonth: expenseMonthsTable.occurrencesPerMonth,
        paymentLink: expensesTable.paymentLink,
        receiptShareMessage: expensesTable.receiptShareMessage,
        receiptSharePhoneDigits: expensesTable.receiptSharePhoneDigits,
        receiptShareStatus: expenseMonthsTable.receiptShareStatus,
        requiresReceiptShare: expensesTable.requiresReceiptShare,
        subtotal: expenseMonthsTable.subtotal,
      })
      .from(expenseMonthsTable)
      .innerJoin(
        expensesTable,
        and(
          eq(expenseMonthsTable.userSubject, expensesTable.userSubject),
          eq(expenseMonthsTable.expenseId, expensesTable.expenseId),
        ),
      )
      .where(
        and(
          eq(expenseMonthsTable.userSubject, this.userSubject),
          eq(expenseMonthsTable.month, month),
        ),
      )
      .orderBy(
        asc(expensesTable.createdAtIso),
        asc(expenseMonthsTable.expenseId),
      );

    if (rows.length === 0) {
      return null;
    }

    const normalizedRows = rows as NormalizedExpenseRow[];
    const expenseIds = normalizedRows.map((row) => row.expenseId);

    const receiptRows = expenseIds.length > 0
      ? await this.database
          .select({
            allReceiptsFolderId: expenseReceiptsTable.allReceiptsFolderId,
            allReceiptsFolderViewUrl: expenseReceiptsTable.allReceiptsFolderViewUrl,
            coveredPayments: expenseReceiptsTable.coveredPayments,
            expenseId: expenseReceiptsTable.expenseId,
            fileId: expenseReceiptsTable.fileId,
            fileName: expenseReceiptsTable.fileName,
            fileViewUrl: expenseReceiptsTable.fileViewUrl,
            monthlyFolderId: expenseReceiptsTable.monthlyFolderId,
            monthlyFolderViewUrl: expenseReceiptsTable.monthlyFolderViewUrl,
            registeredAtIso: expenseReceiptsTable.registeredAtIso,
          })
          .from(expenseReceiptsTable)
          .where(
            and(
              eq(expenseReceiptsTable.userSubject, this.userSubject),
              eq(expenseReceiptsTable.month, month),
              inArray(expenseReceiptsTable.expenseId, expenseIds),
            ),
          )
      : [];

    const paymentRecordRows = expenseIds.length > 0
      ? await this.database
          .select({
            coveredPayments: expensePaymentRecordsTable.coveredPayments,
            expenseId: expensePaymentRecordsTable.expenseId,
            paymentRecordId: expensePaymentRecordsTable.paymentRecordId,
            receiptFileId: expensePaymentRecordsTable.receiptFileId,
            registeredAtIso: expensePaymentRecordsTable.registeredAtIso,
          })
          .from(expensePaymentRecordsTable)
          .where(
            and(
              eq(expensePaymentRecordsTable.userSubject, this.userSubject),
              eq(expensePaymentRecordsTable.month, month),
              inArray(expensePaymentRecordsTable.expenseId, expenseIds),
            ),
          )
      : [];

    const receiptsByExpenseId = new Map<
      string,
      {
        allReceiptsFolderId: string;
        allReceiptsFolderViewUrl: string;
        coveredPayments: number;
        fileId: string;
        fileName: string;
        fileViewUrl: string;
        monthlyFolderId: string;
        monthlyFolderViewUrl: string;
        registeredAt?: string | null;
      }[]
    >();
    const receiptsByExpenseAndFileId = new Map<string, {
      allReceiptsFolderId: string;
      allReceiptsFolderViewUrl: string;
      coveredPayments: number;
      fileId: string;
      fileName: string;
      fileViewUrl: string;
      monthlyFolderId: string;
      monthlyFolderViewUrl: string;
      registeredAt?: string | null;
    }>();

    for (const receipt of receiptRows) {
      const receiptForDocument = {
        allReceiptsFolderId: receipt.allReceiptsFolderId,
        allReceiptsFolderViewUrl: receipt.allReceiptsFolderViewUrl,
        coveredPayments: receipt.coveredPayments,
        fileId: receipt.fileId,
        fileName: receipt.fileName,
        fileViewUrl: receipt.fileViewUrl,
        monthlyFolderId: receipt.monthlyFolderId,
        monthlyFolderViewUrl: receipt.monthlyFolderViewUrl,
        ...(receipt.registeredAtIso ? { registeredAt: receipt.registeredAtIso } : {}),
      };
      const existingReceipts = receiptsByExpenseId.get(receipt.expenseId) ?? [];
      existingReceipts.push(receiptForDocument);
      receiptsByExpenseId.set(receipt.expenseId, existingReceipts);
      receiptsByExpenseAndFileId.set(
        `${receipt.expenseId}:${receipt.fileId}`,
        receiptForDocument,
      );
    }

    const paymentRecordsByExpenseId = new Map<
      string,
      {
        coveredPayments: number;
        id: string;
        receipt?: {
          allReceiptsFolderId: string;
          allReceiptsFolderViewUrl: string;
          coveredPayments: number;
          fileId: string;
          fileName: string;
          fileViewUrl: string;
          monthlyFolderId: string;
          monthlyFolderViewUrl: string;
          registeredAt?: string | null;
        };
        registeredAt?: string | null;
      }[]
    >();

    for (const paymentRecord of paymentRecordRows) {
      const resolvedReceipt = paymentRecord.receiptFileId
        ? receiptsByExpenseAndFileId.get(
            `${paymentRecord.expenseId}:${paymentRecord.receiptFileId}`,
          )
        : undefined;
      const paymentRecordForDocument = {
        coveredPayments: paymentRecord.coveredPayments,
        id: paymentRecord.paymentRecordId,
        ...(resolvedReceipt ? { receipt: resolvedReceipt } : {}),
        ...(paymentRecord.registeredAtIso
          ? { registeredAt: paymentRecord.registeredAtIso }
          : {}),
      };
      const existingPaymentRecords =
        paymentRecordsByExpenseId.get(paymentRecord.expenseId) ?? [];
      existingPaymentRecords.push(paymentRecordForDocument);
      paymentRecordsByExpenseId.set(
        paymentRecord.expenseId,
        existingPaymentRecords,
      );
    }

    const firstRow = normalizedRows[0];

    return createMonthlyExpensesDocument(
      {
        ...(firstRow.exchangeRateMonth &&
        firstRow.exchangeRateBlueRate &&
        firstRow.exchangeRateOfficialRate &&
        firstRow.exchangeRateSolidarityRate
          ? {
              exchangeRateSnapshot: {
                blueRate: firstRow.exchangeRateBlueRate,
                month: firstRow.exchangeRateMonth,
                officialRate: firstRow.exchangeRateOfficialRate,
                solidarityRate: firstRow.exchangeRateSolidarityRate,
              },
            }
          : {}),
        items: normalizedRows.map((row) => ({
          currency: row.currency as "ARS" | "USD",
          description: row.description,
          ...(row.allReceiptsFolderId && row.allReceiptsFolderViewUrl
            ? {
                folders: {
                  allReceiptsFolderId: row.allReceiptsFolderId,
                  allReceiptsFolderViewUrl: row.allReceiptsFolderViewUrl,
                  monthlyFolderId: row.monthlyFolderId ?? "",
                  monthlyFolderViewUrl: row.monthlyFolderViewUrl ?? "",
                },
              }
            : {}),
          id: row.expenseId,
          ...(row.isPaid === 1 ? { isPaid: true } : {}),
          ...(row.loanInstallmentCount && row.loanStartMonth
            ? {
                loan: {
                  installmentCount: row.loanInstallmentCount,
                  ...(row.loanLenderId ? { lenderId: row.loanLenderId } : {}),
                  ...(row.loanLenderName ? { lenderName: row.loanLenderName } : {}),
                  startMonth: row.loanStartMonth,
                },
              }
            : {}),
          ...(row.manualCoveredPayments > 0
            ? { manualCoveredPayments: row.manualCoveredPayments }
            : {}),
          occurrencesPerMonth: row.occurrencesPerMonth,
          ...(paymentRecordsByExpenseId.has(row.expenseId)
            ? {
                paymentRecords:
                  paymentRecordsByExpenseId.get(row.expenseId),
              }
            : {}),
          ...(row.paymentLink ? { paymentLink: row.paymentLink } : {}),
          ...(row.receiptShareMessage
            ? { receiptShareMessage: row.receiptShareMessage }
            : {}),
          ...(row.receiptSharePhoneDigits
            ? { receiptSharePhoneDigits: row.receiptSharePhoneDigits }
            : {}),
          ...(row.receiptShareStatus
            ? {
                receiptShareStatus: row.receiptShareStatus as "pending" | "sent",
              }
            : {}),
          ...(row.requiresReceiptShare === 1 ? { requiresReceiptShare: true } : {}),
          ...(receiptsByExpenseId.has(row.expenseId)
            ? {
                receipts: receiptsByExpenseId.get(row.expenseId),
              }
            : {}),
          subtotal: row.subtotal,
        })),
        month,
      },
      "Loading monthly expenses from database",
    );
  }

  private async migrateLegacyMonth(
    month: string,
  ): Promise<MonthlyExpensesDocument | null> {
    const legacyDocument = await this.getLegacyDocumentByMonth(month);

    if (!legacyDocument) {
      return null;
    }

    if (hasDuplicatedExpenseIds(legacyDocument.items)) {
      return legacyDocument;
    }

    await this.saveNormalizedDocument(legacyDocument);

    return legacyDocument;
  }

  async getByMonth(month: string): Promise<MonthlyExpensesDocument | null> {
    const normalizedDocument = await this.getByMonthFromNormalized(month);

    if (normalizedDocument) {
      try {
        const legacyDocument = await this.getLegacyDocumentByMonth(month);

        if (legacyDocument && hasDuplicatedExpenseIds(legacyDocument.items)) {
          return legacyDocument;
        }
      } catch {
        return normalizedDocument;
      }

      return normalizedDocument;
    }

    return this.migrateLegacyMonth(month);
  }

  async getOldestStoredMonth(): Promise<string | null> {
    const normalizedRows = await this.database
      .select({
        month: expenseMonthsTable.month,
      })
      .from(expenseMonthsTable)
      .where(eq(expenseMonthsTable.userSubject, this.userSubject))
      .orderBy(asc(expenseMonthsTable.month))
      .limit(1);

    const legacyRows = await this.database
      .select({
        month: monthlyExpensesDocumentsTable.month,
      })
      .from(monthlyExpensesDocumentsTable)
      .where(eq(monthlyExpensesDocumentsTable.userSubject, this.userSubject))
      .orderBy(asc(monthlyExpensesDocumentsTable.month))
      .limit(1);

    const oldestMonth = [normalizedRows[0]?.month, legacyRows[0]?.month]
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => left.localeCompare(right))[0];

    return oldestMonth ?? null;
  }

  async save(
    document: MonthlyExpensesDocument,
  ): Promise<StoredMonthlyExpensesDocument> {
    const serializedDocument = mapMonthlyExpensesDocumentToGoogleDriveFile(document);
    const nowIso = new Date().toISOString();

    await this.database.transaction(async (transaction) => {
      await this.saveNormalizedDocumentWithExecutor(transaction, document);

      await transaction
        .insert(monthlyExpensesDocumentsTable)
        .values({
          month: document.month,
          payloadJson: serializedDocument.content,
          updatedAtIso: nowIso,
          userSubject: this.userSubject,
        })
        .onConflictDoUpdate({
          set: {
            payloadJson: serializedDocument.content,
            updatedAtIso: nowIso,
          },
          target: [
            monthlyExpensesDocumentsTable.userSubject,
            monthlyExpensesDocumentsTable.month,
          ],
        });
    });

    return {
      id: `${this.userSubject}:${document.month}`,
      month: document.month,
      name: serializedDocument.name,
      viewUrl: null,
    };
  }

  async listAll(): Promise<MonthlyExpensesDocument[]> {
    const normalizedMonthsRows = await this.database
      .select({
        month: expenseMonthsTable.month,
      })
      .from(expenseMonthsTable)
      .where(eq(expenseMonthsTable.userSubject, this.userSubject));

    const legacyMonthsRows = await this.database
      .select({
        month: monthlyExpensesDocumentsTable.month,
      })
      .from(monthlyExpensesDocumentsTable)
      .where(eq(monthlyExpensesDocumentsTable.userSubject, this.userSubject));

    const uniqueMonths = Array.from(
      new Set([
        ...normalizedMonthsRows.map((row) => row.month),
        ...legacyMonthsRows.map((row) => row.month),
      ]),
    ).sort((left, right) => left.localeCompare(right));

    const documents: MonthlyExpensesDocument[] = [];

    for (const month of uniqueMonths) {
      const document = await this.getByMonth(month);

      if (document) {
        documents.push(document);
      }
    }

    return documents;
  }

  async listMonthsWithExpenses(): Promise<string[]> {
    const normalizedMonthsRows = await this.database
      .select({
        month: expenseMonthsTable.month,
      })
      .from(expenseMonthsTable)
      .where(eq(expenseMonthsTable.userSubject, this.userSubject));

    const legacyMonthsRows = await this.database
      .select({
        month: monthlyExpensesDocumentsTable.month,
      })
      .from(monthlyExpensesDocumentsTable)
      .where(
        and(
          eq(monthlyExpensesDocumentsTable.userSubject, this.userSubject),
          sql`json_array_length(json_extract(${monthlyExpensesDocumentsTable.payloadJson}, '$.items')) > 0`,
        ),
      );

    return Array.from(
      new Set([
        ...normalizedMonthsRows.map((row) => row.month),
        ...legacyMonthsRows.map((row) => row.month),
      ]),
    );
  }

  createFileName(month: string): string {
    return createMonthlyExpensesFileName(month);
  }
}
