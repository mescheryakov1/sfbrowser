#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');

const tsconfig = path.join(__dirname, '..', 'tsconfig.json');

if (process.platform === 'win32') {
  const buildStub = spawnSync('npm', ['run', 'build-cryptopro-stub'], {
    stdio: 'inherit',
  });

  if (buildStub.status !== 0) {
    process.exit(buildStub.status ?? 1);
  }
}

const tsc = spawnSync('npx', ['tsc', '-p', tsconfig], { stdio: 'inherit' });
if (tsc.status !== 0) {
  process.exit(tsc.status);
}
const main = path.join(__dirname, '..', 'dist', 'main.js');
spawnSync('npx', ['electron', main], { stdio: 'inherit' });
