# ⚡ FLUXA — Next-Gen Stream & Video Hub (Cyber-Cyan Edition)

**Fluxa** is a streaming and on-demand video platform merging the rich video discovery of YouTube with the interactive, live-centric layout of Twitch—styled in an electric **Cyber-Cyan** (`#00f0ff`) dark-ops HUD aesthetic.

---

## 🚀 Quick Start

From the workspace root (`c:\Users\varshan\Downloads\projects\zen-pipe`):
```bash
npm run dev
```
Or directly inside `fluxa`:
```bash
cd fluxa
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) (or `http://localhost:3001` if port 3000 is occupied).

To create a production build:
```bash
npm run build
```

---

## 🎨 Key Features & Architecture

### 1. 🌌 Cyber-Cyan HUD Aesthetic
- Built with **Tailwind CSS v4** and inspired by `vibe-ui-designer` Cyberpunk / Dark Ops tokens.
- Obsidian base (`#07090e`), translucent glass panels (`rgba(13, 19, 34, 0.85)`), electric cyan glowing accents (`#00f0ff`), and custom HUD corner brackets.
- Dual-font typography: `Inter` for clean UI body text paired with `JetBrains Mono` for timestamps, viewer counts, and HUD metrics.

### 2. 📺 Twitch-Style Layout & Navigation
- **Collapsible Sidebar**:
  - **Followed Channels**: Real-time pulsing cyan live indicators, viewer counts (e.g. `34.2K`), category badges, and quick stream launching.
  - **Recommended Channels**: Offline/live indicators.
  - **Platform Navigation**: Quick links to Home, Browse, Live Broadcast Directory, Clips & Shorts, and My Cyber Vault.
  - **Collapsed View**: Icon-only mode with tooltips and live viewer badges.
- **Top HUD Navbar**:
  - Global search bar with `Ctrl+K` hotkey and search suggestions.
  - **"Load URL" HUD Modal**: Paste any direct MP4 URL or YouTube link/ID (`dQw4w9WgXcQ`, watch URL, shorts) to stream it live inside Fluxa.
  - **Flux Sparks Balance** (`1,250 Sparks`) with animated icon.
  - **"Go Live"** simulation modal for instant broadcasting.
  - Notifications bell and Whisper direct messages menu.

### 3. 🎬 Dual-Mode Video Player
- Seamless toggle between **Twitch Theater Mode** (massive player with side-by-side stream chat) and **Standard Mode**.
- **Cyber-Cyan Controls**:
  - Neon cyan scrubber with buffer track, glowing thumb, and hover timestamp tooltip.
  - Play/Pause, volume control with mute memory, playback speed (`0.5x` to `2x`), and quality selector (`1080p60`, `720p`, `480p`, `Auto`).
  - Fullscreen, Picture-in-Picture (`PiP`), and hotkeys (`Space`, `F`, `M`, `T`, arrow keys).
  - Dual source engine: plays direct HTML5 MP4/WebM videos and embeds YouTube streams automatically.

### 4. 💬 Twitch Stream Chat with Emotes & Sparks
- Real-time animated chat stream simulating community traffic with auto-scroll and "Chat paused due to scroll" pill.
- **Badges**: MOD (green shield), VIP (pink diamond), SUB (cyan star), VERIFIED (blue checkmark), HOST (amber crown).
- **Custom Cyber Emotes**: `:cyan:`, `:hype:`, `:fire:`, `:gg:`, `:pog:`, `:zen:`, and `:cyber:` with an interactive emote picker popover.
- **Flux Sparks Cheering**: Cheer button triggering `canvas-confetti` fireworks and highlighted chat cheer alerts.
- Interactive chat input: Type messages and chat alongside simulated users.

### 5. 📱 Clips & Shorts Viewer
- Vertical 9:16 full-viewport clip viewer inspired by Twitch Clips and YouTube Shorts.
- Action rail: Like counter, comments drawer, save to vault, share button, and creator profile.
- Sound track ticker animation and keyboard arrow up/down navigation.

### 6. 📂 My Cyber Vault & Library
- Dedicated library page storing liked broadcasts, saved streams, and followed creator profiles.

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript + Vite 6
- **Styling**: Tailwind CSS v4 + Lucide React
- **Celebration Effects**: Canvas Confetti
- **State Management**: React Context (`FluxaContext`) with live chat simulation circular buffer
