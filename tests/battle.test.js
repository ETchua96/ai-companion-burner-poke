const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { typeFactor, autoBattle, TYPES } = require('../battle');

describe('Battle System', () => {
  describe('typeFactor', () => {
    test('calculates super-effective damage (2x)', () => {
      const factor = typeFactor({ name: 'Charmander', types: ['fire'] }, { name: 'Bulbasaur', types: ['grass', 'poison'] });
      assert.equal(factor, 2);
    });

    test('calculates double super-effective damage (4x)', () => {
      // Fire against Grass/Ice or Grass/Bug
      const factor = typeFactor(['fire'], ['grass', 'ice']);
      assert.equal(factor, 4);
    });

    test('calculates resisted damage (0.5x)', () => {
      const factor = typeFactor({ name: 'Squirtle', types: ['water'] }, { name: 'Bulbasaur', types: ['grass', 'poison'] });
      assert.equal(factor, 0.5);
    });

    test('calculates double resisted damage (0.25x)', () => {
      // Grass against Fire/Flying (Charizard)
      const factor = typeFactor(['grass'], ['fire', 'flying']);
      assert.equal(factor, 0.25);
    });

    test('calculates full immunity (0x)', () => {
      const normalVsGhost = typeFactor(['normal'], ['ghost']);
      assert.equal(normalVsGhost, 0);

      const electricVsGround = typeFactor(['electric'], ['ground']);
      assert.equal(electricVsGround, 0);

      const ghostVsNormal = typeFactor(['ghost'], ['normal']);
      assert.equal(ghostVsNormal, 0);

      const groundVsFlying = typeFactor(['ground'], ['flying']);
      assert.equal(groundVsFlying, 0);

      const dragonVsFairy = typeFactor(['dragon'], ['fairy']);
      assert.equal(dragonVsFairy, 0);
    });

    test('resolves types for evolved starter species by name', () => {
      const charizardVsVenusaur = typeFactor({ name: 'Charizard' }, { name: 'Venusaur' });
      // Fire vs Grass/Poison is 2x
      assert.equal(charizardVsVenusaur, 2);
    });

    test('handles case-insensitive and un-trimmed type inputs', () => {
      const factor = typeFactor(['Fire'], ['Grass ']);
      assert.equal(factor, 2, 'Fire vs Grass should be 2x even if capitalized or padded');
    });

    test('resolves types for evolved starter species by name', () => {
      const charizardFactor = typeFactor('Charizard', 'Venusaur');
      assert.equal(charizardFactor, 2);

      const blastoiseFactor = typeFactor('Blastoise', 'Charizard');
      assert.equal(blastoiseFactor, 2);

      const raichuFactor = typeFactor('Raichu', 'Blastoise');
      assert.equal(raichuFactor, 2);
    });
  });

  describe('autoBattle', () => {
    test('immune attacks deal 0 damage and log "no effect"', () => {
      const teamA = [{ name: 'Gengar', types: ['ghost', 'poison'], level: 50 }];
      const teamB = [{ name: 'Snorlax', types: ['normal'], level: 50 }];

      // Team B uses Normal (0x on Ghost), Team A uses Ghost (0x on Normal)
      const result = autoBattle(teamA, teamB);
      // Verify combat log contains "no effect" or 0 damage when immune
      const ghostAttackedNormal = result.log.some(l => l.includes('hits Snorlax for 0') || l.includes('no effect'));
      const normalAttackedGhost = result.log.some(l => l.includes('hits Gengar for 0') || l.includes('no effect'));
      assert.ok(ghostAttackedNormal || normalAttackedGhost, 'Immune hits should log 0 damage or no effect');
    });

    test('determines correct winner in simple match', () => {
      const teamA = [{ name: 'Charizard', types: ['fire', 'flying'], level: 100 }];
      const teamB = [{ name: 'Caterpie', types: ['bug'], level: 5 }];

      const result = autoBattle(teamA, teamB);
      assert.equal(result.winner, 'A');
      assert.equal(result.remainingA.length, 1);
      assert.equal(result.remainingB.length, 0);
    });
  });

  describe('Practice Fight Tiers', () => {
    const { PRACTICE_TIERS } = require('../battle');

    test('defines all 6 practice tiers with correct levels and team sizes', () => {
      assert.ok(PRACTICE_TIERS, 'PRACTICE_TIERS should be exported');
      
      const expectedTiers = [
        { id: 'veteran', name: 'Veteran', level: 70 },
        { id: 'elite_four', name: 'Elite Four', level: 80 },
        { id: 'champion', name: 'Champion', level: 90 },
        { id: 'master_rank', name: 'Master Rank', level: 100 },
        { id: 'mythic_trial', name: 'Mythic Trial', level: 100 },
        { id: 'arceus_gauntlet', name: 'Arceus Gauntlet', level: 100 }
      ];

      for (const expected of expectedTiers) {
        const tier = PRACTICE_TIERS[expected.id];
        assert.ok(tier, `Tier ${expected.id} must exist in PRACTICE_TIERS`);
        assert.equal(tier.level, expected.level, `${expected.id} must have level ${expected.level}`);
        assert.ok(Array.isArray(tier.team), `${expected.id} team must be an array`);
        assert.equal(tier.team.length, 6, `${expected.id} team should contain 6 Pokémon`);
        
        for (const mon of tier.team) {
          assert.ok(mon.name, 'Each Pokémon must have a name');
          assert.equal(mon.level, expected.level, `Each Pokémon in ${expected.id} must be level ${expected.level}`);
          assert.ok(Array.isArray(mon.types) && mon.types.length > 0, `Each Pokémon in ${expected.id} must have types array`);
        }
      }
    });

    test('runs battle successfully against Mythic Trial and Arceus Gauntlet', () => {
      const myTeam = [
        { name: 'Dragonite', types: ['dragon', 'flying'], level: 100 },
        { name: 'Metagross', types: ['steel', 'psychic'], level: 100 },
        { name: 'Garchomp', types: ['dragon', 'ground'], level: 100 }
      ];

      const mythicResult = autoBattle(myTeam, PRACTICE_TIERS.mythic_trial.team);
      assert.ok(mythicResult.winner === 'A' || mythicResult.winner === 'B');
      assert.ok(mythicResult.log.length > 0);

      const arceusResult = autoBattle(myTeam, PRACTICE_TIERS.arceus_gauntlet.team);
      assert.ok(arceusResult.winner === 'A' || arceusResult.winner === 'B');
      assert.ok(arceusResult.log.length > 0);
    });
  });

  describe('Combat Realism & Archetypes', () => {
    const { stats } = require('../battle');

    test('stats scales HP sufficiently to avoid 1-hit KO at Lv.100', () => {
      const charizard = stats({ name: 'Charizard', level: 100 });
      assert.ok(charizard.hp >= 800, `Lv.100 HP should be at least 800 (got ${charizard.hp})`);
    });

    test('tanks have significantly higher HP and defense than standard Pokémon', () => {
      const snorlax = stats({ name: 'Snorlax', level: 100 });
      const normal = stats({ name: 'Pidgeot', level: 100 });
      assert.ok(snorlax.hp > normal.hp * 1.3, 'Snorlax HP should be >= 1.3x standard');
      assert.ok(snorlax.defense > normal.defense * 1.2, 'Snorlax defense should be >= 1.2x standard');
    });

    test('legendaries have boosted Base Stat Totals', () => {
      const arceus = stats({ name: 'Arceus', level: 100 });
      const standard = stats({ name: 'Persian', level: 100 });
      assert.ok(arceus.hp > standard.hp * 1.25, 'Arceus HP should be boosted');
      assert.ok(arceus.attack > standard.attack * 1.25, 'Arceus attack should be boosted');
    });

    test('stats scale by species archetype and level without MMO rarity multiplier', () => {
      const mon1 = stats({ name: 'Pikachu', level: 100, rarity: 'Common' });
      const mon2 = stats({ name: 'Pikachu', level: 100, rarity: 'Legendary' });
      assert.equal(mon1.hp, mon2.hp, 'Generic rarity should have no effect on stats');
      assert.equal(mon1.attack, mon2.attack, 'Generic rarity should have no effect on stats');
    });
  });

  describe('Battle Tower System', () => {
    const { generateTowerFloor, runTowerFloorBattle } = require('../battle');

    test('generateTowerFloor scales correctly across floors and flags boss floors', () => {
      const f1 = generateTowerFloor(1);
      assert.equal(f1.floor, 1);
      assert.ok(f1.trainerName);
      assert.ok(f1.team.length >= 3);
      assert.equal(f1.isBossFloor, false);
      assert.equal(f1.milestoneRewardKey, null);

      const f5 = generateTowerFloor(5);
      assert.equal(f5.isBossFloor, true);
      assert.equal(f5.milestoneRewardKey, 'baby');

      const f10 = generateTowerFloor(10);
      assert.equal(f10.floor, 10);
      assert.equal(f10.isBossFloor, true);
      assert.ok(f10.milestoneReward, 'Floor 10 should offer a milestone reward');
      assert.equal(f10.milestoneRewardKey, 'starter', 'Floor 10 should have starter egg milestone key');

      const f20 = generateTowerFloor(20);
      assert.equal(f20.milestoneRewardKey, 'powerhouse');

      const f50 = generateTowerFloor(50);
      assert.equal(f50.floor, 50);
      assert.equal(f50.isBossFloor, true);
      assert.equal(f50.team[0].name, 'Arceus');
      assert.equal(f50.milestoneRewardKey, 'mythical');
    });

    test('runTowerFloorBattle preserves player team damage across floors', () => {
      const playerTeam = [
        { name: 'Dragonite', types: ['dragon', 'flying'], level: 100, currentHp: 500, maxHp: 1000 },
        { name: 'Gengar', types: ['ghost', 'poison'], level: 100, currentHp: 0, maxHp: 800 } // already fainted
      ];

      const result = runTowerFloorBattle(playerTeam, 1);
      assert.ok(Array.isArray(result.log));
      assert.ok(Array.isArray(result.playerTeamAfter));
      assert.equal(result.floor, 1);
      const gengarAfter = result.playerTeamAfter.find(m => m.name === 'Gengar');
      assert.equal(gengarAfter.currentHp, 0);
    });

    test('runTowerFloorBattle returns battle result properties compatible with renderBattleLog', () => {
      const playerTeam = [
        { name: 'Dragonite', types: ['dragon', 'flying'], level: 100, currentHp: 1000, maxHp: 1000 }
      ];
      const result = runTowerFloorBattle(playerTeam, 1);
      assert.ok(result.winner === 'A' || result.winner === 'B', 'result.winner must be defined');
      assert.ok(Array.isArray(result.remainingA), 'result.remainingA must be an array');
      assert.ok(Array.isArray(result.remainingB), 'result.remainingB must be an array');
    });
  });
});
