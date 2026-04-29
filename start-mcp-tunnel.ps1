# start-mcp-tunnel.ps1
# Connects to the PERMANENT Kong forwarder on port 18000 (never changes)
# Run this whenever the MCP connection breaks

$SSH_HOST = "root@192.168.0.20"
$REMOTE_PORT = 18000   # Fixed port - socat systemd service on server
$LOCAL_PORT = 8080

Write-Host "🧹 Clearing old SSH tunnels..." -ForegroundColor Yellow
Get-Process -Name "ssh" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

Write-Host "🚀 Starting tunnel: localhost:$LOCAL_PORT -> server:$REMOTE_PORT (Kong)" -ForegroundColor Cyan
Start-Process -NoNewWindow -FilePath "ssh" -ArgumentList "-N -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -L ${LOCAL_PORT}:127.0.0.1:${REMOTE_PORT} $SSH_HOST"

Start-Sleep -Seconds 3

if (Get-Process -Name "ssh" -ErrorAction SilentlyContinue) {
    Write-Host "✅ MCP tunnel is running!" -ForegroundColor Green
    Write-Host "   Endpoint: http://localhost:$LOCAL_PORT/mcp" -ForegroundColor Gray
    Write-Host "   (This tunnel uses the permanent port - no IP hunting needed)" -ForegroundColor Gray
} else {
    Write-Host "❌ Tunnel failed. Check SSH connection to $SSH_HOST" -ForegroundColor Red
}
