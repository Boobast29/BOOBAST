// ============================================================
//  Sponsors des tribunes (nord, sud, est, ouest)
//  Logique adaptée de retroFootballManager (sponsors.js), © 2025 FredericusRadicalus, licence MIT —
//  copie d'origine et licence dans vendor/retroFootballManager/.
//  Reprise : un contrat par tribune, offres renouvelées, prime de signature = 25 % du montant annuel,
//  paiement à chaque journée de championnat, fin automatique du contrat.
//  Adaptation : montants indexés sur la réputation et l'économie du championnat, offres générées sans toucher
//  l'aléatoire de la partie, comptabilité du jeu (flux « sponsor »), noms de sponsors fictifs français.
// ============================================================
const TRIBUNES = { nord: 'Tribune Nord', sud: 'Tribune Sud', est: 'Tribune Est', ouest: 'Tribune Ouest' };
const TRIBUNE_POIDS = { nord: .375, sud: .375, est: .3, ouest: .3 }; // rapport au sponsor maillot (150/400 et 120/400 dans l'original)
const NOMS_SPONSORS_TRIBUNE = ['Assurances Delmar', 'Brasserie du Port', 'Optique Vasseur', 'Transports Lambert', 'Crédit Régional', 'Énergies Atlas',
  'Boulangeries Morel', 'Hôtel Bellevue', 'Garage Central', 'Mutuelle Horizon', 'Imprimerie Duval', 'Télécom Azur', 'Cafés Mercier', 'BTP Rousseau',
  'Pharmacie Leclair', 'Agence Voyages Soleil', 'Cuisines Martin', 'Banque Populaire du Val', 'Fromagerie Joly', 'Informatique Néon'];

function offresTribunes(G) {
  const me = myClub(G), base = baseSponsor(G, me) * 38; // montant annuel du sponsor maillot de référence
  return withSideRng(`${G.seed}|tribunes|${G.season}|${G.week}`, () => {
    const pris = new Set(Object.values(G.tribunes || {}).filter(Boolean).map(s => s.name));
    const out = [];
    for (const k of Object.keys(TRIBUNES)) {
      if (G.tribunes?.[k]) continue;
      for (let n = 0; n < 2; n++) {
        let name; let g = 0;
        do { name = pick(NOMS_SPONSORS_TRIBUNE); } while (pris.has(name) && g++ < 30);
        pris.add(name);
        const annuel = roundMoney(base * TRIBUNE_POIDS[k] * (1 + rnd() * .5));
        out.push({ id: `${k}-${G.season}-${n}-${name}`, tribune: k, name, annuel, saisons: 1 + Math.floor(rnd() * 3) });
      }
    }
    return out;
  });
}
function signerTribune(id) {
  const o = (G.offresTribunes || []).find(x => x.id === id); if (!o) return;
  G.tribunes ||= {};
  if (G.tribunes[o.tribune]) return toast(`${TRIBUNES[o.tribune]} déjà sponsorisée.`, 'err');
  const prime = roundMoney(o.annuel * .25); // prime de signature : 25 % du montant annuel (comme l'original)
  FLOW_LABEL = `Prime de signature : ${o.name} (${TRIBUNES[o.tribune]})`;
  try { flow(G, myClub(G), prime, 'sponsor'); } finally { FLOW_LABEL = null; }
  G.tribunes[o.tribune] = { ...o, journees: o.saisons * leagueRoundsTotal(G) };
  G.offresTribunes = G.offresTribunes.filter(x => x.tribune !== o.tribune);
  news(G, `🏟 ${TRIBUNES[o.tribune]} : contrat signé avec ${o.name} (${money(o.annuel)}/saison pendant ${o.saisons} saison(s)). Prime de signature : ${money(prime)}.`, 'board');
  save(); toast(`${o.name} sponsorise la ${TRIBUNES[o.tribune]}.`);
}
function paiementsTribunes(G) {
  if (!G.tribunes) return 0;
  let total = 0;
  const R = Math.max(1, leagueRoundsTotal(G));
  for (const [k, s] of Object.entries(G.tribunes)) {
    if (!s) continue;
    const v = roundMoney(s.annuel / R); total += v;
    FLOW_LABEL = null; flow(G, myClub(G), v, 'sponsor');
    if (--s.journees <= 0) { news(G, `Fin du contrat de ${s.name} (${TRIBUNES[k]}). De nouvelles offres arrivent.`, 'board'); G.tribunes[k] = null; G.offresTribunes = offresTribunes(G); }
  }
  return total;
}
// une journée de championnat = un paiement (comme « par round » dans l'original)
const __completeWeekT = completeWeek;
completeWeek = function (G, skip) {
  const e = G.schedule[G.week];
  const r = __completeWeekT(G, skip);
  if (e?.t === 'L' && G.clubId) paiementsTribunes(G);
  return r;
};
// offres au début de chaque saison (tribunes libres)
const __setupSeasonT = setupSeason;
setupSeason = function (G) { __setupSeasonT(G); if (G.clubId && myClub(G)) G.offresTribunes = offresTribunes(G); };
const __newGameT = newGame;
newGame = function (...a) { const g = __newGameT(...a); const prev = G; G = g; try { g.tribunes = { nord: null, sud: null, est: null, ouest: null }; g.offresTribunes = offresTribunes(g); } finally { G = prev; } return g; };

// écran Finances : carte des tribunes
function carteTribunes(G) {
  G.tribunes ||= { nord: null, sud: null, est: null, ouest: null };
  if (!G.offresTribunes) G.offresTribunes = offresTribunes(G);
  const R = leagueRoundsTotal(G);
  const total = Object.values(G.tribunes).filter(Boolean).reduce((s, x) => s + x.annuel, 0);
  return `<section class="card tribunes"><h2>🏟 Sponsors des tribunes <small class="muted">${money(total)}/saison</small></h2>
    <div class="trib-plan">${Object.entries(TRIBUNES).map(([k, l]) => { const s = G.tribunes[k]; return `<div class="trib trib-${k} ${s ? 'prise' : ''}"><small>${l}</small><b>${s ? esc(s.name) : 'libre'}</b>${s ? `<em>${money(s.annuel)}/saison · encore ${Math.ceil(s.journees / R * 10) / 10} saison(s)</em>` : ''}</div>`; }).join('')}
      <div class="trib-pelouse">${esc(myClub(G).stadium || 'Stade')}</div></div>
    ${(G.offresTribunes || []).length ? `<h3>Offres</h3><table class="tbl compact">${G.offresTribunes.map(o => `<tr><td>${TRIBUNES[o.tribune]}</td><td><b>${esc(o.name)}</b></td><td>${money(o.annuel)}/saison</td><td>${o.saisons} saison(s)</td><td>prime ${money(roundMoney(o.annuel * .25))}</td><td><button class="btn sm primary" data-trib="${esc(o.id)}">Signer</button></td></tr>`).join('')}</table>` : '<p class="muted">Toutes les tribunes sont sponsorisées.</p>'}
    <p class="hint">Un contrat par tribune ; prime de signature de 25 % ; paiement à chaque journée de championnat. Mécanique reprise de retroFootballManager (licence MIT).</p></section>`;
}
const __vFinancesT = vFinances;
vFinances = function (el) {
  __vFinancesT(el);
  if (!G) return;
  el.insertAdjacentHTML('beforeend', carteTribunes(G));
  el.querySelectorAll('[data-trib]').forEach(b => b.onclick = () => { signerTribune(b.dataset.trib); show('finances'); });
};
