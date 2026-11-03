/* Fusion dans la base des nouvelles carrières, par UID et club reconnu. */
function preparerFusionFMInside(base, catalogue) {
  const monde = JSON.parse(JSON.stringify(base));
  const normal = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const aliases = {psg:'parissaintgermain',parissg:'parissaintgermain',manutd:'manchesterunited',mancity:'manchestercity',rmadrid:'realmadrid',fcbayern:'bayernmunich',bayernmunchen:'bayernmunich',fcbayernmunchen:'bayernmunich'};
  const cleClub = n => aliases[normal(n)] || normal(n);
  const bilan = {ajoutes:0, actualises:0, ignores:0, ambigus:0};
  const sourcesVues = new Set();
  const maxId = Math.max(0, ...monde.players.map(p => +p.id || 0));
  NEXT_PID = Math.max(NEXT_PID, maxId + 1);
  for (const source of catalogue.players || []) {
    const uid = String(source.fmUid || '');
    if (!uid || sourcesVues.has(uid)) { bilan.ignores++; continue; }
    sourcesVues.add(uid);
    const clubs = monde.clubs.filter(c => cleClub(c.name) === cleClub(source.club));
    const parUid = monde.players.filter(p => String(p.fmUid || '') === uid);
    // Un homonyme sans UID n'est rapproché que dans le club source reconnu.
    const candidats = parUid.length ? parUid : clubs.length === 1 ? monde.players.filter(p => !p.fmUid && p.club === clubs[0].id && normal(p.name) === normal(source.name)) : [];
    if (candidats.length > 1 || (!candidats.length && clubs.length > 1)) { bilan.ambigus++; continue; }
    if (!candidats.length && (clubs.length !== 1 || source.sourceGender !== 'male')) { bilan.ignores++; continue; }
    const converti = convertirJoueur(source, 99);
    let p = candidats[0];
    if (!p) {
      p = genPlayer(converti.pos, 10, {name:source.name, age:source.age, nat:'UNK', club:clubs[0].id, rep:clubs[0].rep});
      monde.players.push(p); bilan.ajoutes++;
    } else bilan.actualises++;
    p.fmUid = uid;
    p.attrs = {...p.attrs, ...converti.attrs}; p.attrs0 = {...p.attrs};
    p.detail20 = converti.detail20;
    p.pos = converti.pos; p.foot = converti.foot;
    if (Number.isFinite(source.age)) p.age = source.age;
    if (Number.isFinite(source.potential)) p.pot = Math.max(playerOvr(p), source.potential);
    // Le moteur stocke les salaires hebdomadaires et affiche le mensuel.
    if (Number.isFinite(source.wageWeekly) && source.wageWeekly >= 0) p.wage = source.wageWeekly;
    p.value = Number.isFinite(source.value) ? source.value : calcValue(p);
    p.fmInsideSource = {url:source.sourceUrl, database:source.sourceDatabase, contractEnd:source.contractEndText, importedAt:catalogue.retrievedAt};
  }
  return {monde, bilan};
}
