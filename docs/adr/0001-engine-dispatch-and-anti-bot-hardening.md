# Dual-Engine Dispatch and Anti-Bot Hardening

Direct timeline JSON scraping via `gallery-dl` is paired with `yt-dlp` (using Chrome TLS impersonation and parallel fragment streams) to reliably download media across Instagram, TikTok, Facebook, and X.

## Context

Social media platforms employ aggressive anti-bot defenses including Cloudflare and Akamai WAF challenges, GraphQL pagination rate limits, and video endpoint authentication blocks. Neither `gallery-dl` nor `yt-dlp` alone handles all four platforms across both static image carousels and dynamic video feeds.

## Decision

Route photo and story extractions directly to `gallery-dl`. Route video requests for Instagram, TikTok, and X through `gallery-dl` first with immediate fallback to `yt-dlp` (`--impersonate chrome`, `--concurrent-fragments 4`). Enforce randomized delay jitter (`0.6-1.2` for TikTok, `2.0-2.8` for Instagram GraphQL) and exponential rate-limit backoff (`--sleep-429 10`).

## Consequences

Requires both `gallery-dl` and `yt-dlp` dependencies in runtime environments. Eliminates 403 Forbidden carousel errors and avoids account challenge checkpoints while maximizing download throughput.
