# Disposable Cookie Jar Isolation

Platform requests copy session cookies into temporary, permission-locked files rather than pointing scrapers directly at master cookie jars.

## Context

Scraper engines (`gallery-dl`, `yt-dlp`) may write back session state, lock open file descriptors, or corrupt Netscape-format cookie files on sudden termination.

## Decision

Read master cookie files from candidate configuration locations (`cookies/`, `~/.open-nami/cookies/`, `~/.nami/cookies/`), copy them to OS temporary storage with restricted permissions (`0600`), pass the temporary path with write-back disabled (`-o cookies-update=false`), and unlink the copy upon completion or failure.

## Consequences

Master credentials remain immutable and immune to process crashes or concurrency races. Requires file system cleanup on process lifecycle exit.
