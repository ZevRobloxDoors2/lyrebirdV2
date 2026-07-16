#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "==========================================="
echo "   Lyrebird Linux Desktop Installer"
echo "==========================================="

# Make sure launcher script is executable
chmod +x "$DIR/lyrebird-app.sh"

# Ensure desktop paths exist
mkdir -p "$HOME/.local/share/icons"
mkdir -p "$HOME/.local/share/applications"

# Copy high-quality icon to system path
if [ -f "icon.png" ]; then
    cp "icon.png" "$HOME/.local/share/icons/lyrebird.png"
    ICON_PATH="$HOME/.local/share/icons/lyrebird.png"
    echo "Copied application icon."
else
    ICON_PATH="multimedia-volume-control"
fi

# Generate the desktop shortcut file
DESKTOP_FILE="$HOME/.local/share/applications/lyrebird.desktop"

cat > "$DESKTOP_FILE" <<EOL
[Desktop Entry]
Version=1.0
Type=Application
Name=Lyrebird Voice Changer
Comment=Real-time voice changer and meme soundboard
Exec="$DIR/lyrebird-app.sh"
Icon=$ICON_PATH
Terminal=true
Categories=AudioVideo;Audio;Utility;
EOL

chmod +x "$DESKTOP_FILE"

echo "Success! Lyrebird Voice Changer has been installed as a Linux Desktop App."
echo "You can now search and launch 'Lyrebird Voice Changer' from your desktop's Application Menu!"
echo "==========================================="
