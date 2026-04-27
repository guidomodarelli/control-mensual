import { useMemo } from "react";

import { ConfirmDeleteButton } from "@/components/monthly-expenses/confirm-delete-button";
import type { LenderOption } from "@/components/monthly-expenses/lender-picker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import styles from "./lenders-panel.module.scss";

type TechnicalErrorCode = `E${number}${number}${number}${number}`;

interface LendersPanelProps {
  feedbackMessage: string | null;
  feedbackErrorCode?: TechnicalErrorCode | null;
  feedbackTone: "default" | "error" | "success";
  isCreateModalOpen: boolean;
  lenders: LenderOption[];
  onDelete: (lenderId: string) => void;
  onOpenCreateModal: () => void;
}

function getLenderTypeLabel(type: LenderOption["type"]): string {
  switch (type) {
    case "bank":
      return "Banco";
    case "family":
      return "Familiar";
    case "friend":
      return "Amigo";
    case "other":
      return "Otro";
  }
}

export function LendersPanel({
  feedbackMessage,
  feedbackErrorCode = null,
  feedbackTone,
  isCreateModalOpen,
  lenders,
  onDelete,
  onOpenCreateModal,
}: LendersPanelProps) {
  const shouldRenderPanelFeedback = useMemo(
    () => !isCreateModalOpen || (feedbackTone !== "error" && feedbackTone !== "success"),
    [feedbackTone, isCreateModalOpen],
  );

  return (
    <section className={styles.content}>
      <p className={styles.description}>
        Guardá prestamistas para reutilizarlos en tus deudas.
      </p>

      <div className={styles.formActions}>
        <Button onClick={onOpenCreateModal} type="button" variant="outline">
          Agregar prestamista
        </Button>
      </div>

      {feedbackMessage && shouldRenderPanelFeedback ? (
        <p
          className={cn(
            styles.feedback,
            feedbackTone === "error" && styles.errorText,
            feedbackTone === "success" && styles.successText,
          )}
          role={feedbackTone === "error" ? "alert" : "status"}
        >
          <span>{feedbackMessage}</span>
          {feedbackTone === "error" && feedbackErrorCode ? (
            <span className={styles.feedbackErrorCode}>{`Code: ${feedbackErrorCode}`}</span>
          ) : null}
        </p>
      ) : null}

      <div className={styles.list}>
        {lenders.length > 0 ? (
          lenders.map((lender) => {
            const lenderNotes = lender.notes?.trim();

            return (
              <div className={styles.listItem} key={lender.id}>
                <div className={styles.listCopy}>
                  <p className={styles.listTitle}>{lender.name}</p>
                  <p className={styles.listMeta}>
                    {getLenderTypeLabel(lender.type)}
                  </p>
                  {lenderNotes ? (
                    <p className={styles.listNotes}>{lenderNotes}</p>
                  ) : null}
                </div>
                <ConfirmDeleteButton
                  message={`¿Querés eliminar a ${lender.name} del catálogo?`}
                  menuAriaLabel={`Abrir acciones para ${lender.name}`}
                  onConfirm={() => onDelete(lender.id)}
                />
              </div>
            );
          })
        ) : (
          <p className={styles.emptyState}>
            Todavía no hay prestamistas guardados.
          </p>
        )}
      </div>
    </section>
  );
}
