// ============================================================
//  Radar des progressions (idée de mavarobli/FMSuperScout, MIT : « Growth », sans code repris)
//  Le jeu garde deux photos de la note de chaque joueur : au début de la saison et il y a environ 4 semaines.
//  Stockage compact : une chaîne où le caractère n° id code la note (environ 6 Ko par photo).
//  Statistiques > « Progressions » : plus fortes hausses et baisses du monde (joueurs connus) et de ton effectif.
// ============================================================
function photoNotes(G) {
  const max = G.players.reduce((m, p) => Math.max(m, p.id), 0), a = new Array(max + 1).fill(' ');
  for (const p of G.players) a[p.id] = String.fromCharCode(32 + Math.max(1, Math.min(99, playerOvr(p))));
  return a.join('');
}
function noteDans(photo, id) { const c = photo?.charCodeAt(id); return c && c > 32 ? c - 32 : null; }
function majPhotos(G) {
  G.prog ||= {};
  if (G.prog.saison !== G.season) { G.prog.saison = G.season; G.prog.debut = photoNotes(G); G.prog.mois = G.prog.debut; G.prog.moisSem = G.week; return; }
  if (G.week - (G.prog.moisSem ?? 0) >= 4) { G.prog.mois = G.prog.recent || G.prog.mois; G.prog.recent = photoNotes(G); G.prog.moisSem = G.week; }
}
if (typeof weeklyUpdate === 'function') {
  const __weeklyUpdatePR = weeklyUpdate;
  weeklyUpdate = function (G) { const r = __weeklyUpdatePR.apply(this, arguments); try { if (G.clubId != null) majPhotos(G); } catch (e) { console.error(e); } return r; };
}
let PROG_PERIODE = 'debut';
function variations(G, photo, filtre) {
  const out = [];
  for (const p of G.players) {
    if (!filtre(p)) continue;
    const a = noteDans(photo, p.id); if (a == null) continue;
    const d = playerOvr(p) - a; if (d) out.push({ p, d, a });
  }
  return out.sort((x, y) => y.d - x.d);
}
function blocProgressions(G) {
  if (!G.prog?.debut) return '<p class="muted">Les progressions apparaîtront après la première semaine de jeu.</p>';
  const photo = PROG_PERIODE === 'mois' ? G.prog.mois : G.prog.debut;
  const monde = variations(G, photo, p => p.club !== G.clubId && knows(G, p));
  const miens = variations(G, photo, p => p.club === G.clubId);
  const ligne = ({ p, d, a }) => { const c = p.club != null ? getClub(G, p.club) : null; return `<tr><td class="nm"><a href="#" data-prog="${p.id}">${esc(p.name)}</a></td><td>${p.pos}</td><td>${p.age}</td><td>${c ? esc(c.short || c.name) : 'libre'}</td><td>${a} → ${playerOvr(p)}</td><td class="${d > 0 ? 'pos' : 'neg'}">${d > 0 ? '+' : ''}${d}</td></tr>`; };
  const table = (titre, L) => `<h3>${titre}</h3>${L.length ? `<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Joueur</th><th>Poste</th><th>Âge</th><th>Club</th><th>Note</th><th>Écart</th></tr></thead><tbody>${L.map(ligne).join('')}</tbody></table></div>` : '<p class="muted">Aucune variation.</p>'}`;
  return `<div class="row gap wrap"><label>Depuis <select id="progP"><option value="debut" ${PROG_PERIODE === 'debut' ? 'selected' : ''}>le début de la saison</option><option value="mois" ${PROG_PERIODE === 'mois' ? 'selected' : ''}>environ 4 semaines</option></select></label></div>
    <div class="grid2">${table('Ton effectif : hausses', miens.filter(x => x.d > 0).slice(0, 10))}${table('Ton effectif : baisses', miens.filter(x => x.d < 0).reverse().slice(0, 10))}</div>
    ${table('Monde : plus fortes hausses (joueurs connus)', monde.filter(x => x.d > 0).slice(0, 15))}
    <p class="hint">Joueurs connus : supervisés par ta cellule de recrutement ou déjà observés. La note bouge avec l'entraînement, l'âge, le temps de jeu et les blessures.</p>`;
}
if (typeof vStats === 'function') {
  const __vStatsPR = vStats;
  vStats = function (el) {
    if (STATS_TAB === 'prog') {
      el.innerHTML = '';
      STATS_TAB = 'leaders'; __vStatsPR.apply(this, arguments); STATS_TAB = 'prog';
      el.querySelectorAll('[data-st]').forEach(b => b.classList.toggle('on', b.dataset.st === 'prog'));
      const corps = el.querySelector('section.card > .mt'); if (corps) corps.innerHTML = blocProgressions(G);
    } else __vStatsPR.apply(this, arguments);
    const tabs = el.querySelector('section.card .tabs');
    if (tabs && !tabs.querySelector('[data-st="prog"]')) tabs.insertAdjacentHTML('beforeend', `<button data-st="prog" class="${STATS_TAB === 'prog' ? 'on' : ''}">Progressions</button>`);
    el.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { STATS_TAB = b.dataset.st; vStats(el); });
    const s = el.querySelector('#progP'); if (s) s.onchange = () => { PROG_PERIODE = s.value; vStats(el); };
    el.querySelectorAll('[data-prog]').forEach(a => a.onclick = e => { e.preventDefault(); playerModal(+a.dataset.prog); });
  };
}
