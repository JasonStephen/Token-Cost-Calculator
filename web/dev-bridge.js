(() => {
  if (!/^https?:$/.test(window.location.protocol) || window.pywebview) return;

  const storageKey = 'token-cost-calc-web-debug-state';
  const readJson = path => fetch(path).then(response => {
    if (!response.ok) throw new Error('Unable to load ' + path);
    return response.json();
  });
  const readState = () => {
    try { return JSON.parse(localStorage.getItem(storageKey) || 'null'); }
    catch (_) { return null; }
  };

  window.pywebview = { api: {
    load_defaults: () => readJson('../config/defaults.json'),
    load_pricing_config: () => readJson('../config/pricing_catalog.json'),
    load_state: async () => readState(),
    save_state: async state => {
      localStorage.setItem(storageKey, JSON.stringify(state));
      return true;
    },
    reset_state: async () => {
      localStorage.removeItem(storageKey);
      return true;
    },
    fetch_pricing_models: async () => ({
      ok: true,
      models: [],
      count: 0,
      fromCache: true,
      fetchedAt: new Date().toISOString()
    })
  }};

  window.addEventListener('DOMContentLoaded', () => window.setTimeout(() => {
    window.dispatchEvent(new Event('pywebviewready'));
  }, 0));
})();
