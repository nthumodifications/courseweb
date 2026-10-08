export const SHORTLINK_ORIGIN = "https://nthumods.com";

// Rebuild the target on a fixed origin, so a stored link can only ever point
// somewhere on the site.
export const getSafeShortlinkUrl = (value: string) => {
  try {
    const url = new URL(value);
    if (url.origin !== SHORTLINK_ORIGIN) return null;
    return `${SHORTLINK_ORIGIN}${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
};
