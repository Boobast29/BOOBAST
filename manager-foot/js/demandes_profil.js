// ============================================================
//  Demandes de profil de l'entraîneur
//  À chaque ouverture du mercato, l'entraîneur (mode directeur sportif) ou ton adjoint (mode entraîneur) demande un
//  profil précis pour le poste le plus faible : un rôle (renard des surfaces, faux 9, regista, ailier intérieur,
//  stoppeur…) et une ou deux caractéristiques (grand / petit, rapide / puissant, jeune / expérimenté, gaucher).
//  Tu acceptes (il attend une recrue de ce profil avant la fin du mercato) ou tu refuses. Bouton « Chercher ce
//  profil » : la recherche avancée se règle toute seule. Recrue conforme : relation en hausse ; mercato fermé sans
//  recrue conforme : relation en baisse.
//  Tirages à part (withSideRng) : le déroulé des matchs ne change pas.
// ============================================================
const CRITERES = {
  grand: ['grand (1,85 m ou plus)', p => tailleDe(p) >= 185], petit: ['petit et vif (1,76 m au plus)', p => tailleDe(p) <= 176],
  rapide: ['rapide', p => (attributsDetail(p).vitesse ?? 0) >= 15], puissant: ['puissant', p => (attributsDetail(p).puissance ?? 0) >= 15],
  jeune: ['jeune (23 ans au plus)', p => p.age <= 23], exp: ['expérimenté (28 ans ou plus)', p => p.age >= 28], gaucher: ['gaucher', p => /gauche/i.test(p.foot || '')]
};
const CRIT_RA = { grand: null, petit: null, rapide: ['vitesse', 15], puissant: ['puissance', 15], jeune: 'ageMax', exp: 'ageMin', gaucher: 'pied' };
// taille : donnée réelle si connue, sinon estimée selon le poste (stable par joueur)
function tailleDe(p) {
  if (p.height || p.heightTm) return p.height || p.heightTm;
  const base = { GB: 189, DC: 187, DG: 177, DD: 177, MDC: 182, MC: 179, MOC: 176, AG: 175, AD: 175, BU: 182 }[p.pos] || 180;
  return base + ((typeof hashTrait === 'function' ? hashTrait(`taille|${p.id}|${p.name}`) : 0) % 13) - 6;
}
const demandeur = G => (typeof isDS === 'function' && isDS(G) && G.coach && !G.coach.interim) ? { nom: G.coach.name, coach: true } : { nom: G.staffPeople?.assistant?.name || 'Ton adjoint', coach: false };
function posteLePlusFaible(G) {
  const sq = typeof effectifPro === 'function' ? effectifPro(G) : clubPlayers(G, G.clubId);
  const best = r => Math.max(0, ...sq.filter(p => p.pos === r || (COMPAT[r] || []).includes(p.pos)).map(p => playerRoleRating(p, r) * (p.pos === r ? 1 : .92)));
  return ['DC', 'DG', 'DD', 'MDC', 'MC', 'MOC', 'AG', 'AD', 'BU', 'GB'].sort((a, b) => best(a) - best(b))[0];
}
function nouvelleDemande(G) {
  const fen = `${G.season}|${G.week < G.schedule.length / 2 ? 'été' : 'hiver'}`;
  if ((G.demandesProfil || []).some(d => d.fen === fen)) return;
  withSideRng(`${G.seed}|demande|${fen}`, () => {
    const pos = posteLePlusFaible(G), styles = Object.entries(ROLE_STYLES[pos] || {}).filter(([k]) => !['cpress', 'trap', 'waste'].includes(k));
    if (!styles.length) return;
    const [style, s] = pick(styles);
    const possibles = Object.keys(CRITERES).filter(k => !(k === 'gaucher' && !['DG', 'AG', 'MC', 'MOC'].includes(pos)) && !(k === 'petit' && ['GB', 'DC'].includes(pos)) && !(k === 'grand' && ['AG', 'AD', 'MOC'].includes(pos)));
    // demande réalisable : au moins 5 joueurs du monde correspondent, sinon on simplifie ou on change de critère
    const pool = G.players.filter(p => p.club !== G.clubId && !p.academy && (p.pos === pos || (COMPAT[pos] || []).includes(p.pos)));
    const nb = cr => pool.filter(p => cr.every(k => CRITERES[k][1](p))).length;
    let crit = null;
    for (const k of [...possibles].sort(() => rnd() - .5)) { if (nb([k]) >= 5) { crit = [k]; break; } }
    if (!crit) crit = [];
    if (crit.length && rnd() < .5) {
      const c2 = [...possibles].sort(() => rnd() - .5).find(k => k !== crit[0] && !['jeune|exp', 'exp|jeune', 'grand|petit', 'petit|grand'].includes(crit[0] + '|' + k) && nb([...crit, k]) >= 5);
      if (c2) crit.push(c2);
    }
    const qui = demandeur(G);
    const d = { id: 'dp' + G.season + G.week, fen, pos, style, label: s.label, crit, qui: qui.nom, coach: qui.coach, status: 'proposee', avant: (typeof effectifPro === 'function' ? effectifPro(G) : clubPlayers(G, G.clubId)).map(p => p.id) };
    (G.demandesProfil ||= []).push(d);
    const txt = `${s.label.toLowerCase()}${crit.length ? ' ' + crit.map(k => CRITERES[k][0]).join(' et ') : ''}`;
    addDecision(G, { key: 'profil:' + d.id, kind: 'profilDemande', ref: d.id, blocking: false, from: qui.nom, icon: '🎯',
      title: `${qui.coach ? 'L\'entraîneur' : 'Ton adjoint'} veut un ${ROLES[pos].label.toLowerCase()} : ${s.label}`,
      text: `${qui.nom} : « Il nous manque un ${ROLES[pos].label.toLowerCase()} : un ${txt}. Avec ce profil, on gagnerait des matchs. » Recrute-le avant la fin du mercato.` });
  });
}
function profilConforme(d, p) { return (p.pos === d.pos || (COMPAT[d.pos] || []).includes(p.pos)) && d.crit.every(k => CRITERES[k][1](p)); }
function suiviDemandes(G) {
  for (const d of G.demandesProfil || []) {
    if (d.status !== 'acceptee') continue;
    const recrues = (typeof effectifPro === 'function' ? effectifPro(G) : clubPlayers(G, G.clubId)).filter(p => !d.avant.includes(p.id));
    const ok = recrues.find(p => profilConforme(d, p));
    if (ok) {
      d.status = 'reussie'; d.joueur = ok.name;
      if (d.coach && G.coach) G.coach.relation = clamp(G.coach.relation + 8, 0, 100);
      news(G, `🎯 ${d.qui} est ravi : ${ok.name} correspond au ${d.label.toLowerCase()} qu'il réclamait.${d.coach ? ' Votre relation progresse.' : ''}`, 'info');
    } else if (!windowOpen(G) && G.week > 2) {
      d.status = 'echouee';
      if (d.coach && G.coach) G.coach.relation = clamp(G.coach.relation - 6, 0, 100);
      news(G, `🎯 Mercato fermé sans le ${d.label.toLowerCase()} demandé par ${d.qui}.${d.coach ? ' Il est déçu.' : ''}`, 'warn');
    }
  }
}
if (typeof weeklyUpdate === 'function') {
  const __weeklyUpdateDP = weeklyUpdate;
  weeklyUpdate = function (G) {
    const r = __weeklyUpdateDP.apply(this, arguments);
    try { if (G.clubId != null && windowOpen(G)) nouvelleDemande(G); suiviDemandes(G); } catch (e) { console.error(e); }
    return r;
  };
}
// ---------- question et réglage de la recherche ----------
function chercherProfil(d) {
  if (typeof RA === 'undefined') return;
  RA = { ...RA, q: '', postes: [d.pos, ...(COMPAT[d.pos] || []).slice(0, 1)], ageMin: '', ageMax: '', tMin: d.crit.includes('grand') ? '185' : '', tMax: d.crit.includes('petit') ? '176' : '', pied: '', attrs: [['', ''], ['', ''], ['', '']], col: '' };
  let i = 0;
  for (const k of d.crit) {
    const c = CRIT_RA[k];
    if (Array.isArray(c)) RA.attrs[i++] = [c[0], String(c[1])];
    else if (c === 'ageMax') RA.ageMax = '23'; else if (c === 'ageMin') RA.ageMin = '28'; else if (c === 'pied') RA.pied = 'Gauche';
  }
  RA.col = d.crit.includes('rapide') ? 'acceleration' : 'detente';
  TR_TAB = 'search'; closeModal?.(); show('transfers');
}
if (typeof DECISION_OPTS !== 'undefined') DECISION_OPTS.profilDemande = d => [['ok', 'D\'accord, je cherche ce profil', 'primary'], ['chercher', 'D\'accord, et ouvrir la recherche sur ce profil'], ['non', 'Refuser : l\'effectif suffit', 'danger']];
window.addEventListener('load', () => {
  const __decideDP = decide;
  decide = function (id, opt) {
    const q = G.decisions.find(x => x.id === id);
    if (!q || q.done || q.kind !== 'profilDemande') return __decideDP.apply(this, arguments);
    const d = (G.demandesProfil || []).find(x => x.id === q.ref);
    let msg = 'Demande expirée.';
    if (d) {
      if (opt === 'non') { d.status = 'refusee'; if (d.coach && G.coach) G.coach.relation = clamp(G.coach.relation - 4, 0, 100); msg = `${d.qui} prend note de ton refus.`; }
      else { d.status = 'acceptee'; msg = `Profil recherché : ${d.label.toLowerCase()} ${d.crit.map(k => CRITERES[k][0]).join(' et ')}.`; }
    }
    q.done = opt; q.answer = msg; save(); toast(msg);
    if (!$('#top')) return;
    if (d && opt === 'chercher') return chercherProfil(d);
    if (VIEW === 'mail' && !$('#modal')) show('mail'); else renderTop();
  };
});
