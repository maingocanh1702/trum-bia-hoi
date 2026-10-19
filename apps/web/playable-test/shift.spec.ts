import { test, expect, type Page, type Locator } from '@playwright/test';
import { writeFileSync, readFileSync } from 'node:fs';
const config=JSON.parse(readFileSync('docs/config/economy.tbh.json','utf8'));
const snapshot = async (page: Page) => (await (await page.request.get('/api/player/state')).json()).world;
const synced = (page: Page) => expect(page.locator('.network-status')).toContainText('Đã đồng bộ');
async function purchase(page:Page,button:Locator){
  const receipt=page.waitForResponse(r=>r.url().endsWith('/api/player/command')&&r.request().method()==='POST');
  await button.click({timeout:5000});const response=await receipt;expect(response.ok()).toBe(true);
  await expect(page.locator('.network-status strong')).toHaveCount(0);
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
      if(await serve.count()&&await serve.isEnabled())await purchase(page,serve);
      // A cooldown/rejected order can leave its context panel open; dismiss it before the next table.
      await page.keyboard.press('Escape');
    }
    if(!restored&&w.shift.stats.served>0){
      await page.getByRole('button',{name:'Nhập hàng',exact:true}).click();await expect(page.getByRole('button',{name:/Thùng Cấp Cứu/})).toHaveCount(0);await expect.poll(async()=>(await snapshot(page)).paused).toBe(true);
      const before=await snapshot(page);const row=page.locator('.stock-row').first();const full=row.getByRole('button',{name:/^(Mua bom )?Đầy kho/});
      if(await full.isEnabled()){await purchase(page,full);restocked=true;}
      await page.waitForTimeout(1500);const after=await snapshot(page);expect(after.staminaMs).toBe(before.staminaMs);expect(after.paused).toBe(true);
      await page.reload();await synced(page);expect((await snapshot(page)).shift.id).toBe(firstShift);expect((await snapshot(page)).playerId).toBe(playerId);restored=true;
      // Reload closes menus and resumes this same guest shift.
    }
    if(!upgraded&&w.shift.stats.served>upgradeAfter){
      await page.getByRole('button',{name:'Nâng cấp',exact:true}).click();await expect(page.locator('.dog-entry')).toHaveCount(0);const card=page.locator('.upgrade-card').filter({has:page.getByRole('heading',{name:'Quầy hàng',exact:true})});await expect(card.getByRole('button',{name:/^Nâng ·/})).toBeVisible();await expect(card.locator('img')).toHaveCount(2);
      // Seat model (rules 28): a one-table shop's first purchase is table 2 (plan §7 owner line 3), bought mid-shift.
      const button=page.getByRole('dialog').getByRole('button',{name:/^Mua bàn ·/});await expect(button).toBeVisible();
      if(await button.isEnabled()){const before=await snapshot(page);await purchase(page,button);await expect.poll(async()=>(await snapshot(page)).tables.length).toBe(before.tables.length+1);upgraded=true;}
      upgradeAfter=w.shift.stats.served+5;await page.keyboard.press('Escape');
    }
    if(Object.entries(w.inventory).some(([dish,n])=>config.menu[dish].unlock.kitchenLevel<=w.equipment.kitchen&&typeof n==='number'&&n<=2)&&w.phase==='open'){
      await page.getByRole('button',{name:'Nhập hàng',exact:true}).click();
      for(const row of await page.locator('.stock-row').all()){const full=row.getByRole('button',{name:/^(Mua bom )?Đầy kho/});if(await full.count()&&await full.isEnabled()){await purchase(page,full);restocked=true;}}
      await page.keyboard.press('Escape');
    }
    if(w.shift.stats.served>0&&await page.getByRole('button',{name:'Bỏ qua',exact:true}).isVisible())await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();
    if(w.shift.stats.served>0&&w.shift.stats.served%10===0)await page.screenshot({path:`.qa/playable-${viewport.width}-live.png`});
    writeFileSync(`.qa/playable-${viewport.width}-progress.json`,JSON.stringify({at:Date.now(),firstPlayableMs,fps,phase:w.phase,remaining:w.shift.endsAt-w.now,coins:w.coins,served:w.shift.stats.served,restocked,upgraded}));
    await page.waitForTimeout(1000);
  }
  w=await snapshot(page);expect(w.phase).toBe('resting');expect(w.completedShifts).toBe(1);expect(w.shift.closedAt-w.shift.startedAt-w.shift.pausedMs).toBeGreaterThanOrEqual(config.shift.durationMs);expect(w.shift.stats.served).toBeGreaterThan(0);expect({restored,restocked,upgraded,washing,readyBuffer}).toEqual({restored:true,restocked:true,upgraded:true,washing:true,readyBuffer:true});
  await expect(page.getByRole('heading',{name:'Sổ ca hôm nay',exact:true})).toBeVisible();await page.screenshot({path:`.qa/playable-${viewport.width}-summary.png`});
  await page.keyboard.press('Escape');const saved=await snapshot(page);await page.close();page=await context.newPage();watch(page);await page.setViewportSize(viewport);await enter(page);const reopened=await snapshot(page);
  expect(reopened.playerId).toBe(playerId);expect(reopened.completedShifts).toBe(1);expect(reopened.coins).toBe(saved.coins);expect(reopened.equipment).toEqual(saved.equipment);const shop=(x:typeof saved)=>x.tables.map((t:{id:string,capacity:number,level:number})=>[t.id,t.capacity,t.level]);expect(shop(reopened)).toEqual(shop(saved));expect(reopened.shift.id).toBe(firstShift);
  // Only the overnight rest is accelerated, using the existing isolated test-server clock.
  await page.request.post('/api/__test/overnight',{timeout:5*60*1000});await page.reload();await synced(page);
  await page.getByRole('button',{name:'Mở ca',exact:true}).first().click();await expect.poll(async()=>(await snapshot(page)).phase).toBe('open');expect((await snapshot(page)).shift.id).not.toBe(firstShift);
  expect(await page.locator('img').evaluateAll(imgs=>imgs.every(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0))).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);expect(missing).toEqual([]);
  writeFileSync(`.qa/playable-${viewport.width}.json`,JSON.stringify({viewport,firstPlayableMs,fps,served:w.shift.stats.served,restocked,upgraded,washing,readyBuffer,reload:true,newTab:true,nextDay:true,errors,missing,commands:commands.length},null,2));
});
