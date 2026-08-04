    let DEFAULT;
    const t = (key, values) => window.i18n.t(key, values);
    const PRESET_ORDER = ['GPT-5.6 Sol', 'GPT-5.6 Terra', 'GPT-5.6 Luna'];
    const $ = id => document.getElementById(id);
    const num = value => Math.max(0, Number(value) || 0);
    const valueOr = (value, fallback) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : fallback;
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
    function migrate(raw) {
      const saved = raw && typeof raw === 'object' ? raw : {};
      const oldRatio = valueOr(saved.estimateRatio, DEFAULT.tokenConfig.ratio);
      const oldHit = percent(valueOr(saved.estimateHit, DEFAULT.tokenConfig.hit));
      const oldTokenRows = Array.isArray(saved.tokenRows) ? saved.tokenRows : (Array.isArray(saved.scenarios) ? saved.scenarios : []);
      const oldBudgetRows = Array.isArray(saved.budgetRows) ? saved.budgetRows : (Array.isArray(saved.scenarios) ? saved.scenarios : []);
      if (![3, 4, 5, 6, 7, 8, 9].includes(saved.stateVersion)) {
        const firstToken = oldTokenRows[0] || {};
        const firstBudget = oldBudgetRows[0] || {};
        saved.tokenConfig = {ratio:oldRatio, hit:oldHit, total:valueOr(firstToken.total, 100), multiplier:valueOr(firstToken.multiplier, .04), shared:{ratio:true, hit:true, total:true, multiplier:true}};
        saved.budgetConfig = {ratio:oldRatio, hit:oldHit, budget:valueOr(firstBudget.budget, 100), multiplier:valueOr(firstBudget.multiplier, .04), shared:{ratio:true, hit:true, budget:true, multiplier:true}};
        saved.tokenRows = oldTokenRows.map(row => ({ratio:oldRatio, hit:oldHit, total:valueOr(row.total, 100), multiplier:valueOr(row.multiplier, .04)}));
        saved.budgetRows = oldBudgetRows.map(row => ({ratio:oldRatio, hit:oldHit, budget:valueOr(row.budget, 100), multiplier:valueOr(row.multiplier, .04)}));
        saved.stateVersion = 9;
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
      saved.stateVersion = 9;
      const usedIds = new Set();
      const rawModels = Array.isArray(saved.models) && saved.models.length ? saved.models : clone(DEFAULT.models);
      const legacyModelMultiplier = valueOr(saved.comparisonMultiplier, valueOr(saved.multiplier, .04));
      const legacyModelFxRate = valueOr(saved.comparisonFxRate, valueOr(saved.fxRate, 7.2));
      const models = orderModels(rawModels.map((model, index) => ({
        id:modelId(model, index, usedIds), name:String(model.name || t('model.new')),
        cache:num(model.cache), input:num(model.input), output:num(model.output),
        multiplier:valueOr(model.multiplier, legacyModelMultiplier), fxRate:valueOr(model.fxRate, legacyModelFxRate),
        comparisonRatio:valueOr(model.comparisonRatio, comparisonConfig.ratio),
        comparisonHit:percent(valueOr(model.comparisonHit, comparisonConfig.hit)),
        comparisonTotal:valueOr(model.comparisonTotal, comparisonConfig.total)
      })));
      const tokenConfig = normalizeConfig(saved.tokenConfig, DEFAULT.tokenConfig, 'tokenRows');
      const budgetConfig = normalizeConfig(saved.budgetConfig, DEFAULT.budgetConfig, 'budgetRows');
      const legacySelected = Array.isArray(saved.selectedModelIds) ? saved.selectedModelIds : [];
      const selectionFor = key => {
        const source = Array.isArray(saved[key]) ? saved[key] : legacySelected;
        const selected = source.filter(id => models.some(model => model.id === id)).slice(0, 3);
        return selected.length ? selected : [models[0].id];
      };
      const comparisonSelectedModelIds = Array.isArray(saved.comparisonSelectedModelIds)
        ? [...new Set(saved.comparisonSelectedModelIds.filter(id => models.some(model => model.id === id)))]
        : models.map(model => model.id);
      return {
        ...DEFAULT, ...saved, models, comparisonConfig, tokenConfig, budgetConfig,
        tokenRows:normalizeRows(saved.tokenRows, 'tokenRows', tokenConfig),
        budgetRows:normalizeRows(saved.budgetRows, 'budgetRows', budgetConfig),
        comparisonSelectedModelIds:comparisonSelectedModelIds.length ? comparisonSelectedModelIds : [models[0].id],
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
    function save() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        if (window.pywebview && window.pywebview.api) window.pywebview.api.save_state(state).catch(() => {});
      }, 180);
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
    function selectedKey(type) { return type === 'tokenRows' ? 'tokenSelectedModelIds' : 'budgetSelectedModelIds'; }
    function selectedModels(type) { return state.models.filter(model => state[selectedKey(type)].includes(model.id)); }
    function ensureComparisonSelection() {
      const key = 'comparisonSelectedModelIds';
      state[key] = [...new Set((state[key] || []).filter(id => state.models.some(model => model.id === id)))];
      if (!state[key].length && state.models.length) state[key] = [state.models[0].id];
    }
    function comparisonModels() {
      ensureComparisonSelection();
      return state.models.filter(model => state.comparisonSelectedModelIds.includes(model.id));
    }
    function renderComparisonFilter(keepOpen=false) {
      const root = $('comparisonModelFilter');
      ensureComparisonSelection();
      const selected = state.comparisonSelectedModelIds;
      const count = selected.length;
      root.innerHTML = '<details class="model-picker"' + (keepOpen ? ' open' : '') + '><summary>' + t('filter.visibleModels', {count}) + '</summary><div class="model-options">' + state.models.map(model => {
        const checked = selected.includes(model.id);
        return '<label class="check-label"><input type="checkbox" data-comparison-model-filter="' + model.id + '"' + (checked ? ' checked' : '') + (checked && count === 1 ? ' disabled' : '') + '>' + escapeHtml(model.name) + '</label>';
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
      state[key] = [...new Set(state[key].filter(id => state.models.some(model => model.id === id)))].slice(0, 3);
      if (!state[key].length && state.models.length) state[key] = [state.models[0].id];
    }
    function renderModelFilter(type, keepOpen=false) {
      ensureSelection(type);
      const key = selectedKey(type);
      const root = $(type === 'tokenRows' ? 'tokenModelFilter' : 'budgetModelFilter');
      const count = state[key].length;
      root.innerHTML = '<details class="model-picker"' + (keepOpen ? ' open' : '') + '><summary>' + t('filter.modelColumns', {count}) + '</summary><div class="model-options">' + state.models.map(model => {
        const checked = state[key].includes(model.id);
        const disabled = checked && count === 1;
        return '<label class="check-label"><input type="checkbox" data-model-filter="' + model.id + '"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + '>' + escapeHtml(model.name) + '</label>';
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
      if (!model || state.models.length <= 1) return;
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
        <div class="cell label-cell">${t('comparison.modelItem')}</div>${models.map(m=>`<div class="cell model-head"><input class="model-name" data-name="${m.id}" value="${escapeHtml(m.name)}"><button class="close" data-remove="${m.id}" title="${t('action.deleteModel')}">×</button></div>`).join('')}
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
      root.querySelectorAll('[data-name]').forEach(el => el.addEventListener('input', e => { const model = state.models.find(item => item.id === e.target.dataset.name); if (model) model.name = e.target.value; update(false); }));
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
      return '<div class="scenario-cell scenario-head">#</div>' + fields.map(field => '<div class="scenario-cell scenario-head">' + scenarioFieldLabel(type, field) + '</div>').join('') + models.map(model => '<div class="scenario-cell scenario-head model">' + escapeHtml(model.name) + '</div>').join('');
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
        const results = models.map(model => '<div class="scenario-cell scenario-result"><strong>' + escapeHtml(model.name) + '</strong><span>' + money(cost(model, total, usage, multiplier), fxRate) + '</span><em>' + t('scenario.perHundredMillion', {cost:money(cost(model, 100, usage, multiplier), fxRate)}) + '</em></div>').join('');
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
          return '<div class="scenario-cell scenario-result"><strong>' + escapeHtml(model.name) + '</strong><span>' + (perM ? tokens(budgetUsd / perM, state.budgetUnit) : '--') + '</span><em>' + t('scenario.totalByBudget') + '</em></div>';
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
      renderScenario(); save();
    }
    bindStructureInput('cache','cache'); bindStructureInput('input','input'); bindStructureInput('output','output'); bind('knownRatio','knownRatio'); bind('knownHit','knownHit',percent);
    $('confirmModelDelete').onclick = () => {
      const id = pendingModelId;
      $('modelDeleteDialog').close();
      pendingModelId = null;
      if (id && state.models.length > 1) {
        state.models = state.models.filter(model => model.id !== id);
        ensureComparisonSelection(); ensureSelection('tokenRows'); ensureSelection('budgetRows'); update();
      }
    };
    $('modelDeleteDialog').addEventListener('close', () => { pendingModelId = null; });
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
    $('language').onchange = event => { state.language = window.i18n.setLocale(event.target.value); window.i18n.translateDocument(); refreshToggleTitles(); renderStructureUnit(); update(); };
    $('addModel').onclick=()=>{const config=state.comparisonConfig, id='custom-' + Date.now(); state.models.push({id, name:t('model.new'),cache:0,input:0,output:0,multiplier:.04,fxRate:7.2,comparisonRatio:config.ratio,comparisonHit:config.hit,comparisonTotal:config.total}); state.comparisonSelectedModelIds.push(id); update();};
    $('addTokenRow').onclick=()=>{state.tokenRows.push(newRow('tokenRows', state.tokenConfig)); renderTokenRows(); save();};
    $('addBudgetRow').onclick=()=>{state.budgetRows.push(newRow('budgetRows', state.budgetConfig)); renderBudgetRows(); save();};
    $('reset').onclick=async()=>{if(confirm(t('confirm.reset'))) { const api = window.pywebview && window.pywebview.api; if (!api || await api.reset_state()) { localStorage.removeItem('token-cost-calc'); location.reload(); } }};
    function refreshToggleTitles() {
      document.querySelectorAll('[data-toggle]').forEach(button => {
        button.title = t(button.closest('.collapsible-section').classList.contains('collapsed') ? 'action.expand' : 'action.collapse');
      });
    }
    document.querySelectorAll('[data-toggle]').forEach(button => button.addEventListener('click', () => {
      const section = button.closest('.collapsible-section');
      const collapsed = section.classList.toggle('collapsed');
      button.textContent = collapsed ? 'v' : '^';
      button.setAttribute('aria-expanded', String(!collapsed));
      button.title = collapsed ? t('action.expand') : t('action.collapse');
    }));
    window.addEventListener('pywebviewready', async () => {
      try {
        const [defaults, saved] = await Promise.all([
          window.pywebview.api.load_defaults(),
          window.pywebview.api.load_state()
        ]);
        DEFAULT = defaults;
        state = migrate(saved || loadLegacyState());
        state.language = window.i18n.setLocale(state.language);
        window.i18n.translateDocument();
        refreshToggleTitles();
        renderStructureUnit();
        $('knownRatio').value = state.knownRatio;
        $('knownHit').value = state.knownHit;
        $('comparisonUnit').value = state.comparisonUnit;
        $('tokenUnit').value = state.tokenUnit;
        $('budgetUnit').value = state.budgetUnit;
        $('currency').value = state.currency;
        $('language').value = state.language;
        update();
      } catch (error) {
        console.error('Failed to initialize Token Cost Calc.', error);
        document.body.innerHTML = '<main class="app"><p>' + t('error.config') + '</p></main>';
      }
    });
