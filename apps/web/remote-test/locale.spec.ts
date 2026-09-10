import {test,expect} from '@playwright/test';
const prefs=()=>JSON.parse(localStorage.getItem('tbh.settings.v1')!);
for(const viewport of [{width:390,height:844},{width:360,height:740},{width:1280,height:720}])test(`language entry precedes server creation and preserves the live shift at ${viewport.width}x${viewport.height}`,async({page})=>{
 await page.setViewportSize(viewport);const errors:string[]=[],requests:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/api/'))requests.push(r.url());});
 await page.goto('/');await expect(page.getByRole('radio',{name:'Tiếng Việt',exact:true})).toBeChecked();await expect(page.locator('.game-shell')).toHaveCount(0);expect(requests).toEqual([]);
 expect(await page.evaluate(()=>localStorage.getItem('tbh.remote.v1'))).toBeNull();expect(await page.evaluate(()=>indexedDB.databases())).toEqual([]);
 await page.getByRole('radio',{name:'English',exact:true}).check();expect(await page.evaluate(prefs)).toMatchObject({locale:'en',localeAccepted:false});await expect(page.locator('html')).toHaveAttribute('lang','en');
 await page.reload();await expect(page.getByRole('radio',{name:'English',exact:true})).toBeChecked();expect(requests).toEqual([]);
 await page.keyboard.press('Escape');await expect(page.getByRole('form')).toBeVisible();
 for(const label of await page.locator('.language-entry label').all()){const box=(await label.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.locator('.language-entry img').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
 await page.screenshot({path:`.qa/locale-entry-${viewport.width}.png`,fullPage:true});
 const enter=page.getByRole('button',{name:'Enter the stall',exact:true});await enter.focus();await page.keyboard.press('Enter');await expect(page.locator('.network-status')).toContainText('Synced');expect(await page.evaluate(prefs)).toMatchObject({locale:'en',localeAccepted:true,welcomed:true});
 await page.getByRole('button',{name:'Open shift',exact:true}).first().click();await expect.poll(async()=>(await(await page.request.get('/api/player/state')).json()).world.phase).toBe('open');
 const before=await(await page.request.get('/api/player/state')).json();await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('combobox',{name:'Language',exact:true}).selectOption('vi');await page.keyboard.press('Escape');
 await expect(page.getByRole('button',{name:'Nhập hàng',exact:true})).toBeVisible();const after=await(await page.request.get('/api/player/state')).json();expect(after.world.playerId).toBe(before.world.playerId);expect(after.world.shift.id).toBe(before.world.shift.id);expect(after.world.coins).toBe(before.world.coins);
 await page.reload();await expect(page.locator('.network-status')).toContainText('Đã đồng bộ');await expect(page.locator('.language-entry')).toHaveCount(0);expect((await(await page.request.get('/api/player/state')).json()).world.shift.id).toBe(before.world.shift.id);expect(errors).toEqual([]);
});
for(const [locale,choice] of [['en-US','English'],['vi-VN','Tiếng Việt'],['fr-FR','Tiếng Việt']] as const)test(`browser locale ${locale} suggests ${choice} without accepting or creating a save`,async({browser})=>{
 const context=await browser.newContext({baseURL:'http://127.0.0.1:4179',locale,reducedMotion:'reduce'}),page=await context.newPage();let sent=false;page.on('request',r=>{if(r.url().includes('/api/'))sent=true;});
 await page.goto('/');await expect(page.getByRole('radio',{name:choice,exact:true})).toBeChecked();expect(sent).toBe(false);expect(await page.evaluate(()=>localStorage.getItem('tbh.settings.v1'))).toBeNull();await context.close();
});
test('preference storage refusal keeps the entry retryable and never creates a remote player',async({page})=>{
 await page.addInitScript(()=>{const put=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='tbh.settings.v1'&&!sessionStorage.getItem('allow-settings'))throw new DOMException('denied','QuotaExceededError');put.call(this,key,value);};});
 let sent=false;page.on('request',r=>{if(r.url().includes('/api/'))sent=true;});await page.goto('/');await page.getByRole('radio',{name:'English',exact:true}).check();await page.getByRole('button',{name:'Enter the stall',exact:true}).click();await expect(page.getByRole('alert')).toContainText('could not be saved');expect(sent).toBe(false);
 await page.evaluate(()=>sessionStorage.setItem('allow-settings','1'));await page.getByRole('button',{name:'Enter the stall',exact:true}).click();await expect(page.locator('.network-status')).toContainText('Synced');expect(await page.evaluate(prefs)).toMatchObject({locale:'en',localeAccepted:true});
});
for(const locale of ['en',null])test(`legacy welcomed settings preserve ${locale??'implicit Vietnamese'} without restarting a live shift`,async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Vào quán',exact:true}).click();await expect(page.locator('.network-status')).toContainText('Đã đồng bộ');await page.getByRole('button',{name:'Mở ca',exact:true}).first().click();
 await expect.poll(async()=>(await(await page.request.get('/api/player/state')).json()).world.phase).toBe('open');const before=await(await page.request.get('/api/player/state')).json();
 await page.evaluate(locale=>{const p=JSON.parse(localStorage.getItem('tbh.settings.v1')!);delete p.localeAccepted;if(locale)p.locale=locale;else delete p.locale;localStorage.setItem('tbh.settings.v1',JSON.stringify(p));},locale);
 await page.reload();await expect(page.locator('.network-status')).toContainText(locale==='en'?'Synced':'Đã đồng bộ');await expect(page.locator('.language-entry')).toHaveCount(0);await expect(page.locator('html')).toHaveAttribute('lang',locale??'vi');const after=await(await page.request.get('/api/player/state')).json();expect(after.world.playerId).toBe(before.world.playerId);expect(after.world.shift.id).toBe(before.world.shift.id);
});
test('invalid stored locale cannot skip the language choice through a stale accepted flag',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('tbh.settings.v1',JSON.stringify({locale:'bad',localeAccepted:true,welcomed:true})));let sent=false;page.on('request',r=>{if(r.url().includes('/api/'))sent=true;});await page.goto('/');await expect(page.getByRole('radio',{name:'Tiếng Việt',exact:true})).toBeChecked();await expect(page.getByRole('form')).toBeVisible();expect(sent).toBe(false);
});

test('a failed game module offers retry before language selection or any player mutation',async({page})=>{
 let sent=false;page.on('request',r=>{if(r.url().includes('/api/'))sent=true;});await page.route('**/src/App.tsx*',r=>r.abort(),{times:1});await page.goto('/');await expect(page.getByRole('alert')).toContainText('Chưa tải được quán');expect(sent).toBe(false);
 await page.getByRole('button',{name:'Thử đọc lại',exact:true}).click();await expect(page.getByRole('radio',{name:'Tiếng Việt',exact:true})).toBeChecked();expect(sent).toBe(false);
});
