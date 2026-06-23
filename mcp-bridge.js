#!/usr/bin/env node
/**
 * mcp-bridge.js — JPP Polisas MCP Bridge (Windows local → Tailscale remote)
 *
 * Fungsi: Forward stdio JSON-RPC dari local AI client (Antigravity/Cursor)
 *         ke remote HTTP/SSE MCP server (100.104.229.84:8080/mcp via Tailscale)
 *         sambil menyuntik header X-API-Key (standard MCP config tak support).
 *
 * Cara guna dalam mcp_config.json:
 *   "jpp-postgres-remote": {
 *     "command": "node",
 *     "args": ["C:/Users/Cyborg 15/Desktop/JPP-POLISAS-main/mcp-bridge.js"]
 *   }
 *
 * Requires: Node.js 18+ (global fetch + AbortController)
 * Debug:    Set JPP_BRIDGE_DEBUG=1 untuk lihat logs kat stderr
 */

import fs from 'fs';
import path from 'path';

const REMOTE_URL = "http://100.104.229.84:8080/mcp";
const API_KEY    = "8dfbc8cc6be3930e6127089cfa35cbd350573732856ced96460455bdf1c5052b";
const DEBUG      = process.env.JPP_BRIDGE_DEBUG === "1";

// ---------- Logging ke STDERR (supaya tak ganggu JSON-RPC kat stdout) ----------
function log(...args) {
  if (DEBUG) {
    const ts = new Date().toISOString().slice(11, 23);
    process.stderr.write(`[${ts}] [mcp-bridge] ${args.join(" ")}\n`);
  }
}

// ---------- POST JSON-RPC ke remote MCP server (return parsed JSON-RPC) ----------
async function forwardToRemote(message) {
  log("→ POST", JSON.stringify(message).slice(0, 200));

  const response = await fetch(REMOTE_URL, {
    method: "POST",
    headers: {
      "X-API-Key":   API_KEY,
      "Accept":      "application/json, text/event-stream",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(message)
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
  }

  // Parse SSE response — format: "event: message\ndata: {json}\n\n"
  const text = await response.text();
  log("← SSE:", text.slice(0, 300).replace(/\n/g, " | "));

  const lines = text.split("\n");
  let dataLine = null;
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      dataLine = line.slice(6).trim();
      break;
    }
  }
  if (!dataLine) throw new Error("No 'data:' line in SSE response");
  return JSON.parse(dataLine);
}

// ---------- Detect framing style dari first message ----------
// MCP supports 2 framing: LSP-style Content-Length ATAU newline-delimited JSON
let useContentLength = null;

let activeRequests = 0;
let stdinClosed = false;

function checkExit() {
  if (stdinClosed && activeRequests === 0) {
    log("stdin closed and all requests completed, exiting");
    process.exit(0);
  }
}

// ---------- Handle single JSON-RPC message ----------
async function handleMessage(messageStr) {
  activeRequests++;
  let origId = null;
  try {
    const parsed = JSON.parse(messageStr);
    origId = parsed.id ?? null;
    const response = await forwardToRemote(parsed);
    sendMessage(response);
  } catch (err) {
    log("ERROR:", err.message);
    sendMessage({
      jsonrpc: "2.0",
      id: origId,
      error: { code: -32603, message: "Bridge error: " + err.message }
    });
  } finally {
    activeRequests--;
    checkExit();
  }
}

// ---------- Send JSON-RPC ke stdout (matching detected framing) ----------
function sendMessage(message) {
  const body = JSON.stringify(message);
  if (useContentLength) {
    const header = `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n`;
    process.stdout.write(header + body);
  } else {
    process.stdout.write(body + '\n');
  }
}

let inputBuffer = "";
process.stdin.on("data", (chunk) => {
  inputBuffer += chunk.toString();
  while (true) {
    let consumed = 0;
    let messageStr = "";

    if (useContentLength === null) {
      // Detect framing style on first chunk
      if (inputBuffer.startsWith("Content-Length:")) {
        useContentLength = true;
      } else if (inputBuffer.trim().startsWith("{")) {
        useContentLength = false;
      } else {
        break; // Wait for more data to detect
      }
    }

    if (useContentLength) {
      const headerEnd = inputBuffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) break;

      const lengthMatch = inputBuffer
        .slice(0, headerEnd)
        .match(/Content-Length:\s*(\d+)/i);
      if (!lengthMatch) break;

      const contentLength = parseInt(lengthMatch[1]);
      const bodyStart     = headerEnd + 4;

      if (inputBuffer.length < bodyStart + contentLength) break;

      messageStr = inputBuffer.slice(bodyStart, bodyStart + contentLength);
      consumed   = bodyStart + contentLength;
    } else {
      // Newline-delimited JSON
      const newlineIdx = inputBuffer.indexOf("\n");
      if (newlineIdx === -1) break;

      messageStr = inputBuffer.slice(0, newlineIdx).trim();
      consumed   = newlineIdx + 1;
    }

    inputBuffer = inputBuffer.slice(consumed);
    if (messageStr) handleMessage(messageStr);
  }
});

process.stdin.on("end", () => {
  log("stdin closed, waiting for active requests to finish");
  stdinClosed = true;
  checkExit();
});

process.on("SIGTERM", () => { log("SIGTERM, exiting"); process.exit(0); });
process.on("SIGINT",  () => { log("SIGINT, exiting");  process.exit(0); });

log(`mcp-bridge.js started → ${REMOTE_URL}`);
log(`Debug mode: ${DEBUG ? "ON" : "OFF"} (set JPP_BRIDGE_DEBUG=1 to enable)`);
