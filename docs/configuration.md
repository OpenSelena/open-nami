# Configuration

Open Nami supports persistent settings via JSON configuration, interactive in-app settings, and environment variables.

---

## Configuration File

Settings are saved in `~/.open-nami/config.json` (or the path set in `OPEN_NAMI_CONFIG`):

```json
{
  "theme": "dark",
  "downloadDir": "D:\\Media\\SocialArchive",
  "cookiesDir": "D:\\Media\\cookies",
  "cookiesFromBrowser": "auto",
  "writeMetadata": false,
  "defaultLimit": 50
}
```

### Options

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `theme` | `"auto" \| "light" \| "dark"` | `"auto"` | Color palette used across the terminal interface. |
| `downloadDir` | `string` | System Downloads | Base folder where files are organized into `<platform>/<username>/`. |
| `cookiesDir` | `string` | Auto-detected | Directory scanned for Netscape cookie files. |
| `cookiesFromBrowser` | `string` | `"auto"` | Browser Cookie Bridge setting: `"auto"` (OS default browser), `"none"` (manual cookie files only), or a browser ID (`"chrome"`, `"edge"`, `"brave"`, `"firefox"`, `"zen"`, `"chromium"`, `"librewolf"`, `"waterfox"`, `"helium"`, `"opera"`, `"vivaldi"`). |
| `writeMetadata` | `boolean` | `false` | Save post captions and metadata to sidecar `.json` files alongside downloaded media. |
| `defaultLimit` | `number` | Unset (all) | Default maximum number of items to download per profile when `--limit` is not specified. |

---

## Interactive Settings Menu

While inside the interactive TUI, press **`Ctrl+S` (`^s`)** anytime to open the settings view (`Tab` or `↑`/`↓` switches fields, `Space` toggles or cycles values, `^s` saves, `Esc` cancels):

* **Cookies Folder**: Enter or edit the folder path where your Netscape `.txt` cookie files live.
* **Browser Cookie Bridge**: Cycle browser cookie extraction mode (`auto`, `none`, or detected installed browsers).
* **Download Directory**: View or modify the default root save path.
* **Write Captions & Metadata Sidecars (.json)**: Toggle `[ENABLED]` or `[DISABLED]`.
* **Default Post Limit**: Cycle the default per-profile item limit (`ALL`, `10`, `25`, `50`, `100`).
* **System Diagnostics**: Displays Node.js version, engine availability (`gallery-dl`, `yt-dlp`, `ffmpeg`), SQLite storage status, and detected cookies.
* **Theme Switching**: Cycle through color themes on the fly with **`Ctrl+T` (`^t`)**.

---

## Environment Variables

For headless environments, containerized deployments, or portable drives, you can override settings with environment variables:

| Variable | Description |
| :--- | :--- |
| `OPEN_NAMI_CONFIG` | Custom path to the JSON config file (default: `~/.open-nami/config.json`). |
| `OPEN_NAMI_DB` | Custom path to the SQLite tracking/history database (default: `~/.open-nami/nami.db`). |
| `OPEN_NAMI_DIR` | Root folder override for downloads (when `-o` is omitted) and parent directory for `.open-nami/bin/` (when `OPEN_NAMI_BIN_DIR` is unset). |
| `OPEN_NAMI_BIN_DIR` | Custom directory for standalone engine executables (`gallery-dl`, `yt-dlp`). |
| `OPEN_NAMI_COOKIES_DIR` | Directory containing Netscape cookie files (takes precedence over `cookiesDir` in `config.json`). |
| `GALLERY_DL_PATH` | Explicit path to a custom `gallery-dl` executable. |
| `YT_DLP_PATH` | Explicit path to a custom `yt-dlp` executable. |

### Path Resolution Hierarchy

When resolving the base download folder, Open Nami checks in this order:

1. Command-line argument (`-o, --output <dir>`).
2. `OPEN_NAMI_DIR` (or legacy `NAMI_DIR`) environment variable.
3. `downloadDir` in `config.json`.
4. `NAMI_BASE_DIR` environment variable (legacy fallback).
5. Auto-detected system Downloads folder (`Open Nami` subfolder):
   * **Windows**: Reads the relocated shell folder path from Windows Registry (`HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders`).
   * **Linux**: Reads `XDG_DOWNLOAD_DIR` from `~/.config/user-dirs.dirs`.
   * **macOS / Fallback**: `~/Downloads`.
