// ============================================================
//  Messagerie : trois colonnes (dossiers · liste · lecture) et questions présentées comme des choix
//  - Dossiers : À traiter, Boîte de réception, Non lus ; thèmes (Direction, Équipe, Mercato, Presse) ; archives.
//  - Liste : messages groupés par journée, expéditeur + date, objet sur une ligne, aperçu ; recherche.
//  - Questions : contexte, bandeau « calendrier en pause », réponses en cartes (action + conséquence),
//    réponse donnée rappelée une fois la question traitée.
//  Remplace vMail (js/gestion.js) ; les données (G.inbox, G.decisions, decide) ne changent pas.
// ============================================================
let MAIL_Q = '';
const MX_THEMES = { club: ['Direction', 'th-club'], team: ['Équipe', 'th-team'], transfer: ['Mercato', 'th-transfer'], press: ['Presse', 'th-press'], world: ['Autres clubs', 'th-world'] };
const MX_DOSSIERS = [
  ['', [['todo', 'À traiter'], ['all', 'Boîte de réception'], ['unread', 'Non lus']]],
  ['Par thème', [['club', 'Direction'], ['team', 'Équipe'], ['transfer', 'Mercato'], ['press', 'Presse']]],
  ['Archives', [['world', 'Autres clubs'], ['done', 'Réponses données']]]
];
const MX_KIND_THEME = { offer: 'transfer', deal: 'transfer', agentOffer: 'transfer', approach: 'transfer', scoutOffer: 'transfer', raiseReq: 'transfer', cellProposal: 'transfer', cellMeeting: 'transfer',
  meet: 'team', renew: 'team', coachReq: 'team', coachThreat: 'team', staffRenew: 'team', staffClash: 'team' };
const mxTheme = d => MX_KIND_THEME[d.kind] || 'club';

// Objet : première phrase entière (les « : » ne coupent plus l'objet), aperçu : la suite
mailSubject = function (m) {
  const t = String(m.text || '').replace(/^[^\wÀ-ÿ«"]+/u, '');
  let s = t.split(/(?<=[.!?])\s/)[0];
  const tiret = s.indexOf(' — '); if (tiret >= 12) s = s.slice(0, tiret);
  s = s.replace(/\s*[—:]\s*$/, '').replace(/(?<!\.)\.$/, '');
  return s.length > 90 ? s.slice(0, 88).replace(/\s\S*$/, '') + '…' : s;
};
function mxApercu(m) {
  const t = String(m.text || '').replace(/^[^\wÀ-ÿ«"]+/u, ''), s = t.split(/(?<=[.!?])\s/)[0], tiret = s.indexOf(' — ');
  const r = (tiret >= 12 ? t.slice(tiret + 3) : t.slice(s.length)).trim() || (s.length > 90 ? t.slice(0, 160) : '');
  return r.length > 120 ? r.slice(0, 118) + '…' : r;
}
// « Accepter (ouvrir le staff) » → action « Accepter », conséquence « ouvrir le staff »
function mxOption(l) {
  let m = String(l).match(/^(.+?)\s*\(([^()]+)\)\s*$/);
  if (m) return [m[1], m[2]];
  m = String(l).match(/^([^:]{3,40}?)\s*:\s*(.+)$/);
  return m ? [m[1], m[2]] : [l, ''];
}
function mxOptions(d) { try { return (DECISION_OPTS[d.kind] || DECISION_OPTS.info)(d) || []; } catch { return []; } }

vMail = function (el) {
  migrateGestion(G);
  const decs = pendingDecisions(G), done = G.decisions.filter(d => d.done);
  for (const m of G.inbox) m.id ||= 'm' + (G.decSeq++);
  const F = MAIL_FILTER;
  const decItems = F === 'done' ? done : ['todo', 'all', 'unread'].includes(F) ? decs : decs.filter(d => mxTheme(d) === F);
  const mails = F === 'todo' || F === 'done' ? [] : G.inbox.filter(m => F === 'all' ? !m.world : F === 'unread' ? !m.read && !m.world : mailCat(m) === F).slice(0, 200);
  const q = MAIL_Q.trim().toLowerCase();
  const fromOf = m => m.world ? 'Ligue' : (MAIL_SENDER[m.type] || ['Club'])[0];
  const okQ = s => !q || s.toLowerCase().includes(q);
  const items = [
    ...decItems.filter(d => okQ(`${d.title} ${d.text || ''} ${d.from || ''}`)).map(d => ({ id: 'd:' + d.id, dec: d })),
    ...mails.filter(m => okQ(`${m.text} ${fromOf(m)}`)).map(m => ({ id: m.id, m }))
  ];
  if (!MAIL_SEL || !items.some(i => i.id === MAIL_SEL)) MAIL_SEL = items[0]?.id || null;
  const sel = items.find(i => i.id === MAIL_SEL);
  if (sel?.m) sel.m.read = true;

  const cnt = k => k === 'todo' ? decs.length : k === 'all' ? unreadMail(G) : k === 'unread' ? unreadMail(G) : k === 'done' ? 0
    : k === 'world' ? 0 : G.inbox.filter(m => !m.world && mailCat(m) === k && !m.read).length + decs.filter(d => mxTheme(d) === k).length;
  const dossiers = MX_DOSSIERS.map(([t, l]) => `${t ? `<p class="mx-dt">${t}</p>` : ''}${l.map(([k, n]) => {
    const c = cnt(k);
    return `<button data-mf="${k}" class="mx-f ${F === k ? 'on' : ''} ${k === 'todo' && c ? 'urgent' : ''}" ${F === k ? 'aria-current="true"' : ''}>${MX_THEMES[k] ? `<i class="mx-pt ${MX_THEMES[k][1]}"></i>` : ''}<span>${n}</span>${c ? `<em>${c}</em>` : ''}</button>`;
  }).join('')}`).join('');

  const rowDec = i => {
    const d = i.dec, th = MX_THEMES[mxTheme(d)];
    return `<button class="mx-row q ${i.id === MAIL_SEL ? 'sel' : ''} ${d.done ? 'fait' : ''}" data-id="${i.id}">
      <span class="mx-r1"><span class="mx-from"><i class="mx-pt ${th[1]}"></i>${esc(d.from || 'Club')}</span><time>${esc(d.label)}</time></span>
      <span class="mx-subj">${d.done ? '' : '<span class="mx-tag">Question</span>'}${esc(d.title)}</span>
      <span class="mx-prev">${d.done ? 'Ta réponse : ' + esc(mxOption(mxReponse(d))[0]) : d.blocking ? 'Réponse attendue pour continuer' : 'Réponse attendue'}</span></button>`;
  };
  const rowMail = i => {
    const m = i.m, th = MX_THEMES[mailCat(m)] || MX_THEMES.club, prev = mxApercu(m);
    return `<button class="mx-row ${i.id === MAIL_SEL ? 'sel' : ''} ${m.read ? '' : 'unread'}" data-id="${i.id}">
      <span class="mx-r1"><span class="mx-from"><i class="mx-pt ${th[1]}"></i>${esc(fromOf(m))}</span><time>${esc(m.label || '')}</time></span>
      <span class="mx-subj">${esc(mailSubject(m))}</span>${prev ? `<span class="mx-prev">${esc(prev)}</span>` : ''}</button>`;
  };
  let liste = '', grp = null;
  const decList = items.filter(i => i.dec), mailList = items.filter(i => i.m);
  if (decList.length) liste += `<li class="mx-g">${F === 'done' ? 'Réponses données' : `Questions en attente · ${decList.length}`}</li>` + decList.map(i => `<li>${rowDec(i)}</li>`).join('');
  for (const i of mailList) {
    const g = `${i.m.label || ''} · ${i.m.season}/${String((i.m.season || 0) + 1).slice(-2)}`;
    if (g !== grp) { grp = g; liste += `<li class="mx-g">${esc(g)}</li>`; }
    liste += `<li>${rowMail(i)}</li>`;
  }
  if (!items.length) liste = `<li class="mx-vide">${q ? `<b>Aucun message ne contient « ${esc(MAIL_Q)} ».</b><span>Essaie un nom de joueur, de club ou d'expéditeur.</span>`
    : F === 'todo' ? '<b>Rien à traiter.</b><span>Toutes les questions ont reçu une réponse. Les nouvelles demandes arriveront ici.</span>'
    : '<b>Aucun message dans ce dossier.</b><span>Les nouveaux messages arrivent après chaque journée jouée.</span>'}</li>`;

  let lecture = '<div class="mx-rien">Choisis un message dans la liste.</div>';
  if (sel?.dec) {
    const d = sel.dec, th = MX_THEMES[mxTheme(d)], p = d.ref != null && ['meet', 'renew'].includes(d.kind) ? getPlayer(G, d.ref) : null;
    const opts = mxOptions(d);
    const rep = d.done ? mxReponse(d) : '';
    lecture = `<article class="mx-q">
      <header class="mx-h"><p class="mx-eye"><i class="mx-pt ${th[1]}"></i>${d.done ? 'Question traitée' : 'Question'} · ${th[0]}</p>
        <h2>${esc(d.title)}</h2><p class="mx-meta">De <b>${esc(d.from || 'Club')}</b> · ${esc(d.label)} ${d.season}/${d.season + 1}</p></header>
      ${!d.done && d.blocking ? '<div class="mx-pause" role="status"><b>Calendrier en pause</b><span>Choisis une réponse pour jouer la suite de la saison.</span></div>' : ''}
      ${p ? `<div class="mx-joueur">${avatar(p, 48)}<div><b>${esc(p.name)}</b>${fictionalTag(p)}<small>${ROLES[p.pos].label} · ${p.age} ans · ${STATUS[p.status || 'rot'].label}</small><small>Moral ${Math.round(p.morale)} % · confiance ${Math.round(p.trust ?? 55)} % · contrat ${contractEnd(p)} · ${wageM(p.wage)}</small></div><button class="btn sm" onclick="playerModal(${p.id})">Voir la fiche</button></div>` : ''}
      <div class="mx-corps">${d.html || `<p>${esc(d.text)}</p>`}</div>
      ${d.done ? `<div class="mx-fait"><span>Ta réponse</span><b>${esc(mxOption(rep)[0])}</b>${d.answer && d.answer !== rep ? `<p>${esc(d.answer)}</p>` : ''}</div>`
      : `<h3 class="mx-h3">Ta réponse</h3><div class="mx-opts">${opts.map(([k, l, cls], n) => { const [a, c] = mxOption(l); return `<button class="mx-opt ${cls || ''}" data-dec="${k}"><span class="mx-n">${n + 1}</span><span class="mx-ot"><b>${esc(a)}</b>${c ? `<small>${esc(c)}</small>` : ''}</span></button>`; }).join('')}</div>`}
    </article>`;
  } else if (sel?.m) {
    const m = sel.m, th = MX_THEMES[mailCat(m)] || MX_THEMES.club;
    const link = { transfer: ['transfers', 'Ouvrir le mercato'], offer: ['transfers', 'Ouvrir le mercato'], scout: ['transfers', 'Voir les rapports'], inj: ['medical', 'Ouvrir l\'infirmerie'], youth: ['youth', 'Voir le centre de formation'], board: ['finances', 'Voir les finances'], warn: ['dressing', 'Ouvrir le vestiaire'], press: /conférence/i.test(m.text) ? ['meetings', 'Ouvrir les réunions'] : null }[m.type];
    lecture = `<article class="mx-msg">
      <header class="mx-h"><p class="mx-eye"><i class="mx-pt ${th[1]}"></i>${th[0]}</p><h2>${esc(mailSubject(m))}</h2>
        <p class="mx-meta">De <b>${esc(fromOf(m))}</b> · ${esc(m.label || '')} ${m.season}/${m.season + 1}</p></header>
      <div class="mx-corps"><p>${esc(m.text)}</p></div>
      <div class="mx-act">${link && !m.world ? `<button class="btn primary" onclick="show('${link[0]}')">${link[1]}</button>` : ''}<button class="btn ghost" id="mDel">Supprimer le message</button></div></article>`;
  }

  el.innerHTML = `<section class="card mx">
    <nav class="mx-dossiers" aria-label="Dossiers">${dossiers}</nav>
    <div class="mx-liste"><div class="mx-outils"><input id="mxQ" type="search" placeholder="Rechercher (joueur, club, expéditeur)" value="${esc(MAIL_Q)}" aria-label="Rechercher dans les messages"><button class="btn sm ghost" id="mAll" title="Marquer tous les messages comme lus">Tout lu</button></div>
      <ul>${liste}</ul></div>
    <div class="mx-lecture">${lecture}</div></section>`;
  el.querySelectorAll('[data-mf]').forEach(b => b.onclick = () => { MAIL_FILTER = b.dataset.mf; MAIL_SEL = null; vMail(el); navBadges(); });
  el.querySelectorAll('.mx-row[data-id]').forEach(b => b.onclick = () => { MAIL_SEL = b.dataset.id; vMail(el); navBadges(); });
  el.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => decide(sel.dec.id, b.dataset.dec));
  const iq = $('#mxQ'); let tq;
  iq.oninput = () => { clearTimeout(tq); tq = setTimeout(() => { MAIL_Q = iq.value; MAIL_SEL = null; vMail(el); const n = $('#mxQ'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 180); };
  $('#mAll').onclick = () => { G.inbox.forEach(m => m.read = true); vMail(el); navBadges(); };
  $('#mDel')?.addEventListener('click', () => { G.inbox = G.inbox.filter(m => m !== sel.m); MAIL_SEL = null; save(); vMail(el); });
};

// Réponse donnée : on garde le libellé choisi (et non la clé interne) pour l'afficher ensuite
const MX_AUTO = { accept: 'Accepter', auto: 'Réglée par ton adjoint (délégation)', ok: 'Bien reçu', 'expirée': 'Offre expirée', choisi: 'Sponsor choisi', 'traité': 'Traitée', parti: 'Le joueur a quitté le club' };
function mxReponse(d) {
  if (d.answerLabel) return d.answerLabel;
  if (MX_AUTO[d.done]) return MX_AUTO[d.done];
  const o = mxOptions(d).find(x => x[0] === d.done);
  return o ? o[1] : typeof d.done === 'string' ? d.done : 'Traitée';
}
window.addEventListener('load', () => {
  const __decideMX = decide;
  decide = function (id, opt) {
    const d = G.decisions.find(x => x.id === id);
    const l = d && !d.done ? mxOptions(d).find(o => o[0] === opt)?.[1] : null;
    const r = __decideMX.apply(this, arguments);
    if (d && d.done && l && !d.answerLabel) { d.answerLabel = l; if ($('#top') && VIEW === 'mail' && !$('#modal')) show('mail'); }
    return r;
  };
});
