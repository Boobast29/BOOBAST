// Plans et calcul de progression adaptés de Pitchside Manager (MIT),
// © 2026 Pitchside Manager contributors, 0bfa7f56eabe446ce1c95d0a3c6864407244e0d4.
// Original et licence conservés dans third_party/pitchside-manager.
// Pas de multiplicateur de gains : utilise le focus individuel déjà simulé.
const GROWTH_PATHS={
 explosiveWinger:{label:'Ailier explosif',positions:['AG','AD','MOC','BU'],targets:['movement_sprint_speed','movement_acceleration','skill_dribbling','attacking_finishing']},
 poacher:{label:'Finisseur',positions:['BU','MOC'],targets:['attacking_finishing','mentality_positioning','mentality_composure','skill_ball_control']},
 targetMan:{label:'Attaquant pivot',positions:['BU'],targets:['power_strength','attacking_heading_accuracy','power_jumping','attacking_finishing']},
 playmaker:{label:'Organisateur',positions:['MC','MOC','MDC'],targets:['attacking_short_passing','mentality_vision','skill_ball_control','decisions']},
 engine:{label:'Gros volume de jeu',positions:['MC','MDC','DG','DD'],targets:['power_stamina','determination','defending_standing_tackle','teamwork']},
 ballPlayingDefender:{label:'Défenseur relanceur',positions:['DC','MDC'],targets:['attacking_short_passing','mentality_composure','defending_awareness','mentality_vision']},
 wall:{label:'Défenseur solide',positions:['DC','MDC'],targets:['defending_awareness','defending_standing_tackle','attacking_heading_accuracy','power_strength']},
 wingBack:{label:'Latéral complet',positions:['DG','DD'],targets:['attacking_crossing','movement_sprint_speed','power_stamina','skill_dribbling']},
 shotStopper:{label:'Gardien sur sa ligne',positions:['GB'],targets:['goalkeeping_reflexes','goalkeeping_handling','movement_agility','power_jumping']},
 sweeperKeeper:{label:'Gardien relanceur',positions:['GB'],targets:['goalkeeping_diving','goalkeeping_positioning','decisions','goalkeeping_kicking']},
 leader:{label:'Leader de jeu',positions:Object.keys(ROLES),targets:['leadership','mentality_composure','decisions','teamwork']}
};
const MAX_GROWTH_PATHS=4;
function growthPathsFor(p){return Object.entries(GROWTH_PATHS).filter(([,d])=>d.positions.includes(p.pos));}
function activeGrowthPaths(g){return g.players.filter(p=>p.club===g.clubId&&p.growthPath&&!p.growthPath.complete&&!p.growthPath.paused);}
function growthPathProgress(p){
 const plan=p.growthPath,def=GROWTH_PATHS[plan?.id];if(!plan||!def)return null;
 const rows=def.targets.map(key=>{const start=plan.start[key],now=skillValue(p,key).value,goal=Math.min(20,start+1);return {key,start,now,goal};});
 if(rows.some(r=>!Number.isFinite(r.start)))return null;
 const pct=rows.reduce((s,r)=>s+(r.goal===r.start?1:clamp((r.now-r.start)/(r.goal-r.start),0,1)),0)/rows.length;
 return {rows,pct,milestone:pct>=1-1e-9?3:pct>=.67?2:pct>=.34?1:0};
}
function restorePathTraining(p){const plan=p.growthPath;if(!plan||!p.train)return;if(p.train?.attr===plan?.assignedAttr){if(plan.previousAttr)p.train.attr=plan.previousAttr;else delete p.train.attr;}}
function growthPathFocus(p){
 const progress=growthPathProgress(p);if(!progress)return null;
 const row=progress.rows.filter(r=>r.now<r.goal-1e-9).sort((a,b)=>(a.now-a.start)-(b.now-b.start)||a.now-b.now)[0];return row?SKILL41[row.key].group:null;
}
function startGrowthPath(g,p,id){
 const def=GROWTH_PATHS[id];if(!p||p.club!==g.clubId||p.academy||p.retired||p.loan?.inLoan)return {ok:false,reason:'Réservé aux joueurs professionnels du club, hors prêts entrants.'};
 if(!def||!def.positions.includes(p.pos))return {ok:false,reason:'Ce parcours ne correspond pas au poste.'};
 if(p.age>=31)return {ok:false,reason:'Ces parcours de développement sont réservés aux moins de 31 ans.'};
 if(!activeGrowthPaths(g).includes(p)&&activeGrowthPaths(g).length>=MAX_GROWTH_PATHS)return {ok:false,reason:'Quatre parcours actifs au maximum : termine ou suspends un autre suivi.'};
 const start=Object.fromEntries(def.targets.map(k=>[k,skillValue(p,k).value]));
 if(Object.values(start).every(v=>v>=20-1e-9))return {ok:false,reason:'Les compétences visées sont déjà au maximum.'};
 const previousAttr=p.growthPath&&!p.growthPath.paused&&!p.growthPath.complete&&p.train?.attr===p.growthPath.assignedAttr?p.growthPath.previousAttr:p.train?.attr;restorePathTraining(p);
 p.growthPath={id,start,previousAttr,season:g.season,week:g.week,milestone:0,complete:false,paused:false};
 const attr=growthPathFocus(p);p.train||={};p.train.attr=attr;p.growthPath.assignedAttr=attr;return {ok:true};
}
function stopGrowthPath(p){restorePathTraining(p);delete p.growthPath;}
function processGrowthPaths(g){
 for(const p of g.players){const plan=p.growthPath;if(!plan||plan.complete||plan.paused)continue;
  if(p.club!==g.clubId||p.retired){restorePathTraining(p);plan.paused=true;continue;}
  if(p.train?.attr!==plan.assignedAttr){plan.paused=true;continue;}
  const progress=growthPathProgress(p);if(!progress){restorePathTraining(p);plan.paused=true;continue;}
  plan.milestone=Math.max(plan.milestone,progress.milestone);
  if(progress.milestone===3){restorePathTraining(p);plan.complete=true;news(g,`🎓 ${p.name} a atteint les objectifs du parcours « ${GROWTH_PATHS[plan.id].label} ». Aucun gain de niveau supplémentaire n’est attribué.`,'youth');continue;}
  const attr=growthPathFocus(p);if(attr){p.train.attr=attr;plan.assignedAttr=attr;}
 }
}
const __weeklyBeforeGrowthPath=weeklyUpdate;
weeklyUpdate=function(g,full=true){if(full)processGrowthPaths(g);const r=__weeklyBeforeGrowthPath(g,full);if(full)processGrowthPaths(g);return r;};
function growthPathHTML(p){
 const plan=p.growthPath,progress=growthPathProgress(p),options=growthPathsFor(p);
 return `<section class="card" id="growthPathPanel"><h3>Parcours de progression individuel</h3><p class="hint">Quatre suivis actifs au maximum. Chaque parcours vise jusqu’à +1/20 sur quatre compétences, via l’entraînement individuel existant. Pas de points gratuits ni de délai garanti.</p>
 ${plan&&progress?`<p><b>${esc(GROWTH_PATHS[plan.id].label)}</b> · ${Math.round(progress.pct*100)} % · ${plan.complete?'Objectif atteint':plan.paused?'Suspendu (départ ou focus modifié)':'En cours'} · jalon ${plan.milestone}/3</p><div class="scroll-x"><table class="tbl"><thead><tr><th>Compétence</th><th>Départ</th><th>Actuel</th><th>Objectif</th></tr></thead><tbody>${progress.rows.map(r=>`<tr><td>${esc(SKILL41[r.key].label)}</td><td>${r.start.toFixed(1)}</td><td>${r.now.toFixed(1)}</td><td>${r.goal.toFixed(1)}</td></tr>`).join('')}</tbody></table></div><button class="btn sm" id="stopGrowthPath">${plan.complete?'Archiver le parcours':'Arrêter ce parcours'}</button>`:'<p>Aucun parcours enregistré.</p>'}
 <div class="row gap wrap mt"><label>Objectif<select id="growthPathChoice">${options.map(([id,def])=>`<option value="${id}" ${plan?.id===id?'selected':''}>${esc(def.label)}</option>`).join('')}</select></label><button class="btn" id="startGrowthPath">${plan?'Démarrer un nouveau suivi':'Démarrer le suivi'}</button></div><p class="hint">Le parcours pilote la famille d’entraînement individuelle la plus en retard. Modifier manuellement ce focus suspend son pilotage. Les compétences détaillées évoluent avec leurs familles : elles ne sont pas toutes indépendantes. Une blessure, le potentiel et l’âge peuvent empêcher d’atteindre l’objectif.</p></section>`;
}
const __profileBeforeGrowthPath=playerModal;
playerModal=function(pid,tab='profil'){
 __profileBeforeGrowthPath(pid,tab);const p=getPlayer(G,pid);if(tab!=='profil'||!p||p.club!==G.clubId||p.academy||p.loan?.inLoan)return;
 const box=$('#modal .mbox')||$('#modal');if(!box)return;box.insertAdjacentHTML('beforeend',growthPathHTML(p));
 $('#startGrowthPath').onclick=()=>{const result=startGrowthPath(G,p,$('#growthPathChoice').value);if(!result.ok)return toast(result.reason,'err');save();playerModal(pid);};
 const stop=$('#stopGrowthPath');if(stop)stop.onclick=()=>{stopGrowthPath(p);save();playerModal(pid);};
};
