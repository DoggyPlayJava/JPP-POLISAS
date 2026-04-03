import { Buffer } from 'buffer';
window.Buffer = window.Buffer || Buffer;
console.log('Buffer polyfilled');
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