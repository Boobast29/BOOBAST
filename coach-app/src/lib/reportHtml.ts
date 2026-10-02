import { statsForPosition } from './constants';
import { playerTimeline, playingTime } from './insights';
import type { Point } from './insights';
import { attendanceRate, avg, byDateDesc, fmt, formatDate, playerName, summarizePlayer, today } from './stats';
import type { AppData, ID } from './types';

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Petite courbe SVG pour le PDF (une série, une échelle). */
function sparkline(points: Point[], min: number, max: number) {
  const vals = points.map((p, i) => ({ i, v: p.value })).filter((p): p is { i: number; v: number } => typeof p.v === 'number');
  if (vals.length < 2) return '<div class="empty">Pas assez de réponses</div>';
  const W = 300;
  const H = 60;
  const P = 6;
  const x = (i: number) => P + (i / Math.max(1, points.length - 1)) * (W - 2 * P);
  const y = (v: number) => P + (1 - (v - min) / (max - min || 1)) * (H - 2 * P);
  const line = vals.map((p) => `${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const dots = vals.map((p) => `<circle cx="${x(p.i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="3" fill="#107B2D"/>`).join('');
  const mid = y((min + max) / 2).toFixed(1);
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><line x1="${P}" x2="${W - P}" y1="${mid}" y2="${mid}" stroke="#ccc" stroke-dasharray="3 4"/><polyline points="${line}" fill="none" stroke="#107B2D" stroke-width="2" stroke-linejoin="round"/>${dots}</svg>`;
}

/** Bilan d'un joueur en HTML imprimable (A4). */
export function playerReportHtml(data: AppData, playerId: ID, clubName: string) {
  const player = data.players.find((p) => p.id === playerId)!;
  const s = summarizePlayer(data, player);
  const tl = playerTimeline(data, playerId, 20);
  const pt = playingTime(data);
  const time = pt.rows.find((r) => r.playerId === playerId);
  const att = attendanceRate(data, playerId, 50);
  const objectives = data.objectives.filter((o) => o.playerId === playerId && o.status !== 'abandonné');
  const interviews = data.interviews.filter((i) => i.playerId === playerId).sort(byDateDesc);
  const injuries = data.injuries.filter((i) => i.playerId === playerId).sort(byDateDesc);
  const reports = data.reports.filter((r) => r.playerId === playerId);
  const scaleQuestions = data.questions.filter((q) => q.type === 'scale');
  const comments = reports
    .filter((r) => r.playerComment)
    .map((r) => ({ c: r.playerComment!, m: data.matches.find((m) => m.id === r.matchId) }))
    .sort((a, b) => (b.m?.date ?? '').localeCompare(a.m?.date ?? ''))
    .slice(0, 4);
  const statFields = statsForPosition(player.position).filter((f) => !['yellowCards', 'redCards'].includes(f.key));

  const kpi = (label: string, value: string) => `<div class="kpi"><div class="v">${esc(value)}</div><div class="l">${esc(label)}</div></div>`;
  const chart = (title: string, pts: Point[], min: number, max: number, unit: string) => {
    const last = [...pts].reverse().find((p) => p.value != null)?.value;
    return `<div class="chart"><div class="ct"><span>${esc(title)}</span><b>${last != null ? `${fmt(last)} ${unit}` : '–'}</b></div>${sparkline(pts, min, max)}</div>`;
  };

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Bilan ${esc(playerName(player))}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F1B17; font-size: 11.5px; line-height: 1.45; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #107B2D; padding-bottom: 8px; margin-bottom: 12px; }
  h1 { font-size: 22px; margin: 0; }
  .sub { color: #6B7A74; }
  h2 { font-size: 13px; color: #107B2D; margin: 16px 0 6px; border-bottom: 1px solid #E3E8E6; padding-bottom: 3px; }
  .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
  .kpi { border: 1px solid #E3E8E6; border-radius: 6px; padding: 6px; text-align: center; }
  .kpi .v { font-size: 17px; font-weight: 700; }
  .kpi .l { color: #6B7A74; font-size: 10px; }
  .charts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
  .ct { display: flex; justify-content: space-between; font-weight: 600; }
  .empty { color: #6B7A74; font-style: italic; height: 60px; }
  table { width: 100%; border-collapse: collapse; }
  td, th { text-align: left; padding: 3px 4px; border-bottom: 1px solid #EEF1F0; vertical-align: top; }
  th { color: #6B7A74; font-weight: 600; font-size: 10.5px; }
  .bar { height: 6px; background: #E3E8E6; border-radius: 3px; overflow: hidden; width: 90px; display: inline-block; vertical-align: middle; }
  .bar i { display: block; height: 6px; background: #107B2D; }
  .lines div { border-bottom: 1px solid #ccc; height: 22px; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .muted { color: #6B7A74; }
  section { break-inside: avoid; }
</style></head><body>
<header>
  <div><h1>${esc(playerName(player))}</h1><div class="sub">${esc([player.position, player.number != null ? `n°${player.number}` : '', data.teamName].filter(Boolean).join(' · '))}</div></div>
  <div class="sub" style="text-align:right">${esc(clubName)}<br>Bilan édité le ${esc(formatDate(today()))}</div>
</header>

<section>
<div class="kpis">
  ${kpi('Matchs joués', String(s.matchesPlayed))}
  ${kpi('Temps de jeu', time && pt.available ? `${Math.round(time.share * 100)} %` : '–')}
  ${kpi('Titularisations', String(s.starts))}
  ${kpi('Assiduité', att.rate != null ? `${Math.round(att.rate * 100)} %` : '–')}
  ${kpi('Forme moy. /5', fmt(s.avgWellness))}
</div>
<div class="kpis" style="margin-top:6px">
  ${statFields
    .slice(0, 3)
    .map((f) => kpi(f.label, String(s.totals[f.key])))
    .join('')}
  ${kpi('Sa note /10', fmt(s.avgSelfRating))}
  ${kpi('Note coach /10', fmt(s.avgCoachRating))}
</div>
<p class="muted">${time ? `${time.minutes}′ joués sur ${pt.available}′ possibles (${pt.played} matchs).` : ''} ${att.total ? `${att.present} présences sur ${att.total} séances.` : ''}</p>
</section>

<section>
<h2>Évolution</h2>
<div class="charts">
  ${chart('Forme après match', tl.form, 1, 5, '/5')}
  ${chart('Sa perf perso (match)', tl.selfRating, 1, 10, '/10')}
  ${chart('Note du coach (match)', tl.coachRating, 1, 10, '/10')}
  ${chart('Sa perf perso (entraînement)', tl.trainingPerf, 1, 10, '/10')}
</div>
</section>

${
  scaleQuestions.length && reports.length
    ? `<section><h2>Questionnaire du club : ses réponses moyennes</h2><table><tr><th>Question</th><th>Moyenne</th><th></th></tr>${scaleQuestions
        .map((q) => {
          const a = avg(reports.map((r) => (typeof r.answers?.[q.id] === 'number' ? (r.answers[q.id] as number) : undefined)));
          const max = q.max ?? 5;
          const min = q.min ?? 1;
          return `<tr><td>${esc(q.label)}</td><td>${a != null ? `${fmt(a)} /${max}` : '–'}</td><td><span class="bar"><i style="width:${a != null ? Math.round(((a - min) / (max - min || 1)) * 100) : 0}%"></i></span></td></tr>`;
        })
        .join('')}</table></section>`
    : ''
}

<div class="two">
<section>
<h2>Points à travailler</h2>
${
  objectives.length
    ? `<table><tr><th>Point</th><th>Statut</th><th>Coach</th><th>Joueur</th></tr>${objectives
        .map((o) => `<tr><td>${esc(o.title)}</td><td>${esc(o.status)}</td><td>${o.coachProgress ?? '–'}/10</td><td>${o.playerProgress ?? '–'}/10</td></tr>`)
        .join('')}</table>`
    : '<p class="muted">Aucun.</p>'
}
</section>
<section>
<h2>Blessures</h2>
${
  injuries.length
    ? `<table>${injuries
        .slice(0, 5)
        .map((i) => `<tr><td>${esc(formatDate(i.date))}</td><td>${esc(`${i.type} · ${i.bodyZone}`)}</td><td>${esc(i.status)}</td></tr>`)
        .join('')}</table>`
    : '<p class="muted">Aucune.</p>'
}
</section>
</div>

${
  comments.length
    ? `<section><h2>Ce qu’il a écrit</h2>${comments
        .map((c) => `<p><span class="muted">${esc(c.m ? formatDate(c.m.date) : '')}</span> « ${esc(c.c)} »</p>`)
        .join('')}</section>`
    : ''
}

${
  interviews.length
    ? `<section><h2>Entretiens</h2><table><tr><th>Date</th><th>Ce qui coince</th><th>Décidé</th></tr>${interviews
        .slice(0, 4)
        .map((i) => `<tr><td>${esc(formatDate(i.date))}</td><td>${esc(i.issues ?? '')}</td><td>${esc(i.decisions ?? '')}</td></tr>`)
        .join('')}</table></section>`
    : ''
}

<section>
<h2>Notes de l’entretien</h2>
<div class="lines">${'<div></div>'.repeat(6)}</div>
</section>
</body></html>`;
}
