import { app, BrowserWindow, session, globalShortcut } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import log from 'electron-log';

log.transports.file.level = 'info';
log.transports.file.maxSize = 5_242_880; // 5 MiB
log.info('=== app start ===');

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

app.whenReady().then(async () => {
  ['CommandOrControl+T', 'CommandOrControl+N', 'F11', 'Alt+F4']
    .forEach(accel => globalShortcut.register(accel, () => {}));

  const nmDir = path.join(app.getPath('userData'), 'native_messaging');
  log.info('Native messaging dir', nmDir);
  if (!fs.existsSync(nmDir)) {
    fs.mkdirSync(nmDir, { recursive: true });
  }
  const nmContents = fs.readdirSync(nmDir);
  const hasManifest = nmContents.some(f => f.endsWith('.json'));
  const hasCryptoManifest = nmContents.includes('ru.cryptopro.nmcades.json');
  if (!hasManifest || !hasCryptoManifest) {
    const placeholderDir = path.join(process.resourcesPath, 'native_host_placeholder');
    log.info('Copying native messaging placeholder from', placeholderDir);
    if (fs.existsSync(placeholderDir)) {
      try {
        fs.cpSync(placeholderDir, nmDir, { recursive: true });
        const stubPath = path.join(nmDir, 'cryptopro_stub.js');
        if (fs.existsSync(stubPath)) {
          fs.chmodSync(stubPath, 0o755);
          log.info('Ensured execute permissions for native messaging stub', stubPath);
        } else {
          log.warn('Native messaging stub not found after copy', stubPath);
        }
        log.info('Native messaging placeholder copied to', nmDir);
      } catch (err) {
        log.warn('Failed to copy native messaging placeholder:', err);
      }
    } else {
      log.warn('Native host placeholder directory is missing', placeholderDir);
    }
  }

  log.info('Creating main window');
  await createWindow();

  // Загрузка расширений после отображения окна
  log.info('Loading extensions');
  loadExtensions().catch(e => log.error(e));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// chrome.runtime.connectNative('com.my_company.single_site_host');
