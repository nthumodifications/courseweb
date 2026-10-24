export const hasDeepLinkRequestChanged = <T>(
  lastApplied: T | null,
  request: T | undefined,
): boolean => lastApplied === null || lastApplied !== request;
