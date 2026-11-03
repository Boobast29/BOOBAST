// ============================================================
//  Note de poste selon le rôle, la consigne et les consignes d'équipe ; couleurs des notes
//  - Chaque rôle de poste (consignes individuelles de js/tactics.js : Stoppeur, Défenseur relanceur, Renard, Pivot,
//    Faux 9…), chaque devoir (Défense / Soutien / Attaque) et chaque consigne d'équipe (pressing, tempo, passes,
//    largeur, ligne) déplace le poids des attributs détaillés. La note de poste et les attributs clés en dépendent.
//  - Fiche joueur : choix du poste, du rôle et du devoir, avec ou sans les consignes de ton équipe ; recalcul en direct.
//  - Couleurs : 7 paliers, du rouge (1-4) au cyan (19-20).
//  Affichage et aide à la décision uniquement : le moteur de match lit toujours ses propres combinaisons (js/moteur37.js).
// ============================================================
const BONUS_ROLE = {
  GB: { classic: ['reflexes', 'plongeon', 'placementGB', 'prise'], sweeper: ['jeuPied', 'acceleration', 'anticipation', 'decision', 'passeC'] },
  DC: { stopper: ['tacle', 'agressivite', 'courage', 'puissance', 'tete'], ballplay: ['passeC', 'passeL', 'sangfroid', 'vision', 'controle'], cover: ['anticipation', 'placement', 'vitesse', 'concentration'] },
  DG: { def: ['tacle', 'marquage', 'placement', 'concentration'], wing: ['centre', 'endurance', 'vitesse', 'dribble', 'volume'], inv: ['passeC', 'decision', 'vision', 'collectif', 'controle'] },
  MDC: { anchor: ['placement', 'anticipation', 'concentration', 'tacle'], regista: ['passeL', 'vision', 'sangfroid', 'passeC'], destroyer: ['tacle', 'agressivite', 'endurance', 'volume'] },
  MC: { b2b: ['endurance', 'volume', 'frappe', 'tacle'], play: ['vision', 'passeC', 'decision', 'controle'], ball: ['tacle', 'anticipation', 'placement', 'agressivite'] },
  MOC: { ten: ['vision', 'controle', 'dribble', 'passeC'], shadow: ['finition', 'placement', 'acceleration', 'sangfroid'], enganche: ['vision', 'passeC', 'sangfroid', 'controle'] },
  AG: { winger: ['centre', 'dribble', 'vitesse', 'acceleration'], inside: ['finition', 'frappe', 'dribble', 'agilite'], wide: ['endurance', 'volume', 'tacle', 'centre'] },
  BU: { poacher: ['finition', 'placement', 'sangfroid', 'acceleration'], target: ['tete', 'puissance', 'detente', 'controle'], false9: ['vision', 'passeC', 'controle', 'decision'], pressing: ['endurance', 'volume', 'agressivite', 'acceleration'] }
};
BONUS_ROLE.DD = BONUS_ROLE.DG; BONUS_ROLE.AD = BONUS_ROLE.AG;
const BONUS_DEVOIR = { '-1': ['tacle', 'marquage', 'placement', 'concentration'], '0': [], '1': ['finition', 'acceleration', 'dribble', 'frappe'] };
const BONUS_EQUIPE = {
  press: { 1: ['endurance', 'volume', 'agressivite', 'acceleration'], '-1': ['placement', 'concentration', 'anticipation'] },
  tempo: { 1: ['decision', 'controle', 'acceleration'], '-1': ['sangfroid', 'passeC'] },
  pass: { '-1': ['passeC', 'sangfroid', 'controle', 'collectif'], 1: ['passeL', 'vitesse', 'frappe', 'detente'] },
  width: { 1: ['centre', 'vitesse', 'endurance'], '-1': ['passeC', 'controle', 'agilite'] },
  line: { 1: ['vitesse', 'acceleration', 'anticipation'], '-1': ['tete', 'placement', 'concentration', 'puissance'] }
};
const PAS_BONUS = .07; // poids ajouté à chaque attribut mis en avant, avant normalisation
const LIGNE_POSTE = p => ({ GB: 'G', DC: 'D', DG: 'D', DD: 'D', MDC: 'M', MC: 'M', MOC: 'M', AG: 'A', AD: 'A', BU: 'A' }[p] || 'M');

function poidsContexte(poste, style, devoir = 0, inst = null) {
  const w = { ...(POIDS_POSTE[poste] || POIDS_POSTE.MC) };
  const add = (k, f = 1) => { if (poste !== 'GB' && ['reflexes', 'plongeon', 'prise', 'placementGB', 'jeuPied'].includes(k)) return; w[k] = (w[k] || 0) + PAS_BONUS * f; };
  for (const k of BONUS_ROLE[poste]?.[style] || []) add(k, 1.3);
  if (poste !== 'GB') for (const k of BONUS_DEVOIR[String(devoir)] || []) add(k, .8);
  if (inst && poste !== 'GB') for (const [cle, val] of Object.entries(inst)) {
    const b = BONUS_EQUIPE[cle]?.[String(Math.sign(val))]; if (!b) continue;
    // les consignes d'équipe pèsent plus sur la ligne concernée (ligne défensive → défenseurs, largeur → couloirs…)
    const f = cle === 'line' ? (LIGNE_POSTE(poste) === 'D' ? 1 : .4) : cle === 'width' ? (['DG', 'DD', 'AG', 'AD'].includes(poste) ? 1 : .4) : .7;
    for (const k of b) add(k, f);
  }
  const t = Object.values(w).reduce((a, b) => a + b, 0);
  for (const k in w) w[k] /= t;
  return w;
}
function notePosteContexte(p, ctx, D = attributsDetail(p)) {
  const w = poidsContexte(ctx.poste, ctx.style, ctx.devoir, ctx.equipe ? ctx.inst : null);
  let s = 0; for (const [k, x] of Object.entries(w)) s += (D[k] ?? 10) * x;
  return { n20: typeof horsSpecialite === 'function' ? horsSpecialite(p, ctx.poste, s) : s, w };
}
function contexteParDefaut(p) {
  const T = G?.tactics, mine = p.club === G?.clubId, i = mine && T?.lineup ? T.lineup.indexOf(p.id) : -1;
  const poste = i >= 0 && typeof slotRole === 'function' ? slotRole(T, i) : p.pos;
  const style = i >= 0 && typeof slotStyle === 'function' ? slotStyle(T, i, poste) : Object.keys(BONUS_ROLE[poste] || {})[0];
  return { poste, style, devoir: i >= 0 ? (T.duties?.[i] ?? 0) : 0, equipe: mine, inst: T?.inst || {}, titulaire: i >= 0 };
}

// ---------- couleurs : 7 paliers ----------
couleurAttr = v => v >= 19 ? 'n7' : v >= 17 ? 'n6' : v >= 15 ? 'n5' : v >= 12 ? 'n4' : v >= 9 ? 'n3' : v >= 5 ? 'n2' : 'n1';

// ---------- fiche joueur ----------
function brancherNoteContexte(p) {
  const sec = document.querySelector('#modal .attr36'); if (!sec || sec.querySelector('.nr-ctrl')) return;
  const connu = typeof knows !== 'function' || knows(G, p);
  const ctx = contexteParDefaut(p);
  const opts = (o, v) => Object.entries(o).map(([k, l]) => `<option value="${k}" ${String(k) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('');
  const rolesDe = poste => Object.fromEntries(Object.entries(ROLE_STYLES[poste] || {}).map(([k, s]) => [k, s.label]));
  const tete = sec.querySelector('.a36-tete');
  tete.insertAdjacentHTML('afterend', `<div class="nr-ctrl">
    <label>Poste <select id="nrPoste">${opts(Object.fromEntries(Object.keys(ROLES).map(r => [r, `${r} · ${ROLES[r].label}`])), ctx.poste)}</select></label>
    <label>Rôle <select id="nrStyle">${opts(rolesDe(ctx.poste), ctx.style)}</select></label>
    <label>Devoir <select id="nrDevoir">${opts({ '-1': 'Défense', 0: 'Soutien', 1: 'Attaque' }, ctx.devoir)}</select></label>
    ${p.club === G.clubId ? `<label class="chk"><input type="checkbox" id="nrEquipe" ${ctx.equipe ? 'checked' : ''}> Consignes de mon équipe</label>` : ''}
    <small class="muted" id="nrInfo">${ctx.titulaire ? 'Réglage actuel de ta tactique.' : 'Réglage par défaut du poste.'}</small></div>`);
  const D = attributsDetail(p);
  const maj = () => {
    ctx.poste = $('#nrPoste').value;
    const st = $('#nrStyle'); if (!ROLE_STYLES[ctx.poste]?.[st.value]) { st.innerHTML = opts(rolesDe(ctx.poste), Object.keys(rolesDe(ctx.poste))[0]); }
    ctx.style = st.value; ctx.devoir = +$('#nrDevoir').value; ctx.equipe = !!$('#nrEquipe')?.checked;
    const { n20, w } = notePosteContexte(p, ctx, D);
    const base = notePoste(p, ctx.poste, D), ecart = Math.round(n20 * 5) - Math.round(base * 5);
    const ring = sec.querySelector('.a36-note'); ring.style.setProperty('--n', n20 / 20);
    ring.querySelector('b').textContent = connu ? Math.round(n20 * 5) : '?';
    const titre = sec.querySelector('.a36-tete > div:nth-child(2) b');
    if (titre) titre.textContent = `Note au poste : ${ROLES[ctx.poste].label} · ${ROLE_STYLES[ctx.poste]?.[ctx.style]?.label || ''}`;
    const sous = sec.querySelector('.a36-tete > div:nth-child(2) small');
    if (sous) sous.textContent = connu ? `${(n20).toFixed(1).replace('.', ',')} sur 20 · ${ecart === 0 ? 'identique à la note de poste de base' : `${ecart > 0 ? '+' : ''}${ecart} par rapport au poste de base`}` : 'Supervise le joueur pour connaître la note exacte.';
    const tri = Object.entries(w).sort((a, b) => b[1] - a[1]), seuil = tri[Math.min(9, tri.length - 1)][1];
    sec.querySelectorAll('.a36-l[data-k]').forEach(l => {
      const k = l.dataset.k, x = w[k] || 0, cle = x >= seuil && x > 0;
      l.classList.toggle('cle', cle);
      let badge = l.querySelector('.nr-w'); if (!badge) { badge = document.createElement('i'); badge.className = 'nr-w'; l.querySelector('span').after(badge); }
      badge.textContent = cle ? Math.round(x * 100) + ' %' : '';
    });
  };
  sec.querySelectorAll('.nr-ctrl select, .nr-ctrl input').forEach(e => e.onchange = maj);
  maj();
}
if (typeof playerModal === 'function') {
  const __playerModalNR = playerModal;
  playerModal = function (pid, tab = 'profil') {
    const r = __playerModalNR.apply(this, arguments);
    if (tab === 'profil') { const p = getPlayer(G, pid); if (p) try { brancherNoteContexte(p); } catch (e) { console.error(e); } }
    return r;
  };
}
