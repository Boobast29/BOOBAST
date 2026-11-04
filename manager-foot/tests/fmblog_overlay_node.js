const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert'),crypto=require('crypto'),zlib=require('zlib');
const root=path.resolve(__dirname,'..');
const ctx={Uint8Array,Response,Blob,DecompressionStream,crypto:crypto.webcrypto,fetch:async url=>{
 const file=path.join(root,url);return fs.existsSync(file)?new Response(fs.readFileSync(file)):new Response('',{status:404});
}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(root+'/js/donnees_fminside.js','utf8'),ctx);
(async()=>{
 const primary=JSON.parse(fs.readFileSync(root+'/packs/fminside-fm26.manifest.json'));
 const original=JSON.parse(zlib.gunzipSync(Buffer.concat(primary.parts.map(p=>fs.readFileSync(root+'/packs/'+p.file)))));
 const manifest=JSON.parse(fs.readFileSync(root+'/packs/fmblog-fm26.manifest.json'));
 const fmb=JSON.parse(zlib.gunzipSync(Buffer.concat(manifest.parts.map(p=>fs.readFileSync(root+'/packs/'+p.file)))));
 const result=await ctx.chargerCatalogueFMInside(),ids=new Set(result.players.map(p=>p.fmUid));
 assert.equal(ids.size,result.players.length);assert.equal(result.players.length,new Set([...original.players,...fmb.players].map(p=>p.fmUid)).size);
 for(const p of original.players)assert.deepEqual(JSON.parse(JSON.stringify(result.players.find(x=>x.fmUid===p.fmUid))),p);
 for(const p of fmb.players){assert(p.targetClubUid);assert(Object.keys(p.attributes).length>=30);assert(Object.values(p.attributes).every(v=>v>=1&&v<=99));assert.equal(p.sourceDatabase,'FM26 FMB 26.3.2');assert(!p.wageWeekly);}
 assert(result.fmbCoverage.profiles>0);console.log('Complément FMB : intégrité, fusion UID, priorité FMInside, clubs cibles et séparation des devises validés.');
})().catch(e=>{console.error(e);process.exit(1)});
