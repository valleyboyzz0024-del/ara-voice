#!/bin/bash
# Kill any existing Expo processes
pkill -9 -f expo 2>/dev/null
pkill -9 -f node 2>/dev/null

# Wait a moment
sleep 2

# Start Expo with web mode (no interactive prompts)
npx expo start --web --port 8083