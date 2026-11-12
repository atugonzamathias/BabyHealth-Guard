@echo off
title BabyHealth Guard - Digital Maternal and Newborn Healthcare Platform
color 0B
cd /d "%~dp0"

echo ====================================================================
echo   BABYHEALTH GUARD - UGANDA MoH DIGITAL PLATFORM
echo   2G GSM Telecom Gateway: USSD (*920#) and Two-Way SMS Engine
echo   Zero-Cost Sandbox Mode Active: Real money disabled (0 UGX)
echo ====================================================================
echo.
echo Starting BabyHealth Guard server on http://localhost:8080/ ...
echo Your web browser will open automatically.
echo (Keep this black window open while using the platform)
echo.

where python >nul 2>nul
if %errorlevel% equ 0 (
    python server.py
) else (
    if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" (
        "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" server.py
    ) else (
        echo Error: Python was not found on your system.
        echo Please ensure Python is installed and added to PATH.
        pause
    )
)

if %errorlevel% neq 0 (
    echo.
    echo Server process ended.
    pause
)
