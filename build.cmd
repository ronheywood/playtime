@echo off
REM PlayTime build script for Command Prompt
REM This is a wrapper around the PowerShell build script

setlocal enabledelayedexpansion

echo 🎵 PlayTime Build Script (Command Prompt Wrapper)
echo ================================================

REM Check if PowerShell is available
where pwsh >nul 2>nul
if %errorlevel% equ 0 (
    set POWERSHELL=pwsh
) else (
    where powershell >nul 2>nul
    if %errorlevel% equ 0 (
        set POWERSHELL=powershell
    ) else (
        echo ❌ PowerShell not found. Please install PowerShell.
        pause
        exit /b 1
    )
)

REM Parse command line arguments
set TASK=%1
if "%TASK%"=="" set TASK=Default

echo 🚀 Running task: %TASK%
echo.

REM Run the PowerShell build script
%POWERSHELL% -ExecutionPolicy Bypass -File "%~dp0build.ps1" -Task %TASK%

if %errorlevel% equ 0 (
    echo.
    echo ✅ Build completed successfully!
) else (
    echo.
    echo ❌ Build failed with exit code %errorlevel%
    pause
)

endlocal
