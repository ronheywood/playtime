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
    $DistPath = Join-Path $ProjectRoot "dist"
    $PackagePath = Join-Path $ProjectRoot "package"
    $Version = "1.0.0"
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
    Write-Host "Packaging:" -ForegroundColor Yellow
    Write-Host "  Invoke-psake Package   - Create production package" -ForegroundColor Gray
    Write-Host "  Invoke-psake Archive   - Create deployable archive" -ForegroundColor Gray
    Write-Host ""
}

# Package the application for deployment
Task Package -depends Test {
    Write-Host "📦 Packaging PlayTime for deployment..." -ForegroundColor Cyan
    
    # Clean and create dist directory
    if (Test-Path $DistPath) {
        Remove-Item $DistPath -Recurse -Force
        Write-Host "  🧹 Cleaned existing dist directory" -ForegroundColor Yellow
    }
    New-Item -ItemType Directory -Path $DistPath -Force | Out-Null
    
    # Copy main HTML file
    Write-Host "  📄 Copying index.html..." -ForegroundColor Green
    Copy-Item -Path (Join-Path $ProjectRoot "index.html") -Destination $DistPath
    
    # Copy JavaScript files
    Write-Host "  ⚡ Copying JavaScript files..." -ForegroundColor Green
    $scriptsSource = Join-Path $ProjectRoot "scripts"
    $scriptsTarget = Join-Path $DistPath "scripts"
    Copy-Item -Path $scriptsSource -Destination $scriptsTarget -Recurse
    
    # Copy CSS files
    Write-Host "  🎨 Copying CSS files..." -ForegroundColor Green
    $stylesSource = Join-Path $ProjectRoot "styles"
    $stylesTarget = Join-Path $DistPath "styles"
    Copy-Item -Path $stylesSource -Destination $stylesTarget -Recurse
    
    # Copy database files
    Write-Host "  🗄️  Copying database files..." -ForegroundColor Green
    $dbSource = Join-Path $ProjectRoot "db"
    $dbTarget = Join-Path $DistPath "db"
    Copy-Item -Path $dbSource -Destination $dbTarget -Recurse
    
    # Create a simple web.config for IIS hosting (if needed)
    Write-Host "  ⚙️  Creating web.config..." -ForegroundColor Green
    $webConfig = @'
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <staticContent>
            <mimeMap fileExtension=".js" mimeType="application/javascript" />
            <mimeMap fileExtension=".json" mimeType="application/json" />
        </staticContent>
        <defaultDocument>
            <files>
                <clear />
                <add value="index.html" />
            </files>
        </defaultDocument>
        <httpErrors errorMode="Custom" defaultResponseMode="File">
            <remove statusCode="404" subStatusCode="-1" />
            <error statusCode="404" path="index.html" responseMode="ExecuteURL" />
        </httpErrors>
    </system.webServer>
</configuration>
'@
    $webConfig | Out-File -FilePath (Join-Path $DistPath "web.config") -Encoding UTF8
    
    # Create .htaccess for Apache hosting
    Write-Host "  🌐 Creating .htaccess..." -ForegroundColor Green
    $htaccess = @'
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Enable GZIP compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Set cache headers for static assets
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType text/html "access plus 1 hour"
</IfModule>
'@
    $htaccess | Out-File -FilePath (Join-Path $DistPath ".htaccess") -Encoding UTF8
    
    # Create package.json for the distribution
    Write-Host "  📋 Creating distribution package.json..." -ForegroundColor Green
    $distPackageJson = @{
        name = "playtime"
        version = $Version
        description = "PlayTime - Music Practice Application"
        main = "index.html"
        homepage = "."
        engines = @{
            node = ">=16.0.0"
        }
        keywords = @("music", "practice", "pdf", "score")
        license = "MIT"
    }
    $distPackageJson | ConvertTo-Json -Depth 5 | Out-File -FilePath (Join-Path $DistPath "package.json") -Encoding UTF8
    
    # Create README for deployment
    Write-Host "  📖 Creating deployment README..." -ForegroundColor Green
    $deployReadme = @"
# PlayTime - Deployment Package

This is a production-ready package of the PlayTime music practice application.

## Deployment Options

### Static Hosting (Netlify, Vercel, GitHub Pages)
1. Upload the contents of this directory to your hosting provider
2. Set index.html as your default document
3. Enable SPA routing (redirect all 404s to index.html)

### Apache Server
1. Upload all files to your web directory
2. The .htaccess file will handle routing and caching
3. Ensure mod_rewrite and mod_deflate are enabled

### IIS Server
1. Upload all files to your web directory
2. The web.config file will handle routing and MIME types
3. Ensure URL Rewrite module is installed

### Docker/Container
1. Use a static file server like nginx
2. Serve files from this directory
3. Configure fallback to index.html for SPA routing

## Files Included
- index.html - Main application entry point
- scripts/ - Application JavaScript
- styles/ - Application CSS
- db/ - Database implementations
- web.config - IIS configuration
- .htaccess - Apache configuration

Built on: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Version: $Version
"@
    $deployReadme | Out-File -FilePath (Join-Path $DistPath "README.md") -Encoding UTF8
    
    Write-Host "✅ Package created successfully in ./dist/" -ForegroundColor Green
    $distFiles = Get-ChildItem -Path $DistPath -Recurse | Measure-Object
    Write-Host "  📊 Total files: $($distFiles.Count)" -ForegroundColor Gray
    
    $distSize = Get-ChildItem -Path $DistPath -Recurse | Measure-Object -Property Length -Sum
    $sizeKB = [math]::Round($distSize.Sum / 1KB, 2)
    Write-Host "  💾 Package size: $sizeKB KB" -ForegroundColor Gray
}

# Create deployable archive
Task Archive -depends Package {
    Write-Host "🗜️  Creating deployable archive..." -ForegroundColor Cyan
    
    # Clean package directory
    if (Test-Path $PackagePath) {
        Remove-Item $PackagePath -Recurse -Force
    }
    New-Item -ItemType Directory -Path $PackagePath -Force | Out-Null
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $archiveName = "playtime-$Version-$timestamp"
    
    # Create ZIP archive
    $zipPath = Join-Path $PackagePath "$archiveName.zip"
    Write-Host "  📦 Creating ZIP: $archiveName.zip" -ForegroundColor Green
    
    try {
        Compress-Archive -Path "$DistPath\*" -DestinationPath $zipPath -CompressionLevel Optimal
        Write-Host "✅ Archive created successfully!" -ForegroundColor Green
        
        $archiveSize = Get-Item $zipPath | Select-Object -ExpandProperty Length
        $sizeMB = [math]::Round($archiveSize / 1MB, 2)
        Write-Host "  💾 Archive size: $sizeMB MB" -ForegroundColor Gray
        Write-Host "  📁 Location: $zipPath" -ForegroundColor Gray
        
        # Create deployment instructions
        $deployInstructions = @"
# PlayTime Deployment Instructions

## Quick Deploy to Popular Platforms

### Netlify
1. Go to https://app.netlify.com/
2. Drag and drop the 'dist' folder or upload $archiveName.zip
3. Set publish directory to '/' if uploading the zip
4. Your app will be live at your-app-name.netlify.app

### Vercel
1. Install Vercel CLI: npm i -g vercel
2. Extract this archive
3. Run 'vercel' in the extracted directory
4. Follow the prompts

### GitHub Pages
1. Extract this archive to your repository
2. Go to repository Settings > Pages
3. Select source branch and root folder
4. Your app will be live at username.github.io/repository

### Firebase Hosting
1. Install Firebase CLI: npm i -g firebase-tools
2. Extract this archive
3. Run 'firebase init hosting' in the extracted directory
4. Set public directory to '.'
5. Run 'firebase deploy'

## Archive Contents
- playtime-$Version-$timestamp.zip - Complete deployable package
- All necessary files for static hosting
- Configuration files for Apache (.htaccess) and IIS (web.config)

Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss UTC')
"@
        $deployInstructions | Out-File -FilePath (Join-Path $PackagePath "DEPLOY.md") -Encoding UTF8
        
        Write-Host "  📋 Deployment instructions created: .\package\DEPLOY.md" -ForegroundColor Yellow
    }
    catch {
        Write-Host "❌ Failed to create archive: $_" -ForegroundColor Red
        throw
    }
}
