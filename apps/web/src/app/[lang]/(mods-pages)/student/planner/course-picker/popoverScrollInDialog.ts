import type { SyntheticEvent } from "react";

/**
 * Lets a filter popover's list scroll while it is open inside a Dialog or
 * Drawer (#1049).
 *
 * `PopoverContent` renders through a Portal into `<body>`, so it is outside
 * the Dialog's DOM. While a Radix Dialog (or a vaul Drawer, which is built on
 * it) is open, react-remove-scroll listens for `wheel` and `touchmove` on
 * `document` and calls `preventDefault()` on any that start outside the
 * dialog content. The portaled list counts as outside, so it cannot scroll.
 *
 * React also listens on the portal container (`<body>`), so stopping
 * propagation here ends the native event at `<body>`, before it reaches the
 * `document` listener. The app has no other `document`/`window` wheel or
 * touchmove listeners, so outside a dialog this has no visible effect.
 */
const stopPropagation = (event: SyntheticEvent) => event.stopPropagation();

export const popoverScrollInDialogProps = {
  onWheel: stopPropagation,
  onTouchMove: stopPropagation,
} as const;
