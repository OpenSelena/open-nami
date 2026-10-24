# Automated System Default Browser Cookie Detection Implementation Plan

- **Goal**: Automatically detect the operating system's default web browser across Windows, macOS, and Linux (including custom Chromium-based browsers like Helium, Arc, and Vivaldi) and automatically extract/forward live session cookies to download engines without requiring manual browser configuration.
- **Architecture**:
  - `detectSystemDefaultBrowser()`: Query OS registry / LaunchServices / XDG to identify default browser and user profile directory.
  - `resolveBrowserCookieArg()`: Converts browser identity into valid `--cookies-from-browser` syntax for `gallery-dl` and `yt-dlp` (including custom profile paths for Chromium forks like Helium).
  - `SettingsView`: Feature `[AUTO]` as default, displaying live detected OS browser name and path in the Nordic TUI.
  - `Dispatcher`: Automatically activates the resolved system browser when `cookiesFromBrowser` is `'auto'` (or unset).
- **Constraints**:
  - Zero UI layout displacement; preserve Nordic palette and keybindings.
  - Strictly avoid em dashes (use commas, colons, parentheses, or periods).
  - Cross-platform support (Windows, macOS, Linux).
  - 100% test coverage with Node test runner.

---

### Task 1: System Default Browser Detection Engine

**Deliverable**:
- `src/lib/cookies/browser-bridge.ts`
- `src/lib/cookies/browser-bridge.test.ts`

**Steps**:
1. Implement `detectSystemDefaultBrowser()` in `browser-bridge.ts`:
   - **Windows**: Query `HKCU\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\https\UserChoice` (and `http\UserChoice`) for `ProgId`. Inspect `HKCR\<ProgId>\shell\open\command` and `HKCR\<ProgId>\Application`.
   - Identify: Chrome, Edge, Brave, Firefox, Opera, Vivaldi, and Chromium forks like **Helium** (`C:\Users\<user>\AppData\Local\imput\Helium\User Data`).
   - **macOS**: Query LaunchServices plist / defaults for `https` handler.
   - **Linux**: Query `xdg-settings get default-web-browser` / `xdg-mime`.
2. Implement `resolveBrowserCookieArg(browser)`:
   - For standard browsers: returns browser id (e.g. `'chrome'`, `'edge'`, `'firefox'`).
   - For custom Chromium browsers with custom profile path: returns `'chrome:<profileDir>'`.
3. Write unit tests for Windows registry parsing (including HeliumHTM, ChromeHTML, MSEdgeHTM, BraveHTML, FirefoxURL), macOS bundle parsing, and Linux desktop file parsing.
4. Verify tests pass: `npm test src/lib/cookies/browser-bridge.test.ts`.
5. Commit: `feat(cookies): add cross-platform system default browser detection`.

---

### Task 2: Config & Dispatcher Integration with `auto` Default

**Deliverable**:
- `src/lib/config.ts`
- `src/lib/config.test.ts`
- `src/lib/engines/dispatcher.ts`
- `src/lib/engines/dispatcher.test.ts`

**Steps**:
1. Update `AppConfig` in `src/lib/config.ts` to support `'auto'` in `cookiesFromBrowser` (and default to `'auto'`).
2. Update `loadConfig` / `saveConfig` to parse and persist `'auto'`.
3. In `src/lib/engines/dispatcher.ts`:
   - When `cookiesFromBrowser` is `'auto'` or undefined, call `detectSystemDefaultBrowser()` and resolve `--cookies-from-browser <arg>`.
   - Forward resolved browser arg to `runGalleryDl` and `runYtDlp`.
4. Write unit tests verifying `'auto'` resolution and runner argument construction.
5. Verify tests pass: `npm test`.
6. Commit: `feat(engine): automatically resolve and pass system default browser cookies to engines`.

---

### Task 3: Interactive TUI Settings Integration

**Deliverable**:
- `src/components/views/settings-view.tsx`
- `src/components/views/settings-view.test.ts`

**Steps**:
1. Update `SettingsView`:
   - Place `[AUTO]` at the front of browser choices: `['auto', 'none', ...detectedBrowsers]`.
   - When `[AUTO]` is selected, run non-blocking `detectSystemDefaultBrowser()` and display:
     `system default: Helium (C:\Users\mint\AppData\Local\imput\Helium)` or `system default: Google Chrome (live session)`.
   - Cycling with Space or Enter smoothly traverses `[AUTO]`, `[NONE]`, and manual browsers.
2. Update unit tests in `src/components/views/settings-view.test.ts` covering `[AUTO]` selection, dynamic feedback formatting, and option cycling.
3. Verify tests pass: `npm test`.
4. Commit: `feat(ui): add automated system default browser selector in settings view`.

---

### Task 4: Full System Verification, Release & Local Device Update

**Deliverable**:
- Full test suite, production bundle, and global installation

**Steps**:
1. Run full test suite: `npm test` (all tests passing).
2. Run TypeScript compiler: `npm run typecheck` (0 diagnostics).
3. Build production bundles: `npm run build` and copy to `pypi/src/open_nami/cli.js`.
4. Update version to `v1.6.0` across package manifests and `CHANGELOG.md`.
5. Commit release and tag `v1.6.0`.
6. Push to GitHub and publish release.
7. Install globally on device (`npm install -g .` and `pip install -e ./pypi --no-deps`).
8. Update Obsidian Second Brain records.
