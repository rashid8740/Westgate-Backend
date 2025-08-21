#!/bin/bash

# Westgate School Website Development Startup Script
echo "🎓 Starting Westgate Group of Schools Development Environment"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check if MongoDB is running
if ! pgrep mongod > /dev/null; then
    echo "⚠️  MongoDB is not running. Starting MongoDB..."
    # Try to start MongoDB (adjust path as needed)
    if command -v mongod &> /dev/null; then
        mongod --fork --logpath /var/log/mongodb.log --dbpath /var/lib/mongodb
    else
        echo "❌ MongoDB is not installed. Please install MongoDB first."
        echo "For Ubuntu/Debian: sudo apt install mongodb"
        echo "For macOS: brew install mongodb-community"
        exit 1
    fi
fi

# Create environment files if they don't exist
echo "📋 Setting up environment files..."

# Backend environment
if [ ! -f "westgate-backend/.env" ]; then
    echo "Creating backend .env file..."
    cat > westgate-backend/.env << EOL
MONGODB_URI=mongodb://localhost:27017/westgate-school
JWT_SECRET=your-super-secret-jwt-key-change-in-production
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
ADMIN_EMAIL=admin@westgateschool.ac.ke
PORT=5000
NODE_ENV=development
EOL
fi

# Frontend environment
if [ ! -f "westgate-frontend/.env.local" ]; then
    echo "Creating frontend .env.local file..."
    cat > westgate-frontend/.env.local << EOL
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_GA_ID=
EOL
fi

# Install dependencies if needed
echo "📦 Checking dependencies..."

if [ ! -d "westgate-backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd westgate-backend && npm install && cd ..
fi

if [ ! -d "westgate-frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd westgate-frontend && npm install && cd ..
fi

# Start the development servers
echo "🚀 Starting development servers..."

# Start backend in background
echo "Starting backend server on port 5000..."
cd westgate-backend && npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "Starting frontend server on port 3000..."
cd ../westgate-frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Development environment started successfully!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5000/api"
echo "🏥 Health Check: http://localhost:5000/api/health"
echo ""
echo "📋 To stop the servers, press Ctrl+C"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping development servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Development servers stopped."
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
