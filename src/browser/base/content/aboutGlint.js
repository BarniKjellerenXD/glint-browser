"use strict";

/* ==========================================================================
 * about:glint — New Tab Page
 *
 * A modern new-tab replacement with time-based greeting, integrated search
 * bar, and quick-dial tiles populated from Places frecency data.
 * ========================================================================== */

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { PlacesUtils } = ChromeUtils.import("resource://gre/modules/PlacesUtils.jsm");
var { PrivateBrowsingUtils } = ChromeUtils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GREETINGS = {
  morning:   ["Good morning",      "Rise and shine",      "Morning"],
  afternoon: ["Good afternoon",    "Hope you're having a great day"],
  evening:   ["Good evening",      "Hey there"],
  night:     ["Good night",        "Late night browsing?", "Still awake?"],
};

const MAX_TILES = 12;
const FAVICON_SIZE = 32;

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

let greetingEl, searchInput, dialGrid;

// ---------------------------------------------------------------------------
// Initialisation — runs on DOMContentLoaded
// ---------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
  greetingEl   = document.getElementById("glintTimeGreeting");
  searchInput  = document.getElementById("glintSearchInput");
  dialGrid     = document.getElementById("glintDialGrid");

  if (!greetingEl || !searchInput || !dialGrid) {
    console.warn("about:glint — required DOM elements missing.");
    return;
  }

  setGreeting();
  setupSearch(searchInput);
  await populateTopSites(dialGrid);
});

// ---------------------------------------------------------------------------
// Time-based greeting
// ---------------------------------------------------------------------------

function setGreeting() {
  const hour = new Date().getHours();
  let pool;

  if (hour >= 5  && hour < 12)  pool = GREETINGS.morning;
  else if (hour >= 12 && hour < 17) pool = GREETINGS.afternoon;
  else if (hour >= 17 && hour < 22) pool = GREETINGS.evening;
  else                              pool = GREETINGS.night;

  const text = pool[Math.floor(Math.random() * pool.length)];
  greetingEl.textContent = text + ".";
}

// ---------------------------------------------------------------------------
// Search bar — handles URL vs. web search
// ---------------------------------------------------------------------------

function setupSearch(input) {
  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const query = input.value.trim();
    if (!query) return;

    const win = Services.wm.getMostRecentWindow("navigator:browser");
    if (!win) return;

    /* Determine if it looks like a URL or a search query */
    const url = guessAndFixURL(query);

    const where = e.ctrlKey || e.metaKey ? "tab" : "current";
    win.openLinkIn(url, where, {
      triggeringPrincipal: win.document.nodePrincipal,
      private: PrivateBrowsingUtils.isContentWindowPrivate(win.gBrowser.selectedBrowser.contentWindow),
    });
  });

  /* Focus the input when the page loads */
  input.focus();
}

/**
 * Heuristic: if the input looks like a URL (has scheme, or looks like a
 * hostname with a TLD), use it directly.  Otherwise wrap in a web search.
 */
function guessAndFixURL(text) {
  // Already has a scheme.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(text)) return text;

  // Common protocol-less URL patterns: "example.com", "sub.domain.org/path"
  if (/^[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}([/?#:].*)?$/.test(text)) {
    // Check it's not just a search-engine query like "hello.world"
    // Simple heuristic: if the TLD part is short and common, assume URL.
    const tld = text.split(".").pop().split(/[/?#:]/)[0].toLowerCase();
    const commonTLDs = new Set([
      "com", "org", "net", "edu", "gov", "mil", "io", "co", "app", "dev",
      "me", "tv", "info", "biz", "xyz", "uk", "de", "fr", "jp", "au", "ca",
      "cn", "in", "ru", "br", "it", "es", "nl", "se", "no", "pl", "at",
      "ch", "be", "dk", "fi", "gr", "ie", "pt", "ro", "hu", "cz", "sk",
      "kr", "tw", "hk", "sg", "my", "ph", "th", "vn", "za", "eg", "ng",
      "ke", "ma", "tn", "dz", "sa", "ae", "il", "tr", "pk", "bd", "lk",
    ]);
    if (commonTLDs.has(tld) || tld.length <= 3) {
      return `https://${text}`;
    }
  }

  // Localhost / IP address
  if (/^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(text)) {
    return `http://${text}`;
  }

  // Default: DuckDuckGo search
  return `https://duckduckgo.com/?q=${encodeURIComponent(text)}`;
}

// ---------------------------------------------------------------------------
// Top Sites — populate from Places frecency
// ---------------------------------------------------------------------------

async function populateTopSites(grid) {
  try {
    const topSites = await fetchTopSites(MAX_TILES);
    renderTiles(grid, topSites);
  } catch (err) {
    console.warn("about:glint — could not load top sites:", err);
  }
}

async function fetchTopSites(limit) {
  const options = PlacesUtils.history.getNewQueryOptions();
  options.maxResults = limit;
  options.sortingMode = options.SORT_BY_FRECENCY_DESCENDING;

  /* Exclude about: pages, mozilla.org, and common non-user pages */
  const query = PlacesUtils.history.getNewQuery();
  query.setQuery(
    `HISTORY_RECENT`
    + ` AND NOT (url LIKE 'about:%'`
    + `      OR url LIKE 'https://www.mozilla.org%'`
    + `      OR url LIKE 'https://accounts.firefox.com%'`
    + `      OR url LIKE 'https://support.mozilla.org%'`
    + `      OR url LIKE 'https://addons.mozilla.org%'`
    + `      OR url LIKE 'chrome://%'`
    + `      OR url LIKE 'file://%')`
  );

  const queryResult = await PlacesUtils.history.executeQuery(query, options);
  const root = queryResult.root;
  root.containerOpen = true;

  const sites = [];
  for (let i = 0; i < root.childCount; i++) {
    const node = root.getChild(i);
    sites.push({
      title: node.title || node.uri,
      url: node.uri,
      frecency: node.frecency,
    });
  }

  root.containerOpen = false;
  return sites;
}

// ---------------------------------------------------------------------------
// Render tiles
// ---------------------------------------------------------------------------

function renderTiles(grid, sites) {
  /* Remove existing dynamic tiles (keep the placeholder) */
  const existing = grid.querySelectorAll(".dial-tile-dynamic");
  for (const el of existing) el.remove();

  /* Insert tiles before the placeholder */
  const placeholder = grid.querySelector(".dial-tile-placeholder");

  for (const site of sites) {
    const tile = createTile(site);
    if (placeholder) {
      grid.insertBefore(tile, placeholder);
    } else {
      grid.appendChild(tile);
    }
  }
}

function createTile(site) {
  const tile = document.createElement("a");
  tile.className = "dial-tile dial-tile-dynamic";
  tile.href = site.url;
  tile.title = site.title;
  tile.setAttribute("draggable", "false");

  /* Favicon */
  const iconDiv = document.createElement("div");
  iconDiv.className = "dial-tile-icon";
  const faviconUrl = `page-icon:${site.url}`;
  iconDiv.style.backgroundImage = `url('${faviconUrl}')`;
  iconDiv.style.backgroundSize = `${FAVICON_SIZE}px`;
  iconDiv.style.backgroundRepeat = "no-repeat";
  iconDiv.style.backgroundPosition = "center";

  /* Label */
  const label = document.createElement("span");
  label.className = "dial-tile-label";
  label.textContent = truncateTitle(site.title);

  tile.appendChild(iconDiv);
  tile.appendChild(label);

  /* Click handler */
  tile.addEventListener("click", (e) => {
    e.preventDefault();
    const win = Services.wm.getMostRecentWindow("navigator:browser");
    if (!win) return;
    const where = e.ctrlKey || e.metaKey ? "tab" : "current";
    win.openLinkIn(site.url, where, {
      triggeringPrincipal: win.document.nodePrincipal,
      private: PrivateBrowsingUtils.isContentWindowPrivate(win.gBrowser.selectedBrowser.contentWindow),
    });
  });

  /* Middle-click / auxclick */
  tile.addEventListener("auxclick", (e) => {
    if (e.button === 1) {
      e.preventDefault();
      const win = Services.wm.getMostRecentWindow("navigator:browser");
      if (!win) return;
      win.openLinkIn(site.url, "tab", {
        triggeringPrincipal: win.document.nodePrincipal,
      });
    }
  });

  return tile;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncateTitle(title, maxLen = 28) {
  if (!title || title.length <= maxLen) return title || "Untitled";
  return title.slice(0, maxLen - 1) + "…";
}

// ---------------------------------------------------------------------------
// Background preference — let the user customise the gradient
// ---------------------------------------------------------------------------

/**
 * Call this with a CSS gradient string to override the default background:
 *   setBackground("linear-gradient(135deg, #0f0c29, #302b63, #24243e)");
 */
function setBackground(gradient) {
  document.documentElement.style.background = gradient;
}
