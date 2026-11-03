/* Tous les pays persistent dans la même sauvegarde. Les autres ligues sont simulées en arrière-plan. */
function estMondeMulti(W){return W.clubs?.some(c=>c.worldCountry);}
function paysDuManager(W){return W.clubs.find(c=>c.id===W.clubId)?.worldCountry;}
function preparerPaysActif(W){
  if(!estMondeMulti(W))return;
  W.worldMode=true;W.noForeign=true;
  const country=paysDuManager(W);
  if(country){
    const codes={England:'ENG',France:'FRA',Germany:'GER',Italy:'ITA',Spain:'ESP'};W.regles=codes[country];
    for(const c of W.clubs){c.foreign=c.worldCountry!==country;c.div=c.foreign?0:c.worldDivision;}
  }
}
function liguesDuMonde(W){return [...leagueComps(W),...Object.values(W.comps||{}).filter(c=>c.type==='worldLeague')];}
function initialiserLiguesEtrangeres(W){
  const active=paysDuManager(W), groups=new Map();
  for(const c of W.clubs.filter(c=>c.worldCountry && c.worldCountry!==active)){
    const id='WORLD_'+c.worldCountry+'_'+c.worldCompetitionUid;
    if(!groups.has(id))groups.set(id,{id,type:'worldLeague',country:c.worldCountry,sourceUid:c.worldCompetitionUid,div:c.worldDivision,tier:c.worldTier,name:c.worldCompetitionName,clubs:[]});
    groups.get(id).clubs.push(c.id);
  }
  for(const c of groups.values())W.comps[c.id]={...c,fixtures:makeFixtures(shuffle([...c.clubs]),c.id)};
  W.worldCups={};
  for(const country of new Set(W.clubs.map(c=>c.worldCountry).filter(c=>c&&c!==active))){
    const clubs=W.clubs.filter(c=>c.worldCountry===country).map(c=>c.id);
    W.worldCups[country]={name:'Coupe nationale · '+country,alive:clubs,rounds:[],winner:null,total:cupRoundCount(clubs.length)};
  }
}
function simulerAutresPays(W,round){
  const total=leagueRoundsTotal(W);
  for(const L of Object.values(W.comps).filter(c=>c.type==='worldLeague')){
    const target=Math.min(L.fixtures.length,Math.floor((round+1)*L.fixtures.length/total));
    for(let r=0;r<target;r++)for(const f of L.fixtures[r])if(!f.res)quickSimFixture(W,f);
  }
  for(const cup of Object.values(W.worldCups||{})){
    while(!cup.winner && cup.rounds.length<cup.total && (round+1)/total >= (cup.rounds.length+1)/(cup.total+1)){
      let teams=shuffle([...cup.alive]),byes=[];
      if(!cup.rounds.length){let size=1;while(size*2<=teams.length)size*=2;const n=2*(teams.length-size);if(n){byes=teams.slice(n);teams=teams.slice(0,n);}}
      const ties=[], winners=[...byes];
      for(let i=0;i+1<teams.length;i+=2){const f={h:teams[i],a:teams[i+1],comp:'WORLD_CUP',ko:true};quickSimFixture(W,f);ties.push(f);winners.push(fixtureWinner(f));}
      cup.rounds.push({ties,byes});cup.alive=winners;
      if(winners.length===1)cup.winner=winners[0];
    }
  }
}
function promotionsParPays(W,S,leagues){
  const relegatedTop=[], moves=[];
  for(const country of new Set(leagues.map(l=>l.country))){
    const ls=leagues.filter(l=>l.country===country),tiers=[...new Set(ls.map(l=>l.tier||l.div))].sort((a,b)=>a-b);
    for(let i=0;i+1<tiers.length;i++){
      const upper=ls.filter(l=>(l.tier||l.div)===tiers[i]),lower=ls.filter(l=>(l.tier||l.div)===tiers[i+1]);
      if(upper.length!==1)continue;
      const U=upper[0],candidates=[];
      // Trois places au total ; réparties entre les groupes de D3.
      for(let rank=0;rank<3;rank++)for(const L of lower){const row=standings(W,L.id)[rank];if(row)candidates.push({row,L});}
      const n=Math.min(3,Math.floor(U.clubs.length/6),candidates.length),down=standings(W,U.id).slice(-n);
      for(let k=0;k<n;k++){
        const up=candidates[k],fall=down[k];if(!fall)continue;
        moves.push({club:up.row.id,to:U,up:true},{club:fall.id,to:up.L,up:false});
        if(tiers[i]===1)relegatedTop.push(fall.id);
      }
    }
  }
  for(const move of moves){
    const c=getClub(W,move.club),to=move.to;
    c.worldCompetitionUid=to.sourceUid;c.worldCompetitionName=to.name;c.worldDivision=to.div;c.worldTier=to.tier||to.div;
    if(!c.foreign)c.div=to.div;
    (move.up?S.promoted:S.relegated).push(c.name);
    if(c.id===W.clubId)news(W,`${move.up?'Promotion':'Relégation'} : ${c.name} rejoint ${to.name}.`,move.up?'trophy':'loss');
  }
  return relegatedTop;
}
(() => {
  if(typeof nonUEApres==='function'){
    const quota=nonUEApres;nonUEApres=function(W,id,p){
      if(!W.worldMode)return quota(W,id,p);
      const R=reglesPays(W),unknown=x=>!x.nat || x.nat==='UNK';
      if(unknown(p)||!R.effectif.nonUE||R.nat==='ENG'||UE_EEE.has(p.nat))return null;
      const n=clubPlayers(W,id).filter(x=>!x.academy&&!unknown(x)&&!UE_EEE.has(x.nat)).length+1;
      return n>R.effectif.nonUE?n:null;
    };
  }
  const clubL=clubLeague;clubLeague=function(W,id){return clubL(W,id) || Object.values(W.comps||{}).find(c=>c.type==='worldLeague' && c.clubs.includes(id));};
  if(typeof reglesPays==='function'){const previousRules=reglesPays;reglesPays=function(W){return W.worldMode && typeof REGLES!=='undefined' && REGLES[W.clubs.find(c=>c.id===W.clubId)?.country] || previousRules(W);};}
  // Le moteur historique regroupait toutes les divisions étrangères d'un pays.
  // Le nouveau calendrier par compétition est l'unique source de résultats.
  if(typeof initLiguesEtrangeres==='function'){
    const init=initLiguesEtrangeres;initLiguesEtrangeres=function(W){if(!W.worldMode)return init(W);W.etr={season:W.season,ligues:{}};};
    const advance=avancerLiguesEtrangeres;avancerLiguesEtrangeres=function(W){if(!W.worldMode)return advance(W);};
    const close=cloreLiguesEtrangeres;cloreLiguesEtrangeres=function(W){if(!W.worldMode)return close(W);};
  }
  if(typeof ligueDe==='function'){
    const previousLeague=ligueDe;ligueDe=function(W,p){if(!W.worldMode)return previousLeague(W,p);return p.club==null?'libre':clubLeague(W,p.club)?.id || '';};
    const previousSelect=selectLigues;selectLigues=function(W,val=''){
      if(!W.worldMode)return previousSelect(W,val);
      const leagues=liguesDuMonde(W),countries=[...new Set(leagues.map(L=>L.country))];
      return `<select id="flg" aria-label="Pays et championnat"><option value="">Tous les pays et championnats</option>${countries.map(country=>`<optgroup label="${esc(country)}">${leagues.filter(L=>L.country===country).map(L=>`<option value="${esc(L.id)}" ${val===L.id?'selected':''}>${esc(L.name)}</option>`).join('')}</optgroup>`).join('')}<option value="libre" ${val==='libre'?'selected':''}>Joueurs libres</option></select>`;
    };
  }
  const norm=normalizeWorld;normalizeWorld=function(W){preparerPaysActif(W);return norm(W);};
  const migrate=migrateGame;migrateGame=function(W){preparerPaysActif(W);return migrate(W);};
  const setup=setupSeason;setupSeason=function(W){
    if(!estMondeMulti(W))return setup(W);
    preparerPaysActif(W);
    const own=W.clubs.filter(c=>!c.foreign),defs=new Map();for(const c of own)defs.set(c.worldDivision,c);
    W.leagueNames=[...defs].sort((a,b)=>a[0]-b[0]).map(([,c])=>c.worldCompetitionName);
    W.cupName='Coupe nationale · '+paysDuManager(W);
    setup(W);
    for(const L of leagueComps(W)){const c=getClub(W,L.clubs[0]);L.country=c.worldCountry;L.sourceUid=c.worldCompetitionUid;L.tier=c.worldTier;}
    initialiserLiguesEtrangeres(W);
  };
  const complete=completeWeek;completeWeek=function(W,...args){
    const event=W.schedule?.[W.week];const result=complete(W,...args);
    if(W.worldMode && event?.t==='L')simulerAutresPays(W,event.r);
    return result;
  };
  const promotion=applyPromotions;applyPromotions=function(W,S,L){
    if(!W.worldMode)return promotion(W,S,L);
    return promotionsParPays(W,S,liguesDuMonde(W));
  };
  const end=endSeason;endSeason=function(W,...args){
    if(W.worldMode){
      simulerAutresPays(W,leagueRoundsTotal(W)-1);
      (W.worldHistory||=[]).push({season:W.season,leagues:liguesDuMonde(W).map(L=>({name:L.name,country:L.country,table:standings(W,L.id)})),cups:JSON.parse(JSON.stringify(W.worldCups))});
    }
    return end(W,...args);
  };
  const home=startScreen;startScreen=function(...args){
    const result=home(...args);
    if(typeof DB!=='undefined' && DB.worldMode){
      const title=document.querySelector('#btnImp')?.parentElement?.querySelector('h2');if(title)title.textContent='Nouvelle carrière · tous les pays disponibles';
      document.querySelectorAll('.club-pick[data-id]').forEach(button=>{
        const c=DB.clubs.find(c=>c.id===+button.dataset.id);if(c)button.title=`${c.name} · ${c.worldCountry} · ${c.worldCompetitionName}`;
      });
    }
    return result;
  };
  if(typeof enterGame==='function'){
    const enter=enterGame;enterGame=function(...args){const result=enter(...args);
      if(G?.worldMode){const nav=document.querySelector('#nav');if(nav){const b=document.createElement('button');b.textContent='🌍 Tous les pays';b.onclick=ouvrirClassementsMonde;nav.append(b);}}
      return result;
    };
  }
})();
function ouvrirClassementsMonde(){
  const main=document.querySelector('#main');if(!G?.worldMode || !main)return;
  main.innerHTML='<section class="card"><h1>Tous les pays de la carrière</h1><button class="btn" id="wmActualiser">Actualiser les attributs documentés</button><p>Le pays de ton club utilise le moteur complet. Les autres championnats et coupes avancent en simulation rapide. Promotions simplifiées, sans barrages.</p><select id="wmLeague" aria-label="Championnat"></select><div id="wmTable"></div></section>';
  document.querySelector('#wmActualiser').onclick=proposerMiseAJourAttributs;
  const ls=liguesDuMonde(G),select=document.querySelector('#wmLeague');
  select.innerHTML=ls.map(L=>`<option value="${esc(L.id)}">${esc(L.country)} · ${esc(L.name)}</option>`).join('');
  const render=()=>{const L=G.comps[select.value];document.querySelector('#wmTable').innerHTML='<table><thead><tr><th>Club</th><th>MJ</th><th>Points</th></tr></thead><tbody>'+standings(G,L.id).map(r=>`<tr><td>${esc(getClub(G,r.id).name)}</td><td>${r.p}</td><td>${r.pts}</td></tr>`).join('')+'</tbody></table>';};
  select.onchange=render;render();
}
