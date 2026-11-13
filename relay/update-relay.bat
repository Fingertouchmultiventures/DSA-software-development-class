@echo off
title Update the LCRM relay and control room files
cd /d "%~dp0"
echo.
echo  This downloads the newest LCRM files from GitHub and replaces the relay
echo  and app files in this folder (your stream key, my-addresses.txt and recordings are kept).
echo  Close the relay window first (press Ctrl+C in it), then press any key here.
echo.
pause
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $t=Join-Path $env:TEMP 'lcrm-update'; if(Test-Path $t){Remove-Item $t -Recurse -Force}; New-Item -ItemType Directory $t | Out-Null; Write-Host 'Downloading...'; Invoke-WebRequest 'https://github.com/Fingertouchmultiventures/lcrm-control-room/archive/refs/heads/main.zip' -OutFile (Join-Path $t 'r.zip'); Expand-Archive (Join-Path $t 'r.zip') -DestinationPath $t -Force; $src=Join-Path $t 'lcrm-control-room-main'; foreach($f in 'server.js','start.bat','start-lan.bat','open-control-room.bat','webm-to-mp4.bat','public-link.bat','Dockerfile'){ if(Test-Path (Join-Path $src ('relay\'+$f))){ Copy-Item (Join-Path $src ('relay\'+$f)) (Get-Location) -Force } }; $app=Join-Path (Split-Path (Get-Location) -Parent) 'app'; New-Item -ItemType Directory -Force $app | Out-Null; Copy-Item (Join-Path $src 'app\*') $app -Recurse -Force; Remove-Item $t -Recurse -Force; Write-Host 'Done.'"
if errorlevel 1 (
  echo.
  echo  The update did not finish. Check that the internet is on and try again.
  pause
  exit /b 1
)
echo.
echo  Updated. Now double-click start.bat again.
pause
