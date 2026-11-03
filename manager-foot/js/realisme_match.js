// ============================================================
//  Réalisme des matchs : le football reste incertain
//  Mesuré avant (ligue 1, une saison) : champion à 101 pts, dernier à 17, 21 % de nuls, 12 % de matchs à 4 buts
//  d'écart ou plus, corrélation réputation / classement 0,90. Cibles réelles (grands championnats) : champion
//  85-92 pts, dernier 22-30, nuls 24-28 %, écarts de 4+ buts ~5 %, corrélation ~0,7.
//  - Forme du jour : chaque équipe a un jour avec ou sans (±), tiré du match lui-même (pas de rnd()).
//  - Écart de niveau resserré : les qualités sont rapprochées de la moyenne (un 18 reste meilleur qu'un 12, mais
//    ne gagne pas à coup sûr chaque duel).
//  - Petit contre gros : l'équipe la plus forte voit ses occasions un peu moins converties, la plus faible un peu plus
//    (−14 % / +14 % par tranche de 10 points d'écart de niveau moyen).
//  - Gestion du score : l'équipe qui mène de 2 buts ou plus gère (moins d'occasions franches), celle qui perd pousse.
//  Réglages : REALISME_MATCH (désactivable : REALISME_MATCH.actif = false).
// ============================================================
const REALISME_MATCH = { actif: true, resserre: .92, egal: .14, centre: 11.5, forme: .07, gere2: .78, gere3: .62, pousse: 1.08 };
function hashMatch(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }
const __eaRM = Match.prototype.ea;
Match.prototype.ea = function (slot, k) {
  const v = __eaRM.call(this, slot, k);
  if (!REALISME_MATCH.actif || k === 'gar') return v;
  const R = REALISME_MATCH;
  if (!this._forme) {
    const cle = `${this.G.seed}|${this.G.season}|${this.G.week}|${this.f?.h}|${this.f?.a}`;
    // somme de deux tirages : la plupart des jours sont normaux, quelques-uns très bons ou très mauvais
    this._forme = [0, 1].map(i => 1 + ((hashMatch(cle + '|a' + i) + hashMatch(cle + '|b' + i)) - 1) * R.forme * 1.6);
  }
  const side = this.pr[slot.id]?.side ?? 0;
  return (R.centre + (v - R.centre) * R.resserre) * this._forme[side];
};
const __shootRM = Match.prototype.shoot;
Match.prototype.shoot = function (c, ...rest) {
  if (!REALISME_MATCH.actif) return __shootRM.call(this, c, ...rest);
  const side = this.pr[c.id]?.side ?? 0, d = this.score[side] - this.score[1 - side], R = REALISME_MATCH;
  // petit contre gros : l'écart de talent se convertit moins que linéairement en occasions (bloc bas, motivation, gestion)
  this._force ||= this.sides.map(s => { const xs = s.onPitch.filter(x => x.role !== 'GB').map(x => playerRoleRating(getPlayer(this.G, x.id), x.role) || 50); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 60; });
  const ecart = clamp((this._force[side] - this._force[1 - side]) / 10, -2.2, 2.2);
  const f = (d >= 3 ? R.gere3 : d >= 2 ? R.gere2 : d <= -1 && this.minute >= 60 ? R.pousse : 1) * (1 - ecart * R.egal);
  if (Math.abs(f - 1) < .005) return __shootRM.call(this, c, ...rest);
  const avant = this.cal;
  this.cal = [0, 1].map(i => (avant ? avant[i] : 1) * (i === side ? f : 1));
  try { return __shootRM.call(this, c, ...rest); } finally { this.cal = avant; }
};
