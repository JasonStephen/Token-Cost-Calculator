@echo off
setlocal
cd /d "%~dp0"

python -c "import webview" >nul 2>&1
if errorlevel 1 (
    echo Installing required dependency...
    python -m pip install -r requirements.txt
    if errorlevel 1 (
        echo.
        echo Failed to install dependencies. Check that Python is installed and available in PATH.
        pause
        exit /b 1
    )
)

for /f "usebackq delims=" %%I in (`python -c "import os, sys; print(os.path.join(os.path.dirname(sys.executable), 'pythonw.exe'))"`) do set "PYTHONW=%%I"

if exist "%PYTHONW%" (
    start "" "%PYTHONW%" "%~dp0app.py" --devtools
    exit /b 0
)

rem Fallback for Python installations without pythonw.exe.
start "" /b python "%~dp0app.py" --devtools
exit /b 0
