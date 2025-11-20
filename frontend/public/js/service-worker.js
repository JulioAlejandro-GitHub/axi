self.addEventListener('push', function(event) {
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: 'img/ico_recognition.jpeg',
        badge: 'img/ico_recognition.jpeg'
    };
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});



// // A basic service worker to prevent 404 errors.
// // This can be expanded later with caching and push notification logic.

// self.addEventListener('install', (event) => {
//   console.log('Service Worker: Installing...');
//   // event.waitUntil(
//   //   caches.open('vigilante-cache-v1').then((cache) => {
//   //     return cache.addAll([
//   //       '/',
//   //       '/index.html',
//   //       // Add other static assets to cache here
//   //     ]);
//   //   })
//   // );
//   self.skipWaiting();
// });

// self.addEventListener('activate', (event) => {
//   console.log('Service Worker: Activating...');
//   event.waitUntil(self.clients.claim());
// });

// self.addEventListener('fetch', (event) => {
//   // For now, just pass through all network requests.
//   // Caching strategies can be implemented here later.
//   event.respondWith(fetch(event.request));
// });