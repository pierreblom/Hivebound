const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../game-core.js');

test('initial colony has a Queen and a buildable first ring', () => {
  const state = Core.createInitialState(42);
  assert.equal(state.cells['0,0'].type, 'queen');
  assert.equal(Core.canBuild(state, '1,0', 'garden').ok, true);
  assert.equal(Core.canBuild(state, '2,0', 'garden').ok, false);
});

test('building spends wax and adjacency is recognized', () => {
  const state = Core.createInitialState(42);
  assert.equal(Core.buildCell(state, '1,0', 'processor').ok, true);
  assert.equal(Core.buildCell(state, '1,-1', 'honey').ok, true);
  assert.equal(state.resources.wax, 82);
  const bonuses = Core.cellBonuses(state, '1,0');
  assert.deepEqual(bonuses.map(item => item.value), [10, 12]);
});

test('a garden and refinery form a working economy', () => {
  const state = Core.createInitialState(42);
  Core.buildCell(state, '1,0', 'garden');
  Core.buildCell(state, '0,1', 'processor');
  Core.buildCell(state, '-1,1', 'honey');
  const beforeNectar = state.resources.nectar;
  for (let index = 0; index < 20; index += 1) Core.step(state, .5, () => .5);
  assert.ok(state.resources.honey > 0);
  assert.ok(state.stats.honeyMade > 0);
  assert.ok(state.resources.nectar < beforeNectar + 10);
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
  assert.equal(state.quota.target, 86);
});

test('market sales honor permanent trader crests', () => {
  const state = Core.createInitialState(42);
  state.resources.honey = 10;
  state.market.price = 10;
  state.seals.push('keenTraders');
  const result = Core.sellHoney(state, 10);
  assert.equal(result.earned, 118);
  assert.equal(state.resources.honey, 0);
});

test('expedition returns resources and can lose a worker', () => {
  const state = Core.createInitialState(42);
  state.workers = 6;
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
  Core.buildCell(hot, '1,-1', 'processor');
  Core.buildCell(hot, '0,-1', 'processor');
  const hotClimate = Core.climate(hot);

  const vented = structuredClone(hot);
  Core.buildCell(vented, '-1,0', 'vent');
  assert.ok(Core.climate(vented).temperature < hotClimate.temperature);
});

test('biomes and difficulty configure a new colony', () => {
  const state = Core.createInitialState(42, { biome: 'coast', difficulty: 'crown' });
  assert.equal(Core.currentBiome(state).name, 'Saltwind Coast');
  assert.equal(Core.currentDifficulty(state).name, 'Crown’s Trial');
  assert.equal(state.quota.target, 64);
  assert.ok(Core.climate(state).humidity > Core.climate(Core.createInitialState(42)).humidity);
});

test('seasons materially change nectar production', () => {
  const state = Core.createInitialState(42);
  Core.buildCell(state, '1,0', 'garden');
  state.yearTime = Core.YEAR_LENGTH * .3;
  const bloom = Core.productionRates(state).nectar;
  state.yearTime = Core.YEAR_LENGTH * .8;
  const frost = Core.productionRates(state).nectar;
  assert.equal(Core.currentSeason(state).id, 'frost');
  assert.ok(bloom > frost * 2);
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
  assert.equal(migrated.version, 2);
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
