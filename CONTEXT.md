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

**MediaTarget**:
The subset of media to extract (`photos`, `videos`, `stories`, `highlights`, `all`).
_Avoid_: MediaChoice, format, download type

**EngineDispatch**:
The routing coordinator determining which underlying scraper engine executes extraction for a given platform and media target.
_Avoid_: Downloader, runner, scraper

**SessionCookieJar**:
Netscape-format cookie file used to authenticate platform requests without interactive browser login.
_Avoid_: Cookies, credentials, session token
