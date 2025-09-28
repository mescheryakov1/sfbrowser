import { app, BrowserWindow, session, globalShortcut } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
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

async function copyDirectory(src: string, dest: string): Promise<void> {
  await fsPromises.mkdir(dest, { recursive: true });
  const entries = await fsPromises.readdir(src, { withFileTypes: true });
  await Promise.all(entries.map(async entry => {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
      return;
    }
    await fsPromises.copyFile(srcPath, destPath);
  }));
}

async function rewriteManifest(src: string, dest: string, nmDir: string): Promise<void> {
  const rawManifest = await fsPromises.readFile(src, 'utf8');
  const manifest = JSON.parse(rawManifest) as { path?: string };
  if (typeof manifest.path === 'string' && !path.isAbsolute(manifest.path)) {
    manifest.path = path.join(nmDir, manifest.path);
  }
  await fsPromises.writeFile(dest, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function findNativeHostPlaceholder(): Promise<string | undefined> {
  const candidates = [
    path.join(process.resourcesPath, 'native_host_placeholder'),
    path.join(__dirname, '..', 'native_host_placeholder')
  ];

  for (const candidate of candidates) {
    try {
      const stats = await fsPromises.stat(candidate);
      if (stats.isDirectory()) {
        return candidate;
      }
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code && err.code !== 'ENOENT') {
        log.warn('Failed to access native messaging placeholder at', candidate, err);
      }
    }
  }

  return undefined;
}

async function hasNativeMessagingManifest(nmDir: string): Promise<boolean> {
  try {
    const entries = await fsPromises.readdir(nmDir, { withFileTypes: true });
    return entries.some(entry => entry.isFile() && entry.name.endsWith('.json'));
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function initializeNativeMessagingHost(nmDir: string): Promise<void> {
  try {
    if (await hasNativeMessagingManifest(nmDir)) {
      log.info('Native messaging manifest already present, skipping initialization');
      return;
    }

    const placeholderDir = await findNativeHostPlaceholder();
    if (!placeholderDir) {
      log.warn('Native messaging host placeholder directory not found');
      return;
    }

    await fsPromises.mkdir(nmDir, { recursive: true });
    const entries = await fsPromises.readdir(placeholderDir, { withFileTypes: true });
    if (!entries.length) {
      log.warn('Native messaging host placeholder is empty');
      return;
    }

    let manifestCopied = false;
    for (const entry of entries) {
      const srcPath = path.join(placeholderDir, entry.name);
      const destPath = path.join(nmDir, entry.name);

      if (entry.isDirectory()) {
        await copyDirectory(srcPath, destPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (entry.name.endsWith('.json')) {
        await rewriteManifest(srcPath, destPath, nmDir);
        manifestCopied = true;
        continue;
      }

      await fsPromises.copyFile(srcPath, destPath);
    }

    if (!manifestCopied) {
      log.warn('Native messaging host manifest not found in placeholder');
      return;
    }

    log.info('Native messaging host assets installed to', nmDir);
  } catch (error) {
    log.error('Failed to initialize native messaging host', error);
  }
}

function hasNativeMessagingManifestSync(nmDir: string): boolean {
  try {
    return fs.existsSync(nmDir) && fs.readdirSync(nmDir).some(f => f.endsWith('.json'));
  } catch (error) {
    log.error('Failed to inspect native messaging dir', error);
    return false;
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
  const hasManifest = hasNativeMessagingManifestSync(nmDir);
  if (!hasManifest) {
    log.warn('TODO: разместите manifest и бинарь хоста');
  }

  log.info('Creating main window');
  await createWindow();

  if (!hasManifest) {
    void initializeNativeMessagingHost(nmDir);
  }

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
