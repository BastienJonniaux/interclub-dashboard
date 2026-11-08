@echo off
title Interclub Dashboard - Dev Launcher
cls
setlocal enabledelayedexpansion

set "ROOT_DIR=%~dp0"
set "FRONT_DIR=%ROOT_DIR%interclub-dashboard"
set "SERVER_DIR=%ROOT_DIR%server"

:: Si un paramètre est passé en ligne de commande (ex: dev front, dev server, dev all)
if /i "%1"=="front" goto RUN_FRONT
if /i "%1"=="server" goto RUN_SERVER
if /i "%1"=="all" goto RUN_ALL

echo ================================================================
echo             CHESS INTERCLUB DASHBOARD - MODE DEV
echo ================================================================
echo.
echo   [1] Tout lancer  (Backend :3001 + Frontend :5173) [Defaut]
echo   [2] Frontend seul (Vite React - localhost:5173)
echo   [3] Backend seul  (Express & Prisma - localhost:3001)
echo.
echo ================================================================
echo.

:: Choix avec 4 secondes de compte à rebours, défaut = 1
choice /C 123 /N /D 1 /T 4 /M "Selectionnez une option (1, 2 ou 3) - Lancement auto de [1] dans 4s: "
set CHOICE_RES=%ERRORLEVEL%

if "%CHOICE_RES%"=="2" goto RUN_FRONT
if "%CHOICE_RES%"=="3" goto RUN_SERVER
goto RUN_ALL

:RUN_ALL
echo.
echo [1/2] Demarrage du Backend (Express + Base Neon) dans une fenetre dediee...
start "Interclub API Server (:3001)" cmd /k "cd /d "%SERVER_DIR%" && npm run dev"
echo.
echo [2/2] Demarrage du Frontend Vite...
cd /d "%FRONT_DIR%"
npm run dev
goto END

:RUN_FRONT
echo.
echo Demarrage du Frontend uniquement (http://localhost:5173)...
cd /d "%FRONT_DIR%"
npm run dev
goto END

:RUN_SERVER
echo.
echo Demarrage du Backend uniquement (http://localhost:3001)...
cd /d "%SERVER_DIR%"
npm run dev
goto END

:END
endlocal
