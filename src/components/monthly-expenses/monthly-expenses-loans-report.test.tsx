import { render, screen } from "@testing-library/react";

import { MonthlyExpensesLoansReport } from "./monthly-expenses-loans-report";

describe("MonthlyExpensesLoansReport", () => {
  it("renders summary and entry amounts using ARS money format", () => {
    render(
      <MonthlyExpensesLoansReport
        entries={[
          {
            activeLoanCount: 2,
            direction: "receivable",
            expenseDescriptions: ["Tarjeta", "Seguro"],
            firstDebtMonth: "2025-12",
            latestRecordedMonth: "2026-03",
            lenderId: "lender-1",
            lenderName: "Banco Ciudad",
            lenderType: "bank",
            remainingAmount: 120500.75,
            trackedLoanCount: 2,
          },
        ]}
        feedbackMessage={null}
        onLenderFilterChange={jest.fn()}
        onDirectionFilterChange={jest.fn()}
        onResetFilters={jest.fn()}
        onTypeFilterChange={jest.fn()}
        providerFilterOptions={[]}
        selectedDirectionFilter="all"
        selectedLenderFilter="all"
        selectedTypeFilter="all"
        summary={{
          activeLoanCount: 2,
          lenderCount: 1,
          netRemainingAmount: -120500.75,
          payableRemainingAmount: 0,
          receivableRemainingAmount: 120500.75,
          remainingAmount: 660000,
          trackedLoanCount: 2,
        }}
      />,
    );

    expect(screen.getByText("$ 660.000")).toBeInTheDocument();
    expect(screen.getAllByText("$ 120.500,75")).toHaveLength(2);
    expect(screen.getByText("Me deben · Banco")).toBeInTheDocument();
  });
});
