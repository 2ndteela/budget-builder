#!/bin/bash

# Start backend
cd server
dotnet run --urls=http://localhost:5102 &
BACKEND_PID=$!

# Start frontend
cd ../client
npm run dev &
FRONTEND_PID=$!

echo "Backend started (PID: $BACKEND_PID)"
echo "Frontend started (PID: $FRONTEND_PID)"
echo ""
echo "Press Ctrl+C to stop both servers"

# Trap Ctrl+C and kill both processes
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT

# Wait for both processes
wait
