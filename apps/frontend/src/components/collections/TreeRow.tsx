import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import clsx from "clsx";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { Popover } from "../common/Popover";

const INDENT_PX = 14;
const BASE_PADDING_PX = 6;

/** Left padding for a row at `depth`; shared with the tree's indentation guide lines so they line up. */
export function indentFor(depth: number): number {
  return depth * INDENT_PX + BASE_PADDING_PX;
}

interface TreeRowProps {
  depth: number;
  label: string;
  /** Visual before the label — a folder icon, a method badge, an example tag. */
  leading: ReactNode;
  /** Omit for leaf rows with nothing to expand (keeps the chevron slot so labels still align). */
  expanded?: boolean;
  onToggle?: () => void;
  onOpen?: () => void;
  active?: boolean;
  renaming: boolean;
  onRename: (name: string) => void;
  onCancelRename: () => void;
  /** Contents of the row's "⋯" menu. */
  menu: (close: () => void) => ReactNode;
  menuLabel: string;
  labelClassName?: string;
}

/**
 * One row of the Collections tree (folder, request or example). Renders the
 * name as plain text — not an always-editable input — and swaps in an inline
 * rename field only while renaming, Postman-style. Actions live in a "⋯"
 * menu revealed on hover or keyboard focus.
 */
export function TreeRow({
  depth,
  label,
  leading,
  expanded,
  onToggle,
  onOpen,
  active,
  renaming,
  onRename,
  onCancelRename,
  menu,
  menuLabel,
  labelClassName,
}: TreeRowProps) {
  const expandable = expanded !== undefined && onToggle !== undefined;

  return (
    <div
      className={clsx(
        "group relative flex h-[30px] items-center gap-1 rounded-md pr-1 text-[13px] transition-colors",
        active
          ? "bg-slate-200/70 text-slate-900 dark:bg-white/[0.08] dark:text-white"
          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.04]",
      )}
      style={{ paddingLeft: indentFor(depth) }}
    >
      <button
        type="button"
        tabIndex={expandable ? 0 : -1}
        onClick={onToggle}
        disabled={!expandable}
        aria-label={expandable ? `${expanded ? "Collapse" : "Expand"} ${label}` : undefined}
        aria-hidden={!expandable}
        className="flex h-5 w-4 shrink-0 items-center justify-center rounded text-slate-400 hover:text-slate-600 disabled:pointer-events-none dark:text-slate-500 dark:hover:text-slate-300"
      >
        {expandable && <ChevronRight size={13} className={clsx("transition-transform duration-150", expanded && "rotate-90")} />}
      </button>

      {renaming ? (
        <>
          <span className="flex shrink-0 items-center">{leading}</span>
          <RenameInput initial={label} onCommit={onRename} onCancel={onCancelRename} />
        </>
      ) : (
        <button
          type="button"
          onClick={onOpen ?? onToggle}
          title={label}
          className="flex h-full min-w-0 flex-1 items-center gap-2 text-left focus:outline-none"
        >
          <span className="flex shrink-0 items-center">{leading}</span>
          <span className={clsx("truncate", active && "font-medium", labelClassName)}>{label}</span>
        </button>
      )}

      {!renaming && (
        <Popover
          align="right"
          width="min-w-[190px]"
          trigger={(toggle, isOpen) => (
            <button
              type="button"
              onClick={toggle}
              aria-label={menuLabel}
              title="More actions"
              className={clsx(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-800 focus:opacity-100 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white",
                isOpen ? "bg-slate-200 opacity-100 dark:bg-white/10" : "opacity-0 group-hover:opacity-100",
              )}
            >
              <MoreHorizontal size={15} />
            </button>
          )}
        >
          {menu}
        </Popover>
      )}
    </div>
  );
}

interface RenameInputProps {
  initial: string;
  placeholder?: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}

/** Inline name field: Enter or blur commits (a blank or unchanged name just cancels), Escape cancels. */
export function RenameInput({ initial, placeholder, onCommit, onCancel }: RenameInputProps) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  const settled = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  function commit() {
    if (settled.current) return;
    settled.current = true;
    const name = value.trim();
    if (name === "" || name === initial) onCancel();
    else onCommit(name);
  }

  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          settled.current = true;
          onCancel();
        }
      }}
      aria-label={placeholder ?? "Name"}
      placeholder={placeholder}
      className="h-6 min-w-0 flex-1 rounded border border-brand-500 bg-white px-1.5 text-[13px] text-slate-900 outline-none ring-2 ring-brand-500/20 dark:bg-surface-dark dark:text-white"
    />
  );
}
