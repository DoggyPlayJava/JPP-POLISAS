self.addEventListener('push', function (event) {
  if (event.data) {
    let data = {};
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: event.data.text() };
    }
    
    const title = data.title || 'Notifikasi JPP';
    const options = {
      body: data.body || 'Anda mempunyai satu notifikasi baru.',
      icon: '/jpp-logo.png',
      badge: '/masked-icon.svg',
      vibrate: [200, 100, 200],
      data: data.url || '/portal' // Arahkan ke /portal bila ditekan
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close(); // Tutup popup notifikasi bila ditekan
  
  if (event.notification.data) {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    );
  }
});
