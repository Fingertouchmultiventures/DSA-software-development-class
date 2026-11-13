@echo off
title Public watch link (Cloudflare tunnel)
cd /d "%~dp0"
echo.
echo  This gives your relay a temporary public https address so people anywhere can watch
echo  the "Public watch stream" (no Facebook). Keep this window open during the service.
echo  Look for the address that ends in  .trycloudflare.com  below, copy it, and paste it in
echo  the control room: Connect phones ^> "Public address of this relay".
echo  A new address is made each time you run this.
echo.
set "CF="
where cloudflared >nul 2>nul && set "CF=cloudflared"
if not defined CF if exist "%~dp0cloudflared.exe" set "CF=%~dp0cloudflared.exe"
if not defined CF if exist "%ProgramFiles(x86)%\cloudflared\cloudflared.exe" set "CF=%ProgramFiles(x86)%\cloudflared\cloudflared.exe"
if not defined CF if exist "%ProgramFiles%\cloudflared\cloudflared.exe" set "CF=%ProgramFiles%\cloudflared\cloudflared.exe"
if defined CF goto run

echo  Downloading cloudflared (one time, about 60 MB, free)...
set TRIES=0
:dl
set /a TRIES+=1
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol='Tls12'; Invoke-WebRequest 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile '%~dp0cloudflared.exe.part' -UseBasicParsing"
if exist "%~dp0cloudflared.exe.part" if %errorlevel%==0 (
  move /y "%~dp0cloudflared.exe.part" "%~dp0cloudflared.exe" >nul
  set "CF=%~dp0cloudflared.exe"
  goto run
)
del "%~dp0cloudflared.exe.part" >nul 2>nul
if %TRIES% LSS 4 (
  echo  The download failed ^(GitHub is busy^). Trying again in 5 seconds... ^(%TRIES%/4^)
  timeout /t 5 >nul
  goto dl
)
echo.
echo  Could not download cloudflared. Check the internet and run this file again in a few minutes.
echo  Manual way: download  cloudflared-windows-amd64.exe  from
echo  https://github.com/cloudflare/cloudflared/releases/latest
echo  rename it to cloudflared.exe and put it in this folder ^(%~dp0^).
pause
exit /b 1

:run
echo  Starting the tunnel... wait a few seconds for the address.
"%CF%" tunnel --url http://localhost:8787
pause
