const TMDB_API_KEY = "20bf0a5cbc307e7889137457fa5b6b37";
const PRIMESRC_BASE = "https://primesrc.me/api/v1/";
function makeRequest(url, options) {
  options = options || {};
  var headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "Accept": "application/json,*/*",
    "Connection": "keep-alive"
  };
  if (options.headers) {
    Object.keys(options.headers).forEach(function(k) {
      headers[k] = options.headers[k];
    });
  }
  return fetch(url, {
    method: options.method || "GET",
    headers
  }).then(function(response) {
    if (!response.ok) throw new Error("HTTP " + response.status);
    return response;
  }).catch(function(error) {
    console.error("[PrimeSrc] Request failed: " + error.message);
    throw error;
  });
}
function getTmdbInfo(tmdbId, mediaType) {
  var url = "https://api.themoviedb.org/3/" + (mediaType === "tv" ? "tv" : "movie") + "/" + tmdbId + "?api_key=" + TMDB_API_KEY;
  return makeRequest(url).then(function(r) {
    return r.json();
  }).then(function(data) {
    var title = mediaType === "tv" ? data.name : data.title;
    var year = mediaType === "tv" ? (data.first_air_date || "").substring(0, 4) : (data.release_date || "").substring(0, 4);
    return { title, year };
  });
}
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  mediaType = mediaType || "movie";
  console.log("[PrimeSrc] Fetching: " + tmdbId + " type=" + mediaType);
  return getTmdbInfo(tmdbId, mediaType).then(function(info) {
    var url;
    if (mediaType === "movie") {
      url = PRIMESRC_BASE + "s?tmdb=" + tmdbId + "&type=movie";
    } else {
      url = PRIMESRC_BASE + "s?tmdb=" + tmdbId + "&season=" + seasonNum + "&episode=" + episodeNum + "&type=tv";
    }
    return makeRequest(url).then(function(r) {
      return r.json();
    }).then(function(data) {
      if (!data || !data.servers || !Array.isArray(data.servers)) {
        console.log("[PrimeSrc] No servers found");
        return [];
      }
      var label;
      if (mediaType === "tv" && seasonNum && episodeNum) {
        label = info.title + " S" + String(seasonNum).padStart(2, "0") + "E" + String(episodeNum).padStart(2, "0");
      } else {
        label = info.title + (info.year ? " (" + info.year + ")" : "");
      }
      var linkPromises = data.servers.filter(function(server) {
        return server.name && server.key;
      }).map(function(server) {
        return fetch(PRIMESRC_BASE + "l?key=" + server.key).then(function(r) {
          if (!r.ok) return null;
          return r.json();
        }).then(function(linkData) {
          if (!linkData || !linkData.link) return null;
          return {
            name: "PrimeSrc - " + server.name,
            title: label,
            url: linkData.link,
            quality: "Auto",
            size: "Unknown",
            headers: {},
            provider: "primesrc"
          };
        }).catch(function() {
          return null;
        });
      });
      return Promise.all(linkPromises).then(function(results) {
        var streams = results.filter(function(s) {
          return s !== null;
        });
        console.log("[PrimeSrc] Found " + streams.length + " streams");
        return streams;
      });
    });
  }).catch(function(error) {
    console.error("[PrimeSrc] Error: " + error.message);
    return [];
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.PrimeSrcScraperModule = { getStreams };
}
