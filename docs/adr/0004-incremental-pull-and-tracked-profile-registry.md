# Incremental Pull and Tracked Profile Registry

Open Nami maintains a local registry of downloaded profiles in `nami.db` to enable incremental delta synchronization (`open-nami pull`) with early-exit pagination.

## Context

Users who track multiple social media creators currently must re-enter URLs or maintain external batch files to fetch new content. Without synchronization state, running a repeat extraction scans thousands of historical posts over the network merely to discover a few recent updates, increasing scrape duration and triggering platform anti-bot rate limits.

## Decision

1. **Persistent Profile Registry**: Store tracked profiles in `~/.open-nami/nami.db` (managed by `MediaLedger`), automatically registering profiles upon successful download unless `--no-track` is passed.
2. **Early-Exit Pagination**: Halt reverse-chronological extraction immediately upon encountering 5 consecutive previously-downloaded media items in the ledger. This threshold cleanly skips up to 3 pinned posts without scanning the full historical feed.
3. **Sequential Pacing**: Execute incremental pulls across multiple tracked profiles sequentially, applying platform-specific jittered rest delays (2–3 seconds) between accounts to safeguard user IP addresses and session cookies.
4. **Dual Interface**: Expose synchronization via CLI (`open-nami pull`, `open-nami list`, `open-nami untrack`) and an interactive TUI "Pull Updates" selection screen (`PullView`).
5. **Fallback Parity**: Pass `--abort 5` to `gallery-dl` subprocess fallbacks during pull operations to preserve identical early-exit behavior.
6. **Robust Path Recovery**: If a tracked profile's original destination directory was moved or deleted, automatically recreate the folder in the default download path and proceed.
7. **Failure Isolation**: Individual profile errors (private, deleted, or renamed accounts) are logged with non-fatal status flags without aborting the overall pull sequence.
8. **File Preservation**: Untracking a profile removes only registry metadata; existing downloaded files on disk are strictly preserved.

## Consequences

Enables multi-account incremental synchronization that completes in seconds per profile rather than minutes. Eliminates redundant network queries and drastically lowers rate limit exposure. Requires maintaining schema migrations and handling directory relocation edge cases in `MediaLedger`.
