@echo off
setlocal
cd /d "%~dp0extension"
call npm.cmd install
call npm.cmd run build
if errorlevel 1 (
  echo The first Vite build attempt failed; retrying once after esbuild startup cleanup.
  call npm.cmd run build
  if errorlevel 1 exit /b %errorlevel%
)
echo Extension built at %cd%\dist
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$root = Split-Path -Parent '%cd%'; $zip = Join-Path $root 'sentinel-extension-0.1.0.zip'; if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }; Compress-Archive -Path '%cd%\dist\*' -DestinationPath $zip -Force; Write-Host ('Packaged extension at ' + $zip)"
if errorlevel 1 exit /b %errorlevel%
