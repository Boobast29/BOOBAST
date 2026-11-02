// ============================================================
//  Petits plus d'interface (bibliothèques MIT dans vendor/, licences conservées)
//  - tablesort : tous les tableaux à en-têtes se trient d'un clic (montants « 62,9 M€ », « 610 k€/mois », notes, âges…)
//  - countUp.js : le budget de l'en-tête s'anime quand il change
//  - jsPDF : « 📄 PDF » sur la Chronique — bilan de carrière (saisons, classement actuel, finances, meilleurs joueurs)
// ============================================================

// ---------- tri des tableaux ----------
function valeurTri(txt) {
  const t = String(txt || '').replace(/\s+/g, ' ').trim();
  const m = t.match(/^([-+]?\d+(?:[.,]\d+)?)\s*(M€|k€|€)?/i);
  if (m) { let v = parseFloat(m[1].replace(',', '.')); if (/^M€/i.test(m[2] || '')) v *= 1e6; else if (/^k€/i.test(m[2] || '')) v *= 1e3; return v; }
  const n = t.match(/[-+]?\d+(?:[.,]\d+)?/); // « ~94 », « 7e », « 06/2030 » → premier nombre
  return n ? parseFloat(n[0].replace(',', '.')) : null;
}
if (typeof Tablesort === 'function') {
  Tablesort.extend('nombre-fr', item => valeurTri(item) != null, (a, b) => (valeurTri(b) ?? -Infinity) - (valeurTri(a) ?? -Infinity));
}
function rendreTriables(racine) {
  if (typeof Tablesort !== 'function' || !racine) return;
  racine.querySelectorAll('table.tbl').forEach(t => {
    if (t.dataset.tri) return;
    const tete = t.tHead?.rows[0] || t.rows[0];
    if (!tete || !tete.querySelector('th') || t.rows.length < 4) return;
    if (!t.tHead) { const th = t.createTHead(); th.appendChild(tete); } // tablesort trie le corps sous l'en-tête
    t.dataset.tri = '1'; t.classList.add('triable');
    try { new Tablesort(t); } catch { }
  });
}
const observateurTri = new MutationObserver(() => { rendreTriables($('#main')); rendreTriables($('#modal')); });
document.addEventListener('DOMContentLoaded', () => observateurTri.observe(document.body, { childList: true, subtree: true }));
if (document.readyState !== 'loading') observateurTri.observe(document.body, { childList: true, subtree: true });

// ---------- budget animé ----------
let dernierBudget = null;
const __renderTopU = renderTop;
renderTop = function () {
  __renderTopU();
  if (!G || typeof countUp === 'undefined') return;
  const b = myClub(G).budget, el = [...document.querySelectorAll('#top .tinfo')].find(x => x.querySelector('small')?.textContent === 'Budget')?.querySelector('b');
  if (el && dernierBudget != null && Math.abs(b - dernierBudget) >= 1e5 && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    const enM = Math.abs(b) >= 1e6;
    const c = new countUp.CountUp(el, enM ? b / 1e6 : b / 1e3, { startVal: enM ? dernierBudget / 1e6 : dernierBudget / 1e3, decimalPlaces: 1, duration: .9, decimal: ',', separator: ' ', suffix: enM ? ' M€' : ' k€' });
    if (!c.error) c.start(() => { el.textContent = money(b); });
  }
  dernierBudget = b;
};

// ---------- bilan de carrière en PDF ----------
function textePDF(html) { const d = document.createElement('div'); d.innerHTML = html; return d.textContent.replace(/\s+/g, ' ').trim(); }
function bilanPDF() {
  const J = window.jspdf?.jsPDF; if (!J || !G) return toast('Export PDF indisponible.', 'err');
  const doc = new J({ unit: 'mm', format: 'a4' }), W = 210, M = 16;
  let y = 18;
  const ligne = (txt, taille = 10.5, gras = false, couleur = [30, 30, 30]) => {
    doc.setFont('helvetica', gras ? 'bold' : 'normal'); doc.setFontSize(taille); doc.setTextColor(...couleur);
    for (const l of doc.splitTextToSize(txt, W - 2 * M)) { if (y > 282) { doc.addPage(); y = 18; } doc.text(l, M, y); y += taille * .45; }
    y += 1.5;
  };
  const me = myClub(G), c1 = me.colors?.[0] || '#2fd27a';
  const rgb = h => { const x = h.replace('#', ''); const v = x.length === 3 ? x.split('').map(c => c + c).join('') : x; return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16) || 0); };
  doc.setFillColor(...rgb(c1)); doc.rect(0, 0, W, 10, 'F');
  ligne(`Manager Foot — bilan de carrière`, 18, true);
  ligne(`${G.managerName} · ${me.name} · saison ${G.season}/${G.season + 1} · ${weekLabel(G)}`, 11, false, [90, 90, 90]);
  y += 2; ligne('Chronique', 14, true);
  const C = (G.chronique || []).slice();
  for (const h of G.history || []) if (!C.some(c => c.season === h.season)) C.push({ season: h.season, club: h.club, rank: h.rank, comp: h.comp, obj: h.objLabel, met: h.met, cup: h.cup });
  C.sort((a, b) => a.season - b.season);
  if (!C.length) ligne('Aucune saison terminée pour l\'instant.');
  for (const c of C) { ligne(`${c.season}/${String(c.season + 1).slice(2)}`, 11, true, [60, 60, 60]); ligne(textePDF(typeof texteSaison === 'function' ? texteSaison(c) : '')); }
  const L = clubLeague(G, G.clubId);
  if (L) {
    y += 2; ligne(`Classement actuel — ${L.name}`, 14, true);
    standings(G, L.id).forEach((r, i) => ligne(`${String(i + 1).padStart(2)}. ${getClub(G, r.id).name} — ${r.pts} pts (${r.w}V ${r.d}N ${r.l}D, ${r.gf}-${r.ga})`, 9.5, r.id === G.clubId));
  }
  y += 2; ligne('Finances', 14, true);
  ligne(`Trésorerie : ${money(me.budget)} · masse salariale : ${money((typeof wageBill === 'function' ? wageBill(G) : 0) * 52)} par an · budget transferts : ${money(G.board?.transfer || 0)}`);
  y += 2; ligne('Meilleurs joueurs', 14, true);
  clubPlayers(G, G.clubId).filter(p => !p.academy).sort((a, b) => playerOvr(b) - playerOvr(a)).slice(0, 11)
    .forEach(p => ligne(`${p.name} — ${p.pos}, ${p.age} ans, note ${playerOvr(p)}, ${p.stats.apps} matchs, ${p.stats.goals} buts, valeur ${money(p.value)}`, 9.5));
  doc.setFontSize(8); doc.setTextColor(140, 140, 140); doc.text(`Généré par Manager Foot le ${new Date().toLocaleDateString('fr-FR')} (jsPDF, licence MIT)`, M, 292);
  doc.save(`bilan-${G.managerName}-${G.season}.pdf`.replace(/[^\w.-]+/g, '-'));
  toast('Bilan PDF enregistré.');
}
if (typeof vChronique === 'function') {
  const __vChroniqueU = vChronique;
  vChronique = function (el) {
    __vChroniqueU(el);
    el.querySelector('section.card h2')?.insertAdjacentHTML('beforeend', ' <button class="btn sm ghost no-capture" id="pdfChro" title="Bilan de carrière en PDF">📄 PDF</button>');
    $('#pdfChro')?.addEventListener('click', bilanPDF);
  };
}
if (typeof entreesPalette === 'function') {
  const __entreesU = entreesPalette;
  entreesPalette = function (q) {
    const r = __entreesU(q), n = sansAccent(q.trim());
    if (n && sansAccent('Bilan de carrière en PDF').includes(n)) r.unshift({ t: 'action', i: '📄', l: 'Bilan de carrière en PDF', s: 'Action', go: bilanPDF });
    return r;
  };
}
