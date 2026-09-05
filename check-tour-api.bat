@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Running tour API connectivity check...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0check-tour-api.ps1"
echo.
pause