# Open Nami

Terminal-first bulk social media profile downloader for Instagram, TikTok, Facebook & X.

## Language

**Profile**:
A user account on a supported social media platform, identified by a clean username and canonical profile URL.
_Avoid_: User, handle, account

**Platform**:
A supported social media network (`instagram`, `tiktok`, `facebook`, `x`).
_Avoid_: Network, site, service

**PlatformSelectionPhase**:
Interactive terminal view presented when an ambiguous bare username is submitted without an explicit platform URL or shortcut prefix.
_Avoid_: Disambiguation view, platform chooser

**PullView**:
Interactive terminal view displaying tracked profiles with sync status, selection toggles, and incremental pull controls.
_Avoid_: Sync screen, updates list, history panel

**MediaTarget**:
The subset of media to extract (`photos`, `videos`, `stories`, `highlights`, `all`).
_Avoid_: MediaChoice, format, download type

**EngineDispatch**:
The routing coordinator determining which underlying scraper engine executes extraction for a given platform and media target.
_Avoid_: Downloader, runner, scraper

**SessionCookieJar**:
Netscape-format cookie file used to authenticate platform requests without interactive browser login.
_Avoid_: Cookies, credentials, session token

**TrackedProfile**:
A profile stored in the local registry with its target directory and media choice, eligible for incremental updates.
_Avoid_: Subscription, saved user, bookmark

**IncrementalPull**:
A synchronization operation that fetches only new upstream media posted after the most recent extraction for a tracked profile.
_Avoid_: Update, refresh, sync

**EarlyExitThreshold**:
The number of consecutive previously-downloaded media items (default: 5) that must be seen in a reverse-chronological feed before halting extraction early.
_Avoid_: Cutoff, stop limit, break count
