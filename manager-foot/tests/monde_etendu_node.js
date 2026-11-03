const fs=require('fs'),vm=require('vm'),zlib=require('zlib'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={console,setTimeout:()=>{},startScreen:()=>{},document:{querySelector:()=>null}};vm.createContext(ctx);
for(const file of ['data','engine','economy','transfers','europe','attributs']){let code=fs.readFileSync(`${root}/js/${file}.js`,'utf8');if(file==='attributs')code=code.slice(0,code.indexOf('const __playerModalA'));vm.runInContext(code,ctx,{filename:file});}
const app=fs.readFileSync(`${root}/js/app.js`,'utf8');
vm.runInContext(app.slice(app.indexOf('function importDatabase(raw)'),app.indexOf('function exportDatabase')),ctx);
vm.runInContext(fs.readFileSync(`${root}/js/import_json_complet.js`,'utf8'),ctx);
vm.runInContext(fs.readFileSync(`${root}/js/monde_etendu.js`,'utf8'),ctx);
const index=JSON.parse(fs.readFileSync(`${root}/packs/monde-index.json`));
for(const country of index.countries){
 const data=JSON.parse(zlib.gunzipSync(fs.readFileSync(`${root}/packs/${country.file}`)));
 for(const group of data.competitions.filter(c=>c.tier===3)){
  const before=JSON.stringify(data);const world=ctx.construireCarriereMonde(data,group.fmUid);
  assert.equal(JSON.stringify(data),before);
  assert.equal(world.leagueNames.length,3);
  assert.equal(world.players.filter(p=>p.fmUid).length,new Set(world.players.filter(p=>p.fmUid).map(p=>p.fmUid)).size);
  const expected=data.competitions.filter(c=>c.tier<3||c.fmUid===group.fmUid).reduce((n,c)=>n+c.clubs.length,0);
  assert.equal(world.clubs.filter(c=>c.fmUid).length,expected);
  assert(world.players.every(p=>Object.values(p.attrs).every(v=>Number.isFinite(v)&&v>=1&&v<=20)));
  const source=data.clubs.flatMap(c=>c.players).find(p=>Number.isFinite(p.wageWeekly));
  if(source){const p=world.players.find(p=>p.fmUid===source.fmUid);if(p)assert.equal(p.wage,source.wageWeekly);}
  console.log(country.label,group.name,expected,'clubs source',world.sourceCoverage.sourcePlayers,'joueurs source');
 }
}
