// RGShows Scraper for Nuvio Local Scrapers
// React Native compatible - Promise-based

const TMDB_API_KEY = "20bf0a5cbc307e7889137457fa5b6b37";
const RGSHOWS_BASE = "api.rgshows.ru";

const RGSHOWS_HEADERS = {
  "referer": "https://rgshows.ru/",
  "origin": "https://rgshows.ru",
  "host": RGSHOWS_BASE,
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
};

function makeRequest(url, options) {
  options = options || {};
  var headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Accept": "application/json,*/*",
    "Connection": "keep-alive"
  };
  if (options.headers) {
    Object.keys(options.headers).forEach(function(k) { headers[k] = options.headers[k]; });
  }
  return fetch(url, {
    method: options.method || "GET",
    headers: headers
  }).then(function(response) {
    if (!response.ok) throw new Error("HTTP " + response.status);
    return response;
  }).catch(function(error) {
    console.error("[RGShows] Request failed: " + error.message);
    throw error;
  });
}

function getTmdbInfo(tmdbId, mediaType) {
  var url = "https://api.themoviedb.org/3/" + (mediaType === "tv" ? "tv" : "movie") + "/" + tmdbId + "?api_key=" + TMDB_API_KEY;
  return makeRequest(url)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var title = mediaType === "tv" ? data.name : data.title;
      var year = mediaType === "tv" ? (data.first_air_date || "").substring(0, 4) : (data.release_date || "").substring(0, 4);
      return { title: title, year: year };
    });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  mediaType = mediaType || "movie";
  console.log("[RGShows] Fetching: " + tmdbId + " type=" + mediaType);

  return getTmdbInfo(tmdbId, mediaType)
    .then(function(info) {
      var url = "https://" + RGSHOWS_BASE + "/main";
      if (mediaType === "movie") {
        url += "/movie/" + tmdbId;
      } else {
        url += "/tv/" + tmdbId + "/" + seasonNum + "/" + episodeNum;
      }

      return makeRequest(url, { headers: RGSHOWS_HEADERS })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!data || !data.stream || !data.stream.url) {
            console.log("[RGShows] No stream found");
            return [];
          }

          // Skip known bad streams
          if (data.stream.url === "https://vidzee.wtf/playlist/69/master.m3u8") {
            console.log("[RGShows] Bad stream detected, skipping");
            return [];
          }

          var streamUrl = data.stream.url;
          var streamHost = streamUrl.split("/")[2] || RGSHOWS_BASE;

          var streamHeaders = {
            "referer": "https://www.rgshows.ru/",
            "origin": "https://www.rgshows.ru",
            "host": streamHost,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
          };

          var label;
          if (mediaType === "tv" && seasonNum && episodeNum) {
            label = info.title + " S" + String(seasonNum).padStart(2, "0") + "E" + String(episodeNum).padStart(2, "0");
          } else {
            label = info.title + (info.year ? " (" + info.year + ")" : "");
          }

          console.log("[RGShows] Found 1 stream");
          return [{
            name: "RGShows - Auto",
            title: label,
            url: streamUrl,
            quality: "Auto",
            size: "Unknown",
            headers: streamHeaders,
            provider: "rgshows"
          }];
        });
    })
    .catch(function(error) {
      console.error("[RGShows] Error: " + error.message);
      return [];
    });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams: getStreams };
} else {
  global.RGShowsScraperModule = { getStreams: getStreams };
}
