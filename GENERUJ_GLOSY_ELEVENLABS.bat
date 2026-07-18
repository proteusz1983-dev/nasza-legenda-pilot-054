@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Nasza Legenda - ElevenLabs v3 Dialogue

 echo ============================================================
 echo  NASZA LEGENDA 0.5.3 - GENERATOR ELEVENLABS V3 DIALOGUE
 echo ============================================================
 echo.
 echo 1. W panelu ElevenLabs kliknij Copy przy pelnym kluczu API.
 echo 2. Wroc tutaj i nacisnij dowolny klawisz.
 echo 3. Generator sam pobierze klucz ze schowka Windows.
 echo.
 echo Klucz nie bedzie pokazany ani zapisany w pliku.
 echo Po odczytaniu schowek zostanie wyczyszczony.
 echo.

where python >nul 2>nul
if errorlevel 1 (
  echo BLAD: Nie znaleziono polecenia python.
  echo Zainstaluj Python albo uruchom na komputerze, na ktorym dzialaly poprzednie wersje.
  pause
  exit /b 1
)

where powershell >nul 2>nul
if errorlevel 1 (
  echo BLAD: Nie znaleziono Windows PowerShell.
  pause
  exit /b 1
)

pause >nul
powershell -NoProfile -ExecutionPolicy Bypass -File ".\tools\run_generator_from_clipboard.ps1"
set "CODE=%ERRORLEVEL%"

echo.
if not "%CODE%"=="0" (
  echo Generator zakonczyl sie kodem %CODE%.
  echo.
  echo Najczestsze przyczyny:
  echo - skopiowano nazwe lub zamaskowany klucz zamiast pelnego klucza,
  echo - klucz zostal usuniety albo wygasl,
  echo - klucz nie ma uprawnien Text to Speech / Voices.
) else (
  echo Dialogi zostaly dodane do aplikacji.
)
echo.
pause
exit /b %CODE%
