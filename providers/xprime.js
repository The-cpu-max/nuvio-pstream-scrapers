// 🤝 xprime.tv Scraper for Nuvio Local Scrapers
// XPrime streaming provider - Movies & TV Shows
// Backend: backend.xprime.tv with verification token
// Player domain: xk4l.mzt4pr8wlkxnv0qsha5g.website

const TMDB_API_KEY = "20bf0a5cbc307e7889137457fa5b6b37";
const XPRIME_BACKEND = "https://backend.xprime.tv";
const XPRIME_PLAYER = "https://xk4l.mzt4pr8wlkxnv0qsha5g.website";

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, */*",
  "Accept-Language": "en-US,en;q=0.5",
  "Referer": "https://xprime.stream/",
  "Origin": "https://xprime.stream",
  "Connection": "keep-alive"
};

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...DEFAULT_HEADERS, ...(options.headers || {}) },
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  } catch (err) {
    console.error(`[xprime] Request failed: ${url} - ${err.message}`);
    return null;
  }
}

async function getTmdbInfo(tmdbId, mediaType) {
  const type = mediaType === "tv" ? "tv" : "movie";
  const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`;
  const res = await makeRequest(url);
  if (!res) return null;
  return res.json();
}

async function getVerificationToken() {
  // The xprime player page contains a verification token in localStorage or cookies
  // We fetch the main page to get any session tokens
  try {
    const res = await makeRequest(`${XPRIME_PLAYER}/watch/550`, {
      headers: {
        ...DEFAULT_HEADERS,
        "Referer": "https://xprime.stream/"
      }
    });
    if (!res) return null;
    const html = await res.text();
    // Extract token from script or cookie
    const tokenMatch = html.match(/["']token["']:\s*["']([^"']+)["']/) ||
                       html.match(/verification[_-]?token["']?\s*[:=]\s*["']([^"']+)["']/);
    if (tokenMatch) return tokenMatch[1];
    return null;
  } catch (e) {
    return null;
  }
}

async function getStreamsFromBackend(tmdbId, type, name, season, episode) {
  try {
    let url;
    if (type === "movie") {
      url = `${XPRIME_BACKEND}/primebox?id=${tmdbId}&type=movie&name=${encodeURIComponent(name || "")}`;
    } else {
      url = `${XPRIME_BACKEND}/primebox?id=${tmdbId}&type=tv&name=${encodeURIComponent(name || "")}&season=${season}&episode=${episode}`;
    }
    
    const res = await makeRequest(url);
    if (!res) return null;
    const data = await res.json();
    return data;
  } catch (e) {
    return null;
  }
}

async function getStreams(meta) {
  try {
    const { type, id, season, episode } = meta;
    
    // Parse TMDB ID
    let tmdbId = id;
    if (id && id.startsWith("tmdb:")) {
      tmdbId = id.replace("tmdb:", "");
    } else if (id && id.startsWith("tt")) {
      // IMDB id - need TMDB lookup (skip for now)
      return { streams: [] };
    }
    
    const mediaType = type === "series" ? "tv" : "movie";
    
    // Get title from TMDB for the name parameter
    let title = "";
    try {
      const tmdbData = await getTmdbInfo(tmdbId, mediaType);
      if (tmdbData) {
        title = tmdbData.title || tmdbData.name || "";
      }
    } catch (e) {}
    
    // Try backend API first (requires verification token)
    const backendData = await getStreamsFromBackend(
      tmdbId, mediaType, title,
      season || 1, episode || 1
    );
    
    const streams = [];
    
    if (backendData) {
      // Process backend response
      const sources = Array.isArray(backendData) ? backendData :
                      backendData.streams ? backendData.streams :
                      backendData.url ? [backendData] : [];
      
      for (const src of sources) {
        if (src.url) {
          streams.push({
            name: `XPrime - ${src.quality || src.label || "Auto"} [backend]`,
            url: src.url,
            behaviorHints: {
              notWebReady: false,
              bingeGroup: `xprime-${tmdbId}`
            },
            subtitles: (src.subtitles || src.tracks || []).map(sub => ({
              url: sub.file || sub.url || sub.src || "",
              lang: sub.label || sub.language || sub.lang || "Unknown"
            })).filter(s => s.url)
          });
        }
      }
    }
    
    // Fallback: direct player embed URL (works in Nuvio web view)
    if (streams.length === 0) {
      let playerUrl;
      if (mediaType === "movie") {
        playerUrl = `${XPRIME_PLAYER}/watch/${tmdbId}`;
      } else {
        playerUrl = `${XPRIME_PLAYER}/watch/t${tmdbId}/${season || 1}/${episode || 1}`;
      }
      
      streams.push({
        name: `XPrime - Auto [player]`,
        url: playerUrl,
        behaviorHints: {
          notWebReady: true,
          bingeGroup: `xprime-${tmdbId}`
        },
        subtitles: []
      });
    }
    
    return { streams };
    
  } catch (err) {
    console.error("[xprime] Error:", err.message);
    return { streams: [] };
  }
}

module.exports = { getStreams };
