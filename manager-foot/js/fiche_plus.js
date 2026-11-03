// ============================================================
//  Fiche joueur affinée par le scouting, rôles, terrain des postes ; effectifs de jeunes réalistes
//  - Connaissance du joueur (0-100 %) : tes joueurs 100 % ; sinon d'après les rapports de ta cellule (nombre de
//    rapports, précision, ancienneté). Plus elle monte, plus les fourchettes d'attributs se resserrent, jusqu'à la
//    valeur exacte. Bouton « Le faire superviser ».
//  - Meilleurs rôles (regista, faux 9, renard des surfaces, ailier intérieur, stoppeur…) calculés sur ses attributs.
//  - Mini-terrain des postes (vert : naturel, jaune : possible, gris : hors poste) et bandeau d'infos clés.
//  - Effectifs de jeunes ramenés à des tailles réelles à la création : réserve 20, U19 20, U17 18 (les moins bons
//    sont retirés du monde) — avant : jusqu'à 40 U19 et 40 U17 dans un club.
// ============================================================
function connaissance(G, p) {
  if (p.club === G.clubId || p.loan?.from === G.clubId) return 100;
  const k = typeof knowOf === 'function' ? knowOf(G, p) : ((G.known || []).includes(p.id) ? { err: 1 } : null);
  if (!k) return 0;
  return Math.round(clamp(100 - (k.err || 0) * 11, 8, 100));
}
// demi-largeur de la fourchette d'un attribut (sur 20) : 4 sans information, 0 quand le joueur est bien connu
function largeurFourchette(p) {
  const c = connaissance(G, p);
  if (c <= 0) return Math.max(2, 4 - Math.floor((G?.staff?.scout || 2) / 3));
  return clamp(Math.round((100 - c) / 22), 1, 4);
}
function meilleursRoles(p, n = 4) {
  if (typeof notePosteContexte !== 'function' || typeof ROLE_STYLES === 'undefined') return [];
  const D = attributsDetail(p), out = [];
  const postes = [p.pos, ...(COMPAT[p.pos] || [])].filter(x => ROLE_STYLES[x]);
  for (const poste of postes) for (const [style, s] of Object.entries(ROLE_STYLES[poste])) {
    const { n20 } = notePosteContexte(p, { poste, style, devoir: 0, equipe: false }, D);
    out.push({ poste, label: s.label, n: Math.round(n20 * 5) });
  }
  return out.sort((a, b) => b.n - a.n).filter((x, i, a) => a.findIndex(y => y.label === x.label) === i).slice(0, n);
}
const XY_POSTE = { GB: [50, 90], DC: [50, 74], DG: [16, 70], DD: [84, 70], MDC: [50, 60], MC: [50, 47], MOC: [50, 34], AG: [16, 28], AD: [84, 28], BU: [50, 14] };
function terrainPostes(p) {
  const pts = Object.entries(XY_POSTE).map(([r, [x, y]]) => {
    const f = r === p.pos ? 1 : typeof facteurPoste === 'function' ? facteurPoste(p, r) : (COMPAT[p.pos] || []).includes(r) ? .92 : .5;
    const cls = f >= .96 ? 'tp-nat' : f >= .88 ? 'tp-bon' : f >= .78 ? 'tp-ok' : 'tp-non';
    return `<g class="${cls}"><circle cx="${x}" cy="${y}" r="${f >= .96 ? 8.5 : 7.5}"><title>${r} — ${ROLES[r].label}</title></circle><text x="${x}" y="${y + 2.4}" text-anchor="middle">${r}</text></g>`;
  }).join('');
  return `<svg class="tp" viewBox="0 0 100 104" role="img" aria-label="Postes du joueur"><rect x="2" y="2" width="96" height="100" rx="3" class="tp-herbe"/><line x1="2" y1="52" x2="98" y2="52"/><circle cx="50" cy="52" r="10"/><rect x="28" y="2" width="44" height="14"/><rect x="28" y="88" width="44" height="14"/>${pts}</svg>`;
}
function bandeauFiche(p) {
  const c = connaissance(G, p), mine = p.club === G.clubId;
  const taille = p.height || p.heightTm;
  const roles = meilleursRoles(p);
  const sansNote = G.prefs?.noteMasquee;
  return `<section class="fp" data-bloc="fp"><div class="fp-haut">${terrainPostes(p)}<div class="fp-faits">
      <div><small>Âge</small><b>${p.age} ans</b></div>${taille ? `<div><small>Taille</small><b>${taille} cm</b></div>` : ''}
      <div><small>Pied</small><b>${esc(p.foot || '—')}</b></div><div><small>Valeur</small><b>${money(p.value)}</b></div>
      <div><small>Salaire</small><b>${wageM(p.wage)}</b></div><div><small>Contrat</small><b>${p.club != null ? 'juin ' + (G.season + (p.contract || 0)) : 'libre'}</b></div></div></div>
    ${roles.length ? `<div class="fp-roles"><small>Meilleurs rôles</small>${roles.map((r, i) => `<span class="${i === 0 ? 'top' : ''}">${esc(r.label)}${sansNote || c < 70 ? '' : ` <i>${r.n}</i>`}</span>`).join('')}</div>` : ''}
    ${mine ? '' : `<div class="fp-conn"><small>Connaissance du joueur</small><span class="fp-barre"><i style="width:${c}%"></i></span><b>${c} %</b>
      <span class="fp-aide">${c >= 70 ? 'Attributs exacts.' : c > 0 ? `Fourchettes de ±${largeurFourchette(p)} : un nouveau rapport les resserre.` : 'Jamais observé : fourchettes larges.'}</span>
      ${c < 100 && (typeof scoutPlayer === 'function' || typeof ouvrirMission === 'function') ? `<button class="btn sm" id="fpScout">Le faire superviser</button>` : ''}</div>`}</section>`;
}
window.addEventListener('load', () => {
  if (typeof playerModal !== 'function') return;
  const __playerModalFP = playerModal;
  playerModal = function (pid, tab = 'profil') {
    const r = __playerModalFP.apply(this, arguments);
    try {
      const p = getPlayer(G, pid), side = document.querySelector('#modal .pmf-side');
      if (p && side && !side.querySelector('.fp')) {
        side.insertAdjacentHTML('afterbegin', bandeauFiche(p));
        document.querySelector('#fpScout')?.addEventListener('click', () => { try { scoutPlayer(p.id); } catch (e) { toast('Passe par la cellule de recrutement pour le faire superviser.', 'err'); } });
      }
    } catch (e) { console.error(e); }
    return r;
  };
});

// ---------- effectifs de jeunes réalistes ----------
const TAILLE_EQUIPE = { reserve: 20, u19: 20, u17: 18 };
function reduireJeunes(G) {
  const retirer = new Set();
  for (const c of G.clubs) {
    const sq = G.players.filter(p => p.club === c.id);
    const groupes = { reserve: sq.filter(p => p.reserve && !p.academy), u19: sq.filter(p => p.academy && p.age >= 17), u17: sq.filter(p => p.academy && p.age <= 16) };
    for (const [k, L] of Object.entries(groupes)) {
      if (L.length <= TAILLE_EQUIPE[k]) continue;
      L.sort((a, b) => (b.pot + playerOvr(b)) - (a.pot + playerOvr(a))).slice(TAILLE_EQUIPE[k]).forEach(p => retirer.add(p.id));
    }
  }
  if (retirer.size) { G.players = G.players.filter(p => !retirer.has(p.id)); if (typeof reindex === 'function') reindex(G); }
  return retirer.size;
}
if (typeof newGame === 'function') {
  const __newGameFP = newGame;
  newGame = function () { const g = __newGameFP.apply(this, arguments); try { reduireJeunes(g); } catch (e) { console.error(e); } return g; };
}
