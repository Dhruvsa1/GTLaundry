self.addEventListener("install", () => { self.skipWaiting(); });
self.addEventListener("activate", (event) => { event.waitUntil(clients.claim()); });

// Basic offline shell (optional enhancement)
// Removed no-op fetch handler to avoid overhead warnings

// Push handling (Web Push)
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Laundry Update";
  const options = {
    body: data.body || "",
    badge: "/icons/icon-192.svg",
    icon: "/icons/icon-192.svg",
    data: data.data || {},
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
