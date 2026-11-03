window.__T = (async () => {
  const cas = ['3 joueur(s) ciblé(s)', '1 saison(s)', 'contrat de 2 saison(s)', '0 offre(s)', '12 match(s) joués', '1 match(s)', 'Pas de nombre : décision(s)', '4,5 semaine(s)', '1 500 joueur(s)'];
  const pl = cas.map(accorderPluriels);
  confirmBox('Licencier Jean Dupont ? Indemnité 2 M€.', () => {}); const b1 = document.querySelector('#cfYes').textContent; closeModal();
  confirmBox('Supprimer définitivement cette partie ?', () => {}); const b2 = document.querySelector('#cfYes').textContent; closeModal();
  confirmBox('Renoncer ?', () => {}, 'Renoncer au joueur'); const b3 = document.querySelector('#cfYes').textContent; closeModal();
  show('inbox'); const reste = (document.querySelector('#main').innerText.match(/\(s\)/g) || []).length;
  return { pl, b1, b2, b3, resteSurAccueil: reste };
})();
