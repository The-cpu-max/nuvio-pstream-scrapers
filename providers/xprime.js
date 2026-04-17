// XPrime Scraper for Nuvio
// Source: xprime.su
// Servers: finger, primebox, king, facile, lighter, fed, eek

const BASE = "https://xprime.su";

const SERVERS = ["finger", "primebox", "king", "facile", "lighter", "fed", "eek"];

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
  if (!bytes || Number(bytes) <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, val = Number(bytes);
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val.toFixed(1)} ${units[i]}`;
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36";

const BASE_HEADERS = {
  "User-Agent":      UA,
  "Accept":          "application/json, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Origin":          BASE,
  "Referer":         BASE + "/",
};

// שלוף stream מ-server ספציפי
async function fetchServer(tmdbId, type, season, episode, server) {
  // נסה כמה תבניות URL אפשריות של xprime.su
  const urls = type === "movie"
    ? [
        `${BASE}/api/source/${server}?id=${tmdbId}&type=movie`,
        `${BASE}/api/stream?server=${server}&id=${tmdbId}&type=movie`,
        `${BASE}/api/${server}?tmdb=${tmdbId}&type=movie`,
      ]
    : [
        `${BASE}/api/source/${server}?id=${tmdbId}&type=tv&season=${season}&episode=${episode}`,
        `${BASE}/api/stream?server=${server}&id=${tmdbId}&type=tv&season=${season}&episode=${episode}`,
        `${BASE}/api/${server}?tmdb=${tmdbId}&type=tv&season=${season}&episode=${episode}`,
      ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: BASE_HEADERS,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("json")) continue;
      const data = await res.json();
      if (data && (data.url || data.sources || data.streams || data.links || Array.isArray(data))) {
        return data;
      }
    } catch {
      continue;
    }
  }
  return null;
}

// נסה גם backend.xprime.tv (ה-API הישן)
async function fetchBackend(tmdbId, type, season, episode) {
  const urls = type === "movie"
    ? [
        `https://backend.xprime.tv/prime?tmdb=${tmdbId}&provider=xprime`,
        `https://backend.xprime.tv/movie?tmdb=${tmdbId}`,
      ]
    : [
        `https://backend.xprime.tv/prime?tmdb=${tmdbId}&season=${season}&episode=${episode}&provider=xprime`,
        `https://backend.xprime.tv/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,
      ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: BASE_HEADERS,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data && (data.url || data.sources || data.streams || Array.isArray(data))) {
        return { data, source: "backend" };
      }
    } catch {
      continue;
    }
  }
  return null;
}

// פרק תשובת API לרשימת streams
function parseSources(data, serverLabel, title) {
  const streams = [];
  if (!data) return streams;

  const raw = data.sources || data.streams || data.links ||
    data.data?.sources || data.data?.streams ||
    (Array.isArray(data) ? data : null) ||
    (data.url ? [data] : []);

  if (!raw || !Array.isArray(raw)) return streams;

  for (const src of raw) {
    const url = src.url || src.stream || src.file || src.link || src.src;
    if (!url || typeof url !== "string" || !url.startsWith("http")) continue;

    const rawQ    = src.quality || src.resolution || src.label || src.height || "";
    const quality = normalizeQuality(String(rawQ));
    const size    = formatBytes(src.size || src.filesize || src.file_size);
    const name    = src.name || src.filename || src.title ||
                    `${title || "XPrime"} · ${serverLabel} · ${quality}`;

    streams.push({
      url,
      quality,
      title:       name,
      fileName:    name,
      size:        size || undefined,
      description: [`[${serverLabel}]`, quality, size ? `📦 ${size}` : null].filter(Boolean).join(" · "),
      headers: {
        "Referer":    BASE + "/",
        "Origin":     BASE,
        "User-Agent": UA,
      },
      subtitles: src.subtitles || src.tracks || [],
    });
  }
  return streams;
}

async function scrape({ tmdbId, type, season, episode, title }) {
  const allStreams = [];
  const seen = new Set();

  // הפעל כל server + backend במקביל
  const jobs = [
    ...SERVERS.map(server =>
      fetchServer(tmdbId, type, season, episode, server)
        .then(data => parseSources(data, server, title))
        .catch(() => [])
    ),
    fetchBackend(tmdbId, type, season, episode)
      .then(res => res ? parseSources(res.data, "xprime-backend", title) : [])
      .catch(() => []),
  ];

  const results = await Promise.allSettled(jobs);

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const stream of result.value) {
      if (!seen.has(stream.url)) {
        seen.add(stream.url);
        allStreams.push(stream);
      }
    }
  }

  // מיין: איכות גבוהה קודם
  allStreams.sort((a, b) => qualityRank(a.quality) - qualityRank(b.quality));

  return allStreams;
}

module.exports = { scrape };
