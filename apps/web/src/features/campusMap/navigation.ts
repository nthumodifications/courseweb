import { resolveVenueToCampusIdentity } from "@courseweb/shared";

export function getCampusMapHref(
  lang: string | undefined,
  venues: readonly string[] | null | undefined,
): string | undefined {
  const identity = venues
    ?.map((venue) => resolveVenueToCampusIdentity(venue))
    .find((candidate) => candidate !== undefined);

  if (!identity) return undefined;

  const language = lang === "en" ? "en" : "zh";
  const searchParams = new URLSearchParams({ building: identity.id });
  return `/${language}/map?${searchParams.toString()}`;
}
