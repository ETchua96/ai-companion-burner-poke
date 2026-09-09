const TYPES = {
  Bulbasaur: ['grass', 'poison'], Ivysaur: ['grass', 'poison'], Venusaur: ['grass', 'poison'],
  Charmander: ['fire'], Charmeleon: ['fire'], Charizard: ['fire', 'flying'],
  Squirtle: ['water'], Wartortle: ['water'], Blastoise: ['water'],
  Pichu: ['electric'], Pikachu: ['electric'], Raichu: ['electric'],
  Eevee: ['normal'], Vaporeon: ['water'], Jolteon: ['electric'], Flareon: ['fire'],
  Espeon: ['psychic'], Umbreon: ['dark'], Leafeon: ['grass'], Glaceon: ['ice'], Sylveon: ['fairy'],
  Gastly: ['ghost', 'poison'], Haunter: ['ghost', 'poison'], Gengar: ['ghost', 'poison'],
  Abra: ['psychic'], Kadabra: ['psychic'], Alakazam: ['psychic'],
  Machop: ['fighting'], Machoke: ['fighting'], Machamp: ['fighting'],
  Geodude: ['rock', 'ground'], Graveler: ['rock', 'ground'], Golem: ['rock', 'ground'],
  Snorlax: ['normal'], Dragonite: ['dragon', 'flying'], Mewtwo: ['psychic'], Mew: ['psychic']
};
const EFFECTIVE = {
  normal: [], fire: ['grass', 'ice', 'bug', 'steel'], water: ['fire', 'ground', 'rock'], electric: ['water', 'flying'], grass: ['water', 'ground', 'rock'], ice: ['grass', 'ground', 'flying', 'dragon'], fighting: ['normal', 'ice', 'rock', 'dark', 'steel'], poison: ['grass', 'fairy'], ground: ['fire', 'electric', 'poison', 'rock', 'steel'], flying: ['grass', 'fighting', 'bug'], psychic: ['fighting', 'poison'], bug: ['grass', 'psychic', 'dark'], rock: ['fire', 'ice', 'flying', 'bug'], ghost: ['psychic', 'ghost'], dragon: ['dragon'], dark: ['psychic', 'ghost'], steel: ['ice', 'rock', 'fairy'], fairy: ['fighting', 'dragon', 'dark']
};
const RESISTS = {
  normal: ['rock', 'steel'], fire: ['fire', 'water', 'rock', 'dragon'], water: ['water', 'grass', 'dragon'], electric: ['electric', 'grass', 'dragon'], grass: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'], ice: ['fire', 'water', 'ice', 'steel'], fighting: ['poison', 'flying', 'psychic', 'bug', 'fairy'], poison: ['poison', 'ground', 'rock', 'ghost'], ground: ['grass', 'bug'], flying: ['electric', 'rock', 'steel'], psychic: ['psychic', 'steel'], bug: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'], rock: ['fighting', 'ground', 'steel'], ghost: ['dark'], dragon: ['steel'], dark: ['fighting', 'dark', 'fairy'], steel: ['fire', 'water', 'electric', 'steel'], fairy: ['fire', 'poison', 'steel']
};
const IMMUNE = { normal: ['ghost'], electric: ['ground'], fighting: ['ghost'], poison: ['steel'], ground: ['flying'], psychic: ['dark'], ghost: ['normal'], dragon: ['fairy'] };
function typeFactor(attacker, defender) {
  const attackTypes = Array.isArray(attacker) ? attacker : attacker?.types || TYPES[attacker?.name || attacker] || ['normal'];
  const defendTypes = Array.isArray(defender) ? defender : defender?.types || TYPES[defender?.name || defender] || ['normal'];
  const attack = String(attackTypes[0] || 'normal').toLowerCase().trim();
  return defendTypes.reduce((factor, type) => {
    const t = String(type || '').toLowerCase().trim();
    return factor * (IMMUNE[attack]?.includes(t) ? 0 : EFFECTIVE[attack]?.includes(t) ? 2 : RESISTS[attack]?.includes(t) ? 0.5 : 1);
  }, 1);
}
const LEGENDARIES = new Set([
  'Arceus', 'Mewtwo', 'Rayquaza', 'Zacian', 'Kyogre', 'Groudon', 'Dialga', 'Palkia',
  'Giratina', 'Eternatus', 'Mew', 'Lugia', 'Ho-Oh', 'Xerneas', 'Yveltal', 'Necrozma',
  'Ultra Necrozma', 'Koraidon', 'Miraidon', 'Calyrex', 'Zamazenta', 'Reshiram', 'Zekrom',
  'Kyurem', 'Solgaleo', 'Lunala', 'Deoxys', 'Darkrai', 'Genesect', 'Marshadow', 'Zeraora'
]);

const PSEUDO_LEGENDS = new Set([
  'Dragonite', 'Tyranitar', 'Salamence', 'Metagross', 'Garchomp', 'Hydreigon',
  'Goodra', 'Kommo-o', 'Dragapult', 'Baxcalibur', 'Volcarona', 'Kingambit', 'Iron Valiant', 'Roaring Moon'
]);

const TANKS = new Set([
  'Snorlax', 'Blastoise', 'Steelix', 'Golem', 'Garganacl', 'Cloyster', 'Umbreon',
  'Slowbro', 'Slowking', 'Toxapex', 'Ferrothorn', 'Dondozo', 'Hippowdon', 'Bastiodon',
  'Aggron', 'Milotic', 'Vaporeon', 'Blissey', 'Chansey', 'Togekiss'
]);

const SWEEPERS = new Set([
  'Alakazam', 'Gengar', 'Weavile', 'Jolteon', 'Greninja', 'Cinderace', 'Talonflame',
  'Starmie', 'Aerodactyl', 'Ninjask', 'Lucario', 'Scyther', 'Scizor'
]);

function stats(mon) {
  const level = Math.min(100, Math.max(1, mon?.level || 1));
  const name = mon?.name || '';

  let hpMul = 1.0, atkMul = 1.0, defMul = 1.0, spdMul = 1.0;

  if (LEGENDARIES.has(name)) {
    hpMul *= 1.4; atkMul *= 1.4; defMul *= 1.4; spdMul *= 1.35;
  } else if (PSEUDO_LEGENDS.has(name)) {
    hpMul *= 1.2; atkMul *= 1.2; defMul *= 1.2; spdMul *= 1.15;
  } else if (TANKS.has(name)) {
    hpMul *= 1.45; defMul *= 1.4; atkMul *= 0.9; spdMul *= 0.8;
  } else if (SWEEPERS.has(name)) {
    atkMul *= 1.25; spdMul *= 1.3; hpMul *= 0.85; defMul *= 0.85;
  }

  const baseHp = Math.round((120 + level * 8) * hpMul);
  const attack = Math.round((25 + level * 3.2) * atkMul);
  const defense = Math.round((20 + level * 2.6) * defMul);
  const speed = Math.round((15 + level * 2.2) * spdMul);

  return { hp: baseHp, maxHp: baseHp, attack, defense, speed, shiny: Boolean(mon?.shiny) };
}

function autoBattle(teamA, teamB) {
  const log = [];
  const ac = (teamA || []).map(mon => {
    const s = stats(mon);
    const hp = typeof mon.currentHp === 'number' ? Math.max(0, Math.min(mon.currentHp, s.hp)) : s.hp;
    return { ...mon, hp, maxHp: s.hp };
  });
  const bc = (teamB || []).map(mon => {
    const s = stats(mon);
    const hp = typeof mon.currentHp === 'number' ? Math.max(0, Math.min(mon.currentHp, s.hp)) : s.hp;
    return { ...mon, hp, maxHp: s.hp };
  });

  let a = ac.findIndex(m => m.hp > 0);
  let b = bc.findIndex(m => m.hp > 0);
  if (a < 0) a = ac.length;
  if (b < 0) b = bc.length;

  while (a < ac.length && b < bc.length && log.length < 300) {
    const x = ac[a], y = bc[b];
    const first = stats(x).speed >= stats(y).speed ? [x, y] : [y, x];
    for (const actor of first) {
      const target = actor === x ? y : x;
      if (actor.hp <= 0 || target.hp <= 0) continue;
      const factor = typeFactor(actor, target);
      if (factor === 0) {
        log.push(`${actor.name} attacks ${target.name} — it had no effect! (0 damage)`);
        continue;
      }
      const isShiny = Boolean(actor.shiny);
      const critChance = isShiny ? 0.22 : 0.10;
      const isCrit = Math.random() < critChance;
      const critMul = isCrit ? 1.5 : 1.0;
      const roll = 0.85 + Math.random() * 0.15;
      const raw = Math.max(5, Math.round(((stats(actor).attack * 1.4 - stats(target).defense * 0.45) * factor * critMul * roll)));
      target.hp = Math.max(0, target.hp - raw);
      let desc = `${actor.name} hits ${target.name} for ${raw}`;
      if (isCrit) desc += isShiny ? ' — ✨ SHINY CRITICAL HIT!' : ' — CRITICAL HIT!';
      if (factor > 1) desc += ' — super effective!';
      else if (factor < 1) desc += ' — resisted';
      log.push(desc);
      if (target.hp <= 0) {
        log.push(`💥 ${target.name} fainted!`);
        if (target === x) {
          a++;
          while (a < ac.length && ac[a].hp <= 0) a++;
        } else {
          b++;
          while (b < bc.length && bc[b].hp <= 0) b++;
        }
        break;
      }
    }
  }

  const winner = a >= ac.length ? 'B' : 'A';
  const remainingA = ac.slice(a).map(m => ({ ...m, currentHp: Math.max(0, m.hp) }));
  const remainingB = bc.slice(b).map(m => ({ ...m, currentHp: Math.max(0, m.hp) }));
  const allA = ac.map(m => ({ ...m, currentHp: Math.max(0, m.hp) }));
  const allB = bc.map(m => ({ ...m, currentHp: Math.max(0, m.hp) }));
  return { winner, log, remainingA, remainingB, allA, allB };
}

const PRACTICE_TIERS = {
  veteran: {
    id: 'veteran',
    name: 'Veteran',
    level: 70,
    team: [
      { name: 'Arcanine', types: ['fire'], level: 70 },
      { name: 'Alakazam', types: ['psychic'], level: 70 },
      { name: 'Machamp', types: ['fighting'], level: 70 },
      { name: 'Gyarados', types: ['water', 'flying'], level: 70 },
      { name: 'Gengar', types: ['ghost', 'poison'], level: 70 },
      { name: 'Snorlax', types: ['normal'], level: 70 }
    ]
  },
  elite_four: {
    id: 'elite_four',
    name: 'Elite Four',
    level: 80,
    team: [
      { name: 'Dragonite', types: ['dragon', 'flying'], level: 80 },
      { name: 'Lucario', types: ['fighting', 'steel'], level: 80 },
      { name: 'Tyranitar', types: ['rock', 'dark'], level: 80 },
      { name: 'Salamence', types: ['dragon', 'flying'], level: 80 },
      { name: 'Metagross', types: ['steel', 'psychic'], level: 80 },
      { name: 'Garchomp', types: ['dragon', 'ground'], level: 80 }
    ]
  },
  champion: {
    id: 'champion',
    name: 'Champion',
    level: 90,
    team: [
      { name: 'Spiritomb', types: ['ghost', 'dark'], level: 90 },
      { name: 'Milotic', types: ['water'], level: 90 },
      { name: 'Togekiss', types: ['fairy', 'flying'], level: 90 },
      { name: 'Charizard', types: ['fire', 'flying'], level: 90 },
      { name: 'Pikachu', types: ['electric'], level: 90 },
      { name: 'Garchomp', types: ['dragon', 'ground'], level: 90 }
    ]
  },
  master_rank: {
    id: 'master_rank',
    name: 'Master Rank',
    level: 100,
    team: [
      { name: 'Dragapult', types: ['dragon', 'ghost'], level: 100 },
      { name: 'Kingambit', types: ['dark', 'steel'], level: 100 },
      { name: 'Volcarona', types: ['bug', 'fire'], level: 100 },
      { name: 'Iron Valiant', types: ['fairy', 'fighting'], level: 100 },
      { name: 'Baxcalibur', types: ['dragon', 'ice'], level: 100 },
      { name: 'Urshifu', types: ['fighting', 'dark'], level: 100 }
    ]
  },
  mythic_trial: {
    id: 'mythic_trial',
    name: 'Mythic Trial',
    level: 100,
    team: [
      { name: 'Mewtwo', types: ['psychic'], level: 100 },
      { name: 'Rayquaza', types: ['dragon', 'flying'], level: 100 },
      { name: 'Kyogre', types: ['water'], level: 100 },
      { name: 'Groudon', types: ['ground'], level: 100 },
      { name: 'Dialga', types: ['steel', 'dragon'], level: 100 },
      { name: 'Palkia', types: ['water', 'dragon'], level: 100 }
    ]
  },
  arceus_gauntlet: {
    id: 'arceus_gauntlet',
    name: 'Arceus Gauntlet',
    level: 100,
    team: [
      { name: 'Arceus', types: ['normal'], level: 100 },
      { name: 'Giratina', types: ['ghost', 'dragon'], level: 100 },
      { name: 'Ultra Necrozma', types: ['psychic', 'dragon'], level: 100 },
      { name: 'Zacian', types: ['fairy', 'steel'], level: 100 },
      { name: 'Eternatus', types: ['poison', 'dragon'], level: 100 },
      { name: 'Mew', types: ['psychic'], level: 100 }
    ]
  }
};

const TOWER_BOSS_ROSTER = {
  5: {
    trainerName: 'Gym Leader Brock',
    title: 'Rock-Solid Wall',
    milestoneReward: 'Baby Egg',
    milestoneRewardKey: 'baby',
    team: [
      { name: 'Geodude', types: ['rock', 'ground'], level: 60, rarity: 'Common' },
      { name: 'Onix', types: ['rock', 'ground'], level: 62, rarity: 'Uncommon' },
      { name: 'Golem', types: ['rock', 'ground'], level: 65, rarity: 'Rare' },
      { name: 'Steelix', types: ['steel', 'ground'], level: 68, rarity: 'Epic' }
    ]
  },
  10: {
    trainerName: 'Gym Leader Misty',
    title: 'Tomboyish Mermaid',
    milestoneReward: 'Starter Egg',
    milestoneRewardKey: 'starter',
    team: [
      { name: 'Starmie', types: ['water', 'psychic'], level: 74, rarity: 'Rare' },
      { name: 'Vaporeon', types: ['water'], level: 75, rarity: 'Rare' },
      { name: 'Blastoise', types: ['water'], level: 76, rarity: 'Epic' },
      { name: 'Gyarados', types: ['water', 'flying'], level: 78, rarity: 'Epic' }
    ]
  },
  15: {
    trainerName: 'Team Rocket Boss Giovanni',
    title: 'Earthbound Mastermind',
    milestoneReward: 'Fossil Egg',
    milestoneRewardKey: 'fossil',
    team: [
      { name: 'Dugtrio', types: ['ground'], level: 80, rarity: 'Uncommon' },
      { name: 'Nidoking', types: ['poison', 'ground'], level: 82, rarity: 'Rare' },
      { name: 'Rhyperior', types: ['ground', 'rock'], level: 84, rarity: 'Epic' },
      { name: 'Tyranitar', types: ['rock', 'dark'], level: 85, rarity: 'Epic' },
      { name: 'Garchomp', types: ['dragon', 'ground'], level: 86, rarity: 'Epic' }
    ]
  },
  20: {
    trainerName: 'Dragon Master Lance',
    title: 'Indigo Champion',
    milestoneReward: 'Powerhouse Egg',
    milestoneRewardKey: 'powerhouse',
    team: [
      { name: 'Aerodactyl', types: ['rock', 'flying'], level: 88, rarity: 'Rare' },
      { name: 'Gyarados', types: ['water', 'flying'], level: 89, rarity: 'Epic' },
      { name: 'Charizard', types: ['fire', 'flying'], level: 90, rarity: 'Epic' },
      { name: 'Salamence', types: ['dragon', 'flying'], level: 91, rarity: 'Epic' },
      { name: 'Dragonite', types: ['dragon', 'flying'], level: 92, rarity: 'Legendary' }
    ]
  },
  25: {
    trainerName: 'Champion Cynthia',
    title: 'Sinnoh Mythic Sovereign',
    milestoneReward: 'Powerhouse Egg',
    milestoneRewardKey: 'powerhouse',
    team: [
      { name: 'Spiritomb', types: ['ghost', 'dark'], level: 94, rarity: 'Rare' },
      { name: 'Milotic', types: ['water'], level: 95, rarity: 'Epic' },
      { name: 'Togekiss', types: ['fairy', 'flying'], level: 95, rarity: 'Epic' },
      { name: 'Lucario', types: ['fighting', 'steel'], level: 96, rarity: 'Epic' },
      { name: 'Garchomp', types: ['dragon', 'ground'], level: 98, rarity: 'Legendary' }
    ]
  },
  30: {
    trainerName: 'Living Legend Red',
    title: 'Mount Silver Champion',
    milestoneReward: 'Ultra / Paradox Egg',
    milestoneRewardKey: 'paradox',
    team: [
      { name: 'Pikachu', types: ['electric'], level: 100, rarity: 'Epic', shiny: true },
      { name: 'Venusaur', types: ['grass', 'poison'], level: 100, rarity: 'Epic' },
      { name: 'Blastoise', types: ['water'], level: 100, rarity: 'Epic' },
      { name: 'Charizard', types: ['fire', 'flying'], level: 100, rarity: 'Legendary' },
      { name: 'Snorlax', types: ['normal'], level: 100, rarity: 'Legendary' },
      { name: 'Mewtwo', types: ['psychic'], level: 100, rarity: 'Legendary' }
    ]
  },
  50: {
    trainerName: 'True Creator Arceus & Divine Court',
    title: 'Universal Origin',
    milestoneReward: 'Mythical Egg',
    milestoneRewardKey: 'mythical',
    team: [
      { name: 'Arceus', types: ['normal'], level: 100, rarity: 'Legendary', shiny: true },
      { name: 'Dialga', types: ['steel', 'dragon'], level: 100, rarity: 'Legendary' },
      { name: 'Palkia', types: ['water', 'dragon'], level: 100, rarity: 'Legendary' },
      { name: 'Giratina', types: ['ghost', 'dragon'], level: 100, rarity: 'Legendary' },
      { name: 'Rayquaza', types: ['dragon', 'flying'], level: 100, rarity: 'Legendary' },
      { name: 'Ultra Necrozma', types: ['psychic', 'dragon'], level: 100, rarity: 'Legendary' }
    ]
  }
};

const COMMON_POOL = [
  { name: 'Pidgeot', types: ['normal', 'flying'] },
  { name: 'Raichu', types: ['electric'] },
  { name: 'Arcanine', types: ['fire'] },
  { name: 'Alakazam', types: ['psychic'] },
  { name: 'Machamp', types: ['fighting'] },
  { name: 'Gengar', types: ['ghost', 'poison'] },
  { name: 'Scyther', types: ['bug', 'flying'] },
  { name: 'Scizor', types: ['bug', 'steel'] },
  { name: 'Gyarados', types: ['water', 'flying'] },
  { name: 'Lapras', types: ['water', 'ice'] },
  { name: 'Jolteon', types: ['electric'] },
  { name: 'Vaporeon', types: ['water'] },
  { name: 'Flareon', types: ['fire'] },
  { name: 'Snorlax', types: ['normal'] },
  { name: 'Dragonite', types: ['dragon', 'flying'] },
  { name: 'Tyranitar', types: ['rock', 'dark'] },
  { name: 'Salamence', types: ['dragon', 'flying'] },
  { name: 'Metagross', types: ['steel', 'psychic'] },
  { name: 'Garchomp', types: ['dragon', 'ground'] },
  { name: 'Lucario', types: ['fighting', 'steel'] },
  { name: 'Volcarona', types: ['bug', 'fire'] },
  { name: 'Dragapult', types: ['dragon', 'ghost'] },
  { name: 'Kingambit', types: ['dark', 'steel'] },
  { name: 'Baxcalibur', types: ['dragon', 'ice'] }
];

function generateTowerFloor(floorNumber) {
  const floor = Math.max(1, Math.floor(floorNumber || 1));
  const isBossFloor = (floor % 5 === 0);

  let milestoneReward = null;
  let milestoneRewardKey = null;
  if (floor === 5) { milestoneReward = 'Baby Egg'; milestoneRewardKey = 'baby'; }
  else if (floor === 10) { milestoneReward = 'Starter Egg'; milestoneRewardKey = 'starter'; }
  else if (floor === 15) { milestoneReward = 'Fossil Egg'; milestoneRewardKey = 'fossil'; }
  else if (floor === 20) { milestoneReward = 'Powerhouse Egg'; milestoneRewardKey = 'powerhouse'; }
  else if (floor === 25) { milestoneReward = 'Powerhouse Egg'; milestoneRewardKey = 'powerhouse'; }
  else if (floor === 30) { milestoneReward = 'Ultra / Paradox Egg'; milestoneRewardKey = 'paradox'; }
  else if (floor === 40) { milestoneReward = 'Legendary Egg'; milestoneRewardKey = 'legendary'; }
  else if (floor === 50) { milestoneReward = 'Mythical Egg'; milestoneRewardKey = 'mythical'; }
  else if (floor % 10 === 0) {
    milestoneReward = floor >= 30 ? 'Legendary Egg' : 'Powerhouse Egg';
    milestoneRewardKey = floor >= 30 ? 'legendary' : 'powerhouse';
  } else if (floor % 5 === 0) {
    milestoneReward = 'Standard Egg';
    milestoneRewardKey = 'standard';
  }

  if (TOWER_BOSS_ROSTER[floor]) {
    const b = TOWER_BOSS_ROSTER[floor];
    return {
      floor,
      isBossFloor: true,
      trainerName: b.trainerName,
      title: b.title,
      milestoneReward: b.milestoneReward || milestoneReward,
      milestoneRewardKey: b.milestoneRewardKey || milestoneRewardKey,
      team: b.team.map(m => ({ ...m }))
    };
  }

  const level = Math.min(100, Math.round(45 + (floor - 1) * 1.1));
  const teamSize = floor <= 3 ? 3 : floor <= 7 ? 4 : floor <= 12 ? 5 : 6;
  const pool = [...COMMON_POOL].sort(() => 0.5 - Math.random());
  const selected = pool.slice(0, teamSize).map(mon => ({
    ...mon,
    level,
    shiny: Math.random() < 0.05
  }));

  const trainerTitles = ['Ace Trainer', 'Battle Girl', 'Veteran', 'Cooltrainer', 'Black Belt', 'Psychic', 'Dragon Tamer'];
  const trainerName = `${trainerTitles[floor % trainerTitles.length]} Floor ${floor}`;

  return {
    floor,
    isBossFloor,
    trainerName,
    title: `Floor ${floor} Challenge`,
    milestoneReward,
    milestoneRewardKey,
    team: selected
  };
}

function runTowerFloorBattle(playerTeam, floorNumber) {
  const floorData = generateTowerFloor(floorNumber);
  const battleResult = autoBattle(playerTeam, floorData.team);
  const victory = battleResult.winner === 'A';
  return {
    victory,
    winner: battleResult.winner,
    remainingA: battleResult.remainingA,
    remainingB: battleResult.remainingB,
    floor: floorData.floor,
    log: battleResult.log,
    opponent: floorData,
    playerTeamAfter: battleResult.allA,
    opponentTeamAfter: battleResult.allB,
    milestoneReward: victory ? floorData.milestoneReward : null,
    milestoneRewardKey: victory ? floorData.milestoneRewardKey : null,
    isBossFloor: floorData.isBossFloor
  };
}

module.exports = { autoBattle, TYPES, typeFactor, PRACTICE_TIERS, stats, generateTowerFloor, runTowerFloorBattle };

