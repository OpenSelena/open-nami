# Configuration

Open Nami supports persistent settings via JSON configuration, interactive in-app settings, and environment variables.

---

## Configuration File

Settings are saved in `~/.open-nami/config.json`:

```json
{
  "theme": "dark",
  "downloadDir": "D:\\Media\\SocialArchive",
  "cookiesDir": "D:\\Media\\cookies"
}
```

### Options

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `theme` | `"auto" \| "light" \| "dark"` | `"auto"` | Color palette used across the terminal interface. |
| `downloadDir` | `string` | System Downloads | Base folder where files are organized into `<platform>/<username>/`. |
| `cookiesDir` | `string` | Auto-detected | Directory scanned for Netscape cookie files. |

---

## Interactive Settings Menu

While inside the interactive TUI, press **`Ctrl+S` (`^s`)** anytime to open the settings view:

* **Cookies Directory**: Enter or edit the folder path where your `.txt` Netscape cookie files live.
* **Download Directory**: View or modify the default root save path.
* **Theme Switching**: Cycle through color themes on the fly with **`Ctrl+T` (`^t`)**.

---

## Environment Variables

For headless environments, containerized deployments, or portable drives, you can override settings with environment variables:

| Variable | Description |
| :--- | :--- |
| `OPEN_NAMI_DIR` | Root folder for Open Nami data, configuration, and engines. |
| `OPEN_NAMI_BIN_DIR` | Custom directory for standalone engine executables (`gallery-dl`, `yt-dlp`). |
| `OPEN_NAMI_COOKIES_DIR` | Directory containing Netscape cookie files. |
| `GALLERY_DL_PATH` | Explicit path to a custom `gallery-dl` executable. |
| `YT_DLP_PATH` | Explicit path to a custom `yt-dlp` executable. |

### Path Resolution Hierarchy

When resolving the base download folder, Open Nami checks in this order:

1. Command-line argument (`-o, --output <dir>`).
2. `downloadDir` in `~/.open-nami/config.json`.
3. `OPEN_NAMI_DIR` environment variable.
4. Auto-detected system Downloads folder:
   * **Windows**: Reads the relocated shell folder path from Windows Registry (`HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders`).
   * **Linux**: Reads `XDG_DOWNLOAD_DIR` from `~/.config/user-dirs.dirs`.
   * **macOS / Fallback**: `~/Downloads`.
