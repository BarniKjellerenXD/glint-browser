const GlintSettings = {
  init() {
    this._applyAll();
    this._watchPrefs();
  },

  _applyAll() {
    this.applyTheme({
      blur: Services.prefs.getIntPref('glint.theme.glass.blur', 18),
      opacity: Services.prefs.getIntPref('glint.theme.glass.opacity', 70),
      accent: Services.prefs.getStringPref('glint.theme.accent', 'purple-blue'),
      wallpaper: Services.prefs.getStringPref('glint.theme.wallpaper', 'aurora'),
    });
  },

  applyTheme(config) {
    const root = document.documentElement;
    root.style.setProperty('--glass-blur-medium', config.blur + 'px');
    root.style.setProperty('--glass-bg-default', `rgba(10, 10, 20, ${config.opacity / 100})`);
    this._applyAccent(config.accent);
    this._applyWallpaper(config.wallpaper);
  },

  _applyAccent(type) {
    const gradients = {
      'purple-blue': 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      'green': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'pink': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'blue': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'orange': 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
      'teal': 'linear-gradient(135deg, #0fdce8 0%, #71dfb0 100%)',
    };
    const root = document.documentElement;
    root.style.setProperty('--accent-gradient', gradients[type] || gradients['purple-blue']);
  },

  _applyWallpaper(type) {
    const gradients = {
      'aurora': 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
      'sunset': 'linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb)',
      'ocean': 'linear-gradient(135deg, #0c0c1e, #1a1a4e, #0d47a1)',
      'forest': 'linear-gradient(135deg, #0d1b0e, #1a3a2a, #2d5a3e)',
      'midnight': 'linear-gradient(135deg, #0a0a0a, #1a1a2e, #16213e)',
    };
    const root = document.documentElement;
    root.style.setProperty('--wallpaper-gradient', gradients[type] || gradients['aurora']);
  },

  applyLayoutProfile(profile) {
    const root = document.documentElement;
    root.removeAttribute('glint-layout');
    if (profile !== 'classic') {
      root.setAttribute('glint-layout', profile);
    }
  },

  toggleCompactMode() {
    const root = document.documentElement;
    root.toggleAttribute('glint-compact');
  },

  resetToDefaults() {
    const defaults = Services.prefs.getDefaultBranch('');
    Services.prefs.clearUserPref('glint.theme.glass.blur');
    Services.prefs.clearUserPref('glint.theme.glass.opacity');
    Services.prefs.clearUserPref('glint.theme.accent');
    Services.prefs.clearUserPref('glint.theme.wallpaper');
    Services.prefs.clearUserPref('glint.theme.compactMode');
    this._applyAll();
  },

  _watchPrefs() {
    Services.prefs.addObserver('glint.theme', this._applyAll.bind(this));
  },
};
