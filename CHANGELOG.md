# Changelog

All notable changes to Open Nami are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
  - Added seamless failover in `EngineDispatch` to automatically hand off to `gallery-dl` or `yt-dlp` upon extraction barriers.
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
