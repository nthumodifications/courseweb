export type LatLon = [number, number];

function perpendicularDistance(point: LatLon, start: LatLon, end: LatLon) {
  const [py, px] = point;
  const [sy, sx] = start;
  const [ey, ex] = end;
  const dx = ex - sx;
  const dy = ey - sy;
  if (dx === 0 && dy === 0) return Math.hypot(px - sx, py - sy);
  const t = ((px - sx) * dx + (py - sy) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (sx + clamped * dx), py - (sy + clamped * dy));
}

function douglasPeucker(points: LatLon[], epsilon: number): LatLon[] {
  if (points.length < 3) return points;
  let index = 0;
  let max = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = perpendicularDistance(
      points[i],
      points[0],
      points[points.length - 1],
    );
    if (distance > max) {
      max = distance;
      index = i;
    }
  }
  if (max <= epsilon) return [points[0], points[points.length - 1]];
  return [
    ...douglasPeucker(points.slice(0, index + 1), epsilon).slice(0, -1),
    ...douglasPeucker(points.slice(index), epsilon),
  ];
}

/** Drops repeated points, thins the line to about 3 m, and keeps 5 decimals. */
export function simplifyLine(points: LatLon[], epsilonDegrees = 0.00003) {
  const deduped = points.filter(
    (point, i) =>
      i === 0 || point[0] !== points[i - 1][0] || point[1] !== points[i - 1][1],
  );
  return douglasPeucker(deduped, epsilonDegrees).map(
    ([lat, lon]) => [Number(lat.toFixed(5)), Number(lon.toFixed(5))] as LatLon,
  );
}
