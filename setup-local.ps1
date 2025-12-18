#!/usr/bin/env pwsh
# Reset and restart local development environment

Write-Host "🔧 Resetting Local Development Environment..." -ForegroundColor Cyan

# Backend
Write-Host "`n📦 Setting up backend..." -ForegroundColor Yellow
Set-Location backend

# Ensure Prisma client is generated
Write-Host "Generating Prisma client..."
npx prisma generate

# Run migrations
Write-Host "Running database migrations..."
npx prisma migrate deploy

Write-Host "`n✅ Backend setup complete!" -ForegroundColor Green
Write-Host "   Run: npm run dev (in backend folder)" -ForegroundColor Gray

# Frontend
Set-Location ../frontend
Write-Host "`n📦 Setting up frontend..." -ForegroundColor Yellow
Write-Host "`n✅ Frontend setup complete!" -ForegroundColor Green
Write-Host "   Run: pnpm run dev (in frontend folder)" -ForegroundColor Gray

Set-Location ..

Write-Host "`n🚀 Ready for local development!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Open terminal 1: cd backend && npm run dev" -ForegroundColor Gray
Write-Host "  2. Open terminal 2: cd frontend && pnpm run dev" -ForegroundColor Gray
Write-Host "  3. Visit: http://localhost:3000" -ForegroundColor Gray
