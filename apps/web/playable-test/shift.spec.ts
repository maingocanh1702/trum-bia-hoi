import { test, expect, type Page, type Locator } from '@playwright/test';
import { writeFileSync, readFileSync } from 'node:fs';
const config=JSON.parse(readFileSync('docs/config/economy.tbh.json','utf8'));
const snapshot = async (page: Page) => (await (await page.request.get('/api/player/state')).json()).world;
const synced = (page: Page) => expect(page.locator('.network-status')).toContainText('Đã đồng bộ');
// `mayVanish`: a serve click may lose its order to the real clock between the poll and the click (the table is cleaned and the
// button is gone); that is play, not a failure. A command the server rejects still fails the test.
async function purchase(page:Page,button:Locator,mayVanish=false){
  const receipt=page.waitForResponse(r=>r.url().endsWith('/api/player/command')&&r.request().method()==='POST');
  try{await button.click({timeout:5000});}catch(error){receipt.catch(()=>{});if(mayVanish)return false;throw error;}
  const response=await receipt;expect(response.ok()).toBe(true);
  await expect(page.locator('.network-status strong')).toHaveCount(0);
  return true;
}
async function enter(page: Page) {
  await page.goto('/');
  await expect(page.locator('.language-entry, .game-shell')).toBeVisible();
  const language = page.getByRole('radio', { name: 'Tiếng Việt', exact: true });
  if (await language.isVisible()) { await language.check(); await page.getByRole('button', { name: 'Vào quán', exact: true }).click(); }
  await expect(page.locator('.language-entry, .game-shell')).toBeVisible();
  const guest = page.getByRole('button', { name: 'Chơi không đăng nhập', exact: true });
  if (await guest.isVisible()) await guest.click();
  await synced(page);
}
test('default guest full shift', async ({ page, context }) => {
  const viewport=test.info().project.use.viewport!;
  test.setTimeout(25*60*1000); await page.setViewportSize(viewport);
  const errors:string[]=[], missing:string[]=[], commands:unknown[]=[];
  const watch=(p:Page)=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('response',r=>{if(r.status()>=400)missing.push(`${r.status()} ${r.url()}`);if(r.url().endsWith('/player/command'))void r.json().then(body=>commands.push(body));});};watch(page);
  const started=Date.now();await enter(page);const firstPlayableMs=Date.now()-started;
  expect(firstPlayableMs).toBeLessThan(5000);
  await page.getByRole('button',{name:'Mở ca',exact:true}).first().click();await synced(page);
  await expect.poll(async()=>(await snapshot(page))?.phase).toBe('open');
  let w=await snapshot(page);const firstShift=w.shift.id, playerId=w.playerId;
  let restored=false,restocked=false,upgraded=false,upgradeAfter=0,washing=false,readyBuffer=false;
  const fps=await page.evaluate(()=>new Promise<number>(resolve=>{const begin=performance.now();let frames=0;function step(now:number){frames++;if(now-begin>=3000)resolve(frames*1000/(now-begin));else requestAnimationFrame(step);}requestAnimationFrame(step);}));expect(fps).toBeGreaterThanOrEqual(30);
  const deadline=Date.now()+20*60*1000;
  while(Date.now()<deadline){
    w=await snapshot(page);washing ||= w.glasses.some((g:{state:string})=>g.state==='washing');readyBuffer ||= w.beer.ready>0;
    if(w.phase==='resting'&&w.completedShifts>0)break;
    // Only ordinary UI mutations. No clock acceleration during the 12-minute shift.
    for(const table of w.tables.filter((t:{order?:{state:string,items:{state:string}[]}})=>t.order&&['pending','grace'].includes(t.order.state)&&t.order.items.every(i=>i.state==='ready'))){
      // Table buttons persist when the order bubble disappears at its deadline.
      await page.locator(`[data-table-id="${table.id}"] .table-object`).click();const serve=page.getByRole('button',{name:'Phục vụ cả mâm',exact:true});
      if(await serve.count()&&await serve.isEnabled())await purchase(page,serve,true);
      // A cooldown/rejected order can leave its context panel open; dismiss it before the next table.
      await page.keyboard.press('Escape');
    }
    // Shift 1 is the minimal HUD (wallet, keg, tables): no stock sheet or upgrades yet. Reload keeps the same guest shift.
    if(!restored&&w.shift.stats.served>0){
      await page.reload();await synced(page);expect((await snapshot(page)).shift.id).toBe(firstShift);expect((await snapshot(page)).playerId).toBe(playerId);restored=true;
    }
    // The keg's own quick button refills beer without pausing the shift.
    const refill=page.locator('.beer-stock-warning button:enabled');
    if(w.phase==='open'&&await refill.count()){await purchase(page,refill);restocked=true;}
    if(w.shift.stats.served>0&&w.shift.stats.served%10===0)await page.screenshot({path:`.qa/playable-${viewport.width}-live.png`});
    writeFileSync(`.qa/playable-${viewport.width}-progress.json`,JSON.stringify({at:Date.now(),firstPlayableMs,fps,phase:w.phase,remaining:w.shift.endsAt-w.now,coins:w.coins,served:w.shift.stats.served,restocked,upgraded}));
    await page.waitForTimeout(1000);
  }
  w=await snapshot(page);expect(w.phase).toBe('resting');expect(w.completedShifts).toBe(1);
  // The closing book opens by itself once the client has seen the shift end (it can lag the server by a poll): close it before the HUD steps.
  const book=page.getByRole('heading',{name:'Sổ ca hôm nay',exact:true});await expect(book).toBeVisible();await page.keyboard.press('Escape');await expect(book).toBeHidden();
  // The HUD opens after shift 1: the stock sheet pauses and restocks, and the Upgrades sheet holds exactly the first goal.
  await page.getByRole('button',{name:'Nhập hàng',exact:true}).click();await expect(page.getByRole('button',{name:/Thùng Cấp Cứu/})).toHaveCount(0);
  const stockRow=page.locator('.stock-row').first(),fullStock=stockRow.getByRole('button',{name:/^(Mua bom )?Đầy kho/});
  if(await fullStock.isEnabled()){await purchase(page,fullStock);restocked=true;}
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Nâng cấp',exact:true}).click();await expect(page.locator('.dog-entry')).toHaveCount(0);
  // One card: the first table that can level up, an empty one when any is (a table mid-clean would lock the buy while the sheet pauses the world).
  const goal=page.locator('dialog[open] .upgrade-card').getByRole('button',{name:/^Nâng ·/});await expect(page.locator('dialog[open] .upgrade-card')).toHaveCount(1);
  const tableLevels=(world:{tables:{level:number}[]})=>world.tables.reduce((sum,t)=>sum+t.level,0);
  if(await goal.isEnabled()){const before=tableLevels(await snapshot(page));await purchase(page,goal);await expect.poll(async()=>tableLevels(await snapshot(page))).toBe(before+1);upgraded=true;}
  await page.keyboard.press('Escape');w=await snapshot(page);expect(w.shift.closedAt-w.shift.startedAt-w.shift.pausedMs).toBeGreaterThanOrEqual(config.shift.durationMs);expect(w.shift.stats.served).toBeGreaterThan(0);expect(restored&&restocked&&upgraded&&washing&&readyBuffer).toBe(true);
  await page.getByRole('button',{name:'Sổ ca',exact:true}).first().click();
  await expect(page.getByRole('heading',{name:'Sổ ca hôm nay',exact:true})).toBeVisible();await page.screenshot({path:`.qa/playable-${viewport.width}-summary.png`});
  await page.keyboard.press('Escape');const saved=await snapshot(page);await page.close();page=await context.newPage();watch(page);await page.setViewportSize(viewport);await enter(page);const reopened=await snapshot(page);
  expect(reopened.playerId).toBe(playerId);expect(reopened.completedShifts).toBe(1);expect(reopened.coins).toBe(saved.coins);expect(reopened.equipment).toEqual(saved.equipment);expect(reopened.tables.map((t:{level:number})=>t.level)).toEqual(saved.tables.map((t:{level:number})=>t.level));expect(reopened.shift.id).toBe(firstShift);
  // Only the overnight rest is accelerated, using the existing isolated test-server clock.
  await page.request.post('/api/__test/overnight',{timeout:5*60*1000});await page.reload();await synced(page);
  await page.getByRole('button',{name:'Mở ca',exact:true}).first().click();await expect.poll(async()=>(await snapshot(page)).phase).toBe('open');expect((await snapshot(page)).shift.id).not.toBe(firstShift);
  expect(await page.locator('img').evaluateAll(imgs=>imgs.every(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0))).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);expect(missing).toEqual([]);
  writeFileSync(`.qa/playable-${viewport.width}.json`,JSON.stringify({viewport,firstPlayableMs,fps,served:w.shift.stats.served,restocked,upgraded,washing,readyBuffer,reload:true,newTab:true,nextDay:true,errors,missing,commands:commands.length},null,2));
});
