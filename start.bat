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

python app.py
if errorlevel 1 pause

