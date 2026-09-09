const fs = require('fs');
const https = require('https');
const path = require('path');
const os = require('os');
let app;
try { ({ app } = require('electron')); } catch {}

const FALLBACK_TOTAL = 1025;

function baseDir() {
  return process.env.TOKEN_COMPANION_USER_DATA || (app?.getPath ? app.getPath('userData') : path.join(os.homedir(), '.token-companion'));
}

function catalogCachePath() {
  return path.join(baseDir(), 'pokedex-catalog.json');
}

function chainsCachePath() {
  return path.join(baseDir(), 'pokedex-evolution-chains.json');
}

function fallback() {
  return Array.from({ length: FALLBACK_TOTAL }, (_, i) => ({ id: i + 1, name: `Pokémon #${i + 1}` }));
}

function readCatalogCache() {
  try {
    const data = JSON.parse(fs.readFileSync(catalogCachePath(), 'utf8'));
    return Array.isArray(data) && data.length ? data : null;
  } catch {
    return null;
  }
}

function readChainsCache() {
  try {
    const data = JSON.parse(fs.readFileSync(chainsCachePath(), 'utf8'));
    return typeof data === 'object' && data !== null ? data : {};
  } catch {
    return {};
  }
}

function saveChainsCache(cache) {
  try {
    fs.mkdirSync(baseDir(), { recursive: true });
    fs.writeFileSync(chainsCachePath(), JSON.stringify(cache, null, 2));
  } catch (_) {}
}

function fetchJson(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Token-Companion (https://github.com/pokeapi/pokeapi)' } }, response => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        return reject(new Error(`HTTP ${response.statusCode} for ${url}`));
      }
      let body = '';
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`Request timeout for ${url}`));
    });
  });
}

function displayName(name) {
  if (!name) return '';
  const special = {
    'ho-oh': 'Ho-Oh', 'porygon-z': 'Porygon-Z', 'mr-mime': 'Mr. Mime', 'mime-jr': 'Mime Jr.',
    'type-null': 'Type: Null', 'tapu-koko': 'Tapu Koko', 'tapu-lele': 'Tapu Lele',
    'tapu-bulu': 'Tapu Bulu', 'tapu-fini': 'Tapu Fini', 'jangmo-o': 'Jangmo-o',
    'hakamo-o': 'Hakamo-o', 'kommo-o': 'Kommo-o', 'wo-chien': 'Wo-Chien',
    'chien-pao': 'Chien-Pao', 'ting-lu': 'Ting-Lu', 'chi-yu': 'Chi-Yu',
    'mr-rime': 'Mr. Rime', 'great-tusk': 'Great Tusk', 'scream-tail': 'Scream Tail',
    'brute-bonnet': 'Brute Bonnet', 'flutter-mane': 'Flutter Mane', 'slither-wing': 'Slither Wing',
    'sandy-shocks': 'Sandy Shocks', 'iron-treads': 'Iron Treads', 'iron-bundle': 'Iron Bundle',
    'iron-hands': 'Iron Hands', 'iron-jugulis': 'Iron Jugulis', 'iron-moth': 'Iron Moth',
    'iron-thorns': 'Iron Thorns', 'roaring-moon': 'Roaring Moon', 'iron-valiant': 'Iron Valiant',
    'walking-wake': 'Walking Wake', 'iron-leaves': 'Iron Leaves', 'gouging-fire': 'Gouging Fire',
    'raging-bolt': 'Raging Bolt', 'iron-boulder': 'Iron Boulder', 'iron-crown': 'Iron Crown'
  };
  const key = String(name).toLowerCase().trim();
  if (special[key]) return special[key];
  return key.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function speciesId(url) {
  const match = String(url || '').match(/pokemon-species\/(\d+)\/?$/);
  return match ? Number(match[1]) : 0;
}

/**
 * Recursively extracts all valid linear paths from a PokeAPI evolution-chain tree.
 * Correctly handles multi-branch evolutions (Eevee, Ralts, Wurmple, Slowpoke, Tyrogue, Applin, etc.)
 */
function extractEvolutionPaths(node) {
  if (!node || !node.species) return [];
  if (!Array.isArray(node.evolves_to) || node.evolves_to.length === 0) {
    return [[node.species]];
  }
  const paths = [];
  for (const child of node.evolves_to) {
    const subPaths = extractEvolutionPaths(child);
    for (const sub of subPaths) {
      paths.push([node.species, ...sub]);
    }
  }
  return paths;
}

/**
 * Fetches canonical evolution chain and Pokémon details for any species from PokeAPI.
 * Uses local caching to store resolved chains for offline resilience.
 */
async function fetchEvolutionChainForSpecies(idOrName) {
  const normalizedKey = String(idOrName || '').toLowerCase().trim();
  if (!normalizedKey) return null;

  const chainsCache = readChainsCache();
  if (chainsCache[normalizedKey]) {
    return chainsCache[normalizedKey];
  }

  try {
    const species = await fetchJson(`https://pokeapi.co/api/v2/pokemon-species/${normalizedKey}`);
    const chainData = await fetchJson(species.evolution_chain.url);
    const allPaths = extractEvolutionPaths(chainData.chain);

    if (!allPaths.length) return null;

    // Find paths containing the target species name
    const targetName = species.name.toLowerCase();
    const matchingPaths = allPaths.filter(path => path.some(s => s.name.toLowerCase() === targetName));
    const selectedPath = (matchingPaths.length ? matchingPaths : allPaths)[Math.floor(Math.random() * (matchingPaths.length || allPaths.length))];

    const ids = selectedPath.map(s => speciesId(s.url));
    const labels = selectedPath.map(s => displayName(s.name));
    const finalStage = selectedPath.length - 1;

    // Fetch type info for each species in the chain
    let types = [];
    try {
      const pokemonDetails = await Promise.all(ids.map(id => fetchJson(`https://pokeapi.co/api/v2/pokemon/${id}`).catch(() => null)));
      types = pokemonDetails.map(p => (p && Array.isArray(p.types)) ? p.types.map(t => t.type.name) : ['normal']);
    } catch {
      types = ids.map(() => ['normal']);
    }

    const speciesIndex = selectedPath.findIndex(s => s.name.toLowerCase() === targetName);
    const lineObj = {
      name: labels[0],
      ids,
      labels,
      types,
      finalStage,
      stage: speciesIndex >= 0 ? speciesIndex : 0,
      group: 'standard'
    };

    // Cache under both species name and numeric ID
    chainsCache[normalizedKey] = lineObj;
    if (species.id) chainsCache[String(species.id)] = lineObj;
    chainsCache[labels[0].toLowerCase()] = lineObj;
    saveChainsCache(chainsCache);

    return lineObj;
  } catch {
    return null;
  }
}

async function getRandomLine() {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const id = 1 + Math.floor(Math.random() * FALLBACK_TOTAL);
    try {
      const line = await fetchEvolutionChainForSpecies(id);
      if (line && Array.isArray(line.ids) && line.ids.length >= 2) {
        return line;
      }
    } catch {
      /* Continue trying, then fall back to bundled lines */
    }
  }
  return null;
}

async function getCatalog() {
  const cached = readCatalogCache();
  if (cached) return cached;
  try {
    const data = await fetchJson('https://pokeapi.co/api/v2/pokemon-species?limit=2000');
    const catalog = data.results.map((entry, index) => ({ id: index + 1, name: displayName(entry.name) }));
    fs.writeFileSync(catalogCachePath(), JSON.stringify(catalog));
    return catalog;
  } catch {
    return fallback();
  }
}

function getCatalogSync() {
  const cached = readCatalogCache();
  if (cached) return cached;
  return fallback();
}

module.exports = {
  getCatalog,
  getCatalogSync,
  getRandomLine,
  extractEvolutionPaths,
  fetchEvolutionChainForSpecies,
  displayName,
  FALLBACK_TOTAL
};
