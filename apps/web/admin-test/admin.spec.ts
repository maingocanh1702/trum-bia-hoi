import { test,expect,type Page } from '@playwright/test';
async function gis(page:Page,subject='economy') {
 await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:`window.google={accounts:{id:{initialize(o){this.options=o},renderButton(el){const b=document.createElement('button');b.textContent='Test Google';b.onclick=async()=>{const r=await fetch('/api/__test/sign?subject=${subject}&nonce='+this.options.nonce);this.options.callback(await r.json())};el.append(b)},disableAutoSelect(){},cancel(){}}}};`}));
}
async function login(page:Page,subject='economy'){
 await gis(page,subject);await page.goto('/admin');await page.getByRole('button',{name:'Tiếp tục với Google'}).click();await page.getByRole('button',{name:'Test Google'}).click();
 if(subject.startsWith('super')){await expect(page.getByLabel('Mã xác thực 6 số')).toBeVisible();const code=(await (await page.request.get('/api/__test/otp?subject='+subject)).json()).code;await page.getByLabel('Mã xác thực 6 số').fill(code);await page.getByRole('button',{name:'Xác thực',exact:true}).click();}
 await expect(page.getByRole('button',{name:'Đăng xuất'})).toBeVisible();await expect(page.getByRole('button',{name:'Làm mới',exact:true})).toBeEnabled();
}
async function edit(page:Page,path='menu.bia.price',reason='Browser measured adjustment'){
 await page.getByRole('button',{name:'Chỉnh sửa bản mới nhất'}).click();await page.getByLabel('Tìm khóa cấu hình').fill(path);await page.getByRole('combobox',{name:'Khóa cấu hình',exact:true}).selectOption(path);
 const input=page.getByRole('textbox',{name:'Giá trị JSON',exact:true});await input.fill(String(Number(await input.inputValue())+1));await page.getByRole('button',{name:'Áp dụng vào bản nháp'}).click();await page.getByLabel('Lý do thay đổi').fill(reason);await page.getByRole('button',{name:'Xem diff',exact:true}).click();
}
async function proposal(page:Page){await page.getByRole('button',{name:'Gửi đề xuất'}).click();await expect(page.getByRole('heading',{name:'Chi tiết phiên bản'})).toBeVisible();return await page.getByLabel('Mã phiên bản',{exact:true}).inputValue();}
const detail=(page:Page)=>page.getByRole('region',{name:'Chi tiết phiên bản'});
test('real registry edit, diff, publish confirmation, audit and pinned player saves; responsive keyboard UI',async({page,browser})=>{
 const calls:string[]=[];page.on('request',r=>calls.push(new URL(r.url()).pathname));await login(page);
 expect(calls.filter(p=>p.startsWith('/api/player')||p.startsWith('/api/auth/'))).toEqual([]);
 const player=await browser.newContext({baseURL:'http://127.0.0.1:4181',extraHTTPHeaders:{Origin:'http://127.0.0.1:4181'}});await player.request.post('/api/auth/session',{data:{}});const old=await (await player.request.get('/api/player/state')).json();
 await edit(page);await expect(page.getByRole('region',{name:'Thay đổi thực tế'})).toContainText('menu.bia.price');expect(await page.getByRole('region',{name:'Thay đổi thực tế'}).evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.screenshot({path:'.qa/admin-editor-mobile.png',fullPage:true});
 const v=await proposal(page);await detail(page).getByRole('button',{name:'Duyệt đề xuất'}).click();await detail(page).getByRole('button',{name:'Xuất bản',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText(v);await expect(page.getByRole('button',{name:'Hủy',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();await expect(detail(page).getByRole('button',{name:'Xuất bản',exact:true})).toBeFocused();
 await detail(page).getByRole('button',{name:'Xuất bản',exact:true}).click();await page.getByRole('button',{name:'Xác nhận xuất bản',exact:true}).click();await expect(detail(page)).toContainText('Đã xuất bản');
 expect((await (await player.request.get('/api/player/state')).json()).configVersion).toBe(old.configVersion);
 const fresh=await browser.newContext({baseURL:'http://127.0.0.1:4181',extraHTTPHeaders:{Origin:'http://127.0.0.1:4181'}});await fresh.request.post('/api/auth/session',{data:{}});expect((await (await fresh.request.get('/api/player/state')).json()).configVersion).toBe(v);
 await page.getByRole('button',{name:'Đọc nhật ký'}).click();await expect(page.locator('.admin-audit')).toContainText('ConfigPublished');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(await page.locator('button:visible,input:visible,select:visible').evaluateAll(elements=>elements.every(el=>el.getBoundingClientRect().height>=44))).toBe(true);
 await page.getByLabel('Ngôn ngữ').selectOption('en');await expect(page.getByRole('heading',{name:'Stall administration'})).toBeVisible();await page.setViewportSize({width:1280,height:900});await page.screenshot({path:'.qa/admin-editor-desktop.png',fullPage:true});await player.close();await fresh.close();
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
 const other=await browser.newContext({baseURL:'http://127.0.0.1:4181'});const approver=await other.newPage();await login(approver,'super-two');await approver.getByLabel('Mã phiên bản',{exact:true}).fill(v);await approver.getByRole('button',{name:'Xem phiên bản',exact:true}).click();await detail(approver).getByRole('button',{name:'Duyệt đề xuất'}).click();await detail(approver).getByRole('button',{name:'Xuất bản',exact:true}).click();await approver.getByRole('button',{name:'Xác nhận xuất bản',exact:true}).click();await expect(detail(approver)).toContainText('Đã xuất bản');await expect(detail(approver)).toContainText('Từ ngày mới');const session=await (await approver.request.get('/api/admin/auth')).json();const d=await (await approver.request.get('/api/admin/config?version='+v)).json();expect(d.publication.effective_at).toBeGreaterThan(session.actor.issuedAt);await other.close();
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
