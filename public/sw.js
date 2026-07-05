/* Service Worker Arazzo — notifications push + installation PWA.
 * Volontairement SANS cache de navigation : le site est dynamique (SSR /
 * server actions), on ne veut pas servir de pages périmées. Le SW sert
 * uniquement à recevoir les push et gérer le clic sur la notification. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Arazzo Formation";
  const options = {
    body: data.body || "",
    icon: data.icon || "/images/arazzo-icon.png",
    badge: "/images/arazzo-icon.png",
    lang: "fr",
    dir: "auto",
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    data: { url: data.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        // Une fenêtre du site est déjà ouverte → on la focus et on y navigue.
        if ("focus" in client) {
          try { await client.navigate(url); } catch (e) { /* origine différente : ignore */ }
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })(),
  );
});
