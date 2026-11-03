const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(process.argv[2]); await p.waitForFunction(() => typeof DB !== 'undefined' && DB, null, { timeout: 60000 });
  const r = await p.evaluate(async src => { eval(src); return await window.__T; }, fs.readFileSync(process.argv[3], 'utf8'));
  console.log(JSON.stringify({ r, errs }, null, 1)); await b.close();
})();
