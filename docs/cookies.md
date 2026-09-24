# Cookie Authentication & Isolation

When downloading stories, highlights, or private profiles you follow, social media platforms require an authenticated session. Open Nami supports standard Netscape-format cookie files with automatic ephemeral isolation.

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

## File Format & Naming

Open Nami reads plain-text cookie files in standard **Netscape / Mozilla format**. 

Name your cookie files by platform inside your cookies directory:

* `instagram.txt`
* `tiktok.txt`
* `facebook.txt`
* `x.txt` (or `twitter.txt`)

### Directory Search Hierarchy

Open Nami searches for cookie files automatically in:

1. `cookiesDir` configured in `~/.open-nami/config.json`.
2. `OPEN_NAMI_COOKIES_DIR` environment variable.
3. `./cookies/` relative to your working directory.
4. `~/.nami/cookies/` in your user home folder.

---

## Ephemeral Isolation Architecture

Passing master cookie files directly to background processes poses two major risks: file corruption from concurrent read/write locks, and unintended modification by external scrapers.

Open Nami eliminates these risks through an isolated session lifecycle:

```
[Master Cookie File]  ──(Read-only clone)──>  [OS Temp File (chmod 0600)]
                                                         │
                                               [Passed to Scraper Engine]
                                                         │
                                              [Atomic Unlink on Exit]
```

1. **Detection**: Open Nami verifies the master file exists and contains valid tab-delimited Netscape tokens.
2. **Safe Clone**: It generates an isolated temporary copy in the OS temp directory (`os.tmpdir()`) with restricted permissions (`0o600` — readable only by the current user).
3. **Auto-Cleanup**: When the download completes, fails, or is cancelled (`Ctrl+C`), the temporary copy is unlinked from disk immediately. The master file is never modified or locked.

---

## How to Export Cookies

1. Open your browser where you are logged into the platform (Chrome, Firefox, Edge, Zen, etc.).
2. Export your cookies for that domain using an open-source extension such as **Get cookies.txt LOCALLY**.
3. Save the exported file with the platform name (for example, `instagram.txt`) into your cookies directory.
4. Open Nami will detect it automatically on next launch.
