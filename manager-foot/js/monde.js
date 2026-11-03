// ============================================================
//  Monde réel : base Football_Monde servie par outils/serveur.py
//  - création de carrière sur les championnats V9 (5 pays, 3 niveaux et plus)
//  - navigateur de la base (436 020 fiches, recherche paginée côté serveur)
//  - fiches à onglets, historiques V10 chargés à la demande
//  - gestionnaire de ressources (portraits / logos)
//  Sans serveur (index.html ouvert directement), seul le mode fictif est proposé.
// ============================================================
const MONDE = { ok: false, etat: null, dico: null };
const PAYS_MONDE = [['France', 'France'], ['England', 'Angleterre'], ['Germany', 'Allemagne'], ['Spain', 'Espagne'], ['Italy', 'Italie']];
const INCONNU = '<span class="unk">Inconnu</span>';
const v_ = (x, suf = '') => x == null || x === '' ? INCONNU : esc(x) + suf;

async function api(path, opts) {
  const r = await fetch(path, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erreur || `HTTP ${r.status}`);
  return j;
}
async function mondeInit() {
  if (!location.protocol.startsWith('http')) return false;
  try { MONDE.etat = await api('/api/etat'); MONDE.ok = true; } catch { MONDE.ok = false; }
  return MONDE.ok;
}
async function dico() {
  if (!MONDE.dico) { try { MONDE.dico = await api('/api/dictionnaire'); } catch { MONDE.dico = { labels: {} }; } }
  return MONDE.dico;
}

// ---------- Accueil : carte « Monde réel » ----------
async function renderMondeCard(el) {
  if (!el) return;
  if (!MONDE.ok && !(await mondeInit())) {
    el.innerHTML = `<div class="card"><h2>🌍 Monde réel</h2><p class="hint">Base mondiale non disponible : lance le jeu avec <b>Lancer_Manager_Foot.bat</b> (serveur local) après avoir importé le pack Football_Monde. Le mode fictif ci-dessous reste jouable.</p></div>`;
    return;
  }
  let comps = [];
  try { comps = await api('/api/competitions'); } catch (e) { el.innerHTML = `<div class="card"><p class="neg">Compétitions indisponibles : ${esc(e.message)}</p></div>`; return; }
  const pq = MONDE.etat.par_qualite || {};
  el.innerHTML = `<div class="card">
    <div class="row gap wrap"><h2 class="grow">🌍 Monde réel 2026/2027</h2>
      <button class="btn" id="btnBase">🔎 Base mondiale</button><button class="btn" id="btnRes">🖼 Ressources</button></div>
    <p class="hint">${Object.values(pq).reduce((a, b) => a + b, 0).toLocaleString('fr-FR')} fiches : ${(pq.rated_snapshot || 0).toLocaleString('fr-FR')} notées, ${(pq.historical_profile || 0).toLocaleString('fr-FR')} profils historiques, ${(pq.identity_archive || 0).toLocaleString('fr-FR')} identités à compléter.
      Effectifs = snapshot EA du 12/09/2026, non vérifiés comme effectifs officiels. Règles des compétitions non validées.</p>
    <div class="monde-pays">${PAYS_MONDE.map(([k, l]) => `<div class="mp"><h3>${l}</h3>${comps.filter(c => c.pays === k).map(c =>
      `<div class="mpl"><span class="tier">N${c.niveau}</span> ${esc(c.nom)}${c.groupe ? ` <small>(${esc(c.groupe)})</small>` : ''}<small class="muted"> · ${c.equipes} éq. · ${c.effectifs_documentes} effectifs ≥ 18 notés</small></div>`).join('')}
      <button class="btn primary mt" data-pays="${k}">Choisir un club en ${l}</button></div>`).join('')}</div>
  </div>`;
  $('#btnBase').onclick = () => baseScreen();
  $('#btnRes').onclick = () => ressourcesModal();
  el.querySelectorAll('[data-pays]').forEach(b => b.onclick = () => choisirClubReel(b.dataset.pays));
}

async function choisirClubReel(pays) {
  modal('<h2>Chargement du monde réel…</h2><p class="hint">Lecture des effectifs depuis la base locale.</p>', 'wide', { noClose: true });
  let scn;
  try { scn = await api('/api/scenario?pays=' + encodeURIComponent(pays)); }
  catch (e) { closeModal(); return toast('Scénario indisponible : ' + e.message, 'err'); }
  const dom = scn.clubs.filter(c => !c.foreign);
  const html = `<h2>${esc(scn.countryLabel)} — choisis ton club</h2>
    <p class="hint">${esc(scn.notice)}</p>
    <div class="row gap">${roleSelectHTML()}</div>
    ${scn.divisions.map(d => `<h3>Niveau ${d.tier} · ${esc(d.name)}${d.group ? ' — ' + esc(d.group) : ''} <small class="muted">${d.rulesVerified ? 'règles validées' : 'règles non validées'}</small></h3>
      <div class="club-grid">${dom.filter(c => c.compSrc === d.srcId).sort((a, b) => b.rep - a.rep).map(c => `<button class="club-pick" data-src="${esc(c.srcId)}" style="--c1:${c.colors[0]};--c2:${c.colors[1]}">
        ${crest(c, 40)}<div><b>${esc(c.name)}</b><small>${c.realPlayers} notés${c.estimatedPlayers ? ` + ${c.estimatedPlayers} estimés` : ''}${c.realPlayers + (c.estimatedPlayers || 0) < 18 ? ' · <span class="warn">complété par des fictifs</span>' : ''}</small></div></button>`).join('')}</div>`).join('')}
    <p class="hint">Les clubs à l'effectif incomplet seront complétés par des joueurs <b>fictifs</b> clairement marqués (jamais de faux joueurs réels). Coupes d'Europe : clubs réels de première division des quatre autres pays, complétés par des clubs fictifs pour les autres nations.</p>`;
  modal(html, 'wide');
  bindRoleSelect();
  $$('#modal .club-pick').forEach(b => b.onclick = () => {
    const go = () => {
      const name = ($('#mgr')?.value || '').trim() || 'Coach';
      try { localStorage.setItem('mf-mgr', name); } catch { }
      const W = buildRealWorld(scn);
      const club = W.clubs.find(c => c.srcId === b.dataset.src);
      closeModal();
      G = newGame(W, club.id, name);
      VIEW = 'inbox';
      news(G, `Monde réel ${scn.countryLabel} ${scn.season}. ${scn.notice}`, 'info');
      const fill = G.real.fill[club.id];
      if (fill) news(G, `Ton effectif comptait ${club.realPlayers} joueurs notés dans la base : ${fill} joueurs fictifs (marqués « F ») ont été ajoutés pour atteindre 22. Remplace-les sur le marché ou dans l'éditeur.`, 'warn');
      save(); enterGame();
      // portraits et logos du club et du championnat : téléchargés en tâche de fond, mis en cache
      api('/api/ressources/telecharger', { method: 'POST', body: JSON.stringify({ club: club.srcId, joueurs: G.players.filter(p => p.srcId && p.club != null && getClub(G, p.club).div === club.div).map(p => p.srcId).slice(0, 2000) }) }).catch(() => { });
    };
    go();
  });
}

// Convertit le scénario serveur en base interne du jeu (ids numériques, srcId conservé).
function buildRealWorld(scn) {
  NEXT_PID = 1;
  const clubs = [], players = [], fill = {};
  const homeDivs = scn.divisions;
  scn.clubs.forEach((sc, i) => {
    const id = i + 1;
    const capacity = Math.round(4000 + Math.pow(sc.rep / 10, 3.2) * 70);
    clubs.push({
      id, srcId: sc.srcId, name: sc.name, short: sc.short, colors: sc.colors, rep: sc.rep,
      div: sc.foreign ? 0 : sc.div, foreign: sc.foreign, country: sc.country, tier: sc.tier, compSrc: sc.compSrc, group: sc.group,
      stadium: 'Stade (non renseigné)', capacity, capacitySim: true,
      budget: roundMoney(Math.pow(sc.rep / 50, 5) * 2.2e6 * (sc.foreign ? 1.3 : 1)), budgetSim: true,
      logo: sc.logo, realPlayers: sc.realPlayers, otherProfiles: sc.otherProfiles, identityStatus: sc.identityStatus,
      style: clubStyle(), coh: 65, trophies: []
    });
    const squad = scn.players.filter(p => p.clubKey === sc.srcId).map(sp => realPlayer(sp, id, sc.rep));
    const q = 8.6 + (sc.rep - 50) / 40 * 5.2;
    let added = 0;
    for (const role of SQUAD_TEMPLATE) {
      if (squad.length >= 22) break;
      const have = squad.filter(p => p.pos === role).length, need = SQUAD_TEMPLATE.filter(r => r === role).length;
      if (have < need) { squad.push(fictif(genPlayer(role, q - 1, { club: id, rep: sc.rep }))); added++; }
    }
    while (squad.length < 18) { squad.push(fictif(genPlayer(pick(SQUAD_TEMPLATE), q - 1, { club: id, rep: sc.rep }))); added++; }
    if (added) fill[id] = added;
    assignNumbers(squad);
    players.push(...squad);
  });
  const W = {
    leagueNames: homeDivs.map(d => d.name + (d.group ? ' — ' + d.group : '')), cupName: 'Coupe nationale (format de jeu)',
    clubs, players,
    real: {
      kind: 'monde_reel', country: scn.country, countryLabel: scn.countryLabel, season: scn.season, divisions: homeDivs,
      notice: scn.notice, sources: scn.sources, imported: scn.imported, conversion: scn.conversion.version, incomplete: scn.incomplete,
      fill, promoValidated: false, finFictive: true
    }
  };
  normalizeWorld(W);
  return W;
}
function fictif(p) { p.fictional = true; p.regenId = 'fictif_' + p.id; p.value = calcValue(p); return p; }
function realPlayer(sp, clubId, rep) {
  // profil réel sans évaluation : attributs ESTIMÉS selon le niveau du club (couche de jeu séparée, badge « E »)
  let q = 8.6 + (rep - 50) / 40 * 5.2 - (sp.age != null && sp.age < 21 ? 1.5 : 0);
  // valeur marchande Transfermarkt connue : niveau estimé d'après la valeur (≈ 68 pour 1 M€, 77 pour 10 M€, 85 pour 100 M€ ; les jeunes valent surtout leur potentiel)
  if (sp.estimated && sp.marketValue > 0) {
    const o99 = clamp(68 + 8.5 * Math.log10(sp.marketValue / 1e6) - (sp.age != null && sp.age <= 21 ? 4 : 0) + (sp.age != null && sp.age >= 31 ? 2 : 0), 45, 90);
    q = clamp(8.6 + ((o99 - 50) * 1.45 - 10) * .13, 4, 17);
  }
  const p = genPlayer(sp.pos, sp.estimated ? q : 10, { club: clubId, age: sp.age ?? 25, nat: sp.nat || 'FRA', name: sp.name, photo: sp.photo, rep });
  if (sp.estimated) p.estimated = true;
  else for (const k in ATTRS) if (sp.attrs[k] != null) p.attrs[k] = sp.attrs[k];
  p.srcId = sp.srcId; p.real = true; if (sp.posRaw) p.posRaw = sp.posRaw; p.ageKnown = sp.ageKnown; p.dob = sp.dob; p.natLabel = sp.natLabel;
  if (sp.detail99) p.detail99 = sp.detail99;
  p.ovr99 = sp.ovr99; p.pot99 = sp.pot99; p.attrCoverage = sp.attrCoverage; p.weakFoot = sp.weakFoot; p.skillMoves = sp.skills;
  if (typeof skillInit === 'function') skillInit(p, sp.detail99 || {});
  const o = playerOvr(p);
  if (sp.pot99 != null && sp.ovr99 != null) { p.pot = clamp(o + Math.max(0, sp.pot99 - sp.ovr99), o, 99); p.potKnown = true; }
  else { p.pot = clamp(o + (p.age <= 20 ? 6 : p.age <= 23 ? 3 : 0), o, 99); p.potKnown = false; p.potSim = true; }
  p.face = null; // pas de visage dessiné pour une personne réelle : repli à initiales
  p.contract = rint(1, 4); p.contractSim = true;
  p.wage = calcWage(p); p.wageSim = true;
  p.attrs0 = { ...p.attrs };
  p.value = calcValue(p);
  return p;
}

// Portrait neutre à initiales (personne réelle sans photo disponible)
function initialsSVG(p, size = 40) {
  const ini = String(p.name || '?').split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return `<svg class="face" width="${size}" height="${size}" viewBox="0 0 52 52"><rect width="52" height="52" rx="8" fill="#2b3442"/><circle cx="26" cy="20" r="10" fill="#3d4858"/><path d="M8 50 Q10 34 26 34 Q42 34 44 50Z" fill="#3d4858"/><text x="26" y="31" text-anchor="middle" font-size="15" font-weight="700" fill="#cfd8e3" font-family="Arial">${esc(ini)}</text></svg>`;
}
function genericCrestSVG(size = 36) {
  return `<svg class="crest" width="${size}" height="${size}" viewBox="0 0 40 46"><path d="M20 1 L38 6 L38 22 Q38 38 20 45 Q2 38 2 22 L2 6Z" fill="#3a4554" stroke="#8796a8" stroke-width="2"/><text x="20" y="28" text-anchor="middle" font-size="11" fill="#cfd8e3" font-family="Arial">?</text></svg>`;
}
const isFictional = p => !!(p && (p.fictional || (G?.real && !p.srcId)));
function fictionalTag(p) {
  if (p?.estimated) return ' <span class="tag-f tag-e" title="Personne réelle de la base, sans note source : niveau estimé par le jeu selon le club (à vérifier)">E</span>';
  return isFictional(p) && (G?.real || DB?.real) ? ' <span class="tag-f" title="Joueur fictif généré par le jeu">F</span>' : '';
}

// ---------- Navigateur de la base mondiale ----------
const BASEQ = { q: '', page: 0, qualite: '', poste: '', notes: '', pot_connu: '', photo: '', age_min: '', age_max: '', nat: '', riche: '' };
function baseScreen() {
  if (!MONDE.ok) return toast('Base mondiale non disponible (serveur local requis).', 'err');
  modal(`<h2>🔎 Base mondiale</h2>
    <div class="row gap wrap base-f">
      <input id="bq" placeholder="Nom (avec ou sans accents)…" value="${esc(BASEQ.q)}" autocomplete="off" style="flex:2;min-width:180px">
      <select id="bqual"><option value="">Toutes qualités</option><option value="rated_snapshot">Notées (EA 09/2026)</option><option value="historical_profile">Profils historiques</option><option value="identity_archive">Identités à compléter</option></select>
      <select id="bpos"><option value="">Tous postes</option>${Object.keys(ROLES).map(r => `<option>${r}</option>`).join('')}</select>
      <input id="bnat" placeholder="Nationalité" value="${esc(BASEQ.nat)}" style="width:110px">
      <input id="bamin" type="number" placeholder="Âge min" value="${esc(BASEQ.age_min)}" style="width:80px">
      <input id="bamax" type="number" placeholder="Âge max" value="${esc(BASEQ.age_max)}" style="width:80px">
      <label class="chk"><input type="checkbox" id="bpot" ${BASEQ.pot_connu ? 'checked' : ''}> potentiel connu</label>
      <label class="chk"><input type="checkbox" id="bph" ${BASEQ.photo ? 'checked' : ''}> photo locale</label>
      <label class="chk"><input type="checkbox" id="bri" ${BASEQ.riche ? 'checked' : ''}> dossier riche</label>
    </div>
    <div id="bres" class="mt"></div>`, 'wide base');
  $('#bqual').value = BASEQ.qualite; $('#bpos').value = BASEQ.poste;
  let t = null;
  const searchRoot = $('#bres');
  const go = () => { clearTimeout(t); t = setTimeout(() => {
    if (!searchRoot.isConnected || $('#bres') !== searchRoot) return;
    BASEQ.page = 0; lire(); baseRun();
  }, 220); };
  const lire = () => Object.assign(BASEQ, { q: $('#bq').value, qualite: $('#bqual').value, poste: $('#bpos').value, nat: $('#bnat').value.trim(), age_min: $('#bamin').value, age_max: $('#bamax').value, pot_connu: $('#bpot').checked ? '1' : '', photo: $('#bph').checked ? '1' : '', riche: $('#bri').checked ? '1' : '' });
  $$('#modal .base-f input, #modal .base-f select').forEach(i => { i.oninput = go; i.onchange = go; });
  $('#bq').focus();
  baseRun();
}
async function baseRun() {
  const box = $('#bres'); if (!box) return;
  const qs = new URLSearchParams(Object.fromEntries(Object.entries({ ...BASEQ, date_ref: G ? `${G.season}-07-01` : '2026-07-01' }).filter(([, v]) => v !== '')));
  box.innerHTML = '<p class="muted">Recherche…</p>';
  let r;
  try { r = await api('/api/recherche?' + qs); } catch (e) { box.innerHTML = `<p class="neg">${esc(e.message)}</p>`; return; }
  if (!box.isConnected || $('#bres') !== box) return;
  const ED = editorMode();
  box.innerHTML = `<p class="hint">${r.total_plafonne ? 'Plus de 10 000' : r.total.toLocaleString('fr-FR')} fiche(s) · page ${r.page + 1} · ${r.ms} ms</p>
    <table class="tbl"><thead><tr><th></th><th>Nom</th><th>Né le</th><th>Nat.</th><th>Poste</th><th>Club (source)</th><th>Données</th><th>Niv./99</th><th>${ED ? 'Pot./99' : 'Potentiel'}</th></tr></thead><tbody>
    ${r.resultats.map(x => `<tr class="click" data-id="${esc(x.id)}"><td>${x.a_photo ? `<img class="mini" loading="lazy" src="/img/joueur/${encodeURIComponent(x.id)}?dl=0" onerror="this.replaceWith(document.createTextNode(''))">` : ''}</td>
      <td><b>${esc(x.nom)}</b>${x.profil_riche ? ' <small title="Dossier riche V10">★</small>' : ''}${x.doublon ? ' <small class="warn" title="Une autre fiche a le même nom et la même date de naissance : doublon possible, non fusionné">⚠ doublon ?</small>' : ''}</td><td>${v_(x.naissance)}</td><td>${v_(x.nat)}</td><td>${x.poste || v_(x.poste_brut)}</td><td>${v_(x.club)}</td>
      <td><small>${qualiteLabel(x.qualite)}</small></td><td>${x.niveau99 ?? INCONNU}</td><td>${x.pot99 == null ? INCONNU : ED ? x.pot99 : 'connu'}</td></tr>`).join('') || '<tr><td colspan="9" class="muted">Aucun résultat</td></tr>'}
    </tbody></table>
    <div class="row gap mt"><button class="btn" id="bprev" ${r.page ? '' : 'disabled'}>◀ Précédent</button><button class="btn" id="bnext" ${r.suite ? '' : 'disabled'}>Suivant ▶</button></div>`;
  box.querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => ficheBase(tr.dataset.id));
  $('#bprev').onclick = () => { BASEQ.page--; baseRun(); };
  $('#bnext').onclick = () => { BASEQ.page++; baseRun(); };
}
const qualiteLabel = q => ({ rated_snapshot: 'Notée (EA)', historical_profile: 'Historique', identity_archive: 'Identité seule' }[q] || esc(q || 'Inconnue'));
function editorMode() { return !!SETTINGS.editorMode; }

// ---------- Fiche d'un joueur de la base ----------
async function ficheBase(id, tab = 'gen', back = true) {
  modal('<p class="muted">Chargement de la fiche…</p>', 'wide');
  let f;
  try { f = await api('/api/joueur/' + encodeURIComponent(id)); } catch (e) { modal(`<p class="neg">Fiche indisponible : ${esc(e.message)}</p>`); return; }
  const d = await dico();
  renderFiche(f, d, tab, back);
}
function renderFiche(f, d, tab, back) {
  const s = f.source || {}, cap = s.capacites || f.profil_v10?.capacites || null, ED = editorMode();
  const pr = f.profil_v10;
  const tabs = [['gen', 'Général'], ['cap', 'Capacités'], ['att', 'Attributs'], ['pos', 'Postes/Rôles'], ['con', 'Contrat'], ['sta', 'Statistiques'], ['his', 'Historique'], ['src', 'Sources']];
  const age = f.naissance ? ageAt(f.naissance, G ? `${G.season}-07-01` : '2026-07-01') : null;
  const head = `<div class="row gap fiche-h">${f.photo_local || f.photo_url ? `<span class="ph" style="width:84px;height:84px"><img src="/img/joueur/${encodeURIComponent(f.id)}" onerror="this.parentNode.outerHTML=this.dataset.fb" data-fb="${esc(initialsSVG({ name: f.nom }, 84))}"></span>` : initialsSVG({ name: f.nom }, 84)}
    <div class="grow"><h2>${esc(f.nom)}</h2><small>${f.poste || v_(f.poste_brut)} · ${age == null ? 'âge inconnu' : age + ' ans'} · ${v_(f.nat)} · ${f.club ? `${f.club.statut_identite ? '' : ''}<img class="mini" src="/img/club/${encodeURIComponent(f.club.id)}" onerror="this.remove()"> ${esc(f.club.nom)}` : 'club ' + INCONNU}</small><br>
    <small class="muted">${qualiteLabel(f.qualite)} · id canonique ${esc(f.id)}</small></div>
    ${back ? '<button class="btn" id="fback">◀ Base</button>' : ''}</div>`;
  let body = '';
  if (tab === 'gen') {
    body = `<table class="tbl kv">
      <tr><td>Nom</td><td>${esc(f.nom)}</td></tr><tr><td>Naissance</td><td>${v_(f.naissance)}</td></tr>
      <tr><td>Nationalité(s)</td><td>${v_(f.nat)}</td></tr><tr><td>Taille</td><td>${v_(f.taille, ' cm')}</td></tr>
      <tr><td>Poste source</td><td>${v_(f.poste_brut)} ${f.poste ? `→ ${f.poste} (jeu)` : ''}</td></tr>
      <tr><td>Club source</td><td>${f.club ? esc(f.club.nom) + ` <small class="muted">snapshot ${esc(s.provenance?.club_snapshot_date || '?')}, non vérifié aujourd'hui</small>` : INCONNU}</td></tr>
      ${(f.inscriptions || []).length ? `<tr><td>Compétition</td><td>${f.inscriptions.map(i => `${esc(i.nom)}${i.groupe ? ' — ' + esc(i.groupe) : ''} (niveau ${i.niveau})`).join(', ')}</td></tr>` : ''}
      <tr><td>Statut actif</td><td>${s.provenance?.active_status_verified ? 'vérifié' : 'non vérifié'}</td></tr>
      <tr><td>Blessure actuelle</td><td>${INCONNU} <small class="muted">(aucune consultation en direct)</small></td></tr>
      ${f.jeune_v9 ? `<tr><td>Jeune 15-21 ans</td><td>${f.jeune_v9.age_at_2026_07_01} ans au 01/07/2026 · équipe de jeunes ${v_(f.jeune_v9.youth_team_assignment)}</td></tr>` : ''}
      ${(f.libre || []).map(l => `<tr><td>Statut libre</td><td>${l.categorie === 'fc27_carriere' ? 'Libre dans la base Carrière FC27 (scénario de jeu, pas une vérification réelle)' : 'Sans club dans une archive : à revérifier'}</td></tr>`).join('')}
      ${(f.doublons_possibles || []).length ? `<tr><td>Doublon possible</td><td class="warn">${f.doublons_possibles.map(x => `<a href="#" data-dbl="${esc(x.id)}">${esc(x.id)}</a> (${qualiteLabel(x.qualite)})`).join(', ')} — même nom et même naissance ; non fusionné automatiquement</td></tr>` : ''}
      ${(f.conflits || []).length ? `<tr><td>Identité</td><td class="warn">${f.conflits.length} conflit(s) non résolu(s) — voir Sources</td></tr>` : ''}
    </table>`;
  } else if (tab === 'cap') {
    body = !cap ? `<p>Capacités ${INCONNU} : fiche sans évaluation. Aucune note n'est attribuée d'office.</p>` : `<div class="grid2"><table class="tbl kv">
      <tr><td>Niveau actuel /99</td><td><b>${v_(cap.niveau_actuel_sur_99)}</b> <small class="muted">${esc(cap.overall_source_date || '')}</small></td></tr>
      <tr><td>Potentiel</td><td>${cap.potentiel_sur_99 == null ? INCONNU : ED || !G ? `<b>${cap.potentiel_sur_99}</b>/99 <small class="muted">${esc(cap.potential_source_date || '')}, non garanti</small>` : potRange(cap.niveau_actuel_sur_99, cap.potentiel_sur_99)}</td></tr>
      <tr><td>Capacité /200</td><td>${v_(cap.capacite_actuelle_sur_200)} <small class="muted">conversion du pack</small></td></tr>
      <tr><td>Potentiel /200</td><td>${cap.capacite_potentielle_sur_200 == null ? INCONNU : ED || !G ? cap.capacite_potentielle_sur_200 : '<small class="muted">masqué en mode manager</small>'}</td></tr>
      <tr><td>Pied faible</td><td>${v_(cap.pied_faible_sur_5, ' / 5')}</td></tr><tr><td>Gestes techniques</td><td>${v_(cap.gestes_techniques_sur_5, ' / 5')}</td></tr>
      <tr><td>Styles de jeu</td><td>${(cap.styles_de_jeu || []).length ? cap.styles_de_jeu.map(esc).join(', ') : INCONNU}</td></tr></table>
      <div><h3>Six facettes /99</h3>${Object.entries(cap.facettes_sur_99 || {}).map(([k, v]) => `<div class="attr"><span>${esc(k)}</span>${v == null ? INCONNU : bar(v, 99, 'a' + Math.ceil(v / 25))}<b>${v ?? ''}</b></div>`).join('') || INCONNU}
      <p class="hint">Conversions du pack (sur 20 / 200) : modèles originaux, pas des notes officielles Football Manager.</p></div></div>`;
  } else if (tab === 'att') {
    const a99 = cap?.attributs_detail_sur_99, a20 = cap?.attributs_detail_sur_20;
    const fm = pr?.attributes;
    body = !a99 ? `<p>34 attributs détaillés : ${INCONNU}.</p>` : `<table class="tbl"><thead><tr><th>Attribut</th><th>Source /99</th><th>Conversion /20</th></tr></thead><tbody>
      ${Object.keys(a99).map(k => `<tr><td>${esc(d.labels?.[k] || k)}</td><td>${a99[k] ?? INCONNU}</td><td>${a20?.[k] ?? INCONNU}</td></tr>`).join('')}</tbody></table>
      ${fm ? `<h3 class="mt">Grille de jeu (profil V10)</h3><p class="hint">Champs absents de la source (leadership, détermination…) laissés inconnus.</p><div class="grid2">${Object.entries(fm).map(([g, o]) => `<div><h4>${esc(g)}</h4>${Object.entries(o).map(([k, v]) => `<div class="attr"><span>${esc(k.replace(/_/g, ' '))}</span><b>${v ?? INCONNU}</b></div>`).join('')}</div>`).join('')}</div>` : ''}`;
  } else if (tab === 'pos') {
    const np = s.notes_par_poste || pr?.notes_par_poste;
    body = !np ? `<p>Scores par poste : ${INCONNU}.</p>` : `<table class="tbl"><thead><tr><th>Poste</th><th>Score attributs /99</th><th>Maîtrise conv. /20</th><th>Score avec maîtrise /20</th><th>Couverture</th></tr></thead><tbody>
      ${Object.entries(np).map(([k, o]) => `<tr><td>${esc(k)}</td><td>${v_(o.score_attributs_sur_99)}</td><td>${v_(o.maitrise_conventionnelle_sur_20)}</td><td>${v_(o.score_avec_maitrise_sur_20)}</td><td class="${o.couverture < .7 ? 'warn' : ''}">${o.couverture == null ? INCONNU : Math.round(o.couverture * 100) + ' %'}${o.couverture < .7 ? ' — peu de critères, incertain' : ''}</td></tr>`).join('')}</tbody></table>
      <p class="hint">Modèle pondéré original du pack : ni une note EA ni une note Football Manager.</p>`;
  } else if (tab === 'con') {
    const gp = G?.players.find(p => p.srcId === f.id);
    body = `<table class="tbl kv"><tr><td>Contrat réel</td><td>${INCONNU} <small class="muted">non fourni par les sources</small></td></tr><tr><td>Salaire réel</td><td>${INCONNU}</td></tr>
      ${gp ? `<tr><td>Dans ta partie</td><td>${gp.club != null ? esc(getClub(G, gp.club).name) : 'Libre'} · contrat ${gp.contract} saison(s) · ${wageM(gp.wage)} <small class="muted">(valeurs de simulation)</small></td></tr>` : ''}</table>`;
  } else if (tab === 'sta' || tab === 'his') {
    body = '<div id="fhist"><p class="muted">Chargement des archives…</p></div>';
  } else if (tab === 'src') {
    body = `<table class="tbl kv"><tr><td>Identifiant canonique</td><td>${esc(f.id)}</td></tr>
      <tr><td>Identifiants externes</td><td>${Object.entries(s.external_ids || {}).map(([k, v]) => `${esc(k)}: ${esc(v)}`).join(' · ') || INCONNU}</td></tr>
      <tr><td>Provenance</td><td><small>${Object.entries(s.provenance || {}).map(([k, v]) => `${esc(k)} : ${v == null ? 'inconnu' : esc(v)}`).join('<br>')}</small></td></tr>
      <tr><td>Profils liés</td><td><small>${(s.profile_references || []).map(r => `${esc(r.collection)}/${esc(r.file)} (${esc(r.id)})`).join('<br>') || '—'}</small></td></tr>
      <tr><td>Portrait</td><td>${f.photo_local ? `local (${esc(f.photo_origine)})` : f.photo_url ? 'URL connue, cache à la demande' : 'aucun : portrait neutre'}</td></tr>
      ${pr ? `<tr><td>Dates V10</td><td><small>${Object.entries(pr.dates_sources || {}).map(([k, v]) => `${esc(k)} : ${esc(v)}`).join('<br>')}</small></td></tr>` : ''}
      ${(f.conflits || []).map(c => `<tr><td>Conflit</td><td class="warn"><small>${esc(JSON.stringify(c))}</small></td></tr>`).join('')}
      <tr><td>Archives</td><td>${Object.entries(f.historiques_dispo || {}).map(([k, n]) => `${esc(k)} : ${n}`).join(' · ') || 'aucune'}${f.quarantaine_transferts ? ` · ${f.quarantaine_transferts} transfert(s) à date aberrante mis à part` : ''}</td></tr></table>
      ${ED ? '<p class="hint">Mode éditeur : valeurs source visibles.</p>' : ''}`;
  }
  modal(`${head}<div class="tabs">${tabs.map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div><div class="mt">${body}</div>`, 'wide');
  $$('#modal .tabs button').forEach(b => b.onclick = () => renderFiche(f, d, b.dataset.t, back));
  if (back) $('#fback').onclick = () => baseScreen();
  $$('#modal [data-dbl]').forEach(a => a.onclick = e => { e.preventDefault(); ficheBase(a.dataset.dbl, 'src', back); });
  if (tab === 'sta' || tab === 'his') chargerHistorique(f.id, tab);
}
function potRange(o, p) {
  const m = Math.max(2, 7 - (G?.staff?.scout || 2));
  return `≈ ${Math.max(o, p - m)}–${Math.min(99, p + m)} <small class="muted">fourchette du recrutement ; valeur exacte en mode éditeur</small>`;
}
function ageAt(dob, ref) { const a = new Date(dob), r = new Date(ref); if (isNaN(a)) return null; let y = r.getFullYear() - a.getFullYear(); if (r < new Date(r.getFullYear(), a.getMonth(), a.getDate())) y--; return y; }
const num = v => v == null || v === '' ? INCONNU : esc(String(v).replace(/\.0$/, ''));

async function chargerHistorique(id, tab) {
  let h;
  try { h = await api(`/api/joueur/${encodeURIComponent(id)}/historique`); } catch (e) { $('#fhist').innerHTML = `<p class="neg">${esc(e.message)}</p>`; return; }
  const box = $('#fhist'); if (!box) return;
  const gp = G?.players.find(p => p.srcId === id);
  if (tab === 'sta') {
    const perf = h.performances || [], ann = h.annees_civiles || [];
    box.innerHTML = `${gp ? `<h3>Dans ta partie (simulation)</h3><p>Saison ${G.season} : ${gp.stats.apps} matchs, ${gp.stats.goals} buts, ${gp.stats.assists} passes déc. ${(gp.hist || []).length ? '· ' + gp.hist.map(x => `${x.season} ${esc(x.club)} ${x.apps} m/${x.goals} b`).join(', ') : ''}</p>` : ''}
      <h3>Saisons Transfermarkt (par saison et compétition)</h3>${perf.length ? `<table class="tbl"><thead><tr><th>Saison</th><th>Équipe</th><th>Compétition</th><th>Feuille</th><th>Joués</th><th>Buts</th><th>Passes</th><th>Min.</th><th>🟨</th><th>🟥</th></tr></thead><tbody>
      ${perf.slice(0, 80).map(r => `<tr><td>${num(r.season_name)}</td><td>${num(r.team_name)}</td><td>${num(r.competition_name)}</td><td>${num(r.nb_in_group)}</td><td>${num(r.nb_on_pitch)}</td><td>${num(r.goals)}</td><td>${num(r.assists)}</td><td>${num(r.minutes_played)}</td><td>${num(r.yellow_cards)}</td><td>${num(r.direct_red_cards)}</td></tr>`).join('')}</tbody></table>` : `<p>${INCONNU}</p>`}
      <h3 class="mt">Années civiles API-Football (pas des saisons)</h3>${ann.length ? `<table class="tbl"><thead><tr><th>Année</th><th>Équipe</th><th>Compétition</th><th>Apparitions confirmées</th><th>Minutes connues</th><th>Buts</th><th>Passes déc.</th><th>Note moy. de match</th></tr></thead><tbody>
      ${ann.map(r => `<tr><td>${r.calendar_year}</td><td>${num(r.equipe_nom)}</td><td>${num(r.competition_nom)}</td><td>${num(r.confirmed_appearances)} <small class="muted">/ ${num(r.listed_match_entries)} feuilles</small></td><td>${num(r.known_minutes_total)}</td><td>${num(r.known_goals_total)}</td><td>${num(r.known_assists_total)}</td><td>${r.average_observed_match_rating == null ? INCONNU : r.average_observed_match_rating.toFixed(2)}</td></tr>`).join('')}</tbody></table>` : `<p>${INCONNU}</p>`}
      <p class="hint">${h.avertissements.map(esc).join('<br>')}</p>`;
  } else {
    const tr = h.transferts || [], va = h.valeurs || [], ab = h.absences || [], se = h.selections || [];
    const clubs = [...new Map((h.performances || []).map(r => [r.season_name + '|' + r.team_name, r])).values()];
    box.innerHTML = `<h3>Clubs par saison (documentés)</h3>${clubs.length ? clubs.slice(0, 40).map(r => `${num(r.season_name)} · ${num(r.team_name)}`).join('<br>') : INCONNU}
      <h3 class="mt">Transferts</h3>${tr.length ? `<table class="tbl"><thead><tr><th>Date</th><th>De</th><th>Vers</th><th>Type</th><th>Indemnité</th><th>Valeur au transfert</th></tr></thead><tbody>${tr.map(r => `<tr><td>${num(r.transfer_date)}</td><td>${num(r.from_team_name)}</td><td>${num(r.to_team_name)}</td><td>${num(r.transfer_type)}</td><td>${r.transfer_fee ? money(+r.transfer_fee) : INCONNU}</td><td>${r.value_at_transfer ? money(+r.value_at_transfer) : INCONNU}</td></tr>`).join('')}</tbody></table>` : INCONNU}
      <h3 class="mt">Valeurs de marché (estimations du fournisseur, jusqu'en 09/2025)</h3>${va.length ? va.slice(0, 30).map(r => `${num(r.date_unix)} : ${r.value ? money(+r.value) : INCONNU}`).join(' · ') : INCONNU}
      <h3 class="mt">Historique des absences</h3>${ab.length ? `<table class="tbl"><thead><tr><th>Saison</th><th>Motif</th><th>Du</th><th>Au</th><th>Jours</th><th>Matchs manqués</th></tr></thead><tbody>${ab.map(r => `<tr><td>${num(r.season_name)}</td><td>${num(r.injury_reason)}</td><td>${num(r.from_date)}</td><td>${num(r.end_date)}</td><td>${num(r.days_missed)}</td><td>${num(r.games_missed)}</td></tr>`).join('')}</tbody></table>` : `${INCONNU} <small class="muted">(l'absence de ligne ne signifie pas aucune blessure)</small>`}
      <h3 class="mt">Sélections (par équipe source, catégorie non précisée)</h3>${se.length ? se.map(r => `équipe ${num(r.team_id)} : ${num(r.matches)} m, ${num(r.goals)} b`).join(' · ') : INCONNU}
      ${gp?.injHist?.length ? `<h3 class="mt">Blessures dans ta partie (simulation)</h3>${gp.injHist.map(x => `${esc(x.name)} (${fmtDays(x.days)}, ${x.season})`).join(' · ')}` : ''}`;
  }
}

// ---------- Ressources graphiques ----------
async function ressourcesModal() {
  let b;
  try { b = await api('/api/ressources'); } catch (e) { return toast('Ressources indisponibles : ' + e.message, 'err'); }
  const comps = await api('/api/competitions').catch(() => []);
  modal(`<h2>🖼 Ressources graphiques</h2>
    <table class="tbl kv">
      <tr><td>Portraits disponibles localement (pack)</td><td>${b.portraits_locaux_pack.toLocaleString('fr-FR')}</td></tr>
      <tr><td>Portraits avec URL seulement</td><td>${b.portraits_url_seule.toLocaleString('fr-FR')}</td></tr>
      <tr><td>Logos locaux / URL seule</td><td>${b.logos_locaux_pack} / ${b.logos_url_seule}</td></tr>
      <tr><td>Téléchargés en cache · ajouts manuels</td><td>${b.telecharges} · ${b.manuels}</td></tr>
      <tr><td>En attente · en erreur · sans source</td><td>${b.en_attente} · ${b.en_erreur} · ${b.sans_source}</td></tr>
      <tr><td>Espace du cache</td><td>${(b.octets_cache / 1048576).toFixed(1)} Mo</td></tr>
      <tr><td>État</td><td>${b.en_pause ? 'En pause' : 'Actif'}${b.hors_ligne ? ' · hors ligne (aucun téléchargement)' : ''}</td></tr>
    </table>
    <div class="row gap wrap mt"><button class="btn" id="rP">${b.en_pause ? '▶ Reprendre' : '⏸ Pause'}</button>
      <select id="rC"><option value="">Télécharger une compétition…</option>${comps.map(c => `<option value="${esc(c.id)}">${esc(c.pays)} · ${esc(c.nom)}${c.groupe ? ' ' + esc(c.groupe) : ''}</option>`).join('')}</select>
      ${G ? '<button class="btn" id="rM">Télécharger mon club</button>' : ''}<button class="btn" id="rR">↻ Actualiser</button></div>
    ${b.dernieres_erreurs.length ? `<h3 class="mt">Dernières erreurs</h3><small>${b.dernieres_erreurs.map(e => `${esc(e.type)} ${esc(e.id)} : ${esc(e.erreur)} (${e.tentatives} essai(s))`).join('<br>')}</small>` : ''}
    <p class="hint">3 téléchargements simultanés maximum, 8 s de délai, 2 essais par image ; une image refusée n'est pas retentée. Sans photo, un portrait neutre à initiales est affiché. Ajout manuel : fiche joueur dans ta partie → « Portrait ».</p>`);
  $('#rP').onclick = async () => { await api('/api/ressources/' + (b.en_pause ? 'reprise' : 'pause'), { method: 'POST' }); ressourcesModal(); };
  $('#rR').onclick = () => ressourcesModal();
  $('#rC').onchange = async e => { if (!e.target.value) return; const r = await api('/api/ressources/telecharger', { method: 'POST', body: JSON.stringify({ competition: e.target.value }) }); toast(`${r.planifies} image(s) planifiée(s) sur ${r.total}`); };
  if ($('#rM')) $('#rM').onclick = async () => { const r = await api('/api/ressources/telecharger', { method: 'POST', body: JSON.stringify({ club: myClub(G).srcId, joueurs: clubPlayers(G, G.clubId).filter(p => p.srcId).map(p => p.srcId) }) }); toast(`${r.planifies} image(s) planifiée(s) sur ${r.total}`); };
}

// Ajout / remplacement manuel d'un portrait ou d'un logo réel (associé à l'identifiant canonique)
function portraitManuel(typ, srcId, done) {
  pickFile(async files => {
    const f = files[0]; if (!f) return;
    try { await api(`/api/ressources/manuel/${typ}/${encodeURIComponent(srcId)}`, { method: 'POST', body: f }); toast('Image associée à ' + srcId); done?.(); }
    catch (e) { toast(e.message, 'err'); }
  }, 'image/png,image/jpeg,image/gif,image/webp', false);
}

