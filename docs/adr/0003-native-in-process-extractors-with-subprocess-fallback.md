# Native In-Process Extractors with Subprocess Fallback

In-process TypeScript extractors and streaming downloads serve as the primary extraction tier, backed by an automatic fallback to `gallery-dl` and `yt-dlp` subprocesses.

## Context

Spawning external Python binaries (`gallery-dl` and `yt-dlp`) on every download introduces process launch latency, external runtime dependencies, and fragility when platform JSON payloads change in subtle ways (such as unhandled `KeyError` exceptions). However, maintaining native extractors alone risks breakage when platforms deploy new anti-bot checkpoints.

## Decision

Implement lightweight, native TypeScript extractors for Instagram, TikTok, Facebook, and X using web-standard APIs (`fetch`, Web Streams, Netscape cookie parsing). Stream media directly to disk with atomic temp files and persistent `.open-nami-archive.json` deduplication ledgers.

If a native extractor fails or returns zero items, silently route the job to `gallery-dl` (for photos/stories/highlights) or `yt-dlp` (for video feeds) as an automatic fallback tier. Pass platform-specific `Referer` headers to prevent CDN hotlinking blocks.

## Consequences

Eliminates subprocess startup overhead for standard downloads and removes mandatory external binary dependencies for new users on their first run. Subprocesses are provisioned on-demand only when fallback is required. Preserves high resilience against platform changes with zero user-facing disruptions.
