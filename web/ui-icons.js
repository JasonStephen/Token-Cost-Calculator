// UI icon set for Token Cost Calc.
// Hand-drawn, sketch-style stroke icons (2px round-cap strokes on a 24x24 grid)
// matching the app's notebook aesthetic: thick outlines, no fills, currentColor.
// Inline SVG keeps everything offline-friendly (pywebview) and theme-aware.
(() => {
  const ICONS = {
    'menu': '<path d="M4 7h16M4 12h16M4 17h16"/>',
    'home': '<path d="M4 11.2 12 4l8 7.2"/><path d="M6.2 9.8V20h4v-5.2h3.6V20h4V9.8"/>',
    'sliders': '<path d="M4 8.4h9.4"/><path d="M17.4 8.4H20"/><path d="M4 15.6h3.4"/><path d="M11.4 15.6H20"/><circle cx="15.4" cy="8.4" r="2.1"/><circle cx="9.4" cy="15.6" r="2.1"/>',
    'compare': '<path d="M4.5 5.5h6v13h-6z"/><path d="M13.5 5.5h6v13h-6z"/><path d="M6.2 9h1.6M6.2 12h1.6M16.2 9h1.6M16.2 12h1.6"/>',
    'exchange': '<path d="M4 8h13"/><path d="M13.5 4.5 17 8l-3.5 3.5"/><path d="M20 16H7"/><path d="M10.5 12.5 7 16l3.5 3.5"/>',
    'wallet': '<path d="M4 7.5h13.5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M4 7.5V6.2a2 2 0 0 1 2-2h8.5"/><circle cx="16.2" cy="13.5" r="1.2" fill="currentColor" stroke="none"/>',
    'gear': '<circle cx="12" cy="12" r="3.1"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.2 5.2l1.9 1.9M16.9 16.9l1.9 1.9M18.8 5.2l-1.9 1.9M7.1 16.9l-1.9 1.9"/>',
    'question': '<path d="M9.2 8.7a2.9 2.9 0 1 1 4.1 2.7c-.9.5-1.3 1-1.3 1.9v.5"/><path d="M12 17.2h.01"/>',
    'star': '<path d="m12 3.8 2.5 5.2 5.7.8-4.2 4 1 5.7-5-2.7-5 2.7 1-5.7-4.2-4 5.7-.8z"/>',
    'plus': '<path d="M12 5v14M5 12h14"/>',
    'x': '<path d="M6 6l12 12M18 6 6 18"/>',
    'trash': '<path d="M4.5 7h15"/><path d="M9.5 7V5.2a.8.8 0 0 1 .8-.7h3.4a.8.8 0 0 1 .8.7V7"/><path d="M6.8 7l.7 12.2a2 2 0 0 0 2 1.8h5a2 2 0 0 0 2-1.8L17.2 7"/><path d="M10.2 11v6M13.8 11v6"/>',
    'pencil': '<path d="M5 19l1-3.3L15.7 6a2 2 0 0 1 2.8 0h0l.5.5a2 2 0 0 1 0 2.8h0L9.3 18.6z"/><path d="M14.5 7.2l2.3 2.3"/>',
    'grip': '<circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none"/>',
    'refresh': '<path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 3.5V8h-4.5"/>',
    'search': '<circle cx="11" cy="11" r="6.2"/><path d="m16 16 4.2 4.2"/>',
    'arrow-left': '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
    'arrow-right': '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    'arrow-up': '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
    'arrow-down': '<path d="M12 5v14"/><path d="m6 13 6 6 6-6"/>',
    'check': '<path d="m4.5 12.5 5 5L19.5 7"/>',
    'info': '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.5"/><path d="M12 7.4h.01"/>',
    'chevron-down': '<path d="m6 9.5 6 6 6-6"/>'
  };

  function uiIcon(name, cls) {
    const body = ICONS[name];
    if (!body) return '';
    return '<svg class="ui-icon' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + body + '</svg>';
  }

  // Fill static placeholders: any element carrying data-icon="name" receives the
  // SVG as its content. Used by index.html so markup stays readable.
  function applyUiIcons(root) {
    (root || document).querySelectorAll('[data-icon]').forEach(el => {
      if (el.dataset.iconFilled === 'true') return;
      const svg = uiIcon(el.dataset.icon);
      if (!svg) return;
      el.dataset.iconFilled = 'true';
      el.classList.add('ui-icon-slot');
      el.innerHTML = svg;
    });
  }

  window.uiIcon = uiIcon;
  window.applyUiIcons = applyUiIcons;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyUiIcons());
  } else {
    applyUiIcons();
  }
})();
