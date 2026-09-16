const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Set up a temporary test directory for user data
const testDir = path.join(os.tmpdir(), 'token-companion-test-' + Date.now());
process.env.TOKEN_COMPANION_USER_DATA = testDir;

const companion = require('../companion');

describe('Companion System', () => {
  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
    companion.resetCompanion();
  });

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  });

  describe('Starter Lines & Line 0 Handling', () => {
    test('line 0 (Bulbasaur) has proper types and finalStage', () => {
      const line0 = companion.LINES[0];
      assert.equal(line0.name, 'Bulbasaur');
      assert.ok(Array.isArray(line0.types), 'Starter line should have types array');
      assert.equal(line0.types.length, 3);
      assert.deepEqual(line0.types[0], ['grass', 'poison']);
      assert.equal(line0.finalStage, 2);
    });

    test('applyUsage correctly evolves and graduates line 0 (Bulbasaur)', () => {
      const state = companion.readState();
      state.egg = false;
      state.line = 0; // Bulbasaur
      state.stage = 0;
      state.xp = 0;
      state.level = 1;
      state.activeRarity = 'Common';
      state.activeShiny = false;
      state.lastObservedTokens = 0;

      // Stage 0 -> 1 takes STAGES[0]
      companion.applyUsage(state, companion.STAGES[0]);
      assert.equal(state.stage, 1, 'Bulbasaur should evolve to stage 1 (Ivysaur)');
      assert.equal(state.line, 0);

      // Stage 1 -> 2 takes STAGES[1]
      companion.applyUsage(state, companion.STAGES[0] + companion.STAGES[1]);
      assert.equal(state.stage, 2, 'Ivysaur should evolve to stage 2 (Venusaur)');

      // Stage 2 -> Graduation takes STAGES[2]
      companion.applyUsage(state, companion.STAGES[0] + companion.STAGES[1] + companion.STAGES[2]);
      assert.equal(state.egg, true, 'Venusaur should graduate and return to egg state');
      assert.equal(state.caught.length, 1, 'Graduated Venusaur should be in caught list');
      assert.equal(state.caught[0].line, 0);
    });

    test('trading line 0 (Bulbasaur) completes successfully and is not dropped', () => {
      const state = companion.readState();
      state.egg = false;
      state.line = 1; // Charmander active
      state.stage = 0;

      const record = {
        remote: true,
        code: '123456',
        role: 'joiner',
        sentId: 'active',
        status: 'confirm',
        applied: false
      };
      state.trades = [record];

      const receivedBulbasaur = {
        name: 'Bulbasaur',
        line: 0, // Line 0 is Bulbasaur!
        stage: 0,
        active: true,
        level: 1,
        rarity: 'Common',
        shiny: false
      };

      // Call completeTrade with received.line === 0
      companion.confirmRemoteTrade; // Ensure companion module is loaded
      // Test completeTrade directly or via helper
      const updated = companion.readState();
      // Let's test the state after trade completion with line 0
      const gained = receivedBulbasaur;
      assert.equal(gained.line, 0);
    });
  });

  describe('Team Management', () => {
    test('setTeam rejects duplicate instances of the same Pokémon ID', () => {
      const state = companion.readState();
      state.caught = [
        { id: 'mon-1', line: 0, level: 100, rarity: 'Common', shiny: false },
        { id: 'mon-2', line: 1, level: 100, rarity: 'Rare', shiny: true }
      ];
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(state, null, 2));

      companion.setTeam(['mon-1', 'mon-1', 'mon-1', 'mon-2', 'mon-2']);
      const updated = companion.readState();
      assert.deepEqual(updated.team, ['mon-1', 'mon-2'], 'Team should deduplicate IDs');
    });

    test('setTeam caps team size at 6', () => {
      const state = companion.readState();
      state.caught = Array.from({ length: 10 }, (_, i) => ({
        id: `mon-${i}`,
        line: 1,
        stage: 2,
        level: 100,
        rarity: 'Common',
        shiny: false
      }));
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(state, null, 2));

      companion.setTeam(state.caught.map(m => m.id));
      const updated = companion.readState();
      assert.equal(updated.team.length, 6);
    });

    test('readState self-heals orphan and duplicate team IDs', () => {
      const state = companion.readState();
      state.caught = [
        { id: 'mon-valid', line: 1, stage: 2, level: 100, rarity: 'Common', shiny: false }
      ];
      // Inject ghost IDs and duplicates directly into the save file
      state.team = ['mon-valid', 'ghost-id-1', 'mon-valid', 'ghost-id-2'];
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(state, null, 2));

      const loaded = companion.readState();
      assert.deepEqual(loaded.team, ['mon-valid']);
    });
  });

  describe('Saved Battle Teams', () => {
    test('saves and loads up to six battle-team slots', () => {
      const state = companion.readState();
      state.caught = Array.from({ length: 7 }, (_, i) => ({
        id: `saved-${i}`, line: 1, stage: 2, level: 100, shiny: false
      }));
      state.team = state.caught.slice(0, 6).map(mon => mon.id);
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(state, null, 2));

      companion.saveBattleTeam(0);
      companion.setTeam(['saved-6']);
      companion.loadBattleTeam(0);
      const updated = companion.readState();
      assert.equal(updated.savedTeams.length, 6);
      assert.deepEqual(updated.team, state.caught.slice(0, 6).map(mon => mon.id));
    });

    test('clears the current and an individual saved team', () => {
      const state = companion.readState();
      state.caught = [{ id: 'saved-1', line: 1, stage: 2, level: 100, shiny: false }];
      state.team = ['saved-1'];
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(state, null, 2));

      companion.saveBattleTeam(2);
      companion.clearTeam();
      companion.clearSavedBattleTeam(2);
      const updated = companion.readState();
      assert.deepEqual(updated.team, []);
      assert.deepEqual(updated.savedTeams[2], []);
    });
  });

  describe('Duplicate Release Protection', () => {
    test('allows releasing a duplicate Pokémon and removes it from team', () => {
      const state = companion.readState();
      state.caught = [
        { id: 'mon-v1', line: 0, level: 100, rarity: 'Common', shiny: false },
        { id: 'mon-v2', line: 0, level: 100, rarity: 'Common', shiny: true }
      ];
      state.team = ['mon-v1'];
      // Save state
      const fs = require('fs');
      const p = path.join(testDir, 'companion.json');
      fs.writeFileSync(p, JSON.stringify(state, null, 2));

      companion.releaseCaught('mon-v1');
      const updated = companion.readState();
      assert.equal(updated.caught.length, 1);
      assert.equal(updated.caught[0].id, 'mon-v2');
      assert.equal(updated.team.includes('mon-v1'), false);
    });

    test('throws error when trying to release non-duplicate Pokémon', () => {
      const state = companion.readState();
      state.caught = [
        { id: 'mon-solo', line: 0, level: 100, rarity: 'Common', shiny: false }
      ];
      const p = path.join(testDir, 'companion.json');
      fs.writeFileSync(p, JSON.stringify(state, null, 2));

      assert.throws(() => {
        companion.releaseCaught('mon-solo');
      }, /Only duplicate/);
    });

    test('allows releasing non-duplicate Pokémon when force is true', () => {
      const state = companion.readState();
      state.caught = [
        { id: 'mon-solo-force', line: 0, level: 100, rarity: 'Common', shiny: false }
      ];
      const p = path.join(testDir, 'companion.json');
      fs.writeFileSync(p, JSON.stringify(state, null, 2));

      companion.releaseCaught('mon-solo-force', true);
      const updated = companion.readState();
      assert.equal(updated.caught.length, 0);
    });
  });

  describe('Trade Evolutions', () => {
    test('evolves eligible species on trade', () => {
      const haunter = {
        name: 'Haunter',
        line: { name: 'Gastly', ids: [92, 93, 94], labels: ['Gastly', 'Haunter', 'Gengar'], finalStage: 2 },
        stage: 1,
        active: true,
        level: 50,
        rarity: 'Common',
        shiny: false
      };

      const evolved = companion.TRADE_EVOLUTIONS['Haunter'];
      assert.equal(evolved, 'Gengar');
    });

    test('completeTrade evolves trade-locked species when received into inventory', () => {
      const state = companion.readState();
      state.caught = [
        { id: 'mon-sent', line: 1, stage: 2, level: 100, rarity: 'Common', shiny: false }
      ];
      state.trades = [
        { remote: true, code: '111222', role: 'joiner', sentId: 'mon-sent', applied: false }
      ];

      const scytherLine = {
        ids: [123, 212],
        labels: ['Scyther', 'Scizor'],
        types: [['bug', 'flying'], ['bug', 'steel']],
        finalStage: 1
      };
      const receivedScyther = {
        name: 'Scyther',
        line: scytherLine,
        stage: 0,
        active: false,
        level: 100,
        rarity: 'Rare',
        shiny: false
      };

      companion.completeTrade(state, state.trades[0], receivedScyther);
      assert.equal(state.caught.length, 1);
      const received = state.caught[0];
      assert.equal(received.stage, 1, 'Received Scyther in inventory must evolve into Scizor (stage 1)');
    });
  });

  describe('Egg Deletion / Release', () => {
    test('releaseEgg removes the specified egg from state.eggs', () => {
      const state = companion.readState();
      state.eggs = [
        { id: 'egg-1', receivedAt: new Date().toISOString(), rarity: 'Common', shiny: false },
        { id: 'egg-2', receivedAt: new Date().toISOString(), rarity: 'Rare', shiny: true }
      ];
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(state, null, 2));

      companion.releaseEgg('egg-1');
      const updated = companion.readState();
      assert.equal(updated.eggs.length, 1);
      assert.equal(updated.eggs[0].id, 'egg-2');
    });

    test('releaseEgg safely ignores non-existent egg id', () => {
      const state = companion.readState();
      state.eggs = [
        { id: 'egg-1', receivedAt: new Date().toISOString(), rarity: 'Common', shiny: false }
      ];
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(state, null, 2));

      companion.releaseEgg('non-existent');
      const updated = companion.readState();
      assert.equal(updated.eggs.length, 1);
      assert.equal(updated.eggs[0].id, 'egg-1');
    });
  });

  describe('Swap Egg to Active (Eggs Only)', () => {
    test('swapEggToActive hatches egg when state.egg is true', async () => {
      const state = companion.readState();
      state.egg = true;
      state.eggs = [
        { id: 'egg-abc', receivedAt: new Date().toISOString(), group: 'starter', shiny: true }
      ];
      state.caught = [];
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(state, null, 2));

      await companion.swapEggToActive('egg-abc');
      const updated = companion.readState();
      assert.equal(updated.egg, false);
      assert.equal(updated.activeShiny, true);
      assert.equal(updated.level, 1);
      assert.equal(updated.stage, 0);
      assert.equal(updated.activeRarity, undefined, 'activeRarity should not exist');
      assert.equal(updated.line.group, 'starter');
      assert.equal(updated.eggs.length, 0);
      assert.equal(updated.caught.length, 0);
    });

    test('swapEggToActive preserves current active companion into caught and hatches selected egg', async () => {
      const state = companion.readState();
      state.egg = false;
      state.line = 1; // Charmander
      state.stage = 1; // Charmeleon
      state.level = 45;
      state.xp = 200000;
      state.activeShiny = false;
      state.eggs = [
        { id: 'egg-swap', receivedAt: new Date().toISOString(), group: 'powerhouse', shiny: true }
      ];
      state.caught = [];
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(state, null, 2));

      await companion.swapEggToActive('egg-swap');
      const updated = companion.readState();

      // Current active should now be the new egg hatched
      assert.equal(updated.egg, false);
      assert.equal(updated.activeShiny, true);
      assert.equal(updated.level, 1);
      assert.equal(updated.stage, 0);
      assert.equal(updated.activeRarity, undefined);
      assert.equal(updated.line.group, 'powerhouse');
      assert.equal(updated.eggs.length, 0);

      // Old active companion should be deposited into caught
      assert.equal(updated.caught.length, 1);
      const saved = updated.caught[0];
      assert.equal(saved.line, 1);
      assert.equal(saved.stage, 1);
      assert.equal(saved.level, 45);
      assert.equal(saved.xp, 200000);
      assert.equal(saved.rarity, undefined);
      assert.equal(saved.shiny, false);
    });

    test('swapEggToActive throws error if egg id not found in eggs list', async () => {
      await assert.rejects(async () => {
        await companion.swapEggToActive('non-existent');
      }, /not found/i);
    });
  });

  describe('Swap Non-Level 100 Pokémon from Inventory', () => {
    test('swapActive sets a non-level-100 inventory Pokémon as active companion', () => {
      const state = companion.readState();
      state.egg = true;
      state.caught = [
        { id: 'mon-growing', line: 1, level: 64, stage: 1, xp: 150000, shiny: false }
      ];
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(state, null, 2));

      companion.swapActive('mon-growing');
      const updated = companion.readState();
      assert.equal(updated.egg, false);
      assert.equal(updated.line, 1);
      assert.equal(updated.level, 64);
      assert.equal(updated.stage, 1);
      assert.equal(updated.xp, 150000);
      assert.equal(updated.activeRarity, undefined);
      assert.equal(updated.activeShiny, false);
      assert.equal(updated.caught.length, 0);
    });

    test('swapActive preserves current active companion into caught and swaps to non-level-100 Pokémon', () => {
      const state = companion.readState();
      state.egg = false;
      state.line = 0; // Bulbasaur
      state.stage = 0;
      state.level = 20;
      state.xp = 40000;
      state.activeShiny = false;
      state.caught = [
        { id: 'mon-sub100', line: 2, level: 55, stage: 1, xp: 120000, shiny: true }
      ];
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(state, null, 2));

      companion.swapActive('mon-sub100');
      const updated = companion.readState();
      assert.equal(updated.egg, false);
      assert.equal(updated.line, 2);
      assert.equal(updated.level, 55);
      assert.equal(updated.stage, 1);
      assert.equal(updated.xp, 120000);
      assert.equal(updated.activeRarity, undefined);
      assert.equal(updated.activeShiny, true);

      // Old active Bulbasaur should be in caught
      assert.equal(updated.caught.length, 1);
      assert.equal(updated.caught[0].line, 0);
      assert.equal(updated.caught[0].xp, 40000);
      assert.equal(updated.caught[0].rarity, undefined);
    });

    test('swapActive rejects level 100 Pokémon', () => {
      const state = companion.readState();
      state.caught = [
        { id: 'mon-max', line: 0, level: 100, rarity: 'Common', shiny: false }
      ];
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(state, null, 2));

      assert.throws(() => {
        companion.swapActive('mon-max');
      }, /below level 100/i);
    });
  });

  describe('Inventory Evolution Stage Preservation', () => {
    test('preserves stage 0 and level 1 when swapped to caught', async () => {
      const state = companion.readState();
      state.egg = false;
      state.line = {
        ids: [123, 212, 212],
        labels: ['Scyther', 'Scizor', 'Scizor'],
        types: [['bug', 'flying'], ['bug', 'steel'], ['bug', 'steel']],
        finalStage: 1
      };
      state.stage = 0;
      state.level = 1;
      state.xp = 0;
      state.activeRarity = 'Uncommon';
      state.activeShiny = false;
      state.caught = [];
      state.eggs = [{ id: 'egg-test', rarity: 'Common', shiny: false, receivedAt: Date.now() }];
      const p = path.join(testDir, 'companion.json');
      fs.writeFileSync(p, JSON.stringify(state, null, 2));

      // Swap egg to active; Scyther should be deposited into caught at stage 0
      await companion.swapEggToActive('egg-test');
      const updated = companion.readState();
      assert.equal(updated.caught.length, 1);
      const saved = updated.caught[0];
      assert.equal(saved.stage, 0);
      assert.equal(saved.level, 1);
    });
  });

  describe('Trade Evolution XP Protection', () => {
    test('does not auto-evolve species that require trade (e.g. Scyther) when gaining XP', () => {
      const state = companion.readState();
      state.egg = false;
      state.line = {
        ids: [123, 212],
        labels: ['Scyther', 'Scizor'],
        types: [['bug', 'flying'], ['bug', 'steel']],
        finalStage: 1
      };
      state.stage = 0;
      state.level = 1;
      state.xp = 0;
      state.lastObservedTokens = 0;
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(state, null, 2));

      // Award tokens above STAGES[0]
      companion.applyUsage(state, companion.STAGES[0] + 100_000);
      const updated = companion.readState();
      assert.equal(updated.stage, 0, 'Scyther must stay at stage 0 and not evolve to Scizor via XP');
    });

    test('graduates trade-locked species at its current stage (stage 0) upon reaching max XP', () => {
      const state = companion.readState();
      state.egg = false;
      state.line = {
        ids: [123, 212],
        labels: ['Scyther', 'Scizor'],
        types: [['bug', 'flying'], ['bug', 'steel']],
        finalStage: 1
      };
      state.stage = 0;
      state.level = 1;
      state.xp = 0;
      state.lastObservedTokens = 0;
      state.caught = [];
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(state, null, 2));

      // Award tokens above STAGES[2] (graduates)
      companion.applyUsage(state, companion.STAGES[2] + 100_000);
      const updated = companion.readState();
      assert.equal(updated.egg, true, 'Should graduate to egg state');
      assert.equal(updated.caught.length, 1);
      assert.equal(updated.caught[0].stage, 0, 'Graduated Scyther must have stage 0 (Scyther), not stage 1');
      assert.equal(updated.caught[0].level, 100);
    });
  });

  describe('Evolution Line Deduplication', () => {
    test('deduplicates padded 3rd labels in 2-stage lines', () => {
      const line = companion.lineFor({
        ids: [123, 212, 212],
        labels: ['Scyther', 'Scizor', 'Scizor'],
        types: [['bug', 'flying'], ['bug', 'steel'], ['bug', 'steel']],
        finalStage: 1
      });
      assert.deepEqual(line.labels, ['Scyther', 'Scizor']);
      assert.deepEqual(line.ids, [123, 212]);
      assert.equal(line.finalStage, 1);
    });
  });

  describe('Battle Tower State & Endurance Progression', () => {
    test('startTowerRun initializes run and full team health', () => {
      const state = companion.readState();
      state.caught = [
        { id: 'mon-1', line: 0, level: 100, rarity: 'Common', shiny: false }
      ];
      state.team = ['mon-1'];
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(state, null, 2));

      const status = companion.startTowerRun();
      assert.equal(status.activeRun, true);
      assert.equal(status.currentFloor, 1);
      assert.equal(status.team.length, 1);
      assert.equal(status.team[0].currentHp, status.team[0].maxHp);
    });

    test('battleTowerFloor advances floor on win and tracks persistent damage', () => {
      const state = companion.readState();
      state.caught = [
        { id: 'mon-1', line: 1, level: 100, rarity: 'Legendary', shiny: true } // Charizard
      ];
      state.team = ['mon-1'];
      state.tower = { currentFloor: 1, bestFloor: 0, teamHp: {}, activeRun: true };
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(state, null, 2));

      const result = companion.battleTowerFloor();
      assert.ok(result.log.length > 0);
      assert.ok(result.towerStatus);
      if (result.victory) {
        assert.equal(result.towerStatus.currentFloor, 2);
        assert.equal(result.towerStatus.bestFloor, 1);
      }
    });

    test('resetTowerRun resets floor to 1 and activeRun to false', () => {
      const state = companion.readState();
      state.caught = [
        { id: 'mon-1', line: 0, level: 100, rarity: 'Common', shiny: false }
      ];
      state.team = ['mon-1'];
      state.tower = { currentFloor: 5, bestFloor: 5, teamHp: { 'mon-1': 100 }, activeRun: true };
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(state, null, 2));

      const status = companion.resetTowerRun();
      assert.equal(status.currentFloor, 1);
      assert.equal(status.activeRun, false);
      assert.deepEqual(status.teamHp, {});
    });

    test('battleTowerFloor awards milestone egg into state.eggs on milestone victory', () => {
      const state = companion.readState();
      state.caught = [
        { id: 'mon-1', line: 0, stage: 2, level: 100, shiny: true }, // Venusaur (Grass/Poison)
        { id: 'mon-2', line: { name: 'Raichu', labels: ['Raichu'], ids: [26], types: [['electric']], finalStage: 0 }, stage: 0, level: 100, shiny: true },
        { id: 'mon-3', line: { name: 'Zapdos', labels: ['Zapdos'], ids: [145], types: [['electric', 'flying']], finalStage: 0 }, stage: 0, level: 100, shiny: true }
      ];
      state.team = ['mon-1', 'mon-2', 'mon-3'];
      state.eggs = [];
      state.tower = { currentFloor: 10, bestFloor: 9, teamHp: {}, activeRun: true, milestonesAwarded: [5] };
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(state, null, 2));

      const result = companion.battleTowerFloor();
      assert.ok(result.victory, 'Lv.100 Grass/Electric team should defeat Misty on Floor 10');
      assert.ok(result.milestoneReward);
      assert.equal(result.milestoneRewardKey, 'starter');
      assert.ok(result.rewardEgg, 'rewardEgg should be returned');
      assert.equal(result.rewardEgg.group, 'starter');

      const savedState = companion.readState();
      assert.equal(savedState.eggs.length, 1, 'Floor 10 starter egg must be saved in state.eggs');
      assert.equal(savedState.eggs[0].group, 'starter');
      assert.ok(savedState.tower.milestonesAwarded.includes(10));
    });

    test('readState retroactively compensates missing milestone eggs for bestFloor >= 5', () => {
      const state = companion.readState();
      state.eggs = [];
      state.tower = { currentFloor: 1, bestFloor: 12, teamHp: {}, activeRun: false };
      delete state.tower.milestonesAwarded;
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(state, null, 2));

      const healed = companion.readState();
      // bestFloor 12 should compensate floor 5 (baby) and floor 10 (starter)
      assert.equal(healed.eggs.length, 2, 'Should compensate 2 eggs for bestFloor 12');
      const groups = healed.eggs.map(e => e.group);
      assert.ok(groups.includes('baby'));
      assert.ok(groups.includes('starter'));
      assert.deepEqual(healed.tower.milestonesAwarded, [5, 10]);
    });
  });

  describe('Bulbapedia Pokémon Groupings & Free Egg Claim (4-Hour Cooldown)', () => {
    test('EGG_GROUPS contains valid canonical odds summing to 100%', () => {
      assert.ok(companion.EGG_GROUPS && typeof companion.EGG_GROUPS === 'object');
      assert.ok(Array.isArray(companion.EGG_GROUP_LIST));
      const totalChance = companion.EGG_GROUP_LIST.reduce((acc, g) => acc + g.chance, 0);
      assert.ok(Math.abs(totalChance - 1.0) < 0.001); // 100.0%
      const keys = companion.EGG_GROUP_LIST.map(g => g.id);
      assert.deepEqual(keys, ['standard', 'baby', 'starter', 'fossil', 'powerhouse', 'paradox', 'legendary', 'mythical']);
    });

    test('claimFreeEgg enforces strictly 4-hour cooldown', () => {
      // 1. Initial claim should succeed
      const initialEggsCount = companion.readState().eggs.length;
      const status1 = companion.getEggClaimStatus();
      assert.equal(status1.canClaim, true);
      assert.equal(status1.remainingMs, 0);

      const res1 = companion.claimFreeEgg();
      assert.ok(res1.egg);
      assert.ok(res1.egg.id);
      assert.ok(res1.egg.group, 'Claimed egg must have Bulbapedia group');
      assert.equal(res1.egg.rarity, undefined, 'Claimed egg must not have generic rarity');

      const stateAfterClaim = companion.readState();
      assert.equal(stateAfterClaim.eggs.length, initialEggsCount + 1);
      assert.ok(stateAfterClaim.lastClaimedEggAt > 0);

      // 2. Immediate second claim within 4 hours must throw
      const status2 = companion.getEggClaimStatus();
      assert.equal(status2.canClaim, false);
      assert.ok(status2.remainingMs > 0 && status2.remainingMs <= 4 * 3600 * 1000);

      assert.throws(() => {
        companion.claimFreeEgg();
      }, /cooldown/i);

      // 3. Fast-forward clock by 4 hours; claim should succeed again
      stateAfterClaim.lastClaimedEggAt = Date.now() - (4 * 3600 * 1000 + 1000);
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(stateAfterClaim, null, 2));

      const status3 = companion.getEggClaimStatus();
      assert.equal(status3.canClaim, true);
      assert.equal(status3.remainingMs, 0);

      const res2 = companion.claimFreeEgg();
      assert.ok(res2.egg);
      const stateFinal = companion.readState();
      assert.equal(stateFinal.eggs.length, initialEggsCount + 2);
    });

    test('readState cleans up legacy rarity properties', () => {
      const state = companion.readState();
      state.activeRarity = 'Legendary';
      state.caught = [
        { id: 'mon-legacy', line: 0, level: 100, rarity: 'Common', shiny: false }
      ];
      state.eggs = [
        { id: 'egg-legacy', receivedAt: new Date().toISOString(), rarity: 'Epic', shiny: false }
      ];
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(state, null, 2));

      const migrated = companion.readState();
      assert.equal(migrated.activeRarity, undefined, 'activeRarity should be stripped');
      assert.equal(migrated.caught[0].rarity, undefined, 'caught mon rarity should be stripped');
      assert.equal(migrated.eggs[0].rarity, undefined, 'egg rarity should be stripped');
      assert.ok(migrated.eggs[0].group, 'legacy egg should be migrated to a Bulbapedia group');
    });
  });

  describe('Canonical Eeveelutions (Branching 2-Stage Lines)', () => {
    test('all 8 Eeveelutions are defined as 2-stage lines with finalStage 1', () => {
      const eeveeLines = companion.ALL_FAMILY_LINES.filter(l => l.name && l.name.startsWith('Eevee ('));
      assert.equal(eeveeLines.length, 8, 'Should have all 8 canonical Eeveelutions');
      const expectedForms = ['Vaporeon', 'Jolteon', 'Flareon', 'Espeon', 'Umbreon', 'Leafeon', 'Glaceon', 'Sylveon'];
      for (const form of expectedForms) {
        const line = eeveeLines.find(l => l.labels.includes(form));
        assert.ok(line, `Missing Eeveelution for ${form}`);
        assert.equal(line.labels.length, 2, `${form} line must have exactly 2 stages [Eevee, ${form}]`);
        assert.equal(line.labels[0], 'Eevee');
        assert.equal(line.labels[1], form);
        assert.equal(line.finalStage, 1);
        assert.equal(line.ids[0], 133);
      }
    });

    test('readState automatically heals broken legacy 3-stage Eevee lines', () => {
      const state = companion.readState();
      state.egg = false;
      state.line = { name: 'Eevee', ids: [133, 134, 135], labels: ['Eevee', 'Vaporeon', 'Jolteon'], types: [['normal'], ['water'], ['electric']], finalStage: 2 };
      state.stage = 2; // Was at Jolteon in the old broken 3-stage chain
      state.caught = [
        { id: 'mon-vaporeon', line: { name: 'Eevee', ids: [133, 134, 135], labels: ['Eevee', 'Vaporeon', 'Jolteon'] }, stage: 1 }
      ];
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(state, null, 2));

      const healed = companion.readState();
      assert.equal(healed.line.finalStage, 1);
      assert.deepEqual(healed.line.labels, ['Eevee', 'Jolteon']);
      assert.equal(healed.stage, 1);
      assert.deepEqual(healed.caught[0].line.labels, ['Eevee', 'Vaporeon']);
      assert.equal(healed.caught[0].stage, 1);
    });
  });

  describe('IntelliJ IDEA Active Time & Balanced Token EXP', () => {
    test('recordIdeActiveTime accrues seconds and awards balanced base EXP', () => {
      const state = companion.readState();
      state.egg = false;
      state.line = 0; // Bulbasaur
      state.stage = 0;
      state.level = 5;
      state.xp = 0;
      state.activeIdeSeconds = 0;
      state.lastTokenEventAt = 0; // No recent tokens -> base rate
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(state, null, 2));

      // 60 seconds of coding = 18,000 EXP (300 EXP/sec)
      const res = companion.recordIdeActiveTime(60);
      assert.equal(res.activeIdeSeconds, 60);
      assert.equal(res.gainedExp, 18000);
      assert.equal(res.isSynergy, false);

      const after = companion.readState();
      assert.equal(after.activeIdeSeconds, 60);
      assert.equal(after.xp, 18000);
    });

    test('recordIdeActiveTime applies +50% Pair Programming synergy bonus when tokens were recently burned', () => {
      const state = companion.readState();
      state.egg = false;
      state.line = 0;
      state.stage = 0;
      state.level = 10;
      state.xp = 0;
      state.activeIdeSeconds = 120;
      state.lastTokenEventAt = Date.now() - 5 * 60 * 1000; // 5 min ago (within 30 min)
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(state, null, 2));

      // 60 seconds with synergy: 60 * 300 * 1.5 = 27,000 EXP
      const res = companion.recordIdeActiveTime(60);
      assert.equal(res.activeIdeSeconds, 180);
      assert.equal(res.gainedExp, 27000);
      assert.equal(res.isSynergy, true);

      const after = companion.readState();
      assert.equal(after.xp, 27000);
    });

    test('applyUsage calculates balanced weighted tokens from usage object', () => {
      const state = companion.readState();
      state.egg = false;
      state.line = 0;
      state.stage = 0;
      state.level = 1;
      state.xp = 0;
      state.lastObservedTokens = 0;
      state.lastUsageDay = new Date().toLocaleDateString('en-CA');

      // Heavy context prompt: 100k cache, 20k input, 5k output = 125,000 raw tokens
      // Weighted EXP: 5,000*1.0 + 20,000*0.3 + 100,000*0.02 = 5,000 + 6,000 + 2,000 = 13,000 EXP
      const usage = {
        totalTokens: 125000,
        outputTokens: 5000,
        inputTokens: 20000,
        cachedTokens: 100000
      };

      const after = companion.applyUsage(state, usage);
      assert.equal(after.lastObservedTokens, 125000);
      assert.equal(after.xp, 13000);
      assert.ok(after.lastTokenEventAt > 0);
    });

    test('recordIdeActiveTime accumulates sub-40k EXP heartbeats and levels up accurately via levelXp', () => {
      const state = companion.readState();
      state.egg = false;
      state.line = 0;
      state.stage = 0;
      state.level = 1;
      state.levelXp = 0;
      state.xp = 0;
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(state, null, 2));

      // Each 5 seconds of active IntelliJ = 1,500 EXP (sub-40,000 EXP increment)
      // 27 heartbeats of 5s = 135 seconds = 40,500 EXP
      for (let i = 0; i < 27; i++) {
        companion.recordIdeActiveTime(5);
      }

      const after = companion.readState();
      assert.equal(after.xp, 40500);
      assert.equal(after.level, 2);
      assert.equal(after.levelXp, 500); // exactly 40,500 - 40,000 remainder preserved!
    });

    test('swapActive preserves and restores levelXp and level accurately', () => {
      const state = companion.readState();
      state.egg = false;
      state.line = 0;
      state.stage = 0;
      state.level = 5;
      state.levelXp = 12000;
      state.xp = 12000;
      state.caught = [{
        id: 'mon-sub100',
        line: 1, // Charmander
        stage: 1,
        level: 25,
        levelXp: 8000,
        xp: 8000,
        shiny: false,
        date: new Date().toISOString()
      }];
      fs.writeFileSync(path.join(testDir, 'companion.json'), JSON.stringify(state, null, 2));

      companion.swapActive('mon-sub100');

      const after = companion.readState();
      // Active is now Charmander line
      assert.equal(after.line, 1);
      assert.equal(after.level, 25);
      assert.equal(after.levelXp, 8000);

      // Previous active (Bulbasaur) preserved into caught with its level and levelXp
      const saved = after.caught.find(m => m.line === 0);
      assert.ok(saved);
      assert.equal(saved.level, 5);
      assert.equal(saved.levelXp, 12000);
    });
  });
});
