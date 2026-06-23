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
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20Linux-lightgrey" alt="Platform: Windows | Linux">
</p>

---

## ✨ Features

### 🛡️ Privacy (Brave-level)
- **Fingerprint protection** — Firefox's ResistFingerprinting enabled by default + letterboxing
- **Enhanced Tracking Protection** — Strict mode with social tracking, fingerprinting, and cryptomining blocked
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
- Keyboard navigation (↑↓↵Esc)

### 🧩 Features
- **Built-in uBlock Origin** — bundled and locked (non-removable)
- **Vertical tabs** — inherited from Zen Browser
- **Workspaces** — tab groups and workspace switching
- **Tab suspend** — automatically free memory from inactive tabs
- **Customization engine** — live theme editor, accent colours, layout profiles

---

## 🚀 Building on Windows

### Prerequisites

| Requirement | Notes |
|------------|-------|
| Windows 10/11 64-bit | Required |
| **7-Zip** | [Download here](https://7-zip.org/download.html) — needed to extract Firefox source |
| **Visual Studio 2022** | [Community Edition (free)](https://visualstudio.microsoft.com/vs/community/) — install with "Desktop development with C++" workload |
| **Windows SDK** | Comes with Visual Studio 2022 |
| **Python 3** | [Download here](https://www.python.org/downloads/) — check "Add to PATH" |
| **Node.js 18+** | [Download here](https://nodejs.org/) |
| **Rust** | Run: `rustup-init.exe` from https://rustup.rs/ |

### Step-by-step

```powershell
# 1. Clone the repo
git clone https://github.com/BarniKjellerenXD/glint-browser.git
cd glint-browser

# 2. Install Surfer and dependencies
npm install

# 3. Download Firefox source code
npm run download
# ⚠ If you get '7z' not found: either install 7-Zip and add to PATH,
#    or manually extract .surfer\engine\firefox-*.source.tar.xz to engine\

# 4. Apply Glint patches onto Firefox source
npm run import

# 5. Bootstrap the build environment (installs MozillaBuild, etc.)
npm run bootstrap

# 6. Build! This takes 30-60 minutes on first run
npm run build

# 7. Run the browser
cd engine
python mach run
```

### Fast Iteration (UI changes only)

After the first full build, UI changes (CSS/JS) rebuild in 2-5 minutes:

```powershell
# Edit files in src/, then:
npm run import
npm run build:ui
cd engine
python mach run
```

### Troubleshooting

| Error | Solution |
|-------|----------|
| `'7z' is not recognized` | Install 7-Zip and add `C:\Program Files\7-Zip\` to your PATH, then restart terminal |
| `cl.exe not found` | Run from **"Developer Command Prompt for VS 2022"** instead of regular PowerShell |
| `python not found` | Install Python 3, check "Add to PATH", restart terminal |
| `mach build fails` | Ensure you ran `npm run bootstrap` first — it installs Mozilla's build dependencies |
| Linker errors | Run from VS Developer Command Prompt, not regular PowerShell |

---

## 🚀 Building on Linux

```bash
# Install dependencies
sudo apt update && sudo apt install -y \
  build-essential curl python3 python3-pip python3-venv \
  nodejs npm rustc cargo clang llvm \
  libgtk-3-dev libdbus-glib-1-dev libpulse-dev \
  libasound2-dev libx11-dev libxext-dev libxrender-dev \
  libxt-dev libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev \
  libglib2.0-dev libpango1.0-dev libcairo2-dev libatk1.0-dev \
  libgdk-pixbuf2.0-dev libdrm-dev libxcb-shm0-dev \
  libxcb-xfixes0-dev nasm yasm ccache

# Clone and build
git clone https://github.com/BarniKjellerenXD/glint-browser.git
cd glint-browser
npm install
npm run download
npm run import
npm run build
cd engine && python3 ./mach run
```

---

## 📁 Project Structure

```
glint-browser/
├── branding/            # App icon, locale files, brand identity
├── configs/             # Build configuration per platform
│   ├── common/          # Shared mozconfig (all platforms)
│   └── windows/         # Windows-specific build flags
├── prefs/               # Default preference overrides
│   ├── firefox/         # Firefox privacy & telemetry overrides
│   └── glint/           # Glint-specific preferences
├── src/                 # 🔥 Glint's custom code — patches against Firefox
│   ├── browser/         # Browser chrome (XUL/JS/CSS)
│   │   ├── base/        # about:glint page
│   │   ├── components/  # Quick Commands, settings engine
│   │   └── themes/      # Liquid Glass CSS theme
│   ├── glint/           # C++ utility components (farbling engine)
│   └── ...              # Other Firefox directory mirrors
├── engine/              # ⚡ Firefox source (auto-downloaded, not committed)
├── .surfer/             # Surfer cache (downloads, temp files)
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

- **v0.1.0** (Current) — Foundation: Liquid Glass UI, Quick Commands, privacy hardening, uBlock Origin
- **v0.2.0** — Native C++ fingerprint farbling, macOS build
- **v0.3.0** — Full customization editor, theme store concept, native adblock engine
- **v1.0.0** — Stable release, cross-platform, performance tuning

---

## 📜 License

Glint Browser is licensed under the **Mozilla Public License 2.0**.

Built on [Zen Browser](https://github.com/zen-browser/desktop) (MPL-2.0) and [Mozilla Firefox](https://hg.mozilla.org/mozilla-central) (MPL-2.0).

---

<p align="center">
  <sub>Made with ❤️ by BarniKjellerenXD</sub>
</p>
