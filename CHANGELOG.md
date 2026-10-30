# Changelog

All notable changes to Open Nami are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.9.4] - 2026-10-30

### Fixed & Hardened
- **Security & Sandboxing Hardening**:
  - RFC-compliant domain boundary match in `parseNetscapeCookies` (`http.ts`), preventing cross-domain cookie leakage to sibling domains or generic TLDs.
  - Strict ProgId pattern validation (`/^[a-zA-Z0-9_.-]+$/`) in Windows browser bridge (`browser-bridge.ts`), preventing shell command injection.
  - Private per-user temporary cookie directories via `mkdtemp` with `0o600` permissions (`dispatcher.ts`), preventing local cookie file tampering.
  - SQL `LIKE` wildcard escaping (`%`, `_`, `\`) with custom escape syntax in media ledger deduplication queries (`ledger.ts`).
- **Extractor & Pagination Logic Reliability**:
  - Facebook extractor (`facebook.ts`): derived stable media IDs from URL parameters/slugs, persisted running item counters across pagination, and removed arbitrary `maxPages = 5` cap.
  - X / Twitter extractor (`x.ts`): evaluated total tweet results instead of media items when deciding pagination continuation, allowing seamless traversal past text-only tweet batches.
  - TikTok extractor (`tiktok.ts`): applied date range (`since`/`until`) and limit boundaries to initial SSR hydration items, with an `emittedItemIds` deduplication set against overlapping API responses.
  - Instagram extractor (`instagram.ts`): deferred pagination checkpoint advance until after current page items finish yielding, preventing lost downloads on mid-stream interruption.
- **Storage, Deduplication & Filter Accuracy**:
  - Added `COLLATE NOCASE` to `media_ledger (id, platform, author)` and standardized compound ID casing in `dispatcher.ts` and `ledger.ts`.
  - Prevented skipped duplicate items from consuming limit quotas in `filterMediaStream`.
  - Ensured explicit `-o` / `--output` directory flag takes precedence over pre-existing tracked directories in `open-nami pull`.
- **TUI & CLI Interactivity**:
  - Scoped `d` / `[d] Untrack` key and mouse click in `PullView` directly to the active cursor profile instead of defaulting to bulk untracking.
  - Delegated batch queue line parsing to `parseBatchContent` in `BatchView`, safely preserving comments and URLs.
  - Enabled direct headless CLI execution on interactive TTY terminals when format choices are specified.
  - Converted blocking download execution into non-blocking promises in clipboard `Watcher`.
  - Protected historical category archives from deletion during empty folder cleanup in `TaskManager`.
  - Updated Node runtime prerequisite checks in `install.sh` and PyPI bundle script to `>=20`.

## [1.9.3] - 2026-10-30

### Fixed
- **Creator Profile Disk Discovery & Accurate Media Counting**:
  - Automatically scans existing creator download directories on launch and synchronization, registering pre-existing creators with exact, live media counts directly from disk.
  - Eliminated naive accumulator drift (`mediaCount += downloadedCount`) where skipping already-downloaded files previously left counts inaccurate or zeroed.
  - Added recursive media scanner ignoring archive sidecars, captions, temporary download chunks, and database files.
  - Automatically detects creator media format preferences (`photos`, `videos`, or `all`) based on actual files in directories.
- **Media Ledger & Duplicate Detection Key Alignment**:
  - Resolved identifier discrepancy between platform item IDs emitted by stream extractors and storage keys in `media_ledger`.
  - Passes `itemId` through engine progress events so both platform post IDs and filename-based records are indexed in the database.
  - Updated `hasMedia` to support bare IDs, compound keys, and case-insensitive filename matches, enabling early-exit duplicate threshold detection to stop pagination immediately on previously-downloaded posts.
- **Untracked Blacklist Protection**:
  - Added `untracked_profiles` table ensuring explicitly untracked profiles (`open-nami untrack <user>` or `[d]` in TUI) are not revived on subsequent disk scans.
  - Case-insensitive lookups (`COLLATE NOCASE`) across SQLite queries prevent platform and username casing mismatches.
- **Interactive Mouse Navigation in TUI Footer**:
  - Registered mouse click target for `^h history` footer shortcut to switch seamlessly into the tracked profiles view.
- **CLI Commands**:
  - Added `open-nami track <url-or-user>` to manually register or resume tracking for a creator.

## [1.9.2] - 2026-10-30

### Fixed
- **Announcement Display & Dismissal Hygiene**:
  - Automatically marks fetched and cached announcements as seen/dismissed upon display so they appear only once and never repeat indefinitely across subsequent launches.
  - Set version ceilings (`maxVersion`) on legacy release announcements so past version banners do not persist into new releases.
  - Stripped erroneous terminal underline formatting from informational message bodies; links are now neatly isolated to dedicated clickable `[Details]` anchors.
- **Hermetic Test Suite & User Database Protection**:
  - Enforced test isolation in `scripts/run-tests.js` with `:memory:` database and unique ephemeral cache files, guaranteeing test runners never write test dummy accounts into the user's live database (`~/.open-nami/nami.db`).
  - Added test-mode detection in `MediaLedger` constructor ensuring in-memory fallbacks when running unit or integration test suites without explicit database paths.
- **History View Access & Tracked Registry Management**:
  - Added dedicated `^h history` shortcut to main view footer alongside `^w watcher`, `^b batch`, and `^s settings`.
  - Added bulk untrack capability in interactive `PullView` (`d` on selected accounts) and clear-all action (`c`).
  - Added `open-nami untrack --all` CLI flag for one-step tracking registry resets while strictly preserving downloaded files on disk.

## [1.9.1] - 2026-10-30

### Added
- **Incremental Profile Pull & History Synchronization (`open-nami pull`)**:
  - Automatically records downloaded creator profiles in a persistent SQLite registry (`tracked_profiles`) with disk fallback.
  - Reverse-chronological early-exit pagination halts fetching after encountering 5 consecutive previously-downloaded posts while bypassing pinned posts.
  - Collapses multi-item carousel posts to prevent false early exits.
  - Added `--no-track` flag to opt out of profile tracking on individual runs.
- **Incremental Pull Orchestrator Engine**:
  - Implemented `dispatchPull` engine sequentially iterating tracked profiles with 2–3s jittered delays to safeguard accounts against platform rate-limits and anti-bot flags.
  - Automatically recovers and recreates missing or relocated download directories.
  - Isolates per-account errors (private, deleted, or unauthenticated accounts) so subsequent profiles continue processing.
- **CLI Subcommands & Shell Autocompletions**:
  - `open-nami pull [username]`: headless synchronization of all or targeted creator profiles.
  - `open-nami list`: clean tabular overview of tracked creators, media counts, and sync timestamps.
  - `open-nami untrack <username>`: safely drops tracking metadata while strictly preserving downloaded files on disk.
  - Full autocompletion support for `pull`, `list`, `untrack`, and `--no-track` across Bash, Zsh, Fish, and PowerShell.
- **Interactive TUI `PullView` & Home Screen Shortcut**:
  - Added interactive `PullView` with multi-account checkboxes, `Space` toggle, `a` toggle-all, in-place untrack confirmation (`d`), and `Enter` synchronization execution.
  - Added dynamic `[p] Pull Updates (<N> tracked)` home screen indicator and `p` hotkey when URL input is empty.
  - Real-time spinners, per-profile progress counters, and final completion ledger summary.

## [1.8.0] - 2026-10-30

### Added
- **Remote Developer Announcement Broadcast Channel**:
  - Implemented zero-latency cached announcement broadcasting via `announcements.json` on GitHub.
  - TUI and CLI notice rendering with clean text badges (`[INFO]`, `[UPDATE]`, `[ALERT]`) and terminal hyperlink support.
  - Precision targeting with semantic version filtering (`minVersion`, `maxVersion`) and expiration timestamps (`expiresAt`).
- **Non-Invasive Daily Update & Active Telemetry**:
  - 24-hour cached update check against the official npm registry with 0ms startup lag.
  - Automatically measures active user pings through natural npm registry queries without tracking scripts, telemetry bloatware, or PII collection.
- **Overhauled Zero-Bloat Installer (`install.sh`)**:
  - Switched to Open Nami's authentic 3-row geometric Unicode block logo (`█▀█ █▀█ █▀▀...`).
  - Stripped decorative ASCII borders and marketing fluff in favor of Unix checkmarks and in-place line overwrites.
  - Added piped `/dev/tty` support for one-liner `curl | sh` installations when sudo permissions are required.

### Fixed & Cleaned
- **Test Suite Storage Isolation & Pre-Abort Mkdir Guard**:
  - Added pre-abort check in `dispatchDownload()` to exit immediately before `fs.mkdir()` is called.
  - Shielded user downloads directory (`~/Downloads/Open Nami/`) by redirecting test runner paths to `/tmp/open-nami-test-downloads/`.
  - Isolated test fixtures with ephemeral temp directories (`mkdtemp`).
- **Codebase-Wide Anti-Slop Hygiene**:
  - Stripped redundant code comments, empty headings, and syntax narration.
  - Replaced inflated marketing copy with direct, factual engineering descriptions.

## [1.7.0] - 2026-10-30

### Added & Automated
- **Linux Multi-Path & Flatpak Browser Discovery**:
  - Replaced single static paths with candidate directory arrays across Linux, macOS, and Windows.
  - Added support for Flatpak browser installations (`com.google.Chrome`, `app.zen_browser.zen`, `io.gitlab.librewolf-community`, `org.chromium.Chromium`).
  - Added modern Fedora XDG profile path discovery for Firefox (`~/.config/mozilla/firefox`).
- **Zen Browser First-Class Support**:
  - Registered Zen Browser across configuration (`knownBrowsers`), Linux `.desktop` file handler (`app.zen_browser.zen.desktop`), Windows ProgId, and macOS bundle IDs.
  - Automatically formats Gecko profile parameters as `firefox:<profileDir>` for engine compatibility.
- **Lock-Free Live Gecko Cookie Extraction**:
  - Implemented `extractGeckoCookiesToNetscape()`: ephemerally copies SQLite databases and WAL files to `os.tmpdir()` to safely read active session cookies without running-browser database locks.
  - Formats active cookies into standard Netscape tab-delimited syntax.
- **Automated Native Extractor Cookie Forwarding**:
  - Updated `dispatcher.ts` to export ephemeral `0o600` Netscape session cookie files prior to running native extractors when no physical cookie file exists.
  - Ensures both Tier 1 native extractors and Tier 2 fallbacks receive authenticated session cookies.
  - Updated dispatcher circuit breaker to allow fallback on authenticated sessions.

## [1.6.1] - 2026-10-25

### Fixed & Cleaned
- **ChoiceIndicator Vertical Bar Removal**:
  - Removed redundant vertical accent bar (`▎`) from `ChoiceIndicator` across `PlatformView` and `PickingView`.
  - Re-aligned platform selection and media picking menus with clean cursor indicators (`❯ ` on focus, `  ` on idle), eliminating visual collisions with panel borders.

## [1.6.0] - 2026-10-25

### Added & Automated
- **Cross-Platform System Default Browser Detection**:
  - Implemented `detectSystemDefaultBrowser()` across Windows (Registry UserChoice & shell command), macOS (LaunchServices LSHandlers), and Linux (XDG settings).
  - Automatically identifies system default browsers, including Chromium forks like Helium (`imput\Helium`), Google Chrome, Microsoft Edge, Brave, Mozilla Firefox, Opera, and Vivaldi.
- **Automated Engine Cookie Argument Resolution**:
  - Implemented `resolveBrowserCookieArg()` mapping detected default browsers into valid `--cookies-from-browser` parameters.
  - Automatically targets custom user profile directories for Chromium forks (e.g. `chrome:<profileDir>`) so engines read cookies without manual path entry.
- **Automated Default in Settings TUI**:
  - Browser Cookie Bridge in `SettingsView` (`^s`) now defaults to `[AUTO]`.
  - Dynamically displays detected system default browser and feedback in the Nordic settings frame.
  - Defaults `cookiesFromBrowser` in `AppConfig` to `'auto'` for zero-config onboarding.

## [1.5.1] - 2026-10-25

### Fixed
- **MediaLedger Disk Persistence on Node.js 20**:
  - `node:sqlite` was introduced in Node.js 22.5.0; on Node 20 runtimes, `MediaLedger` gracefully falls back to JSON file storage.
  - Implemented automatic disk serialization (`loadFallbackDisk` and `flushFallbackDisk`) so ledger records and pagination checkpoints persist across database re-opens on Node 20 as well.
  - Added unit test covering fallback persistence across process restarts.

## [1.5.0] - 2026-10-25

### Added & Synchronized
- **Reactive Engine EventBus Hook (`useEngineEvents`)**:
  - Connected React 19 / Ink 7 root App state machine directly to `EngineEventBus`.
  - Downloads initiated from interactive TUI, batch queue, or watcher daemon now trigger real-time reactive updates.
- **In-TUI System Doctor Diagnostics Card**:
  - Integrated real-time health checks into the interactive Settings screen (`^s`).
  - Displays engine binary status (`gallery-dl`, `yt-dlp`, `ffmpeg`), SQLite storage readiness, and recognized cookies.
- **Interactive Browser Cookie Bridge Selector**:
  - Added browser selection setting in `SettingsView` cycling through installed browsers (Chrome, Edge, Brave, Firefox).
  - Automatically forwards `--cookies-from-browser <browser>` to `gallery-dl` and `yt-dlp` execution runners.
- **SQLite Media Ledger Indexing Badge**:
  - Added subtle `✓ indexed in media ledger` badge on the completion card confirming persistent deduplication.
- **Nordic Aesthetic & Centered Layout Preservation**:
  - Kept 100% of the centered Nordic aesthetic, round borders, color palette, and keyboard workflows.
  - Replaced legacy em dashes in completion scan summaries with colons.

## [1.4.1] - 2026-10-25

### Fixed
- **FFmpeg Detection in Doctor Diagnostics**:
  - Resolved `nami --doctor` reporting ffmpeg as missing when installed.
  - Corrected execution flag from `--version` to `-version`, matching FFmpeg CLI syntax and enabling clean detection of system and WinGet-installed FFmpeg binaries.

## [1.4.0] - 2026-10-25

### Added & Modernized
- **Decoupled Core Event-Driven Architecture**:
  - Implemented `EngineEventBus` with typed lifecycle event streams (`job:start`, `job:progress`, `job:complete`, `job:error`, `item:download:*`, `rate_limit:encountered`).
  - Implemented decoupled `TaskManager` orchestrating download execution independently of the presentation layer.
- **Pluggable Extractor Engine SDK**:
  - Introduced formalized `IExtractorPlugin` and `ExtractorPluginRegistry` with standardized session health verification and asynchronous media streaming interfaces.
- **Persistent SQLite Media Ledger & Checkpoint Store**:
  - Implemented `MediaLedger` using Node.js built-in `node:sqlite` (`DatabaseSync`) for global cross-profile deduplication indexing and crash-resilient pagination checkpoints.
  - Transparent in-memory/JSON fallback when SQLite or specific filesystem paths are unavailable.
  - Enforced case-insensitive username normalization across checkpoint keys.
- **Browser Cookie Auto-Bridge**:
  - Implemented `listDetectedBrowsers()` to automatically locate profile directories for Google Chrome, Microsoft Edge, Brave Browser, and Mozilla Firefox across Windows, macOS, and Linux.
- **System Health Doctor CLI (`--doctor`)**:
  - Added `open-nami --doctor` command to inspect Node.js runtime, storage write permissions, external scraper engines (`gallery-dl`, `yt-dlp`, `ffmpeg`), and platform session cookies.
- **UI Invariance**:
  - 100% preservation of all existing terminal UI views, centered Nordic accent bar, and interactive keybindings.

## [1.3.1] - 2026-10-24

### Enhanced & Centered
- **Harmonious Centered Picker Layout**:
  - Centered profile header (`@username` and canonical platform URL) along the terminal's central axis.
  - Centered the "Select target media:" guidance prompt.
  - Kept the modern Nordic vertical accent bar (`▎`), illuminated category badges (`[PHOTOS]`, `[VIDEOS]`, `[STORIES]`, `[HIGHLIGHTS]`, `[EVERYTHING]`), and descriptions, centered squarely in the middle of the screen without awkward left-skew.
  - Fully dynamic width scaling based on terminal width with responsive padding.

## [1.3.0] - 2026-10-24

### Changed & Modernized
- **Nordic Accent Block Picker (Box-Free UI Overhaul)**:
  - Replaced the wireframe download box with a sleek modern vertical accent bar (`▎`).
  - Added formatted category tags (`[PHOTOS]`, `[VIDEOS]`, `[STORIES]`, `[HIGHLIGHTS]`, `[EVERYTHING]`) with solid inverted background badges on focus.
  - Added inline secondary descriptions for each media type (`Feed images and carousels`, `Reels and timeline clips`, etc.).
  - Expanded interactive mouse click targets to match tags, labels, and descriptions directly.

## [1.2.9] - 2026-10-24

### Enhanced
- **Centered Media Picker Layout**:
  - Replaced the asymmetric 2-column layout in the single-profile picker with a clean, vertically centered stack.
  - Aligned profile username, platform URL, and guidance prompt along the vertical center axis.
  - Centered the `Download` panel and its media selection items right down the middle of the screen.

## [1.2.8] - 2026-10-24

### Removed
- **Removed Cluttered Filter Box from Single-Profile Download Picker**:
  - Completely stripped the unwanted `[l] Posts`, `[d] Date`, `[m] Meta`, and `[r] Resume` options box from the standard download menu.
  - Restored Open Nami's original clean, minimalistic picking experience: select media type (`Photos`, `Videos`, `Stories`, `Highlights`, `Everything`) and press Enter.
  - Advanced filtering remains available where it belongs: via CLI flags (`--limit`, `--since`, `--write-metadata`, `--resume`) and in Batch Queue mode (`^b`).

## [1.2.7] - 2026-10-24

### Fixed & Enhanced
- **Clipboard Watcher Radar Usability & Button Polish**:
  - Registered full mouse click targets for all Watcher options (`[c] Target`, `[m] Sidecars`, `[o] Open Folder`) and footer action hints.
  - Added full media target cycling across `EVERYTHING`, `PHOTOS`, `VIDEOS`, `STORIES`, and `HIGHLIGHTS`.
  - Added real-time dynamic option updates so changing target or sidecar toggles applies immediately to ongoing clipboard detection.
  - Styled options as distinct pill buttons with active focus borders and keyboard navigation (`Tab` / `←` / `→` / `Enter`).
  - Isolated `Ctrl+W` in main input field to allow readline word deletion (`word-rubout`) when text is present without accidentally opening Watcher.

## [1.2.6] - 2026-10-24

### Fixed & Enhanced
- **Batch Queue Interactive Layout Overhaul**:
  - Redesigned options grid into a balanced 2-column layout (3 rows: Platform/Media, Posts/Date, Meta/Resume) preventing text overlapping or line wrapping on standard terminal widths.
  - Added signature `download` action button directly attached to the framed input field.
  - Added dedicated centered `[ ↵ Start Batch Queue ]` action button at the bottom of the options container.
  - Added styled interactive mode toggles: `[ Links / Handles ]` and `[ File (.txt) ]`.
  - Added comprehensive mouse click support across all options, inputs, mode switchers, and action triggers.

## [1.2.5] - 2026-10-24

### Fixed & Enhanced
- **Batch Queue Interactive Controls & Bare Handle Resolution**:
  - Added default platform context for bare `@username` inputs in batch mode.
  - Isolated per-account output directories under `platform/username`.
  - Added keyboard 2D arrow navigation across options and hotkey triggers.

## [1.2.4] - 2026-10-24

### Fixed & Enhanced
- **TUI Text Formatting & Border Line Wrapping**:
  - Implemented automatic title length clamping and `wrap="truncate-end"` in `Panel` and `FramedInput`, preventing top corner border characters (`╮`) from wrapping on 80-column terminals.
  - Shortened verbose panel titles, removed cluttered explanatory paragraphs, and converted options to concise badges (`[c] Media`, `[l] Posts`, `[d] Date`, `[m] Meta`, `[r] Resume`).
- **Batch Queue Keystroke Isolation**:
  - Isolated focus between the text input and options bar in `BatchView`, preventing bare letters (`c`, `l`, `d`, `m`, `r`) from mutating filters while typing profile handles or URLs.
  - Added smooth arrow navigation (`↓` to focus options, `↑` to return to text input).
- **Calendar Year & Date Range Filters**:
  - Added 4-digit calendar year parsing (`^\d{4}$`) to `parseDateBoundary` in `filters.ts`, properly mapping years like `2021` and `2022` to Jan 1st for `since` and Dec 31st for `until`.
  - Added `resolveDateFilter` supporting single years, year ranges (`2021..2022`), year-month strings (`2021-05`), and relative offsets (`24h`, `7d`, `30d`).
- **Custom Limit & Date Inputs in TUI**:
  - Added quick presets for `2021`, `2022`, `2023`, `2024`, and `24 posts` directly in `[d]` and `[l]` cycle loops across `PickingView` and `BatchView`.
  - Added an inline custom modal allowing users to type any custom limit (e.g. `24`) or date/year (e.g. `2021`, `2022`) directly in the TUI with Enter to save and Esc to cancel.
  - Forwarded `until` parameter through `PickingOptions` to the download dispatcher.

## [1.1.0] - 2026-10-23

### Added
- **Unified Single-Pass Timeline Extraction**:
  - Replaced multiple sequential timeline walks with a single pass when downloading all media.
  - Dynamically routes photos and videos to their respective directories without double-fetching or hitting rate limits.
- **Background Clipboard Watcher Daemon (`-w, --watch`)**:
  - Automatically detects copied Instagram, TikTok, Facebook, and X profile URLs from the clipboard and downloads them in real time with duplicate suppression.
- **Date Range and Post Limit Filters (`--since`, `--until`, `-l, --limit`)**:
  - Supports ISO dates, relative offsets (`7d`, `24h`), and limit counters across all media streams.
  - Early-stopping pagination on reverse-chronological feeds to minimize network requests.
- **Resumable Pagination Checkpointing (`--resume`)**:
  - Persists pagination cursors in `.open-nami-checkpoint.json` per target directory, allowing interrupted downloads to resume exactly where they left off.
- **Batch Multi-Account Queue (`-b, --batch <file.txt>`)**:
  - Queues multiple accounts from a text file with comment stripping, randomized anti-ban cooldown jitter between profiles, and comprehensive summary reporting.
- **Post Metadata & Captions Sidecar Export (`--write-metadata`)**:
  - Generates structured `.json` sidecars containing post captions, hashtags (Latin and Unicode), timestamps, dimensions, and album provenance.
  - Synchronizes file modification times (`mtime`) and automatically backfills missing sidecars for previously downloaded media.
  - Forwards sidecar export flags to `gallery-dl` and `yt-dlp`.
- **Carousel & Album Integrity Preservation**:
  - Enforces `{username}_{date}_{id}_{index}.{ext}` sequence formatting with 1-based indexing across Instagram, TikTok, and X.
  - Preserves mixed-media slides (photos and videos) with distinct extensions while keeping consistent album grouping.

## [1.0.7] - 2026-10-23

### Fixed & Hardened
- **Instagram GraphQL Non-Fatal Field Exception Handling**:
  - Resolved profile pagination termination bug where Instagram GraphQL queries returning partial non-fatal field errors (such as `location.profile_pic_url` field_exception) in `res.errors` caused the extractor to throw and abort prematurely after the first page (e.g. exactly 17 photos on `@safreenzara`).
  - Updated `fetchPostsTabGraphQL`, `fetchNextReelsPage`, and `fetchHighlightsTray` to evaluate connection data and yield complete batches when `connection.edges` exists, logging partial field errors via `logExtractorDebug` instead of throwing fatal exceptions.
  - Verified deep multi-page pagination across profiles containing mixed carousels and reels.

## [1.0.6] - 2026-10-23

### Fixed & Hardened
- **Instagram Extractor & Pagination**:
  - Resolved profile pagination breakdown where `webTokens` (`lsd`, `fbDtsg`, `csrfToken`) were omitted when `user` was resolved via `web_profile_info`, enabling full deep-cursor pagination across all profile posts.
  - Prioritized modern `PolarisProfilePostsTabContentQuery_connection` GraphQL document query over deprecated `query_hash` in `fetchNextPostsPage`.
  - Added `X-CSRFToken` header forwarding across REST fallback pagination routes.
- **CDN Cookie Isolation & Download Resilience**:
  - Implemented CDN domain detection (`isCdnUrl`) for Meta CDN (`*.cdninstagram.com`, `*.fbcdn.net`), TikTok CDN, and Twitter media endpoints, completely stripping session cookies from media download requests to prevent edge HTTP 400 Bad Request and HTTP 403 Forbidden errors.
  - Added exponential backoff retries with jitter for transient HTTP 429 and 5xx responses during media streaming.
  - Reset consecutive download error count upon each successful asset download to prevent premature worker aborts.
- **Tests & Platform Compatibility**:
  - Isolated engine binary resolution tests from host environment paths (`OPEN_NAMI_BIN_DIR`).
  - Expanded automated test suite to 146 passing unit tests with 100% pass rate.

## [1.0.5] - 2026-10-18

### Added & Improved
- **Upstream Engine Hardening**:
  - Aligned Instagram GraphQL document IDs with upstream `gallery-dl` v1.32.17 (`39229011733413759` for posts, `28649589871350527` for profile pages).
  - Added null-safe guard for `friendship_status` on private Instagram profiles and static video thumbnail recovery when direct video stream URLs are unavailable.
  - Implemented self-reply thread preservation for X (Twitter) in both timeline and likes history, filtering out conversational third-party replies while preserving author threads.
  - Added multi-domain `twid` cookie extraction (`x.com`, `twitter.com`) and CSRF `ct0` forwarding for personal `/i/history/likes` endpoints.
  - Upgraded TikTok rehydration parser with 5 fallback strategies (`__UNIVERSAL_DATA_FOR_REHYDRATION__`, `SIGI_STATE` script tags, `window['SIGI_STATE']` assignments, `__NEXT_DATA__` page props, and direct `secUid` HTML regexes) and comprehensive device/app query parameters.
  - Implemented Facebook mobile server-rendered fallback (`mbasic.facebook.com` / `m.facebook.com`) for blank desktop React shells, HTML5 video detection, and multi-page album cursor pagination.
- **Failover & Cross-Engine Deduplication**:
  - Added automatic failover in `EngineDispatch` to hand off to `gallery-dl` or `yt-dlp` upon extraction barriers.
  - Added bidirectional cross-engine archive deduplication with `archive_yt-dlp.txt` and `archive.txt`, preventing duplicate downloads across native TypeScript extractors, `yt-dlp`, and `gallery-dl`.
- **Tests**:
  - Expanded automated test suite from 118 to 143 passing unit tests with 100% pass rate.

## [1.0.4] - 2026-10-13

### Added & Improved
- **Extractors & Upstream Sync**:
  - Synced Instagram GraphQL doc IDs with upstream `gallery-dl` v1.32.16+, adding support for Highlights tray discovery and Reels tab connection pagination.
  - Added X (Twitter) personal likes (`https://x.com/i/history/likes`) and bookmarks (`https://x.com/i/bookmarks`) resolution and GraphQL extraction.
  - Added diagnostic debug logging hooks for Instagram GraphQL fallback cascades under `OPEN_NAMI_DEBUG` / `DEBUG`.
- **Downloader Concurrency & Resilience**:
  - Boosted throughput with concurrent worker pool (default 3 workers).
  - Added retry budget resilience for transient iterator glitches so single extraction errors do not abort active download queues.
  - Hardened Facebook CDN URL unescaping against embedded line breaks and unescaped characters.
  - Alphanumeric and quoted `twid` cookie parsing support for X authentication.
- **Complexity Reduction**:
  - Replaced 34-line custom `bindTimeoutSignal` helper with native Node 20 `AbortSignal.timeout` and `AbortSignal.any`.
- **Tests**:
  - Expanded automated test suite from 108 to 118 unit tests.

## [1.0.3] - 2026-10-03

### Fixed & Hardened
- **Security Hardening**:
  - Reordered cookie candidate search paths so user home directories (`~/.open-nami/cookies`, `~/.nami/cookies`) take precedence before current working directory (`./cookies`).
  - Added Windows reserved device names protection (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`) and trailing whitespace/dots stripping in `sanitizeFilename`.
  - Added binary download validation (> 100 KB) and automatic cleanup of incomplete `.download` temporary files on network failures or abortion.
  - Added response stream cancellation (`response.body?.cancel()`) on HTTP 429 and 500 retry backoffs to release connections immediately.
- **Performance & Cleanup**:
  - In-memory cookie caching on `HttpClient` to eliminate repeated disk reads during batch media downloads.
  - Strict TypeScript typing resolution for engine dispatcher results.
  - Removed dead code in download media stream loop.
- **Tests**:
  - Expanded automated test suite to 108 tests covering reserved device names, cookie precedence, and truncated download validation.

## [1.0.2] - 2026-09-25

### Added
- Native extractors for Instagram, TikTok, Facebook, and X with automatic fallback to `gallery-dl` and `yt-dlp`.
- PyPI packaging and distribution under `open-nami`.
- Standalone engine auto-provisioning in `~/.open-nami/bin/` and in-place updates via `nami -U`.

## [1.0.0] - 2026-09-24

### Added

- **Interactive Terminal UI**:
  - React 19 and Ink 7 powered full-screen terminal interface with smooth terracotta branding.
  - Interactive media target selector (`Photos`, `Videos`, `Stories`, `Highlights`, `Everything`).
  - Real-time progress bar tracking file download counts, archive ledger hits, elapsed time, and destination directories.
  - Interactive settings screen for theme cycling (`auto`, `light`, `dark`), downloads folder configuration, and cookie paths.
  - Hotkey controls (`Tab` to paste, `o` to reveal destination in File Explorer, `^t` to cycle themes).
- **Multi-Platform Profile Resolution**:
  - Smart parsing of URLs, `@usernames`, and shorthand prefixes (`ig:user`, `tt:user`, `fb:user`, `x:user`).
  - Canonical URL building for Instagram, TikTok, Facebook, and X.
- **Dynamic Downloads Directory Auto-Detection**:
  - Windows NT Registry (`User Shell Folders`) and Linux XDG user-dirs auto-detection.
  - Automatic directory hierarchy: `<Downloads>/Open Nami/<platform>/<username>/<category>/`.
- **Anti-Bot & Anti-Challenge Hardening**:
  - **TikTok Photo Mode**: Enforces `-o videos=false -o audio=false` to bypass carousel 403 Forbidden errors.
  - **TikTok Video Mode**: Uses Chrome TLS impersonation (`--impersonate chrome` via `curl_cffi`) against Akamai WAF challenges.
  - **Instagram CDN Optimization**: Fast Meta CDN media edge streaming with throttled GraphQL pagination.
- **Safe Cookie Isolation**:
  - Disposable temporary sandboxing in the OS temporary directory, preventing master cookie lockups and corruption.
  - Cross-platform candidate path probing (`cookies/`, `~/.nami/cookies/`, `F:\Nami\cookies\`).
- **Engine Dispatcher**:
  - Integrated execution orchestration between `gallery-dl` and `yt-dlp`.
  - Automatic fallback between standalone binaries, `python -m`, and `python3 -m`.
- **Comprehensive Test Suite**:
  - 68 automated unit tests covering parser, cookies, engine args, directory resolution, and UI components.
