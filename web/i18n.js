(() => {
  const translations = {
    'zh-CN': {
      'app.title': 'Token Cost Calc', 'app.subtitle': '把 Token 账算得明明白白。',
      'header.currency': '显示币种', 'header.language': '语言', 'header.reset': '重置为默认值', 'language.zhCN': '简体中文', 'language.zhTW': '繁體中文', 'language.en': 'English', 'label.tokenUnit': 'Token 单位',
      'section.structure.title': '① 结构反推', 'section.structure.subtitle': '先填你已有的三项 Token',
      'structure.knownDistribution': '已知 Token 分布', 'structure.cacheHit': '缓存命中（{unit} Token）', 'structure.input': '输入（缓外，{unit} Token）', 'structure.output': '输出（{unit} Token）',
      'structure.inputOutputWithCache': '输入 : 输出（含缓存）', 'structure.formula': '输入 = 缓存命中 + 缓外输入；命中率 = 缓存命中 / 输入。', 'structure.knownUsage': '已知使用特征', 'structure.inputShare': '输入占全部 Token', 'structure.outputShare': '输出占全部 Token', 'structure.usageFormula': '输入与输出比、缓存命中率可分别设置；此处用于查看已有使用特征。',
      'section.comparison.title': '② 横向对比', 'section.comparison.subtitle': '每个模型可独立设置单价、倍率和美元兑人民币汇率', 'comparison.hint': '勾选共享后，该字段将应用到所有模型；取消勾选后可为每个模型单独设置。实际费用已乘开支倍率，并同时显示美元与人民币。',
      'section.tokenCost.title': '③ Token 转价格', 'section.tokenCost.subtitle': '按总 Token 估算不同模型的实际开支', 'section.budget.title': '④ 价格转 Token', 'section.budget.subtitle': '按预算估算可使用的总 Token', 'scenario.hint': '勾选共享后，该字段将应用到所有条目；取消勾选后可为每一条单独设置。',
      'footer.note': '注：缓存命中视为输入的一部分。模型价格、汇率和开支倍率均由你控制；计算结果仅包含模型 Token 费用，不含工具调用、税费及其他服务费用。', 'footer.storage': '本地计算器 / 状态保存在 token-cost-calc.json',
      'dialog.deleteModelTitle': '删除模型？', 'dialog.deleteModelPrefix': '将删除', 'dialog.deleteModelSuffix': '及其在各板块中的模型选择。',
      'field.inputOutput': '输入 : 输出', 'field.cacheHitRate': '缓存命中率', 'field.totalTokens': '总 Token', 'field.totalTokensUnit': '总 Token ({unit})', 'field.expenseMultiplier': '开支倍率', 'field.usdCnyRate': '美元兑人民币', 'field.budget': '预算（当前币种）',
      'action.addModel': '＋ 添加模型', 'action.addItem': '＋ 添加条目', 'action.cancel': '取消', 'action.deleteModel': '删除模型', 'action.deleteItem': '删除条目', 'action.collapse': '折叠此板块', 'action.expand': '展开此板块', 'action.shared': '共享', 'action.perRow': '逐条设置',
      'filter.visibleModels': '显示模型（已选 {count} 个）', 'filter.modelColumns': '模型列（已选 {count} 个）', 'model.new': '新模型', 'model.unnamed': '该模型',
      'comparison.modelItem': '模型 / 项目', 'comparison.cachePrice': '缓存命中 $ / 1M', 'comparison.cachePriceAdjusted': '缓存命中（倍率后，$ / ¥ / 1M）', 'comparison.inputPrice': '缓外输入 $ / 1M', 'comparison.inputPriceAdjusted': '缓外输入（倍率后，$ / ¥ / 1M）', 'comparison.outputPrice': '输出 $ / 1M', 'comparison.outputPriceAdjusted': '输出（倍率后，$ / ¥ / 1M）', 'comparison.multiplier': '开支倍率（x）', 'comparison.fxRate': '美元兑人民币汇率', 'comparison.actualCost': '总 Token 实际开支（倍率后）', 'comparison.standardCost': '标准 API 费用（未乘倍率）',
      'scenario.perHundredMillion': '每 1 亿 Token {cost}', 'scenario.totalByBudget': '按预算可使用总 Token', 'confirm.reset': '重置所有输入、模型和价格？', 'error.config': '无法加载应用配置。'
    },
    'zh-TW': {
      'app.title': 'Token Cost Calc', 'app.subtitle': '把 Token 帳算得明明白白。',
      'header.currency': '顯示幣別', 'header.language': '語言', 'header.reset': '重設為預設值', 'language.zhCN': '簡體中文', 'language.zhTW': '繁體中文', 'language.en': 'English', 'label.tokenUnit': 'Token 單位',
      'section.structure.title': '① 結構反推', 'section.structure.subtitle': '先填入你已有的三項 Token',
      'structure.knownDistribution': '已知 Token 分布', 'structure.cacheHit': '快取命中（{unit} Token）', 'structure.input': '輸入（未命中快取，{unit} Token）', 'structure.output': '輸出（{unit} Token）',
      'structure.inputOutputWithCache': '輸入 : 輸出（含快取）', 'structure.formula': '輸入 = 快取命中 + 未命中快取的輸入；命中率 = 快取命中 / 輸入。', 'structure.knownUsage': '已知使用特徵', 'structure.inputShare': '輸入占全部 Token', 'structure.outputShare': '輸出占全部 Token', 'structure.usageFormula': '輸入與輸出比、快取命中率可分別設定；此處用於查看已有使用特徵。',
      'section.comparison.title': '② 橫向比較', 'section.comparison.subtitle': '每個模型可個別設定單價、倍率和美元兌人民幣匯率', 'comparison.hint': '勾選共用後，該欄位將套用到所有模型；取消勾選後可為每個模型個別設定。實際費用已乘開支倍率，並同時顯示美元與人民幣。',
      'section.tokenCost.title': '③ Token 轉價格', 'section.tokenCost.subtitle': '按總 Token 估算不同模型的實際開支', 'section.budget.title': '④ 價格轉 Token', 'section.budget.subtitle': '按預算估算可使用的總 Token', 'scenario.hint': '勾選共用後，該欄位將套用到所有項目；取消勾選後可為每一項個別設定。',
      'footer.note': '註：快取命中視為輸入的一部分。模型價格、匯率和開支倍率均由你控制；計算結果僅包含模型 Token 費用，不含工具呼叫、稅費及其他服務費用。', 'footer.storage': '本機計算器 / 狀態儲存在 token-cost-calc.json',
      'dialog.deleteModelTitle': '刪除模型？', 'dialog.deleteModelPrefix': '將刪除', 'dialog.deleteModelSuffix': '及其在各區塊中的模型選擇。',
      'field.inputOutput': '輸入 : 輸出', 'field.cacheHitRate': '快取命中率', 'field.totalTokens': '總 Token', 'field.totalTokensUnit': '總 Token ({unit})', 'field.expenseMultiplier': '開支倍率', 'field.usdCnyRate': '美元兌人民幣', 'field.budget': '預算（目前幣別）',
      'action.addModel': '＋ 新增模型', 'action.addItem': '＋ 新增項目', 'action.cancel': '取消', 'action.deleteModel': '刪除模型', 'action.deleteItem': '刪除項目', 'action.collapse': '摺疊此區塊', 'action.expand': '展開此區塊', 'action.shared': '共用', 'action.perRow': '逐項設定',
      'filter.visibleModels': '顯示模型（已選 {count} 個）', 'filter.modelColumns': '模型欄（已選 {count} 個）', 'model.new': '新模型', 'model.unnamed': '此模型',
      'comparison.modelItem': '模型 / 項目', 'comparison.cachePrice': '快取命中 $ / 1M', 'comparison.cachePriceAdjusted': '快取命中（倍率後，$ / ¥ / 1M）', 'comparison.inputPrice': '未命中快取的輸入 $ / 1M', 'comparison.inputPriceAdjusted': '未命中快取的輸入（倍率後，$ / ¥ / 1M）', 'comparison.outputPrice': '輸出 $ / 1M', 'comparison.outputPriceAdjusted': '輸出（倍率後，$ / ¥ / 1M）', 'comparison.multiplier': '開支倍率（x）', 'comparison.fxRate': '美元兌人民幣匯率', 'comparison.actualCost': '總 Token 實際開支（倍率後）', 'comparison.standardCost': '標準 API 費用（未乘倍率）',
      'scenario.perHundredMillion': '每 1 億 Token {cost}', 'scenario.totalByBudget': '按預算可使用總 Token', 'confirm.reset': '重設所有輸入、模型和價格？', 'error.config': '無法載入應用程式設定。'
    },
    en: {
      'app.title': 'Token Cost Calculator', 'app.subtitle': 'Make token costs easy to understand.',
      'header.currency': 'Currency', 'header.language': 'Language', 'header.reset': 'Reset to defaults', 'language.zhCN': 'Simplified Chinese', 'language.zhTW': 'Traditional Chinese', 'language.en': 'English', 'label.tokenUnit': 'Token unit',
      'section.structure.title': '① Usage Breakdown', 'section.structure.subtitle': 'Start with the three token amounts you know',
      'structure.knownDistribution': 'Known Token Distribution', 'structure.cacheHit': 'Cache hits ({unit} tokens)', 'structure.input': 'Non-cached input ({unit} tokens)', 'structure.output': 'Output ({unit} tokens)',
      'structure.inputOutputWithCache': 'Input : Output (including cache)', 'structure.formula': 'Input = cache hits + non-cached input; hit rate = cache hits / input.', 'structure.knownUsage': 'Known Usage Profile', 'structure.inputShare': 'Input share of all tokens', 'structure.outputShare': 'Output share of all tokens', 'structure.usageFormula': 'Set the input/output ratio and cache hit rate independently to inspect an existing usage profile.',
      'section.comparison.title': '② Model Comparison', 'section.comparison.subtitle': 'Set prices, multiplier, and USD/CNY rate for each model', 'comparison.hint': 'When shared is checked, a field applies to every model. Clear it to set each model separately. Actual costs include the expense multiplier and show both USD and CNY.',
      'section.tokenCost.title': '③ Tokens to Cost', 'section.tokenCost.subtitle': 'Estimate actual spend by total tokens for each model', 'section.budget.title': '④ Budget to Tokens', 'section.budget.subtitle': 'Estimate total usable tokens from a budget', 'scenario.hint': 'When shared is checked, a field applies to every row. Clear it to set rows separately.',
      'footer.note': 'Note: cache hits are part of input. You control model prices, exchange rates, and expense multipliers. Results include model token charges only, excluding tools, tax, and other service fees.', 'footer.storage': 'Local calculator / state saved in token-cost-calc.json',
      'dialog.deleteModelTitle': 'Delete model?', 'dialog.deleteModelPrefix': 'This will remove', 'dialog.deleteModelSuffix': 'and its selections across all sections.',
      'field.inputOutput': 'Input : Output', 'field.cacheHitRate': 'Cache hit rate', 'field.totalTokens': 'Total tokens', 'field.totalTokensUnit': 'Total tokens ({unit})', 'field.expenseMultiplier': 'Expense multiplier', 'field.usdCnyRate': 'USD to CNY', 'field.budget': 'Budget (current currency)',
      'action.addModel': '+ Add model', 'action.addItem': '+ Add row', 'action.cancel': 'Cancel', 'action.deleteModel': 'Delete model', 'action.deleteItem': 'Delete row', 'action.collapse': 'Collapse section', 'action.expand': 'Expand section', 'action.shared': 'Shared', 'action.perRow': 'Set per row',
      'filter.visibleModels': 'Visible models ({count} selected)', 'filter.modelColumns': 'Model columns ({count} selected)', 'model.new': 'New model', 'model.unnamed': 'this model',
      'comparison.modelItem': 'Model / Item', 'comparison.cachePrice': 'Cache hit $ / 1M', 'comparison.cachePriceAdjusted': 'Cache hit (adjusted, $ / CNY / 1M)', 'comparison.inputPrice': 'Non-cached input $ / 1M', 'comparison.inputPriceAdjusted': 'Non-cached input (adjusted, $ / CNY / 1M)', 'comparison.outputPrice': 'Output $ / 1M', 'comparison.outputPriceAdjusted': 'Output (adjusted, $ / CNY / 1M)', 'comparison.multiplier': 'Expense multiplier (x)', 'comparison.fxRate': 'USD to CNY rate', 'comparison.actualCost': 'Actual total-token cost (adjusted)', 'comparison.standardCost': 'Standard API cost (before multiplier)',
      'scenario.perHundredMillion': 'Per 100M tokens: {cost}', 'scenario.totalByBudget': 'Total tokens available within budget', 'confirm.reset': 'Reset all inputs, models, and prices?', 'error.config': 'Unable to load application configuration.'
    }
  };

  const supportedLocales = Object.keys(translations);
  let locale = 'zh-CN';

  function normalizeLocale(value) {
    return supportedLocales.includes(value) ? value : 'zh-CN';
  }

  function t(key, values = {}) {
    const message = translations[locale][key] || translations['zh-CN'][key] || key;
    return message.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
  }

  function setLocale(value) {
    locale = normalizeLocale(value);
    document.documentElement.lang = locale;
    document.title = t('app.title');
    return locale;
  }

  function translateDocument(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(element => {
      element.textContent = t(element.dataset.i18n);
    });
    root.querySelectorAll('[data-i18n-title]').forEach(element => {
      element.title = t(element.dataset.i18nTitle);
    });
  }

  window.i18n = { normalizeLocale, setLocale, t, translateDocument };
})();
