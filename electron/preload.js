// electron/preload.js
const { contextBridge } = require('electron');

// نمونه: فقط یک آبجکت کوچک امن در دسترس renderer
contextBridge.exposeInMainWorld('appInfo', {
  electron: process.versions.electron
});
