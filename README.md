# 🎥 P-Stream Scrapers for Nuvio

Nuvio Local Scrapers based on P-Stream providers. Supports 5 active servers.

## 🔥 Available Scrapers

| Scraper | Description | Quality | Language | Rank |
|---|---|---|---|---|
| 🔥 Finger API | P-Stream FedAPI direct links | 4K / 1080p / 720p | EN | 300 |
| 🟡 XPrime | xprime.tv multi-quality streams | 1080p / 720p / Auto | EN | 200 |
| 🔥 VidLink | vidlink.pro - encrypted TMDB streams | 4K / 1080p / 720p | EN | 310 |
| 🟢 PrimeSrc | primesrc.me - multi-embed servers | 1080p / 720p | EN | 168 |
| 🟤 RGShows | rgshows.ru - HLS streams | 1080p / 720p | EN | 176 |

## 🚀 Installation

1. Open **Nuvio** app
2. Go to **Settings** → **Local Scrapers**
3. Add this manifest URL:
   ```
   https://raw.githubusercontent.com/The-cpu-max/nuvio-pstream-scrapers/main/manifest.json
   ```
4. All 5 scrapers will be available automatically

## 📁 Repository Structure

```
nuvio-pstream-scrapers/
├── manifest.json              # Main manifest file for Nuvio
├── README.md
└── providers/
    ├── fingerapi.js           # Finger API / FedAPI (rank 300)
    ├── xprime.js              # XPrime.tv (rank 200)
    ├── vidlink.js             # VidLink (rank 310)
    ├── primesrc.js            # PrimeSrc (rank 168)
    └── rgshows.js             # RGShows (rank 176)
```

## ℹ️ Provider Details

### 🔥 Finger API (FedAPI)
- **URL:** `https://mznxiwqjdiq00239q.space`
- **Requires:** P-Stream user token (febboxKey from localStorage)
- **Format:** MP4 + HLS, multi-quality
- **Note:** Needs login at pstream.net first

### 🟡 XPrime
- **URL:** `https://xprime.tv`
- **Format:** HLS streams
- **Note:** Direct API scrape

### 🔥 VidLink
- **URL:** `https://vidlink.pro/api/b`
- **Encryption:** via `enc-dec.app/api`
- **Format:** File (MP4) + HLS, multi-quality with captions
- **Note:** Most recently added, high rank

### 🟢 PrimeSrc
- **URL:** `https://primesrc.me/api/v1/`
- **Embeds:** Filelions, Dood, Streamwish, Filemoon
- **Format:** Multiple embed servers

### 🟤 RGShows
- **URL:** `https://api.rgshows.ru`
- **Format:** HLS
- **Note:** Simple and reliable

## ⚠️ Skipped / Disabled Providers

The following P-Stream providers were intentionally skipped:

| Provider | Reason |
|---|---|
| multiembed | Disabled in source |
| vidify | Disabled in source |
| coitus/autoembed+ | Disabled in source |
| m4ufree | Requires CryptoJS/AES decryption |
| movies4f | Requires Cheerio HTML scraping |
| pirxcy | Disabled (dev requested removal) |
| vidnest / vidrock | Disabled / complex crypto |
| streambox / turbovid | Disabled in source |
| nunflix | Requires browser localStorage token |

## 🔑 API Key

This addon was built using API key: `20bf0a5cbc307e7889137457fa5b6b37`

---

Built from [P-Stream](https://pstream.net) provider sources.
