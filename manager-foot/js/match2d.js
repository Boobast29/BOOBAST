// ============================================================
//  Vue 2D animée du match (canvas). L'équipe à domicile attaque vers la droite.
// ============================================================
function colorDist(a, b) {
  const h = s => { s = s.replace('#', ''); if (s.length === 3) s = s.split('').map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)); };
  try { const [x, y] = [h(a), h(b)]; return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); } catch { return 999; }
}
function lum(c) { const s = c.replace('#', ''); const n = parseInt(s.length === 3 ? s.split('').map(x => x + x).join('') : s, 16); return ((n >> 16) * .3 + ((n >> 8) & 255) * .59 + (n & 255) * .11) / 255; }

class Pitch2D {
  constructor(canvas, mt) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.mt = mt;
    this.pos = {}; this.ball = { x: 50, y: 50 }; this.flash = null; this.t = 0; this.running = false;
    const H = getClub(G, mt.f.h), A = getClub(G, mt.f.a);
    let ca = [A.colors[0], A.colors[1]];
    if (colorDist(H.colors[0], A.colors[0]) < 90) ca = [A.colors[1], A.colors[0]];
    if (colorDist(H.colors[0], ca[0]) < 90) ca = ['#f5f5f5', '#222'];
    this.cols = [[H.colors[0], H.colors[1]], ca];
    this.resize();
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
  }
  resize() {
    const w = this.cv.parentNode.clientWidth || 600;
    const h = Math.round(w * .6);
    const dpr = window.devicePixelRatio || 1;
    this.cv.width = w * dpr; this.cv.height = h * dpr;
    this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = w; this.H = h;
  }
  start() { if (this.running) return; this.running = true; const loop = () => { if (!this.running) return; this.frame(); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  stop() { this.running = false; window.removeEventListener('resize', this._onResize); }
  event(text, type) { this.flash = { text, type, t: 0 }; }
  px(x) { const m = this.W * .04; return m + x / 100 * (this.W - 2 * m); }
  py(y) { const m = this.H * .06; return m + y / 100 * (this.H - 2 * m); }

  targets() {
    const mt = this.mt, b = mt.ball, T = {};
    mt.sides.forEach((s, i) => {
      const form = FORMATIONS[s.formation];
      const poss = b.side === i;
      let carrier = null, cd = 1e9, presser = null, pd = 1e9;
      s.onPitch.forEach(x => {
        const [role, fx, fy] = form[x.slot] || ['MC', 50, 50];
        const depth = (100 - fy) * .46;
        let bx = i === 0 ? 4 + depth : 96 - depth;
        let by = i === 0 ? fx : 100 - fx;
        if (role !== 'GB') {
          bx += (b.x - 50) * .38 + (poss ? (i === 0 ? 6 : -6) : (i === 0 ? -4 : 4));
          by += (b.y - 50) * .15;
        } else bx += (b.x - 50) * .05;
        bx = clamp(bx, 2, 98); by = clamp(by, 4, 96);
        const d = Math.hypot(bx - b.x, by - b.y);
        if (role !== 'GB') {
          if (poss && d < cd) { cd = d; carrier = x.id; }
          if (!poss && d < pd) { pd = d; presser = x.id; }
        }
        T[x.id] = { x: bx, y: by, side: i, role, num: getPlayer(G, x.id).num, id: x.id };
      });
      if (carrier) { T[carrier].x = b.x - (i === 0 ? 1.5 : -1.5); T[carrier].y = b.y; T[carrier].carrier = true; }
      if (presser) { T[presser].x = b.x + (i === 0 ? -3 : 3); T[presser].y = b.y + 3; }
    });
    return T;
  }

  frame() {
    const ctx = this.ctx, W = this.W, H = this.H;
    this.t += 1;
    const T = this.targets();
    for (const id in this.pos) if (!T[id]) delete this.pos[id];
    for (const id in T) {
      const t = T[id];
      const p = this.pos[id] || (this.pos[id] = { x: t.x, y: t.y });
      const k = t.carrier ? .12 : .05;
      p.x += (t.x - p.x) * k + Math.sin((this.t + id * 13) / 30) * .03;
      p.y += (t.y - p.y) * k + Math.cos((this.t + id * 7) / 34) * .03;
      Object.assign(p, { side: t.side, role: t.role, num: t.num, carrier: t.carrier });
    }
    this.ball.x += (this.mt.ball.x - this.ball.x) * .14;
    this.ball.y += (this.mt.ball.y - this.ball.y) * .14;

    // terrain
    const stripes = 12;
    for (let i = 0; i < stripes; i++) { ctx.fillStyle = i % 2 ? '#2a8a4a' : '#257d43'; ctx.fillRect(i * W / stripes, 0, W / stripes + 1, H); }
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2;
    const X = v => this.px(v), Y = v => this.py(v);
    ctx.strokeRect(X(0), Y(0), X(100) - X(0), Y(100) - Y(0));
    ctx.beginPath(); ctx.moveTo(X(50), Y(0)); ctx.lineTo(X(50), Y(100)); ctx.stroke();
    ctx.beginPath(); ctx.arc(X(50), Y(50), (Y(100) - Y(0)) * .14, 0, Math.PI * 2); ctx.stroke();
    for (const side of [0, 1]) {
      const x0 = side ? X(100) : X(0), dir = side ? -1 : 1;
      const bw = (X(100) - X(0)) * .16, bh = (Y(100) - Y(0)) * .58;
      ctx.strokeRect(side ? x0 - bw : x0, Y(50) - bh / 2, bw, bh);
      const sw = bw * .38, sh = bh * .45;
      ctx.strokeRect(side ? x0 - sw : x0, Y(50) - sh / 2, sw, sh);
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.beginPath(); ctx.arc(x0 + dir * bw * .72, Y(50), 2, 0, Math.PI * 2); ctx.fill();
      // but
      ctx.fillStyle = this.flash && this.flash.type === 'goal' && (this.mt.ball.x > 50) === (side === 1) && this.flash.t < 90 ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.35)';
      ctx.fillRect(side ? x0 : x0 - 6, Y(50) - sh * .28, 6, sh * .56);
    }
    // joueurs
    const r = Math.max(7, W / 80);
    for (const id in this.pos) {
      const p = this.pos[id];
      const [c1, c2] = p.role === 'GB' ? (p.side === 0 ? ['#f4c542', '#222'] : ['#b388ff', '#111']) : this.cols[p.side];
      ctx.beginPath(); ctx.arc(X(p.x) + 1.5, Y(p.y) + 2, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fill();
      ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), r, 0, Math.PI * 2); ctx.fillStyle = c1; ctx.fill();
      ctx.lineWidth = p.carrier ? 3 : 2; ctx.strokeStyle = p.carrier ? '#fff' : c2; ctx.stroke();
      ctx.fillStyle = lum(c1) > .6 ? '#111' : '#fff';
      ctx.font = `bold ${Math.round(r * 1.05)}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.num ?? '', X(p.x), Y(p.y) + .5);
      if (p.carrier) {
        const pl = getPlayer(G, +id);
        if (pl) {
          const name = pl.name.split(' ').slice(-1)[0];
          ctx.font = `600 ${Math.round(r * 1.1)}px Arial`;
          const tw = ctx.measureText(name).width;
          ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(X(p.x) - tw / 2 - 4, Y(p.y) - r * 2.9, tw + 8, r * 1.6);
          ctx.fillStyle = '#fff'; ctx.fillText(name, X(p.x), Y(p.y) - r * 2.1);
        }
      }
    }
    // météo
    const wk = this.mt.weather?.key;
    if (wk === 'rain' || wk === 'storm' || wk === 'snow') {
      const snow = wk === 'snow';
      this.drops ||= Array.from({ length: snow ? 90 : 140 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: .5 + Math.random() }));
      ctx.strokeStyle = 'rgba(200,220,255,.45)'; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1;
      for (const d of this.drops) {
        d.y += (snow ? 1.2 : 9) * d.s; d.x += snow ? Math.sin((this.t + d.y) / 30) * .6 : -1.5 * d.s;
        if (d.y > H) { d.y = -10; d.x = Math.random() * W; } if (d.x < 0) d.x = W;
        if (snow) { ctx.beginPath(); ctx.arc(d.x, d.y, 1.6 * d.s, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 2, d.y + 8 * d.s); ctx.stroke(); }
      }
      if (wk === 'storm' && Math.random() < .004) this.lightning = 6;
      if (this.lightning > 0) { ctx.fillStyle = `rgba(255,255,255,${this.lightning * .06})`; ctx.fillRect(0, 0, W, H); this.lightning--; }
    } else if (wk === 'heat' || wk === 'sun') { ctx.fillStyle = 'rgba(255,220,120,.05)'; ctx.fillRect(0, 0, W, H); }
    else if (wk === 'cold') { ctx.fillStyle = 'rgba(180,210,255,.07)'; ctx.fillRect(0, 0, W, H); }
    // ballon
    ctx.beginPath(); ctx.arc(X(this.ball.x) + 1, Y(this.ball.y) + 2, r * .5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
    ctx.beginPath(); ctx.arc(X(this.ball.x), Y(this.ball.y), r * .5, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = '#111'; ctx.stroke();
    // texte d'événement
    if (this.flash) {
      const f = this.flash; f.t++;
      const a = f.t < 15 ? f.t / 15 : f.t > 80 ? Math.max(0, 1 - (f.t - 80) / 30) : 1;
      if (a <= 0) this.flash = null;
      else {
        ctx.globalAlpha = a;
        const big = f.type === 'goal';
        let fs = Math.round(W / (big ? 13 : 22));
        ctx.font = `900 ${fs}px Arial`;
        const tw = ctx.measureText(f.text).width;
        if (tw > W * .9) { fs = Math.floor(fs * W * .9 / tw); ctx.font = `900 ${fs}px Arial`; }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = big ? 8 : 5; ctx.strokeStyle = 'rgba(0,0,0,.7)';
        ctx.strokeText(f.text, W / 2, H / 2);
        ctx.fillStyle = big ? '#ffe14d' : f.type === 'red' ? '#ff6b6b' : '#fff';
        ctx.fillText(f.text, W / 2, H / 2);
        ctx.globalAlpha = 1;
      }
    }
  }
}
