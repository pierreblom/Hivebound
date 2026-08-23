(function () {
  'use strict';

  const Core = window.HiveCore;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SAVE_KEY = 'hivebound-save-v1';
  const CENTER = { x: 430, y: 335 };
  const HEX_SIZE = 53;
  const elements = Object.fromEntries([
    'waxValue', 'nectarValue', 'honeyValue', 'coinValue', 'yearLabel', 'daysLabel', 'yearProgress',
    'pauseButton', 'gridLayer', 'bonusLayer', 'beeLayer', 'workerValue', 'temperatureValue',
    'temperatureBar', 'humidityValue', 'humidityBar', 'airValue', 'airBar', 'climateStatus',
    'efficiencyValue', 'quotaTitle', 'quotaCurrent', 'quotaTarget', 'quotaProgress', 'deliverButton',
    'marketPrice', 'marketTrend', 'marketLine', 'marketArea', 'activeExpedition', 'sealList', 'sealCount',
    'buildOptions', 'cancelBuild', 'selectionCard', 'selectionIcon', 'selectionType', 'selectionName',
    'selectionDescription', 'selectionStats', 'demolishButton', 'closeSelection', 'toast', 'eventIcon', 'eventTitle',
    'eventText', 'welcomeModal', 'newGameButton', 'continueButton', 'forageModal', 'forageChoices',
    'yearModal', 'yearModalTitle', 'yearModalText', 'yearStats', 'upgradeChoices', 'gameOverModal',
    'gameOverTitle', 'gameOverText', 'finalStats', 'restartButton', 'hiveSvg', 'stageTitle',
    'zoomIn', 'zoomOut', 'zoomReset', 'menuButton', 'seasonButton', 'seasonIcon', 'seasonName',
    'seasonEffect', 'climateToolsButton', 'emergencyStatus', 'tendBroodButton', 'autoSellToggle',
    'reserveInput', 'workerOfYear', 'workerCitation', 'rerollUpgrades', 'rerollCost', 'broodModal',
    'broodStageIcon', 'broodStageName', 'broodStageText', 'broodProgressBar', 'broodTime',
    'climateModal', 'setupModal', 'biomeChoices', 'difficultyChoices', 'startConfiguredGame',
    'menuModal', 'resumeGame', 'saveGameButton', 'newColonyMenu', 'showCrests', 'soundToggle',
    'motionToggle', 'hintsToggle', 'menuBiomeIcon', 'menuRunIdentity', 'crestsModal',
    'archiveProgress', 'crestArchive', 'openMarketButton', 'marketModal', 'mobileMarketPrice',
    'mobileMarketTrend', 'mobileMarketArea',
    'mobileMarketLine', 'mobileAutoSellToggle', 'mobileReserveInput', 'seasonTimelineButton',
    'seasonTimelineMarker', 'seasonTimelineLabel'
  ].map(id => [id, document.getElementById(id)]));

  let state = Core.createInitialState();
  let paused = true;
  let speed = 1;
  let selectedBuild = null;
  let selectedCell = null;
  let waitingForYear = false;
  let lastFrame = performance.now();
  let lastRender = 0;
  let lastSave = 0;
  let toastTimer = null;
  let zoom = 1;
  let visualTime = 0;
  let beeVisuals = [];
  let selectedBiome = 'sunmeadow';
  let selectedDifficulty = 'worker';
  let broodCoord = null;
  const forageCrew = {};
  let settings = { sound: true, reducedMotion: false, hints: true };
  const random = Math.random;

  const number = value => Math.max(0, Math.floor(value)).toLocaleString('en-ZA');
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const svg = (tag, attrs = {}) => {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
    return node;
  };

  function hexCenter(q, r) {
    return {
      x: CENTER.x + HEX_SIZE * Math.sqrt(3) * (q + r / 2),
      y: CENTER.y + HEX_SIZE * 1.5 * r
    };
  }

  function hexPoints(x, y, size = HEX_SIZE - 3) {
    return Array.from({ length: 6 }, (_, i) => {
      const angle = Math.PI / 180 * (60 * i - 30);
      return `${x + size * Math.cos(angle)},${y + size * Math.sin(angle)}`;
    }).join(' ');
  }

  function setTransform() {
    const value = `translate(${CENTER.x} ${CENTER.y}) scale(${zoom}) translate(${-CENTER.x} ${-CENTER.y})`;
    elements.gridLayer.setAttribute('transform', value);
    elements.bonusLayer.setAttribute('transform', value);
    elements.beeLayer.setAttribute('transform', value);
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    toastTimer = setTimeout(() => elements.toast.classList.remove('show'), 2600);
  }

  function report(icon, title, text) {
    elements.eventIcon.textContent = icon;
    elements.eventTitle.textContent = title;
    elements.eventText.textContent = text;
  }

  function tone(frequency = 520, duration = .07) {
    if (!settings.sound) return;
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      const context = tone.context || (tone.context = new Context());
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.035, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
    } catch (_) { /* Audio is an optional flourish. */ }
  }

  function saveGame() {
    if (!state.flags.gameOver) localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  function loadGame() {
    try { return Core.normalizeState(JSON.parse(localStorage.getItem(SAVE_KEY))); }
    catch (_) { return null; }
  }

  function saveSettings() {
    localStorage.setItem('hivebound-settings-v1', JSON.stringify(settings));
    document.body.classList.toggle('reduced-motion', settings.reducedMotion);
  }

  function loadSettings() {
    try { settings = { ...settings, ...JSON.parse(localStorage.getItem('hivebound-settings-v1')) }; } catch (_) { /* Use defaults. */ }
    document.body.classList.toggle('reduced-motion', settings.reducedMotion);
  }

  function resetGame(options = {}) {
    state = Core.createInitialState(Date.now(), { biome: options.biome || selectedBiome, difficulty: options.difficulty || selectedDifficulty });
    selectedBuild = null;
    selectedCell = null;
    waitingForYear = false;
    paused = false;
    speed = 1;
    elements.beeLayer.innerHTML = '';
    beeVisuals = [];
    document.querySelectorAll('.speed-button').forEach(button => button.classList.toggle('active', button.dataset.speed === '1'));
    elements.pauseButton.textContent = 'Ⅱ';
    elements.pauseButton.classList.add('active');
    closeAllModals();
    report('☀', 'A gentle beginning', 'Build a garden first, then connect a refinery and a honey vault.');
    renderBoard();
    render(true);
    if (settings.hints) showToast('Choose a Nectar Garden below, then place it beside the Queen.');
  }

  function openSetup() {
    selectedBiome = state.config?.biome || 'sunmeadow';
    selectedDifficulty = state.config?.difficulty || 'worker';
    renderSetupChoices();
    closeAllModals();
    elements.setupModal.classList.add('visible');
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(modal => modal.classList.remove('visible'));
  }

  function renderSetupChoices() {
    elements.biomeChoices.innerHTML = Object.values(Core.BIOMES).map(biome => `<button class="setup-choice${selectedBiome === biome.id ? ' selected' : ''}" data-biome="${biome.id}"><span style="color:${biome.color}">${biome.icon}</span><b>${biome.name}</b><small>${biome.tagline}</small></button>`).join('');
    elements.difficultyChoices.innerHTML = Object.values(Core.DIFFICULTIES).map(difficulty => `<button class="setup-choice${selectedDifficulty === difficulty.id ? ' selected' : ''}" data-difficulty="${difficulty.id}"><span>${difficulty.icon}</span><b>${difficulty.name}</b><small>${difficulty.description}</small></button>`).join('');
    elements.biomeChoices.querySelectorAll('[data-biome]').forEach(button => button.addEventListener('click', () => { selectedBiome = button.dataset.biome; renderSetupChoices(); }));
    elements.difficultyChoices.querySelectorAll('[data-difficulty]').forEach(button => button.addEventListener('click', () => { selectedDifficulty = button.dataset.difficulty; renderSetupChoices(); }));
  }

  function renderCrestArchive() {
    const discovered = new Set(state.seals);
    elements.archiveProgress.textContent = `${discovered.size} / ${Core.UPGRADES.length} discovered`;
    elements.crestArchive.innerHTML = Core.UPGRADES.map(upgrade => `<article class="archive-crest${discovered.has(upgrade.id) ? '' : ' locked'}"><span class="seal-token">${discovered.has(upgrade.id) ? upgrade.icon : '?'}</span><h3>${discovered.has(upgrade.id) ? upgrade.name : 'Undiscovered crest'}</h3><p>${discovered.has(upgrade.id) ? upgrade.description : 'Complete more years to reveal this royal modifier.'}</p><span class="rarity ${upgrade.rarity}">${upgrade.rarity}</span></article>`).join('');
  }

  function renderMenuIdentity() {
    const biome = Core.currentBiome(state);
    const difficulty = Core.currentDifficulty(state);
    elements.menuBiomeIcon.textContent = biome.icon;
    elements.menuRunIdentity.textContent = `${biome.name} • ${difficulty.name}`;
    elements.soundToggle.checked = settings.sound;
    elements.motionToggle.checked = settings.reducedMotion;
    elements.hintsToggle.checked = settings.hints;
  }

  function renderBuildOptions() {
    const types = ['garden', 'processor', 'honey', 'brood', 'vent', 'guard'];
    elements.buildOptions.innerHTML = '';
    types.forEach(type => {
      const definition = Core.CELL_TYPES[type];
      const cost = Core.cellCost(state, type);
      const button = document.createElement('button');
      button.className = `build-option${selectedBuild === type ? ' selected' : ''}${state.resources.wax < cost ? ' unaffordable' : ''}`;
      button.dataset.type = type;
      button.title = definition.description;
      button.innerHTML = `<span class="build-icon" style="background:${definition.color}">${definition.icon}</span><b>${definition.short}</b><small>${cost} wax</small><em>${type === 'guard' && state.year < 3 ? 'RAIDS Y3' : ''}</em>`;
      button.addEventListener('click', () => {
        selectedBuild = selectedBuild === type ? null : type;
        selectedCell = null;
        elements.selectionCard.classList.add('hidden');
        elements.cancelBuild.classList.toggle('hidden', !selectedBuild);
        renderBuildOptions();
        renderBoard();
        if (selectedBuild) showToast(`${definition.name} selected — choose a glowing empty hex.`);
      });
      elements.buildOptions.appendChild(button);
    });
  }

  function renderBoard() {
    elements.gridLayer.innerHTML = '';
    elements.bonusLayer.innerHTML = '';
    const visibleRadius = Math.min(3, state.radius + 1);
    const coords = Core.axialCoordinates(visibleRadius).sort((a, b) => Core.distance(a.q, a.r) - Core.distance(b.q, b.r));
    coords.forEach(({ q, r }) => {
      const coordKey = Core.key(q, r);
      const cell = state.cells[coordKey];
      const locked = Core.distance(q, r) > state.radius;
      const center = hexCenter(q, r);
      const group = svg('g', { class: `hex-cell ${cell ? `cell-${cell.type}` : 'empty'}${locked ? ' blocked' : ''}${selectedCell === coordKey ? ' selected' : ''}${selectedBuild && !cell && !locked && Core.canBuild(state, coordKey, selectedBuild).ok ? ' buildable' : ''}`, 'data-key': coordKey });
      const shape = svg('polygon', { class: 'hex-shape', points: hexPoints(center.x, center.y), filter: cell ? 'url(#cellShadow)' : '' });
      group.appendChild(shape);

      if (cell) {
        const definition = Core.CELL_TYPES[cell.type];
        if (cell.type === 'queen') {
          group.appendChild(svg('image', { class: 'cell-picture queen-picture', href: 'assets/hive/queen-bee.svg', x: center.x - 34, y: center.y - 42, width: 68, height: 68 }));
          const label = svg('text', { class: 'cell-label picture-label', x: center.x, y: center.y + 35 });
          label.textContent = 'QUEEN';
          group.appendChild(label);
        } else if (cell.type === 'garden') {
          const count = svg('text', { class: 'cell-resource-count', x: center.x, y: center.y - 17 });
          count.textContent = number(state.resources.nectar);
          group.append(count, svg('image', { class: 'cell-picture nectar-picture', href: 'assets/icons/nectar-flower.svg', x: center.x - 19, y: center.y - 5, width: 38, height: 38 }));
        } else if (cell.type === 'brood') {
          const stage = Core.broodStage(cell.brood?.progress || 0);
          const asset = { egg: 'egg.svg', larva: 'larva.svg', pupa: 'pupa.svg' }[stage] || 'egg.svg';
          group.appendChild(svg('image', { class: `cell-picture brood-picture brood-${stage}`, href: `assets/hive/${asset}`, x: center.x - 24, y: center.y - 32, width: 48, height: 58 }));
          const label = svg('text', { class: 'cell-label picture-label', x: center.x, y: center.y + 36 });
          label.textContent = stage.toUpperCase();
          group.appendChild(label);
        } else {
          const icon = svg('text', { class: 'cell-icon', x: center.x, y: center.y - 7 });
          icon.textContent = definition.icon;
          const label = svg('text', { class: 'cell-label', x: center.x, y: center.y + 24 });
          label.textContent = definition.short;
          group.append(icon, label);
        }
        if (Core.cellBonuses(state, coordKey).length) group.appendChild(svg('circle', { class: 'cell-bonus-ring', cx: center.x, cy: center.y, r: HEX_SIZE - 10 }));
      } else if (!locked) {
        const plus = svg('text', { class: 'build-plus', x: center.x, y: center.y + 1 });
        plus.textContent = selectedBuild ? '+' : '·';
        group.appendChild(plus);
      }

      if (!locked) group.addEventListener('click', () => handleHexClick(coordKey));
      elements.gridLayer.appendChild(group);
    });
    setTransform();
    syncBees();
  }

  function handleHexClick(coordKey) {
    const cell = state.cells[coordKey];
    if (cell) {
      selectedBuild = null;
      selectedCell = coordKey;
      elements.cancelBuild.classList.add('hidden');
      showSelection(coordKey);
      renderBuildOptions();
      renderBoard();
      tone(390);
      return;
    }
    if (!selectedBuild) {
      showToast('Choose a cell from the build bar first.');
      return;
    }
    const result = Core.buildCell(state, coordKey, selectedBuild);
    if (!result.ok) {
      showToast(result.reason);
      tone(180, .12);
      return;
    }
    const definition = Core.CELL_TYPES[selectedBuild];
    const bonus = result.bonuses.reduce((sum, item) => sum + item.value, 0);
    report(definition.icon, `${definition.name} built`, bonus ? `A clever position adds ${bonus}% adjacency efficiency.` : 'The colony has room to grow around it.');
    showToast(bonus ? `Built! +${bonus}% from neighbours.` : `${definition.name} added to the hive.`);
    tone(650, .1);
    selectedBuild = null;
    elements.cancelBuild.classList.add('hidden');
    renderBoard();
    renderBuildOptions();
    render(true);
    saveGame();
  }

  function cellStats(coordKey) {
    const cell = state.cells[coordKey];
    const bonuses = Core.cellBonuses(state, coordKey);
    const total = bonuses.reduce((sum, item) => sum + item.value, 0);
    if (cell.type === 'queen') return [['Colony', `${state.workers} workers`], ['Protection', state.year < 3 ? 'Peaceful' : `${Core.raidStrength(state)} threat`]];
    if (cell.type === 'garden') return [['Nectar', `${(.42 * (1 + total / 100)).toFixed(2)}/s`], ['Adjacency', `+${total}%`]];
    if (cell.type === 'processor') return [['Honey', `${(.34 * (1 + total / 100)).toFixed(2)}/s`], ['Adjacency', `+${total}%`]];
    if (cell.type === 'honey') return [['Total capacity', number(Core.storageCapacity(state))], ['Adjacency', `+${total}%`]];
    if (cell.type === 'brood') return [['Life stage', `${cell.brood?.stage || 'egg'}`], ['Hatch progress', `${Math.round((cell.brood?.progress || 0) * 100)}%`]];
    if (cell.type === 'vent') return [['Cooling', '−3.2°C'], ['Fresh air', '+12%']];
    if (cell.type === 'guard') return [['Defence', `${Math.round(18 * (1 + Core.sealBonus(state, 'defense')))}`], ['Raid', state.year < 3 ? 'Year 3' : 'Active']];
    return [];
  }

  function showSelection(coordKey) {
    const cell = state.cells[coordKey];
    if (!cell) return;
    const definition = Core.CELL_TYPES[cell.type];
    elements.selectionIcon.textContent = definition.icon;
    elements.selectionIcon.style.background = definition.color;
    elements.selectionType.textContent = `Hive cell • ${coordKey}`;
    elements.selectionName.textContent = definition.name;
    elements.selectionDescription.textContent = definition.description;
    elements.selectionStats.innerHTML = cellStats(coordKey).map(([label, value]) => `<span><b>${value}</b>${label}</span>`).join('');
    elements.tendBroodButton.classList.toggle('hidden', cell.type !== 'brood');
    elements.demolishButton.classList.toggle('hidden', cell.type === 'queen');
    elements.selectionCard.classList.remove('hidden');
  }

  function renderMarket() {
    const history = state.market.history;
    const min = Math.min(...history) - 1;
    const max = Math.max(...history) + 1;
    const points = history.map((price, index) => {
      const x = history.length === 1 ? 0 : index / (history.length - 1) * 280;
      const y = 72 - (price - min) / Math.max(1, max - min) * 62;
      return [x, y];
    });
    elements.marketLine.setAttribute('points', points.map(point => point.join(',')).join(' '));
    elements.marketArea.setAttribute('d', `M ${points[0][0]},80 L ${points.map(point => point.join(',')).join(' L ')} L ${points.at(-1)[0]},80 Z`);
    elements.mobileMarketLine.setAttribute('points', points.map(point => point.join(',')).join(' '));
    elements.mobileMarketArea.setAttribute('d', `M ${points[0][0]},80 L ${points.map(point => point.join(',')).join(' L ')} L ${points.at(-1)[0]},80 Z`);
    elements.marketPrice.textContent = state.market.price.toFixed(1);
    elements.mobileMarketPrice.textContent = state.market.price.toFixed(1);
    const previous = history.at(-2) || history[0];
    const change = Math.round((state.market.price / previous - 1) * 100);
    elements.marketTrend.className = `trend ${change >= 0 ? 'up' : 'down'}`;
    elements.marketTrend.textContent = `${change >= 0 ? '↗' : '↘'} ${Math.abs(change)}%`;
    elements.mobileMarketTrend.className = change >= 0 ? 'up' : 'down';
    elements.mobileMarketTrend.textContent = `${change >= 0 ? '↗' : '↘'} ${Math.abs(change)}%`;
    elements.autoSellToggle.checked = Boolean(state.market.autoSell);
    elements.mobileAutoSellToggle.checked = Boolean(state.market.autoSell);
    if (document.activeElement !== elements.reserveInput) elements.reserveInput.value = state.market.reserve ?? 10;
    if (document.activeElement !== elements.mobileReserveInput) elements.mobileReserveInput.value = state.market.reserve ?? 10;
  }

  function renderClimate() {
    const climate = Core.climate(state);
    elements.temperatureValue.textContent = `${climate.temperature.toFixed(1)}°C`;
    elements.humidityValue.textContent = `${Math.round(climate.humidity)}%`;
    elements.airValue.textContent = `${Math.round(climate.air)}%`;
    elements.temperatureBar.style.width = `${clamp((climate.temperature - 18) / 30 * 100, 3, 100)}%`;
    elements.humidityBar.style.width = `${clamp(climate.humidity, 3, 100)}%`;
    elements.airBar.style.width = `${clamp(climate.air, 3, 100)}%`;
    const efficiency = Math.round(climate.efficiency * 100);
    elements.efficiencyValue.textContent = `${efficiency}%`;
    const status = efficiency >= 90 ? ['Optimal', 'good'] : efficiency >= 70 ? ['Strained', 'warn'] : ['Critical', 'bad'];
    elements.climateStatus.textContent = status[0];
    elements.climateStatus.className = `status-pill ${status[1]}`;
    [elements.temperatureBar, elements.humidityBar, elements.airBar].forEach(bar => { bar.style.background = efficiency < 70 ? '#c85c49' : efficiency < 90 ? '#d79a27' : '#5e7d53'; });
  }

  function renderSeason() {
    const season = Core.currentSeason(state);
    const seasonProgress = clamp(state.yearTime / Core.YEAR_LENGTH, 0, 1);
    elements.seasonIcon.textContent = season.icon;
    elements.seasonName.textContent = season.name;
    elements.seasonEffect.textContent = `${Math.round(season.nectar * 100)}% nectar flow`;
    elements.seasonTimelineMarker.style.left = `${2 + seasonProgress * 96}%`;
    elements.seasonTimelineLabel.textContent = season.name;
    elements.seasonTimelineButton.setAttribute('aria-label', `Current season: ${season.name}. ${season.description}`);
    const active = state.emergency?.remaining > 0;
    const actionNames = { warm: 'Comb warming', mist: 'Cooling mist', rally: 'Worker rally' };
    elements.climateToolsButton.classList.toggle('active', active);
    elements.emergencyStatus.textContent = active ? `${actionNames[state.emergency.type]} • ${Math.ceil(state.emergency.remaining)} days` : 'Warm • Mist • Rally';
  }

  function renderBroodModal() {
    const cell = broodCoord && state.cells[broodCoord];
    if (!cell || cell.type !== 'brood') return;
    const progress = cell.brood?.progress || 0;
    const stage = Core.broodStage(progress);
    const stages = {
      egg: { icon: '◌', name: 'Pearl egg', text: 'A new worker waits in the quiet first stage.' },
      larva: { icon: '〰', name: 'Hungry larva', text: 'The larva feeds rapidly and responds strongly to honey.' },
      pupa: { icon: '◍', name: 'Silken pupa', text: 'A nearly formed worker rests beneath its cap.' }
    };
    elements.broodStageIcon.textContent = stages[stage].icon;
    elements.broodStageName.textContent = stages[stage].name;
    elements.broodStageText.textContent = stages[stage].text;
    elements.broodProgressBar.style.width = `${Math.round(progress * 100)}%`;
    const hatchRate = Core.productionRates(state).hatch / Math.max(1, Core.countCells(state, 'brood'));
    elements.broodTime.textContent = hatchRate ? `About ${Math.ceil((1 - progress) / hatchRate)} days until hatching` : 'The brood is waiting for a functioning colony';
    document.querySelectorAll('.feed-brood').forEach(button => { button.disabled = state.resources.honey < Number(button.dataset.feed); });
  }

  function renderExpedition() {
    if (!state.expedition) {
      elements.activeExpedition.className = 'expedition-empty';
      elements.activeExpedition.innerHTML = '<span>✿</span><div><b>No swarm afield</b><small>Send bees to gather nectar and wax.</small></div>';
      return;
    }
    const location = Core.FORAGE_LOCATIONS.find(item => item.id === state.expedition.locationId);
    const progress = clamp(state.expedition.elapsed / state.expedition.duration * 100, 0, 100);
    elements.activeExpedition.className = 'expedition-empty';
    elements.activeExpedition.innerHTML = `<span>${location.icon}</span><div><b>${location.name}</b><small>${state.expedition.bees} bees • ${Math.ceil(state.expedition.duration - state.expedition.elapsed)}s away</small><div class="expedition-progress"><i style="width:${progress}%"></i></div></div>`;
  }

  function renderSeals() {
    elements.sealCount.textContent = `${state.seals.length} crests`;
    if (!state.seals.length) {
      elements.sealList.innerHTML = '<p class="empty-copy">Complete a year to earn your first permanent crest.</p>';
      return;
    }
    elements.sealList.innerHTML = state.seals.map(id => {
      const upgrade = Core.UPGRADES.find(item => item.id === id);
      return `<span class="seal-token" title="${upgrade.name}: ${upgrade.description}">${upgrade.icon}</span>`;
    }).join('');
  }

  function render(force = false) {
    const now = performance.now();
    if (!force && now - lastRender < 180) return;
    lastRender = now;
    elements.waxValue.textContent = number(state.resources.wax);
    elements.nectarValue.textContent = number(state.resources.nectar);
    elements.honeyValue.textContent = number(state.resources.honey);
    elements.coinValue.textContent = number(state.resources.coins);
    document.querySelectorAll('.cell-resource-count').forEach(label => { label.textContent = number(state.resources.nectar); });
    document.querySelectorAll('.hex-cell.cell-brood').forEach(node => {
      const cell = state.cells[node.dataset.key];
      if (!cell) return;
      const stage = Core.broodStage(cell.brood?.progress || 0);
      const asset = { egg: 'egg.svg', larva: 'larva.svg', pupa: 'pupa.svg' }[stage] || 'egg.svg';
      const picture = node.querySelector('.brood-picture');
      const label = node.querySelector('.picture-label');
      if (picture) picture.setAttribute('href', `assets/hive/${asset}`);
      if (label) label.textContent = stage.toUpperCase();
    });
    elements.workerValue.textContent = state.workers;
    elements.yearLabel.textContent = `Year ${state.year}`;
    const remaining = Math.max(0, Core.YEAR_LENGTH - state.yearTime);
    elements.daysLabel.textContent = `${Math.ceil(remaining)} days`;
    elements.yearProgress.style.width = `${clamp(state.yearTime / Core.YEAR_LENGTH * 100, 0, 100)}%`;
    elements.quotaTitle.textContent = state.quota.delivered >= state.quota.target ? 'The Crown is satisfied' : `Deliver ${state.quota.target} honey`;
    elements.quotaCurrent.textContent = number(state.quota.delivered);
    elements.quotaTarget.textContent = number(state.quota.target);
    elements.quotaProgress.style.width = `${clamp(state.quota.delivered / state.quota.target * 100, 0, 100)}%`;
    elements.deliverButton.disabled = state.resources.honey < 1 || state.quota.delivered >= state.quota.target;
    elements.stageTitle.textContent = state.year >= 3 && !state.flags.raidResolved ? 'Grow strong. The wasps are watching.' : 'Make the hive hum';
    renderMarket();
    renderClimate();
    renderSeason();
    renderExpedition();
    renderSeals();
    renderBuildOptions();
    document.body.dataset.season = Core.currentSeason(state).id;
    document.body.dataset.biome = state.config?.biome || 'sunmeadow';
    if (selectedCell && state.cells[selectedCell]) showSelection(selectedCell);
    if (elements.broodModal.classList.contains('visible')) renderBroodModal();
  }

  function renderForageChoices() {
    elements.forageChoices.innerHTML = '';
    Core.FORAGE_LOCATIONS.forEach(location => {
      forageCrew[location.id] = Math.max(location.bees, forageCrew[location.id] || location.bees);
      const crew = forageCrew[location.id];
      const unavailable = state.expedition || state.resources.coins < location.cost;
      const crewUnavailable = state.workers < crew + 1;
      const card = document.createElement('article');
      card.className = `choice-card forage-choice${unavailable ? ' disabled' : ''}`;
      const yieldAmount = Math.round(location.nectar * (1 + (crew - location.bees) * .28));
      const duration = Math.round(location.duration / (1 + (crew - location.bees) * .16));
      card.innerHTML = `<span class="choice-art">${location.icon}</span><h3>${location.name}</h3><p>${location.description}</p><div class="choice-meta"><span><b>${yieldAmount}–${Math.round(yieldAmount * 1.2)}</b>Nectar</span><span><b>${Math.round(location.risk * 100)}%</b>Risk</span><span><b>${duration}s</b>Journey</span><span><b>${crew}</b>Crew</span></div><div class="crew-control"><button data-crew="minus" aria-label="Remove a worker">−</button><strong>${crew} workers</strong><button data-crew="plus" aria-label="Add a worker">+</button></div><button class="launch-expedition"${crewUnavailable ? ' disabled' : ''}>${crewUnavailable ? 'Not enough workers' : 'Launch swarm'}</button><small class="choice-cost">${location.cost ? `${location.cost} crowns in supplies` : 'No supply cost'}</small>`;
      card.querySelector('[data-crew="minus"]').addEventListener('click', () => { forageCrew[location.id] = Math.max(location.bees, crew - 1); renderForageChoices(); });
      card.querySelector('[data-crew="plus"]').addEventListener('click', () => { forageCrew[location.id] = Math.min(4, crew + 1, state.workers - 1); renderForageChoices(); });
      card.querySelector('.launch-expedition').addEventListener('click', () => {
        const result = Core.startExpedition(state, location.id, crew);
        if (!result.ok) return showToast(result.reason);
        elements.forageModal.classList.remove('visible');
        report('↗', 'Swarm away!', `${crew} workers are flying toward ${location.name}.`);
        showToast(`Expedition launched to ${location.name}.`);
        tone(720, .12);
        render(true);
      });
      elements.forageChoices.appendChild(card);
    });
  }

  function renderUpgradeCards() {
    elements.upgradeChoices.innerHTML = '';
    Core.upgradeChoices(state).forEach(upgrade => {
      const card = document.createElement('button');
      card.className = 'choice-card';
      card.innerHTML = `<span class="choice-art">${upgrade.icon}</span><h3>${upgrade.name}</h3><p>${upgrade.description}</p><small class="choice-cost">Permanent • Stacks up to 3×</small>`;
      card.addEventListener('click', () => {
        Core.chooseUpgradeAndAdvance(state, upgrade.id);
        waitingForYear = false;
        paused = false;
        elements.pauseButton.textContent = 'Ⅱ';
        elements.yearModal.classList.remove('visible');
        if (state.year === 3) report('♜', 'The outer ring opens', 'More space is yours—but scouts have seen wasps beyond the hedge. Build a Sentinel Post.');
        else report(upgrade.icon, `${upgrade.name} claimed`, upgrade.description);
        showToast(`${upgrade.name} added. Welcome to Year ${state.year}.`);
        tone(880, .18);
        renderBoard();
        render(true);
        saveGame();
      });
      elements.upgradeChoices.appendChild(card);
    });
    const nextCost = 35 + (state.flags.upgradeRerolls || 0) * 15;
    elements.rerollCost.textContent = `${nextCost} crowns`;
    elements.rerollUpgrades.disabled = state.resources.coins < nextCost;
  }

  function showYearModal() {
    waitingForYear = true;
    paused = true;
    elements.pauseButton.textContent = '▶';
    elements.yearModalTitle.textContent = `Year ${state.year} complete`;
    elements.yearModalText.textContent = 'The Crown has taken its due. Your colony survives, and one royal crest may shape everything that follows.';
    const names = ['Mallow Wingstead', 'Clover Quickwing', 'Pip Honeyfoot', 'Tansy Goldstripe', 'Bramble Bright'];
    elements.workerOfYear.textContent = names[(state.seed + state.year) % names.length];
    elements.workerCitation.textContent = state.stats.lost ? 'Held the swarm together through loss' : state.expedition ? 'Most daring field journeys' : 'Highest refinery attendance';
    elements.yearStats.innerHTML = `<span><b>${state.stats.born}</b><small>Born</small></span><span><b>${state.stats.lost}</b><small>Lost</small></span><span><b>${number(state.stats.yearHoneyMade)}</b><small>Honey made</small></span><span><b>${number(state.stats.yearCoinsEarned)}</b><small>Crowns earned</small></span><span><b>${state.workers}</b><small>Workers</small></span>`;
    renderUpgradeCards();
    elements.yearModal.classList.add('visible');
  }

  function showGameOver(reason) {
    paused = true;
    state.flags.gameOver = true;
    localStorage.removeItem(SAVE_KEY);
    elements.gameOverTitle.textContent = reason === 'queen' ? 'The Queen has fallen' : 'The Crown’s due was missed';
    elements.gameOverText.textContent = reason === 'queen' ? 'The wasp line broke through. Next colony, fortify before the third summer.' : `Only ${Math.floor(state.quota.delivered)} of ${state.quota.target} honey reached the Crown.`;
    elements.finalStats.innerHTML = `<span><b>${state.year}</b><small>Year reached</small></span><span><b>${number(state.stats.honeyMade)}</b><small>Honey made</small></span><span><b>${state.workers}</b><small>Bees left</small></span><span><b>${state.seals.length}</b><small>Crests</small></span>`;
    elements.gameOverModal.classList.add('visible');
  }

  function handleEvent(event) {
    if (event.type === 'hatch') {
      report('●', 'A new worker emerges', `Worker ${state.workers} joins the hum.`);
      showToast('A new worker has hatched!');
      renderBoard();
      tone(820);
    }
    if (event.type === 'expedition') {
      const loss = event.lost ? ' One worker did not return.' : ' Every worker returned safely.';
      report(event.location.icon, `${event.location.name} harvest`, `+${event.nectar} nectar, +${event.wax} wax.${loss}`);
      showToast(`Swarm returned: +${event.nectar} nectar, +${event.wax} wax.`);
      renderBoard();
    }
    if (event.type === 'market' && Math.abs(event.price - event.before) > 2) {
      report(event.price > event.before ? '↗' : '↘', 'Market bell', `Honey moved sharply to ${event.price.toFixed(1)} crowns per jar.`);
    }
    if (event.type === 'autoSale') {
      report('↗', 'Standing market order filled', `${event.quantity} surplus honey sold automatically for ${event.earned} crowns.`);
      showToast(`Auto-sold ${event.quantity} honey at the market peak.`);
    }
    if (event.type === 'season') {
      report(event.season.icon, event.season.name, event.season.description);
      showToast(`${event.season.name}: ${event.season.description}`);
      tone(event.season.id === 'frost' ? 310 : 680, .12);
    }
    if (event.type === 'raid') {
      if (event.victory) {
        report('♜', 'Sentinels hold the line', `Defence ${event.defense} turned back a wasp swarm of strength ${event.attack}.`);
        showToast('Wasp raid repelled!');
        tone(310, .18);
      } else if (event.queenFell) {
        showGameOver('queen');
      } else {
        report('!', 'Wasps breach the comb', `${event.lost} workers were lost. Build more Sentinel Posts before next year.`);
        showToast(`Raid survived, but ${event.lost} workers were lost.`);
        tone(140, .25);
        renderBoard();
      }
    }
    if (event.type === 'yearEnd' && !waitingForYear) {
      if (event.success) showYearModal();
      else showGameOver('quota');
    }
  }

  function syncBees() {
    const workingCount = Math.min(16, state.workers);
    while (beeVisuals.length < workingCount) beeVisuals.push(makeBee(beeVisuals.length));
    while (beeVisuals.length > workingCount) {
      const removed = beeVisuals.pop();
      removed.node.remove();
    }
  }

  function makeBee(index) {
    const node = svg('g', { class: 'bee' });
    node.appendChild(svg('image', { class: 'bee-picture', href: 'assets/hive/worker-bee.svg', x: -18, y: -14, width: 36, height: 28 }));
    elements.beeLayer.appendChild(node);
    const start = hexCenter(0, 0);
    return { node, index, x: start.x + (index % 3) * 7, y: start.y + Math.floor(index / 3) * 4, startX: start.x, startY: start.y, targetX: start.x, targetY: start.y, started: visualTime, duration: 1, rotation: 0 };
  }

  function chooseBeeTarget(bee) {
    const entries = Object.entries(state.cells);
    const preferred = bee.index % 3 === 0 ? ['garden', 'processor'] : bee.index % 3 === 1 ? ['processor', 'honey'] : ['honey', 'brood', 'queen'];
    let candidates = entries.filter(([, cell]) => preferred.includes(cell.type));
    if (!candidates.length) candidates = entries;
    const [coordKey] = candidates[Math.floor(Math.random() * candidates.length)];
    const [q, r] = Core.parseKey(coordKey);
    const target = hexCenter(q, r);
    bee.startX = bee.x;
    bee.startY = bee.y;
    bee.targetX = target.x + (Math.random() - .5) * 24;
    bee.targetY = target.y + (Math.random() - .5) * 20;
    bee.started = visualTime;
    bee.duration = 1.4 + Math.random() * 2.1;
    bee.rotation = Math.atan2(bee.targetY - bee.startY, bee.targetX - bee.startX) * 180 / Math.PI;
  }

  function animateBees(dt) {
    if (!paused) visualTime += dt * speed;
    beeVisuals.forEach(bee => {
      let progress = (visualTime - bee.started) / bee.duration;
      if (progress >= 1) {
        bee.x = bee.targetX;
        bee.y = bee.targetY;
        chooseBeeTarget(bee);
        progress = 0;
      }
      const eased = progress < .5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      bee.x = bee.startX + (bee.targetX - bee.startX) * eased;
      bee.y = bee.startY + (bee.targetY - bee.startY) * eased + Math.sin(progress * Math.PI * 4 + bee.index) * 4;
      bee.node.setAttribute('transform', `translate(${bee.x} ${bee.y}) rotate(${bee.rotation}) scale(${bee.index >= state.workers - (state.expedition?.bees || 0) ? .75 : 1})`);
      bee.node.style.opacity = bee.index >= state.workers - (state.expedition?.bees || 0) ? '.22' : '1';
    });
  }

  function frame(now) {
    const realDt = Math.min(.1, (now - lastFrame) / 1000);
    lastFrame = now;
    if (!paused && !waitingForYear) {
      const scaled = realDt * speed;
      let remaining = scaled;
      while (remaining > 0) {
        const slice = Math.min(remaining, .5);
        Core.step(state, slice, random).forEach(handleEvent);
        remaining -= slice;
      }
    }
    animateBees(realDt);
    render();
    if (now - lastSave > 5000) { lastSave = now; saveGame(); }
    requestAnimationFrame(frame);
  }

  elements.newGameButton.addEventListener('click', openSetup);
  elements.restartButton.addEventListener('click', openSetup);
  elements.continueButton.addEventListener('click', () => {
    const saved = loadGame();
    if (!saved) return resetGame();
    state = saved;
    paused = false;
    elements.pauseButton.textContent = 'Ⅱ';
    closeAllModals();
    renderBoard();
    render(true);
    showToast(`Welcome back to Year ${state.year}.`);
  });
  elements.pauseButton.addEventListener('click', () => {
    if (waitingForYear) return;
    paused = !paused;
    elements.pauseButton.textContent = paused ? '▶' : 'Ⅱ';
    elements.pauseButton.classList.toggle('active', !paused);
  });
  document.querySelectorAll('.speed-button').forEach(button => button.addEventListener('click', () => {
    speed = Number(button.dataset.speed);
    paused = false;
    elements.pauseButton.textContent = 'Ⅱ';
    elements.pauseButton.classList.add('active');
    document.querySelectorAll('.speed-button').forEach(item => item.classList.toggle('active', item === button));
  }));
  elements.cancelBuild.addEventListener('click', () => { selectedBuild = null; elements.cancelBuild.classList.add('hidden'); renderBuildOptions(); renderBoard(); });
  elements.closeSelection.addEventListener('click', () => { selectedCell = null; elements.selectionCard.classList.add('hidden'); renderBoard(); });
  elements.demolishButton.addEventListener('click', () => {
    if (!selectedCell) return;
    const result = Core.demolishCell(state, selectedCell);
    if (!result.ok) return showToast(result.reason);
    selectedCell = null;
    elements.selectionCard.classList.add('hidden');
    showToast(`Cell recycled for ${result.refund} wax.`);
    tone(240);
    renderBoard(); render(true); saveGame();
  });
  elements.tendBroodButton.addEventListener('click', () => {
    broodCoord = selectedCell;
    renderBroodModal();
    elements.broodModal.classList.add('visible');
  });
  document.querySelectorAll('.feed-brood').forEach(button => button.addEventListener('click', () => {
    const result = Core.feedBrood(state, broodCoord, Number(button.dataset.feed));
    if (!result.ok) return showToast(result.reason);
    renderBroodModal(); render(true); saveGame();
    report('◌', 'Brood fed', `${result.amount} honey hastened the ${result.stage} stage.`);
    showToast(`Brood progress advanced to ${Math.round(result.progress * 100)}%.`);
    tone(790);
  }));
  elements.deliverButton.addEventListener('click', () => {
    const result = Core.deliverHoney(state);
    if (!result.ok) return showToast(result.reason);
    report('♛', result.complete ? 'The Crown is satisfied' : 'Honey delivered', result.complete ? 'This colony will live to see another year.' : `${Math.floor(result.amount)} honey entered the royal stores.`);
    showToast(result.complete ? 'Annual quota complete!' : `${Math.floor(result.amount)} honey delivered.`);
    tone(result.complete ? 880 : 620, .14);
    render(true); saveGame();
  });
  document.querySelectorAll('.sell-button').forEach(button => button.addEventListener('click', () => {
    const result = Core.sellHoney(state, button.dataset.sell);
    if (!result.ok) return showToast(result.reason);
    report('↗', 'Honey sold', `${result.quantity} jars earned ${result.earned} crowns on the Amber Exchange.`);
    showToast(`Sold ${result.quantity} honey for ${result.earned} crowns.`);
    tone(740);
    render(true); saveGame();
  }));
  elements.autoSellToggle.addEventListener('change', () => { state.market.autoSell = elements.autoSellToggle.checked; saveGame(); showToast(state.market.autoSell ? 'Standing sell order enabled.' : 'Standing sell order cancelled.'); });
  elements.reserveInput.addEventListener('change', () => { state.market.reserve = clamp(Number(elements.reserveInput.value) || 0, 0, 99); saveGame(); });
  elements.mobileAutoSellToggle.addEventListener('change', () => { state.market.autoSell = elements.mobileAutoSellToggle.checked; render(true); saveGame(); showToast(state.market.autoSell ? 'Standing sell order enabled.' : 'Standing sell order cancelled.'); });
  elements.mobileReserveInput.addEventListener('change', () => { state.market.reserve = clamp(Number(elements.mobileReserveInput.value) || 0, 0, 99); render(true); saveGame(); });
  elements.openMarketButton.addEventListener('click', () => { renderMarket(); elements.marketModal.classList.add('visible'); });
  ['forageButton', 'openForage'].forEach(id => document.getElementById(id).addEventListener('click', () => {
    renderForageChoices();
    elements.forageModal.classList.add('visible');
  }));
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.close).classList.remove('visible')));
  elements.climateToolsButton.addEventListener('click', () => elements.climateModal.classList.add('visible'));
  [elements.seasonButton, elements.seasonTimelineButton].forEach(button => button.addEventListener('click', () => {
    const season = Core.currentSeason(state);
    showToast(`${season.name}: ${season.description} Nectar output is ${Math.round(season.nectar * 100)}%.`);
  }));
  document.querySelectorAll('.emergency-action').forEach(button => button.addEventListener('click', () => {
    const result = Core.emergencyAction(state, button.dataset.emergency);
    if (!result.ok) return showToast(result.reason);
    elements.climateModal.classList.remove('visible');
    report('⚡', result.name, `Emergency response active for ${result.duration} days.`);
    showToast(`${result.name} activated.`);
    tone(760, .15); render(true); saveGame();
  }));
  elements.startConfiguredGame.addEventListener('click', () => resetGame({ biome: selectedBiome, difficulty: selectedDifficulty }));
  elements.menuButton.addEventListener('click', () => { paused = true; elements.pauseButton.textContent = '▶'; renderMenuIdentity(); elements.menuModal.classList.add('visible'); });
  elements.resumeGame.addEventListener('click', () => { elements.menuModal.classList.remove('visible'); paused = false; elements.pauseButton.textContent = 'Ⅱ'; });
  elements.saveGameButton.addEventListener('click', () => { saveGame(); showToast('Colony saved to this browser.'); });
  elements.newColonyMenu.addEventListener('click', () => { elements.menuModal.classList.remove('visible'); openSetup(); });
  elements.showCrests.addEventListener('click', () => { elements.menuModal.classList.remove('visible'); renderCrestArchive(); elements.crestsModal.classList.add('visible'); });
  elements.rerollUpgrades.addEventListener('click', () => {
    const result = Core.rerollUpgrades(state);
    if (!result.ok) return showToast(result.reason);
    renderUpgradeCards(); render(true); saveGame();
    showToast(`The Crown redrew the crests for ${result.cost} crowns.`); tone(540, .12);
  });
  elements.soundToggle.addEventListener('change', () => { settings.sound = elements.soundToggle.checked; saveSettings(); });
  elements.motionToggle.addEventListener('change', () => { settings.reducedMotion = elements.motionToggle.checked; saveSettings(); });
  elements.hintsToggle.addEventListener('change', () => { settings.hints = elements.hintsToggle.checked; saveSettings(); });
  elements.zoomIn.addEventListener('click', () => { zoom = clamp(zoom + .12, .75, 1.45); setTransform(); });
  elements.zoomOut.addEventListener('click', () => { zoom = clamp(zoom - .12, .75, 1.45); setTransform(); });
  elements.zoomReset.addEventListener('click', () => { zoom = 1; setTransform(); });

  loadSettings();
  const saved = localStorage.getItem(SAVE_KEY);
  if (saved) elements.continueButton.classList.remove('hidden');
  renderBoard();
  render(true);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  requestAnimationFrame(frame);
})();
