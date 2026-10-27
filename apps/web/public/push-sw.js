const PUSH_ICON = "/images/icons/icon-192x192.png";
const PUSH_BADGE = "/images/icons/icon-72x72.png";

const safeNotificationUrl = (value) =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : null;

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    return;
  }

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
