window.__T = (async () => {
  const L = []; show('squad'); show('transfers'); show('finances');
  goBack(); L.push(VIEW); goBack(); L.push(VIEW); goForward(); L.push(VIEW); show('comps'); L.push(document.querySelector('#navSuiv').disabled);
  L.push(document.querySelectorAll('.sect-tabs button').length, document.querySelector('.sect-tabs .on')?.textContent);
  return L;
})();
