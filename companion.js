const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
let app;
try { ({ app } = require('electron')); } catch {}
const { getRandomLine, getCatalogSync } = require('./catalog');
const remote = require('./trade-client');

const GROUP_LINES = {
  starter: [
    { name: 'Bulbasaur', ids: [1, 2, 3], labels: ['Bulbasaur', 'Ivysaur', 'Venusaur'], types: [['grass', 'poison'], ['grass', 'poison'], ['grass', 'poison']], finalStage: 2, group: 'starter' },
    { name: 'Charmander', ids: [4, 5, 6], labels: ['Charmander', 'Charmeleon', 'Charizard'], types: [['fire'], ['fire'], ['fire', 'flying']], finalStage: 2, group: 'starter' },
    { name: 'Squirtle', ids: [7, 8, 9], labels: ['Squirtle', 'Wartortle', 'Blastoise'], types: [['water'], ['water'], ['water']], finalStage: 2, group: 'starter' },
    { name: 'Chikorita', ids: [152, 153, 154], labels: ['Chikorita', 'Bayleef', 'Meganium'], types: [['grass'], ['grass'], ['grass']], finalStage: 2, group: 'starter' },
    { name: 'Cyndaquil', ids: [155, 156, 157], labels: ['Cyndaquil', 'Quilava', 'Typhlosion'], types: [['fire'], ['fire'], ['fire']], finalStage: 2, group: 'starter' },
    { name: 'Totodile', ids: [158, 159, 160], labels: ['Totodile', 'Croconaw', 'Feraligatr'], types: [['water'], ['water'], ['water']], finalStage: 2, group: 'starter' },
    { name: 'Treecko', ids: [252, 253, 254], labels: ['Treecko', 'Grovyle', 'Sceptile'], types: [['grass'], ['grass'], ['grass']], finalStage: 2, group: 'starter' },
    { name: 'Torchic', ids: [255, 256, 257], labels: ['Torchic', 'Combusken', 'Blaziken'], types: [['fire'], ['fire', 'fighting'], ['fire', 'fighting']], finalStage: 2, group: 'starter' },
    { name: 'Mudkip', ids: [258, 259, 260], labels: ['Mudkip', 'Marshtomp', 'Swampert'], types: [['water'], ['water', 'ground'], ['water', 'ground']], finalStage: 2, group: 'starter' },
    { name: 'Piplup', ids: [393, 394, 395], labels: ['Piplup', 'Prinplup', 'Empoleon'], types: [['water'], ['water'], ['water', 'steel']], finalStage: 2, group: 'starter' },
    { name: 'Froakie', ids: [656, 657, 658], labels: ['Froakie', 'Frogadier', 'Greninja'], types: [['water'], ['water'], ['water', 'dark']], finalStage: 2, group: 'starter' },
    { name: 'Rowlet', ids: [722, 723, 724], labels: ['Rowlet', 'Dartrix', 'Decidueye'], types: [['grass', 'flying'], ['grass', 'flying'], ['grass', 'ghost']], finalStage: 2, group: 'starter' },
    { name: 'Fuecoco', ids: [909, 910, 911], labels: ['Fuecoco', 'Crocalor', 'Skeledirge'], types: [['fire'], ['fire'], ['fire', 'ghost']], finalStage: 2, group: 'starter' }
  ],
  baby: [
    { name: 'Pichu', ids: [172, 25, 26], labels: ['Pichu', 'Pikachu', 'Raichu'], types: [['electric'], ['electric'], ['electric']], finalStage: 2, group: 'baby' },
    { name: 'Togepi', ids: [175, 176, 468], labels: ['Togepi', 'Togetic', 'Togekiss'], types: [['fairy'], ['fairy', 'flying'], ['fairy', 'flying']], finalStage: 2, group: 'baby' },
    { name: 'Riolu', ids: [447, 448], labels: ['Riolu', 'Lucario'], types: [['fighting'], ['fighting', 'steel']], finalStage: 1, group: 'baby' },
    { name: 'Elekid', ids: [239, 125, 466], labels: ['Elekid', 'Electabuzz', 'Electivire'], types: [['electric'], ['electric'], ['electric']], finalStage: 2, group: 'baby' },
    { name: 'Magby', ids: [240, 126, 467], labels: ['Magby', 'Magmar', 'Magmortar'], types: [['fire'], ['fire'], ['fire']], finalStage: 2, group: 'baby' },
    { name: 'Cleffa', ids: [173, 35, 36], labels: ['Cleffa', 'Clefairy', 'Clefable'], types: [['fairy'], ['fairy'], ['fairy']], finalStage: 2, group: 'baby' },
    { name: 'Munchlax', ids: [446, 143], labels: ['Munchlax', 'Snorlax'], types: [['normal'], ['normal']], finalStage: 1, group: 'baby' },
    { name: 'Happiny', ids: [440, 113, 242], labels: ['Happiny', 'Chansey', 'Blissey'], types: [['normal'], ['normal'], ['normal']], finalStage: 2, group: 'baby' }
  ],
  fossil: [
    { name: 'Omanyte', ids: [138, 139], labels: ['Omanyte', 'Omastar'], types: [['rock', 'water'], ['rock', 'water']], finalStage: 1, group: 'fossil' },
    { name: 'Kabuto', ids: [140, 141], labels: ['Kabuto', 'Kabutops'], types: [['rock', 'water'], ['rock', 'water']], finalStage: 1, group: 'fossil' },
    { name: 'Aerodactyl', ids: [142], labels: ['Aerodactyl'], types: [['rock', 'flying']], finalStage: 0, group: 'fossil' },
    { name: 'Lileep', ids: [345, 346], labels: ['Lileep', 'Cradily'], types: [['rock', 'grass'], ['rock', 'grass']], finalStage: 1, group: 'fossil' },
    { name: 'Anorith', ids: [347, 348], labels: ['Anorith', 'Armaldo'], types: [['rock', 'bug'], ['rock', 'bug']], finalStage: 1, group: 'fossil' },
    { name: 'Cranidos', ids: [408, 409], labels: ['Cranidos', 'Rampardos'], types: [['rock'], ['rock']], finalStage: 1, group: 'fossil' },
    { name: 'Shieldon', ids: [410, 411], labels: ['Shieldon', 'Bastiodon'], types: [['rock', 'steel'], ['rock', 'steel']], finalStage: 1, group: 'fossil' },
    { name: 'Tyrunt', ids: [696, 697], labels: ['Tyrunt', 'Tyrantrum'], types: [['rock', 'dragon'], ['rock', 'dragon']], finalStage: 1, group: 'fossil' },
    { name: 'Dracovish', ids: [882], labels: ['Dracovish'], types: [['water', 'dragon']], finalStage: 0, group: 'fossil' }
  ],
  powerhouse: [
    { name: 'Dratini', ids: [147, 148, 149], labels: ['Dratini', 'Dragonair', 'Dragonite'], types: [['dragon'], ['dragon'], ['dragon', 'flying']], finalStage: 2, group: 'powerhouse' },
    { name: 'Larvitar', ids: [246, 247, 248], labels: ['Larvitar', 'Pupitar', 'Tyranitar'], types: [['rock', 'ground'], ['rock', 'ground'], ['rock', 'dark']], finalStage: 2, group: 'powerhouse' },
    { name: 'Bagon', ids: [371, 372, 373], labels: ['Bagon', 'Shelgon', 'Salamence'], types: [['dragon'], ['dragon'], ['dragon', 'flying']], finalStage: 2, group: 'powerhouse' },
    { name: 'Beldum', ids: [374, 375, 376], labels: ['Beldum', 'Metang', 'Metagross'], types: [['steel', 'psychic'], ['steel', 'psychic'], ['steel', 'psychic']], finalStage: 2, group: 'powerhouse' },
    { name: 'Gible', ids: [443, 444, 445], labels: ['Gible', 'Gabite', 'Garchomp'], types: [['dragon', 'ground'], ['dragon', 'ground'], ['dragon', 'ground']], finalStage: 2, group: 'powerhouse' },
    { name: 'Deino', ids: [633, 634, 635], labels: ['Deino', 'Zweilous', 'Hydreigon'], types: [['dark', 'dragon'], ['dark', 'dragon'], ['dark', 'dragon']], finalStage: 2, group: 'powerhouse' },
    { name: 'Dreepy', ids: [885, 886, 887], labels: ['Dreepy', 'Drakloak', 'Dragapult'], types: [['dragon', 'ghost'], ['dragon', 'ghost'], ['dragon', 'ghost']], finalStage: 2, group: 'powerhouse' },
    { name: 'Frigibax', ids: [996, 997, 998], labels: ['Frigibax', 'Arctibax', 'Baxcalibur'], types: [['dragon', 'ice'], ['dragon', 'ice'], ['dragon', 'ice']], finalStage: 2, group: 'powerhouse' }
  ],
  paradox: [
    { name: 'Roaring Moon', ids: [1005], labels: ['Roaring Moon'], types: [['dragon', 'dark']], finalStage: 0, group: 'paradox' },
    { name: 'Iron Valiant', ids: [1006], labels: ['Iron Valiant'], types: [['fairy', 'fighting']], finalStage: 0, group: 'paradox' },
    { name: 'Flutter Mane', ids: [987], labels: ['Flutter Mane'], types: [['ghost', 'fairy']], finalStage: 0, group: 'paradox' },
    { name: 'Iron Bundle', ids: [991], labels: ['Iron Bundle'], types: [['ice', 'water']], finalStage: 0, group: 'paradox' },
    { name: 'Nihilego', ids: [793], labels: ['Nihilego'], types: [['rock', 'poison']], finalStage: 0, group: 'paradox' },
    { name: 'Buzzwole', ids: [794], labels: ['Buzzwole'], types: [['bug', 'fighting']], finalStage: 0, group: 'paradox' },
    { name: 'Kartana', ids: [798], labels: ['Kartana'], types: [['grass', 'steel']], finalStage: 0, group: 'paradox' },
    { name: 'Poipole', ids: [803, 804], labels: ['Poipole', 'Naganadel'], types: [['poison'], ['poison', 'dragon']], finalStage: 1, group: 'paradox' }
  ],
  legendary: [
    { name: 'Mewtwo', ids: [150], labels: ['Mewtwo'], types: [['psychic']], finalStage: 0, group: 'legendary' },
    { name: 'Lugia', ids: [249], labels: ['Lugia'], types: [['psychic', 'flying']], finalStage: 0, group: 'legendary' },
    { name: 'Ho-Oh', ids: [250], labels: ['Ho-Oh'], types: [['fire', 'flying']], finalStage: 0, group: 'legendary' },
    { name: 'Rayquaza', ids: [384], labels: ['Rayquaza'], types: [['dragon', 'flying']], finalStage: 0, group: 'legendary' },
    { name: 'Dialga', ids: [483], labels: ['Dialga'], types: [['steel', 'dragon']], finalStage: 0, group: 'legendary' },
    { name: 'Palkia', ids: [484], labels: ['Palkia'], types: [['water', 'dragon']], finalStage: 0, group: 'legendary' },
    { name: 'Giratina', ids: [487], labels: ['Giratina'], types: [['ghost', 'dragon']], finalStage: 0, group: 'legendary' },
    { name: 'Reshiram', ids: [643], labels: ['Reshiram'], types: [['dragon', 'fire']], finalStage: 0, group: 'legendary' },
    { name: 'Zekrom', ids: [644], labels: ['Zekrom'], types: [['dragon', 'electric']], finalStage: 0, group: 'legendary' },
    { name: 'Zacian', ids: [888], labels: ['Zacian'], types: [['fairy', 'steel']], finalStage: 0, group: 'legendary' },
    { name: 'Koraidon', ids: [1007], labels: ['Koraidon'], types: [['fighting', 'dragon']], finalStage: 0, group: 'legendary' },
    { name: 'Miraidon', ids: [1008], labels: ['Miraidon'], types: [['electric', 'dragon']], finalStage: 0, group: 'legendary' }
  ],
  mythical: [
    { name: 'Mew', ids: [151], labels: ['Mew'], types: [['psychic']], finalStage: 0, group: 'mythical' },
    { name: 'Celebi', ids: [251], labels: ['Celebi'], types: [['psychic', 'grass']], finalStage: 0, group: 'mythical' },
    { name: 'Jirachi', ids: [385], labels: ['Jirachi'], types: [['steel', 'psychic']], finalStage: 0, group: 'mythical' },
    { name: 'Deoxys', ids: [386], labels: ['Deoxys'], types: [['psychic']], finalStage: 0, group: 'mythical' },
    { name: 'Darkrai', ids: [491], labels: ['Darkrai'], types: [['dark']], finalStage: 0, group: 'mythical' },
    { name: 'Shaymin', ids: [492], labels: ['Shaymin'], types: [['grass']], finalStage: 0, group: 'mythical' },
    { name: 'Arceus', ids: [493], labels: ['Arceus'], types: [['normal']], finalStage: 0, group: 'mythical' },
    { name: 'Victini', ids: [494], labels: ['Victini'], types: [['psychic', 'fire']], finalStage: 0, group: 'mythical' },
    { name: 'Marshadow', ids: [802], labels: ['Marshadow'], types: [['fighting', 'ghost']], finalStage: 0, group: 'mythical' }
  ],
  standard: [
    { name: 'Eevee (Vaporeon)', ids: [133, 134], labels: ['Eevee', 'Vaporeon'], types: [['normal'], ['water']], finalStage: 1, group: 'standard' },
    { name: 'Eevee (Jolteon)', ids: [133, 135], labels: ['Eevee', 'Jolteon'], types: [['normal'], ['electric']], finalStage: 1, group: 'standard' },
    { name: 'Eevee (Flareon)', ids: [133, 136], labels: ['Eevee', 'Flareon'], types: [['normal'], ['fire']], finalStage: 1, group: 'standard' },
    { name: 'Eevee (Espeon)', ids: [133, 196], labels: ['Eevee', 'Espeon'], types: [['normal'], ['psychic']], finalStage: 1, group: 'standard' },
    { name: 'Eevee (Umbreon)', ids: [133, 197], labels: ['Eevee', 'Umbreon'], types: [['normal'], ['dark']], finalStage: 1, group: 'standard' },
    { name: 'Eevee (Leafeon)', ids: [133, 470], labels: ['Eevee', 'Leafeon'], types: [['normal'], ['grass']], finalStage: 1, group: 'standard' },
    { name: 'Eevee (Glaceon)', ids: [133, 471], labels: ['Eevee', 'Glaceon'], types: [['normal'], ['ice']], finalStage: 1, group: 'standard' },
    { name: 'Eevee (Sylveon)', ids: [133, 700], labels: ['Eevee', 'Sylveon'], types: [['normal'], ['fairy']], finalStage: 1, group: 'standard' },
    { name: 'Pidgey', ids: [16, 17, 18], labels: ['Pidgey', 'Pidgeotto', 'Pidgeot'], types: [['normal', 'flying'], ['normal', 'flying'], ['normal', 'flying']], finalStage: 2, group: 'standard' },
    { name: 'Mareep', ids: [179, 180, 181], labels: ['Mareep', 'Flaaffy', 'Ampharos'], types: [['electric'], ['electric'], ['electric']], finalStage: 2, group: 'standard' },
    { name: 'Ralts', ids: [280, 281, 282], labels: ['Ralts', 'Kirlia', 'Gardevoir'], types: [['psychic', 'fairy'], ['psychic', 'fairy'], ['psychic', 'fairy']], finalStage: 2, group: 'standard' },
    { name: 'Gastly', ids: [92, 93, 94], labels: ['Gastly', 'Haunter', 'Gengar'], types: [['ghost', 'poison'], ['ghost', 'poison'], ['ghost', 'poison']], finalStage: 2, group: 'standard' },
    { name: 'Abra', ids: [63, 64, 65], labels: ['Abra', 'Kadabra', 'Alakazam'], types: [['psychic'], ['psychic'], ['psychic']], finalStage: 2, group: 'standard' },
    { name: 'Geodude', ids: [74, 75, 76], labels: ['Geodude', 'Graveler', 'Golem'], types: [['rock', 'ground'], ['rock', 'ground'], ['rock', 'ground']], finalStage: 2, group: 'standard' },
    { name: 'Scyther', ids: [123, 212], labels: ['Scyther', 'Scizor'], types: [['bug', 'flying'], ['bug', 'steel']], finalStage: 1, group: 'standard' }
  ]
};

const LINES = [
  ...GROUP_LINES.starter,
  ...GROUP_LINES.baby,
  ...GROUP_LINES.standard
];

const ALL_FAMILY_LINES = [
  ...GROUP_LINES.starter,
  ...GROUP_LINES.baby,
  ...GROUP_LINES.fossil,
  ...GROUP_LINES.powerhouse,
  ...GROUP_LINES.paradox,
  ...GROUP_LINES.legendary,
  ...GROUP_LINES.mythical,
  ...GROUP_LINES.standard
];

function registerPokedex(state, monOrLine, stage = 0) {
  if (!state) return;
  state.pokedex = Array.isArray(state.pokedex) ? state.pokedex : [];
  if (monOrLine === null || monOrLine === undefined) return;
  const lineVal = (typeof monOrLine === 'object' && monOrLine !== null && monOrLine.line !== undefined) ? monOrLine.line : monOrLine;
  const l = lineFor(lineVal);
  if (!l) return;
  const st = (typeof monOrLine === 'object' && monOrLine !== null && typeof monOrLine.stage === 'number') ? monOrLine.stage : stage;
  for (let i = 0; i <= st; i++) {
    const id = l.ids?.[i];
    const name = l.labels?.[i];
    if (id && !state.pokedex.includes(id)) {
      state.pokedex.push(id);
    }
    if (name && !state.pokedex.includes(name)) {
      state.pokedex.push(name);
    }
  }
}

const EGG_GROUPS = {
  standard: { id: 'standard', name: 'Standard Egg', nameZh: '普通蛋', chance: 0.50 },
  baby: { id: 'baby', name: 'Baby Egg', nameZh: '幼体蛋', chance: 0.20 },
  starter: { id: 'starter', name: 'Starter Egg', nameZh: '御三家蛋', chance: 0.15 },
  fossil: { id: 'fossil', name: 'Fossil Egg', nameZh: '化石蛋', chance: 0.08 },
  powerhouse: { id: 'powerhouse', name: 'Powerhouse Egg', nameZh: '准神蛋', chance: 0.05 },
  paradox: { id: 'paradox', name: 'Ultra / Paradox Egg', nameZh: '究极/悖谬蛋', chance: 0.015 },
  legendary: { id: 'legendary', name: 'Legendary Egg', nameZh: '传说蛋', chance: 0.004 },
  mythical: { id: 'mythical', name: 'Mythical Egg', nameZh: '幻之蛋', chance: 0.001 }
};
const EGG_GROUP_LIST = Object.values(EGG_GROUPS);

const BABY_POKEMON = new Set([
  'Pichu', 'Cleffa', 'Igglybuff', 'Togepi', 'Tyrogue', 'Smoochum', 'Elekid', 'Magby',
  'Azurill', 'Wynaut', 'Budew', 'Chingling', 'Bonsly', 'Mime Jr.', 'Happiny', 'Munchlax',
  'Riolu', 'Mantyke', 'Toxel'
]);

const STARTER_POKEMON = new Set([
  'Bulbasaur', 'Ivysaur', 'Venusaur', 'Charmander', 'Charmeleon', 'Charizard',
  'Squirtle', 'Wartortle', 'Blastoise', 'Chikorita', 'Bayleef', 'Meganium',
  'Cyndaquil', 'Quilava', 'Typhlosion', 'Totodile', 'Croconaw', 'Feraligatr',
  'Treecko', 'Grovyle', 'Sceptile', 'Torchic', 'Combusken', 'Blaziken',
  'Mudkip', 'Marshtomp', 'Swampert', 'Turtwig', 'Grotle', 'Torterra',
  'Chimchar', 'Monferno', 'Infernape', 'Piplup', 'Prinplup', 'Empoleon',
  'Snivy', 'Servine', 'Serperior', 'Tepig', 'Pignite', 'Emboar',
  'Oshawott', 'Dewott', 'Samurott', 'Chespin', 'Quilladin', 'Chesnaught',
  'Fennekin', 'Braixen', 'Delphox', 'Froakie', 'Frogadier', 'Greninja',
  'Rowlet', 'Dartrix', 'Decidueye', 'Litten', 'Torracat', 'Incineroar',
  'Popplio', 'Brionne', 'Primarina', 'Grookey', 'Thwackey', 'Rillaboom',
  'Scorbunny', 'Raboot', 'Cinderace', 'Sobble', 'Drizzile', 'Inteleon',
  'Sprigatito', 'Floragato', 'Meowscarada', 'Fuecoco', 'Crocalor', 'Skeledirge',
  'Quaxly', 'Quaxwell', 'Quaquaval'
]);

const FOSSIL_POKEMON = new Set([
  'Omanyte', 'Omastar', 'Kabuto', 'Kabutops', 'Aerodactyl',
  'Lileep', 'Cradily', 'Anorith', 'Armaldo',
  'Cranidos', 'Rampardos', 'Shieldon', 'Bastiodon',
  'Tirtouga', 'Carracosta', 'Archen', 'Archeops',
  'Tyrunt', 'Tyrantrum', 'Amaura', 'Aurorus',
  'Dracozolt', 'Arctozolt', 'Dracovish', 'Arctovish'
]);

const PSEUDO_LEGENDS = new Set([
  'Dratini', 'Dragonair', 'Dragonite',
  'Larvitar', 'Pupitar', 'Tyranitar',
  'Bagon', 'Shelgon', 'Salamence',
  'Beldum', 'Metang', 'Metagross',
  'Gible', 'Gabite', 'Garchomp',
  'Deino', 'Zweilous', 'Hydreigon',
  'Goomy', 'Sliggoo', 'Goodra',
  'Jangmo-o', 'Hakamo-o', 'Kommo-o',
  'Dreepy', 'Drakloak', 'Dragapult',
  'Frigibax', 'Arctibax', 'Baxcalibur'
]);

const PARADOX_AND_UB = new Set([
  'Great Tusk', 'Scream Tail', 'Brute Bonnet', 'Flutter Mane', 'Slither Wing', 'Sandy Shocks',
  'Iron Treads', 'Iron Bundle', 'Iron Hands', 'Iron Jugulis', 'Iron Moth', 'Iron Thorns',
  'Roaring Moon', 'Iron Valiant', 'Walking Wake', 'Iron Leaves', 'Gouging Fire', 'Raging Bolt',
  'Iron Boulder', 'Iron Crown',
  'Nihilego', 'Buzzwole', 'Pheromosa', 'Xurkitree', 'Celesteela', 'Kartana', 'Guzzlord',
  'Poipole', 'Naganadel', 'Stakataka', 'Blacephalon'
]);

const LEGENDARIES = new Set([
  'Articuno', 'Zapdos', 'Moltres', 'Mewtwo', 'Raikou', 'Entei', 'Suicune', 'Lugia', 'Ho-Oh',
  'Regirock', 'Regice', 'Registeel', 'Latias', 'Latios', 'Kyogre', 'Groudon', 'Rayquaza',
  'Uxie', 'Mesprit', 'Azelf', 'Dialga', 'Palkia', 'Heatran', 'Regigigas', 'Giratina', 'Cresselia',
  'Cobalion', 'Terrakion', 'Virizion', 'Tornadus', 'Thundurus', 'Reshiram', 'Zekrom', 'Landorus', 'Kyurem',
  'Xerneas', 'Yveltal', 'Zygarde', 'Type: Null', 'Silvally', 'Tapu Koko', 'Tapu Lele', 'Tapu Bulu', 'Tapu Fini',
  'Cosmog', 'Cosmoem', 'Solgaleo', 'Lunala', 'Necrozma', 'Zacian', 'Zamazenta', 'Eternatus',
  'Kubfu', 'Urshifu', 'Regieleki', 'Regidrago', 'Glastrier', 'Spectrier', 'Calyrex',
  'Wo-Chien', 'Chien-Pao', 'Ting-Lu', 'Chi-Yu', 'Koraidon', 'Miraidon',
  'Okidogi', 'Munkidori', 'Fezandipiti', 'Ogerpon', 'Terapagos'
]);

const MYTHICALS = new Set([
  'Mew', 'Celebi', 'Jirachi', 'Deoxys', 'Phione', 'Manaphy', 'Darkrai', 'Shaymin', 'Arceus',
  'Victini', 'Cobalion', 'Keldeo', 'Meloetta', 'Genesect', 'Diancie', 'Hoopa', 'Volcanion',
  'Magearna', 'Marshadow', 'Zeraora', 'Meltan', 'Melmetal', 'Zarude', 'Pecharunt'
]);

function getPokemonGroup(nameOrMon) {
  if (!nameOrMon) return 'Standard';
  let name = '';
  if (typeof nameOrMon === 'string') name = nameOrMon;
  else if (nameOrMon.name) name = nameOrMon.name;
  else if (nameOrMon.line) {
    const l = lineFor(nameOrMon.line);
    name = l.labels?.[nameOrMon.stage || 0] || l.name || '';
  }
  if (MYTHICALS.has(name)) return 'Mythical';
  if (LEGENDARIES.has(name)) return 'Legendary';
  if (PARADOX_AND_UB.has(name)) return 'Ultra / Paradox';
  if (PSEUDO_LEGENDS.has(name)) return 'Powerhouse';
  if (FOSSIL_POKEMON.has(name)) return 'Fossil';
  if (STARTER_POKEMON.has(name)) return 'Starter';
  if (BABY_POKEMON.has(name)) return 'Baby';
  return 'Standard';
}

const EGG_THRESHOLD = 500_000;
const XP_PER_LEVEL = 40_000;
const STAGES = [600_000, 1_400_000, 2_000_000];
const EGG_INTERVAL_MS = 12 * 60 * 60 * 1000;
const CLAIM_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours
const SHINY_ODDS = 1 / 4096;
const TRADE_EVOLUTIONS = { Kadabra: 'Alakazam', Machoke: 'Machamp', Graveler: 'Golem', Haunter: 'Gengar', Boldore: 'Gigalith', Gurdurr: 'Conkeldurr', Karrablast: 'Escavalier', Shelmet: 'Accelgor', Pumpkaboo: 'Gourgeist', Phantump: 'Trevenant', Poliwhirl: 'Politoed', Slowpoke: 'Slowking', Onix: 'Steelix', Scyther: 'Scizor', Seadra: 'Kingdra', Porygon: 'Porygon2', Porygon2: 'Porygon-Z', Rhydon: 'Rhyperior', Electabuzz: 'Electivire', Magmar: 'Magmortar', Dusclops: 'Dusknoir', Clamperl: 'Huntail', Spritzee: 'Aromatisse', Swirlix: 'Slurpuff' };

function rollEggGroup() {
  const roll = Math.random();
  let total = 0;
  for (const group of EGG_GROUP_LIST) {
    total += group.chance;
    if (roll < total) return group.id;
  }
  return 'standard';
}

function makeEgg(group) {
  const resolved = resolveEggGroupKey(group);
  const chosenGroup = resolved && EGG_GROUPS[resolved] ? resolved : rollEggGroup();
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    receivedAt: new Date().toISOString(),
    group: chosenGroup,
    shiny: Math.random() < SHINY_ODDS
  };
}

function resolveEggGroupKey(keyOrName) {
  if (!keyOrName) return null;
  const raw = String(keyOrName).trim().toLowerCase();
  if (EGG_GROUPS[raw]) return raw;
  const cleaned = raw.replace(/\s+egg$/i, '').trim();
  if (EGG_GROUPS[cleaned]) return cleaned;
  if (cleaned.includes('paradox') || cleaned.includes('ultra')) return 'paradox';
  if (cleaned.includes('powerhouse') || cleaned.includes('pseudo') || cleaned === 'epic') return 'powerhouse';
  if (cleaned.includes('legendary')) return 'legendary';
  if (cleaned.includes('mythical')) return 'mythical';
  if (cleaned.includes('starter') || cleaned === 'rare') return 'starter';
  if (cleaned.includes('baby') || cleaned === 'uncommon') return 'baby';
  if (cleaned.includes('fossil')) return 'fossil';
  if (cleaned.includes('standard') || cleaned === 'common') return 'standard';
  return 'standard';
}


function getEggClaimStatus(state = readState()) {
  const lastClaimed = Number(state.lastClaimedEggAt) || 0;
  const elapsed = Date.now() - lastClaimed;
  const remainingMs = Math.max(0, CLAIM_COOLDOWN_MS - elapsed);
  return {
    canClaim: remainingMs === 0,
    remainingMs,
    nextClaimAt: lastClaimed + CLAIM_COOLDOWN_MS
  };
}

function claimFreeEgg() {
  const state = readState();
  const status = getEggClaimStatus(state);
  if (!status.canClaim) {
    const mins = Math.ceil(status.remainingMs / (60 * 1000));
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    const timeStr = hours > 0 ? `${hours}h ${remMins}m` : `${remMins}m`;
    throw new Error(`Egg claim on cooldown. Available in ${timeStr}.`);
  }
  state.eggs = Array.isArray(state.eggs) ? state.eggs : [];
  const newEgg = makeEgg();
  state.eggs.push(newEgg);
  state.lastClaimedEggAt = Date.now();
  save(state);
  return {
    egg: newEgg,
    ...getEggClaimStatus(state)
  };
}

function filePath() {
  const base = process.env.TOKEN_COMPANION_USER_DATA || (app?.getPath ? app.getPath('userData') : path.join(os.homedir(), '.token-companion'));
  return path.join(base, 'companion.json');
}
function initial() {
  return {
    egg: true,
    line: null,
    xp: 0,
    stage: 0,
    level: 1,
    levelXp: 0,
    activeShiny: false,
    lastObservedTokens: null,
    lastUsageDay: null,
    lastEggAt: Date.now(),
    lastClaimedEggAt: 0,
    activeIdeSeconds: 0,
    lastIdeActiveAt: 0,
    lastTokenEventAt: 0,
    eggs: [makeEgg('starter')],
    caught: [],
    pokedex: [],
    team: [],
    savedTeams: Array.from({ length: 6 }, () => []),
    trades: [],
    tower: { currentFloor: 1, bestFloor: 0, teamHp: {}, activeRun: false }
  };
}
const EEVEELUTION_LINES = {
  vaporeon: { name: 'Eevee (Vaporeon)', ids: [133, 134], labels: ['Eevee', 'Vaporeon'], types: [['normal'], ['water']], finalStage: 1, group: 'standard' },
  jolteon: { name: 'Eevee (Jolteon)', ids: [133, 135], labels: ['Eevee', 'Jolteon'], types: [['normal'], ['electric']], finalStage: 1, group: 'standard' },
  flareon: { name: 'Eevee (Flareon)', ids: [133, 136], labels: ['Eevee', 'Flareon'], types: [['normal'], ['fire']], finalStage: 1, group: 'standard' },
  espeon: { name: 'Eevee (Espeon)', ids: [133, 196], labels: ['Eevee', 'Espeon'], types: [['normal'], ['psychic']], finalStage: 1, group: 'standard' },
  umbreon: { name: 'Eevee (Umbreon)', ids: [133, 197], labels: ['Eevee', 'Umbreon'], types: [['normal'], ['dark']], finalStage: 1, group: 'standard' },
  leafeon: { name: 'Eevee (Leafeon)', ids: [133, 470], labels: ['Eevee', 'Leafeon'], types: [['normal'], ['grass']], finalStage: 1, group: 'standard' },
  glaceon: { name: 'Eevee (Glaceon)', ids: [133, 471], labels: ['Eevee', 'Glaceon'], types: [['normal'], ['ice']], finalStage: 1, group: 'standard' },
  sylveon: { name: 'Eevee (Sylveon)', ids: [133, 700], labels: ['Eevee', 'Sylveon'], types: [['normal'], ['fairy']], finalStage: 1, group: 'standard' }
};

function sanitizeMonOrStateLine(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const l = obj.line;
  if (l && typeof l === 'object' && Array.isArray(l.labels)) {
    if (l.labels[0] === 'Eevee' && l.labels[1] === 'Vaporeon' && l.labels[2] === 'Jolteon') {
      const stage = typeof obj.stage === 'number' ? obj.stage : 0;
      if (stage === 1) {
        obj.line = EEVEELUTION_LINES.vaporeon;
        obj.stage = 1;
      } else if (stage >= 2) {
        obj.line = EEVEELUTION_LINES.jolteon;
        obj.stage = 1;
      } else {
        obj.line = EEVEELUTION_LINES.vaporeon;
        obj.stage = 0;
      }
    }
  }
  return obj;
}

function readState() {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath(), 'utf8'));
    const state = { ...initial(), ...raw };

    // Migrate old rarity fields to Bulbapedia egg groups if present
    if (Array.isArray(state.eggs)) {
      state.eggs = state.eggs.map(egg => {
        let group = egg.group;
        if (!group) {
          const r = String(egg.rarity || '').toLowerCase();
          if (r === 'legendary') group = 'legendary';
          else if (r === 'epic') group = 'powerhouse';
          else if (r === 'rare') group = 'starter';
          else if (r === 'uncommon') group = 'baby';
          else group = 'standard';
        }
        const { rarity, ...rest } = egg;
        return { ...rest, group };
      });
    }

    if (Array.isArray(state.caught)) {
      state.caught = state.caught.map(mon => {
        const { rarity, ...rest } = mon;
        return sanitizeMonOrStateLine(rest);
      });
    }
    if (state.activeRarity !== undefined) delete state.activeRarity;
    if (!state.egg && state.line) {
      sanitizeMonOrStateLine(state);
    }

    if (Array.isArray(state.caught)) {
      const sanitizeTeam = ids => [...new Set((Array.isArray(ids) ? ids : []).filter(id => state.caught.some(mon => mon.id === id)))].slice(0, 6);
      state.team = sanitizeTeam(state.team);
      state.savedTeams = Array.from({ length: 6 }, (_, index) => sanitizeTeam(state.savedTeams?.[index]));
    }
    if (state.levelXp === undefined) {
      state.levelXp = (state.xp || 0) % XP_PER_LEVEL;
    }
    state.pokedex = Array.isArray(state.pokedex) ? state.pokedex : [];
    if (!state.egg && state.line !== null && state.line !== undefined) {
      registerPokedex(state, state.line, state.stage || 0);
    }
    if (Array.isArray(state.caught)) {
      for (const mon of state.caught) {
        registerPokedex(state, mon, mon.stage);
      }
    }

    // Normalize tower state
    state.tower = state.tower || { currentFloor: 1, bestFloor: 0, teamHp: {}, activeRun: false, milestonesAwarded: [] };
    state.tower.milestonesAwarded = Array.isArray(state.tower.milestonesAwarded) ? state.tower.milestonesAwarded : [];

    // Retroactively compensate milestone floor eggs if player cleared them without receiving eggs
    if (typeof state.tower.bestFloor === 'number' && state.tower.bestFloor >= 5) {
      const milestoneFloors = [5, 10, 15, 20, 25, 30, 40, 50];
      const milestoneKeyMap = {
        5: 'baby',
        10: 'starter',
        15: 'fossil',
        20: 'powerhouse',
        25: 'powerhouse',
        30: 'paradox',
        40: 'legendary',
        50: 'mythical'
      };
      let compensated = false;
      for (const mf of milestoneFloors) {
        if (state.tower.bestFloor >= mf && !state.tower.milestonesAwarded.includes(mf)) {
          state.eggs = Array.isArray(state.eggs) ? state.eggs : [];
          const missingKey = milestoneKeyMap[mf] || (mf >= 30 ? 'legendary' : 'powerhouse');
          state.eggs.push(makeEgg(missingKey));
          state.tower.milestonesAwarded.push(mf);
          compensated = true;
        }
      }
      if (compensated) {
        save(state);
      }
    }

    return state;
  } catch {
    return initial();
  }
}
function save(state) {
  const fp = filePath();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(state, null, 2));
  return state;
}
function lineFor(line) {
  if (typeof line === 'number') return LINES[line] || LINES[0];
  if (line && typeof line === 'object') {
    const rawLabels = Array.isArray(line.labels) ? line.labels : [];
    const uniqueLabels = [];
    const uniqueIds = [];
    const uniqueTypes = [];
    for (let i = 0; i < rawLabels.length; i++) {
      if (!uniqueLabels.includes(rawLabels[i])) {
        uniqueLabels.push(rawLabels[i]);
        if (line.ids && line.ids[i] !== undefined) uniqueIds.push(line.ids[i]);
        if (line.types && line.types[i] !== undefined) uniqueTypes.push(line.types[i]);
      }
    }
    const finalStage = Math.max(0, uniqueLabels.length - 1);
    return {
      ...line,
      labels: uniqueLabels.length ? uniqueLabels : rawLabels,
      ids: uniqueIds.length ? uniqueIds : line.ids,
      types: uniqueTypes.length ? uniqueTypes : line.types,
      finalStage: typeof line.finalStage === 'number' ? Math.min(line.finalStage, finalStage) : finalStage
    };
  }
  return LINES[0];
}
function applyUsage(state, observed) {
  if (state.teamLayoutVersion !== 2) { state.team = []; state.teamLayoutVersion = 2; }
  state.eggs = Array.isArray(state.eggs) ? state.eggs : [makeEgg()];
  state.lastEggAt = Number(state.lastEggAt) || Date.now();
  let addedEggs = 0;
  while (Date.now() - state.lastEggAt >= EGG_INTERVAL_MS && addedEggs < 10) {
    state.eggs.push(makeEgg());
    state.lastEggAt += EGG_INTERVAL_MS;
    addedEggs++;
  }
  if (Date.now() - state.lastEggAt >= EGG_INTERVAL_MS) {
    state.lastEggAt = Date.now();
  }
  const today = new Date().toLocaleDateString('en-CA');
  const isNewDay = state.lastUsageDay !== today;
  let earned = 0;
  if (typeof observed === 'object' && observed !== null) {
    const rawTotal = Number(observed.totalTokens) || 0;
    const rawDiff = state.lastObservedTokens === null || isNewDay ? rawTotal : Math.max(0, rawTotal - state.lastObservedTokens);
    state.lastObservedTokens = rawTotal;
    if (rawDiff > 0) {
      const tot = (Number(observed.outputTokens) || 0) + (Number(observed.inputTokens) || 0) + (Number(observed.cachedTokens) || 0) || rawTotal || 1;
      const outRatio = (Number(observed.outputTokens) || 0) / tot;
      const inRatio = (Number(observed.inputTokens) || 0) / tot;
      const cacheRatio = (Number(observed.cachedTokens) || 0) / tot;
      const factor = (outRatio * 1.0) + (inRatio * 0.3) + (cacheRatio * 0.02);
      earned = Math.round(rawDiff * factor);
      state.lastTokenEventAt = Date.now();
    }
  } else {
    earned = state.lastObservedTokens === null || isNewDay ? observed : Math.max(0, observed - state.lastObservedTokens);
    state.lastObservedTokens = observed;
    if (earned > 0) state.lastTokenEventAt = Date.now();
  }
  state.lastUsageDay = today;
  addEarnedXp(state, earned);
  return save(state);
}

function addEarnedXp(state, earned) {
  if (state.egg || !earned || earned <= 0) return;

  state.xp += earned;
  state.levelXp = (state.levelXp || 0) + earned;

  while (state.levelXp >= XP_PER_LEVEL && state.level < 100) {
    state.levelXp -= XP_PER_LEVEL;
    state.level += 1;
  }

  const line = lineFor(state.line);
  const finalStage = state.line === null || state.line === undefined ? 2 : (line.finalStage ?? (line.labels.length - 1));

  while (!state.egg && state.stage < finalStage && state.xp >= STAGES[state.stage]) {
    const currentSpecies = line.labels[state.stage];
    if (TRADE_EVOLUTIONS[currentSpecies]) {
      // Species requires a trade to evolve! Cannot auto-evolve through XP/tokens.
      break;
    }
    state.xp -= STAGES[state.stage];
    state.stage += 1;
    registerPokedex(state, state.line, state.stage);
  }

  const isTradeLocked = !state.egg && Boolean(TRADE_EVOLUTIONS[line.labels[state.stage]]);
  if (!state.egg && (state.stage === finalStage || isTradeLocked) && state.xp >= STAGES[2]) {
    registerPokedex(state, state.line, state.stage);
    state.caught.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      line: state.line,
      stage: state.stage,
      date: new Date().toISOString(),
      level: 100,
      levelXp: 0,
      shiny: Boolean(state.activeShiny)
    });
    state.egg = true;
    state.line = null;
    state.stage = 0;
    state.level = 1;
    state.levelXp = 0;
    state.xp = 0;
    state.activeShiny = false;
  }
}

const IDE_EXP_PER_SECOND = 300; // 300 EXP/sec = 18,000 EXP/min = 1,080,000 EXP/hr (~2.2 min / Lv)
const SYNERGY_MULTIPLIER = 1.5; // +50% bonus when actively using both IntelliJ and AI tokens

function recordIdeActiveTime(seconds) {
  const state = readState();
  const sec = Math.max(0, Math.min(300, Number(seconds) || 0));
  if (!sec) return { activeIdeSeconds: state.activeIdeSeconds || 0, gainedExp: 0, isSynergy: false, state };

  state.activeIdeSeconds = (state.activeIdeSeconds || 0) + sec;
  state.lastIdeActiveAt = Date.now();

  const isSynergy = Boolean(state.lastTokenEventAt && (Date.now() - state.lastTokenEventAt <= 30 * 60 * 1000));
  const mult = isSynergy ? SYNERGY_MULTIPLIER : 1.0;
  const gainedExp = Math.round(sec * IDE_EXP_PER_SECOND * mult);

  addEarnedXp(state, gainedExp);

  save(state);
  return {
    activeIdeSeconds: state.activeIdeSeconds,
    gainedExp,
    isSynergy,
    state
  };
}
function resetCompanion() { const s = initial(); save(s); return s; }
function replayCaught(id) {
  const state = readState();
  const caught = state.caught.find(mon => mon.id === id);
  if (!caught || !state.egg) return state;
  state.egg = false;
  state.line = caught.line;
  state.stage = 0;
  state.level = 1;
  state.xp = 0;
  state.activeShiny = Boolean(caught.shiny);
  return save(state);
}
async function hatchEgg(id) {
  const state = readState();
  state.eggs = Array.isArray(state.eggs) ? state.eggs : [];
  const at = state.eggs.findIndex(egg => egg.id === id);
  if (at < 0 || !state.egg) return state;
  const egg = state.eggs[at];
  const group = egg.group || 'standard';
  state.eggs.splice(at, 1);
  state.egg = false;

  let selectedLine = null;
  if (GROUP_LINES[group] && GROUP_LINES[group].length) {
    selectedLine = GROUP_LINES[group][Math.floor(Math.random() * GROUP_LINES[group].length)];
  } else if (group === 'standard') {
    selectedLine = await getRandomLine();
  }
  if (!selectedLine) {
    selectedLine = LINES[Math.floor(Math.random() * LINES.length)];
  }

  state.line = selectedLine;
  state.stage = 0;
  state.level = 1;
  state.xp = 0;
  state.activeShiny = Boolean(egg.shiny);
  registerPokedex(state, state.line, 0);
  return save(state);
}
function releaseEgg(id) {
  const state = readState();
  state.eggs = (state.eggs || []).filter(egg => String(egg.id) !== String(id));
  return save(state);
}
async function swapEggToActive(eggId) {
  const state = readState();
  state.eggs = Array.isArray(state.eggs) ? state.eggs : [];
  const at = state.eggs.findIndex(egg => String(egg.id) === String(eggId));
  if (at < 0) throw new Error('Egg not found.');
  const egg = state.eggs[at];

  // If there is currently an active companion (not in egg state), preserve it into caught!
  if (!state.egg && state.line !== null && state.line !== undefined) {
    const activeMonToSave = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      line: state.line,
      stage: state.stage || 0,
      level: state.level || 1,
      levelXp: state.levelXp || 0,
      xp: state.xp || 0,
      shiny: Boolean(state.activeShiny),
      date: new Date().toISOString()
    };
    state.caught.push(activeMonToSave);
  }

  // Remove the egg from eggs
  const group = egg.group || 'standard';
  state.eggs.splice(at, 1);

  // Hatch the egg into the new active companion
  let selectedLine = null;
  if (GROUP_LINES[group] && GROUP_LINES[group].length) {
    selectedLine = GROUP_LINES[group][Math.floor(Math.random() * GROUP_LINES[group].length)];
  } else if (group === 'standard') {
    selectedLine = await getRandomLine();
  }
  if (!selectedLine) {
    selectedLine = LINES[Math.floor(Math.random() * LINES.length)];
  }

  state.egg = false;
  state.line = selectedLine;
  state.stage = 0;
  state.level = 1;
  state.levelXp = 0;
  state.xp = 0;
  state.activeShiny = Boolean(egg.shiny);
  registerPokedex(state, state.line, 0);

  return save(state);
}
function swapActive(id) {
  const state = readState();
  const index = (state.caught || []).findIndex(mon => String(mon.id) === String(id));
  if (index < 0) throw new Error('Pokémon not found in inventory.');
  const target = state.caught[index];
  if ((target.level || 100) >= 100) {
    throw new Error('Only Pokémon below level 100 can be swapped to active.');
  }

  // If there is currently an active companion (not an egg), deposit it back into caught
  if (!state.egg && state.line !== null && state.line !== undefined) {
    const activeMonToSave = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      line: state.line,
      stage: state.stage || 0,
      level: state.level || 1,
      levelXp: state.levelXp || 0,
      xp: state.xp || 0,
      shiny: Boolean(state.activeShiny),
      date: new Date().toISOString()
    };
    state.caught.push(activeMonToSave);
  }

  // Remove the target from caught
  state.caught.splice(index, 1);

  // Remove target from battle team if it was in the team
  if (Array.isArray(state.team)) {
    state.team = state.team.filter(teamId => String(teamId) !== String(id));
  }

  // Set as new active companion
  state.egg = false;
  state.line = target.line;
  state.stage = typeof target.stage === 'number' ? target.stage : 0;
  state.level = Math.min(99, Math.max(1, target.level || 1));
  state.levelXp = target.levelXp || 0;
  state.xp = target.xp || 0;
  state.activeShiny = Boolean(target.shiny);

  return save(state);
}
function setTeam(ids) {
  const state = readState();
  const valid = (ids || []).filter(id => state.caught.some(mon => mon.id === id));
  state.team = [...new Set(valid)].slice(0, 6);
  return save(state);
}
function clearTeam() {
  const state = readState();
  state.team = [];
  return save(state);
}
function teamSlot(slot) {
  const index = Number(slot);
  if (!Number.isInteger(index) || index < 0 || index >= 6) throw new Error('Choose a battle-team slot from 1 to 6.');
  return index;
}
function saveBattleTeam(slot) {
  const state = readState();
  const index = teamSlot(slot);
  if (!state.team.length) throw new Error('Add at least one Pokémon to the current team before saving it.');
  state.savedTeams[index] = [...state.team];
  return save(state);
}
function loadBattleTeam(slot) {
  const state = readState();
  const index = teamSlot(slot);
  const selected = state.savedTeams[index] || [];
  if (!selected.length) throw new Error('This saved team slot is empty.');
  state.team = [...selected];
  return save(state);
}
function clearSavedBattleTeam(slot) {
  const state = readState();
  const index = teamSlot(slot);
  state.savedTeams[index] = [];
  return save(state);
}
function finalLabel(line) {
  const l = lineFor(line);
  return l.labels[l.finalStage ?? (l.labels.length - 1)];
}
function releaseCaught(id, force = false) {
  const state = readState();
  const mon = state.caught.find(entry => String(entry.id) === String(id));
  if (!mon) return state;
  const key = finalLabel(mon.line);
  if (!force && state.caught.filter(entry => finalLabel(entry.line) === key).length < 2) {
    throw new Error('Only duplicate Pokémon can be released.');
  }
  state.caught = state.caught.filter(entry => String(entry.id) !== String(id));
  state.team = state.team.filter(teamId => String(teamId) !== String(id));
  state.savedTeams = (state.savedTeams || []).map(team => team.filter(teamId => String(teamId) !== String(id)));
  return save(state);
}
function activeMon(state) {
  if (state.egg || state.line === null || state.line === undefined) return null;
  return { id: 'active', active: true, line: state.line, stage: state.stage, level: state.level, shiny: Boolean(state.activeShiny) };
}
function offered(mon) {
  const line = lineFor(mon.line);
  const stage = typeof mon.stage === 'number' ? mon.stage : (line.finalStage ?? (line.labels.length - 1));
  return {
    name: line.labels[stage],
    line: mon.line,
    stage,
    active: Boolean(mon.active),
    level: mon.level || 100,
    shiny: Boolean(mon.shiny),
    date: mon.date
  };
}
function offeredFrom(state, id) { return id === 'active' ? activeMon(state) : state.caught.find(entry => entry.id === id); }
async function createRemoteTrade(id, relayUrl) {
  const state = readState(), mon = offeredFrom(state, id);
  if (!mon) throw new Error('Choose a Pokémon from your Pokédex or an active companion.');
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await remote.create(relayUrl, code, offered(mon));
  state.trades.push({ remote: true, code, role: 'creator', sentId: id, relayUrl, status: 'waiting', createdAt: Date.now() });
  save(state);
  return { code, offer: offered(mon) };
}
async function joinRemoteTrade(code, id, relayUrl) {
  const state = readState(), mon = offeredFrom(state, id);
  if (!mon) throw new Error('Choose a Pokémon to offer.');
  const result = await remote.join(relayUrl, String(code), offered(mon));
  state.trades.push({ remote: true, code: String(code), role: 'joiner', sentId: id, relayUrl, status: 'confirm', createdAt: Date.now() });
  save(state);
  return result;
}
function applyTradeEvolution(mon) {
  const line = lineFor(mon.line);
  const currentStage = typeof mon.stage === 'number' ? mon.stage : 0;
  const currentSpecies = line.labels[currentStage] || mon.name;
  const evolved = TRADE_EVOLUTIONS[currentSpecies];
  if (!evolved) return mon;
  const stage = line.labels.indexOf(evolved);
  return stage >= 0 ? { ...mon, stage, name: evolved } : mon;
}
function completeTrade(state, record, received) {
  if (record.applied || !received || received.line === undefined || received.line === null) return state;
  if (record.sentId === 'active') {
    if (!received.active) throw new Error('An active companion can only trade for another active companion.');
    const gained = applyTradeEvolution(received);
    state.egg = false;
    state.line = gained.line;
    state.stage = gained.stage || 0;
    state.level = Math.min(100, Math.max(1, gained.level || 1));
    state.xp = 0;
    state.activeShiny = Boolean(gained.shiny);
    registerPokedex(state, gained.line, gained.stage || 0);
    record.applied = true;
    record.status = 'complete';
    return state;
  }
  const at = state.caught.findIndex(mon => mon.id === record.sentId);
  if (at < 0) throw new Error('Your offered Pokémon is no longer available.');
  state.caught.splice(at, 1);
  const evolvedReceived = applyTradeEvolution(received);
  const gained = {
    ...evolvedReceived,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: new Date().toISOString(),
    level: Math.min(100, Math.max(1, received.level || 100))
  };
  state.caught.push(gained);
  registerPokedex(state, gained, gained.stage);
  state.team = state.team.filter(id => id !== record.sentId);
  state.savedTeams = (state.savedTeams || []).map(team => team.filter(id => id !== record.sentId));
  record.applied = true;
  record.status = 'complete';
  return state;
}
async function confirmRemoteTrade(code, relayUrl) {
  const state = readState(), record = state.trades.find(entry => entry.remote && entry.code === String(code) && !entry.applied);
  if (!record) throw new Error('No pending local trade matches this code.');
  const result = await remote.confirm(relayUrl || record.relayUrl, String(code), record.role);
  if (result.received) completeTrade(state, record, result.received);
  else record.status = result.status;
  return save(state);
}
async function remoteTradeStatus(code, relayUrl) { return remote.get(relayUrl, String(code)); }
function battleTeam() {
  const state = readState();
  return state.team.map(id => state.caught.find(mon => mon.id === id)).filter(Boolean).map(mon => {
    const line = lineFor(mon.line);
    const stage = typeof mon.stage === 'number' ? mon.stage : (line.finalStage ?? (line.labels.length - 1));
    return {
      id: mon.id,
      name: line.labels[stage],
      types: line.types?.[stage] || line.types?.[0] || ['normal'],
      level: mon.level || 100,
      shiny: Boolean(mon.shiny)
    };
  });
}
async function createRemoteBattle(relayUrl) {
  const team = battleTeam();
  if (!team.length) throw new Error('Select at least one Pokémon for your team.');
  const code = String(Math.floor(100000 + Math.random() * 900000));
  return remote.createBattle(relayUrl, code, team);
}
async function joinRemoteBattle(code, relayUrl) {
  const team = battleTeam();
  if (!team.length) throw new Error('Select at least one Pokémon for your team.');
  return remote.joinBattle(relayUrl, String(code), team);
}
async function remoteBattleStatus(code, relayUrl) { return remote.getBattle(relayUrl, String(code)); }
function createTrade(id) {
  const state = readState(), mon = state.caught.find(x => x.id === id);
  if (!mon) return null;
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const offer = { code, mon, createdAt: Date.now(), expiresAt: Date.now() + 600000, status: 'pending' };
  state.trades.push(offer);
  save(state);
  return offer;
}
function claimTrade(code, offeredId) {
  const state = readState(), trade = state.trades.find(t => t.code === String(code) && t.status === 'pending' && t.expiresAt > Date.now()), mine = state.caught.find(x => x.id === offeredId);
  if (!trade || !mine) return null;
  trade.status = 'completed';
  return save(state);
}

function getTowerStatus() {
  const { stats } = require('./battle');
  const state = readState();
  state.tower = state.tower || { currentFloor: 1, bestFloor: 0, teamHp: {}, activeRun: false };
  const team = (state.team || []).map(id => state.caught.find(mon => mon.id === id)).filter(Boolean).map(mon => {
    const line = lineFor(mon.line);
    const stage = typeof mon.stage === 'number' ? mon.stage : (line.finalStage ?? (line.labels.length - 1));
    const st = stats({ name: line.labels[stage], level: mon.level || 100, shiny: mon.shiny });
    const currentHp = typeof state.tower.teamHp?.[mon.id] === 'number' ? state.tower.teamHp[mon.id] : st.hp;
    return {
      id: mon.id,
      name: line.labels[stage],
      stage,
      level: mon.level || 100,
      shiny: Boolean(mon.shiny),
      currentHp,
      maxHp: st.hp,
      spriteId: line.ids?.[stage] || line.ids?.[0]
    };
  });
  return {
    ...state.tower,
    team
  };
}

function startTowerRun() {
  const state = readState();
  if (!Array.isArray(state.team) || state.team.length === 0) {
    throw new Error('Select at least one Pokémon for your team before entering the Battle Tower.');
  }
  state.tower = state.tower || { currentFloor: 1, bestFloor: 0, teamHp: {}, activeRun: false };
  state.tower.activeRun = true;
  state.tower.currentFloor = 1;
  state.tower.teamHp = {};
  save(state);
  return getTowerStatus();
}

function battleTowerFloor() {
  const { runTowerFloorBattle, stats } = require('./battle');
  const state = readState();
  if (!Array.isArray(state.team) || state.team.length === 0) {
    throw new Error('Select at least one Pokémon for your team.');
  }
  state.tower = state.tower || { currentFloor: 1, bestFloor: 0, teamHp: {}, activeRun: false };
  if (!state.tower.activeRun) {
    state.tower.activeRun = true;
    state.tower.teamHp = {};
  }

  const team = state.team.map(id => state.caught.find(mon => mon.id === id)).filter(Boolean).map(mon => {
    const line = lineFor(mon.line);
    const stage = typeof mon.stage === 'number' ? mon.stage : (line.finalStage ?? (line.labels.length - 1));
    const st = stats({ name: line.labels[stage], level: mon.level || 100, shiny: mon.shiny });
    const currentHp = typeof state.tower.teamHp[mon.id] === 'number' ? state.tower.teamHp[mon.id] : st.hp;
    return {
      id: mon.id,
      name: line.labels[stage],
      types: line.types?.[stage] || line.types?.[0] || ['normal'],
      level: mon.level || 100,
      shiny: Boolean(mon.shiny),
      currentHp,
      maxHp: st.hp
    };
  });

  const allFainted = team.every(m => m.currentHp <= 0);
  if (allFainted) {
    state.tower.activeRun = false;
    save(state);
    throw new Error('All Pokémon in your team have fainted! Start a new Battle Tower run.');
  }

  const floorNumber = state.tower.currentFloor || 1;
  const result = runTowerFloorBattle(team, floorNumber);

  state.tower.teamHp = state.tower.teamHp || {};
  for (const m of (result.playerTeamAfter || [])) {
    if (m.id) {
      state.tower.teamHp[m.id] = m.currentHp;
    }
  }

  if (result.victory) {
    state.tower.bestFloor = Math.max(state.tower.bestFloor || 0, floorNumber);
    state.tower.milestonesAwarded = Array.isArray(state.tower.milestonesAwarded) ? state.tower.milestonesAwarded : [];
    if (result.milestoneRewardKey || result.milestoneReward) {
      const rewardKey = resolveEggGroupKey(result.milestoneRewardKey) || resolveEggGroupKey(result.milestoneReward);
      if (rewardKey) {
        state.eggs = Array.isArray(state.eggs) ? state.eggs : [];
        const awardedEgg = makeEgg(rewardKey);
        state.eggs.push(awardedEgg);
        result.rewardEgg = awardedEgg;
        if (!state.tower.milestonesAwarded.includes(floorNumber)) {
          state.tower.milestonesAwarded.push(floorNumber);
        }
      }
    }
    state.tower.currentFloor = floorNumber + 1;
  } else {
    state.tower.bestFloor = Math.max(state.tower.bestFloor || 0, floorNumber - 1);
    state.tower.activeRun = false;
  }

  save(state);
  return {
    ...result,
    towerStatus: getTowerStatus()
  };
}

function resetTowerRun() {
  const state = readState();
  state.tower = state.tower || { currentFloor: 1, bestFloor: 0, teamHp: {}, activeRun: false };
  state.tower.activeRun = false;
  state.tower.currentFloor = 1;
  state.tower.teamHp = {};
  save(state);
  return getTowerStatus();
}

// No plaintext passcode is published with this project.
const ADMIN_CODE_SALT = 'token-companion-admin-v2';
const ADMIN_CODE_VERIFIER = '6373e3d5b52ff13a3a76816c836e48d4f86c66954f360e6ad444d8d93a9f012b';
const LIMITED_ADMIN_CODE_VERIFIER = '793b9851c4ecbb3839a063d3486fc3bbe91c741492592e0c973f63131ba521ce';

function getAdminRole(code) {
  if (!code) return null;
  const candidate = crypto.pbkdf2Sync(String(code).trim(), ADMIN_CODE_SALT, 210000, 32, 'sha256').toString('hex');
  const candidateBuffer = Buffer.from(candidate, 'hex');
  if (crypto.timingSafeEqual(candidateBuffer, Buffer.from(ADMIN_CODE_VERIFIER, 'hex'))) return 'full';
  if (crypto.timingSafeEqual(candidateBuffer, Buffer.from(LIMITED_ADMIN_CODE_VERIFIER, 'hex'))) return 'limited';
  return null;
}

function verifyAdminCode(code) {
  const mode = getAdminRole(code);
  return { valid: Boolean(mode), mode };
}

function adminSetLevel(level) {
  const state = readState();
  if (state.egg) throw new Error('Cannot set level while active companion is an egg.');
  const lvl = Math.max(1, Math.min(100, parseInt(level, 10) || 1));
  state.level = lvl;
  state.levelXp = 0;
  return save(state);
}

function adminAddExp(amount) {
  const state = readState();
  if (state.egg) throw new Error('Cannot add EXP while active companion is an egg.');
  const exp = Math.max(0, parseInt(amount, 10) || 0);
  addEarnedXp(state, exp);
  return save(state);
}

function adminForceEvolve() {
  const state = readState();
  if (state.egg) throw new Error('Cannot evolve an egg.');
  const line = lineFor(state.line);
  const finalStage = state.line === null || state.line === undefined ? 2 : (line.finalStage ?? (line.labels.length - 1));
  if (state.stage >= finalStage) throw new Error('Already at final evolution stage.');
  state.stage += 1;
  state.xp = 0;
  registerPokedex(state, state.line, state.stage);
  return save(state);
}

function adminToggleShiny() {
  const state = readState();
  if (state.egg) {
    if (state.eggs && state.eggs.length) {
      state.eggs[0].shiny = !state.eggs[0].shiny;
    }
  } else {
    state.activeShiny = !state.activeShiny;
  }
  return save(state);
}

function adminSpawnEgg(group = 'standard', shiny = false) {
  const state = readState();
  state.eggs = Array.isArray(state.eggs) ? state.eggs : [];
  const egg = makeEgg(group);
  if (shiny) egg.shiny = true;
  state.eggs.push(egg);
  return save(state);
}

function adminResetEggCooldown() {
  const state = readState();
  state.lastClaimedEggAt = 0;
  return save(state);
}

function adminSpawnPokemon({ speciesId, name, level = 100, shiny = false }) {
  const state = readState();
  const rawInput = String(speciesId || name || '').trim();
  const idNum = parseInt(rawInput, 10);
  const isNumber = !Number.isNaN(idNum) && idNum > 0;

  const catalog = getCatalogSync();
  const catEntry = catalog.find(c => (isNumber && c.id === idNum) || c.name.toLowerCase() === rawInput.toLowerCase());

  let customLine = null;
  let customStage = 0;

  // 1. Check bundled family lines (all 104 lines across all egg groups)
  const matchedLine = ALL_FAMILY_LINES.find(l => {
    if (isNumber && Array.isArray(l.ids) && l.ids.includes(idNum)) return true;
    if (Array.isArray(l.labels) && l.labels.some(lbl => lbl.toLowerCase() === rawInput.toLowerCase())) return true;
    if (catEntry && Array.isArray(l.ids) && l.ids.includes(catEntry.id)) return true;
    if (catEntry && Array.isArray(l.labels) && l.labels.some(lbl => lbl.toLowerCase() === catEntry.name.toLowerCase())) return true;
    return false;
  });

  if (matchedLine) {
    customLine = matchedLine;
    let idx = -1;
    if (isNumber && Array.isArray(matchedLine.ids)) idx = matchedLine.ids.indexOf(idNum);
    if (idx === -1 && Array.isArray(matchedLine.labels)) idx = matchedLine.labels.findIndex(lbl => lbl.toLowerCase() === rawInput.toLowerCase());
    if (idx === -1 && catEntry && Array.isArray(matchedLine.ids)) idx = matchedLine.ids.indexOf(catEntry.id);
    customStage = idx !== -1 ? idx : (matchedLine.finalStage ?? 0);
  } else if (catEntry) {
    customLine = {
      name: catEntry.name,
      labels: [catEntry.name],
      ids: [catEntry.id],
      types: [['normal']],
      finalStage: 0
    };
    customStage = 0;
  } else if (isNumber) {
    customLine = {
      labels: [`Pokemon #${idNum}`],
      ids: [idNum],
      types: [['normal']],
      finalStage: 0
    };
    customStage = 0;
  } else if (rawInput) {
    customLine = {
      labels: [rawInput],
      ids: [25],
      types: [['normal']],
      finalStage: 0
    };
    customStage = 0;
  } else {
    customLine = LINES[0];
    customStage = customLine.finalStage ?? 2;
  }

  const mon = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    line: customLine,
    stage: customStage,
    level: Math.max(1, Math.min(100, parseInt(level, 10) || 100)),
    levelXp: 0,
    xp: 0,
    shiny: Boolean(shiny),
    date: new Date().toISOString()
  };
  state.caught = Array.isArray(state.caught) ? state.caught : [];
  state.caught.push(mon);
  registerPokedex(state, mon, customStage);
  return save(state);
}

function adminHealTowerTeam() {
  const state = readState();
  if (state.tower) {
    state.tower.teamHp = {};
  }
  return save(state);
}

function adminSetTowerFloor(floor) {
  const state = readState();
  if (!state.tower) state.tower = { currentFloor: 1, bestFloor: 0, teamHp: {}, activeRun: false };
  state.tower.currentFloor = Math.max(1, parseInt(floor, 10) || 1);
  return save(state);
}

function adminResetState() {
  const state = initial();
  return save(state);
}

module.exports = {
  LINES,
  ALL_FAMILY_LINES,
  registerPokedex,
  GROUP_LINES,
  EGG_GROUPS,
  EGG_GROUP_LIST,
  getPokemonGroup,
  rollEggGroup,
  makeEgg,
  getEggClaimStatus,
  claimFreeEgg,
  CLAIM_COOLDOWN_MS,
  lineFor,
  EGG_THRESHOLD,
  STAGES,
  EGG_INTERVAL_MS,
  SHINY_ODDS,
  TRADE_EVOLUTIONS,
  readState,
  applyUsage,
  hatchEgg,
  releaseEgg,
  swapActive,
  swapEggToActive,
  replayCaught,
  setTeam,
  clearTeam,
  saveBattleTeam,
  loadBattleTeam,
  clearSavedBattleTeam,
  releaseCaught,
  createRemoteTrade,
  joinRemoteTrade,
  confirmRemoteTrade,
  remoteTradeStatus,
  createRemoteBattle,
  joinRemoteBattle,
  remoteBattleStatus,
  createTrade,
  claimTrade,
  resetCompanion,
  battleTeam,
  completeTrade,
  finalLabel,
  getTowerStatus,
  startTowerRun,
  battleTowerFloor,
  resetTowerRun,
  recordIdeActiveTime,
  IDE_EXP_PER_SECOND,
  SYNERGY_MULTIPLIER,
  XP_PER_LEVEL,
  getAdminRole,
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
  adminResetState
};
