/* Catalogues indépendants : contrôle d'intégrité puis rapprochement par UID. */
let promesseCatalogueFMInside;
async function lireCatalogueCompresse(index,legacy){
  const response=await fetch('packs/'+index);let bytes,manifest;
  if(response.status===404 && legacy){
    const r=await fetch('packs/'+legacy);if(!r.ok)throw Error('Catalogue FMInside indisponible');bytes=new Uint8Array(await r.arrayBuffer());
  }else{
    if(!response.ok)throw Error('Index de catalogue indisponible');manifest=await response.json();
    if(!Array.isArray(manifest.parts)||!manifest.parts.length)throw Error('Index de catalogue invalide');
    const parts=await Promise.all(manifest.parts.map(async p=>{
      if(!/^[a-zA-Z0-9_.-]+$/.test(p.file))throw Error('Nom de partie invalide');
      const r=await fetch('packs/'+p.file);if(!r.ok)throw Error('Partie de catalogue indisponible');
      const a=new Uint8Array(await r.arrayBuffer());if(a.byteLength!==p.bytes)throw Error('Partie de catalogue incomplète');
      if(globalThis.crypto?.subtle){const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a)),v=>v.toString(16).padStart(2,'0')).join('');if(hash!==p.sha256)throw Error('Partie de catalogue corrompue');}
      return a;
    }));
    bytes=new Uint8Array(parts.reduce((n,a)=>n+a.byteLength,0));let pos=0;for(const a of parts){bytes.set(a,pos);pos+=a.byteLength;}
  }
  const data=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
  if(manifest?.profiles!=null && data.players.length!==manifest.profiles)throw Error('Nombre de fiches incohérent');
  return {data,manifest};
}
function chargerCatalogueFMInside(){
  if(promesseCatalogueFMInside)return promesseCatalogueFMInside;
  promesseCatalogueFMInside=(async()=>{
    const {data,manifest}=await lireCatalogueCompresse('fminside-fm26.manifest.json','fminside-fm26.json.gz');
    if(!manifest?.supplement)return data;
    if(manifest.supplement!=='fmblog-fm26.manifest.json')throw Error('Complément inconnu');
    const {data:fmb}=await lireCatalogueCompresse(manifest.supplement);
    const byUid=new Map((fmb.players || []).map(p=>[String(p.fmUid),p]));
    // FMInside garde la priorité ; pas de moyenne entre deux versions.
    for(const p of data.players)byUid.set(String(p.fmUid),p);
    return {...data,players:[...byUid.values()],retrievedAt:[data.retrievedAt,fmb.retrievedAt].filter(Boolean).sort().at(-1),fmbCoverage:{profiles:fmb.players.length,model:fmb.model}};
  })().catch(err=>{promesseCatalogueFMInside=null;throw err;});
  return promesseCatalogueFMInside;
}
