// ============================================================
//  Délégation des tâches
//  Page Staff, carte « Délégation » : pour chaque tâche, « Moi » ou un membre du staff qui s'en charge.
//  - Conférences de presse (adjoint) : réponses mesurées avant et après les matchs.
//  - Causeries (adjoint) : discours d'avant-match et de mi-temps adaptés au rapport de force et au score.
//  - Entraînement (adjoint) : programme de la semaine selon la condition, la cohésion et le calendrier.
//  - Entretiens des joueurs (adjoint) : demandes d'entretien, mécontents, demandes de revalorisation.
//  - Contrats (directeur sportif) : prolongations des joueurs utiles (+2 ans, +10 %), staff.
//  - Jeunes (responsable du centre de formation) : fins de contrat U19, promotions, offres pour les jeunes.
//  - Mercato (cellule de recrutement) : offres reçues, rapports, propositions ; la cellule peut aussi signer seule.
//  - Courrier courant (secrétariat) : messages d'information, sponsor, demandes diverses.
//  Les décisions déléguées sont traitées en fin de semaine ; chacune garde la mention de qui a répondu.
//  Jamais délégué : les décisions personnelles (offre d'un autre club pour toi, fuite dans la presse).
// ============================================================
const TACHES_DELEG = {
  presse: { label: 'Conférences de presse', qui: 'assistant', tip: 'Réponses mesurées, sans polémique.' },
  causeries: { label: 'Causeries (avant-match, mi-temps)', qui: 'assistant', tip: 'Discours adapté au rapport de force et au score.' },
  entrainement: { label: 'Programme d\'entraînement', qui: 'assistant', tip: 'Repos si l\'équipe est fatiguée, tactique si la cohésion baisse, travail physique sans match.' },
  entretiens: { label: 'Entretiens avec les joueurs', qui: 'assistant', tip: 'Demandes d\'entretien et mécontents : il demande de la patience.', kinds: ['meet', 'mecontents', 'raiseReq', 'cadres', 'langue'] },
  contrats: { label: 'Prolongations et contrats du staff', qui: 'ds', tip: 'Prolonge les joueurs utiles (+2 ans, +10 %) ; renouvelle le staff.', kinds: ['renew', 'extend', 'staffRenew', 'staffRaise'] },
  jeunes: { label: 'Jeunes et centre de formation', qui: 'academy', tip: 'Fins de contrat U19, promotions, offres pour les jeunes.', kinds: ['u19fin', 'promote', 'jeunes', 'offreJeune', 'reconv'] },
  mercato: { label: 'Mercato courant', qui: 'cellule', tip: 'Offres reçues (refusées sauf départ souhaité), rapports et propositions de la cellule.', kinds: ['offer', 'sell', 'vente', 'achat', 'saleReport', 'approach', 'agentOffer', 'scoutOffer', 'cellProposal', 'cellMeeting', 'profilDemande', 'contact', 'reinforce', 'recrues'] },
  courrier: { label: 'Courrier courant', qui: 'secretariat', tip: 'Messages d\'information, choix du sponsor, demandes diverses.', kinds: ['info', 'sponsor', 'staff', 'staffClash', 'candidature'] }
};
const JAMAIS_DELEGUE = ['dsOffer', 'leakReact'];
function delegue(t) { return (G.deleg ||= {})[t] === true; }
function nomResponsable(t) {
  const q = TACHES_DELEG[t].qui;
  if (q === 'ds') return (typeof isDS === 'function' && isDS()) ? 'Ton adjoint administratif' : 'Le directeur sportif';
  if (q === 'cellule') return 'La cellule de recrutement';
  if (q === 'secretariat') return 'Le secrétariat';
  const sp = G.staffPeople?.[q]; return sp ? `${sp.name} (${STAFF[q]?.label || q})` : (STAFF[q]?.label || q);
}
function tacheDeKind(kind) { return Object.keys(TACHES_DELEG).find(t => TACHES_DELEG[t].kinds?.includes(kind)); }
// ---------- décisions déléguées ----------
function traiterDelegations(G) {
  if (!G.deleg || !Object.values(G.deleg).some(Boolean)) return;
  for (const d of pendingDecisions(G)) {
    if (JAMAIS_DELEGUE.includes(d.kind)) continue;
    const t = tacheDeKind(d.kind); if (!t || !delegue(t)) continue;
    let rep = ''; const modalAvant = !!document.querySelector('#modal');
    try {
      if (d.kind === 'sponsor') { if (G.sponsorOffers?.length) { G.sponsor = { ...G.sponsorOffers.sort((a, b) => (b.weekly || b.amount || 0) - (a.weekly || a.amount || 0))[0] }; G.sponsorOffers = null; rep = `sponsor choisi : ${G.sponsor.name || 'meilleure offre'}`; } d.done = 'délégué'; }
      else if (d.kind === 'renew') {
        const p = getPlayer(G, d.ref), sq = clubPlayers(G, G.clubId).filter(x => !x.academy).map(playerOvr).sort((a, b) => b - a), med = sq[Math.floor(sq.length / 2)] || 0;
        if (p && p.club === G.clubId && (playerOvr(p) >= med - 2 || p.age <= 23) && p.age <= 32) { p.contract += 2; p.wage = roundMoney(p.wage * 1.1); p.renewAsked = G.season; rep = `prolongé deux ans (+10 %)`; d.done = 'délégué'; }
        else { decide(d.id, 'later'); rep = 'discussion repoussée'; }
      } else if (d.kind === 'offer') {
        const o = G.offers?.find(x => x.id === d.ref), p = o && getPlayer(G, o.pid);
        const opt = p?.wantsOut && o.fee >= (p.value || 0) * .9 ? 'accept' : 'reject';
        decide(d.id, opt); rep = opt === 'accept' ? 'offre acceptée (départ souhaité, prix correct)' : 'offre refusée';
      } else {
        const opts = (DECISION_OPTS[d.kind] || DECISION_OPTS.info)(d), opt = (typeof AUTO_POLICY !== 'undefined' && AUTO_POLICY[d.kind] && opts.some(o => o[0] === AUTO_POLICY[d.kind])) ? AUTO_POLICY[d.kind] : opts[0][0];
        decide(d.id, opt); rep = (opts.find(o => o[0] === opt)?.[1] || opt).toString().replace(/<[^>]+>/g, '');
      }
    } catch (e) { console.error(e); continue; }
    if (!d.done) d.done = 'délégué';
    d.delegue = nomResponsable(t);
    news(G, `🤝 ${d.delegue} a traité « ${d.title} » : ${rep}.`, 'info');
    if (!modalAvant && document.querySelector('#modal') && typeof closeModal === 'function') closeModal(); // fenêtre ouverte par la décision elle-même
  }
}
// ---------- entraînement ----------
function programmeAdjoint(G) {
  const sq = clubPlayers(G, G.clubId).filter(p => !p.academy && !p.injury), fit = sq.reduce((a, p) => a + p.fit, 0) / Math.max(1, sq.length);
  const match = typeof aMatchCetteSemaine === 'function' ? aMatchCetteSemaine(G) : true, coh = myClub(G).coh ?? 60;
  const tr = G.training ||= { focus: 'equilibre', intensity: 1 };
  if (fit < 72) { tr.focus = 'repos'; tr.intensity = 0; }
  else if (coh < 55) { tr.focus = 'tactique'; tr.intensity = 1; }
  else if (!match) { tr.focus = 'physique'; tr.intensity = 2; }
  else { tr.focus = 'equilibre'; tr.intensity = fit > 88 ? 2 : 1; }
}
// ---------- causeries et presse ----------
function meilleureCauserie(f) {
  const home = f.h === G.clubId, opp = getClub(G, home ? f.a : f.h), oppTac = aiTactics(G, opp.id, G.clubId);
  const a = teamStrength(G, makeSide(G, G.clubId, G.tactics)), b = teamStrength(G, makeSide(G, opp.id, oppTac));
  const diff = (a.def + a.mid + a.att) / 3 - (b.def + b.mid + b.att) / 3;
  return diff < -3 ? 'relax' : diff > 3 ? 'focus' : 'motivate';
}
window.addEventListener('load', () => {
  if (typeof completeWeek === 'function') {
    const __completeWeekDL = completeWeek;
    completeWeek = function (G) {
      const r = __completeWeekDL.apply(this, arguments);
      try { if (G.clubId != null && !G.__harness) { traiterDelegations(G); if (G.deleg?.entrainement) programmeAdjoint(G); } } catch (e) { console.error(e); }
      return r;
    };
  }
  if (typeof prepareMatch === 'function') {
    const __prepareMatchDL = prepareMatch;
    prepareMatch = function (f) {
      const r = __prepareMatchDL.apply(this, arguments);
      try {
        if (delegue('causeries') && $('#pmTalk')) { $('#pmTalk').value = meilleureCauserie(f); $('#pmTalk').closest('label')?.insertAdjacentHTML('beforeend', `<small class="dl-note">Choisi par ${esc(nomResponsable('causeries'))}</small>`); }
        if (delegue('presse')) { const b = document.querySelector('[data-press="humble"]'); if (b) { b.click(); document.querySelector('.press')?.insertAdjacentHTML('beforeend', `<small class="dl-note">Répondu par ${esc(nomResponsable('presse'))}</small>`); } }
      } catch (e) { console.error(e); }
      return r;
    };
  }
  if (typeof finishMatch === 'function') {
    const __finishMatchDL = finishMatch;
    finishMatch = function (mt, f) {
      const r = __finishMatchDL.apply(this, arguments);
      try {
        if (delegue('presse')) { const b = ['praise', 'calm', 'own'].map(k => document.querySelector(`[data-pp="${k}"]`)).find(Boolean); if (b) { b.click(); toast(`${nomResponsable('presse')} a répondu à la presse d'après-match.`); } }
      } catch (e) { console.error(e); }
      return r;
    };
  }
  if (typeof teamTalk === 'function') {
    const __teamTalkDL = teamTalk;
    teamTalk = function (when) {
      const r = __teamTalkDL.apply(this, arguments);
      try {
        if (delegue('causeries') && LIVE?.mt) { const mt = LIVE.mt, d = mt.score[mt.my] - mt.score[1 - mt.my]; document.querySelector(`[data-tt="${d > 0 ? 'praise' : d < 0 ? 'demand' : 'encourage'}"]`)?.click(); }
      } catch (e) { console.error(e); }
      return r;
    };
  }
  if (typeof weeklyUpdate === 'function') { // programme posé dès le début de partie si délégué
    const __weeklyUpdateDL = weeklyUpdate;
    weeklyUpdate = function (G, full = true) { try { if (full && G.deleg?.entrainement && !G.__harness) programmeAdjoint(G); } catch (e) { console.error(e); } return __weeklyUpdateDL.apply(this, arguments); };
  }
  // page Staff : carte Délégation
  if (typeof vStaffPeople === 'function') {
    const __vStaffDL = vStaffPeople;
    vStaffPeople = vStaff = function (el) {
      const r = __vStaffDL.apply(this, arguments);
      try {
        if (!el.querySelector('.dl-card')) el.insertAdjacentHTML('afterbegin', carteDelegation());
        el.querySelectorAll('[data-dl]').forEach(c => c.onchange = () => {
          G.deleg ||= {}; G.deleg[c.dataset.dl] = c.value === 'staff';
          if (c.dataset.dl === 'mercato' && G.cell) G.cell.deleg = c.value === 'staff' ? (el.querySelector('#dlSigne')?.checked ? 'execute' : 'propose') : G.cell.deleg;
          if (c.dataset.dl === 'entrainement' && G.deleg.entrainement) programmeAdjoint(G);
          if (G.deleg[c.dataset.dl]) traiterDelegations(G);
          save(); toast(G.deleg[c.dataset.dl] ? `${TACHES_DELEG[c.dataset.dl].label} : confié à ${nomResponsable(c.dataset.dl)}.` : `${TACHES_DELEG[c.dataset.dl].label} : tu t'en occupes.`);
          vStaff(el);
        });
        el.querySelector('#dlSigne')?.addEventListener('change', e => { if (G.cell) { G.cell.deleg = e.target.checked ? 'execute' : 'propose'; save(); } });
      } catch (e) { console.error(e); }
      return r;
    };
  }
});
function carteDelegation() {
  const n = Object.keys(TACHES_DELEG).filter(delegue).length;
  return `<section class="card dl-card"><div class="dl-head"><h2>Délégation</h2><span class="dl-compte">${n ? `${n} tâche${n > 1 ? 's' : ''} confiée${n > 1 ? 's' : ''}` : 'Tu fais tout toi-même'}</span></div>
    <p class="hint">Confie les tâches répétitives à ton staff. Les décisions déléguées sont traitées en fin de semaine ; la boîte mail indique qui a répondu. Les décisions qui te concernent personnellement restent à toi.</p>
    <div class="tbl-wrap"><table class="tbl compact dl-tbl"><thead><tr><th>Tâche</th><th>Qui s'en charge</th><th>Ce qu'il fait</th></tr></thead><tbody>
    ${Object.entries(TACHES_DELEG).map(([k, t]) => `<tr class="${delegue(k) ? 'on' : ''}"><td><b>${esc(t.label)}</b></td><td><select data-dl="${k}" aria-label="Responsable : ${esc(t.label)}"><option value="moi" ${delegue(k) ? '' : 'selected'}>Moi</option><option value="staff" ${delegue(k) ? 'selected' : ''}>${esc(nomResponsable(k))}</option></select></td><td><small>${esc(t.tip)}</small>${k === 'mercato' && delegue(k) ? `<label class="chk dl-signe"><input type="checkbox" id="dlSigne" ${G.cell?.deleg === 'execute' ? 'checked' : ''}> La cellule peut aussi signer seule dans ton budget</label>` : ''}</td></tr>`).join('')}
    </tbody></table></div></section>`;
}
