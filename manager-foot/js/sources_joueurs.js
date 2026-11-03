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
    if(kind==='documented_attributes'){
      const note=document.createElement('small');note.textContent='Instantané partiel de la base source. Les autres notes restent calculées par le jeu ; les attributs évoluent avec la progression de cette carrière.';info.append(note);
    }
    if(source?.url && /^https:\/\//.test(source.url)){
      const link=document.createElement('a');link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';link.className='btn';link.textContent='Voir la fiche source';info.append(link);
    }
    box.append(info);return result;
  };
})();

function actualiserAttributsCarriere(world,catalogue){
  const byUid=new Map(catalogue.players.map(p=>[String(p.fmUid),p]));let count=0;
  const players=world.players.map(p=>{
    const source=p.fmUid && byUid.get(String(p.fmUid));
    if(!source || !source.attributes || Object.keys(source.attributes).length<30)return p;
    if(p.dataQuality==='documented_attributes' && p.sourceProfile?.url===source.sourceUrl && p.sourceProfile?.database===source.sourceDatabase)return p;
    const cv=convertirJoueur(source,99),attrs={...p.attrs},base={...p.attrs0};
    for(const [key,value] of Object.entries(cv.attrs || {})){
      const delta=(p.attrs[key] || 0)-(p.attrs0?.[key] ?? p.attrs[key] ?? 0);
      base[key]=value;attrs[key]=Math.max(1,Math.min(20,value+delta));
    }
    count++;
    return {...p,attrs,attrs0:base,detail20:cv.detail20,dataQuality:'documented_attributes',
      sourceProfile:{...p.sourceProfile,url:source.sourceUrl,database:source.sourceDatabase,updatedAt:catalogue.retrievedAt}};
  });
  const result={...world,players};delete result.pmap;delete result._pow;
  return {world:result,count};
}
async function proposerMiseAJourAttributs(){
  try{
    const response=await fetch('packs/fminside-fm26.json.gz');if(!response.ok)throw Error('Fiches indisponibles');
    const catalogue=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();
    const update=actualiserAttributsCarriere(G,catalogue);
    if(!update.count)return toast('Les fiches disponibles de cette carrière sont déjà à jour.');
    confirmBox(`Actualiser les attributs initiaux de ${update.count} joueurs ? La progression, les statistiques, les transferts et les contrats de la carrière seront conservés.`,async()=>{
      try{
        const current=actualiserAttributsCarriere(G,catalogue);current.world.rngState=RNGS.s;
        await Store.set(SAVE_KEY,current.world);G=current.world;reindex(G);
        toast(`${current.count} fiches actualisées et carrière sauvegardée.`);ouvrirClassementsMonde();
      }catch(err){toast('Mise à jour impossible : '+err.message,'err');}
    },'Actualiser les attributs');
  }catch(err){toast(err.message,'err');}
}
