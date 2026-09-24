import { useRef, useState } from "react";
import type { ReactNode } from "react";
import clsx from "clsx";
import { useClickOutside } from "../../hooks/useClickOutside";

interface PopoverProps {
  trigger: (open: () => void, isOpen: boolean) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  width?: string;
}

/** A small anchored dropdown: a trigger element plus a panel that opens below it and closes on an outside click or Escape. Shared by the folder "⋮" menu and the method/environment dropdowns instead of each wiring up its own open state and click-outside listener. */
export function Popover({ trigger, children, align = "right", width = "min-w-[170px]" }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useClickOutside(ref, close, open);

  return (
    <div
      ref={ref}
      className="relative inline-block"
      onKeyDown={(e) => e.key === "Escape" && close()}
    >
      {trigger(() => setOpen((o) => !o), open)}
      {open && (
        <div
          role="menu"
          className={clsx(
            "absolute top-full z-20 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-panel dark:border-slate-700 dark:bg-surface-dark-elevated dark:shadow-panel-dark",
            width,
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}

interface MenuItemProps {
  icon?: ReactNode;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}

/** One row inside a Popover panel — a folder-menu action or a dropdown option. */
export function MenuItem({ icon, onClick, children, danger }: MenuItemProps) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={clsx(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors",
        danger
          ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
