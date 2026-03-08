import { useEffect, useRef, useState } from "react";
import { Info, X } from "lucide-react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import styles from "./loan-info-popover.module.scss";

interface LoanInfoPopoverProps {
  message: string;
  usePortal?: boolean;
}

export function LoanInfoPopover({
  message,
  usePortal = true,
}: LoanInfoPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const updatePopoverPosition = () => {
    if (!triggerRef.current || typeof window === "undefined") {
      return;
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 320;
    const popoverHeight = 132;
    const viewportPadding = 16;
    const fitsBelow =
      triggerRect.bottom + 8 + popoverHeight <= window.innerHeight - viewportPadding;
    const left = Math.min(
      Math.max(triggerRect.left, viewportPadding),
      window.innerWidth - popoverWidth - viewportPadding,
    );
    const top = fitsBelow
      ? triggerRect.bottom + 8
      : Math.max(triggerRect.top - popoverHeight - 8, viewportPadding);

    setPopoverStyle({
      left,
      top,
    });
  };

  useEffect(() => {
    if (!isOpen || !triggerRef.current || typeof window === "undefined") {
      return;
    }

    updatePopoverPosition();
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);

    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") {
      return;
    }

    const handleDocumentMouseDown = (event: MouseEvent) => {
      const eventTarget = event.target;

      if (!(eventTarget instanceof Node)) {
        return;
      }

      if (triggerRef.current?.contains(eventTarget)) {
        return;
      }

      if (popoverRef.current?.contains(eventTarget)) {
        return;
      }

      setIsOpen(false);
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);

    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  }, [isOpen]);

  return (
    <>
      <Button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Más información sobre deuda o préstamo"
        className={styles.trigger}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
            return;
          }

          updatePopoverPosition();
          setIsOpen(true);
        }}
        ref={triggerRef}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <Info aria-hidden="true" className={styles.triggerIcon} />
      </Button>

      {isOpen && !usePortal ? (
        <div
          aria-label="Ayuda sobre deuda o préstamo"
          className={cn(styles.popover, styles.inlinePopover)}
          ref={popoverRef}
          role="dialog"
        >
          <Button
            aria-label="Cerrar ayuda sobre deuda o préstamo"
            className={styles.closeButton}
            onClick={() => setIsOpen(false)}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <X aria-hidden="true" className={styles.closeIcon} />
          </Button>
          <p className={styles.message}>{message}</p>
        </div>
      ) : isOpen && popoverStyle && typeof document !== "undefined"
        ? createPortal(
            <div className={styles.portalLayer}>
              <div
                aria-label="Ayuda sobre deuda o préstamo"
                className={styles.popover}
                ref={popoverRef}
                role="dialog"
                style={popoverStyle}
              >
                <Button
                  aria-label="Cerrar ayuda sobre deuda o préstamo"
                  className={styles.closeButton}
                  onClick={() => setIsOpen(false)}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                >
                  <X aria-hidden="true" className={styles.closeIcon} />
                </Button>
                <p className={styles.message}>{message}</p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
