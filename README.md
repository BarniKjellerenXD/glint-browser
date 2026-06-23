# Glint Browser

<p align="center">
  <img src="branding/glint.svg" width="128" height="128" alt="Glint">
</p>

<p align="center">
  <strong>A privacy-focused, glassmorphic Gecko browser.</strong><br>
  Brave-grade privacy. Vivaldi-level features. Liquid Glass design.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/engine-Gecko-blue" alt="Engine: Gecko">
  <img src="https://img.shields.io/badge/license-MPL--2.0-purple" alt="License: MPL-2.0">
  <img src="https://img.shields.io/badge/status-alpha-orange" alt="Status: Alpha">
</p>

---

## ✨ Features

### 🛡️ Privacy (Brave-level)
- **Fingerprint Farbling** — Per-eTLD+1 randomization of hardwareConcurrency, screen resolution, canvas fingerprints, WebAudio, and plugin lists
- **Enhanced Tracking Protection** — Strict mode by default with social tracking, fingerprinting, and cryptomining blocked
- **HTTPS-Only mode** enabled by default
- **DNS over HTTPS** via Quad9
- **Telemetry fully stripped** — no Mozilla services, no studies, no experiments

### 🎨 Liquid Glass Design
- **Frosted glass chrome** — every UI element uses `backdrop-filter: blur()` with semi-transparent backgrounds
- **Animated wallpaper** — subtle aurora-like hue-shifting gradient behind transparent elements
- **Design token system** — all colours, blurs, radii, and shadows are CSS custom properties
- **5 wallpaper themes** — Aurora, Sunset, Ocean, Forest, Midnight
- **6 accent colours** — Purple-Blue (default), Green, Pink, Blue, Orange, Teal

### ⚡ Quick Commands (Ctrl+E)
- Universal spotlight search — **Ctrl+E** opens a glassmorphism overlay
- Searches across: open tabs, bookmarks, history, browser commands, settings, and the web
- 24 built-in commands: New Tab, New Window, Switch Profile, Mute Tab, Screenshot, DevTools, and more
- Fuzzy search with section-grouped results
- Keyboard navigation (↑↓↵Esc)

### 🧩 Features
- **Built-in uBlock Origin** — bundled and locked (non-removable)
- **Web panels** — embed sites like WhatsApp, Discord, or Calendar in the sidebar
- **Notes widget** — rich text editor in the sidebar
- **Vertical tabs** — inherited from Zen Browser
- **Workspaces** — tab groups and workspace switching
- **Tab suspend** — automatically free memory from inactive tabs
- **Customization engine** — live theme editor, accent colours, layout profiles

---

## 🚀 Building

### Prerequisites

| Requirement | Minimum |
|------------|---------|
| RAM | 16GB (32GB recommended) |
| CPU | 4+ cores (8+ recommended) |
| Disk | 40GB free |
| OS | Linux (x86_64 or ARM64) |

### Build Steps

```bash
# 1. Install system dependencies (Debian/Ubuntu)
sudo apt update && sudo apt install -y \
  build-essential curl python3 python3-pip python3-venv \
  nodejs npm rustc cargo clang llvm \
  libgtk-3-dev libdbus-glib-1-dev libpulse-dev \
  libasound2-dev libx11-dev libxext-dev libxrender-dev \
  libxt-dev libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev \
  libglib2.0-dev libpango1.0-dev libcairo2-dev libatk1.0-dev \
  libgdk-pixbuf2.0-dev libdrm-dev libxcb-shm0-dev \
  libxcb-xfixes0-dev nasm yasm ccache

# 2. Clone and build
git clone https://github.com/BarniKjellerenXD/glint-browser.git
cd glint-browser
npm install
npm run download      # Downloads Firefox engine (~4GB)
npm run import        # Applies Glint patches
npm run build         # Full build (~30-60 min)

# 3. Run
npm run start         # Launch with temp profile
# OR
npm run start:profile # Launch with persistent profile
```

### Fast Iteration (UI changes only)

After the first full build, UI changes (CSS/JS/XHTML) rebuild in ~2-5 minutes:

```bash
# Edit files in src/, then:
npm run import
npm run build:ui
npm run start
```

### C++ Changes

After modifying farbling patches or other C++ code:

```bash
npm run import
npm run build  # Full rebuild required for C++ changes
```

---

## 📁 Project Structure

```
glint-browser/
├── branding/            # App icon, locale files, brand identity
├── configs/             # Build configuration per platform
├── prefs/               # Default preference overrides
│   ├── firefox/         # Firefox privacy & telemetry overrides
│   └── glint/           # Glint-specific preferences
├── src/                 # 🔥 Glint's custom code — patches against Firefox
│   ├── browser/         # Browser chrome (XUL/JS/CSS)
│   │   ├── base/        # about:glint page
│   │   ├── components/  # Quick Commands, settings, notes
│   │   └── themes/      # Liquid Glass CSS theme
│   ├── dom/             # DOM engine patches (farbling)
│   ├── glint/           # C++ utility components
│   └── netwerk/         # Network hooks
├── engine/              # ⚡ Firefox source (auto-downloaded, not committed)
├── surfer.json          # Surfer build configuration
└── package.json         # Build scripts
```

---

## ⚙️ Key Bindings

| Shortcut | Action |
|----------|--------|
| `Ctrl+E` | Quick Commands (spotlight) |
| `Ctrl+T` | New Tab |
| `Ctrl+W` | Close Tab |
| `Ctrl+Shift+T` | Reopen Closed Tab |
| `Ctrl+N` | New Window |
| `Ctrl+Shift+P` | New Private Window |
| `Ctrl+M` | Mute/Unmute Tab |
| `Ctrl+D` | Bookmark Page |
| `Ctrl+Shift+S` | Take Screenshot |
| `F12` | Developer Tools |

---

## 🗺️ Roadmap

- **v0.1.0** (Current) — Foundation: Liquid Glass UI, Quick Commands, fingerprint farbling, uBlock Origin
- **v0.2.0** — Native Rust adblock engine, macOS build
- **v0.3.0** — Full customization editor, theme store concept, Windows build
- **v1.0.0** — Stable release, cross-platform, performance tuning

---

## 📜 License

Glint Browser is licensed under the **Mozilla Public License 2.0**. See [LICENSE](LICENSE) for details.

Built on [Zen Browser](https://github.com/zen-browser/desktop) (MPL-2.0) and [Mozilla Firefox](https://hg.mozilla.org/mozilla-central) (MPL-2.0).

---

<p align="center">
  <sub>Made with ❤️ by BarniKjellerenXD</sub>
</p>
