// Usage (depuis manager-foot/) : node tools/sim-saisons.js — simule 2 saisons complètes (coupes d'Europe, supercoupes, tournoi international, Ballon d'or)
const fs=require('fs');const vm=require('vm');
const ctx={console,Math,Date,JSON};vm.createContext(ctx);
for(const f of ['js/data.js','js/engine.js','js/match.js','js/tactics.js','js/squad.js','js/transfers.js','js/career.js','js/europe.js','js/intl.js','js/economy.js','js/world.js']) vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
vm.runInContext(`
const db=buildDefaultDatabase(); normalizeWorld(db);
console.log('clubs', db.clubs.length, 'foreign', db.clubs.filter(c=>c.foreign).length, 'players', db.players.length);
const G=newGame(db,1,'T');
console.log('schedule', G.schedule.length, G.schedule.map(e=>e.t+(e.t!=='L'?e.r:'')).join(' '));
console.log('C1 teams', G.comps.C1.teams.length, 'dom', G.comps.C1.teams.filter(id=>!getClub(G,id).foreign).map(id=>getClub(G,id).short).join(','), 'C2', G.comps.C2.teams.filter(id=>!getClub(G,id).foreign).map(id=>getClub(G,id).short), 'C3', G.comps.C3.teams.filter(id=>!getClub(G,id).foreign).map(id=>getClub(G,id).short));
const t0=Date.now();
for (let s=0;s<2;s++){
while(G.week<G.schedule.length){ const f=weekFixtures(G).find(f=>f.h===G.clubId||f.a===G.clubId); if(f){ simFixture(G,f); boardAfterMatch(G,f);} const r=completeWeek(G,f); }
for (const C of euroComps(G)) console.log(C.id, C.ko.map(k=>k.name+':'+k.ties.length).join(','), 'winner', getClub(G,C.winner)?.name, getClub(G,C.winner)?.country||'FRA');
console.log('SUP', getClub(G,G.comps.SUP?.winner)?.name, 'ESUP', getClub(G,G.comps.ESUP?.winner)?.name);
const S=endSeason(G); console.log('season', S.season, 'intl', S.intl ? S.intl.name+' '+S.intl.year+' → '+natName(S.intl.winner) : 'none', 'ballon', S.ballon.list.slice(0,3).map(x=>x.name+' ('+x.club+')').join(', '));
console.log(' caps sample', clubPlayers(G,G.clubId).filter(p=>p.caps).slice(0,4).map(p=>p.name+':'+p.caps+'/'+(p.intlGoals||0)).join(' '), ' ms', Date.now()-t0, 'budget', money(myClub(G).budget));
}
`,ctx);
