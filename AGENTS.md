# Open Nami Agent Instructions

## Commands

* `npm test`: Run unit tests via `tsx --test src/**/*.test.ts`.
* `npm run typecheck`: Check TypeScript types (`tsc --noEmit`).
* `npm run build`: Bundle to `dist/` with `tsup`.
* `npm run dev`: Rebuild on change (`tsup --watch`).
* `npm start`: Launch the interactive TUI (`node dist/cli.js`).

## Architecture

Terminal-first bulk social media profile downloader for Instagram, TikTok, Facebook & X, powered by `gallery-dl`, `yt-dlp`, React 19, and Ink 7.
See `GLOSSARY.md` for domain terminology and anti-bot hardening rules.

---

## Agent skills

### Issue tracker

GitHub Issues at OpenSelena/open-nami via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical 5-role triage label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context (`GLOSSARY.md` and `docs/adr/` at repo root). See `docs/agents/domain.md`.

---

## Local Overrides & Session Protocol

If present, private developer environment overrides, local notes, or personal tool paths are read from `AGENTS.local.md` (git-ignored).
All agents and subagents must strictly adhere to the pre-task retrieval and post-task writeback protocols specified in `AGENTS.local.md` before concluding any task.
