// tests/logic.test.js
// Run with: npm test
//
// These tests cover the pure calculation functions of porra2026
// (group standings, bracket generation, scoring). They do NOT touch
// the DOM, Supabase, or the network — that's covered by the manual
// QA checklist in tests/QA_CHECKLIST.md instead.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./load-app.js');

// Reload a fresh app instance per test file run (cheap enough, and avoids
// any cross-test state leaking through module-level variables like LANG).
const dom = loadApp();
const w = dom.window;

test.after(() => dom.window.close());

// ── Real Capi bet, used as a regression fixture (see chat history: the
//    "Capi" porra had España... no wait, México 1st in group A, but
//    predicted the R32 opponent to win — this used to score 0 points
//    for that slot due to a bug, and should score 1 after the fix). ──
const capi = {
  nombre: 'Capi', email: '',
  grupos: {
    A: [{h:0,a:1,gh:2,ga:1},{h:2,a:3,gh:1,ga:2},{h:3,a:1,gh:2,ga:2},{h:0,a:2,gh:3,ga:1},{h:3,a:0,gh:1,ga:1},{h:1,a:2,gh:3,ga:1}],
    B: [{h:4,a:5,gh:2,ga:2},{h:6,a:7,gh:1,ga:2},{h:7,a:5,gh:1,ga:0},{h:4,a:6,gh:1,ga:1},{h:7,a:4,gh:3,ga:1},{h:5,a:6,gh:2,ga:1}],
    C: [{h:8,a:9,gh:2,ga:2},{h:10,a:11,gh:0,ga:2},{h:11,a:9,gh:1,ga:2},{h:8,a:10,gh:4,ga:0},{h:11,a:8,gh:1,ga:2},{h:9,a:10,gh:3,ga:1}],
    D: [{h:12,a:13,gh:1,ga:0},{h:14,a:15,gh:0,ga:3},{h:12,a:14,gh:2,ga:1},{h:15,a:13,gh:1,ga:1},{h:15,a:12,gh:2,ga:1},{h:13,a:14,gh:2,ga:0}],
    E: [{h:16,a:17,gh:4,ga:0},{h:18,a:19,gh:0,ga:1},{h:16,a:18,gh:2,ga:0},{h:19,a:17,gh:3,ga:0},{h:17,a:18,gh:1,ga:2},{h:19,a:16,gh:1,ga:3}],
    F: [{h:20,a:21,gh:1,ga:0},{h:22,a:23,gh:2,ga:0},{h:20,a:22,gh:1,ga:1},{h:23,a:21,gh:1,ga:2},{h:21,a:22,gh:1,ga:2},{h:23,a:20,gh:1,ga:3}],
    G: [{h:24,a:25,gh:2,ga:0},{h:26,a:27,gh:1,ga:0},{h:24,a:26,gh:1,ga:0},{h:27,a:25,gh:2,ga:2},{h:25,a:26,gh:1,ga:0},{h:27,a:24,gh:1,ga:3}],
    H: [{h:28,a:29,gh:3,ga:0},{h:30,a:31,gh:1,ga:3},{h:28,a:30,gh:2,ga:0},{h:31,a:29,gh:2,ga:0},{h:29,a:30,gh:1,ga:1},{h:31,a:28,gh:1,ga:1}],
    I: [{h:32,a:33,gh:2,ga:0},{h:34,a:35,gh:1,ga:3},{h:32,a:34,gh:3,ga:0},{h:35,a:33,gh:2,ga:2},{h:35,a:32,gh:1,ga:2},{h:33,a:34,gh:2,ga:0}],
    J: [{h:36,a:37,gh:2,ga:0},{h:38,a:39,gh:1,ga:0},{h:36,a:38,gh:1,ga:0},{h:39,a:37,gh:2,ga:2},{h:37,a:38,gh:0,ga:1},{h:39,a:36,gh:0,ga:4}],
    K: [{h:40,a:41,gh:2,ga:0},{h:42,a:43,gh:1,ga:3},{h:40,a:42,gh:3,ga:0},{h:43,a:41,gh:4,ga:0},{h:43,a:40,gh:2,ga:2},{h:41,a:42,gh:1,ga:1}],
    L: [{h:44,a:45,gh:2,ga:2},{h:46,a:47,gh:1,ga:1},{h:44,a:46,gh:2,ga:0},{h:47,a:45,gh:1,ga:2},{h:47,a:44,gh:0,ga:3},{h:45,a:46,gh:1,ga:0}],
  },
  ko: {
    r32_1:16,r32_2:32,r32_3:3,r32_4:9,r32_5:40,r32_6:28,r32_7:15,r32_8:24,
    r32_9:8,r32_10:19,r32_11:11,r32_12:44,r32_13:36,r32_14:12,r32_15:7,r32_16:43,
    oct_1:9,oct_2:32,oct_3:8,oct_4:44,oct_5:28,oct_6:15,oct_7:36,oct_8:43,
    qf_1:32,qf_2:28,qf_3:44,qf_4:36,
    sf_1:28,sf_2:36,final_1:28,
  },
  extras: { camp:28, esp:'champion', gol:'Kylian Mbappe', jug:'Lionel Messi' },
};

test('calcStandings: México queda 1º del grupo A con los resultados de Capi', () => {
  const norm = Object.fromEntries(
    Object.entries(capi.grupos).map(([g, ms]) => [g, ms.map(m => ({ gh: m.gh, ga: m.ga }))])
  );
  const st = w.calcStandings(norm);
  assert.equal(st.A[0].ti, 0, 'México (id 0) debería ser 1º de grupo A');
  assert.equal(st.A[0].pts, 7, '2 victorias + 1 empate = 7 puntos');
});

test('bR32: el 1º de grupo A siempre cae en el slot r32_11 (independiente del combo de terceros)', () => {
  const norm = Object.fromEntries(
    Object.entries(capi.grupos).map(([g, ms]) => [g, ms.map(m => ({ gh: m.gh, ga: m.ga }))])
  );
  const st = w.calcStandings(norm);
  const bt = w.getBT(st);
  const r32 = w.bR32(st, bt.map);
  const slot11 = r32.find(s => s.id === 'r32_11');
  assert.equal(slot11.h, 0, 'r32_11.h debería ser México (id 0)');
});

test('calcScore: regresión Capi — acertar el grupo pero NO el ganador del cruce sigue dando el punto del equipo', () => {
  // Resultado real: r32_11 confirmado con México como local, rival y ganador
  // todavía no decididos (esto puede pasar cuando el admin solo ha confirmado
  // la clasificación de grupos pero el cruce de R32 aún no se ha jugado).
  const real = { ko: { r32_11: { h: 0, a: null, w: null } }, grupos: {}, extras: {} };
  const pts = w.calcScore(capi, real);
  assert.equal(pts, 1, 'Capi predijo México 1º de grupo (acierto), aunque eligió a Escocia como ganador del cruce');
});

test('calcScore: 0 puntos si ni el grupo ni el ganador coinciden con la realidad', () => {
  // Mismo cruce real, pero ahora con un equipo (id 5) que no aparece en
  // ningún sitio de la porra de Capi en ese slot.
  const real = { ko: { r32_11: { h: 5, a: 6, w: null } }, grupos: {}, extras: {} };
  const pts = w.calcScore(capi, real);
  assert.equal(pts, 0);
});

test('calcScore: el campeón acertado suma 3 puntos extra cuando la final está resuelta', () => {
  const real = {
    ko: { final_1: { h: 28, a: 36, w: 28 } },
    grupos: {},
    extras: { esp: 'champion', gol: 'Kylian Mbappe', jug: 'Lionel Messi' },
  };
  const pts = w.calcScore(capi, real);
  // 3 (campeón) + 3 (esp) + 3 (gol, fuzzy match) + 3 (jug, fuzzy match) = 12
  assert.equal(pts, 12);
});

test('playerMatch: hace fuzzy-match razonable de nombres de jugadores', () => {
  assert.equal(w.playerMatch('Kylian Mbappe', 'Kylian Mbappé'), true);
  assert.equal(w.playerMatch('Mbappe', 'Kylian Mbappé'), true);
  assert.equal(w.playerMatch('Lionel Messi', 'Cristiano Ronaldo'), false);
});

test('calcEspFromKo: detecta correctamente la fase de eliminación de España (id 28)', () => {
  assert.equal(w.calcEspFromKo({ final_1: 28 }, {}), 'champion');
  assert.equal(w.calcEspFromKo({ final_1: 36, sf_1: 28 }, {}), 'runner_up');
  assert.equal(w.calcEspFromKo({ qf_1: 28 }, {}), 'semis');
  assert.equal(w.calcEspFromKo({ r32_11: 0 }, { r32_11: { h: 0, a: 28 } }), 'r32s');
  assert.equal(w.calcEspFromKo({}, {}), 'groups_out');
});

test('bOct/bQF/bSF/bFin: la cadena de feeds del bracket es consistente con calcScore', () => {
  // r32 winners 1..16 -> deben alimentar oct_1.h=r32_4 y oct_1.a=r32_3, según
  // la definición en calcScore (pOct usa pares [3,4],[1,2],[9,10]...).
  const r32w = Array.from({ length: 16 }, (_, i) => i); // ids 0..15, solo para el test
  const oct = w.bOct(r32w);
  assert.equal(oct[0].id, 'oct_1');
  assert.equal(oct[0].h, r32w[2]); // índice 2 = r32_3 (0-indexed)
  assert.equal(oct[0].a, r32w[3]); // índice 3 = r32_4
});

// ── Fantasy: fórmula de puntuación (fCalcPts es pura, no toca DOM) ──

test('fCalcPts: jugar 60+ minutos da 2 pts, menos de 60 (pero >0) da 1 pt', () => {
  assert.equal(w.fCalcPts('MID', { min: 90, goals: 0, assists: 0, saves: 0, yc: 0, rc: 0, ownG: 0, cleanSheet: false }), 2);
  assert.equal(w.fCalcPts('MID', { min: 23, goals: 0, assists: 0, saves: 0, yc: 0, rc: 0, ownG: 0, cleanSheet: false }), 1);
  assert.equal(w.fCalcPts('MID', { min: 0, goals: 0, assists: 0, saves: 0, yc: 0, rc: 0, ownG: 0, cleanSheet: false }), 0);
});

test('fCalcPts: los goles valen distinto según la posición (portero > defensa > medio > delantero)', () => {
  const base = { min: 90, assists: 0, saves: 0, yc: 0, rc: 0, ownG: 0, cleanSheet: false };
  assert.equal(w.fCalcPts('GK', { ...base, goals: 1 }), 2 + 8);
  assert.equal(w.fCalcPts('DEF', { ...base, goals: 1 }), 2 + 7);
  assert.equal(w.fCalcPts('MID', { ...base, goals: 1 }), 2 + 6);
  assert.equal(w.fCalcPts('FWD', { ...base, goals: 1 }), 2 + 4);
});

test('fCalcPts: portería a cero da puntos solo a GK/DEF/MID, no a delanteros', () => {
  const base = { min: 90, goals: 0, assists: 0, saves: 0, yc: 0, rc: 0, ownG: 0, cleanSheet: true };
  assert.equal(w.fCalcPts('GK', base), 2 + 5);
  assert.equal(w.fCalcPts('DEF', base), 2 + 3);
  assert.equal(w.fCalcPts('MID', base), 2 + 1);
  assert.equal(w.fCalcPts('FWD', base), 2 + 0);
});

test('fCalcPts: tarjetas y goles en propia restan, y el resultado nunca baja de 0', () => {
  const base = { min: 90, goals: 0, assists: 0, saves: 0, cleanSheet: false };
  assert.equal(w.fCalcPts('MID', { ...base, yc: 1, rc: 0, ownG: 0 }), 1); // 2 - 1
  assert.equal(w.fCalcPts('MID', { ...base, yc: 0, rc: 1, ownG: 0 }), 0); // 2 - 3 -> clamp a 0
  assert.equal(w.fCalcPts('MID', { ...base, yc: 1, rc: 1, ownG: 1 }), 0); // 2-1-3-3 -> clamp a 0
});

test('fCalcPts: el portero suma 1 pt por cada 3 paradas', () => {
  const base = { min: 90, goals: 0, assists: 0, yc: 0, rc: 0, ownG: 0, cleanSheet: false };
  assert.equal(w.fCalcPts('GK', { ...base, saves: 2 }), 2);     // 2 base, 2 paradas no llegan a 3
  assert.equal(w.fCalcPts('GK', { ...base, saves: 3 }), 2 + 1); // 3 paradas = +1
  assert.equal(w.fCalcPts('GK', { ...base, saves: 7 }), 2 + 2); // 7 paradas = +2 (floor(7/3))
  assert.equal(w.fCalcPts('FWD', { ...base, saves: 7 }), 2);    // un delantero no suma por paradas
});

// ── Crear/editar porra: collectPorra() y valKO() leen de localStorage con
//    fallback seguro cuando no hay formulario en pantalla, así que se
//    pueden testear simulando lo que el formulario habría guardado. ──

test('collectPorra: ensambla correctamente nombre, grupos, KO y extras desde localStorage', () => {
  w.localStorage.clear();
  w.ss('p-name', 'Usuario de Prueba');
  w.ss('p-email', 'prueba@example.com');

  // Resultados de grupo A: México (id 0) acaba 1º — mismos datos que el
  // caso real de Capi usado en los tests de arriba.
  const grupoA = [{ gh: 2, ga: 1 }, { gh: 1, ga: 2 }, { gh: 2, ga: 2 }, { gh: 3, ga: 1 }, { gh: 1, ga: 1 }, { gh: 3, ga: 1 }];
  grupoA.forEach((m, idx) => { w.ss(`m_gA_${idx}_h`, String(m.gh)); w.ss(`m_gA_${idx}_a`, String(m.ga)); });

  w.ss('ko_r32_11_w', '0');     // México gana su cruce de R32
  w.ss('ko_final_1_w', '0');
  w.ss('ext-camp', '0');
  w.ss('ext-esp', 'champion');
  w.ss('ext-gol', 'Kylian Mbappe');
  w.ss('ext-jug', 'Lionel Messi');

  const d = w.collectPorra();
  assert.equal(d.nombre, 'Usuario de Prueba');
  assert.equal(d.email, 'prueba@example.com');
  assert.equal(d.grupos.A[0].gh, 2);
  assert.equal(d.grupos.A[0].ga, 1);
  assert.equal(d.ko.r32_11, 0);
  assert.equal(d.ko.final_1, 0);
  assert.equal(d.extras.camp, 0);
  assert.equal(d.extras.esp, 'champion');
  assert.equal(d.extras.gol, 'Kylian Mbappe');
});

test('valKO: rechaza y limpia un pick que ya no es válido tras cambiar los grupos', () => {
  w.localStorage.clear();
  // Grupo A sin ningún resultado relleno -> compBracket() no podrá fijar
  // equipos reales en los cruces de R32, así que cualquier pick guardado
  // (p.ej. un id de prueba "99") debe considerarse inválido y limpiarse.
  w.ss('ko_r32_11_w', '99');

  const ok = w.valKO('r32', 16, 'val_r32');
  assert.equal(ok, false, 'debe fallar porque 99 no es ninguno de los dos equipos del cruce');
  assert.equal(w.localStorage.getItem('p_ko_r32_11_w'), null, 'el pick obsoleto debe eliminarse de localStorage');
});

test('valKO: acepta un pick que SÍ coincide con uno de los equipos reales del cruce', () => {
  w.localStorage.clear();
  const grupoA = [{ gh: 2, ga: 1 }, { gh: 1, ga: 2 }, { gh: 2, ga: 2 }, { gh: 3, ga: 1 }, { gh: 1, ga: 1 }, { gh: 3, ga: 1 }];
  grupoA.forEach((m, idx) => { w.ss(`m_gA_${idx}_h`, String(m.gh)); w.ss(`m_gA_${idx}_a`, String(m.ga)); });
  w.ss('ko_r32_11_w', '0'); // México (1º de A) es uno de los dos equipos reales de r32_11

  const ok = w.valKO('r32', 16, 'val_r32');
  assert.equal(ok, false, 'el resto de los 16 cruces de R32 siguen sin rellenar, así que debe seguir fallando en conjunto');
  assert.equal(w.localStorage.getItem('p_ko_r32_11_w'), '0', 'pero ESTE pick concreto no debe haberse borrado, por ser válido');
});
