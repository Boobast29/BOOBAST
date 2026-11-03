// ============================================================
//  Visages des joueurs réels sans photo
//  - Plus de pastille à initiales : un visage dessiné est généré pour chaque joueur réel sans photo, stable (tiré de son
//    identité, sans toucher au hasard du jeu) et cohérent avec sa nationalité (teinte par région : js/visages_regions.js),
//    son âge (calvitie, cheveux gris) ; signalé « Visage généré (pas de photo) ».
//  - Portraits générés par IA (outils/generer_visages_ia.py, sur ton PC) : affichés comme des photos et signalés
//    « Visage généré par IA » sur la fiche ; une vraie photo reste toujours prioritaire.
// ============================================================
function visageGenere(p) {
  if (p._vg) return p._vg;
  const h = k => (typeof hashTrait === 'function' ? hashTrait(`${k}|${p.srcId || p.id}|${p.name}`) : 0) >>> 0;
  const skin = (typeof teintePour === 'function' ? teintePour(p) : null) ?? h('skin') % 6;
  const age = p.age ?? 26;
  const chauve = (h('chauve') % 100) < (age >= 34 ? 30 : age >= 30 ? 12 : 4);
  const gris = age >= 36 && (h('gris') % 100) < (age - 33) * 12;
  const couleurs = skin >= 3 ? [0, 0, 0, 1, 1, 2] : [0, 1, 1, 2, 2, 3, 4];
  return p._vg = { skin, hair: chauve ? 0 : 1 + h('coupe') % 6, hairCol: gris ? 5 : couleurs[h('teinte-ch') % couleurs.length], beard: (h('barbe') % 100) < 30 ? 1 + h('barbe2') % 2 : 0 };
}
window.addEventListener('load', () => {
  if (typeof initialsSVG === 'function' && typeof faceSVG === 'function') {
    initialsSVG = function (p, size = 40) {
      const club = p.club != null && typeof clubOf === 'function' ? clubOf(p.club, typeof world === 'function' ? world() : undefined) : null;
      const svg = faceSVG({ ...p, face: visageGenere(p) }, size, club ? club.colors : ['#555', '#999']);
      return `<span class="vg" title="Visage généré (pas de photo)">${svg}</span>`;
    };
  }
  // monde réel : drapeau « portrait IA » transmis par le scénario
  if (typeof buildRealWorld === 'function') {
    const __buildRealWorldVG = buildRealWorld;
    buildRealWorld = function (scn) {
      const W = __buildRealWorldVG.apply(this, arguments);
      const ia = new Set(scn.players.filter(x => x.photoIA).map(x => x.srcId));
      if (ia.size) for (const p of W.players) if (ia.has(p.srcId)) p.photoIA = true;
      return W;
    };
  }
  if (typeof playerModal === 'function') {
    const __playerModalVG = playerModal;
    playerModal = function (pid) {
      const r = __playerModalVG.apply(this, arguments);
      try {
        const p = getPlayer(G, pid);
        const ph = document.querySelector('#modal h2') || document.querySelector('#modal .ph, #modal .vg');
        if (p && ph && !document.querySelector('#modal .vg-note')) {
          const t = p.photo && p.photoIA ? 'Visage généré par IA' : !p.photo && (p.srcId || p.real) ? 'Visage généré (pas de photo)' : '';
          if (t) ph.insertAdjacentHTML(ph.tagName === 'H2' ? 'beforeend' : 'afterend', ` <small class="vg-note">${t}</small>`);
        }
      } catch (e) { console.error(e); }
      return r;
    };
  }
});
