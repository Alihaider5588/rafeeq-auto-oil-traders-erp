@echo off
TITLE RAFIQ AUTO & OIL TRADERS - 1-CLICK LOCAL SETUP
color 0A

echo =====================================================================
echo      RAFIQ AUTO & OIL TRADERS - LOCAL POS SETUP WIZARD
echo            (Automated Shop Computer Installation)
echo =====================================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is NOT installed on this computer!
    echo Please download and install Node.js (LTS version) from https://nodejs.org
    echo Then run this setup file again.
    echo.
    pause
    exit /b
)

echo [1/5] Node.js detected successfully.
node -v
echo.

:: 2. Configure Backend .env for Local-First Offline Mode
echo [2/5] Setting up local environment configuration...
if not exist "backend\.env" (
    echo PORT=5000 > backend\.env
    echo NODE_ENV=production >> backend\.env
    echo USE_POSTGRES=false >> backend\.env
    echo DATABASE_URL="file:./prisma/dev.db" >> backend\.env
    echo NEON_DATABASE_URL="postgresql://neondb_owner:npg_9zmiRB6pFnXJ@ep-dark-smoke-a1djas7u-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" >> backend\.env
    echo JWT_SECRET="rafeeque_super_secure_jwt_secret_token_key_2026_oil_traders" >> backend\.env
    echo [OK] Created backend\.env configured for Local SQLite + Neon Sync.
) else (
    echo [OK] backend\.env already exists.
)
echo.

:: 3. Install Backend Dependencies & Generate Database Client
echo [3/5] Installing Backend components and SQLite engine...
cd backend
call npm install --omit=dev --silent
call npx prisma generate
cd ..
echo [OK] Database engine ready.
echo.

:: 4. Build Frontend for Local Standalone Production Serving
echo [4/5] Preparing POS Frontend interface...
if not exist "frontend\dist" (
    cd frontend
    call npm install --silent
    call npm run build
    cd ..
    echo [OK] Frontend build completed.
) else (
    echo [OK] Frontend production build already exists.
)
echo.

:: 5. Create Desktop Shortcut for Operator
echo [5/5] Creating Desktop Application Shortcut...
set SCRIPT_DIR=%~dp0
set TARGET_BAT=%SCRIPT_DIR%START_POS.bat
set SHORTCUT_PATH=%USERPROFILE%\Desktop\Rafiq Auto POS.lnk

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%TARGET_BAT%'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.WindowStyle = 7; $s.Save()"

echo.
echo =====================================================================
echo     [SUCCESS] SETUP COMPLETED SUCCESSFULLY!
echo =====================================================================
echo.
echo Desktop shortcut created: "Rafiq Auto POS"
echo You can now double-click "START_POS.bat" or the Desktop icon to run the POS.
echo.
pause
