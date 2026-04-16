const TMDB_API_KEY = "20bf0a5cbc307e7889137457fa5b6b37";
const XPRIMESU_BACKEND = "https://backend.xprime.tv";
const XPRIMESU_SERVERS = ["finger", "primebox", "king", "facile", "lighter", "fed", "eek"];
const XPRIMESU_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  "Accept": "application/json, */*",
  "Accept-Language": "en-US,en;q=0.5",
  "Referer": "https://xprime.su/",
  "Origin": "https://xprime.su",
  "Connection": "keep-alive"
};

function makeRequest(url, options) {
  options = options || {};
  var headers = Object.assign({}, XPRIMESU_HEADERS, options.headers || {});
  return fetch(url, {
    method: options.method || "GET",
    headers
  }).then(function(response) {
    if (!response.ok) throw new Error("HTTP " + response.status);
    return response;
  }).catch(function(err) {
    console.error("[XPrimeSU] Request failed: " + url + " - " + err.message);
    return null;
  });
}

function getStreamInfo(url) {
  return fetch(url, { method: 'HEAD', headers: XPRIMESU_HEADERS })
    .then(function(r) {
      var sizeBytes = r.headers.get('content-length');
      var size = sizeBytes ? (parseInt(sizeBytes) / (1024 * 1024 * 1024)).toFixed(2) + ' GB' : 'Unknown';
      var quality = deriveQuality(url);
      var filename = decodeURIComponent(url.split('/').pop().split('?')[0]) || 'stream.mp4';
      return { size: size, quality: quality, filename: filename };
    })
    .catch(function() {
      return { size: 'Unknown', quality: deriveQuality(url), filename: decodeURIComponent(url.split('/').pop().split('?')[0]) || 'stream.mp4' };
    });
}

function deriveQuality(url) {
  var u = url.toLowerCase();
  if (u.includes('2160') || u.includes('4k')) return '4K';
  if (u.includes('1080')) return '1080p';
  if (u.includes('720')) return '720p';
  if (u.includes('480')) return '480p';
  return 'Auto';
}

function getTmdbInfo(tmdbId, mediaType) {
  var url = "https://api.themoviedb.org/3/" + (mediaType === "tv" ? "tv" : "movie") + "/" + tmdbId + "?api_key=" + TMDB_API_KEY;
  return makeRequest(url).then(function(res) {
    if (!res) return { title: "", year: "" };
    return res.json();
  }).then(function(data) {
    if (!data) return { title: "", year: "" };
    var title = mediaType === "tv" ? data.name : data.title;
    var year = mediaType === "tv" ? (data.first_air_date || "").substring(0, 4) : (data.release_date || "").substring(0, 4);
    return { title: title || "", year: year || "" };
  }).catch(function() { return { title: "", year: "" }; });
}

function fetchFromServer(tmdbId, mediaType, name, seasonNum, episodeNum, server) {
  var url;
  if (mediaType === "movie") {
    url = XPRIMESU_BACKEND + "/primebox?id=" + tmdbId + "&type=movie&name=" + encodeURIComponent(name) + "&server=" + server;
  } else {
    url = XPRIMESU_BACKEND + "/primebox?id=" + tmdbId + "&type=tv&name=" + encodeURIComponent(name) + "&season=" + (seasonNum || 1) + "&episode=" + (episodeNum || 1) + "&server=" + server;
  }
  return makeRequest(url).then(function(res) {
    if (!res) return null;
    return res.json();
  }).catch(function() { return null; });
}

function parseServerData(data, server) {
  var results = [];
  if (!data) return results;
  if (data.url) {
    results.push({ url: data.url, quality: data.quality || null, server: server, subtitles: data.subtitles || data.tracks || [] });
    return results;
  }
  if (data.stream && data.stream.url) {
    results.push({ url: data.stream.url, quality: null, server: server, subtitles: [] });
    return results;
  }
  if (data.stream && data.stream.qualities) {
    Object.keys(data.stream.qualities).forEach(function(qk) {
      var qData = data.stream.qualities[qk];
      if (qData && qData.url) results.push({ url: qData.url, quality: qk, server: server, subtitles: [] });
    });
    return results;
  }
  if (data.streams && Array.isArray(data.streams)) {
    data.streams.forEach(function(s) {
      if (s.url) results.push({ url: s.url, quality: s.quality || null, server: server, subtitles: s.subtitles || s.tracks || [] });
    });
    return results;
  }
  if (Array.isArray(data)) {
    data.forEach(function(item) {
      if (item.url) results.push({ url: item.url, quality: item.quality || null, server: server, subtitles: item.subtitles || [] });
    });
  }
  return results;
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  mediaType = mediaType || "movie";
  console.log("[XPrimeSU] Fetching: " + tmdbId + " type=" + mediaType);
  return getTmdbInfo(tmdbId, mediaType).then(function(tmdbInfo) {
    var name = tmdbInfo.title || "";
    var label;
    if (mediaType === "tv" && seasonNum && episodeNum) {
      label = name + " S" + String(seasonNum).padStart(2, "0") + "E" + String(episodeNum).padStart(2, "0");
    } else {
      label = name + (tmdbInfo.year ? " (" + tmdbInfo.year + ")" : "");
    }
    var serverPromises = XPRIMESU_SERVERS.map(function(server) {
      return fetchFromServer(tmdbId, mediaType, name, seasonNum, episodeNum, server).then(function(data) {
        return parseServerData(data, server);
      }).catch(function() { return []; });
    });
    return Promise.all(serverPromises).then(function(allResults) {
      var flatStreams = [];
      allResults.forEach(function(res) { flatStreams = flatStreams.concat(res); });
      if (flatStreams.length === 0) {
        console.log("[XPrimeSU] No direct streams found from backend, returning empty");
        return [];
      }
      return Promise.all(flatStreams.map(function(src) {
        return getStreamInfo(src.url).then(function(info) {
          var q = src.quality ? normalizeQuality(src.quality) : info.quality;
          return {
            name: "P-Stream | XPrimeSU [" + src.server + "] - " + q,
            title: label,
            url: src.url,
            quality: q,
            size: info.size,
            filename: info.filename,
            headers: XPRIMESU_HEADERS,
            provider: "pstream",
            subtitles: (src.subtitles || []).map(function(sub) {
              return { url: sub.file || sub.url || sub.src || "", lang: sub.label || sub.language || "Unknown" };
            }).filter(function(s) { return s.url; })
          };
        });
      }));
    });
  }).catch(function(err) {
    console.error("[XPrimeSU] Error: " + err.message);
    return [];
  });
}

function normalizeQuality(key) {
  if (!key) return "Auto";
  var k = key.toString().toLowerCase();
  if (k === "4k" || k === "2160" || k === "2160p") return "4K";
  if (k === "1080" || k === "1080p") return "1080p";
  if (k === "720" || k === "720p") return "720p";
  if (k === "480" || k === "480p") return "480p";
  if (k === "360" || k === "360p") return "360p";
  return k.toUpperCase();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.XPrimeSUScraperModule = { getStreams };
}
