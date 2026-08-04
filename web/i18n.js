(() => {
  const translations = window.localeData || {};
  const fallbackLocale = 'zh-CN';
  const supportedLocales = Object.keys(translations);
  let locale = fallbackLocale;

  function normalizeLocale(value) {
    return supportedLocales.includes(value) ? value : fallbackLocale;
  }

  function t(key, values = {}) {
    const message = translations[locale]?.[key] ?? translations[fallbackLocale]?.[key] ?? key;
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
    root.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
      element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
    });
  }

  window.i18n = { normalizeLocale, setLocale, t, translateDocument };
})();
