window.__T = (async () => {
  const p = clubPlayers(G, G.clubId).find(x => x.pos === 'BU'); playerModal(p.id, 'profil'); await new Promise(r => setTimeout(r, 50));
  const lire = () => ({ note: document.querySelector('.attr36 .a36-note b').textContent, titre: document.querySelector('.attr36 .a36-tete b').textContent, cles: [...document.querySelectorAll('.a36-l.cle span')].map(s => s.textContent).slice(0, 5) });
  const a = lire();
  const st = document.querySelector('#nrStyle'); st.value = 'target'; st.dispatchEvent(new Event('change')); const b = lire();
  st.value = 'false9'; st.dispatchEvent(new Event('change')); const c = lire();
  const ps = document.querySelector('#nrPoste'); ps.value = 'DC'; ps.dispatchEvent(new Event('change')); const d = lire();
  const couleurs = [1, 6, 10, 13, 16, 18, 20].map(v => couleurAttr(v));
  return { renard: a, pivot: b, faux9: c, enDefense: d, couleurs };
})();
