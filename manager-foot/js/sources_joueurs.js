/* Origine des qualités initiales : les notes évoluent ensuite dans la carrière. */
(() => {
  const original=playerModal;
  playerModal=function(pid,...args){
    const result=original(pid,...args),p=G && getPlayer(G,pid);
    const box=document.querySelector('#modal .mbox');
    if(!p || !box)return result;
    const source=p.sourceProfile || p.fmInsideSource;
    const kind=p.dataQuality || (p.fmInsideSource?'documented_attributes':null);
    const labels={documented_attributes:'Attributs initiaux documentés',estimated_attributes:'Attributs initiaux estimés pour la simulation',generated_filler:'Joueur fictif de complément'};
    if(!labels[kind])return result;
    const info=document.createElement('div');info.className='card';info.dataset.playerSource='';
    const text=document.createElement('p');text.textContent=labels[kind]+(source?.database?' · '+source.database:'');info.append(text);
    if(source?.freeAgentSnapshot && p.club==null){const note=document.createElement('small');note.textContent='Libre dans la base source FM26. Exigences salariales estimées pour la négociation.';info.append(note);}
    if(kind==='documented_attributes'){
      const note=document.createElement('small');note.textContent='Instantané partiel de la base source. Les autres notes restent calculées par le jeu ; les attributs évoluent avec la progression de cette carrière.';info.append(note);
    }
    if(source?.url && /^https:\/\//.test(source.url)){
      const link=document.createElement('a');link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';link.className='btn';link.textContent='Voir la fiche source';info.append(link);
    }
    if(p.transfermarkt){
      const tm=p.transfermarkt,details=document.createElement('p');
      details.textContent=[tm.birthDate?'Naissance : '+tm.birthDate:null,tm.nationality,tm.heightCm?tm.heightCm+' cm':null,tm.foot?'Pied : '+tm.foot:null,tm.agent?'Agent : '+tm.agent:null].filter(Boolean).join(' · ');info.append(details);
      const history=document.createElement('details'),title=document.createElement('summary');title.textContent='Historique Transfermarkt · export au '+tm.snapshotAsOf;history.append(title);
      const note=document.createElement('p');note.textContent='Compétitions couvertes uniquement. Ces données historiques ne déterminent pas le contrat, la valeur ou les statistiques de cette carrière.';history.append(note);
      for(const [season,stats] of Object.entries(tm.appearancesBySeason || {}).sort().reverse()){
        const row=document.createElement('p');row.textContent=`${season} : ${stats.matches} matchs · ${stats.minutes} minutes · ${stats.goals} buts · ${stats.assists} passes décisives`;history.append(row);
      }
      for(const move of tm.transfers || []){const row=document.createElement('p');row.textContent=`${move.date} : ${move.from} → ${move.to}`;history.append(row);}
      const link=document.createElement('a');link.href=tm.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Fiche Transfermarkt';history.append(link);info.append(history);
    }
    box.append(info);return result;
  };
})();

function actualiserAttributsCarriere(world,catalogue){
  const byUid=new Map(catalogue.players.map(p=>[String(p.fmUid),p]));let count=0;
  const players=world.players.map(p=>{
    const source=p.fmUid && byUid.get(String(p.fmUid));
    if(!source || !source.attributes || Object.keys(source.attributes).length<30)return p;
    if(JSON.stringify(p.transfermarkt)===JSON.stringify(source.transfermarkt) && JSON.stringify(p.transfermarktStatus)===JSON.stringify(source.transfermarktStatus) && p.dataQuality==='documented_attributes' && p.sourceProfile?.url===source.sourceUrl && p.sourceProfile?.database===source.sourceDatabase)return p;
    const cv=convertirJoueur(source,99),attrs={...p.attrs},base={...p.attrs0};
    for(const [key,value] of Object.entries(cv.attrs || {})){
      const delta=(p.attrs[key] || 0)-(p.attrs0?.[key] ?? p.attrs[key] ?? 0);
      base[key]=value;attrs[key]=Math.max(1,Math.min(20,value+delta));
    }
    count++;
    return {...p,transfermarkt:source.transfermarkt,transfermarktStatus:source.transfermarktStatus,attrs,attrs0:base,detail20:cv.detail20,dataQuality:'documented_attributes',
      sourceProfile:{...p.sourceProfile,url:source.sourceUrl,database:source.sourceDatabase,updatedAt:catalogue.retrievedAt}};
  });
  const result={...world,players};delete result.pmap;delete result._pow;
  return {world:result,count};
}
async function enregistrerMiseAJourCarriere(before,after){
  const key=before.slot && typeof slotKey==='function'?slotKey(before.slot):SAVE_KEY;
  const {pmap,...backup}=before;await Store.set(key+'-bak1',backup);await Store.set(key,after);
}
async function proposerMiseAJourAttributs(){
  try{
    const catalogue=await chargerCatalogueFMInside();
    const update=actualiserAttributsCarriere(G,catalogue);
    const libres=ajouterJoueursLibresDocumentes(update.world,catalogue);
    if(!update.count && !libres.ajoutes)return toast('Les fiches disponibles de cette carrière sont déjà à jour.');
    confirmBox(`Actualiser les attributs initiaux de ${update.count} joueurs et ajouter ${libres.ajoutes} joueurs libres documentés ? La progression, les statistiques, les transferts et les contrats de la carrière seront conservés.`,async()=>{
      try{
        const current=actualiserAttributsCarriere(G,catalogue),libres=ajouterJoueursLibresDocumentes(current.world,catalogue);libres.monde.rngState=RNGS.s;
        await enregistrerMiseAJourCarriere(G,libres.monde);G=libres.monde;reindex(G);
        toast(`${current.count} fiches actualisées, ${libres.ajoutes} joueurs libres ajoutés et carrière sauvegardée.`);ouvrirClassementsMonde();
      }catch(err){toast('Mise à jour impossible : '+err.message,'err');}
    },'Actualiser les attributs');
  }catch(err){toast(err.message,'err');}
}
