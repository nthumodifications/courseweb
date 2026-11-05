import { LAUNDRY_DORMS, type LaundryDorm } from "@/const/laundry-machines";

export type LaundryDormPreference = LaundryDorm | "all";

export const parseLaundryDormPreference = (
  value: string | null | undefined,
): LaundryDorm | null => {
  if (!value) return null;
  let candidate = value;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed === "string") candidate = parsed;
  } catch {
    // The laundry page stores raw dorm ids; older widget values used JSON.
  }
  return Object.hasOwn(LAUNDRY_DORMS, candidate)
    ? (candidate as LaundryDorm)
    : null;
};

export const laundryDormStorageOptions = {
  serializer: (value: LaundryDormPreference) => (value === "all" ? "" : value),
  deserializer: (value: string): LaundryDormPreference =>
    parseLaundryDormPreference(value) ?? "all",
};
