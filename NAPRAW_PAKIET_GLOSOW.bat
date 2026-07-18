@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo  NASZA LEGENDA 0.5.4 - NAPRAWA PAKIETU GLOSOWEGO
echo ============================================================
echo.
python ".\tools\repair_audio_pack.py"
set "CODE=%ERRORLEVEL%"
echo.
if "%CODE%"=="2" (
  echo Naprawa zakonczona. Istniejace MP3 zostaly podpiete do grafu.
  echo Uruchom teraz UZUPELNIJ_GLOSY_PILOTA.bat - pobierze tylko brakujacy plik.
) else if "%CODE%"=="0" (
  echo Wszystkie nagrania sa na miejscu. Uruchom SPRAWDZ_PILOTA.bat.
) else (
  echo Wystapil blad naprawy.
)
echo.
pause
exit /b %CODE%
