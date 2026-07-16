# Lyrebird Web (Voice Changer)

A fully modernized, interactive, web-based implementation of **Lyrebird**, written in **React, TypeScript, and Tailwind CSS**. Leveraging high-performance, low-latency **Web Audio API**, this application brings powerful real-time voice modification, high-fidelity visualization, and a complete meme soundboard straight to your browser.

![Lyrebird Preview](icon.png)

## 🌐 Live Web Edition

The original Linux desktop application (written in Python/GTK) has been archived, but the spirit of Lyrebird lives on as a **modern web application**. No installations, command-line dependencies, or virtual device configurations are required — simply allow microphone access and start shifting!

---

## ✨ Features

### 🎙️ Real-time Browser Voice Changer
- **Zero-Install DSP**: Operates entirely in-browser using custom-engineered high-performance **Web Audio API** nodes.
- **Microphone Echo Cancellation**: Built-in support for acoustic echo cancellation and noise reduction.
- **Manual Pitch Tuning**: Adjustable pitch scale (from deep cavernous beast to squeaky helium balloon).
- **Audio Bit-Crushing**: Downsample audio rates on the fly to simulate retro radios, vintage retro game consoles, or walkie-talkies.
- **Bandpass & Peak Equalizer**: Integrated custom filter types (`peaking`, `lowpass`, `highpass`, `highshelf`) with frequency, Q-factor, and gain knobs.

### 🎛️ Extensive Preset Library
- Classic presets: **Male to Female**, **Female to Male**, **Radio/Walkie-Talkie**, **Robot**, **Darth Vader**, and more.
- Anime & Pop Culture additions: **Deku (One For All)**, **Luffy (Gear 5)**, **Levi Ackerman**, **Megumin (Explosion!)**, **Among Us Crewmate**, and **T-Rex Growl**.
- **Fully Customizable Presets**: Design, name, and fine-tune your own voice effects and save them instantly to your custom collection.

### 📊 Professional Visualizers
- **Visualizer Engine**: High-performance, low-latency canvas drawing.
- **Multiple Modes**: Toggle between **Oscilloscope Waveform** (visualizing voice pressure in real-time), **Frequency Spectrum** (detailing frequency bands), and an elegant **Circular Soundwave Circle**.

### 🔊 High-Fidelity Meme Soundboard & Recorder
- **Curated Soundboard**: Packed with offline-ready classic meme sounds (Vine Boom, Roblox Oof, FBI Open Up, GigaChad, Emotional Damage, etc.).
- **Pitch & Speed Modulator**: Speed up or slow down meme clips from `0.5x` to `2.0x` on-the-fly, pitch-shifting them dynamically.
- **Voice Clip Recorder**: Record and capture your own vocal riffs or sound effects, assign custom emoji icons, name them, and save them directly to your custom local soundboard.
- **Drag & Drop MP3 Upload**: Drag and drop any `.mp3` or `.wav` audio track onto the interface to instantly load custom memes.

---

## 🚀 Running Locally & Terminal Guide

If you are a complete beginner and have never used the terminal before, don't worry! Follow these step-by-step instructions to run Lyrebird locally on your machine.

### 💻 Step 1: Open Your Terminal
- **Ubuntu/Debian/Linux Mint**: Press `Ctrl` + `Alt` + `T` on your keyboard.
- **Fedora/RHEL**: Open your Applications launcher, search for **Terminal**, and launch it.
- **Arch Linux**: Open your preferred terminal emulator (e.g., Alacritty, Kitty, GNOME Terminal).

### 📦 Step 2: Install Node.js & npm (Prerequisites)
The terminal is a text interface to run programs. You need **Node.js** to run the server. Install it by pasting the command for your Linux distribution into the terminal and pressing `Enter`:

*   **Ubuntu / Debian / Linux Mint / Pop!_OS**:
    ```bash
    sudo apt update
    sudo apt install -y nodejs npm
    ```
*   **Fedora / Red Hat**:
    ```bash
    sudo dnf install -y nodejs npm
    ```
*   **Arch Linux**:
    ```bash
    sudo pacman -S --noconfirm nodejs npm
    ```

Verify the installation succeeded by checking their versions:
```bash
node -v
npm -v
```

### 📥 Step 3: Clone or Navigate to the Folder
In the terminal, navigate to the folder where you have downloaded the Lyrebird source files. For example, if it's in your Downloads folder:
```bash
cd ~/Downloads/lyrebird-voice-changer
```
*(Note: `cd` stands for "change directory".)*

### ⚙️ Step 4: Install Dependencies & Run
1.  **Install project dependencies**: This downloads all the required libraries (like React and Tailwind CSS) into a local `node_modules` folder:
    ```bash
    npm install
    ```
2.  **Start the server**: This launches the development server on your machine:
    ```bash
    npm run dev
    ```
3.  **Open the App**: Once started, the terminal will print a link. Click it, or open your web browser and go to:
    ```
    http://localhost:3000
    ```

---

## 🐧 Linux Desktop App Integration

Want to launch Lyrebird like a native desktop application directly from your system's Applications Menu, without typing commands in the terminal every time? We've created an automated installer for you!

### How to Install:
1.  Open your terminal and navigate to the project directory.
2.  Run the desktop installer script:
    ```bash
    ./install-linux-app.sh
    ```
    *(If it says permission denied, run `chmod +x install-linux-app.sh` first to make it executable.)*

### What this installer does:
- Copies the high-resolution Lyrebird icon to your system icons directory (`~/.local/share/icons/lyrebird.png`).
- Generates a custom, standard Linux desktop launcher entry (`~/.local/share/applications/lyrebird.desktop`).
- Sets up an automated start script (`lyrebird-app.sh`) that installs dependencies on first launch, boots up the local server, and automatically opens Lyrebird in your system's default browser.

Now, you can simply press your keyboard's **Super/Windows** key, search for **"Lyrebird Voice Changer"**, and launch it with a single click!

---

## 🛠️ Web Audio DSP Architecture

The real-time voice shifting is powered by a custom `AudioEngine` singleton pipeline:
```
[Microphone Source] ──> [MediaStreamAudioSourceNode]
                              │
                              ▼
                        [Gain Node] (Input adjustment)
                              │
                              ▼
                    [BiquadFilterNode] (Lowpass / Peaking / Highpass EQ)
                              │
                              ▼
                     [Delay / Pitch Shifter Node] (Phase vocoder model)
                              │
                              ▼
                      [Downsampler Node] (Bit-crusher effect)
                              │
                              ▼
                     [Gain Node] (Output boost)
                              ├────────────────────────┐
                              ▼                        ▼
                       [Analyser Node]      [Audio Destination]
                              │                     │
                              ▼                     ▼
                     [Canvas Visualizer]        [Speakers]
```

- **Pitch Shifting**: Accomplished using fractional delays and dual overlapping taps with sine-wave windowing to minimize artifacts.
- **Downsampling**: Done inside a custom processor layer that holds sample rates at fixed interval boundaries, giving an authentic digital distortion.

---

## 🌟 Contributors & Credits

- **Original Desktop Application**: Created by [megabytesofrem](https://github.com/megabytesofrem) and maintained by [Harry Stanton](https://github.com/harrego).
- **Web App Modernization**: Engineered as an interactive high-performance Web App to bring the ultimate voice modification suite to all platforms and modern operating systems.
