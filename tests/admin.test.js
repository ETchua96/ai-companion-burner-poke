const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  verifyAdminCode,
  adminSetLevel,
  adminAddExp,
  adminForceEvolve,
  adminToggleShiny,
  adminSpawnEgg,
  adminResetEggCooldown,
  adminSpawnPokemon,
  adminHealTowerTeam,
  adminSetTowerFloor,
  adminResetState,
  readState,
  swapEggToActive
} = require('../companion');

test.describe('Admin Developer Console & Authentication', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-test-'));
  const originalUserData = process.env.TOKEN_COMPANION_USER_DATA;

  test.beforeEach(() => {
    process.env.TOKEN_COMPANION_USER_DATA = tmpDir;
    adminResetState();
  });

  test.after(() => {
    if (originalUserData === undefined) delete process.env.TOKEN_COMPANION_USER_DATA;
    else process.env.TOKEN_COMPANION_USER_DATA = originalUserData;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('verifyAdminCode rejects incorrect and retired plaintext fallback passcodes', () => {
    assert.deepEqual(verifyAdminCode('wrongcode'), { valid: false, mode: null });
    assert.deepEqual(verifyAdminCode('retired-code-one'), { valid: false, mode: null });
    assert.deepEqual(verifyAdminCode('retired-code-two'), { valid: false, mode: null });
    assert.deepEqual(verifyAdminCode('retired-code-three'), { valid: false, mode: null });
    assert.deepEqual(verifyAdminCode(''), { valid: false, mode: null });
    assert.deepEqual(verifyAdminCode(null), { valid: false, mode: null });
    assert.deepEqual(verifyAdminCode(undefined), { valid: false, mode: null });
  });

  test('verifyAdminCode recognizes the full and restricted admin roles', () => {
    assert.deepEqual(verifyAdminCode('ETadmingoodgood'), { valid: true, mode: 'full' });
    assert.deepEqual(verifyAdminCode('smallpp'), { valid: true, mode: 'limited' });
  });

  test('adminSetLevel and adminAddExp modify active companion', () => {
    const s1 = readState();
    // Hatch starter egg first
    swapEggToActive(s1.eggs[0].id);

    adminSetLevel(50);
    let st = readState();
    assert.equal(st.level, 50);
    assert.equal(st.levelXp, 0);

    adminSetLevel(100);
    st = readState();
    assert.equal(st.level, 100);

    adminAddExp(80000);
    st = readState();
    assert.equal(st.level, 100); // capped at 100
  });

  test('adminForceEvolve evolves active companion', () => {
    const s1 = readState();
    swapEggToActive(s1.eggs[0].id);

    const initialStage = readState().stage;
    adminForceEvolve();
    const nextStage = readState().stage;
    assert.equal(nextStage, initialStage + 1);
  });

  test('adminToggleShiny flips shiny state', () => {
    const s1 = readState();
    swapEggToActive(s1.eggs[0].id);

    const initShiny = Boolean(readState().activeShiny);
    adminToggleShiny();
    assert.equal(readState().activeShiny, !initShiny);
    adminToggleShiny();
    assert.equal(readState().activeShiny, initShiny);
  });

  test('adminSpawnEgg spawns chosen egg group with shiny support', () => {
    adminSpawnEgg('powerhouse', true);
    const st = readState();
    const spawned = st.eggs.find(e => e.group === 'powerhouse' && e.shiny);
    assert.ok(spawned, 'Powerhouse shiny egg should exist in state.eggs');
  });

  test('adminResetEggCooldown resets lastClaimedEggAt to 0', () => {
    const dataDir = path.join(tmpDir, 'poketokenbar');
    fs.mkdirSync(dataDir, { recursive: true });
    const st = readState();
    st.lastClaimedEggAt = Date.now();
    fs.writeFileSync(path.join(dataDir, 'companion.json'), JSON.stringify(st));

    adminResetEggCooldown();
    const updated = readState();
    assert.equal(updated.lastClaimedEggAt, 0);
  });

  test('adminSpawnPokemon spawns requested species and level into inventory', () => {
    adminSpawnPokemon({ speciesId: 150, name: 'Mewtwo', level: 100, shiny: true });
    const st = readState();
    const mewtwo = st.caught.find(c => c.line.ids.includes(150));
    assert.ok(mewtwo, 'Mewtwo should exist in inventory');
    assert.equal(mewtwo.level, 100);
    assert.equal(mewtwo.shiny, true);
  });

  test('adminHealTowerTeam and adminSetTowerFloor modify tower state', () => {
    const dataDir = path.join(tmpDir, 'poketokenbar');
    fs.mkdirSync(dataDir, { recursive: true });
    const st = readState();
    st.tower = { currentFloor: 15, bestFloor: 15, teamHp: { 'mon-1': 10 }, activeRun: true };
    fs.writeFileSync(path.join(dataDir, 'companion.json'), JSON.stringify(st));

    adminHealTowerTeam();
    let updated = readState();
    assert.deepEqual(updated.tower.teamHp, {});

    adminSetTowerFloor(45);
    updated = readState();
    assert.equal(updated.tower.currentFloor, 45);
  });

  test('adminResetState resets save to default starter egg', () => {
    adminSpawnPokemon({ speciesId: 25, name: 'Pikachu', level: 100 });
    assert.ok(readState().caught.length > 0);

    adminResetState();
    const fresh = readState();
    assert.equal(fresh.egg, true);
    assert.equal(fresh.caught.length, 0);
    assert.equal(fresh.eggs.length, 1);
  });
});
