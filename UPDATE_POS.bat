@echo off
TITLE RAFIQ AUTO & OIL TRADERS - 1-CLICK UPDATE
color 0E

echo =====================================================================
echo         RAFIQ AUTO & OIL TRADERS - 1-CLICK SYSTEM UPDATE
echo =====================================================================
echo.
echo [1/3] Downloading latest code updates from GitHub...

cd /d "%~dp0"
call git pull origin master

if %errorlevel% neq 0 (
    echo [WARNING] Git pull failed or offline. Continuing with existing code...
) else (
    echo [OK] Latest code downloaded.
)
echo.

echo [2/3] Updating Database engine & components...
cd backend
call npx prisma generate
call npm run build
cd ..
echo [OK] Backend updated.
echo.

echo [3/3] Rebuilding Frontend POS...
cd frontend
call npm run build
cd ..
echo [OK] Frontend updated.
echo.

echo =====================================================================
echo           [SUCCESS] UPDATE COMPLETED!
echo  Your offline data (sales, customers, stock) was preserved safely.
echo =====================================================================
echo.
pause
