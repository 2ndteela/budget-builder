#!/bin/bash

echo "Building server..."
cd server
dotnet build
if [ $? -ne 0 ]; then
    echo "Server build failed"
    exit 1
fi

echo "Building client..."
cd ../client
npm run build
if [ $? -ne 0 ]; then
    echo "Client build failed"
    exit 1
fi

echo "Starting server..."
cd ../server
dotnet run --urls=http://0.0.0.0:5102 &
BACKEND_PID=$!

echo "Starting client..."
cd ../client
npm run preview -- --host &
FRONTEND_PID=$!

echo ""
echo "Backend started (PID: $BACKEND_PID) - http://0.0.0.0:5102"
echo "Frontend started (PID: $FRONTEND_PID) - accessible on host network"
echo ""
echo "Press Ctrl+C to stop both servers"

# Trap Ctrl+C and kill both processes
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT

# Wait for both processes
wait
