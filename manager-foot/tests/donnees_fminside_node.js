const fs=require('fs'),vm=require('vm'),assert=require('assert'),zlib=require('zlib'),crypto=require('crypto');
const code=fs.readFileSync(__dirname+'/../js/donnees_fminside.js','utf8');
const expected={players:[{fmUid:'1',name:'Joueur A'},{fmUid:'2',name:'Joueur B'}]};
const bytes=zlib.gzipSync(Buffer.from(JSON.stringify(expected)));const parts=[bytes.subarray(0,20),bytes.subarray(20)];
async function test(legacy=false,corrupt=false){
 const manifest={parts:parts.map((a,i)=>({file:`test.${i}.part`,bytes:a.length,sha256:crypto.createHash('sha256').update(a).digest('hex')}))};
 const ctx={Uint8Array,Response,Blob,DecompressionStream,crypto:crypto.webcrypto};
 ctx.fetch=async url=>{
  if(url.endsWith('manifest.json'))return new Response(legacy?'':JSON.stringify(manifest),{status:legacy?404:200});
  if(url.endsWith('.json.gz'))return new Response(bytes);
  const i=Number(url.match(/test\.(\d)/)[1]);const value=Buffer.from(parts[i]);if(corrupt&&i===0)value[0]^=1;return new Response(value);
 };
 vm.createContext(ctx);vm.runInContext(code,ctx);
 if(corrupt){await assert.rejects(ctx.chargerCatalogueFMInside(),/corrompue/);corrupt=false;}
 const result=await ctx.chargerCatalogueFMInside();assert.deepEqual(JSON.parse(JSON.stringify(result)),expected);
}
(async()=>{await test();await test(true);await test(false,true);console.log('Catalogue : assemblage, intégrité, reprise après erreur et fichier historique validés.');})().catch(e=>{console.error(e);process.exit(1)});
