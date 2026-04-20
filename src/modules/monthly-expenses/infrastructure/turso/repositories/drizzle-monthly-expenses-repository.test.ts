import {
  createEmptyMonthlyExpensesDocument,
  createMonthlyExpensesDocument,
} from "@/modules/monthly-expenses/domain/value-objects/monthly-expenses-document";
import {
  expensesTable,
  monthlyExpensesDocumentsTable,
} from "@/modules/shared/infrastructure/database/drizzle/schema";

import { DrizzleMonthlyExpensesRepository } from "./drizzle-monthly-expenses-repository";

describe("DrizzleMonthlyExpensesRepository", () => {
  it("persists normalized and legacy documents in a single transaction", async () => {
    const selectWhereMock = jest.fn().mockResolvedValue([]);
    const selectFromMock = jest.fn().mockReturnValue({
      where: selectWhereMock,
    });
    const selectMock = jest.fn().mockReturnValue({
      from: selectFromMock,
    });
    const deleteWhereMock = jest.fn().mockResolvedValue(undefined);
    const deleteMock = jest.fn().mockReturnValue({
      where: deleteWhereMock,
    });
    const transactionExecutor = {
      delete: deleteMock,
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
        }),
      }),
      select: selectMock,
    };
    const transactionMock = jest
      .fn()
      .mockImplementation(async (callback: (tx: unknown) => Promise<void>) =>
        callback(transactionExecutor),
      );
    const database = {
      transaction: transactionMock,
    };
    const repository = new DrizzleMonthlyExpensesRepository(
      database as never,
      "user-subject",
    );
    const document = createEmptyMonthlyExpensesDocument("2026-04");

    await repository.save(document);

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(selectMock).toHaveBeenCalledTimes(1);
    expect(transactionExecutor.insert).toHaveBeenCalledWith(
      monthlyExpensesDocumentsTable,
    );
    expect(transactionExecutor.insert).toHaveBeenCalledTimes(1);
  });

  it("stores incremental createdAt timestamps without overwriting conflicts", async () => {
    const insertedExpenseRows: { createdAtIso: string; expenseId: string }[] = [];
    const updatedExpenseRows: { expenseId: string; updatedFields: string[] }[] = [];
    const selectWhereMock = jest.fn().mockResolvedValue([]);
    const selectFromMock = jest.fn().mockReturnValue({
      where: selectWhereMock,
    });
    const selectMock = jest.fn().mockReturnValue({
      from: selectFromMock,
    });
    const deleteWhereMock = jest.fn().mockResolvedValue(undefined);
    const deleteMock = jest.fn().mockReturnValue({
      where: deleteWhereMock,
    });
    const insertMock = jest.fn((table: unknown) => ({
      values: jest.fn((payload: unknown) => {
        const isExpenseInsert =
          table === expensesTable &&
          payload &&
          typeof payload === "object" &&
          "createdAtIso" in payload &&
          "expenseId" in payload;

        if (
          isExpenseInsert
        ) {
          insertedExpenseRows.push(
            payload as { createdAtIso: string; expenseId: string },
          );
        }

        return {
          onConflictDoUpdate: jest.fn((conflictPayload: unknown) => {
            if (
              isExpenseInsert &&
              conflictPayload &&
              typeof conflictPayload === "object" &&
              "set" in conflictPayload &&
              conflictPayload.set &&
              typeof conflictPayload.set === "object"
            ) {
              updatedExpenseRows.push({
                expenseId: String((payload as { expenseId: string }).expenseId),
                updatedFields: Object.keys(
                  conflictPayload.set as Record<string, unknown>,
                ),
              });
            }

            return Promise.resolve(undefined);
          }),
        };
      }),
    }));
    const transactionExecutor = {
      delete: deleteMock,
      insert: insertMock,
      select: selectMock,
    };
    const transactionMock = jest
      .fn()
      .mockImplementation(async (callback: (tx: unknown) => Promise<void>) =>
        callback(transactionExecutor),
      );
    const database = {
      transaction: transactionMock,
    };
    const repository = new DrizzleMonthlyExpensesRepository(
      database as never,
      "user-subject",
    );
    const document = createMonthlyExpensesDocument(
      {
        items: [
          {
            currency: "ARS",
            description: "Expense Z",
            id: "z-id",
            occurrencesPerMonth: 1,
            subtotal: 10,
          },
          {
            currency: "ARS",
            description: "Expense A",
            id: "a-id",
            occurrencesPerMonth: 1,
            subtotal: 20,
          },
        ],
        month: "2026-04",
      },
      "Testing createdAt persistence order",
    );

    await repository.save(document);

    expect(insertedExpenseRows).toHaveLength(2);
    expect(insertedExpenseRows[0].expenseId).toBe("z-id");
    expect(insertedExpenseRows[1].expenseId).toBe("a-id");
    expect(insertedExpenseRows[0].createdAtIso).not.toBe(
      insertedExpenseRows[1].createdAtIso,
    );
    expect(insertedExpenseRows[0].createdAtIso < insertedExpenseRows[1].createdAtIso)
      .toBe(true);
    expect(updatedExpenseRows).toHaveLength(2);
    expect(updatedExpenseRows[0].expenseId).toBe("z-id");
    expect(updatedExpenseRows[1].expenseId).toBe("a-id");
    expect(updatedExpenseRows[0].updatedFields).not.toContain("createdAtIso");
    expect(updatedExpenseRows[1].updatedFields).not.toContain("createdAtIso");
  });

  it("orders normalized reads by created timestamp and expense id", async () => {
    const orderByMock = jest.fn().mockResolvedValue([]);
    const whereMock = jest.fn().mockReturnValue({
      orderBy: orderByMock,
    });
    const innerJoinMock = jest.fn().mockReturnValue({
      where: whereMock,
    });
    const fromMock = jest.fn().mockReturnValue({
      innerJoin: innerJoinMock,
    });
    const selectMock = jest.fn().mockReturnValue({
      from: fromMock,
    });
    const database = {
      select: selectMock,
    };
    const repository = new DrizzleMonthlyExpensesRepository(
      database as never,
      "user-subject",
    );

    await (repository as {
      getByMonthFromNormalized: (month: string) => Promise<unknown>;
    }).getByMonthFromNormalized("2026-04");

    expect(orderByMock).toHaveBeenCalledTimes(1);
    expect(orderByMock.mock.calls[0]).toHaveLength(2);
  });

  it("skips normalized persistence when document has duplicated expense ids", async () => {
    const selectWhereMock = jest.fn().mockResolvedValue([]);
    const selectFromMock = jest.fn().mockReturnValue({
      where: selectWhereMock,
    });
    const selectMock = jest.fn().mockReturnValue({
      from: selectFromMock,
    });
    const deleteWhereMock = jest.fn().mockResolvedValue(undefined);
    const deleteMock = jest.fn().mockReturnValue({
      where: deleteWhereMock,
    });
    const insertMock = jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
      }),
    });
    const transactionExecutor = {
      delete: deleteMock,
      insert: insertMock,
      select: selectMock,
    };
    const transactionMock = jest
      .fn()
      .mockImplementation(async (callback: (tx: unknown) => Promise<void>) =>
        callback(transactionExecutor),
      );
    const repository = new DrizzleMonthlyExpensesRepository(
      {
        transaction: transactionMock,
      } as never,
      "user-subject",
    );
    const duplicatedIdsDocument = createMonthlyExpensesDocument(
      {
        items: [
          {
            currency: "ARS",
            description: "Expense A",
            id: "duplicated-id",
            occurrencesPerMonth: 1,
            subtotal: 100,
          },
          {
            currency: "ARS",
            description: "Expense B",
            id: "duplicated-id",
            occurrencesPerMonth: 2,
            subtotal: 200,
          },
        ],
        month: "2026-04",
      },
      "Testing duplicated expense ids persistence",
    );

    await repository.save(duplicatedIdsDocument);

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledWith(monthlyExpensesDocumentsTable);
  });

  it("returns legacy document when normalized month exists but legacy has duplicated ids", async () => {
    const repository = new DrizzleMonthlyExpensesRepository(
      {} as never,
      "user-subject",
    );
    const normalizedDocument = createMonthlyExpensesDocument(
      {
        items: [
          {
            currency: "ARS",
            description: "Single normalized item",
            id: "duplicated-id",
            occurrencesPerMonth: 1,
            subtotal: 100,
          },
        ],
        month: "2026-04",
      },
      "Testing normalized result",
    );
    const legacyDocumentWithDuplicates = createMonthlyExpensesDocument(
      {
        items: [
          {
            currency: "ARS",
            description: "Legacy expense A",
            id: "duplicated-id",
            occurrencesPerMonth: 1,
            subtotal: 100,
          },
          {
            currency: "ARS",
            description: "Legacy expense B",
            id: "duplicated-id",
            occurrencesPerMonth: 2,
            subtotal: 200,
          },
        ],
        month: "2026-04",
      },
      "Testing duplicated expense ids fallback",
    );
    jest
      .spyOn(repository as never, "getByMonthFromNormalized")
      .mockResolvedValue(normalizedDocument);
    jest
      .spyOn(repository as never, "getLegacyDocumentByMonth")
      .mockResolvedValue(legacyDocumentWithDuplicates);

    const result = await repository.getByMonth("2026-04");

    expect(result).toEqual(legacyDocumentWithDuplicates);
  });
});
