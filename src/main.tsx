import { Buffer } from 'buffer';
window.Buffer = window.Buffer || Buffer;
console.log('Buffer polyfilled');

// Mencegah aplikasi menjadi "blank white screen" jika pengguna klik pada menu
// yang mengandungi kod "chunk" JS lama yang telah dipadam dari Coolify server selepas kemas kini.
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
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
  } catch (error) {
    console.error('Render error:', error);
  }
} else {
  console.error('Root element NOT FOUND');
}