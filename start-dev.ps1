# Campus Ratings Development Server Startup Script
# Run this script to start the dev server in the future

Write-Host "Starting Campus Ratings Development Server..." -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Kill any existing node processes
Write-Host "Checking for running processes..." -ForegroundColor Yellow
$existingNode = Get-Process node -ErrorAction SilentlyContinue
if ($existingNode) {
    Write-Host "Found running Node process, stopping it..." -ForegroundColor Yellow
    Stop-Process -InputObject $existingNode -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Start the dev server
Write-Host "Starting dev server..." -ForegroundColor Green
npm run dev

Write-Host "=================================" -ForegroundColor Green
Write-Host "Server should be running at http://localhost:5000" -ForegroundColor Green
Write-Host "Keep this terminal open while developing!" -ForegroundColor Cyan
