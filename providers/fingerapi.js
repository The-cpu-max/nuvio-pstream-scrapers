// 🔴 Finger API Scraper for Nuvio Local Scrapers
// P-Stream FedAPI provider - Movies & TV Shows
// STATUS: FedAPI endpoints currently offline - code preserved for when API returns
// Last known working: fed-api-db.pstream.mov, fedapi.xyz

const TMDB_API_KEY = "20bf0a5cbc307e7889137457fa5b6b37";

// Known FedAPI endpoints (try in order)
const FEDAPI_ENDPOINTS = [
  "https://fed-api-db.pstream.mov",
  "https://fed-api.pstream.org",
  "https://fed-airdate.pstream.mov",
  "https://fedapi.xyz/api",
  "https://mznxiwqjdiq00239q.space",
];

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, */*",
  "Accept-Language": "en-US,en;q=0.5",
  "Connection": "keep-alive"
};

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...DEFAULT_HEADERS, ...(options.headers || {}) },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    return null;
  }
}

async function findWorkingEndpoint(path) {
  for (const base of FEDAPI_ENDPOINTS) {
    const url = `${base}${path}`;
    const data = await makeRequest(url);
    if (data && (data.url || data.streams || Array.isArray(data))) {
      return { data, baseUrl: base };
    }
  }
  return null;
}

async function getTmdbInfo(tmdbId, type) {
  const endpoint = type === "movie"
    ? `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`
    : `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`;
  return await makeRequest(endpoint);
}

function parseStreams(data, source) {
  const results = [];
  
  if (!data) return results;
  
  // Handle array format
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item.url) {
        results.push({
          name: `FedAPI - ${item.quality || item.label || "Unknown"} [${source}]`,
          url: item.url,
          quality: item.quality || item.label || "Unknown",
          type: item.type || "hls",
          subtitles: item.subtitles || item.tracks || []
        });
      }
    }
    return results;
  }
  
  // Handle object with url
  if (data.url) {
    results.push({
      name: `FedAPI - Auto [${source}]`,
      url: data.url,
      quality: data.quality || "Auto",
      type: data.type || "hls",
      subtitles: data.subtitles || data.tracks || []
    });
  }
  
  // Handle object with streams array
  if (data.streams && Array.isArray(data.streams)) {
    for (const stream of data.streams) {
      if (stream.url) {
        results.push({
          name: `FedAPI - ${stream.quality || stream.label || "Unknown"} [${source}]`,
          url: stream.url,
          quality: stream.quality || stream.label || "Unknown",
          type: stream.type || "hls",
          subtitles: stream.subtitles || stream.tracks || []
        });
      }
    }
  }
  
  return results;
}

async function getStreams(meta) {
  try {
    const { type, id, season, episode } = meta;
    
    // Extract TMDB ID from Stremio/Nuvio id format
    let tmdbId = id;
    if (id && id.startsWith("tmdb:")) {
      tmdbId = id.replace("tmdb:", "");
    } else if (id && id.includes(":")) {
      // tt1234567 format - need to get TMDB id
      const parts = id.split(":");
      tmdbId = parts[0];
    }
    
    let path;
    if (type === "movie") {
      path = `/movie/${tmdbId}`;
    } else if (type === "series") {
      path = `/tv/${tmdbId}/${season}/${episode}`;
    } else {
      return { streams: [] };
    }
    
    const result = await findWorkingEndpoint(path);
    
    if (!result) {
      console.log("[FingerprintAPI] All endpoints offline or returned no data");
      return { streams: [] };
    }
    
    const streams = parseStreams(result.data, result.baseUrl);
    
    // Format for Nuvio
    const nuvioStreams = streams.map(stream => ({
      name: stream.name,
      url: stream.url,
      behaviorHints: {
        notWebReady: false,
        bingeGroup: `fingerapi-${tmdbId}`
      },
      subtitles: stream.subtitles.map(sub => ({
        url: sub.file || sub.url || sub.src || "",
        lang: sub.label || sub.language || sub.lang || "Unknown"
      })).filter(s => s.url)
    }));
    
    return { streams: nuvioStreams };
    
  } catch (err) {
    console.error("[FingerprintAPI] Error:", err.message);
    return { streams: [] };
  }
}

module.exports = { getStreams };
