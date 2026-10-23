# Changelog

All notable changes to Open Nami are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
