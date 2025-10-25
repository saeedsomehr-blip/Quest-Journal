// public/preLoad.cjs
const { contextBridge, ipcRenderer } = require('electron');

// این فایل قبل از اجرای React لود می‌شود
// و فقط چیزهای امن را به window در Renderer منتقل می‌کند
contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  on: (channel, callback) => {
    ipcRenderer.on(channel, (_event, data) => callback(data));
  },
  once: (channel, callback) => {
    ipcRenderer.once(channel, (_event, data) => callback(data));
  },
  invoke: (channel, data) => ipcRenderer.invoke(channel, data)
});
