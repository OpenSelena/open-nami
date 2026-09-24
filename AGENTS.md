# Open Nami Agent Instructions

## Commands

* `npm test`: Run unit tests via `tsx --test src/**/*.test.ts`.
* `npm run typecheck`: Check TypeScript types (`tsc --noEmit`).
* `npm run build`: Bundle to `dist/` with `tsup`.
* `npm run dev`: Rebuild on change (`tsup --watch`).
* `npm start`: Launch the interactive TUI (`node dist/cli.js`).

## Architecture

Terminal-first bulk social media profile downloader for Instagram, TikTok, Facebook & X, powered by `gallery-dl`, `yt-dlp`, React 19, and Ink 7.
See `CONTEXT.md` for domain terminology and anti-bot hardening rules.
