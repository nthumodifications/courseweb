export function toQueryParams(params: { [key: string]: any }): string {
  const definedParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  );
  return new URLSearchParams(definedParams).toString();
}
