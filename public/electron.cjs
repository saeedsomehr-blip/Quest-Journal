// public/electron.cjs
const { app, BrowserWindow, shell, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0f0f14',
    webPreferences: {
      preload: path.join(__dirname, 'preLoad.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      devTools: isDev
    }
  });

  win.once('ready-to-show', () => win.show());

  if (isDev) {
    const devURL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    win.loadURL(devURL);
    // win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // در حالت پروداکشن: فایل استاتیک را مستقیم از دیسک لود کن
    const indexHtml = path.join(__dirname, '..', 'dist', 'index.html');
    if (!fs.existsSync(indexHtml)) {
      console.error('index.html not found at:', indexHtml);
    }
    win.loadFile(indexHtml);
  }

  // باز کردن لینک‌های http/https در مرورگر سیستم
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // جلوگیری از کشیده‌شدن فایل داخل پنجره (امنیت)
  win.webContents.on('will-navigate', (e, url) => {
    if (!isDev && /^https?:\/\//i.test(url)) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });
}

/** ————— Single-instance ————— */
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    app.setAppUserModelId('com.questjournal.app');

    // پروتکل‌های سفارشی اگر خواستی بعداً اضافه کن
    // protocol.registerFileProtocol('app', (request, cb) => { ... });

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
