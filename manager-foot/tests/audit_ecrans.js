// Audit de tous les écrans (Node + Playwright, serveur local sur 8770) : node tests/audit_ecrans.js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), rapport = {};
  for (const [vw, vh, tag] of [[1366, 860, 'pc'], [390, 844, 'mob']]) {
    const p = await b.newPage({ viewport: { width: vw, height: vh } }); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
    await p.goto('http://127.0.0.1:8770/index.html'); await p.evaluate(() => localStorage.setItem('mf-visite', '1')); await p.reload();
    await p.waitForFunction(() => typeof DB !== 'undefined' && DB && document.querySelector('.club-pick'), null, { timeout: 60000 });
    await p.click('.club-pick'); await p.waitForFunction(() => typeof G !== 'undefined' && G && document.querySelector('#nav'), null, { timeout: 30000 });
    await p.evaluate(() => { G.__harness = true; if (G.cell) G.cell.deleg = 'execute'; for (let i = 0; i < 10; i++) simWeek(G); G.__harness = false; });
    const vues = await p.evaluate(() => NAV_FLAT.map(x => x[0]).filter(v => v !== 'base'));
    const res = [];
    for (const v of vues) {
      const avant = errs.length;
      const r = await p.evaluate(async v => { closeModal?.(); const t0 = performance.now(); show(v); await new Promise(r => requestAnimationFrame(() => setTimeout(r, 50))); return { ms: Math.round(performance.now() - t0), deborde: document.documentElement.scrollWidth > innerWidth + 1, vide: ($('#main')?.innerText || '').trim().length < 20 }; }, v);
      res.push({ v, ...r, err: errs.slice(avant).slice(0, 2) });
    }
    // fiches et onglets
    const avant = errs.length;
    await p.evaluate(async () => { const x = clubPlayers(G, G.clubId)[0]; for (const t of ['profil', 'stats', 'dev', 'talk']) { playerModal(x.id, t); await new Promise(r => setTimeout(r, 40)); } closeModal(); viewClub(G.clubs.find(c => c.id !== G.clubId && !c.foreign).id); });
    res.push({ v: 'fiches', err: errs.slice(avant) });
    rapport[tag] = { lents: res.filter(x => x.ms > 250).map(x => x.v + ' ' + x.ms + 'ms'), debordements: res.filter(x => x.deborde).map(x => x.v), vides: res.filter(x => x.vide).map(x => x.v), erreurs: res.filter(x => x.err?.length).map(x => x.v + ': ' + x.err.join(' | ')), mesures: res.map(x => x.v + ':' + x.ms).join(' ') };
    await p.close();
  }
  console.log(JSON.stringify(rapport, null, 1)); await b.close();
})();
