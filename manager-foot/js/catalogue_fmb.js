/* Source documentaire séparée des notes évolutives des sauvegardes. */
(() => {
  'use strict';
  const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const livres = n => n==null ? '—' : '£' + new Intl.NumberFormat('en-GB',{notation:'compact',maximumFractionDigits:1}).format(n);
  const lib = {players:'Joueurs', staff:'Staff et entraîneurs', clubs:'Clubs', competitions:'Compétitions'};
  const url = (action, type, id) => `/api/catalogue/${action}/${encodeURIComponent(type)}/${encodeURIComponent(id)}`;
  let photosAvecUrl = new Set(), photosCommons = {};
  async function api(path, signal) {
    const r = await fetch('/api/catalogue/' + path, {signal});
    const d = await r.json();
    if (!r.ok) throw Error(d.erreur || 'Catalogue indisponible');
    return d;
  }
  function image(type, id, nom, dispo) {
    const repli = `<span class="fmb-initiales" aria-hidden="true">${e(nom.trim().split(/\s+/).slice(0,2).map(n=>n[0]).join(''))}</span>`;
    const credit = type === 'players' && photosCommons[String(id)]?.name === nom ? photosCommons[String(id)] : null;
    const distant = credit ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(credit.file.replaceAll(' ','_'))}?width=300` : type === 'players' && /^\d+$/.test(String(id)) ? `https://media.footballmanagerblog.org/faces/${encodeURIComponent(id)}.webp` : '';
    if (!dispo && !distant) return repli;
    return `<img class="fmb-image" src="${e(dispo ? url('image',type,id) : distant)}" alt="${e(nom)}" loading="lazy" referrerpolicy="no-referrer" data-alt-src="${e(dispo ? distant : '')}" data-fb="${e(repli)}" onerror="if(this.dataset.altSrc){this.src=this.dataset.altSrc;this.dataset.altSrc='';}else this.outerHTML=this.dataset.fb">`;
  }
  async function ouvrir(hote) {
    const enPartie = !!document.querySelector('#main');
    const el = hote || document.querySelector('#main') || document.querySelector('#app');
    el.innerHTML = `<section class="fmb"><div class="fmb-entete"><div><p class="fmb-sur">FOOTBALL MONDE · FMB</p><h1>Le répertoire du football</h1><p>Joueurs, staff, clubs et compétitions. Consultation sans modifier ta partie.</p></div><button class="btn" id="fmbRetour">Retour au ${enPartie ? 'club' : 'menu'}</button></div>
      <div id="fmbEtat" role="status">Chargement du catalogue local…</div>
      <form class="fmb-filtres" id="fmbForm"><label>Catégorie<select id="fmbType">${Object.entries(lib).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label class="fmb-recherche">Rechercher un nom<input id="fmbQ" type="search" maxlength="200" placeholder="Nom du joueur ou de l’entraîneur…"></label><label class="fmb-joueurs-filtre">Club du relevé<input id="fmbClub" type="search" maxlength="80" placeholder="Ex. Paris"></label><label class="fmb-joueurs-filtre">Poste<select id="fmbPoste"><option value="">Tous</option>${[['GK','Gardien'],['DC','Défenseur central'],['DR','Latéral droit'],['DL','Latéral gauche'],['DM','Milieu défensif'],['MC','Milieu central'],['AMC','Milieu offensif'],['AMR','Ailier droit'],['AML','Ailier gauche'],['ST','Avant-centre']].map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label class="fmb-joueurs-filtre">Âge maximum<select id="fmbAge"><option value="">Tous</option>${[18,21,25,30,35].map(n=>`<option value="${n}">${n} ans</option>`).join('')}</select></label><label class="fmb-joueurs-filtre">Niveau source ≥<select id="fmbNiveau"><option value="">Tous</option>${[50,60,70,80].map(n=>`<option value="${n}">${n} / 99</option>`).join('')}</select></label><label class="fmb-joueurs-filtre">Valeur FM26 ≤<select id="fmbValeur"><option value="">Toutes</option><option value="1000000">£1m</option><option value="5000000">£5m</option><option value="20000000">£20m</option></select></label><label class="fmb-joueurs-filtre">Salaire FM26 ≤<select id="fmbSalaire"><option value="">Tous</option><option value="10000">£10k/semaine</option><option value="50000">£50k/semaine</option></select></label><label>Tri<select id="fmbTri"><option value="nom">Nom</option><option value="niveau">Niveau source</option><option value="potentiel">Potentiel source</option><option value="marge">Écart niveau / potentiel</option><option value="valeur">Valeur croissante</option><option value="age">Plus jeune</option></select></label><label><input type="checkbox" id="fmbDetail"> Profils détaillés</label><label><input type="checkbox" id="fmbPhoto"> Visuel local</label><button class="btn primary">Rechercher</button></form>
      <div class="fmb-presets" aria-label="Recherches rapides"><button class="btn" data-preset="young">Jeunes à potentiel</button><button class="btn" data-preset="bargain">Jeunes à moins de £5m</button></div><p id="fmbCompte" role="status"></p><div class="fmb-layout"><div><div id="fmbListe" class="fmb-liste"></div><div class="fmb-pagination"><button class="btn" id="fmbPrec">Précédent</button><span id="fmbPage"></span><button class="btn" id="fmbSuiv">Suivant</button></div></div><aside id="fmbFiche" aria-live="polite"><p>Sélectionne une fiche pour voir ses informations et ses compétences documentées.</p></aside></div></section>`;
    const $ = s => el.querySelector(s);
    $('#fmbRetour').onclick = () => enPartie ? show('inbox') : startScreen();
    let page=0, abort, detailAbort, total=0;
    async function fiche(type,id) {
      detailAbort?.abort(); detailAbort = new AbortController();
      const target=$('#fmbFiche'); target.innerHTML='<p>Chargement de la fiche…</p>';
      try {
        const x = await api(`fiche/${encodeURIComponent(type)}/${encodeURIComponent(id)}`,detailAbort.signal);
        const d=x.detail, supplement=x.supplement, media=x.photo||x.logo, champs=x.observations?.find(o=>o.fields_source)?.fields_source||{}, index=x._index||{};
        const credit=type==='players' && photosCommons[String(id)]?.name===x.name ? photosCommons[String(id)] : null;
        const source=x.profile_url||x.source_url;
        const sourceSure=typeof source==='string' && /^https:\/\//.test(source);
        const groupes = Object.entries(d?.attributes_1_99||{});
        target.innerHTML=`<div class="fmb-profil">${image(type,id,x.name,media?.available_offline)}<div><small>${e(lib[type])} · UID ${e(id)}</small><h2>${e(x.name)}</h2></div></div>
          <p class="fmb-mention">FM26 26.3.2 · ${e(d?.retrieved_on||'Collecte du pack : 03/11/2026')}. Situation réelle actuelle non vérifiée.</p>
          ${type==='players' && !media?.available_offline && !photosAvecUrl.has(String(id)) && !credit ? '<p class="fmb-mention">Photo : adresse FMB tentée à partir de l’identifiant, sans disponibilité vérifiée. Initiales affichées si elle échoue.</p>' : ''}
          ${credit ? `<p class="fmb-mention">Photo : <a href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(credit.file.replaceAll(' ','_'))}" target="_blank" rel="noopener noreferrer">${e(credit.author)} · ${e(credit.license)} · Wikimedia Commons</a>${credit.note ? ` · ${e(credit.note)}` : ''}</p>` : ''}
          ${d?.role_or_position_source||champs.position||champs.job ? `<p><b>Rôle source :</b> ${e(d?.role_or_position_source||champs.position||champs.job)}</p>` : ''}
          ${type==='players' ? `<div class="fmb-identite"><div><small>CLUB DU RELEVÉ</small><strong>${e(index.club||'Non renseigné')}</strong></div><div><small>POSTE</small><strong>${e(index.poste||'Inconnu')}</strong></div><div><small>ÂGE DU RELEVÉ</small><strong>${index.age??'—'}</strong></div></div>${index.niveau!=null||index.potentiel!=null?`<div class="fmb-scores"><div><b>${index.niveau??'—'}</b><small>Niveau source / 99</small></div><div><b>${index.potentiel??'—'}</b><small>Potentiel source / 99</small></div></div><p class="fmb-mention">Écart potentiel − niveau : ${index.niveau!=null&&index.potentiel!=null?index.potentiel-index.niveau:'inconnu'} point(s). C’est un écart de scores FMblog, pas une progression garantie dans ta partie.</p>`:''}${champs.value||champs.wage?`<p class="fmb-mention">Valeur source : ${e(champs.value||'inconnue')} · Salaire source : ${e(champs.wage||'inconnu')}. Montants en livres du jeu FM26, non vérifiés comme contrats actuels ; £0 ne signifie pas nécessairement gratuit.</p>`:''}` : ''}
          ${supplement ? `<div class="fmb-supplement"><h3>Informations de la fiche FMblog</h3><p>${[supplement.foot?`Pied préféré : ${e(supplement.foot)}`:'',supplement.contractEndText?`Échéance du contrat dans FM26 : ${e(supplement.contractEndText)}`:'',supplement.targetCompetition?`Compétition du relevé : ${e(supplement.targetCompetition)}`:''].filter(Boolean).join(' · ')}</p>${supplement.wageSourceText?`<p class="fmb-mention">Salaire affiché : ${e(supplement.wageSourceText)}. Montant du jeu source, pas une rémunération réelle vérifiée.</p>`:''}</div>`:''}
          ${x.country ? `<p><b>Pays :</b> ${e(x.country)}</p>`:''}
          ${d?.date_of_birth ? `<p><b>Naissance :</b> ${e(d.date_of_birth)}</p>`:''}
          ${d?.nationality_display_source ? `<p><b>Nationalité affichée :</b> ${e(d.nationality_display_source)}</p>`:''}
          ${d?.scores && (type!=='players' || index.niveau==null && index.potentiel==null) ? `<div class="fmb-scores">${Object.entries(d.scores).map(([k,v])=>`<div><b>${e(v??'Inconnu')}</b><small>${k==='current_ability'?'Niveau source':'Potentiel source'} / 99</small></div>`).join('')}</div>`:''}
          ${groupes.length ? `<p>Compétences FMB sur 99. Les moyennes portent uniquement sur les valeurs connues.</p>${groupes.map(([k,attrs])=>{
            const lignes=Object.entries(attrs).filter(([,a])=>typeof a.value==='number');
            const moyenne=lignes.length ? Math.round(lignes.reduce((n,[,a])=>n+a.value,0)/lignes.length) : null;
            return `<h3>${e(k.replaceAll('_',' '))} <small>${moyenne??'—'} / 99</small></h3><div class="fmb-attributs">${lignes.map(([,a])=>`<div><span>${e(a.label_fr||a.label_source)}</span><meter min="1" max="99" value="${a.value}">${a.value}</meter><b>${a.value}</b></div>`).join('')}</div>`;
          }).join('')}`:supplement?.attributes?'':'<p class="fmb-mention">Compétences détaillées inconnues. Cette fiche ne fournit pas de notes individuelles.</p>'}
          ${!groupes.length && supplement?.attributes ? `<h3>Attributs calculés FMblog · sur 99</h3><p class="fmb-mention">Scores publics du modèle FMB, distincts des notes originales de Football Manager et de la carrière jouée.</p><div class="fmb-attributs">${Object.entries(supplement.attributes).filter(([,v])=>Number.isFinite(v)).map(([k,v])=>`<div><span>${e(k)}</span><meter min="1" max="99" value="${v}">${v}</meter><b>${v}</b></div>`).join('')}</div>`:''}
          ${supplement?.fmbIndicators && Object.keys(supplement.fmbIndicators).length ? `<details class="fmb-indicateurs"><summary>Indicateurs composites FMblog</summary><p class="fmb-mention">Indicateurs calculés par FMblog, sans divulguer les attributs cachés originaux.</p><div class="fmb-attributs">${Object.entries(supplement.fmbIndicators).filter(([,v])=>Number.isFinite(v)).map(([k,v])=>`<div><span>${e(k)}</span><meter min="1" max="99" value="${v}">${v}</meter><b>${v}</b></div>`).join('')}</div></details>`:''}
          ${d?.descriptive_summary ? ['highest_measured_attributes','lowest_measured_attributes'].map((k,i)=>{
            const list=d.descriptive_summary[k]||[];return list.length?`<h3>${i?'Points à travailler':'Points forts'} mesurés</h3><p>${list.map(a=>e(a.label_fr||a.label_source||a.attribute||a.key||'')+' ('+e(a.value)+')').join(' · ')}</p>`:'';
          }).join(''):''}
          ${x.memberships?.length ? `<h3>Affectations dans la source</h3><p>${x.memberships.slice(0,12).map(m=>e(m.squad_label_source||'Club')+' · UID club '+e(m.owner_club_fm_uid)).join('<br>')}</p><p class="fmb-mention">Une affectation source ne prouve pas un contrat actuel. Salaire, langues et disponibilité ne sont pas déduits.</p>`:''}
          ${sourceSure ? `<a class="btn" href="${e(source)}" target="_blank" rel="noopener noreferrer">Voir la source (Internet)</a>`:''}`;
      } catch(err) {if(err.name!=='AbortError') target.textContent=err.message;}
    }
    async function liste() {
      abort?.abort(); abort=new AbortController(); const type=$('#fmbType').value;
        const p=new URLSearchParams({type,q:$('#fmbQ').value,page,taille:24,detail:$('#fmbDetail').checked?'1':'0',photo:$('#fmbPhoto').checked?'1':'0',tri:$('#fmbTri').value});
        if(type==='players')for(const [key,id] of [['club','fmbClub'],['poste','fmbPoste'],['age_max','fmbAge'],['niveau_min','fmbNiveau'],['valeur_max','fmbValeur'],['salaire_max','fmbSalaire']])if($('#'+id).value)p.set(key,$('#'+id).value);
      $('#fmbCompte').textContent='Recherche…';
      try {
        const d=await api('recherche?'+p,abort.signal); total=d.total;
        $('#fmbCompte').textContent=`${total.toLocaleString('fr-FR')} résultats · ${lib[type]}`;
        $('#fmbListe').innerHTML=d.resultats.map(x=>`<button class="fmb-carte" data-id="${e(x.id)}">${image(x.type,x.id,x.nom,!!x.photo)}<span><strong>${e(x.nom)}</strong><small>${type==='players' ? e([x.poste,x.age!=null?x.age+' ans':null,x.club].filter(Boolean).join(' · ')||'Profil source') : x.detail?'Compétences détaillées':'Fiche de référence'}</small>${type==='players' ? `<span class="fmb-carte-scores"><b>Niveau ${x.niveau??'—'}</b><b>Potentiel ${x.potentiel??'—'}</b>${x.valeur_gbp!=null?`<em>Valeur ${livres(x.valeur_gbp)}</em>`:''}${x.detail?'<em>Attributs détaillés</em>':''}</span>` : ''}</span><span aria-hidden="true">›</span></button>`).join('')||'<p>Aucune fiche ne correspond aux filtres.</p>';
        $('#fmbListe').querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>fiche(type,b.dataset.id));
        $('#fmbPrec').disabled=page===0; $('#fmbSuiv').disabled=(page+1)*24>=total;
        $('#fmbPage').textContent=`${page+1} / ${Math.max(1,Math.ceil(total/24))}`;
      } catch(err) {if(err.name!=='AbortError') $('#fmbCompte').textContent=err.message;}
    }
    $('#fmbForm').onsubmit=ev=>{ev.preventDefault();page=0;liste();};
    el.querySelectorAll('[data-preset]').forEach(button=>button.onclick=()=>{
      $('#fmbType').value='players';$('#fmbQ').value='';$('#fmbClub').value='';$('#fmbPoste').value='';
      $('#fmbAge').value=button.dataset.preset==='bargain'?'25':'21';$('#fmbNiveau').value='';
      $('#fmbValeur').value=button.dataset.preset==='bargain'?'5000000':'';$('#fmbSalaire').value='';
      $('#fmbTri').value=button.dataset.preset==='bargain'?'marge':'potentiel';
      $('#fmbDetail').checked=false;$('#fmbPhoto').checked=false;
      el.querySelectorAll('.fmb-joueurs-filtre').forEach(node=>node.hidden=false);
      page=0;liste();
    });
    $('#fmbType').onchange=()=>{
      const personne=['players','staff'].includes($('#fmbType').value);
      $('#fmbDetail').disabled=!personne;if(!personne)$('#fmbDetail').checked=false;
      el.querySelectorAll('.fmb-joueurs-filtre').forEach(node=>node.hidden=$('#fmbType').value!=='players');
      $('#fmbTri').value='nom';
      detailAbort?.abort();$('#fmbFiche').innerHTML='<p>Sélectionne une fiche.</p>';page=0;liste();
    };
    $('#fmbPrec').onclick=()=>{if(page>0){page--;liste();}};
    $('#fmbSuiv').onclick=()=>{if((page+1)*24<total){page++;liste();}};
    try {
      try { const r=await fetch('packs/portraits-locaux-fmb.json'); if(r.ok)photosAvecUrl=new Set((await r.json()).external.map(String)); } catch { photosAvecUrl=new Set(); }
      try { const r=await fetch('packs/portraits-commons-verifies.json'); if(r.ok)photosCommons=(await r.json()).players; } catch { photosCommons={}; }
      const s=await api('etat');
      $('#fmbEtat').innerHTML=`<div class="fmb-chiffres">${Object.entries(s.comptes).map(([k,n])=>`<div><b>${n.toLocaleString('fr-FR')}</b><span>${e(lib[k])}</span></div>`).join('')}</div><p class="fmb-mention">${(s.profils_detailles_joueurs??s.profils_detailles_catalogue).toLocaleString('fr-FR')} fiches joueurs avec attributs détaillés · ${e(s.note)}</p>`;
      await liste();
    } catch(err) {
      $('#fmbEtat').textContent='Catalogue hors ligne : lance Lancer_Manager_Foot.bat ou python outils/serveur.py. '+err.message;
    }
  }
  window.ouvrirCatalogueFMB=ouvrir;
  const ancienStart=startScreen;
  startScreen=async function(...args) {
    const res=await ancienStart.apply(this,args);
    const zone=document.querySelector('.start-wrap');
    if(zone&&!document.querySelector('#fmbAccueil')) {
      const c=document.createElement('div');c.className='card';c.id='fmbAccueil';
      c.innerHTML='<h2>Football Monde · FMB</h2><p>32 852 fiches de joueurs et staff, 355 clubs et 18 compétitions. Les logos présents dans le pack local restent accessibles hors ligne ; les autres dépendent de leur URL source.</p><button class="btn primary">Explorer le catalogue</button>';
      c.querySelector('button').onclick=()=>ouvrir();zone.insertBefore(c,zone.querySelector('#mondeCard'));
    }
    return res;
  };
  const ancienShow=show;
  show=function(v,...args) {
    if(v==='catalogueFMB') {if(typeof LIVE!=='undefined'&&LIVE)return; VIEW=v; document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));ouvrir();return;}
    return ancienShow.call(this,v,...args);
  };
  function ajouterNav(){
    if(typeof NAV_GROUPS==='undefined')return;
    const g=NAV_GROUPS.find(g=>g[0]==='Outils');
    if(g&&!g[1].some(x=>x[0]==='catalogueFMB'))g[1].push(['catalogueFMB','🌐','Catalogue FMB']);
    if(typeof NAV_FLAT!=='undefined'&&!NAV_FLAT.some(x=>x[0]==='catalogueFMB'))NAV_FLAT.push(['catalogueFMB','🌐','Catalogue FMB']);
  }
  ajouterNav();
  if(typeof applyRoleNav==='function') {
    const ancien=applyRoleNav; applyRoleNav=function(...args){const r=ancien.apply(this,args);ajouterNav();return r;};
  }
})();
