import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

type ModalSize = "md" | "lg";

const SIZE_CLASSES: Record<ModalSize, string> = {
  md: "max-w-lg",
  lg: "max-w-2xl",
};

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
}

/** A simple centered dialog, portaled to document.body so it always sits above the app's panel layout. Closes on Escape or a backdrop click. */
export function Modal({ open, title, onClose, children, footer, size = "md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[80vh] w-full ${SIZE_CLASSES[size]} flex-col rounded-lg bg-white shadow-xl dark:bg-surface-dark-subtle`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-4">{children}</div>
        {footer && <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
