import fs from 'fs';
import path from 'path';

const REMOTE_URL = "http://100.104.229.84:8080/mcp";
const API_KEY    = "8dfbc8cc6be3930e6127089cfa35cbd350573732856ced96460455bdf1c5052b";

async function runMcpTool(toolName, args = {}) {
  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: toolName,
      arguments: args
    }
  };

  const response = await fetch(REMOTE_URL, {
    method: "POST",
    headers: {
      "X-API-Key":   API_KEY,
      "Accept":      "application/json, text/event-stream",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
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
  if (!dataLine) throw new Error("No data in response");
  const parsed = JSON.parse(dataLine);
  if (parsed.error) {
    throw new Error(parsed.error.message || JSON.stringify(parsed.error));
  }
  return parsed.result;
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error("Please provide the migration file path.");
    process.exit(1);
  }
  const migFile = path.resolve(fileArg);
  console.log("Reading migration from:", migFile);
  const sql = fs.readFileSync(migFile, 'utf8');

  console.log("Applying SQL to remote database...");
  try {
    const result = await runMcpTool("query", { sql });
    console.log("Success!");
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Failed to apply migration:", err.message);
  }
}

main().catch(console.error);
