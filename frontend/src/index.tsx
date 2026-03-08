import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register PWA service worker in production
if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  const publicUrl = process.env.PUBLIC_URL || '';
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${publicUrl}/sw.js`, { scope: publicUrl || '/' })
      .then((registration) => {
        console.log('PWA: Service worker registered', registration.scope);
      })
      .catch((err) => {
        console.warn('PWA: Service worker registration failed', err);
      });
  });
}

reportWebVitals();
