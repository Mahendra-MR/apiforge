import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { useClickOutside } from "../../hooks/useClickOutside";

interface PopoverProps {
  trigger: (toggle: () => void, isOpen: boolean) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  width?: string;
}

const GAP_PX = 4;
const VIEWPORT_MARGIN_PX = 8;

/**
 * A small anchored dropdown: a trigger plus a panel that closes on an outside
 * click or Escape. The panel is portaled to <body> with fixed positioning so
 * it's never clipped by a scrolling container (the Collections tree) and
 * flips above its trigger when there isn't room below.
 */
export function Popover({ trigger, children, align = "right", width = "min-w-[170px]" }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" });
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const refs = useMemo(() => [triggerRef, panelRef], []);
  const close = () => setOpen(false);
  useClickOutside(refs, close, open);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !panelRef.current) return;
    const anchor = triggerRef.current.getBoundingClientRect();
    const panel = panelRef.current.getBoundingClientRect();
    const fitsBelow = anchor.bottom + GAP_PX + panel.height <= window.innerHeight - VIEWPORT_MARGIN_PX;
    const top = fitsBelow ? anchor.bottom + GAP_PX : Math.max(VIEWPORT_MARGIN_PX, anchor.top - GAP_PX - panel.height);
    const preferredLeft = align === "right" ? anchor.right - panel.width : anchor.left;
    const left = Math.min(Math.max(VIEWPORT_MARGIN_PX, preferredLeft), window.innerWidth - panel.width - VIEWPORT_MARGIN_PX);
    setStyle({ top, left });
  }, [open, align]);

  function toggle() {
    setStyle({ visibility: "hidden" });
    setOpen((o) => !o);
  }

  return (
    <div ref={triggerRef} className="relative inline-flex" onKeyDown={(e) => e.key === "Escape" && close()}>
      {trigger(toggle, open)}
      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            style={style}
            onKeyDown={(e) => e.key === "Escape" && close()}
            className={clsx(
              "fixed z-50 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-panel dark:border-white/10 dark:bg-surface-dark-elevated dark:shadow-panel-dark",
              width,
            )}
          >
            {children(close)}
          </div>,
          document.body,
        )}
    </div>
  );
}

interface MenuItemProps {
  icon?: ReactNode;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  /** Short right-aligned hint, e.g. why an item is disabled. */
  hint?: string;
}

/** One row inside a Popover panel — a tree-menu action or a dropdown option. */
export function MenuItem({ icon, onClick, children, danger, disabled, hint }: MenuItemProps) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        danger
          ? "text-red-600 enabled:hover:bg-red-50 dark:text-red-400 dark:enabled:hover:bg-red-500/10"
          : "text-slate-700 enabled:hover:bg-slate-100 dark:text-slate-200 dark:enabled:hover:bg-white/[0.06]",
      )}
    >
      {icon && (
        <span className={clsx("flex w-4 shrink-0 justify-center", !danger && "text-slate-400 dark:text-slate-500")}>{icon}</span>
      )}
      <span className="flex-1 truncate">{children}</span>
      {hint && <span className="ml-3 shrink-0 text-[11px] text-slate-400 dark:text-slate-500">{hint}</span>}
    </button>
  );
}

/** A thin rule between groups of menu items, like Postman's context menus. */
export function MenuDivider() {
  return <div role="separator" className="my-1 h-px bg-slate-100 dark:bg-white/[0.06]" />;
}
