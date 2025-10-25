// electron/main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const handler = require('serve-handler');

let httpServer = null;
const isDev = () => !app.isPackaged;
const publicDir = () => path.join(app.getAppPath(), 'dist'); // خروجی Vite

function startStaticServer(dir) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) =>
      handler(req, res, {
        public: dir,
        cleanUrls: true,
        rewrites: [{ source: '**', destination: '/index.html' }]
      })
    );
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      resolve({ server: srv, url: `http://127.0.0.1:${port}/` });
    });
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev()) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';
    await win.loadURL(devUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const { server, url } = await startStaticServer(publicDir());
    httpServer = server;
    await win.loadURL(url); // origin واقعی -> کمک به لاگین YouTube در iframe
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (httpServer) { try { httpServer.close(); } catch {} }
  if (process.platform !== 'darwin') app.quit();
});
