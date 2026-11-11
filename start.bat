@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install the LTS version from https://nodejs.org and try again.
  pause
  exit /b 1
)

node scripts\check-node.js
if errorlevel 1 (
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing packages. This needs internet access and takes a few minutes the first time.
  call npm ci
  if errorlevel 1 (
    echo Install failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

call npm start
