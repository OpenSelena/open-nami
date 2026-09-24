# CLI Reference

Open Nami runs both as an interactive TUI and as a scriptable command-line tool.

---

## Command Aliases

When installed globally, Open Nami registers four equivalent command aliases in your system `PATH`:

| Command | Purpose |
| :--- | :--- |
| `open-nami` | Canonical full name |
| `opennami` | Unhyphenated variant |
| `nami` | Short daily driver |
| `on` | Two-letter shortcut |

Every option, flag, and argument documented below works identically with any alias.

---

## Synopsis

```bash
# Launch interactive TUI
open-nami

# Open directly with a profile link or username
open-nami <profile-url-or-handle> [options]

# Headless / direct download
open-nami <profile-url-or-handle> --photos [options]
open-nami <profile-url-or-handle> --videos [options]
open-nami <profile-url-or-handle> --all [options]
```

---

## Options & Flags

### Target Filters
These flags skip the interactive picker and download the selected media category directly:

| Flag | Description | Supported Platforms |
| :--- | :--- | :--- |
| `--photos` | Download photos only | Instagram, TikTok, Facebook, X |
| `--videos` | Download videos and reels only | Instagram, TikTok, Facebook, X |
| `--stories` | Download active stories only | Instagram *(requires cookies)* |
| `--highlights` | Download pinned profile highlights only | Instagram *(requires cookies)* |
| `--all` | Download all available media categories | All platforms |

### Destination & Storage

| Flag | Argument | Description | Default |
| :--- | :--- | :--- | :--- |
| `-o, --output` | `<path>` | Custom output directory | `~/Downloads/Open Nami/<platform>/<user>/` |

### Engine Maintenance

| Flag | Description |
| :--- | :--- |
| `-U, --update` | Update bundled download engines (`yt-dlp` and `gallery-dl`) to latest release |
| `--update-ytdlp` | Update only the bundled `yt-dlp` executable |
| `--update-gallerydl` | Update only the bundled `gallery-dl` executable |

### Appearance

| Flag | Argument | Description | Default |
| :--- | :--- | :--- | :--- |
| `--theme` | `<mode>` | Set interface color theme: `auto`, `light`, or `dark` | `auto` |

### Shell Autocompletion

| Flag | Argument | Description |
| :--- | :--- | :--- |
| `--completion` | `<shell>` | Generate shell script: `bash`, `zsh`, `fish`, or `powershell` |

### General

| Flag | Description |
| :--- | :--- |
| `-h, --help` | Print help manual and exit |
| `-v, --version` | Print current package version and exit |

---

## Input Formats

Open Nami accepts profile targets in three formats:

1. **Full URL**:
   ```bash
   nami https://www.instagram.com/natgeo/
   nami https://www.tiktok.com/@charlidamelio
   nami https://x.com/OpenAI
   ```

2. **Handle with @ prefix**:
   ```bash
   nami @taylorswift
   ```
   *(Opens platform selection screen if the platform cannot be inferred).*

3. **Platform Shortcut Prefix**:
   ```bash
   nami ig:selenagomez       # Instagram
   nami tt:zachking          # TikTok
   nami fb:NASA              # Facebook
   nami x:elonmusk           # X (Twitter)
   ```

---

## Automation & Scripting

When run in a non-interactive shell (CI/CD, cron jobs, background scripts) with both an input and a target flag, Open Nami runs headlessly without rendering the TUI:

```bash
# Archive all photos from a creator every midnight
nami @creator --photos -o "/data/archives" >> /var/log/nami.log 2>&1
```

### Exit Codes

* `0`: Success (media items downloaded or already archived).
* `1`: Extraction error, invalid profile URL, or network failure.
