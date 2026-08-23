(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HiveCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const YEAR_LENGTH = 180;
  const BASE_QUOTA = 10;
  const SAVE_VERSION = 4;
  const MARKET_MIN_PRICE = 3.2;
  const MARKET_MAX_PRICE = 8;
  const AUTO_SELL_PRICE = 7.2;

  const BIOMES = {
    sunmeadow: { id: 'sunmeadow', name: 'Sunmeadow Vale', icon: '✿', tagline: 'Balanced seasons and generous wildflowers.', temperature: 0, humidity: 0, nectar: 1, wax: 1, quota: 1, raid: 1, unlock: null, color: '#8fba67' },
    coast: { id: 'coast', name: 'Saltwind Coast', icon: '≈', tagline: 'Cold salt winds, heavy moisture, and tighter quotas.', temperature: -3.5, humidity: 14, nectar: .9, wax: .92, quota: 1.2, raid: 1.15, unlock: { biome: 'sunmeadow', level: 25 }, color: '#75a9b5' },
    orchard: { id: 'orchard', name: 'Cider Orchard', icon: '●', tagline: 'Hot dry harvests, wary birds, and scarce safe bloom.', temperature: 4, humidity: -4, nectar: .82, wax: .88, quota: 1.4, raid: 1.35, unlock: { biome: 'coast', level: 50 }, color: '#c97855' },
    highland: { id: 'highland', name: 'Thistle Highlands', icon: '▲', tagline: 'Severe cold, thin air, fierce wasps, and little nectar.', temperature: -6, humidity: -12, nectar: .68, wax: 1.05, quota: 1.65, raid: 1.6, unlock: { biome: 'orchard', level: 75 }, color: '#7b7f9c' }
  };

  const DIFFICULTIES = {
    keeper: { id: 'keeper', name: 'Gentle Keeper', icon: '◇', description: 'A forgiving 15-year colony.', quota: .85, raid: .8, years: 15 },
    worker: { id: 'worker', name: 'Worker’s Oath', icon: '⬡', description: 'The intended balanced challenge.', quota: 1, raid: 1, years: 15 },
    crown: { id: 'crown', name: 'Crown’s Trial', icon: '♛', description: 'Faster quotas and fiercer wasps.', quota: 1.28, raid: 1.35, years: 12 }
  };

  const SEASONS = [
    { id: 'thaw', name: 'First Thaw', icon: '◒', description: 'Cool air wakes the first flowers.', temperature: -2, humidity: 3, nectar: .9 },
    { id: 'bloom', name: 'High Bloom', icon: '✿', description: 'Nectar runs freely through the hive.', temperature: 1, humidity: 2, nectar: 1.35 },
    { id: 'harvest', name: 'Amber Harvest', icon: '☀', description: 'Dry heat boosts wax but strains the comb.', temperature: 4, humidity: -8, nectar: 1.05 },
    { id: 'frost', name: 'Long Frost', icon: '❄', description: 'The colony huddles as flowers close.', temperature: -7, humidity: -5, nectar: .48 }
  ];

  const CELL_TYPES = {
    queen: {
      name: 'Queen’s chamber', short: 'Queen', icon: '♛', cost: 0,
      description: 'The living heart of the colony. Lose the Queen and the run ends.',
      color: '#6d3651'
    },
    garden: {
      name: 'Nectar garden', short: 'Garden', icon: '✿', cost: 28,
      description: 'Cultivates a steady nectar supply. Adjacent gardens share a bloom bonus.',
      color: '#7c9c65'
    },
    processor: {
      name: 'Amber refinery', short: 'Refinery', icon: '◆', cost: 34,
      description: 'Turns nectar into honey. Works faster beside honey vaults and the Queen.',
      color: '#e8754f'
    },
    honey: {
      name: 'Honey vault', short: 'Vault', icon: '▤', cost: 24,
      description: 'Stores finished honey. Connected vaults increase one another’s capacity.',
      color: '#efb42e'
    },
    brood: {
      name: 'Brood nursery', short: 'Brood', icon: '●', cost: 38,
      description: 'Raises new workers over time. Queen and nursery neighbours speed hatching.',
      color: '#e7d58f'
    },
    vent: {
      name: 'Wing ventilator', short: 'Vent', icon: '≈', cost: 32,
      description: 'Cools and refreshes a crowded hive, protecting production efficiency.',
      color: '#87adc2'
    },
    guard: {
      name: 'Sentinel post', short: 'Guard', icon: '♜', cost: 48,
      description: 'Trains defenders and absorbs wasp pressure before it reaches the Queen.',
      color: '#5c6579'
    }
  };

  const UPGRADES = [
    { id: 'goldenComb', name: 'Golden comb', icon: '◆', rarity: 'uncommon', description: 'Refineries produce 25% more honey.', effect: { production: .25 } },
    { id: 'longWings', name: 'Long wings', icon: '↗', rarity: 'common', description: 'Foraging expeditions return 25% sooner.', effect: { forageSpeed: .25 } },
    { id: 'royalJelly', name: 'Royal jelly', icon: '♛', rarity: 'rare', description: 'Brood cells hatch workers 35% faster.', effect: { hatchSpeed: .35 } },
    { id: 'waxMasons', name: 'Wax masons', icon: '⬡', rarity: 'common', description: 'All new cells cost 15% less wax.', effect: { buildDiscount: .15 } },
    { id: 'deepVaults', name: 'Deep vaults', icon: '▤', rarity: 'uncommon', description: 'Honey storage capacity increases by 35%.', effect: { storage: .35 } },
    { id: 'swarmGuard', name: 'Swarm guard', icon: '♜', rarity: 'rare', description: 'Sentinel posts defend with 40% more strength.', effect: { defense: .40 } },
    { id: 'keenTraders', name: 'Keen traders', icon: '↗', rarity: 'uncommon', description: 'Honey sells for 18% more on the exchange.', effect: { sale: .18 } },
    { id: 'fieldLore', name: 'Field lore', icon: '✿', rarity: 'common', description: 'Foraging brings home 25% more nectar and wax.', effect: { forageYield: .25 } },
    { id: 'smallBatch', name: 'Small Batch', icon: '♟', rarity: 'rare', description: 'With 6 or fewer bees, workers are 40% more efficient and honey sells for 20% more.', effect: { smallBatch: .4 }, requiresDiscovery: 'smallBatch' }
  ];

  const LEVEL_UPGRADES = [
    { id: 'honeySilo', name: 'Honey Silo', icon: '⬡', description: 'Add a free honey vault to your hive.', effect: {} },
    { id: 'superForagers', name: 'Super Foragers', icon: '✿', description: 'Foraging trips return 20% faster.', effect: { forageSpeed: .2 } },
    { id: 'hardyBees', name: 'Hardy Bees', icon: '♜', description: 'Workers are 30% safer while foraging.', effect: { forageSafety: .3 } },
    { id: 'speedyBees', name: 'Speedy Bees', icon: '⚡', description: 'Workers move and produce 5% faster.', effect: { production: .05, beeSpeed: .05 } },
    { id: 'pheromonePower', name: 'Pheromone Power', icon: '♛', description: 'The Queen gives nearby workers 12% more efficiency.', effect: { pheromonePower: .12 } },
    { id: 'pheromoneArea', name: 'Pheromone Area', icon: '◎', description: 'Expand the Queen’s pheromone range by one ring.', effect: { pheromoneArea: 1 } },
    { id: 'honeyJar', name: 'Honey Jar', icon: '▤', description: 'Increase honey storage by 25%.', effect: { storage: .25 } },
    { id: 'beeDamage', name: 'Bee Damage', icon: '↯', description: 'Workers and sentinels deal 25% more damage to wasps.', effect: { defense: .25 } }
  ];

  const FIELD_UPGRADES = {
    sustainable: { id: 'sustainable', name: 'Sustainable farming', icon: '⚘', cost: 150, description: '+25% nectar and wax.', yield: .25 },
    flightpath: { id: 'flightpath', name: 'Flightpath', icon: '⌁', cost: 100, description: 'Trips finish 20% sooner.', speed: .2 },
    gmo: { id: 'gmo', name: 'GMO blooms', icon: '⚗', cost: 100, description: '+35% yield, but +3% risk.', yield: .35, risk: .03 }
  };

  const FORAGE_LOCATIONS = [
    { id: 'clover', name: 'Bluebell Woods', icon: '♧', description: 'Safe and simple, close to home.', duration: 18, risk: 0, nectar: 42, wax: 12, bees: 1, cost: 0, level: 1, scoutCost: 0 },
    { id: 'orchard', name: 'Sunflower Fields', icon: '✿', description: 'Deep-veined flowers with a quick flight home.', duration: 26, risk: .06, nectar: 70, wax: 20, bees: 1, cost: 6, level: 2, scoutCost: 100 },
    { id: 'highland', name: 'Rapeseed Reach', icon: '⚘', description: 'Rich yellow fields beyond farm-bird territory.', duration: 36, risk: .12, nectar: 120, wax: 34, bees: 2, cost: 12, level: 7, scoutCost: 300 },
    { id: 'heather', name: 'Coastal Heather', icon: '≈', description: 'Salt wind, heavy nectar, and dangerous gulls.', duration: 46, risk: .18, nectar: 180, wax: 50, bees: 3, cost: 20, level: 12, scoutCost: 500 },
    { id: 'alpine', name: 'Alpine Clover', icon: '▲', description: 'The rarest bloom above the cold ridge.', duration: 58, risk: .24, nectar: 260, wax: 72, bees: 3, cost: 28, level: 18, scoutCost: 800 }
  ];

  function key(q, r) { return `${q},${r}`; }
  function parseKey(value) { return value.split(',').map(Number); }
  function distance(q, r) { return Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r)); }
  function axialCoordinates(radius) {
    const result = [];
    for (let q = -radius; q <= radius; q += 1) {
      const rMin = Math.max(-radius, -q - radius);
      const rMax = Math.min(radius, -q + radius);
      for (let r = rMin; r <= rMax; r += 1) result.push({ q, r });
    }
    return result;
  }
  function neighbors(q, r) {
    return [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]].map(([dq, dr]) => [q + dq, r + dr]);
  }

  function seededRandom(seed) {
    let value = seed >>> 0;
    return function () {
      value += 0x6D2B79F5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createInitialState(seed = Date.now(), options = {}) {
    const biome = BIOMES[options.biome] || BIOMES.sunmeadow;
    const difficulty = DIFFICULTIES[options.difficulty] || DIFFICULTIES.worker;
    return {
      version: SAVE_VERSION,
      seed,
      year: 1,
      yearTime: 0,
      radius: 2,
      config: { biome: biome.id, difficulty: difficulty.id },
      resources: { wax: 140, nectar: 35, honey: 0, coins: 90 },
      quota: { target: Math.round(BASE_QUOTA * difficulty.quota * biome.quota), delivered: 0 },
      workers: 4,
      lostWorkers: 0,
      cells: {
        '0,-1': { type: 'processor', builtAt: 0, level: 1 },
        '1,-1': { type: 'processor', builtAt: 0, level: 1 },
        '-1,0': { type: 'garden', builtAt: 0, level: 1 },
        '0,0': { type: 'queen', builtAt: 0 },
        '-1,1': { type: 'brood', builtAt: 0, level: 1, brood: { progress: 0, stage: 'egg' } }
      },
      seals: [],
      discoveries: [],
      progression: {
        level: 1, xp: 0, nextXp: 65, pendingLevels: 0, upgrades: [],
        discoveredLocations: ['clover'], scouting: null, forageUpgrades: {}
      },
      market: { price: 6.2, history: [5.1, 5.7, 5.4, 6.1, 5.8, 6.5, 6.2], timer: 0, autoSell: false, reserve: 10 },
      broodProgress: 0,
      expedition: null,
      raid: null,
      hazards: { dryness: 0, warned: false },
      emergency: { type: null, remaining: 0 },
      stats: { honeyMade: 0, honeySold: 0, coinsEarned: 0, cellsBuilt: 0, yearsCompleted: 0, born: 0, lost: 0, yearHoneyMade: 0, yearCoinsEarned: 0 },
      flags: { raidResolved: false, tutorialStep: 0, gameOver: false, seasonIndex: 0, upgradeRerolls: 0, storyTimer: 0 }
    };
  }

  function currentBiome(state) { return BIOMES[state.config?.biome] || BIOMES.sunmeadow; }
  function currentDifficulty(state) { return DIFFICULTIES[state.config?.difficulty] || DIFFICULTIES.worker; }
  function currentSeason(state) { return SEASONS[Math.min(3, Math.floor((state.yearTime / YEAR_LENGTH) * 4))] || SEASONS[3]; }

  function sealBonus(state, property) {
    return state.seals.reduce((total, sealId) => {
      const seal = UPGRADES.find(item => item.id === sealId);
      return total + (seal && seal.effect[property] || 0);
    }, 0);
  }

  function levelBonus(state, property) {
    return (state.progression?.upgrades || []).reduce((total, upgradeId) => {
      const upgrade = LEVEL_UPGRADES.find(item => item.id === upgradeId);
      return total + (upgrade?.effect?.[property] || 0);
    }, 0);
  }

  function xpForLevel(level) { return 40 + level * 25; }

  function gainExperience(state, amount) {
    const progression = state.progression;
    if (!progression || amount <= 0) return 0;
    progression.xp += amount;
    let gained = 0;
    while (progression.xp >= progression.nextXp) {
      progression.xp -= progression.nextXp;
      progression.level += 1;
      progression.pendingLevels += 1;
      progression.nextXp = xpForLevel(progression.level);
      gained += 1;
    }
    return gained;
  }

  function levelUpgradeChoices(state) {
    const progression = state.progression;
    const random = seededRandom(state.seed + progression.level * 65537 + progression.pendingLevels * 8191 + progression.upgrades.length * 131);
    const pool = [...LEVEL_UPGRADES];
    const choices = [];
    while (choices.length < 2 && pool.length) choices.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
    return choices;
  }

  function addFreeHoneyVault(state) {
    const options = axialCoordinates(state.radius)
      .filter(({ q, r }) => !state.cells[key(q, r)] && hasAdjacentCell(state, key(q, r)))
      .sort((a, b) => distance(a.q, a.r) - distance(b.q, b.r));
    if (!options.length) return null;
    const coordKey = key(options[0].q, options[0].r);
    state.cells[coordKey] = { type: 'honey', builtAt: state.yearTime, level: 1 };
    state.stats.cellsBuilt += 1;
    return coordKey;
  }

  function chooseLevelUpgrade(state, upgradeId) {
    const upgrade = LEVEL_UPGRADES.find(item => item.id === upgradeId);
    if (!upgrade || state.progression.pendingLevels < 1) return { ok: false, reason: 'That level reward is not available.' };
    state.progression.upgrades.push(upgradeId);
    const addedCells = [];
    if (upgradeId === 'honeySilo') {
      const amount = state.progression.upgrades.filter(id => id === 'honeySilo').length > 1 ? 2 : 1;
      for (let index = 0; index < amount; index += 1) {
        const coordKey = addFreeHoneyVault(state);
        if (coordKey) addedCells.push(coordKey);
      }
    }
    state.progression.pendingLevels -= 1;
    return { ok: true, upgrade, addedCells };
  }

  function pheromoneRadius(state) { return 1 + Math.round(levelBonus(state, 'pheromoneArea')); }
  function pheromonePower(state) { return .10 + levelBonus(state, 'pheromonePower'); }

  function upgradeCell(state, coordKey) {
    const cell = state.cells[coordKey];
    if (!cell || cell.type === 'queen') return { ok: false, reason: 'The Queen’s chamber cannot be upgraded.' };
    cell.level = Math.max(1, cell.level || 1);
    if (cell.level >= 3) return { ok: false, reason: 'This cell is fully upgraded.' };
    const cost = 100 * cell.level;
    if (state.resources.coins < cost) return { ok: false, reason: `You need ${cost} crowns.` };
    state.resources.coins -= cost;
    cell.level += 1;
    gainExperience(state, 15);
    return { ok: true, cost, level: cell.level };
  }

  function countCells(state, type) {
    return Object.values(state.cells).filter(cell => cell.type === type).length;
  }

  function nectarPerGarden(state) {
    return state.resources.nectar / Math.max(1, countCells(state, 'garden'));
  }

  function adjacentCount(state, coordKey, type) {
    const [q, r] = parseKey(coordKey);
    return neighbors(q, r).reduce((count, [nq, nr]) => count + (state.cells[key(nq, nr)]?.type === type ? 1 : 0), 0);
  }

  function hasAdjacentCell(state, coordKey) {
    const [q, r] = parseKey(coordKey);
    return neighbors(q, r).some(([nq, nr]) => Boolean(state.cells[key(nq, nr)]));
  }

  function cellCost(state, type) {
    const base = CELL_TYPES[type]?.cost || 0;
    return Math.max(1, Math.round(base * (1 - sealBonus(state, 'buildDiscount'))));
  }

  function canBuild(state, coordKey, type) {
    if (!CELL_TYPES[type] || type === 'queen') return { ok: false, reason: 'That cell cannot be built.' };
    if (state.cells[coordKey]) return { ok: false, reason: 'That space is already occupied.' };
    const [q, r] = parseKey(coordKey);
    if (distance(q, r) > state.radius) return { ok: false, reason: 'That ring is not unlocked yet.' };
    if (!hasAdjacentCell(state, coordKey)) return { ok: false, reason: 'New cells must touch the hive.' };
    const cost = cellCost(state, type);
    if (state.resources.wax < cost) return { ok: false, reason: `You need ${cost} wax.` };
    return { ok: true, cost };
  }

  function buildCell(state, coordKey, type) {
    const check = canBuild(state, coordKey, type);
    if (!check.ok) return check;
    state.resources.wax -= check.cost;
    state.cells[coordKey] = { type, builtAt: state.yearTime, level: 1 };
    if (type === 'brood') state.cells[coordKey].brood = { progress: 0, stage: 'egg' };
    state.stats.cellsBuilt += 1;
    const levels = gainExperience(state, 12);
    return { ok: true, cost: check.cost, bonuses: cellBonuses(state, coordKey), levels };
  }

  function demolishCell(state, coordKey) {
    const cell = state.cells[coordKey];
    if (!cell || cell.type === 'queen') return { ok: false, reason: 'The Queen’s chamber cannot be recycled.' };
    const refund = Math.round(cellCost(state, cell.type) * .5);
    delete state.cells[coordKey];
    state.resources.wax += refund;
    return { ok: true, refund };
  }

  function cellBonuses(state, coordKey) {
    const cell = state.cells[coordKey];
    if (!cell) return [];
    const bonuses = [];
    const queen = adjacentCount(state, coordKey, 'queen');
    if (queen && ['processor', 'brood', 'garden'].includes(cell.type)) bonuses.push({ label: 'Royal warmth', value: 10 * queen });
    if (cell.type === 'processor') {
      const vaults = adjacentCount(state, coordKey, 'honey');
      if (vaults) bonuses.push({ label: `Vault link ×${vaults}`, value: 12 * vaults });
    }
    if (cell.type === 'honey') {
      const vaults = adjacentCount(state, coordKey, 'honey');
      if (vaults) bonuses.push({ label: `Vault cluster ×${vaults}`, value: 12 * vaults });
    }
    if (cell.type === 'garden') {
      const gardens = adjacentCount(state, coordKey, 'garden');
      if (gardens) bonuses.push({ label: `Shared bloom ×${gardens}`, value: 8 * gardens });
    }
    if (cell.type === 'brood') {
      const nurseries = adjacentCount(state, coordKey, 'nursery');
      if (nurseries) bonuses.push({ label: `Nurse care ×${nurseries}`, value: 20 * nurseries });
    }
    return bonuses;
  }

  function climate(state) {
    const total = Object.keys(state.cells).length;
    const vents = countCells(state, 'vent');
    const processors = countCells(state, 'processor');
    const gardens = countCells(state, 'garden');
    const brood = countCells(state, 'brood');
    const biome = currentBiome(state);
    const season = currentSeason(state);
    const emergencyTemp = state.emergency?.type === 'warm' ? 7 : 0;
    const emergencyHumidity = state.emergency?.type === 'mist' ? 16 : 0;
    const temperature = 33 + biome.temperature + season.temperature + emergencyTemp + processors * 1.35 + brood * .45 + Math.max(0, total - 8) * .25 - vents * 3.2;
    const nectarHumidity = Math.min(8, state.resources.nectar / 10);
    const emptyStorePenalty = state.resources.nectar < 5 ? 6 : 0;
    const humidity = 51 + biome.humidity + season.humidity + emergencyHumidity + gardens * 2.4 + brood * .7 + nectarHumidity - emptyStorePenalty - vents * 1.7;
    const air = Math.max(28, Math.min(100, 97 - Math.max(0, total - 4) * 2.6 + vents * 12));
    const tempPenalty = Math.min(1, Math.max(0, Math.abs(34 - temperature) - 2) / 13);
    const humidityPenalty = Math.min(1, Math.max(0, Math.abs(60 - humidity) - 10) / 35);
    const airPenalty = Math.min(1, Math.max(0, 75 - air) / 45);
    const efficiency = Math.max(.35, 1 - tempPenalty * .35 - humidityPenalty * .2 - airPenalty * .4);
    return { temperature, humidity, air, efficiency };
  }

  function storageCapacity(state) {
    let capacity = 40;
    for (const [coordKey, cell] of Object.entries(state.cells)) {
      if (cell.type !== 'honey') continue;
      const levelMultiplier = Math.pow(2, Math.max(0, (cell.level || 1) - 1));
      capacity += 110 * levelMultiplier * (1 + adjacentCount(state, coordKey, 'honey') * .12);
    }
    return Math.round(capacity * (1 + sealBonus(state, 'storage') + levelBonus(state, 'storage')));
  }

  function productionRates(state) {
    const conditions = climate(state);
    const away = (state.expedition ? state.expedition.bees : 0) + (state.progression?.scouting ? 1 : 0);
    const availableWorkers = Math.max(0, state.workers - away);
    const workerFactor = Math.min(1, availableWorkers / Math.max(2, Object.keys(state.cells).length * .42));
    const biome = currentBiome(state);
    const season = currentSeason(state);
    if (season.id === 'frost') return { nectar: 0, processing: 0, hatch: 0, availableWorkers: 0, workerFactor: 0, winter: true };
    const rally = state.emergency?.type === 'rally' ? 1.45 : 1;
    let nectar = .08;
    let processing = 0;
    let hatch = 0;
    for (const [coordKey, cell] of Object.entries(state.cells)) {
      const bonus = cellBonuses(state, coordKey).reduce((sum, item) => sum + item.value, 0) / 100;
      const [q, r] = parseKey(coordKey);
      const royalBoost = distance(q, r) <= pheromoneRadius(state) ? pheromonePower(state) : 0;
      const levelMultiplier = Math.pow(2, Math.max(0, (cell.level || 1) - 1));
      if (cell.type === 'garden') nectar += .42 * levelMultiplier * (1 + bonus + royalBoost);
      if (cell.type === 'processor') processing += .34 * levelMultiplier * (1 + bonus + royalBoost + sealBonus(state, 'production') + levelBonus(state, 'production'));
      if (cell.type === 'brood') hatch += .006 * levelMultiplier * (1 + bonus + royalBoost + sealBonus(state, 'hatchSpeed'));
    }
    const smallBatch = state.workers <= 6 && state.seals.includes('smallBatch') ? 1.4 : 1;
    const common = conditions.efficiency * (.55 + .45 * workerFactor) * smallBatch;
    return { nectar: nectar * common * biome.nectar * season.nectar * rally, processing: processing * common * rally, hatch: hatch * common, availableWorkers, workerFactor };
  }

  function broodStage(progress) {
    if (progress < .34) return 'egg';
    if (progress < .72) return 'larva';
    return 'pupa';
  }

  function feedBrood(state, coordKey, honeyAmount = 1) {
    const cell = state.cells[coordKey];
    if (!cell || cell.type !== 'brood') return { ok: false, reason: 'Select a Brood Nursery first.' };
    const amount = Math.min(Math.max(1, Math.floor(honeyAmount)), Math.floor(state.resources.honey));
    if (amount < 1) return { ok: false, reason: 'You need honey to feed the brood.' };
    if (!cell.brood) cell.brood = { progress: 0, stage: 'egg' };
    state.resources.honey -= amount;
    cell.brood.progress = Math.min(.98, cell.brood.progress + amount * .16);
    cell.brood.stage = broodStage(cell.brood.progress);
    return { ok: true, amount, stage: cell.brood.stage, progress: cell.brood.progress };
  }

  function emergencyAction(state, type) {
    const actions = {
      warm: { cost: 28, duration: 15, name: 'Warm the comb' },
      mist: { cost: 28, duration: 15, name: 'Mist the hive' },
      rally: { cost: 52, duration: 12, name: 'Rally the workers' }
    };
    const action = actions[type];
    if (!action) return { ok: false, reason: 'Unknown emergency action.' };
    if (state.resources.coins < action.cost) return { ok: false, reason: `You need ${action.cost} crowns.` };
    state.resources.coins -= action.cost;
    state.emergency = { type, remaining: action.duration };
    return { ok: true, ...action };
  }

  function updateMarket(state, random) {
    const previous = state.market.price;
    const pull = (5.8 - previous) * .18;
    const seasonal = Math.sin((state.yearTime / YEAR_LENGTH) * Math.PI * 2 + state.year) * .35;
    const shock = (random() - .5) * 1.8;
    state.market.price = Math.max(MARKET_MIN_PRICE, Math.min(MARKET_MAX_PRICE, Math.round((previous + pull + seasonal + shock) * 10) / 10));
    state.market.history.push(state.market.price);
    if (state.market.history.length > 18) state.market.history.shift();
  }

  function resolveExpedition(state, random) {
    const location = FORAGE_LOCATIONS.find(item => item.id === state.expedition.locationId);
    const upgrades = state.progression?.forageUpgrades?.[location.id] || [];
    const fieldRisk = upgrades.reduce((sum, id) => sum + (FIELD_UPGRADES[id]?.risk || 0), 0);
    const safety = levelBonus(state, 'forageSafety');
    const effectiveRisk = Math.max(0, (location.risk + fieldRisk) * (1 - Math.min(.75, safety)));
    const lost = random() < effectiveRisk ? 1 : 0;
    const extraCrew = Math.max(0, state.expedition.bees - (state.expedition.baseBees || location.bees));
    const fieldYield = upgrades.reduce((sum, id) => sum + (FIELD_UPGRADES[id]?.yield || 0), 0);
    const yieldBonus = (1 + sealBonus(state, 'forageYield') + fieldYield) * (1 + extraCrew * .28);
    const nectar = Math.round(location.nectar * yieldBonus * (.85 + random() * .3));
    const wax = Math.round(location.wax * yieldBonus * (.85 + random() * .3));
    state.resources.nectar += nectar;
    state.resources.wax += wax;
    if (lost) {
      state.workers = Math.max(1, state.workers - lost);
      state.lostWorkers += lost;
      state.stats.lost += lost;
    }
    state.expedition = null;
    gainExperience(state, 18 + location.level * 2);
    return { type: 'expedition', location, nectar, wax, lost };
  }

  function startExpedition(state, locationId, requestedCrew) {
    if (state.expedition) return { ok: false, reason: 'A swarm is already in the field.' };
    if (currentSeason(state).id === 'frost') return { ok: false, reason: 'The bees rest during Long Frost. Foraging resumes in spring.' };
    const location = FORAGE_LOCATIONS.find(item => item.id === locationId);
    if (!location) return { ok: false, reason: 'Unknown meadow.' };
    if (!state.progression.discoveredLocations.includes(locationId)) return { ok: false, reason: 'Scout this field before sending a swarm.' };
    const crew = Math.max(location.bees, Math.min(4, Number(requestedCrew) || location.bees));
    if (state.workers < crew + 1) return { ok: false, reason: `Keep the Queen safe; you need ${crew + 1} workers.` };
    if (state.resources.coins < location.cost) return { ok: false, reason: `You need ${location.cost} crowns for supplies.` };
    state.resources.coins -= location.cost;
    const upgrades = state.progression.forageUpgrades[location.id] || [];
    const fieldSpeed = upgrades.reduce((sum, id) => sum + (FIELD_UPGRADES[id]?.speed || 0), 0);
    const duration = location.duration * (1 - Math.min(.75, sealBonus(state, 'forageSpeed') + levelBonus(state, 'forageSpeed') + fieldSpeed)) / (1 + (crew - location.bees) * .16);
    state.expedition = { locationId, bees: crew, baseBees: location.bees, elapsed: 0, duration };
    return { ok: true, location, duration, crew };
  }

  function startScouting(state, locationId) {
    const location = FORAGE_LOCATIONS.find(item => item.id === locationId);
    if (!location) return { ok: false, reason: 'Unknown field.' };
    if (state.progression.level < location.level) return { ok: false, reason: `Reach level ${location.level} first.` };
    if (state.progression.discoveredLocations.includes(locationId)) return { ok: false, reason: 'That field is already mapped.' };
    if (state.progression.scouting || state.expedition) return { ok: false, reason: 'Your field team is already away.' };
    if (currentSeason(state).id === 'frost') return { ok: false, reason: 'Scouting pauses during Long Frost.' };
    if (state.workers < 2) return { ok: false, reason: 'Keep one worker with the Queen.' };
    if (state.resources.coins < location.scoutCost) return { ok: false, reason: `You need ${location.scoutCost} crowns.` };
    state.resources.coins -= location.scoutCost;
    state.progression.scouting = { locationId, elapsed: 0, duration: 12 + location.level * 2 };
    return { ok: true, location };
  }

  function upgradeForageLocation(state, locationId, upgradeId) {
    const location = FORAGE_LOCATIONS.find(item => item.id === locationId);
    const upgrade = FIELD_UPGRADES[upgradeId];
    if (!location || !upgrade || !state.progression.discoveredLocations.includes(locationId)) return { ok: false, reason: 'That field upgrade is unavailable.' };
    const owned = state.progression.forageUpgrades[locationId] || [];
    if (owned.includes(upgradeId)) return { ok: false, reason: 'That field upgrade is already active.' };
    if (state.resources.coins < upgrade.cost) return { ok: false, reason: `You need ${upgrade.cost} crowns.` };
    state.resources.coins -= upgrade.cost;
    state.progression.forageUpgrades[locationId] = [...owned, upgradeId];
    gainExperience(state, 12);
    return { ok: true, location, upgrade };
  }

  function deliverHoney(state, amount) {
    const needed = Math.max(0, state.quota.target - state.quota.delivered);
    const delivered = Math.min(needed, state.resources.honey, amount == null ? needed : amount);
    if (delivered <= 0) return { ok: false, reason: needed <= 0 ? 'This year’s quota is already complete.' : 'There is no honey ready to deliver.' };
    state.resources.honey -= delivered;
    state.quota.delivered += delivered;
    const complete = state.quota.delivered >= state.quota.target;
    gainExperience(state, delivered + (complete ? 25 : 0));
    return { ok: true, amount: delivered, complete };
  }

  function sellHoney(state, amount) {
    const quantity = amount === 'all' ? Math.floor(state.resources.honey) : Math.min(Math.floor(state.resources.honey), Number(amount));
    if (!quantity) return { ok: false, reason: 'The vaults are empty.' };
    const smallBatchSale = state.workers <= 6 && state.seals.includes('smallBatch') ? .2 : 0;
    const salePrice = Math.min(MARKET_MAX_PRICE, Math.max(MARKET_MIN_PRICE, state.market.price));
    const earned = Math.round(quantity * salePrice * (1 + sealBonus(state, 'sale') + smallBatchSale));
    state.resources.honey -= quantity;
    state.resources.coins += earned;
    state.stats.honeySold += quantity;
    state.stats.coinsEarned += earned;
    state.stats.yearCoinsEarned += earned;
    return { ok: true, quantity, earned };
  }

  function raidStrength(state) {
    return (5 + (state.year - 1) * 8) * currentDifficulty(state).raid * currentBiome(state).raid;
  }

  function startRaid(state, random = Math.random) {
    const attack = raidStrength(state) * (.85 + random() * .3);
    state.flags.raidResolved = true;
    state.raid = { attack, startedAt: state.yearTime };
    return { type: 'raidStart', attack: Math.round(attack), year: state.year };
  }

  function raidDefense(state) {
    let guardStrength = 0;
    for (const cell of Object.values(state.cells)) {
      if (cell.type === 'guard') guardStrength += 18 * Math.pow(1.65, Math.max(0, (cell.level || 1) - 1));
    }
    return guardStrength * (1 + sealBonus(state, 'defense') + levelBonus(state, 'defense')) + state.workers * 1.25 * (1 + levelBonus(state, 'defense'));
  }

  function resolveRaid(state, strategy = 'focus') {
    if (!state.raid) return { ok: false, reason: 'No wasp swarm is attacking.' };
    let defense = raidDefense(state);
    let cost = 0;
    if (strategy === 'focus') defense *= 1.25;
    if (strategy === 'dodge') defense += 10;
    if (strategy === 'recall' && state.expedition) {
      defense += state.expedition.bees * 5;
      state.expedition = null;
    }
    if (strategy === 'hire') {
      cost = 75;
      if (state.resources.coins < cost) return { ok: false, reason: 'You need 75 crowns to hire bee-cenaries.' };
      state.resources.coins -= cost;
      defense += 22;
    }
    const attack = state.raid.attack;
    state.raid = null;
    if (defense >= attack) {
      gainExperience(state, 24);
      return { type: 'raid', victory: true, attack: Math.round(attack), defense: Math.round(defense), lost: 0 };
    }
    const gap = attack - defense;
    const lost = Math.min(state.workers - 1, Math.max(1, Math.ceil(gap / 8)));
    state.workers -= lost;
    state.lostWorkers += lost;
    state.stats.lost += lost;
    const queenFell = gap > 25 || state.workers <= 1 && gap > 10;
    if (queenFell) state.flags.gameOver = true;
    gainExperience(state, queenFell ? 0 : 8);
    return { type: 'raid', victory: false, attack: Math.round(attack), defense: Math.round(defense), lost, queenFell };
  }

  function step(state, seconds, random = Math.random) {
    if (state.flags.gameOver || seconds <= 0) return [];
    const events = [];
    const dt = Math.min(seconds, 1);
    const rates = productionRates(state);
    const winter = currentSeason(state).id === 'frost';
    const capacity = storageCapacity(state);

    state.resources.nectar += rates.nectar * dt;
    const converted = Math.min(state.resources.nectar, rates.processing * dt, Math.max(0, capacity - state.resources.honey));
    state.resources.nectar -= converted;
    state.resources.honey += converted;
    state.stats.honeyMade += converted;
    state.stats.yearHoneyMade += converted;
    if (!winter) state.resources.wax += (.025 + rates.availableWorkers * .005) * dt * currentBiome(state).wax;

    const broodEntries = Object.entries(state.cells).filter(([, cell]) => cell.type === 'brood');
    const workerCap = 4 + broodEntries.length * 3 + countCells(state, 'nursery') * 2;
    for (const [coordKey, cell] of broodEntries) {
      if (!cell.brood) cell.brood = { progress: state.broodProgress || 0, stage: broodStage(state.broodProgress || 0) };
      if (state.workers < workerCap) cell.brood.progress += (rates.hatch / Math.max(1, broodEntries.length)) * dt;
      cell.brood.stage = broodStage(Math.min(.99, cell.brood.progress));
      if (!winter && cell.brood.progress >= 1 && state.resources.nectar >= 8 && state.workers < workerCap) {
        cell.brood.progress -= 1;
        cell.brood.stage = 'egg';
        state.resources.nectar -= 8;
        state.workers += 1;
        state.stats.born += 1;
        gainExperience(state, 10);
        events.push({ type: 'hatch', coordKey });
      }
    }
    state.broodProgress = broodEntries.length ? Math.max(...broodEntries.map(([, cell]) => cell.brood?.progress || 0)) : 0;

    if (state.emergency?.remaining > 0) {
      state.emergency.remaining = Math.max(0, state.emergency.remaining - dt);
      if (state.emergency.remaining === 0) state.emergency.type = null;
    }

    if (state.expedition && !winter) {
      state.expedition.elapsed += dt;
      if (state.expedition.elapsed >= state.expedition.duration) events.push(resolveExpedition(state, random));
    }

    if (state.progression.scouting && !winter) {
      state.progression.scouting.elapsed += dt;
      if (state.progression.scouting.elapsed >= state.progression.scouting.duration) {
        const locationId = state.progression.scouting.locationId;
        if (!state.progression.discoveredLocations.includes(locationId)) state.progression.discoveredLocations.push(locationId);
        state.progression.scouting = null;
        gainExperience(state, 15);
        events.push({ type: 'scoutComplete', location: FORAGE_LOCATIONS.find(item => item.id === locationId) });
      }
    }

    const currentClimate = climate(state);
    if (countCells(state, 'honey') && currentClimate.humidity < 45) {
      state.hazards.dryness += dt;
      if (state.hazards.dryness >= 8 && !state.hazards.warned) {
        state.hazards.warned = true;
        events.push({ type: 'siloWarning', humidity: currentClimate.humidity });
      }
      if (state.hazards.dryness >= 20) {
        const vaultKey = Object.keys(state.cells).find(coordKey => state.cells[coordKey].type === 'honey');
        if (vaultKey) delete state.cells[vaultKey];
        const lostHoney = Math.min(10, Math.floor(state.resources.honey));
        state.resources.honey -= lostHoney;
        state.hazards = { dryness: 0, warned: false };
        events.push({ type: 'siloCollapse', coordKey: vaultKey, lostHoney });
      }
    } else {
      state.hazards.dryness = Math.max(0, state.hazards.dryness - dt * .75);
      if (state.hazards.dryness < 4) state.hazards.warned = false;
    }

    state.flags.storyTimer = (state.flags.storyTimer || 0) + dt;
    if (state.flags.storyTimer >= 34) {
      state.flags.storyTimer = 0;
      const stories = [
        'A worker opened a pollen café in Bluebell Woods and never clocked out.',
        'The night shift voted the east vault the cosiest corner of the comb.',
        'A scout returned with three petals and a very exaggerated story.',
        'The Queen declared today a formal wing-polishing holiday.'
      ];
      events.push({ type: 'story', text: stories[Math.floor(random() * stories.length)] });
    }

    state.market.timer += dt;
    if (state.market.timer >= 7.5) {
      state.market.timer -= 7.5;
      const before = state.market.price;
      updateMarket(state, random);
      events.push({ type: 'market', before, price: state.market.price });
      if (state.market.autoSell && state.market.price >= AUTO_SELL_PRICE) {
        const available = Math.max(0, Math.floor(state.resources.honey - state.market.reserve));
        if (available) {
          const sale = sellHoney(state, available);
          if (sale.ok) events.push({ type: 'autoSale', ...sale });
        }
      }
    }

    const seasonBefore = state.flags.seasonIndex || 0;
    state.yearTime += dt;
    const seasonAfter = Math.min(3, Math.floor((state.yearTime / YEAR_LENGTH) * 4));
    if (seasonAfter !== seasonBefore) {
      state.flags.seasonIndex = seasonAfter;
      events.push({ type: 'season', season: SEASONS[seasonAfter] });
    }
    if (!state.flags.raidResolved && state.yearTime >= YEAR_LENGTH * .62) events.push(startRaid(state, random));
    if (state.yearTime >= YEAR_LENGTH) {
      const success = state.quota.delivered >= state.quota.target;
      if (success && state.year >= 4 && state.workers <= 6 && !state.discoveries.includes('smallBatch')) {
        state.discoveries.push('smallBatch');
        events.push({ type: 'sealDiscovered', seal: UPGRADES.find(item => item.id === 'smallBatch') });
      }
      events.push({ type: 'yearEnd', success });
    }
    return events;
  }

  function upgradeChoices(state, reroll = state.flags.upgradeRerolls || 0) {
    const random = seededRandom(state.seed + state.year * 7919 + reroll * 104729);
    const available = UPGRADES.filter(item => state.seals.filter(id => id === item.id).length < 3 && (!item.requiresDiscovery || state.discoveries.includes(item.requiresDiscovery)));
    const pool = [...available];
    const result = [];
    while (result.length < 3 && pool.length) {
      const index = Math.floor(random() * pool.length);
      result.push(pool.splice(index, 1)[0]);
    }
    return result;
  }

  function rerollUpgrades(state) {
    const cost = 35 + (state.flags.upgradeRerolls || 0) * 15;
    if (state.resources.coins < cost) return { ok: false, reason: `You need ${cost} crowns to redraw the crests.` };
    state.resources.coins -= cost;
    state.flags.upgradeRerolls = (state.flags.upgradeRerolls || 0) + 1;
    return { ok: true, cost, choices: upgradeChoices(state) };
  }

  function chooseUpgradeAndAdvance(state, upgradeId) {
    if (!UPGRADES.some(item => item.id === upgradeId)) return { ok: false, reason: 'Unknown crest.' };
    if (state.quota.delivered < state.quota.target) return { ok: false, reason: 'The quota was not met.' };
    state.seals.push(upgradeId);
    state.stats.yearsCompleted += 1;
    state.year += 1;
    state.yearTime = 0;
    state.quota = { target: Math.round(BASE_QUOTA * Math.pow(1.72, state.year - 1) * currentDifficulty(state).quota * currentBiome(state).quota), delivered: 0 };
    state.flags.raidResolved = false;
    state.flags.seasonIndex = 0;
    state.flags.upgradeRerolls = 0;
    state.raid = null;
    state.hazards = { dryness: 0, warned: false };
    state.stats.born = 0;
    state.stats.lost = 0;
    state.stats.yearHoneyMade = 0;
    state.stats.yearCoinsEarned = 0;
    if (state.year === 3) state.radius = 3;
    state.resources.wax += 28 + state.year * 4;
    return { ok: true };
  }

  function markGameOver(state) { state.flags.gameOver = true; }

  function normalizeState(raw) {
    const fresh = createInitialState(raw?.seed || Date.now(), raw?.config || {});
    if (!raw || ![1, 2, 3, SAVE_VERSION].includes(raw.version)) return fresh;
    const merged = {
      ...fresh,
      ...raw,
      resources: { ...fresh.resources, ...raw.resources },
      quota: { ...fresh.quota, ...raw.quota },
      market: { ...fresh.market, ...raw.market },
      stats: { ...fresh.stats, ...raw.stats },
      flags: { ...fresh.flags, ...raw.flags },
      progression: {
        ...fresh.progression,
        ...(raw.progression || {}),
        forageUpgrades: { ...fresh.progression.forageUpgrades, ...(raw.progression?.forageUpgrades || {}) }
      },
      hazards: { ...fresh.hazards, ...(raw.hazards || {}) }
    };
    merged.version = SAVE_VERSION;
    merged.emergency = { ...fresh.emergency, ...(raw.emergency || {}) };
    for (const cell of Object.values(merged.cells)) {
      if (cell.type !== 'queen') cell.level = Math.max(1, cell.level || 1);
      if (cell.type === 'brood' && !cell.brood) cell.brood = { progress: raw.broodProgress || 0, stage: broodStage(raw.broodProgress || 0) };
    }
    merged.resources.honey = Number(merged.resources.honey) || 0;
    merged.market.price = Math.max(MARKET_MIN_PRICE, Math.min(MARKET_MAX_PRICE, Number(merged.market.price) || fresh.market.price));
    merged.market.history = (Array.isArray(merged.market.history) ? merged.market.history : fresh.market.history).map(price => Math.max(MARKET_MIN_PRICE, Math.min(MARKET_MAX_PRICE, Number(price) || fresh.market.price)));
    return merged;
  }

  return {
    YEAR_LENGTH, BASE_QUOTA, MARKET_MIN_PRICE, MARKET_MAX_PRICE, AUTO_SELL_PRICE, CELL_TYPES, UPGRADES, LEVEL_UPGRADES, FIELD_UPGRADES, FORAGE_LOCATIONS, BIOMES, DIFFICULTIES, SEASONS,
    key, parseKey, distance, axialCoordinates, neighbors, seededRandom,
    createInitialState, normalizeState, countCells, nectarPerGarden, adjacentCount, cellCost,
    canBuild, buildCell, demolishCell, upgradeCell, cellBonuses, climate, storageCapacity,
    productionRates, startExpedition, startScouting, upgradeForageLocation, deliverHoney, sellHoney, raidStrength, raidDefense, resolveRaid,
    step, upgradeChoices, rerollUpgrades, chooseUpgradeAndAdvance, markGameOver, sealBonus, levelBonus,
    gainExperience, levelUpgradeChoices, chooseLevelUpgrade, pheromoneRadius, pheromonePower,
    currentBiome, currentDifficulty, currentSeason, broodStage, feedBrood, emergencyAction
  };
});
