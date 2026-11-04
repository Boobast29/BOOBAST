/* Mondes nationaux : plusieurs groupes de D3 restent des choix distincts. */
function enrichirPaysFMInside(pays,catalogue){
  const byUid=new Map(catalogue.players.map(p=>[String(p.fmUid),p]));
  for(const club of pays.clubs)for(let i=0;i<club.players.length;i++){
    const p=club.players[i],extra=byUid.get(String(p.fmUid));
    if(extra)club.players[i]={...p,...Object.fromEntries(Object.entries(extra).filter(([,v])=>v!=null)),sourceGender:'male'};
  }
  return pays;
}
let catalogueFMInsideMonde,correctifsNomsMonde,portraitsLocauxMonde,portraitsCommonsMonde;
async function lirePaysMonde(file) {
  const r = await fetch('packs/' + file);
  if (!r.ok) throw Error('Base nationale indisponible');
  if (typeof DecompressionStream === 'undefined') throw Error('Cette base nécessite un navigateur prenant en charge gzip (Chrome, Edge ou Firefox récent).');
  const pays=await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).json();
  catalogueFMInsideMonde ||= chargerCatalogueFMInside().catch(err=>{catalogueFMInsideMonde=null;throw err;});
  enrichirPaysFMInside(pays,await catalogueFMInsideMonde);
  correctifsNomsMonde ||= fetch('packs/noms-reels-fmscout.json').then(r=>{if(!r.ok)throw Error('Correctifs de noms indisponibles');return r.json();}).catch(err=>{correctifsNomsMonde=null;throw err;});
  const noms=await correctifsNomsMonde;
  for(const c of pays.clubs){const n=noms.clubs[c.fmUid];if(n){c.previousSourceName=c.name;c.name=n.name;}}
  for(const c of pays.competitions){const n=noms.competitions[c.fmUid];if(n){c.previousSourceName=c.name;c.name=n.name;}}
  // Le pack distingue les portraits locaux des liens externes ; aucun lien n'est inventé.
  portraitsLocauxMonde ||= fetch('packs/portraits-locaux-fmb.json').then(r=>r.ok?r.json():{players:[],external:[]}).then(d=>({local:new Set(d.players.map(String)),external:new Set(d.external.map(String))})).catch(()=>({local:new Set(),external:new Set()}));
  const portraits=await portraitsLocauxMonde;
  portraitsCommonsMonde ||= fetch('packs/portraits-commons-verifies.json').then(r=>r.ok?r.json():{players:{}}).then(d=>d.players).catch(()=>({}));
  const commons=await portraitsCommonsMonde;
  for(const c of pays.clubs)for(const p of c.players){
    const uid=String(p.fmUid), distant=portraits.external.has(uid) ? `https://media.footballmanagerblog.org/faces/${encodeURIComponent(uid)}.webp` : null;
    if(portraits.local.has(uid)){
      p.photo=`/api/catalogue/image/players/${encodeURIComponent(uid)}`;
      p.photoFallbackUrl=distant;
    }else if(distant)p.photo=distant;
    else if(commons[uid] && commons[uid].name===p.name){
      const credit=commons[uid],fichier=encodeURIComponent(credit.file.replaceAll(' ','_'));
      p.photo=`https://commons.wikimedia.org/wiki/Special:FilePath/${fichier}?width=300`;
      p.photoCredit={author:credit.author,license:credit.license,page:`https://commons.wikimedia.org/wiki/File:${fichier}`,note:credit.note||''};
    }else if(/^\d+$/.test(uid)){
      // Adresse candidate : même schéma que les portraits FMB connus. Une erreur affiche les initiales.
      p.photo=`https://media.footballmanagerblog.org/faces/${encodeURIComponent(uid)}.webp`;
      p.photoCandidate=true;
    }
  }
  return pays;
}
function construireCarriereMonde(pays, groupeD3) {
  const comps = pays.competitions.filter(c => groupeD3 === '*' || c.tier < 3 || c.fmUid === groupeD3).sort((a,b)=>a.tier-b.tier);
  const affectations = new Map();
  for (const c of comps) for (const id of c.clubs) {
    if (affectations.has(id)) throw Error('Club présent dans plusieurs divisions');
    affectations.set(id,c.tier);
  }
  const uids = new Set(), profils = new Map();
  const clubs = pays.clubs.filter(c=>affectations.has(c.fmUid)).map(c => ({
    name:c.name, fmUid:c.fmUid, div:affectations.get(c.fmUid), logo:c.logo,
    players:c.players.filter(p=>{
      if (uids.has(p.fmUid)) return false; uids.add(p.fmUid);return true;
    }).map(p=>{
      const detail = p.attributes && Object.keys(p.attributes).length >= 30;
      const cv = detail ? convertirJoueur(p,99) : {pos:POSTE_DE[normCle(String(p.positions||'').split(/[,/;]/)[0])] || 'MC'};
      const niveau = Math.max(1,Math.min(20,Math.round((p.rating || 50)/5)));
      const attrs = detail ? cv.attrs : Object.fromEntries(Object.keys(ATTRS).map(k=>[k,niveau]));
      profils.set(p.fmUid,{source:p, detailed:!!detail});
      return {name:p.name, fmUid:p.fmUid, age:p.age || 24, nat:'UNK',pos:cv.pos,foot:p.foot?cv.foot:undefined,photo:p.photo || undefined,
        attrs, detail20:cv.detail20, pot:p.potential || undefined, wage:p.wageWeekly || undefined};
    })
  }));
  const monde = importDatabase({clubs,leagueNames:comps.map(c=>c.name),cupName:'Coupe nationale · '+pays.label});
  for (const c of monde.clubs) {
    const source=clubs.find(s=>s.name===c.name);if(!source)continue;c.fmUid=source.fmUid;
    const reference=pays.clubs.find(s=>s.fmUid===source.fmUid);
    if(reference.previousSourceName){c.previousSourceName=reference.previousSourceName;c.nameFixVersion='FMScout FM27 v261031';}
    const staff=reference.staff;
    c.staffReference=staff.map(s=>({fmUid:s.fmUid,name:s.name,role:s.role,sourceUrl:s.sourceUrl}));
  }
  for (const p of monde.players) {
    const info=profils.get(String(p.fmUid));
    p.dataQuality=info ? (info.detailed?'documented_attributes':'estimated_attributes') : 'generated_filler';
    if(info) {
      appliquerBiographieTransfermarkt(p,info.source);
      if(info.source.photoFallbackUrl)p.photoFallbackUrl=info.source.photoFallbackUrl;
      if(info.source.photoCredit)p.photoCredit=info.source.photoCredit;
      if(info.source.photoCandidate)p.photoCandidate=true;
      p.sourceProfile={url:info.source.sourceUrl,database:info.source.sourceDatabase,squad:info.source.squad,contract:info.source.contractEndText,
        position:info.source.positions,age:info.source.age,rating:info.source.rating,potential:info.source.potential,
        wageText:info.source.wageSourceText};
      if(Number.isFinite(info.source.wageWeekly))p.wage=info.source.wageWeekly;
      if(Number.isFinite(info.source.value))p.value=info.source.value;
    }
  }
  monde.sourceCoverage={country:pays.country,competitions:comps.map(c=>c.fmUid),sourcePlayers:uids.size};
  return monde;
}
function construireMondeComplet(listePays,catalogueLibres=null) {
  const clubs=[], players=[], seen=new Set(); let nextClub=1,nextPlayer=1;
  const catalogue=[];
  for(const pays of listePays){
    const base=construireCarriereMonde(pays,'*');
    const map=new Map();
    const comps=pays.competitions.slice().sort((a,b)=>a.tier-b.tier);
    for(const original of base.clubs.filter(c=>c.fmUid)){
      const index=comps.findIndex(c=>c.clubs.includes(String(original.fmUid)));
      if(index<0)continue;
      const comp=comps[index], id=nextClub++;map.set(original.id,id);
      clubs.push({...original,id,foreign:false,country:({England:'ENG',France:'FRA',Germany:'GER',Italy:'ITA',Spain:'ESP'})[pays.country],
        worldCountry:pays.country,worldCompetitionUid:comp.fmUid,worldCompetitionName:comp.name,worldTier:comp.tier,worldDivision:index+1,div:index+1});
    }
    for(const p of base.players){
      if(!map.has(p.club))continue;
      if(p.fmUid && seen.has(String(p.fmUid)))continue;
      if(p.fmUid)seen.add(String(p.fmUid));
      players.push({...p,id:nextPlayer++,club:map.get(p.club)});
    }
    catalogue.push({country:pays.country,label:pays.label,competitions:comps});
  }
  const monde={clubs,players,noForeign:true,wagesScaled:true,worldMode:true,worldCountries:catalogue,
    leagueNames:['D1 · tous les pays','D2 · tous les pays','D3 · groupe 1','D3 · groupe 2','D3 · groupe 3'],cupName:'Coupe nationale',
    sourceCoverage:{countries:listePays.map(p=>p.country),sourcePlayers:seen.size,competitions:catalogue.flatMap(c=>c.competitions.map(c=>c.fmUid))}};
  if(catalogueLibres){const result=ajouterJoueursLibresDocumentes(monde,catalogueLibres);result.monde.sourceCoverage.freeAgents=result.ajoutes;return result.monde;}
  return monde;
}
async function ouvrirMondeEtendu() {
  const host=document.querySelector('#app');
  host.innerHTML='<section class="card"><h1>Le monde du football</h1><button class="btn" id="meRetour">Retour</button><p id="meEtat">Chargement…</p><label>Pays <select id="mePays"></select></label><select id="meGroupe" hidden></select><p>Chaque nouvelle carrière charge les cinq pays et tous leurs groupes. Le pays sélectionné sert à consulter la base.</p><p id="meBilan"></p><div id="meComps"></div><button class="btn primary" id="meCreer" disabled>Préparer la carrière · tous les pays</button></section>';
  const el=id=>document.getElementById(id);el('meRetour').onclick=startScreen;
  try {
    const r=await fetch('packs/monde-index.json');if(!r.ok)throw Error('Index mondial indisponible');const index=await r.json();
    el('meEtat').textContent=`${index.totals.clubs} clubs · ${index.totals.competitions} compétitions · ${index.totals.players} joueurs · ${index.totals.staff} membres du staff · ${index.freeAgentsDocumented || 0} joueurs libres documentés. Logos liés à des URL externes : un blason de remplacement s'affiche si le fichier est indisponible. ${index.notice}`;
    el('mePays').innerHTML=index.countries.map(c=>`<option value="${esc(c.key)}">${esc(c.label)}</option>`).join('');
    let pays, request=0;
    const charger=async()=>{
      const ticket=++request;el('meCreer').disabled=true;el('meBilan').textContent='Chargement du pays…';
      const c=index.countries.find(c=>c.key===el('mePays').value);
      try {
        const result=await lirePaysMonde(c.file);if(ticket!==request)return;pays=result;
        el('meGroupe').innerHTML=pays.competitions.filter(c=>c.tier===3).map(c=>`<option value="${esc(c.fmUid)}">${esc(c.name)}</option>`).join('');
        el('meBilan').textContent=`${c.players} joueurs, dont ${c.detailedPlayers} avec attributs détaillés ; ${c.staff} fiches de staff. ${pays.unresolvedReserveTeams?.length || 0} liens de réserve sans identifiant propre exclus des divisions pour éviter les doublons. Les autres attributs sont estimés pour permettre la simulation. Staff consultable comme référence ; fonctions d’encadrement non attribuées automatiquement.`;
        el('meComps').innerHTML=pays.competitions.map(c=>`<p><b>D${c.tier} · ${esc(c.name)}</b> : ${c.clubs.length} clubs référencés · ${pays.clubs.filter(club=>c.clubs.includes(club.fmUid)).flatMap(club=>club.players).filter(p=>p.attributes && Object.keys(p.attributes).length>=30).length} profils avec attributs documentés</p>`).join('');el('meCreer').disabled=false;
      }catch(err){if(ticket===request)el('meBilan').textContent=err.message;}
    };
    el('mePays').onchange=charger;
    el('meCreer').onclick=async()=>{
      el('meCreer').disabled=true;
      try {
        const tousLesPays=await Promise.all(index.countries.map(c=>lirePaysMonde(c.file)));
        const monde=construireMondeComplet(tousLesPays,await chargerCatalogueFMInside());
        await Store.set(DB_KEY,monde);DB=monde;startScreen();toast(`Base préparée : ${monde.clubs.length} clubs, ${monde.sourceCoverage.sourcePlayers} joueurs issus des sources. Choisis ton club.`);
      }catch(err){el('meBilan').textContent=err.message;el('meCreer').disabled=false;}
    };
    await charger();
  }catch(err){el('meEtat').textContent=err.message;}
}
(() => {
  const previous=startScreen;
  startScreen=function(...args){
    const result=previous.apply(this,args),reference=document.querySelector('#btnImp');
    if(reference && !document.querySelector('#btnMondeEtendu')){
      const b=document.createElement('button');b.id='btnMondeEtendu';b.className='btn primary';b.textContent='🌍 Monde : clubs et championnats';b.onclick=ouvrirMondeEtendu;reference.before(b);
    }
    return result;
  };
})();
