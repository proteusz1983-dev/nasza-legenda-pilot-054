@echo off
setlocal
cd /d "%~dp0"
cls
echo ============================================================
echo  KONTROLA PILOTA 0.5.4
 echo ============================================================
echo Folder: %CD%
echo.
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 tools\force_pilot_054.py
) else (
  python tools\force_pilot_054.py
)
echo.
findstr /C:"0.5.4-pilot-audiofix" app.js >nul
if %errorlevel%==0 (echo app.js: PILOT 0.5.4 OK) else (echo app.js: ZLA WERSJA)
findstr /C:"lightTask" app.js >nul
if %errorlevel%==0 (echo drugie zadanie w app.js: JEST) else (echo drugie zadanie w app.js: BRAK)
findstr /C:"finalChoice" app.js >nul
if %errorlevel%==0 (echo druga decyzja w app.js: JEST) else (echo druga decyzja w app.js: BRAK)
echo.
pause
