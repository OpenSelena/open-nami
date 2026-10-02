# Changelog

All notable changes to Open Nami are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
