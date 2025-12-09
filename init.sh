#!/bin/bash

# FedLearn Industrial - Initialization Script
# This script sets up and runs the development environment

set -e

echo "========================================"
echo "FedLearn Industrial - Development Setup"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${YELLOW}Warning: Node.js 18+ is recommended. You have $(node -v)${NC}"
fi

echo -e "${GREEN}Node.js version: $(node -v)${NC}"

# Check for package manager (prefer pnpm)
if command -v pnpm &> /dev/null; then
    PKG_MANAGER="pnpm"
elif command -v npm &> /dev/null; then
    PKG_MANAGER="npm"
else
    echo -e "${RED}Error: No package manager found (pnpm or npm required)${NC}"
    exit 1
fi

echo -e "${GREEN}Using package manager: $PKG_MANAGER${NC}"
echo ""

# Install backend dependencies
echo "Installing backend dependencies..."
cd server
if [ ! -d "node_modules" ]; then
    $PKG_MANAGER install
else
    echo "Backend dependencies already installed"
fi
cd ..

# Install frontend dependencies
echo ""
echo "Installing frontend dependencies..."
cd client
if [ ! -d "node_modules" ]; then
    $PKG_MANAGER install
else
    echo "Frontend dependencies already installed"
fi
cd ..

# Initialize database if needed
echo ""
echo "Initializing database..."
if [ ! -f "server/db/fedlearn.db" ]; then
    cd server
    node src/utils/initDb.js
    cd ..
    echo -e "${GREEN}Database initialized${NC}"
else
    echo "Database already exists"
fi

# Create .env files if they don't exist
if [ ! -f "server/.env" ]; then
    echo ""
    echo "Creating server .env file..."
    cat > server/.env << 'EOF'
PORT=3001
NODE_ENV=development
DATABASE_PATH=./db/fedlearn.db
JWT_SECRET=fedlearn-dev-secret-change-in-production
ANTHROPIC_API_KEY_PATH=/tmp/api-key
CORS_ORIGIN=http://localhost:5173
EOF
    echo -e "${GREEN}Server .env created${NC}"
fi

if [ ! -f "client/.env" ]; then
    echo ""
    echo "Creating client .env file..."
    cat > client/.env << 'EOF'
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
VITE_ANTHROPIC_API_KEY_PATH=/tmp/api-key
EOF
    echo -e "${GREEN}Client .env created${NC}"
fi

echo ""
echo "========================================"
echo -e "${GREEN}Setup Complete!${NC}"
echo "========================================"
echo ""
echo "To start the development servers:"
echo ""
echo "  Backend (Terminal 1):"
echo "    cd server && $PKG_MANAGER run dev"
echo ""
echo "  Frontend (Terminal 2):"
echo "    cd client && $PKG_MANAGER run dev"
echo ""
echo "Or run both with:"
echo "    $PKG_MANAGER run dev (from project root)"
echo ""
echo "Access the application at:"
echo "  Frontend: http://localhost:5173"
echo "  Backend API: http://localhost:3001"
echo "  WebSocket: ws://localhost:3001"
echo ""
echo "========================================"
