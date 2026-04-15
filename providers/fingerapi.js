const TMDB_API_KEY = "20bf0a5cbc307e7889137457fa5b6b37";
const FEDAPI_ENDPOINTS = [
  "https://fed-api-db.pstream.mov",
  "https://fed-api.pstream.org",
  "https://fed-airdate.pstream.mov",
  "https://fedapi.xyz/api",
  "https://mznxiwqjdiq00239q.space"
];
const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, */*",
  "Accept-Language": "en-US,en;q=0.5",
  "Connection": "keep-alive"
};
function makeRequest(url, options) {
  options = options || {};
  var headers = Object.assign({}, DEFAULT_HEADERS, options.headers || {});
  return fetch(url, {
    method: options.method || "GET",
    headers
  }).then(function(response) {
    if (!response.ok) throw new Error("HTTP " + response.status);
    return response.json();
  }).catch(function() {
    return null;
  });
}
function findWorkingEndpoint(path) {
  var index = 0;
  function tryNext() {
    if (index >= FEDAPI_ENDPOINTS.length) return Promise.resolve(null);
    var base = FEDAPI_ENDPOINTS[index++];
    return makeRequest(base + path).then(function(data) {
      if (data && (data.url || data.streams || Array.isArray(data))) {
        return { data, baseUrl: base };
      }
      return tryNext();
    });
  }
  return tryNext();
}
function parseStreams(data, source) {
  var results = [];
  if (!data) return results;
  if (Array.isArray(data)) {
    data.forEach(function(item) {
      if (item.url) results.push({ name: "FedAPI - " + (item.quality || "Unknown") + " [" + source + "]", url: item.url, subtitles: item.subtitles || item.tracks || [] });
    });
    return results;
  }
  if (data.url) results.push({ name: "FedAPI - Auto [" + source + "]", url: data.url, subtitles: data.subtitles || data.tracks || [] });
  if (data.streams && Array.isArray(data.streams)) {
    data.streams.forEach(function(s) {
      if (s.url) results.push({ name: "FedAPI - " + (s.quality || "Unknown") + " [" + source + "]", url: s.url, subtitles: s.subtitles || s.tracks || [] });
    });
  }
  return results;
}
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  mediaType = mediaType || "movie";
  console.log("[FingerAPI] Fetching: " + tmdbId + " type=" + mediaType);
  var path = mediaType === "movie" ? "/movie/" + tmdbId : "/tv/" + tmdbId + "/" + (seasonNum || 1) + "/" + (episodeNum || 1);
  return findWorkingEndpoint(path).then(function(result) {
    if (!result) {
      console.log("[FingerAPI] All endpoints offline");
      return [];
    }
    return parseStreams(result.data, result.baseUrl).map(function(stream) {
      return {
        name: stream.name,
        url: stream.url,
        quality: "Auto",
        size: "Unknown",
        headers: DEFAULT_HEADERS,
        provider: "fingerapi",
        subtitles: (stream.subtitles || []).map(function(sub) {
          return { url: sub.file || sub.url || sub.src || "", lang: sub.label || sub.language || "Unknown" };
        }).filter(function(s) {
          return s.url;
        })
      };
    });
  }).catch(function(err) {
    console.error("[FingerAPI] Error: " + err.message);
    return [];
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.FingerAPIScraperModule = { getStreams };
}
