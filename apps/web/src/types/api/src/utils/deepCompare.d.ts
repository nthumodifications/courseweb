export declare function deepCompare(
  a: any,
  b: any,
  maxDepth?: number,
  currentDepth?: number,
): boolean;
/**
 * Recursively removes null values from an object
 * Treats { prop: null } and {} as equivalent
 */
export declare function stripNullValues<T extends object>(obj: T): Partial<T>;
