// Préparation des prolongations : implémentation originale pour Manager Foot.
// Les montants du moteur restent hebdomadaires ; les offres sont en €/mois.
function playerWageShare(g,p,clubId=g.clubId){
 if(p.club===clubId)return p.loan?.inLoan?clamp(p.loan.share??1,0,1):1;
 if(p.loan?.inLoan&&p.loan.from===clubId)return 1-clamp(p.loan.share??1,0,1);
 return 0;
}
wageBill=function(g){return g.players.reduce((s,p)=>s+(p.wage||0)*playerWageShare(g,p),0);};
function renewalOwned(g,p){return !!p&&(p.club===g.clubId&&!p.loan?.inLoan||p.loan?.inLoan&&p.loan.from===g.clubId&&p.club!==g.clubId);}
function renewalProjection(g,p,offer){
 const wageM=Number(offer.wageM),years=Number(offer.years),bonus=Number(offer.bonus),clause=Number(offer.clause??0);
 const valid=Number.isFinite(wageM)&&wageM>0&&Number.isInteger(years)&&years>=1&&years<=5&&Number.isFinite(bonus)&&bonus>=0&&Number.isFinite(clause)&&clause>=0;
 if(!valid)return {valid:false,reason:'Salaire positif, durée entière de 1 à 5 ans et montants non négatifs requis.'};
 if(!renewalOwned(g,p))return {valid:false,reason:'Ce contrat relève du club propriétaire du joueur.'};
 const old=p.wage*playerWageShare(g,p),next=weekly(wageM)*playerWageShare(g,p),current=wageBill(g);
 const reserved=committedWagesW(g),projected=current-old+next;
 const cash=myClub(g).budget;
 const peers=g.players.filter(q=>q.id!==p.id&&q.club===g.clubId&&!q.loan?.inLoan&&!q.academy&&!q.retired&&q.wage>0&&q.pos===p.pos).map(q=>q.wage*W2M).sort((a,b)=>a-b);
 const median=peers.length?quantileSorted(peers,.5):null;
 const reasons=[];if(projected+reserved>g.board.wageCap+.01)reasons.push('Plafond salarial dépassé, engagements en cours compris.');if(bonus>cash)reasons.push('Trésorerie insuffisante pour la prime.');
 return {valid:true,current,old,next,reserved,projected,headroom:g.board.wageCap-projected-reserved,delta:next-old,cap:g.board.wageCap,cashAfter:cash-bonus,baseCost:weekly(wageM)*52*years+bonus,years,bonus,median,peerCount:peers.length,peerRatio:median?wageM/median:null,allowed:!reasons.length,reasons};
}
function renewalProjectionHTML(r){
 if(!r.valid)return `<p class="neg">${esc(r.reason)}</p>`;
 return `<div class="grid2"><table class="tbl kv"><tbody>${[['Masse salariale actuelle',wageM(r.current)],['Engagement actuel retiré',wageM(r.old)],['Nouvel engagement ajouté',wageM(r.next)],['Masse salariale après prolongation',wageM(r.projected)],['Autres salaires réservés',wageM(r.reserved)],['Marge sous le plafond',wageM(r.headroom)]].map(([a,b])=>`<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</tbody></table><div><p>Variation : <b class="${r.delta>0?'warn':'pos'}">${r.delta>=0?'+':''}${money(r.delta*52)}/an</b>.</p><p>Base salariale sur ${r.years} an(s) + prime : <b>${money(r.baseCost)}</b>.</p><p>Trésorerie après prime : <b>${money(r.cashAfter)}</b>.</p><p>${r.median==null?'Pas de joueur comparable au même poste.':`Médiane de ${r.peerCount} autre(s) joueur(s) du club au poste : ${money(r.median)}/mois. Proposition : ${r.peerRatio.toFixed(2)} fois cette médiane.`}</p>${r.peerRatio>=1.3?'<p class="warn">Écart salarial marqué : surveille les demandes de revalorisation des joueurs comparables.</p>':''}</div></div><p class="${r.allowed?'pos':'neg'}"><b>${r.allowed?'Compatible avec les budgets actuels':'Offre non finançable'}</b>${r.reasons.length?' · '+r.reasons.map(esc).join(' '):' · L’agent et le joueur doivent encore accepter.'}</p><p class="hint">La prolongation remplace l’ancien salaire : elle ne s’ajoute pas intégralement à celui-ci. Les parts de prêts actuelles sont conservées pour la masse salariale projetée ; la base pluriannuelle utilise le salaire intégral. Primes conditionnelles, charges, commissions et évolution future des prêts ne sont pas incluses. Les recettes futures ne sont pas déduites.</p>`;
}
function renewalOfferFromForm(){return {wageM:$('#wg')?.value,years:$('#yrs')?.value,bonus:$('#sb')?.value,clause:$('#cl')?.value};}
const __renewBeforeProjection=renewModal;
renewModal=function(pid){
 const p=getPlayer(G,pid);if(!renewalOwned(G,p))return toast('La prolongation doit être négociée par le club propriétaire.','err');
 if(p.noRenew===G.season||p.wantsOut)return __renewBeforeProjection(pid);
 __renewBeforeProjection(pid);
 const ok=$('#ok'),wg=$('#wg');if(!ok||!wg)return;
 const section=document.createElement('section');section.className='card';section.id='renewalProjection';section.innerHTML='<h3>Impact avant proposition</h3><div id="renewalProjectionBody"></div>';ok.parentElement.before(section);
 const update=()=>{const box=section.querySelector('#renewalProjectionBody');if(box)box.innerHTML=renewalProjectionHTML(renewalProjection(G,p,renewalOfferFromForm()));};
 for(const id of ['wg','yrs','sb','cl'])$('#'+id)?.addEventListener('input',update);
 const propose=ok.onclick;ok.onclick=()=>{const r=renewalProjection(G,p,renewalOfferFromForm());if(!r.valid||!r.allowed){update();const out=$('#resp');if(out)out.textContent=r.reason||r.reasons.join(' ');return;}propose();};update();
};
function renewalPlanner(){
 const players=G.players.filter(p=>renewalOwned(G,p)).sort((a,b)=>a.contract-b.contract||b.age-a.age);
 modal(`<h2>Préparer les prolongations</h2><p>Repère les fins de contrat et mesure le coût d’une nouvelle offre avant de négocier.</p><div class="scroll-x"><table class="tbl"><thead><tr><th>Joueur</th><th>Âge / poste</th><th>Contrat</th><th>Salaire intégral</th><th>Part payée actuellement</th><th></th></tr></thead><tbody>${players.map(p=>`<tr><td>${esc(p.name)}</td><td>${p.age} ans · ${p.pos}</td><td>${contractEnd(p)}</td><td>${wageM(p.wage)}</td><td>${Math.round(playerWageShare(G,p)*100)} %${p.loan?' · prêt':''}</td><td><button class="btn sm" data-renew-plan="${p.id}">Préparer l’offre</button></td></tr>`).join('')}</tbody></table></div>`,'wide');
 $$('#modal [data-renew-plan]').forEach(b=>b.onclick=()=>renewModal(+b.dataset.renewPlan));
}
const __finBeforeProjection=vFinances;
vFinances=function(el){__finBeforeProjection(el);const card=document.createElement('section');card.className='card';card.innerHTML='<div class="row gap wrap"><div class="grow"><h2>Prolongations et hiérarchie salariale</h2><p class="hint">Préparer les offres, repérer les contrats courts et mesurer leur impact.</p></div><button class="btn" id="openRenewalPlanner">Préparer les prolongations</button></div>';el.prepend(card);card.querySelector('button').onclick=renewalPlanner;};
