const CACHE_NAME = 'tribe-pwa-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Recebe da página o pedido para exibir uma notificação do sistema.
// Exibir pela Service Worker torna a notificação confiável mesmo com a aba
// em segundo plano (Chrome/Windows costuma suprimir notificações de página
// quando a aba está em foco).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'notify') {
    const { title, body, tag, url } = event.data;
    self.registration.showNotification(title || 'Tribe', {
      body: body || '',
      tag: tag || 'tribe',
      icon: '/icon-512.png',
      badge: '/icon-512.png',
      data: { url: url || '/' }
    });
  }
});

// Notificação de Web Push recebida do servidor (funciona mesmo com o app
// fechado ou em segundo plano no celular)
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Tribe', {
      body: data.body || '',
      tag: data.tag || 'tribe-push',
      icon: '/icon-512.png',
      badge: '/icon-512.png',
      data: { url: data.url || '/' }
    })
  );
});

// Ao clicar na notificação, abre/foca o app direto na conversa (?chat=...)
self.addEventListener('notificationclick', (event) => {
  const target = event.notification.data?.url || '/';
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          return client.navigate(target).then(() => client.focus());
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});

// Quando o navegador renova/expira a assinatura push, avisa a página aberta
// para re-registrar a nova assinatura no servidor
self.addEventListener('pushsubscriptionchange', () => {
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      client.postMessage({ type: 'push-renewed' });
    }
  });
});

self.addEventListener('fetch', (event) => {
  // Pass WebSocket connections through directly
  if (event.request.url.startsWith('ws://') || event.request.url.startsWith('wss://')) {
    return;
  }
  
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((response) => {
        if (response) return response;
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});
