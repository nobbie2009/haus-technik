import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ReactNode, RefObject } from "react";
import { X } from "lucide-react";

function outsideDialog(dialog: HTMLDialogElement, x: number, y: number): boolean {
  const r = dialog.getBoundingClientRect();
  return x < r.left || x > r.right || y < r.top || y > r.bottom;
}

export function Modal({
  title,
  onClose,
  children,
  className = "",
  initialFocusRef,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const startedOnBackdrop = useRef(false);
  useLayoutEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    initialFocusRef?.current?.focus();
    return () => dialog.close();
  }, [initialFocusRef]);
  return createPortal(
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onPointerDownCapture={(event) => {
        startedOnBackdrop.current =
          event.isPrimary &&
          event.button === 0 &&
          event.target === event.currentTarget &&
          outsideDialog(event.currentTarget, event.clientX, event.clientY);
      }}
      onPointerCancelCapture={() => {
        startedOnBackdrop.current = false;
      }}
      onClick={(event) => {
        const startedOutside = startedOnBackdrop.current;
        startedOnBackdrop.current = false;
        // Textauswahl darf über den Dialogrand hinausgezogen werden.
        if (
          startedOutside &&
          event.target === event.currentTarget &&
          outsideDialog(event.currentTarget, event.clientX, event.clientY)
        )
          onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button type="button" className="subtle" onClick={onClose} aria-label="Dialog schließen">
          <X size={19} />
        </button>
      </div>
      {children}
    </dialog>,
    document.body,
  );
}
