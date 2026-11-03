const fs=require('fs'),vm=require('vm'),zlib=require('zlib'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={console,setTimeout:()=>{},startScreen:()=>{},document:{querySelector:()=>null}};vm.createContext(ctx);
for(const file of ['data','engine','economy','transfers','europe','attributs']){let code=fs.readFileSync(`${root}/js/${file}.js`,'utf8');if(file==='attributs')code=code.slice(0,code.indexOf('const __playerModalA'));vm.runInContext(code,ctx,{filename:file});}
const app=fs.readFileSync(`${root}/js/app.js`,'utf8');
vm.runInContext(app.slice(app.indexOf('function importDatabase(raw)'),app.indexOf('function exportDatabase')),ctx);
vm.runInContext(fs.readFileSync(`${root}/js/import_json_complet.js`,'utf8'),ctx);
vm.runInContext(fs.readFileSync(`${root}/js/monde_etendu.js`,'utf8'),ctx);
vm.runInContext(fs.readFileSync(`${root}/js/integration_fminside.js`,'utf8'),ctx);
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

// Tous les pays d'une même carrière : calendrier, sauvegarde et promotions.
const countries=index.countries.map(c=>JSON.parse(zlib.gunzipSync(fs.readFileSync(`${root}/packs/${c.file}`))));
const mf=JSON.parse(fs.readFileSync(`${root}/packs/fminside-fm26.manifest.json`));
const realCatalogue=JSON.parse(zlib.gunzipSync(Buffer.concat(mf.parts.map(p=>fs.readFileSync(`${root}/packs/${p.file}`)))));
const all=ctx.construireMondeComplet(countries,realCatalogue);
assert.equal(all.players.filter(p=>p.club==null && p.sourceProfile?.freeAgentSnapshot).length,index.freeAgentsDocumented || 0);
assert.equal(all.players.filter(p=>p.club==null).length,index.freeAgentsDocumented || 0);
assert.equal(all.clubs.length,355);assert.equal(all.sourceCoverage.countries.length,5);
assert.equal(new Set(all.players.map(p=>p.id)).size,all.players.length);
ctx.setupEuropean=()=>{};ctx.news=()=>{};
let legacySimulations=0;
ctx.initLiguesEtrangeres=()=>legacySimulations++;ctx.avancerLiguesEtrangeres=()=>legacySimulations++;ctx.cloreLiguesEtrangeres=()=>legacySimulations++;
ctx.ligueDe=()=> 'legacy';ctx.selectLigues=()=> 'legacy';ctx.esc=String;
vm.runInContext(fs.readFileSync(`${root}/js/monde_multinational.js`,'utf8'),ctx);
all.clubId=all.clubs.find(c=>c.worldCountry==='France').id;all.season=2026;all.week=0;all.inbox=[];
ctx.setupSeason(all);
const leagues=ctx.liguesDuMonde(all);
assert.equal(leagues.length,18);
assert.equal(new Set(leagues.flatMap(l=>l.clubs)).size,355);
for(const l of leagues)assert.equal(new Set(l.clubs.map(id=>all.clubs.find(c=>c.id===id).worldCountry)).size,1);
ctx.simulerAutresPays(all,ctx.leagueRoundsTotal(all)-1);
for(const l of leagues.filter(l=>l.type==='worldLeague')){
 assert(l.fixtures.flat().every(f=>f.res));
 assert(ctx.standings(all,l.id).every(r=>r.p===2*(l.clubs.length-1)));
}
assert(Object.values(all.worldCups).every(c=>c.winner));
const roundtrip=JSON.parse(JSON.stringify(all));assert.equal(ctx.liguesDuMonde(roundtrip).length,18);
const affiliation=new Map(all.clubs.map(c=>[c.id,c.worldCountry]));
const counts=new Map(leagues.map(l=>[l.country+':'+l.sourceUid,l.clubs.length]));
ctx.promotionsParPays(all,{promoted:[],relegated:[]},leagues);
for(const c of all.clubs)assert.equal(c.worldCountry,affiliation.get(c.id));
const actual=new Map();for(const c of all.clubs){const k=c.worldCountry+':'+c.worldCompetitionUid;actual.set(k,(actual.get(k)||0)+1);}
for(const [k,n] of counts)assert.equal(actual.get(k),n,'Les mouvements doivent préserver les tailles de chaque groupe');
ctx.setupSeason(all);assert.equal(ctx.liguesDuMonde(all).length,18);
console.log('Carrière multi-pays validée : 355 clubs, 18 ligues, saison étrangère complète, coupes, sauvegarde et promotions sans changement de pays.');

ctx.initLiguesEtrangeres(all);ctx.avancerLiguesEtrangeres(all);ctx.cloreLiguesEtrangeres(all);assert.equal(legacySimulations,0,'Pas de second championnat regroupant toutes les divisions');
ctx.avancerLiguesEtrangeres({});assert.equal(legacySimulations,1,'Les carrières classiques conservent leur moteur');
const etrClub=all.clubs.find(c=>c.worldCountry==='Germany');const etrPlayer=all.players.find(p=>p.club===etrClub.id);
assert.equal(ctx.ligueDe(all,etrPlayer),ctx.clubLeague(all,etrClub.id).id);
assert(ctx.selectLigues(all).includes('Bundesliga'));
console.log('Mercato : recherche par championnat étranger et absence de double simulation validées.');
