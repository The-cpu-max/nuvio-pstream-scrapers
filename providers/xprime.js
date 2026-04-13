// 🤝 xprime.tv Scraper for Nuvio Local Scrapers
// P-Stream xprime provider - Movies & TV Shows
// Standalone (no external dependencies)

const TMDB_API_KEY = "20bf0a5cbc307e7889137457fa5b6b37";
const XPRIME_BASE = "https://xprime.tv/api";

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  "Accept": "application/json, */*",
  "Accept-Language": "en-US,en;q=0.5",
  "Referer": "https://xprime.tv/",
  "Origin": "https://xprime.tv",
  "Connection": "keep-alive"
};

function makeRequest(url, options = {}) {
  const headers = { ...DEFAULT_HEADERS, ...(options.headers || {}) };
  return fetch(url, {
    method: options.method || "GET",
    headers,
    ...options
  }).then(res => {
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res;
  }).catch(err => {
    console.error("[xprime] Request failed: " + url + " - " + err.message);
    throw err;
  });
}

function getTmdbInfo(tmdbId, mediaType) {
  const type = mediaType === "tv" ? "tv" : "movie";
  const url = "https://api.themoviedb.org/3/" + type + "/" + tmdbId + "?api_key=" + TMDB_API_KEY;
  return makeRequest(url)
    .then(res => res.json())
    .then(data => ({
      title: mediaType === "tv" ? data.name : data.title,
      year: mediaType === "tv"
        ? (data.first_air_date || "").substring(0, 4)
        : (data.release_date || "").substring(0, 4)
    }));
}

function parseQuality(resolution) {
  if (!resolution) return "Auto";
  const h = parseInt((resolution.toString().split("x")[1] || resolution).replace(/[^0-9]/g, ""));
  if (h >= 2160) return "4K";
  if (h >= 1080) return "1080p";
  if (h >= 720) return "720p";
  if (h >= 480) return "480p";
  if (h >= 360) return "360p";
  return "Auto";
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  console.log("[xprime] Fetching: " + tmdbId + " type=" + mediaType);

  return getTmdbInfo(tmdbId, mediaType)
    .then(info => {
      let apiUrl;
      if (mediaType === "tv") {
        apiUrl = XPRIME_BASE + "/tv/" + tmdbId + "/" + seasonNum + "/" + episodeNum;
      } else {
        apiUrl = XPRIME_BASE + "/movie/" + tmdbId;
      }

      console.log("[xprime] Calling: " + apiUrl);

      return makeRequest(apiUrl)
        .then(res => res.json())
        .then(data => {
          const streams = [];
          const label = mediaType === "tv"
            ? info.title + " S" + String(seasonNum).padStart(2, "0") + "E" + String(episodeNum).padStart(2, "0")
            : info.title + (info.year ? " (" + info.year + ")" : "");

          // Handle sources array
          if (data && data.sources && Array.isArray(data.sources)) {
            data.sources.forEach(src => {
              if (src.url) {
                const quality = src.quality || parseQuality(src.resolution) || "Auto";
                streams.push({
                  name: "🤝 xprime.tv - " + quality,
                  title: label,
                  url: src.url,
                  quality: quality,
                  size: "Unknown",
                  headers: DEFAULT_HEADERS,
                  provider: "xprime"
                });
              }
            });
          }

          // Handle stream with qualities object
          if (data && data.stream && data.stream.qualities) {
            Object.entries(data.stream.qualities).forEach(([q, qData]) => {
              if (qData && qData.url) {
                streams.push({
                  name: "🤝 xprime.tv - " + q,
                  title: label,
                  url: qData.url,
                  quality: q,
                  size: "Unknown",
                  headers: DEFAULT_HEADERS,
                  provider: "xprime"
                });
              }
            });
          }

          // Handle HLS playlist
          if (data && data.stream && data.stream.playlist && streams.length === 0) {
            streams.push({
              name: "🤝 xprime.tv - Auto",
              title: label,
              url: data.stream.playlist,
              quality: "Auto",
              size: "Unknown",
              headers: DEFAULT_HEADERS,
              provider: "xprime"
            });
          }

          // Handle direct url
          if (data && data.url && streams.length === 0) {
            streams.push({
              name: "🤝 xprime.tv - Auto",
              title: label,
              url: data.url,
              quality: "Auto",
              size: "Unknown",
              headers: DEFAULT_HEADERS,
              provider: "xprime"
            });
          }

          // Handle links array
          if (data && data.links && Array.isArray(data.links)) {
            data.links.forEach((link, i) => {
              if (link.url) {
                const quality = link.quality || link.label || "Auto";
                streams.push({
                  name: "🤝 xprime.tv - " + quality,
                  title: label,
                  url: link.url,
                  quality: quality,
                  size: link.size || "Unknown",
                  headers: DEFAULT_HEADERS,
                  provider: "xprime"
                });
              }
            });
          }

          console.log("[xprime] Found " + streams.length + " streams");
          return streams;
        });
    })
    .catch(err => {
      console.error("[xprime] Error: " + err.message);
      return [];
    });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.XprimeScraperModule = { getStreams };
}
