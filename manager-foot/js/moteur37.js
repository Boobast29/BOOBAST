// ============================================================
//  Moteur de match branché sur les 37 attributs (js/attributs.js)
//  Le moteur lit ses qualités par Match.prototype.ea(joueur, qualité). Cette version renvoie une combinaison
//  d'attributs détaillés qui dépend de l'action en cours (contexte posé par les actions : tir, passe, centre,
//  duel, appel en profondeur…). Les combinaisons sont des moyennes pondérées (même échelle 1-20 que les
//  9 qualités de base), ce qui garde le calibrage du moteur. Désactivable : window.MOTEUR37 = false.
// ============================================================
window.MOTEUR37 = window.MOTEUR37 ?? true;
const COMBO = {
  fin: { _: { finition: .7, sangfroid: .3 }, air: { tete: .7, detente: .3 }, pen: { penalty: .7, sangfroid: .3 }, fk: { cpa: 1 }, loin: { frappe: .75, finition: .25 }, face: { finition: .5, sangfroid: .5 } },
  pas: { _: { passeC: .6, decision: .2, vision: .2 }, long: { passeL: .75, vision: .25 }, fwd: { passeC: .5, vision: .5 }, through: { vision: .6, passeC: .4 }, cross: { centre: .8, passeL: .2 } },
  tec: { _: { controle: .7, passeC: .3 }, cross: { centre: .7, controle: .3 }, fk: { cpa: 1 }, loin: { frappe: .6, controle: .4 }, duel: { controle: .6, equilibre: .4 } },
  dri: { _: { dribble: .6, agilite: .2, equilibre: .2 }, duel: { dribble: .55, agilite: .25, equilibre: .2 } },
  vit: { _: { acceleration: .5, vitesse: .5 }, through: { acceleration: .4, vitesse: .6 }, duel: { acceleration: .7, agilite: .3 } },
  phy: { _: { puissance: .5, equilibre: .3, endurance: .2 }, air: { detente: .5, puissance: .3, courage: .2 }, cross: { detente: .5, puissance: .3, courage: .2 }, long: { puissance: .6, detente: .4 } },
  tac: { _: { tacle: .5, marquage: .3, placement: .2 }, duel: { tacle: .6, agressivite: .2, anticipation: .2 }, air: { marquage: .6, tete: .4 }, cross: { marquage: .6, tete: .4 }, long: { marquage: .5, anticipation: .5 }, fwd: { marquage: .5, anticipation: .5 } },
  men: { _: { decision: .35, sangfroid: .3, concentration: .2, anticipation: .15 }, through: { placement: .5, concentration: .3, anticipation: .2 }, pen: { sangfroid: 1 } },
  gar: { _: { reflexes: .35, plongeon: .3, placementGB: .25, prise: .1 }, air: { sorties: .5, prise: .3, detente: .2 }, cross: { sorties: .5, prise: .3, detente: .2 }, pen: { plongeon: .5, reflexes: .5 } }
};
const __eaM = Match.prototype.ea;
Match.prototype.ea = function (slot, k) {
  if (!window.MOTEUR37 || typeof attributsDetail !== 'function') return __eaM.call(this, slot, k);
  const c = COMBO[k]; if (!c) return __eaM.call(this, slot, k);
  const D = ((this._det ||= {})[slot.id] ||= attributsDetail(this.G.pmap[slot.id]));
  const w = c[this._ctx] || c._;
  let s = 0, t = 0; for (const a in w) { s += (D[a] ?? 10) * w[a]; t += w[a]; }
  let v = s / t;
  // finition d'élite adoucie au-delà de 14/20 : l'avantage reste, mais sans buteurs à 40+ buts par saison
  if (k === 'fin' && this._ctx !== 'pen' && v > 14) v = 14 + (v - 14) * .55;
  return v * (this.mult[slot.id] || 1);
};
// contexte posé par les actions (rétabli en sortie, même en cas d'erreur)
function avecContexte(nom, ctxDe) {
  const orig = Match.prototype[nom]; if (typeof orig !== 'function') return;
  Match.prototype[nom] = function (...a) { const avant = this._ctx; this._ctx = ctxDe.apply(this, a); try { return orig.apply(this, a); } finally { this._ctx = avant; } };
}
avecContexte('pass', (c, kind) => kind === 'long' ? 'long' : kind === 'fwd' ? 'fwd' : '_');
avecContexte('a_through', () => 'through');
avecContexte('cross', () => 'cross');
avecContexte('a_dribble', () => 'duel');
avecContexte('shoot', (c, kind, d, y) => {
  if (kind === 'header') return 'air';
  if (kind === 'pen') return 'pen';
  if (kind === 'fk') return 'fk';
  if (kind === 'oneonone') return 'face';
  return Math.hypot((100 - d) * 1.05, (y - 50) * .68) > 22 ? 'loin' : '_';
});
