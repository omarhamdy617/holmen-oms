// Holmen OMS Service Worker
const CACHE_NAME = 'holmen-oms-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// Handle push notifications
self.addEventListener('push', e => {
  let data = { title: 'هولمن OMS', body: 'إشعار جديد' };
  try { data = e.data.json(); } catch {}
  
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      dir: 'rtl',
      lang: 'ar',
      vibrate: [200, 100, 200],
      tag: 'holmen-notif',
      renotify: true,
    })
  );
});

// Click on notification opens the app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('holmen-oms') && 'focus' in client)
          return client.focus();
      }
      if (clients.openWindow)
        return clients.openWindow('https://holmen-oms.vercel.app');
    })
  );
});

// Background sync - check for new orders every 30 seconds
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(e.data.title, {
      body: e.data.body,
      icon: '/icon-192.png',
      dir: 'rtl',
      lang: 'ar',
      vibrate: [200, 100, 200],
      tag: 'holmen-' + Date.now(),
      renotify: true,
    });
  }
});
