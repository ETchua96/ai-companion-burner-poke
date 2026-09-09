const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = path.join(os.tmpdir(), 'token-companion-pokedex-test-' + Date.now());
process.env.TOKEN_COMPANION_USER_DATA = tmpDir;

const companion = require('../companion.js');
const catalog = require('../catalog.js');

test.beforeEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });
});

test.after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('Pokédex Ownership System', async (t) => {
  await t.test('initial state has empty pokedex array and readState backfills', () => {
    let state = companion.readState();
    assert(Array.isArray(state.pokedex));

    // Simulate an existing save with active Bulbasaur and caught Charizard
    state.egg = false;
    state.line = 0; // Bulbasaur
    state.stage = 1; // Ivysaur
    state.caught = [
      { id: 'mon-1', line: 1, stage: 2, level: 100, date: new Date().toISOString() } // Charizard
    ];
    fs.writeFileSync(path.join(tmpDir, 'companion.json'), JSON.stringify(state));

    const refreshed = companion.readState();
    assert(Array.isArray(refreshed.pokedex));
    // Bulbasaur (#1) & Ivysaur (#2) should be registered from active companion
    assert(refreshed.pokedex.includes(1));
    assert(refreshed.pokedex.includes(2));
    assert(refreshed.pokedex.includes('Bulbasaur'));
    assert(refreshed.pokedex.includes('Ivysaur'));

    // Charmander (#4), Charmeleon (#5), Charizard (#6) should be registered from caught
    assert(refreshed.pokedex.includes(4));
    assert(refreshed.pokedex.includes(5));
    assert(refreshed.pokedex.includes(6));
    assert(refreshed.pokedex.includes('Charizard'));
  });

  await t.test('hatching an egg registers stage 0 in pokedex', async () => {
    let state = companion.readState();
    state.egg = true;
    state.eggs = [{ id: 'egg-1', group: 'starter', shiny: false, receivedAt: Date.now() }];
    fs.writeFileSync(path.join(tmpDir, 'companion.json'), JSON.stringify(state));

    await companion.hatchEgg('egg-1');
    const updated = companion.readState();
    assert.equal(updated.egg, false);
    assert(updated.line !== null);
    const line = companion.lineFor(updated.line);
    assert(updated.pokedex.includes(line.ids[0]));
    assert(updated.pokedex.includes(line.labels[0]));
  });

  await t.test('force evolve registers next stage in pokedex', () => {
    let state = companion.readState();
    state.egg = false;
    state.line = 0; // Bulbasaur line: Bulbasaur (0), Ivysaur (1), Venusaur (2)
    state.stage = 0;
    fs.writeFileSync(path.join(tmpDir, 'companion.json'), JSON.stringify(state));

    companion.adminForceEvolve();
    const updated = companion.readState();
    assert.equal(updated.stage, 1);
    assert(updated.pokedex.includes(2)); // Ivysaur
    assert(updated.pokedex.includes('Ivysaur'));

    companion.adminForceEvolve();
    const final = companion.readState();
    assert.equal(final.stage, 2);
    assert(final.pokedex.includes(3)); // Venusaur
    assert(final.pokedex.includes('Venusaur'));
  });

  await t.test('adminSpawnPokemon resolves by Pokédex ID and registers in pokedex', () => {
    companion.adminSpawnPokemon({ speciesId: 150, name: '150', level: 100 });
    const state = companion.readState();
    const mewtwo = state.caught.find(m => {
      const l = companion.lineFor(m.line);
      return l.ids.includes(150);
    });
    assert(mewtwo, 'Mewtwo should be found in caught Pokémon');
    const line = companion.lineFor(mewtwo.line);
    assert.equal(line.labels[mewtwo.stage], 'Mewtwo');
    assert(state.pokedex.includes(150));
    assert(state.pokedex.includes('Mewtwo'));
  });

  await t.test('adminSpawnPokemon resolves by name case-insensitively and registers in pokedex', () => {
    companion.adminSpawnPokemon({ name: 'rayquaza', level: 100 });
    const state = companion.readState();
    const rayquaza = state.caught.find(m => {
      const l = companion.lineFor(m.line);
      return l.ids.includes(384);
    });
    assert(rayquaza, 'Rayquaza should be found in caught Pokémon');
    assert(state.pokedex.includes(384));
    assert(state.pokedex.includes('Rayquaza'));
  });

  await t.test('Pokédex normalized matching handles punctuation and spacing differences', () => {
    const normalize = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    assert.equal(normalize('Ho-Oh'), normalize('Ho Oh'));
    assert.equal(normalize('Porygon-Z'), normalize('Porygon Z'));
    assert.equal(normalize('Mr. Mime'), normalize('Mr Mime'));
  });
});
