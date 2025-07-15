import { app, BrowserWindow, session, globalShortcut } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

const debugEnabled = process.argv.includes('--debug') || process.argv.includes('/debug');

function log(...args: any[]) {
  if (debugEnabled) {
    console.log(new Date().toISOString(), ...args);
  }
}

function warn(...args: any[]) {
  if (debugEnabled) {
    console.warn(new Date().toISOString(), ...args);
  }
}

function error(...args: any[]) {
  if (debugEnabled) {
    console.error(new Date().toISOString(), ...args);
  }
}

log('Application starting');

async function createWindow() {
  log('Creating main window');
  const win = new BrowserWindow({
    kiosk: true,
    autoHideMenuBar: true,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true
    }
  });

  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  const indexPath = path.join(__dirname, '..', 'index.html');
  await win.loadFile(indexPath);
  log('Main window loaded', indexPath);
}

async function loadExtensions() {
  log('Loading extensions');
  const extRoot = path.join(process.resourcesPath, 'embedded_ext_placeholder');
  log('Checking extensions in', extRoot);
  if (fs.existsSync(extRoot)) {
    const dirs = fs.readdirSync(extRoot, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => path.join(extRoot, d.name));
    for (const dir of dirs) {
      try {
        await session.defaultSession.loadExtension(dir, { allowFileAccess: true });
        log('Extension loaded from', dir);
      } catch (e) {
        warn('Failed to load extension from', dir, e);
      }
    }
    if (!dirs.length) {
      warn('TODO: поместите сюда своё расширение');
    }
  } else {
    warn('TODO: поместите сюда своё расширение');
  }
}

app.whenReady().then(async () => {
  log('App is ready');
  ['CommandOrControl+T', 'CommandOrControl+N', 'F11', 'Alt+F4']
    .forEach(accel => globalShortcut.register(accel, () => {}));
  log('Global shortcuts registered');

  const nmDir = path.join(app.getPath('userData'), 'native_messaging');
  if (!fs.existsSync(nmDir)) {
    fs.mkdirSync(nmDir, { recursive: true });
    log('Created native messaging directory', nmDir);
  }
  const hasManifest = fs.readdirSync(nmDir).some(f => f.endsWith('.json'));
  if (!hasManifest) {
    warn('TODO: разместите manifest и бинарь хоста');
  }

  await createWindow();
  log('Main window created');

  // Загрузка расширений после отображения окна
  loadExtensions().catch(e => error(e));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    log('All windows closed, quitting');
    app.quit();
  }
});

// chrome.runtime.connectNative('com.my_company.single_site_host');
