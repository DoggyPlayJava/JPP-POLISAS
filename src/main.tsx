import { Buffer } from 'buffer';
window.Buffer = window.Buffer || Buffer;
console.log('Buffer polyfilled');

// Mencegah aplikasi menjadi "blank white screen" jika pengguna klik pada menu
// yang mengandungi kod "chunk" JS lama yang telah dipadam dari Coolify server selepas kemas kini.
// GUARD: Hadkan maksimum 2 kali reload sahaja untuk elak infinite loop.
// Senario loop: SW serve index.html lama → chunk 404 → reload → SW serve lama lagi → loop.
window.addEventListener('vite:preloadError', () => {
  const key = 'vite_preload_retries';
  const retries = parseInt(sessionStorage.getItem(key) || '0', 10);
  if (retries < 2) {
    sessionStorage.setItem(key, String(retries + 1));
    window.location.reload();
  } else {
    // Max retries reached — clear SW cache dan hard redirect sebagai usaha terakhir
    sessionStorage.removeItem(key);
    if ('caches' in window) {
      caches.keys().then(names => names.forEach(n => caches.delete(n)));
    }
    window.location.replace('/?t=' + Date.now());
  }
});

import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

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