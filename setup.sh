#!/bin/bash

# Telegram to Webhook Setup Script
echo "🚀 Setting up Telegram to Webhook application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ Created .env file. Please edit it with your actual credentials."
else
    echo "ℹ️  .env file already exists"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p downloads

echo "✅ Directories created"

# Build the application
echo "🔨 Building TypeScript application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build application"
    exit 1
fi

echo "✅ Application built successfully"

# Display next steps
echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your credentials:"
echo "   - Get Telegram API credentials from https://my.telegram.org"
echo "   - Configure AWS S3 credentials and bucket"
echo "   - Set your n8n webhook URL"
echo ""
echo "2. Test the application:"
echo "   npm run dev"
echo ""
echo "3. For production:"
echo "   npm start"
echo ""
echo "📚 For detailed instructions, see README.md"
