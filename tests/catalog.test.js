const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const testDir = path.join(os.tmpdir(), 'catalog-test-' + Date.now());
process.env.TOKEN_COMPANION_USER_DATA = testDir;

const catalog = require('../catalog');

describe('Catalog Module', () => {
  test('getCatalog returns list of 1025 Pokémon entries fallback or cached', async () => {
    fs.mkdirSync(testDir, { recursive: true });
    // Write mock cached catalog to test caching
    const mockCache = [
      { id: 1, name: 'Bulbasaur' },
      { id: 2, name: 'Ivysaur' },
      { id: 3, name: 'Venusaur' }
    ];
    fs.writeFileSync(path.join(testDir, 'pokedex-catalog.json'), JSON.stringify(mockCache));

    const result = await catalog.getCatalog();
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 3);
    assert.equal(result[0].name, 'Bulbasaur');

    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('FALLBACK_TOTAL is 1025', () => {
    assert.equal(catalog.FALLBACK_TOTAL, 1025);
  });

  test('extractEvolutionPaths extracts all branching paths correctly from PokeAPI tree', () => {
    const eeveeTree = {
      species: { name: 'eevee', url: 'https://pokeapi.co/api/v2/pokemon-species/133/' },
      evolves_to: [
        { species: { name: 'vaporeon', url: 'https://pokeapi.co/api/v2/pokemon-species/134/' }, evolves_to: [] },
        { species: { name: 'jolteon', url: 'https://pokeapi.co/api/v2/pokemon-species/135/' }, evolves_to: [] },
        { species: { name: 'flareon', url: 'https://pokeapi.co/api/v2/pokemon-species/136/' }, evolves_to: [] },
        { species: { name: 'espeon', url: 'https://pokeapi.co/api/v2/pokemon-species/196/' }, evolves_to: [] },
        { species: { name: 'umbreon', url: 'https://pokeapi.co/api/v2/pokemon-species/197/' }, evolves_to: [] },
        { species: { name: 'leafeon', url: 'https://pokeapi.co/api/v2/pokemon-species/470/' }, evolves_to: [] },
        { species: { name: 'glaceon', url: 'https://pokeapi.co/api/v2/pokemon-species/471/' }, evolves_to: [] },
        { species: { name: 'sylveon', url: 'https://pokeapi.co/api/v2/pokemon-species/700/' }, evolves_to: [] }
      ]
    };
    const paths = catalog.extractEvolutionPaths(eeveeTree);
    assert.equal(paths.length, 8, 'Eevee should yield 8 individual branching paths');
    for (const p of paths) {
      assert.equal(p.length, 2);
      assert.equal(p[0].name, 'eevee');
    }
  });

  test('displayName correctly formats canonical Pokémon names', () => {
    assert.equal(catalog.displayName('ho-oh'), 'Ho-Oh');
    assert.equal(catalog.displayName('porygon-z'), 'Porygon-Z');
    assert.equal(catalog.displayName('mr-mime'), 'Mr. Mime');
    assert.equal(catalog.displayName('roaring-moon'), 'Roaring Moon');
    assert.equal(catalog.displayName('iron-bundle'), 'Iron Bundle');
    assert.equal(catalog.displayName('bulbasaur'), 'Bulbasaur');
  });
});
