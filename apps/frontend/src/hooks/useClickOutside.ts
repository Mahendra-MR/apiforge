import { useEffect } from "react";
import type { RefObject } from "react";

/** Calls `onOutside` on any pointer-down outside `ref`'s element — the standard way to close a popover/menu/dropdown when the user clicks away. Shared by every custom dropdown (method, environment) and the folder "⋮" menu instead of each re-implementing its own listener. */
export function useClickOutside(ref: RefObject<HTMLElement | null>, onOutside: () => void, active: boolean): void {
  useEffect(() => {
    if (!active) return;
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [ref, onOutside, active]);
}
