// ============================================================
//  Outils d'interface : visuels générés, modales, toasts, formats
// ============================================================
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let G = null;   // partie en cours
let DB = null;  // base de données (défaut, importée ou éditée)
const world = () => G || DB;

const SKIN = ['#f6d2b8', '#e8b48f', '#c98e66', '#a86b45', '#7a4a2c', '#4f2f1c'];
const HAIRC = ['#1b1b1b', '#3b2416', '#6b4423', '#b07a3c', '#d9b25f', '#8a8a8a'];
function faceSVG(p, size = 40, shirt = ['#345', '#fff']) {
  const f = p.face || { skin: 2, hair: 1, hairCol: 0, beard: 0 };
  const sk = SKIN[f.skin % 6], hc = HAIRC[f.hairCol % 6];
  const hairs = [
    '',
    '<path d="M14 20 Q14 7 26 7 Q38 7 38 20 Q34 13 26 13 Q18 13 14 20Z" />',
    '<path d="M13 22 Q12 5 26 5 Q40 5 39 22 Q37 12 26 11 Q16 12 13 22Z" />',
    '<circle cx="26" cy="11" r="11" /><circle cx="17" cy="15" r="6"/><circle cx="35" cy="15" r="6"/>',
    '<path d="M14 18 Q16 6 26 6 Q36 6 38 18 L36 14 L32 10 L26 12 L20 10 L16 14Z" />',
    '<path d="M24 4 Q28 4 28 14 L24 14Z" />',
    '<path d="M13 24 Q11 4 26 4 Q41 4 39 24 L39 34 Q37 18 26 12 Q15 18 13 34Z" />'
  ];
  return `<svg class="face" width="${size}" height="${size}" viewBox="0 0 52 52">
    <rect width="52" height="52" rx="8" fill="#26303d"/>
    <path d="M6 52 Q8 38 26 38 Q44 38 46 52Z" fill="${shirt[0]}"/>
    <path d="M21 38 L26 45 L31 38Z" fill="${shirt[1]}"/>
    <rect x="22" y="28" width="8" height="10" fill="${sk}"/>
    <ellipse cx="26" cy="21" rx="11" ry="13" fill="${sk}"/>
    ${f.beard ? `<path d="M15 23 Q16 35 26 35 Q36 35 37 23 Q34 31 26 31 Q18 31 15 23Z" fill="${hc}" opacity="${f.beard === 1 ? .55 : .9}"/>` : ''}
    <g fill="${hc}">${hairs[f.hair % hairs.length]}</g>
    <circle cx="22" cy="21" r="1.4" fill="#222"/><circle cx="30" cy="21" r="1.4" fill="#222"/>
    <path d="M23 28 Q26 30 29 28" stroke="#7a3b2e" stroke-width="1.2" fill="none"/>
  </svg>`;
}
function clubOf(id, W = world()) { return W.clubs.find(c => c.id === id); }
function avatar(p, size = 40, W = world()) {
  const club = p.club != null ? clubOf(p.club, W) : null;
  const shirt = club ? club.colors : ['#555', '#999'];
  if (p.photo) {
    const fb = faceSVG(p, size, shirt).replace(/"/g, '&quot;');
    return `<span class="ph" style="width:${size}px;height:${size}px"><img src="${esc(p.photo)}" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.outerHTML=this.dataset.fb" data-fb="${fb}"></span>`;
  }
  return faceSVG(p, size, shirt);
}
function crest(c, size = 36) {
  if (!c) return '';
  if (c.logo) return `<img class="crest" src="${esc(c.logo)}" width="${size}" height="${size}" alt="" referrerpolicy="no-referrer" style="width:${size}px;height:${size}px">`;
  const [a, b] = c.colors;
  const txt = (c.short || c.name.slice(0, 3)).toUpperCase().slice(0, 4);
  return `<svg class="crest" width="${size}" height="${size}" viewBox="0 0 40 46">
    <path d="M20 1 L38 6 L38 22 Q38 38 20 45 Q2 38 2 22 L2 6Z" fill="${a}" stroke="${b}" stroke-width="2.5"/>
    <path d="M20 3 L20 43" stroke="${b}" stroke-width="5" opacity=".35"/>
    <text x="20" y="27" text-anchor="middle" font-size="${txt.length > 3 ? 9 : 11}" font-weight="800" fill="#fff" font-family="Arial" stroke="#000" stroke-opacity=".55" stroke-width="2" paint-order="stroke">${esc(txt)}</text>
  </svg>`;
}
function ovrBadge(v, title = '') {
  const cls = v >= 80 ? 'o5' : v >= 70 ? 'o4' : v >= 60 ? 'o3' : v >= 50 ? 'o2' : 'o1';
  return `<span class="ovr ${cls}" ${title ? `title="${esc(title)}"` : ''}>${Math.round(v)}</span>`;
}
function stars(v) {
  const s = Math.round(clamp((v - 40) / 10, .5, 5) * 2) / 2;
  let h = '';
  for (let i = 1; i <= 5; i++) h += i <= s ? '★' : (i - .5 === s ? '⯪' : '☆');
  return `<span class="stars" title="${starsTxt(v)}">${h}</span>`;
}
function bar(v, max = 100, cls = '') { return `<span class="bar ${cls}"><i style="width:${clamp(v / max * 100, 0, 100)}%"></i></span>`; }
function meter(v, label = '') {
  const cls = v >= 60 ? 'good' : v >= 35 ? 'mid' : 'bad';
  return `<span class="meter ${cls}" title="${esc(label)} ${Math.round(v)}/100"><i style="width:${clamp(v, 0, 100)}%"></i></span>`;
}
function natFlag(code) { const n = NATIONS.find(x => x[0] === code); return `<span class="nat" title="${esc(n ? n[1] : code)}">${esc(code)}</span>`; }
function status(p) {
  let s = '';
  if (p.injury > 0) s += `<span class="tag red" title="${esc(p.inj?.name || 'Blessé')}">✚ ${typeof fmtDays === 'function' ? fmtDays(p.injury) : p.injury}</span>`;
  else if (p.returnRisk > 0) s += `<span class="tag yel" title="Retour de blessure : risque de rechute">⚕</span>`;
  if (p.susp > 0) s += `<span class="tag red" title="Suspendu">⛔ ${p.susp}</span>`;
  if (p.listed) s += `<span class="tag yel">À vendre</span>`;
  if (G && G.shortlist?.includes(p.id)) s += `<span class="tag blu" title="Liste de suivi">👁</span>`;
  return s;
}
function formDots(p, n = 5) {
  const f = (p.form || []).filter(x => !G || x.s === G.season).slice(-n);
  if (!f.length) return '<span class="muted">-</span>';
  return `<span class="fdots">${f.map(x => `<i class="${x.r >= 7.5 ? 'g' : x.r >= 6.6 ? 'o' : x.r >= 6 ? 'm' : 'b'}" title="${x.r}"></i>`).join('')}</span>`;
}
function sparkline(vals, w = 220, h = 50, opts = {}) {
  if (!vals || vals.length < 2) return '<span class="muted">Pas encore de données</span>';
  const min = opts.min ?? Math.min(...vals), max = opts.max ?? Math.max(...vals);
  const rng = max - min || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1) * w).toFixed(1)},${(h - (v - min) / rng * (h - 4) - 2).toFixed(1)}`).join(' ');
  const zero = opts.zero && min < 0 && max > 0 ? `<line x1="0" x2="${w}" y1="${h - (0 - min) / rng * (h - 4) - 2}" y2="${h - (0 - min) / rng * (h - 4) - 2}" stroke="#556" stroke-dasharray="3 3"/>` : '';
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${zero}<polyline points="${pts}" fill="none" stroke="${opts.color || 'var(--acc)'}" stroke-width="2"/></svg>`;
}
function fmtDate(d) { return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); }

function toast(msg, type = '') {
  let box = $('#toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
  box.appendChild(t); setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3200);
}
function modal(html, cls = '', opts = {}) {
  closeModal();
  const m = document.createElement('div'); m.id = 'modal';
  m.innerHTML = `<div class="mbox ${cls}">${opts.noClose ? '' : '<button class="mclose" onclick="closeModal()" title="Fermer (Échap)">✕</button>'}${html}</div>`;
  if (!opts.noClose) m.onclick = e => { if (e.target === m) closeModal(); };
  document.body.appendChild(m);
  return m;
}
function closeModal() { $('#modal')?.remove(); }
function confirmBox(text, onYes, yesLabel = 'Confirmer', danger = false) {
  modal(`<h2>Confirmation</h2><p>${text}</p><div class="row gap mt"><div class="grow"></div><button class="btn" onclick="closeModal()">Annuler</button><button class="btn ${danger ? 'danger' : 'primary'}" id="cfYes">${esc(yesLabel)}</button></div>`);
  $('#cfYes').onclick = () => { closeModal(); onYes(); };
}
function download(name, obj) {
  const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function pickFile(cb, accept = '.json,application/json', multiple = false) {
  const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = multiple;
  i.style.display = 'none'; document.body.appendChild(i);
  setTimeout(() => i.remove(), 120000);
  i.onchange = () => {
    i.remove();
    if (!i.files.length) return;
    if (accept.includes('json')) {
      const r = new FileReader();
      r.onload = () => { try { cb(JSON.parse(r.result)); } catch (e) { toast('Fichier invalide : ' + e.message, 'err'); } };
      r.readAsText(i.files[0]);
    } else cb(multiple ? [...i.files] : i.files[0]);
  };
  i.click();
}
// Lit une image depuis le PC et la redimensionne (stockée en data URL)
function readImage(file, max = 160, mime = 'image/png') {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL(mime, .85));
      };
      img.onerror = () => rej(new Error('image illisible'));
      img.src = r.result;
    };
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}
function normName(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
function seg(name, opts, val, tips = []) {
  return `<div class="seg" data-name="${name}">${opts.map((o, i) => `<button type="button" data-v="${i - 1}" class="${val === i - 1 ? 'on' : ''}" title="${esc(tips[i] || '')}">${esc(o)}</button>`).join('')}</div>`;
}
