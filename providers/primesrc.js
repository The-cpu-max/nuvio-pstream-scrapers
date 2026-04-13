// PrimeSrc Provider for Nuvio
// Source: primesrc.me - Active provider
// Rank: 168

async function scrape({ media }) {
  const BASE_API = 'https://primesrc.me/api/v1/';

  let url;
  if (media.type === 'movie') {
    url = `${BASE_API}s?tmdb=${media.tmdbId}&type=movie`;
  } else {
    url = `${BASE_API}s?tmdb=${media.tmdbId}&season=${media.season}&episode=${media.episode}&type=tv`;
  }

  let serverData;
  try {
    const res = await fetch(url);
    if (!res.ok) return { embeds: [] };
    serverData = await res.json();
  } catch {
    return { embeds: [] };
  }

  if (!serverData.servers || !Array.isArray(serverData.servers)) {
    return { embeds: [] };
  }

  // Map server names to Nuvio embed IDs
  const nameToEmbedId = {
    Filelions: 'filelions',
    Dood: 'dood',
    Streamwish: 'streamwish-english',
    Filemoon: 'filemoon',
  };

  const embeds = [];
  for (const server of serverData.servers) {
    if (!server.name || !server.key) continue;
    if (!nameToEmbedId[server.name]) continue;
    try {
      const linkRes = await fetch(`${BASE_API}l?key=${server.key}`);
      if (linkRes.status !== 200) continue;
      const linkJson = await linkRes.json();
      if (linkJson.link) {
        embeds.push({
          embedId: nameToEmbedId[server.name],
          url: linkJson.link,
        });
      }
    } catch {
      // Skip failed servers
    }
  }

  return { embeds };
}

module.exports = {
  id: 'primesrc',
  name: 'PrimeSrc',
  rank: 168,
  disabled: false,
  scrapeMovie: (ctx) => scrape(ctx),
  scrapeShow: (ctx) => scrape(ctx),
};
