@echo off
TITLE RAFIQ AUTO & OIL TRADERS POS
color 0B

echo =====================================================================
echo           RAFIQ AUTO & OIL TRADERS - LOCAL POS ENGINE
echo =====================================================================
echo.
echo Starting Local Database and API Server...

cd /d "%~dp0backend"

:: Check if port 5000 is already running
netstat -ano | findstr :5000 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo Starting Local Database and API Server...
    start /b "" node dist/server.js > server_output.log 2>&1
    timeout /t 2 /nobreak >nul
) else (
    echo Local POS Server is already running.
)

echo.
echo Launching POS Desktop Interface...

:: Check if Google Chrome exists, open in standalone app mode
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=http://localhost:5000/login
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app=http://localhost:5000/login
) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" --app=http://localhost:5000/login
) else if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:5000/login
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:5000/login
) else (
    :: Fallback to default system browser
    start http://localhost:5000/login
)

exit
