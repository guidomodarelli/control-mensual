import { X } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupInput,
  InputGroupPrefix,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import {
  LenderPicker,
  type LenderOption,
} from "./lender-picker";
import { LoanInfoPopover } from "./loan-info-popover";
import type { MonthlyExpensesEditableRow } from "./monthly-expenses-table";
import styles from "./expense-sheet.module.scss";

export type ExpenseEditableFieldName =
  | "currency"
  | "description"
  | "installmentCount"
  | "occurrencesPerMonth"
  | "startMonth"
  | "subtotal";

interface ExpenseSheetProps {
  actionDisabled: boolean;
  changedFields: Set<string>;
  draft: MonthlyExpensesEditableRow | null;
  isOpen: boolean;
  isSubmitting: boolean;
  lenders: LenderOption[];
  mode: "create" | "edit";
  onFieldChange: (fieldName: ExpenseEditableFieldName, value: string) => void;
  onLenderSelect: (lenderId: string | null) => void;
  onLoanToggle: (checked: boolean) => void;
  onRequestClose: () => void;
  onSave: () => void;
  onUnsavedChangesDiscard: () => void;
  onUnsavedChangesSave: () => void;
  showUnsavedChangesDialog: boolean;
  validationMessage: string | null;
}

type ExpenseFieldErrorMap = Partial<Record<ExpenseEditableFieldName, string>>;

function getFieldLabel(label: string, isChanged: boolean) {
  return (
    <span className={styles.fieldLabelRow}>
      <span
        className={cn(
          styles.fieldLabelText,
          isChanged && styles.changedFieldLabel,
        )}
      >
        {label}
      </span>
    </span>
  );
}

function normalizeCurrencyInput(value: string): string {
  const sanitizedValue = value.replace(/[^\d,.-]/g, "");

  if (!sanitizedValue) {
    return "";
  }

  const hasCommaDecimalSeparator = sanitizedValue.includes(",");

  if (!hasCommaDecimalSeparator) {
    return sanitizedValue.replace(/[^\d-]/g, "");
  }

  const decimalSeparatorIndex = sanitizedValue.lastIndexOf(",");
  const integerPart = sanitizedValue.slice(0, decimalSeparatorIndex);
  const decimalPart = sanitizedValue.slice(decimalSeparatorIndex + 1);
  const normalizedIntegerPart = integerPart.replace(/[^\d-]/g, "");
  const normalizedDecimalPart = decimalPart.replace(/[^\d]/g, "").slice(0, 2);

  if (normalizedDecimalPart.length === 0) {
    return `${normalizedIntegerPart}.`;
  }

  return `${normalizedIntegerPart}.${normalizedDecimalPart}`;
}

function formatCurrencyDisplay(value: string): string {
  const normalizedValue = /^-?\d+\.(\d{1,2})?$/.test(value)
    ? value
    : normalizeCurrencyInput(value);

  if (!normalizedValue) {
    return "";
  }

  const numericValue = Number(normalizedValue);

  if (!Number.isFinite(numericValue)) {
    return "";
  }

  if (normalizedValue.endsWith(".")) {
    return `${new Intl.NumberFormat("es-AR", {
      maximumFractionDigits: 0,
    }).format(numericValue)},`;
  }

  const [, decimalPart = ""] = normalizedValue.split(".");
  const normalizedDecimalPart = decimalPart.slice(0, 2);
  const minimumFractionDigits =
    normalizedDecimalPart.length === 0 || /^0+$/.test(normalizedDecimalPart)
      ? 0
      : normalizedDecimalPart.length;

  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: Math.max(minimumFractionDigits, 0),
    minimumFractionDigits,
  }).format(numericValue);
}

function getFieldErrors(draft: MonthlyExpensesEditableRow): ExpenseFieldErrorMap {
  const fieldErrors: ExpenseFieldErrorMap = {};
  const subtotal = Number(draft.subtotal);
  const occurrencesPerMonth = Number(draft.occurrencesPerMonth);
  const installmentCount = Number(draft.installmentCount);

  if (!draft.description.trim()) {
    fieldErrors.description = "Completá la descripción.";
  }

  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    fieldErrors.subtotal = "Ingresá un subtotal mayor a 0.";
  }

  if (!Number.isInteger(occurrencesPerMonth) || occurrencesPerMonth <= 0) {
    fieldErrors.occurrencesPerMonth = "Ingresá una cantidad mayor a 0.";
  }

  if (draft.isLoan && !draft.startMonth.trim()) {
    fieldErrors.startMonth = "Completá la fecha de inicio.";
  }

  if (draft.isLoan && (!Number.isInteger(installmentCount) || installmentCount <= 0)) {
    fieldErrors.installmentCount = "Completá la cantidad total de cuotas.";
  }

  return fieldErrors;
}

export function ExpenseSheet({
  actionDisabled,
  changedFields,
  draft,
  isOpen,
  isSubmitting,
  lenders,
  mode,
  onFieldChange,
  onLenderSelect,
  onLoanToggle,
  onRequestClose,
  onSave,
  onUnsavedChangesDiscard,
  onUnsavedChangesSave,
  showUnsavedChangesDialog,
  validationMessage,
}: ExpenseSheetProps) {
  if (!draft) {
    return null;
  }

  const title = mode === "create" ? "Nuevo gasto" : "Editar gasto";
  const description =
    mode === "create"
      ? "Completá el formulario y guardá para persistir el gasto en Drive."
      : "Editá el gasto y guardá cuando quieras persistir los cambios en Drive.";
  const loanHelpMessage =
    "Marcá el check si este gasto representa una deuda con una persona o entidad.";
  const hasPendingChanges = changedFields.size > 0;
  const currencyPrefix = draft.currency === "USD" ? "US$" : "$";
  const fieldErrors = getFieldErrors(draft);
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const shouldShowGlobalValidation =
    Boolean(validationMessage) && !hasFieldErrors;

  return (
    <>
      <Sheet
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            onRequestClose();
          }
        }}
        open={isOpen}
      >
        <SheetContent
          className={styles.content}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            onRequestClose();
          }}
          onInteractOutside={(event) => {
            event.preventDefault();
            onRequestClose();
          }}
          showCloseButton={false}
          side="right"
        >
          <SheetHeader className={styles.header}>
            <div className={styles.headerTopRow}>
              <div>
                <SheetTitle>{title}</SheetTitle>
                <SheetDescription>{description}</SheetDescription>
              </div>
              <Button
                aria-label="Cerrar formulario de gasto"
                className={styles.closeButton}
                onClick={onRequestClose}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          </SheetHeader>

          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              onSave();
            }}
          >
            {shouldShowGlobalValidation ? (
              <p className={cn(styles.feedback, styles.errorText)} role="alert">
                {validationMessage}
              </p>
            ) : null}

            <div className={cn(styles.grid, styles.topGrid)}>
              <div className={cn(styles.fieldGroup, styles.fullWidthField)}>
                <Label htmlFor="expense-description">
                  {getFieldLabel("Descripción", changedFields.has("description"))}
                </Label>
                <div className={styles.fieldControlWrapper}>
                  <Input
                    aria-label="Descripción"
                    aria-invalid={Boolean(fieldErrors.description)}
                    className={cn(
                      fieldErrors.description && styles.invalidField,
                      changedFields.has("description") && styles.changedField,
                    )}
                    data-changed={changedFields.has("description") ? "true" : "false"}
                    id="expense-description"
                    onChange={(event) =>
                      onFieldChange("description", event.target.value)
                    }
                    placeholder="Ej. agua, expensas, alquiler"
                    type="text"
                    value={draft.description}
                  />
                  {fieldErrors.description ? (
                    <p className={styles.fieldErrorText} role="alert">
                      {fieldErrors.description}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <Label htmlFor="expense-currency">
                  {getFieldLabel("Moneda", changedFields.has("currency"))}
                </Label>
                <div className={styles.fieldControlWrapper}>
                  <Select
                    onValueChange={(value) => onFieldChange("currency", value)}
                    value={draft.currency}
                  >
                    <SelectTrigger
                      aria-label="Moneda"
                      className={cn(changedFields.has("currency") && styles.changedField)}
                      data-changed={changedFields.has("currency") ? "true" : "false"}
                      id="expense-currency"
                    >
                      <SelectValue placeholder="Moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">ARS</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className={cn(styles.grid, styles.amountGrid)}>
              <div className={styles.fieldGroup}>
                <Label htmlFor="expense-subtotal">
                  {getFieldLabel("Subtotal", changedFields.has("subtotal"))}
                </Label>
                <div className={styles.fieldControlWrapper}>
                  <InputGroup
                    className={cn(
                      fieldErrors.subtotal && styles.invalidField,
                      changedFields.has("subtotal") && styles.changedField,
                    )}
                    data-changed={changedFields.has("subtotal") ? "true" : "false"}
                  >
                    <InputGroupPrefix aria-hidden="true">
                      {currencyPrefix}
                    </InputGroupPrefix>
                    <InputGroupInput
                      aria-label="Subtotal"
                      aria-invalid={Boolean(fieldErrors.subtotal)}
                      data-changed={changedFields.has("subtotal") ? "true" : "false"}
                      id="expense-subtotal"
                      inputMode="decimal"
                      onChange={(event) =>
                        onFieldChange(
                          "subtotal",
                          normalizeCurrencyInput(event.target.value),
                        )
                      }
                      type="text"
                      value={formatCurrencyDisplay(draft.subtotal)}
                    />
                  </InputGroup>
                  {fieldErrors.subtotal ? (
                    <p className={styles.fieldErrorText} role="alert">
                      {fieldErrors.subtotal}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <Label htmlFor="expense-occurrences">
                  {getFieldLabel(
                    "Cantidad de veces por mes",
                    changedFields.has("occurrencesPerMonth"),
                  )}
                </Label>
                <div className={styles.fieldControlWrapper}>
                  <Input
                    aria-label="Cantidad de veces por mes"
                    aria-invalid={Boolean(fieldErrors.occurrencesPerMonth)}
                    className={cn(
                      fieldErrors.occurrencesPerMonth && styles.invalidField,
                      changedFields.has("occurrencesPerMonth") && styles.changedField,
                    )}
                    data-changed={
                      changedFields.has("occurrencesPerMonth") ? "true" : "false"
                    }
                    id="expense-occurrences"
                    inputMode="numeric"
                    min="0"
                    onChange={(event) =>
                      onFieldChange("occurrencesPerMonth", event.target.value)
                    }
                    step="1"
                    type="number"
                    value={draft.occurrencesPerMonth}
                  />
                  {fieldErrors.occurrencesPerMonth ? (
                    <p className={styles.fieldErrorText} role="alert">
                      {fieldErrors.occurrencesPerMonth}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <Label htmlFor="expense-total">Total</Label>
                <InputGroup>
                  <InputGroupPrefix aria-hidden="true">
                    {currencyPrefix}
                  </InputGroupPrefix>
                  <InputGroupInput
                    aria-label="Total"
                    id="expense-total"
                    readOnly
                    type="text"
                    value={formatCurrencyDisplay(draft.total)}
                  />
                </InputGroup>
              </div>
            </div>

            <div className={styles.loanSection}>
              <div className={styles.loanToggleRow}>
                <div className={styles.fieldControlWrapper}>
                  <input
                    checked={draft.isLoan}
                    className={styles.loanToggle}
                    id="expense-is-loan"
                    onChange={(event) => onLoanToggle(event.target.checked)}
                    type="checkbox"
                  />
                </div>
                <div className={styles.loanToggleLabelGroup}>
                  <Label htmlFor="expense-is-loan">
                    {getFieldLabel("Es deuda/préstamo", changedFields.has("isLoan"))}
                  </Label>
                  <LoanInfoPopover message={loanHelpMessage} usePortal={false} />
                </div>
              </div>

              {draft.isLoan ? (
                <>
                  <div className={styles.fieldGroup}>
                    <Label>
                      {getFieldLabel("Prestador (opcional)", changedFields.has("lender"))}
                    </Label>
                    <div className={styles.fieldControlWrapper}>
                      <LenderPicker
                        onSelect={onLenderSelect}
                        options={lenders}
                        selectedLenderId={draft.lenderId}
                        selectedLenderName={draft.lenderName}
                      />
                    </div>
                  </div>

                  <div className={styles.loanFieldsGrid}>
                    <div className={styles.fieldGroup}>
                      <Label htmlFor="expense-start-month">
                        {getFieldLabel(
                          "Inicio de la deuda",
                          changedFields.has("startMonth"),
                        )}
                      </Label>
                      <div className={styles.fieldControlWrapper}>
                        <Input
                          aria-label="Inicio de la deuda"
                          aria-invalid={Boolean(fieldErrors.startMonth)}
                          className={cn(
                            fieldErrors.startMonth && styles.invalidField,
                            changedFields.has("startMonth") && styles.changedField,
                          )}
                          data-changed={
                            changedFields.has("startMonth") ? "true" : "false"
                          }
                          id="expense-start-month"
                          onChange={(event) =>
                            onFieldChange("startMonth", event.target.value)
                          }
                          type="month"
                          value={draft.startMonth}
                        />
                        {fieldErrors.startMonth ? (
                          <p className={styles.fieldErrorText} role="alert">
                            {fieldErrors.startMonth}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className={styles.fieldGroup}>
                      <Label htmlFor="expense-installment-count">
                        {getFieldLabel(
                          "Cantidad total de cuotas",
                          changedFields.has("installmentCount"),
                        )}
                      </Label>
                      <div className={styles.fieldControlWrapper}>
                        <Input
                          aria-label="Cantidad total de cuotas"
                          aria-invalid={Boolean(fieldErrors.installmentCount)}
                          className={cn(
                            fieldErrors.installmentCount && styles.invalidField,
                            changedFields.has("installmentCount") &&
                              styles.changedField,
                          )}
                          data-changed={
                            changedFields.has("installmentCount") ? "true" : "false"
                          }
                          id="expense-installment-count"
                          inputMode="numeric"
                          min="1"
                          onChange={(event) =>
                            onFieldChange("installmentCount", event.target.value)
                          }
                          step="1"
                          type="number"
                          value={draft.installmentCount}
                        />
                        {fieldErrors.installmentCount ? (
                          <p className={styles.fieldErrorText} role="alert">
                            {fieldErrors.installmentCount}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className={styles.fieldGroup}>
                      <Label htmlFor="expense-loan-end-month">Fin de la deuda</Label>
                      <Input
                        aria-label="Fin de la deuda"
                        id="expense-loan-end-month"
                        readOnly
                        type="month"
                        value={draft.loanEndMonth}
                      />
                    </div>
                  </div>

                  <p className={styles.loanStatus} role="status">
                    {draft.loanProgress ||
                      "Completá inicio y cuotas para ver el avance."}
                  </p>
                </>
              ) : null}
            </div>
          </form>

          <SheetFooter className={styles.footer}>
            {hasPendingChanges ? (
              <p className={styles.changesLegend} role="status">
                Los labels amarillos subrayados indican cambios sin guardar.
              </p>
            ) : null}
            <div className={styles.footerActions}>
              <Button onClick={onRequestClose} type="button" variant="outline">
                Cancelar
              </Button>
              <Button
                disabled={actionDisabled || Boolean(validationMessage)}
                onClick={onSave}
                type="button"
              >
                {isSubmitting ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showUnsavedChangesDialog}>
        <AlertDialogContent className={styles.unsavedChangesContent}>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>
              Tenés cambios sin guardar en este gasto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={styles.unsavedChangesFooter}>
            <AlertDialogCancel
              className={styles.unsavedChangesButton}
              onClick={onUnsavedChangesDiscard}
            >
              Descartar los cambios
            </AlertDialogCancel>
            <AlertDialogAction
              className={styles.unsavedChangesButton}
              onClick={onUnsavedChangesSave}
            >
              Guardar los cambios
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
