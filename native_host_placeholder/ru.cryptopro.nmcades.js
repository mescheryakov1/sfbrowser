#!/usr/bin/env node
'use strict';

/**
 * Minimal native messaging host placeholder for ru.cryptopro.nmcades.
 * It reads a single Chrome Native Messaging request and immediately
 * responds with an explanatory error so the extension does not time out.
 */

const { stdin, stdout, stderr } = process;

function sendMessage(message) {
  try {
    const payload = Buffer.from(JSON.stringify(message), 'utf8');
    const header = Buffer.alloc(4);
    header.writeUInt32LE(payload.length, 0);
    stdout.write(header);
    stdout.write(payload);
  } catch (error) {
    stderr.write(`Failed to send response: ${error}\n`);
  }
}

let buffer = Buffer.alloc(0);

function processBuffer() {
  while (buffer.length >= 4) {
    const length = buffer.readUInt32LE(0);
    if (buffer.length < 4 + length) {
      return;
    }
    const body = buffer.subarray(4, 4 + length);
    buffer = buffer.subarray(4 + length);

    let request;
    try {
      request = JSON.parse(body.toString('utf8'));
    } catch (error) {
      sendMessage({
        success: false,
        error: 'Invalid JSON received by ru.cryptopro.nmcades placeholder',
        details: String(error)
      });
      continue;
    }

    sendMessage({
      success: false,
      error: 'ru.cryptopro.nmcades native host placeholder',
      details: 'CryptoPro native messaging functionality is not implemented in this build.',
      request
    });
  }
}

stdin.on('data', chunk => {
  buffer = Buffer.concat([buffer, chunk]);
  processBuffer();
});

stdin.on('end', () => {
  process.exit(0);
});

stdin.on('error', error => {
  stderr.write(`stdin error: ${error}\n`);
  process.exit(1);
});

stdout.on('error', error => {
  stderr.write(`stdout error: ${error}\n`);
  process.exit(1);
});

stdin.resume();
