import type { StoredMonthlyExpensesDocument } from "../entities/stored-monthly-expenses-document";
import type { MonthlyExpensesDocument } from "../value-objects/monthly-expenses-document";

export interface MonthlyExpensesRepository {
  getByMonth(month: string): Promise<MonthlyExpensesDocument | null>;
  listAll(): Promise<MonthlyExpensesDocument[]>;
  save(
    document: MonthlyExpensesDocument,
  ): Promise<StoredMonthlyExpensesDocument>;
}
