import { useEffect, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * While `active`: moves focus into `ref` (the first control, or the container), keeps Tab inside it when `trap` is on,
 * and returns focus to whatever had it before when it closes.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, trap = true) {
  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return;
    const opener = document.activeElement as HTMLElement | null;
    const items = () => [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    // Skip the full-screen backdrop button (first in the dialog) so focus lands on a real control.
    (items().find((el) => !el.classList.contains("inset-0")) ?? root).focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (!trap || e.key !== "Tab") return;
      const list = items().filter((el) => !el.classList.contains("inset-0"));
      if (!list.length) { e.preventDefault(); return; }
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); opener?.isConnected && opener.focus({ preventScroll: true }); };
  }, [ref, active, trap]);
}
