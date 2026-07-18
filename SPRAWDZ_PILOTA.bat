@echo off
chcp 65001 >nul
cd /d "%~dp0"
python ".\tools\check_pilot_054.py"
echo.
pause
