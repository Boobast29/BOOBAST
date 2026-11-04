// ============================================================
//  Clubs affiliés (comme FM), page Club
//  - Jusqu'à 2 partenariats avec des clubs plus modestes de ton pays (matchs réellement joués, temps de jeu suivi). Contribution
//    annuelle versée à l'affilié, renouvelée à chaque fin de saison (on peut rompre à tout moment).
//  - Prêt chez un affilié : toujours accepté, salaire pris en charge à 50 %, temps de jeu garanti (le joueur
//    est titularisé à son poste), rappel possible. Dans la fenêtre « Prêter » de la fiche, en tête de liste.
//  - Priorité sur leurs jeunes : en fin de saison, chaque affilié propose son meilleur espoir (≤ 20 ans) à 50 % de
//    sa valeur.
//  - L'affilié gagne un peu de réputation chaque saison grâce au partenariat.
// ============================================================
const AFFIL_MAX = 2;
const affilies = G2 => (G2.affilies ||= []).filter(a => getClub(G2, a.id));
const estAffilie = (G2, id) => affilies(G2).some(a => a.id === id);
const coutAffil = (G2, c) => roundMoney(150000 + c.rep * 4000 + myClub(G2).rep * 2000);
function candidatsAffil(G2) {
  const me = myClub(G2);
  return G2.clubs.filter(c => c.id !== me.id && !c.foreign && !estAffilie(G2, c.id) && (c.rep ?? 50) <= me.rep - 8 && (c.rep ?? 50) >= me.rep - 40 && clubPlayers(G2, c.id).length >= 14)
    .sort((a, b) => ((b.div ?? 1) > (me.div ?? 1)) - ((a.div ?? 1) > (me.div ?? 1)) || b.rep - a.rep).slice(0, 10); // divisions inférieures d'abord
}
function creerAffil(id) {
  const c = getClub(G, id); if (!c || affilies(G).length >= AFFIL_MAX) return;
  const cout = coutAffil(G, c);
  FLOW_LABEL = 'Partenariat club affilié'; flow(G, myClub(G), -cout, 'other'); FLOW_LABEL = null;
  G.affilies.push({ id, s: G.season, cout });
  news(G, `🤝 Partenariat signé avec ${c.name} : priorité sur leurs jeunes, prêts avec temps de jeu garanti (${money(cout)} par saison).`, 'club', true);
  save();
}
function romprAffil(id) {
  const c = getClub(G, id); G.affilies = affilies(G).filter(a => a.id !== id);
  news(G, `Partenariat rompu avec ${c?.name}.`, 'club'); save();
}
// ---------- prêt chez un affilié ----------
function preterAffilie(p, cid) {
  const c = getClub(G, cid);
  p.loan = { from: G.clubId, share: .5, inLoan: true, recall: true, role: 'Titulaire garanti (club affilié)', startMin: p.stats?.min || 0, since: G.week, until: G.season, affil: true };
  p.club = c.id; p.num = null; p.listed = false; p.academy = false; p.reserve = false;
  assignNumbers(clubPlayers(G, c.id)); removeFromTactics(p.id);
  if (typeof logTransfer === 'function') logTransfer(G, p, G.clubId, c.id, 0, 'prêt');
  news(G, `${p.name} est prêté à ${c.name} (club affilié) jusqu'à la fin de la saison, temps de jeu garanti.`, 'transfer');
  save();
}
// temps de jeu garanti : l'affilié titularise les joueurs prêtés par son club parent
if (typeof autoLineup === 'function') {
  const __autoLineupAF = autoLineup;
  autoLineup = function (G2, clubId, formation, tac) {
    const t = __autoLineupAF.apply(this, arguments);
    try {
      if (!G2.affilies?.length || !estAffilie(G2, clubId)) return t;
      const roles = (FORMATIONS[formation] || []).map(s => s[0]);
      for (const p of clubPlayers(G2, clubId).filter(q => q.loan?.affil && q.loan.from === G2.clubId && available(q))) {
        if (t.lineup.includes(p.id)) continue;
        let i = roles.findIndex((r, k) => r === p.pos && t.lineup[k] !== p.id && !getPlayer(G2, t.lineup[k])?.loan?.affil);
        if (i < 0) i = roles.findIndex((r, k) => GROUPE_POSTE?.[r] === GROUPE_POSTE?.[p.pos] && r !== 'GB' && !getPlayer(G2, t.lineup[k])?.loan?.affil);
        if (i < 0) continue;
        const sorti = t.lineup[i]; t.lineup[i] = p.id;
        t.bench = (t.bench || []).filter(id => id !== p.id); if (sorti && !t.bench.includes(sorti)) t.bench.unshift(sorti);
      }
    } catch (e) { console.error(e); }
    return t;
  };
}
// ---------- fin de saison : renouvellement, réputation, jeunes proposés ----------
DECISION_OPTS.affilJeune = d => [['acheter', `Le recruter (${money(d.data?.prix || 0)})`, 'primary'], ['suivre', 'Le faire suivre par la cellule'], ['non', 'Pas intéressé']];
if (typeof AUTO_POLICY !== 'undefined') AUTO_POLICY.affilJeune = 'suivre';
window.addEventListener('load', () => {
  if (typeof endSeason === 'function') {
    const __endSeasonAF = endSeason;
    endSeason = function (G2) {
      const S = __endSeasonAF.apply(this, arguments);
      try {
        for (const a of affilies(G2)) {
          const c = getClub(G2, a.id); c.rep = clamp((c.rep ?? 50) + 1, 0, 99);
          FLOW_LABEL = 'Partenariat club affilié'; flow(G2, myClub(G2), -a.cout, 'other'); FLOW_LABEL = null;
          const j = clubPlayers(G2, c.id).filter(p => p.age <= 20 && !p.loan).sort((x, y) => (y.pot - x.pot) || (playerOvr(y) - playerOvr(x)))[0];
          if (j) addDecision(G2, { key: `affil:${G2.season}:${j.id}`, kind: 'affilJeune', ref: j.id, from: c.name, icon: '🤝', blocking: false,
            title: `${c.name} te propose ${j.name} (${j.age} ans, ${j.pos})`, text: `Club affilié : priorité sur leur meilleur espoir, à 50 % de sa valeur.`, data: { prix: roundMoney((j.value || 0) * .5), club: c.id } });
        }
      } catch (e) { console.error(e); }
      return S;
    };
  }
  const __decideAF = decide;
  decide = function (id, opt) {
    const d = G.decisions.find(x => x.id === id);
    if (!d || d.done || d.kind !== 'affilJeune') return __decideAF.apply(this, arguments);
    const p = getPlayer(G, d.ref); let msg;
    if (opt === 'acheter' && p && p.club === d.data.club) {
      if (myClub(G).budget < d.data.prix) { msg = 'Trésorerie insuffisante : il reste chez eux, suivi par la cellule.'; (G.known ||= []).includes(p.id) || G.known.push(p.id); }
      else {
        FLOW_LABEL = 'Recrue club affilié'; flow(G, myClub(G), -d.data.prix, 'transfers'); flow(G, getClub(G, d.data.club), d.data.prix, 'sales'); FLOW_LABEL = null;
        if (typeof logTransfer === 'function') logTransfer(G, p, d.data.club, G.clubId, d.data.prix, 'transfert');
        p.club = G.clubId; p.num = null; p.contract = 4; p.academy = p.age <= 18; assignNumbers(clubPlayers(G, G.clubId));
        msg = `${p.name} rejoint le club pour ${money(d.data.prix)}.`;
      }
    } else if (opt === 'suivre' && p) { (G.known ||= []).includes(p.id) || G.known.push(p.id); msg = `${p.name} est suivi par la cellule.`; }
    else msg = 'Proposition déclinée.';
    d.done = opt; d.answer = msg; news(G, `🤝 ${msg}`, 'transfer'); save();
    if ($('#top')) { toast(msg); if (VIEW === 'mail' && !$('#modal')) show('mail'); else renderTop(); }
  };
  // page Club
  if (typeof vClub === 'function') {
    const __vClubAF = vClub;
    vClub = function (el) {
      const r = __vClubAF.apply(this, arguments);
      try { el.insertAdjacentHTML('beforeend', carteAffilies()); brancherAffilies(el); } catch (e) { console.error(e); }
      return r;
    };
  }
  // fenêtre « Prêter » : affiliés en tête
  if (typeof loanModal === 'function') {
    const __loanModalAF = loanModal;
    loanModal = function (pid) {
      const r = __loanModalAF.apply(this, arguments);
      try {
        const A = affilies(G), p = getPlayer(G, pid), box = document.querySelector('#modal .mbox h2');
        if (A.length && p && box && windowOpen(G)) {
          box.insertAdjacentHTML('afterend', `<div class="af-pret"><b>Clubs affiliés</b><small>Toujours accepté · temps de jeu garanti · 50 % du salaire pris en charge</small>${A.map(a => { const c = getClub(G, a.id); return `<button class="btn primary sm" data-afl="${c.id}">Prêter à ${esc(c.name)}</button>`; }).join('')}</div>`);
          document.querySelectorAll('[data-afl]').forEach(b => b.onclick = () => { preterAffilie(p, +b.dataset.afl); closeModal(); toast(`${p.name} prêté à ${getClub(G, +b.dataset.afl).name}.`); refresh(); });
        }
      } catch (e) { console.error(e); }
      return r;
    };
  }
});
function carteAffilies() {
  const A = affilies(G), C = A.length < AFFIL_MAX ? candidatsAffil(G) : [];
  const prets = G.players.filter(p => p.loan?.affil && p.loan.from === G.clubId);
  return `<section class="card af-card"><h2>Clubs affiliés <small class="muted">${A.length}/${AFFIL_MAX}</small></h2>
    <p class="hint">Un partenariat avec un club plus modeste : prêts toujours acceptés avec temps de jeu garanti, priorité sur leur meilleur espoir chaque saison. Contribution versée à chaque saison.</p>
    ${A.length ? `<div class="af-liste">${A.map(a => { const c = getClub(G, a.id), pr = prets.filter(p => p.club === c.id); return `<div class="af-item">${crest(c, 32)}<div><b>${esc(c.name)}</b><small>${esc(clubLeague(G, c.id)?.name || c.country || '')} · depuis ${a.s} · ${money(a.cout)} / saison</small>${pr.length ? `<small>Prêtés : ${pr.map(p => `${esc(p.name)} (${p.stats?.apps || 0} matchs)`).join(', ')}</small>` : ''}</div><button class="btn sm ghost" data-afx="${c.id}">Rompre</button></div>`; }).join('')}</div>` : ''}
    ${C.length ? `<h3>Partenaires possibles</h3><div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Club</th><th>Championnat</th><th>Réputation</th><th>Coût / saison</th><th></th></tr></thead><tbody>${C.map(c => `<tr><td class="nm">${crest(c, 20)} ${esc(c.name)}</td><td><small>${esc(clubLeague(G, c.id)?.name || c.country || '')}</small></td><td>${Math.round(c.rep)}</td><td>${money(coutAffil(G, c))}</td><td><button class="btn sm" data-afn="${c.id}">Signer</button></td></tr>`).join('')}</tbody></table></div>` : A.length >= AFFIL_MAX ? '' : '<p class="muted">Aucun club adapté pour l\'instant.</p>'}</section>`;
}
function brancherAffilies(el) {
  el.querySelectorAll('[data-afn]').forEach(b => b.onclick = () => { const c = getClub(G, +b.dataset.afn); confirmBox(`Signer un partenariat avec ${c.name} pour ${money(coutAffil(G, c))} par saison ?`, () => { creerAffil(c.id); vClub(el); }); });
  el.querySelectorAll('[data-afx]').forEach(b => b.onclick = () => confirmBox(`Rompre le partenariat avec ${getClub(G, +b.dataset.afx).name} ?`, () => { romprAffil(+b.dataset.afx); vClub(el); }));
}
