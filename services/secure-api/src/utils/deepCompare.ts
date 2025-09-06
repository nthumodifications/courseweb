export function deepCompare(
  a: any,
  b: any,
  maxDepth: number = 100,
  currentDepth: number = 0,
): boolean {
  // Prevent infinite recursion with depth check
  if (currentDepth > maxDepth) return false;

  // If both values are strictly equal or both are null/undefined
  if (a === b) return true;

  // If either is null/undefined but not both (we already checked for both above)
  if (a == null || b == null) return false;

  // If types don't match
  if (typeof a !== typeof b) return false;

  // Check if one is an array and the other isn't
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  // Handle non-object types that aren't caught by strict equality above
  if (typeof a !== "object") return false;

  // Special case for Date objects
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Special case for Array objects
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepCompare(a[i], b[i], maxDepth, currentDepth + 1)) return false;
    }
    return true;
  }

  // Handle regular objects
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  return keysA.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(b, key) &&
      deepCompare(a[key], b[key], maxDepth, currentDepth + 1),
  );
}
