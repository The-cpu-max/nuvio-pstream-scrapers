const TMDB_API_KEY = "20bf0a5cbc307e7889137457fa5b6b37";
const ENC_DEC_API = "https://enc-dec.app/api";
const VIDLINK_API = "https://vidlink.pro/api/b";
const VIDLINK_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  "Connection": "keep-alive",
  "Referer": "https://vidlink.pro/",
  "Origin": "https://vidlink.pro"
};
function makeRequest(url, options) {
  options = options || {};
  var defaultHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "Accept": "application/json,*/*",
    "Accept-Language": "en-US,en;q=0.5",
    "Connection": "keep-alive"
  };
  if (options.headers) {
    Object.keys(options.headers).forEach(function(k) {
      defaultHeaders[k] = options.headers[k];
    });
  }
  return fetch(url, {
    method: options.method || "GET",
    headers: defaultHeaders
  }).then(function(response) {
    if (!response.ok) throw new Error("HTTP " + response.status + ": " + response.statusText);
    return response;
  }).catch(function(error) {
    console.error("[Vidlink] Request failed for " + url + ": " + error.message);
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
function encryptTmdbId(tmdbId) {
  return makeRequest(ENC_DEC_API + "/enc-vidlink?text=" + tmdbId).then(function(r) {
    return r.json();
  }).then(function(data) {
    if (data && data.result) return data.result;
    throw new Error("Invalid encryption response");
  });
}
function getQualityFromKey(key) {
  if (!key) return "Auto";
  var k = key.toString().toLowerCase();
  if (k === "4k" || k === "2160" || k === "2160p") return "4K";
  if (k === "1080" || k === "1080p") return "1080p";
  if (k === "720" || k === "720p") return "720p";
  if (k === "480" || k === "480p") return "480p";
  if (k === "360" || k === "360p") return "360p";
  return "Auto";
}
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  mediaType = mediaType || "movie";
  console.log("[Vidlink] Fetching: " + tmdbId + " type=" + mediaType);
  return getTmdbInfo(tmdbId, mediaType).then(function(tmdbInfo) {
    return encryptTmdbId(tmdbId).then(function(encryptedId) {
      var vidlinkUrl;
      if (mediaType === "tv" && seasonNum && episodeNum) {
        vidlinkUrl = VIDLINK_API + "/tv/" + encryptedId + "/" + seasonNum + "/" + episodeNum;
      } else {
        vidlinkUrl = VIDLINK_API + "/movie/" + encryptedId;
      }
      console.log("[Vidlink] Requesting: " + vidlinkUrl);
      return makeRequest(vidlinkUrl, { headers: VIDLINK_HEADERS }).then(function(r) {
        return r.json();
      }).then(function(data) {
        var streams = [];
        var label;
        if (mediaType === "tv" && seasonNum && episodeNum) {
          label = tmdbInfo.title + " S" + String(seasonNum).padStart(2, "0") + "E" + String(episodeNum).padStart(2, "0");
        } else {
          label = tmdbInfo.title + (tmdbInfo.year ? " (" + tmdbInfo.year + ")" : "");
        }
        if (data && data.stream) {
          if (data.stream.qualities) {
            Object.keys(data.stream.qualities).forEach(function(qualityKey) {
              var qData = data.stream.qualities[qualityKey];
              if (qData && qData.url) {
                streams.push({
                  name: "VidLink - " + getQualityFromKey(qualityKey),
                  title: label,
                  url: qData.url,
                  quality: getQualityFromKey(qualityKey),
                  size: "Unknown",
                  headers: VIDLINK_HEADERS,
                  provider: "vidlink"
                });
              }
            });
          }
          if (data.stream.playlist && streams.length === 0) {
            streams.push({
              name: "VidLink - Auto",
              title: label,
              url: data.stream.playlist,
              quality: "Auto",
              size: "Unknown",
              headers: VIDLINK_HEADERS,
              provider: "vidlink"
            });
          }
        }
        console.log("[Vidlink] Found " + streams.length + " streams");
        return streams;
      });
    });
  }).catch(function(error) {
    console.error("[Vidlink] Error: " + error.message);
    return [];
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.VidlinkScraperModule = { getStreams };
}
