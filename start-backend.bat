@echo off
setlocal
cd /d "%~dp0backend"

for /f "tokens=5" %%P in ('netstat -ano ^| findstr LISTENING ^| findstr ":8000"') do (
  echo Sentinel backend is already running on http://127.0.0.1:8000
  echo Reusing the existing process instead of starting a second Uvicorn server.
  exit /b 0
)

if exist ".venv\Scripts\python.exe" (
  call .venv\Scripts\python.exe --version 2>&1 | findstr /r /c:"^Python 3\.10\." >nul
  if errorlevel 1 (
    echo The existing backend virtual environment is not Python 3.10 or points to a missing Python installation.
    ren .venv .venv.broken
  )
)

if not exist ".venv\Scripts\python.exe" (
  if exist "%LocalAppData%\Programs\Python\Python310\python.exe" (
    "%LocalAppData%\Programs\Python\Python310\python.exe" -m venv .venv
  ) else (
    py -3.10 -m venv .venv
  )
  if errorlevel 1 (
    echo Python 3.10 is required for the pinned PyTorch environment.
    echo Install it with: winget install Python.Python.3.10
    exit /b 1
  )
)

call .venv\Scripts\python.exe -c "import fastapi, uvicorn, torch, transformers" >nul 2>&1
if errorlevel 1 (
  echo Installing or repairing the pinned Python 3.10 backend dependencies...
  call .venv\Scripts\python.exe -m pip install --upgrade pip
  call .venv\Scripts\python.exe -m pip install -r requirements.txt
  if errorlevel 1 (
    echo Dependency installation failed. Run the pip command again after network access is available.
    exit /b 1
  )
)
call .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
