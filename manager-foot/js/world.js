// ============================================================
//  Médical (blessures détaillées, rechutes, reprise anticipée)
//  et météo (effets sur le match et l'affluence)
// ============================================================

// [nom, zone, jours min, jours max, type, fréquence]
const INJURIES = [
  ['Contusion', 'jambe', 2, 7, 'contact', 22],
  ['Coup sur le pied', 'pied', 3, 9, 'contact', 10],
  ['Entorse de la cheville', 'cheville', 10, 35, 'contact', 12],
  ['Entorse du genou', 'genou', 14, 42, 'contact', 5],
  ['Lésion du ménisque', 'genou', 35, 70, 'contact', 2.5],
  ['Rupture du ligament croisé', 'genou', 180, 270, 'contact', 1.1],
  ['Fracture du métatarse', 'pied', 42, 84, 'contact', 1.4],
  ['Fracture de la clavicule', 'épaule', 35, 56, 'contact', 1],
  ['Commotion cérébrale', 'tête', 7, 14, 'contact', 2],
  ['Élongation des ischio-jambiers', 'cuisse', 7, 18, 'muscle', 16],
  ['Déchirure des ischio-jambiers', 'cuisse', 28, 56, 'muscle', 5],
  ['Lésion au mollet', 'mollet', 10, 28, 'muscle', 9],
  ['Contracture aux adducteurs', 'aine', 5, 14, 'muscle', 10],
  ['Déchirure du quadriceps', 'cuisse', 21, 42, 'muscle', 3],
  ['Rupture du tendon d\'Achille', 'cheville', 180, 300, 'muscle', .5],
  ['Pubalgie', 'aine', 21, 70, 'overuse', 3],
  ['Tendinite rotulienne', 'genou', 14, 35, 'overuse', 4],
  ['Lumbago', 'dos', 4, 12, 'overuse', 4],
  ['Fracture de fatigue', 'pied', 42, 70, 'overuse', 1],
  ['Virus / état grippal', 'malade', 3, 8, 'illness', 6]
];
const PART_COMM = {
  jambe: '{P} reste au sol après un choc…', pied: '{P} grimace, il a pris un coup sur le pied.', cheville: '{P} se tord la cheville !',
  genou: '{P} reste au sol en se tenant le genou… inquiétant.', épaule: '{P} chute lourdement sur l\'épaule.', tête: 'Choc de têtes ! {P} est sonné.',
  cuisse: '{P} se tient l\'arrière de la cuisse… claquage ?', mollet: '{P} s\'arrête net, la main sur le mollet.', aine: '{P} ressent une douleur à l\'aine.',
  dos: '{P} se tient le dos.', malade: '{P} ne se sent pas bien.'
};

function fmtDays(d) {
  if (d <= 0) return '-';
  if (d < 14) return Math.ceil(d) + ' j';
  if (d < 60) return Math.round(d / 7) + ' sem.';
  return Math.round(d / 30) + ' mois';
}
function injuryRiskMult(G, p) {
  let m = (p.frag || 8) / 8;
  if (p.age >= 30) m *= 1 + (p.age - 29) * .06;
  if (p.returnRisk > 0) m *= p.rushed ? 3 : 1.8;
  return m;
}
function sampleInjury(G, p, kind) {
  const recent = (p.injHist || []).filter(h => (G.season - h.season) * 60 + (G.week - h.week) < 25);
  const pool = INJURIES.filter(i => kind === 'contact' ? i[4] === 'contact' : kind === 'muscle' ? i[4] === 'muscle' : i[4] !== 'contact');
  let inj = null, recur = false;
  if (recent.length && rnd() < .45) {
    const prev = INJURIES.find(i => i[0] === recent[recent.length - 1].name);
    if (prev && pool.includes(prev)) { inj = prev; recur = true; }
  }
  inj ||= weighted(pool, i => i[5]);
  let days = rint(inj[2], inj[3]) * (recur ? 1.25 : 1);
  if (p.club === G.clubId) days *= 1.25 - .07 * (G.staff?.physio || 2) - .05 * (G.fac?.medical || 2);
  return { name: inj[0], part: inj[1], kind: inj[4], days: Math.max(1, Math.round(days)), total: Math.max(1, Math.round(days)), recur };
}
function applyInjury(G, p, inj) {
  if (p.injury > 0 && p.injury >= inj.days) return;
  p.injury = inj.days; p.inj = inj; p.injNew = true; p.rushed = false;
  p.injHist = [...(p.injHist || []), { name: inj.name, part: inj.part, days: inj.days, season: G.season, week: G.week }].slice(-15);
  if (inj.days >= 60) p.morale = clamp(p.morale - 15, 5, 100);
  if (p.club === G.clubId) {
    (G.medLog ||= []).push({ pid: p.id, name: inj.name, days: inj.days, season: G.season, week: G.week });
    const remainingWeeks = (G.schedule?.length || 50) - G.week;
    const seasonOver = inj.days / 7 > remainingWeeks * .8;
    if (inj.days > 4) news(G, `🏥 Diagnostic : ${p.name} — ${inj.name.toLowerCase()}${inj.recur ? ' (rechute)' : ''}. Indisponible ${fmtDays(inj.days)}.${seasonOver ? ' Sa saison est terminée.' : ''}`, 'inj');
  }
}
// avance le temps médical (jours)
function tickMedical(G, p, days) {
  if (p.injury > 0) {
    if (p.injNew) { p.injNew = false; days = Math.max(0, days - 3); }
    p.injury -= days;
    if (p.injury <= 0) {
      const total = p.inj?.total || 0;
      p.injury = 0; p.fit = Math.min(p.fit, total > 20 ? 55 : 70);
      p.returnRisk = total >= 28 ? 4 : 2;
      if (total >= 120) {
        const n = rint(1, 2);
        for (let i = 0; i < n; i++) bumpAttr(p, -1, ['vit', 'phy']);
        if (p.club === G.clubId) news(G, `${p.name} est de retour après ${fmtDays(total)} d'absence, mais a perdu un peu de vitesse/physique.`, 'info');
      } else if (p.club === G.clubId && total > 10) news(G, `✅ ${p.name} est rétabli (${p.inj?.name?.toLowerCase() || 'blessure'}). Il doit retrouver le rythme.`, 'info');
      delete p.inj;
    }
  } else if (p.returnRisk > 0) { p.returnRisk--; if (!p.returnRisk) p.rushed = false; }
}
// blessures à l'entraînement / maladies (semaine complète)
function trainingInjuries(G, p) {
  if (p.injury > 0 || p.club == null) return;
  const mine = p.club === G.clubId;
  const tr = G.training || { intensity: 1, focus: 'equilibre' };
  let base = .0024;
  if (mine) base *= [.5, 1, 1.7][tr.intensity] * (tr.focus === 'physique' ? 1.3 : tr.focus === 'repos' ? .4 : 1) * (1.25 - .06 * (G.staff?.physio || 2) - .04 * (G.fac?.medical || 2));
  if (p.fit < 70) base *= 1.5;
  if (rnd() < base * injuryRiskMult(G, p)) applyInjury(G, p, sampleInjury(G, p, 'training'));
}
function canRushBack(p) { return p.injury > 0 && p.injury <= 12 && p.inj && p.inj.total < 60 && !p.rushed; }
function rushBack(G, p) {
  p.injury = 0; p.fit = Math.min(p.fit, 66); p.returnRisk = 5; p.rushed = true; p.morale = clamp(p.morale + 4, 5, 100);
  news(G, `💉 ${p.name} reprend plus tôt que prévu (infiltration). Risque de rechute élevé pendant quelques semaines.`, 'inj');
  delete p.inj;
}

// ---------- Météo ----------
const WEATHER = {
  sun: { label: 'Ensoleillé', icon: '☀️', att: .02 },
  heat: { label: 'Canicule', icon: '🥵', att: -.04, fatigue: 1.3, muscle: 1.3 },
  cloud: { label: 'Nuageux', icon: '☁️', att: 0 },
  rain: { label: 'Pluie', icon: '🌧️', att: -.07, fouls: 1.15, shot: .95, long: 1.15, contact: 1.15 },
  storm: { label: 'Orage', icon: '⛈️', att: -.12, fouls: 1.2, shot: .9, long: 1.1, contact: 1.2, fatigue: 1.05 },
  wind: { label: 'Vent violent', icon: '💨', att: -.03, long: .7, cross: .85 },
  cold: { label: 'Froid glacial', icon: '🥶', att: -.06, muscle: 1.35 },
  snow: { label: 'Neige', icon: '🌨️', att: -.15, fouls: 1.1, shot: .9, muscle: 1.2, fatigue: 1.1 }
};
function pickWeather(date) {
  const m = date.getMonth();
  const table = m >= 5 && m <= 8 ? { sun: 5, heat: 3, cloud: 3, storm: 1 }
    : m === 9 || m === 10 || m === 3 || m === 4 ? { sun: 3, cloud: 4, rain: 4, wind: 2, storm: .5 }
    : { cloud: 3, rain: 3, wind: 2, cold: 3, snow: 1.5 };
  const key = weighted(Object.keys(table), k => table[k]);
  const baseT = [3, 5, 9, 13, 17, 22, 26, 26, 21, 15, 9, 4][m];
  const temp = Math.round(baseT + gauss() * 3 + (key === 'heat' ? 8 : key === 'cold' || key === 'snow' ? -6 : 0));
  return { key, temp, ...WEATHER[key] };
}
