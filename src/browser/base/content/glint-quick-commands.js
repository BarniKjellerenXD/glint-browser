/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Glint Quick Commands — Spotlight Search Overlay
 * Activated by Ctrl+E
 *
 * A spotlight-style command palette inspired by Vivaldi's Quick Commands
 * and VS Code's Command Palette. Searches across:
 *   - Open tabs
 *   - Bookmarks
 *   - History
 *   - Browser commands
 *   - Settings pages
 *   - Web search (via default search engine)
 */

var GlintQuickCommands = {
  _panel: null,
  _overlay: null,
  _input: null,
  _results: null,
  _initialized: false,

  // ── Initialization ──

  init() {
    if (this._initialized) return;
    this._initialized = true;

    // Create the spotlight overlay
    this._buildOverlay();

    // Register command handlers
    document.addEventListener("command", this);

    // Listen for the Ctrl+E keybinding
    // (The keyset in glint-keysets.inc.xhtml dispatches a command event)
  },

  _buildOverlay() {
    // Create overlay container
    this._overlay = document.createXULElement("html:div");
    this._overlay.id = "glint-spotlight-overlay";
    this._overlay.hidden = true;
    this._overlay.classList.add("glint-spotlight-overlay");

    // Backdrop click to close
    this._overlay.addEventListener("click", e => {
      if (e.target === this._overlay) {
        this.hide();
      }
    });

    // Escape to close
    this._overlay.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        this.hide();
      }
    });

    // Create panel
    this._panel = document.createXULElement("html:div");
    this._panel.id = "glint-spotlight-panel";
    this._panel.classList.add("glint-spotlight-panel", "glint-glass-panel");

    // Create the inner structure
    this._panel.innerHTML = `
      <div class="glint-spotlight-header">
        <svg class="glint-spotlight-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <input type="text" id="glint-spotlight-input" class="glint-spotlight-input"
               placeholder="Search tabs, bookmarks, history, commands…" spellcheck="false" autocomplete="off"/>
      </div>
      <div class="glint-spotlight-results" id="glint-spotlight-results">
        <div class="glint-spotlight-section">
          <div class="glint-spotlight-section-title">Quick Actions</div>
          <div class="glint-spotlight-command" data-action="new-tab">
            <span class="glint-spotlight-command-icon">+</span>
            <span class="glint-spotlight-command-label">New Tab</span>
            <span class="glint-spotlight-command-shortcut">Ctrl+T</span>
          </div>
          <div class="glint-spotlight-command" data-action="new-window">
            <span class="glint-spotlight-command-icon">□</span>
            <span class="glint-spotlight-command-label">New Window</span>
            <span class="glint-spotlight-command-shortcut">Ctrl+N</span>
          </div>
          <div class="glint-spotlight-command" data-action="private-window">
            <span class="glint-spotlight-command-icon">👁</span>
            <span class="glint-spotlight-command-label">New Private Window</span>
            <span class="glint-spotlight-command-shortcut">Ctrl+Shift+P</span>
          </div>
          <div class="glint-spotlight-command" data-action="bookmark-current">
            <span class="glint-spotlight-command-icon">★</span>
            <span class="glint-spotlight-command-label">Bookmark Current Page</span>
            <span class="glint-spotlight-command-shortcut">Ctrl+D</span>
          </div>
          <div class="glint-spotlight-command" data-action="clear-history">
            <span class="glint-spotlight-command-icon">🗑</span>
            <span class="glint-spotlight-command-label">Clear Recent History</span>
            <span class="glint-spotlight-command-shortcut">Ctrl+Shift+Del</span>
          </div>
          <div class="glint-spotlight-command" data-action="downloads">
            <span class="glint-spotlight-command-icon">↓</span>
            <span class="glint-spotlight-command-label">Downloads</span>
            <span class="glint-spotlight-command-shortcut">Ctrl+J</span>
          </div>
          <div class="glint-spotlight-command" data-action="settings">
            <span class="glint-spotlight-command-icon">⚙</span>
            <span class="glint-spotlight-command-label">Settings</span>
            <span class="glint-spotlight-command-shortcut">Ctrl+,</span>
          </div>
          <div class="glint-spotlight-command" data-action="extensions">
            <span class="glint-spotlight-command-icon">🧩</span>
            <span class="glint-spotlight-command-label">Manage Extensions</span>
            <span class="glint-spotlight-command-shortcut">Ctrl+Shift+A</span>
          </div>
          <div class="glint-spotlight-command" data-action="passwords">
            <span class="glint-spotlight-command-icon">🔑</span>
            <span class="glint-spotlight-command-label">Passwords</span>
          </div>
          <div class="glint-spotlight-command" data-action="about">
            <span class="glint-spotlight-command-icon">ℹ</span>
            <span class="glint-spotlight-command-label">About Glint</span>
          </div>
        </div>
      </div>
      <div class="glint-spotlight-footer">
        <span class="glint-spotlight-footer-hint">Type to search · <kbd>↑</kbd><kbd>↓</kbd> navigate · <kbd>↵</kbd> open · <kbd>Esc</kbd> close</span>
      </div>
    `;

    this._overlay.appendChild(this._panel);
    document.documentElement.appendChild(this._overlay);

    // Cache references
    this._input = document.getElementById("glint-spotlight-input");
    this._results = document.getElementById("glint-spotlight-results");

    // Bind input events
    this._input.addEventListener("input", () => this._onInput());
    this._input.addEventListener("keydown", e => this._onKeyDown(e));
    this._results.addEventListener("click", e => this._onResultClick(e));

    // Command click handlers via event delegation
    this._results.addEventListener("mousedown", e => {
      const cmd = e.target.closest(".glint-spotlight-command");
      if (cmd) {
        e.preventDefault();
        this._executeCommand(cmd.dataset.action, cmd.dataset.url || cmd.dataset.value);
      }
    });
  },

  // ── Show / Hide ──

  show() {
    if (!this._initialized) {
      this.init();
    }
    this._overlay.hidden = false;
    this._input.value = "";
    this._showQuickActions();

    // Focus input after a brief delay to let the panel render
    setTimeout(() => {
      this._input.focus();
      this._input.select();
    }, 50);
  },

  hide() {
    this._overlay.hidden = true;
    this._input.blur();
  },

  toggle() {
    if (this._overlay && !this._overlay.hidden) {
      this.hide();
    } else {
      this.show();
    }
  },

  // ── Input Handling ──

  _onInput() {
    const query = this._input.value.trim().toLowerCase();
    if (!query) {
      this._showQuickActions();
      return;
    }

    // Clear previous results and show loading
    this._results.innerHTML = "";
    this._searchTabs(query);
    this._searchBookmarks(query);
    this._searchHistory(query);
    this._searchCommands(query);

    // If no results, show web search option
    if (this._results.children.length === 0) {
      this._showWebSearch(query);
    }
  },

  _onKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      this._focusNextResult(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this._focusNextResult(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = this._results.querySelector(".glint-spotlight-command.selected");
      if (selected) {
        this._executeCommand(selected.dataset.action, selected.dataset.url || selected.dataset.value);
      } else {
        // First result
        const first = this._results.querySelector(".glint-spotlight-command");
        if (first) {
          this._executeCommand(first.dataset.action, first.dataset.url || first.dataset.value);
        }
      }
    }
  },

  _focusNextResult(direction) {
    const items = this._results.querySelectorAll(".glint-spotlight-command");
    if (!items.length) return;

    let idx = -1;
    for (let i = 0; i < items.length; i++) {
      if (items[i].classList.contains("selected")) {
        idx = i;
        items[i].classList.remove("selected");
        break;
      }
    }

    const next = Math.max(0, Math.min(items.length - 1, idx + direction));
    items[next].classList.add("selected");
    items[next].scrollIntoView({ block: "nearest" });
  },

  _onResultClick(e) {
    const cmd = e.target.closest(".glint-spotlight-command");
    if (cmd) {
      this._executeCommand(cmd.dataset.action, cmd.dataset.url || cmd.dataset.value);
    }
  },

  // ── Quick Actions (default view) ──

  _showQuickActions() {
    this._results.innerHTML = `
      <div class="glint-spotlight-section">
        <div class="glint-spotlight-section-title">Quick Actions</div>
        <div class="glint-spotlight-command" data-action="new-tab" tabindex="0">
          <span class="glint-spotlight-command-icon">+</span>
          <span class="glint-spotlight-command-label">New Tab</span>
          <span class="glint-spotlight-command-shortcut">Ctrl+T</span>
        </div>
        <div class="glint-spotlight-command" data-action="new-window" tabindex="0">
          <span class="glint-spotlight-command-icon">□</span>
          <span class="glint-spotlight-command-label">New Window</span>
          <span class="glint-spotlight-command-shortcut">Ctrl+N</span>
        </div>
        <div class="glint-spotlight-command" data-action="private-window" tabindex="0">
          <span class="glint-spotlight-command-icon">👁</span>
          <span class="glint-spotlight-command-label">New Private Window</span>
          <span class="glint-spotlight-command-shortcut">Ctrl+Shift+P</span>
        </div>
        <div class="glint-spotlight-command" data-action="bookmark-current" tabindex="0">
          <span class="glint-spotlight-command-icon">★</span>
          <span class="glint-spotlight-command-label">Bookmark Current Page</span>
          <span class="glint-spotlight-command-shortcut">Ctrl+D</span>
        </div>
        <div class="glint-spotlight-command" data-action="clear-history" tabindex="0">
          <span class="glint-spotlight-command-icon">🗑</span>
          <span class="glint-spotlight-command-label">Clear Recent History</span>
          <span class="glint-spotlight-command-shortcut">Ctrl+Shift+Del</span>
        </div>
        <div class="glint-spotlight-command" data-action="downloads" tabindex="0">
          <span class="glint-spotlight-command-icon">↓</span>
          <span class="glint-spotlight-command-label">Downloads</span>
          <span class="glint-spotlight-command-shortcut">Ctrl+J</span>
        </div>
        <div class="glint-spotlight-command" data-action="settings" tabindex="0">
          <span class="glint-spotlight-command-icon">⚙</span>
          <span class="glint-spotlight-command-label">Settings</span>
          <span class="glint-spotlight-command-shortcut">Ctrl+,</span>
        </div>
        <div class="glint-spotlight-command" data-action="extensions" tabindex="0">
          <span class="glint-spotlight-command-icon">🧩</span>
          <span class="glint-spotlight-command-label">Manage Extensions</span>
          <span class="glint-spotlight-command-shortcut">Ctrl+Shift+A</span>
        </div>
        <div class="glint-spotlight-command" data-action="passwords" tabindex="0">
          <span class="glint-spotlight-command-icon">🔑</span>
          <span class="glint-spotlight-command-label">Passwords</span>
        </div>
        <div class="glint-spotlight-command" data-action="about" tabindex="0">
          <span class="glint-spotlight-command-icon">ℹ</span>
          <span class="glint-spotlight-command-label">About Glint</span>
        </div>
      </div>
    `;
  },

  // ── Search Functions ──

  _searchTabs(query) {
    if (!gBrowser || !gBrowser.tabs) return;
    const matches = [];
    for (const tab of gBrowser.tabs) {
      const title = (tab.label || "").toLowerCase();
      const url = (tab.linkedBrowser?.currentURI?.spec || "").toLowerCase();
      if (title.includes(query) || url.includes(query)) {
        matches.push({ label: tab.label, url: tab.linkedBrowser?.currentURI?.spec, action: "switch-tab", tab });
      }
    }
    if (matches.length > 0) {
      this._addSection("Tabs", matches.slice(0, 5));
    }
  },

  _searchBookmarks(query) {
    try {
      PlacesUtils.bookmarks.search(query, { maxResults: 5 }).then(results => {
        if (!results?.length) return;
        // Check if overlay is still visible
        if (this._overlay?.hidden) return;
        const items = results.map(r => ({
          label: r.title || r.url.spec,
          url: r.url?.spec,
          action: "open-url",
        }));
        this._addSection("Bookmarks", items);
      });
    } catch (e) {
      // Bookmarks service not available yet
    }
  },

  _searchHistory(query) {
    try {
      PlacesUtils.history.fetchVisits(query, { maxResults: 5 }).then(results => {
        if (!results?.length) return;
        if (this._overlay?.hidden) return;
        const items = results.map(r => ({
          label: r.title || r.uri.spec,
          url: r.uri?.spec,
          action: "open-url",
        }));
        this._addSection("History", items.slice(0, 5));
      });
    } catch (e) {
      // History service not available
    }
  },

  _searchCommands(query) {
    const allCommands = [
      { label: "New Tab", action: "new-tab", keywords: "tab new open" },
      { label: "New Window", action: "new-window", keywords: "window new open" },
      { label: "New Private Window", action: "private-window", keywords: "private incognito window" },
      { label: "Close Tab", action: "close-tab", keywords: "close tab" },
      { label: "Reopen Closed Tab", action: "reopen-tab", keywords: "undo close tab reopen" },
      { label: "Bookmark This Page", action: "bookmark-current", keywords: "bookmark save" },
      { label: "Downloads", action: "downloads", keywords: "download file" },
      { label: "History", action: "show-history", keywords: "history" },
      { label: "Settings", action: "settings", keywords: "preferences settings options config" },
      { label: "Extensions", action: "extensions", keywords: "addons extensions plugins" },
      { label: "Clear Recent History", action: "clear-history", keywords: "clear delete history" },
      { label: "Zoom In", action: "zoom-in", keywords: "zoom in larger" },
      { label: "Zoom Out", action: "zoom-out", keywords: "zoom out smaller" },
      { label: "Reset Zoom", action: "zoom-reset", keywords: "zoom reset 100%" },
      { label: "Full Screen", action: "fullscreen", keywords: "full screen maximize" },
      { label: "Find in Page", action: "find", keywords: "find search page" },
      { label: "Print", action: "print", keywords: "print" },
      { label: "Screenshot", action: "screenshot", keywords: "screenshot capture" },
      { label: "Passwords", action: "passwords", keywords: "password login" },
      { label: "About Glint", action: "about", keywords: "about version info" },
      { label: "Mute/Unmute Tab", action: "mute-tab", keywords: "mute unmute sound audio" },
      { label: "Duplicate Tab", action: "duplicate-tab", keywords: "duplicate copy tab" },
      { label: "Pin Tab", action: "pin-tab", keywords: "pin tab" },
      { label: "Reload Page", action: "reload", keywords: "reload refresh" },
      { label: "Stop Loading", action: "stop", keywords: "stop cancel" },
    ];

    const matches = allCommands.filter(c => {
      const q = query.toLowerCase();
      return c.label.toLowerCase().includes(q) ||
             c.keywords.toLowerCase().includes(q) ||
             c.action.toLowerCase().includes(q);
    });

    if (matches.length > 0) {
      this._addSection("Commands", matches.slice(0, 8));
    }
  },

  _showWebSearch(query) {
    this._addSection("Search Web", [
      { label: `Search "${query}"`, url: query, action: "web-search" },
    ]);
  },

  // ── Results Rendering ──

  _addSection(title, items) {
    // Check if a section with this title already exists
    let section = this._results.querySelector(`.glint-spotlight-section[data-title="${title}"]`);
    if (!section) {
      section = document.createXULElement("html:div");
      section.classList.add("glint-spotlight-section");
      section.dataset.title = title;
      section.innerHTML = `<div class="glint-spotlight-section-title">${title}</div>`;
      this._results.appendChild(section);
    }

    for (const item of items) {
      const el = document.createXULElement("html:div");
      el.classList.add("glint-spotlight-command");
      el.dataset.action = item.action;
      el.dataset.url = item.url || "";
      el.dataset.value = item.url || item.label || "";
      el.tabIndex = 0;

      const icon = item.url ? (item.url.startsWith("https") ? "🔒" : "🌐") : "";
      const iconEl = item.url ? `<span class="glint-spotlight-command-icon">${icon}</span>` :
        `<span class="glint-spotlight-command-icon">${"→"}</span>`;

      el.innerHTML = `
        ${iconEl}
        <span class="glint-spotlight-command-label">${this._escapeHtml(item.label)}</span>
        ${item.url ? `<span class="glint-spotlight-command-url">${this._escapeHtml(item.url)}</span>` : ""}
      `;
      section.appendChild(el);
    }
  },

  // ── Command Execution ──

  _executeCommand(action, value) {
    this.hide();

    switch (action) {
      case "new-tab":
        BrowserOpenTab();
        break;
      case "new-window":
        OpenBrowserWindow();
        break;
      case "private-window":
        OpenBrowserWindow({ private: true });
        break;
      case "close-tab":
        BrowserCloseTabOrWindow();
        break;
      case "reopen-tab":
        undoCloseTab();
        break;
      case "bookmark-current":
        BookmarkCurrentPageInDialog();
        break;
      case "downloads":
        BrowserDownloadsUI();
        break;
      case "show-history":
        PlacesCommandHook.showPlacesOrganizer("History");
        break;
      case "settings":
        openPreferences();
        break;
      case "extensions":
        BrowserOpenAddonsMgr();
        break;
      case "clear-history":
        Sanitizer.showUI(window);
        break;
      case "zoom-in":
        FullZoom.enlarge();
        break;
      case "zoom-out":
        FullZoom.reduce();
        break;
      case "zoom-reset":
        FullZoom.reset();
        break;
      case "fullscreen":
        BrowserFullScreen();
        break;
      case "find":
        gLazyFindCommand("cmd_find");
        break;
      case "print":
        PrintUtils.print(window);
        break;
      case "screenshot":
        ScreenshotsUtils?.openUI(window);
        break;
      case "passwords":
        window.openTrustedLinkIn("about:logins", "tab");
        break;
      case "about":
        window.openTrustedLinkIn("about:glint", "tab");
        break;
      case "mute-tab":
        if (gBrowser?.selectedTab) {
          gBrowser.selectedTab.toggleMuteAudio();
        }
        break;
      case "duplicate-tab":
        duplicateTabIn(gBrowser?.selectedTab);
        break;
      case "pin-tab":
        if (gBrowser?.selectedTab) {
          gBrowser.pinTab(gBrowser.selectedTab);
        }
        break;
      case "reload":
        BrowserReload();
        break;
      case "stop":
        BrowserStop();
        break;
      case "switch-tab":
        if (value && gBrowser) {
          const tab = gBrowser.tabs.find(t => t.linkedBrowser?.currentURI?.spec === value);
          if (tab) gBrowser.selectedTab = tab;
        }
        break;
      case "open-url":
      case "web-search":
        if (value) {
          if (action === "web-search") {
            // Use default search engine
            let submission = Services.search.defaultEngine.getSubmission(value, null, "glint-spotlight");
            openTrustedLinkIn(submission.uri.spec, "current");
          } else {
            openTrustedLinkIn(value, "current");
          }
        }
        break;
    }
  },

  // ── Helpers ──

  _escapeHtml(str) {
    if (!str) return "";
    const div = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
    div.textContent = str;
    return div.innerHTML;
  },
};

// ---- Register command handler ----
// The Ctrl+E keyset dispatches command events which we catch here.
document.addEventListener("command", function glintCommandHandler(e) {
  if (!GlintQuickCommands._initialized) {
    GlintQuickCommands.init();
  }

  switch (e.target.id) {
    case "cmd_glintQuickCommands":
      e.preventDefault();
      GlintQuickCommands.toggle();
      break;
    case "cmd_glintToggleSidebar":
      e.preventDefault();
      if (typeof SidebarUI?.toggle === "function") {
        SidebarUI.toggle();
      }
      break;
  }
});

// Auto-initialize when the window loads
if (document.readyState === "complete" || document.readyState === "interactive") {
  GlintQuickCommands.init();
} else {
  document.addEventListener("DOMContentLoaded", () => GlintQuickCommands.init(), { once: true });
}
