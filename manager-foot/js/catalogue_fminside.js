/* Fiches documentaires FMInside : ne remplacent pas les joueurs d'une partie. */
async function ouvrirFMInside() {
  const h = document.querySelector('#app');
  h.innerHTML = '<div class="card"><h1>Joueurs FMInside · FM26</h1><button class="btn" id="fmiBack">Retour</button><p id="fmiStatus">Chargement…</p><input id="fmiSearch" type="search" placeholder="Nom, club ou poste" aria-label="Rechercher"><p id="fmiCount" role="status"></p><div id="fmiResults"></div><div class="row gap"><button class="btn" id="fmiPrev">Précédent</button><button class="btn" id="fmiNext">Suivant</button></div><div id="fmiDetail"></div></div>';
  document.querySelector('#fmiBack').onclick = startScreen;
  try {
    const data = await chargerCatalogueFMInside(), players = data.players || [];
    const status = document.querySelector('#fmiStatus');
    status.textContent = `${players.length} fiches détaillées disponibles. Données Football Manager, situation réelle actuelle non vérifiée. Salaires mensuels = hebdomadaires × 52 ÷ 12. Couverture partielle du site. ${players.filter(estLibreDocumente).length} profils libres proposés après recoupement des sources.`;
    const integrer = document.createElement('button');
    integrer.className = 'btn primary'; integrer.textContent = 'Intégrer aux nouvelles carrières';
    status.after(integrer);
    integrer.onclick = async () => {
      integrer.disabled = true;
      try {
        const {monde, bilan} = preparerFusionFMInside(DB, data);
        await Store.set(DB_KEY, monde); DB = monde;
        status.textContent = `${bilan.ajoutes} joueurs ajoutés, ${bilan.actualises} actualisés, ${bilan.ignores} sans correspondance exploitable, ${bilan.ambigus} correspondances ambiguës. Base des nouvelles carrières enregistrée.`;
      } catch (err) { status.textContent = err.message; }
      finally { integrer.disabled = false; }
    };
    let page=0; const pageSize=50;
    const render = () => {
      const q = document.querySelector('#fmiSearch').value.toLocaleLowerCase();
      const found = players.filter(p => `${p.name} ${p.club} ${p.positions}`.toLocaleLowerCase().includes(q));
      const target = document.querySelector('#fmiResults');
      page=Math.min(page,Math.max(0,Math.ceil(found.length/pageSize)-1));
      document.querySelector('#fmiCount').textContent=`${found.length} résultats · page ${page+1}/${Math.max(1,Math.ceil(found.length/pageSize))}`;
      document.querySelector('#fmiPrev').disabled=page===0;document.querySelector('#fmiNext').disabled=(page+1)*pageSize>=found.length;
      target.innerHTML = found.slice(page*pageSize,(page+1)*pageSize).map(p => `<button class="btn" data-uid="${esc(p.fmUid)}">${esc(p.name)} · ${esc(p.transfermarktStatus?.status==='retired'?'Retraité (Transfermarkt)':estLibreDocumente(p)?'Libre (instantané source)':p.club || 'Club inconnu')} · ${esc(p.positions || '')}</button>`).join('') || '<p>Aucun résultat.</p>';
      target.querySelectorAll('[data-uid]').forEach(b => b.onclick = () => {
        const p = players.find(p => p.fmUid === b.dataset.uid);
        document.querySelector('#fmiDetail').innerHTML = `<h2>${esc(p.name)}</h2><p>Base ${esc(p.sourceDatabase)} · ${esc(p.age)} ans · ${esc(p.foot || '')}</p><p>Contrat source : ${esc(p.contractEndText || 'Inconnu')} · Salaire mensuel source : ${p.wageMonthly == null ? 'Inconnu' : money(p.wageMonthly)}</p><p>Niveau : ${esc(p.rating ?? 'Inconnu')} · Potentiel : ${esc(p.potential ?? 'Inconnu')}</p><table><thead><tr><th>Attribut FMInside</th><th>Note / 99</th></tr></thead><tbody>${Object.entries(p.attributes).map(([k,v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table><a href="${esc(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">Fiche source FMInside</a>`;
      });
    };
    document.querySelector('#fmiSearch').oninput = ()=>{page=0;render();};
    document.querySelector('#fmiPrev').onclick=()=>{page=Math.max(0,page-1);render();};
    document.querySelector('#fmiNext').onclick=()=>{page++;render();};render();
  } catch (e) { document.querySelector('#fmiStatus').textContent = e.message; }
}
// Ajoute l'accès au catalogue au menu d'accueil.
(() => {
  const original = startScreen;
  startScreen = function (...args) {
    const result = original.apply(this, args);
    const reference = document.querySelector('#btnImp');
    if (reference && !document.querySelector('#btnFMInside')) {
      const button = document.createElement('button');
      button.id = 'btnFMInside'; button.className = 'btn';
      button.textContent = 'Joueurs FMInside'; button.onclick = ouvrirFMInside;
      reference.before(button);
    }
    return result;
  };
})();
