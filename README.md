# 🦜 Lyrebird Web (Voice Changer)

A fully modernized, interactive, web-based implementation of **Lyrebird**, written in **React, TypeScript, and Tailwind CSS**. Leveraging the high-performance, low-latency **Web Audio API**, this application brings powerful real-time voice modification, high-fidelity visualization, and a complete meme soundboard straight to your browser.

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

### 🔊 High-Fidelity Meme Soundboard
- **Online MP3 Search**: Built-in search integration to discover and instantly download the latest memes and sound effects directly from the web!
- **Curated Offline Soundboard**: Packed with offline-ready classic meme sounds (Vine Boom, Roblox Oof, FBI Open Up, GigaChad, Emotional Damage, etc.).
- **Pitch & Speed Modulator**: Speed up or slow down meme clips from `0.5x` to `2.0x` on-the-fly, pitch-shifting them dynamically.
- **Voice Clip Recorder**: Record and capture your own vocal riffs or sound effects, assign custom emoji icons, name them, and save them directly to your custom local soundboard.
- **Drag & Drop MP3 Upload**: Drag and drop any `.mp3` or `.wav` audio track onto the interface to instantly load custom memes.

---

## 📥 How to Download and Extract

If you are viewing this on GitHub, follow these steps to get the app onto your computer:

1. **Download the ZIP**: Click the green **"<> Code"** button near the top right of the repository page and select **"Download ZIP"**.
2. **Find the ZIP file**: 
   - **Standard Linux/Mac**: Open your file manager and go to your **Downloads** folder. You should see `lyrebirdV2-main.zip`.
   - **Chromebook (Chrome OS)**: Open your **Files** app, go to **Downloads**, and **drag & drop** the `lyrebirdV2-main.zip` file into the **"Linux files"** tab on the left sidebar.
3. **Extract it**: 
   - **Standard Linux/Mac**: Right-click on `lyrebirdV2-main.zip` and select **"Extract Here"** (or use your system's archive manager).
   - **Chromebook**: Open your Terminal and type these commands to install unzip and extract the file:
     ```bash
     sudo apt update && sudo apt install unzip -y
     unzip lyrebirdV2-main.zip
     ```
4. You should now see a folder named `lyrebirdV2-main`.

---

## 🐧 Installing as a Native Linux App

Want to launch Lyrebird like a native desktop application directly from your system's Applications Menu? We've included an automated installer that adds a beautiful desktop launcher and runs the app in a dedicated, chromeless window!

### Quick Install (Recommended)

1. Open your terminal.
2. **Navigate to the folder where you extracted Lyrebird.** You must `cd` into it, or you will get a "No such file or directory" error.
   - **Standard Linux/Mac**:
     ```bash
     cd ~/Downloads/lyrebirdV2-main
     ```
   - **Chromebook (if you followed the steps above)**:
     ```bash
     cd ~/lyrebirdV2-main
     ```
3. Run the automated Linux Desktop Installer:
   ```bash
   chmod +x install-linux-app.sh
   ./install-linux-app.sh
   ```

**What this does:**
- 🖼️ Installs the high-resolution Lyrebird icon to your system (`~/.local/share/icons`).
- 🚀 Creates a Linux desktop shortcut (`~/.local/share/applications/lyrebird.desktop`).
- 🪟 Configures the launcher to open Lyrebird in **App Mode** (using Chrome/Chromium if available), giving it a standalone application window without the browser URL bar or tabs!

**To launch it:**
Simply press your keyboard's **Super/Windows** key, search for **"Lyrebird Voice Changer"**, and launch it with a single click!

---

## 💻 Manual Terminal Instructions (Developers)

If you prefer to run the server manually for development, follow these steps:

### 1. Install Node.js & npm
You need **Node.js** installed on your system to run the backend server.

*   **Ubuntu / Debian / Linux Mint**:
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

### 2. Start the Application
Navigate to the project folder, install dependencies, and start the development server:

```bash
# 1. Install all required dependencies
npm install

# 2. Start the backend + frontend dev server
npm run dev
```

Finally, open your web browser and navigate to: **`http://localhost:3000`**

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
