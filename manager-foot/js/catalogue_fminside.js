/* Fiches documentaires FMInside : ne remplacent pas les joueurs d'une partie. */
async function ouvrirFMInside() {
  const h = document.querySelector('#app');
  h.innerHTML = '<div class="card"><h1>Joueurs FMInside · FM26</h1><button class="btn" id="fmiBack">Retour</button><p id="fmiStatus">Chargement…</p><input id="fmiSearch" type="search" placeholder="Nom, club ou poste" aria-label="Rechercher"><div id="fmiResults"></div><div id="fmiDetail"></div></div>';
  document.querySelector('#fmiBack').onclick = startScreen;
  try {
    const r = await fetch('packs/fminside-fm26.json');
    if (!r.ok) throw Error('Catalogue indisponible');
    const data = await r.json(), players = data.players || [];
    const status = document.querySelector('#fmiStatus');
    status.textContent = `${players.length} fiches détaillées disponibles. Données Football Manager, situation réelle actuelle non vérifiée. Salaires mensuels = hebdomadaires × 52 ÷ 12. Couverture partielle du site.`;
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
    const render = () => {
      const q = document.querySelector('#fmiSearch').value.toLocaleLowerCase();
      const found = players.filter(p => `${p.name} ${p.club} ${p.positions}`.toLocaleLowerCase().includes(q));
      const target = document.querySelector('#fmiResults');
      target.innerHTML = found.slice(0,100).map(p => `<button class="btn" data-uid="${esc(p.fmUid)}">${esc(p.name)} · ${esc(p.club || 'Club inconnu')} · ${esc(p.positions || '')}</button>`).join('') || '<p>Aucun résultat.</p>';
      target.querySelectorAll('[data-uid]').forEach(b => b.onclick = () => {
        const p = players.find(p => p.fmUid === b.dataset.uid);
        document.querySelector('#fmiDetail').innerHTML = `<h2>${esc(p.name)}</h2><p>Base ${esc(p.sourceDatabase)} · ${esc(p.age)} ans · ${esc(p.foot || '')}</p><p>Contrat source : ${esc(p.contractEndText || 'Inconnu')} · Salaire mensuel source : ${p.wageMonthly == null ? 'Inconnu' : money(p.wageMonthly)}</p><p>Niveau : ${esc(p.rating ?? 'Inconnu')} · Potentiel : ${esc(p.potential ?? 'Inconnu')}</p><table><thead><tr><th>Attribut FMInside</th><th>Note / 99</th></tr></thead><tbody>${Object.entries(p.attributes).map(([k,v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table><a href="${esc(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">Fiche source FMInside</a>`;
      });
    };
    document.querySelector('#fmiSearch').oninput = render; render();
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
