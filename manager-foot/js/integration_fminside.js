/* Les données Transfermarkt restent historiques, séparées des statistiques de carrière. */
function appliquerBiographieTransfermarkt(player,source){
  if(source.transfermarkt)player.transfermarkt=JSON.parse(JSON.stringify(source.transfermarkt));
  if(source.transfermarktStatus)player.transfermarktStatus={...source.transfermarktStatus};
  return player;
}
function estLibreDocumente(source){
  const status=source.transfermarktStatus?.status;
  return status!=='retired' && status!=='contracted' && (source.freeAgentSnapshot===true || status==='free');
}
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
    if (!candidats.length && (source.freeAgentSnapshot===true || source.transfermarktStatus))continue;
    if (!candidats.length && (clubs.length !== 1 || source.sourceGender !== 'male')) { bilan.ignores++; continue; }
    const converti = convertirJoueur(source, 99);
    let p = candidats[0];
    if (!p) {
      p = genPlayer(converti.pos, 10, {name:source.name, age:source.age, nat:'UNK', club:clubs[0].id, rep:clubs[0].rep});
      monde.players.push(p); bilan.ajoutes++;
    } else bilan.actualises++;
    p.fmUid = uid; appliquerBiographieTransfermarkt(p,source);
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
  const libres=ajouterJoueursLibresDocumentes(monde,catalogue);bilan.libresAjoutes=libres.ajoutes;bilan.ajoutes+=libres.ajoutes;
  return {monde:libres.monde, bilan};
}

/* Le statut libre doit être attesté par le filtre source, jamais déduit d'un club vide. */
function ajouterJoueursLibresDocumentes(world,catalogue){
  const players=world.players.slice(),known=new Set(players.filter(p=>p.fmUid).map(p=>String(p.fmUid)));
  const nom=s=>String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  let next=Math.max(0,...players.map(p=>+p.id||0))+1,ajoutes=0;
  for(const source of catalogue.players || []){
    const uid=String(source.fmUid || '');
    if(!uid || known.has(uid) || !estLibreDocumente(source) || source.sourceGender!=='male' || Object.keys(source.attributes || {}).length<30)continue;
    if(players.some(p=>!p.fmUid && p.dataQuality!=='generated_filler' && nom(p.name)===nom(source.name)))continue;
    const cv=convertirJoueur(source,99);
    NEXT_PID=Math.max(NEXT_PID,next);
    const p=genPlayer(cv.pos,10,{name:source.name,age:source.age,nat:'UNK',club:null});
    next=p.id+1;p.fmUid=uid;p.club=null;p.contract=0;p.value=0;
    p.attrs={...p.attrs,...cv.attrs};p.attrs0={...p.attrs};p.detail20=cv.detail20;p.foot=cv.foot;
    if(Number.isFinite(source.potential))p.pot=Math.max(playerOvr(p),source.potential);
    p.wage=calcWage(p);p.wageEstimate=true;p.dataQuality='documented_attributes';
    p.sourceProfile={url:source.sourceUrl,database:source.sourceDatabase,freeAgentSnapshot:true,freeAgentCheckedAt:source.freeAgentSnapshotCheckedAt};
    appliquerBiographieTransfermarkt(p,source);players.push(p);known.add(uid);ajoutes++;
  }
  NEXT_PID=Math.max(NEXT_PID,next);
  const monde={...world,players};delete monde.pmap;delete monde._pow;
  return {monde,ajoutes};
}
