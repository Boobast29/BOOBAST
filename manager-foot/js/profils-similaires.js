// Recherche de remplaçants : adaptation de l'approche hybride cosine/euclidienne
// de ScoutEngine, © 2026 Oscar López Andreu (MIT), commit 95ec7505f405b09fa74fceaec424d71beeeb2297.
// Cosine adapté de mljs/distance © 2014 ml.js (MIT), commit c5f1643257e4c4c7dac03ebbdff54adb8d493ae6.
// Originaux et licences conservés dans third_party. Aucune dépendance d'exécution.
const SIMILAR_UI={ref:null,mode:'hybrid',years:3,maxAge:40,maxWeeks:26,affordable:false};
function scoutingCosine(a,b){
 if(a.length!==b.length||!a.length||!a.every(Number.isFinite)||!b.every(Number.isFinite))return null;
 let p=0,p2=0,q2=0;
 for(let i=0;i<a.length;i++){p+=a[i]*b[i];p2+=a[i]*a[i];q2+=b[i]*b[i];}
 // Les profils plats n'ont pas de direction de style identifiable.
 if(p2<1e-12||q2<1e-12)return p2<1e-12&&q2<1e-12?1:0;
 return clamp(p/Math.sqrt(p2*q2),-1,1);
}
function observedSkillProfile(g,p){
 if(p.club===g.clubId||p.loan?.from===g.clubId)return {values:Object.fromEntries(Object.keys(SKILL41).map(k=>[k,skillValue(p,k).value])),own:true,error:0,age:0,report:null};
 // Un rapport récent incomplet ne redonne pas accès à un ancien profil détaillé périmé.
 const r=(g.reports||[]).filter(r=>r.pid===p.id).at(-1);
 if(!r?.skills41)return null;
 return {values:r.skills41,own:false,error:r.skills41Error??2,age:Math.max(0,weeksAgo(g,r.at)),report:r};
}
function profileSimilarity(a,b,role,mode='hybrid'){
 const weights=skillWeights(role),keys=Object.keys(weights),sum=keys.reduce((s,k)=>s+weights[k],0);
 if(keys.some(k=>!Number.isFinite(a[k])||!Number.isFinite(b[k])))return null;
 // Même échelle /20 : pas de z-score ni d'imputation des inconnus à zéro.
 const mean=x=>keys.reduce((s,k)=>s+x[k]*weights[k],0)/sum;
 const ma=mean(a),mb=mean(b),va=keys.map(k=>(a[k]-ma)*Math.sqrt(weights[k])),vb=keys.map(k=>(b[k]-mb)*Math.sqrt(weights[k]));
 const cosine=scoutingCosine(va,vb),style=(cosine+1)/2;
 const distance=Math.sqrt(keys.reduce((s,k)=>s+weights[k]*((a[k]-b[k])/19)**2,0)/sum),level=clamp(1-distance,0,1);
 const score=mode==='style'?style:mode==='level'?level:.55*style+.45*level;
 return {score,style,level,gap:mb-ma,keys};
}
function similarCandidates(g,reference,settings=SIMILAR_UI){
 const ref=observedSkillProfile(g,reference);if(!ref)return {rows:[],unobserved:0,stale:0,invalid:0};
 const years=clamp(Math.round(settings.years||3),1,5),rows=[];let unobserved=0,stale=0,invalid=0;
 const availableFee=Math.max(0,availableTransfer(g)),availableWage=Math.max(0,monthly(g.board.wageCap-wageBill(g)-committedWagesW(g)));
 for(const p of g.players){
  if(p.id===reference.id||p.club===g.clubId||p.retired||p.academy||p.pos!==reference.pos||p.age>settings.maxAge)continue;
  const profile=observedSkillProfile(g,p);if(!profile){unobserved++;continue;}
  if(profile.own)continue;
  if(profile.age>settings.maxWeeks){stale++;continue;}
  const r=profile.report,sim=profileSimilarity(ref.values,profile.values,reference.pos,settings.mode);
  const fee=Number.isFinite(r.feeEst)&&r.feeEst>=0?r.feeEst:null,wage=Number.isFinite(r.wageEst)&&r.wageEst>=0?r.wageEst:null;
  if(!sim){invalid++;continue;}
  const affordable=fee!=null&&wage!=null&&fee<=availableFee&&wage<=availableWage;
  if(settings.affordable&&!affordable)continue;
  const difference=sim.keys.map(k=>({key:k,label:SKILL41[k].label,delta:profile.values[k]-ref.values[k]}));
  rows.push({p,profile,...sim,fee,wage,affordable,cost:fee!=null&&wage!=null?fee+12*years*wage:null,close:difference.slice().sort((a,b)=>Math.abs(a.delta)-Math.abs(b.delta)).slice(0,2),gaps:difference.slice().sort((a,b)=>a.delta-b.delta).slice(0,2)});
 }
 rows.sort((a,b)=>b.score-a.score||(a.cost??Infinity)-(b.cost??Infinity)||a.p.id-b.p.id);
 return {rows,unobserved,stale,invalid,availableFee,availableWage};
}
function cellSimilar(box,root){
 const refs=clubPlayers(G,G.clubId).filter(p=>!p.academy&&!p.retired).sort((a,b)=>a.name.localeCompare(b.name));
 const reference=refs.find(p=>p.id===SIMILAR_UI.ref)||refs[0];
 if(!reference){box.innerHTML='<section class="card"><h2>Profils similaires</h2><p>Aucun joueur disponible comme référence.</p></section>';return;}
 SIMILAR_UI.ref=reference.id;const result=similarCandidates(G,reference),rows=result.rows.slice(0,20);
 const amount=v=>v==null?'Inconnu':money(v);
 box.innerHTML=`<section class="card"><h2>Trouver un remplaçant</h2><p>Comparer les profils observés au même poste que <b>${esc(reference.name)}</b>. La ressemblance ne garantit ni le même niveau ni la réussite du transfert.</p>
 <div class="row gap wrap"><label>Référence<select id="simRef">${refs.map(p=>`<option value="${p.id}" ${p.id===reference.id?'selected':''}>${esc(p.name)} · ${p.pos}</option>`).join('')}</select></label>
 <label>Priorité<select id="simMode"><option value="hybrid" ${SIMILAR_UI.mode==='hybrid'?'selected':''}>Profil et niveau</option><option value="style" ${SIMILAR_UI.mode==='style'?'selected':''}>Style de compétences</option><option value="level" ${SIMILAR_UI.mode==='level'?'selected':''}>Proximité des notes</option></select></label>
 <label>Contrat envisagé<select id="simYears">${[1,2,3,4,5].map(n=>`<option value="${n}" ${n===SIMILAR_UI.years?'selected':''}>${n} an(s)</option>`).join('')}</select></label>
 <label>Âge maximum<input id="simAge" type="number" min="15" max="50" value="${SIMILAR_UI.maxAge}" style="width:80px"></label>
 <label>Rapports de moins de<select id="simWeeks">${[6,13,26,52].map(n=>`<option value="${n}" ${n===SIMILAR_UI.maxWeeks?'selected':''}>${n} semaines</option>`).join('')}</select></label>
 <label class="chk"><input id="simAffordable" type="checkbox" ${SIMILAR_UI.affordable?'checked':''}> Compatibles avec les budgets disponibles</label></div>
 <p class="hint">Disponible : indemnité ${amount(result.availableFee)} · salaire additionnel ${amount(result.availableWage)}/mois, engagements en cours déduits. ${result.rows.length} profil(s) comparable(s), ${result.unobserved} sans détail observé, ${result.stale} rapport(s) trop ancien(s)${result.invalid?', '+result.invalid+' profil(s) incomplet(s)':''}.</p>
 <div class="scroll-x"><table class="tbl"><thead><tr><th>Candidat</th><th>Proximité</th><th>Écart moyen pondéré</th><th>Comparaison des compétences</th><th>Rapport</th><th>Coût sur ${SIMILAR_UI.years} ans</th><th>Budget</th><th>Actions</th></tr></thead><tbody>${rows.map(x=>`<tr><td><button class="btn sm" data-sim-player="${x.p.id}">${esc(x.p.name)}</button><br><small>${x.p.pos} · ${x.p.age} ans</small></td><td>${Math.round(x.score*100)}/100<br><small>style ${Math.round(x.style*100)} · notes ${Math.round(x.level*100)}</small></td><td>${x.gap>=0?'+':''}${x.gap.toFixed(1)}/20<br><small>incertitude du rapport ±${x.profile.error.toFixed(1)}/20</small></td><td><small>Proches : ${x.close.map(d=>esc(d.label)).join(', ')}<br>Écarts les plus bas : ${x.gaps.map(d=>`${esc(d.label)} ${d.delta>=0?'+':''}${d.delta.toFixed(1)}/20`).join(', ')}</small></td><td><small>${esc(x.profile.report.label||'Date inconnue')}<br>${x.profile.age} semaines · ${esc(x.profile.report.byName||'Recruteur')}</small></td><td>${amount(x.cost)}<br><small>Indemnité ${amount(x.fee)}<br>Salaire ${amount(x.wage)}/mois</small></td><td class="${x.affordable?'pos':'warn'}">${x.affordable?'Compatible':'À revoir / inconnu'}</td><td><button class="btn sm" data-sim-target="${x.p.id}">${G.cell.targets.some(t=>t.pid===x.p.id)?'Cible ✔':'+ Cible'}</button><br><button class="btn sm" data-sim-observe="${x.p.id}">Réobserver</button></td></tr>`).join('')||'<tr><td colspan="8">Aucun profil comparable. Demande une observation : les nouveaux rapports conservent désormais les estimations détaillées. Les anciens rapports restent consultables, sans compétences inventées rétroactivement.</td></tr>'}</tbody></table></div>
 <p class="hint">Indice interne, pas une probabilité de réussite. Profil et niveau = 55 % ressemblance de style + 45 % proximité des notes, pondérées pour le poste. Les profils plats ne décrivent pas de spécialisation. Le coût est une base de planification : indemnité + salaires sur la durée choisie ; primes, commissions, charges et revente exclues. Aucun potentiel caché, valeur réelle actuelle ou capacité non observée n’entre dans le classement.</p></section>`;
 const bind=(id,key,convert=v=>v)=>box.querySelector('#'+id).onchange=e=>{SIMILAR_UI[key]=convert(e.target.value);cellSimilar(box,root);};
 bind('simRef','ref',Number);bind('simMode','mode');bind('simYears','years',Number);bind('simAge','maxAge',v=>clamp(Number(v)||40,15,50));bind('simWeeks','maxWeeks',Number);
 box.querySelector('#simAffordable').onchange=e=>{SIMILAR_UI.affordable=e.target.checked;cellSimilar(box,root);};
 box.querySelectorAll('[data-sim-player]').forEach(b=>b.onclick=()=>playerModal(+b.dataset.simPlayer));
 box.querySelectorAll('[data-sim-target]').forEach(b=>b.onclick=()=>{const id=+b.dataset.simTarget;if(!G.cell.targets.some(t=>t.pid===id))G.cell.targets.push({pid:id,added:absWeek(G)});save();cellSimilar(box,root);});
 box.querySelectorAll('[data-sim-observe]').forEach(b=>b.onclick=()=>scoutPlayer(+b.dataset.simObserve));
}
const __profileBeforeSimilar=playerModal;
playerModal=function(pid,tab='profil'){__profileBeforeSimilar(pid,tab);const p=getPlayer(G,pid);if(tab!=='profil'||p?.club!==G.clubId)return;const panel=$('#modal .skill41');if(!panel)return;const button=document.createElement('button');button.id='simFromPlayer';button.className='btn';button.textContent='Chercher un remplaçant de ce profil';panel.appendChild(button);button.onclick=()=>{SIMILAR_UI.ref=pid;CELL_TAB='similar';closeModal();show('cell');};};
