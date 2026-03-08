import { MoreVertical, Pencil, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import styles from "./expense-row-actions.module.scss";

interface ExpenseRowActionsProps {
  actionDisabled: boolean;
  description: string;
  onDelete: () => void;
  onEdit: () => void;
}

export function ExpenseRowActions({
  actionDisabled,
  description,
  onDelete,
  onEdit,
}: ExpenseRowActionsProps) {
  const normalizedDescription = description.trim() || "este gasto";

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Abrir acciones para ${normalizedDescription}`}
            className={styles.trigger}
            disabled={actionDisabled}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <MoreVertical aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>
            <span className={styles.menuItem}>
              <Pencil aria-hidden="true" />
              Editar
            </span>
          </DropdownMenuItem>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
              }}
              variant="destructive"
            >
              <span className={styles.menuItem}>
                <Trash2 aria-hidden="true" />
                Eliminar
              </span>
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Querés eliminar este gasto?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción guarda el cambio inmediatamente en tu archivo mensual.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete} variant="destructive">
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
