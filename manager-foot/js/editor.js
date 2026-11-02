// ============================================================
//  Éditeur : clubs, joueurs, compétitions, logos et photos (depuis le PC)
// ============================================================
let ED = { club: null, q: '' };

function editorScreen() {
  document.body.className = 'start';
  $('#app').innerHTML = `<div class="start-wrap wide"><div class="row gap"><h1 class="grow">✏ Éditeur de base</h1><button class="btn primary big" id="edBack">✔ Terminer</button></div><div id="edMain" class="col"></div></div>`;
  $('#edBack').onclick = async () => { await saveDB(); startScreen(); };
  vEditor($('#edMain'), DB, false);
}
async function persistWorld(W) { if (W === G) await save(); else await saveDB(); }

function vEditor(el, W, inGame) {
  if (ED.club == null || (ED.club !== 'free' && !W.clubs.some(c => c.id === ED.club))) ED.club = inGame ? G.clubId : W.clubs[0].id;
  const divs = [...new Set(W.clubs.filter(c => !c.foreign).map(c => c.div || 1))].sort((a, b) => a - b);
  const club = ED.club === 'free' ? null : W.clubs.find(c => c.id === ED.club);
  const players = W.players.filter(p => ED.club === 'free' ? p.club == null : p.club === ED.club)
    .filter(p => !ED.q || normName(p.name).includes(normName(ED.q)))
    .sort((a, b) => Object.keys(ROLES).indexOf(a.pos) - Object.keys(ROLES).indexOf(b.pos) || playerOvr(b) - playerOvr(a));
  const rerender = () => vEditor(el, W, inGame);
  el.innerHTML = `
  <section class="card">
    <div class="row gap wrap"><div class="grow"><h2>✏ Éditeur</h2><p class="hint">${inGame ? 'Modifie ta partie en cours.' : 'Modifie la base utilisée pour les nouvelles parties.'}</p></div>
      <button class="btn" id="bulkPh" title="Sélectionne plusieurs images nommées comme les joueurs (ex : « Jean Dupont.jpg »)">📷 Photos en masse</button>
      <button class="btn" id="bulkLg" title="Sélectionne plusieurs images nommées comme les clubs ou leur abréviation">🛡 Logos en masse</button>
      ${inGame ? '' : '<button class="btn" id="edExp">⬇ Exporter JSON</button><button class="btn" id="edImp">📂 Importer JSON</button>'}
    </div>
    <div class="row gap wrap mt">
      ${divs.map((d, i) => `<label>Nom division ${d} <input data-ln="${i}" data-div="${d}" value="${esc(W.leagueNames?.[i] || 'Division ' + d)}"></label>`).join('')}
      <label>Nom de la coupe <input id="cupN" value="${esc(W.cupName || 'Coupe Nationale')}"></label>
      ${Object.keys(COMP_NAMES_DEF).map(k => `<label>${{ C1: 'Coupe d\'Europe n°1', C2: 'Coupe d\'Europe n°2', C3: 'Coupe d\'Europe n°3', SUP: 'Supercoupe nationale', ESUP: 'Supercoupe d\'Europe', WC: 'Mondial des nations', EURO: 'Euro des nations' }[k]} <input data-cn="${k}" value="${esc(compNameOf(W, k))}"></label>`).join('')}
    </div>
    <details class="mt"><summary>💶 Économie des championnats</summary>
      <div class="form-grid mt">${divs.map(d => { const e = leagueEcoByDiv(W, d); return `<label>Div. ${d} — droits TV (M€/saison) <input data-eco="tv" data-div="${d}" type="number" value="${Math.round(e.tv / 1e6)}"></label><label>Div. ${d} — prix moyen du billet (€) <input data-eco="ticket" data-div="${d}" type="number" value="${Math.round(e.ticket)}"></label><label>Div. ${d} — niveau économique (salaires, sponsors : 0.1-2) <input data-eco="coef" data-div="${d}" type="number" step="0.05" value="${e.coef}"></label>`; }).join('')}</div>
      <p class="hint">Exemple : une ligue anglaise réaliste aurait des droits TV ~3 000 M€ et un niveau 1.7. Les clubs étrangers suivent la richesse de leur pays.</p>
    </details>
    <p class="hint">Astuce : pour mettre tes propres photos et logos d'un coup, nomme les fichiers comme le joueur (« Prénom Nom.jpg ») ou le club (« Nom du club.png »), puis utilise les boutons « en masse ». Les images restent sur ton PC (stockées dans le navigateur).</p>
  </section>
  <div class="ed-wrap">
    <section class="card ed-clubs">
      ${divs.map((d, i) => `<h3>${esc(W.leagueNames?.[i] || 'Division ' + d)}</h3>${W.clubs.filter(c => !c.foreign && (c.div || 1) === d).sort((a, b) => a.name.localeCompare(b.name)).map(c => `<div class="ed-club ${c.id === ED.club ? 'on' : ''}" data-c="${c.id}">${crest(c, 24)} <span>${esc(c.name)}</span></div>`).join('')}`).join('')}
      <h3>Clubs étrangers (Coupe d'Europe)</h3>${W.clubs.filter(c => c.foreign).sort((a, b) => b.rep - a.rep).map(c => `<div class="ed-club ${c.id === ED.club ? 'on' : ''}" data-c="${c.id}">${crest(c, 24)} <span>${esc(c.name)}</span></div>`).join('')}
      <h3>Autres</h3><div class="ed-club ${ED.club === 'free' ? 'on' : ''}" data-c="free">👤 <span>Agents libres</span></div>
      ${inGame ? '' : '<button class="btn sm mt" id="addClub">+ Ajouter un club</button>'}
    </section>
    <div class="col">
      ${club ? `<section class="card">
        <div class="row gap wrap">
          <div class="logo-edit">${crest(club, 84)}
            <button class="btn sm" id="lgUp">📁 Logo depuis le PC</button>
            <button class="btn sm" id="lgUrl">🔗 URL</button>
            ${club.logo ? '<button class="btn sm danger" id="lgDel">Retirer</button>' : ''}
          </div>
          <div class="grow form-grid">
            <label>Nom <input id="cName" value="${esc(club.name)}"></label>
            <label>Abréviation <input id="cShort" value="${esc(club.short)}" maxlength="4"></label>
            <label>Couleur 1 <input type="color" id="cC1" value="${club.colors[0]}"></label>
            <label>Couleur 2 <input type="color" id="cC2" value="${club.colors[1]}"></label>
            <label>Stade <input id="cStad" value="${esc(club.stadium)}"></label>
            <label>Capacité <input id="cCap" type="number" value="${club.capacity}"></label>
            <label>Réputation (30-99) <input id="cRep" type="number" min="30" max="99" value="${Math.round(club.rep)}"></label>
            <label>Budget (M€) <input id="cBud" type="number" step="0.1" value="${(club.budget / 1e6).toFixed(1)}"></label>
            ${inGame || club.foreign ? '' : `<label>Division <input id="cDiv" type="number" min="1" max="5" value="${club.div || 1}"></label>`}
          </div>
        </div>
        <div class="row gap mt"><div class="grow"></div>
          ${inGame ? '' : '<button class="btn danger" id="delClub">Supprimer le club</button>'}
          <button class="btn primary" id="saveClub">💾 Enregistrer le club</button></div>
      </section>` : ''}
      <section class="card">
        <div class="row gap wrap"><h2 class="grow">Joueurs (${players.length})</h2>
          <input id="edQ" placeholder="Filtrer…" value="${esc(ED.q)}">
          <button class="btn" id="addPl">+ Ajouter un joueur</button></div>
        <div class="scroll"><table class="tbl players compact">
          <thead><tr><th>#</th><th></th><th>Nom</th><th>Poste</th><th>Âge</th><th>Nat.</th><th>Note</th><th>Pot.</th><th></th></tr></thead>
          <tbody>${players.map(p => `<tr data-pid="${p.id}"><td class="muted">${p.num ?? ''}</td><td>${avatar(p, 28, W)}</td><td class="nm">${esc(p.name)}</td><td>${p.pos}</td><td>${p.age}</td><td>${natFlag(p.nat)}</td><td>${ovrBadge(playerOvr(p))}</td><td>${Math.round(p.pot)}</td>
            <td class="row gap"><button class="btn sm" data-ed="${p.id}">✏</button><button class="btn sm danger" data-del="${p.id}">🗑</button></td></tr>`).join('')}</tbody>
        </table></div>
      </section>
    </div>
  </div>`;
  el.querySelectorAll('[data-c]').forEach(d => d.onclick = () => { ED.club = d.dataset.c === 'free' ? 'free' : +d.dataset.c; ED.q = ''; rerender(); });
  el.querySelectorAll('[data-ln]').forEach(i => i.onchange = () => {
    W.leagueNames[+i.dataset.ln] = i.value.trim() || 'Division ' + i.dataset.div;
    if (W === G && G.comps['L' + i.dataset.div]) G.comps['L' + i.dataset.div].name = W.leagueNames[+i.dataset.ln];
    persistWorld(W); toast('Nom mis à jour.');
  });
  el.querySelectorAll('[data-eco]').forEach(i => i.onchange = () => {
    W.eco ||= {}; const k = 'L' + i.dataset.div; W.eco[k] = { ...(W.eco[k] || {}) };
    const v = +i.value; if (!(v > 0)) return toast('Valeur invalide.', 'err');
    W.eco[k][i.dataset.eco] = i.dataset.eco === 'tv' ? v * 1e6 : v;
    persistWorld(W); toast('Économie mise à jour.');
  });
  el.querySelectorAll('[data-cn]').forEach(i => i.onchange = () => { W.compNames ||= {}; W.compNames[i.dataset.cn] = i.value.trim() || COMP_NAMES_DEF[i.dataset.cn]; if (W === G && G.comps[i.dataset.cn]) G.comps[i.dataset.cn].name = W.compNames[i.dataset.cn]; persistWorld(W); toast('Nom mis à jour.'); });
  $('#cupN').onchange = e => { W.cupName = e.target.value.trim() || 'Coupe Nationale'; if (W === G) G.comps.CUP.name = W.cupName; persistWorld(W); toast('Nom mis à jour.'); };
  $('#edQ').oninput = e => { ED.q = e.target.value; clearTimeout(ED.t); ED.t = setTimeout(() => { rerender(); const i = $('#edQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); };
  $('#bulkPh').onclick = () => pickFile(async files => {
    const idx = {}; for (const p of W.players) (idx[normName(p.name)] ||= []).push(p);
    let n = 0, miss = [];
    for (const f of files) {
      const ps = idx[normName(f.name)];
      if (!ps) { miss.push(f.name); continue; }
      try { const url = await readImage(f, 160, 'image/jpeg'); ps.forEach(p => p.photo = url); n++; } catch { miss.push(f.name); }
    }
    await persistWorld(W); rerender();
    toast(`${n} photo(s) associée(s).${miss.length ? ` Sans correspondance : ${miss.slice(0, 4).join(', ')}${miss.length > 4 ? '…' : ''}` : ''}`, miss.length && !n ? 'err' : '');
  }, 'image/*', true);
  $('#bulkLg').onclick = () => pickFile(async files => {
    let n = 0, miss = [];
    for (const f of files) {
      const k = normName(f.name);
      const c = W.clubs.find(c => normName(c.name) === k || normName(c.short) === k);
      if (!c) { miss.push(f.name); continue; }
      try { c.logo = await readImage(f, 160, 'image/png'); n++; } catch { miss.push(f.name); }
    }
    await persistWorld(W); if (W === G) enterGameKeepView(); else rerender();
    toast(`${n} logo(s) associé(s).${miss.length ? ` Sans correspondance : ${miss.slice(0, 4).join(', ')}` : ''}`, miss.length && !n ? 'err' : '');
  }, 'image/*', true);
  $('#edExp')?.addEventListener('click', () => exportDatabase(W));
  $('#edImp')?.addEventListener('click', () => pickFile(async raw => { try { DB = importDatabase(raw); await saveDB(); ED.club = null; editorScreen(); toast('Base importée.'); } catch (e) { toast('Import impossible : ' + e.message, 'err'); } }));
  $('#addClub')?.addEventListener('click', async () => {
    const id = Math.max(...W.clubs.map(c => c.id)) + 1;
    const div = divs[divs.length - 1] || 1;
    const c = { id, name: 'Nouveau club ' + id, short: 'NEW', colors: ['#3355aa', '#ffffff'], rep: 55, div, stadium: 'Stade municipal', capacity: 15000, budget: 3e6, logo: null, style: clubStyle(), coh: 65, trophies: [] };
    W.clubs.push(c);
    const sq = SQUAD_TEMPLATE.map(r => { const p = genPlayer(r, 9 + gauss(), { club: id, rep: 55 }); p.id = Math.max(...W.players.map(x => x.id), 0) + 1; p.value = calcValue(p); W.players.push(p); return p; });
    assignNumbers(sq);
    ED.club = id; await persistWorld(W); rerender();
  });
  el.querySelectorAll('[data-ed]').forEach(b => b.onclick = e => { e.stopPropagation(); editPlayerModal(+b.dataset.ed, W, rerender); });
  el.querySelectorAll('tr[data-pid]').forEach(r => r.onclick = () => editPlayerModal(+r.dataset.pid, W, rerender));
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = e => {
    e.stopPropagation();
    const p = W.players.find(x => x.id === +b.dataset.del);
    confirmBox(`Supprimer définitivement ${esc(p.name)} ?`, async () => {
      W.players = W.players.filter(x => x !== p);
      if (W === G) { reindex(G); removeFromTactics(p.id); G.shortlist = G.shortlist.filter(id => id !== p.id); G.offers = G.offers.filter(o => o.pid !== p.id); }
      await persistWorld(W); rerender();
    }, 'Supprimer', true);
  });
  $('#addPl').onclick = async () => {
    const p = genPlayer('MC', 10, { club: ED.club === 'free' ? null : ED.club });
    p.id = Math.max(...W.players.map(x => x.id), 0) + 1; NEXT_PID = Math.max(NEXT_PID, p.id + 1);
    p.name = 'Nouveau Joueur'; p.value = calcValue(p);
    W.players.push(p);
    if (W === G) reindex(G);
    if (p.club != null) assignNumbers(W.players.filter(x => x.club === p.club));
    await persistWorld(W);
    editPlayerModal(p.id, W, rerender);
  };
  if (!club) return;
  const applyLogo = async url => { club.logo = url; await persistWorld(W); if (W === G) enterGameKeepView(); else rerender(); };
  $('#lgUp').onclick = () => pickFile(async f => { try { await applyLogo(await readImage(f, 160, 'image/png')); toast('Logo importé.'); } catch (e) { toast(e.message, 'err'); } }, 'image/*');
  $('#lgUrl').onclick = () => {
    modal(`<h2>Logo par URL</h2><label>Adresse de l'image <input id="lu" value="${esc(club.logo && !club.logo.startsWith('data:') ? club.logo : '')}" placeholder="https://…"></label><div class="row gap mt"><div class="grow"></div><button class="btn primary" id="luOk">OK</button></div>`);
    $('#luOk').onclick = () => { const v = $('#lu').value.trim(); closeModal(); applyLogo(v || null); };
  };
  $('#lgDel')?.addEventListener('click', () => applyLogo(null));
  $('#saveClub').onclick = async () => {
    club.name = $('#cName').value.trim() || club.name;
    club.short = ($('#cShort').value.trim() || club.short).toUpperCase().slice(0, 4);
    club.colors = [$('#cC1').value, $('#cC2').value];
    club.stadium = $('#cStad').value.trim() || club.stadium;
    club.capacity = clamp(+$('#cCap').value || club.capacity, 1000, 150000);
    club.rep = clamp(+$('#cRep').value || club.rep, 30, 99);
    club.budget = Math.round((+$('#cBud').value || 0) * 1e6);
    if ($('#cDiv')) club.div = clamp(+$('#cDiv').value || 1, 1, 5);
    await persistWorld(W);
    toast('Club enregistré.');
    if (W === G) enterGameKeepView(); else rerender();
  };
  $('#delClub')?.addEventListener('click', () => {
    if (!club.foreign && W.clubs.filter(c => !c.foreign).length <= 4) return toast('Il faut au moins 4 clubs.', 'err');
    confirmBox(`Supprimer ${esc(club.name)} ? Ses joueurs deviennent agents libres.`, async () => {
      W.players.forEach(p => { if (p.club === club.id) p.club = null; });
      W.clubs = W.clubs.filter(c => c !== club);
      ED.club = null; await persistWorld(W); rerender();
    }, 'Supprimer', true);
  });
}

function enterGameKeepView() { const v = VIEW; enterGame(); if (v !== VIEW) show(v); }

function editPlayerModal(pid, W, onDone) {
  const p = W.players.find(x => x.id === pid); if (!p) return;
  const orig = { ovr: playerOvr(p), attrs: { ...p.attrs } };
  let photo = p.photo, face = { ...(p.face || randomFace()) };
  const natOpts = [...NATIONS.map(n => n[0]), ...(NATIONS.some(n => n[0] === p.nat) ? [] : [p.nat])];
  const render = () => {
    const tmp = { ...p, photo, face };
    modal(`<h2>Modifier le joueur</h2>
      <div class="row gap wrap">
        <div class="logo-edit">${avatar(tmp, 110, W)}
          <button class="btn sm" id="phUp">📁 Photo depuis le PC</button>
          <button class="btn sm" id="phUrl">🔗 URL</button>
          ${photo ? '<button class="btn sm danger" id="phDel">Retirer la photo</button>' : '<button class="btn sm" id="phFace">🎲 Autre visage</button>'}
        </div>
        <div class="grow form-grid">
          <label>Nom <input id="pName" value="${esc(p.name)}"></label>
          <label>Numéro <input id="pNum" type="number" min="1" max="99" value="${p.num ?? ''}"></label>
          <label>Âge <input id="pAge" type="number" min="15" max="45" value="${p.age}"></label>
          <label>Nationalité <select id="pNat">${natOpts.map(n => `<option ${n === p.nat ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label>Poste <select id="pPos">${Object.keys(ROLES).map(r => `<option value="${r}" ${r === p.pos ? 'selected' : ''}>${r} — ${ROLES[r].label}</option>`).join('')}</select></label>
          <label>Pied <select id="pFoot">${['Droit', 'Gauche', 'Les deux'].map(f => `<option ${f === p.foot ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
          <label>Personnalité <select id="pPers">${Object.keys(PERSONALITIES).map(k => `<option ${k === p.pers ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
          <label>Club <select id="pClub"><option value="">Agent libre</option>${W.clubs.map(c => `<option value="${c.id}" ${c.id === p.club ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
          <label>Note globale (1-99) <input id="pOvr" type="number" min="20" max="99" value="${orig.ovr}"></label>
          <label>Potentiel <input id="pPot" type="number" min="20" max="99" value="${Math.round(p.pot)}"></label>
          <label>Contrat (saisons) <input id="pCon" type="number" min="0" max="7" value="${p.contract}"></label>
          <label>Salaire (€/sem.) <input id="pWage" type="number" step="1000" value="${p.wage}"></label>
        </div>
      </div>
      <details class="mt"><summary>Attributs détaillés (1-20)</summary>
        <div class="form-grid attrs">${Object.entries(ATTRS).map(([k, l]) => `<label>${l} <input data-a="${k}" type="number" min="1" max="20" value="${p.attrs[k]}"></label>`).join('')}</div>
        <p class="hint">Si tu changes la note globale sans toucher aux attributs, ils sont ajustés automatiquement.</p>
      </details>
      <div class="row gap mt"><div class="grow"></div><button class="btn" onclick="closeModal()">Annuler</button><button class="btn primary" id="pSave">💾 Enregistrer</button></div>`, 'wide');
    $('#phUp').onclick = () => pickFile(async f => { try { photo = await readImage(f, 160, 'image/jpeg'); render(); } catch (e) { toast(e.message, 'err'); } }, 'image/*');
    $('#phUrl').onclick = () => { const v = prompt('Adresse (URL) de la photo :', photo && !photo.startsWith('data:') ? photo : ''); if (v !== null) { photo = v.trim() || null; render(); } };
    $('#phDel')?.addEventListener('click', () => { photo = null; render(); });
    $('#phFace')?.addEventListener('click', () => { face = randomFace(); render(); });
    $('#pSave').onclick = async () => {
      p.name = $('#pName').value.trim() || p.name;
      p.num = +$('#pNum').value || null;
      p.age = clamp(+$('#pAge').value || p.age, 15, 45);
      p.nat = $('#pNat').value;
      p.pos = $('#pPos').value;
      p.foot = $('#pFoot').value;
      p.pers = $('#pPers').value;
      p.photo = photo; p.face = face;
      const attrsIn = {}; $$('[data-a]').forEach(i => attrsIn[i.dataset.a] = clamp(+i.value || 1, 1, 20));
      const attrsChanged = Object.keys(attrsIn).some(k => attrsIn[k] !== orig.attrs[k]);
      p.attrs = attrsIn;
      const ovrIn = +$('#pOvr').value;
      if (!attrsChanged && ovrIn && ovrIn !== orig.ovr) setPlayerOvr(p, ovrIn);
      p.pot = Math.max(+$('#pPot').value || p.pot, playerOvr(p));
      p.contract = clamp(+$('#pCon').value || 0, 0, 7);
      p.wage = Math.max(0, +$('#pWage').value || p.wage);
      const newClub = $('#pClub').value ? +$('#pClub').value : null;
      if (newClub !== p.club) {
        if (W === G && p.club === G.clubId) removeFromTactics(p.id);
        p.club = newClub; p.num = null; p.listed = false;
        if (newClub != null && p.contract <= 0) p.contract = 2;
      }
      if (p.club != null) assignNumbers(W.players.filter(x => x.club === p.club));
      if (W !== G) p.attrs0 = { ...p.attrs };
      p.value = calcValue(p);
      if (W === G) reindex(G);
      await persistWorld(W);
      closeModal(); toast('Joueur enregistré.');
      onDone?.();
    };
  };
  render();
}
