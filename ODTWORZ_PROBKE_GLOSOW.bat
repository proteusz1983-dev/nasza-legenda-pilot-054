@echo off
cd /d "%~dp0"
set FILE=episodes\signal-spoza-czasu\audio\elevenlabs\casting-preview.mp3
if not exist "%FILE%" (
  echo Nie ma jeszcze probki. Najpierw uruchom GENERUJ_GLOSY_ELEVENLABS.bat.
  pause
  exit /b 1
)
start "" "%FILE%"
