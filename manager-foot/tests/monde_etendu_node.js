const fs=require('fs'),vm=require('vm'),zlib=require('zlib'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');const effects=process.env.FM_EFFECTIFS_DIR||`${root}/packs`;
const ctx={console,setTimeout:()=>{},startScreen:()=>{},document:{querySelector:()=>null}};vm.createContext(ctx);
for(const file of ['data','engine','economy','transfers','europe','attributs']){let code=fs.readFileSync(`${root}/js/${file}.js`,'utf8');if(file==='attributs')code=code.slice(0,code.indexOf('const __playerModalA'));vm.runInContext(code,ctx,{filename:file});}
const app=fs.readFileSync(`${root}/js/app.js`,'utf8');
vm.runInContext(app.slice(app.indexOf('function importDatabase(raw)'),app.indexOf('function exportDatabase')),ctx);
vm.runInContext(fs.readFileSync(`${root}/js/import_json_complet.js`,'utf8'),ctx);
vm.runInContext(fs.readFileSync(`${root}/js/monde_etendu.js`,'utf8'),ctx);
vm.runInContext(fs.readFileSync(`${root}/js/integration_fminside.js`,'utf8'),ctx);
const index=JSON.parse(fs.readFileSync(`${effects}/monde-index.json`));
for(const country of index.countries){
 const data=JSON.parse(zlib.gunzipSync(fs.readFileSync(`${effects}/${country.file}`)));
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
const countries=index.countries.map(c=>JSON.parse(zlib.gunzipSync(fs.readFileSync(`${effects}/${c.file}`))));
const mf=JSON.parse(fs.readFileSync(`${root}/packs/fminside-fm26.manifest.json`));
const realCatalogue=JSON.parse(zlib.gunzipSync(Buffer.concat(mf.parts.map(p=>fs.readFileSync(`${root}/packs/${p.file}`)))));
const fmbManifest=JSON.parse(fs.readFileSync(`${root}/packs/fmblog-fm26.manifest.json`));
const fmb=JSON.parse(zlib.gunzipSync(Buffer.concat(fmbManifest.parts.map(p=>fs.readFileSync(`${root}/packs/${p.file}`)))));
const existing=new Set(realCatalogue.players.map(p=>p.fmUid));realCatalogue.players.push(...fmb.players.filter(p=>!existing.has(p.fmUid)));
for(const c of countries)ctx.enrichirPaysFMInside(c,realCatalogue);
const all=ctx.construireMondeComplet(countries,realCatalogue);
for(const source of fmb.players){const p=all.players.find(p=>p.fmUid===source.fmUid);assert(p);assert.equal(p.sourceProfile.database,'FM26 FMB 26.3.2');assert.equal(p.dataQuality,'documented_attributes');assert(p.fmbProfile);}

assert.equal(all.players.filter(p=>p.club==null && p.sourceProfile?.freeAgentSnapshot).length,index.freeAgentsDocumented || 0);
assert.equal(all.players.filter(p=>p.club==null).length,index.freeAgentsDocumented || 0);
assert.equal(all.sourceCoverage.sourcePlayers,index.totals.players,'Aucun joueur source perdu entre le catalogue et la carrière');
const affiliates=countries.flatMap(w=>w.clubs.flatMap(c=>c.players.filter(p=>p.affiliatedTeamReference)));
if(index.affiliatedSquadsIncluded)assert(affiliates.length>=1939,'Les effectifs affiliés doivent rester chargés');
for(const source of affiliates){const p=all.players.find(p=>String(p.fmUid)===String(source.fmUid));assert(p,'Joueur affilié présent');assert.equal(p.sourceProfile.sourceTeamUid,source.sourceTeamUid);assert(/reserve/i.test(p.sourceProfile.squad));}
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

// Le choix de pays de l'accueil ouvre les clubs des trois divisions via les effectifs locaux.
(async()=>{
  ctx.location={protocol:'http:'};ctx.Response=Response;ctx.DecompressionStream=DecompressionStream;
  ctx.chargerCatalogueFMInside=async()=>realCatalogue;
  ctx.localStorage={getItem:()=>'',setItem:()=>{}};
  let html='';ctx.modal=value=>{html=value;};ctx.closeModal=()=>{};ctx.toast=message=>{throw Error(message);};
  ctx.document.querySelectorAll=()=>[];
  ctx.fetch=async url=>{
    if(url==='/api/complement-fm')return new Response(JSON.stringify(realCatalogue));
    const file=url.startsWith('/api/effectifs-fm/')?decodeURIComponent(url.split('/').pop()):url.replace(/^packs\//,'');
    const local=path.join(file.startsWith('monde-')?effects:`${root}/packs`,file);
    return fs.existsSync(local)?new Response(fs.readFileSync(local)):new Response('{}',{status:404});
  };
  await ctx.choisirClubEffectifsFM('Germany');
  assert.equal((html.match(/data-fm-club=/g)||[]).length,56,'Les 56 clubs allemands doivent être proposés depuis l’accueil');
  assert(html.includes('D1')&&html.includes('D2')&&html.includes('D3'));
  console.log('Accueil : choix du club FM D1–D3 via les effectifs locaux validé.');
})().catch(err=>{console.error(err);process.exitCode=1;});
