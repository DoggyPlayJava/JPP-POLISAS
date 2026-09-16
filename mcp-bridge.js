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

const TARGETS = {
  ro: {
    endpoints: [
      {
        url: "http://100.104.229.84:8080/mcp",
        key: "8dfbc8cc6be3930e6127089cfa35cbd350573732856ced96460455bdf1c5052b",
        name: "Tailscale-RO"
      },
      {
        url: "http://192.168.0.45:8080/mcp",
        key: "3790e66cdbe2d6a675a785b388f9b1f85e6f0ed380444f93810471d13bac88d3",
        name: "LAN-RO"
      }
    ]
  },
  rw: {
    endpoints: [
      {
        url: "http://100.104.229.84:8080/mcp",
        key: "8dfbc8cc6be3930e6127089cfa35cbd350573732856ced96460455bdf1c5052b",
        name: "Tailscale-RW"
      },
      {
        url: "http://192.168.0.45:8081/mcp",
        key: "65b267b068927d6a841b4918f3703ec2c397dd76833ae933c80f970955489879",
        name: "LAN-RW"
      }
    ]
  }
};

const modeArg = (process.argv[2] || process.env.MCP_MODE || "rw").toLowerCase();
let targetEndpoints = [];

if (modeArg.startsWith("http://") || modeArg.startsWith("https://")) {
  targetEndpoints = [{
    url: modeArg,
    key: process.argv[3] || process.env.MCP_API_KEY || "",
    name: "Custom"
  }];
} else if (modeArg === "ro" || modeArg === "--ro") {
  targetEndpoints = TARGETS.ro.endpoints;
} else {
  // Default to RW
  targetEndpoints = TARGETS.rw.endpoints;
}

const DEBUG = process.env.JPP_BRIDGE_DEBUG === "1";

// ---------- Logging ke STDERR (supaya tak ganggu JSON-RPC kat stdout) ----------
function log(...args) {
  if (DEBUG) {
    const ts = new Date().toISOString().slice(11, 23);
    process.stderr.write(`[${ts}] [mcp-bridge] ${args.join(" ")}\n`);
  }
}

let currentEndpointIndex = 0;

async function sendToEndpoint(endpoint, message) {
  log(`→ POST [${endpoint.name}] ${endpoint.url}`, JSON.stringify(message).slice(0, 160));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "X-API-Key":   endpoint.key,
        "Accept":      "application/json, text/event-stream",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(message),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
    }

    const text = await response.text();
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
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------- POST JSON-RPC ke remote MCP server (dengan automatic failover) ----------
async function forwardToRemote(message) {
  let lastError = null;

  for (let i = 0; i < targetEndpoints.length; i++) {
    const idx = (currentEndpointIndex + i) % targetEndpoints.length;
    const ep = targetEndpoints[idx];

    try {
      const res = await sendToEndpoint(ep, message);
      currentEndpointIndex = idx;
      return res;
    } catch (err) {
      lastError = err;
      log(`[${ep.name}] Error: ${err.message}. Trying next fallback...`);
    }
  }

  throw lastError;
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

log(`mcp-bridge.js started in [${modeArg}] mode. Available endpoints: ${targetEndpoints.map(e => e.name + " (" + e.url + ")").join(", ")}`);
log(`Debug mode: ${DEBUG ? "ON" : "OFF"} (set JPP_BRIDGE_DEBUG=1 to enable)`);

