@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Nasza Legenda 0.5.4 - aktualizacja pilota

echo ============================================================
echo  NASZA LEGENDA 0.5.4 - AKTUALIZACJA PILOTA
echo ============================================================
echo.
echo Ta poprawka zachowa juz wygenerowane glosy ElevenLabs.
echo Doda druga probe, druga decyzje, 4 zakonczenia i napisy ON/OFF.
echo.

where python >nul 2>nul
if errorlevel 1 (
  echo BLAD: Nie znaleziono Python.
  pause
  exit /b 1
)

python ".\tools\apply_pilot_054.py"
set "CODE=%ERRORLEVEL%"
echo.
if not "%CODE%"=="0" (
  echo Aktualizacja nie powiodla sie.
) else (
  echo Aktualizacja zakonczona.
  echo Teraz skopiuj klucz ElevenLabs do schowka i uruchom:
  echo UZUPELNIJ_GLOSY_PILOTA.bat
)
echo.
pause
exit /b %CODE%
