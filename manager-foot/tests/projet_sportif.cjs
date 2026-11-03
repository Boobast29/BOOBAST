// Exécuter depuis la racine : node manager-foot/tests/projet_sportif.cjs
const fs=require('fs'), vm=require('vm'), assert=require('assert');
const root=__dirname+'/../js/';
const projet=fs.readFileSync(root+'projet_sportif.js','utf8');
const helpers=projet.slice(0,projet.indexOf('const __weeklyProjet'));
const ctx={console};vm.createContext(ctx);vm.runInContext(helpers,ctx);
assert.equal(ctx.aiPriorityRole([{pos:'GB'},{pos:'BU'},{pos:'BU'}],{GB:70,BU:60}),'GB','La profondeur doit compter autant que le meilleur titulaire');
assert.equal(ctx.aiPriorityRole([{pos:'GB'},{pos:'GB'},{pos:'BU'},{pos:'BU'}],{GB:70,BU:60}),'BU');
// Exécute la boucle réelle de progression du moteur, avec même tirage et même potentiel.
const engine=fs.readFileSync(root+'engine.js','utf8');
const weekly=engine.slice(engine.indexOf('function weeklyUpdate'),engine.indexOf('  if (!full) return;',engine.indexOf('function weeklyUpdate')))+'}';
Object.assign(ctx,{TRAINING:{equilibre:{keys:[]}},clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),tickMedical:()=>{},trainingInjuries:()=>{},playerOvr:()=>60,leagueRoundAt:()=>20,rnd:()=>.1,bumpAttr:p=>{p.bump=(p.bump||0)+1;return 'tec';}});
vm.runInContext(weekly,ctx);
function player(min,injury=0){return {club:2,attrs:{phy:10},fit:70,susp:0,age:20,stats:{min},pot:90,morale:70,injury};}
for(const [min,injury,expected] of [[0,0,0],[1800,0,1],[1800,20,0]]){const p=player(min,injury);ctx.weeklyUpdate({players:[p],clubId:1,week:1},true);assert.equal(p.bump||0,expected,`minutes=${min}, blessure=${injury}`);}
// Les trois observations doivent être facturées séparément et espacées.
const cell=fs.readFileSync(root+'cellule.js','utf8');
const cw=cell.slice(cell.indexOf('function cellWeekly('),cell.indexOf('function cellStaffWeekly('));
let reports=0,paid=0;
const state={season:2026,week:0,cell:{budgetM:100,spent:{},queue:[{pid:1,scoutId:'s',due:0,dueSeason:2026,remaining:3}],missions:[]}};
Object.assign(ctx,{cellInit:()=>{},getPlayer:()=>({name:'Test',pos:'GB',age:20}),member:()=>({name:'Scout'}),zoneOf:()=> 'FRA',zoneCost:()=>10,monthSpent:G=>G.cell.spent.m||0,curMonthKey:()=> 'm',myClub:()=>({}),flow:(_G,_c,x)=>paid-=x,makeReport:()=>{reports++;return {lo:50,hi:60,conf:70};},news:()=>{}});
vm.runInContext(cw,ctx);
for(let week=0;week<=6;week++){state.week=week;ctx.cellWeekly(state);assert.equal(reports,1+Math.floor(week/3));}
assert.equal(paid,30);assert.equal(state.cell.queue.length,0);
state.cell.queue=[{pid:1,scoutId:'s',due:6,dueSeason:2026,remaining:2}];state.cell.budgetM=30;ctx.cellWeekly(state);assert.equal(reports,3);assert.equal(state.cell.queue[0].waiting,'budget');
// Migration : le journal est créé seulement après une variation, et sérialisable.
ctx.playerOvr=()=>61;const p={id:1,club:2,age:20,attrs:{tec:12},stats:{min:90}};const g={clubId:2,players:[p],season:2026,week:3};
ctx.journalProgression(g,new Map([[1,{attrs:{tec:11},minutes:0,injury:0}]]));assert.equal(g.developmentHistory[1][0].delta[0].to,12);assert.equal(JSON.parse(JSON.stringify(g)).developmentHistory[1].length,1);
console.log('OK : profondeur IA, minutes, blessure, suivi daté, budget et migration du journal.');
