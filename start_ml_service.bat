@echo off
title BabyHealth Guard - AI Neonatal Vision Service
color 0A
cd /d "%~dp0"

echo ====================================================================
echo   BABYHEALTH GUARD - AI NEONATAL VISION SERVICE
echo   Screening Model: BabyHealthGuard-VisionNet v1.0.0
echo   Modalities: Newborn Skin & Eye Clinical Pathology
echo   Gatekeeper: Active (Filters non-baby images)
echo   Localizations: English, Luganda, Swahili
echo ====================================================================
echo.
echo Starting FastAPI service on http://127.0.0.1:8000 ...
echo API Documentation available at: http://127.0.0.1:8000/docs
echo.

where python >nul 2>nul
if %errorlevel% equ 0 (
    python ml_service\app.py
) else (
    if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" (
        "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" ml_service\app.py
    ) else (
        echo Error: Python 3 was not found on your system.
        pause
    )
)

pause
