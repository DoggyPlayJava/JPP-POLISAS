@echo off
title Supabase MCP Tunnel (AI Assistant)
color 0A

echo ==========================================================
echo        STARTING SUPABASE MCP TUNNEL (PROXMOX)
echo ==========================================================
echo.
echo Sila masukkan kata laluan untuk pelayan (root@192.168.0.20).
echo Biarkan tetingkap hitam ini sentiasa TERBUKA semasa mengekod bersama AI.
echo Jika anda tutup tetingkap ini, sambungan pangkalan data akan terputus.
echo.

:: Menjalankan arahan SSH Tunnel rahsia kita
ssh -N -L 8080:10.0.2.13:8000 root@192.168.0.20

echo.
echo Terowong telah ditutup.
pause
