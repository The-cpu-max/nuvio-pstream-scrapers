// 🔥 Finger API Scraper for Nuvio Local Scrapers
// P-Stream FedAPI provider - Movies & TV Shows
// Standalone (no external dependencies)

const TMDB_API_KEY = "20bf0a5cbc307e7889137457fa5b6b37";
const FEDAPI_BASE = "https://fedapi.xyz/api";

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  "Accept": "application/json, */*",
  "Accept-Language": "en-US,en;q=0.5",
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
    console.error("[FingerAPI] Request failed: " + url + " - " + err.message);
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

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  console.log("[FingerAPI] Fetching: " + tmdbId + " type=" + mediaType);

  return getTmdbInfo(tmdbId, mediaType)
    .then(info => {
      let apiUrl;
      if (mediaType === "tv") {
        apiUrl = FEDAPI_BASE + "/tv/" + tmdbId + "/" + seasonNum + "/" + episodeNum;
      } else {
        apiUrl = FEDAPI_BASE + "/movie/" + tmdbId;
      }

      console.log("[FingerAPI] Calling: " + apiUrl);

      return makeRequest(apiUrl, {
        headers: { Referer: "https://fedapi.xyz/", Origin: "https://fedapi.xyz" }
      })
      .then(res => res.json())
      .then(data => {
        const streams = [];
        const label = mediaType === "tv"
          ? info.title + " S" + String(seasonNum).padStart(2,"0") + "E" + String(episodeNum).padStart(2,"0")
          : info.title + (info.year ? " (" + info.year + ")" : "");

        // Handle sources array from FedAPI
        if (data && data.sources && Array.isArray(data.sources)) {
          data.sources.forEach((src, i) => {
            if (src.url) {
              const quality = src.quality || src.label || "Auto";
              streams.push({
                name: "🔥 Finger API - " + quality,
                title: label,
                url: src.url,
                quality: quality,
                size: "Unknown",
                headers: DEFAULT_HEADERS,
                provider: "fingerapi"
              });
            }
          });
        }

        // Handle stream object with qualities
        if (data && data.stream && data.stream.qualities) {
          Object.entries(data.stream.qualities).forEach(([q, qData]) => {
            if (qData && qData.url) {
              streams.push({
                name: "🔥 Finger API - " + q,
                title: label,
                url: qData.url,
                quality: q,
                size: "Unknown",
                headers: DEFAULT_HEADERS,
                provider: "fingerapi"
              });
            }
          });
        }

        // Handle single url
        if (data && data.url && streams.length === 0) {
          streams.push({
            name: "🔥 Finger API - Auto",
            title: label,
            url: data.url,
            quality: "Auto",
            size: "Unknown",
            headers: DEFAULT_HEADERS,
            provider: "fingerapi"
          });
        }

        // Handle m3u8 playlist
        if (data && data.stream && data.stream.playlist && streams.length === 0) {
          streams.push({
            name: "🔥 Finger API - Auto",
            title: label,
            url: data.stream.playlist,
            quality: "Auto",
            size: "Unknown",
            headers: DEFAULT_HEADERS,
            provider: "fingerapi"
          });
        }

        console.log("[FingerAPI] Found " + streams.length + " streams");
        return streams;
      });
    })
    .catch(err => {
      console.error("[FingerAPI] Error: " + err.message);
      return [];
    });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.FingerAPIScraperModule = { getStreams };
}
