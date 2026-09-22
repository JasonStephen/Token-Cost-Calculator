    let DEFAULT;
    let PRICING_CONFIG = {};
    const t = (key, values) => window.i18n.t(key, values);
    const PRESET_ORDER = ['GPT-5.6 Sol', 'GPT-5.6 Terra', 'GPT-5.6 Luna'];
    const $ = id => document.getElementById(id);
    const HELP_POINT_KEYS = ['point1', 'point2', 'point3'];
    const VIEW_IDS = ['home', 'structure', 'comparison', 'tokenCost', 'budget', 'cards', 'settings'];
    const CARD_TYPES = ['multiplier', 'comparison', 'tokenCost', 'budget'];
    const THEME_IDS = ['system', 'light', 'dark'];
    const SETTINGS_MODEL_PAGE_SIZES = [12, 24];
    // Keep the onboarding contract in the persisted state.  This is deliberately
    // separate from stateVersion: existing workspaces should not be treated as a
    // fresh install just because the calculator state gains a new migration.
    const ONBOARDING_VERSION = 1;
    const ONBOARDING_RESET_SESSION_KEY = 'token-cost-calc-onboarding-after-reset';
    const ONBOARDING_PROVIDER_LIMIT = 10;
    const ONBOARDING_DEFAULT_MODEL_LIMIT = 3;
    let settingsModelPageSize = SETTINGS_MODEL_PAGE_SIZES[0];
    let settingsModelPage = 1;
    let settingsModelSearchQuery = '';
    let settingsStatusFilter = '';
    let settingsPricingFilter = '';
    let sidebarWasNarrow = window.innerWidth <= 740;
    let settingsProviderSelection = new Set();
    let modelSelectionType = null;
    let modelSelectionDraft = new Set();
    let modelSelectionProvider = '';
    let modelSelectionPanel = 'select';
    let onboardingStep = 0;
    let onboardingSubmitting = false;
    let onboardingTransitioning = false;
    let onboardingClosing = false;
    let onboardingSkipProvidersConfirmed = false;
    const systemTheme = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    function uiText(key, fallback, fallbackCjk=fallback) {
      const value = t(key);
      return value === key ? (document.documentElement.lang === 'en' ? fallback : fallbackCjk) : value;
    }
    function modelEnabled(model) { return model && model.enabled === true; }
    function enabledModels() { return state && Array.isArray(state.models) ? state.models.filter(modelEnabled) : []; }
    function providerTier(model) {
      const whitelist = PRICING_CONFIG && Array.isArray(PRICING_CONFIG.providerWhitelist)
        ? PRICING_CONFIG.providerWhitelist.map(normalizedProvider)
        : [];
      return whitelist.includes(normalizedProvider(model && model.providerId)) ? 'A' : 'B';
    }
    function showHostedModels() { return Boolean(state && state.showHostedModels); }
    function settingsVisibleModels() {
      if (!state || !Array.isArray(state.models)) return [];
      return state.models.filter(model => showHostedModels() || providerTier(model) === 'A' || modelEnabled(model));
    }
    function settingsProviderLabel(model) {
      return !showHostedModels() && providerTier(model) === 'B' && modelEnabled(model)
        ? uiText('models.otherProviders', 'Other', '其他')
        : modelProvider(model);
    }
    function modelCategory(model) {
      const value = String(model && model.category || '').trim().toLowerCase();
      return value || (model && model.source === 'manual' ? 'custom' : 'general');
    }
    function normalizedProvider(value) { return String(value || '').trim().toLowerCase().replace(/_/g, '-'); }
    function modelProviderMeta(model) {
      const providers = PRICING_CONFIG && PRICING_CONFIG.providers && typeof PRICING_CONFIG.providers === 'object'
        ? PRICING_CONFIG.providers
        : {};
      const sourceId = String(model && (model.sourceModelId || model.syncedFrom) || '').trim();
      const candidates = [
        model && model.providerId,
        sourceId.includes('/') ? sourceId.split('/', 1)[0] : '',
        model && model.provider
      ].map(normalizedProvider).filter(Boolean);
      for (const [key, details] of Object.entries(providers)) {
        const provider = details && typeof details === 'object' ? details : {};
        if (candidates.includes(normalizedProvider(key)) || candidates.includes(normalizedProvider(provider.name))) {
          return {id:String(key), name:String(provider.name || key), icon:String(provider.icon || '')};
        }
      }
      return {id:candidates[0] || '', name:'', icon:''};
    }
    function modelProvider(model) {
      const explicit = String(model && model.provider || '').trim();
      const meta = modelProviderMeta(model);
      return explicit || meta.name || String(model && model.providerId || meta.id || '').trim();
    }
    function normalizeModelSource(model) {
      const source = String(model && model.source || '').trim().toLowerCase();
      return source || (model && model.syncedFrom ? 'litellm' : 'manual');
    }
    function hasPrice(model) {
      return ['cache', 'input', 'output'].some(key => Number.isFinite(Number(model && model[key])) && Number(model[key]) > 0);
    }

    function setupSidebar() {
      const sidebar = document.querySelector('.sidebar');
      const nav = sidebar && sidebar.querySelector('.sidebar-nav');
      if (!sidebar || !nav) return;
      let toggle = document.querySelector('#sidebarToggle');
      if (!toggle) {
        toggle = document.createElement('button');
        toggle.id = 'sidebarToggle';
        toggle.type = 'button';
        toggle.className = 'icon-btn';
        toggle.dataset.sidebarToggle = 'true';
        toggle.textContent = '\u2630';
        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-label', uiText('sidebar.toggle', 'Toggle navigation', '切换侧边栏'));
        sidebar.querySelector('.sidebar-brand')?.prepend(toggle);
      }
      if (!nav.querySelector('[data-view-target="home"]')) {
        const home = document.createElement('button');
        home.className = 'sidebar-nav-item';
        home.type = 'button';
        home.dataset.viewTarget = 'home';
        home.innerHTML = '<span aria-hidden="true">\u2302</span><span>' + (document.documentElement.lang === 'en' ? 'Home' : '\u9996\u9875') + '</span>';
        nav.prepend(home);
      }
      const settings = $('openSettings');
      if (settings && !settings.dataset.viewTarget) {
        settings.dataset.viewTarget = 'settings';
      }
      const details = sidebar.querySelector('.sidebar-state');
      if (details && !details.dataset.sidebarBound) {
        details.dataset.sidebarBound = 'true';
        details.addEventListener('toggle', () => applySidebarCollapsed(!details.open));
      }
      document.querySelectorAll('[data-sidebar-toggle]').forEach(button => {
        if (button.dataset.sidebarBound) return;
        button.dataset.sidebarBound = 'true';
        button.addEventListener('click', () => applySidebarCollapsed(!sidebar.classList.contains('is-collapsed')));
      });
      $('sidebarBackdrop')?.addEventListener('click', () => applySidebarCollapsed(true));
    }

    function setupSidebarViewportBehavior() {
      if (document.body.dataset.sidebarViewportBound) return;
      document.body.dataset.sidebarViewportBound = 'true';
      window.addEventListener('resize', () => {
        const isNarrow = window.innerWidth <= 740;
        if (isNarrow && !sidebarWasNarrow) applySidebarCollapsed(true);
        sidebarWasNarrow = isNarrow;
      });
    }

    function setupRuntimeShell() {
      setupModelIconFallback();
      const legacySync = $('syncPrices');
      legacySync?.closest('.catalog-toolbar')?.remove();
      document.querySelectorAll('.section-toggle,[data-toggle]').forEach(button => button.remove());
      document.querySelectorAll('main.app > .legend, main.app > .foot').forEach(element => { element.dataset.viewFooter = 'true'; });
      setupSidebar();
      setupSidebarViewportBehavior();
    }
    setupRuntimeShell();

    function openHelpDialog(section) {
      $('helpDialogTitle').textContent = t('help.' + section + '.title');
      const intro = t('help.' + section + '.intro');
      $('helpDialogIntro').textContent = intro;
      $('helpDialogIntro').hidden = !intro;
      $('helpDialogPoints').innerHTML = HELP_POINT_KEYS
        .map(key => t('help.' + section + '.' + key))
        .filter(Boolean)
        .map(point => '<li>' + point + '</li>')
        .join('');
      const note = t('help.' + section + '.note');
      $('helpDialogNote').textContent = note;
      $('helpDialogNote').hidden = !note;
      $('helpDialog').showModal();
    }
    const num = value => Math.max(0, Number(value) || 0);
    const priceNumber = value => Number(num(value).toFixed(12));
    const valueOr = (value, fallback) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : fallback;
    function priceSnapshot(source) {
      if (!source || typeof source !== 'object') return null;
      const values = ['cache', 'input', 'output'].map(key => Number(source[key]));
      if (!values.every(value => Number.isFinite(value) && value >= 0)) return null;
      return {cache:priceNumber(values[0]), input:priceNumber(values[1]), output:priceNumber(values[2])};
    }
    function modelIdentityValues(model) {
      return [model && model.sourceModelId, model && model.targetId, model && model.id]
        .filter(Boolean).map(value => String(value).trim().toLowerCase());
    }
    function matchingModel(models, target) {
      const targetValues = new Set(modelIdentityValues(target));
      if (!targetValues.size || !Array.isArray(models)) return null;
      return models.find(model => modelIdentityValues(model).some(value => targetValues.has(value))) || null;
    }
    function bundledCatalogPricing(model) {
      const match = matchingModel(DEFAULT && DEFAULT.models, model);
      return priceSnapshot(match);
    }
    const percent = value => Math.min(100, Math.max(0, num(value)));
    const clone = value => JSON.parse(JSON.stringify(value));
    const STRUCTURE_UNIT_TO_M = {K:.001, M:1, B:1000};
    const TOKEN_UNITS = ['auto', 'K', 'M', 'B'];
    function normalizeTokenUnit(unit, fallback='M') { return TOKEN_UNITS.includes(unit) ? unit : fallback; }
    function automaticTokenUnit(values) {
      const largest = Math.max(0, ...(Array.isArray(values) ? values : [values]).map(num));
      if (largest >= 1000) return 'B';
      if (largest > 0 && largest < 1) return 'K';
      return 'M';
    }
    function tokenUnitFactor(unit) { return STRUCTURE_UNIT_TO_M[normalizeTokenUnit(unit)] || 1; }
    function tokenDisplayValue(valueM, unit) { return Number((num(valueM) / tokenUnitFactor(unit)).toFixed(6)).toString(); }
    function tokenStoredValue(value, unit) { return num(value) * tokenUnitFactor(unit); }
    function structureTokenUnit() {
      const preference = normalizeTokenUnit(state && state.structureUnit);
      return preference === 'auto' ? automaticTokenUnit([state.cache, state.input, state.output]) : preference;
    }
    function structureUnitFactor() { return tokenUnitFactor(structureTokenUnit()); }
    function structureDisplayValue(valueM) { return tokenDisplayValue(valueM, structureTokenUnit()); }
    function renderStructureUnit() {
      const unit = structureTokenUnit();
      $('structureUnit').value = normalizeTokenUnit(state.structureUnit);
      $('cache').value = structureDisplayValue(state.cache);
      $('input').value = structureDisplayValue(state.input);
      $('output').value = structureDisplayValue(state.output);
      $('cacheLabel').textContent = t('structure.cacheHit', {unit});
      $('inputLabel').textContent = t('structure.input', {unit});
      $('outputLabel').textContent = t('structure.output', {unit});
      $('cacheUnit').textContent = unit;
      $('inputUnit').textContent = unit;
      $('outputUnit').textContent = unit;
    }
    function bindStructureInput(id, key) { $(id).addEventListener('input', event => { state[key] = num(event.target.value) * structureUnitFactor(); update(); }); }
    const SCENARIO_FIELDS = {
      comparison: [
        {key:'ratio', labelKey:'field.inputOutput', unit:': 1', step:'0.1'},
        {key:'hit', labelKey:'field.cacheHitRate', unit:'%', step:'0.1', converter:percent},
        {key:'total', labelKey:'field.totalTokens', unit:'M', step:'0.1'},
        {key:'multiplier', labelKey:'field.expenseMultiplier', unit:'x', step:'0.001'},
        {key:'fxRate', labelKey:'field.usdCnyRate', unit:'', step:'0.01'}
      ],
      tokenRows: [
        {key:'ratio', labelKey:'field.inputOutput', unit:': 1', step:'0.1'},
        {key:'hit', labelKey:'field.cacheHitRate', unit:'%', step:'0.1', converter:percent},
        {key:'total', labelKey:'field.totalTokens', unit:'M', step:'0.1'},
        {key:'multiplier', labelKey:'field.expenseMultiplier', unit:'x', step:'0.001'},
        {key:'fxRate', labelKey:'field.usdCnyRate', unit:'', step:'0.01'}
      ],
      budgetRows: [
        {key:'ratio', labelKey:'field.inputOutput', unit:': 1', step:'0.1'},
        {key:'hit', labelKey:'field.cacheHitRate', unit:'%', step:'0.1', converter:percent},
        {key:'budget', labelKey:'field.budget', unit:'', step:'1'},
        {key:'multiplier', labelKey:'field.expenseMultiplier', unit:'x', step:'0.001'},
        {key:'fxRate', labelKey:'field.usdCnyRate', unit:'', step:'0.01'}
      ]
    };

    function modelId(model, index, used) {
      const base = String(model.id || model.name || 'model-' + (index + 1)).toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'model-' + (index + 1);
      let id = base, suffix = 2;
      while (used.has(id)) id = base + '-' + suffix++;
      used.add(id);
      return id;
    }
    function orderModels(models) {
      return [...models].sort((a, b) => {
        const ai = PRESET_ORDER.indexOf(a.name), bi = PRESET_ORDER.indexOf(b.name);
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
      });
    }
    function configFor(type) { return type === 'comparison' ? state.comparisonConfig : (type === 'tokenRows' ? state.tokenConfig : state.budgetConfig); }
    function fieldsFor(type) { return SCENARIO_FIELDS[type].map(field => ({...field, label:t(field.labelKey)})); }
    function scenarioTokenValues(type) {
      if (type === 'comparison') return [state.comparisonConfig.total, ...comparisonModels().map(model => model.comparisonTotal)];
      if (type === 'tokenRows') return [state.tokenConfig.total, ...state.tokenRows.map(row => row.total)];
      return state.budgetRows.flatMap(row => {
        const usage = {ratio:scenarioValue('budgetRows', row, 'ratio'), hit:scenarioValue('budgetRows', row, 'hit')};
        const budget = scenarioValue('budgetRows', row, 'budget');
        const multiplier = scenarioValue('budgetRows', row, 'multiplier');
        const fxRate = scenarioValue('budgetRows', row, 'fxRate');
        const budgetUsd = budget / (state.currency === 'CNY' ? num(fxRate) : 1);
        return selectedModels('budgetRows').map(model => {
          const perM = cost(model, 1, usage, multiplier);
          return perM ? budgetUsd / perM : 0;
        });
      });
    }
    function scenarioTokenUnit(type) {
      const preference = normalizeTokenUnit(type === 'comparison' ? state.comparisonUnit : (type === 'tokenRows' ? state.tokenUnit : state.budgetUnit));
      return preference === 'auto' ? automaticTokenUnit(scenarioTokenValues(type)) : preference;
    }
    function scenarioFieldLabel(type, field) {
      if (field.key === 'budget') return t('field.budget', {symbol: state.currency === 'CNY' ? '\u00a5' : '$'});
      return (type === 'comparison' || type === 'tokenRows') && field.key === 'total' ? t('field.totalTokens') : field.label;
    }
    function scenarioFieldDisplayValue(type, field, value) {
      return (type === 'comparison' || type === 'tokenRows') && field.key === 'total' ? tokenDisplayValue(value, scenarioTokenUnit(type)) : value;
    }
    function scenarioFieldStoredValue(type, field, value) {
      const converted = (field.converter || num)(value);
      return (type === 'comparison' || type === 'tokenRows') && field.key === 'total' ? tokenStoredValue(converted, scenarioTokenUnit(type)) : converted;
    }
    function newRow(type, config) {
      const row = {};
      fieldsFor(type).forEach(field => { row[field.key] = config[field.key]; });
      return row;
    }
    function normalizeConfig(source, fallback, type) {
      const normalized = {shared:{}};
      fieldsFor(type).forEach(field => {
        const convert = field.converter || num;
        normalized[field.key] = convert(valueOr(source && source[field.key], fallback[field.key]));
        normalized.shared[field.key] = source && source.shared && typeof source.shared[field.key] === 'boolean' ? source.shared[field.key] : fallback.shared[field.key];
      });
      return normalized;
    }
    function normalizeRows(rows, type, config) {
      const source = Array.isArray(rows) ? rows : [newRow(type, config)];
      return source.map(row => {
        const normalized = {};
        fieldsFor(type).forEach(field => {
          const convert = field.converter || num;
          normalized[field.key] = convert(valueOr(row && row[field.key], config[field.key]));
        });
        return normalized;
      });
    }
    function migrate(raw, pricingConfig) {
      const saved = raw && typeof raw === 'object' ? raw : {};
      const oldRatio = valueOr(saved.estimateRatio, DEFAULT.tokenConfig.ratio);
      const oldHit = percent(valueOr(saved.estimateHit, DEFAULT.tokenConfig.hit));
      const oldTokenRows = Array.isArray(saved.tokenRows) ? saved.tokenRows : (Array.isArray(saved.scenarios) ? saved.scenarios : []);
      const oldBudgetRows = Array.isArray(saved.budgetRows) ? saved.budgetRows : (Array.isArray(saved.scenarios) ? saved.scenarios : []);
      if (![3, 4, 5, 6, 7, 8, 9, 10, 11].includes(saved.stateVersion)) {
        const firstToken = oldTokenRows[0] || {};
        const firstBudget = oldBudgetRows[0] || {};
        saved.tokenConfig = {ratio:oldRatio, hit:oldHit, total:valueOr(firstToken.total, 100), multiplier:valueOr(firstToken.multiplier, .04), shared:{ratio:true, hit:true, total:true, multiplier:true}};
        saved.budgetConfig = {ratio:oldRatio, hit:oldHit, budget:valueOr(firstBudget.budget, 100), multiplier:valueOr(firstBudget.multiplier, .04), shared:{ratio:true, hit:true, budget:true, multiplier:true}};
        saved.tokenRows = oldTokenRows.map(row => ({ratio:oldRatio, hit:oldHit, total:valueOr(row.total, 100), multiplier:valueOr(row.multiplier, .04)}));
        saved.budgetRows = oldBudgetRows.map(row => ({ratio:oldRatio, hit:oldHit, budget:valueOr(row.budget, 100), multiplier:valueOr(row.multiplier, .04)}));
        saved.stateVersion = 11;
      }
      saved.comparisonMultiplier = valueOr(saved.comparisonMultiplier, valueOr(saved.multiplier, DEFAULT.comparisonMultiplier));
      saved.comparisonFxRate = valueOr(saved.comparisonFxRate, valueOr(saved.fxRate, DEFAULT.comparisonFxRate));
      const comparisonFallback = {
        ratio:valueOr(saved.knownRatio, DEFAULT.comparisonConfig.ratio),
        hit:percent(valueOr(saved.knownHit, DEFAULT.comparisonConfig.hit)),
        total:DEFAULT.comparisonConfig.total,
        multiplier:valueOr(saved.comparisonMultiplier, DEFAULT.comparisonConfig.multiplier),
        fxRate:valueOr(saved.comparisonFxRate, DEFAULT.comparisonConfig.fxRate),
        shared:DEFAULT.comparisonConfig.shared
      };
      const comparisonConfig = normalizeConfig(saved.comparisonConfig, comparisonFallback, 'comparison');
      const usedIds = new Set();
      const bundledDefaults = new Map(DEFAULT.models.map(model => [String(model.id || model.name || '').toLowerCase(), model]));
      const storedModels = (Array.isArray(saved.models) && saved.models.length ? saved.models : clone(DEFAULT.models)).map(model => {
        const builtin = bundledDefaults.get(String(model.id || model.name || '').toLowerCase());
        if (!builtin) return model;
        return {
          ...model,
          provider:model.provider || builtin.provider,
          providerId:model.providerId || builtin.providerId,
          category:(!model.category || model.category === 'custom') ? builtin.category : model.category,
          categoryId:model.categoryId || builtin.categoryId,
          sourceModelId:model.sourceModelId || builtin.sourceModelId,
          targetId:model.targetId || builtin.targetId,
          source:model.source === 'litellm' ? model.source : (builtin.source || model.source)
        };
      });
      const storedModelKeys = new Set(storedModels.flatMap(model => [model.id, model.sourceModelId, model.targetId]).filter(Boolean).map(value => String(value).toLowerCase()));
      DEFAULT.models.forEach(model => {
        const keys = [model.id, model.sourceModelId, model.targetId].filter(Boolean).map(value => String(value).toLowerCase());
        if (!keys.some(key => storedModelKeys.has(key))) {
          storedModels.push(clone(model));
          keys.forEach(key => storedModelKeys.add(key));
        }
      });
      const filteredModels = storedModels.filter(model => catalogModelAllowed(model, pricingConfig));
      const rawModels = filteredModels.length ? filteredModels : clone(DEFAULT.models);
      const legacyModelMultiplier = valueOr(saved.comparisonMultiplier, valueOr(saved.multiplier, .04));
      const legacyModelFxRate = valueOr(saved.comparisonFxRate, valueOr(saved.fxRate, 7.2));
      const aliases = new Map();
      const aliasesByLowerCase = new Map();
      const models = orderModels(rawModels.map((model, index) => {
        const source = normalizeModelSource(model);
        const id = modelId(model, index, usedIds);
        const provider = modelProvider(model);
        const providerId = String(model.providerId || provider).trim();
        const customPricing = Boolean(model.customPricing);
        const catalogPricing = priceSnapshot(model.catalogPricing) ||
          (!customPricing && source !== 'manual' ? priceSnapshot(model) : bundledCatalogPricing(model));
        const normalized = {
          id, name:String(model.name || t('model.new')), category:String(model.category || (source === 'manual' ? 'custom' : 'general')).trim().toLowerCase(), categoryId:String(model.categoryId || '').trim(),
          provider, providerId, source, sourceModelId:String(model.sourceModelId || model.syncedFrom || ''), targetId:String(model.targetId || ''),
          icon:String(model.icon || ''), cache:priceNumber(model.cache), input:priceNumber(model.input), output:priceNumber(model.output), customPricing, catalogPricing,
          enabled:typeof model.enabled === 'boolean' ? model.enabled : source !== 'litellm',
          multiplier:valueOr(model.multiplier, legacyModelMultiplier), fxRate:valueOr(model.fxRate, legacyModelFxRate),
          comparisonRatio:valueOr(model.comparisonRatio, comparisonConfig.ratio),
          comparisonHit:percent(valueOr(model.comparisonHit, comparisonConfig.hit)),
          comparisonTotal:valueOr(model.comparisonTotal, comparisonConfig.total)
        };
        [model.id, model.name, model.sourceModelId, model.syncedFrom, id].filter(Boolean).forEach(value => {
          const key = String(value);
          aliases.set(key, id);
          aliasesByLowerCase.set(key.toLowerCase(), id);
        });
        return normalized;
      }));
      const tokenConfig = normalizeConfig(saved.tokenConfig, DEFAULT.tokenConfig, 'tokenRows');
      const budgetConfig = normalizeConfig(saved.budgetConfig, DEFAULT.budgetConfig, 'budgetRows');
      const legacySelected = Array.isArray(saved.selectedModelIds) ? saved.selectedModelIds : [];
      const resolveModelId = value => {
        const key = String(value || '');
        return aliases.get(key) || aliasesByLowerCase.get(key.toLowerCase()) || (models.some(model => model.id === key) ? key : null);
      };
      const rawCards = Array.isArray(saved.cards) ? saved.cards : [];
      const cards = rawCards.map((card, index) => {
        const type = CARD_TYPES.includes(card && card.type) ? card.type : 'multiplier';
        const selected = Array.isArray(card && card.selectedModelIds)
          ? [...new Set(card.selectedModelIds.map(resolveModelId).filter(Boolean))]
          : [];
        return {
          id:String(card && card.id || 'card-' + Date.now() + '-' + index),
          type,
          title:String(card && card.title || ''),
          customTitle:Boolean(card && card.customTitle),
          config:card && typeof card.config === 'object' ? clone(card.config) : {},
          selectedModelIds:selected,
          order:Number.isFinite(Number(card && card.order)) ? Number(card.order) : index
        };
      }).sort((a, b) => a.order - b.order).map((card, index) => ({...card, order:index}));
      const selectionFor = key => {
        const source = Array.isArray(saved[key]) ? saved[key] : legacySelected;
        return [...new Set(source.map(resolveModelId).filter(id => id && models.some(model => model.id === id && modelEnabled(model))))];
      };
      const comparisonSelectedModelIds = Array.isArray(saved.comparisonSelectedModelIds)
        ? [...new Set(saved.comparisonSelectedModelIds.map(resolveModelId).filter(id => id && models.some(model => model.id === id && modelEnabled(model))))]
        : models.filter(modelEnabled).map(model => model.id);
       const activeView = 'home';
       const theme = THEME_IDS.includes(saved.theme) ? saved.theme : 'system';
       const onboardingProviders = Array.isArray(saved.onboardingProviders)
         ? [...new Set(saved.onboardingProviders.map(normalizedProvider).filter(Boolean))]
         : [];
       return {
          ...DEFAULT, ...saved, models, comparisonConfig, tokenConfig, budgetConfig, cards, activeView, theme,
        structureUnit:normalizeTokenUnit(saved.structureUnit, normalizeTokenUnit(DEFAULT.structureUnit)),
        comparisonUnit:normalizeTokenUnit(saved.comparisonUnit, normalizeTokenUnit(DEFAULT.comparisonUnit)),
        tokenUnit:normalizeTokenUnit(saved.tokenUnit, normalizeTokenUnit(DEFAULT.tokenUnit)),
        budgetUnit:normalizeTokenUnit(saved.budgetUnit, normalizeTokenUnit(DEFAULT.budgetUnit)),
          sidebarCollapsed:Boolean(saved.sidebarCollapsed), showHostedModels:Boolean(saved.showHostedModels), settingsSection:['general', 'models', 'about', 'reset'].includes(saved.settingsSection) ? saved.settingsSection : 'general', cardsGridColumns:Math.min(6, Math.max(1, Number(saved.cardsGridColumns) || 3)), stateVersion:11,
         onboardingVersion:Number.isFinite(Number(saved.onboardingVersion)) ? Number(saved.onboardingVersion) : 0,
         onboardingStatus:saved.onboardingStatus === 'complete' ? 'complete' : 'pending',
         onboardingProviders,
         onboardingOnlineSync:typeof saved.onboardingOnlineSync === 'boolean' ? saved.onboardingOnlineSync : true,
         onboardingFullCatalog:typeof saved.onboardingFullCatalog === 'boolean' ? saved.onboardingFullCatalog : Boolean(saved.showHostedModels),
         tokenRows:normalizeRows(saved.tokenRows, 'tokenRows', tokenConfig),
        budgetRows:normalizeRows(saved.budgetRows, 'budgetRows', budgetConfig),
         comparisonSelectedModelIds,
        tokenSelectedModelIds:selectionFor('tokenSelectedModelIds'),
        budgetSelectedModelIds:selectionFor('budgetSelectedModelIds'),
        multiplierCalc: (() => {
          const calc = saved.multiplierCalc && typeof saved.multiplierCalc === 'object' ? saved.multiplierCalc : {};
          return {
            spent:valueOr(calc.spent, DEFAULT.multiplierCalc.spent),
            earned:valueOr(calc.earned, DEFAULT.multiplierCalc.earned),
            fxRate:valueOr(calc.fxRate, DEFAULT.multiplierCalc.fxRate),
            spentCurrency:['USD', 'CNY'].includes(calc.spentCurrency) ? calc.spentCurrency : DEFAULT.multiplierCalc.spentCurrency,
            earnedCurrency:['USD', 'CNY'].includes(calc.earnedCurrency) ? calc.earnedCurrency : DEFAULT.multiplierCalc.earnedCurrency
          };
        })()
      };
    }
    function loadLegacyState() {
      try { return JSON.parse(localStorage.getItem('token-cost-calc')); }
      catch { return null; }
    }
    let state;
    let saveTimer;
    let isResetting = false;
    let pendingModelId = null;
    let pendingModelConfigId = null;
    let pendingModelEditId = null;
    function userAddedModel(model) { return Boolean(model && model.source === 'manual'); }
    function save() {
      if (isResetting) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        if (isResetting) return;
        if (window.pywebview && window.pywebview.api) window.pywebview.api.save_state(state).catch(() => {});
      }, 180);
    }
    function applySidebarCollapsed(collapsed, persist=true) {
      const sidebar = document.querySelector('.sidebar');
      const shell = document.querySelector('.app-shell');
      const value = Boolean(collapsed);
      sidebar?.classList.toggle('is-collapsed', value);
      shell?.classList.toggle('sidebar-collapsed', value);
      document.body.classList.toggle('sidebar-overlay-open', !value);
      const button = $('sidebarToggle');
      if (button) {
        button.setAttribute('aria-expanded', String(!value));
        button.setAttribute('aria-label', uiText('sidebar.toggle', 'Toggle navigation', '切换侧边栏'));
        button.title = uiText('sidebar.toggle', 'Toggle navigation', '切换侧边栏');
      }
      if (state) {
        state.sidebarCollapsed = value;
        if (persist) save();
      }
    }
    function clearPricingStatus() {
      const status = $('pricingStatus');
      if (!status) return;
      status.className = 'pricing-status';
      status.textContent = '';
    }
    function setSettingsSection(section, persist=true) {
      const activeSection = ['general', 'models', 'about', 'reset'].includes(section) ? section : 'general';
      const settingsView = document.querySelector('[data-view-section="settings"]');
      if (!settingsView) return;
      const shell = document.querySelector('.app-shell');
      if (activeSection !== 'models' || state?.settingsSection !== 'models') clearPricingStatus();
      settingsView.classList.toggle('settings-models-active', activeSection === 'models');
      settingsView.classList.toggle('settings-about-active', activeSection === 'about');
      shell?.classList.toggle('settings-models-active', activeSection === 'models' && state?.activeView === 'settings');
      shell?.classList.toggle('settings-about-active', activeSection === 'about' && state?.activeView === 'settings');
      settingsView.querySelectorAll('[data-settings-section]').forEach(item => {
        const active = item.dataset.settingsSection === activeSection;
        item.hidden = !active;
        item.classList.toggle('is-active', active);
      });
      document.querySelectorAll('[data-settings-target]').forEach(button => {
        const active = button.dataset.settingsTarget === activeSection;
        button.classList.toggle('is-active', active);
        button.toggleAttribute('aria-current', active);
      });
      if (state) {
        state.settingsSection = activeSection;
        if (activeSection === 'models') renderSettingsModelList();
        if (persist) save();
      }
    }
    function renderMobileViewTitle(view) {
      const title = $('mobileViewTitle');
      if (!title) return;
      const section = document.querySelector('[data-view-section="' + view + '"]');
      const source = section && section.querySelector('.section-heading h2 > span:first-child');
      const text = source ? source.textContent.trim() : '';
      title.textContent = text;
      title.hidden = !text;
    }
    function setActiveView(view, persist=true) {
      const activeView = VIEW_IDS.includes(view) ? view : 'home';
      if (activeView !== 'settings' || state?.activeView !== 'settings') clearPricingStatus();
      document.querySelectorAll('[data-view-section]').forEach(section => {
        const active = section.dataset.viewSection === activeView;
        section.hidden = !active;
        section.classList.toggle('is-active', active);
      });
      renderMobileViewTitle(activeView);
      document.querySelectorAll('[data-view-target]').forEach(button => {
        const active = button.dataset.viewTarget === activeView;
        button.classList.toggle('active', active);
        button.classList.toggle('is-active', active);
        if (active) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
      });
      document.querySelectorAll('[data-view-footer]').forEach(element => { element.hidden = activeView === 'home' || activeView === 'settings'; });
      document.querySelector('.sidebar')?.classList.toggle('is-settings-mode', activeView === 'settings');
      document.querySelector('.app-shell')?.classList.toggle('tool-view-active', ['structure', 'comparison', 'tokenCost', 'budget', 'cards'].includes(activeView));
      document.querySelector('.app-shell')?.classList.toggle('settings-models-active', activeView === 'settings' && state?.settingsSection === 'models');
      document.querySelector('.app-shell')?.classList.toggle('settings-about-active', activeView === 'settings' && state?.settingsSection === 'about');
      if (state) {
        state.activeView = activeView;
        if (activeView === 'settings') setSettingsSection(state.settingsSection, false);
        if (persist) save();
      }
    }
    function applyTheme(preference) {
      const theme = THEME_IDS.includes(preference) ? preference : 'system';
      const resolved = theme === 'system' ? (systemTheme && systemTheme.matches ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.dataset.themePreference = theme;
      const select = $('theme');
      if (select) select.value = theme;
    }

    // Onboarding is intentionally self-contained.  The application can still be
    // embedded with an older index.html while the onboarding markup is rolling
    // out, so every DOM access in this section is optional.
    function onboardingRoot() {
      return $('onboardingDialog') || $('onboarding') ||
        document.querySelector('[data-onboarding-dialog], [data-onboarding-root], dialog[data-onboarding]');
    }
    function onboardingControl(name) {
      const root = onboardingRoot();
      const pascal = name.charAt(0).toUpperCase() + name.slice(1);
      return $('onboarding' + pascal) ||
        root?.querySelector('[data-onboarding-' + name + '], [data-onboarding-setting="' + name + '"]') || null;
    }
    function onboardingChoiceValue(control, fallback='') {
      if (!control) return fallback;
      if (control.matches?.('input[type="radio"]')) return control.checked ? control.value : fallback;
      const radio = control.querySelector?.('input[type="radio"]:checked');
      if (radio) return radio.value;
      return control.value == null ? fallback : control.value;
    }
    function setOnboardingChoice(control, value) {
      if (!control) return;
      const radios = control.matches?.('input[type="radio"]') ? [control] : [...(control.querySelectorAll?.('input[type="radio"]') || [])];
      if (radios.length) {
        radios.forEach(input => { input.checked = String(input.value) === String(value); });
      } else if ('value' in control) {
        control.value = value;
      }
    }
    function onboardingChecked(control, fallback=false) {
      if (!control) return fallback;
      if (control.matches?.('input[type="checkbox"]')) return control.checked;
      const input = control.querySelector?.('input[type="checkbox"]');
      return input ? input.checked : Boolean(control.checked);
    }
    function setOnboardingChecked(control, value) {
      const input = control?.matches?.('input[type="checkbox"]') ? control : control?.querySelector?.('input[type="checkbox"]');
      if (input) input.checked = Boolean(value);
    }
    function canonicalOnboardingProvider(value) {
      const candidate = normalizedProvider(value);
      const providers = PRICING_CONFIG && PRICING_CONFIG.providers && typeof PRICING_CONFIG.providers === 'object'
        ? PRICING_CONFIG.providers : {};
      for (const [id, details] of Object.entries(providers)) {
        if (candidate === normalizedProvider(id) || candidate === normalizedProvider(details && details.name)) return normalizedProvider(id);
      }
      return candidate;
    }
    function configuredOnboardingValue(names) {
      const roots = [
        PRICING_CONFIG && PRICING_CONFIG.onboarding,
        PRICING_CONFIG && PRICING_CONFIG.setup,
        PRICING_CONFIG,
        DEFAULT && DEFAULT.onboarding,
        DEFAULT
      ].filter(value => value && typeof value === 'object');
      for (const root of roots) {
        for (const name of names) {
          if (root[name] != null) return root[name];
        }
      }
      return null;
    }
    function collectOnboardingRecommendations(value, inheritedProvider='', output=[], visited=new Set()) {
      if (value == null) return output;
      if (typeof value === 'string' || typeof value === 'number') {
        output.push({providerId:canonicalOnboardingProvider(inheritedProvider), ids:[String(value)], model:null});
        return output;
      }
      if (Array.isArray(value)) {
        value.forEach(item => collectOnboardingRecommendations(item, inheritedProvider, output, visited));
        return output;
      }
      if (typeof value !== 'object' || visited.has(value)) return output;
      visited.add(value);
      const providerId = canonicalOnboardingProvider(value.providerId || value.provider || value.vendor || value.providerKey || inheritedProvider);
      const containers = ['models', 'recommendedModels', 'recommendations', 'modelRecommendations', 'items', 'defaults']
        .filter(key => value[key] != null);
      const ids = [value.sourceModelId, value.modelId, value.model, value.targetId, value.id, value.name]
        .filter(item => typeof item === 'string' || typeof item === 'number').map(String);
      const isModel = ids.length > 0 && (containers.length === 0 || value.sourceModelId || value.modelId || value.model || value.targetId || hasPrice(value));
      if (isModel) output.push({providerId, ids, model:hasPrice(value) ? value : null});
      containers.forEach(key => collectOnboardingRecommendations(value[key], providerId, output, visited));
      if (!isModel && !containers.length) {
        Object.entries(value).forEach(([key, item]) => {
          if (!['providerId', 'provider', 'vendor', 'providerKey', 'name', 'id'].includes(key)) {
            collectOnboardingRecommendations(item, providerId || canonicalOnboardingProvider(key), output, visited);
          }
        });
      }
      return output;
    }
    function onboardingRecommendationDescriptors() {
      const candidates = [
        configuredOnboardingValue(['recommendedModelsByProvider']),
        configuredOnboardingValue(['recommendedModels']),
        configuredOnboardingValue(['recommendations']),
        configuredOnboardingValue(['modelRecommendations']),
        configuredOnboardingValue(['recommended'])
      ].filter(value => value != null);
      const descriptors = [];
      candidates.forEach(value => collectOnboardingRecommendations(value, '', descriptors));
      if (descriptors.length) return descriptors;
      const fallback = PRICING_CONFIG && Array.isArray(PRICING_CONFIG.fallbackModels) ? PRICING_CONFIG.fallbackModels : (DEFAULT?.models || []);
      fallback.forEach(model => {
        if (!model || typeof model !== 'object') return;
        descriptors.push({
          providerId:canonicalOnboardingProvider(model.providerId || model.provider),
          ids:[model.sourceModelId, model.targetId, model.id, model.name].filter(Boolean).map(String),
          model
        });
      });
      return descriptors;
    }
    function collectOnboardingSnapshots(value, output=[], visited=new Set()) {
      if (value == null) return output;
      if (Array.isArray(value)) {
        value.forEach(item => collectOnboardingSnapshots(item, output, visited));
        return output;
      }
      if (typeof value !== 'object' || visited.has(value)) return output;
      visited.add(value);
      if (hasPrice(value) && (value.sourceModelId || value.modelId || value.id || value.name)) output.push(value);
      ['models', 'fallbackModels', 'snapshots', 'recommendedModels', 'recommendations', 'modelRecommendations', 'items']
        .forEach(key => { if (value[key] != null) collectOnboardingSnapshots(value[key], output, visited); });
      return output;
    }
    function onboardingSnapshotModels() {
      const snapshots = [];
      const onboardingConfig = PRICING_CONFIG && PRICING_CONFIG.onboarding;
      collectOnboardingSnapshots(onboardingConfig && onboardingConfig.fallbackModels, snapshots);
      collectOnboardingSnapshots(onboardingConfig && onboardingConfig.snapshots, snapshots);
      collectOnboardingSnapshots(PRICING_CONFIG && PRICING_CONFIG.fallbackModels, snapshots);
      onboardingRecommendationDescriptors().forEach(descriptor => {
        if (descriptor.model) snapshots.push(descriptor.model);
      });
      collectOnboardingSnapshots(DEFAULT?.models, snapshots);
      const seen = new Set();
      return snapshots.filter(model => {
        const key = String(model.sourceModelId || model.modelId || model.id || model.name || '').trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    function onboardingProviderChoices() {
      const fromConfig = configuredOnboardingValue(['providers', 'providerChoices', 'supportedProviders']);
      const choices = [];
      const add = (id, details={}) => {
        const providerId = canonicalOnboardingProvider(id || details.providerId || details.provider);
        if (!providerId || choices.some(choice => choice.id === providerId) || choices.length >= ONBOARDING_PROVIDER_LIMIT) return;
        const providers = PRICING_CONFIG && PRICING_CONFIG.providers && typeof PRICING_CONFIG.providers === 'object' ? PRICING_CONFIG.providers : {};
        const meta = providers[providerId] || {};
        choices.push({id:providerId, label:String(details.name || details.label || meta.name || id || providerId)});
      };
      if (Array.isArray(fromConfig)) {
        fromConfig.forEach(item => add(typeof item === 'object' ? (item.id || item.providerId || item.provider) : item, typeof item === 'object' ? item : {}));
      } else if (fromConfig && typeof fromConfig === 'object') {
        Object.entries(fromConfig).forEach(([id, details]) => add(id, typeof details === 'object' ? details : {name:details}));
      }
      if (!choices.length) {
        const whitelist = Array.isArray(PRICING_CONFIG && PRICING_CONFIG.providerWhitelist) ? PRICING_CONFIG.providerWhitelist : [];
        whitelist.forEach(id => add(id));
      }
      if (!choices.length) onboardingRecommendationDescriptors().forEach(descriptor => add(descriptor.providerId));
      return choices;
    }
    function onboardingProviderElements(root=onboardingRoot()) {
      return root ? [...root.querySelectorAll('[data-onboarding-provider]')] : [];
    }
    function onboardingProviderId(element) {
      return canonicalOnboardingProvider(element?.dataset?.onboardingProvider || element?.value || '');
    }
    function selectedOnboardingProviders(root=onboardingRoot()) {
      const selected = onboardingProviderElements(root).filter(element => {
        if (element.matches('input[type="checkbox"], input[type="radio"]')) return element.checked;
        return element.classList.contains('is-selected') || element.getAttribute('aria-pressed') === 'true' || element.dataset.selected === 'true';
      }).map(onboardingProviderId).filter(Boolean);
      return [...new Set(selected)];
    }
    function setSelectedOnboardingProviders(providerIds, root=onboardingRoot()) {
      const selected = new Set((providerIds || []).map(canonicalOnboardingProvider).filter(Boolean));
      onboardingProviderElements(root).forEach(element => {
        const active = selected.has(onboardingProviderId(element));
        if (element.matches('input[type="checkbox"], input[type="radio"]')) element.checked = active;
        element.classList.toggle('is-selected', active);
        element.dataset.selected = String(active);
        if (!element.matches('input')) element.setAttribute('aria-pressed', String(active));
      });
    }
    function onboardingSelectedModelCount(providerIds=selectedOnboardingProviders()) {
      const providers = new Set((providerIds || []).map(canonicalOnboardingProvider).filter(Boolean));
      const descriptors = onboardingRecommendationDescriptors();
      const seen = new Set();
      return onboardingSnapshotModels().filter(model => {
        if (!providers.has(canonicalOnboardingProvider(model.providerId || model.provider))) return false;
        if (!modelIsOnboardingRecommendation(model, descriptors)) return false;
        const key = String(model.sourceModelId || model.modelId || model.id || model.name || '').trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      }).length;
    }
    function renderOnboardingProviderSummary(root=onboardingRoot()) {
      const summary = root?.querySelector('[data-onboarding-model-count]');
      if (!summary) return;
      summary.textContent = t('onboarding.providers.modelCount', {count:onboardingSelectedModelCount()});
    }
    function renderOnboardingProviderChoices(root=onboardingRoot()) {
      if (!root || onboardingProviderElements(root).length) return;
      const target = $('onboardingProviderList') || $('onboardingProviders') || root.querySelector('[data-onboarding-provider-list]');
      if (!target) return;
      const selected = new Set(state?.onboardingProviders || []);
      target.innerHTML = onboardingProviderChoices().map(choice => {
        const checked = selected.has(choice.id) ? ' checked' : '';
        return '<label class="onboarding-provider-option"><input type="checkbox" data-onboarding-provider="' + escapeHtml(choice.id) + '" value="' + escapeHtml(choice.id) + '"' + checked + '><span>' + escapeHtml(choice.label) + '</span></label>';
      }).join('');
    }
    function onboardingModelIdentifiers(model) {
      return new Set([model && model.sourceModelId, model && model.modelId, model && model.targetId, model && model.id, model && model.name]
        .filter(Boolean).map(value => String(value).trim().toLowerCase()));
    }
    function modelIsOnboardingRecommendation(model, descriptors) {
      const providerId = canonicalOnboardingProvider(model && (model.providerId || model.provider));
      const identities = onboardingModelIdentifiers(model);
      return descriptors.some(descriptor => {
        if (descriptor.providerId && providerId !== descriptor.providerId) return false;
        const ids = (descriptor.ids || []).map(value => String(value).trim().toLowerCase()).filter(Boolean);
        return !ids.length || ids.some(id => identities.has(id));
      });
    }
    function installOnboardingSnapshot() {
      const snapshots = onboardingSnapshotModels();
      if (snapshots.length) mergePricingModels(snapshots);
    }
    function applyOnboardingModelSelection() {
      if (!state || !Array.isArray(state.models)) return [];
      const providers = new Set((state.onboardingProviders || []).map(canonicalOnboardingProvider).filter(Boolean));
      const descriptors = onboardingRecommendationDescriptors();
      let selected = state.models.filter(model => providers.has(canonicalOnboardingProvider(model.providerId || model.provider)) && modelIsOnboardingRecommendation(model, descriptors));
      // A malformed recommendation list should not leave the calculator with no
      // models.  The local snapshot for a chosen provider is the safe fallback.
      if (!selected.length) selected = state.models.filter(model => providers.has(canonicalOnboardingProvider(model.providerId || model.provider)) && hasPrice(model));
      const selectedIds = new Set(selected.map(model => model.id));
      state.models.forEach(model => { model.enabled = selectedIds.has(model.id); });
      const defaultIds = selected.slice(0, ONBOARDING_DEFAULT_MODEL_LIMIT).map(model => model.id);
      state.comparisonSelectedModelIds = [...defaultIds];
      state.tokenSelectedModelIds = [...defaultIds];
      state.budgetSelectedModelIds = [...defaultIds];
      return defaultIds;
    }
    function setOnboardingFeedback(message='', kind='') {
      const root = onboardingRoot();
      const feedback = $('onboardingError') || $('onboardingStatus') || root?.querySelector('[data-onboarding-error], [data-onboarding-status]');
      if (!feedback) return;
      feedback.textContent = message;
      feedback.hidden = !message;
      feedback.dataset.state = kind;
    }
    function onboardingMotionDuration(duration) {
      return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : duration;
    }
    function renderOnboardingProgress(root, steps) {
      const activeName = String(steps[onboardingStep].dataset.onboardingStep || '');
      root.dataset.onboardingStep = String(onboardingStep + 1);
      root.querySelectorAll('[data-onboarding-current-step]').forEach(node => { node.textContent = String(onboardingStep + 1); });
      root.querySelectorAll('[data-onboarding-total-steps]').forEach(node => { node.textContent = String(steps.length); });
      root.querySelectorAll('[data-onboarding-progress-step]').forEach(node => {
        const active = node.dataset.onboardingProgressStep === activeName;
        node.classList.toggle('is-active', active);
        if (active) node.setAttribute('aria-current', 'step');
        else node.removeAttribute('aria-current');
      });
      root.querySelectorAll('[data-onboarding-next], #onboardingNext').forEach(button => { button.hidden = onboardingStep >= steps.length - 1; });
      root.querySelectorAll('[data-onboarding-complete], #onboardingComplete').forEach(button => { button.hidden = onboardingStep < steps.length - 1; });
      root.querySelectorAll('[data-onboarding-prev], #onboardingPrev').forEach(button => { button.hidden = onboardingStep === 0; });
    }
    function renderOnboardingSteps() {
      const root = onboardingRoot();
      if (!root) return;
      const steps = [...root.querySelectorAll('[data-onboarding-step]')];
      if (!steps.length) return;
      onboardingStep = Math.max(0, Math.min(onboardingStep, steps.length - 1));
      steps.forEach((step, index) => {
        const active = index === onboardingStep;
        step.hidden = !active;
        step.classList.toggle('is-active', active);
        step.classList.remove('is-entering', 'is-exiting', 'is-forward', 'is-backward', 'is-animating');
        step.setAttribute('aria-hidden', String(!active));
      });
      renderOnboardingProgress(root, steps);
    }
    function onboardingStepNaturalHeight(step) {
      if (!step) return 0;
      const wasHidden = step.hidden;
      const previousStyle = step.getAttribute('style');
      const previousAriaHidden = step.getAttribute('aria-hidden');
      step.hidden = false;
      step.setAttribute('aria-hidden', 'true');
      step.classList.add('is-measuring');
      const height = Math.ceil(step.getBoundingClientRect().height);
      step.classList.remove('is-measuring');
      if (previousStyle == null) step.removeAttribute('style');
      else step.setAttribute('style', previousStyle);
      if (previousAriaHidden == null) step.removeAttribute('aria-hidden');
      else step.setAttribute('aria-hidden', previousAriaHidden);
      step.hidden = wasHidden;
      return height;
    }
    function stabilizeOnboardingFormHeight(root=onboardingRoot()) {
      const form = root?.querySelector('.onboarding-form');
      const steps = root ? [...root.querySelectorAll('[data-onboarding-step]')] : [];
      if (!form || !steps.length) return;
      form.style.removeProperty('--onboarding-step-height');
      const height = Math.max(...steps.map(onboardingStepNaturalHeight));
      if (height) form.style.setProperty('--onboarding-step-height', height + 'px');
    }
    function setOnboardingStep(target) {
      const root = onboardingRoot();
      const steps = root ? [...root.querySelectorAll('[data-onboarding-step]')] : [];
      const index = typeof target === 'number'
        ? target
        : steps.findIndex(step => String(step.dataset.onboardingStep) === String(target));
      if (index < 0 || !steps.length || onboardingTransitioning) return;
      const nextStep = Math.max(0, Math.min(index, steps.length - 1));
      if (nextStep === onboardingStep) return;
      const previousStep = onboardingStep;
      const outgoing = steps[previousStep];
      const incoming = steps[nextStep];
      const direction = nextStep > previousStep ? 'is-forward' : 'is-backward';
      const form = root.querySelector('.onboarding-form');
      const outgoingHeight = Math.ceil(outgoing.getBoundingClientRect().height);
      const incomingHeight = onboardingStepNaturalHeight(incoming);
      const transitionHeight = Math.max(outgoingHeight, incomingHeight);
      onboardingTransitioning = true;
      onboardingStep = nextStep;
      if (form && transitionHeight) form.style.height = transitionHeight + 'px';
      if (outgoingHeight) outgoing.style.height = outgoingHeight + 'px';
      outgoing.classList.add('is-exiting', direction);
      root.classList.add('is-step-transitioning');
      window.requestAnimationFrame(() => {
        outgoing.classList.add('is-animating');
      });
      window.setTimeout(() => {
        outgoing.hidden = true;
        outgoing.setAttribute('aria-hidden', 'true');
        outgoing.classList.remove('is-active', 'is-exiting', direction, 'is-animating');
        incoming.hidden = false;
        incoming.setAttribute('aria-hidden', 'false');
        incoming.classList.add('is-active', 'is-entering', direction);
        renderOnboardingProgress(root, steps);
        window.requestAnimationFrame(() => incoming.classList.add('is-animating'));
        window.setTimeout(() => {
          incoming.classList.remove('is-entering', direction, 'is-animating');
          outgoing.style.height = '';
          if (form) form.style.height = '';
          root.classList.remove('is-step-transitioning');
          onboardingTransitioning = false;
        }, onboardingMotionDuration(320));
      }, onboardingMotionDuration(280));
    }
    function syncOnboardingDataDependency(root=onboardingRoot()) {
      if (!root) return;
      const online = onboardingChecked(onboardingControl('onlineSync'), false);
      const fullCatalog = onboardingControl('fullCatalog');
      if (!online) setOnboardingChecked(fullCatalog, false);
      const required = root.querySelectorAll('[data-onboarding-requires="sync-catalog"]');
      required.forEach(node => {
        const input = node.matches('input, select, button') ? node : node.querySelector('input, select, button');
        if (input) input.disabled = !online;
        node.closest('label')?.classList.toggle('is-disabled', !online);
      });
      root.querySelectorAll('[data-onboarding-dependency-hint="sync-catalog"]').forEach(node => { node.hidden = online; });
    }
    function applyOnboardingPreferences(render=true) {
      if (!state) return;
      const language = onboardingChoiceValue(onboardingControl('language'), state.language);
      const currency = onboardingChoiceValue(onboardingControl('currency'), state.currency);
      const theme = onboardingChoiceValue(onboardingControl('theme'), state.theme);
      if (language) state.language = window.i18n.setLocale(language);
      if (['USD', 'CNY'].includes(currency)) state.currency = currency;
      if (THEME_IDS.includes(theme)) state.theme = theme;
      state.onboardingOnlineSync = onboardingChecked(onboardingControl('onlineSync'), state.onboardingOnlineSync);
      if (!state.onboardingOnlineSync) setOnboardingChecked(onboardingControl('fullCatalog'), false);
      state.onboardingFullCatalog = state.onboardingOnlineSync && onboardingChecked(onboardingControl('fullCatalog'), state.onboardingFullCatalog);
      state.showHostedModels = state.onboardingFullCatalog;
      if ($('showHostedModels')) $('showHostedModels').checked = state.showHostedModels;
      if ($('language')) $('language').value = state.language;
      if ($('currency')) $('currency').value = state.currency;
      applyTheme(state.theme);
      if (window.i18n) window.i18n.translateDocument();
      syncOnboardingDataDependency();
      if (!render) return;
      renderMobileViewTitle(state.activeView);
      renderStructureUnit();
      renderSettingsModelFilters();
      update();
    }
    function hydrateOnboarding(root=onboardingRoot()) {
      if (!root || !state) return;
      renderOnboardingProviderChoices(root);
      setOnboardingChoice(onboardingControl('language'), state.language);
      setOnboardingChoice(onboardingControl('currency'), state.currency);
      setOnboardingChoice(onboardingControl('theme'), state.theme);
      setOnboardingChecked(onboardingControl('onlineSync'), state.onboardingOnlineSync);
      setOnboardingChecked(onboardingControl('fullCatalog'), state.onboardingFullCatalog);
      syncOnboardingDataDependency(root);
      setSelectedOnboardingProviders(state.onboardingProviders, root);
      renderOnboardingProviderSummary(root);
      renderOnboardingSteps();
    }
    function playHomeEntrance() {
      const home = document.querySelector('[data-view-section="home"]');
      if (!home) return;
      home.classList.remove('is-onboarding-entering');
      void home.offsetWidth;
      home.classList.add('is-onboarding-entering');
      window.setTimeout(() => home.classList.remove('is-onboarding-entering'), onboardingMotionDuration(520));
    }
    function closeOnboarding(onClosed) {
      const root = onboardingRoot();
      if (!root) {
        document.body.classList.remove('app-booting', 'onboarding-open');
        onClosed?.();
        return;
      }
      if (onboardingClosing) return;
      onboardingClosing = true;
      // Reveal the prepared home view behind the opaque onboarding screen, so its
      // entrance overlaps the screen fade instead of starting after it.
      document.body.classList.remove('app-booting', 'onboarding-open');
      playHomeEntrance();
      root.classList.add('is-closing');
      window.setTimeout(() => {
        root.classList.remove('is-open', 'is-closing', 'is-initializing');
        if (root.open && typeof root.close === 'function') root.close();
        else root.hidden = true;
        onboardingClosing = false;
        onClosed?.();
      }, onboardingMotionDuration(340));
    }
    function shouldShowOnboarding(rawState) {
      return !rawState || rawState.onboardingStatus !== 'complete';
    }
    function showOnboarding(rawState) {
      const root = onboardingRoot();
      if (!root || !state || !shouldShowOnboarding(rawState)) return false;
      hydrateOnboarding(root);
      onboardingStep = 0;
      renderOnboardingSteps();
      const resetReason = (() => { try { return sessionStorage.getItem(ONBOARDING_RESET_SESSION_KEY); } catch (_) { return null; } })();
      if (resetReason) {
        root.dataset.onboardingReason = resetReason;
        try { sessionStorage.removeItem(ONBOARDING_RESET_SESSION_KEY); } catch (_) {}
      }
      document.body.classList.add('onboarding-open');
      root.hidden = false;
      root.classList.add('is-open', 'is-initializing');
      stabilizeOnboardingFormHeight(root);
      window.setTimeout(() => root.classList.remove('is-initializing'), onboardingMotionDuration(360));
      if (typeof root.showModal === 'function' && !root.open) {
        try { root.showModal(); } catch (_) { /* A non-dialog fallback remains visible. */ }
      }
      window.setTimeout(() => root.querySelector('input, select, button')?.focus(), 0);
      return true;
    }
    async function refreshOnboardingCatalog() {
      try {
        const result = await fetchPricingCatalog();
        mergePricingModels(Array.isArray(result.models) ? result.models : []);
        state.pricingCatalogInitialized = true;
        state.pricingCatalogFetchedAt = result.fetchedAt || new Date().toISOString();
        applyOnboardingModelSelection();
        update();
        if (result.warning) console.warn(result.warning);
      } catch (error) {
        // The already-installed bundled snapshot remains usable when the network
        // is unavailable.  Do not surface a blocking error after setup is done.
        console.warn('Onboarding pricing sync failed; keeping bundled prices.', error);
      }
    }
    function completeOnboarding() {
      if (!state || onboardingSubmitting) return;
      applyOnboardingPreferences(false);
      const providers = selectedOnboardingProviders();
      onboardingSubmitting = true;
      state.onboardingProviders = providers;
      state.onboardingVersion = ONBOARDING_VERSION;
      state.onboardingStatus = 'complete';
      state.pricingCatalogInitialized = true;
      installOnboardingSnapshot();
      applyOnboardingModelSelection();
      renderStructureUnit();
      update();
      closeOnboarding(() => { onboardingSubmitting = false; });
      if (state.onboardingOnlineSync) void refreshOnboardingCatalog();
    }
    function setupOnboarding() {
      const root = onboardingRoot();
      if (!root || root.dataset.onboardingBound) return;
      root.dataset.onboardingBound = 'true';
      const skipProvidersDialog = $('onboardingSkipProvidersDialog');
      const skipProvidersConfirm = $('onboardingSkipProvidersConfirm');
      const requestOnboardingStep = target => {
        const steps = [...root.querySelectorAll('[data-onboarding-step]')];
        const nextIndex = typeof target === 'number'
          ? target
          : steps.findIndex(step => String(step.dataset.onboardingStep) === String(target));
        const currentName = String(steps[onboardingStep]?.dataset.onboardingStep || '');
        if (currentName === 'providers' && nextIndex > onboardingStep && !selectedOnboardingProviders(root).length && !onboardingSkipProvidersConfirmed) {
          if (skipProvidersDialog) {
            skipProvidersDialog.dataset.onboardingStepTarget = String(target);
            skipProvidersDialog.showModal();
            return;
          }
        }
        setOnboardingStep(target);
      };
      if (skipProvidersDialog && !skipProvidersDialog.dataset.onboardingBound) {
        skipProvidersDialog.dataset.onboardingBound = 'true';
        skipProvidersConfirm?.addEventListener('click', () => {
          onboardingSkipProvidersConfirmed = true;
          const target = skipProvidersDialog.dataset.onboardingStepTarget || 'data';
          skipProvidersDialog.close();
          setOnboardingStep(target);
        });
        skipProvidersDialog.addEventListener('click', event => {
          if (event.target === skipProvidersDialog) skipProvidersDialog.close();
        });
      }
      root.addEventListener('change', event => {
        const target = event.target;
        if (target.closest?.('[data-onboarding-provider]')) {
          if (state) state.onboardingProviders = selectedOnboardingProviders(root);
          onboardingSkipProvidersConfirmed = false;
          renderOnboardingProviderSummary(root);
          setOnboardingFeedback();
          return;
        }
        if (target.matches?.('#onboardingLanguage input, #onboardingCurrency input, #onboardingTheme input, #onboardingOnlineSync, #onboardingFullCatalog, [data-onboarding-setting], [data-onboarding-preference]')) {
          applyOnboardingPreferences();
        }
      });
      root.addEventListener('click', event => {
        const provider = event.target.closest?.('[data-onboarding-provider]');
        if (provider && !provider.matches('input')) {
          const selected = new Set(selectedOnboardingProviders(root));
          const id = onboardingProviderId(provider);
          if (selected.has(id)) selected.delete(id); else selected.add(id);
          state.onboardingProviders = [...selected];
          onboardingSkipProvidersConfirmed = false;
          setSelectedOnboardingProviders(state.onboardingProviders, root);
          renderOnboardingProviderSummary(root);
          setOnboardingFeedback();
          return;
        }
        if (event.target.closest?.('[data-onboarding-prev], #onboardingPrev')) {
          const button = event.target.closest('[data-onboarding-prev], #onboardingPrev');
          setOnboardingStep(button.dataset.onboardingStepTarget || onboardingStep - 1);
          return;
        }
        if (event.target.closest?.('[data-onboarding-next], #onboardingNext')) {
          const button = event.target.closest('[data-onboarding-next], #onboardingNext');
          requestOnboardingStep(button.dataset.onboardingStepTarget || onboardingStep + 1);
          return;
        }
        if (event.target.closest?.('[data-onboarding-complete], #onboardingComplete')) completeOnboarding();
      });
      root.querySelector('form')?.addEventListener('submit', event => { event.preventDefault(); completeOnboarding(); });
      root.addEventListener('cancel', event => event.preventDefault());
    }
    const money = (usd, fxRate) => {
      const amount = state.currency === 'CNY' ? usd * num(fxRate) : usd;
      const symbol = state.currency === 'CNY' ? '\u00a5' : '$';
      return symbol + amount.toLocaleString('zh-CN', {maximumFractionDigits:2});
    };
    const dualMoney = (usd, fxRate) => '$' + usd.toLocaleString('zh-CN', {maximumFractionDigits:2}) + ' / ¥' + (usd * num(fxRate)).toLocaleString('zh-CN', {maximumFractionDigits:2});
    const tokens = (amountM, unit='M') => (num(amountM) / tokenUnitFactor(unit)).toLocaleString('zh-CN', {maximumFractionDigits:2}) + ' ' + unit + ' Token';
    function bind(id, key, converter=num) { $(id).addEventListener('input', e => { state[key] = converter(e.target.value); update(); }); }
    function priceRow(label, key) { return `<div class="cell label-cell">${comparisonLabel(label)}<em class="cell-unit">${comparisonLabel(t('model.customPricing.unit'))}</em></div>${comparisonModels().map(m => `<div class="cell"><input class="price-input" data-model-key="${key}" data-model-id="${m.id}" type="number" min="0" step="0.001" value="${m[key]}"></div>`).join('')}`; }
    function multipliedPriceRow(label, key) { return `<div class="cell label-cell">${comparisonLabel(label)}</div>${comparisonModels().map(m => `<div class="cell"><div class="money">${dualMoney(num(m[key]) * num(comparisonValue(m, 'multiplier')), comparisonValue(m, 'fxRate'))}</div></div>`).join('')}`; }    function standardCost(model, totalM, usage) {
      const ratio = num(usage.ratio);
      const hit = percent(usage.hit) / 100;
      const total = totalM * 1000000;
      const inputTotal = total * ratio / (ratio + 1);
      const cache = inputTotal * hit, input = inputTotal - cache, output = total - inputTotal;
      return (cache * num(model.cache) + input * num(model.input) + output * num(model.output)) / 1000000;
    }
    function cost(model, totalM, usage, multiplier) { return standardCost(model, totalM, usage) * num(multiplier); }
    function escapeHtml(text) { const node=document.createElement('span'); node.textContent=text; return node.innerHTML; }
    function comparisonLabel(label) { return escapeHtml(label).replace(/\n/g, '<br>'); }
    function globMatch(value, pattern) {
      const escaped = String(pattern || '').replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
      return new RegExp('^' + escaped + '$', 'i').test(String(value || ''));
    }
    function catalogModelAllowed(model, config) {
      if (model.source !== 'litellm') return true;
      const filters = config && config.filters || {};
      const allModels = Boolean(filters.allModels || filters.includeAll || filters.syncAll);
      const provider = String(model.providerId || '').toLowerCase();
      const sourceId = String(model.sourceModelId || '').toLowerCase();
      const providers = allModels ? [] : (Array.isArray(filters.providers) ? filters.providers.map(value => String(value).toLowerCase()) : []);
      const includes = Array.isArray(filters.includeModels) ? filters.includeModels : [];
      const allowedModels = allModels ? [] : includes;
      if (providers.length && !providers.some(value => provider === value || provider.includes(value) || sourceId.startsWith(value + '/'))) return false;
      if (allowedModels.length && !allowedModels.some(pattern => globMatch(sourceId, pattern))) return false;
      return true;
    }
    function safeIconUrl(value) {
      const url = String(value || '').trim();
      return /^(https:\/\/|data:image\/|icons\/)/i.test(url) ? escapeHtml(url) : '';
    }
    function localIconUrl(value) {
      const url = String(value || '').trim();
      return /^icons\//i.test(url) ? url + (url.includes('?') ? '&' : '?') + 'v=2' : url;
    }
    function providerIconSources(model) {
      const meta = modelProviderMeta(model);
      const source = PRICING_CONFIG && PRICING_CONFIG.iconSource && typeof PRICING_CONFIG.iconSource === 'object'
        ? PRICING_CONFIG.iconSource : {};
      const aliases = source.aliases && typeof source.aliases === 'object' ? source.aliases : {};
      const providerId = normalizedProvider(meta.id || model && model.providerId || model && model.provider);
      const slug = String(aliases[providerId] || providerId).trim().toLowerCase();
      const baseUrl = String(source.baseUrl || '').replace(/\/$/, '');
      const catalogIcon = baseUrl && slug ? localIconUrl(baseUrl + '/' + encodeURIComponent(slug) + '.svg') : '';
      const local = localIconUrl(meta.icon || model && model.icon || '');
      const primary = safeIconUrl(catalogIcon || local);
      const fallback = safeIconUrl(local);
      return {primary, fallback:primary !== fallback ? fallback : '', monochrome:Boolean(meta.icon)};
    }
    function setupModelIconFallback() {
      if (document.documentElement.dataset.modelIconFallbackBound) return;
      document.documentElement.dataset.modelIconFallbackBound = 'true';
      document.addEventListener('error', event => {
        const image = event.target;
        if (!(image instanceof HTMLImageElement) || !image.classList.contains('model-brand-icon')) return;
        const localSource = image.dataset.localSource;
        if (localSource && image.dataset.localAttempted !== 'true') {
          image.dataset.localAttempted = 'true';
          image.src = localSource;
          return;
        }
        const fallback = document.createElement('span');
        fallback.className = 'model-brand-fallback';
        fallback.setAttribute('aria-hidden', 'true');
        fallback.textContent = image.dataset.fallback || '?';
        image.replaceWith(fallback);
      }, true);
    }
    function modelBadge(model, compact=false, tooltip=false) {
      const iconSources = providerIconSources(model);
      const provider = modelProvider(model);
      const fallback = escapeHtml((provider || model.name || '?').trim().charAt(0).toUpperCase() || '?');
      const visual = iconSources.primary
        ? '<img class="model-brand-icon' + (iconSources.monochrome ? ' is-monochrome' : '') + '" src="' + iconSources.primary + '"' + (iconSources.fallback ? ' data-local-source="' + iconSources.fallback + '"' : '') + ' alt="" decoding="async" data-fallback="' + fallback + '">'
        : '<span class="model-brand-fallback" aria-hidden="true">' + fallback + '</span>';
      return '<span class="model-badge' + (compact ? ' compact' : '') + (tooltip ? ' has-model-tooltip' : '') + '"' + (tooltip ? ' data-model-tooltip="' + escapeHtml(model.name) + '"' : '') + '>' + visual +
        '<span class="model-badge-text"><strong>' + escapeHtml(model.name) + '</strong>' +
        (provider && !compact ? '<small>' + escapeHtml(provider) + '</small>' : '') + '</span></span>';
    }
    function providerFilterBadge(provider, model) {
      const iconSources = providerIconSources(model);
      const fallback = escapeHtml(String(provider || '?').trim().charAt(0).toUpperCase() || '?');
      const visual = iconSources.primary
        ? '<img class="model-brand-icon' + (iconSources.monochrome ? ' is-monochrome' : '') + '" src="' + iconSources.primary + '"' + (iconSources.fallback ? ' data-local-source="' + iconSources.fallback + '"' : '') + ' alt="" decoding="async" data-fallback="' + fallback + '">'
        : '<span class="model-brand-fallback" aria-hidden="true">' + fallback + '</span>';
      return '<span class="provider-filter-badge">' + visual + '<span>' + escapeHtml(provider) + '</span></span>';
    }
    function pricingFilterText(value) {
      if (value === 'custom') return uiText('models.customPricing', 'Custom price', '自定义价格');
      if (value === 'original') return uiText('models.originalPricing', 'Original price', '原价');
      return uiText('models.allPricing', 'All prices', '全部');
    }
    function ensurePricingFilterControls() {
      return Boolean($('settingsCustomPricingList') || $('settingsMobileCustomPricing'));
    }
    function renderSettingsModelFilters(keepMobileOpen=false) {
      if (!state || !Array.isArray(state.models)) return;
      ensurePricingFilterControls();
      const representatives = new Map();
      settingsVisibleModels().forEach(model => {
        const provider = settingsProviderLabel(model);
        if (provider && !representatives.has(provider)) representatives.set(provider, model);
      });
      const providers = [...representatives.keys()].sort((a, b) => a.localeCompare(b));
      settingsProviderSelection = new Set([...settingsProviderSelection].filter(provider => representatives.has(provider)));
      const options = providers.map(provider => {
        const checked = settingsProviderSelection.has(provider) ? ' checked' : '';
        return '<label class="provider-filter-option"><input type="checkbox" data-settings-provider="' + escapeHtml(provider) + '"' + checked + '><span class="provider-filter-check" aria-hidden="true">✓</span>' + providerFilterBadge(provider, representatives.get(provider)) + '</label>';
      }).join('');
      const desktop = $('settingsProviderList');
      if (desktop) desktop.innerHTML = options;
      const clear = $('settingsProviderClear');
      if (clear) {
        clear.classList.toggle('is-active', settingsProviderSelection.size === 0);
        clear.onclick = () => { settingsProviderSelection.clear(); settingsModelPage = 1; renderSettingsModelList(); };
      }
      const mobilePicker = $('settingsMobileProviderPicker');
      const mobileOptions = $('settingsMobileProviderOptions');
      if (mobileOptions) mobileOptions.innerHTML = '<button class="mobile-provider-clear' + (settingsProviderSelection.size ? '' : ' is-active') + '" type="button" data-settings-provider-clear>' + escapeHtml(uiText('models.allProviders', 'All providers')) + '</button>' + options;
      if (mobilePicker) mobilePicker.open = Boolean(keepMobileOpen);
      const mobileSummary = $('settingsMobileProviderSummary');
      if (mobileSummary) mobileSummary.textContent = settingsProviderSelection.size
        ? t('models.providersSelected', {count:settingsProviderSelection.size})
        : uiText('models.allProviders', 'All providers');
      document.querySelectorAll('[data-settings-provider]').forEach(input => input.addEventListener('change', () => {
        const provider = input.dataset.settingsProvider;
        if (input.checked) settingsProviderSelection.add(provider);
        else settingsProviderSelection.delete(provider);
        settingsModelPage = 1;
        renderSettingsModelList(Boolean(input.closest('#settingsMobileProviderPicker')));
      }));
      document.querySelector('[data-settings-provider-clear]')?.addEventListener('click', () => {
        settingsProviderSelection.clear();
        settingsModelPage = 1;
        renderSettingsModelList(true);
      });
      const statuses = [
        ['', uiText('models.allStatuses', 'All statuses')],
        ['enabled', uiText('models.status.enabled', 'Enabled')],
        ['disabled', uiText('models.status.disabled', 'Disabled')]
      ];
      const statusList = $('settingsStatusList');
      if (statusList) {
        statusList.innerHTML = statuses.map(([value, label]) => '<label class="status-filter-option"><input type="radio" name="settingsStatusDesktop" value="' + value + '"' + (settingsStatusFilter === value ? ' checked' : '') + '><span>' + escapeHtml(label) + '</span></label>').join('');
        statusList.querySelectorAll('input').forEach(input => input.addEventListener('change', () => {
          settingsStatusFilter = input.value;
          settingsModelPage = 1;
          renderSettingsModelList();
        }));
      }
      const mobileStatus = $('settingsMobileStatus');
      if (mobileStatus) {
        mobileStatus.value = settingsStatusFilter;
        mobileStatus.onchange = () => { settingsStatusFilter = mobileStatus.value; settingsModelPage = 1; renderSettingsModelList(); };
      }
      const pricingOptions = [['', pricingFilterText('')], ['custom', pricingFilterText('custom')], ['original', pricingFilterText('original')]];
      const bindPricingFilter = (root, name, compact=false) => {
        if (!root) return;
        if (compact) {
          root.innerHTML = pricingOptions.map(([value, label]) => '<option value="' + escapeHtml(value) + '"' + (settingsPricingFilter === value ? ' selected' : '') + '>' + escapeHtml(label) + '</option>').join('');
          root.value = settingsPricingFilter;
          root.onchange = () => { settingsPricingFilter = root.value; settingsModelPage = 1; renderSettingsModelList(); };
          return;
        }
        root.innerHTML = pricingOptions.map(([value, label]) => '<label class="custom-pricing-filter-option"><input type="radio" name="' + name + '" value="' + value + '"' + (settingsPricingFilter === value ? ' checked' : '') + '><span>' + escapeHtml(label) + '</span></label>').join('');
        root.querySelectorAll('input').forEach(input => input.addEventListener('change', () => {
          settingsPricingFilter = input.value;
          settingsModelPage = 1;
          renderSettingsModelList();
        }));
      };
      bindPricingFilter($('settingsCustomPricingList'), 'settingsPricingDesktop');
      bindPricingFilter($('settingsMobileCustomPricing'), 'settingsPricingMobile', true);
      const bindSearch = input => {
        if (!input) return;
        if (input.value !== settingsModelSearchQuery) input.value = settingsModelSearchQuery;
        if (input.dataset.bound) return;
        input.dataset.bound = 'true';
        input.addEventListener('input', event => {
          settingsModelSearchQuery = event.target.value;
          const peer = event.target === $('settingsModelSearch') ? $('settingsModelSearchMobile') : $('settingsModelSearch');
          if (peer && peer.value !== settingsModelSearchQuery) peer.value = settingsModelSearchQuery;
          settingsModelPage = 1;
          renderSettingsModelList();
        });
      };
      bindSearch($('settingsModelSearch'));
      bindSearch($('settingsModelSearchMobile'));
    }
    function modelDetails(model) {
      return escapeHtml(modelProvider(model));
    }
    function modelPriceDisplay(value) {
      const amount = Number(value);
      if (!Number.isFinite(amount) || amount <= 0) return uiText('model.card.noPrice', 'Unavailable', '暂无价格');
      return '$' + amount.toLocaleString('en-US', {maximumFractionDigits: 6});
    }
    function renderSettingsModelPagination(total, page, pageCount) {
      const root = $('settingsModelPagination');
      if (!root) return;
      if (pageCount <= 1) { root.innerHTML = ''; root.hidden = true; return; }
      const previous = uiText('models.previousPage', 'Previous', '上一页');
      const next = uiText('models.nextPage', 'Next', '下一页');
      root.hidden = false;
      root.innerHTML = '<button class="text-btn" type="button" data-settings-page="' + (page - 1) + '"' + (page === 1 ? ' disabled' : '') + '>' + previous + '</button>' +
        '<span>' + escapeHtml(t('models.pageSummary', {page, pageCount, total})) + '</span>' +
        '<button class="text-btn" type="button" data-settings-page="' + (page + 1) + '"' + (page === pageCount ? ' disabled' : '') + '>' + next + '</button>';
      root.querySelectorAll('[data-settings-page]').forEach(button => button.addEventListener('click', () => {
        const targetPage = Number(button.dataset.settingsPage);
        if (targetPage >= 1 && targetPage <= pageCount) { settingsModelPage = targetPage; renderSettingsModelList(); }
      }));
    }
    function renderSettingsModelList(keepMobileProviderOpen=false) {
      const root = $('settingsModelList');
      if (!root || !state || !Array.isArray(state.models)) return;
      renderSettingsModelFilters(keepMobileProviderOpen);
      const query = settingsModelSearchQuery.trim().toLowerCase();
      const filteredModels = settingsVisibleModels().filter(model =>
        (!settingsProviderSelection.size || settingsProviderSelection.has(settingsProviderLabel(model))) &&
        (!settingsStatusFilter || (settingsStatusFilter === 'enabled' ? modelEnabled(model) : !modelEnabled(model))) &&
        (!settingsPricingFilter || (settingsPricingFilter === 'custom' ? Boolean(model.customPricing) : !Boolean(model.customPricing))) &&
        (!query || [model.name, model.id, modelProvider(model), settingsProviderLabel(model)].some(value => String(value || '').toLowerCase().includes(query)))
      );
      const pageCount = Math.max(1, Math.ceil(filteredModels.length / settingsModelPageSize));
      settingsModelPage = Math.min(Math.max(1, settingsModelPage), pageCount);
      const start = (settingsModelPage - 1) * settingsModelPageSize;
      const models = filteredModels.slice(start, start + settingsModelPageSize);
      const summary = $('settingsModelSummary');
      if (summary) summary.textContent = filteredModels.length
        ? t('models.showing', {start:start + 1, end:start + models.length, total:filteredModels.length})
        : uiText('models.noResults', 'No models match the current filters', '没有符合当前筛选条件的模型');
      const pageSize = $('settingsModelPageSize');
      if (pageSize) pageSize.value = String(settingsModelPageSize);
      renderSettingsModelPagination(filteredModels.length, settingsModelPage, pageCount);
      root.innerHTML = models.length ? models.map(model => {
        const toggleLabel = modelEnabled(model) ? uiText('models.disable', '\u7981\u7528') : uiText('models.enable', '\u542f\u7528');
        const statusLabel = modelEnabled(model) ? uiText('models.status.enabled', '\u5df2\u542f\u7528') : uiText('models.status.disabled', '\u5df2\u7981\u7528');
        const editButton = userAddedModel(model)
          ? '<button class="text-btn" type="button" data-settings-edit="' + escapeHtml(model.id) + '">' + escapeHtml(uiText('model.edit.action', 'Edit model')) + '</button>'
          : '';
        const deleteButton = userAddedModel(model)
          ? '<button class="settings-model-delete" type="button" data-settings-remove="' + escapeHtml(model.id) + '" title="' + escapeHtml(t('action.deleteModel')) + '" aria-label="' + escapeHtml(t('action.deleteModel')) + '">×</button>'
          : '';
        return '<article class="settings-model-card' + (modelEnabled(model) ? '' : ' is-disabled') + '" data-provider="' + escapeHtml(settingsProviderLabel(model)) + '" data-category="' + escapeHtml(modelCategory(model)) + '" data-status="' + (modelEnabled(model) ? 'enabled' : 'disabled') + '">' +
          '<header class="settings-model-card-header">' + modelBadge(model, true, true) + '</header>' +
          '<p class="model-card-provider">' + modelDetails(model) + '</p>' +
          '<p class="model-card-price-unit">' + escapeHtml(uiText('model.card.priceUnit', '$ / 1M tokens', '$ / 1M Token')) + '</p>' +
          '<dl class="model-price-grid"><div><dt>' + escapeHtml(uiText('model.card.cachePrice', 'Cache')) + '</dt><dd>' + escapeHtml(modelPriceDisplay(model.cache)) + '</dd></div><div><dt>' + escapeHtml(uiText('model.card.inputPrice', 'Input')) + '</dt><dd>' + escapeHtml(modelPriceDisplay(model.input)) + '</dd></div><div><dt>' + escapeHtml(uiText('model.card.outputPrice', 'Output')) + '</dt><dd>' + escapeHtml(modelPriceDisplay(model.output)) + '</dd></div></dl>' +
          '<div class="settings-model-card-actions"><label class="model-enabled-toggle"><input type="checkbox" data-settings-toggle="' + escapeHtml(model.id) + '"' + (modelEnabled(model) ? ' checked' : '') + ' aria-label="' + escapeHtml(toggleLabel) + '"><span class="model-status ' + (modelEnabled(model) ? 'is-enabled' : 'is-disabled') + '">' + escapeHtml(statusLabel) + '</span></label><div class="settings-model-card-commands">' + editButton + '<button class="text-btn" type="button" data-settings-config="' + escapeHtml(model.id) + '">' + escapeHtml(uiText('model.card.customPrice', 'Custom price')) + '</button>' + deleteButton + '</div></div></article>';
      }).join('') : '<div class="settings-model-empty">' + escapeHtml(uiText('models.noResults', 'No models match the current filters', '没有符合当前筛选条件的模型')) + '</div>';
      root.querySelectorAll('[data-settings-toggle]').forEach(button => button.addEventListener('change', () => {
        const model = state.models.find(item => item.id === button.dataset.settingsToggle);
        if (!model) return;
        model.enabled = button.checked;
        ensureComparisonSelection();
        ensureSelection('tokenRows');
        ensureSelection('budgetRows');
        update();
      }));
      root.querySelectorAll('[data-settings-edit]').forEach(button => button.addEventListener('click', () => openModelAddDialog(button.dataset.settingsEdit)));
      root.querySelectorAll('[data-settings-config]').forEach(button => button.addEventListener('click', () => openModelConfigDialog(button.dataset.settingsConfig)));
      root.querySelectorAll('[data-settings-remove]').forEach(button => button.addEventListener('click', () => openModelDeleteDialog(button.dataset.settingsRemove)));
    }
    function openModelConfigDialog(id) {
      const model = state.models.find(item => item.id === id);
      const dialog = $('modelConfigDialog');
      if (!model || !dialog) return;
      pendingModelConfigId = id;
      $('modelConfigCache').value = model.cache;
      $('modelConfigInput').value = model.input;
      $('modelConfigOutput').value = model.output;
      const resetButton = $('resetModelConfig');
      if (resetButton) resetButton.hidden = !(model.customPricing && !userAddedModel(model));
      dialog.showModal();
    }
    function closeModelConfigDialog() {
      $('modelConfigDialog')?.close();
      pendingModelConfigId = null;
    }
    function selectedKey(type) { return type === 'tokenRows' ? 'tokenSelectedModelIds' : 'budgetSelectedModelIds'; }
    function modelsBySelection(ids) {
      const models = new Map(enabledModels().map(model => [model.id, model]));
      return (ids || []).map(id => models.get(id)).filter(Boolean);
    }
    function selectedModels(type) { return modelsBySelection(state[selectedKey(type)]); }
    function ensureComparisonSelection() {
      const key = 'comparisonSelectedModelIds';
      state[key] = [...new Set((state[key] || []).filter(id => state.models.some(model => model.id === id && modelEnabled(model))))];
    }
    function comparisonModels() {
      ensureComparisonSelection();
      return modelsBySelection(state.comparisonSelectedModelIds);
    }
    function renderComparisonFilter() {
      const root = $('comparisonModelFilter');
      ensureComparisonSelection();
      root.innerHTML = '<button class="model-select-btn" type="button" data-model-selection="comparison" data-i18n="filter.modelSelect" aria-haspopup="dialog">' + t('filter.modelSelect') + '</button>';
      root.querySelector('[data-model-selection]')?.addEventListener('click', () => openModelSelection('comparison'));
    }
    function ensureSelection(type) {
      const key = selectedKey(type);
      state[key] = [...new Set((state[key] || []).filter(id => state.models.some(model => model.id === id && modelEnabled(model))))];
    }
    function renderModelFilter(type) {
      ensureSelection(type);
      const key = selectedKey(type);
      const root = $(type === 'tokenRows' ? 'tokenModelFilter' : 'budgetModelFilter');
      root.innerHTML = '<button class="model-select-btn" type="button" data-model-selection="' + type + '" data-i18n="filter.modelSelect" aria-haspopup="dialog">' + t('filter.modelSelect') + '</button>';
      root.querySelector('[data-model-selection]')?.addEventListener('click', () => openModelSelection(type));
    }
    function modelSelectionGroups() {
      const groups = new Map();
      enabledModels().forEach(model => {
        const provider = modelProvider(model) || uiText('model.add.providerOther', 'Others', '其他');
        const id = normalizedProvider(model.providerId || provider) || 'others';
        if (!groups.has(id)) groups.set(id, {id, label:provider, model});
      });
      return [...groups.values()];
    }
    function renderModelSelectionDialog() {
      const choicePanel = $('modelSelectionChoicePanel');
      const orderPanel = $('modelSelectionOrderPanel');
      if (!choicePanel || !orderPanel) return;
      document.querySelectorAll('[data-model-selection-panel]').forEach(button => {
        const active = button.dataset.modelSelectionPanel === modelSelectionPanel;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', String(active));
        button.onclick = () => {
          modelSelectionPanel = button.dataset.modelSelectionPanel;
          renderModelSelectionDialog();
        };
      });
      if (modelSelectionPanel === 'order') {
        choicePanel.hidden = true;
        choicePanel.innerHTML = '';
        orderPanel.hidden = false;
        const orderedModels = modelsBySelection([...modelSelectionDraft]);
        orderPanel.innerHTML = '<div class="model-selection-panel-label">' + escapeHtml(t('filter.modelOrder')) + '</div><p class="model-selection-order-hint">' + escapeHtml(t('filter.modelOrderHint')) + '</p><div id="modelSelectionOrder">' + (orderedModels.length ? orderedModels.map(model =>
          '<div class="model-selection-order-item" draggable="true" data-model-order-id="' + escapeHtml(model.id) + '"><span class="model-order-drag-handle" aria-hidden="true">&#8942;</span><span>' + modelBadge(model, true) + '</span></div>'
        ).join('') : '<p class="model-selection-empty">' + t('filter.noModels') + '</p>') + '</div>';
        const orderRoot = $('modelSelectionOrder');
        orderRoot?.querySelectorAll('[data-model-order-id]').forEach(item => {
          item.addEventListener('dragstart', event => {
            if (!event.dataTransfer) return;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', item.dataset.modelOrderId);
            item.classList.add('is-dragging');
          });
          item.addEventListener('dragend', () => orderRoot.querySelectorAll('.is-dragging, .is-drop-before, .is-drop-after').forEach(node => node.classList.remove('is-dragging', 'is-drop-before', 'is-drop-after')));
          item.addEventListener('dragover', event => {
            event.preventDefault();
            const bounds = item.getBoundingClientRect();
            const insertBefore = event.clientY < bounds.top + bounds.height / 2;
            item.classList.toggle('is-drop-before', insertBefore);
            item.classList.toggle('is-drop-after', !insertBefore);
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
          });
          item.addEventListener('dragleave', event => {
            if (!item.contains(event.relatedTarget)) item.classList.remove('is-drop-before', 'is-drop-after');
          });
          item.addEventListener('drop', event => {
            event.preventDefault();
            if (!event.dataTransfer) return;
            const sourceId = event.dataTransfer.getData('text/plain');
            const targetId = item.dataset.modelOrderId;
            if (!sourceId || sourceId === targetId) return;
            const insertBefore = item.classList.contains('is-drop-before');
            const ids = [...modelSelectionDraft].filter(id => id !== sourceId);
            const targetIndex = ids.indexOf(targetId);
            if (targetIndex < 0) return;
            ids.splice(insertBefore ? targetIndex : targetIndex + 1, 0, sourceId);
            modelSelectionDraft = new Set(ids);
            renderModelSelectionDialog();
          });
        });
        return;
      }
      choicePanel.hidden = false;
      orderPanel.hidden = true;
      orderPanel.innerHTML = '';
      choicePanel.innerHTML = '<aside class="model-selection-provider-panel"><div class="model-selection-panel-label">' + escapeHtml(t('filter.provider')) + '</div><div id="modelSelectionProviders"></div></aside><section class="model-selection-model-panel"><div class="model-selection-panel-label">' + escapeHtml(t('filter.availableModels')) + '</div><div id="modelSelectionModels"></div></section>';
      const providersRoot = $('modelSelectionProviders');
      const modelsRoot = $('modelSelectionModels');
      const groups = modelSelectionGroups();
      if (!groups.some(group => group.id === modelSelectionProvider)) modelSelectionProvider = groups[0]?.id || '';
      providersRoot.innerHTML = groups.length
        ? groups.map(group => '<button class="model-provider-option' + (group.id === modelSelectionProvider ? ' is-active' : '') + '" type="button" data-model-selection-provider="' + escapeHtml(group.id) + '">' + providerFilterBadge(group.label, group.model) + '</button>').join('')
        : '<p class="model-selection-empty">' + t('filter.noModels') + '</p>';
      const visibleModels = enabledModels().filter(model => {
        const provider = modelProvider(model) || uiText('model.add.providerOther', 'Others', '其他');
        return (normalizedProvider(model.providerId || provider) || 'others') === modelSelectionProvider;
      });
      modelsRoot.innerHTML = '<div class="model-selection-model-heading"><strong>' + escapeHtml(groups.find(group => group.id === modelSelectionProvider)?.label || t('filter.availableModels')) + '</strong></div>' + (visibleModels.length ? visibleModels.map(model => {
        const checked = modelSelectionDraft.has(model.id);
        return '<label class="model-selection-model' + (checked ? ' is-selected' : '') + '"><input type="checkbox" data-model-selection-model="' + escapeHtml(model.id) + '"' + (checked ? ' checked' : '') + '><span>' + modelBadge(model) + '</span></label>';
      }).join('') : '<p class="model-selection-empty">' + t('filter.noModels') + '</p>');
      providersRoot.querySelectorAll('[data-model-selection-provider]').forEach(button => button.addEventListener('click', () => {
        modelSelectionProvider = button.dataset.modelSelectionProvider;
        renderModelSelectionDialog();
      }));
      modelsRoot.querySelectorAll('[data-model-selection-model]').forEach(input => input.addEventListener('change', event => {
        const id = event.target.dataset.modelSelectionModel;
        if (event.target.checked) {
          modelSelectionDraft.add(id);
        } else {
          modelSelectionDraft.delete(id);
        }
        renderModelSelectionDialog();
      }));
    }
    function openModelSelection(type) {
      if (!state) return;
      modelSelectionType = type;
      const key = type === 'comparison' ? 'comparisonSelectedModelIds' : selectedKey(type);
      modelSelectionDraft = new Set(state[key] || []);
      modelSelectionProvider = '';
      modelSelectionPanel = 'select';
      renderModelSelectionDialog();
      $('modelSelectionDialog')?.showModal();
    }
    function closeModelSelection() {
      $('modelSelectionDialog')?.close();
      modelSelectionType = null;
      modelSelectionDraft = new Set();
      modelSelectionProvider = '';
      modelSelectionPanel = 'select';
    }
    function applyModelSelection() {
      if (!modelSelectionType) return closeModelSelection();
      const selected = [...modelSelectionDraft];
      if (modelSelectionType === 'comparison') {
        state.comparisonSelectedModelIds = selected;
        ensureComparisonSelection();
        renderComparison();
        renderComparisonFilter();
      } else {
        const key = selectedKey(modelSelectionType);
        state[key] = selected;
        ensureSelection(modelSelectionType);
        if (modelSelectionType === 'tokenRows') renderTokenRows(); else renderBudgetRows();
        renderModelFilter(modelSelectionType);
      }
      save();
      closeModelSelection();
    }
    function comparisonModelKey(key) {
      return key === 'multiplier' || key === 'fxRate' ? key : 'comparison' + key[0].toUpperCase() + key.slice(1);
    }
    function comparisonValue(model, key) {
      const config = state.comparisonConfig;
      return config.shared[key] ? config[key] : model[comparisonModelKey(key)];
    }
    function openModelDeleteDialog(id) {
      const model = state.models.find(item => item.id === id);
      if (!userAddedModel(model) || state.models.length <= 1) return;
      pendingModelId = id;
      $('modelDeleteName').textContent = model.name || t('model.unnamed');
      $('modelDeleteDialog').showModal();
    }
    function renderComparisonConfig() {
      const root = $('comparisonConfig');
      const config = state.comparisonConfig;
      root.innerHTML = fieldsFor('comparison').map(field => settingInput('comparison', field, config)).join('');
      root.querySelectorAll('[data-shared-key]').forEach(input => input.addEventListener('change', event => {
        const key = event.target.dataset.sharedKey;
        const shared = event.target.checked;
        if (!shared) state.models.forEach(model => { model[comparisonModelKey(key)] = config[key]; });
        config.shared[key] = shared;
        renderComparisonConfig();
        renderComparison();
        save();
      }));
      root.querySelectorAll('[data-config-key]').forEach(input => {
        const apply = event => {
          const field = fieldsFor('comparison').find(item => item.key === event.target.dataset.configKey);
          config[field.key] = scenarioFieldStoredValue('comparison', field, event.target.value);
        };
        input.addEventListener('input', event => { apply(event); renderComparison(); save(); });
        input.addEventListener('change', event => { apply(event); renderComparison(); save(); });
      });
    }
    function comparisonSettingRow(field) {
      const property = comparisonModelKey(field.key);
      const unit = field.key === 'total' ? scenarioTokenUnit('comparison') : field.unit;
      return `<div class="cell label-cell">${scenarioFieldLabel('comparison', field)}</div>${comparisonModels().map(model => `<div class="cell"><div class="unit-input"><input class="price-input" data-comparison-key="${field.key}" data-model-id="${model.id}" type="number" min="0" step="${field.step}" value="${scenarioFieldDisplayValue('comparison', field, model[property])}"><span>${unit}</span></div></div>`).join('')}`;
    }
    function renderComparison() {
      const root = $('comparison'); const models = comparisonModels(); root.style.setProperty('--cols', models.length); renderComparisonFilter();
      const config = state.comparisonConfig;
      root.innerHTML = `
        <div class="cell label-cell">${comparisonLabel(t('comparison.modelItem'))}</div>${models.map(m=>`<div class="cell model-head" data-model-head="${m.id}">${userAddedModel(m) ? `<button class="close" data-remove="${m.id}" title="${t('action.deleteModel')}">×</button>` : ''}</div>`).join('')}
        ${priceRow(t('comparison.cachePrice'), 'cache')}
        ${multipliedPriceRow(t('comparison.cachePriceAdjusted'), 'cache')}
        ${priceRow(t('comparison.inputPrice'), 'input')}
        ${multipliedPriceRow(t('comparison.inputPriceAdjusted'), 'input')}
        ${priceRow(t('comparison.outputPrice'), 'output')}
        ${multipliedPriceRow(t('comparison.outputPriceAdjusted'), 'output')}
        ${fieldsFor('comparison').filter(field => !config.shared[field.key]).map(comparisonSettingRow).join('')}
        <div class="cell label-cell">${comparisonLabel(t('comparison.actualCost'))}</div>${models.map(m=>`<div class="cell"><div class="money big">${dualMoney(cost(m,comparisonValue(m,'total'),{ratio:comparisonValue(m,'ratio'), hit:comparisonValue(m,'hit')},comparisonValue(m,'multiplier')), comparisonValue(m,'fxRate'))}</div></div>`).join('')}
        <div class="cell label-cell">${comparisonLabel(t('comparison.standardCost'))}</div>${models.map(m=>`<div class="cell"><div class="money">${dualMoney(standardCost(m,comparisonValue(m,'total'),{ratio:comparisonValue(m,'ratio'), hit:comparisonValue(m,'hit')}), comparisonValue(m,'fxRate'))}</div></div>`).join('')}`;
      root.querySelectorAll('.model-head').forEach(el => {
        const model = state.models.find(item => item.id === el.dataset.modelHead);
        if (model) el.insertAdjacentHTML('afterbegin', modelBadge(model, true));
      });
      root.querySelectorAll('[data-model-key]').forEach(el => { const apply = e => { const model = state.models.find(item => item.id === e.target.dataset.modelId); if (model) model[e.target.dataset.modelKey] = num(e.target.value); }; el.addEventListener('input', e => { apply(e); save(); }); el.addEventListener('change', e => { apply(e); renderComparison(); save(); }); });
      root.querySelectorAll('[data-comparison-key]').forEach(el => {
        const apply = event => {
          const model = state.models.find(item => item.id === event.target.dataset.modelId);
          const field = fieldsFor('comparison').find(item => item.key === event.target.dataset.comparisonKey);
          if (model) model[comparisonModelKey(field.key)] = scenarioFieldStoredValue('comparison', field, event.target.value);
        };
        el.addEventListener('input', event => { apply(event); save(); });
        el.addEventListener('change', event => { apply(event); renderComparison(); save(); });
      });
      root.querySelectorAll('[data-remove]').forEach(el => el.addEventListener('click', e => {
        openModelDeleteDialog(e.target.dataset.remove);
      }));
    }
    function settingInput(type, field, config) {
      const label = scenarioFieldLabel(type, field);
      const value = scenarioFieldDisplayValue(type, field, config[field.key]);
      const unit = (type === 'comparison' || type === 'tokenRows') && field.key === 'total' ? scenarioTokenUnit(type) : field.unit;
      return '<div class="scenario-setting"><div class="scenario-setting-title"><span>' + label + '</span><label class="check-label"><input type="checkbox" data-shared-type="' + type + '" data-shared-key="' + field.key + '"' + (config.shared[field.key] ? ' checked' : '') + '>' + t('action.shared') + '</label></div>' +
        (config.shared[field.key] ? '<div class="unit-input"><input data-config-type="' + type + '" data-config-key="' + field.key + '" type="number" min="0" step="' + field.step + '" value="' + value + '"><span>' + unit + '</span></div>' : '<p class="per-row-note">' + t('action.perRow') + '</p>') + '</div>';
    }    function renderScenarioConfig(type) {
      const root = $(type === 'tokenRows' ? 'tokenConfig' : 'budgetConfig');
      const config = configFor(type);
      root.innerHTML = fieldsFor(type).map(field => settingInput(type, field, config)).join('');
      root.querySelectorAll('[data-shared-key]').forEach(input => input.addEventListener('change', event => {
        const key = event.target.dataset.sharedKey;
        const shared = event.target.checked;
        if (!shared) state[type].forEach(row => { row[key] = config[key]; });
        config.shared[key] = shared;
        renderScenarioConfig(type);
        if (type === 'tokenRows') renderTokenRows(); else renderBudgetRows();
        save();
      }));
      root.querySelectorAll('[data-config-key]').forEach(input => {
        const apply = event => {
          const field = fieldsFor(type).find(item => item.key === event.target.dataset.configKey);
          config[field.key] = scenarioFieldStoredValue(type, field, event.target.value);
        };
        input.addEventListener('input', event => { apply(event); save(); });
        input.addEventListener('change', event => {
          apply(event);
          if (type === 'tokenRows') renderTokenRows(); else renderBudgetRows();
          save();
        });
      });
    }
    function scenarioValue(type, row, key) {
      const config = configFor(type);
      return config.shared[key] ? config[key] : row[key];
    }
    function scenarioNumberInput(type, index, field, value) {
      const label = scenarioFieldLabel(type, field);
      const displayValue = scenarioFieldDisplayValue(type, field, value);
      const unit = (type === 'comparison' || type === 'tokenRows') && field.key === 'total' ? scenarioTokenUnit(type) : field.unit;
      return '<div class="scenario-cell"><label>' + label + '</label><div class="unit-input"><input class="scenario-input" data-row-type="' + type + '" data-row-index="' + index + '" data-row-key="' + field.key + '" type="number" min="0" step="' + field.step + '" value="' + displayValue + '"><span>' + unit + '</span></div></div>';
    }    function bindScenarioRows(root) {
      root.querySelectorAll('[data-row-key]').forEach(el => {
        const apply = event => {
          const type = event.target.dataset.rowType;
          const index = Number(event.target.dataset.rowIndex);
          const field = fieldsFor(type).find(item => item.key === event.target.dataset.rowKey);
          state[type][index][field.key] = scenarioFieldStoredValue(type, field, event.target.value);
          return type;
        };
        el.addEventListener('input', event => { apply(event); save(); });
        el.addEventListener('change', event => {
          const type = apply(event);
          if (type === 'tokenRows') renderTokenRows(); else renderBudgetRows();
          save();
        });
      });
      root.querySelectorAll('[data-remove-row]').forEach(el => el.addEventListener('click', event => {
        const type = event.target.dataset.removeType;
        if (state[type].length) {
          state[type].splice(Number(event.target.dataset.removeRow), 1);
          if (type === 'tokenRows') renderTokenRows(); else renderBudgetRows();
          save();
        }
      }));
      root.querySelectorAll('[data-create-row]').forEach(el => el.addEventListener('click', event => {
        const type = event.currentTarget.dataset.createRow;
        state[type].push(newRow(type, configFor(type)));
        if (type === 'tokenRows') renderTokenRows(); else renderBudgetRows();
        save();
      }));
    }
    function prepareTable(root, fields, models) {
      root.style.gridTemplateColumns = ['72px', ...fields.map(() => 'minmax(132px, 1fr)'), ...models.map(() => 'minmax(190px, 1fr)')].join(' ');
    }
    function renderTokenRows() {
      const root = $('tokenRows'), config = state.tokenConfig;
      if (!state.tokenRows.length) {
        root.innerHTML = '<button class="scenario-empty-state" type="button" data-create-row="tokenRows">' + t('scenario.emptyAdd') + '</button>';
        bindScenarioRows(root);
        return;
      }
      const fields = fieldsFor('tokenRows').filter(field => !config.shared[field.key]);
      const models = selectedModels('tokenRows');
      const entries = state.tokenRows.map((row, index) => {
        const usage = {ratio:scenarioValue('tokenRows', row, 'ratio'), hit:scenarioValue('tokenRows', row, 'hit')};
        const total = scenarioValue('tokenRows', row, 'total');
        const multiplier = scenarioValue('tokenRows', row, 'multiplier');
        const fxRate = scenarioValue('tokenRows', row, 'fxRate');
        const controls = '<div class="scenario-cell scenario-number">' + (index + 1) + '<button class="scenario-remove" data-remove-type="tokenRows" data-remove-row="' + index + '" title="' + t('action.deleteItem') + '">×</button></div>' + fields.map(field => scenarioNumberInput('tokenRows', index, field, row[field.key])).join('');
        const results = models.map(model => '<div class="scenario-cell scenario-result">' + modelBadge(model, true) + '<span>' + money(cost(model, total, usage, multiplier), fxRate) + '</span><em>' + t('scenario.perHundredMillion', {cost:money(cost(model, 100, usage, multiplier), fxRate)}) + '</em></div>').join('');
        return '<article class="scenario-entry"><div class="scenario-row-inputs">' + controls + '</div><div class="scenario-result-scroll"><div class="scenario-result-list">' + results + '</div></div></article>';
      }).join('');
      root.innerHTML = '<div class="scenario-entry-list">' + entries + '</div>';
      bindScenarioRows(root);
    }
    function renderBudgetRows() {
      const root = $('budgetRows'), config = state.budgetConfig;
      if (!state.budgetRows.length) {
        root.innerHTML = '<button class="scenario-empty-state" type="button" data-create-row="budgetRows">' + t('scenario.emptyAdd') + '</button>';
        bindScenarioRows(root);
        return;
      }
      const fields = fieldsFor('budgetRows').filter(field => !config.shared[field.key]);
      const models = selectedModels('budgetRows');
      const resultUnit = scenarioTokenUnit('budgetRows');
      const entries = state.budgetRows.map((row, index) => {
        const usage = {ratio:scenarioValue('budgetRows', row, 'ratio'), hit:scenarioValue('budgetRows', row, 'hit')};
        const budget = scenarioValue('budgetRows', row, 'budget');
        const multiplier = scenarioValue('budgetRows', row, 'multiplier');
        const fxRate = scenarioValue('budgetRows', row, 'fxRate');
        const controls = '<div class="scenario-cell scenario-number">' + (index + 1) + '<button class="scenario-remove" data-remove-type="budgetRows" data-remove-row="' + index + '" title="' + t('action.deleteItem') + '">×</button></div>' + fields.map(field => scenarioNumberInput('budgetRows', index, field, row[field.key])).join('');
        const budgetUsd = budget / (state.currency === 'CNY' ? num(fxRate) : 1);
        const results = models.map(model => {
          const perM = cost(model, 1, usage, multiplier);
          return '<div class="scenario-cell scenario-result">' + modelBadge(model, true) + '<span>' + (perM ? tokens(budgetUsd / perM, resultUnit) : '--') + '</span><em>' + t('scenario.totalByBudget') + '</em></div>';
        }).join('');
        return '<article class="scenario-entry"><div class="scenario-row-inputs">' + controls + '</div><div class="scenario-result-scroll"><div class="scenario-result-list">' + results + '</div></div></article>';
      }).join('');
      root.innerHTML = '<div class="scenario-entry-list">' + entries + '</div>';
      bindScenarioRows(root);
    }
    function renderScenario() { renderModelFilter('tokenRows'); renderModelFilter('budgetRows'); renderScenarioConfig('tokenRows'); renderScenarioConfig('budgetRows'); renderTokenRows(); renderBudgetRows(); }
    let draggedCardId = null;
    function cardTitle(card) {
      if (card.customTitle && card.title) return card.title;
      const keys = {multiplier:'section.structure.title', comparison:'section.comparison.title', tokenCost:'section.tokenCost.title', budget:'section.budget.title'};
      return card.title || uiText(keys[card.type] || 'cards.title', 'Saved card', '收藏卡片');
    }
    function cardConfigFromCurrent(type) {
      if (type === 'multiplier') return clone(state.multiplierCalc);
      if (type === 'comparison') return {config:clone(state.comparisonConfig), unit:state.comparisonUnit};
      if (type === 'tokenCost') return {config:clone(state.tokenConfig), rows:clone(state.tokenRows), unit:state.tokenUnit};
      return {config:clone(state.budgetConfig), rows:clone(state.budgetRows), unit:state.budgetUnit, currency:state.currency};
    }
    function newSavedCard(type) {
      const selected = type === 'comparison' ? state.comparisonSelectedModelIds : type === 'tokenCost' ? state.tokenSelectedModelIds : type === 'budget' ? state.budgetSelectedModelIds : [];
      return {id:'card-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), type, title:'', customTitle:false, config:cardConfigFromCurrent(type), selectedModelIds:[...(selected || [])], order:state.cards.length};
    }
    function cardModels(card) {
      return (card.selectedModelIds || []).map(id => state.models.find(model => model.id === id)).filter(Boolean);
    }
    function cardModelWarning(card) {
      const unavailable = (card.selectedModelIds || []).filter(id => {
        const model = state.models.find(item => item.id === id);
        return !model || !modelEnabled(model) || !hasPrice(model);
      });
      return unavailable.length ? '<p class="saved-card-warning" role="status">⚠ ' + escapeHtml(uiText('cards.modelUnavailable', 'Some selected models are unavailable.', '部分所选模型不可用。')) + '</p>' : '';
    }
    function cardModelPicker(card) {
      if (card.type === 'multiplier') return '';
      return '<fieldset class="saved-card-models"><legend>' + escapeHtml(uiText('cards.models', 'Models', '模型')) + '</legend><div class="saved-card-model-options">' + enabledModels().map(model => '<label><input type="checkbox" data-card-model="' + escapeHtml(card.id) + '" data-model-id="' + escapeHtml(model.id) + '"' + (card.selectedModelIds.includes(model.id) ? ' checked' : '') + '><span>' + escapeHtml(model.name) + '</span></label>').join('') + '</div></fieldset>';
    }
    function cardInput(card, key, value, unit='') {
      return '<label class="saved-card-field"><span>' + escapeHtml(uiText('cards.field.' + key, key, key)) + '</span><span class="unit-input"><input type="number" min="0" step="0.01" data-card-field="' + escapeHtml(key) + '" data-card-id="' + escapeHtml(card.id) + '" value="' + escapeHtml(String(value ?? '')) + '"><span>' + escapeHtml(unit) + '</span></span></label>';
    }
    function cardCurrencySelect(card, key, value) {
      return '<label class="saved-card-field"><span>' + escapeHtml(uiText('cards.field.' + key, key, key)) + '</span><select data-card-currency="' + escapeHtml(key) + '" data-card-id="' + escapeHtml(card.id) + '"><option value="USD"' + (value === 'USD' ? ' selected' : '') + '>USD $</option><option value="CNY"' + (value === 'CNY' ? ' selected' : '') + '>CNY ¥</option></select></label>';
    }
    function renderSavedCardBody(card) {
      const c = card.config || {};
      if (card.type === 'multiplier') {
        const toUsd = (amount, currency) => currency === 'CNY' ? num(amount) / (num(c.fxRate) || 1) : num(amount);
        const result = toUsd(c.earned, c.earnedCurrency) ? toUsd(c.spent, c.spentCurrency) / toUsd(c.earned, c.earnedCurrency) : 0;
        return '<div class="saved-card-fields">' + cardInput(card, 'spent', c.spent, c.spentCurrency || 'USD') + cardInput(card, 'earned', c.earned, c.earnedCurrency || 'CNY') + cardCurrencySelect(card, 'spentCurrency', c.spentCurrency || 'USD') + cardCurrencySelect(card, 'earnedCurrency', c.earnedCurrency || 'CNY') + cardInput(card, 'fxRate', c.fxRate, '¥/$') + '</div><div class="saved-card-result"><span>' + escapeHtml(uiText('cards.result.multiplier', 'Multiplier', '倍率')) + '</span><strong>' + (result ? result.toLocaleString('zh-CN', {maximumFractionDigits:4}) : '--') + '</strong></div>';
      }
      const models = cardModels(card);
      const usage = {ratio:num(c.config?.ratio), hit:percent(c.config?.hit)};
      const multiplier = num(c.config?.multiplier);
      if (card.type === 'comparison') {
        const total = num(c.config?.total);
        return '<div class="saved-card-fields">' + cardInput(card, 'ratio', c.config?.ratio, ': 1') + cardInput(card, 'hit', c.config?.hit, '%') + cardInput(card, 'total', c.config?.total, c.unit || 'M') + cardInput(card, 'multiplier', c.config?.multiplier, 'x') + cardInput(card, 'fxRate', c.config?.fxRate, '¥/$') + '</div>' + cardModelPicker(card) + cardModelWarning(card) + '<div class="saved-card-results">' + (models.length ? models.map(model => '<div class="saved-card-result"><span>' + escapeHtml(model.name) + '</span><strong>' + escapeHtml(money(cost(model, total, usage, multiplier), c.config?.fxRate)) + '</strong></div>').join('') : '<span class="saved-card-empty">' + escapeHtml(uiText('cards.noModels', 'Select at least one model.', '请至少选择一个模型。')) + '</span>') + '</div>';
      }
      const rows = Array.isArray(c.rows) && c.rows.length ? c.rows : [c.config || {}];
      const results = rows.map((row, index) => {
        const rowUsage = {ratio:num(row.ratio ?? c.config?.ratio), hit:percent(row.hit ?? c.config?.hit)};
        const rowMultiplier = num(row.multiplier ?? c.config?.multiplier);
        if (card.type === 'tokenCost') return '<div class="saved-card-row"><span>' + escapeHtml(uiText('cards.row', 'Row {index}', '第 {index} 行').replace('{index}', String(index + 1))) + '</span>' + models.map(model => '<strong>' + escapeHtml(model.name) + ': ' + escapeHtml(money(cost(model, num(row.total ?? c.config?.total), rowUsage, rowMultiplier), row.fxRate ?? c.config?.fxRate)) + '</strong>').join('') + '</div>';
        return '<div class="saved-card-row"><span>' + escapeHtml(uiText('cards.row', 'Row {index}', '第 {index} 行').replace('{index}', String(index + 1))) + '</span>' + models.map(model => { const perM = cost(model, 1, rowUsage, rowMultiplier); const budget = num(row.budget ?? c.config?.budget) / ((c.currency || state.currency) === 'CNY' ? (num(row.fxRate ?? c.config?.fxRate) || 1) : 1); return '<strong>' + escapeHtml(model.name) + ': ' + escapeHtml(perM ? tokens(budget / perM, c.unit || 'M') : '--') + '</strong>'; }).join('') + '</div>';
      }).join('');
      return '<div class="saved-card-fields">' + cardInput(card, card.type === 'tokenCost' ? 'total' : 'budget', rows[0][card.type === 'tokenCost' ? 'total' : 'budget'] ?? c.config?.[card.type === 'tokenCost' ? 'total' : 'budget'], card.type === 'tokenCost' ? (c.unit || 'M') : (c.currency || state.currency)) + cardInput(card, 'ratio', c.config?.ratio, ': 1') + cardInput(card, 'hit', c.config?.hit, '%') + cardInput(card, 'multiplier', c.config?.multiplier, 'x') + cardInput(card, 'fxRate', c.config?.fxRate, '¥/$') + (card.type === 'budget' ? cardCurrencySelect(card, 'currency', c.currency || state.currency) : '') + '</div>' + cardModelPicker(card) + cardModelWarning(card) + '<div class="saved-card-results">' + (models.length ? results : '<span class="saved-card-empty">' + escapeHtml(uiText('cards.noModels', 'Select at least one model.', '请至少选择一个模型。')) + '</span>') + '</div>';
    }
    function renderCards() {
      const root = $('cardsGrid');
      if (!root || !state) return;
      root.style.setProperty('--cards-columns', String(state.cardsGridColumns || 3));
      if (!state.cards.length) { root.innerHTML = '<div class="cards-empty"><strong>' + escapeHtml(uiText('cards.emptyTitle', 'No saved cards yet', '还没有收藏卡片')) + '</strong><span>' + escapeHtml(uiText('cards.emptyDescription', 'Add a card to keep a calculation close at hand.', '添加一张卡片，把常用计算放在这里。')) + '</span></div>'; return; }
      root.innerHTML = state.cards.map(card => '<article class="saved-card" draggable="true" data-card-id="' + escapeHtml(card.id) + '"><header class="saved-card-header"><div><span class="saved-card-type">' + escapeHtml(uiText('cards.type.' + card.type, card.type, card.type)) + '</span><input class="saved-card-title" data-card-title="' + escapeHtml(card.id) + '" value="' + escapeHtml(cardTitle(card)) + '" aria-label="' + escapeHtml(uiText('cards.titleLabel', 'Card title', '卡片标题')) + '"></div><div class="saved-card-actions"><button class="text-btn" type="button" data-card-up="' + escapeHtml(card.id) + '" title="' + escapeHtml(uiText('cards.moveUp', 'Move up', '上移')) + '">↑</button><button class="text-btn" type="button" data-card-down="' + escapeHtml(card.id) + '" title="' + escapeHtml(uiText('cards.moveDown', 'Move down', '下移')) + '">↓</button><button class="text-btn danger-btn" type="button" data-card-delete="' + escapeHtml(card.id) + '">' + escapeHtml(uiText('action.deleteItem', 'Delete', '删除')) + '</button></div></header>' + renderSavedCardBody(card) + '</article>').join('');
      root.querySelectorAll('[data-card-field]').forEach(input => input.addEventListener('change', event => {
        const card = state.cards.find(item => item.id === event.target.dataset.cardId); if (!card) return;
        const key = event.target.dataset.cardField; const value = num(event.target.value);
        if (card.type === 'multiplier') card.config[key] = value;
        else { const target = card.config.rows?.[0] || card.config.config; if (['total', 'budget'].includes(key) && card.config.rows?.[0]) card.config.rows[0][key] = value; else if (target) target[key] = value; }
        renderCards(); save();
      }));
      root.querySelectorAll('[data-card-currency]').forEach(input => input.addEventListener('change', event => { const card = state.cards.find(item => item.id === event.target.dataset.cardId); if (!card) return; if (card.type === 'multiplier') card.config[event.target.dataset.cardCurrency] = event.target.value; else card.config[event.target.dataset.cardCurrency] = event.target.value; renderCards(); save(); }));
      root.querySelectorAll('[data-card-model]').forEach(input => input.addEventListener('change', event => { const card = state.cards.find(item => item.id === event.target.dataset.cardModel); if (!card) return; card.selectedModelIds = [...new Set((card.selectedModelIds || []).filter(id => id !== event.target.dataset.modelId).concat(event.target.checked ? [event.target.dataset.modelId] : []))]; renderCards(); save(); }));
      root.querySelectorAll('[data-card-title]').forEach(input => input.addEventListener('change', event => { const card = state.cards.find(item => item.id === event.target.dataset.cardTitle); if (!card) return; card.title = String(event.target.value || '').trim(); card.customTitle = Boolean(card.title); save(); }));
      root.querySelectorAll('[data-card-delete]').forEach(button => button.addEventListener('click', () => { if (!confirm(uiText('cards.deleteConfirm', 'Delete this saved card?', '确定删除这张收藏卡片吗？'))) return; state.cards = state.cards.filter(card => card.id !== button.dataset.cardDelete).map((card, index) => ({...card, order:index})); renderCards(); save(); }));
      root.querySelectorAll('[data-card-up],[data-card-down]').forEach(button => button.addEventListener('click', () => moveCard(button.dataset.cardUp || button.dataset.cardDown, Boolean(button.dataset.cardUp), true)));
      root.querySelectorAll('.saved-card').forEach(cardEl => {
        cardEl.addEventListener('dragstart', () => { draggedCardId = cardEl.dataset.cardId; cardEl.classList.add('is-dragging'); });
        cardEl.addEventListener('dragend', () => { draggedCardId = null; cardEl.classList.remove('is-dragging'); });
        cardEl.addEventListener('dragover', event => event.preventDefault());
        cardEl.addEventListener('drop', event => { event.preventDefault(); if (!draggedCardId || draggedCardId === cardEl.dataset.cardId) return; const from = state.cards.findIndex(card => card.id === draggedCardId); const to = state.cards.findIndex(card => card.id === cardEl.dataset.cardId); const [item] = state.cards.splice(from, 1); state.cards.splice(to, 0, item); state.cards = state.cards.map((card, index) => ({...card, order:index})); renderCards(); save(); });
      });
    }
    function moveCard(id, up, persist=true) { const index = state.cards.findIndex(card => card.id === id); const next = index + (up ? -1 : 1); if (index < 0 || next < 0 || next >= state.cards.length) return; const [item] = state.cards.splice(index, 1); state.cards.splice(next, 0, item); state.cards = state.cards.map((card, order) => ({...card, order})); renderCards(); if (persist) save(); }
    function openCardAddDialog() { $('cardAddDialog')?.showModal(); }
    function addSavedCard(type) { if (!CARD_TYPES.includes(type)) return; state.cards.push(newSavedCard(type)); state.cards = state.cards.map((card, order) => ({...card, order})); $('cardAddDialog')?.close(); setActiveView('cards'); renderCards(); save(); }
    function saveCurrentAsCard(type) { if (!CARD_TYPES.includes(type)) return; state.cards.push(newSavedCard(type)); setActiveView('cards'); renderCards(); save(); }
    function update(renderModelComparison=true) {
      const inputTotal = num(state.cache) + num(state.input);
      $('ratioOut').textContent = num(state.output) ? (inputTotal / num(state.output)).toFixed(2) + ' : 1' : '--';
      $('hitOut').textContent = inputTotal ? (num(state.cache) / inputTotal * 100).toFixed(1) + '%' : '--';
      const ratio = num(state.knownRatio);
      $('inputShare').textContent = (ratio / (ratio + 1) * 100).toFixed(1) + '%';
      $('outputShare').textContent = (1 / (ratio + 1) * 100).toFixed(1) + '%';
      const mfx = num(state.multiplierCalc.fxRate) || 1;
      const toUsd = (amount, currency) => currency === 'CNY' ? num(amount) / mfx : num(amount);
      const spentUsd = toUsd(state.multiplierCalc.spent, state.multiplierCalc.spentCurrency);
      const earnedUsd = toUsd(state.multiplierCalc.earned, state.multiplierCalc.earnedCurrency);
      $('multiplierOut').textContent = earnedUsd ? (spentUsd / earnedUsd).toLocaleString('zh-CN', {maximumFractionDigits:4}) : '--';
      if (renderModelComparison) { renderComparisonConfig(); renderComparison(); }
      renderScenario(); renderCards(); renderSettingsModelList(); save();
    }
    bindStructureInput('cache','cache'); bindStructureInput('input','input'); bindStructureInput('output','output'); bind('knownRatio','knownRatio'); bind('knownHit','knownHit',percent);
    $('multSpent').addEventListener('input', event => { state.multiplierCalc.spent = num(event.target.value); update(); });
    $('multEarned').addEventListener('input', event => { state.multiplierCalc.earned = num(event.target.value); update(); });
    $('multFxRate').addEventListener('input', event => { state.multiplierCalc.fxRate = num(event.target.value); update(); });
    $('multSpentCurrency').addEventListener('change', event => { state.multiplierCalc.spentCurrency = event.target.value; update(); });
    $('multEarnedCurrency').addEventListener('change', event => { state.multiplierCalc.earnedCurrency = event.target.value; update(); });
    $('confirmModelDelete').onclick = () => {
      const id = pendingModelId;
      $('modelDeleteDialog').close();
      pendingModelId = null;
      const model = id && state.models.find(item => item.id === id);
      if (userAddedModel(model) && state.models.length > 1) {
        state.models = state.models.filter(model => model.id !== id);
        ensureComparisonSelection(); ensureSelection('tokenRows'); ensureSelection('budgetRows'); update();
      }
    };
    $('modelDeleteDialog').addEventListener('close', () => { pendingModelId = null; });
    $('closeModelConfig').onclick = closeModelConfigDialog;
    $('cancelModelConfig').onclick = closeModelConfigDialog;
    $('saveModelConfig').onclick = () => {
      const model = state.models.find(item => item.id === pendingModelConfigId);
      if (!model) return closeModelConfigDialog();
      if (!model.customPricing && !userAddedModel(model)) model.catalogPricing = priceSnapshot(model);
      model.cache = priceNumber($('modelConfigCache').value);
      model.input = priceNumber($('modelConfigInput').value);
      model.output = priceNumber($('modelConfigOutput').value);
      model.customPricing = true;
      closeModelConfigDialog();
      update();
    };
    $('resetModelConfig').onclick = async () => {
      const model = state.models.find(item => item.id === pendingModelConfigId);
      if (!model || userAddedModel(model) || !model.customPricing) return;
      if (!confirm(t('model.customPricing.resetConfirm', {name:model.name}))) return;
      const button = $('resetModelConfig');
      button.disabled = true;
      let catalogPricing = priceSnapshot(model.catalogPricing) || bundledCatalogPricing(model);
      try {
        if (!catalogPricing) {
          const api = window.pywebview && window.pywebview.api;
          const result = api ? await api.fetch_pricing_models() : null;
          const catalogModel = result && result.ok ? matchingModel(result.models, model) : null;
          catalogPricing = priceSnapshot(catalogModel);
        }
        if (!catalogPricing) {
          alert(t('model.customPricing.resetFailed'));
          return;
        }
        model.catalogPricing = catalogPricing;
        model.cache = catalogPricing.cache;
        model.input = catalogPricing.input;
        model.output = catalogPricing.output;
        model.customPricing = false;
        closeModelConfigDialog();
        update();
      } catch (error) {
        console.error('Failed to restore catalog pricing.', error);
        alert(t('model.customPricing.resetFailed'));
      } finally {
        button.disabled = false;
      }
    };
    $('modelConfigDialog').addEventListener('close', () => { pendingModelConfigId = null; });
    $('modelConfigDialog').addEventListener('click', event => {
      if (event.target === event.currentTarget) closeModelConfigDialog();
    });
    const settingsSearchDialog = $('settingsSearchDialog');
    if ($('settingsSearchOpen') && settingsSearchDialog) $('settingsSearchOpen').onclick = () => {
      $('settingsModelSearchMobile').value = settingsModelSearchQuery;
      settingsSearchDialog.showModal();
      window.setTimeout(() => $('settingsModelSearchMobile').focus(), 0);
    };
    if ($('settingsSearchClose') && settingsSearchDialog) $('settingsSearchClose').onclick = () => settingsSearchDialog.close();
    settingsSearchDialog?.addEventListener('click', event => {
      if (event.target === event.currentTarget) event.currentTarget.close();
    });
    $('closeModelSelection')?.addEventListener('click', closeModelSelection);
    $('cancelModelSelection')?.addEventListener('click', closeModelSelection);
    $('applyModelSelection')?.addEventListener('click', applyModelSelection);
    $('modelSelectionDialog')?.addEventListener('click', event => {
      if (event.target === event.currentTarget) closeModelSelection();
    });
    $('modelSelectionDialog')?.addEventListener('close', () => {
      modelSelectionType = null;
      modelSelectionDraft = new Set();
      modelSelectionProvider = '';
      modelSelectionPanel = 'select';
    });
    const settingsPageSizeSelect = $('settingsModelPageSize');
    if (settingsPageSizeSelect) settingsPageSizeSelect.addEventListener('change', event => {
      const nextSize = Number(event.target.value);
      if (!SETTINGS_MODEL_PAGE_SIZES.includes(nextSize)) return;
      settingsModelPageSize = nextSize;
      settingsModelPage = 1;
      renderSettingsModelList();
    });
    $('closeHelpDialog').onclick = () => $('helpDialog').close();
    $('helpDialog').addEventListener('click', event => {
      if (event.target === event.currentTarget) event.currentTarget.close();
    });
    document.querySelectorAll('[data-help-section]').forEach(button => {
      button.addEventListener('click', () => openHelpDialog(button.dataset.helpSection));
    });
    $('structureUnit').onchange=e=>{state.structureUnit=e.target.value; renderStructureUnit(); update();};
    $('comparisonUnit').onchange = event => {
      state.comparisonUnit = event.target.value;
      renderComparisonConfig();
      renderComparison();
      save();
    };
    $('tokenUnit').onchange = event => {
      state.tokenUnit = event.target.value;
      renderScenarioConfig('tokenRows');
      renderTokenRows();
      save();
    };
    $('budgetUnit').onchange = event => {
      state.budgetUnit = event.target.value;
      renderBudgetRows();
      save();
    };
    $('currency').onchange=e=>{state.currency=e.target.value; update();};
    $('language').onchange = event => { state.language = window.i18n.setLocale(event.target.value); window.i18n.translateDocument(); renderMobileViewTitle(state.activeView); renderStructureUnit(); renderSettingsModelFilters(); update(); };
    $('showHostedModels').onchange = event => {
      state.showHostedModels = event.target.checked;
      settingsProviderSelection.clear();
      settingsModelPage = 1;
      renderSettingsModelList();
      save();
    };
    function mergePricingModels(incoming) {
      const previous = new Map(state.models.filter(model => model.source === 'litellm').map(model => [String(model.sourceModelId || model.id).trim().toLowerCase(), model]));
      const manual = state.models.filter(model => model.source !== 'litellm');
      const manualMatches = new Map();
      manual.forEach(model => [model.id, model.sourceModelId, model.targetId, model.name].filter(Boolean).forEach(value => manualMatches.set(String(value).toLowerCase(), model)));
      const matchedManualIds = new Set();
      const used = new Set(manual.map(model => model.id));
      const imported = incoming.filter(hasPrice).map((item, index) => {
        const sourceModelId = String(item.sourceModelId || item.id || '');
        const targetId = String(item.targetId || '');
        const old = previous.get(sourceModelId.trim().toLowerCase()) || manualMatches.get(sourceModelId.toLowerCase()) || manualMatches.get(targetId.toLowerCase());
        if (old && old.source !== 'litellm') { matchedManualIds.add(old.id); used.delete(old.id); }
        const customPricing = Boolean(old && old.customPricing);
        const raw = {...item, id:old?.id || item.id || ('catalog-' + sourceModelId), name:String(item.name || sourceModelId || t('model.new')), source:'litellm', sourceModelId,
          provider:String(item.provider || item.providerId || ''), providerId:String(item.providerId || item.provider || ''),
          category:String(item.category || 'general').trim().toLowerCase(), categoryId:String(item.categoryId || '').trim(), enabled:old && typeof old.enabled === 'boolean' ? old.enabled : false,
          cache:customPricing ? priceNumber(old.cache) : priceNumber(item.cache), input:customPricing ? priceNumber(old.input) : priceNumber(item.input), output:customPricing ? priceNumber(old.output) : priceNumber(item.output), customPricing, catalogPricing:priceSnapshot(item), targetId};
        return {
          ...raw, id:modelId(raw, index, used), icon:String(item.icon || ''),
          multiplier:valueOr(old && old.multiplier, item.multiplier),
          fxRate:valueOr(old && old.fxRate, item.fxRate),
          comparisonRatio:valueOr(old && old.comparisonRatio, item.comparisonRatio),
          comparisonHit:percent(valueOr(old && old.comparisonHit, item.comparisonHit)),
          comparisonTotal:valueOr(old && old.comparisonTotal, item.comparisonTotal)
        };
      });
      state.models = orderModels([...manual.filter(model => !matchedManualIds.has(model.id)), ...imported]);
      ensureComparisonSelection();
      ensureSelection('tokenRows');
      ensureSelection('budgetRows');
    }
    async function fetchPricingCatalog() {
      const api = window.pywebview && window.pywebview.api;
      if (!api || typeof api.fetch_pricing_models !== 'function') throw new Error('Pricing catalog API is unavailable');
      const result = await api.fetch_pricing_models();
      if (!result || !result.ok) throw new Error(result && result.error ? result.error : 'Unknown pricing error');
      return result;
    }
    async function syncPricingModels() {
      const api = window.pywebview && window.pywebview.api;
      const button = $('settingsSyncPrices');
      const status = $('pricingStatus');
      if (!api) return;
      if (button) button.disabled = true;
      if (status) {
        status.className = 'pricing-status loading';
        status.textContent = t('pricing.syncing');
      }
      try {
        const result = await fetchPricingCatalog();
        mergePricingModels(Array.isArray(result.models) ? result.models : []);
        state.pricingCatalogInitialized = true;
        state.pricingCatalogFetchedAt = result.fetchedAt || new Date().toISOString();
        update();
        if (status) {
          status.className = 'pricing-status ' + (result.fromCache ? 'warning' : 'success');
          status.textContent = result.fromCache
            ? t('pricing.cached', {count:result.count})
            : t('pricing.synced', {count:result.count});
        }
        if (result.warning) console.warn(result.warning);
      } catch (error) {
        if (status) {
          status.className = 'pricing-status error';
          status.textContent = t('pricing.failed');
        }
        console.error('Failed to sync pricing catalog.', error);
      } finally {
        if (button) button.disabled = false;
      }
    }
    function modelAddCategoryOptions() {
      const configured = PRICING_CONFIG && PRICING_CONFIG.categories && typeof PRICING_CONFIG.categories === 'object'
        ? Object.entries(PRICING_CONFIG.categories) : [];
      const options = [['general', uiText('model.add.type.general', 'General', '通用')]];
      configured.forEach(([id, details]) => {
        const label = details && typeof details === 'object' ? details.name : details;
        if (id && label && !options.some(option => option[0] === id)) options.push([id, uiText('model.add.type.' + id, String(label), String(label))]);
      });
      options.push(['other', uiText('model.add.type.other', 'Other', '其他')]);
      return options;
    }
    function modelAddProviderOptions() {
      const configured = PRICING_CONFIG && PRICING_CONFIG.providers && typeof PRICING_CONFIG.providers === 'object'
        ? Object.entries(PRICING_CONFIG.providers) : [];
      const known = new Map(configured.map(([id, details]) => [id, String(details && details.name || id)]));
      state.models.forEach(model => {
        const id = String(model.providerId || '').trim();
        const name = String(model.provider || id).trim();
        if (id && name && !known.has(id) && id !== 'others') known.set(id, name);
      });
      return [...known.entries()].map(([id, name]) => [id, name]).concat([['others', uiText('model.add.providerOther', 'Others', '其他')]]);
    }
    function openModelAddDialog(id=null) {
      if (!state) return;
      const dialog = $('modelAddDialog');
      if (!dialog) return;
      const model = id ? state.models.find(item => item.id === id) : null;
      if (id && !userAddedModel(model)) return;
      pendingModelEditId = model ? model.id : null;
      const editing = Boolean(model);
      const title = $('modelAddTitle');
      const description = $('modelAddDescription');
      const saveButton = $('saveModelAdd');
      if (title) title.textContent = uiText(editing ? 'model.edit.title' : 'model.add.title', editing ? 'Edit custom model' : 'Add custom model');
      if (description) description.textContent = uiText(editing ? 'model.edit.description' : 'model.add.description', editing ? 'Update this model for local calculations.' : 'Add a model for local calculations.');
      if (saveButton) saveButton.textContent = uiText(editing ? 'model.edit.save' : 'model.add.save', editing ? 'Save changes' : 'Add model');
      $('newModelName').value = model ? model.name : '';
      const categoryOptions = modelAddCategoryOptions();
      const currentCategory = model ? modelCategory(model) : '';
      if (currentCategory && !categoryOptions.some(([optionId]) => optionId === currentCategory)) categoryOptions.push([currentCategory, currentCategory]);
      $('newModelCategory').innerHTML = categoryOptions.map(([optionId, label]) => '<option value="' + escapeHtml(optionId) + '">' + escapeHtml(label) + '</option>').join('');
      $('newModelProvider').innerHTML = modelAddProviderOptions().map(([optionId, label]) => '<option value="' + escapeHtml(optionId) + '">' + escapeHtml(label) + '</option>').join('');
      if (model) {
        $('newModelCategory').value = currentCategory;
        $('newModelProvider').value = String(model.providerId || 'others');
      }
      dialog.showModal();
      window.setTimeout(() => $('newModelName').focus(), 0);
    }
    function closeModelAddDialog() {
      $('modelAddDialog')?.close();
      pendingModelEditId = null;
    }
    function saveModelAdd() {
      if (!state) return;
      const nameInput = $('newModelName');
      const name = String(nameInput.value || '').trim();
      if (!name) { nameInput.reportValidity(); return; }
      const config = state.comparisonConfig;
      const providerId = String($('newModelProvider').value || 'others');
      const provider = $('newModelProvider').selectedOptions[0]?.textContent || uiText('model.add.providerOther', 'Others', '其他');
      const category = String($('newModelCategory').value || 'general');
      const existing = pendingModelEditId && state.models.find(model => model.id === pendingModelEditId);
      if (existing) {
        if (!userAddedModel(existing)) return closeModelAddDialog();
        existing.name = name;
        existing.category = category;
        existing.categoryId = category;
        existing.provider = provider;
        existing.providerId = providerId;
        existing.icon = '';
        closeModelAddDialog();
        update();
        return;
      }
      const id = 'custom-' + Date.now();
      state.models.push({id, name, category, categoryId:category, provider, providerId, source:'manual', sourceModelId:'', targetId:'', icon:'', cache:0, input:0, output:0, customPricing:true, enabled:true, multiplier:.04, fxRate:7.2, comparisonRatio:config.ratio, comparisonHit:config.hit, comparisonTotal:config.total});
      state.comparisonSelectedModelIds.push(id);
      closeModelAddDialog();
      update();
    }
    if ($('settingsSyncPrices')) $('settingsSyncPrices').onclick = syncPricingModels;
    if ($('addModel')) $('addModel').onclick = () => openModelAddDialog();
    if ($('settingsAddModel')) $('settingsAddModel').onclick = () => openModelAddDialog();
    $('closeModelAdd').onclick = closeModelAddDialog;
    $('cancelModelAdd').onclick = closeModelAddDialog;
    $('saveModelAdd').onclick = saveModelAdd;
    $('modelAddDialog').querySelector('form')?.addEventListener('submit', event => {
      event.preventDefault();
      saveModelAdd();
    });
    $('modelAddDialog').addEventListener('click', event => {
      if (event.target === event.currentTarget) closeModelAddDialog();
    });
    $('modelAddDialog').addEventListener('close', () => { pendingModelEditId = null; });
    $('addTokenRow').onclick=()=>{state.tokenRows.push(newRow('tokenRows', state.tokenConfig)); renderTokenRows(); save();};
    $('addBudgetRow').onclick=()=>{state.budgetRows.push(newRow('budgetRows', state.budgetConfig)); renderBudgetRows(); save();};
    $('addCard')?.addEventListener('click', openCardAddDialog);
    $('closeCardAdd')?.addEventListener('click', () => $('cardAddDialog')?.close());
    $('cardAddDialog')?.addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });
    document.querySelectorAll('[data-card-template]').forEach(button => button.addEventListener('click', () => addSavedCard(button.dataset.cardTemplate)));
    $('cardsColumns')?.addEventListener('change', event => { state.cardsGridColumns = Math.min(6, Math.max(1, Number(event.target.value) || 3)); renderCards(); save(); });
    document.querySelectorAll('[data-save-card]').forEach(button => button.addEventListener('click', () => saveCurrentAsCard(button.dataset.saveCard)));
    const resetConfirmDialog = $('resetConfirmDialog');
    const resetTextDialog = $('resetTextDialog');
    const resetConfirmInput = $('resetConfirmInput');
    const resetExecuteButton = $('resetConfirmExecute');
    const resetDialogError = $('resetDialogError');
    $('reset').onclick = () => {
      resetConfirmDialog?.showModal();
    };
    $('resetConfirmProceed')?.addEventListener('click', () => {
      resetConfirmDialog?.close();
      resetConfirmInput.value = '';
      resetExecuteButton.disabled = true;
      if (resetDialogError) resetDialogError.hidden = true;
      resetTextDialog?.showModal();
      window.setTimeout(() => resetConfirmInput?.focus(), 0);
    });
    resetConfirmInput?.addEventListener('input', () => {
      const valid = resetConfirmInput.value === 'RESET';
      resetExecuteButton.disabled = !valid;
      if (resetDialogError) resetDialogError.hidden = true;
    });
    resetExecuteButton?.addEventListener('click', async () => {
      if (resetConfirmInput.value !== 'RESET') return;
      resetExecuteButton.disabled = true;
      const api = window.pywebview && window.pywebview.api;
      isResetting = true;
      clearTimeout(saveTimer);
      try {
        if (!api || await api.reset_state()) {
          try { sessionStorage.setItem(ONBOARDING_RESET_SESSION_KEY, 'reset'); } catch (_) {}
          localStorage.removeItem('token-cost-calc');
          resetTextDialog?.close();
          location.reload();
          return;
        }
        throw new Error('reset_state returned false');
      } catch (error) {
        console.error('Failed to reset application.', error);
        isResetting = false;
        resetExecuteButton.disabled = false;
        if (resetDialogError) {
          resetDialogError.textContent = t('resetDialog.failed');
          resetDialogError.hidden = false;
        }
      }
    });
    document.querySelectorAll('[data-view-target]').forEach(button => {
      button.addEventListener('click', () => {
        setActiveView(button.dataset.viewTarget);
      });
    });
    $('settingsSubnav')?.addEventListener('click', event => {
      const button = event.target.closest('[data-settings-target]');
      if (button) setSettingsSection(button.dataset.settingsTarget);
    });
    const themeSelect = $('theme');
    if (themeSelect) themeSelect.addEventListener('change', event => {
      if (!state) return;
      state.theme = THEME_IDS.includes(event.target.value) ? event.target.value : 'system';
      applyTheme(state.theme);
      save();
    });
    if (systemTheme) {
      const onSystemThemeChange = () => {
        if (!state || state.theme === 'system') applyTheme('system');
      };
      if (systemTheme.addEventListener) systemTheme.addEventListener('change', onSystemThemeChange);
      else if (systemTheme.addListener) systemTheme.addListener(onSystemThemeChange);
    }
    setupOnboarding();
    applyTheme('system');
    window.addEventListener('pywebviewready', async () => {
      try {
        const [defaults, saved, pricingConfig] = await Promise.all([
          window.pywebview.api.load_defaults(),
          window.pywebview.api.load_state(),
          window.pywebview.api.load_pricing_config()
        ]);
        DEFAULT = defaults;
        PRICING_CONFIG = pricingConfig || {};
        const rawState = saved || loadLegacyState();
        const onboardingRequired = shouldShowOnboarding(rawState);
        state = migrate(rawState, PRICING_CONFIG);
        state.language = window.i18n.setLocale(state.language);
        window.i18n.translateDocument();
        renderStructureUnit();
        $('knownRatio').value = state.knownRatio;
        $('knownHit').value = state.knownHit;
        $('multSpent').value = state.multiplierCalc.spent;
        $('multEarned').value = state.multiplierCalc.earned;
        $('multFxRate').value = state.multiplierCalc.fxRate;
        $('multSpentCurrency').value = state.multiplierCalc.spentCurrency;
        $('multEarnedCurrency').value = state.multiplierCalc.earnedCurrency;
        $('comparisonUnit').value = state.comparisonUnit;
        $('tokenUnit').value = state.tokenUnit;
         $('budgetUnit').value = state.budgetUnit;
         $('cardsColumns').value = String(state.cardsGridColumns);
        $('currency').value = state.currency;
        $('language').value = state.language;
        $('showHostedModels').checked = state.showHostedModels;
        if ($('theme')) $('theme').value = state.theme;
        applyTheme(state.theme);
        applySidebarCollapsed(state.sidebarCollapsed || window.innerWidth <= 740, false);
         setSettingsSection(state.settingsSection, false);
        setActiveView(state.activeView, false);
        update();
        const onboardingVisible = onboardingRequired && showOnboarding(rawState);
        if (onboardingVisible) {
          // `onboarding-open` continues to hide the workspace below the full-screen flow.
          document.body.classList.remove('app-booting');
        } else {
          // Let the first fully rendered workspace paint as a whole, never as raw HTML.
          window.requestAnimationFrame(() => document.body.classList.remove('app-booting'));
        }
        const shouldSyncPricing = !onboardingRequired && state.onboardingOnlineSync !== false && state.pricingCatalogInitialized !== true;
        if (!onboardingVisible && shouldSyncPricing) window.setTimeout(() => syncPricingModels(), 0);
      } catch (error) {
        console.error('Failed to initialize Token Cost Calc.', error);
        document.body.innerHTML = '<main class="app"><p>' + t('error.config') + '</p></main>';
      }
    });
