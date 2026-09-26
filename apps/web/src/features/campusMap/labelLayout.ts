export type LabelCandidate = {
  index: number;
  x: number;
  y: number;
  width: number;
  priority: number;
  distance: number;
};

/** Screen-space decluttering also caps the number of DOM transforms per frame. */
export function layoutCampusLabels(
  candidates: LabelCandidate[],
  viewport: { width: number; height: number },
  limit: number,
): LabelCandidate[] {
  const visible: LabelCandidate[] = [];
  const ordered = [...candidates].sort(
    (a, b) =>
      b.priority - a.priority || a.distance - b.distance || a.index - b.index,
  );
  for (const label of ordered) {
    if (visible.length >= limit) break;
    if (
      label.x < 0 ||
      label.x > viewport.width ||
      label.y < 48 ||
      label.y > viewport.height - 32
    )
      continue;
    if (
      visible.some(
        (other) =>
          Math.abs(label.x - other.x) < (label.width + other.width) / 2 + 8 &&
          Math.abs(label.y - other.y) < 32,
      )
    )
      continue;
    visible.push(label);
  }
  return visible;
}
