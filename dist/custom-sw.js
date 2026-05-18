/* custom-sw.js
   Service Worker สำหรับรับ Web Push Notification
   ให้วางไฟล์นี้ใน public/custom-sw.js
*/

self.addEventListener('push', (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {
      title: 'Family Calendar',
      body: event.data ? event.data.text() : 'มีแจ้งเตือนใหม่',
    };
  }

  const title = data.title || 'Family Calendar';
  const options = {
    body: data.body || 'มีรายการใกล้ถึงเวลา',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return null;
    })
  );
});
