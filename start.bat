@echo off
REM ===========================================================================
REM JENEUS HelpDesk — One-Click Startup Script
REM Run this to start Redis, Backend, and Frontend all at once.
REM ===========================================================================
echo ============================================================
echo   JENEUS HelpDesk — Starting All Services...
echo ============================================================

REM 1. Start Redis in WSL
echo [1/3] Starting Redis (WSL)...
wsl -d Ubuntu --user root -- service redis-server start >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   ^> Redis started successfully
) else (
    echo   ^! Could not start Redis. Is WSL/Ubuntu installed?
)

REM 2. Start Backend
echo [2/3] Starting Backend (port 4000)...
start "JENEUS Backend" cmd /c "cd /d "%~dp0backend" && npm run dev"

REM Wait a moment for the backend to initialize
timeout /t 5 /nobreak >nul

REM 3. Start Frontend
echo [3/3] Starting Frontend (port 3000)...
start "JENEUS Frontend" cmd /c "cd /d "%~dp0frontend" && npm run dev"

echo ============================================================
echo   All services starting!
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:4000
echo ============================================================
echo.
echo   Press any key to close this window (services continue running).
pause >nul
