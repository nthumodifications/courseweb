const PUSH_ICON = "/images/icons/icon-192x192.png";
const PUSH_BADGE = "/images/icons/icon-72x72.png";

function safeNotificationUrl(value) {
  if (typeof value !== "string" || value.includes("\\")) return null;
  try {
    const resolved = new URL(value, self.location.origin);
    return resolved.origin === self.location.origin ? resolved.href : null;
  } catch {
    return null;
  }
}

function normalizePushPayload(value) {
  if (value === null || typeof value !== "object") return {};
  if (Object.prototype.toString.call(value) !== "[object Object]") return {};
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || Object.getPrototypeOf(prototype) === null
    ? value
    : {};
}

self.addEventListener("push", (event) => {
  let parsedPayload;
  try {
    parsedPayload = event.data ? event.data.json() : null;
  } catch {
    parsedPayload = null;
  }
  const payload = normalizePushPayload(parsedPayload);

  const title = typeof payload.title === "string" ? payload.title : "NTHUMods";
  const body = typeof payload.body === "string" ? payload.body : "";
  const tag = typeof payload.tag === "string" ? payload.tag : undefined;
  const url = safeNotificationUrl(payload.url) ?? "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: PUSH_ICON,
      badge: PUSH_BADGE,
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = safeNotificationUrl(event.notification.data?.url);
  if (!url) return;

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windowClients) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        await client.focus();
        await client.navigate(url);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
