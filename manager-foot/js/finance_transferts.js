// ============================================================
//  Finance des transferts : comptabilité et montages financiers
//  Mécanismes réels, tels que les appliquent les clubs européens (normes IFRS et règlement financier UEFA) :
//  - Amortissement : une indemnité de transfert n'est pas une charge de l'année d'achat. Elle est étalée de façon
//    linéaire sur la durée du contrat, 5 ans au plus (plafond UEFA depuis 2023). Prolonger le contrat réétale
//    la valeur restante sur la nouvelle durée.
//  - Valeur nette comptable (VNC) = coût − amortissements cumulés. Une vente dégage une plus-value (prix − VNC),
//    un départ libre une moins-value égale à la VNC restante.
//  - Ratio de coût d'effectif UEFA : (salaires + amortissements + commissions d'agents) / (recettes + plus-values),
//    limite de 70 % depuis 2025-26.
//  - Montages : vente payée en plusieurs fois (le club acheteur paie plus cher, environ 8 %), affacturage
//    (cession d'une créance à un organisme financier contre du comptant, avec une décote d'environ 5 % par an restant),
//    achat payé 25 % comptant et le reste sur 3 ans.
//  Aucun tirage aléatoire ici : l'avenir de la partie n'est pas modifié.
// ============================================================
const AMORT_MAX_ANS = 5, RATIO_UEFA = .7, PRIME_ECHELONNE = .08, DECOTE_AFFACTURAGE = .05;

// plan d'achat supplémentaire (les plans existants restent : comptant, 50/50 sur 1 an, 30/70 sur 2 ans)
if (typeof PAY_PLANS !== 'undefined' && !PAY_PLANS.some(p => p.k === 'y3')) PAY_PLANS.push({ k: 'y3', label: '25 % maintenant, 75 % sur 3 ans', now: .25, weeks: 114, f: .8 });

function comptaSaison(G, s = G.season) { G.compta ||= {}; return (G.compta[s] ||= { amort: 0, pv: 0, mv: 0, agents: 0 }); }
function semainesSaison(G) { return Math.max(30, G.schedule?.length || 38); }
function vnc(G, p) { return p?.compta ? Math.max(0, p.compta.reste) : 0; }
function chargeAnnuelle(p) { return p?.compta?.ans ? p.compta.base / p.compta.ans : 0; }

// achats et ventes : tous les mouvements passent par logTransfer
if (typeof logTransfer === 'function') {
  const __logTransferFT = logTransfer;
  logTransfer = function (G, p, from, to, fee, type = 'transfert') {
    const r = __logTransferFT.apply(this, arguments);
    try {
      const pret = /prêt/.test(type);
      if (to === G.clubId && from !== G.clubId && fee > 0 && !pret) {
        const agent = p.deal?.agentFee || 0;
        p.compta = { base: fee + agent, reste: fee + agent, ans: null, depuis: G.season, prix: fee };
      } else if (from === G.clubId && to !== G.clubId && !pret && p.compta) {
        const v = vnc(G, p), C = comptaSaison(G);
        if (fee - v >= 0) C.pv += fee - v; else C.mv += v - fee;
        (G.comptaJournal ||= []).push({ s: G.season, nom: p.name, prix: fee, vnc: Math.round(v), res: Math.round(fee - v) });
        if (G.comptaJournal.length > 60) G.comptaJournal.shift();
        delete p.compta;
      }
    } catch (e) { console.error(e); }
    return r;
  };
}
// chaque semaine : amortissement des joueurs achetés et réétalement après prolongation
function amortirSemaine(G) {
  const C = comptaSaison(G), n = semainesSaison(G);
  for (const p of clubPlayers(G, G.clubId)) {
    const k = p.compta; if (!k) continue;
    const ansContrat = Math.max(1, Math.min(AMORT_MAX_ANS, p.contract || 1));
    if (!k.ans) { k.ans = ansContrat; k.fin = G.season + k.ans; }
    else if (G.season + ansContrat > k.fin && k.reste > 0) { k.base = k.reste; k.ans = ansContrat; k.fin = G.season + ansContrat; } // prolongation
    const ch = Math.min(k.reste, k.base / k.ans / n);
    k.reste -= ch; C.amort += ch;
  }
  // un joueur parti sans indemnité (fin de contrat, résiliation) : moins-value
  for (const p of G.players) if (p.compta && p.club !== G.clubId && p.loan?.from !== G.clubId) { comptaSaison(G).mv += vnc(G, p); delete p.compta; }
}
if (typeof weeklyUpdate === 'function') {
  const __weeklyUpdateFT = weeklyUpdate;
  weeklyUpdate = function (G, full = true) {
    const r = __weeklyUpdateFT.apply(this, arguments);
    if (G.clubId != null) { try { amortirSemaine(G); } catch (e) { console.error(e); } }
    return r;
  };
}

// ratio de coût d'effectif (saison en cours, au prorata)
function ratioCoutEffectif(G) {
  const f = G.fin || { inc: {}, exp: {} }, C = comptaSaison(G);
  const recettes = Object.values(f.inc || {}).reduce((s, v) => s + v, 0) - (f.inc?.sales || 0);
  const couts = (f.exp?.wages || 0) + C.amort + (f.exp?.agents || 0);
  const base = recettes + C.pv;
  return { couts, base, ratio: base > 0 ? couts / base : null, amort: C.amort, pv: C.pv, mv: C.mv };
}

// ---------- montage : vente payée en plusieurs fois ----------
function accepterOffreEchelonnee(oid) {
  const o = G.offers.find(x => x.id === oid); if (!o) return;
  const p = getPlayer(G, o.pid), buyer = getClub(G, o.club), me = myClub(G);
  const total = roundMoney(o.fee * (1 + PRIME_ECHELONNE));
  o.fee = total;
  acceptOffer(oid);
  if (p.club !== buyer.id) return; // refus du joueur ou fonds insuffisants
  const reste = roundMoney(total * .6);
  me.budget -= reste; if (G.fin?.inc) G.fin.inc.sales = (G.fin.inc.sales || 0) - reste; buyer.budget += reste;
  scheduleRest(G, buyer.id, me.id, reste, 76);
  news(G, `💶 Montage : ${buyer.name} paie ${money(total)} pour ${p.name}, dont ${money(total - reste)} tout de suite et ${money(reste)} sur deux saisons.`, 'transfer');
  save?.(); refresh?.();
}
// ---------- montage : affacturage d'une créance ----------
function affacturer(i) {
  const L = (G.payables || []).filter(pb => pb.to === G.clubId), pb = L[i]; if (!pb) return;
  const du = pb.total * pb.left / pb.weeks, ans = pb.left / semainesSaison(G);
  const decote = Math.round(du * DECOTE_AFFACTURAGE * ans);
  const me = myClub(G);
  G.payables = G.payables.filter(x => x !== pb);
  flow(G, getClub(G, pb.from), -du, 'transfers');
  flow(G, me, du, 'sales'); flow(G, me, -decote, 'interest');
  news(G, `🏦 Affacturage : créance sur ${getClub(G, pb.from).name} cédée. ${money(du - decote)} encaissés tout de suite (décote ${money(decote)}).`, 'info');
  save?.(); toast(`Créance cédée : ${money(du - decote)} encaissés.`); refresh?.();
}

// ---------- affichage ----------
function blocComptabilite(G) {
  const R = ratioCoutEffectif(G), C = comptaSaison(G);
  const achats = clubPlayers(G, G.clubId).filter(p => p.compta).sort((a, b) => vnc(G, b) - vnc(G, a));
  const vncTot = achats.reduce((s, p) => s + vnc(G, p), 0);
  const creances = (G.payables || []).filter(pb => pb.to === G.clubId);
  const pct = R.ratio == null ? null : Math.round(R.ratio * 100);
  const etat = pct == null ? '' : pct > 90 ? 'neg' : pct > 70 ? 'warn' : 'pos';
  return `<section class="card compta"><h2>📒 Comptabilité des transferts</h2>
    <p class="hint">Une indemnité est amortie sur la durée du contrat (5 ans au plus). Vendre au-dessus de la valeur nette comptable dégage une plus-value, qui améliore le résultat et le ratio UEFA.</p>
    <div class="kpis compta-kpis">
      <div><small>Amortissements de la saison</small><b>${money(C.amort)}</b></div>
      <div><small>Plus-values de cession</small><b class="pos">${money(C.pv)}</b>${C.mv ? `<em class="neg">moins-values ${money(C.mv)}</em>` : ''}</div>
      <div><small>Valeur comptable de l'effectif</small><b>${money(vncTot)}</b><em>valeur marchande ${money(clubPlayers(G, G.clubId).reduce((s, p) => s + p.value, 0))}</em></div>
      <div><small>Ratio de coût d'effectif (UEFA, limite 70 %)</small><b class="${etat}">${pct == null ? '—' : pct + ' %'}</b><em>salaires + amortissements + agents / recettes + plus-values</em></div>
    </div>
    ${achats.length ? `<h3>Joueurs achetés</h3><div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Joueur</th><th>Coût</th><th>Charge annuelle</th><th>Valeur comptable</th><th>Valeur marchande</th><th>Si vendu à sa valeur</th></tr></thead><tbody>
      ${achats.slice(0, 15).map(p => { const v = vnc(G, p), d = p.value - v; return `<tr><td class="nm">${esc(p.name)}</td><td>${money(p.compta.base)}</td><td>${money(chargeAnnuelle(p))}</td><td>${money(v)}</td><td>${money(p.value)}</td><td class="${d >= 0 ? 'pos' : 'neg'}">${d >= 0 ? '+' : ''}${money(d)}</td></tr>`; }).join('')}</tbody></table></div>` : '<p class="muted">Aucun joueur acheté avec indemnité : rien à amortir.</p>'}
    ${creances.length ? `<h3>Créances à recevoir</h3>${creances.map((pb, i) => { const du = pb.total * pb.left / pb.weeks, dec = Math.round(du * DECOTE_AFFACTURAGE * pb.left / semainesSaison(G)); return `<div class="row gap wrap creance"><span class="grow">${esc(getClub(G, pb.from).name)} : ${money(du)} restant sur ${pb.left} semaines</span><button class="btn sm" data-aff="${i}" title="Un organisme financier rachète la créance">Encaisser maintenant ${money(du - dec)}</button></div>`; }).join('')}` : ''}
    ${G.comptaJournal?.length ? `<h3>Dernières ventes</h3>${G.comptaJournal.slice(-5).reverse().map(j => `<div class="muted">${j.s} · ${esc(j.nom)} : vendu ${money(j.prix)}, valeur comptable ${money(j.vnc)} → <b class="${j.res >= 0 ? 'pos' : 'neg'}">${j.res >= 0 ? 'plus' : 'moins'}-value ${money(Math.abs(j.res))}</b></div>`).join('')}` : ''}
  </section>`;
}
if (typeof vFinances === 'function') {
  const __vFinancesFT = vFinances;
  vFinances = function (el) {
    const r = __vFinancesFT.apply(this, arguments);
    el.insertAdjacentHTML('beforeend', blocComptabilite(G));
    el.querySelectorAll('[data-aff]').forEach(b => b.onclick = () => affacturer(+b.dataset.aff));
    return r;
  };
}
if (typeof vTransfers === 'function') {
  const __vTransfersFT = vTransfers;
  vTransfers = function (el) {
    const r = __vTransfersFT.apply(this, arguments);
    if (typeof TR_TAB !== 'undefined' && TR_TAB === 'offers') {
      el.querySelectorAll('[data-acc]').forEach(b => {
        const o = G.offers.find(x => x.id === +b.dataset.acc); if (!o) return;
        const p = getPlayer(G, o.pid), v = vnc(G, p);
        b.insertAdjacentHTML('afterend', ` <button class="btn sm" data-ech="${o.id}" title="Le club paie 40 % maintenant et le reste sur deux saisons, soit ${Math.round(PRIME_ECHELONNE * 100)} % de plus au total">En plusieurs fois : ${money(roundMoney(o.fee * (1 + PRIME_ECHELONNE)))}</button>`);
        if (p?.compta) b.closest('tr')?.querySelector('td:nth-child(5)')?.insertAdjacentHTML('beforeend', `<br><small class="${o.fee >= v ? 'pos' : 'neg'}">${o.fee >= v ? 'plus' : 'moins'}-value comptable ${money(Math.abs(o.fee - v))}</small>`);
      });
      el.querySelectorAll('[data-ech]').forEach(b => b.onclick = () => accepterOffreEchelonnee(+b.dataset.ech));
    }
    return r;
  };
}
