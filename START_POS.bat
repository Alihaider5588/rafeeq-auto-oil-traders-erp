@echo off
TITLE RAFIQ AUTO & OIL TRADERS POS
color 0B

echo =====================================================================
echo           RAFIQ AUTO & OIL TRADERS - LOCAL POS ENGINE
echo =====================================================================
echo.
echo Starting Local Database and API Server...

cd /d "%~dp0backend"

:: Start Node.js backend silently in a background process
start /b "" node dist/server.js > server_output.log 2>&1

:: Wait 2 seconds for server port 5000 to bind
timeout /t 2 /nobreak >nul

echo Server online at http://localhost:5000
echo Launching POS Desktop Interface...

:: Check if Google Chrome exists, open in standalone app mode
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=http://localhost:5000
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app=http://localhost:5000
) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" --app=http://localhost:5000
) else (
    :: Fallback to default system browser
    start http://localhost:5000
)

exit
