// ============================================================
//  Mini-résumé après chaque match de ton club (messagerie)
//  Score, buteurs et passeurs, statistiques (possession, tirs, tirs cadrés, xG, corners, fautes), notes de tes joueurs
//  (titulaires et entrants), homme du match. Toujours envoyé, hors limite de messages de la semaine.
// ============================================================
function rapportMatch(G, mt, f) {
  if (f.h !== G.clubId && f.a !== G.clubId) return;
  const moi = f.h === G.clubId ? 0 : 1, adv = 1 - moi;
  const nom = id => getPlayer(G, id)?.name || '?';
  const buts = mt.events.filter(e => e.type === 'goal').map(e => ({ s: e.side === 0 ? 'h' : 'a', m: e.min, p: nom(e.pid), pa: e.assist ? nom(e.assist) : '' }));
  const S = mt.stats, poss = Math.round((S[0].poss / Math.max(1, S[0].poss + S[1].poss)) * 100); // domicile à gauche, comme le score
  const notes = Object.entries(mt.pr).filter(([, r]) => r.side === moi && r.min > 0).map(([id, r]) => ({ id: +id, n: nom(+id), pos: getPlayer(G, +id)?.pos || '', r: Math.round(clamp(r.r, 3, 10) * 10) / 10, min: r.min, g: r.g || 0, a: r.a || 0 }))
    .sort((a, b) => b.r - a.r);
  const motm = mt.motm != null ? nom(mt.motm) : notes[0]?.n;
  const [h, a] = mt.score, nh = getClub(G, f.h)?.name, na = getClub(G, f.a)?.name;
  const res = mt.score[moi] > mt.score[adv] ? 'Victoire' : mt.score[moi] < mt.score[adv] ? 'Défaite' : 'Match nul';
  G.__sansResume = true;
  try {
    news(G, `📋 Rapport de match — ${nh} ${h}-${a} ${na}${mt.penScore ? ` (t.a.b. ${mt.penScore[0]}-${mt.penScore[1]})` : ''} : ${res.toLowerCase()}. Homme du match : ${motm || '—'}.`, mt.score[moi] > mt.score[adv] ? 'win' : mt.score[moi] < mt.score[adv] ? 'loss' : 'info');
    const m = G.inbox[0];
    if (m) m.rapport = { nh, na, h, a, res, moi, buts, motm, notes: notes.slice(0, 16),
      stats: [['Possession', poss + ' %', (100 - poss) + ' %'], ['Tirs', S[0].shots, S[1].shots], ['Tirs cadrés', S[0].onT, S[1].onT],
        ['xG', (Math.round(S[0].xg * 10) / 10).toFixed(1), (Math.round(S[1].xg * 10) / 10).toFixed(1)], ['Corners', S[0].corners, S[1].corners], ['Fautes', S[0].fouls, S[1].fouls]] };
  } finally { G.__sansResume = false; }
}
if (typeof applyMatch === 'function') {
  const __applyMatchRM = applyMatch;
  applyMatch = function (G, mt, f) { const r = __applyMatchRM.apply(this, arguments); try { rapportMatch(G, mt, f); } catch (e) { console.error(e); } return r; };
}
function htmlRapport(R) {
  const cl = r => r >= 8 ? 'rm-top' : r >= 7 ? 'rm-bon' : r >= 6 ? 'rm-moy' : 'rm-bas';
  return `<div class="rm"><div class="rm-score"><span>${esc(R.nh)}</span><b>${R.h} - ${R.a}</b><span>${esc(R.na)}</span></div>
    ${R.buts.length ? `<ul class="rm-buts">${R.buts.map(b => `<li class="${b.s}"><b>${esc(String(b.m))}'</b> ${esc(b.p)}${b.pa ? ` <small>(${esc(b.pa)})</small>` : ''}</li>`).join('')}</ul>` : '<p class="muted">Aucun but.</p>'}
    <table class="rm-stats">${R.stats.map(([l, x, y]) => `<tr><td>${x}</td><th>${l}</th><td>${y}</td></tr>`).join('')}</table>
    <h4>Notes de tes joueurs <small>homme du match : ${esc(R.motm || '—')}</small></h4>
    <table class="tbl compact rm-notes"><thead><tr><th>Joueur</th><th>Poste</th><th>Min.</th><th>B</th><th>PD</th><th>Note</th></tr></thead>
      <tbody>${R.notes.map(n => `<tr data-pid="${n.id}" class="click"><td class="nm">${esc(n.n)}</td><td>${n.pos}</td><td>${n.min}</td><td>${n.g || ''}</td><td>${n.a || ''}</td><td><span class="rm-n ${cl(n.r)}">${n.r.toFixed(1).replace('.', ',')}</span></td></tr>`).join('')}</tbody></table></div>`;
}
window.addEventListener('load', () => {
  if (typeof vMail !== 'function') return;
  const __vMailRM = vMail;
  vMail = function (el) {
    const r = __vMailRM.apply(this, arguments);
    try {
      const sel = typeof MAIL_SEL !== 'undefined' ? G.inbox.find(m => m.id === MAIL_SEL) : null;
      const corps = el.querySelector('.mx-msg .mx-corps');
      if (sel?.rapport && corps) { corps.innerHTML = htmlRapport(sel.rapport); corps.querySelectorAll('tr[data-pid]').forEach(t => t.onclick = () => playerModal(+t.dataset.pid)); }
    } catch (e) { console.error(e); }
    return r;
  };
});
