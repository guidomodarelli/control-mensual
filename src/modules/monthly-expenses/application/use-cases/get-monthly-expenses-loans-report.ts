import type { LenderType } from "@/modules/lenders/domain/value-objects/lenders-catalog-document";

import type { MonthlyExpensesRepository } from "../../domain/repositories/monthly-expenses-repository";
import type { MonthlyExpensesDocument } from "../../domain/value-objects/monthly-expenses-document";
import type {
  MonthlyExpensesLoanReportEntry,
  MonthlyExpensesLoanReportLenderType,
  MonthlyExpensesLoansReportResult,
} from "../results/monthly-expenses-loans-report-result";

interface ReportLenderInput {
  id: string;
  name: string;
  type: LenderType;
}

interface GetMonthlyExpensesLoansReportDependencies {
  lenders: ReportLenderInput[];
  repository: MonthlyExpensesRepository;
}

interface LoanSnapshot {
  description: string;
  lenderId: string | null;
  lenderName: string | null;
  monthlyAmount: number;
  month: string;
  paidInstallments: number;
  startMonth: string;
  totalInstallments: number;
}

function getLoanSnapshotKey(snapshot: LoanSnapshot): string {
  return [
    snapshot.lenderId ?? snapshot.lenderName ?? "unassigned",
    snapshot.description.toLocaleLowerCase(),
    snapshot.startMonth,
    snapshot.totalInstallments,
    snapshot.monthlyAmount,
  ].join("|");
}

function resolveLender(
  snapshot: LoanSnapshot,
  lenders: ReportLenderInput[],
): {
  lenderId: string | null;
  lenderName: string;
  lenderType: MonthlyExpensesLoanReportLenderType;
} {
  const lenderById = snapshot.lenderId
    ? lenders.find((lender) => lender.id === snapshot.lenderId)
    : null;

  if (lenderById) {
    return {
      lenderId: lenderById.id,
      lenderName: lenderById.name,
      lenderType: lenderById.type,
    };
  }

  const lenderByName = snapshot.lenderName
    ? lenders.find(
        (lender) =>
          lender.name.toLocaleLowerCase() ===
          snapshot.lenderName?.toLocaleLowerCase(),
      )
    : null;

  if (lenderByName) {
    return {
      lenderId: lenderByName.id,
      lenderName: lenderByName.name,
      lenderType: lenderByName.type,
    };
  }

  if (snapshot.lenderName) {
    return {
      lenderId: null,
      lenderName: snapshot.lenderName,
      lenderType: "other",
    };
  }

  return {
    lenderId: null,
    lenderName: "Sin prestador",
    lenderType: "unassigned",
  };
}

function compareMonthIdentifiers(left: string, right: string): number {
  return left.localeCompare(right);
}

function createLoanSnapshots(documents: MonthlyExpensesDocument[]): LoanSnapshot[] {
  return documents.flatMap((document) =>
    document.items.flatMap((item) =>
      item.loan
        ? [
            {
              description: item.description,
              lenderId: item.loan.lenderId ?? null,
              lenderName: item.loan.lenderName ?? null,
              month: document.month,
              monthlyAmount: item.total,
              paidInstallments: item.loan.paidInstallments,
              startMonth: item.loan.startMonth,
              totalInstallments: item.loan.installmentCount,
            },
          ]
        : [],
    ),
  );
}

export async function getMonthlyExpensesLoansReport({
  lenders,
  repository,
}: GetMonthlyExpensesLoansReportDependencies): Promise<MonthlyExpensesLoansReportResult> {
  const documents =
    typeof (repository as Partial<MonthlyExpensesRepository>).listAll === "function"
      ? await repository.listAll()
      : [];
  const latestSnapshotsByLoan = new Map<string, LoanSnapshot>();

  for (const snapshot of createLoanSnapshots(documents)) {
    const snapshotKey = getLoanSnapshotKey(snapshot);
    const currentSnapshot = latestSnapshotsByLoan.get(snapshotKey);

    if (
      !currentSnapshot ||
      compareMonthIdentifiers(snapshot.month, currentSnapshot.month) > 0
    ) {
      latestSnapshotsByLoan.set(snapshotKey, snapshot);
    }
  }

  const entriesByLender = new Map<string, MonthlyExpensesLoanReportEntry>();

  for (const snapshot of latestSnapshotsByLoan.values()) {
    const { lenderId, lenderName, lenderType } = resolveLender(snapshot, lenders);
    const entryKey = `${lenderId ?? lenderName}|${lenderType}`;
    const remainingInstallments = Math.max(
      snapshot.totalInstallments - snapshot.paidInstallments,
      0,
    );
    const remainingAmount = Number(
      (snapshot.monthlyAmount * remainingInstallments).toFixed(2),
    );
    const currentEntry = entriesByLender.get(entryKey);

    if (!currentEntry) {
      entriesByLender.set(entryKey, {
        activeLoanCount: remainingAmount > 0 ? 1 : 0,
        expenseDescriptions: [snapshot.description],
        firstDebtMonth: snapshot.startMonth,
        lenderId,
        lenderName,
        lenderType,
        latestRecordedMonth: snapshot.month,
        remainingAmount,
        trackedLoanCount: 1,
      });
      continue;
    }

    currentEntry.activeLoanCount += remainingAmount > 0 ? 1 : 0;
    currentEntry.expenseDescriptions = Array.from(
      new Set([...currentEntry.expenseDescriptions, snapshot.description]),
    ).sort((left, right) => left.localeCompare(right, "es"));
    currentEntry.firstDebtMonth =
      currentEntry.firstDebtMonth &&
      compareMonthIdentifiers(currentEntry.firstDebtMonth, snapshot.startMonth) <= 0
        ? currentEntry.firstDebtMonth
        : snapshot.startMonth;
    currentEntry.latestRecordedMonth =
      currentEntry.latestRecordedMonth &&
      compareMonthIdentifiers(currentEntry.latestRecordedMonth, snapshot.month) >= 0
        ? currentEntry.latestRecordedMonth
        : snapshot.month;
    currentEntry.remainingAmount = Number(
      (currentEntry.remainingAmount + remainingAmount).toFixed(2),
    );
    currentEntry.trackedLoanCount += 1;
  }

  const entries = [...entriesByLender.values()].sort((left, right) => {
    if (right.remainingAmount !== left.remainingAmount) {
      return right.remainingAmount - left.remainingAmount;
    }

    return left.lenderName.localeCompare(right.lenderName, "es");
  });

  return {
    entries,
    summary: {
      activeLoanCount: entries.reduce(
        (total, entry) => total + entry.activeLoanCount,
        0,
      ),
      lenderCount: entries.length,
      remainingAmount: Number(
        entries
          .reduce((total, entry) => total + entry.remainingAmount, 0)
          .toFixed(2),
      ),
      trackedLoanCount: entries.reduce(
        (total, entry) => total + entry.trackedLoanCount,
        0,
      ),
    },
  };
}
