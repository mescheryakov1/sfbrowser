import { app, BrowserWindow, session, globalShortcut } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

const debugEnabled = process.argv.includes('--debug') || process.argv.includes('/debug');

let logStream: fs.WriteStream | null = null;
const pendingLogs: string[] = [];

function write(level: 'log' | 'warn' | 'error', ...args: any[]) {
  if (!debugEnabled) {
    return;
  }
  const line = `${new Date().toISOString()} ${args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}`;
  if (process.stdout.isTTY) {
    (console as any)[level](line);
  }
  if (logStream) {
    logStream.write(line + '\n');
  } else {
    pendingLogs.push(line);
  }
}

function log(...args: any[]) {
  write('log', ...args);
}

function warn(...args: any[]) {
  write('warn', ...args);
}

function error(...args: any[]) {
  write('error', ...args);
}

log('Application starting');

function initLogging() {
  if (!debugEnabled) {
    return;
  }
  const logPath = path.join(app.getPath('userData'), 'debug.log');
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  logStream = fs.createWriteStream(logPath, { flags: 'a' });
  for (const line of pendingLogs) {
    logStream.write(line + '\n');
  }
  pendingLogs.length = 0;
  if (!process.stdout.isTTY) {
    console.log('Debug log written to', logPath);
  }
}

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
  initLogging();
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
