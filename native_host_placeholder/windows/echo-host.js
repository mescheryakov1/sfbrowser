#!/usr/bin/env node
const fs = require('fs');

process.stdin.on('readable', () => {
  let lenBuf = process.stdin.read(4);
  if (!lenBuf) return;
  const len = lenBuf.readUInt32LE(0);
  const dataBuf = process.stdin.read(len);
  if (!dataBuf) return;
  const msg = JSON.parse(dataBuf.toString('utf8'));
  const resp = { text: 'echo:' + (msg.text || '') };
  const respBuf = Buffer.from(JSON.stringify(resp), 'utf8');
  const outLen = Buffer.alloc(4);
  outLen.writeUInt32LE(respBuf.length, 0);
  process.stdout.write(outLen);
  process.stdout.write(respBuf);
});
