import { app, BrowserWindow, session, globalShortcut } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import log from 'electron-log';

log.transports.file.level = 'info';
log.transports.file.maxSize = 5_242_880; // 5 MiB
log.info('=== app start ===');

function initializeNativeMessagingHost(nmDir: string): boolean {
  const srcDir = path.join(process.resourcesPath, 'native_host_placeholder');
  if (!fs.existsSync(srcDir)) {
    log.warn('Native host placeholder directory not found at', srcDir);
    return false;
  }

  const entries = fs.readdirSync(srcDir, { withFileTypes: true }).filter(e => e.isFile());
  if (!entries.length) {
    log.warn('Native host placeholder directory is empty at', srcDir);
    return false;
  }

  const binaries = entries.filter(e => !e.name.endsWith('.json'));
  const manifests = entries.filter(e => e.name.endsWith('.json'));

  for (const entry of binaries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(nmDir, entry.name);
    try {
      fs.copyFileSync(srcPath, destPath);
      if (process.platform !== 'win32') {
        fs.chmodSync(destPath, 0o755);
      }
    } catch (error) {
      log.warn('Failed to copy native host binary', srcPath, error);
    }
  }

  for (const entry of manifests) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(nmDir, entry.name);
    try {
      const manifest = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
      if (typeof manifest.path === 'string') {
        const executableName = path.basename(manifest.path);
        manifest.path = path.join(nmDir, executableName);
      }
      fs.writeFileSync(destPath, JSON.stringify(manifest, null, 2));
    } catch (error) {
      log.warn('Failed to write native host manifest', srcPath, error);
    }
  }

  const copiedManifests = manifests.map(entry => path.join(nmDir, entry.name)).filter(dest => fs.existsSync(dest));
  if (!copiedManifests.length) {
    log.warn('No native messaging manifests were copied to', nmDir);
    return false;
  }

  log.info('Native messaging host files initialized in', nmDir);
  return true;
}

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
  const hasManifest = fs.readdirSync(nmDir).some(f => f.endsWith('.json'));
  if (!hasManifest) {
    const copied = initializeNativeMessagingHost(nmDir);
    if (!copied) {
      log.warn('TODO: разместите manifest и бинарь хоста');
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
