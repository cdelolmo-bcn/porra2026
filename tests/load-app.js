// tests/load-app.js
// Loads ../app.js into a jsdom window so we can call its top-level
// functions (calcStandings, getBT, bR32, calcScore, ...) in isolation,
// without touching the real DOM, Supabase, or any network call.
//
// IMPORTANT: only `function foo(){}` declarations at the top level of
// app.js become properties of `window` (classic, non-module scripts).
// `const`/`let` (GROUPS, FIFA_RK, TNAMES...) stay private to the script
// and are NOT reachable from outside — which is fine, since every pure
// function we test (calcStandings, bR32, calcScore...) already closes
// over them internally.

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function loadApp() {
  const appSrc = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'https://example.com/porra2026.html', // needed for localStorage to work
    runScripts: 'dangerously',
    // NOTE: pretendToBeVisual is intentionally OFF — with it on, jsdom
    // auto-fires the 'load' event, which would trigger the app's real
    // window.onload handler (full UI init: initSupabase, loadJugadors,
    // renderStep...). We only want the top-level function declarations,
    // not a live app instance, so we leave it off.
  });

  // Minimal stubs for things app.js may touch but that don't exist in jsdom
  dom.window.Chart = function Chart() { /* no-op stub for Chart.js */ };
  dom.window.XLSX = { read: () => ({}), utils: { sheet_to_json: () => [] } };
  dom.window.supabase = undefined; // forces initSupabase()/dbq() to no-op safely if ever called
  dom.window.fetch = () => Promise.reject(new Error('network disabled in tests'));

  const scriptEl = dom.window.document.createElement('script');
  scriptEl.textContent = appSrc;
  dom.window.document.body.appendChild(scriptEl); // executes app.js in this window's context

  return dom;
}

module.exports = { loadApp };
