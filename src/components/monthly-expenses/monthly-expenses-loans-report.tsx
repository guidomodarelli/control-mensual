import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import styles from "./monthly-expenses-loans-report.module.scss";

type TechnicalErrorCode = `E${number}${number}${number}${number}`;

const arsCurrencyFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

interface MonthlyExpensesLoanReportView {
  activeLoanCount: number;
  direction: "payable" | "receivable";
  expenseDescriptions: string[];
  firstDebtMonth: string | null;
  lenderId: string | null;
  lenderName: string;
  lenderType: "bank" | "family" | "friend" | "other" | "unassigned";
  latestRecordedMonth: string | null;
  remainingAmount: number;
  trackedLoanCount: number;
}

interface MonthlyExpensesLoansReportProps {
  entries: MonthlyExpensesLoanReportView[];
  feedbackMessage: string | null;
  feedbackErrorCode?: TechnicalErrorCode | null;
  providerFilterOptions: Array<{
    id: string;
    label: string;
  }>;
  selectedLenderFilter: string;
  selectedDirectionFilter: string;
  selectedTypeFilter: string;
  summary: {
    activeLoanCount: number;
    lenderCount: number;
    netRemainingAmount: number;
    payableRemainingAmount: number;
    receivableRemainingAmount: number;
    remainingAmount: number;
    trackedLoanCount: number;
  };
  onLenderFilterChange: (value: string) => void;
  onDirectionFilterChange: (value: string) => void;
  onResetFilters: () => void;
  onTypeFilterChange: (value: string) => void;
}

function getTypeLabel(type: MonthlyExpensesLoanReportView["lenderType"]): string {
  switch (type) {
    case "bank":
      return "Banco";
    case "family":
      return "Familiar";
    case "friend":
      return "Amigo";
    case "other":
      return "Otro";
    case "unassigned":
      return "Sin prestamista";
  }
}

function formatArsAmount(value: number): string {
  if (!Number.isFinite(value)) {
    return "$ 0";
  }

  return `$ ${arsCurrencyFormatter.format(value)}`;
}

function getDirectionLabel(direction: MonthlyExpensesLoanReportView["direction"]): string {
  return direction === "payable" ? "Yo debo" : "Me deben";
}

export function MonthlyExpensesLoansReport({
  entries,
  feedbackMessage,
  feedbackErrorCode = null,
  providerFilterOptions,
  selectedLenderFilter,
  selectedDirectionFilter,
  selectedTypeFilter,
  summary,
  onDirectionFilterChange,
  onLenderFilterChange,
  onResetFilters,
  onTypeFilterChange,
}: MonthlyExpensesLoansReportProps) {
  return (
    <section className={styles.content}>
      <p className={styles.description}>
        Revisá cuánto debés, cuánto te deben y qué compromisos están asociados.
      </p>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Prestamistas con deuda</p>
          <p className={styles.summaryValue}>{summary.lenderCount}</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Deudas activas</p>
          <p className={styles.summaryValue}>{summary.activeLoanCount}</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Monto pendiente estimado</p>
          <p className={styles.summaryValue}>{formatArsAmount(summary.remainingAmount)}</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Total que debés</p>
          <p className={styles.summaryValue}>
            {formatArsAmount(summary.payableRemainingAmount)}
          </p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Total que te deben</p>
          <p className={styles.summaryValue}>
            {formatArsAmount(summary.receivableRemainingAmount)}
          </p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Balance neto</p>
          <p className={styles.summaryValue}>{formatArsAmount(summary.netRemainingAmount)}</p>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterField}>
          <Label htmlFor="loan-report-direction-filter">Dirección</Label>
          <Select
            onValueChange={onDirectionFilterChange}
            value={selectedDirectionFilter}
          >
            <SelectTrigger
              aria-label="Filtrar por dirección"
              id="loan-report-direction-filter"
            >
              <SelectValue placeholder="Todas las direcciones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las direcciones</SelectItem>
              <SelectItem value="payable">Yo debo</SelectItem>
              <SelectItem value="receivable">Me deben</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className={styles.filterField}>
          <Label htmlFor="loan-report-type-filter">Tipo</Label>
          <Select onValueChange={onTypeFilterChange} value={selectedTypeFilter}>
            <SelectTrigger
              aria-label="Filtrar por tipo"
              id="loan-report-type-filter"
            >
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="bank">Bancos</SelectItem>
              <SelectItem value="family">Familiares</SelectItem>
              <SelectItem value="friend">Amigos</SelectItem>
              <SelectItem value="other">Otros</SelectItem>
              <SelectItem value="unassigned">Sin prestamista</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className={styles.filterField}>
          <Label htmlFor="loan-report-lender-filter">Prestamista</Label>
          <Select
            onValueChange={onLenderFilterChange}
            value={selectedLenderFilter}
          >
            <SelectTrigger
              aria-label="Filtrar por prestamista"
              id="loan-report-lender-filter"
            >
              <SelectValue placeholder="Todos los prestamistas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los prestamistas</SelectItem>
              {providerFilterOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          className={styles.resetButton}
          onClick={onResetFilters}
          type="button"
          variant="outline"
        >
          Limpiar filtros
        </Button>
      </div>

      {feedbackMessage ? (
        <p className={styles.feedback}>
          <span>{feedbackMessage}</span>
          {feedbackErrorCode ? (
            <span className={styles.feedbackErrorCode}>{`Code: ${feedbackErrorCode}`}</span>
          ) : null}
        </p>
      ) : null}

      <div className={styles.entries}>
        {entries.length > 0 ? (
          entries.map((entry) => (
            <article
              className={styles.entry}
              key={`${entry.lenderId ?? entry.lenderName}-${entry.lenderType}`}
            >
              <div className={styles.entryHeader}>
                <div>
                  <h3 className={styles.entryTitle}>{entry.lenderName}</h3>
                  <p className={styles.entryMeta}>
                    {getDirectionLabel(entry.direction)} · {getTypeLabel(entry.lenderType)}
                  </p>
                </div>
                <p className={styles.entryAmount}>{formatArsAmount(entry.remainingAmount)}</p>
              </div>
              <div className={styles.entryTimeline}>
                <div className={styles.entryTimelineItem}>
                  <p className={styles.entryTimelineLabel}>Inicio más antiguo</p>
                  <p className={styles.entryTimelineValue}>
                    {entry.firstDebtMonth ?? "Sin dato"}
                  </p>
                </div>
                <div className={styles.entryTimelineItem}>
                  <p className={styles.entryTimelineLabel}>Último mes registrado</p>
                  <p className={styles.entryTimelineValue}>
                    {entry.latestRecordedMonth ?? "Sin dato"}
                  </p>
                </div>
              </div>
              <div className={styles.entryTimeline}>
                <div className={styles.entryTimelineItem}>
                  <p className={styles.entryTimelineLabel}>Deudas activas</p>
                  <p className={styles.entryTimelineValue}>{entry.activeLoanCount}</p>
                </div>
                <div className={styles.entryTimelineItem}>
                  <p className={styles.entryTimelineLabel}>Deudas registradas</p>
                  <p className={styles.entryTimelineValue}>{entry.trackedLoanCount}</p>
                </div>
              </div>
              <div className={styles.entryExpenses}>
                <p className={styles.entryExpensesLabel}>Compromisos asociados</p>
                <div className={styles.entryExpenseBadges}>
                  {entry.expenseDescriptions.length > 0 ? (
                    entry.expenseDescriptions.map((description, index) => (
                      <span className={styles.entryExpenseBadge} key={`${description}-${index}`}>
                        {description}
                      </span>
                    ))
                  ) : (
                    <span className={styles.entryExpenseEmpty}>Sin compromisos asociados</span>
                  )}
                </div>
              </div>
            </article>
          ))
        ) : feedbackMessage ? null : (
          <p className={styles.feedback}>
            No hay deudas para los filtros seleccionados.
          </p>
        )}
      </div>
    </section>
  );
}
