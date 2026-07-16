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

## 🚀 Running Locally

This project is built using modern front-end tooling (**Vite, React, TypeScript, Tailwind CSS**).

### Requirements
- **Node.js** (v18+)
- **npm** or **bun**

### Installation & Startup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your web browser.

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
