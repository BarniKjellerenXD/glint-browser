"use strict";

/* ==========================================================================
 * QuickCommands — Glint Browser Spotlight (Ctrl+E)
 *
 * A full-featured command palette inspired by VS Code, Spotlight, and
 * Firefox's address bar. Searches tabs, bookmarks, history, settings
 * pages, browser commands, and delegates to DuckDuckGo as a web fallback.
 * ========================================================================== */

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { PlacesUtils } = ChromeUtils.import("resource://gre/modules/PlacesUtils.jsm");
var { PrivateBrowsingUtils } = ChromeUtils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEBOUNCE_DELAY_MS = 150;
const MAX_RESULTS = 50;
const SECTION_LABELS = {
  tab:       "Open Tabs",
  bookmark:  "Bookmarks",
  history:   "History",
  command:   "Commands",
  settings:  "Settings",
  web:       "Search Web",
};

const ICONS = {
  tab:       "chrome://browser/skin/tab.svg",
  bookmark:  "chrome://browser/skin/bookmark.svg",
  history:   "chrome://browser/skin/history.svg",
  command:   "chrome://browser/skin/command.svg",
  settings:  "chrome://browser/skin/settings.svg",
  web:       "chrome://global/skin/icons/search-glass.svg",
};

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function fuzzyScore(query, text) {
  /* Simple greedy subsequence match. Returns a score 0..1 or -1 if no match. */
  if (!query || !text) return -1;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  if (qi < q.length) return -1;
  /* Prefer matches that start at the beginning of words. */
  let score = 0.5;
  const idx = t.indexOf(q);
  if (idx === 0) score += 0.4;
  else if (t[idx - 1] === ' ') score += 0.2;
  return score;
}

// ---------------------------------------------------------------------------
// Providers (each must implement: label, icon, async search(query) => Result[])
// ---------------------------------------------------------------------------

/* ---------- Tab Search ---------- */
class TabSearchProvider {
  get label() { return SECTION_LABELS.tab; }
  get icon()  { return ICONS.tab; }

  async search(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();
    const windows = Services.wm.getEnumerator("navigator:browser");
    while (windows.hasMoreElements()) {
      const win = windows.getNext();
      for (const tab of win.gBrowser.tabs) {
        const title = tab.label;
        const url = tab.linkedBrowser.currentURI.spec;
        if (title.toLowerCase().includes(lowerQuery) || url.toLowerCase().includes(lowerQuery)) {
          results.push({
            title,
            subtitle: url,
            icon: tab.linkedBrowser.mIconURL || ICONS.tab,
            action: "switchTab",
            actionData: { win, tab },
            section: "tab",
            score: fuzzyScore(query, title),
          });
        }
      }
    }
    return results;
  }
}

/* ---------- Bookmark Search ---------- */
class BookmarkSearchProvider {
  get label() { return SECTION_LABELS.bookmark; }
  get icon()  { return ICONS.bookmark; }

  async search(query) {
    const lowerQuery = query.toLowerCase();
    const results = [];
    await PlacesUtils.bookmarks.fetch(
      { query },
      bookmark => {
        const title = bookmark.title || bookmark.uri.spec;
        const url = bookmark.uri.spec;
        if (title.toLowerCase().includes(lowerQuery) || url.toLowerCase().includes(lowerQuery)) {
          results.push({
            title: bookmark.title || url,
            subtitle: url,
            icon: ICONS.bookmark,
            action: "openURL",
            actionData: { url },
            section: "bookmark",
            score: fuzzyScore(query, title),
          });
        }
      }
    );
    return results;
  }
}

/* ---------- History Search ---------- */
class HistorySearchProvider {
  get label() { return SECTION_LABELS.history; }
  get icon()  { return ICONS.history; }

  async search(query) {
    const lowerQuery = query.toLowerCase();
    const results = [];
    const options = PlacesUtils.history.getNewQueryOptions();
    options.maxResults = 50;
    options.sortingMode = options.SORT_BY_FRECENCY_DESCENDING;
    const historyQuery = PlacesUtils.history.getNewQuery();
    historyQuery.searchTerms = query;
    const queryResult = await PlacesUtils.history.executeQuery(historyQuery, options);
    const root = queryResult.root;
    root.containerOpen = true;
    for (let i = 0; i < root.childCount; i++) {
      const node = root.getChild(i);
      const title = node.title || node.uri;
      const url = node.uri;
      if (title.toLowerCase().includes(lowerQuery) || url.toLowerCase().includes(lowerQuery)) {
        results.push({
          title,
          subtitle: url,
          icon: "chrome://browser/skin/history.svg",
          action: "openURL",
          actionData: { url },
          section: "history",
          score: fuzzyScore(query, title),
        });
      }
    }
    root.containerOpen = false;
    return results;
  }
}

/* ---------- Command Search ---------- */
class CommandSearchProvider {
  get label() { return SECTION_LABELS.command; }
  get icon()  { return ICONS.command; }

  constructor() {
    this.commands = [
      { id: "new-tab",          title: "New Tab",               shortcut: "Ctrl+T",       action: "command", actionData: "BrowserCommands.openTab" },
      { id: "new-window",       title: "New Window",            shortcut: "Ctrl+N",       action: "command", actionData: "BrowserCommands.openWindow" },
      { id: "new-private",      title: "New Private Window",    shortcut: "Ctrl+Shift+P", action: "command", actionData: "BrowserCommands.openPrivateWindow" },
      { id: "close-tab",        title: "Close Tab",             shortcut: "Ctrl+W",       action: "command", actionData: "BrowserCommands.closeTab" },
      { id: "reopen-tab",       title: "Reopen Closed Tab",     shortcut: "Ctrl+Shift+T", action: "command", actionData: "BrowserCommands.reopenClosedTab" },
      { id: "switch-profile",   title: "Switch Profile",        shortcut: "",             action: "command", actionData: "BrowserCommands.switchProfile" },
      { id: "mute-tab",         title: "Mute / Unmute Tab",     shortcut: "Ctrl+M",       action: "command", actionData: "BrowserCommands.toggleMuteTab" },
      { id: "pin-tab",          title: "Pin / Unpin Tab",       shortcut: "",             action: "command", actionData: "BrowserCommands.togglePinTab" },
      { id: "bookmark-page",    title: "Bookmark This Page",    shortcut: "Ctrl+D",       action: "command", actionData: "BrowserCommands.bookmarkPage" },
      { id: "screenshot",       title: "Take Screenshot",       shortcut: "Ctrl+Shift+S", action: "command", actionData: "BrowserCommands.screenshot" },
      { id: "zoom-in",          title: "Zoom In",               shortcut: "Ctrl++",       action: "command", actionData: "BrowserCommands.zoomIn" },
      { id: "zoom-out",         title: "Zoom Out",              shortcut: "Ctrl+-",       action: "command", actionData: "BrowserCommands.zoomOut" },
      { id: "zoom-reset",       title: "Reset Zoom",            shortcut: "Ctrl+0",       action: "command", actionData: "BrowserCommands.zoomReset" },
      { id: "devtools",         title: "Toggle Developer Tools", shortcut: "F12",         action: "command", actionData: "BrowserCommands.toggleDevTools" },
      { id: "clear-history",    title: "Clear Recent History",  shortcut: "Ctrl+Shift+Del", action: "command", actionData: "BrowserCommands.clearHistory" },
      { id: "reload",           title: "Reload Page",           shortcut: "Ctrl+R",       action: "command", actionData: "BrowserCommands.reload" },
      { id: "hard-reload",      title: "Hard Reload (Cache)",   shortcut: "Ctrl+Shift+R", action: "command", actionData: "BrowserCommands.hardReload" },
      { id: "find-in-page",     title: "Find in Page",          shortcut: "Ctrl+F",       action: "command", actionData: "BrowserCommands.findInPage" },
      { id: "print",            title: "Print…",                shortcut: "Ctrl+P",       action: "command", actionData: "BrowserCommands.print" },
      { id: "save-page",        title: "Save Page As…",         shortcut: "Ctrl+S",       action: "command", actionData: "BrowserCommands.savePage" },
      { id: "fullscreen",       title: "Full Screen",           shortcut: "F11",          action: "command", actionData: "BrowserCommands.fullScreen" },
      { id: "downloads",        title: "Downloads",             shortcut: "Ctrl+J",       action: "command", actionData: "BrowserCommands.showDownloads" },
      { id: "extensions",       title: "Extensions & Themes",   shortcut: "Ctrl+Shift+A", action: "command", actionData: "BrowserCommands.showExtensions" },
      { id: "settings",         title: "Settings",              shortcut: "",             action: "command", actionData: "BrowserCommands.openSettings" },
    ];

    for (const cmd of this.commands) {
      cmd._searchText = `${cmd.title} ${cmd.shortcut}`;
    }
  }

  async search(query) {
    const lowerQuery = query.toLowerCase();
    const results = [];
    for (const cmd of this.commands) {
      const score = fuzzyScore(query, cmd._searchText);
      if (score >= 0) {
        results.push({
          title: cmd.title,
          subtitle: cmd.shortcut ? `Shortcut: ${cmd.shortcut}` : "",
          icon: ICONS.command,
          action: cmd.action,
          actionData: cmd.actionData,
          section: "command",
          score,
        });
      }
    }
    return results;
  }
}

/* ---------- Settings Search ---------- */
class SettingsSearchProvider {
  get label() { return SECTION_LABELS.settings; }
  get icon()  { return ICONS.settings; }

  constructor() {
    this.pages = [
      { title: "General",              id: "paneGeneral",         category: "general" },
      { title: "Home",                 id: "paneHome",           category: "home" },
      { title: "Search",               id: "paneSearch",         category: "search" },
      { title: "Privacy & Security",   id: "panePrivacy",        category: "privacy" },
      { title: "Sync",                 id: "paneSync",           category: "sync" },
      { title: "Notifications",        id: "paneNotifications",  category: "notifications" },
      { title: "Experimental",         id: "paneExperimental",   category: "experimental" },
      { title: "Profiles",             id: "paneProfiles",       category: "profiles" },
      { title: "Extensions",           id: "paneAddons",         category: "addons" },
      { title: "Accessibility",        id: "paneAccessibility",  category: "accessibility" },
    ];
  }

  async search(query) {
    const lowerQuery = query.toLowerCase();
    const results = [];
    for (const page of this.pages) {
      const score = fuzzyScore(query, page.title);
      if (score >= 0) {
        results.push({
          title: `${page.title} Settings`,
          subtitle: "about:preferences#" + page.id,
          icon: ICONS.settings,
          action: "openPreferences",
          actionData: { paneID: page.id },
          section: "settings",
          score: score + 0.05, /* slight boost */
        });
      }
    }
    return results;
  }
}

/* ---------- Web Search (fallback) ---------- */
class WebSearchProvider {
  get label() { return SECTION_LABELS.web; }
  get icon()  { return ICONS.web; }

  async search(query) {
    if (!query || !query.trim()) return [];
    const q = query.trim();
    const url = `https://duckduckgo.com/?q=${encodeURIComponent(q)}`;
    return [
      {
        title: `Search "${q}"`,
        subtitle: "DuckDuckGo",
        icon: ICONS.web,
        action: "openURL",
        actionData: { url },
        section: "web",
        score: 0.01, /* lowest priority */
      },
    ];
  }
}

// ---------------------------------------------------------------------------
// Main QuickCommands Controller
// ---------------------------------------------------------------------------

var QuickCommands = {
  _initialized: false,
  _visible: false,
  _inputEl: null,
  _listEl: null,
  _emptyEl: null,
  _panel: null,
  _backdrop: null,
  _providers: [],
  _currentResults: [],
  _selectedIndex: -1,
  _debounceTimer: null,

  // .........................................................................
  // Lifecycle
  // .........................................................................

  init() {
    if (this._initialized) return;
    this._initialized = true;

    this._panel = document.getElementById("quickCommandsPanel");
    this._backdrop = document.getElementById("quickCommandsBackdrop");
    this._inputEl = document.getElementById("quickCommandsInput");
    this._listEl = document.getElementById("quickCommandsResultList");
    this._emptyEl = document.getElementById("quickCommandsEmptyState");
    const clearBtn = document.getElementById("quickCommandsClearBtn");

    /* Register providers */
    this._providers = [
      new TabSearchProvider(),
      new BookmarkSearchProvider(),
      new HistorySearchProvider(),
      new CommandSearchProvider(),
      new SettingsSearchProvider(),
      new WebSearchProvider(),
    ];

    /* ---- Event listeners ---- */
    this._inputEl.addEventListener("input", () => this._onInput());
    this._inputEl.addEventListener("keydown", (e) => this._onKeyDown(e));
    this._inputEl.addEventListener("focus", () => this._onFocus());

    clearBtn?.addEventListener("click", () => {
      this._inputEl.value = "";
      this._clearResults();
      this._inputEl.focus();
    });

    /* Close on backdrop click */
    this._backdrop?.addEventListener("click", (e) => {
      if (e.target === this._backdrop) this.toggle();
    });

    /* Close on Escape at panel level */
    this._panel.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._visible) {
        this.toggle();
      }
    });

    /* Handle list item clicks via delegation */
    this._listEl.addEventListener("click", (e) => {
      const item = e.target.closest(".quick-command-item");
      if (item && item.dataset.index !== undefined) {
        this._execute(parseInt(item.dataset.index, 10));
      }
    });

    /* Handle list item mouseenter for selection */
    this._listEl.addEventListener("mouseenter", (e) => {
      const item = e.target.closest(".quick-command-item");
      if (item && item.dataset.index !== undefined) {
        this._setSelected(parseInt(item.dataset.index, 10));
      }
    }, true);
  },

  // .........................................................................
  // Toggle visibility
  // .........................................................................

  toggle() {
    this._visible = !this._visible;
    this._panel.hidden = !this._visible;
    if (this._visible) {
      this._inputEl.value = "";
      this._clearResults();
      this._panel.openPopup(null, "overlap", 0, 0);
      this._inputEl.focus();
    } else {
      this._panel.hidePopup();
      this._clearDebounce();
    }
  },

  // .........................................................................
  // Input handler with debounce
  // .........................................................................

  _onInput() {
    this._clearDebounce();
    this._debounceTimer = setTimeout(() => this._doSearch(), DEBOUNCE_DELAY_MS);
  },

  _onFocus() {
    /* Re-run empty search to show default state (or last results) */
    if (!this._inputEl.value) {
      this._clearResults();
    }
  },

  _clearDebounce() {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
  },

  _clearResults() {
    this._currentResults = [];
    this._selectedIndex = -1;
    this._listEl.innerHTML = "";
    this._emptyEl.hidden = false;
  },

  // .........................................................................
  // Search execution — runs all providers concurrently
  // .........................................................................

  async _doSearch() {
    const query = this._inputEl.value.trim();
    if (!query) {
      this._clearResults();
      return;
    }

    /* Gather results from all providers in parallel */
    const providerPromises = this._providers.map(p =>
      p.search(query).catch(err => {
        console.warn(`QuickCommands: ${p.constructor.name} error:`, err);
        return [];
      })
    );

    const resultsByProvider = await Promise.all(providerPromises);

    /* Flatten, dedupe by URL action, sort by score descending */
    const seen = new Set();
    let allResults = [];
    for (let i = 0; i < resultsByProvider.length; i++) {
      for (const r of resultsByProvider[i]) {
        const key = r.actionData?.url || r.title;
        if (seen.has(key)) continue;
        seen.add(key);
        allResults.push(r);
      }
    }

    allResults.sort((a, b) => (b.score || 0) - (a.score || 0));
    allResults = allResults.slice(0, MAX_RESULTS);

    this._currentResults = allResults;
    this._selectedIndex = -1;
    this._render(allResults);
  },

  // .........................................................................
  // Render — groups results into sections
  // .........................................................................

  _render(results) {
    this._listEl.innerHTML = "";
    this._emptyEl.hidden = results.length > 0;

    if (!results.length) return;

    const sections = new Map();
    for (const r of results) {
      const section = r.section || "other";
      if (!sections.has(section)) sections.set(section, []);
      sections.get(section).push(r);
    }

    let globalIndex = 0;

    for (const [sectionKey, items] of sections) {
      /* Section header */
      const header = document.createElement("div");
      header.className = "quick-commands-section-header";
      header.textContent = SECTION_LABELS[sectionKey] || sectionKey;
      this._listEl.appendChild(header);

      /* Items */
      for (const item of items) {
        const row = document.createElement("div");
        row.className = "quick-command-item";
        row.dataset.index = globalIndex;

        row.innerHTML = `
          <span class="item-icon" style="background-image: url('${this._escapeAttr(item.icon || ICONS.command)}')"></span>
          <span class="item-content">
            <span class="item-title">${this._escapeHtml(this._highlight(item.title))}</span>
            <span class="item-subtitle">${item.subtitle ? this._escapeHtml(item.subtitle) : ""}</span>
          </span>
          <span class="item-meta"></span>
        `;

        row.setAttribute("role", "option");
        row.setAttribute("aria-selected", "false");
        row.id = `quick-cmd-item-${globalIndex}`;

        this._listEl.appendChild(row);
        globalIndex++;
      }
    }
  },

  // .........................................................................
  // Keyboard navigation (↑ ↓ Enter Esc)
  // .........................................................................

  _onKeyDown(e) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        this._setSelected(Math.min(this._selectedIndex + 1, this._currentResults.length - 1));
        break;

      case "ArrowUp":
        e.preventDefault();
        this._setSelected(Math.max(this._selectedIndex - 1, 0));
        break;

      case "Enter":
        e.preventDefault();
        if (this._selectedIndex >= 0 && this._selectedIndex < this._currentResults.length) {
          this._execute(this._selectedIndex);
        } else if (this._currentResults.length > 0) {
          /* Fall back to first result */
          this._execute(0);
        }
        break;

      case "Escape":
        e.preventDefault();
        this.toggle();
        break;

      case "Tab":
        /* Tab to web-search fallback */
        e.preventDefault();
        const query = this._inputEl.value.trim();
        if (query) {
          const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
          const win = Services.wm.getMostRecentWindow("navigator:browser");
          if (win) {
            win.openLinkIn(url, "tab", { triggeringPrincipal: win.document.nodePrincipal });
          }
          this.toggle();
        }
        break;
    }
  },

  _setSelected(index) {
    /* unselect previous */
    if (this._selectedIndex >= 0) {
      const prev = document.getElementById(`quick-cmd-item-${this._selectedIndex}`);
      if (prev) {
        prev.classList.remove("selected");
        prev.setAttribute("aria-selected", "false");
      }
    }

    this._selectedIndex = index;

    /* select current */
    if (index >= 0) {
      const curr = document.getElementById(`quick-cmd-item-${index}`);
      if (curr) {
        curr.classList.add("selected");
        curr.setAttribute("aria-selected", "true");
        curr.scrollIntoView({ block: "nearest" });
      }
    }
  },

  // .........................................................................
  // Execute action
  // .........................................................................

  _execute(index) {
    const result = this._currentResults[index];
    if (!result) return;

    const win = Services.wm.getMostRecentWindow("navigator:browser");
    if (!win) return;

    switch (result.action) {
      case "switchTab": {
        const { tab, win: tabWin } = result.actionData;
        tabWin.focus();
        tabWin.gBrowser.selectedTab = tab;
        break;
      }

      case "openURL": {
        const { url } = result.actionData;
        win.openLinkIn(url, "tab", { triggeringPrincipal: win.document.nodePrincipal });
        break;
      }

      case "command": {
        this._dispatchCommand(result.actionData, win);
        break;
      }

      case "openPreferences": {
        const { paneID } = result.actionData;
        win.openPreferences(paneID);
        break;
      }

      default:
        console.warn("QuickCommands: unknown action", result.action);
    }

    this.toggle(); /* close palette after execution */
  },

  _dispatchCommand(cmdString, win) {
    /* Map command strings to real browser calls */
    const cmdMap = {
      "BrowserCommands.openTab":          () => win.BrowserCommands.openTab(),
      "BrowserCommands.openWindow":       () => win.BrowserCommands.openWindow(),
      "BrowserCommands.openPrivateWindow": () => win.BrowserCommands.openPrivateWindow(),
      "BrowserCommands.closeTab":         () => win.BrowserCommands.closeTab(),
      "BrowserCommands.reopenClosedTab":  () => win.BrowserCommands.reopenClosedTab(),
      "BrowserCommands.switchProfile":    () => win.BrowserCommands.switchProfile(),
      "BrowserCommands.toggleMuteTab":    () => win.BrowserCommands.toggleMuteTab(),
      "BrowserCommands.togglePinTab":     () => win.BrowserCommands.togglePinTab(),
      "BrowserCommands.bookmarkPage":     () => win.BrowserCommands.bookmarkPage(),
      "BrowserCommands.screenshot":       () => win.BrowserCommands.screenshot(),
      "BrowserCommands.zoomIn":           () => win.BrowserCommands.zoomIn(),
      "BrowserCommands.zoomOut":          () => win.BrowserCommands.zoomOut(),
      "BrowserCommands.zoomReset":        () => win.BrowserCommands.zoomReset(),
      "BrowserCommands.toggleDevTools":   () => win.BrowserCommands.toggleDevTools(),
      "BrowserCommands.clearHistory":     () => win.BrowserCommands.clearHistory(),
      "BrowserCommands.reload":           () => win.BrowserCommands.reload(),
      "BrowserCommands.hardReload":       () => win.BrowserCommands.hardReload(),
      "BrowserCommands.findInPage":       () => win.BrowserCommands.findInPage(),
      "BrowserCommands.print":            () => win.BrowserCommands.print(),
      "BrowserCommands.savePage":         () => win.BrowserCommands.savePage(),
      "BrowserCommands.fullScreen":       () => win.BrowserCommands.fullScreen(),
      "BrowserCommands.showDownloads":    () => win.BrowserCommands.showDownloads(),
      "BrowserCommands.showExtensions":   () => win.BrowserCommands.showExtensions(),
      "BrowserCommands.openSettings":     () => win.BrowserCommands.openSettings(),
    };

    const fn = cmdMap[cmdString];
    if (fn) fn();
    else console.warn("QuickCommands: unknown cmd", cmdString);
  },

  // .........................................................................
  // Highlight helpers
  // .........................................................................

  _highlight(text) {
    /* Marks matched substring — called after escaping, so we inject manually */
    const query = this._inputEl.value.trim().toLowerCase();
    if (!query || !text) return text;
    const lower = text.toLowerCase();
    const idx = lower.indexOf(query);
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + query.length);
    const after = text.slice(idx + query.length);
    return `${before}<mark class="quick-cmd-highlight">${this._escapeHtml(match)}</mark>${this._escapeHtml(after)}`;
  },

  _escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  },

  _escapeAttr(str) {
    if (!str) return "";
    return str.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  },
};
