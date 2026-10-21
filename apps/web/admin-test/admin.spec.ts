import { test,expect,type Page } from '@playwright/test';
test('historical snapshot comparison includes removed invitation keys in both directions and each version own scaling',async({page})=>{
 await login(page,'viewer');const {snapshot}=await(await page.request.get('/api/admin/draft-source')).json();
 const result=await page.evaluate(async raw=>{
  const modulePath='/src/admin-api.ts', {preview}=await import(modulePath);
  const old=structuredClone(raw);delete old.onboarding.loginPrompt.leaveProgress;
  const next=structuredClone(raw);next.k.value=raw.k.value===2.6?2.7:2.6;
  return {removed:preview(raw,JSON.stringify(old)).rows,added:preview(old,JSON.stringify(raw)).rows,same:preview(old,JSON.stringify(old)).rows,
   price:preview(raw,JSON.stringify(next)).rows.find((r:any)=>r.path==='shift.dailyEarnCapBase'),beforeScaled:preview(raw,JSON.stringify(raw)).config.values.shift.dailyEarnCapBase,afterScaled:preview(next,JSON.stringify(next)).config.values.shift.dailyEarnCapBase};
 },snapshot);
 for(const key of ['minCompletedShifts','minLifetimeEarned']) {
  const path='onboarding.loginPrompt.leaveProgress.'+key;
  expect(result.removed.find((r:any)=>r.path===path)?.before).toBeDefined();expect(result.removed.find((r:any)=>r.path===path)?.value).toBeUndefined();
  expect(result.added.find((r:any)=>r.path===path)?.value).toBeDefined();
 }
 expect(result.same).toEqual([]);expect(result.price.before).toBe(result.price.value);expect(result.price.beforeScaled).toBe(result.beforeScaled);expect(result.price.scaled).toBe(result.afterScaled);expect(result.price.scaled).not.toBe(result.price.beforeScaled);
});
async function gis(page:Page,subject='economy') {
 await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:`window.google={accounts:{id:{initialize(o){this.options=o},renderButton(el){const b=document.createElement('button');b.textContent='Test Google';b.onclick=async()=>{const r=await fetch('/api/__test/sign?subject=${subject}&nonce='+this.options.nonce);this.options.callback(await r.json())};el.append(b)},disableAutoSelect(){},cancel(){}}}};`}));
}
async function login(page:Page,subject='economy',navigate=true){
 await gis(page,subject);if(navigate)await page.goto('/admin');await page.getByRole('button',{name:'Tiếp tục với Google'}).click();await page.getByRole('button',{name:'Test Google'}).click();
 // A `super*` subject is checked with a TOTP step that must be newer than its last one (admin-auth.ts factor(): step <= last_step is a replay) and /__test/otp answers the step of the isolated clock: a second login of the same subject inside one 30 s step is refused. Move the isolated clock one step first; the production check is not touched.
 if(subject.startsWith('super')){await expect(page.getByLabel('Mã xác thực 6 số')).toBeVisible();await page.request.get('/api/__test/advance?ms=30000');const code=(await (await page.request.get('/api/__test/otp?subject='+subject)).json()).code;await page.getByLabel('Mã xác thực 6 số').fill(code);await page.getByRole('button',{name:'Xác thực',exact:true}).click();}
 await expect(page.getByRole('button',{name:'Đăng xuất'})).toBeVisible();await expect(page.getByRole('button',{name:'Làm mới',exact:true})).toBeEnabled();
}
async function edit(page:Page,path='menu.bia.price',reason='Browser measured adjustment'){
 await page.getByRole('button',{name:'Chỉnh sửa bản mới nhất'}).click();await page.getByLabel('Tìm khóa cấu hình').fill(path);await page.getByRole('combobox',{name:'Khóa cấu hình',exact:true}).selectOption(path);
 const input=page.getByRole('textbox',{name:'Giá trị JSON',exact:true});await input.fill(String(Number(await input.inputValue())+1));await page.getByRole('button',{name:'Áp dụng vào bản nháp'}).click();await page.getByLabel('Lý do thay đổi').fill(reason);await page.getByRole('button',{name:'Xem diff',exact:true}).click();
}
async function proposal(page:Page){const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/proposals'&&r.request().method()==='POST');await page.getByRole('button',{name:'Gửi đề xuất'}).click();const receipt=await response;expect(receipt.status()).toBe(200);const {version}=await receipt.json();await expect(page.getByLabel('Mã phiên bản',{exact:true})).toHaveValue(version);await expect(page.getByRole('heading',{name:'Chi tiết phiên bản'})).toBeVisible();return version;}
const detail=(page:Page)=>page.getByRole('region',{name:'Chi tiết phiên bản'});
test('arbitrary sibling versions compare as read-only snapshots with scoped labels, reverse and identical pairs in VI/EN',async({page,browser})=>{
 await login(page,'super-compare');const account=await(await page.request.get('/api/admin/auth')).json(), source=await(await page.request.get('/api/admin/draft-source')).json();
 const left=structuredClone(source.snapshot),right=structuredClone(source.snapshot);left.menu.bia.price++;right.menu.lac.price+=2;right.k.value=left.k.value===2.6?2.7:2.6;
 const player=await playerContext(browser), scope={kind:'segment',id:'compare-'+player.playerId,playerIds:[player.playerId],priority:0,expiresAt:null,previousVersion:null,ticketId:null};
 const versions:string[]=[];
 for(const [i,snapshot] of [left,right].entries()) {
  const response=await page.request.post('/api/admin/proposals',{headers:{Origin:'http://127.0.0.1:4181','X-TBH-Admin-Context':account.context},data:{key:crypto.randomUUID(),baseVersion:source.baseVersion,snapshot,reason:'Comparison sibling '+i,...(i===0?{scope}:{})}});
  expect(response.status()).toBe(200);versions.push((await response.json()).version);
 }
 await page.getByRole('button',{name:'Đăng xuất'}).click();await login(page,'viewer');
 const mutations:string[]=[];page.on('request',r=>{if(r.method()==='POST')mutations.push(r.url());});
 const panel=page.getByRole('region',{name:'So sánh hai phiên bản'}), diff=panel.getByRole('region',{name:'Thay đổi thực tế'});
 await panel.getByLabel('Phiên bản trước').fill(versions[0]);await panel.getByLabel('Phiên bản sau').fill(versions[1]);await panel.getByRole('button',{name:'So sánh cấu hình'}).click();
 await expect(diff).toBeVisible();const disclosure=panel.getByText('Loại phạm vi: Nhóm',{exact:true});await disclosure.click();await expect(panel.getByText(scope.id,{exact:true})).toBeVisible();await disclosure.click();await expect(panel.getByText(scope.id,{exact:true})).not.toBeVisible();await expect(panel.locator('.admin-summary')).toContainText(versions[0]);await expect(panel.locator('.admin-summary')).toContainText(versions[1]);await expect(panel.locator('.admin-summary')).toContainText(scope.id);
 const row=diff.getByRole('row').filter({has:page.getByRole('rowheader',{name:'menu.bia.price',exact:true})}), cells=row.getByRole('cell');
 await expect(cells.nth(0).locator('pre')).toHaveText(String(left.menu.bia.price));await expect(cells.nth(1).locator('pre')).toHaveText(String(right.menu.bia.price));
 const baseRow=diff.getByRole('row').filter({has:page.getByRole('rowheader',{name:'shift.dailyEarnCapBase',exact:true})});
 await expect(baseRow.getByRole('cell').nth(0).locator('pre')).toHaveText(String(left.shift.dailyEarnCapBase));await expect(baseRow.getByRole('cell').nth(1).locator('pre')).toHaveText(String(right.shift.dailyEarnCapBase));
 const scaled=await page.evaluate(async pair=>{const modulePath='/src/admin-api.ts',{preview}=await import(modulePath);return pair.map(raw=>preview(raw,JSON.stringify(raw)).config.values.shift.dailyEarnCapBase);},[left,right]);
 await expect(baseRow.getByRole('cell').nth(0)).toContainText(String(scaled[0]));await expect(baseRow.getByRole('cell').nth(1)).toContainText(String(scaled[1]));expect(scaled[0]).not.toBe(scaled[1]);
 const reviewer=await browser.newContext({baseURL:'http://127.0.0.1:4181'}), reviewerPage=await reviewer.newPage();await login(reviewerPage);
 const reviewerAuth=await(await reviewer.request.get('/api/admin/auth')).json();
 const approved=await reviewer.request.post('/api/admin/approve',{headers:{Origin:'http://127.0.0.1:4181','X-TBH-Admin-Context':reviewerAuth.context},data:{version:versions[0]}});expect(approved.status()).toBe(200);
 await expect(panel.locator('.admin-summary').getByText(/^Bản nháp ·/)).toHaveCount(2);await page.getByRole('button',{name:'Làm mới',exact:true}).click();await expect(panel.locator('.admin-summary').getByText(/^Đã duyệt ·/)).toHaveCount(1);await reviewer.close();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await panel.screenshot({path:'.qa/admin-version-compare-vi-390.png'});
 await page.getByLabel('Ngôn ngữ').selectOption('en');await expect(page.getByRole('heading',{name:'Compare two versions'})).toBeVisible();await page.getByRole('region',{name:'Compare two versions'}).screenshot({path:'.qa/admin-version-compare-en-390.png'});await page.getByLabel('Language').selectOption('vi');
 await panel.getByLabel('Phiên bản trước').fill(versions[1]);await expect(diff).toHaveCount(0);await panel.getByLabel('Phiên bản sau').fill(versions[0]);await panel.getByRole('button',{name:'So sánh cấu hình'}).click();
 await expect(cells.nth(0).locator('pre')).toHaveText(String(right.menu.bia.price));await expect(cells.nth(1).locator('pre')).toHaveText(String(left.menu.bia.price));
 await panel.getByLabel('Phiên bản trước').fill(versions[0]);await panel.getByRole('button',{name:'So sánh cấu hình'}).click();await expect(diff).toContainText('Chưa có thay đổi.');await expect(diff.locator('tbody tr')).toHaveCount(0);
 await panel.getByLabel('Phiên bản sau').fill('missing-version');await panel.getByRole('button',{name:'So sánh cấu hình'}).click();await expect(page.getByRole('alert')).toBeVisible();await expect(diff).toHaveCount(0);
 expect(mutations).toEqual([]);await page.getByRole('button',{name:'Đăng xuất'}).click();await expect(panel).toHaveCount(0);await player.ctx.close();
});

test('comparison rejects a cookie identity switch during reads and preserves the original author draft',async({page,browser})=>{
 await login(page);await edit(page,'menu.bia.price','Preserve draft during comparison');const saved=await page.evaluate(()=>sessionStorage.getItem('tbh.admin.draft.v1'));
 const {latest}=await(await page.request.get('/api/admin/registry')).json();const panel=page.getByRole('region',{name:'So sánh hai phiên bản'});
 await panel.getByLabel('Phiên bản trước').fill(latest.version);await panel.getByLabel('Phiên bản sau').fill(latest.version);await panel.getByRole('button',{name:'So sánh cấu hình'}).click();await expect(panel.getByText('Chưa có thay đổi.')).toBeVisible();
 expect(await page.evaluate(()=>sessionStorage.getItem('tbh.admin.draft.v1'))).toBe(saved);
 const other=await browser.newContext({baseURL:'http://127.0.0.1:4181'}), viewer=await other.newPage();await login(viewer,'viewer');
 let release!:()=>void,count=0;const held=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/admin/config?version=*',async route=>{const response=await route.fetch();count++;await held;await route.fulfill({response});});
 try {
  await panel.getByRole('button',{name:'So sánh cấu hình'}).click();await expect.poll(()=>count).toBe(2);await expect(panel.getByRole('region',{name:'Thay đổi thực tế'})).toHaveCount(0);
  const cookie=(await other.cookies()).find(c=>c.name==='tbh-admin')!;await page.context().addCookies([cookie]);release();
  await expect(page.getByRole('alert')).toContainText('đổi tài khoản');await expect(panel).toHaveCount(0);expect(await page.evaluate(()=>sessionStorage.getItem('tbh.admin.draft.v1'))).toBe(saved);
 } finally {release();await page.unrouteAll({behavior:'wait'});await other.close();}
});
test('real registry edit, diff, publish confirmation, audit and pinned player saves; responsive keyboard UI',async({page,browser})=>{
 const calls:string[]=[];page.on('request',r=>calls.push(new URL(r.url()).pathname));await login(page);
 expect(calls.filter(p=>p.startsWith('/api/player')||p.startsWith('/api/auth/'))).toEqual([]);
 const player=await browser.newContext({baseURL:'http://127.0.0.1:4181',extraHTTPHeaders:{Origin:'http://127.0.0.1:4181'}});await player.request.post('/api/auth/session',{data:{}});const old=await (await player.request.get('/api/player/state')).json();
 await edit(page);await expect(page.getByRole('region',{name:'Thay đổi thực tế'})).toContainText('menu.bia.price');expect(await page.getByRole('region',{name:'Thay đổi thực tế'}).evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.screenshot({path:'.qa/admin-editor-mobile.png',fullPage:true});
 const v=await proposal(page);await expect(detail(page).getByText('Bản nháp',{exact:true})).toBeVisible();await detail(page).getByRole('button',{name:'Duyệt đề xuất'}).click();await expect(detail(page).getByText('Đã duyệt',{exact:true})).toBeVisible();await detail(page).getByRole('button',{name:'Xuất bản',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText(v);await expect(page.getByRole('button',{name:'Hủy',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();await expect(detail(page).getByRole('button',{name:'Xuất bản',exact:true})).toBeFocused();
 await detail(page).getByRole('button',{name:'Xuất bản',exact:true}).click();await page.getByRole('button',{name:'Xác nhận xuất bản',exact:true}).click();await expect(detail(page)).toContainText('Đã xuất bản');await expect(detail(page).getByText('Đang áp dụng',{exact:true})).toBeVisible();await expect(detail(page)).toContainText('Server cập nhật lúc');
 expect((await (await player.request.get('/api/player/state')).json()).configVersion).toBe(old.configVersion);
 const fresh=await browser.newContext({baseURL:'http://127.0.0.1:4181',extraHTTPHeaders:{Origin:'http://127.0.0.1:4181'}});await fresh.request.post('/api/auth/session',{data:{}});expect((await (await fresh.request.get('/api/player/state')).json()).configVersion).toBe(v);
 await page.getByRole('button',{name:'Đọc nhật ký'}).click();await expect(page.locator('.admin-audit')).toContainText('ConfigPublished');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(await page.locator('button:visible,input:visible,select:visible').evaluateAll(elements=>elements.every(el=>el.getBoundingClientRect().height>=44))).toBe(true);
 await page.getByLabel('Ngôn ngữ').selectOption('en');await expect(page.getByRole('heading',{name:'Stall administration'})).toBeVisible();await expect(page.getByRole('region',{name:'Version details'}).getByText('Active',{exact:true})).toBeVisible();await page.setViewportSize({width:1280,height:900});await page.screenshot({path:'.qa/admin-editor-desktop.png',fullPage:true});await player.close();await fresh.close();
});
test('lost proposal acknowledgement freezes the exact payload across reload and retries once',async({page})=>{
 await login(page);await edit(page,'menu.lac.price','Lost response replay');let first=true;
 await page.route('**/api/admin/proposals',async route=>{if(first){first=false;await route.fetch();await route.abort('failed');}else await route.continue();});
 await page.getByRole('button',{name:'Gửi đề xuất'}).click();await expect(page.getByRole('alert')).toContainText('Mất kết nối');await expect(page.getByLabel('Lý do thay đổi')).toBeDisabled();await page.reload();await expect(page.getByLabel('Lý do thay đổi')).toBeDisabled();
 await proposal(page);expect(await page.locator('.admin-proposals strong').filter({hasText:'Lost response replay'}).count()).toBe(1);expect(await page.evaluate(()=>sessionStorage.getItem('tbh.admin.draft.v1'))).toBe(null);
});
test('viewer is read-only and setup-disabled sign-in never loads GIS or creates a player',async({page})=>{
 await login(page,'viewer');await expect(page.getByText('Tài khoản này chỉ xem cấu hình.')).toBeVisible();await expect(page.getByRole('button',{name:'Chỉnh sửa bản mới nhất'})).toHaveCount(0);
 await page.getByRole('button',{name:'Đăng xuất'}).click();await page.route('**/api/admin/auth',r=>r.fulfill({json:{enabled:false,phase:'signedOut'}}));await page.goto('/admin');await expect(page.getByText(/Đăng nhập admin chưa được cấu hình/)).toBeVisible();await expect(page.getByRole('button',{name:'Tiếp tục với Google'})).toHaveCount(0);
});
test('Tier A requires another Super Admin with independent MFA and keeps scheduled activation',async({page,browser})=>{
 await login(page,'super-one');await edit(page,'k.value','Measured k adjustment');await page.getByRole('textbox',{name:'Giá trị JSON',exact:true}).fill('2.6');await page.getByRole('button',{name:'Áp dụng vào bản nháp'}).click();await page.getByRole('button',{name:'Xem diff',exact:true}).click();const v=await proposal(page);
 await expect(detail(page)).toContainText('Thay đổi cấp A');await expect(detail(page).getByRole('button',{name:'Duyệt đề xuất'})).toHaveCount(0);
 const other=await browser.newContext({baseURL:'http://127.0.0.1:4181'});const approver=await other.newPage();await login(approver,'super-two');await approver.getByLabel('Mã phiên bản',{exact:true}).fill(v);await approver.getByRole('button',{name:'Xem phiên bản',exact:true}).click();await detail(approver).getByRole('button',{name:'Duyệt đề xuất'}).click();await detail(approver).getByRole('button',{name:'Xuất bản',exact:true}).click();await approver.getByRole('button',{name:'Xác nhận xuất bản',exact:true}).click();await expect(detail(approver)).toContainText('Đã xuất bản');await expect(detail(approver)).toContainText('Từ ngày mới');await expect(detail(approver).getByText('Hẹn giờ',{exact:true})).toBeVisible();await expect(approver.locator('.admin-proposals').getByRole('button').filter({hasText:v})).toContainText('Hẹn giờ');const session=await (await approver.request.get('/api/admin/auth')).json();const d=await (await approver.request.get('/api/admin/config?version='+v)).json();expect(d.publication.effective_at).toBeGreaterThan(session.actor.issuedAt);await other.close();
});
test('account switch clears protected UI without applying the old tab draft as the new admin',async({page,browser})=>{
 await login(page);await edit(page,'menu.nem.price','Must not cross accounts');const other=await browser.newContext({baseURL:'http://127.0.0.1:4181'});const viewer=await other.newPage();await login(viewer,'viewer');const cookie=(await other.cookies()).find(c=>c.name==='tbh-admin')!;await page.context().addCookies([cookie]);
 await page.getByRole('button',{name:'Gửi đề xuất'}).click();await expect(page.getByRole('alert')).toContainText('đổi tài khoản');await expect(page.locator('.admin-proposals')).toHaveCount(0);expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('tbh.admin.draft.v1')!).owner)).toBe('economy');await other.close();
});
test('storage failure and invalid JSON block submission while export and recovery remain available',async({page})=>{
 await login(page);await edit(page,'menu.lac.price','Keep local edits');
 await page.getByRole('textbox',{name:'Giá trị JSON',exact:true}).fill('-1');await page.getByRole('button',{name:'Áp dụng vào bản nháp'}).click();await page.getByRole('button',{name:'Xem diff',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Cấu hình không hợp lệ');await expect(page.getByRole('button',{name:'Gửi đề xuất'})).toBeDisabled();
 await page.getByRole('textbox',{name:'Giá trị JSON',exact:true}).fill('20');await page.getByRole('button',{name:'Áp dụng vào bản nháp'}).click();await page.getByRole('button',{name:'Xem diff',exact:true}).click();await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='tbh.admin.draft.v1')throw new DOMException('quota','QuotaExceededError');return original.call(this,k,v);};});
 await page.getByLabel('Lý do thay đổi').fill('Storage unavailable');await expect(page.getByText(/Chưa lưu được bản nháp/)).toBeVisible();await expect(page.getByRole('button',{name:'Gửi đề xuất'})).toBeDisabled();
 const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Xuất JSON',exact:true}).click();expect((await dl).suggestedFilename()).toBe('tbh-config-draft.json');
});
test('stale base preserves text and refuses mutation after another admin publishes',async({page,browser})=>{
 await login(page);await edit(page,'menu.bia.price','Stale proposal retained');const own=await browser.newContext({baseURL:'http://127.0.0.1:4181'});const other=await own.newPage();await login(other);await edit(other,'menu.lac.price','Newer approved base');await other.getByRole('combobox',{name:'Thời điểm áp dụng',exact:true}).selectOption('next_day');await other.getByRole('button',{name:'Xem diff',exact:true}).click();await proposal(other);await detail(other).getByRole('button',{name:'Duyệt đề xuất'}).click();await detail(other).getByRole('button',{name:'Xuất bản',exact:true}).click();await other.getByRole('button',{name:'Xác nhận xuất bản',exact:true}).click();await expect(detail(other)).toContainText('Đã xuất bản');
 await page.getByRole('button',{name:'Gửi đề xuất'}).click();await expect(page.getByRole('alert')).toContainText('Bản nền đã cũ');await expect(page.getByLabel('Lý do thay đổi')).toHaveValue('Stale proposal retained');await expect(page.getByLabel('Lý do thay đổi')).toBeEnabled();await own.close();
});
test('expired authentication hides protected views and corrupted draft remains recoverable',async({page})=>{
 await login(page);await edit(page,'menu.nem.price','Retain after expiry');await page.request.get('/api/__test/advance?ms=28800001');await page.getByRole('button',{name:'Gửi đề xuất'}).click();await expect(page.getByRole('alert')).toContainText('hết hạn');await expect(page.locator('.admin-proposals')).toHaveCount(0);expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('tbh.admin.draft.v1')!).reason)).toBe('Retain after expiry');
 await page.evaluate(()=>sessionStorage.setItem('tbh.admin.draft.v1','{broken'));await login(page);await expect(page.getByText('Không đọc được bản nháp cũ. Tải bản sao trước khi xóa.')).toBeVisible();await expect(page.getByRole('button',{name:'Chỉnh sửa bản mới nhất'})).toBeDisabled();const download=page.waitForEvent('download');await page.getByRole('button',{name:'Tải bản nháp lưu trong tab'}).click();expect((await download).suggestedFilename()).toBe('admin-draft-recovery.json');
});
test('known proposal success stays resolved when the subsequent protected read fails',async({page})=>{
 await login(page);await edit(page,'menu.bia.price','Receipt is already durable');await page.route('**/api/admin/config?version=registry-*',r=>r.fulfill({status:401,json:{error:'admin:invalidSession'}}));
 await page.getByRole('button',{name:'Gửi đề xuất'}).click();await expect(page.getByRole('alert')).toContainText('hết hạn');expect(await page.evaluate(()=>sessionStorage.getItem('tbh.admin.draft.v1'))).toBe(null);
 const registry=await (await page.request.get('/api/admin/registry')).json();expect(registry.proposals.filter((p:any)=>p.reason==='Receipt is already durable')).toHaveLength(1);
});
test('imported JSON refreshes the selected value buffer instead of applying a stale value',async({page})=>{
 await login(page);await edit(page);const raw=await page.evaluate(()=>JSON.parse(JSON.parse(sessionStorage.getItem('tbh.admin.draft.v1')!).text));raw.menu.bia.price+=7;
 await page.locator('input[type=file]').setInputFiles({name:'config.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(raw))});await expect(page.getByRole('textbox',{name:'Giá trị JSON',exact:true})).toHaveValue(String(raw.menu.bia.price));
 await page.getByRole('button',{name:'Áp dụng vào bản nháp'}).click();expect(await page.evaluate(()=>JSON.parse(JSON.parse(sessionStorage.getItem('tbh.admin.draft.v1')!).text).menu.bia.price)).toBe(raw.menu.bia.price);
});

test('re-importing identical JSON discards an unapplied field edit without changing the saved value',async({page})=>{
 await login(page);await edit(page);const text=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('tbh.admin.draft.v1')!).text);const original=JSON.parse(text).menu.bia.price;
 await page.getByRole('textbox',{name:'Giá trị JSON',exact:true}).fill(String(original+9));await page.locator('input[type=file]').setInputFiles({name:'same-backup.json',mimeType:'application/json',buffer:Buffer.from(text)});await expect(page.getByRole('textbox',{name:'Giá trị JSON',exact:true})).toHaveValue(String(original));
 await page.getByRole('button',{name:'Áp dụng vào bản nháp'}).click();expect(await page.evaluate(()=>JSON.parse(JSON.parse(sessionStorage.getItem('tbh.admin.draft.v1')!).text).menu.bia.price)).toBe(original);
});

async function playerContext(browser:any) {
 const ctx=await browser.newContext({baseURL:'http://127.0.0.1:4181',extraHTTPHeaders:{Origin:'http://127.0.0.1:4181'}});
 const session=await ctx.request.post('/api/auth/session',{data:{}});expect(session.status()).toBe(201);const {playerId}=await session.json();const state=await(await ctx.request.get('/api/player/state')).json();return {ctx,state,playerId};
}
async function scopeFields(page:Page,id:string,kind='campaign') {
 await page.getByRole('combobox',{name:'Loại phạm vi',exact:true}).selectOption(kind);await page.getByLabel('Mã phạm vi / ID người chơi',{exact:true}).fill(kind==='player'?id:'browser-'+id);
 if(kind!=='player')await page.getByRole('textbox',{name:'ID người chơi — mỗi dòng một ID',exact:true}).fill(id);
 const actor=(await(await page.request.get('/api/admin/auth')).json()).actor;
 await page.getByLabel('Hết hạn — giờ Việt Nam (UTC+07:00)',{exact:true}).fill(new Date(actor.issuedAt+86400000+7*3600000).toISOString().slice(0,16));
}

test('scoped admin publication previews exact audience and opens only the selected server player under its resolved config',async({page,browser})=>{
 await page.request.get('/api/__test/advance?ms=86400000');await login(page,'super-one');const a=await playerContext(browser),b=await playerContext(browser);
 await edit(page,'menu.bia.price','Explicit campaign audience');await scopeFields(page,a.playerId);await page.getByRole('button',{name:'Xem diff',exact:true}).click();const v=await proposal(page);
 await expect(detail(page).getByRole('region',{name:'Phạm vi tác động thực tế'})).toContainText('1 / 1');await expect(detail(page)).toContainText(a.playerId);
 await detail(page).getByRole('button',{name:'Duyệt đề xuất'}).click();await detail(page).getByRole('button',{name:'Xuất bản',exact:true}).click();await expect(page.getByRole('dialog')).toContainText(a.playerId);
 await expect(page.getByRole('button',{name:'Hủy',exact:true})).toBeFocused();await page.screenshot({path:'.qa/admin-scopes-mobile.png',fullPage:false});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole('button',{name:'Xác nhận xuất bản',exact:true}).click();await expect(detail(page)).toContainText('Đã xuất bản');
 const connected=await(await a.ctx.request.post('/api/player/connect',{data:{}})).json();await a.ctx.request.post('/api/player/heartbeat',{data:{clientId:connected.clientId,beatSeq:1,active:true,paused:false}});
 const opening=await(await a.ctx.request.post('/api/player/command',{data:{idempotencyKey:'scope-opening',clientId:connected.clientId,clientSeq:1,command:{type:'startShift'}}})).json();expect(opening.result.ok).toBe(true);expect(opening.configVersion).toMatch(/^resolved-/);
 const published=await(await page.request.get('/api/admin/config?version='+v)).json();const actual=await(await a.ctx.request.get('/api/player/config?version='+opening.configVersion)).json();expect(actual.menu.bia.price).toBe(published.snapshot.menu.bia.price);
 expect((await(await b.ctx.request.get('/api/player/state')).json()).configVersion).toBe(b.state.configVersion);
 await page.setViewportSize({width:1280,height:900});await page.getByLabel('Ngôn ngữ').selectOption('en');await expect(page.getByRole('region',{name:'Version details',exact:true})).toContainText('Campaign');await page.screenshot({path:'.qa/admin-scopes-desktop.png',fullPage:true});await a.ctx.close();await b.ctx.close();
});

test('scope audience, expiry and priority freeze with the same request across lost acknowledgement and reload',async({page,browser})=>{
 await page.request.get('/api/__test/advance?ms=86400000');await login(page,'super-one');const a=await playerContext(browser);await edit(page,'menu.lac.price','Scope lost acknowledgement');await scopeFields(page,a.playerId);await page.getByLabel('Độ ưu tiên trong cùng loại phạm vi').fill('3');await page.getByRole('button',{name:'Xem diff',exact:true}).click();
 let first=true;await page.route('**/api/admin/proposals',async route=>{if(first){first=false;await route.fetch();await route.abort('failed');}else await route.continue();});await page.getByRole('button',{name:'Gửi đề xuất'}).click();await expect(page.getByRole('alert')).toContainText('Mất kết nối');
 const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('tbh.admin.draft.v1')!));await page.reload();await expect(page.getByRole('combobox',{name:'Loại phạm vi',exact:true})).toBeDisabled();await expect(page.getByLabel('Độ ưu tiên trong cùng loại phạm vi')).toHaveValue('3');await expect(page.getByRole('textbox',{name:'ID người chơi — mỗi dòng một ID',exact:true})).toHaveValue(a.playerId);
 const v=await proposal(page);const result=await(await page.request.get('/api/admin/config?version='+v)).json();expect(result.scope).toEqual(saved.scope);const registry=await(await page.request.get('/api/admin/registry')).json();expect(registry.proposals.filter((p:any)=>p.reason==='Scope lost acknowledgement')).toHaveLength(1);await a.ctx.close();
});

test('support operator records one ticket, then Super applies it to exactly one player and the consumed receipt remains visible',async({page,browser})=>{
 await page.request.get('/api/__test/advance?ms=86400000');await login(page,'support');const a=await playerContext(browser);await page.getByLabel('Mã yêu cầu',{exact:true}).fill('BROWSER-CASE-1');await page.getByLabel('ID người chơi cần hỗ trợ',{exact:true}).fill(a.playerId);await page.getByLabel('Nội dung yêu cầu',{exact:true}).fill('Temporary support configuration');await page.getByRole('button',{name:'Lưu yêu cầu hỗ trợ',exact:true}).click();await expect(page.locator('.admin-tickets')).toContainText('BROWSER-CASE-1');
 await page.getByRole('button',{name:'Lưu yêu cầu hỗ trợ',exact:true}).click();expect(await page.locator('.admin-tickets>li').count()).toBe(1);const ticket=await(await page.request.get('/api/admin/support')).json();const id=ticket.tickets.find((x:any)=>x.request_key==='BROWSER-CASE-1').id;
 const ctx=await browser.newContext({baseURL:'http://127.0.0.1:4181'}),admin=await ctx.newPage();await login(admin,'super-one');await edit(admin,'menu.nem.price','Ticketed player override');await scopeFields(admin,a.playerId,'player');await admin.getByLabel('Mã ticket hỗ trợ',{exact:true}).fill(id);await admin.getByRole('button',{name:'Xem diff',exact:true}).click();const v=await proposal(admin);await expect(detail(admin)).toContainText(id);await detail(admin).getByRole('button',{name:'Duyệt đề xuất'}).click();await detail(admin).getByRole('button',{name:'Xuất bản',exact:true}).click();await admin.getByRole('button',{name:'Xác nhận xuất bản',exact:true}).click();await expect(detail(admin)).toContainText('Đã xuất bản');
 await page.getByRole('button',{name:'Đọc ticket đã lưu'}).click();await expect(page.locator('.admin-tickets')).toContainText(v);await expect(page.locator('.admin-tickets')).toContainText('Đã dùng');await ctx.close();await a.ctx.close();
});

test('loading a published scope preserves its audience and permits an explicit empty withdrawal',async({page,browser})=>{
 await page.request.get('/api/__test/advance?ms=86400000');await login(page,'super-one');const a=await playerContext(browser);
 await edit(page,'menu.lac.price','Withdrawable group');await scopeFields(page,a.playerId,'segment');await page.getByRole('button',{name:'Xem diff',exact:true}).click();const old=await proposal(page);
 await detail(page).getByRole('button',{name:'Duyệt đề xuất'}).click();await detail(page).getByRole('button',{name:'Xuất bản',exact:true}).click();await page.getByRole('button',{name:'Xác nhận xuất bản',exact:true}).click();await expect(detail(page)).toContainText('Đã xuất bản');
 await edit(page,'menu.nem.price','New default outside the scoped patch');await proposal(page);await detail(page).getByRole('button',{name:'Duyệt đề xuất'}).click();await detail(page).getByRole('button',{name:'Xuất bản',exact:true}).click();await page.getByRole('button',{name:'Xác nhận xuất bản',exact:true}).click();await expect(detail(page)).toContainText('Đã xuất bản');
 await page.getByLabel('Mã phiên bản',{exact:true}).fill(old);await page.getByRole('button',{name:'Xem phiên bản',exact:true}).click();await expect(detail(page)).toContainText('Withdrawable group');
 await detail(page).getByRole('button',{name:'Dùng làm bản hoàn nguyên',exact:true}).click();
 await expect(page.getByRole('combobox',{name:'Loại phạm vi',exact:true})).toHaveValue('segment');await expect(page.getByRole('textbox',{name:'ID người chơi — mỗi dòng một ID',exact:true})).toHaveValue(a.playerId);
 await page.getByRole('button',{name:'Rút các khóa ghi đè',exact:true}).click();await page.getByLabel('Lý do thay đổi').fill('Withdraw this group only');await page.getByRole('button',{name:'Xem diff',exact:true}).click();const version=await proposal(page);
 await expect(detail(page).getByRole('region',{name:'Thay đổi thực tế'})).not.toContainText('menu.nem.price');
 const proposed=await(await page.request.get('/api/admin/config?version='+version)).json();expect(proposed.scope.previousVersion).toBe(old);expect(proposed.previous.snapshot.menu.nem.price).toBe(proposed.previous.base.menu.nem.price);expect(JSON.parse(proposed.draft.keys)).toEqual([]);
 await expect(detail(page).getByRole('region',{name:'Phạm vi tác động thực tế'})).toContainText('1 / 1');await detail(page).getByRole('button',{name:'Duyệt đề xuất'}).click();await detail(page).getByRole('button',{name:'Xuất bản',exact:true}).click();await page.getByRole('button',{name:'Xác nhận xuất bản',exact:true}).click();await expect(detail(page)).toContainText('Đã xuất bản');await a.ctx.close();
});


for(const boundary of ['logout','expiry'])test('support buffers clear at the '+boundary+' identity boundary without reloading the page',async({page})=>{
 await page.request.get('/api/__test/advance?ms=86400000');await login(page,'support');await page.getByLabel('Mã yêu cầu',{exact:true}).fill('PRIVATE-CASE');await page.getByLabel('ID người chơi cần hỗ trợ',{exact:true}).fill('private-player');await page.getByLabel('Nội dung yêu cầu',{exact:true}).fill('Private support reason');
 if(boundary==='logout')await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();
 else {await page.request.get('/api/__test/advance?ms=28800001');await page.getByRole('button',{name:'Làm mới',exact:true}).click();await expect(page.getByRole('alert')).toContainText('hết hạn');}
 await login(page,'support',false);for(const label of ['Mã yêu cầu','ID người chơi cần hỗ trợ','Nội dung yêu cầu'])await expect(page.getByLabel(label,{exact:true})).toHaveValue('');
});

test('stale publication impact closes confirmation and requires inspection of the newly masked audience',async({page,browser})=>{
 await page.request.get('/api/__test/advance?ms=86400000');await login(page,'super-one');const a=await playerContext(browser);await edit(page,'menu.lac.price','Original inspected scope');await scopeFields(page,a.playerId,'segment');await page.getByRole('button',{name:'Xem diff',exact:true}).click();const v=await proposal(page);await detail(page).getByRole('button',{name:'Duyệt đề xuất'}).click();await detail(page).getByRole('button',{name:'Xuất bản',exact:true}).click();
 const {context}=await(await page.request.get('/api/admin/auth')).json(),source=await(await page.request.get('/api/admin/draft-source')).json(),original=await(await page.request.get('/api/admin/config?version='+v)).json();source.snapshot.menu.lac.price+=2;
 const post=async(path:string,data:unknown)=>{const res=await page.request.post('/api/admin/'+path,{data,headers:{'X-TBH-Admin-Context':context,Origin:'http://127.0.0.1:4181'}});expect(res.status()).toBe(200);return res.json();};
 const mask=await post('proposals',{key:'mask-original',baseVersion:source.baseVersion,snapshot:source.snapshot,reason:'Later overlapping scope',scope:{...original.scope,id:'other-'+a.playerId,priority:1}});await post('approve',mask);const impact=await post('impact',mask);await post('publish',{...mask,impactToken:impact.token});
 await page.getByRole('button',{name:'Xác nhận xuất bản',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();await expect(page.getByRole('alert')).toContainText('Phạm vi tác động đã thay đổi');await expect(detail(page).getByRole('region',{name:'Phạm vi tác động thực tế'})).toContainText('0 / 1');
 await detail(page).getByRole('button',{name:'Xuất bản',exact:true}).click();await page.getByRole('button',{name:'Xác nhận xuất bản',exact:true}).click();await expect(detail(page)).toContainText('Đã xuất bản');await a.ctx.close();
});

test('seven-day forecast renders real protected worker totals in Vietnamese and English without playing the source save',async({page,browser})=>{
 test.setTimeout(240000);await page.request.get('/api/__test/advance?ms=30000');await login(page,'super-one');const player=await playerContext(browser);
 await edit(page,'menu.bia.price','Seven-day browser forecast');await scopeFields(page,player.playerId);await page.getByRole('button',{name:'Xem diff',exact:true}).click();await proposal(page);
 const panel=page.getByRole('region',{name:'Dự báo kinh tế 7 ngày'});
 const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/forecast',{timeout:210000});
 await panel.getByRole('button',{name:'Chạy dự báo'}).click();await expect(panel.getByRole('status')).toContainText('Đang mô phỏng');
 // Main request loop is available while the worker simulates.
 expect((await player.ctx.request.get('/api/player/state')).status()).toBe(200);
 const received=await response;expect(received.status()).toBe(200);const report=await received.json();expect(report.audiencePlayers).toBe(1);expect(report.totals.candidate.faucet).toBeGreaterThan(0);
 await expect(panel).toContainText('Đã mô phỏng toàn bộ');await expect(panel).toContainText('chưa có dữ liệu donate');await expect(panel.getByRole('table')).toBeVisible();
 await panel.getByText('Chi tiết theo ngày',{exact:true}).click();expect(await panel.getByRole('row').count()).toBeGreaterThan(10);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'.qa/forecast-admin-mobile.png',fullPage:true});await panel.screenshot({path:'.qa/forecast-admin-panel.png'});
 await page.getByLabel('Ngôn ngữ').selectOption('en');await expect(page.getByRole('region',{name:'Seven-day economy scenario'})).toContainText('VND revenue unavailable');
 const state=await(await player.ctx.request.get('/api/player/state')).json();expect(state.world.completedShifts).toBe(0);expect(state.world.coins).toBe(player.state.world.coins);
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('region',{name:'Seven-day economy scenario'})).toHaveCount(0);await player.ctx.close();
});

test('emergency mobile confirmation names replaced schedules, recovers a lost publish receipt and records post-review in VI/EN',async({page,browser})=>{
 await login(page,'super-emergency');
 const context=(await(await page.request.get('/api/admin/auth')).json()).context, headers={Origin:'http://127.0.0.1:4181','X-TBH-Admin-Context':context};
 const source=await(await page.request.get('/api/admin/draft-source')).json();source.snapshot.shift.dailyEarnCapBase++;
 const pending=await page.request.post('/api/admin/proposals',{headers,data:{key:crypto.randomUUID(),baseVersion:source.baseVersion,snapshot:source.snapshot,reason:'Pending emergency browser schedule'}});expect(pending.status()).toBe(200);const scheduled=(await pending.json()).version;
 const other=await browser.newContext({baseURL:'http://127.0.0.1:4181'}),reviewPage=await other.newPage();await login(reviewPage,'super-postreview');
 const reviewContext=(await(await other.request.get('/api/admin/auth')).json()).context,reviewHeaders={Origin:'http://127.0.0.1:4181','X-TBH-Admin-Context':reviewContext};
 expect((await other.request.post('/api/admin/approve',{headers:reviewHeaders,data:{version:scheduled}})).status()).toBe(200);
 const scheduledReceipt=await page.request.post('/api/admin/publish',{headers,data:{version:scheduled}});expect(scheduledReceipt.status()).toBe(200);
 await page.getByRole('button',{name:'Tạo hotfix khẩn cấp'}).click();
 await expect(page.getByRole('combobox',{name:/^Thời điểm áp dụng/})).toBeDisabled();
 await page.getByLabel('Tìm khóa cấu hình').fill('menu.bia.price');await page.getByRole('combobox',{name:'Khóa cấu hình',exact:true}).selectOption('menu.bia.price');
 const value=page.getByRole('textbox',{name:'Giá trị JSON',exact:true});await value.fill(String(Number(await value.inputValue())+1));await page.getByRole('button',{name:'Áp dụng vào bản nháp'}).click();await page.getByLabel('Lý do thay đổi').fill('Emergency browser correction');await page.getByRole('button',{name:'Xem diff',exact:true}).click();
 expect(JSON.parse((await page.evaluate(()=>sessionStorage.getItem('tbh.admin.draft.v1')))! )).toHaveProperty('emergency',true);
 const version=await proposal(page);await expect(detail(page).getByRole('button',{name:'Duyệt đề xuất'})).toHaveCount(0);
 await detail(page).getByRole('button',{name:'Xuất bản',exact:true}).click();const dialog=page.getByRole('dialog');
 await expect(dialog).toContainText(scheduled);await expect(dialog).toContainText('shift.dailyEarnCapBase');await expect(dialog).toContainText('super-emergency');await expect(dialog).toContainText('super-postreview');
 await expect(dialog.getByRole('heading',{name:'Lịch chờ sẽ bị thay'})).toBeVisible();
 expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await dialog.screenshot({path:'.qa/admin-emergency-confirm-390.png'});
 let lost=true;await page.route('**/api/admin/publish',async route=>{if(lost){lost=false;const r=await route.fetch();expect(r.status()).toBe(200);await route.abort();}else await route.continue();});
 await dialog.getByRole('button',{name:'Xác nhận xuất bản',exact:true}).click();await expect(dialog.getByRole('alert')).toBeVisible();await dialog.getByRole('button',{name:'Xác nhận xuất bản',exact:true}).click();await expect(dialog).not.toBeVisible();
 await expect(detail(page)).toContainText('Phiếu hậu kiểm');await expect(detail(page).getByText('Đang áp dụng',{exact:true})).toBeVisible();
 await page.getByLabel('Mã phiên bản',{exact:true}).fill(scheduled);await page.getByRole('button',{name:'Xem phiên bản',exact:true}).click();await expect(detail(page)).toContainText('Đã bị thay bởi hotfix');await expect(detail(page)).toContainText(version);
 await reviewPage.getByLabel('Mã phiên bản',{exact:true}).fill(version);await reviewPage.getByRole('button',{name:'Xem phiên bản',exact:true}).click();await reviewPage.getByLabel('Kết luận hậu kiểm').fill('Checked schedules and live shift pins');await reviewPage.getByRole('button',{name:'Ghi nhận hậu kiểm'}).click();await expect(detail(reviewPage)).toContainText('Đã hậu kiểm bởi');
 await reviewPage.getByLabel('Ngôn ngữ').selectOption('en');await expect(reviewPage.getByRole('region',{name:'Version details'})).toContainText('Reviewed by super-postreview');await other.close();
});

test('M2-ONBOARDING local editor publishes thresholds and guide steps; disabled mode hides a retained guide in VI/EN', async ({ page, browser }) => {
 test.setTimeout(120000);
 await login(page, 'super-one');
 const source = await (await page.request.get('/api/admin/draft-source')).json();
 const onboarding = structuredClone(source.snapshot.onboarding);
 onboarding.firstShift.guaranteedFirstGroupWithinMs += 1000;
 onboarding.lostStreakToGuide += 1;
 onboarding.stepGuide.steps[0].copyKey = 'onboarding.step.wait_ready';
 const changes: Record<string, unknown> = {
  'onboarding.enabled': true,
  'onboarding.firstShift.guaranteedFirstGroupWithinMs': onboarding.firstShift.guaranteedFirstGroupWithinMs,
  'onboarding.lostStreakToGuide': onboarding.lostStreakToGuide,
  'onboarding.stepGuide.steps': onboarding.stepGuide.steps,
 };
 const publish = async (values: Record<string, unknown>) => {
  await page.getByRole('button', { name: 'Chỉnh sửa bản mới nhất' }).click();
  await page.getByLabel('Tìm khóa cấu hình').fill('onboarding.');
  const paths = await page.getByRole('combobox', { name: 'Khóa cấu hình', exact: true }).locator('option').evaluateAll(options => options.map(o => (o as HTMLOptionElement).value));
  for (const key of ['enabled', 'lostStreakToGuide', 'stepGuide.steps', 'stepGuide.maxAutoRepeatsPerDay', 'firstShift.guaranteedFirstGroupWithinMs', 'featureReveal.questsAfterShifts', 'loginPrompt.cooldownShifts']) expect(paths).toContain('onboarding.' + key);
  for (const [path, value] of Object.entries(values)) {
   await page.getByRole('combobox', { name: 'Khóa cấu hình', exact: true }).selectOption(path);
   await page.getByRole('textbox', { name: 'Giá trị JSON', exact: true }).fill(JSON.stringify(value));
   await page.getByRole('button', { name: 'Áp dụng vào bản nháp' }).click();
  }
  await page.getByLabel('Lý do thay đổi').fill('M2 local onboarding acceptance');
  await page.getByRole('button', { name: 'Xem diff', exact: true }).click();
  const version = await proposal(page);
  await detail(page).getByRole('button', { name: 'Duyệt đề xuất' }).click();
  await detail(page).getByRole('button', { name: 'Xuất bản', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận xuất bản', exact: true }).click();
  await expect(detail(page)).toContainText('Đã xuất bản');
  return version;
 };
 const old = await playerContext(browser);
 const oldVersion = (await (await old.ctx.request.get('/api/player/state')).json()).configVersion;
 const onVersion = await publish(changes);
 expect((await (await old.ctx.request.get('/api/player/state')).json()).configVersion).toBe(oldVersion);
 await old.ctx.close();
 const inspect = async (locale: string, enabled: boolean, version: string) => {
  const ctx = await browser.newContext({ baseURL: 'http://127.0.0.1:4181', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  // Persisted in-progress guide reproduces turning off onboarding on a previously used device.
  await ctx.addInitScript(locale => localStorage.setItem('tbh.settings.v1', JSON.stringify({ locale, localeAccepted: true, welcomed: true, muted: true, guideDone: false, guideIndex: 0 })), locale);
  const game = await ctx.newPage(), errors: string[] = []; game.on('pageerror', e => errors.push(e.message));
  await game.goto('/'); await game.getByRole('button', { name: locale === 'vi' ? 'Chơi không đăng nhập' : 'Play without signing in', exact: true }).click(); await expect(game.locator('.network-status')).toContainText(locale === 'vi' ? 'Đã đồng bộ' : 'Synced');
  const state = async () => (await game.request.get('/api/player/state')).json();
  expect((await state()).configVersion).toBe(version);
  const config = await (await game.request.get('/api/player/config?version=' + version)).json();
  expect(config.onboarding).toMatchObject({ enabled, lostStreakToGuide: onboarding.lostStreakToGuide, stepGuide: { steps: onboarding.stepGuide.steps } });
  await game.getByRole('button', { name: locale === 'vi' ? 'Mở ca' : 'Open shift', exact: true }).first().click();
  await expect.poll(async () => (await state()).world.phase).toBe('open');
  const world = (await state()).world; expect(world.shift.onboarding).toBe(enabled);
  if (enabled) {
   await expect(game.locator('.guide')).toContainText(locale === 'vi' ? 'Đợi' : 'Wait');
   expect(world.shift.nextSpawnAt - world.shift.startedAt).toBe(onboarding.firstShift.guaranteedFirstGroupWithinMs - config.runtime.tableSeatingMs);
  } else {
   await expect(game.locator('.guide')).toHaveCount(0);
   expect(world.shift.nextSpawnAt - world.shift.startedAt).toBe(Math.round(config.spawn.baseMs * config.spawn.warmupMult));
  }
  expect(await game.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await game.screenshot({ path: `.qa/v03-onboarding-${locale}-${enabled ? 'on' : 'off'}.png` });
  expect(errors).toEqual([]); await ctx.close();
 };
 for (const locale of ['vi', 'en']) await inspect(locale, true, onVersion);
 const offVersion = await publish({ 'onboarding.enabled': false });
 for (const locale of ['vi', 'en']) await inspect(locale, false, offVersion);
});

// S6 (plan S6 row "Admin sửa được từng key mới", brief B6, PR #14 k-admission): every key the seat-model slices S1-S5 added to the seed is a key of its own in
// the editor, each edit proposes with EXACTLY its own diff row (an Economy Admin's draft; a Tier A key says it needs a second Super), and the two publication
// paths run end to end on one key each: a Tier A key (spawn.capacityDemand.refTables) through a second Super, scheduled for the next day, and a Tier B key
// (runtime.queueBaseSlots) by the Economy Admin at once, both admitted by the measured k and pinned by the next new player. The admission of every one of
// the keys is pinned server-side by apps/server/test/registry.test.ts "S6: every seat-model key S1-S5 added is governed ..." (the daily publication limit per
// author is five, so the browser publishes two and proposes the rest). Written on Windows, where the admin tier cannot run: validated on the Linux run.
test('S6 seat-model keys S1-S5 are editable one by one: each proposes with exactly its own diff row, a Tier A key publishes through a second Super and a Tier B key at once, both reach a new player', async ({ page, browser }) => {
 test.setTimeout(300000);
 await login(page); // economy: proposes every key; approves and publishes Tier B alone
 const s = (await (await page.request.get('/api/admin/draft-source')).json()).snapshot;
 const bump = <T,>(rows: T[], edit: (row: T) => T) => rows.map((row, i) => i === 0 ? edit(structuredClone(row)) : row);
 const keys: { path: string; tier: 'A' | 'B'; value: unknown }[] = [
  { path: 'spawn.pPair', tier: 'A', value: Math.round((s.spawn.pPair - 0.05) * 100) / 100 },
  { path: 'spawn.capacityDemand.maxMult', tier: 'A', value: s.spawn.capacityDemand.maxMult - 1 },
  { path: 'locations.list', tier: 'A', value: bump(s.locations.list as { tableSlots: number }[], row => ({ ...row, tableSlots: row.tableSlots - 1 })) },
  { path: 'upgrades.table.tablePriceBase', tier: 'A', value: bump(s.upgrades.table.tablePriceBase as number[], n => n + 1) },
  { path: 'upgrades.table.chairPriceBase', tier: 'A', value: bump(s.upgrades.table.chairPriceBase as number[], n => n + 1) },
  { path: 'upgrades.table.chairsAfterTables', tier: 'A', value: s.upgrades.table.chairsAfterTables - 1 },
  { path: 'upgrades.table.orderShape.solo.pBeer', tier: 'A', value: 0.65 },
  { path: 'upgrades.table.orderShape.pair.pMoi', tier: 'A', value: 0.8 },
  { path: 'upgrades.table.tableUpgrade.levels', tier: 'A', value: bump(s.upgrades.table.tableUpgrade.levels as { priceBase: number }[], row => ({ ...row, priceBase: row.priceBase + 100 })) },
  { path: 'upgrades.table.chairUpgrade.priceBase', tier: 'A', value: s.upgrades.table.chairUpgrade.priceBase + 100 },
  { path: 'upgrades.table.chairUpgrade.stepBase', tier: 'A', value: s.upgrades.table.chairUpgrade.stepBase + 100 },
  { path: 'upgrades.table.chairUpgrade.levels', tier: 'A', value: bump(s.upgrades.table.chairUpgrade.levels as { patienceMult: number }[], row => ({ ...row, patienceMult: 1.2 })) },
  { path: 'shift.noCooldownFirstShifts', tier: 'A', value: s.shift.noCooldownFirstShifts + 1 },
  { path: 'runtime.queueSeatsPerSlot', tier: 'B', value: s.runtime.queueSeatsPerSlot - 2 },
  { path: 'patience.thuongMs', tier: 'B', value: s.patience.thuongMs + 1000 },
 ];
 const published = { A: { path: 'spawn.capacityDemand.refTables', value: s.spawn.capacityDemand.refTables + 1 }, B: { path: 'runtime.queueBaseSlots', value: s.runtime.queueBaseSlots + 1 } };
 // The page shows a "Thay đổi thực tế" region twice once a version detail is open (the draft's diff AND the diff of the shown version), and every
 // draft control lives in the draft panel (the section headed "Bản nháp của bạn"): scope every lookup to that panel, never to the page.
 const draftPanel = page.locator('section.admin-panel').filter({ has: page.getByRole('heading', { name: 'Bản nháp của bạn', level: 2 }) });
 const diff = draftPanel.getByRole('region', { name: 'Thay đổi thực tế' });
 const editJson = async (path: string, value: unknown) => {
  await page.getByRole('button', { name: 'Chỉnh sửa bản mới nhất' }).click(); await expect(draftPanel).toHaveCount(1);
  await draftPanel.getByLabel('Tìm khóa cấu hình').fill(path);
  const box = draftPanel.getByRole('combobox', { name: 'Khóa cấu hình', exact: true });
  expect(await box.locator('option').evaluateAll(options => options.map(o => (o as HTMLOptionElement).value)), path).toContain(path);
  await box.selectOption(path);
  await draftPanel.getByRole('textbox', { name: 'Giá trị JSON', exact: true }).fill(JSON.stringify(value));
  await draftPanel.getByRole('button', { name: 'Áp dụng vào bản nháp' }).click();
  await draftPanel.getByLabel('Lý do thay đổi').fill('S6 seat-model key ' + path);
  await draftPanel.getByRole('button', { name: 'Xem diff', exact: true }).click();
  await expect(diff).toBeVisible();
  const rows = diff.locator('tbody tr'); await expect(rows).toHaveCount(1); await expect(rows.getByRole('rowheader')).toHaveText(path); // exactly this key moved, nothing else
  expect(JSON.parse((await rows.locator('td').nth(1).locator('pre').textContent())!), path).toEqual(value); // the "after" cell holds the value as applied
 };
 // 1) One draft per key, from the same base: every key is listed by its own path, applies as JSON, diffs as one row, and proposes.
 for (const key of keys) {
  await editJson(key.path, key.value); await proposal(page);
  if (key.tier === 'A') { await expect(detail(page)).toContainText('Thay đổi cấp A'); await expect(detail(page).getByRole('button', { name: 'Duyệt đề xuất' })).toHaveCount(0); }
  else await expect(detail(page).getByRole('button', { name: 'Duyệt đề xuất' })).toBeVisible();
 }
 expect(await page.locator('.admin-proposals strong').filter({ hasText: 'S6 seat-model key' }).count()).toBe(keys.length);
 // 2) Tier B end to end, AT ONCE and FIRST: the Economy Admin proposes on the active base, approves and publishes alone (next_shift = now); a guest already playing
 // keeps its pin, the next new player opens on it. It must come before the Tier A key: a publication may never activate before the latest one does
 // (registry.ts publicationAt: `registry:scheduleConflict`), and a Tier A key is scheduled for the next Vietnam midnight.
 const old = await playerContext(browser); const oldVersion = (await (await old.ctx.request.get('/api/player/state')).json()).configVersion;
 await editJson(published.B.path, published.B.value); const versionB = await proposal(page);
 await detail(page).getByRole('button', { name: 'Duyệt đề xuất' }).click(); await detail(page).getByRole('button', { name: 'Xuất bản', exact: true }).click();
 await page.getByRole('button', { name: 'Xác nhận xuất bản', exact: true }).click(); await expect(detail(page)).toContainText('Đã xuất bản');
 const detailB = await (await page.request.get('/api/admin/config?version=' + versionB)).json();
 expect(detailB.measurement.state).toBe('admitted'); expect(detailB.publication.effective_at).toBeLessThanOrEqual(detailB.publication.published_at); // admitted by the measured k, effective at once
 expect((await (await old.ctx.request.get('/api/player/state')).json()).configVersion).toBe(oldVersion); // a player already playing keeps his pin
 const atOnce = await playerContext(browser); expect(atOnce.state.configVersion).toBe(versionB);
 expect((await (await atOnce.ctx.request.get('/api/player/config?version=' + versionB)).json()).runtime.queueBaseSlots).toBe(published.B.value);
 await old.ctx.close(); await atOnce.ctx.close();
 // 3) Tier A end to end, SCHEDULED: the Economy Admin proposes on the Tier B version (the latest admitted one is the draft's base), a Super (another person)
 // approves and publishes; the registry schedules it for the next Vietnam midnight and admits it by the measured k.
 await editJson(published.A.path, published.A.value); const versionA = await proposal(page);
 await expect(detail(page)).toContainText('Thay đổi cấp A');
 const other = await browser.newContext({ baseURL: 'http://127.0.0.1:4181' }), approver = await other.newPage(); await login(approver, 'super-one');
 await approver.getByLabel('Mã phiên bản', { exact: true }).fill(versionA); await approver.getByRole('button', { name: 'Xem phiên bản', exact: true }).click();
 await detail(approver).getByRole('button', { name: 'Duyệt đề xuất' }).click(); await detail(approver).getByRole('button', { name: 'Xuất bản', exact: true }).click();
 await approver.getByRole('button', { name: 'Xác nhận xuất bản', exact: true }).click();
 await expect(detail(approver)).toContainText('Đã xuất bản'); await expect(detail(approver)).toContainText('Từ ngày mới'); await expect(detail(approver).getByText('Hẹn giờ', { exact: true })).toBeVisible();
 const session = await (await approver.request.get('/api/admin/auth')).json(), detailA = await (await approver.request.get('/api/admin/config?version=' + versionA)).json();
 expect(detailA.publication.effective_at).toBeGreaterThan(session.actor.issuedAt); expect(detailA.measurement.state).toBe('admitted');
 expect(detailA.snapshot.spawn.capacityDemand.refTables).toBe(published.A.value); expect(detailA.snapshot.runtime.queueBaseSlots).toBe(published.B.value); // built on the Tier B version: both keys
 await other.close();
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 // 4) Both reach a new player: the isolated server clock (apps/web/admin-test/server.ts `/__test/advance`, the offset every `now()` reads) is moved one
 // minute past the Tier A activation. Admin sessions (8 h) expire with that move, so nothing below talks to the admin API; a new guest opens on the
 // Tier A version, whose config carries the Tier A key and the Tier B key it was built on.
 await page.request.get('/api/__test/advance?ms=' + (detailA.publication.effective_at - detailA.publication.published_at + 60000));
 const fresh = await playerContext(browser); expect(fresh.state.configVersion).toBe(versionA);
 const config = await (await fresh.ctx.request.get('/api/player/config?version=' + versionA)).json();
 expect(config.spawn.capacityDemand.refTables).toBe(published.A.value); expect(config.runtime.queueBaseSlots).toBe(published.B.value);
 await fresh.ctx.close();
});
