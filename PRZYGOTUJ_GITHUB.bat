@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title NASZA LEGENDA 0.5.4 - PRZYGOTUJ GITHUB

cd /d "%~dp0"
set "ROOT=%CD%"
set "OUT=%ROOT%\DEPLOY_GITHUB_054"

echo ============================================================
echo  NASZA LEGENDA 0.5.4 - PRZYGOTOWANIE PACZKI NA GITHUB
echo ============================================================
echo.

set "ERRORS=0"

for %%F in (index.html app.js styles.css manifest.webmanifest sw.js) do (
  if not exist "%ROOT%\%%F" (
    echo [BRAK] %%F
    set /a ERRORS+=1
  ) else (
    echo [OK]   %%F
  )
)

if not exist "%ROOT%\episodes\signal-spoza-czasu\story-graph.json" (
  echo [BRAK] episodes\signal-spoza-czasu\story-graph.json
  set /a ERRORS+=1
) else (
  echo [OK]   story-graph.json
)

if not exist "%ROOT%\episodes\signal-spoza-czasu\scenes\intro.mp4" (
  echo [BRAK] intro.mp4
  set /a ERRORS+=1
) else (
  echo [OK]   intro.mp4
)

set "MP3COUNT=0"
for /f %%A in ('dir /b /a-d "%ROOT%\episodes\signal-spoza-czasu\audio\elevenlabs\*.mp3" 2^>nul ^| find /c /v ""') do set "MP3COUNT=%%A"
echo [INFO] Nagrania ElevenLabs MP3: !MP3COUNT!

if !ERRORS! GTR 0 (
  echo.
  echo Nie przygotowano paczki. Uruchom ten plik w GLOWNYM folderze
  echo dzialajacego pilota, obok index.html i app.js.
  echo.
  pause
  exit /b 1
)

echo.
echo Tworze czysty folder do wyslania...
if exist "%OUT%" rmdir /s /q "%OUT%"
mkdir "%OUT%" >nul

copy /y "%ROOT%\index.html" "%OUT%\" >nul
copy /y "%ROOT%\app.js" "%OUT%\" >nul
copy /y "%ROOT%\styles.css" "%OUT%\" >nul
copy /y "%ROOT%\manifest.webmanifest" "%OUT%\" >nul
copy /y "%ROOT%\sw.js" "%OUT%\" >nul

if exist "%ROOT%\logo.svg" copy /y "%ROOT%\logo.svg" "%OUT%\" >nul
if exist "%ROOT%\icons" xcopy "%ROOT%\icons" "%OUT%\icons\" /E /I /Y /Q >nul
xcopy "%ROOT%\episodes" "%OUT%\episodes\" /E /I /Y /Q >nul

type nul > "%OUT%\.nojekyll"

(
  echo NASZA LEGENDA 0.5.4 - PACZKA GITHUB
  echo.
  echo Wygenerowano: %DATE% %TIME%
  echo Nagrania ElevenLabs MP3: !MP3COUNT!
  echo.
  echo Wgraj ZAWARTOSC tego folderu do repozytorium.
  echo Nie wgrywaj folderu jako jednego dodatkowego poziomu.
  echo index.html musi byc widoczny w katalogu glownym repozytorium.
) > "%OUT%\DEPLOY-INFO.txt"

echo.
echo ============================================================
echo  GOTOWE
echo ============================================================
echo Folder:
echo %OUT%
echo.
echo W GitHub wgraj ZAWARTOSC folderu DEPLOY_GITHUB_054.
echo API key ElevenLabs NIE zostal skopiowany.
echo.
start "" explorer "%OUT%"
pause
