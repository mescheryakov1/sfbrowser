const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const v2Zip = path.join(__dirname, '..', 'iifchhfnnmpdbibifmljnfjhpififfog.zip');
const v3Zip = path.join(__dirname, '..', 'pfhgbfnnjiafkhfdkmpiflachepdcjod.zip');
const outDir = path.join(__dirname, '..', 'embedded_ext_placeholder');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
} else {
  for (const entry of fs.readdirSync(outDir)) {
    if (entry === '.gitkeep' || entry === 'README.md') continue;
    fs.rmSync(path.join(outDir, entry), { recursive: true, force: true });
  }
}

function extract(zipPath, dirName) {
  if (!fs.existsSync(zipPath)) {
    console.error('Zip not found:', zipPath);
    return;
  }
  const dest = path.join(outDir, dirName);
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(dest, true);
  console.log('Extracted', zipPath, 'to', dest);
}

extract(v2Zip, 'ext_v2');
extract(v3Zip, 'ext_v3');

