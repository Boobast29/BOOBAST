/* Mondes nationaux : plusieurs groupes de D3 restent des choix distincts. */
async function lirePaysMonde(file) {
  const r = await fetch('packs/' + file);
  if (!r.ok) throw Error('Base nationale indisponible');
  if (typeof DecompressionStream === 'undefined') throw Error('Cette base nécessite un navigateur prenant en charge gzip (Chrome, Edge ou Firefox récent).');
  return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).json();
}
function construireCarriereMonde(pays, groupeD3) {
  const comps = pays.competitions.filter(c => c.tier < 3 || c.fmUid === groupeD3).sort((a,b)=>a.tier-b.tier);
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
      return {name:p.name, fmUid:p.fmUid, age:p.age || 24, nat:'UNK',pos:cv.pos,foot:p.foot?cv.foot:undefined,
        attrs, detail20:cv.detail20, pot:p.potential || undefined, wage:p.wageWeekly || undefined};
    })
  }));
  const monde = importDatabase({clubs,leagueNames:comps.map(c=>c.name),cupName:'Coupe nationale · '+pays.label});
  for (const c of monde.clubs) {
    const source=clubs.find(s=>s.name===c.name);if(!source)continue;c.fmUid=source.fmUid;
    const staff=pays.clubs.find(s=>s.fmUid===source.fmUid).staff;
    c.staffReference=staff.map(s=>({fmUid:s.fmUid,name:s.name,role:s.role,sourceUrl:s.sourceUrl}));
  }
  for (const p of monde.players) {
    const info=profils.get(String(p.fmUid));
    p.dataQuality=info ? (info.detailed?'documented_attributes':'estimated_attributes') : 'generated_filler';
    if(info) {
      p.sourceProfile={url:info.source.sourceUrl,database:info.source.sourceDatabase,squad:info.source.squad,contract:info.source.contractEndText};
      if(Number.isFinite(info.source.wageWeekly))p.wage=info.source.wageWeekly;
      if(Number.isFinite(info.source.value))p.value=info.source.value;
    }
  }
  monde.sourceCoverage={country:pays.country,competitions:comps.map(c=>c.fmUid),sourcePlayers:uids.size};
  return monde;
}
async function ouvrirMondeEtendu() {
  const host=document.querySelector('#app');
  host.innerHTML='<section class="card"><h1>Le monde du football</h1><button class="btn" id="meRetour">Retour</button><p id="meEtat">Chargement…</p><label>Pays <select id="mePays"></select></label><label>Groupe de troisième division <select id="meGroupe"></select></label><p id="meBilan"></p><div id="meComps"></div><button class="btn primary" id="meCreer" disabled>Préparer cette base de carrière</button></section>';
  const el=id=>document.getElementById(id);el('meRetour').onclick=startScreen;
  try {
    const r=await fetch('packs/monde-index.json');if(!r.ok)throw Error('Index mondial indisponible');const index=await r.json();
    el('meEtat').textContent=`${index.totals.clubs} clubs · ${index.totals.competitions} compétitions · ${index.totals.players} joueurs · ${index.totals.staff} membres du staff. ${index.notice}`;
    el('mePays').innerHTML=index.countries.map(c=>`<option value="${esc(c.key)}">${esc(c.label)}</option>`).join('');
    let pays, request=0;
    const charger=async()=>{
      const ticket=++request;el('meCreer').disabled=true;el('meBilan').textContent='Chargement du pays…';
      const c=index.countries.find(c=>c.key===el('mePays').value);
      try {
        const result=await lirePaysMonde(c.file);if(ticket!==request)return;pays=result;
        el('meGroupe').innerHTML=pays.competitions.filter(c=>c.tier===3).map(c=>`<option value="${esc(c.fmUid)}">${esc(c.name)}</option>`).join('');
        el('meBilan').textContent=`${c.players} joueurs, dont ${c.detailedPlayers} avec attributs détaillés ; ${c.staff} fiches de staff. ${pays.unresolvedReserveTeams?.length || 0} liens de réserve sans identifiant propre exclus des divisions pour éviter les doublons. Les autres attributs sont estimés pour permettre la simulation. Staff consultable comme référence ; fonctions d’encadrement non attribuées automatiquement.`;
        el('meComps').innerHTML=pays.competitions.map(c=>`<p><b>D${c.tier} · ${esc(c.name)}</b> : ${c.clubs.length} clubs référencés</p>`).join('');el('meCreer').disabled=false;
      }catch(err){if(ticket===request)el('meBilan').textContent=err.message;}
    };
    el('mePays').onchange=charger;
    el('meCreer').onclick=async()=>{
      el('meCreer').disabled=true;
      try {
        const monde=construireCarriereMonde(pays,el('meGroupe').value);
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
