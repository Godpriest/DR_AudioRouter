# DR_AudioRouter Beginner's Operations & Setup Guide 📘

Welcome to **DR_AudioRouter**! This guide is written for gamers and streamers looking for an easy, step-by-step walkthrough to set up audio endpoints, Windows autostart, and DSP profiles without complicated code.

---

## Table of Contents

- [Prerequisite 1: Audio Devices & Virtual Channel Verification](#prerequisite-1-audio-devices--virtual-channel-verification)
- [Prerequisite 2: Configuring Elevated Autostart on Windows Boot](#prerequisite-2-configuring-elevated-autostart-on-windows-boot)
- [Initial Launch & System Endpoints Setup (Gear Menu)](#initial-launch--system-endpoints-setup-gear-menu)
- [【System Mixer】Interface Guide](#system-mixer-interface-guide)
  - [Global Baseline vs. Customized Applications (White Frame)](#global-baseline-vs-customized-applications-white-frame)
  - [Dual-Channel Faders & Up to 500% Manual Input](#dual-channel-faders--up-to-500-manual-input)
  - [7-Band Parametric EQ & Dynamic Volume Balance (6-Cell Grid)](#7-band-parametric-eq--dynamic-volume-balance-6-cell-grid)
  - [Profile Switching & Persistence](#profile-switching--persistence)
- [【Microphone DSP】Interface Guide](#microphone-dsp-interface-guide)
  - [Master Toggle & "🎧 Self Monitor (Test Mode)"](#master-toggle--self-monitor-test-mode)
  - [Input Source & Forwarding Target Selection](#input-source--forwarding-target-selection)
  - [4-Stage Professional DSP Tuning Pipeline](#4-stage-professional-dsp-tuning-pipeline)
- [OBS Studio & Discord / Voice Chat Integration Guide](#obs-studio--discord--voice-chat-integration-guide)
- [FAQ & Maintenance](#faq--maintenance)

---

## Prerequisite 1: Audio Devices & Virtual Channel Verification

DR_AudioRouter relies on low-latency process-level loopback, which requires two key endpoints:

1. **Black Hole Sink (Isolation Sink)**: Used as the Windows Default Output Device. All application audio initially routes here before being captured and processed independently.
   - You can use an idle hardware output (e.g., optical `SPDIF Interface`, monitor HDMI audio).
   - Alternatively, a virtual audio cable input endpoint (e.g., `Steam Streaming Speakers` or `CABLE Input`).
2. **Virtual Microphone Channel (For Mic Processing)**:
   - Due to Windows architecture, physical microphone jacks are "read-only" and cannot be written to. To feed processed microphone audio into **Discord, LINE, or in-game voice chat**, you need a virtual microphone device.
   - **Recommended**: Free [VB-CABLE](https://vb-audio.com/Cable/) driver (ultra-low latency).
   - **Alternative (No extra install)**: If you have **Steam** installed, you can enable the built-in `Steam Streaming Speakers / Microphone` pair in Windows Sound Settings.

> [!WARNING]
> **Sample Rate Alignment**:
> Press <kbd>Win</kbd> + <kbd>R</kbd>, type `mmsys.cpl`, and hit Enter. Ensure that your physical headphones, microphone, and virtual audio devices are all aligned to the exact same sample rate (recommended: **`44100 Hz`**; 16-bit or 24-bit depth are both supported).

---

## Prerequisite 2: Configuring Elevated Autostart on Windows Boot

To capture competitive games protected by anti-cheat systems (e.g., Valorant, APEX), launch DR_AudioRouter with Administrator privileges via Windows Task Scheduler:

### Step A: Set Executable Compatibility

1. Locate `DR_AudioRouter.exe`.
2. Right-click the executable $\to$ **Properties** $\to$ **Compatibility** tab.
3. Check **"Run this program as an administrator"** $\to$ Click **Apply / OK**.

### Step B: Create Windows Boot Task

1. Press <kbd>Win</kbd> + <kbd>S</kbd>, search for and open **Task Scheduler**.
2. Click **"Create Task..."** in the right Actions panel (do not select "Create Basic Task").
3. **General Tab**:
   - Name: `DR_AudioRouter_Autostart`.
   - Select **"Run only when user is logged on"** (do not select "Run whether user is logged on or not", otherwise the system tray icon will not show).
   - Check **"Run with highest privileges"**.
4. **Triggers Tab**:
   - Click "New..." $\to$ Set "Begin the task" to **"At log on"**.
   - Under Advanced settings, check **"Delay task for"** and set it to **`10 seconds`** (allows audio drivers to initialize cleanly during boot).
5. **Actions Tab**:
   - Click "New..." $\to$ Action: "Start a program".
   - **Program/script**: Browse and select your executable, e.g., `D:\software\DR_AudioRouter\DR_AudioRouter.exe`.
   - **Add arguments (optional)**: Enter `--minimized` (starts directly in the system tray).
   - **Start in (optional)**: Enter the folder path containing the binary, e.g., `D:\software\DR_AudioRouter\` (**mandatory**, ensuring `config.json` can be loaded and saved).
6. Click **OK** to save. DR_AudioRouter will now automatically launch into the system tray on user logon.

---

## Initial Launch & System Endpoints Setup (Gear Menu)

Launch `DR_AudioRouter.exe` and click the **⚙️ (Gear Icon)** in the bottom-left corner:

1. **Black Hole Sink Endpoint**:
   - Select the device intended as the isolation sink (e.g., `SPDIF Interface` or `Steam Streaming Speakers`).
   - **Critical**: Open Windows Sound Settings and set your system's default output device to this exact sink.
2. **Physical Monitor Output**:
   - Select your actual listening hardware (e.g., USB DAC, `Line (AG06/AG03)`, or onboard green headphone jack).
3. **OBS WebSocket Port**: Keep default `9876`.
4. **Buffer Latency**:
   - Recommended: **`256 frames`** (~12–15 ms, balanced mode providing anti-glitch stability and low latency).
   - Competitive esports mode: `128 frames`.
5. **Language**: Instantly switch between Traditional Chinese and English.
6. Click **"Save & Apply"**.

---

## 【System Mixer】Interface Guide

The default "🎧 System Mixer" view displays all active audio-producing applications:

### Global Baseline vs. Customized Applications (White Frame)

- **Default (Global Baseline) Card**: Located at the top. Any newly opened, uncustomized application inherits volumes and DSP settings from here.
- **Customized Applications (High-contrast White Frame)**:
  - Adjusting faders, mutes, or opening the dedicated EQ for an app isolates it from the global baseline.
  - An **↺ (Reset Button)** appears on the right edge of customized cards, clicking it returns the app to inherit global defaults.
- **Real-Time Vertical VU Meters**:
  - A vertical gradient meter (Green $\to$ Yellow $\to$ Red) next to each app icon shows real-time output in decibels (dB).
  - Closed apps switch to a **grey dot**; non-customized offline cards are automatically pruned every 60 seconds to keep the list clean.

### Dual-Channel Faders & Up to 500% Manual Input

Each application card provides two independent audio paths:

- **Channel 1 🎧 (Physical Monitor)**: Controls volume heard in your headphones.
- **Channel 2 📶 (OBS Stream Output)**: Controls volume streamed to viewers via OBS.
- **Fader & Numerical Input**:
  - Sliders adjust from `0%` to `200%`.
  - Click the numerical text box to manually type volume boosts up to **`500%`**; inputs beyond 500% trigger an error shake animation and safely revert.

### 7-Band Parametric EQ & Dynamic Volume Balance (6-Cell Grid)

Click the **EQ Icon** next to any fader to open the DSP tuning modal:

1. **Top Section: 7-Band Parametric EQ**:
   - Enable the toggle for real-time logarithmic curve visualization ($20\text{ Hz} \sim 20,000\text{ Hz}$).
   - Includes boundary constraints across sub-bass, punch, body, presence, air bands, with customizable Hz, Gain, and Q bandwidth.
2. **Bottom Section: Dynamic Volume Balance (Single-Row 6-Cell Grid)**:
   - Configured via 6 numerical input boxes:
     1. **Quiet Threshold** (Default: `-80 dB`): Audio below this level is treated as noise floor; boost is discarded to preserve natural silence.
     2. **Quiet Boost** (Default: `+30 dB`): Maximum upward amplification slope for faint sounds.
     3. **🟢 Safe Zone Min** (Default: `-10 dB`): End of upward boost slope.
     4. **🟢 Safe Zone Max** (Default: `0 dB`): Beginning of downward compression slope.
        > [!TIP]
        > **Golden Safe Zone**: Audio between [Safe Zone Min ~ Max] remains 100% untouched and transparent.
     5. **Loud Reduction** (Default: `-20 dB`): Downward compression applied to loud spikes.
     6. **Loud Max Limit** (Default: `+40 dB`): Slope ceiling; extreme audio above this level is not clipped, but retains the maximum reduction amount.
   - **Validation Guards**: Values must strictly satisfy `Quiet Threshold < Safe Min < Safe Max < Loud Max`. Invalid values flash red, display a warning toast, and revert.

### Profile Switching & Persistence

- Switch between multiple profiles (e.g., "FPS Competitive Footsteps", "Media & Entertainment") via the top-left dropdown.
- Indicator light:
  - **Green**: Saved and synced to `config.json`.
  - **Pulsing Orange**: Unsaved changes exist; click **"💾 Save"** to persist.

---

## 【Microphone DSP】Interface Guide

Click the top-right **"🎙️ Microphone"** tab to access the 4-stage vocal processing chain:

### Master Toggle & "🎧 Self Monitor (Test Mode)"

- **Enable Mic Processing**: Default off (backend capture thread sleeps at 0% CPU when disabled). Check to activate the pipeline.
- **🎧 Self Monitor (Test Mode)**: Seamlessly mixes processed mic audio directly into your physical monitor stream without device conflicts, allowing live testing before streaming.

### Input Source & Forwarding Target Selection

- **🎙️ Microphone Source (Input)**: Select your physical mic (e.g., `Line (AG06/AG03)`).
- **🔊 Forward Target**:
  - Devices marked with **`🎙️`** at the top are virtual mic channels (e.g., `CABLE Input` or `Steam Streaming...`). Physical mics are locked as read-only.
  - Devices marked with **`🎧`** below are idle playback speakers (for direct OBS output capture).

### 4-Stage Professional DSP Tuning Pipeline

Configure stages top to bottom:

1. **Stage 1: High-Pass Filter (HPF Low-cut)**
   - Default: `80 Hz`. Eliminates desk rumbles, air conditioner hum, and plosive wind noise.
2. **Stage 2: AI Noise Suppression (`nnnoiseless`)**
   - Click the **`📜 nnnoiseless`** badge for BSD licensing notices.
   - Three-tier controls:
     - **① Input Pre-Gain**: Up to `500%` with soft saturation protection to boost quiet microphones before neural inference.
     - **② Voice Confidence Threshold (VAD Gate)**: Default `45%`. Suppresses background chatter when you are not speaking and prevents noise floor amplification in Stage 4.
     - **③ Noise Reduction Depth**: Default `95%`. Controls filtering intensity for fan and mechanical keyboard noise.
3. **Stage 3: 7-Band Voice Parametric EQ**
   - Fine-tunes vocal warmth, body, articulation, and presence with logarithmic curve feedback.
4. **Stage 4: Dynamic Volume Balance (6-Cell Grid)**
   - Default: `-55 / 10 / -35 / 0 / -20 / 40`.
   - Smoothly lifts quiet whispers by `+10 dB` while compressing loud shouts by `-20 dB` to eliminate clipping.

---

## OBS Studio & Discord / Voice Chat Integration Guide

### Routing Processed Mic to Discord / In-Game Chat

1. In DR_AudioRouter's Microphone tab, set Forward Target to **`CABLE Input`** (or Steam Virtual Channel).
2. Open Discord $\to$ User Settings $\to$ Voice & Video:
   - **Input Device**: Select **`CABLE Output`** (or `Microphone (Steam Streaming Microphone)`).
   - Disable Discord's built-in "Noise Suppression (Krisp)" to avoid double-processing.

### Routing to OBS Studio

- **Desktop & Game Audio (Dual-Channel)**:
  1. Click **"OBS: 9876"** in the top toolbar to copy the URL.
  2. In OBS, add a "Browser Source", paste the URL, and check "Control audio via OBS".
- **Processed Microphone Audio**:
  - Under OBS Settings $\to$ Audio, set "Mic/Auxiliary Audio" to **`CABLE Output`** to capture a dedicated, leveled microphone channel.

---

## FAQ & Maintenance

### Q1: Why can't I hear Windows notification sounds (screenshots, volume slider dings)?

- **By Design**: Windows system sounds are synthesized by the audio kernel without dedicated application PIDs, routing into the black hole sink.
- **Esports Advantage**: Prevents sudden OS errors, USB disconnect sounds, or screenshots from disrupting competitive focus during clutches.

### Q2: How do I back up my settings and profiles?

- All device configurations, profile volumes, 7-band EQ curves, and dynamic leveler parameters are stored in **`config.json`** next to the executable.
- Back up `config.json` to safely migrate your exact audio environment across computers.