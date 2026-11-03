// ============================================================
//  Entente du staff
//  - Chaque membre du staff a une philosophie et un caractère (tirés de son nom : stables, sans toucher au hasard du jeu).
//  - Chaque paire a une entente (0-100) : base selon la compatibilité, puis évolution chaque semaine
//    (résultats, ancienneté commune, conflits, réunions). Chaque membre a aussi une relation avec toi.
//  - Effets réels (ton club, chaque semaine de championnat) : récupération physique et moral des joueurs
//    selon la cohésion du staff ; une paire en conflit fait remonter une question dans la messagerie.
//  Aucun appel à rnd() : le déroulé des matchs et du mercato reste identique à cohésion égale.
// ============================================================
const STAFF_PHILO = ['Formation des jeunes', 'Résultats immédiats', 'Données et vidéo', 'Discipline', 'Jeu offensif'];
const STAFF_CARAC = ['Diplomate', 'Exigeant', 'Charismatique', 'Discret', 'Ombrageux'];
const PHILO_CONFLIT = { 'Formation des jeunes|Résultats immédiats': -16, 'Discipline|Jeu offensif': -10, 'Données et vidéo|Discipline': -6, 'Données et vidéo|Résultats immédiats': 6, 'Formation des jeunes|Jeu offensif': 6 };
const CARAC_EFFET = { Diplomate: 9, Discret: 4, Charismatique: 0, Exigeant: -3, Ombrageux: -11 };

function hashStaff(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function profilStaff(x) {
  if (!x) return null;
  const h = hashStaff(x.name || '?');
  x.philo ||= STAFF_PHILO[h % STAFF_PHILO.length];
  x.carac ||= STAFF_CARAC[(h >>> 8) % STAFF_CARAC.length];
  x.rel ??= 55 + ((h >>> 16) % 15);
  return x;
}
// Membres : staff technique (+ entraîneur principal en mode directeur sportif)
function membresStaff(G) {
  const sp = G.staffPeople || {}, out = [];
  if (typeof isDS === 'function' && isDS(G) && G.coach) out.push({ k: 'head', label: 'Entraîneur principal', x: G.coach });
  for (const k of Object.keys(STAFF)) if (sp[k]) out.push({ k, label: STAFF[k].label, x: sp[k] });
  out.forEach(m => profilStaff(m.x));
  return out;
}
function baseEntente(a, b) {
  let v = 56;
  if (a.philo === b.philo) v += 14;
  v += PHILO_CONFLIT[a.philo + '|' + b.philo] ?? PHILO_CONFLIT[b.philo + '|' + a.philo] ?? 0;
  v += (CARAC_EFFET[a.carac] + CARAC_EFFET[b.carac]) / 2;
  if (a.carac === b.carac && ['Exigeant', 'Charismatique', 'Ombrageux'].includes(a.carac)) v -= 8; // deux ego du même type
  v += (hashStaff(a.name + '|' + b.name) % 11) - 5;
  return clamp(Math.round(v), 5, 95);
}
// État des paires : { 'k1|k2': { v, n: 'nomA|nomB' } } ; une paire se réinitialise quand un membre change
function ententeStaff(G) {
  const M = membresStaff(G), B = (G.staffBond ||= {}), paires = [];
  for (let i = 0; i < M.length; i++) for (let j = i + 1; j < M.length; j++) {
    const a = M[i], b = M[j], key = a.k + '|' + b.k, n = a.x.name + '|' + b.x.name;
    if (!B[key] || B[key].n !== n) B[key] = { v: baseEntente(a.x, b.x), n };
    paires.push({ key, a, b, v: B[key].v });
  }
  const coh = paires.length ? paires.reduce((s, p) => s + p.v, 0) / paires.length : 55;
  return { M, paires, coh, mod: clamp((coh - 55) / 35, -1, 1) };
}
// relation avec toi : l'entraîneur principal (mode directeur sportif) garde sa propre jauge « relation »
const relStaff = x => x.relation ?? x.rel ?? 60;
const ajRelStaff = (x, d) => { if (x.relation != null) x.relation = clamp(x.relation + d, 0, 100); else x.rel = clamp((x.rel ?? 60) + d, 0, 100); };
const motEntente = v => v >= 80 ? 'Excellente' : v >= 65 ? 'Bonne' : v >= 45 ? 'Correcte' : v >= 30 ? 'Tendue' : 'Conflit';
const classeEntente = v => v >= 80 ? 'e5' : v >= 65 ? 'e4' : v >= 45 ? 'e3' : v >= 30 ? 'e2' : 'e1';

// ---------- évolution hebdomadaire (semaines de championnat) ----------
function semaineStaff(G) {
  if (!G.staffPeople) return;
  const E = ententeStaff(G), B = G.staffBond;
  const f = typeof weekFixtures === 'function' ? weekFixtures(G).find(x => (x.h === G.clubId || x.a === G.clubId) && x.res) : null;
  const res = f ? Math.sign((f.h === G.clubId ? 1 : -1) * (f.res[0] - f.res[1])) : 0; // 1 victoire, -1 défaite
  for (const p of E.paires) {
    const base = baseEntente(p.a.x, p.b.x);
    let d = (base - p.v) * .04 + (res > 0 ? .6 : res < 0 ? -.8 : 0) + .1; // retour lent vers la compatibilité, résultats, ancienneté commune
    B[p.key].v = clamp(p.v + d, 0, 100);
  }
  for (const m of E.M) if (m.k !== 'head') m.x.rel = clamp((m.x.rel ?? 60) + (res > 0 ? .5 : res < 0 ? -.6 : 0) + (60 - (m.x.rel ?? 60)) * .02, 0, 100);
  // effets sur les joueurs : coordination préparation / soins / adjoint
  const E2 = ententeStaff(G);
  for (const p of clubPlayers(G, G.clubId)) {
    if (p.inj) continue;
    p.fit = clamp(p.fit + 1.6 * E2.mod, 0, 100);
    p.morale = clamp(p.morale + .45 * E2.mod, 5, 100);
  }
  G.staffCoh = { week: G.week, season: G.season, v: E2.coh };
  // conflit ouvert : une question dans la messagerie (au plus une toutes les 6 semaines)
  const pire = [...E2.paires].sort((a, b) => a.v - b.v)[0];
  const dernier = G.staffClashWeek ?? -99, abs = G.season * 100 + G.week;
  if (pire && pire.v < 28 && abs - dernier >= 6 && typeof addDecision === 'function') {
    G.staffClashWeek = abs;
    addDecision(G, { key: 'staffClash:' + pire.key + ':' + abs, kind: 'staffClash', ref: pire.key, blocking: false, from: pire.a.x.name, icon: '⚡',
      title: `Tension dans le staff : ${pire.a.x.name} et ${pire.b.x.name}`,
      text: `${pire.a.x.name} (${pire.a.label.toLowerCase()}, ${pire.a.x.philo.toLowerCase()}) ne supporte plus les méthodes de ${pire.b.x.name} (${pire.b.label.toLowerCase()}, ${pire.b.x.philo.toLowerCase()}). Les séances s'en ressentent : la cohésion du staff est à ${Math.round(E2.coh)} / 100.` });
  }
  const top = [...E2.paires].sort((a, b) => b.v - a.v)[0];
  if (top && top.v >= 88 && !G.staffDuo?.[top.key] && typeof news === 'function') {
    (G.staffDuo ||= {})[top.key] = 1;
    news(G, `🤝 ${top.a.x.name} et ${top.b.x.name} travaillent main dans la main : le staff gagne en efficacité.`, 'info');
  }
}
if (typeof weeklyUpdate === 'function') {
  const __weeklyUpdateES = weeklyUpdate;
  weeklyUpdate = function (G, full = true) {
    const r = __weeklyUpdateES.apply(this, arguments);
    if (full) try { semaineStaff(G); } catch (e) { console.error(e); }
    return r;
  };
}

// ---------- question « tension dans le staff » ----------
if (typeof DECISION_OPTS !== 'undefined') DECISION_OPTS.staffClash = d => {
  const E = ententeStaff(G), p = E.paires.find(x => x.key === d.ref);
  const a = p?.a.x.name || 'le premier', b = p?.b.x.name || 'le second';
  return [['meet', 'Organiser une réunion de conciliation (entente +18)', 'primary'], ['a', `Donner raison à ${a} (${b} vexé)`], ['b', `Donner raison à ${b} (${a} vexé)`], ['let', 'Laisser faire (la tension peut durer)', 'danger']];
};
window.addEventListener('load', () => {
  const __decideES = decide;
  decide = function (id, opt) {
    const d = G.decisions.find(x => x.id === id);
    if (!d || d.done || d.kind !== 'staffClash') return __decideES.apply(this, arguments);
    const E = ententeStaff(G), p = E.paires.find(x => x.key === d.ref), B = G.staffBond;
    let msg = 'Le staff a changé entre-temps.';
    if (p) {
      const A = p.a.x, Bx = p.b.x;
      if (opt === 'meet') { B[p.key].v = clamp(p.v + 18, 0, 100); ajRelStaff(A, 2); ajRelStaff(Bx, 2); msg = `Réunion tenue : ${A.name} et ${Bx.name} acceptent de travailler ensemble.`; }
      else if (opt === 'a' || opt === 'b') {
        const [g, l] = opt === 'a' ? [A, Bx] : [Bx, A];
        B[p.key].v = clamp(p.v + 6, 0, 100); ajRelStaff(g, 10); ajRelStaff(l, -16);
        msg = `${g.name} se sent soutenu. ${l.name} le prend mal : sa relation avec toi baisse.`;
      } else { B[p.key].v = clamp(p.v - 6, 0, 100); msg = `Tu laisses faire : la tension entre ${A.name} et ${Bx.name} s'installe.`; }
    }
    d.done = opt; d.answer = msg;
    news(G, `⚡ ${d.title} — ${msg}`, 'info');
    save(); toast(msg);
    if (!$('#top')) return; if (VIEW === 'mail' && !$('#modal')) show('mail'); else if (typeof renderTop === 'function') renderTop();
  };
});

// ---------- écran Staff : carte « Entente du staff » ----------
function carteEntente(G) {
  const E = ententeStaff(G);
  const pct = v => `<span class="es-v ${classeEntente(v)}">${Math.round(v)}</span>`;
  const effet = Math.abs(E.mod) < .05 ? 'aucun effet notable (staff dans la moyenne)' : `récupération ${E.mod > 0 ? '+' : '−'}${Math.abs(1.6 * E.mod).toFixed(1).replace('.', ',')} pt/semaine · moral ${E.mod > 0 ? '+' : '−'}${Math.abs(.45 * E.mod).toFixed(1).replace('.', ',')} pt/semaine`;
  const tri = [...E.paires].sort((a, b) => a.v - b.v);
  return `<section class="card es">
    <div class="es-tete"><div class="es-jauge ${classeEntente(E.coh)}" style="--n:${E.coh / 100}"><b>${Math.round(E.coh)}</b></div>
      <div><h2>Entente du staff : ${motEntente(E.coh).toLowerCase()}</h2><p class="muted">Effet sur l'effectif : ${effet}. Victoires, ancienneté commune et réunions rapprochent ; défaites et profils opposés éloignent.</p></div></div>
    <div class="es-grille">
      <div><h3>Les membres</h3><ul class="es-membres">${E.M.map(m => `<li><b>${esc(m.x.name)}</b><small>${esc(m.label)}</small><span class="es-tags"><i>${esc(m.x.philo)}</i><i>${esc(m.x.carac)}</i></span><span class="es-rel">Relation avec toi ${pct(relStaff(m.x))}</span></li>`).join('')}</ul></div>
      <div><h3>Les binômes <small class="muted">du plus tendu au plus soudé</small></h3><ul class="es-paires">${tri.map(p => `<li><span>${esc(p.a.x.name)} <em>·</em> ${esc(p.b.x.name)}</span><span class="es-barre"><i class="${classeEntente(p.v)}" style="width:${Math.round(p.v)}%"></i></span>${pct(p.v)}<small>${motEntente(p.v)}</small></li>`).join('')}</ul></div>
    </div>
    <p class="hint">Recruter un membre au profil proche du reste du staff (même philosophie, caractère diplomate ou discret) améliore l'entente. Un conflit ouvert (entente sous 28) remonte comme question dans la messagerie.</p></section>`;
}
if (typeof vStaffPeople === 'function') {
  const __vStaffPeopleES = vStaffPeople;
  vStaffPeople = vStaff = function (el) {
    const r = __vStaffPeopleES.apply(this, arguments);
    try { if (el.isConnected && G.staffPeople) el.insertAdjacentHTML('afterbegin', carteEntente(G)); } catch (e) { console.error(e); }
    // candidats : compatibilité avec le staff actuel
    try {
      const marquer = () => el.querySelectorAll('#stList [data-hire]').forEach(b => {
        const x = G.staffMarket?.list.find(s => s.id === b.dataset.hire); if (!x || b.dataset.es) return; b.dataset.es = 1;
        const cand = profilStaff({ name: x.name }), autres = membresStaff(G).filter(m => m.k !== x.role);
        const v = autres.length ? autres.reduce((s, m) => s + baseEntente(cand, m.x), 0) / autres.length : 55;
        b.closest('tr').children[2].insertAdjacentHTML('beforeend', `<br><small class="muted">${esc(cand.philo)} · ${esc(cand.carac)}</small><br><small>Entente prévue <span class="es-v ${classeEntente(v)}">${Math.round(v)}</span></small>`);
      });
      marquer();
      el.querySelectorAll('#stTabs button').forEach(b => b.addEventListener('click', marquer));
    } catch (e) { console.error(e); }
    return r;
  };
}
