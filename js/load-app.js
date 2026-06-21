// tests/load-app.js
// Loads the 12 split JS modules (js/i18n-data.js ... js/fantasy.js) into a
// jsdom window, as SEPARATE <script> tags in the same order the real HTML
// loads them. This mirrors exactly how a real browser executes multiple
// classic <script> tags in one document: function declarations AND
// top-level let/const all share the same global lexical scope across
// script tags (even though only `function`/`var` become actual `window`
// properties) — so calcStandings() in porra-form.js can still close over
// GROUPS declared with `const` in teams-data.js, as long as teams-data.js's
// script tag runs first. We just have to preserve that load order here.
//
// IMPORTANT: only `function foo(){}` declarations at the top level become
// properties of `window` (classic, non-module scripts). `const`/`let`
// (GROUPS, FIFA_RK, TNAMES...) stay private to the global lexical scope
// and are NOT reachable as window.GROUPS from outside — which is fine,
// since every pure function we test (calcStandings, bR32, calcScore...)
// already closes over them internally.

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Must match the <script src="js/..."> order in porra2026.html exactly.
const MODULE_ORDER = [
  'i18n-data.js',
  'badges.js',
  'teams-data.js',
  'core.js',
  'auth.js',
  'porra-form.js',
  'ranking.js',
  'admin.js',
  'porras-pages.js',
  'comparador.js',
  'muro.js',
  'fantasy.js',
];

function loadApp() {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'https://example.com/porra2026.html', // needed for localStorage to work
    runScripts: 'dangerously',
    // NOTE: pretendToBeVisual is intentionally OFF — with it on, jsdom
    // auto-fires the 'load' event, which would trigger the app's real
    // window.onload handler (full UI init: initSupabase, loadJugadors,
    // renderStep...). We only want the top-level function declarations,
    // not a live app instance, so we leave it off.
  });

  // Minimal stubs for things the modules may touch but that don't exist in jsdom
  dom.window.Chart = function Chart() { /* no-op stub for Chart.js */ };
  dom.window.XLSX = { read: () => ({}), utils: { sheet_to_json: () => [] } };
  dom.window.supabase = undefined; // forces initSupabase()/dbq() to no-op safely if ever called
  dom.window.fetch = () => Promise.reject(new Error('network disabled in tests'));

  for (const filename of MODULE_ORDER) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'js', filename), 'utf8');
    const scriptEl = dom.window.document.createElement('script');
    scriptEl.textContent = src;
    dom.window.document.body.appendChild(scriptEl); // executes immediately, in this window's context
  }

  return dom;
}

module.exports = { loadApp };

