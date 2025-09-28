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

function findNativeHostCandidates(): string[] {
  const baseDirs = [process.resourcesPath, app.getAppPath()];
  const order: string[] = [];
  if (process.platform === 'win32') {
    order.push('native_host_windows');
  }
  order.push('native_host_placeholder');

  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const dirName of order) {
    for (const base of baseDirs) {
      const candidate = path.join(base, dirName);
      if (seen.has(candidate)) continue;
      seen.add(candidate);
      candidates.push(candidate);
    }
  }
  return candidates;
}

function findNativeHostExecutable(nmDir: string, manifestPathValue?: string): string | undefined {
  const entries = fs.readdirSync(nmDir);
  const lowerEntries = entries.map(entry => entry.toLowerCase());
  const manifestCandidate = manifestPathValue ? path.basename(manifestPathValue) : undefined;
  if (manifestCandidate) {
    const normalizedManifestCandidate = manifestCandidate.toLowerCase();
    const manifestIndex = lowerEntries.indexOf(normalizedManifestCandidate);
    if (manifestIndex !== -1) {
      return entries[manifestIndex];
    }
  }

  const findByExtension = (ext: string) => {
    const idx = lowerEntries.findIndex(entry => entry.endsWith(ext));
    return idx === -1 ? undefined : entries[idx];
  };

  if (process.platform === 'win32') {
    const exactMatchIdx = lowerEntries.indexOf('nmcades.exe');
    if (exactMatchIdx !== -1) {
      return entries[exactMatchIdx];
    }
    return findByExtension('.exe') ?? findByExtension('.cmd') ?? findByExtension('.bat');
  }

  return findByExtension('.js') ?? findByExtension('.sh');
}

app.whenReady().then(async () => {
  ['CommandOrControl+T', 'CommandOrControl+N', 'F11', 'Alt+F4']
    .forEach(accel => globalShortcut.register(accel, () => {}));

  const nmDir = path.join(app.getPath('userData'), 'native_messaging');
  log.info('Native messaging dir', nmDir);
  if (!fs.existsSync(nmDir)) {
    fs.mkdirSync(nmDir, { recursive: true });
  }
  let nmContents = fs.readdirSync(nmDir);
  const hasManifest = nmContents.some(f => f.endsWith('.json'));
  const hasCryptoManifest = nmContents.includes('ru.cryptopro.nmcades.json');
  if (!hasManifest || !hasCryptoManifest) {
    const hostCandidates = findNativeHostCandidates();
    const hostDir = hostCandidates.find(candidate => fs.existsSync(candidate));
    if (hostDir) {
      log.info('Copying native messaging host from', hostDir);
      try {
        fs.cpSync(hostDir, nmDir, { recursive: true });
        nmContents = fs.readdirSync(nmDir);
        log.info('Native messaging host copied to', nmDir);
      } catch (err) {
        log.warn('Failed to copy native messaging host:', err);
      }
    } else {
      log.warn('Native host directory not found. Tried locations:', hostCandidates.join(', '));
    }
  }

  const manifestPath = path.join(nmDir, 'ru.cryptopro.nmcades.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const executableName = findNativeHostExecutable(nmDir, manifest.path);
      if (!executableName) {
        log.warn('Native messaging executable not found in', nmDir);
      } else {
        const executablePath = path.resolve(nmDir, executableName);
        if (process.platform !== 'win32' && executableName.endsWith('.js')) {
          try {
            fs.chmodSync(executablePath, 0o755);
            log.info('Ensured execute permissions for native messaging stub', executablePath);
          } catch (chmodErr) {
            log.warn('Failed to set execute permissions for native messaging stub:', chmodErr);
          }
        }
        manifest.path = executablePath;
        fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
        log.info('Native messaging manifest updated at', manifestPath, 'with path', manifest.path);
      }
    } catch (manifestErr) {
      log.warn('Failed to update native messaging manifest:', manifestErr);
    }
  } else {
    log.warn('Native messaging manifest not found at', manifestPath);
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
