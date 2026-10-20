@echo off
setlocal enabledelayedexpansion
title RAFIQ AUTO ^& OIL TRADERS ERP LAUNCHER

echo ===================================================
echo   RAFIQ AUTO ^& OIL TRADERS ERP ^& POS SYSTEM
echo   رفیق آٹو اینڈ آئل ٹریڈرز - اوکاڑہ
echo   54-Stop Near MCB Bank, Dipalpur Road, Okara
echo   0306-9258573 / 0327-7497457
echo ===================================================

:: Ensure node is in PATH
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=C:\Program Files\nodejs;%PATH%"
    ) else if exist "%LOCALAPPDATA%\Programs\node\node.exe" (
        set "PATH=%LOCALAPPDATA%\Programs\node;%PATH%"
    )
)

:: Clear old processes on port 5000 and 5173 if stuck
echo [Checking Ports] Closing any old hanging sessions on 5000 / 5173...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5000\>"') do (
    taskkill /f /pid %%a >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173\>"') do (
    taskkill /f /pid %%a >nul 2>nul
)

cd /d "%~dp0"

echo [1/2] Launching Backend Server (Port 5000)...
cd /d "%~dp0backend"
start "Rafiq ERP Backend (Port 5000)" cmd /k "npm run dev"

echo [2/2] Launching Frontend POS ^& Dashboard (Port 5173)...
cd /d "%~dp0frontend"
start "Rafiq ERP Frontend (Port 5173)" cmd /k "npm run dev"

cd /d "%~dp0"

echo.
echo Waiting for servers to initialize...
ping 127.0.0.1 -n 4 >nul

:: Detect local IPv4 address
set "LOCAL_IP=localhost"
for /f "tokens=4" %%i in ('route print ^| findstr 0.0.0.0 ^| findstr /v "0.0.0.0.*0.0.0.0.*0.0.0.0"') do (
    if "%%i" neq "0.0.0.0" set "LOCAL_IP=%%i"
)
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        set "LOCAL_IP=%%b"
    )
)

echo.
echo ===================================================
echo Applications launched successfully!
echo.
echo [1] ON THIS COMPUTER (System/PC):
echo     http://localhost:5173
echo.
echo [2] ON MOBILE OR OTHER LAPTOP (Same Wi-Fi / Hotspot):
echo     http://%LOCAL_IP%:5173
echo.
echo - Backend API: http://localhost:5000 (Network: http://%LOCAL_IP%:5000)
echo ===================================================
echo.
echo Login Credentials:
echo Admin (Proprietors): admin    / Admin@123
echo Operator:            operator / Operator@123
echo Cashier:             cashier  / Cashier@123
echo Salesman:            salesman / Salesman@123
echo ===================================================
echo.
echo Opening Frontend in default browser...
start http://localhost:5173
echo.
echo System is running. Press any key to exit this launcher window (Servers will stay open in their own windows).
pause
