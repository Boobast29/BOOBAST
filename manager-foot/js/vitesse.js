// ============================================================
//  Vitesse de simulation (monde étendu : ~1 000 clubs, ~40 000 joueurs)
//  - getClub : index id → position, vérifié à chaque lecture (un club ajouté, retiré ou déplacé reconstruit l'index).
//  - clubPower (matchs rapides entre clubs étrangers) : calculé pour tous les clubs en un seul passage sur les
//    joueurs, une fois par semaine, au lieu d'un passage complet par club. Corrige aussi la clé de cache, qui ne
//    tenait pas compte de la saison et grossissait la sauvegarde.
//  - save : les sauvegardes demandées dans la même action (plusieurs décisions d'un coup) sont regroupées en une seule.
// ============================================================
(() => {
  let ix = { arr: null, len: -1, m: null };
  getClub = function (G, id) {
    const a = G.clubs;
    if (ix.arr !== a || ix.len !== a.length) ix = { arr: a, len: a.length, m: new Map(a.map((c, i) => [c.id, i])) };
    const i = ix.m.get(id), c = i != null ? a[i] : undefined;
    if (c && c.id === id) return c;
    const f = a.find(x => x.id === id);
    if (f) ix.len = -1; // index périmé : reconstruit à la prochaine lecture
    return f;
  };
})();
if (typeof clubPower === 'function') {
  clubPower = function (G, id) {
    const w = G.season * 100 + G.week;
    if (!G._powW || G._powW.w !== w) {
      const par = new Map();
      for (const p of G.players) { if (p.club == null || !available(p)) continue; let l = par.get(p.club); if (!l) par.set(p.club, l = []); l.push(playerOvr(p)); }
      const v = {};
      for (const [cid, l] of par) { const top = l.sort((a, b) => b - a).slice(0, 11); v[cid] = top.reduce((s, x) => s + x, 0) / top.length - (11 - top.length) * 3; }
      G._powW = { w, v }; delete G._pow;
    }
    return G._powW.v[id] ?? 50;
  };
}
if (typeof save === 'function') {
  const __saveV = save;
  let enCours = null;
  save = function () {
    if (enCours) return enCours;
    return enCours = new Promise((res, rej) => setTimeout(() => { enCours = null; Promise.resolve(__saveV()).then(res, rej); }, 0));
  };
}
