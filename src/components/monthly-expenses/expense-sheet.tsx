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
            {validationMessage ? (
              <p className={cn(styles.feedback, styles.errorText)} role="alert">
                {validationMessage}
              </p>
            ) : null}

            <div className={cn(styles.grid, styles.topGrid)}>
              <div className={styles.fieldGroup}>
                <Label htmlFor="expense-description">
                  {getFieldLabel("Descripción", changedFields.has("description"))}
                </Label>
                <div className={styles.fieldControlWrapper}>
                  <Input
                    aria-label="Descripción"
                    className={cn(
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
                  <Input
                    aria-label="Subtotal"
                    className={cn(changedFields.has("subtotal") && styles.changedField)}
                    data-changed={changedFields.has("subtotal") ? "true" : "false"}
                    id="expense-subtotal"
                    inputMode="decimal"
                    min="0"
                    onChange={(event) =>
                      onFieldChange("subtotal", event.target.value)
                    }
                    step="0.01"
                    type="number"
                    value={draft.subtotal}
                  />
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
                    className={cn(
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
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <Label htmlFor="expense-total">Total</Label>
                <Input
                  aria-label="Total"
                  id="expense-total"
                  readOnly
                  type="text"
                  value={draft.total}
                />
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
                          className={cn(
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
                          className={cn(
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
