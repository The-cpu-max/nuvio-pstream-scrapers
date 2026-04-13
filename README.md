# 🎥 P-Stream Scrapers for Nuvio

Nuvio Local Scrapers based on P-Stream providers. Supports 5 active servers.

## 🔥 Available Scrapers

| Scraper | Description | Quality | Language | Rank | Status |
|---|---|---|---|---|---|
| 🔴 Finger API | P-Stream FedAPI direct links | 4K / 1080p / 720p | EN | 300 | Offline (multi-endpoint fallback) |
| XPrime | xprime.stream multi-quality streams | 1080p / 720p / Auto | EN | 200 | ✅ Active |
| 🔥 VidLink | vidlink.pro - encrypted TMDB streams | 4K / 1080p / 720p | EN | 310 | ✅ Active |
| PrimeSrc | primesrc.me - multi-embed servers | 1080p / 720p | EN | 168 | ✅ Active |
| 🔴 RGShows | reshows.ru - HLS streams | 1080p / 720p | EN | 176 | Unknown |

## 💻 Provider Details

### 🔴 Finger API (fingerapi.js)
- **Backend:** FedAPI (fed-api-db.pstream.mov, fedapi.xyz) - **Currently Offline**
- **Fallback:** Tries 5 known endpoints automatically
- **Type:** Direct stream URLs (mp4/m3u8)
- **Subtitles:** Yes (multi-language)

### XPrime (xprime.js)
- **Backend:** backend.xprime.tv + xk4l.mzt4pr8wlkxnv0qsha5g.website player
- **Token:** Verification token required (fetched from player page)
- **Type:** Direct stream URLs with player fallback
- **Subtitles:** Via backend

### 🔥 VidLink (vidlink.js)
- **Backend:** vidlink.pro API
- **Method:** Encrypted TMDB ID lookup
- **Type:** HLS/MP4 streams

### PrimeSrc (primesrc.js)
- **Backend:** primesrc.me
- **Method:** Multi-embed server selection
- **Type:** Direct stream URLs

### RGShows (rgshows.js)
- **Backend:** reshows.ru
- **Method:** HLS stream extraction
- **Type:** m3u8 streams

## 🚀 Usage

1. Clone or download this repo
2. Install in Nuvio as Local Scrapers
3. Point to `manifest.json`
4. Each scraper runs independently

## 📝 Notes

- All scrapers are **standalone** (no npm dependencies)
- TMDB IDs are used as primary identifiers
- Scrapers gracefully handle API failures and return empty results
- XPrime player URL: `https://xk4l.mzt4pr8wlkxnv0qsha5g.website/watch/{tmdbId}`

## 🔄 Changelog

### v2.2.0
- Updated fingerapi.js with multi-endpoint fallback (FedAPI offline)
- Updated xprime.js with backend.xprime.tv + player fallback
- Updated manifest.json with current status

### v2.1.0
- Added all 5 providers
- Initial working scrapers
