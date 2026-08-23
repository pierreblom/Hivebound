(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HiveCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const YEAR_LENGTH = 90;
  const SAVE_VERSION = 2;

  const BIOMES = {
    sunmeadow: { id: 'sunmeadow', name: 'Sunmeadow Vale', icon: '✿', tagline: 'Balanced seasons and generous wildflowers.', temperature: 0, humidity: 0, nectar: 1, wax: 1, color: '#8fba67' },
    coast: { id: 'coast', name: 'Saltwind Coast', icon: '≈', tagline: 'Cool air, heavy moisture, and rich sea lavender.', temperature: -2.5, humidity: 10, nectar: 1.08, wax: .9, color: '#75a9b5' },
    orchard: { id: 'orchard', name: 'Cider Orchard', icon: '●', tagline: 'Abundant blossom with hotter harvest seasons.', temperature: 1.8, humidity: 5, nectar: 1.18, wax: .92, color: '#c97855' },
    highland: { id: 'highland', name: 'Thistle Highlands', icon: '▲', tagline: 'Cold thin air, scarce nectar, and plentiful wax.', temperature: -4, humidity: -7, nectar: .86, wax: 1.28, color: '#7b7f9c' }
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
    { id: 'fieldLore', name: 'Field lore', icon: '✿', rarity: 'common', description: 'Foraging brings home 25% more nectar and wax.', effect: { forageYield: .25 } }
  ];

  const FORAGE_LOCATIONS = [
    { id: 'clover', name: 'Clover Bank', icon: '♧', description: 'A sheltered green close to home.', duration: 18, risk: .02, nectar: 42, wax: 12, bees: 1, cost: 0 },
    { id: 'orchard', name: 'Sunwarm Orchard', icon: '●', description: 'Heavy blossom and unpredictable farm birds.', duration: 30, risk: .09, nectar: 92, wax: 25, bees: 2, cost: 8 },
    { id: 'highland', name: 'Lavender Heights', icon: '▲', description: 'Rare nectar beyond the cold ridge.', duration: 44, risk: .18, nectar: 175, wax: 48, bees: 3, cost: 18 }
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
      quota: { target: Math.round(50 * difficulty.quota), delivered: 0 },
      workers: 4,
      lostWorkers: 0,
      cells: { '0,0': { type: 'queen', builtAt: 0 } },
      seals: [],
      market: { price: 12.4, history: [9.8, 10.7, 10.2, 11.5, 10.9, 11.7, 12.4], timer: 0, autoSell: false, reserve: 10 },
      broodProgress: 0,
      expedition: null,
      emergency: { type: null, remaining: 0 },
      stats: { honeyMade: 0, honeySold: 0, coinsEarned: 0, cellsBuilt: 0, yearsCompleted: 0, born: 0, lost: 0, yearHoneyMade: 0, yearCoinsEarned: 0 },
      flags: { raidResolved: false, tutorialStep: 0, gameOver: false, seasonIndex: 0, upgradeRerolls: 0 }
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

  function countCells(state, type) {
    return Object.values(state.cells).filter(cell => cell.type === type).length;
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
    state.cells[coordKey] = { type, builtAt: state.yearTime };
    if (type === 'brood') state.cells[coordKey].brood = { progress: 0, stage: 'egg' };
    state.stats.cellsBuilt += 1;
    return { ok: true, cost: check.cost, bonuses: cellBonuses(state, coordKey) };
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
    const humidity = 56 + biome.humidity + season.humidity + emergencyHumidity + gardens * 2.4 + brood * .7 - vents * 1.7;
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
      capacity += 110 * (1 + adjacentCount(state, coordKey, 'honey') * .12);
    }
    return Math.round(capacity * (1 + sealBonus(state, 'storage')));
  }

  function productionRates(state) {
    const conditions = climate(state);
    const away = state.expedition ? state.expedition.bees : 0;
    const availableWorkers = Math.max(0, state.workers - away);
    const workerFactor = Math.min(1, availableWorkers / Math.max(2, Object.keys(state.cells).length * .42));
    const biome = currentBiome(state);
    const season = currentSeason(state);
    const rally = state.emergency?.type === 'rally' ? 1.45 : 1;
    let nectar = .08;
    let processing = 0;
    let hatch = 0;
    for (const [coordKey, cell] of Object.entries(state.cells)) {
      const bonus = cellBonuses(state, coordKey).reduce((sum, item) => sum + item.value, 0) / 100;
      if (cell.type === 'garden') nectar += .42 * (1 + bonus);
      if (cell.type === 'processor') processing += .34 * (1 + bonus + sealBonus(state, 'production'));
      if (cell.type === 'brood') hatch += .006 * (1 + bonus + sealBonus(state, 'hatchSpeed'));
    }
    const common = conditions.efficiency * (.55 + .45 * workerFactor);
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
    const pull = (12 - previous) * .16;
    const seasonal = Math.sin((state.yearTime / YEAR_LENGTH) * Math.PI * 2 + state.year) * .7;
    const shock = (random() - .5) * 3.7;
    state.market.price = Math.max(5.5, Math.min(22, Math.round((previous + pull + seasonal + shock) * 10) / 10));
    state.market.history.push(state.market.price);
    if (state.market.history.length > 18) state.market.history.shift();
  }

  function resolveExpedition(state, random) {
    const location = FORAGE_LOCATIONS.find(item => item.id === state.expedition.locationId);
    const lost = random() < location.risk ? 1 : 0;
    const extraCrew = Math.max(0, state.expedition.bees - (state.expedition.baseBees || location.bees));
    const yieldBonus = (1 + sealBonus(state, 'forageYield')) * (1 + extraCrew * .28);
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
    return { type: 'expedition', location, nectar, wax, lost };
  }

  function startExpedition(state, locationId, requestedCrew) {
    if (state.expedition) return { ok: false, reason: 'A swarm is already in the field.' };
    const location = FORAGE_LOCATIONS.find(item => item.id === locationId);
    if (!location) return { ok: false, reason: 'Unknown meadow.' };
    const crew = Math.max(location.bees, Math.min(4, Number(requestedCrew) || location.bees));
    if (state.workers < crew + 1) return { ok: false, reason: `Keep the Queen safe; you need ${crew + 1} workers.` };
    if (state.resources.coins < location.cost) return { ok: false, reason: `You need ${location.cost} crowns for supplies.` };
    state.resources.coins -= location.cost;
    const duration = location.duration * (1 - Math.min(.65, sealBonus(state, 'forageSpeed'))) / (1 + (crew - location.bees) * .16);
    state.expedition = { locationId, bees: crew, baseBees: location.bees, elapsed: 0, duration };
    return { ok: true, location, duration, crew };
  }

  function deliverHoney(state, amount) {
    const needed = Math.max(0, state.quota.target - state.quota.delivered);
    const delivered = Math.min(needed, state.resources.honey, amount == null ? needed : amount);
    if (delivered <= 0) return { ok: false, reason: needed <= 0 ? 'This year’s quota is already complete.' : 'There is no honey ready to deliver.' };
    state.resources.honey -= delivered;
    state.quota.delivered += delivered;
    return { ok: true, amount: delivered, complete: state.quota.delivered >= state.quota.target };
  }

  function sellHoney(state, amount) {
    const quantity = amount === 'all' ? Math.floor(state.resources.honey) : Math.min(Math.floor(state.resources.honey), Number(amount));
    if (!quantity) return { ok: false, reason: 'The vaults are empty.' };
    const earned = Math.round(quantity * state.market.price * (1 + sealBonus(state, 'sale')));
    state.resources.honey -= quantity;
    state.resources.coins += earned;
    state.stats.honeySold += quantity;
    state.stats.coinsEarned += earned;
    state.stats.yearCoinsEarned += earned;
    return { ok: true, quantity, earned };
  }

  function raidStrength(state) {
    return state.year < 3 ? 0 : (10 + (state.year - 3) * 9) * currentDifficulty(state).raid;
  }

  function resolveRaid(state, random) {
    const attack = raidStrength(state) * (.85 + random() * .3);
    const defense = countCells(state, 'guard') * 18 * (1 + sealBonus(state, 'defense')) + state.workers * 1.25;
    state.flags.raidResolved = true;
    if (defense >= attack) return { type: 'raid', victory: true, attack: Math.round(attack), defense: Math.round(defense), lost: 0 };
    const gap = attack - defense;
    const lost = Math.min(state.workers - 1, Math.max(1, Math.ceil(gap / 8)));
    state.workers -= lost;
    state.lostWorkers += lost;
    state.stats.lost += lost;
    const queenFell = gap > 25 || state.workers <= 1 && gap > 10;
    if (queenFell) state.flags.gameOver = true;
    return { type: 'raid', victory: false, attack: Math.round(attack), defense: Math.round(defense), lost, queenFell };
  }

  function step(state, seconds, random = Math.random) {
    if (state.flags.gameOver || seconds <= 0) return [];
    const events = [];
    const dt = Math.min(seconds, 1);
    const rates = productionRates(state);
    const capacity = storageCapacity(state);

    state.resources.nectar += rates.nectar * dt;
    const converted = Math.min(state.resources.nectar, rates.processing * dt, Math.max(0, capacity - state.resources.honey));
    state.resources.nectar -= converted;
    state.resources.honey += converted;
    state.stats.honeyMade += converted;
    state.stats.yearHoneyMade += converted;
    state.resources.wax += (.025 + rates.availableWorkers * .005) * dt * currentBiome(state).wax;

    const broodEntries = Object.entries(state.cells).filter(([, cell]) => cell.type === 'brood');
    const workerCap = 4 + broodEntries.length * 3 + countCells(state, 'nursery') * 2;
    for (const [coordKey, cell] of broodEntries) {
      if (!cell.brood) cell.brood = { progress: state.broodProgress || 0, stage: broodStage(state.broodProgress || 0) };
      if (state.workers < workerCap) cell.brood.progress += (rates.hatch / Math.max(1, broodEntries.length)) * dt;
      cell.brood.stage = broodStage(Math.min(.99, cell.brood.progress));
      if (cell.brood.progress >= 1 && state.resources.nectar >= 8 && state.workers < workerCap) {
        cell.brood.progress -= 1;
        cell.brood.stage = 'egg';
        state.resources.nectar -= 8;
        state.workers += 1;
        state.stats.born += 1;
        events.push({ type: 'hatch', coordKey });
      }
    }
    state.broodProgress = broodEntries.length ? Math.max(...broodEntries.map(([, cell]) => cell.brood?.progress || 0)) : 0;

    if (state.emergency?.remaining > 0) {
      state.emergency.remaining = Math.max(0, state.emergency.remaining - dt);
      if (state.emergency.remaining === 0) state.emergency.type = null;
    }

    if (state.expedition) {
      state.expedition.elapsed += dt;
      if (state.expedition.elapsed >= state.expedition.duration) events.push(resolveExpedition(state, random));
    }

    state.market.timer += dt;
    if (state.market.timer >= 7.5) {
      state.market.timer -= 7.5;
      const before = state.market.price;
      updateMarket(state, random);
      events.push({ type: 'market', before, price: state.market.price });
      if (state.market.autoSell && state.market.price >= 16) {
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
    if (state.year >= 3 && !state.flags.raidResolved && state.yearTime >= YEAR_LENGTH * .62) events.push(resolveRaid(state, random));
    if (state.yearTime >= YEAR_LENGTH) events.push({ type: 'yearEnd', success: state.quota.delivered >= state.quota.target });
    return events;
  }

  function upgradeChoices(state, reroll = state.flags.upgradeRerolls || 0) {
    const random = seededRandom(state.seed + state.year * 7919 + reroll * 104729);
    const available = UPGRADES.filter(item => state.seals.filter(id => id === item.id).length < 3);
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
    state.quota = { target: Math.round(50 * Math.pow(1.72, state.year - 1) * currentDifficulty(state).quota), delivered: 0 };
    state.flags.raidResolved = false;
    state.flags.seasonIndex = 0;
    state.flags.upgradeRerolls = 0;
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
    if (!raw || ![1, SAVE_VERSION].includes(raw.version)) return fresh;
    const merged = {
      ...fresh,
      ...raw,
      resources: { ...fresh.resources, ...raw.resources },
      quota: { ...fresh.quota, ...raw.quota },
      market: { ...fresh.market, ...raw.market },
      stats: { ...fresh.stats, ...raw.stats },
      flags: { ...fresh.flags, ...raw.flags }
    };
    merged.version = SAVE_VERSION;
    merged.emergency = { ...fresh.emergency, ...(raw.emergency || {}) };
    for (const cell of Object.values(merged.cells)) {
      if (cell.type === 'brood' && !cell.brood) cell.brood = { progress: raw.broodProgress || 0, stage: broodStage(raw.broodProgress || 0) };
    }
    merged.resources.honey = Number(merged.resources.honey) || 0;
    return merged;
  }

  return {
    YEAR_LENGTH, CELL_TYPES, UPGRADES, FORAGE_LOCATIONS, BIOMES, DIFFICULTIES, SEASONS,
    key, parseKey, distance, axialCoordinates, neighbors, seededRandom,
    createInitialState, normalizeState, countCells, adjacentCount, cellCost,
    canBuild, buildCell, demolishCell, cellBonuses, climate, storageCapacity,
    productionRates, startExpedition, deliverHoney, sellHoney, raidStrength,
    step, upgradeChoices, rerollUpgrades, chooseUpgradeAndAdvance, markGameOver, sealBonus,
    currentBiome, currentDifficulty, currentSeason, broodStage, feedBrood, emergencyAction
  };
});
