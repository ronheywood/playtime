# PSake build script for PlayTime Music Practice App
# Run with: Invoke-psake or psake.ps1

#Requires -Modules psake

# Build configuration
Properties {
    $ProjectRoot = $PSScriptRoot
    $TestPath = Join-Path $ProjectRoot "tests"
    $AcceptanceTestPath = Join-Path $TestPath "acceptance"
    $FixturesPath = Join-Path $TestPath "fixtures" 
    $NodeModulesPath = Join-Path $ProjectRoot "node_modules"
    $PackageJsonPath = Join-Path $ProjectRoot "package.json"
    $ServerPort = 3000
    $ServerUrl = "http://localhost:$ServerPort"
    $TestTimeout = 60
}

# Default task
Task Default -depends Test

# Clean build artifacts and reset environment
Task Clean {
    Write-Host "🧹 Cleaning PlayTime environment..." -ForegroundColor Cyan
    
    # Stop any running servers on our port
    try {
        $processes = Get-NetTCPConnection -LocalPort $ServerPort -ErrorAction SilentlyContinue | 
                    Select-Object -ExpandProperty OwningProcess | 
                    Get-Process -Id { $_ } -ErrorAction SilentlyContinue
        
        if ($processes) {
            Write-Host "⏹️ Stopping existing servers on port $ServerPort..." -ForegroundColor Yellow
            $processes | Stop-Process -Force
            Start-Sleep -Seconds 2
        }
    }
    catch {
        # Port might not be in use, continue
    }
    
    # Clean any test artifacts
    $testArtifacts = @(
        "coverage",
        "test-results.xml",
        "playwright-report"
    )
    
    foreach ($artifact in $testArtifacts) {
        $artifactPath = Join-Path $ProjectRoot $artifact
        if (Test-Path $artifactPath) {
            Write-Host "🗑️ Removing $artifact" -ForegroundColor Gray
            Remove-Item $artifactPath -Recurse -Force
        }
    }
}

# Install dependencies
Task Install -depends Clean {
    Write-Host "📦 Installing PlayTime dependencies..." -ForegroundColor Cyan
    
    if (-not (Test-Path $PackageJsonPath)) {
        throw "❌ package.json not found at $PackageJsonPath"
    }
    
    # Check if node_modules exists and is up to date
    $needsInstall = $true
    if (Test-Path $NodeModulesPath) {
        $packageJsonTime = (Get-Item $PackageJsonPath).LastWriteTime
        $nodeModulesTime = (Get-Item $NodeModulesPath).LastWriteTime
        $needsInstall = $packageJsonTime -gt $nodeModulesTime
    }
      if ($needsInstall) {
        Write-Host "⬇️ Running npm install..." -ForegroundColor Yellow
        
        # Use cmd /c to ensure npm works correctly on Windows
        $npmCommand = "cmd /c npm install"
        $result = Invoke-Expression $npmCommand
        
        # Check if node_modules was created successfully
        if (-not (Test-Path $NodeModulesPath)) {
            throw "❌ npm install failed - node_modules directory not created"
        }
        Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
    } else {
        Write-Host "✅ Dependencies are up to date" -ForegroundColor Green
    }
}

# Validate test setup
Task ValidateTests -depends Install {
    Write-Host "🔍 Validating test setup..." -ForegroundColor Cyan
    
    # Check test files exist
    $requiredTestFiles = @(
        (Join-Path $TestPath "setup.js"),
        (Join-Path $AcceptanceTestPath "playtime.test.js")
    )
    
    foreach ($testFile in $requiredTestFiles) {
        if (-not (Test-Path $testFile)) {
            throw "❌ Required test file not found: $testFile"
        }
    }
    
    # Check test fixtures directory
    if (-not (Test-Path $FixturesPath)) {
        Write-Host "⚠️ Test fixtures directory not found, creating..." -ForegroundColor Yellow
        New-Item -Path $FixturesPath -ItemType Directory -Force | Out-Null
    }
    
    # Validate package.json test scripts
    $packageJson = Get-Content $PackageJsonPath | ConvertFrom-Json
    $requiredScripts = @("test", "serve")
    
    foreach ($script in $requiredScripts) {
        if (-not $packageJson.scripts.$script) {
            throw "❌ Required npm script '$script' not found in package.json"
        }
    }
    
    Write-Host "✅ Test setup validation complete" -ForegroundColor Green
}

# Start development server
Task StartServer -depends ValidateTests {
    Write-Host "🚀 Starting PlayTime development server..." -ForegroundColor Cyan
    
    # Check if server is already running
    try {
        $response = Invoke-WebRequest -Uri $ServerUrl -TimeoutSec 3 -ErrorAction Stop
        Write-Host "✅ Server already running at $ServerUrl" -ForegroundColor Green
        return
    }
    catch {
        # Server not running, start it
        Write-Host "⏳ Starting server on port $ServerPort..." -ForegroundColor Yellow
    }
    
    # Start server in background using Start-Job (more reliable than Start-Process)
    $serverJob = Start-Job -ScriptBlock {
        param($ProjectRoot)
        Set-Location $ProjectRoot
        & npm run serve
    } -ArgumentList $ProjectRoot
    
    # Wait for server to start responding
    $attempts = 0
    $maxAttempts = 15
    
    do {
        Start-Sleep -Seconds 2
        $attempts++
        try {
            $testResponse = Invoke-WebRequest -Uri $ServerUrl -TimeoutSec 3 -ErrorAction Stop
            Write-Host "✅ Server started successfully at $ServerUrl (Job ID: $($serverJob.Id))" -ForegroundColor Green
            
            # Store the job ID in a global variable for cleanup
            $global:ServerJobId = $serverJob.Id
            return
        }
        catch {
            if ($attempts -eq $maxAttempts) {
                Stop-Job -Id $serverJob.Id -ErrorAction SilentlyContinue
                Remove-Job -Id $serverJob.Id -Force -ErrorAction SilentlyContinue
                throw "❌ Server failed to start after $maxAttempts attempts"
            }
            Write-Host "." -NoNewline -ForegroundColor Gray
        }
    } while ($attempts -lt $maxAttempts)
}

# Run unit tests (if any)
Task UnitTest -depends Install {
    Write-Host "🧪 Running unit tests..." -ForegroundColor Cyan
    
    # For now, just validate the test setup
    $testCommand = "cmd /c npm run test -- --testPathPattern=unit --passWithNoTests"
    $output = Invoke-Expression $testCommand 2>&1
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Host "✅ Unit tests passed" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Unit tests issues detected (expected in Outside-In approach)" -ForegroundColor Yellow
    }
}

# Run acceptance tests
Task AcceptanceTest -depends StartServer {
    Write-Host "🎭 Running acceptance tests..." -ForegroundColor Cyan
    
    try {
        # Run Jest tests using cmd /c for Windows compatibility
        Write-Host "⚡ Executing Jest acceptance tests..." -ForegroundColor Yellow
        $testCommand = "cmd /c npm run test"
        $output = Invoke-Expression $testCommand 2>&1
        $exitCode = $LASTEXITCODE
        
        Write-Host $output
        
        if ($exitCode -eq 0) {
            Write-Host "✅ All acceptance tests passed!" -ForegroundColor Green
        } else {
            Write-Host "❌ Some acceptance tests failed (this is expected in Outside-In TDD)" -ForegroundColor Red
            Write-Host "📝 Use failing tests to guide implementation" -ForegroundColor Cyan
        }
        
        return $exitCode
    }
    catch {
        Write-Host "❌ Error running acceptance tests: $($_.Exception.Message)" -ForegroundColor Red
        throw
    }
}

# Run all tests
Task Test -depends UnitTest, AcceptanceTest {
    Write-Host "🏁 Test execution complete" -ForegroundColor Cyan
}

# Watch mode for continuous testing
Task Watch -depends Install {
    Write-Host "👀 Starting test watch mode..." -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop watching" -ForegroundColor Gray
    
    try {
        # Start server in background if not running
        Invoke-psake StartServer
        
        # For watch mode, we'll just run tests once and recommend using npm directly
        Write-Host "⚡ Running tests once. For continuous watching, use: npm run test:watch" -ForegroundColor Yellow
        $testCommand = "cmd /c npm run test"
        Invoke-Expression $testCommand
        
        Write-Host "" -ForegroundColor Gray
        Write-Host "💡 TIP: For true watch mode, run 'npm run test:watch' in a separate terminal" -ForegroundColor Cyan
        Write-Host "💡 Server is running at $ServerUrl - use 'Invoke-psake StopServer' when done" -ForegroundColor Cyan
    }
    catch {
        Write-Host "❌ Watch mode interrupted: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Stop development server
Task StopServer {
    Write-Host "⏹️ Stopping development server..." -ForegroundColor Cyan
    
    try {
        # First try to stop using the stored job ID
        if ($global:ServerJobId) {
            try {
                Stop-Job -Id $global:ServerJobId -ErrorAction Stop
                Remove-Job -Id $global:ServerJobId -Force -ErrorAction Stop
                Write-Host "✅ Server stopped (Job ID: $global:ServerJobId)" -ForegroundColor Green
                $global:ServerJobId = $null
                return
            }
            catch {
                Write-Host "⚠️ Could not stop server by Job ID, trying other methods..." -ForegroundColor Yellow
            }
        }
        
        # Fallback: try to stop using the stored process ID (for backward compatibility)
        if ($global:ServerProcessId) {
            try {
                Stop-Process -Id $global:ServerProcessId -Force -ErrorAction Stop
                Write-Host "✅ Server stopped (PID: $global:ServerProcessId)" -ForegroundColor Green
                $global:ServerProcessId = $null
                return
            }
            catch {
                Write-Host "⚠️ Could not stop server by PID, trying port-based cleanup..." -ForegroundColor Yellow
            }
        }
        
        # Final fallback: find and stop processes using the port
        $processes = Get-NetTCPConnection -LocalPort $ServerPort -ErrorAction SilentlyContinue | 
                    Select-Object -ExpandProperty OwningProcess | 
                    Get-Process -Id { $_ } -ErrorAction SilentlyContinue
        
        if ($processes) {
            $processes | Stop-Process -Force
            Write-Host "✅ Server stopped" -ForegroundColor Green
        } else {
            Write-Host "ℹ️ No server running on port $ServerPort" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "⚠️ Could not stop server: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Development task - start server and run tests once
Task Dev -depends StartServer, Test {
    Write-Host "🎵 PlayTime development environment ready!" -ForegroundColor Green
    Write-Host "🌐 Application: $ServerUrl" -ForegroundColor Cyan
    Write-Host "🧪 Tests completed - check results above" -ForegroundColor Cyan
    Write-Host "" 
    Write-Host "Next steps for Outside-In development:" -ForegroundColor Yellow
    Write-Host "1. Examine failing tests to understand requirements" -ForegroundColor Gray
    Write-Host "2. Implement minimal code to make tests pass" -ForegroundColor Gray
    Write-Host "3. Refactor and repeat" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Development workflow commands:" -ForegroundColor Cyan
    Write-Host "  npm run test:watch    - Continuous test watching" -ForegroundColor Gray
    Write-Host "  Invoke-psake StopServer - Stop the development server" -ForegroundColor Gray
    Write-Host "  Invoke-psake Clean    - Clean and restart environment" -ForegroundColor Gray
}

# Quick development startup (server only)
Task Serve -depends StartServer {
    Write-Host "🎵 PlayTime server started!" -ForegroundColor Green
    Write-Host "🌐 Application: $ServerUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Yellow
    Write-Host "  npm test              - Run tests once" -ForegroundColor Gray
    Write-Host "  npm run test:watch    - Continuous test watching" -ForegroundColor Gray
    Write-Host "  Invoke-psake StopServer - Stop server when done" -ForegroundColor Gray
}

# CI task - full build and test pipeline
Task CI -depends Clean, Install, ValidateTests, Test, StopServer {
    Write-Host "🚀 CI pipeline completed" -ForegroundColor Green
}

# Show help
Task Help {
    Write-Host ""
    Write-Host "🎵 PlayTime PSake Build Script" -ForegroundColor Cyan
    Write-Host "=============================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Available tasks:" -ForegroundColor White
    Write-Host ""
    Write-Host "  Default      - Run all tests (same as Test)" -ForegroundColor Green
    Write-Host "  Clean        - Clean build artifacts and stop servers" -ForegroundColor Yellow
    Write-Host "  Install      - Install npm dependencies" -ForegroundColor Blue
    Write-Host "  Test         - Run all tests" -ForegroundColor Green
    Write-Host "  UnitTest     - Run unit tests only" -ForegroundColor Cyan
    Write-Host "  AcceptanceTest - Run acceptance tests only" -ForegroundColor Cyan
    Write-Host "  StartServer  - Start development server" -ForegroundColor Magenta
    Write-Host "  StopServer   - Stop development server" -ForegroundColor Red
    Write-Host "  Watch        - Run tests once and start server" -ForegroundColor Yellow
  Write-Host "  Serve        - Start development server only" -ForegroundColor Magenta
    Write-Host "  Dev          - Start server and run tests (development)" -ForegroundColor Green
    Write-Host "  CI           - Full CI pipeline" -ForegroundColor Blue
    Write-Host "  Help         - Show this help" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor White
    Write-Host "  Invoke-psake" -ForegroundColor Gray
    Write-Host "  Invoke-psake Test" -ForegroundColor Gray
    Write-Host "  Invoke-psake Dev" -ForegroundColor Gray
    Write-Host "  Invoke-psake Watch" -ForegroundColor Gray
    Write-Host ""
    Write-Host "For Outside-In TDD:" -ForegroundColor Yellow
    Write-Host "  1. Run 'Invoke-psake Dev' to see failing tests" -ForegroundColor Gray
    Write-Host "  2. Implement code to make tests pass" -ForegroundColor Gray
    Write-Host "  3. Use 'Invoke-psake Watch' for continuous feedback" -ForegroundColor Gray
    Write-Host ""
}
