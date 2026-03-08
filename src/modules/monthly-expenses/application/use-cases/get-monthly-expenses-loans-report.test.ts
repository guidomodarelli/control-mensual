import type { MonthlyExpensesRepository } from "../../domain/repositories/monthly-expenses-repository";
import { getMonthlyExpensesLoansReport } from "./get-monthly-expenses-loans-report";

describe("getMonthlyExpensesLoansReport", () => {
  it("aggregates the latest loan snapshot by lender", async () => {
    const repository: MonthlyExpensesRepository = {
      getByMonth: jest.fn(),
      listAll: jest.fn().mockResolvedValue([
        {
          items: [
            {
              currency: "ARS",
              description: "Tarjeta visa",
              id: "expense-1",
              loan: {
                endMonth: "2026-12",
                installmentCount: 12,
                lenderId: "lender-1",
                lenderName: "Papa",
                paidInstallments: 2,
                startMonth: "2026-01",
              },
              occurrencesPerMonth: 1,
              subtotal: 50000,
              total: 50000,
            },
          ],
          month: "2026-02",
        },
        {
          items: [
            {
              currency: "ARS",
              description: "Tarjeta visa",
              id: "expense-2",
              loan: {
                endMonth: "2026-12",
                installmentCount: 12,
                lenderId: "lender-1",
                lenderName: "Papa",
                paidInstallments: 3,
                startMonth: "2026-01",
              },
              occurrencesPerMonth: 1,
              subtotal: 50000,
              total: 50000,
            },
          ],
          month: "2026-03",
        },
      ]),
      save: jest.fn(),
    };

    const result = await getMonthlyExpensesLoansReport({
      lenders: [
        {
          id: "lender-1",
          name: "Papa",
          type: "family",
        },
      ],
      repository,
    });

    expect(result).toEqual({
      entries: [
        {
          activeLoanCount: 1,
          expenseDescriptions: ["Tarjeta visa"],
          firstDebtMonth: "2026-01",
          lenderId: "lender-1",
          lenderName: "Papa",
          lenderType: "family",
          latestRecordedMonth: "2026-03",
          remainingAmount: 450000,
          trackedLoanCount: 1,
        },
      ],
      summary: {
        activeLoanCount: 1,
        lenderCount: 1,
        remainingAmount: 450000,
        trackedLoanCount: 1,
      },
    });
  });

  it("returns an empty report when the repository does not implement listAll", async () => {
    const result = await getMonthlyExpensesLoansReport({
      lenders: [],
      repository: {
        getByMonth: jest.fn(),
        save: jest.fn(),
      } as unknown as MonthlyExpensesRepository,
    });

    expect(result).toEqual({
      entries: [],
      summary: {
        activeLoanCount: 0,
        lenderCount: 0,
        remainingAmount: 0,
        trackedLoanCount: 0,
      },
    });
  });
});
