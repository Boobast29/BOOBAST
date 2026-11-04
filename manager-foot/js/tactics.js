// ============================================================
//  Tactique avancée : placement libre, rôles détaillés, missions,
//  familiarité tactique, préréglages, marquage individuel.
// ============================================================

// Rôles détaillés par poste. Effets : dd (profondeur), cy (rapprochement de l'axe 0-1),
// w (multiplicateurs de choix d'action), tk (bonus défense), air (bonus jeu aérien), recv (aimant pour les longs ballons)
const ROLE_STYLES = {
  GB: { classic: { label: 'Gardien classique', tip: 'Reste sur sa ligne, relance sûre.', w: { long: .8, safe: 1.2 } },
        sweeper: { label: 'Gardien libéro', tip: 'Joue haut, relance au pied, couvre la profondeur (moins de hors-jeu à défendre).', dd: 6, w: { fwd: 1.3, long: .7 } } },
  DC: { stopper: { label: 'Stoppeur', tip: 'Agressif dans les duels, relance simple.', tk: 1.2, w: { fwd: .8, long: 1.1, safe: 1.1 } },
        ballplay: { label: 'Défenseur relanceur', tip: 'Casse les lignes par la passe.', w: { fwd: 1.35, through: 1.4, long: 1.2 } },
        cover: { label: 'Libéro / couverture', tip: 'Reste derrière, couvre les appels (moins vulnérable en profondeur).', dd: -4, tk: .6, w: { safe: 1.2 } } },
  DG: { def: { label: 'Latéral défensif', tip: 'Reste bas, défend avant tout.', dd: -5, tk: .8, w: { cross: .6, dribble: .7 } },
        wing: { label: 'Latéral offensif', tip: 'Monte sur son couloir et centre.', dd: 8, w: { cross: 1.6, dribble: 1.2, fwd: 1.1 } },
        inv: { label: 'Latéral inversé', tip: 'Rentre dans l\'axe pour créer le surnombre au milieu.', cy: .45, w: { safe: 1.2, fwd: 1.2, cross: .4 } } },
  DD: null,
  MDC: { anchor: { label: 'Sentinelle', tip: 'Protège la défense, récupère.', dd: -4, tk: 1, w: { safe: 1.25, shoot: .5, dribble: .6 } },
         regista: { label: 'Regista', tip: 'Oriente le jeu de loin, passes longues et en profondeur.', w: { through: 1.6, long: 1.4, fwd: 1.2 } },
         destroyer: { label: 'Récupérateur', tip: 'Harcèle le porteur, très actif à la récupération.', tk: 1.4, w: { safe: 1.2 } } },
  MC: { b2b: { label: 'Box-to-box', tip: 'Couvre tout le terrain, tire de loin.', dd: 3, tk: .6, w: { shoot: 1.25, fwd: 1.1 } },
        play: { label: 'Meneur de jeu', tip: 'Cherche la passe décisive.', w: { through: 1.6, fwd: 1.2, dribble: .9 } },
        ball: { label: 'Récupérateur', tip: 'Recule pour défendre et récupérer.', dd: -4, tk: 1, w: { safe: 1.2, shoot: .6 } } },
  MOC: { ten: { label: 'Numéro 10', tip: 'Créateur entre les lignes.', w: { through: 1.5, dribble: 1.2 } },
         shadow: { label: 'Attaquant de l\'ombre', tip: 'Se projette dans la surface et frappe.', dd: 7, w: { shoot: 1.5, fwd: 1.1 } },
         enganche: { label: 'Meneur statique', tip: 'Reste devant la défense adverse et distribue.', dd: -3, w: { through: 1.8, safe: 1.1, shoot: .7 } } },
  AG: { winger: { label: 'Ailier débordant', tip: 'Prend son couloir, dribble et centre.', w: { dribble: 1.4, cross: 1.6, shoot: .8 } },
        inside: { label: 'Ailier intérieur', tip: 'Repique dans l\'axe pour frapper.', cy: .35, w: { shoot: 1.5, dribble: 1.2, cross: .5 } },
        wide: { label: 'Milieu de couloir', tip: 'Aide défensivement sur son côté.', dd: -6, tk: .7, w: { cross: 1.1, dribble: .8 } } },
  AD: null,
  BU: { poacher: { label: 'Renard des surfaces', tip: 'Reste dans la surface, finit les actions.', dd: 4, w: { shoot: 1.35, dribble: .7, safe: .8 } },
        target: { label: 'Pivot', tip: 'Gagne les ballons aériens, remise pour les partenaires.', air: 2, recv: 1.8, w: { safe: 1.3, shoot: .9 } },
        false9: { label: 'Faux 9', tip: 'Décroche pour créer, libère l\'espace.', dd: -9, w: { through: 1.5, fwd: 1.2, shoot: .75 } },
        pressing: { label: 'Attaquant de pressing', tip: 'Presse la relance adverse (fatigue plus).', tk: .8, press: 1, w: { shoot: 1.05 } } }
};
ROLE_STYLES.DD = ROLE_STYLES.DG; ROLE_STYLES.AD = ROLE_STYLES.AG;
const DUTIES = { '-1': { label: 'Défense', dd: -6, w: { shoot: .75, dribble: .8, fwd: .9, safe: 1.15 } }, '0': { label: 'Soutien' }, '1': { label: 'Attaque', dd: 6, w: { shoot: 1.2, fwd: 1.1, through: 1.1, safe: .85 } } };
const EXTRA_INST = {
  cpress: { label: 'Contre-pressing', opts: ['Non', 'Oui'], tip: 'Juste après une perte de balle, presse immédiatement pour la récupérer. Plus de fatigue.' },
  trap: { label: 'Piège du hors-jeu', opts: ['Non', 'Oui'], tip: 'La défense monte d\'un bloc : plus de hors-jeu adverses, mais une passe réussie amène souvent un face-à-face.' },
  waste: { label: 'Gagner du temps', opts: ['Non', 'Oui'], tip: 'Quand tu mènes : rythme cassé, moins d\'actions… et risque de jaune.' }
};

// Rôle d'une position libre (coordonnées du terrain : x 0-100 gauche→droite, y 0 = but adverse, 100 = notre but)
function roleAt(x, y, isGK) {
  if (isGK) return 'GB';
  const wide = x < 24 || x > 76, left = x < 50;
  if (y >= 66) return wide ? (left ? 'DG' : 'DD') : 'DC';
  if (y >= 54) return wide ? (left ? 'DG' : 'DD') : 'MDC';
  if (y >= 40) return wide ? (left ? 'AG' : 'AD') : 'MC';
  if (y >= 25) return wide ? (left ? 'AG' : 'AD') : 'MOC';
  return wide ? (left ? 'AG' : 'AD') : 'BU';
}
function slotPos(tac, i) {
  const f = FORMATIONS[tac.formation][i] || ['MC', 50, 50];
  const c = tac.pos?.[i];
  return c ? { x: c[0], y: c[1] } : { x: f[1], y: f[2] };
}
function slotRole(tac, i) {
  if (i === 0) return 'GB';
  if (!tac.pos?.[i]) return FORMATIONS[tac.formation][i]?.[0] || 'MC';
  const p = slotPos(tac, i);
  return roleAt(p.x, p.y, false);
}
function defaultStyle(role) { return Object.keys(ROLE_STYLES[role] || {})[0] || null; }
function slotStyle(tac, i, role) {
  const s = tac.styles?.[i];
  return s && ROLE_STYLES[role]?.[s] ? s : defaultStyle(role);
}
// modificateurs combinés rôle + mission pour un emplacement
function slotMods(tac, i, role) {
  const st = ROLE_STYLES[role]?.[slotStyle(tac, i, role)] || {};
  const du = DUTIES[String(tac.duties?.[i] ?? 0)] || {};
  const w = {};
  for (const k of ['shoot', 'cross', 'through', 'dribble', 'fwd', 'safe', 'long']) w[k] = (st.w?.[k] ?? 1) * (du.w?.[k] ?? 1);
  return { dd: (st.dd || 0) + (du.dd || 0), cy: st.cy || 0, w, tk: st.tk || 0, air: st.air || 0, recv: st.recv || 1, press: st.press || 0, style: slotStyle(tac, i, role), duty: tac.duties?.[i] ?? 0 };
}

// Familiarité tactique (0-100) : progresse en jouant/entraînant un système
function tacFam(G, formation) { return G.tacFam?.[formation] ?? 40; }
function growTacFam(G, played, focusTactics) {
  G.tacFam ||= {};
  for (const f of Object.keys(FORMATIONS)) {
    const cur = G.tacFam[f] ?? 40;
    if (f === played) G.tacFam[f] = clamp(cur + (focusTactics ? 7 : 4), 0, 100);
    else G.tacFam[f] = clamp(cur - .6, 25, 100);
  }
}

// Réaffecte les joueurs sur une nouvelle formation (meilleur ajustement)
function remapLineup(G, ids, formation, tac = null) {
  const slots = FORMATIONS[formation];
  const left = ids.filter(Boolean);
  const out = new Array(slots.length).fill(null);
  const roleOf = i => tac ? slotRole({ ...tac, formation }, i) : slots[i][0];
  slots.forEach((_, i) => { const r = roleOf(i); const j = left.findIndex(id => getPlayer(G, id).pos === r); if (j >= 0) out[i] = left.splice(j, 1)[0]; });
  slots.forEach((_, i) => {
    if (out[i] || !left.length) return;
    const r = roleOf(i); let bj = 0, bv = -1;
    left.forEach((id, j) => { const v = effRating(getPlayer(G, id), r); if (v > bv) { bv = v; bj = j; } });
    out[i] = left.splice(bj, 1)[0];
  });
  return out;
}

function newPreset(tac, name) {
  return { name, formation: tac.formation, mentality: tac.mentality, inst: { ...tac.inst }, pos: JSON.parse(JSON.stringify(tac.pos || {})), styles: { ...(tac.styles || {}) }, duties: { ...(tac.duties || {}) } };
}
function applyPreset(G, pr) {
  const T = G.tactics;
  const ids = T.lineup.slice();
  T.formation = pr.formation; T.mentality = pr.mentality; T.inst = { ...defaultInst(), ...pr.inst };
  T.pos = JSON.parse(JSON.stringify(pr.pos || {})); T.styles = { ...(pr.styles || {}) }; T.duties = { ...(pr.duties || {}) };
  T.lineup = remapLineup(G, ids, pr.formation, T);
}
