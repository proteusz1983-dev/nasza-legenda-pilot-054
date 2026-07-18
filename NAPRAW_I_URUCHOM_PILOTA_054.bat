@echo off
setlocal
cd /d "%~dp0"
title Nasza Legenda - wymuszenie pilota 0.5.4
cls
echo ============================================================
echo  NASZA LEGENDA - NAPRAWA I START PILOTA 0.5.4
echo ============================================================
echo.
echo Folder projektu:
echo %CD%
echo.
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 tools\force_pilot_054.py
) else (
  python tools\force_pilot_054.py
)
if not "%ERRORLEVEL%"=="0" (
  echo.
  echo NAPRAWA NIE POWIODLA SIE.
  pause
  exit /b 1
)
echo.
echo Uruchamiam osobny serwer pilota na porcie 8154-8164...
if exist "%LocalAppData%\Google\Chrome\User Data\Default\Cache" echo Cache przegladarki nie ma znaczenia - serwer wymusza brak cache.
echo.
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 tools\local_server_pilot_054.py
) else (
  python tools\local_server_pilot_054.py
)
pause
