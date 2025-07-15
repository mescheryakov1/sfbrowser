import log from 'electron-log';
log.initialize({ preload: true });       // перехватывает console.* в рендерере
log.transports.file.level = 'debug';     // или 'silly' для полной детализации
log.transports.console.level = 'debug';
log.transports.file.format =
  '{y}-{m}-{d} {h}:{i}:{s}.{ms} | {processType}:{level} | {text}';
log.info('=== App start with DEBUG level ===');

import { app, BrowserWindow, session, globalShortcut } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

app.commandLine.appendSwitch('enable-logging');
log.debug('[main] chromium logging enabled');

app.once('ready', () => log.debug('[main] app ready'));
app.on('before-quit', () => log.debug('[main] before quit'));
process.on('uncaughtException', e => log.error('[main] uncaught', e));

log.transports.file.maxSize = 5_242_880; // 5 MiB

async function createWindow() {
  log.info('Creating browser window');
  const win = new BrowserWindow({
    kiosk: true,
    autoHideMenuBar: true,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true
    }
  });

  log.debug('[main] BrowserWindow created');

  win.once('ready-to-show', () => log.debug('[win] ready-to-show'));
  win.webContents.on('did-start-loading', () =>
    log.debug('[win] did-start-loading'));
  win.webContents.on('did-finish-load', () =>
    log.debug('[win] did-finish-load'));

  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  const indexPath = path.join(__dirname, '..', 'index.html');
  log.info('Loading index from', indexPath);
  await win.loadFile(indexPath);
}

async function loadExtensions() {
  const extRoot = path.join(process.resourcesPath, 'embedded_ext_placeholder');
  log.info('Looking for extensions in', extRoot);
  if (fs.existsSync(extRoot)) {
    const dirs = fs.readdirSync(extRoot, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => path.join(extRoot, d.name));
      for (const dir of dirs) {
        try {
          await session.defaultSession.loadExtension(dir, { allowFileAccess: true });
          log.info('Extension loaded from', dir);
        } catch (e) {
          log.warn('Failed to load extension from', dir, e);
        }
    }
    if (!dirs.length) {
      log.warn('TODO: поместите сюда своё расширение');
    }
  } else {
    log.warn('TODO: поместите сюда своё расширение');
  }
}

async function loadCryptoProExt() {
  const extDir = path.join(process.resourcesPath, 'crypto_extension');
  await session.defaultSession.loadExtension(extDir);
  log.debug('[ext] CryptoPro extension loaded');
}

session.defaultSession.on('select-serial-port', () =>
  log.debug('[ext] select-serial-port triggered'));

(session.defaultSession as any).on('service-worker-context-lost', (e: unknown) =>
  log.debug('[ext] service-worker lost', e));

app.whenReady().then(async () => {
  ['CommandOrControl+T', 'CommandOrControl+N', 'F11', 'Alt+F4']
    .forEach(accel => globalShortcut.register(accel, () => {}));

  const nmDir = path.join(app.getPath('userData'), 'native_messaging');
  log.info('Native messaging dir', nmDir);
  if (!fs.existsSync(nmDir)) {
    fs.mkdirSync(nmDir, { recursive: true });
  }
  const hasManifest = fs.readdirSync(nmDir).some(f => f.endsWith('.json'));
  if (!hasManifest) {
    log.warn('TODO: разместите manifest и бинарь хоста');
  }

  log.info('Creating main window');
  await createWindow();

  // Загрузка расширений после отображения окна
  log.info('Loading extensions');
  loadExtensions().catch(e => log.error(e));
  loadCryptoProExt().catch(e => log.error(e));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  log.debug('[main] all windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// chrome.runtime.connectNative('com.my_company.single_site_host');
