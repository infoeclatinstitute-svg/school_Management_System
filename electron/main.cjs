// ============================================================================
// Global College — Native Desktop Application Shell (Electron Main Process)
// Supports Windows, macOS, and Linux Desktop Workstations
// ============================================================================

const { app, BrowserWindow, shell, nativeImage, Menu } = require('electron');
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');

// Ensure Windows taskbar correctly groups and displays the Global College application icon
if (process.platform === 'win32') {
  app.setAppUserModelId('com.globalcollege.sms');
}

let mainWindow = null;
let localServer = null;
let localServerPort = 42888;
const CLOUD_PORTAL_URL = 'https://cloud.eclat.institute/?platform=desktop';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function startEmbeddedProductionServer(distDir, preferredPort = 42888) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = (req.url || '/').split('?')[0];
      let filePath = path.join(distDir, decodeURIComponent(urlPath === '/' ? '/index.html' : urlPath));

      if (!filePath.startsWith(distDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        // SPA Fallback for BrowserRouter routes (/s/:slug, /register-school, /login, etc.)
        filePath = path.join(distDir, 'index.html');
      }

      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(content);
      });
    });

    let portToTry = preferredPort;
    const tryListen = () => {
      server.removeAllListeners('error');
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          portToTry++;
          if (portToTry < preferredPort + 20) {
            tryListen();
          } else {
            // Fallback to random ephemeral port
            server.listen(0, '127.0.0.1', () => {
              const addr = server.address();
              resolve({ server, port: addr.port });
            });
          }
        } else {
          resolve({ server: null, port: 0 });
        }
      });

      server.listen(portToTry, '127.0.0.1', () => {
        const addr = server.address();
        resolve({ server, port: addr.port });
      });
    };

    tryListen();
  });
}

function checkCloudReachable(timeoutMs = 2500) {
  return new Promise((resolve) => {
    const req = https.get('https://cloud.eclat.institute/version.json', { timeout: timeoutMs }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function createMainWindow() {
  const icoPath = path.join(__dirname, '../public/icon.ico');
  const pngPath = path.join(__dirname, '../public/logo.png');
  const iconPath = process.platform === 'win32' && fs.existsSync(icoPath) ? icoPath : pngPath;
  const appIcon = nativeImage.createFromPath(iconPath);

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    title: 'Global College — School Management System & Portals',
    backgroundColor: '#0f172a',
    icon: appIcon,
    autoHideMenuBar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  const defaultUA = mainWindow.webContents.getUserAgent();
  if (!defaultUA.includes('GlobalCollegeDesktop')) {
    mainWindow.webContents.setUserAgent(`${defaultUA} GlobalCollegeDesktop ElectronApp`);
  }

  if (mainWindow.setIcon) {
    mainWindow.setIcon(appIcon);
  }

  // Set up local server for offline fallback
  const distDir = path.join(__dirname, '../dist');
  let hasLocalDist = false;
  if (fs.existsSync(path.join(distDir, 'index.html'))) {
    const { server, port } = await startEmbeddedProductionServer(distDir, 42888);
    localServer = server;
    localServerPort = port;
    hasLocalDist = true;
  }

  const localUrl = `http://127.0.0.1:${localServerPort}/?platform=desktop`;

  // Build Desktop Application Menu
  const menuTemplate = [
    {
      label: 'Gateway',
      submenu: [
        {
          label: '🌐 Live Cloud Hub (cloud.eclat.institute)',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => {
            if (mainWindow) mainWindow.loadURL(CLOUD_PORTAL_URL);
          },
        },
        {
          label: '💻 Local Offline Workstation',
          accelerator: 'CmdOrCtrl+Shift+L',
          click: () => {
            if (mainWindow) mainWindow.loadURL(localUrl);
          },
        },
        { type: 'separator' },
        {
          label: '🔄 Refresh Page',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.reload();
          },
        },
        {
          label: 'Exit Global College',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Global College Official Portal',
          click: () => {
            shell.openExternal('https://cloud.eclat.institute');
          },
        },
        {
          label: 'Documentation & Guides',
          click: () => {
            shell.openExternal('https://cloud.eclat.institute/help');
          },
        },
      ],
    },
  ];

  const appMenu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(appMenu);

  // Route window URL
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(`${devServerUrl}?platform=desktop`);
  } else {
    // Check if cloud portal is online and responsive
    const isCloudOnline = await checkCloudReachable(2000);
    if (isCloudOnline) {
      mainWindow.loadURL(CLOUD_PORTAL_URL);
    } else if (hasLocalDist) {
      mainWindow.loadURL(localUrl);
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
        query: { platform: 'desktop' },
      });
    }
  }

  // Seamless offline fallback: if cloud fails to load, gracefully fall back to local workstation
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    if (validatedURL && validatedURL.startsWith('https://cloud.eclat.institute') && hasLocalDist) {
      console.warn(`[Desktop] Cloud load failed (${errorCode}: ${errorDescription}). Falling back to local workstation.`);
      mainWindow.loadURL(localUrl);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (localServer) {
    try {
      localServer.close();
    } catch {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
