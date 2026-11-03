/* Catalogue compressé : lecture des nouvelles parties et compatibilité avec l'ancien fichier unique. */
let promesseCatalogueFMInside;
function chargerCatalogueFMInside(){
  if(promesseCatalogueFMInside)return promesseCatalogueFMInside;
  promesseCatalogueFMInside=(async()=>{
    const manifestResponse=await fetch('packs/fminside-fm26.manifest.json');
    let bytes;
    if(manifestResponse.status===404){
      const legacy=await fetch('packs/fminside-fm26.json.gz');if(!legacy.ok)throw Error('Catalogue FMInside indisponible');bytes=new Uint8Array(await legacy.arrayBuffer());
    }else{
      if(!manifestResponse.ok)throw Error('Index FMInside indisponible');
      const manifest=await manifestResponse.json();
      if(!Array.isArray(manifest.parts)||!manifest.parts.length)throw Error('Index FMInside invalide');
      const parts=await Promise.all(manifest.parts.map(async p=>{
        if(!/^[a-zA-Z0-9_.-]+$/.test(p.file))throw Error('Nom de partie invalide');
        const r=await fetch('packs/'+p.file);if(!r.ok)throw Error('Partie FMInside indisponible');
        const a=new Uint8Array(await r.arrayBuffer());if(a.byteLength!==p.bytes)throw Error('Partie FMInside incomplète');
        if(globalThis.crypto?.subtle){const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a)),v=>v.toString(16).padStart(2,'0')).join('');if(hash!==p.sha256)throw Error('Partie FMInside corrompue');}
        return a;
      }));
      bytes=new Uint8Array(parts.reduce((n,a)=>n+a.byteLength,0));let pos=0;for(const part of parts){bytes.set(part,pos);pos+=part.byteLength;}
    }
    return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
  })().catch(err=>{promesseCatalogueFMInside=null;throw err;});
  return promesseCatalogueFMInside;
}
