// RGShows Provider for Nuvio
// Source: rgshows.ru - Active provider (HLS streams)
// Rank: 176

async function scrape({ media }) {
  const BASE_URL = 'api.rgshows.ru';

  const headers = {
    referer: 'https://rgshows.ru/',
    origin: 'https://rgshows.ru',
    host: BASE_URL,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  };

  let url = `https://${BASE_URL}/main`;
  if (media.type === 'movie') {
    url += `/movie/${media.tmdbId}`;
  } else {
    url += `/tv/${media.tmdbId}/${media.season}/${media.episode}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('RGShows API request failed');
  const data = await res.json();

  if (!data?.stream?.url) throw new Error('No streams found');

  // Avoid known bad streams
  if (data.stream.url === 'https://vidzee.wtf/playlist/69/master.m3u8') {
    throw new Error('Found only vidzee porn stream');
  }

  const streamUrl = data.stream.url;
  const streamHost = new URL(streamUrl).host;

  const streamHeaders = {
    ...headers,
    host: streamHost,
    origin: 'https://www.rgshows.ru',
    referer: 'https://www.rgshows.ru/',
  };

  return {
    embeds: [],
    stream: [{
      id: 'primary',
      type: 'hls',
      playlist: streamUrl,
      headers: streamHeaders,
      flags: [],
      captions: [],
    }],
  };
}

module.exports = {
  id: 'rgshows',
  name: 'RGShows',
  rank: 176,
  disabled: false,
  scrapeMovie: (ctx) => scrape(ctx),
  scrapeShow: (ctx) => scrape(ctx),
};
