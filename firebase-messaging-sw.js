// ── IMPORTANTE: Este archivo DEBE llamarse firebase-messaging-sw.js
// GitHub Pages lo sirve en la raíz — Firebase lo busca ahí.

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// MISMA config que en index.html
firebase.initializeApp({
  apiKey: "AIzaSyDXbPXsG-L6LSc6FZ3b4ET8vnqJIs3pGM8",
  authDomain: "horas-trabajo-d3cc8.firebaseapp.com",
  projectId: "horas-trabajo-d3cc8",
  storageBucket: "horas-trabajo-d3cc8.firebasestorage.app",
  messagingSenderId: "635810073772",
  appId: "1:635810073772:web:247ce5ef801c80da462309"
});

const messaging = firebase.messaging();

// Notificaciones cuando la app está en SEGUNDO PLANO o CERRADA
messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || 'Registro de horas';
  const body = payload.notification?.body || 'Recuerda anotar tus horas de hoy';
  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    tag: 'horas-recordatorio',
    renotify: true,
    actions: [
      { action: 'open', title: 'Abrir app' },
      { action: 'dismiss', title: 'Ahora no' }
    ]
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const w = list.find(c => c.url.includes(self.location.origin));
      return w ? w.focus() : clients.openWindow('/');
    })
  );
});

// Cache para modo offline
const CACHE = 'horas-v2';
const ASSETS = ['/', '/index.html'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
