#!/usr/bin/env node
"use strict";

const fs = require("fs");

function readNativeMessage() {
  const header = Buffer.alloc(4);
  const bytesRead = fs.readSync(0, header, 0, 4, null);

  if (bytesRead === 0) {
    return null;
  }

  if (bytesRead < 4) {
    throw new Error("Incomplete message length");
  }

  const messageLength = header.readUInt32LE(0);

  if (messageLength === 0) {
    return "";
  }

  const messageBuffer = Buffer.alloc(messageLength);
  let offset = 0;

  while (offset < messageLength) {
    const read = fs.readSync(0, messageBuffer, offset, messageLength - offset, null);
    if (read === 0) {
      throw new Error("Unexpected end of input while reading message body");
    }
    offset += read;
  }

  return messageBuffer.toString("utf8");
}

function writeNativeMessage(message) {
  const payload = Buffer.from(JSON.stringify(message), "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32LE(payload.length, 0);
  fs.writeSync(1, header);
  fs.writeSync(1, payload);
}

function main() {
  const response = { error: "Stub host: CryptoPro not available" };

  try {
    const rawMessage = readNativeMessage();
    if (rawMessage !== null && rawMessage.length > 0) {
      try {
        JSON.parse(rawMessage);
      } catch (parseError) {
        response.details = "Received malformed JSON request";
      }
    } else if (rawMessage === null) {
      response.details = "No request received";
    }
  } catch (error) {
    response.details = `Failed to read request: ${error.message}`;
  }

  try {
    writeNativeMessage(response);
  } catch (error) {
    console.error("Failed to send error response:", error);
    process.exitCode = 1;
    return;
  }

  process.exit(0);
}

main();
