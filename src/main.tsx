import { Buffer } from 'buffer';
window.Buffer = window.Buffer || Buffer;
console.log('Buffer polyfilled');

// Mencegah aplikasi menjadi "blank white screen" jika pengguna klik pada menu
// yang mengandungi kod "chunk" JS lama yang telah dipadam dari Coolify server selepas kemas kini.
// GUARD: Hadkan maksimum 2 kali reload sahaja + min delay 4s antara reload.
// Delay + cooldown utk break infinite loop bila SW serve lama / CF tunnel issue.
window.addEventListener('vite:preloadError', () => {
  const key = 'vite_preload_retries';
  const cooldownKey = 'vite_preload_cooldown';
  const now = Date.now();
  const lastReload = parseInt(sessionStorage.getItem(cooldownKey) || '0', 10);

  // Cooldown — jangan reload dalam 4s lepas reload terakhir (break loop laju)
  if (now - lastReload < 4000) {
    console.warn('[vite:preloadError] Cooldown aktif — skip reload');
    return;
  }
  sessionStorage.setItem(cooldownKey, String(now));

  const retries = parseInt(sessionStorage.getItem(key) || '0', 10);
  if (retries < 2) {
    sessionStorage.setItem(key, String(retries + 1));
    // Delay 1.5s — bagi SW chance update / CF tunnel chance recover
    setTimeout(() => window.location.reload(), 1500);
  } else {
    // Max retries — clear SW cache + force skip waiting + redirect
    sessionStorage.removeItem(key);
    sessionStorage.removeItem(cooldownKey);
    if ('caches' in window) {
      caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))));
    }
    // Force new SW to activate
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg?.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      });
    }
    // Bypass CF cache dengan random param
    window.location.replace('/?t=' + now + '&r=' + Math.random().toString(36).slice(2));
  }
});

import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

// ==========================================
// Error Tracker (client-side): hantar error browser ke /api/system-errors
// Tangkap: runtime JS error (undefined var, tak declare, etc) + unhandled Promise rejection
// ==========================================
(function installErrorTracker() {
  const send = (payload) => {
    try {
      fetch('/api/system-errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => { /* jangan buat loop error */ });
    } catch (_) { /* ignore */ }
  };

  window.addEventListener('error', (e) => {
    // Hanya tangkap runtime error, bukan resource load error (tiada e.message utk resource)
    if (!e.message) return;
    send({
      message: e.message,
      stack: e.error && e.error.stack ? e.error.stack : null,
      url: location.href,
      line: e.lineno,
      column: e.colno,
      error_type: 'client_error',
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    send({
      message: (r && r.message) ? r.message : String(r),
      stack: (r && r.stack) ? r.stack : null,
      url: location.href,
      error_type: 'client_promise_rejection',
    });
  });
})();

console.log('Dependencies imported, grabbing root...');
const rootElement = document.getElementById('root');
console.log('Root element:', rootElement);

if (rootElement) {
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    console.log('App rendered successfully');
    sessionStorage.removeItem('vite_preload_retries');
  } catch (error) {
    console.error('Render error:', error);
  }
} else {
  console.error('Root element NOT FOUND');
}