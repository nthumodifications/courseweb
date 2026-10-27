const exactPushHosts = new Set([
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
  "android.googleapis.com",
]);

const wildcardPushSuffixes = [
  ".push.services.mozilla.com",
  ".push.apple.com",
  ".notify.windows.com",
];

export const isAllowedPushEndpoint = (value: string): boolean => {
  try {
    const endpoint = new URL(value);
    if (
      endpoint.protocol !== "https:" ||
      endpoint.username ||
      endpoint.password ||
      endpoint.port
    ) {
      return false;
    }
    const authority = value.slice("https://".length).split(/[/?#]/, 1)[0];
    if (authority.includes(":")) return false;
    const hostname = endpoint.hostname.toLowerCase();
    return (
      exactPushHosts.has(hostname) ||
      wildcardPushSuffixes.some((suffix) => hostname.endsWith(suffix))
    );
  } catch {
    return false;
  }
};
