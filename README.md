<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/OpenSelena/open-nami/main/assets/logo-dark.svg">
    <img src="https://raw.githubusercontent.com/OpenSelena/open-nami/main/assets/logo-light.svg" alt="Open Nami" width="240">
  </picture>
</p>

<p align="center">
  <b>Fast terminal social media profile downloader and TUI.</b><br/>
  Bulk download photos, videos, stories, and highlights from Instagram, TikTok, Facebook, and X.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/open-nami"><img src="https://img.shields.io/npm/v/open-nami.svg?color=C15F3C" alt="npm version"></a>
  <a href="https://pypi.org/project/nami/"><img src="https://img.shields.io/pypi/v/nami.svg?color=3775A9" alt="PyPI version"></a>
  <a href="https://github.com/OpenSelena/open-nami/actions/workflows/ci.yml"><img src="https://github.com/OpenSelena/open-nami/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="Node version"></a>
  <a href="https://github.com/OpenSelena/open-nami/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

---

## Key Features

- **Interactive Terminal UI**: Keyboard-driven navigation with auto, dark, and light themes (`Ctrl+T`).
- **Auto-Provisioned Engines**: Automatically downloads standalone `gallery-dl` and `yt-dlp` executables into `~/.open-nami/bin/` on first launch if not installed.
- **In-Place Scraper Updates**: Run `nami -U` anytime to fetch the latest scraper engine releases.
- **Four Command Aliases**: `open-nami`, `opennami`, `nami`, and `on`.
- **Targeted Category Extraction**: Download photos, videos, stories, highlights, or complete profile archives.
- **Automatic Directory Sorting**: Saves to your system Downloads folder under `<platform>/<username>/<category>/`. Override anytime with `-o, --output <dir>`.
- **Anti-Bot & Anti-Ban Hardening**:
  - TikTok carousels: disables video extraction flags to prevent 403 errors on photo slides.
  - TikTok videos: passes Chrome TLS impersonation (`--impersonate chrome`) through yt-dlp to clear Akamai WAF challenges.
  - Instagram: throttles GraphQL pagination with jittered intervals (`2.0s–2.8s`) and downloads directly from Meta CDN edges.
- **Isolated Cookie Sessions**: Clones Netscape cookie files to an ephemeral temporary directory (`chmod 0600`) with automatic cleanup to prevent session corruption.
- **100% Local & Private**: Direct connections between your machine and platform servers. Zero telemetry, zero external tracking servers.

---

## Installation & Quick Start

### Installation

```sh
# npm (global)
npm install -g open-nami

# pip (Python)
pip install nami

# Homebrew (macOS & Linux)
brew install OpenSelena/tap/open-nami

# One-liner script (macOS & Linux)
curl -fsSL https://raw.githubusercontent.com/OpenSelena/open-nami/main/install.sh | sh

# Run without installing
npx open-nami [profile-or-url]
```

### Quick Start

Launch the interactive interface using any alias:
```sh
nami
# or
on
# or
open-nami
```

Jump straight to a profile:
```sh
nami https://www.instagram.com/natgeo/
on @taylorswift
nami tt:zachking
```

Direct headless downloads:
```sh
# Photos only
nami @creator --photos

# Videos only
nami tt:creator --videos

# Instagram stories
nami ig:username --stories

# Full profile archive
nami @username --all

# Update engines
nami -U
```

### Hotkeys in TUI

| Key | Action |
| :--- | :--- |
| **`[Tab]`** | Paste URL from clipboard |
| **`[Enter]`** | Submit URL / Start download |
| **`[↑ / ↓]`** | Navigate format options |
| **`[^s]`** *(Ctrl+S)* | Settings (cookies & download directory) |
| **`[^t]`** *(Ctrl+T)* | Cycle theme (`auto` / `light` / `dark`) |
| **`[o]`** | Open destination folder in file manager |
| **`[Esc]`** | Back to URL input |
| **`[^c]`** *(Ctrl+C)* | Quit |

### Interface Demo

#### 1. Paste Profile URL
<p align="center">
  <img src="https://raw.githubusercontent.com/OpenSelena/open-nami/main/assets/home.png" alt="URL Input Screen" width="100%">
</p>

#### 2. Select Media Category
<p align="center">
  <img src="https://raw.githubusercontent.com/OpenSelena/open-nami/main/assets/picker.png" alt="Media Target Picker" width="100%">
</p>

#### 3. Real-Time Download Progress
<p align="center">
  <img src="https://raw.githubusercontent.com/OpenSelena/open-nami/main/assets/downloading.png" alt="Real-time download progress" width="100%">
</p>

---

## Documentation

Full guides and technical specifications are available in the [`docs/`](https://github.com/OpenSelena/open-nami/tree/main/docs) directory:

- **[CLI Reference](https://github.com/OpenSelena/open-nami/blob/main/docs/cli-reference.md)**: Command flags, options, exit codes, and non-interactive scripting.
- **[Configuration Guide](https://github.com/OpenSelena/open-nami/blob/main/docs/configuration.md)**: `~/.open-nami/config.json` schema, settings menu, and environment variables.
- **[Cookie Authentication](https://github.com/OpenSelena/open-nami/blob/main/docs/cookies.md)**: Authenticated downloads for stories, highlights, private profiles, and ephemeral isolation.
- **[Anti-Bot Hardening](https://github.com/OpenSelena/open-nami/blob/main/docs/anti-bot.md)**: WAF mitigations, TLS fingerprint impersonation, request jitter, and 429 backoff.
- **[Shell Autocompletion](https://github.com/OpenSelena/open-nami/blob/main/docs/autocompletion.md)**: Autocomplete configuration for Bash, Zsh, Fish, and PowerShell.
- **[Fair Use Notice](https://github.com/OpenSelena/open-nami/blob/main/docs/fair-use.md)**: Section 107 copyright principles, personal archiving, and legal disclosures.

---

## License & Inquiries

Open Nami is released under the [MIT License](https://github.com/OpenSelena/open-nami/blob/main/LICENSE).

- **Organization**: [OpenSelena](https://github.com/OpenSelena)
- **Email**: [igect@vk.com](mailto:igect@vk.com)
