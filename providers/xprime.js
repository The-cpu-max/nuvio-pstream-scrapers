// XPrime Scraper for Nuvio
// Source: xprime.su
// Supports: movies & TV shows
// Quality: 4K / 1080p / 720p / 480p (prefers highest)

const XPRIME_BASE = "https://xprime.su";
const XPRIME_API  = "https://backend.xprime.tv";

// Quality rank — lower = better
const QUALITY_RANK = { "4k": 0, "2160p": 0, "1080p": 1, "720p": 2, "480p": 3, "360p": 4, "auto": 5 };

function normalizeQuality(str) {
  if (!str) return "auto";
  const s = String(str).toLowerCase();
  if (s.includes("4k") || s.includes("2160")) return "4K";
  if (s.includes("1080")) return "1080p";
  if (s.includes("720"))  return "720p";
  if (s.includes("480"))  return "480p";
  if (s.includes("360"))  return "360p";
  return str;
}

function qualityRank(q) {
  const k = (q || "auto").toLowerCase().replace("p", "");
  return QUALITY_RANK[k] ?? QUALITY_RANK[q?.toLowerCase()] ?? 5;
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return undefined;
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, val = bytes;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val.toFixed(1)} ${units[i]}`;
}

async function getXprimeToken() {
  try {
    // Fetch the player page to extract verification token
    const playerUrl = `${XPRIME_BASE}/`;
    const res = await fetch(playerUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": XPRIME_BASE,
      },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();

    // Try to extract token from JS/meta tags
    const tokenMatch =
      html.match(/['"](token|api_key|key)['"]\s*:\s*['"]([a-zA-Z0-9_\-]{10,})['"]/i) ||
      html.match(/token=([a-zA-Z0-9_\-]{10,})/i);
    return tokenMatch ? tokenMatch[2] || tokenMatch[1] : null;
  } catch {
    return null;
  }
}

async function fetchXprimeStreams(tmdbId, type, season, episode) {
  const token = await getXprimeToken();
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.5",
    "Origin": XPRIME_BASE,
    "Referer": `${XPRIME_BASE}/`,
  };
  if (token) headers["x-token"] = token;

  // Build API URL
  let apiUrl;
  if (type === "movie") {
    apiUrl = `${XPRIME_API}/movie?tmdb=${tmdbId}`;
  } else {
    apiUrl = `${XPRIME_API}/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`;
  }

  const res = await fetch(apiUrl, { headers, signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`XPrime API error: ${res.status}`);
  return await res.json();
}

async function scrape({ tmdbId, type, season, episode, title }) {
  const streams = [];

  try {
    const data = await fetchXprimeStreams(tmdbId, type, season, episode);

    // Handle different API response shapes
    const sources = data?.sources || data?.streams || data?.links || (Array.isArray(data) ? data : []);

    for (const src of sources) {
      const url  = src.url || src.stream || src.link || src.file;
      if (!url) continue;

      const rawQuality = src.quality || src.resolution || src.label || src.size_label || "";
      const quality    = normalizeQuality(rawQuality);
      const fileSize   = src.size || src.filesize || src.file_size || null;
      const fileName   = src.name || src.filename || src.title || `${title || "stream"} [${quality}]`;

      streams.push({
        url,
        quality,
        title:    `${fileName}`,
        fileName: `${fileName}`,
        size:     formatBytes(fileSize),
        // Nuvio metadata fields
        description: [
          quality,
          formatBytes(fileSize) ? `📦 ${formatBytes(fileSize)}` : null,
        ].filter(Boolean).join(" · "),
        headers: {
          "Referer": `${XPRIME_BASE}/`,
          "Origin":  XPRIME_BASE,
        },
      });
    }

    // Also try direct stream URL patterns xprime uses
    if (streams.length === 0 && data?.url) {
      streams.push({
        url:     data.url,
        quality: normalizeQuality(data.quality),
        title:   title || "XPrime Stream",
        headers: { "Referer": `${XPRIME_BASE}/` },
      });
    }
  } catch (err) {
    // Fallback: try player page scrape
    try {
      const watchUrl = type === "movie"
        ? `${XPRIME_BASE}/watch/${tmdbId}`
        : `${XPRIME_BASE}/watch/${tmdbId}/${season}/${episode}`;

      const res  = await fetch(watchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer":    XPRIME_BASE,
        },
        signal: AbortSignal.timeout(10000),
      });
      const html = await res.text();

      // Extract m3u8 / mp4 URLs from HTML
      const urlMatches = [...html.matchAll(/["'](https?:\/\/[^"']*\.(m3u8|mp4)[^"']*?)["']/gi)];
      for (const [, url] of urlMatches) {
        if (url.includes("xprime") || url.includes("pstream") || url.includes("cdn")) {
          const quality = url.includes("1080") ? "1080p" : url.includes("720") ? "720p" : "auto";
          streams.push({
            url,
            quality,
            title:   `${title || "XPrime"} [${quality}]`,
            headers: { "Referer": `${XPRIME_BASE}/` },
          });
        }
      }
    } catch {
      // Silent fallback fail
    }
  }

  // Sort by quality (best first)
  streams.sort((a, b) => qualityRank(a.quality) - qualityRank(b.quality));

  return streams;
}

module.exports = { scrape };
