#!/bin/bash

echo "🔄 Restarting Movie Booking Project..."

# Kill existing processes
echo "🛑 Killing existing processes..."
lsof -ti:3000,8080 | xargs kill -9 2>/dev/null

# Wait a moment
sleep 2

# Start backend
echo "🚀 Starting backend server..."
cd /Users/dipeshkunwar/Desktop/Project/backend
npm start &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo "🌐 Starting frontend server..."
cd /Users/dipeshkunwar/Desktop/Project/frontend
python3 -m http.server 8080 &
FRONTEND_PID=$!

# Wait a moment
sleep 2

echo "✅ Project started successfully!"
echo "📱 Frontend: http://localhost:8080"
echo "🔧 Backend: http://localhost:3000"
echo "📊 API Health: http://localhost:3000/api/health"
echo ""
echo "To stop the project, run: kill -9 $BACKEND_PID $FRONTEND_PID"
