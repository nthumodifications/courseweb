import type { ClassPageMember } from "@/lib/class-pages";

export const filterAndSortClassmates = (
  members: readonly ClassPageMember[],
  options: {
    query?: string;
    partnersOnly?: boolean;
    department?: string;
    hiddenName: string;
  },
) => {
  const query = options.query?.trim().toLocaleLowerCase() ?? "";
  return members
    .filter((member) => !options.partnersOnly || member.lookingForPartners)
    .filter(
      (member) =>
        !options.department || member.department === options.department,
    )
    .filter((member) => {
      if (!query) return true;
      return [member.displayName, member.department, member.year]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLocaleLowerCase().includes(query));
    })
    .sort((left, right) => {
      if (left.lookingForPartners !== right.lookingForPartners) {
        return left.lookingForPartners ? -1 : 1;
      }
      return (left.displayName ?? options.hiddenName).localeCompare(
        right.displayName ?? options.hiddenName,
      );
    });
};

export const getClassmateInitial = (name: string | null, fallback: string) =>
  (name?.trim() || fallback).slice(0, 1).toLocaleUpperCase();

export const getLinkHost = (value: string) => {
  try {
    return new URL(value).host;
  } catch {
    return value;
  }
};

export const getMemberPrivacyHint = (
  member: ClassPageMember,
  lockedFields: readonly string[],
  hint: string,
) =>
  lockedFields.length > 0 ||
  !member.displayName ||
  !member.department ||
  !member.year ||
  member.contacts.length === 0
    ? hint
    : null;
