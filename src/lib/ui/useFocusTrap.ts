import { useEffect, useRef } from "react";

interface FocusTrapOptions {
  isOpen: boolean;
  onClose: () => void;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Custom hook for strict accessible dialog / drawer focus trapping:
 * 1. Moves focus into the dialog on open.
 * 2. Traps focus within focusable elements inside the dialog (Tab / Shift+Tab wrapping).
 * 3. Closes on Escape key press.
 * 4. Returns focus to the triggering element upon close.
 */
export function useFocusTrap({ isOpen, onClose, initialFocusRef }: FocusTrapOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // 1. Remember the element that was focused before opening
    triggerRef.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    if (!container) return;

    const focusableSelectors = [
      "a[href]",
      "button:not([disabled])",
      "textarea:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ].join(", ");

    const getFocusableElements = (): HTMLElement[] => {
      if (!container) return [];
      return Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelectors)
      ).filter((el) => el.offsetParent !== null || el.getAttribute("role") === "dialog");
    };

    // 2. Move focus into the dialog
    const focusables = getFocusableElements();
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
    } else if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      container.setAttribute("tabindex", "-1");
      container.focus();
    }

    // 3. Contain keyboard focus & handle Escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab") {
        const currentFocusables = getFocusableElements();
        if (currentFocusables.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = currentFocusables[0];
        const lastElement = currentFocusables[currentFocusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !container.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement || !container.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // 4. Return focus to the triggering control upon close
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (triggerRef.current && typeof triggerRef.current.focus === "function") {
        requestAnimationFrame(() => {
          triggerRef.current?.focus();
        });
      }
    };
  }, [isOpen, onClose, initialFocusRef]);

  return containerRef;
}
