import type { KeyboardEvent } from "react";

/**
 * Keyboard handler for elements that act as buttons: runs `action` on Enter
 * or Space, the keys a native button responds to. Keys pressed on a nested
 * control (a real button or switch inside the row) are left to that control.
 */
export const activateOnKey =
  <E extends Element>(action: (event: KeyboardEvent<E>) => void) =>
  (event: KeyboardEvent<E>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    action(event);
  };
