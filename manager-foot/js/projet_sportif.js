// Renforce les systèmes existants, sans générer de nouvelles notes source.
const AI_ROLE_DEPTH = {GB:2, DC:3, DG:1, DD:1, MDC:1, MC:3, MOC:1, AG:1, AD:1, BU:2};
function aiPriorityRole(squad, strength) {
  const score = role => {
    const n = squad.filter(p => p.pos === role).length;
    return (strength[role] || 0) - Math.max(0, (AI_ROLE_DEPTH[role] || 1)-n)*18;
  };
  return Object.keys(strength).sort((a,b)=>score(a)-score(b)||a.localeCompare(b))[0];
}
function journalProgression(G, before) {
  G.developmentHistory ||= {};
  for (const p of G.players.filter(p=>p.club===G.clubId)) {
    const old=before.get(p.id); if(!old)continue;
    const delta=Object.keys(p.attrs).filter(k=>Math.abs(p.attrs[k]-old.attrs[k])>.001).map(k=>({k,from:old.attrs[k],to:p.attrs[k]}));
    if(!delta.length)continue;
    const causes=[];
    if(old.injury>0||p.injury>0)causes.push('Blessure ou retour de blessure');
    if(p.age>=31&&delta.some(d=>d.to<d.from))causes.push('Déclin lié à l’âge');
    if(delta.some(d=>d.to>d.from))causes.push('Entraînement et développement');
    const minutes=old.minutes == null ? null : Math.max(0,(p.stats?.min||0)-old.minutes);
    causes.push(minutes == null ? 'Premier bilan : historique des minutes non disponible' : minutes ? `${minutes} minutes depuis le précédent bilan` : 'Aucune minute supplémentaire depuis le précédent bilan');
    const entry={season:G.season,week:G.week,age:p.age,level:playerOvr(p),delta,causes};
    (G.developmentHistory[p.id] ||= []).push(entry);
    G.developmentHistory[p.id]=G.developmentHistory[p.id].slice(-120);
  }
  // Limite le volume de sauvegarde aux joueurs encore au club.
  const ids=new Set(G.players.filter(p=>p.club===G.clubId).map(p=>String(p.id)));
  for(const id of Object.keys(G.developmentHistory))if(!ids.has(id))delete G.developmentHistory[id];
}
const __weeklyProjet = weeklyUpdate;
weeklyUpdate=function(G,full=true) {
  const before=new Map(full?G.players.filter(p=>p.club===G.clubId).map(p=>[p.id,{attrs:{...p.attrs},minutes:G.developmentMinutes?.[p.id]??null,injury:p.injury||0}]):[]);
  const res=__weeklyProjet.apply(this,arguments);
  if(full){journalProgression(G,before);G.developmentMinutes=Object.fromEntries(G.players.filter(p=>p.club===G.clubId).map(p=>[p.id,p.stats?.min||0]));}
  return res;
};
function vProjetSportif(el) {
  cellInit(G);
  const ps=clubPlayers(G,G.clubId).slice().sort((a,b)=>a.name.localeCompare(b.name));
  const entries=ps.flatMap(p=>(G.developmentHistory?.[p.id]||[]).slice(-3).map(h=>({p,h}))).sort((a,b)=>b.h.season-a.h.season||b.h.week-a.h.week).slice(0,30);
  el.innerHTML=`<section class="card"><h1>Projet sportif</h1><p>Les décisions de recrutement et les changements de ton effectif, réunis au même endroit.</p><div class="row gap wrap"><button class="btn" data-projet="cell">Piloter la cellule</button><button class="btn" data-projet="plan">Planifier trois saisons</button><button class="btn" data-projet="career">Ma carrière</button></div></section>
  <section class="card"><h2>Commander un dossier en trois observations</h2><p>Trois rapports espacés de trois semaines après la première observation, facturés séparément sur le budget mensuel. Le suivi attend si le budget est épuisé. Les rapports restent des estimations.</p><form id="suiviProjet" class="row gap wrap"><label>Joueur à observer<select id="suiviPid">${G.players.filter(p=>p.club!==G.clubId&&!p.academy&&knows(G,p)).slice(0,250).map(p=>`<option value="${p.id}">${esc(p.name)} · ${p.pos}</option>`).join('')}</select></label><label>Recruteur<select id="suiviScout">${G.cell.members.filter(m=>m.role!=='analyste').map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('')}</select></label><button class="btn primary">Commander le suivi</button></form><p class="hint">Cette liste présente jusqu’à 250 joueurs connus. Le marché permet toujours de demander une observation individuelle.</p><p id="suiviEtat" role="status"></p><p>${G.cell.queue.length} observation(s) en attente · ${money(monthSpent(G))} engagés sur ${money(G.cell.budgetM)} ce mois.</p></section>
  <section class="card"><h2>Évolution expliquée de ton effectif</h2><p class="hint">La progression tient compte du temps de jeu pour tous les joueurs professionnels. Une blessure active suspend la progression ordinaire. L’âge, le staff et l’entraînement restent déterminants. Le journal conserve les variations des qualités du moteur, dont dérivent les compétences détaillées ; il ne remplace pas les notes source.</p>${entries.length?`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Joueur</th><th>Période</th><th>Qualités modifiées</th><th>Contexte</th></tr></thead><tbody>${entries.map(({p,h})=>`<tr><td>${esc(p.name)}</td><td>${h.season} · S${h.week+1}</td><td>${h.delta.map(d=>`${esc(ATTRS[d.k]||d.k)} ${d.from.toFixed(1)} → ${d.to.toFixed(1)}`).join('<br>')}</td><td>${h.causes.map(esc).join('<br>')}</td></tr>`).join('')}</tbody></table></div>`:'<p>Aucune variation enregistrée depuis cette mise à jour. Avance dans la saison pour suivre les changements.</p>'}</section>`;
  el.querySelectorAll('[data-projet]').forEach(b=>b.onclick=()=>show(b.dataset.projet));
  el.querySelector('#suiviProjet').onsubmit=async ev=>{
    ev.preventDefault();const p=el.querySelector('#suiviPid'),m=el.querySelector('#suiviScout');
    if(!p.value||!m.value)return;
    const r=requestObservation(G,+p.value,{scoutId:m.value,observations:3});
    if(!r){el.querySelector('#suiviEtat').textContent='Un suivi est déjà prévu ou le recruteur est indisponible.';return;}
    await save();el.querySelector('#suiviEtat').textContent=`Suivi commandé : premier rapport dans environ ${r.delay} semaines, puis deux observations supplémentaires.`;
  };
}
function navProjet(){const g=NAV_GROUPS.find(x=>x[0]==='Outils');if(g&&!g[1].some(x=>x[0]==='projet'))g[1].unshift(['projet','📁','Projet sportif']);if(!NAV_FLAT.some(x=>x[0]==='projet'))NAV_FLAT.push(['projet','📁','Projet sportif']);}
const __navProjet=applyRoleNav;applyRoleNav=function(){const r=__navProjet.apply(this,arguments);navProjet();return r;};navProjet();
const __showProjet=show;show=function(v){if(v!=='projet')return __showProjet.apply(this,arguments);if(LIVE)return;VIEW_HIST.push(VIEW);VIEW=v;renderTop();document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));vProjetSportif(document.querySelector('#main'));};
