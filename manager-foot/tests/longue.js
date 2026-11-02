// Simulation longue : http://127.0.0.1:8765/tests/longue.html?graines=1,2,3,4,5&saisons=10&monde=fictif
// Aucune sauvegarde n'est écrite (les parties du joueur ne sont pas touchées).
save = async function () { };
saveDB = async function () { };
startScreen = async function () { }; // l'accueil du jeu ne doit pas réinitialiser la partie simulée
const Q = new URLSearchParams(location.search);
const SEEDS = (Q.get('graines') || '1,2,3,4,5').split(',').map(Number);
const SEASONS = +(Q.get('saisons') || 10), WORLD = Q.get('monde') || 'fictif', PAYS = Q.get('pays') || 'France';
window.__RES = { seeds: [], done: false, start: Date.now() };
const out = (t) => { document.getElementById('out').textContent += t + '\n'; };
const etat = (t) => { document.getElementById('etat').textContent = t; };
// MessageChannel : pas ralenti par le navigateur quand l'onglet est en arrière-plan (contrairement à setTimeout)
const pause0 = () => new Promise(r => { const ch = new MessageChannel(); ch.port1.onmessage = () => r(); ch.port2.postMessage(0); });

async function buildWorld() {
  if (WORLD === 'reel') { const scn = await api('/api/scenario?pays=' + encodeURIComponent(PAYS)); return () => buildRealWorld(scn); }
  return () => { const db = buildDefaultDatabase(); normalizeWorld(db); return db; };
}
async function runSeed(seed, mk) {
  try { localStorage.setItem('mf-role', 'ds'); } catch { }
  const W = mk();
  const dom = W.clubs.filter(c => !c.foreign).sort((a, b) => a.rep - b.rep);
  G = newGame(W, dom[Math.floor(dom.length / 2)].id, 'Test ' + seed, seed);
  VIEW = 'x';
  G.__harness = true; G.cell.deleg = 'execute'; // la politique automatique répond aussi aux offres personnelles (refus)
  const R = { seed, club: myClub(G).name, seasons: [], errors: [], events: [], ms: 0 };
  const t0 = performance.now();
  for (let s = 0; s < SEASONS; s++) {
    let guard = 0;
    while (G.week < G.schedule.length && guard++ < 200) { simWeek(G); if (guard % 4 === 0) { etat(`Graine ${seed} · saison ${G.season} · ${weekLabel(G)}`); await pause0(); } }
    for (const e of checkStandings(G)) R.errors.push(`${G.season} ${e}`);
    const m = seasonMetrics(G);
    simWeek(G); // fin de saison
    for (const e of checkInvariants(G)) R.errors.push(`${m.saison} ${e}`);
    m.ms = Math.round(performance.now() - t0);
    R.seasons.push(m);
    out(`graine ${seed} · ${m.saison} : ${JSON.stringify(m)}`);
  }
  R.ms = Math.round(performance.now() - t0);
  R.events = (G.simEvents || []).concat((G.autoErrors || []).map(e => 'erreur décision ' + e));
  R.cell = G.cell ? { membres: G.cell.members.map(m => `${m.name} (${m.role})`), missions: G.cell.missions.length, rapports: (G.reports || []).length, anciens: (G.cell.alumni || []).length } : null;
  R.ds = G.ds ? { statut: G.ds.status, clubs: G.ds.career.map(c => c.club), offres: G.ds.offers.length, rep: Object.fromEntries(Object.entries(G.ds.rep).map(([k, v]) => [k, Math.round(v)])) } : null;
  R.prom = G.intakeLog?.map(l => l.season + ':' + l.n).join(' ');
  return R;
}
(async () => {
  await new Promise(r => document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true }));
  while (!DB) await new Promise(r => setTimeout(r, 100)); // démarrage du jeu terminé (sinon NEXT_PID et RNG sont réinitialisés en parallèle)
  const mk = await buildWorld();
  for (const seed of SEEDS) {
    try { window.__RES.seeds.push(await runSeed(seed, mk)); }
    catch (e) { window.__RES.seeds.push({ seed, crash: e.message + ' ' + (e.stack || '').split('\n').slice(1, 4).join(' | ') }); out('CRASH ' + seed + ' ' + e.message); }
  }
  window.__RES.done = true; window.__RES.total_s = Math.round((Date.now() - window.__RES.start) / 1000);
  etat(`Terminé en ${window.__RES.total_s} s`);
})();
