    let DEFAULT;
    let PRICING_CONFIG = {};
    const t = (key, values) => window.i18n.t(key, values);
    const PRESET_ORDER = ['GPT-5.6 Sol', 'GPT-5.6 Terra', 'GPT-5.6 Luna'];
    const $ = id => document.getElementById(id);
    const HELP_POINT_KEYS = ['point1', 'point2', 'point3'];
    const VIEW_IDS = ['home', 'structure', 'comparison', 'tokenCost', 'budget', 'settings'];
    const THEME_IDS = ['system', 'light', 'dark'];
    const SETTINGS_MODEL_PAGE_SIZES = [12, 24];
    let settingsModelPageSize = SETTINGS_MODEL_PAGE_SIZES[0];
    let settingsModelPage = 1;
    let settingsModelSearchQuery = '';
    let settingsStatusFilter = '';
    let settingsPricingFilter = '';
    let settingsProviderSelection = new Set();
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
      let toggle = sidebar.querySelector('#sidebarToggle');
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
        settings.classList.remove('sidebar-settings');
        settings.classList.add('sidebar-nav-item');
        nav.appendChild(settings);
        sidebar.querySelector('.sidebar-footer')?.remove();
      }
      const details = sidebar.querySelector('.sidebar-state');
      if (details && !details.dataset.sidebarBound) {
        details.dataset.sidebarBound = 'true';
        details.addEventListener('toggle', () => applySidebarCollapsed(!details.open));
      }
      document.querySelectorAll('[data-sidebar-toggle]').forEach(button => {
        if (button.dataset.sidebarBound) return;
        button.dataset.sidebarBound = 'true';
        if (button.tagName.toLowerCase() !== 'summary') button.addEventListener('click', () => applySidebarCollapsed(!sidebar.classList.contains('is-collapsed')));
      });
      $('sidebarBackdrop')?.addEventListener('click', () => applySidebarCollapsed(true));
    }

    function setupRuntimeShell() {
      setupModelIconFallback();
      const legacySync = $('syncPrices');
      legacySync?.closest('.catalog-toolbar')?.remove();
      document.querySelectorAll('.section-toggle,[data-toggle]').forEach(button => button.remove());
      document.querySelectorAll('main.app > .legend, main.app > .foot').forEach(element => { element.dataset.viewFooter = 'true'; });
      setupSidebar();
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
    function tokenUnitFactor(unit) { return STRUCTURE_UNIT_TO_M[unit] || 1; }
    function tokenDisplayValue(valueM, unit) { return Number((num(valueM) / tokenUnitFactor(unit)).toFixed(6)).toString(); }
    function tokenStoredValue(value, unit) { return num(value) * tokenUnitFactor(unit); }
    function structureUnitFactor() { return tokenUnitFactor(state.structureUnit); }
    function structureDisplayValue(valueM) { return tokenDisplayValue(valueM, state.structureUnit); }
    function renderStructureUnit() {
      const unit = state.structureUnit || 'M';
      $('structureUnit').value = unit;
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
        {key:'total', labelKey:'field.totalTokens', unit:'M', step:'0.1'}
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
    function scenarioTokenUnit(type) { return type === 'comparison' ? state.comparisonUnit : (type === 'tokenRows' ? state.tokenUnit : state.budgetUnit); }
    function scenarioFieldLabel(type, field) {
      return (type === 'comparison' || type === 'tokenRows') && field.key === 'total' ? t('field.totalTokensUnit', {unit:scenarioTokenUnit(type)}) : field.label;
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
      const source = Array.isArray(rows) && rows.length ? rows : [newRow(type, config)];
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
      if (![3, 4, 5, 6, 7, 8, 9, 10].includes(saved.stateVersion)) {
        const firstToken = oldTokenRows[0] || {};
        const firstBudget = oldBudgetRows[0] || {};
        saved.tokenConfig = {ratio:oldRatio, hit:oldHit, total:valueOr(firstToken.total, 100), multiplier:valueOr(firstToken.multiplier, .04), shared:{ratio:true, hit:true, total:true, multiplier:true}};
        saved.budgetConfig = {ratio:oldRatio, hit:oldHit, budget:valueOr(firstBudget.budget, 100), multiplier:valueOr(firstBudget.multiplier, .04), shared:{ratio:true, hit:true, budget:true, multiplier:true}};
        saved.tokenRows = oldTokenRows.map(row => ({ratio:oldRatio, hit:oldHit, total:valueOr(row.total, 100), multiplier:valueOr(row.multiplier, .04)}));
        saved.budgetRows = oldBudgetRows.map(row => ({ratio:oldRatio, hit:oldHit, budget:valueOr(row.budget, 100), multiplier:valueOr(row.multiplier, .04)}));
        saved.stateVersion = 10;
      }
      saved.comparisonMultiplier = valueOr(saved.comparisonMultiplier, valueOr(saved.multiplier, DEFAULT.comparisonMultiplier));
      saved.comparisonFxRate = valueOr(saved.comparisonFxRate, valueOr(saved.fxRate, DEFAULT.comparisonFxRate));
      const comparisonFallback = {
        ratio:valueOr(saved.knownRatio, DEFAULT.comparisonConfig.ratio),
        hit:percent(valueOr(saved.knownHit, DEFAULT.comparisonConfig.hit)),
        total:DEFAULT.comparisonConfig.total,
        shared:DEFAULT.comparisonConfig.shared
      };
      const comparisonConfig = normalizeConfig(saved.comparisonConfig, comparisonFallback, 'comparison');
      saved.stateVersion = 10;
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
      const selectionFor = key => {
        const source = Array.isArray(saved[key]) ? saved[key] : legacySelected;
        const selected = [...new Set(source.map(resolveModelId).filter(id => id && models.some(model => model.id === id && modelEnabled(model))))].slice(0, 3);
        const fallback = models.find(modelEnabled);
        return selected.length ? selected : (fallback ? [fallback.id] : []);
      };
      const comparisonSelectedModelIds = Array.isArray(saved.comparisonSelectedModelIds)
        ? [...new Set(saved.comparisonSelectedModelIds.map(resolveModelId).filter(id => id && models.some(model => model.id === id && modelEnabled(model))))]
        : models.filter(modelEnabled).map(model => model.id);
      const activeView = 'home';
      const theme = THEME_IDS.includes(saved.theme) ? saved.theme : 'system';
      return {
        ...DEFAULT, ...saved, models, comparisonConfig, tokenConfig, budgetConfig, activeView, theme,
        sidebarCollapsed:Boolean(saved.sidebarCollapsed), showHostedModels:Boolean(saved.showHostedModels), settingsSection:['general', 'models', 'about', 'reset'].includes(saved.settingsSection) ? saved.settingsSection : 'general', stateVersion:10,
        tokenRows:normalizeRows(saved.tokenRows, 'tokenRows', tokenConfig),
        budgetRows:normalizeRows(saved.budgetRows, 'budgetRows', budgetConfig),
        comparisonSelectedModelIds,
        tokenSelectedModelIds:selectionFor('tokenSelectedModelIds'),
        budgetSelectedModelIds:selectionFor('budgetSelectedModelIds')
      };
    }
    function loadLegacyState() {
      try { return JSON.parse(localStorage.getItem('token-cost-calc')); }
      catch { return null; }
    }
    let state;
    let saveTimer;
    let pendingModelId = null;
    let pendingModelConfigId = null;
    function userAddedModel(model) { return Boolean(model && model.source === 'manual'); }
    function save() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        if (window.pywebview && window.pywebview.api) window.pywebview.api.save_state(state).catch(() => {});
      }, 180);
    }
    function applySidebarCollapsed(collapsed, persist=true) {
      const sidebar = document.querySelector('.sidebar');
      const shell = document.querySelector('.app-shell');
      const value = Boolean(collapsed);
      const details = sidebar?.querySelector('.sidebar-state');
      if (details && details.open !== !value) details.open = !value;
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
    function setSettingsSection(section, persist=true) {
      const activeSection = ['general', 'models', 'about', 'reset'].includes(section) ? section : 'general';
      const settingsView = document.querySelector('[data-view-section="settings"]');
      if (!settingsView) return;
      const shell = document.querySelector('.app-shell');
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
    function setActiveView(view, persist=true) {
      const activeView = VIEW_IDS.includes(view) ? view : 'home';
      document.querySelectorAll('[data-view-section]').forEach(section => {
        const active = section.dataset.viewSection === activeView;
        section.hidden = !active;
        section.classList.toggle('is-active', active);
      });
      document.querySelectorAll('[data-view-target]').forEach(button => {
        const active = button.dataset.viewTarget === activeView;
        button.classList.toggle('active', active);
        button.classList.toggle('is-active', active);
        if (active) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
      });
      document.querySelectorAll('[data-view-footer]').forEach(element => { element.hidden = activeView === 'home' || activeView === 'settings'; });
      document.querySelector('.sidebar')?.classList.toggle('is-settings-mode', activeView === 'settings');
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
    const money = (usd, fxRate) => {
      const amount = state.currency === 'CNY' ? usd * num(fxRate) : usd;
      const symbol = state.currency === 'CNY' ? '\u00a5' : '$';
      return symbol + amount.toLocaleString('zh-CN', {maximumFractionDigits:2});
    };
    const dualMoney = (usd, fxRate) => '$' + usd.toLocaleString('zh-CN', {maximumFractionDigits:2}) + ' / ¥' + (usd * num(fxRate)).toLocaleString('zh-CN', {maximumFractionDigits:2});
    const tokens = (amountM, unit='M') => (num(amountM) / tokenUnitFactor(unit)).toLocaleString('zh-CN', {maximumFractionDigits:2}) + ' ' + unit + ' Token';
    function bind(id, key, converter=num) { $(id).addEventListener('input', e => { state[key] = converter(e.target.value); update(); }); }
    function priceRow(label, key) { return `<div class="cell label-cell">${label}</div>${comparisonModels().map(m => `<div class="cell"><input class="price-input" data-model-key="${key}" data-model-id="${m.id}" type="number" min="0" step="0.001" value="${m[key]}"></div>`).join('')}`; }
    function modelSettingRow(label, key, step) { return `<div class="cell label-cell">${label}</div>${comparisonModels().map(m => `<div class="cell"><input class="price-input" data-model-key="${key}" data-model-id="${m.id}" type="number" min="0" step="${step}" value="${m[key]}"></div>`).join('')}`; }
    function multipliedPriceRow(label, key) { return `<div class="cell label-cell">${label}</div>${comparisonModels().map(m => `<div class="cell"><div class="money">${dualMoney(num(m[key]) * num(m.multiplier), m.fxRate)}</div></div>`).join('')}`; }    function standardCost(model, totalM, usage) {
      const ratio = num(usage.ratio);
      const hit = percent(usage.hit) / 100;
      const total = totalM * 1000000;
      const inputTotal = total * ratio / (ratio + 1);
      const cache = inputTotal * hit, input = inputTotal - cache, output = total - inputTotal;
      return (cache * num(model.cache) + input * num(model.input) + output * num(model.output)) / 1000000;
    }
    function cost(model, totalM, usage, multiplier) { return standardCost(model, totalM, usage) * num(multiplier); }
    function escapeHtml(text) { const node=document.createElement('span'); node.textContent=text; return node.innerHTML; }
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
    function providerIconSources(model) {
      const meta = modelProviderMeta(model);
      const source = PRICING_CONFIG && PRICING_CONFIG.iconSource && typeof PRICING_CONFIG.iconSource === 'object'
        ? PRICING_CONFIG.iconSource : {};
      const aliases = source.aliases && typeof source.aliases === 'object' ? source.aliases : {};
      const providerId = normalizedProvider(meta.id || model && model.providerId || model && model.provider);
      const slug = String(aliases[providerId] || providerId).trim().toLowerCase();
      const baseUrl = String(source.baseUrl || '').replace(/\/$/, '');
      const catalogIcon = baseUrl && slug ? baseUrl + '/' + encodeURIComponent(slug) + '.svg' : '';
      const local = meta.icon || model && model.icon || '';
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
    function modelBadge(model, compact=false) {
      const iconSources = providerIconSources(model);
      const provider = modelProvider(model);
      const fallback = escapeHtml((provider || model.name || '?').trim().charAt(0).toUpperCase() || '?');
      const visual = iconSources.primary
        ? '<img class="model-brand-icon' + (iconSources.monochrome ? ' is-monochrome' : '') + '" src="' + iconSources.primary + '"' + (iconSources.fallback ? ' data-local-source="' + iconSources.fallback + '"' : '') + ' alt="" loading="lazy" data-fallback="' + fallback + '">'
        : '<span class="model-brand-fallback" aria-hidden="true">' + fallback + '</span>';
      return '<span class="model-badge' + (compact ? ' compact' : '') + '">' + visual +
        '<span class="model-badge-text"><strong>' + escapeHtml(model.name) + '</strong>' +
        (provider && !compact ? '<small>' + escapeHtml(provider) + '</small>' : '') + '</span></span>';
    }
    function providerFilterBadge(provider, model) {
      const iconSources = providerIconSources(model);
      const fallback = escapeHtml(String(provider || '?').trim().charAt(0).toUpperCase() || '?');
      const visual = iconSources.primary
        ? '<img class="model-brand-icon' + (iconSources.monochrome ? ' is-monochrome' : '') + '" src="' + iconSources.primary + '"' + (iconSources.fallback ? ' data-local-source="' + iconSources.fallback + '"' : '') + ' alt="" loading="lazy" data-fallback="' + fallback + '">'
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
      const bindPricingFilter = (root, name) => {
        if (!root) return;
        root.innerHTML = pricingOptions.map(([value, label]) => '<label class="custom-pricing-filter-option"><input type="radio" name="' + name + '" value="' + value + '"' + (settingsPricingFilter === value ? ' checked' : '') + '><span>' + escapeHtml(label) + '</span></label>').join('');
        root.querySelectorAll('input').forEach(input => input.addEventListener('change', () => {
          settingsPricingFilter = input.value;
          settingsModelPage = 1;
          renderSettingsModelList();
        }));
      };
      bindPricingFilter($('settingsCustomPricingList'), 'settingsPricingDesktop');
      bindPricingFilter($('settingsMobileCustomPricing'), 'settingsPricingMobile');
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
        const deleteButton = userAddedModel(model)
          ? '<button class="settings-model-delete" type="button" data-settings-remove="' + escapeHtml(model.id) + '" title="' + escapeHtml(t('action.deleteModel')) + '" aria-label="' + escapeHtml(t('action.deleteModel')) + '">×</button>'
          : '';
        return '<article class="settings-model-card' + (modelEnabled(model) ? '' : ' is-disabled') + '" data-provider="' + escapeHtml(settingsProviderLabel(model)) + '" data-category="' + escapeHtml(modelCategory(model)) + '" data-status="' + (modelEnabled(model) ? 'enabled' : 'disabled') + '">' +
          '<header class="settings-model-card-header">' + modelBadge(model, true) + '</header>' +
          '<p class="model-card-provider">' + modelDetails(model) + '</p>' +
          '<p class="model-card-price-unit">' + escapeHtml(uiText('model.card.priceUnit', '$ / 1M tokens', '$ / 1M Token')) + '</p>' +
          '<dl class="model-price-grid"><div><dt>' + escapeHtml(uiText('model.card.cachePrice', 'Cache')) + '</dt><dd>' + escapeHtml(modelPriceDisplay(model.cache)) + '</dd></div><div><dt>' + escapeHtml(uiText('model.card.inputPrice', 'Input')) + '</dt><dd>' + escapeHtml(modelPriceDisplay(model.input)) + '</dd></div><div><dt>' + escapeHtml(uiText('model.card.outputPrice', 'Output')) + '</dt><dd>' + escapeHtml(modelPriceDisplay(model.output)) + '</dd></div></dl>' +
          '<div class="settings-model-card-actions"><label class="model-enabled-toggle"><input type="checkbox" data-settings-toggle="' + escapeHtml(model.id) + '"' + (modelEnabled(model) ? ' checked' : '') + ' aria-label="' + escapeHtml(toggleLabel) + '"><span class="model-status ' + (modelEnabled(model) ? 'is-enabled' : 'is-disabled') + '">' + escapeHtml(statusLabel) + '</span></label><button class="text-btn" type="button" data-settings-config="' + escapeHtml(model.id) + '">' + escapeHtml(uiText('model.card.customPrice', 'Custom price')) + '</button>' + deleteButton + '</div></article>';
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
    function selectedModels(type) { return enabledModels().filter(model => state[selectedKey(type)].includes(model.id)); }
    function ensureComparisonSelection() {
      const key = 'comparisonSelectedModelIds';
      state[key] = [...new Set((state[key] || []).filter(id => state.models.some(model => model.id === id && modelEnabled(model))))];
      const fallback = state.models.find(modelEnabled);
      if (!state[key].length && fallback) state[key] = [fallback.id];
    }
    function comparisonModels() {
      ensureComparisonSelection();
      return enabledModels().filter(model => state.comparisonSelectedModelIds.includes(model.id));
    }
    function renderComparisonFilter(keepOpen=false) {
      const root = $('comparisonModelFilter');
      ensureComparisonSelection();
      const selected = state.comparisonSelectedModelIds;
      const count = selected.length;
      root.innerHTML = '<details class="model-picker"' + (keepOpen ? ' open' : '') + '><summary>' + t('filter.visibleModels', {count}) + '</summary><div class="model-options">' + enabledModels().map(model => {
        const checked = selected.includes(model.id);
        return '<label class="check-label model-check"><input type="checkbox" data-comparison-model-filter="' + model.id + '"' + (checked ? ' checked' : '') + (checked && count === 1 ? ' disabled' : '') + '>' + modelBadge(model) + '</label>';
      }).join('') + '</div></details>';
      root.querySelectorAll('[data-comparison-model-filter]').forEach(input => input.addEventListener('change', event => {
        const id = event.target.dataset.comparisonModelFilter;
        if (event.target.checked) state.comparisonSelectedModelIds.push(id);
        else state.comparisonSelectedModelIds = state.comparisonSelectedModelIds.filter(selectedId => selectedId !== id);
        ensureComparisonSelection();
        renderComparison();
        renderComparisonFilter(true);
        save();
      }));
    }
    function ensureSelection(type) {
      const key = selectedKey(type);
      state[key] = [...new Set((state[key] || []).filter(id => state.models.some(model => model.id === id && modelEnabled(model))))].slice(0, 3);
      const fallback = state.models.find(modelEnabled);
      if (!state[key].length && fallback) state[key] = [fallback.id];
    }
    function renderModelFilter(type, keepOpen=false) {
      ensureSelection(type);
      const key = selectedKey(type);
      const root = $(type === 'tokenRows' ? 'tokenModelFilter' : 'budgetModelFilter');
      const count = state[key].length;
      root.innerHTML = '<details class="model-picker"' + (keepOpen ? ' open' : '') + '><summary>' + t('filter.modelColumns', {count}) + '</summary><div class="model-options">' + enabledModels().map(model => {
        const checked = state[key].includes(model.id);
        const disabled = checked && count === 1;
        return '<label class="check-label model-check"><input type="checkbox" data-model-filter="' + model.id + '"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + '>' + modelBadge(model) + '</label>';
      }).join('') + '</div></details>';
      root.querySelectorAll('[data-model-filter]').forEach(input => input.addEventListener('change', event => {
        const id = event.target.dataset.modelFilter;
        if (event.target.checked) {
          if (state[key].length >= 3) state[key].shift();
          state[key].push(id);
        } else state[key] = state[key].filter(selectedId => selectedId !== id);
        ensureSelection(type);
        if (type === 'tokenRows') renderTokenRows(); else renderBudgetRows();
        save(); renderModelFilter(type, true);
      }));
    }
    function comparisonValue(model, key) {
      const config = state.comparisonConfig;
      return config.shared[key] ? config[key] : model['comparison' + key[0].toUpperCase() + key.slice(1)];
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
        if (!shared) state.models.forEach(model => { model['comparison' + key[0].toUpperCase() + key.slice(1)] = config[key]; });
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
      const property = 'comparison' + field.key[0].toUpperCase() + field.key.slice(1);
      const unit = field.key === 'total' ? scenarioTokenUnit('comparison') : field.unit;
      return `<div class="cell label-cell">${scenarioFieldLabel('comparison', field)}</div>${comparisonModels().map(model => `<div class="cell"><div class="unit-input"><input class="price-input" data-comparison-key="${field.key}" data-model-id="${model.id}" type="number" min="0" step="${field.step}" value="${scenarioFieldDisplayValue('comparison', field, model[property])}"><span>${unit}</span></div></div>`).join('')}`;
    }
    function renderComparison() {
      const root = $('comparison'); const models = comparisonModels(); root.style.setProperty('--cols', models.length); renderComparisonFilter();
      const config = state.comparisonConfig;
      root.innerHTML = `
        <div class="cell label-cell">${t('comparison.modelItem')}</div>${models.map(m=>`<div class="cell model-head" data-model-head="${m.id}">${userAddedModel(m) ? `<button class="close" data-remove="${m.id}" title="${t('action.deleteModel')}">×</button>` : ''}</div>`).join('')}
        ${priceRow(t('comparison.cachePrice'), 'cache')}
        ${multipliedPriceRow(t('comparison.cachePriceAdjusted'), 'cache')}
        ${priceRow(t('comparison.inputPrice'), 'input')}
        ${multipliedPriceRow(t('comparison.inputPriceAdjusted'), 'input')}
        ${priceRow(t('comparison.outputPrice'), 'output')}
        ${multipliedPriceRow(t('comparison.outputPriceAdjusted'), 'output')}
        ${modelSettingRow(t('comparison.multiplier'), 'multiplier', '0.001')}
        ${modelSettingRow(t('comparison.fxRate'), 'fxRate', '0.01')}
        ${fieldsFor('comparison').filter(field => !config.shared[field.key]).map(comparisonSettingRow).join('')}
        <div class="cell label-cell">${t('comparison.actualCost')}</div>${models.map(m=>`<div class="cell"><div class="money big">${dualMoney(cost(m,comparisonValue(m,'total'),{ratio:comparisonValue(m,'ratio'), hit:comparisonValue(m,'hit')},m.multiplier), m.fxRate)}</div></div>`).join('')}
        <div class="cell label-cell">${t('comparison.standardCost')}</div>${models.map(m=>`<div class="cell"><div class="money">${dualMoney(standardCost(m,comparisonValue(m,'total'),{ratio:comparisonValue(m,'ratio'), hit:comparisonValue(m,'hit')}), m.fxRate)}</div></div>`).join('')}`;
      root.querySelectorAll('.model-head').forEach(el => {
        const model = state.models.find(item => item.id === el.dataset.modelHead);
        if (model) el.insertAdjacentHTML('afterbegin', modelBadge(model, true));
      });
      root.querySelectorAll('[data-model-key]').forEach(el => { const apply = e => { const model = state.models.find(item => item.id === e.target.dataset.modelId); if (model) model[e.target.dataset.modelKey] = num(e.target.value); }; el.addEventListener('input', e => { apply(e); save(); }); el.addEventListener('change', e => { apply(e); renderComparison(); save(); }); });
      root.querySelectorAll('[data-comparison-key]').forEach(el => {
        const apply = event => {
          const model = state.models.find(item => item.id === event.target.dataset.modelId);
          const field = fieldsFor('comparison').find(item => item.key === event.target.dataset.comparisonKey);
          if (model) model['comparison' + field.key[0].toUpperCase() + field.key.slice(1)] = scenarioFieldStoredValue('comparison', field, event.target.value);
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
    function scenarioHeader(type, fields, models) {
      return '<div class="scenario-cell scenario-head">#</div>' + fields.map(field => '<div class="scenario-cell scenario-head">' + scenarioFieldLabel(type, field) + '</div>').join('') + models.map(model => '<div class="scenario-cell scenario-head model">' + modelBadge(model, true) + '</div>').join('');
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
        if (state[type].length > 1) {
          state[type].splice(Number(event.target.dataset.removeRow), 1);
          if (type === 'tokenRows') renderTokenRows(); else renderBudgetRows();
          save();
        }
      }));
    }
    function prepareTable(root, fields, models) {
      root.style.gridTemplateColumns = ['72px', ...fields.map(() => 'minmax(132px, 1fr)'), ...models.map(() => 'minmax(190px, 1fr)')].join(' ');
    }
    function renderTokenRows() {
      const root = $('tokenRows'), config = state.tokenConfig;
      const fields = fieldsFor('tokenRows').filter(field => !config.shared[field.key]);
      const models = selectedModels('tokenRows'); prepareTable(root, fields, models);
      root.innerHTML = scenarioHeader('tokenRows', fields, models) + state.tokenRows.map((row, index) => {
        const usage = {ratio:scenarioValue('tokenRows', row, 'ratio'), hit:scenarioValue('tokenRows', row, 'hit')};
        const total = scenarioValue('tokenRows', row, 'total');
        const multiplier = scenarioValue('tokenRows', row, 'multiplier');
        const fxRate = scenarioValue('tokenRows', row, 'fxRate');
        const controls = '<div class="scenario-cell scenario-number">' + (index + 1) + '<button class="scenario-remove" data-remove-type="tokenRows" data-remove-row="' + index + '" title="' + t('action.deleteItem') + '">×</button></div>' + fields.map(field => scenarioNumberInput('tokenRows', index, field, row[field.key])).join('');
        const results = models.map(model => '<div class="scenario-cell scenario-result">' + modelBadge(model, true) + '<span>' + money(cost(model, total, usage, multiplier), fxRate) + '</span><em>' + t('scenario.perHundredMillion', {cost:money(cost(model, 100, usage, multiplier), fxRate)}) + '</em></div>').join('');
        return controls + results;
      }).join('');
      bindScenarioRows(root);
    }
    function renderBudgetRows() {
      const root = $('budgetRows'), config = state.budgetConfig;
      const fields = fieldsFor('budgetRows').filter(field => !config.shared[field.key]);
      const models = selectedModels('budgetRows'); prepareTable(root, fields, models);
      root.innerHTML = scenarioHeader('budgetRows', fields, models) + state.budgetRows.map((row, index) => {
        const usage = {ratio:scenarioValue('budgetRows', row, 'ratio'), hit:scenarioValue('budgetRows', row, 'hit')};
        const budget = scenarioValue('budgetRows', row, 'budget');
        const multiplier = scenarioValue('budgetRows', row, 'multiplier');
        const fxRate = scenarioValue('budgetRows', row, 'fxRate');
        const controls = '<div class="scenario-cell scenario-number">' + (index + 1) + '<button class="scenario-remove" data-remove-type="budgetRows" data-remove-row="' + index + '" title="' + t('action.deleteItem') + '">×</button></div>' + fields.map(field => scenarioNumberInput('budgetRows', index, field, row[field.key])).join('');
        const budgetUsd = budget / (state.currency === 'CNY' ? num(fxRate) : 1);
        const results = models.map(model => {
          const perM = cost(model, 1, usage, multiplier);
          return '<div class="scenario-cell scenario-result">' + modelBadge(model, true) + '<span>' + (perM ? tokens(budgetUsd / perM, state.budgetUnit) : '--') + '</span><em>' + t('scenario.totalByBudget') + '</em></div>';
        }).join('');
        return controls + results;
      }).join('');
      bindScenarioRows(root);
    }
    function renderScenario() { renderModelFilter('tokenRows'); renderModelFilter('budgetRows'); renderScenarioConfig('tokenRows'); renderScenarioConfig('budgetRows'); renderTokenRows(); renderBudgetRows(); }
    function update(renderModelComparison=true) {
      const inputTotal = num(state.cache) + num(state.input);
      $('ratioOut').textContent = num(state.output) ? (inputTotal / num(state.output)).toFixed(2) + ' : 1' : '--';
      $('hitOut').textContent = inputTotal ? (num(state.cache) / inputTotal * 100).toFixed(1) + '%' : '--';
      const ratio = num(state.knownRatio);
      $('inputShare').textContent = (ratio / (ratio + 1) * 100).toFixed(1) + '%';
      $('outputShare').textContent = (1 / (ratio + 1) * 100).toFixed(1) + '%';
      if (renderModelComparison) { renderComparisonConfig(); renderComparison(); }
      renderScenario(); renderSettingsModelList(); save();
    }
    bindStructureInput('cache','cache'); bindStructureInput('input','input'); bindStructureInput('output','output'); bind('knownRatio','knownRatio'); bind('knownHit','knownHit',percent);
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
    $('language').onchange = event => { state.language = window.i18n.setLocale(event.target.value); window.i18n.translateDocument(); renderStructureUnit(); renderSettingsModelFilters(); update(); };
    $('showHostedModels').onchange = event => {
      state.showHostedModels = event.target.checked;
      settingsProviderSelection.clear();
      settingsModelPage = 1;
      renderSettingsModelList();
      save();
    };
    function mergePricingModels(incoming) {
      const previous = new Map(state.models.filter(model => model.source === 'litellm').map(model => [String(model.sourceModelId || model.id), model]));
      const manual = state.models.filter(model => model.source !== 'litellm');
      const manualMatches = new Map();
      manual.forEach(model => [model.id, model.sourceModelId, model.targetId, model.name].filter(Boolean).forEach(value => manualMatches.set(String(value).toLowerCase(), model)));
      const matchedManualIds = new Set();
      const used = new Set(manual.map(model => model.id));
      const imported = incoming.filter(hasPrice).map((item, index) => {
        const sourceModelId = String(item.sourceModelId || item.id || '');
        const targetId = String(item.targetId || '');
        const old = previous.get(sourceModelId) || manualMatches.get(sourceModelId.toLowerCase()) || manualMatches.get(targetId.toLowerCase());
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
    async function syncPricingModels() {
      const api = window.pywebview && window.pywebview.api;
      const button = $('settingsSyncPrices');
      const status = $('pricingStatus');
      if (!api || !button) return;
      button.disabled = true;
      if (status) {
        status.className = 'pricing-status loading';
        status.textContent = t('pricing.syncing');
      }
      try {
        const result = await api.fetch_pricing_models();
        if (!result || !result.ok) throw new Error(result && result.error ? result.error : 'Unknown pricing error');
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
        button.disabled = false;
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
    function openModelAddDialog() {
      if (!state) return;
      const dialog = $('modelAddDialog');
      if (!dialog) return;
      $('newModelName').value = '';
      $('newModelCategory').innerHTML = modelAddCategoryOptions().map(([id, label]) => '<option value="' + escapeHtml(id) + '">' + escapeHtml(label) + '</option>').join('');
      $('newModelProvider').innerHTML = modelAddProviderOptions().map(([id, label]) => '<option value="' + escapeHtml(id) + '">' + escapeHtml(label) + '</option>').join('');
      dialog.showModal();
      window.setTimeout(() => $('newModelName').focus(), 0);
    }
    function closeModelAddDialog() {
      $('modelAddDialog')?.close();
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
      const id = 'custom-' + Date.now();
      state.models.push({id, name, category, categoryId:category, provider, providerId, source:'manual', sourceModelId:'', targetId:'', icon:'', cache:0, input:0, output:0, customPricing:true, enabled:true, multiplier:.04, fxRate:7.2, comparisonRatio:config.ratio, comparisonHit:config.hit, comparisonTotal:config.total});
      state.comparisonSelectedModelIds.push(id);
      closeModelAddDialog();
      update();
    }
    if ($('settingsSyncPrices')) $('settingsSyncPrices').onclick = syncPricingModels;
    if ($('addModel')) $('addModel').onclick = openModelAddDialog;
    if ($('settingsAddModel')) $('settingsAddModel').onclick = openModelAddDialog;
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
    $('addTokenRow').onclick=()=>{state.tokenRows.push(newRow('tokenRows', state.tokenConfig)); renderTokenRows(); save();};
    $('addBudgetRow').onclick=()=>{state.budgetRows.push(newRow('budgetRows', state.budgetConfig)); renderBudgetRows(); save();};
    $('reset').onclick=async()=>{if(confirm(t('confirm.reset'))) { const api = window.pywebview && window.pywebview.api; if (!api || await api.reset_state()) { localStorage.removeItem('token-cost-calc'); location.reload(); } }};
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
         const shouldSyncPricing = !saved || saved.pricingCatalogInitialized !== true;
         state = migrate(saved || loadLegacyState(), PRICING_CONFIG);
        state.language = window.i18n.setLocale(state.language);
        window.i18n.translateDocument();
        renderStructureUnit();
        $('knownRatio').value = state.knownRatio;
        $('knownHit').value = state.knownHit;
        $('comparisonUnit').value = state.comparisonUnit;
        $('tokenUnit').value = state.tokenUnit;
        $('budgetUnit').value = state.budgetUnit;
        $('currency').value = state.currency;
        $('language').value = state.language;
        $('showHostedModels').checked = state.showHostedModels;
        if ($('theme')) $('theme').value = state.theme;
        applyTheme(state.theme);
        applySidebarCollapsed(state.sidebarCollapsed, false);
        setSettingsSection(state.settingsSection, false);
         setActiveView(state.activeView, false);
         update();
         if (shouldSyncPricing) window.setTimeout(() => syncPricingModels(), 0);
      } catch (error) {
        console.error('Failed to initialize Token Cost Calc.', error);
        document.body.innerHTML = '<main class="app"><p>' + t('error.config') + '</p></main>';
      }
    });
