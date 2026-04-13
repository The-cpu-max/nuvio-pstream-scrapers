// VidLink Provider for Nuvio
// Source: vidlink.pro - Active provider
// Rank: 310

async function scrape({ media }) {
  const API_BASE = 'https://enc-dec.app/api';
  const VIDLINK_BASE = 'https://vidlink.pro/api/b';

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    'Connection': 'keep-alive',
    'Referer': 'https://vidlink.pro/',
    'Origin': 'https://vidlink.pro',
  };

  // Encrypt TMDB ID
  const encRes = await fetch(`${API_BASE}/enc-vidlink?text=${media.tmdbId}`);
  if (!encRes.ok) throw new Error('Failed to encrypt TMDB ID');
  const encData = await encRes.json();
  const encryptedId = encData.result;
  if (!encryptedId) throw new Error('No encrypted ID returned');

  // Build API URL
  let apiUrl;
  if (media.type === 'movie') {
    apiUrl = `${VIDLINK_BASE}/movie/${encryptedId}`;
  } else {
    apiUrl = `${VIDLINK_BASE}/tv/${encryptedId}/${media.season}/${media.episode}`;
  }

  const res = await fetch(apiUrl, { headers });
  if (!res.ok) throw new Error('VidLink API request failed');

  let data;
  try {
    const text = await res.text();
    data = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON from VidLink API');
  }

  if (!data.stream) throw new Error('No stream data found');

  const { stream } = data;
  const captions = [];

  if (stream.captions && Array.isArray(stream.captions)) {
    for (const caption of stream.captions) {
      captions.push({
        id: caption.id || caption.url,
        url: caption.url,
        language: caption.language || 'Unknown',
        type: caption.type === 'srt' ? 'srt' : 'vtt',
        hasCorsRestrictions: caption.hasCorsRestrictions || false,
      });
    }
  }

  return {
    embeds: [],
    stream: [{
      id: stream.id || 'primary',
      type: stream.type || 'file',
      qualities: stream.qualities || {},
      playlist: stream.playlist,
      captions,
      flags: [],
      headers: stream.headers || headers,
    }],
  };
}

module.exports = {
  id: 'vidlink',
  name: 'VidLink 🔥',
  rank: 310,
  disabled: false,
  scrapeMovie: (ctx) => scrape(ctx),
  scrapeShow: (ctx) => scrape(ctx),
};
