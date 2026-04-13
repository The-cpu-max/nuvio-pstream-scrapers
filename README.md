# 🎥 P-Stream Scrapers for Nuvio

Nuvio Local Scrapers based on P-Stream providers.

## 📦 Available Scrapers

| Scraper | Description | Quality | Language |
|---|---|---|---|
| 🔥 Finger API | P-Stream FedAPI direct links | 1080p / 720p / Auto | EN |
| 🤝 xprime.tv | xprime.tv multi-quality streams | 1080p / 720p / Auto | EN |

## 🚀 Installation

1. Open **Nuvio** app
2. Go to **Settings → Local Scrapers**
3. Add this repository URL:

```
https://raw.githubusercontent.com/The-cpu-max/nuvio-pstream-scrapers/refs/heads/main/manifest.json
```

4. Enable the scrapers you want to use

## 📁 Repository Structure

```
nuvio-pstream-scrapers/
├── manifest.json          ← Add this URL to Nuvio
├── providers/
│   ├── fingerapi.js       ← 🔥 Finger API scraper
│   └── xprime.js          ← 🤝 xprime.tv scraper
└── README.md
```

## ℹ️ Notes

- Both scrapers use TMDB ID for content identification
- Standalone (no external dependencies required)
- Compatible with Nuvio Local Scrapers system
- Based on [P-Stream](https://pstream.net) provider architecture
