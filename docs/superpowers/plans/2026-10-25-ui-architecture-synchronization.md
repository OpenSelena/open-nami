# UI Architecture Synchronization Implementation Plan

- **Goal**: Synchronize the interactive Ink 7 / React 19 TUI with the modern decoupled core architecture (EventBus, System Doctor, Browser Cookie Auto-Bridge, and SQLite Media Ledger) while maintaining 100% of the existing visual aesthetic, centered layout, and non-breaking keybindings.
- **Architecture**:
  - `useEngineEvents`: React hook subscribing to `EngineEventBus` for reactive lifecycle/progress updates in `src/app.tsx`.
  - `SettingsView`: Interactive Doctor Diagnostics card displaying real-time engine/storage health, plus Browser Cookie Source selection (`[NONE]`, `[CHROME]`, `[EDGE]`, `[BRAVE]`, `[FIREFOX]`).
  - `Engine Runners`: Passing `--cookies-from-browser` to `gallery-dl` and `yt-dlp` when configured.
  - `CompletionView`: Visual confirmation of SQLite Media Ledger indexing and deduplication status.
- **Constraints**:
  - Preserve Nordic color palette, centered layout, and existing keybindings (`^s`, `^w`, `^b`, `↵`, `esc`).
  - No mandatory native dependencies; use existing `node:sqlite` and standard libraries.
  - Avoid em dashes (`—`); use commas, colons, parentheses, or periods.

---

### Task 1: Reactive `useEngineEvents` Hook & Integration

**Deliverable**:
- `src/lib/engines/core/use-engine-events.ts`
- `src/lib/engines/core/use-engine-events.test.ts`
- `src/app.tsx`

**Steps**:
1. Write unit tests in `src/lib/engines/core/use-engine-events.test.ts` testing event subscription, progress updating, error capturing, and unmount cleanup.
2. Implement `useEngineEvents` hook in `src/lib/engines/core/use-engine-events.ts`.
3. Wire `useEngineEvents` in `src/app.tsx` so the download phase state reacts directly to `defaultTaskManager.events`.
4. Verify tests pass: `npm test src/lib/engines/core/use-engine-events.test.ts`.
5. Commit: `feat(ui): add useEngineEvents hook for reactive eventbus subscriptions`.

---

### Task 2: In-TUI System Diagnostics (Doctor Card in Settings) [COMPLETED]

**Deliverable**:
- `src/components/views/settings-view.tsx`
- `src/components/views/settings-view.test.ts`

**Steps**:
1. [x] Write unit tests for Doctor diagnostics integration in `SettingsView`.
2. [x] Update `SettingsView` to run `runDoctor` asynchronously on mount and on cookie dir changes.
3. [x] Render a compact, elegant Nordic diagnostics card in `SettingsView`:
   `Engines: (✓ gallery-dl, ✓ yt-dlp, ✓ ffmpeg) · Storage: (✓ SQLite ready) · Cookies: (✓ count)`
4. [x] Verify tests pass: `npm test` (all 233 passing), `npm run typecheck` (0 errors), `npm run build` (clean bundle).
5. [x] Commit: `feat(ui): display live doctor health diagnostics in settings view`.

---

### Task 3: Browser Cookie Bridge UI & Config Integration [COMPLETED]

**Deliverable**:
- `src/lib/config.ts`
- `src/lib/engines/types.ts`
- `src/lib/engines/gallery-dl.ts`
- `src/lib/engines/yt-dlp.ts`
- `src/lib/engines/dispatcher.ts`
- `src/components/views/settings-view.tsx`
- Associated unit tests

**Steps**:
1. [x] Add `cookiesFromBrowser?: 'chrome' | 'edge' | 'brave' | 'firefox' | 'none'` to `AppConfig` in `src/lib/config.ts`.
2. [x] Add `cookiesFromBrowser` support to `buildGalleryDlArgs` in `gallery-dl.ts` and `buildYtDlpArgs` in `yt-dlp.ts` (`--cookies-from-browser`).
3. [x] Add `cookiesFromBrowser` to `DispatchOptions` and forward in `dispatchDownload`.
4. [x] In `SettingsView`, add `browser` field cycling through installed browsers (`listDetectedBrowsers()`).
5. [x] Write unit tests verifying CLI argument generation and config persistence.
6. [x] Verify tests pass: `npm test` (all 242 passing).
7. [x] Commit: `feat(cookies): integrate browser cookie bridge in settings and engine runners`.

---

### Task 4: Media Ledger Indexing Status & Full System Verification

**Deliverable**:
- `src/components/views/completion-view.tsx`
- `src/components/views/completion-view.test.tsx`
- Complete test suite and production build verification

**Steps**:
1. Update `CompletionView` to display a subtle SQLite Media Ledger indicator: `✓ indexed in media ledger`.
2. Update and write unit tests for `CompletionView`.
3. Run `npm test` across all test files (target: 100% passing).
4. Run `npm run typecheck` (target: 0 diagnostics).
5. Run `npm run build` (target: clean bundle).
6. Commit: `feat(ui): display media ledger indexing status in completion view`.
