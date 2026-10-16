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
    renotify: Boolean(data.tag) && !data.silent,
    silent: Boolean(data.silent),
    data: { url: data.url || "/dashboard" },
  };
  // Cloche de classe : vibration « ding-ding-dong » et notification qui reste affichée jusqu'au toucher.
  // (Un site ne peut pas imposer un son personnalisé app fermée : le téléphone joue son son de notification.)
  const cloche = data.tag === "cloche";
  if (cloche) {
    options.vibrate = [500, 200, 500, 200, 900];
    options.requireInteraction = true;
    options.renotify = true;
  }

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      // Page du site ouverte : elle fait sonner une vraie cloche et affiche la bannière.
      if (cloche) {
        const fenetres = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const f of fenetres) f.postMessage({ type: "cloche", title, body: options.body });
      }
      // Badge chiffré sur l'icône de l'app (« 2, 3, 5 » comme les apps natives).
      // Fonctionne app fermée grâce au nombre envoyé dans le push (badgeCount).
      if (typeof data.badgeCount === "number" && self.navigator && "setAppBadge" in self.navigator) {
        try {
          if (data.badgeCount > 0) await self.navigator.setAppBadge(data.badgeCount);
          else await self.navigator.clearAppBadge();
        } catch (e) { /* Badging non supporté : ignore */ }
      }
    })(),
  );
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

// L'app peut demander au SW de mettre à jour / effacer le badge (ex. « tout lu »).
self.addEventListener("message", (event) => {
  const msg = event.data || {};
  if (msg.type !== "SET_BADGE") return;
  if (!self.navigator || !("setAppBadge" in self.navigator)) return;
  try {
    if (typeof msg.count === "number" && msg.count > 0) self.navigator.setAppBadge(msg.count);
    else self.navigator.clearAppBadge();
  } catch (e) { /* ignore */ }
});
