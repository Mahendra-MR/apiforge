import { useEffect } from "react";
import type { RefObject } from "react";

/** Calls `onOutside` on any pointer-down outside every one of `refs`' elements — how popovers/menus close when the user clicks away. Takes several refs because a portaled menu panel isn't inside its trigger's DOM subtree. */
export function useClickOutside(refs: RefObject<HTMLElement | null>[], onOutside: () => void, active: boolean): void {
  useEffect(() => {
    if (!active) return;
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (refs.every((ref) => !ref.current?.contains(target))) onOutside();
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [refs, onOutside, active]);
}
