import {
  LAUNDRY_AREAS,
  LAUNDRY_DORMS,
  type LaundryArea,
  type LaundryDorm,
} from "@/const/laundry-machines";
import {
  getSearchParamValues,
  getSingleSearchParam,
  type SearchParamsLike,
} from "@/lib/search-params";

export interface LaundryDeepLinkState {
  dorm: LaundryDorm | "";
  area: LaundryArea | null;
}

export function getLaundryDormFromValue(
  value: string | null | undefined,
): LaundryDorm | null {
  if (!value) return null;
  if (Object.hasOwn(LAUNDRY_DORMS, value)) return value as LaundryDorm;
  return (
    (Object.keys(LAUNDRY_DORMS) as LaundryDorm[]).find(
      (dorm) => LAUNDRY_DORMS[dorm].slug === value,
    ) ?? null
  );
}

function areaFromValue(value: string | null): LaundryArea | null {
  if (!value) return null;
  if (Object.hasOwn(LAUNDRY_AREAS, value)) return value as LaundryArea;
  return (
    (Object.keys(LAUNDRY_AREAS) as LaundryArea[]).find(
      (area) => LAUNDRY_AREAS[area].slug === value,
    ) ?? null
  );
}

export function getLaundryDormFromSearchParams(
  params: SearchParamsLike,
): LaundryDorm | null {
  const requestedDorm = getLaundryDormFromValue(
    getSingleSearchParam(params, "dorm"),
  );
  if (requestedDorm) return requestedDorm;

  const requestedArea = areaFromValue(getSingleSearchParam(params, "area"));
  return requestedArea ? LAUNDRY_AREAS[requestedArea].dorm : null;
}

export function getLaundryDeepLinkKey(params: SearchParamsLike): string {
  return JSON.stringify([
    getSearchParamValues(params, "dorm"),
    getSearchParamValues(params, "area"),
  ]);
}

export function shouldPersistLaundryDorm(
  resolvedDorm: LaundryDorm | "",
  urlDorm: LaundryDorm | null,
  storedDorm: LaundryDorm | "",
): boolean {
  return Boolean(urlDorm && resolvedDorm && resolvedDorm !== storedDorm);
}

export function resolveLaundryDeepLink(
  params: SearchParamsLike,
  storedDorm: string | null | undefined,
): LaundryDeepLinkState {
  const requestedDorm = getLaundryDormFromValue(
    getSingleSearchParam(params, "dorm"),
  );
  const requestedArea = areaFromValue(getSingleSearchParam(params, "area"));
  const stored = getLaundryDormFromValue(storedDorm);
  const dorm =
    requestedDorm ??
    (requestedArea ? LAUNDRY_AREAS[requestedArea].dorm : null) ??
    stored ??
    "";

  return {
    dorm,
    area:
      requestedArea && LAUNDRY_AREAS[requestedArea].dorm === dorm
        ? requestedArea
        : null,
  };
}
