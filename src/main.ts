import { app, BrowserWindow, session, globalShortcut } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

async function createWindow() {
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
}

app.whenReady().then(async () => {
  ['CommandOrControl+T', 'CommandOrControl+N', 'F11', 'Alt+F4']
    .forEach(accel => globalShortcut.register(accel, () => {}));

  const nmDir = path.join(app.getPath('userData'), 'native_messaging');
  if (!fs.existsSync(nmDir)) {
    fs.mkdirSync(nmDir, { recursive: true });
  }
  const hasManifest = fs.readdirSync(nmDir).some(f => f.endsWith('.json'));
  if (!hasManifest) {
    console.warn('TODO: разместите manifest и бинарь хоста');
  }

  const extRoot = path.join(process.resourcesPath, 'embedded_ext_placeholder');
  if (fs.existsSync(extRoot)) {
    const dirs = fs.readdirSync(extRoot, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => path.join(extRoot, d.name));
    for (const dir of dirs) {
      try {
        await session.defaultSession.loadExtension(dir, { allowFileAccess: true });
        console.log('Extension loaded from', dir);
      } catch (e) {
        console.warn('Failed to load extension from', dir, e);
      }
    }
    if (!dirs.length) {
      console.warn('TODO: поместите сюда своё расширение');
    }
  } else {
    console.warn('TODO: поместите сюда своё расширение');
  }

  await createWindow();

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
