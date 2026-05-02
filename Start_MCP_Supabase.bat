@echo off
title Supabase MCP Tunnel (AI Assistant)
color 0A

echo ==========================================================
echo        STARTING SUPABASE MCP TUNNEL (PROXMOX)
echo ==========================================================
echo.
echo Sila masukkan kata laluan untuk pelayan (root@100.78.70.23).
echo Biarkan tetingkap hitam ini sentiasa TERBUKA semasa mengekod bersama AI.
echo Jika anda tutup tetingkap ini, sambungan pangkalan data akan terputus.
echo.

:: Menjalankan arahan SSH Tunnel rahsia kita
ssh -N -L 8080:127.0.0.1:18000 root@100.78.70.23

echo.
echo Terowong telah ditutup.
pause
