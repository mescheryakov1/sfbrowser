#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');

const tsconfig = path.join(__dirname, '..', 'tsconfig.json');
const tsc = spawnSync('npx', ['tsc', '-p', tsconfig], { stdio: 'inherit' });
if (tsc.status !== 0) {
  process.exit(tsc.status);
}
const main = path.join(__dirname, '..', 'dist', 'main.js');
spawnSync('npx', ['electron', main], { stdio: 'inherit' });
