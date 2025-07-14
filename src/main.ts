import { app, BrowserWindow, session, globalShortcut } from 'electron';
import { execSync } from 'child_process';
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

interface LoadedExt { dir: string; id: string; }
async function loadExtensions(): Promise<LoadedExt[]> {
  const extRoot = path.join(process.resourcesPath, 'embedded_ext_placeholder');
  if (fs.existsSync(extRoot)) {
    const dirs = fs.readdirSync(extRoot, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => path.join(extRoot, d.name));
    const loaded: LoadedExt[] = [];
    for (const dir of dirs) {
      try {
        const ext = await session.defaultSession.loadExtension(dir, { allowFileAccess: true });
        loaded.push({ dir, id: ext.id });
        console.log('Extension loaded from', dir, 'id', ext.id);
      } catch (e) {
        console.warn('Failed to load extension from', dir, e);
      }
    }
    if (!dirs.length) {
      console.warn('TODO: поместите сюда своё расширение');
    }
    return loaded;
  } else {
    console.warn('TODO: поместите сюда своё расширение');
  }
  return [];
}

app.whenReady().then(async () => {
  ['CommandOrControl+T', 'CommandOrControl+N', 'F11', 'Alt+F4']
    .forEach(accel => globalShortcut.register(accel, () => {}));

  const loadedExts = await loadExtensions();

  const nmDir = path.join(app.getPath('userData'), 'native_messaging');
  if (!fs.existsSync(nmDir)) {
    fs.mkdirSync(nmDir, { recursive: true });
  }
  const hasManifest = fs.readdirSync(nmDir).some(f => f.endsWith('.json'));
  if (!hasManifest && process.platform === 'win32') {
    try {
      const resDir = path.join(process.resourcesPath, 'native_host_placeholder', 'windows');
      const hostScript = path.join(resDir, 'echo-host.js');
      const hostCmd = path.join(resDir, 'echo-host.cmd');
      const manifestTpl = path.join(resDir, 'echo-host.json');
      if (fs.existsSync(hostScript) && fs.existsSync(manifestTpl) && fs.existsSync(hostCmd)) {
        const exePath = path.join(nmDir, 'echo-host.cmd');
        fs.copyFileSync(hostScript, path.join(nmDir, 'echo-host.js'));
        fs.copyFileSync(hostCmd, exePath);
        const pingExt = loadedExts.find(e => e.dir.endsWith('ping_ext'));
        const extId = pingExt ? pingExt.id : '';
        const manifestPath = path.join(nmDir, 'echo-host.json');
        const manifestContent = fs.readFileSync(manifestTpl, 'utf8')
          .replace('__HOST_PATH__', exePath.replace(/\\/g, '\\\\'))
          .replace('__EXT_ID__', extId);
        fs.writeFileSync(manifestPath, manifestContent, 'utf8');
        try {
          execSync(`reg add HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.example.echo /ve /t REG_SZ /d "${manifestPath}" /f`);
        } catch (e) {
          console.warn('Failed to register native messaging host', e);
        }
      } else {
        console.warn('Native host resources not found');
      }
    } catch (e) {
      console.warn('Failed to install native host', e);
    }
  } else if (!hasManifest) {
    console.warn('TODO: разместите manifest и бинарь хоста');
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
