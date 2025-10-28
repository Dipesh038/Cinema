#!/bin/bash

echo "🛑 Stopping Movie Booking Project..."

# Kill processes on ports 3000 and 8080
lsof -ti:3000,8080 | xargs kill -9 2>/dev/null

# Also kill by process name for safety
pkill -f "node server.js" 2>/dev/null
pkill -f "python3 -m http.server" 2>/dev/null

echo "✅ All processes stopped!"
echo "You can now restart with: ./start_project.sh"
