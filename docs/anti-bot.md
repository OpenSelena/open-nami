# Anti-Bot & Anti-Ban Hardening

Social media platforms employ Web Application Firewalls (WAF), rate-limiting algorithms, and TLS fingerprinting to block automated extraction. Open Nami applies platform-tailored defenses to ensure reliable downloads while preserving account and IP safety.

---

## Defense Matrix

| Platform | Challenge | Root Cause | Open Nami Mitigation |
| :--- | :--- | :--- | :--- |
| **TikTok Photos** | HTTP 403 Forbidden | Post contains mixed photo slides; video extractors request nonexistent video streams. | Enforces `-o videos=false -o audio=false` to target photo extractors only. |
| **TikTok Videos** | Akamai WAF JS Challenge | Client TLS fingerprint does not match standard desktop browser signatures. | Routes through Chrome TLS impersonation (`--impersonate chrome` via `curl_cffi`) in yt-dlp. |
| **Instagram** | Rapid Pagination Ban | Tight rate limits on GraphQL profile query endpoints. | Throttles pagination requests and downloads media assets directly from Meta CDN edge nodes. |
| **Facebook** | Rate Limiting | Anti-scraping algorithms flag burst requests. | Applies jittered request pacing and utilizes isolated Netscape cookie sessions. |
| **X (Twitter)** | Guest Token Depletion | Unauthenticated scraping tokens expire quickly. | Distributes calls with randomised delay intervals and supports authenticated cookie sessions. |

---

## Anti-Ban Request Jitter

Fixed-interval scraping requests are trivial for anti-bot heuristics to detect. Open Nami introduces randomised sleep intervals between consecutive requests tailored to each platform's tolerance:

| Platform | Request Sleep Jitter | Strategy |
| :--- | :--- | :--- |
| **Instagram** | `2.0s – 2.8s` | High delay to protect session cookies from temporary shadowbans. |
| **Facebook** | `1.5s – 2.5s` | Moderate pacing for Graph and profile endpoints. |
| **TikTok** | `0.6s – 1.2s` | Balanced delay matching mobile app swipe cadences. |
| **X / Twitter** | `0.8s – 1.5s` | Jittered query delay to stay under guest rate ceilings. |

### 429 Cooldown Backoff

If any platform responds with `HTTP 429 Too Many Requests`, Open Nami automatically triggers a 10-second backoff cooldown before retrying, preventing escalated IP bans.

---

## Download Deduplication (Archive Ledger)

Open Nami maintains local archive ledgers inside each target folder:

* `archive_gallery-dl.sqlite3` for gallery-dl operations.
* `archive_yt-dlp.txt` for yt-dlp operations.

When you run a download against a profile you have previously downloaded, Open Nami checks the ledger and skips already-archived media without re-downloading bytes from the platform's servers.
