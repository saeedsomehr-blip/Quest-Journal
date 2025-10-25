// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './mobile.css'
import App from './App.jsx'
import { AiProvider } from './ctx/AiContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AiProvider>
      <App />
    </AiProvider>
  </StrictMode>,
)

// --- Service Worker ---
// Dev: هیچ SW رجیستر نشود (و اگر قبلاً بوده، پاک شود)
// Prod: با نسخه‌ی صریح رجیستر کن تا کش همیشه آپدیت بماند
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    const base = import.meta.env.BASE_URL || '/';
    const SW_VERSION = 'qj-2025-10-14-01';
    const swPath = `${base}sw.js?v=${SW_VERSION}`;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(swPath).catch(console.warn);
    });
  } else {
    // Dev: هر SW فعلی رو برای همین origin پاک کن تا رفتار یکدست باشه
    navigator.serviceWorker.getRegistrations?.().then(regs => {
      regs.forEach(r => r.unregister());
    });
    // Dev: کش‌های قبلی اپ رو هم پاک کن
    if ('caches' in window) {
      caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
    }
  }
}
