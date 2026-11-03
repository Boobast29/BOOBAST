/* Source documentaire séparée des notes évolutives des sauvegardes. */
(() => {
  'use strict';
  const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
    const distant = type === 'players' && photosAvecUrl.has(String(id)) ? `https://media.footballmanagerblog.org/faces/${encodeURIComponent(id)}.webp` : credit ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(credit.file.replaceAll(' ','_'))}?width=300` : '';
    if (!dispo && !distant) return repli;
    return `<img class="fmb-image" src="${e(dispo ? url('image',type,id) : distant)}" alt="${e(nom)}" loading="lazy" referrerpolicy="no-referrer" data-alt-src="${e(dispo ? distant : '')}" data-fb="${e(repli)}" onerror="if(this.dataset.altSrc){this.src=this.dataset.altSrc;this.dataset.altSrc='';}else this.outerHTML=this.dataset.fb">`;
  }
  async function ouvrir(hote) {
    const enPartie = !!document.querySelector('#main');
    const el = hote || document.querySelector('#main') || document.querySelector('#app');
    el.innerHTML = `<section class="fmb"><div class="fmb-entete"><div><p class="fmb-sur">FOOTBALL MONDE · FMB</p><h1>Le répertoire du football</h1><p>Joueurs, staff, clubs et compétitions. Consultation sans modifier ta partie.</p></div><button class="btn" id="fmbRetour">Retour au ${enPartie ? 'club' : 'menu'}</button></div>
      <div id="fmbEtat" role="status">Chargement du catalogue local…</div>
      <form class="fmb-filtres" id="fmbForm"><label>Catégorie<select id="fmbType">${Object.entries(lib).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label class="fmb-recherche">Rechercher un nom<input id="fmbQ" type="search" maxlength="200" placeholder="Joueur, entraîneur, club…"></label><label><input type="checkbox" id="fmbDetail"> Profils détaillés</label><label><input type="checkbox" id="fmbPhoto"> Visuel local</label><button class="btn primary">Rechercher</button></form>
      <p id="fmbCompte" role="status"></p><div class="fmb-layout"><div><div id="fmbListe" class="fmb-liste"></div><div class="fmb-pagination"><button class="btn" id="fmbPrec">Précédent</button><span id="fmbPage"></span><button class="btn" id="fmbSuiv">Suivant</button></div></div><aside id="fmbFiche" aria-live="polite"><p>Sélectionne une fiche pour voir ses informations et ses compétences documentées.</p></aside></div></section>`;
    const $ = s => el.querySelector(s);
    $('#fmbRetour').onclick = () => enPartie ? show('inbox') : startScreen();
    let page=0, abort, detailAbort, total=0;
    async function fiche(type,id) {
      detailAbort?.abort(); detailAbort = new AbortController();
      const target=$('#fmbFiche'); target.innerHTML='<p>Chargement de la fiche…</p>';
      try {
        const x = await api(`fiche/${encodeURIComponent(type)}/${encodeURIComponent(id)}`,detailAbort.signal);
        const d=x.detail, media=x.photo||x.logo, champs=x.observations?.[0]?.fields_source||{};
        const credit=type==='players' && photosCommons[String(id)]?.name===x.name ? photosCommons[String(id)] : null;
        const source=x.profile_url||x.source_url;
        const sourceSure=typeof source==='string' && /^https:\/\//.test(source);
        const groupes = Object.entries(d?.attributes_1_99||{});
        target.innerHTML=`<div class="fmb-profil">${image(type,id,x.name,media?.available_offline)}<div><small>${e(lib[type])} · UID ${e(id)}</small><h2>${e(x.name)}</h2></div></div>
          <p class="fmb-mention">FM26 26.3.2 · ${e(d?.retrieved_on||'Collecte du pack : 03/11/2026')}. Situation réelle actuelle non vérifiée.</p>
          ${credit ? `<p class="fmb-mention">Photo : <a href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(credit.file.replaceAll(' ','_'))}" target="_blank" rel="noopener noreferrer">${e(credit.author)} · ${e(credit.license)} · Wikimedia Commons</a>${credit.note ? ` · ${e(credit.note)}` : ''}</p>` : ''}
          ${d?.role_or_position_source||champs.position||champs.job ? `<p><b>Rôle source :</b> ${e(d?.role_or_position_source||champs.position||champs.job)}</p>` : ''}
          ${x.country ? `<p><b>Pays :</b> ${e(x.country)}</p>`:''}
          ${d?.date_of_birth ? `<p><b>Naissance :</b> ${e(d.date_of_birth)}</p>`:''}
          ${d?.scores ? `<div class="fmb-scores">${Object.entries(d.scores).map(([k,v])=>`<div><b>${e(v??'Inconnu')}</b><small>${k==='current_ability'?'Niveau source':'Potentiel source'} / 99</small></div>`).join('')}</div>`:''}
          ${groupes.length ? `<p>Compétences FMB sur 99. Les moyennes portent uniquement sur les valeurs connues.</p>${groupes.map(([k,attrs])=>{
            const lignes=Object.entries(attrs).filter(([,a])=>typeof a.value==='number');
            const moyenne=lignes.length ? Math.round(lignes.reduce((n,[,a])=>n+a.value,0)/lignes.length) : null;
            return `<h3>${e(k.replaceAll('_',' '))} <small>${moyenne??'—'} / 99</small></h3><div class="fmb-attributs">${lignes.map(([,a])=>`<div><span>${e(a.label_fr||a.label_source)}</span><meter min="1" max="99" value="${a.value}">${a.value}</meter><b>${a.value}</b></div>`).join('')}</div>`;
          }).join('')}`:'<p class="fmb-mention">Compétences détaillées inconnues. Cette fiche ne fournit pas de notes individuelles.</p>'}
          ${d?.descriptive_summary ? ['highest_measured_attributes','lowest_measured_attributes'].map((k,i)=>{
            const list=d.descriptive_summary[k]||[];return list.length?`<h3>${i?'Points à travailler':'Points forts'} mesurés</h3><p>${list.map(a=>e(a.label_fr||a.label_source||a.attribute||a.key||'')+' ('+e(a.value)+')').join(' · ')}</p>`:'';
          }).join(''):''}
          ${x.memberships?.length ? `<h3>Affectations dans la source</h3><p>${x.memberships.slice(0,12).map(m=>e(m.squad_label_source||'Club')+' · UID club '+e(m.owner_club_fm_uid)).join('<br>')}</p><p class="fmb-mention">Une affectation source ne prouve pas un contrat actuel. Salaire, langues et disponibilité ne sont pas déduits.</p>`:''}
          ${sourceSure ? `<a class="btn" href="${e(source)}" target="_blank" rel="noopener noreferrer">Voir la source (Internet)</a>`:''}`;
      } catch(err) {if(err.name!=='AbortError') target.textContent=err.message;}
    }
    async function liste() {
      abort?.abort(); abort=new AbortController(); const type=$('#fmbType').value;
      const p=new URLSearchParams({type,q:$('#fmbQ').value,page,taille:24,detail:$('#fmbDetail').checked?'1':'0',photo:$('#fmbPhoto').checked?'1':'0'});
      $('#fmbCompte').textContent='Recherche…';
      try {
        const d=await api('recherche?'+p,abort.signal); total=d.total;
        $('#fmbCompte').textContent=`${total.toLocaleString('fr-FR')} résultats · ${lib[type]}`;
        $('#fmbListe').innerHTML=d.resultats.map(x=>`<button class="fmb-carte" data-id="${e(x.id)}">${image(x.type,x.id,x.nom,!!x.photo)}<span><strong>${e(x.nom)}</strong><small>${x.detail?'Compétences détaillées':'Fiche de référence'}</small></span><span aria-hidden="true">›</span></button>`).join('')||'<p>Aucune fiche ne correspond aux filtres.</p>';
        $('#fmbListe').querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>fiche(type,b.dataset.id));
        $('#fmbPrec').disabled=page===0; $('#fmbSuiv').disabled=(page+1)*24>=total;
        $('#fmbPage').textContent=`${page+1} / ${Math.max(1,Math.ceil(total/24))}`;
      } catch(err) {if(err.name!=='AbortError') $('#fmbCompte').textContent=err.message;}
    }
    $('#fmbForm').onsubmit=ev=>{ev.preventDefault();page=0;liste();};
    $('#fmbType').onchange=()=>{
      const personne=['players','staff'].includes($('#fmbType').value);
      $('#fmbDetail').disabled=!personne;if(!personne)$('#fmbDetail').checked=false;
      detailAbort?.abort();$('#fmbFiche').innerHTML='<p>Sélectionne une fiche.</p>';page=0;liste();
    };
    $('#fmbPrec').onclick=()=>{if(page>0){page--;liste();}};
    $('#fmbSuiv').onclick=()=>{if((page+1)*24<total){page++;liste();}};
    try {
      try { const r=await fetch('packs/portraits-locaux-fmb.json'); if(r.ok)photosAvecUrl=new Set((await r.json()).external.map(String)); } catch { photosAvecUrl=new Set(); }
      try { const r=await fetch('packs/portraits-commons-verifies.json'); if(r.ok)photosCommons=(await r.json()).players; } catch { photosCommons={}; }
      const s=await api('etat');
      $('#fmbEtat').innerHTML=`<div class="fmb-chiffres">${Object.entries(s.comptes).map(([k,n])=>`<div><b>${n.toLocaleString('fr-FR')}</b><span>${e(lib[k])}</span></div>`).join('')}</div><p class="fmb-mention">${s.profils_detailles_catalogue} profils détaillés dans ce périmètre · ${e(s.note)}</p>`;
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
