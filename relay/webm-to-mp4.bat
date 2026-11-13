@echo off
rem Drag one or more .webm recordings onto this file. A normal MP4 (that you can scrub and forward) is made next to each one.
rem Needs ffmpeg (the same one start.bat uses).
if "%~1"=="" (
  echo Drag a .webm file onto this file to convert it to MP4.
  pause
  exit /b
)
:next
if "%~1"=="" goto done
echo Converting "%~1" ... a long service can take a few minutes.
ffmpeg -hide_banner -loglevel error -stats -y -fflags +genpts -i "%~1" -vf fps=30 -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -g 60 -af aresample=async=1:first_pts=0 -c:a aac -b:a 160k -ar 48000 -movflags +faststart "%~dpn1.mp4"
if errorlevel 1 (
  echo.
  echo FAILED. Is ffmpeg installed and in PATH? Try typing:  ffmpeg -version
  pause
  exit /b 1
)
echo Done: "%~dpn1.mp4"
shift
goto next
:done
echo.
echo All done.
pause
