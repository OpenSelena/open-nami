# Cookie Authentication & Isolation

When downloading stories, highlights, or private profiles you follow, social media platforms require an authenticated session. Open Nami supports browser cookie extraction via the Browser Cookie Bridge and standard Netscape-format cookie files with ephemeral isolation.

---

## When Are Cookies Needed?

| Target / Content | Cookies Required? | Notes |
| :--- | :--- | :--- |
| **Public photos & videos** | No | Extracted as guest via CDN edges. |
| **Instagram Stories** | **Yes** | Instagram requires a logged-in account to view stories. |
| **Instagram Highlights** | **Yes** | Highlight tray requires session auth. |
| **Private accounts** | **Yes** | You must follow the private account on the logged-in session. |
| **Age-restricted media** | **Yes** | Required for accounts with age verification gates. |

---

## Browser Cookie Bridge (`cookiesFromBrowser`)

By default (`"cookiesFromBrowser": "auto"` in `~/.open-nami/config.json`), Open Nami detects your system default browser when no manual cookie file is present for the target platform. You can also set a specific browser or `"none"` in Settings (`^s`) or `config.json`.

Behavior differs by browser engine:

* **Firefox, Zen, and LibreWolf (Gecko `cookies.sqlite`)**: Open Nami copies the browser's `cookies.sqlite` (and `-wal` if present) to an ephemeral temporary SQLite file, reads platform cookies from `moz_cookies`, and exports a temporary Netscape cookie file (`0o600`). That cookie file is passed to both **Tier 1 native extractors** and **Tier 2 engines** (`gallery-dl` and `yt-dlp` via `--cookies`), avoiding database lock conflicts while the browser is running.
* **Chromium-based browsers (Chrome, Chromium, Edge, Brave, Helium, Opera, Vivaldi)**: Open Nami passes `--cookies-from-browser <browser>` (or `chrome:<profileDir>` for Helium) to **Tier 2 engines (`gallery-dl` and `yt-dlp`) only**. Tier 1 native extractors do not receive cookies from Chromium-based browsers unless you export a Netscape `.txt` cookie file manually.
* **Disabled (`"none"`)**: Skips browser cookie extraction and uses manual Netscape cookie files only.

---

## File Format & Naming

Open Nami reads plain-text cookie files in standard **Netscape / Mozilla format** (files must be larger than 20 bytes).

Name your cookie files by platform inside your cookies directory:

* `instagram.com_cookies.txt`
* `tiktok.com_cookies.txt`
* `facebook.com_cookies.txt` (or `fb.com_cookies.txt`)
* `x.com_cookies.txt` (or `twitter.com_cookies.txt`)

### Directory Search Hierarchy

Open Nami searches for cookie files automatically in this order:

1. `OPEN_NAMI_COOKIES_DIR` environment variable (or legacy `NAMI_COOKIES_DIR`), or `cookiesDir` configured in `~/.open-nami/config.json`.
2. `~/.open-nami/cookies/` in your user home folder.
3. `~/.nami/cookies/` in your user home folder.
4. `./cookies/` relative to your working directory.

---

## Ephemeral Isolation Architecture

Passing master cookie files directly to background processes poses two major risks: file corruption from concurrent read/write locks, and unintended modification by external scrapers.

Open Nami mitigates these risks through an isolated session lifecycle:

```
[Master Cookie File]  ──(Read-only clone)──>  [Temp Cookie File (chmod 0600)]
                                                         │
                                               [Passed to Scraper Engine]
                                                         │
                                              [Atomic Unlink on Exit]
```

1. **Detection**: Open Nami checks the candidate directories for a matching non-empty cookie file (> 20 bytes).
2. **Safe Clone**: It writes an isolated temporary copy in `~/.open-nami/temp/` (falling back to the OS temp directory) with restricted permissions (`0o600`, readable only by the current user).
3. **Auto-Cleanup**: When the download completes, fails, or is cancelled (`Ctrl+C`), the temporary copy is unlinked from disk. The master file is never modified or locked.

---

## How to Export Cookies

1. Open your browser where you are logged into the platform (Chrome, Firefox, Edge, Zen, etc.).
2. Export your cookies for that domain using an open-source extension such as **Get cookies.txt LOCALLY**.
3. Save the exported file using the domain filename (for example, `instagram.com_cookies.txt`) into your cookies directory.
4. Open Nami detects it on next launch.
