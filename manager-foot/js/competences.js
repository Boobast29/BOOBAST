// Modèle original : capacités durables / état du jour / connaissance du club.
const SKILL41 = {"attacking_crossing": {"label": "Centres", "group": "tec", "simOnly": false}, "attacking_finishing": {"label": "Finition", "group": "fin", "simOnly": false}, "attacking_heading_accuracy": {"label": "Précision de la tête", "group": "tac", "simOnly": false}, "attacking_short_passing": {"label": "Passes courtes", "group": "pas", "simOnly": false}, "attacking_volleys": {"label": "Reprises de volée", "group": "fin", "simOnly": false}, "skill_dribbling": {"label": "Dribble", "group": "dri", "simOnly": false}, "skill_curve": {"label": "Effet de balle", "group": "tec", "simOnly": false}, "skill_fk_accuracy": {"label": "Précision des coups francs", "group": "tec", "simOnly": false}, "skill_long_passing": {"label": "Passes longues", "group": "pas", "simOnly": false}, "skill_ball_control": {"label": "Contrôle de balle", "group": "tec", "simOnly": false}, "movement_acceleration": {"label": "Accélération", "group": "vit", "simOnly": false}, "movement_sprint_speed": {"label": "Vitesse de sprint", "group": "vit", "simOnly": false}, "movement_agility": {"label": "Agilité", "group": "dri", "simOnly": false}, "movement_reactions": {"label": "Réactivité", "group": "men", "simOnly": false}, "movement_balance": {"label": "Équilibre", "group": "dri", "simOnly": false}, "power_shot_power": {"label": "Puissance de frappe", "group": "fin", "simOnly": false}, "power_jumping": {"label": "Détente", "group": "phy", "simOnly": false}, "power_stamina": {"label": "Endurance", "group": "phy", "simOnly": false}, "power_strength": {"label": "Force", "group": "phy", "simOnly": false}, "power_long_shots": {"label": "Tirs lointains", "group": "fin", "simOnly": false}, "mentality_aggression": {"label": "Agressivité", "group": "men", "simOnly": false}, "mentality_interceptions": {"label": "Interceptions", "group": "tac", "simOnly": false}, "mentality_positioning": {"label": "Placement offensif", "group": "men", "simOnly": false}, "mentality_vision": {"label": "Vision", "group": "pas", "simOnly": false}, "mentality_penalties": {"label": "Penalties", "group": "fin", "simOnly": false}, "mentality_composure": {"label": "Sang-froid", "group": "men", "simOnly": false}, "defending_awareness": {"label": "Placement défensif", "group": "tac", "simOnly": false}, "defending_standing_tackle": {"label": "Tacles debout", "group": "tac", "simOnly": false}, "defending_sliding_tackle": {"label": "Tacles glissés", "group": "tac", "simOnly": false}, "goalkeeping_diving": {"label": "Plongeons du gardien", "group": "gar", "simOnly": false}, "goalkeeping_handling": {"label": "Prises de balle", "group": "gar", "simOnly": false}, "goalkeeping_kicking": {"label": "Jeu au pied du gardien", "group": "gar", "simOnly": false}, "goalkeeping_positioning": {"label": "Placement du gardien", "group": "gar", "simOnly": false}, "goalkeeping_reflexes": {"label": "Réflexes du gardien", "group": "gar", "simOnly": false}, "decisions": {"label": "Décisions", "group": "men", "simOnly": true}, "anticipation": {"label": "Anticipation", "group": "men", "simOnly": true}, "concentration": {"label": "Concentration", "group": "men", "simOnly": true}, "teamwork": {"label": "Jeu collectif", "group": "men", "simOnly": true}, "determination": {"label": "Détermination", "group": "men", "simOnly": true}, "leadership": {"label": "Leadership", "group": "men", "simOnly": true}, "discipline": {"label": "Discipline", "group": "men", "simOnly": true}};
const SKILL_GROUPS = {"fin": ["attacking_finishing", "attacking_volleys", "power_shot_power", "power_long_shots", "mentality_penalties"], "pas": ["attacking_short_passing", "skill_long_passing", "mentality_vision"], "dri": ["skill_dribbling", "movement_agility", "movement_balance"], "tec": ["skill_ball_control", "attacking_crossing", "skill_curve", "skill_fk_accuracy"], "tac": ["defending_standing_tackle", "defending_sliding_tackle", "mentality_interceptions", "defending_awareness", "attacking_heading_accuracy"], "vit": ["movement_acceleration", "movement_sprint_speed"], "phy": ["power_stamina", "power_strength", "power_jumping"], "men": ["movement_reactions", "mentality_composure", "mentality_positioning", "mentality_aggression", "decisions", "anticipation", "concentration", "teamwork", "determination", "leadership", "discipline"], "gar": ["goalkeeping_diving", "goalkeeping_handling", "goalkeeping_kicking", "goalkeeping_positioning", "goalkeeping_reflexes"]};

function skillSeed(p,k){let h=2166136261;for(const c of String(p.srcId||p.id)+'|'+k)h=Math.imul(h^c.charCodeAt(0),16777619);return ((h>>>0)%10001)/10000*2-1;}
function skillInit(p,source){
 if(source){p.detailSource99={};for(const [k,v] of Object.entries(source))if(SKILL41[k]&&!SKILL41[k].simOnly&&typeof v==='number'&&v>=1&&v<=99)p.detailSource99[k]=v;delete p.skillBase;delete p.skillOffsets;}
 if(!p.skillBase)p.skillBase={...p.attrs};
 if(!p.skillOffsets)p.skillOffsets=Object.fromEntries(Object.keys(SKILL41).map(k=>[k,skillSeed(p,k)*1.6]));
}
function skillValueRaw(p,k){
 const m=SKILL41[k],base=p.skillBase||p.attrs,raw=p.detailSource99?.[k];
 const fromSource=Number.isFinite(raw);
 const initial=fromSource?raw/99*20:(base[m.group]??10)+(p.skillOffsets?.[k]??skillSeed(p,k)*1.6);
 const delta=(p.attrs[m.group]??10)-(base[m.group]??10);
 return {value:clamp(initial+delta,1,20),source:fromSource?'source':'simulation'};
}
function buildSkillWeights(role){
 const weights={};for(const [g,w]of Object.entries(ROLES[role].w))for(const k of SKILL_GROUPS[g])weights[k]=w/SKILL_GROUPS[g].length;
 // Spécialisation : le jeu aérien compte davantage en défense centrale et en pointe.
 const additions={GB:{goalkeeping_reflexes:.12,goalkeeping_positioning:.08},DC:{attacking_heading_accuracy:.12,defending_awareness:.1},DG:{attacking_crossing:.1,power_stamina:.08},DD:{attacking_crossing:.1,power_stamina:.08},MDC:{mentality_interceptions:.1,anticipation:.08},MC:{mentality_vision:.1,decisions:.08},MOC:{mentality_vision:.1,skill_ball_control:.08},AG:{attacking_crossing:.08,movement_acceleration:.1},AD:{attacking_crossing:.08,movement_acceleration:.1},BU:{attacking_heading_accuracy:.08,mentality_positioning:.1,attacking_finishing:.1}};
 for(const [k,w]of Object.entries(additions[role]||{}))weights[k]=(weights[k]||0)+w;
 const sum=Object.values(weights).reduce((a,b)=>a+b,0);for(const k in weights)weights[k]/=sum;return weights;
}
const ROLE_SKILL41=Object.fromEntries(Object.keys(ROLES).map(r=>[r,buildSkillWeights(r)]));
function skillWeights(role){return ROLE_SKILL41[role];}
const SKILL_CACHE41=new WeakMap(), SKILL_KEYS41=Object.keys(ATTRS);
function skillCache(p){
 let c=SKILL_CACHE41.get(p);
 if(c&&c.base===p.skillBase&&c.source===p.detailSource99&&c.offsets===p.skillOffsets&&c.attrs.every((v,i)=>v===p.attrs[SKILL_KEYS41[i]]))return c;
 const values=Object.fromEntries(Object.keys(SKILL41).map(k=>[k,skillValueRaw(p,k)]));
 const groups=Object.fromEntries(Object.entries(SKILL_GROUPS).map(([g,keys])=>[g,keys.reduce((sum,k)=>sum+values[k].value,0)/keys.length]));
 c={base:p.skillBase,source:p.detailSource99,offsets:p.skillOffsets,attrs:SKILL_KEYS41.map(k=>p.attrs[k]),values,groups,roles:{}};SKILL_CACHE41.set(p,c);return c;
}
function skillValue(p,k){return skillCache(p).values[k];}
const __roleBefore41=playerRoleRating;
function skillRating(p,role=p.pos){
 const cache=skillCache(p);if(cache.roles[role])return cache.roles[role];
 const weights=skillWeights(role);let detailed=0;for(const [k,w]of Object.entries(weights))detailed+=cache.values[k].value*5*w;
 const legacy=__roleBefore41(p,role);
 // Transition bornée pour conserver l'ordre de grandeur de l'économie et des parties.
 return cache.roles[role]={value:clamp(legacy+clamp((detailed-legacy)*.5,-5,5),1,99),legacy,detailed,weights};
}
playerRoleRating=function(p,role){return skillRating(p,role).value;};
function skillForm(p,g=G){
 const rows=(p.form||[]).filter(x=>x.s===g?.season&&x.w>=g.week-8&&Number.isFinite(x.r)).slice(-8);
 if(!rows.length)return {n:0,median:null,factor:1};
 const median=quantileSorted(rows.map(x=>x.r).sort((a,b)=>a-b),.5);
 return {n:rows.length,median,factor:1+clamp((median-6.7)*.02,-.03,.03)*rows.length/(rows.length+5)};
}
const CLUB_LANG={FRA:'Français',ENG:'Anglais',GER:'Allemand',ESP:'Espagnol',ITA:'Italien'};
const NAT_LANG={FRA:'Français',ENG:'Anglais',USA:'Anglais',GER:'Allemand',ESP:'Espagnol',ARG:'Espagnol',URU:'Espagnol',COL:'Espagnol',ITA:'Italien',POR:'Portugais',BRA:'Portugais'};
function clubLanguage(g=G,clubId=g?.clubId){const c=g?.clubs?.find(x=>x.id===clubId);return CLUB_LANG[c?.foreign?c.country:g?.real?.country]||'Français';}
function languageLevels(p){
 if(p.languageState?.levels)return p.languageState.levels;
 // Pour une personne réelle, la nationalité ne prouve pas les langues parlées.
 if(p.real||p.srcId)return {};
 return NAT_LANG[p.nat]?{[NAT_LANG[p.nat]]:3}:{};
}
function sharedLanguage(a,b){const A=languageLevels(a),B=languageLevels(b);return Object.keys(A).some(k=>A[k]>=2&&B[k]>=2);}
function languageContext(p,g=G){
 const lang=clubLanguage(g,p.club),v=languageLevels(p)[lang];
 if(v==null)return {lang,level:null,factor:1};
 const mentor=g?.pmap?.[p.integMentor];const support=mentor&&mentor.club===p.club&&sharedLanguage(p,mentor)? .5:0;
 return {lang,level:v,factor:.97+.03*Math.min(3,v+support)/3};
}
bondVal=function(g,a,b){const v=g.bonds?.[bondKey(a,b)];if(v!=null)return v;const pa=g.pmap[a],pb=g.pmap[b];return pa&&pb&&sharedLanguage(pa,pb)?25:10;};
const __langBefore41=langOf;
langOf=function(p){const list=Object.entries(languageLevels(p)).filter(([,v])=>v>=2).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));return list[0]?.[0]||'Autres';};
const __effBefore41=effRating;
effRating=function(p,role,cond=p.fit){return __effBefore41(p,role,cond)*skillForm(p).factor*languageContext(p).factor;};
// L'attribut effectif du moteur d'actions utilise également les nuances de compétences.
const __eaBefore41=Match.prototype.ea;
Match.prototype.ea=function(slot,k){
 const keys=SKILL_GROUPS[k];if(!keys)return __eaBefore41.call(this,slot,k);
 const p=this.G.pmap[slot.id],avg=skillCache(p).groups[k];
 return clamp((p.attrs[k]??10)+clamp((avg-(p.attrs[k]??10))*.5,-1,1),1,20)*(this.mult[slot.id]||1);
};
const __genBefore41=genPlayer;
genPlayer=function(...args){const p=__genBefore41(...args);skillInit(p);return p;};
const __realBefore41=realPlayer;
realPlayer=function(sp,...args){const p=__realBefore41(sp,...args);skillInit(p,sp.detail99||{});return p;};
function initSkillsWorld(g){for(const p of g.players)skillInit(p);}
const __enterBefore41=enterGame;
enterGame=function(){if(G)initSkillsWorld(G);return __enterBefore41();};
const __newBefore41=newGame;
newGame=function(...args){const g=__newBefore41(...args);initSkillsWorld(g);return g;};
function recordSkillHistory(g){
 for(const p of g.players){if(p.club!==g.clubId&&!g.know?.[p.id])continue;
  const key=g.season+':'+Math.floor(g.week/4);const h=p.skillHistory||=[];
  if(h.at(-1)?.key===key)continue;
  const own=p.club===g.clubId||p.loan?.from===g.clubId,k=own?null:knowOf(g,p);
  h.push({key,season:g.season,week:g.week,value:own?playerOvr(p):Math.round(k.est),error:own?0:k.err});if(h.length>36)h.shift();
 }
}
const __weeklyBefore41=weeklyUpdate;
weeklyUpdate=function(g,full=true){const out=__weeklyBefore41(g,full);if(full)recordSkillHistory(g);return out;};
// Remplace le suivi des cours existant : un seul débit par joueur et par semaine.
integrationWeekly=function(g){
 for(const p of clubPlayers(g,g.clubId)){
  const m=getPlayer(g,p.integMentor),valid=m&&m.club===g.clubId;
  if(!valid)delete p.integMentor;
  const partial=(p.integ??100)<100;
  if(valid&&partial){p.integ=clamp(p.integ+(sharedLanguage(p,m)?5:2),0,100);bondGrow(g,p,m);}
  if(!p.langCourse)continue;
  const key=g.season+':'+g.week;if(p.languageLessonWeek===key)continue;p.languageLessonWeek=key;
  const lang=clubLanguage(g),before=languageLevels(p)[lang]??0;
  if(before>=3){delete p.langCourse;continue;}
  p.languageState||={levels:{...languageLevels(p)},source:'simulation'};
  const gain=.08+(p.age<=22?.02:0)+(valid&&sharedLanguage(p,m)?.02:0);
  p.languageState.levels[lang]=Math.min(3,before+gain);
  FLOW_LABEL=`Cours de ${lang} de ${p.name}`;try{flow(g,myClub(g),-350,'staff');}finally{FLOW_LABEL=null;}
  if(partial)p.integ=clamp(p.integ+3,0,100);
  if(p.languageState.levels[lang]>=3)delete p.langCourse;
 }
};

const __reportBefore41=makeReport;
makeReport=function(g,m,p,missionId){
 const r=__reportBefore41(g,m,p,missionId),langs=Object.entries(languageLevels(p));
 // Connaissance figée à la date du rapport : jamais recalculée à l’ouverture.
 const error=Math.max(.75,(r.hi-r.lo)/10);
 r.skills41=Object.fromEntries(Object.keys(SKILL41).map(k=>[k,Math.round(clamp(skillValue(p,k).value+skillSeed({srcId:r.id+'|'+p.id},k)*error,1,20)*10)/10]));
 r.skills41Error=error;
 if(langs.length)r.known.push('Langues du modèle : '+langs.map(([k,v])=>k+' '+v.toFixed(1)+'/3').join(', ')+(p.real||p.srcId?' (simulation, non vérifié biographiquement)':' (profil fictif)'));
 else r.unknown.push('Langues réellement parlées');
 return r;
};

function skillPanel(p){
 const own=p.club===G.clubId||p.loan?.from===G.clubId,known=own||knows(G,p),r=skillRating(p),k=knowOf(G,p);
 const summary=own?Math.round(r.value):k?`${Math.round(k.est-k.err)}–${Math.round(k.est+k.err)}`:'Inconnue';
 const rows=Object.entries(SKILL41).filter(([,m])=>p.pos==='GB'||m.group!=='gar').map(([key,m])=>({key,...m,...skillValue(p,key),weight:r.weights[key]||0}));
 const relevant=rows.filter(x=>x.weight>0).sort((a,b)=>b.value-a.value);
 const traits=arr=>known?arr.map(x=>`${esc(x.label)} (${x.value.toFixed(1)}/20)`).join(' · '):'À préciser par des observations';
 const f=skillForm(p),lc=languageContext(p),langs=Object.entries(languageLevels(p));
 return `<section class="card skill41"><h3>Compétences détaillées · ${rows.length} critères /20</h3><p><b>Niveau au poste : ${summary}/99</b> · ${esc(ROLES[p.pos].label)}. Les poids affichés concernent ce poste.</p><div class="grid2"><p class="pos"><b>Points forts</b><br>${traits(relevant.slice(0,3))}</p><p class="warn"><b>Axes de travail</b><br>${traits(relevant.slice(-3).reverse())}</p></div>
 <div class="grid2">${Object.entries(SKILL_GROUPS).filter(([g])=>p.pos==='GB'||g!=='gar').map(([g,keys])=>{const vals=keys.map(x=>skillValue(p,x).value),avg=vals.reduce((a,b)=>a+b,0)/vals.length;return `<details><summary>${esc(ATTRS[g])} · ${known?avg.toFixed(1):'?'}/20 (${keys.length})</summary><table class="tbl compact"><thead><tr><th>Compétence</th><th>Note</th><th>Poids</th><th>Origine</th></tr></thead><tbody>${rows.filter(x=>x.group===g).map(x=>`<tr><td>${esc(x.label)}</td><td>${own?x.value.toFixed(1):known?`${Math.max(1,Math.floor(x.value-2))}–${Math.min(20,Math.ceil(x.value+2))}`:'?'}</td><td>${Math.round(x.weight*100)} %</td><td>${x.source==='source'?'Source convertie':'Simulation'}</td></tr>`).join('')}</tbody></table></details>`;}).join('')}</div>
 <p class="hint">34 dimensions source possibles + 7 qualités mentales de simulation. Les valeurs manquantes sont estimées à partir du profil de jeu et signalées ; les détails évoluent avec leurs familles d’attributs. Niveau = moyenne par poste des familles existantes, ajustée de la moitié de l’écart à la moyenne détaillée, correction bornée à ±5/99. Ces poids sont un modèle du jeu.</p>
 ${own?`<p>État du jour : condition ${Math.round(p.fit)} %, moral ${Math.round(p.morale)} %, forme ${f.median==null?'échantillon absent':f.median.toFixed(2)+'/10 sur '+f.n+' matchs'} (effet ${((f.factor-1)*100).toFixed(1)} %). L’âge agit via le développement, pas un bonus automatique.</p>`:''}
 <h4>Langues et communication</h4><p>${langs.length?langs.map(([l,v])=>`${esc(l)} : ${v.toFixed(1)}/3`).join(' · '):'Langues réelles non documentées.'} ${p.languageState?'(apprentissage de simulation)':!p.real&&!p.srcId?'(profil fictif de simulation)':''}</p><p class="hint">Langue du club : ${esc(lc.lang)}. ${lc.level==null?'Compétence inconnue : aucun malus présumé.':`Communication : ${((lc.factor-1)*100).toFixed(1)} % sur l’efficacité, sans modifier le talent.`} Un parrain bilingue réduit la difficulté. Niveaux : 0 débutant, 1 élémentaire, 2 autonome, 3 courant.</p>
 ${own?`<label class="chk"><input id="skillLanguageCourse" type="checkbox" ${p.langCourse?'checked':''}> Cours de ${esc(lc.lang)} · 350 €/semaine ; arrêt automatique à 3/3</label>`:''}
 <h4>Évolution observée</h4><p>${(p.skillHistory||[]).slice(-8).map(h=>`${h.season}, sem. ${h.week+1} : ${h.value}${h.error?' ±'+h.error.toFixed(1):''}`).join(' → ')||'Le suivi commence à la prochaine mise à jour hebdomadaire.'}</p>
 ${own&&p.srcId&&!Object.keys(p.detailSource99||{}).length?'<button class="btn sm" id="skillHydrate">Charger les compétences de la fiche source</button>':''}</section>`;
}
const __modalBefore41=playerModal;
playerModal=function(pid,tab='profil'){
 __modalBefore41(pid,tab);if(tab!=='profil')return;
 const p=getPlayer(G,pid),body=$('#modal .pm-body')||$('#modal');if(!p||!body)return;
 body.insertAdjacentHTML('beforeend',skillPanel(p));
 const c=$('#skillLanguageCourse');if(c)c.onchange=()=>{p.langCourse=c.checked;save();};
 const load=$('#skillHydrate');if(load)load.onclick=async()=>{load.disabled=true;try{const f=await api('/api/joueur/'+encodeURIComponent(p.srcId));if(f.id!==p.srcId)throw Error('Identité source différente');const source=f.source?.capacites?.attributs_detail_sur_99;if(!source||!Object.keys(source).length)throw Error('Aucun détail disponible dans cette source');skillInit(p,source);save();playerModal(pid);}catch(e){toast(e.message,'err');load.disabled=false;}};
};
