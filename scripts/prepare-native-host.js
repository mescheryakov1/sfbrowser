const fs = require('fs');
const os = require('os');
const path = require('path');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const zlib = require('zlib');
const AdmZip = require('adm-zip');
const tar = require('tar');

const projectRoot = path.join(__dirname, '..');

function cleanDirectory(dir) {
  if (fs.existsSync(dir)) {
    for (const entry of fs.readdirSync(dir)) {
      fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
    }
  } else {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function ensureAllowedOrigins(manifest) {
  const requiredOrigins = [
    'chrome-extension://iifchhfnnmpdbibifmljnfjhpififfog/',
    'chrome-extension://pfhgbfnnjiafkhfdkmpiflachepdcjod/'
  ];
  manifest.allowed_origins = Array.from(new Set([...(manifest.allowed_origins || []), ...requiredOrigins]));
}

function prepareWindowsHost() {
  const zipPath = path.join(projectRoot, 'CAdES Browser Plug-in.zip');
  const outDir = path.join(projectRoot, 'native_host_windows');

  if (!fs.existsSync(zipPath)) {
    console.error('CryptoPro plug-in archive not found:', zipPath);
    process.exit(1);
  }

  cleanDirectory(outDir);

  const zip = new AdmZip(zipPath);

  function extractEntry(entryName, targetName) {
    const entry = zip.getEntry(entryName);
    if (!entry) {
      console.error('Entry not found in archive:', entryName);
      process.exit(1);
    }
    const data = entry.getData();
    fs.writeFileSync(path.join(outDir, targetName ?? path.basename(entryName)), data);
  }

  extractEntry('CAdES Browser Plug-in/nmcades.exe');
  extractEntry('CAdES Browser Plug-in/nmcades.json', 'ru.cryptopro.nmcades.json');

  const manifestPath = path.join(outDir, 'ru.cryptopro.nmcades.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  ensureAllowedOrigins(manifest);
  manifest.path = 'nmcades.exe';
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log('Prepared native host files in', outDir);
}

function readDebEntry(debBuffer, entryName) {
  const MAGIC = '!<arch>\n';
  if (debBuffer.length < MAGIC.length || debBuffer.slice(0, MAGIC.length).toString() !== MAGIC) {
    throw new Error('Invalid deb archive');
  }
  let offset = MAGIC.length;
  while (offset + 60 <= debBuffer.length) {
    const header = debBuffer.slice(offset, offset + 60);
    const rawName = header.slice(0, 16).toString().trim();
    const name = rawName.endsWith('/') ? rawName.slice(0, -1) : rawName;
    const size = parseInt(header.slice(48, 58).toString().trim(), 10);
    const dataStart = offset + 60;
    const dataEnd = dataStart + size;
    if (name === entryName) {
      return debBuffer.slice(dataStart, dataEnd);
    }
    offset = dataEnd + (size % 2 === 1 ? 1 : 0);
  }
  throw new Error(`Entry ${entryName} not found in deb archive`);
}

async function prepareLinuxHost() {
  const debPath = path.join(projectRoot, 'cprocsp-pki-plugin-64_2.0.15500-1_amd64.deb');
  const outDir = path.join(projectRoot, 'native_host_linux');

  if (!fs.existsSync(debPath)) {
    console.error('CryptoPro Linux plug-in package not found:', debPath);
    process.exit(1);
  }

  cleanDirectory(outDir);

  const debBuffer = fs.readFileSync(debPath);
  const dataTarGz = readDebEntry(debBuffer, 'data.tar.gz');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nmcades-linux-'));

  try {
    await pipeline(
      Readable.from(dataTarGz),
      zlib.createGunzip(),
      tar.x({ cwd: tempDir })
    );

    const binSource = path.join(tempDir, 'opt', 'cprocsp', 'bin', 'amd64');
    const libSource = path.join(tempDir, 'opt', 'cprocsp', 'lib', 'amd64');
    const manifestSource = path.join(tempDir, 'etc', 'opt', 'chrome', 'native-messaging-hosts', 'ru.cryptopro.nmcades.json');

    if (!fs.existsSync(binSource) || !fs.existsSync(manifestSource)) {
      throw new Error('Unexpected package layout in Linux plug-in');
    }

    fs.cpSync(binSource, path.join(outDir, 'opt', 'cprocsp', 'bin', 'amd64'), { recursive: true });
    if (fs.existsSync(libSource)) {
      fs.cpSync(libSource, path.join(outDir, 'opt', 'cprocsp', 'lib', 'amd64'), { recursive: true });
    }

    fs.mkdirSync(outDir, { recursive: true });
    fs.copyFileSync(manifestSource, path.join(outDir, 'ru.cryptopro.nmcades.json'));

    const manifestPath = path.join(outDir, 'ru.cryptopro.nmcades.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    ensureAllowedOrigins(manifest);
    manifest.path = path.join('opt', 'cprocsp', 'bin', 'amd64', 'nmcades');
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    const nmcadesPath = path.join(outDir, manifest.path);
    if (fs.existsSync(nmcadesPath)) {
      fs.chmodSync(nmcadesPath, 0o755);
    }

    console.log('Prepared Linux native host files in', outDir);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function main() {
  prepareWindowsHost();
  await prepareLinuxHost();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
