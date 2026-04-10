// ╔══════════════════════════════════════════════════════════════════╗
// ║  sw.js — Service Worker for Семейный Бюджет PWA                 ║
// ║  ВАЖНО: при обновлении версии приложения обновите SW_VER ниже  ║
// ╠══════════════════════════════════════════════════════════════════╣
const SW_VER    = '2.9.11';           // ← обновляйте при каждом релизе
const APP_CACHE = 'budget-2.9.11';   // ← должно совпадать с SW_VER
const PWA_CACHE = 'pwa-assets';     // иконки + manifest (не удалять при апдейтах)
// ╚══════════════════════════════════════════════════════════════════╝

// ── Install: немедленно активируемся, не ждём закрытия вкладок ────
self.addEventListener('install', () => self.skipWaiting());

// ── Activate: удаляем старые кэши, захватываем клиентов ───────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== APP_CACHE && k !== PWA_CACHE)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Message: ответ на проверку версии (показ баннера обновления) ──
self.addEventListener('message', e => {
  if (e.data === 'CHECK_VER') {
    e.source?.postMessage({ type: 'VERSION', ver: SW_VER });
  }
});

// ── Fetch: перехватываем запросы ──────────────────────────────────
self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (!url.startsWith('http') || e.request.method !== 'GET') return;

  // Иконки и manifest — отдаём из pwa-assets (заполняется страницей)
  if (url.includes('/icon-192.png')) {
    e.respondWith(
      caches.open(PWA_CACHE)
        .then(c => c.match('_icon192'))
        .then(r => r || fetch(e.request))
    );
    return;
  }
  if (url.includes('/icon-512.png')) {
    e.respondWith(
      caches.open(PWA_CACHE)
        .then(c => c.match('_icon512'))
        .then(r => r || fetch(e.request))
    );
    return;
  }
  if (url.includes('/manifest.json')) {
    e.respondWith(
      caches.open(PWA_CACHE)
        .then(c => c.match('_manifest'))
        .then(r => r || fetch(e.request))
    );
    return;
  }

  // Основной HTML — network-first, кэш как fallback (офлайн + перезапуск телефона)
  e.respondWith(
    caches.open(APP_CACHE).then(cache =>
      fetch(e.request)
        .then(resp => {
          if (resp && resp.ok) cache.put(e.request, resp.clone());
          return resp;
        })
        .catch(() => cache.match(e.request))
    )
  );
});
