export interface SearchParamsLike {
  get(name: string): string | null;
  getAll?: (name: string) => string[];
}

export function getSearchParamValues(
  params: SearchParamsLike,
  name: string,
): string[] {
  return params.getAll
    ? params.getAll(name)
    : [params.get(name)].filter((value): value is string => value !== null);
}

/** A repeated parameter is ambiguous and is ignored instead of taking a value. */
export function getSingleSearchParam(
  params: SearchParamsLike,
  name: string,
): string | null {
  const values = getSearchParamValues(params, name);
  return values.length === 1 ? values[0] : null;
}
