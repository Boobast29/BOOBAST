// Usage (depuis manager-foot/) : node tools/sim-calibration.js — statistiques moyennes d'une saison de Ligue Élite (buts, tirs, passes, fautes…)
const fs=require('fs');const vm=require('vm');
const ctx={console,Math,Date,JSON};vm.createContext(ctx);
for(const f of ['js/data.js','js/engine.js','js/match.js','js/tactics.js','js/squad.js','js/transfers.js','js/career.js','js/europe.js','js/intl.js','js/economy.js','js/world.js']) vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
vm.runInContext(`
const db=buildDefaultDatabase(); normalizeWorld(db);
const G=newGame(db,4,'T');
const t0=Date.now();
let A={g:0,sh:0,onT:0,xg:0,pas:0,pasOk:0,fouls:0,cor:0,off:0,tkl:0,yel:0,n:0,hw:0,dr:0}, poss=[];
const L=G.comps.L1;
for (let r=0;r<38;r++){ weeklyUpdate(G,true); for(const f of L.fixtures[r]){ const m=simFixture(G,f); A.n++; A.g+=m.score[0]+m.score[1]; if(m.score[0]>m.score[1])A.hw++; if(m.score[0]==m.score[1])A.dr++;
  for(const s of m.stats){A.sh+=s.shots;A.onT+=s.onT;A.xg+=s.xg;A.pas+=s.pas;A.pasOk+=s.pasOk;A.fouls+=s.fouls;A.cor+=s.corners;A.off+=s.off;A.tkl+=s.tkl;}
  A.yel+=m.events.filter(e=>e.type==='yellow'||e.type==='red').length; poss.push(m.possPct[0]); } }
const n=A.n;
console.log('ms/match',((Date.now()-t0)/n).toFixed(1),'goals',(A.g/n).toFixed(2),'shots',(A.sh/n).toFixed(1),'onT',(A.onT/n).toFixed(1),'xg',(A.xg/n).toFixed(2),'pass',(A.pas/n).toFixed(0),'pass%',(A.pasOk/A.pas*100).toFixed(0),'fouls',(A.fouls/n).toFixed(1),'corners',(A.cor/n).toFixed(1),'off',(A.off/n).toFixed(1),'tkl',(A.tkl/n).toFixed(1),'cards',(A.yel/n).toFixed(1),'home%',(A.hw/n*100).toFixed(0),'draw%',(A.dr/n*100).toFixed(0));
const t=standings(G,'L1'); console.log(t.slice(0,3).map(r=>getClub(G,r.id).short+' '+r.pts+' '+r.gf+'-'+r.ga).join(' | '),' ... ',t.slice(-3).map(r=>getClub(G,r.id).short+' '+r.pts+' '+r.gf+'-'+r.ga).join(' | '));
const ts=topScorers(G,'L1',3); console.log(ts.map(p=>p.name+' '+p.stats.lg+' ('+p.pos+')').join(', '));
const pl=G.players.filter(p=>p.stats.min>1500); const byPos={}; for(const p of pl){(byPos[p.pos]||=[]).push(p)}
for(const k of ['DC','MC','AG','BU','GB']) { const a=byPos[k]||[]; const s=x=>a.reduce((q,p)=>q+x(p),0)/a.length; console.log(k, 'rat',s(p=>p.stats.rating/p.stats.apps).toFixed(2),'pas/90',s(p=>p.stats.pas/p.stats.min*90).toFixed(0),'tkl/90',s(p=>p.stats.tkl/p.stats.min*90).toFixed(1),'g/90',s(p=>p.stats.goals/p.stats.min*90).toFixed(2), 'sav/90', s(p=>p.stats.sav/p.stats.min*90).toFixed(1)); }
`,ctx);
