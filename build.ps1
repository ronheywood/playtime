#!/usr/bin/env pwsh
<#
.SYNOPSIS
    PlayTime build script wrapper for PSake

.DESCRIPTION
    This script provides an easy way to run PSake tasks for the PlayTime music practice app.
    It will install PSake if needed and run the specified task.

.PARAMETER Task
    The PSake task to run. Use 'Help' to see available tasks.

.PARAMETER InstallPSake
    Install PSake module if it's not already installed.

.EXAMPLE
    .\build.ps1
    Runs the default task (Test)

.EXAMPLE
    .\build.ps1 -Task Dev
    Starts the development environment

.EXAMPLE
    .\build.ps1 -Task Watch
    Runs tests in watch mode

.EXAMPLE
    .\build.ps1 -Task Help
    Shows available tasks
#>

[CmdletBinding()]
param(
    [string]$Task = "Default",
    [switch]$InstallPSake
)

# Ensure we're in the script directory
Set-Location $PSScriptRoot

Write-Host "🎵 PlayTime Build Script" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

# Check if PSake is installed
$psakeInstalled = $false
try {
    Import-Module psake -ErrorAction Stop
    $psakeInstalled = $true
    Write-Host "✅ PSake module found" -ForegroundColor Green
}
catch {
    Write-Host "❌ PSake module not found" -ForegroundColor Red
}

# Install PSake if needed
if (-not $psakeInstalled -or $InstallPSake) {
    Write-Host "📦 Installing PSake module..." -ForegroundColor Yellow
    
    try {
        # Try to install for current user first
        Install-Module psake -Scope CurrentUser -Force -ErrorAction Stop
        Write-Host "✅ PSake installed successfully" -ForegroundColor Green
        Import-Module psake
    }
    catch {
        Write-Host "❌ Failed to install PSake: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "💡 Try running as administrator or install manually:" -ForegroundColor Yellow
        Write-Host "   Install-Module psake -Scope CurrentUser" -ForegroundColor Gray
        exit 1
    }
}

# Check if psakefile.ps1 exists
$psakeFile = Join-Path $PSScriptRoot "psakefile.ps1"
if (-not (Test-Path $psakeFile)) {
    Write-Host "❌ psakefile.ps1 not found in current directory" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🚀 Running PSake task: $Task" -ForegroundColor Cyan
Write-Host ""

try {
    # Run PSake with the specified task
    Invoke-psake -buildFile $psakeFile -taskList $Task -Verbose:$VerbosePreference
    
    if ($psake.build_success) {
        Write-Host ""
        Write-Host "✅ Task '$Task' completed successfully!" -ForegroundColor Green
        
        # Show next steps for common tasks
        switch ($Task.ToLower()) {
            "dev" {
                Write-Host ""
                Write-Host "🎯 Development environment is ready!" -ForegroundColor Cyan
                Write-Host "   Application: http://localhost:3000" -ForegroundColor Gray
                Write-Host "   Next: Open browser and start implementing features" -ForegroundColor Gray
            }
            "test" {
                Write-Host ""
                Write-Host "📝 Check test results above for implementation guidance" -ForegroundColor Cyan
            }
            "watch" {
                Write-Host ""
                Write-Host "👀 Tests will continue running. Press Ctrl+C to stop." -ForegroundColor Cyan
            }
        }
    }
    else {
        Write-Host ""
        Write-Host "❌ Task '$Task' failed. Check output above for details." -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host ""
    Write-Host "❌ Error running PSake: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
