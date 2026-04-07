const CACHE = 'horas-v1';
const ASSETS = ['/', '/index.html'];

// Install
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
  ));
  self.clients.claim();
});

// Fetch - cache first
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res.status === 200) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});

// ── ALARM SYSTEM ─────────────────────────────────────────────────
let alarmTimers = [];

self.addEventListener('message', e => {
  if (e.data?.type === 'SET_ALARMS') {
    setupAlarms(e.data.times);
  }
});

function setupAlarms(times) {
  alarmTimers.forEach(clearTimeout);
  alarmTimers = [];

  times.forEach(time => {
    const ms = msUntil(time);
    const t = setTimeout(() => {
      fireNotification(time);
      // Repeat every 24h
      const repeat = setInterval(() => fireNotification(time), 24 * 60 * 60 * 1000);
      alarmTimers.push(repeat);
    }, ms);
    alarmTimers.push(t);
  });
}

function msUntil(timeStr) {
  const now = new Date();
  const [h, m] = timeStr.split(':').map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target - now;
}

function fireNotification(time) {
  const day = new Date().toLocaleDateString('es-ES', { weekday: 'long' });
  self.registration.showNotification('Registro de horas', {
    body: `Recuerda apuntar tus horas de hoy (${day})`,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    tag: 'horas-recordatorio',
    renotify: true,
    actions: [
      { action: 'open', title: 'Abrir app' },
      { action: 'dismiss', title: 'Ahora no' }
    ],
    data: { url: '/' }
  });
}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return clients.openWindow('/');
    })
  );
});
