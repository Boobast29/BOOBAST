window.__T = (async () => {
  const db = buildDefaultDatabase(); normalizeWorld(db);
  const par = {};
  for (const p of db.players) { const k = p.nat; (par[k] ||= [0, 0, 0, 0, 0, 0])[p.face.skin]++; }
  const moy = k => { const a = par[k]; if (!a) return null; const n = a.reduce((x, y) => x + y, 0); return [n, +(a.reduce((s, v, i) => s + v * i, 0) / n).toFixed(2)]; };
  return { SWE: moy('SWE'), FRA: moy('FRA'), ESP: moy('ESP'), SEN: moy('SEN'), JPN: moy('JPN'), BRA: moy('BRA'), MAR: moy('MAR') };
})();
