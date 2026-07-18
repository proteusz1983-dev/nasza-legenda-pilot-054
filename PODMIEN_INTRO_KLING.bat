@echo off
setlocal
cd /d "%~dp0"
set "TARGET=%~dp0..\episodes\signal-spoza-czasu\scenes\intro.mp4"
if not exist "%~dp0episodes\signal-spoza-czasu\scenes\intro.mp4" (
  echo BLAD: Brak filmu w paczce.
  pause
  exit /b 1
)
if not exist "%~dp0..\episodes\signal-spoza-czasu\scenes" (
  echo Nie znaleziono projektu katalog wyzej.
  echo Najlatwiej skopiuj folder episodes recznie do glownego folderu projektu.
  pause
  exit /b 1
)
copy /Y "%~dp0episodes\signal-spoza-czasu\scenes\intro.mp4" "%TARGET%" >nul
if errorlevel 1 (
  echo BLAD kopiowania.
  pause
  exit /b 1
)
echo GOTOWE: podmieniono intro.mp4 w projekcie.
pause
