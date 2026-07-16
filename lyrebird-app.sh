#!/bin/bash
# Get the directory of the current script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================="
echo "         Lyrebird Voice Changer           "
echo "=========================================="
echo "Starting application server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed."
    echo "Please install Node.js and npm to run Lyrebird."
    echo "Ubuntu/Debian: sudo apt install nodejs npm"
    echo "Fedora: sudo dnf install nodejs npm"
    echo "Arch Linux: sudo pacman -S nodejs npm"
    read -p "Press enter to exit..."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "First-time setup: Installing node dependencies..."
    npm install
fi

# Run the dev server in the background
npm run dev &
SERVER_PID=$!

# Wait for server to start up
echo "Launching dev server..."
sleep 2.5

# Open in browser (prefer App Mode for a native Linux desktop experience)
URL="http://localhost:3000"
echo "Opening Lyrebird at $URL"

if command -v google-chrome &> /dev/null; then
    google-chrome --app="$URL"
elif command -v chromium &> /dev/null; then
    chromium --app="$URL"
elif command -v chromium-browser &> /dev/null; then
    chromium-browser --app="$URL"
elif command -v brave-browser &> /dev/null; then
    brave-browser --app="$URL"
elif command -v edge &> /dev/null; then
    edge --app="$URL"
elif command -v xdg-open &> /dev/null; then
    xdg-open "$URL"
elif command -v sensible-browser &> /dev/null; then
    sensible-browser "$URL"
else
    echo "Please open your browser and visit: $URL"
fi

# Set trap to kill background server on exit
trap "kill $SERVER_PID" EXIT

# Keep script running to maintain terminal session and logs
wait $SERVER_PID
