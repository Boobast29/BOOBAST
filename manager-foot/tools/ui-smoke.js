// Usage (depuis manager-foot/, Playwright requis) : node tools/ui-smoke.js [dossier_captures] — parcours complet dans le navigateur, affiche les erreurs JS
const { chromium } = require('playwright');
const SP = process.argv[2] || require('os').tmpdir();
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR ' + e.message + ' ' + (e.stack || '').split('\n')[1])); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  pg.on('dialog', d => d.accept());
  const step = async (name, fn) => { try { await fn(); console.log('ok', name); } catch (e) { console.log('FAIL', name, e.message.split('\n')[0]); errs.push(name); } };
  const t0 = Date.now();
  await pg.goto('file://' + process.cwd() + '/index.html'); await pg.waitForSelector('.club-pick');
  console.log('  load ms', Date.now() - t0);
  await pg.click('.club-pick >> nth=0'); await pg.waitForSelector('#top');
  await step('supercup match', async () => {
    console.log('  next:', await pg.textContent('.tnext'));
    await pg.click('#btnGo'); await pg.waitForSelector('#pmP'); await pg.click('#pmS'); await pg.waitForTimeout(500); await pg.evaluate(() => closeModal());
  });
  await step('holiday 12', async () => {
    const t = Date.now();
    await pg.click('#nav button[data-v=options]'); await pg.selectOption('#hol', '8'); await pg.click('#holGo'); await pg.waitForTimeout(300);
    await pg.evaluate(() => closeModal());
    console.log('  8 weeks ms', Date.now() - t, await pg.evaluate(() => weekLabel(G)));
  });
  await step('euro tab', async () => { await pg.click('#nav button[data-v=comps]'); await pg.click('[data-c=C1]'); await pg.screenshot({ path: SP + '/v8-c1.png', fullPage: true }); });
  await step('fixtures euro', async () => { await pg.click('#nav button[data-v=fixtures]'); await pg.screenshot({ path: SP + '/v8-fix.png' }); });
  await step('intl', async () => { await pg.click('#nav button[data-v=intl]'); await pg.screenshot({ path: SP + '/v8-intl.png' }); await pg.click('[data-it=mine]'); });
  await step('play euro live', async () => {
    for (let k = 0; k < 10; k++) { const lbl = await pg.evaluate(() => weekLabel(G)); if (lbl.startsWith('Europe')) break; await pg.click('#btnGo'); await pg.waitForTimeout(100); if (await pg.$('#pmS')) await pg.click('#pmS'); await pg.waitForTimeout(150); await pg.evaluate(() => closeModal()); }
    console.log('  at', await pg.evaluate(() => weekLabel(G)));
    await pg.click('#btnGo'); await pg.waitForSelector('#pmP'); await pg.click('#pmP'); await pg.selectOption('#mSpeed', '0');
    for (let i = 0; i < 80; i++) { if (await pg.$('#mDone')) break; if (await pg.$('[data-tt]')) await pg.click('[data-tt] >> nth=0'); if (await pg.$('#doSub')) { await pg.click('input[name=out] >> nth=0'); await pg.click('input[name=in] >> nth=0'); await pg.click('#doSub'); } const t = await pg.textContent('#mPause').catch(() => ''); if (t.includes('Reprendre') && !(await pg.$('#modal'))) await pg.click('#mPause'); await pg.waitForTimeout(150); }
    await pg.click('#mDone'); await pg.waitForSelector('#top');
  });
  await step('season end', async () => {
    await pg.waitForTimeout(500); await pg.evaluate(() => closeModal());
    const t = Date.now();
    await pg.click('#nav button[data-v=options]'); await pg.selectOption('#hol', '99'); await pg.click('#holGo'); await pg.waitForTimeout(500);
    for (let k = 0; k < 5 && !(await pg.$('#modal')); k++) { await pg.click('#btnGo').catch(() => {}); await pg.waitForTimeout(300); }
    console.log('  season ms', Date.now() - t);
    await pg.screenshot({ path: SP + '/v8-end.png' });
    console.log('  ', await pg.evaluate(() => `season ${G.season} C1 winner hist ${JSON.stringify(G.history.slice(-1))} ballon ${G.ballon?.[0]?.list[0]?.name}`));
  });
  await step('finances budgets', async () => {
    await pg.evaluate(() => closeModal());
    await pg.click('#nav button[data-v=finances]');
    for (const t of ['plan', 'league', 'acc', 'season']) { await pg.click(`[data-ft=${t}]`); await pg.screenshot({ path: SP + `/v9-fin-${t}.png`, fullPage: true }); }
    await pg.click('[data-ft=league]'); await pg.click('[data-fdiv] >> nth=1'); await pg.click('a[data-club] >> nth=0'); await pg.waitForTimeout(200);
    console.log('  ', await pg.evaluate(() => { const c = myClub(G); return `plan ${money(c.plan.revT)} owner ${c.owner.type} dncg ${c.dncg} acc ${(c.accounts || []).length}`; }));
  });
  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none');
  await b.close();
})();
