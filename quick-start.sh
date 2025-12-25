#!/bin/bash

echo "======================================"
echo "🚀 AZIZ KINO BOT - Quick Start"
echo "======================================"
echo ""

# Check if PostgreSQL is running
echo "📊 Checking PostgreSQL connection..."
if psql -U postgres -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ PostgreSQL is not running or not accessible"
    echo "Please start PostgreSQL service first!"
    exit 1
fi

# Check if database exists
echo ""
echo "📊 Checking database..."
if psql -U postgres -lqt | cut -d \| -f 1 | grep -qw aziz_bot_db; then
    echo "✅ Database 'aziz_bot_db' exists"
else
    echo "⚠️  Database 'aziz_bot_db' does not exist"
    echo "Creating database..."
    psql -U postgres -c "CREATE DATABASE aziz_bot_db;"
    if [ $? -eq 0 ]; then
        echo "✅ Database created successfully"
    else
        echo "❌ Failed to create database"
        exit 1
    fi
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pnpm install

# Generate Prisma Client
echo ""
echo "🔄 Generating Prisma Client..."
pnpm prisma:generate

# Run migrations
echo ""
echo "🔄 Running database migrations..."
pnpm prisma:migrate

echo ""
echo "======================================"
echo "✅ Setup Complete!"
echo "======================================"
echo ""
echo "To start the bot:"
echo "  pnpm run start:dev"
echo ""
echo "To open database studio:"
echo "  pnpm prisma:studio"
echo ""
echo "⚠️  IMPORTANT:"
echo "1. Make sure you've set BOT_USERNAME in .env file"
echo "2. Add your first admin in Prisma Studio"
echo "3. Create fields and database channels through the bot"
echo ""
echo "Read LOCAL_SETUP_GUIDE.md for detailed instructions"
echo "======================================"
