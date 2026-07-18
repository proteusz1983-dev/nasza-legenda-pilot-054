@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Nasza Legenda 0.5.4 - nowe dialogi ElevenLabs

echo ============================================================
echo  UZUPELNIANIE GLOSOW PILOTA 0.5.4
echo ============================================================
echo.
echo Generator NIE tworzy ponownie starych scen.
echo Zuzyje kredyty tylko na nowe dialogi pilota.
echo.
echo 1. Skopiuj pelny klucz API ElevenLabs do schowka.
echo 2. Nacisnij dowolny klawisz.
echo.
pause >nul
powershell -NoProfile -ExecutionPolicy Bypass -File ".\tools\run_missing_from_clipboard.ps1"
set "CODE=%ERRORLEVEL%"
echo.
if not "%CODE%"=="0" (
  echo Generator zakonczyl sie kodem %CODE%.
) else (
  echo Nowe dialogi zostaly dodane. Uruchom START_LOCAL.bat.
)
echo.
pause
exit /b %CODE%
