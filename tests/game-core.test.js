const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../game-core.js');

test('initial colony matches the illustrated five-cell starter hive', () => {
  const state = Core.createInitialState(42);
  assert.equal(state.cells['0,0'].type, 'queen');
  assert.equal(state.cells['0,-1'].type, 'processor');
  assert.equal(state.cells['1,-1'].type, 'processor');
  assert.equal(state.cells['-1,0'].type, 'garden');
  assert.equal(state.cells['-1,1'].type, 'brood');
  assert.equal(state.cells['-1,1'].brood.stage, 'egg');
  assert.equal(Object.keys(state.cells).length, 5);
  assert.equal(state.quota.target, 10);
  assert.equal(Core.YEAR_LENGTH, 180);
  assert.equal(Core.canBuild(state, '1,0', 'garden').ok, true);
  assert.equal(Core.canBuild(state, '2,0', 'garden').ok, false);
});

test('building spends wax and adjacency is recognized', () => {
  const state = Core.createInitialState(42);
  assert.equal(Core.buildCell(state, '1,0', 'processor').ok, true);
  assert.equal(Core.buildCell(state, '0,1', 'honey').ok, true);
  assert.equal(state.resources.wax, 82);
  const bonuses = Core.cellBonuses(state, '1,0');
  assert.deepEqual(bonuses.map(item => item.value), [10, 12]);
});

test('a garden and refinery form a working economy', () => {
  const state = Core.createInitialState(42);
  const beforeNectar = state.resources.nectar;
  for (let index = 0; index < 20; index += 1) Core.step(state, .5, () => .5);
  assert.ok(state.resources.honey > 0);
  assert.ok(state.stats.honeyMade > 0);
  assert.ok(state.resources.nectar < beforeNectar + 10);
});

test('stored nectar is divided evenly across every garden', () => {
  const state = Core.createInitialState(42);
  state.resources.nectar = 100;
  assert.equal(Core.nectarPerGarden(state), 100);
  assert.equal(Core.buildCell(state, '1,0', 'garden').ok, true);
  assert.equal(Core.nectarPerGarden(state), 50);
});

test('honey cannot exceed vault capacity', () => {
  const state = Core.createInitialState(42);
  state.resources.nectar = 10000;
  Core.buildCell(state, '1,0', 'processor');
  for (let index = 0; index < 2000; index += 1) Core.step(state, .5, () => .5);
  assert.ok(state.resources.honey <= Core.storageCapacity(state));
});

test('delivering quota advances only after a crest is chosen', () => {
  const state = Core.createInitialState(42);
  state.resources.honey = 60;
  const delivery = Core.deliverHoney(state);
  assert.equal(delivery.complete, true);
  assert.equal(state.year, 1);
  assert.equal(Core.chooseUpgradeAndAdvance(state, 'goldenComb').ok, true);
  assert.equal(state.year, 2);
  assert.equal(state.seals[0], 'goldenComb');
  assert.equal(state.quota.target, 17);
});

test('market sales honor permanent trader crests', () => {
  const state = Core.createInitialState(42);
  state.resources.honey = 10;
  state.market.price = 10;
  state.seals.push('keenTraders');
  const result = Core.sellHoney(state, 10);
  assert.equal(result.earned, 94);
  assert.equal(state.resources.honey, 0);
});

test('expedition returns resources and can lose a worker', () => {
  const state = Core.createInitialState(42);
  state.workers = 6;
  state.progression.level = 7;
  state.progression.discoveredLocations.push('highland');
  const started = Core.startExpedition(state, 'highland');
  assert.equal(started.ok, true);
  const beforeWax = state.resources.wax;
  let events = [];
  for (let index = 0; index < 100; index += 1) events = events.concat(Core.step(state, .5, () => 0));
  assert.ok(events.some(event => event.type === 'expedition'));
  assert.ok(state.resources.wax > beforeWax);
  assert.equal(state.workers, 5);
});

test('climate ventilation offsets a busy refinery', () => {
  const hot = Core.createInitialState(42);
  Core.buildCell(hot, '1,0', 'processor');
  Core.buildCell(hot, '0,1', 'processor');
  const hotClimate = Core.climate(hot);

  const vented = structuredClone(hot);
  Core.buildCell(vented, '-2,1', 'vent');
  assert.ok(Core.climate(vented).temperature < hotClimate.temperature);
});

test('biomes and difficulty configure a new colony', () => {
  const state = Core.createInitialState(42, { biome: 'coast', difficulty: 'crown' });
  assert.equal(Core.currentBiome(state).name, 'Saltwind Coast');
  assert.equal(Core.currentDifficulty(state).name, 'Crown’s Trial');
  assert.equal(state.quota.target, 15);
  assert.ok(Core.climate(state).humidity > Core.climate(Core.createInitialState(42)).humidity);
});

test('biomes form an increasingly difficult level-unlock chain', () => {
  assert.deepEqual(Core.BIOMES.coast.unlock, { biome: 'sunmeadow', level: 25 });
  assert.deepEqual(Core.BIOMES.orchard.unlock, { biome: 'coast', level: 50 });
  assert.deepEqual(Core.BIOMES.highland.unlock, { biome: 'orchard', level: 75 });
  const sequence = Object.values(Core.BIOMES);
  for (let index = 1; index < sequence.length; index += 1) {
    assert.ok(sequence[index].quota > sequence[index - 1].quota);
    assert.ok(sequence[index].raid > sequence[index - 1].raid);
    assert.ok(sequence[index].nectar < sequence[index - 1].nectar);
  }
});

test('the honey market quote never exceeds eight crowns per jar', () => {
  const state = Core.createInitialState(42);
  state.resources.honey = 10;
  state.market.price = 20;
  assert.equal(Core.sellHoney(state, 10).earned, 80);

  const old = Core.createInitialState(43);
  old.market.price = 19;
  old.market.history = [5, 12, 20];
  const migrated = Core.normalizeState(old);
  assert.equal(migrated.market.price, 8);
  assert.deepEqual(migrated.market.history, [5, 8, 8]);

  migrated.market.price = 8;
  migrated.market.timer = 7.5;
  Core.step(migrated, .5, () => 1);
  assert.ok(migrated.market.price <= 8);
});

test('seasons materially change nectar production', () => {
  const state = Core.createInitialState(42);
  Core.buildCell(state, '1,0', 'garden');
  state.yearTime = Core.YEAR_LENGTH * .3;
  const bloom = Core.productionRates(state).nectar;
  state.yearTime = Core.YEAR_LENGTH * .8;
  const frost = Core.productionRates(state).nectar;
  assert.equal(Core.currentSeason(state).id, 'frost');
  assert.ok(bloom > 0);
  assert.equal(frost, 0);
});

test('all hive work and forage progress stop during Long Frost', () => {
  const state = Core.createInitialState(42);
  state.workers = 6;
  assert.equal(Core.startExpedition(state, 'clover', 1).ok, true);
  state.yearTime = Core.YEAR_LENGTH * .76;
  const before = {
    nectar: state.resources.nectar,
    honey: state.resources.honey,
    wax: state.resources.wax,
    brood: state.cells['-1,1'].brood.progress,
    expedition: state.expedition.elapsed
  };
  Core.step(state, 1, () => .5);
  assert.equal(state.resources.nectar, before.nectar);
  assert.equal(state.resources.honey, before.honey);
  assert.equal(state.resources.wax, before.wax);
  assert.equal(state.cells['-1,1'].brood.progress, before.brood);
  assert.equal(state.expedition.elapsed, before.expedition);

  const resting = Core.createInitialState(43);
  resting.yearTime = Core.YEAR_LENGTH * .76;
  assert.equal(Core.startExpedition(resting, 'clover', 1).ok, false);
});

test('wasps attack once in every year, including year one', () => {
  const state = Core.createInitialState(42);
  state.yearTime = Core.YEAR_LENGTH * .62 - .1;
  const firstEvents = Core.step(state, .2, () => .5);
  assert.equal(firstEvents.filter(event => event.type === 'raidStart').length, 1);
  assert.equal(state.flags.raidResolved, true);
  assert.ok(state.raid);
  const outcome = Core.resolveRaid(state, 'focus');
  assert.equal(outcome.type, 'raid');
  assert.ok(Core.raidStrength(state) > 0);
  const laterEvents = Core.step(state, 1, () => .5);
  assert.equal(laterEvents.filter(event => event.type === 'raid').length, 0);
});

test('emergency climate actions spend crowns and alter conditions', () => {
  const state = Core.createInitialState(42);
  const before = Core.climate(state).temperature;
  const action = Core.emergencyAction(state, 'warm');
  assert.equal(action.ok, true);
  assert.equal(state.resources.coins, 62);
  assert.equal(Core.climate(state).temperature, before + 7);
  for (let index = 0; index < 30; index += 1) Core.step(state, .5, () => .5);
  assert.equal(state.emergency.type, null);
});

test('feeding an individual brood cell advances its life stage', () => {
  const state = Core.createInitialState(42);
  Core.buildCell(state, '1,0', 'brood');
  state.resources.honey = 4;
  const result = Core.feedBrood(state, '1,0', 3);
  assert.equal(result.ok, true);
  assert.equal(result.stage, 'larva');
  assert.equal(state.resources.honey, 1);
  assert.equal(state.cells['1,0'].brood.progress, .48);
});

test('a larger forage crew returns sooner and carries more', () => {
  const small = Core.createInitialState(42);
  small.workers = 6;
  Core.startExpedition(small, 'clover', 1);
  const smallDuration = small.expedition.duration;

  const large = Core.createInitialState(42);
  large.workers = 6;
  Core.startExpedition(large, 'clover', 4);
  assert.ok(large.expedition.duration < smallDuration);
  for (let index = 0; index < 100; index += 1) Core.step(large, .5, () => .5);
  assert.ok(large.resources.nectar > small.resources.nectar + 60);
});

test('royal crest rerolls cost progressively more', () => {
  const state = Core.createInitialState(42);
  const first = Core.rerollUpgrades(state);
  const second = Core.rerollUpgrades(state);
  assert.equal(first.cost, 35);
  assert.equal(second.cost, 50);
  assert.equal(state.flags.upgradeRerolls, 2);
  assert.notDeepEqual(first.choices.map(item => item.id), second.choices.map(item => item.id));
});

test('version one saves migrate with brood lifecycle data', () => {
  const old = Core.createInitialState(42);
  old.version = 1;
  Core.buildCell(old, '1,0', 'brood');
  delete old.cells['1,0'].brood;
  old.broodProgress = .5;
  const migrated = Core.normalizeState(old);
  assert.equal(migrated.version, 4);
  assert.equal(migrated.cells['1,0'].brood.stage, 'larva');
});

test('standing market orders keep the configured honey reserve', () => {
  const state = Core.createInitialState(42);
  state.resources.honey = 30;
  state.market.price = 20;
  state.market.timer = 7.5;
  state.market.autoSell = true;
  state.market.reserve = 10;
  const events = Core.step(state, .5, () => .5);
  assert.ok(events.some(event => event.type === 'autoSale'));
  assert.equal(Math.floor(state.resources.honey), 10);
  assert.ok(state.resources.coins > 90);
});

test('experience levels offer permanent two-choice rewards', () => {
  const state = Core.createInitialState(42);
  assert.equal(Core.gainExperience(state, 65), 1);
  assert.equal(state.progression.level, 2);
  assert.equal(state.progression.pendingLevels, 1);
  const choices = Core.levelUpgradeChoices(state);
  assert.equal(choices.length, 2);
  const result = Core.chooseLevelUpgrade(state, choices[0].id);
  assert.equal(result.ok, true);
  assert.equal(state.progression.pendingLevels, 0);
  assert.ok(state.progression.upgrades.includes(choices[0].id));
});

test('individual hive cells can be upgraded to multiply their output', () => {
  const state = Core.createInitialState(42);
  state.resources.coins = 500;
  const before = Core.productionRates(state).processing;
  assert.equal(Core.upgradeCell(state, '0,-1').ok, true);
  assert.equal(state.cells['0,-1'].level, 2);
  assert.ok(Core.productionRates(state).processing > before * 1.35);
});

test('new forage locations require levels and scouting', () => {
  const state = Core.createInitialState(42);
  state.resources.coins = 500;
  assert.equal(Core.startExpedition(state, 'orchard', 1).ok, false);
  assert.equal(Core.startScouting(state, 'orchard').ok, false);
  state.progression.level = 2;
  assert.equal(Core.startScouting(state, 'orchard').ok, true);
  for (let index = 0; index < 40; index += 1) Core.step(state, .5, () => .5);
  assert.ok(state.progression.discoveredLocations.includes('orchard'));
  assert.equal(Core.startExpedition(state, 'orchard', 1).ok, true);
});

test('queen pheromone rewards expand range and production power', () => {
  const state = Core.createInitialState(42);
  const before = Core.productionRates(state).processing;
  state.progression.upgrades.push('pheromonePower', 'pheromoneArea');
  assert.equal(Core.pheromoneRadius(state), 2);
  assert.ok(Core.pheromonePower(state) > .2);
  assert.ok(Core.productionRates(state).processing > before);
});

test('field improvements cost crowns and modify expeditions', () => {
  const state = Core.createInitialState(42);
  state.resources.coins = 500;
  const before = state.resources.coins;
  const result = Core.upgradeForageLocation(state, 'clover', 'flightpath');
  assert.equal(result.ok, true);
  assert.equal(state.resources.coins, before - Core.FIELD_UPGRADES.flightpath.cost);
  Core.startExpedition(state, 'clover', 1);
  assert.ok(state.expedition.duration < Core.FORAGE_LOCATIONS[0].duration);
});
