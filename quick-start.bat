@echo off
echo ======================================
echo 🚀 AZIZ KINO BOT - Quick Start
echo ======================================
echo.

REM Check if pnpm is installed
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ pnpm is not installed!
    echo Please install pnpm: npm install -g pnpm
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo ❌ .env file not found!
    echo Please make sure .env file exists in the root directory
    exit /b 1
)

echo 📊 Checking environment setup...
echo ✅ .env file found
echo.

REM Install dependencies
echo 📦 Installing dependencies...
call pnpm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    exit /b 1
)
echo.

REM Generate Prisma Client
echo 🔄 Generating Prisma Client...
call pnpm prisma:generate
if %errorlevel% neq 0 (
    echo ❌ Failed to generate Prisma Client
    exit /b 1
)
echo.

REM Run migrations
echo 🔄 Running database migrations...
echo ⚠️  Make sure PostgreSQL is running!
call pnpm prisma:migrate
if %errorlevel% neq 0 (
    echo ❌ Failed to run migrations
    echo.
    echo Please check:
    echo 1. PostgreSQL is installed and running
    echo 2. Database credentials in .env are correct
    echo 3. Database 'aziz_bot_db' exists or can be created
    echo.
    echo To create database manually:
    echo   1. Open pgAdmin 4 or psql
    echo   2. Create database: aziz_bot_db
    echo   3. Run this script again
    exit /b 1
)

echo.
echo ======================================
echo ✅ Setup Complete!
echo ======================================
echo.
echo To start the bot:
echo   pnpm run start:dev
echo.
echo To open database studio:
echo   pnpm prisma:studio
echo.
echo ⚠️  IMPORTANT:
echo 1. Make sure you've set BOT_USERNAME in .env file
echo 2. Add your first admin in Prisma Studio
echo 3. Create fields and database channels through the bot
echo.
echo Read LOCAL_SETUP_GUIDE.md for detailed instructions
echo ======================================
pause
