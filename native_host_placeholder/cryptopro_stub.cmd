@echo off
setlocal enabledelayedexpansion
set SCRIPT_DIR=%~dp0
set NODE_STUB=

rem Prefer Node.js located next to this script (portable deployments)
if exist "%SCRIPT_DIR%node.exe" (
  set "NODE_STUB=%SCRIPT_DIR%node.exe"
) else (
  for /f "usebackq delims=" %%I in (`where node 2^>nul`) do (
    if not defined NODE_STUB set "NODE_STUB=%%I"
  )
)

if not defined NODE_STUB (
  echo Native host stub failed: Node.js runtime was not found.>&2
  exit /b 1
)

"%NODE_STUB%" "%SCRIPT_DIR%cryptopro_stub.js"
exit /b %errorlevel%
