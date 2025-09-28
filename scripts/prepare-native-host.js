const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const zipPath = path.join(__dirname, '..', 'CAdES Browser Plug-in.zip');
const outDir = path.join(__dirname, '..', 'native_host_windows');

if (!fs.existsSync(zipPath)) {
  console.error('CryptoPro plug-in archive not found:', zipPath);
  process.exit(1);
}

if (fs.existsSync(outDir)) {
  for (const entry of fs.readdirSync(outDir)) {
    fs.rmSync(path.join(outDir, entry), { recursive: true, force: true });
  }
} else {
  fs.mkdirSync(outDir, { recursive: true });
}

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

const requiredOrigins = [
  'chrome-extension://iifchhfnnmpdbibifmljnfjhpififfog/',
  'chrome-extension://pfhgbfnnjiafkhfdkmpiflachepdcjod/'
];
manifest.allowed_origins = Array.from(new Set([...(manifest.allowed_origins || []), ...requiredOrigins]));
manifest.path = 'nmcades.exe';

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log('Prepared native host files in', outDir);
