# Trum Bia Hoi: Game Design Research From Trumviahe

Ngay tong hop: 2026-06-03

Nguon tham khao:
- https://trumviahe.com/
- Public client bundle: https://trumviahe.com/assets/index-BWec7RjV.js
- Quan sat gameplay/UI, man ket ca, menu nang cap, kho hang, ca/mua giai

Ghi chu: Day la tai lieu nghien cuu de thiet ke game "Trum Bia Hoi", khong phai design doc noi bo cua Trumviahe.

---

## 1. Game Concept & Product Experience

### 1.1. The Loai

Trumviahe la game web casual simulation/time-management ve mo quan tra da via he. Game co chat idle/tycoon, nhung khong phai idle thuan vi nguoi choi phai theo doi va thao tac trong ca.

Nhung dac trung san pham:
- Choi tren browser, toi uu mobile.
- Game theo ca, moi ca la mot phien active.
- Co anti-idle/auto pause khi nguoi choi khong theo doi tab.
- Co lop meta: league, milestone, social preview, daily mission, AI assistant, shrine/prestige.

### 1.2. Core Loop

Vong lap chinh:
1. Mo ca khi du the luc.
2. Khach den lien tuc, moi khach co order va patience rieng.
3. Nguoi choi quan ly nguyen lieu, pha tra, dung ly sach, rua ly, phuc vu nhanh.
4. Serve tot thi nhan xu, tip va reputation.
5. Serve cham/that bai thi mat khach, bi phat, giam reputation.
6. Ket ca xem so sach: doanh thu, phat, net, khach den, served, lost, tipped, reputation delta.
7. Dung xu/reputation de nhap hang, nang cap, mo tinh nang, thue mat bang.
8. Lap lai ca moi voi throughput cao hon va rui ro moi.

### 1.3. Shift & Stamina

Public constants va quan sat:
- Max stamina: 12 phut active.
- Daily shift cap: newbie 8, regular 6, veteran 5.
- Daily hard cap: 200,000 xu.
- Well-rested bonus: x1.1 trong khoang dau ca sau khi nghi du.
- Brief quan sat cho thay ca active co the hien thi tong thoi gian lon hon 12 phut do setup/pause/rest UI.

Vai tro design:
- Cat game thanh phien ngan, hop mobile.
- Chong farm lien tuc.
- Tao retention loop: nghi, quay lai, mo ca moi.
- Giu economy khong bi pha boi long-session grinding.

### 1.4. Ledger Ket Ca

Game theo doi va phan hoi rat ro sau moi ca:
- Tong thu.
- Phat.
- Thuc thu/net.
- Khach den.
- Phuc vu.
- Bo di.
- Khach boa.
- Tip value.
- Reputation delta.
- Mission progress.
- So sanh voi ca truoc.

Mot chi tiet quan trong: reputation co the am trong mot ca neu mat khach/phuc vu kem. Vi vay reputation khong chi la faucet, ma la performance score co the bi burn.

### 1.5. Retention & Social Layers

Nhung lop giu chan dang chu y:
- Daily missions.
- Login/gift rewards.
- Leaderboard theo mua.
- League tiers.
- Shrine/prestige: top player duoc luu dau.
- Social preview: xem quan cua nguoi khac.
- Phone/message/social actions.
- AI assistant trong game co the doc context nguoi choi va dua loi khuyen.
- Rest/Zen mode tao cam giac game song tiep ngay ca khi dong quan.

---

## 2. Economy Deep Dive

### 2.1. Unit Economy

Gia mon va gia von public:

| Mon | Gia ban | Gia von le | Margin le | Gia von si | Margin si |
|---|---:|---:|---:|---:|---:|
| Tra da | 50 | 10 | 80% | 8 | 84% |
| Keo lac | 30 | 15 | 50% | 12 | 60% |
| Hat huong duong | 20 | 8 | 60% | 6.5 | 67.5% |

Nhan xet:
- Margin mon an/uong rat cao.
- Game khong tao kho bang COGS nang.
- Burn chinh den tu upgrade, rent, rui ro, lost customers, bottleneck va cap.

### 2.2. Throughput Economy

Tra da loi cao nhung bi khoa boi chuoi van hanh:
- Can tra + nuoc + da.
- Can binh pha tra co stored tea.
- Can ly sach.
- Can rua ly.
- Can ghe trong.
- Khach co patience.

Thong so public:
- Base spawn interval: 10.5s/khach.
- Pha tra lv1: 1 ly / 15s.
- Rua ly lv1: 7s / ly.
- Prep tra da: 3s.
- Khach ngoi uong: 5-10s.

Y nghia:
- Early game khong ngheo vi margin thap.
- Early game bi nghe do pha tra, ly, rua ly, ghe, patience.
- Day la core gameplay: tim bottleneck va nang cap dung.

### 2.3. Customer Mix

Public spawn weights:

| Loai khach | Weight | Economy effect |
|---|---:|---|
| Normal | 1.0 | Baseline |
| Rush | 0.3 | It patience hon, ep speed |
| VIP | 0.1 | Tip x10, lost penalty x10 |
| Chi Pheo | 0.03 | Khong tra tien, chiem tai nguyen/khong gian |
| Stubborn | 0.1 | O lau, chiem ghe lau |

Customer mix la mot trong cac truc balance quan trong nhat. Game khong chi tang/giam doanh thu, ma doi loai khach den quan.

### 2.4. Tip & Reputation

Tip:
- Tip base khoang 30% payment neu phuc vu khi patience con tot.
- Neu patience qua thap, tip = 0.
- QR tang tip +20%.
- VIP nhan tip multiplier x10.
- Rush/weather co the tang tip multiplier.

Reputation:
- Serve khong tip: +1 reputation.
- Serve co tip: +3 reputation.
- Lost/serve kem co the lam reputation delta am.

Design value:
- Coin la money currency.
- Reputation la performance/meta currency.
- Tach hai tien te giup mo khoa progression ma khong bơm coin qua nhieu.

### 2.5. Core Sinks & Upgrades

| He thong | Cost progression |
|---|---|
| Thung da | 2k -> 8k -> 30k -> 100k |
| Binh pha tra | 3k -> 12k -> 50k -> 200k |
| Khu rua ly | 2.5k -> 10k -> 40k -> 150k |
| Suc chua ly/tai nguyen | 1k -> 5k -> 20k -> 80k |
| Dien thoai | 5k |
| QR | 8k |
| Bang hieu | 20k+ |
| Cho | 2k + 20 da; nang tiep bang xu + keo |

Vai tro:
- Equipment upgrade tang throughput.
- Phone la gateway unlock.
- QR tang tip.
- Bang hieu doi customer mix.
- Dog giam risk.
- Rent/location la sink dinh ky.

### 2.6. Bang Hieu & Demand-Mix Economy

Bang hieu la modifier customer mix, khong chi la cosmetic.

Unlock:
- Gia lap bang hieu: 20,000 xu.
- Yeu cau stall lv3.
- Mo khoa sign style va social/showcase utility.

Style effects:

| Style | Cost | Economy effect |
|---|---:|---|
| Wood | 0 | VIP spawn weight x2 |
| Neon | 15,000 | VIP x2, shipper +20% |
| Calligraphy | 25,000 | VIP x2, stubborn x0.8 |
| Vintage | 20,000 | VIP x2, rush x0.5 |
| Golden | 30,000 + 5,000 reputation gate | VIP x3 |

Uoc tinh VIP probability:
- Khong bang hieu: 0.1 / 1.53 ~= 6.5%.
- Wood x2: 0.2 / 1.63 ~= 12.3%.
- Golden x3: 0.3 / 1.73 ~= 17.3%.

Y nghia:
- Bang hieu tang expected revenue qua VIP va tip.
- Nhung VIP lost penalty cung x10, nen day la risk/reward.
- Style cho phep player chon strategy: tang shipper, giam rush, giam stubborn, day VIP.

### 2.7. QR Payment

QR:
- Gia: 8,000 xu.
- Can phone.
- Can milestone "Quen Tay".
- Tac dong: tip +20%.

Synergy:
- QR nhe voi khach thuong.
- QR manh voi VIP vi tip da duoc nhan x10.
- QR + bang hieu la combo tang EV nhung yeu cau throughput tot.

### 2.8. Flyers

Flyer:
- Dung reputation, khong dung coin.
- Gia/cost public trong UI: khoang 300 reputation.
- Ton kho cap: 5.
- Campaign duration: 90s.
- Khi active, thu hut stream khach va mo/tang queue.

Y nghia:
- Flyer la reputation -> coin opportunity.
- Khong bơm coin truc tiep.
- Neu thieu stock/throughput, flyer bien thanh lost customers va penalty.

### 2.9. Location & Rent

Location la payment multiplier + rent. Chi dang thue khi throughput da du.

| Location | Rent/ngay | Multiplier | Gross can de hoa rent |
|---|---:|---:|---:|
| Cong Truong xay dung | 770 | x1.05 | ~15.4k |
| Chung Cu Cu | 1.68k | x1.10 | ~16.8k |
| Cong Truong hoc | 2.73k | x1.15 | ~18.2k |
| Cho Dem | 3.92k | x1.20 | ~19.6k |
| Khu Van Phong | 6.72k | x1.30 | ~22.4k |
| Pho Co | 11.97k | x1.45 | ~26.6k |
| Ga Metro | 18.48k | x1.60 | ~30.8k |
| Khu Pho Tay | 29.12k | x1.80 | ~36.4k |

Ghi chu: Ten location o bang tren da bo dau de dong bo ASCII. "Cong Truong xay dung" la construction, con "Cong Truong hoc" la school_gate.

### 2.10. Weather Economy

Weather tac dong vao demand, cost, patience va bottleneck:

| Weather | Tac dong chinh |
|---|---|
| Sunny | Baseline |
| Hot | Spawn +15%, patience -15%, da tan x1.5, snack demand x0.4, tip x1.15, shipper x1.5 |
| Humid | Spawn +5%, patience -25%, da tan x2, snack demand x0.25, tip x1.2, shipper x2, Chi Pheo x1.5 |
| Light rain | Spawn x0.8, patience x1.15, da tan x0.85, shipper x3, stubborn x2 |
| Cold | Spawn x0.9, patience -20%, khong can da, tea per drink x2, snack demand x1.5, brew/wash cham hon |

Mapping UI/label trong game:

| UI label | Internal weather | Player-facing effects |
|---|---|---|
| Dep troi / Nang dep | Sunny | Dieu kien co ban, khong co trade-off lon |
| Nong | Hot | Khach den nhieu hon, de goi tra da, da tan nhanh, khach nong ruot hon, tip cao hon |
| Oi buc | Humid | Da tan cuc nhanh, rat it khach mua keo/hat, nhieu Chi Pheo hon, khach doi tra da de ha hoa, boa dam, shipper kha dong |
| Mua nhe | Light rain | It khach walk-in hon, khach kien nhan hon, shipper dong, khach ngoi ly/stubborn nhieu hon |
| Lanh | Cold | Khong can da cho tra, ton nhieu tra hon moi ly, do an vat ban tot hon, pha/rua cham hon |

Vi du tu UI "Oi buc":
- Ice melt: cuc nhanh.
- Snack demand: giam manh.
- Chi Pheo: tang.
- Tea demand: tang do khach can ha hoa.
- Tip: tang.
- Shipper: tang.

Design value:
- Doi optimal strategy theo thoi tiet.
- Tao ly do stock/nang cap khac nhau.
- Khong co mot build toi uu duy nhat.

### 2.11. Rush Hour

Rush hour:
- Tang rush customer density.
- Tang base payment 5-10%.
- Tang tip 10-18%.
- Tang lost customer penalty 1.8-2.5x.
- Tang rush customer spawn weight.

Ket luan:
- Rush la faucet neu player du throughput.
- Rush la penalty sink neu player qua tai.

### 2.12. Dog & Risk Insurance

Dog:
- Gia mua: 2,000 xu + 20 da.
- Nang cap bang xu + keo.
- Giam rui ro theft/bangster.
- La dieu kien LP1.

Dog khong tang gross revenue. No bao ve net profit.

### 2.13. Season, Daily Cap & Anti-Inflation

Mechanics:
- Season league thresholds: bronze -> silver -> gold -> titanium -> platinum -> ruby -> diamond -> legend.
- Score chu yeu dua tren season earned.
- Mission/login/gift rewards nen duoc xem la side rewards, khong nen day thang vao competitive score neu muon cong bang.
- Daily hard cap: 200,000 xu.
- Shift cap theo progression tier.

Y nghia:
- Ngan nguoi choi farm vo han.
- Giu leaderboard bot phu thuoc thoi gian online hon.
- Giam lam phat coin/score.

### 2.14. Life Path & Meta Progression

Milestones:

| Milestone | Dieu kien chinh | Reward |
|---|---|---|
| LP1 | 50k lifetime earned + 4 ghe + dog | 5k + small crate |
| LP2 | 150k + stall 3 + phone | 10k + badge shard |
| LP3 | 500k + equipment lv3 + QR | 20k + medium crate |
| LP4 | 1.5M + flyer + platinum league | 50k + cosmetic token |
| LP5 | 5M + shop sign + ruby league | 100k + crate/cosmetic |
| LP6 | 15M + all equipment/stall lv5 + diamond | 250k |
| LP7 | 50M + 9 ghe + legend | 500k |

Reward coin nho hon threshold rat nhieu, nen milestone chu yeu la unlock/status, khong phai coin faucet lon.

### 2.15. UI/Internal Mapping Reference

Muc nay gom cac mapping co the dung khi viet spec, domain model hoac UI cho ban Trum Bia Hoi.

#### Menu & Resource Mapping

| UI label | Internal id | Type | Economy note |
|---|---|---|---|
| Tra da | tea | menu item | Mon chinh, can tea + water + ice + clean glass |
| Keo lac | peanutCandy | menu item/resource | Snack instant, khong can glass |
| Hat huong duong | sunflowerSeeds | menu item/resource | Snack instant, khong can glass |
| Tra | tea | resource | Nguyen lieu pha tra |
| Nuoc pha tra | water | resource | Nguyen lieu pha tra |
| Da | ice | resource | Bi anh huong manh boi weather |
| Ly sach / ly ban | glasses | reusable resource | Throughput bottleneck, can washer |
| Don shipper | activeShipperOrder | order type | Khong ton glass, co fail risk |

#### Customer Type Mapping

| UI label | Internal id | Economy role |
|---|---|---|
| Khach thuong | normal | Baseline demand |
| Khach voi | rush | Patience thap, de mat khach, tang pressure |
| Khach VIP | vip | Tip x10, lost penalty x10 |
| Chi Pheo | chi_pheo | Khong tra tien, tao rui ro/chiem cho |
| Khach ngoi li / stubborn | stubborn | O lau, chiem ghe, giam turnover |
| Shipper | shipper | Don giao hang, demand rieng, khong dung ly |

#### Equipment & Upgrade Mapping

| UI label | Internal id | Economy role |
|---|---|---|
| Thung da | iceBox | Tang capacity da, giam toc do tan da |
| Am tich / binh pha tra | teaBrewer | Tang storage, batch size, giam brew time |
| Bo rua ly | washer | Giam wash time, tang washing slots |
| Ly / suc chua ly | glasses | Tang so ly quay vong |
| Ghe | chairs | Tang concurrent customers, nhung cung tang pressure |
| Quay / stall | stall | Gate business features va progression |
| Cho giu quan | dog | Insurance/risk mitigation |

#### Business Feature Mapping

| UI label | Internal id | Cost/gate | Economy role |
|---|---|---|---|
| Dien thoai | hasPhone | 5,000 xu, LP1 | Gateway cho QR/social/online features |
| Dang ky QR | hasQrPayment | 8,000 xu, phone + LP2 | Tip +20% |
| To roi | flyerUnlocked / flyers | reputation cost, cap 5 | Demand spike 90s |
| Bang hieu | shopSign.unlocked | 20,000 xu, stall lv3 | Doi customer mix, tang VIP |
| Doi kieu bang hieu | shopSign.style | coin/reputation tuy style | Strategy modifier |
| Mat bang | stallRental.location | rent + LP gate | Payment multiplier + periodic sink |

#### Shop Sign Style Mapping

| UI style | Internal id | Economy effect |
|---|---|---|
| Go / Wooden | wood | VIP spawn weight x2 |
| Neon | neon | VIP x2, shipper +20% |
| Thu phap / Calligraphy | calligraphy | VIP x2, stubborn x0.8 |
| Vintage | vintage | VIP x2, rush x0.5 |
| Hoang kim / Golden | golden | VIP x3, can 5,000 reputation gate |

#### Location Mapping

| UI label | Internal id | Multiplier | Gate |
|---|---|---:|---|
| Hem Nho | alley | x1.00 | Default |
| Cong Truong xay dung | construction | x1.05 | LP1 |
| Chung Cu Cu | old_apartment | x1.10 | LP1 |
| Cong Truong hoc | school_gate | x1.15 | LP2 |
| Cho Dem | night_market | x1.20 | LP2 |
| Khu Van Phong | office_district | x1.30 | LP3 |
| Pho Co | old_quarter | x1.45 | LP4 |
| Ga Metro | metro_station | x1.60 | LP5 |
| Khu Pho Tay | expat_quarter | x1.80 | LP6 |

#### Rush Hour Mapping

| UI label | Internal type | Duration | Economy effect |
|---|---|---:|---|
| Cao diem nhe | light | 90s | Payment x1.05, tip x1.1, lost penalty x1.8, rush weight x2 |
| Cao diem vua / bua trua | lunchLight | 120s | Payment x1.05, tip x1.1, lost penalty x1.8, rush weight x2.5 |
| Cao diem nang | heavy | 150s | Payment x1.1, tip x1.18, lost penalty x2.5, rush weight x3 |

#### Progression/League Mapping

| UI label | Internal id | Gate/threshold |
|---|---|---|
| Tap Tanh | LP0 | Start |
| Vao Nghe | LP1 | 50k lifetime + 4 chairs + dog |
| Quen Tay | LP2 | 150k + stall 3 + phone |
| Thao Viec | LP3 | 500k + equipment lv3 + QR |
| Ranh Nghe | LP4 | 1.5M + flyer + platinum |
| Sang Tao | LP5 | 5M + shop sign + ruby |
| Bac Thay | LP6 | 15M + all equipment/stall lv5 + diamond |
| Huyen Thoai | LP7 | 50M + 9 chairs + legend |

League ids:
- bronze, silver, gold, titanium, platinum, ruby, diamond, legend.

### 2.16. Economy Formula

```txt
Expected Net / minute =
customer_rate
* E[order_value * payment_multipliers + tip]
- COGS
- expected_penalty
- rent
- maintenance/risk_cost
```

Trong do:
- customer_rate: spawn, ghe, queue, flyer, weather, rush.
- order_value: tra/snack/don shipper/don 2 mon.
- payment_multipliers: location, rush, weather, well-rested.
- tip: patience, VIP, QR, weather, rush.
- expected_penalty: lost customer, VIP lost, queue overflow, gangster, shipper fail.
- COGS: nguyen lieu, da tan, snack.
- sinks: upgrade, sign, QR, dog, rent, cosmetics.

---

## 3. Implications For Trum Bia Hoi

### 3.1. Theme Mapping

| Trumviahe | Trum Bia Hoi |
|---|---|
| Tra da | Bia hoi |
| Keo lac/hat huong duong | Lac rang, nem chua, banh da, dau phu, do nhau |
| Da tan | Bia mat hoi/nhat, da tan, bia am |
| Ly tra | Coc/vai bia |
| Binh pha tra | Voi bia/keg/tank bia |
| Rua ly | Rua coc/vai |
| Ghe via he | Ban ghe nhua/bia hoi |
| Bang hieu | Bien quan, man chieu bong da, brand bia |
| VIP | Khach sanh nhau, reviewer, khach cong ty, khach dat ban |
| Rush customer | Khach voi, khach tan lam, khach xem bong da toi muon |
| Stubborn | Ban nhau ngoi lau |
| Chi Pheo | Khach say/pha roi/khong tra tien |
| Dog | Bao ve/cho giu quan |
| Shipper | Don ship do nhau/do an kem |
| Weather hot | Troi nong, tran bong da, cuoi tuan |

### 3.2. Core Loop Cho Bia Hoi

1. Nhap bia, da, do nhau, coc sach.
2. Khach vao ban, goi bia va do nhau.
3. Rot bia, phuc vu mon an kem, rua coc.
4. Ban ngoi trong mot khoang thoi gian, co the goi them.
5. Tinh tien, nhan tip/reputation.
6. Doi pho khach say, vo coc, het bia, kiem tra phuong, bao ke.
7. Nang cap voi bia, tu lanh, so ban, nhan vien, bien hieu, giay phep, mat bang.

### 3.3. Economy Layers Nen Giu

1. Unit economy
   - Bia hoi margin kha cao.
   - Do nhau margin thap hon nhung upsell tot.
   - Combo bia + moi tang average order value.

2. Throughput economy
   - Bottleneck: voi bia, keg, coc sach, ban trong, nhan vien.
   - Bia/co do nhau nen co prep time khac nhau.
   - Ban nhau ngoi lau hon khach tra da, can balance table turnover.

3. Demand-mix economy
   - Bien hieu/brand bia tang khach VIP.
   - Man chieu bong da tang rush/cuoi tuan.
   - Nhac song tang khach o lau va tip, nhung giam turnover.
   - Combo happy hour tang demand nhung co risk say/vo coc.

4. Risk economy
   - Khach say khong tra tien/pha roi.
   - Vo coc/ban ghe hong.
   - Cong an/phuong kiem tra.
   - Bao ke.
   - Mua lon lam giam khach, nhung khach o lau hon.
   - Bao ve/giay phep la insurance sink.

5. Meta economy
   - Reputation = danh tieng quan.
   - League = "quan bia hot nhat khu".
   - Milestones = tu via he nho den quan co mat bang tot.
   - Social/prestige = bang vang, review quan, street view cac quan.

### 3.4. Modifier Ideas For Bia Hoi

Bang hieu/man hinh/su kien nen doi customer mix, khong chi +income:

| Modifier | Possible effect |
|---|---|
| Bien go | Khach quen/VIP nhe |
| Bien neon | Tang khach tre, tang order dem, tang risk on ao |
| Man chieu bong da | Tang rush theo tran dau, tang ban ngoi lau |
| Bien "Bia tuoi moi ngay" | Tang khach VIP/reviewer |
| Nhac song | Tang tip, tang thoi gian ngoi |
| Bao ve | Giam khach say pha roi, giam bao ke |
| Giay phep day du | Giam rui ro bi phat khi kiem tra |
| Combo lac + bia | Tang AOV, tang prep/stock pressure |

### 3.5. Balance Recommendations

Khuyen nghi economy:
- Cho unit margin kha cao de nguoi choi thay "ban la co lai".
- Dung throughput lam challenge chinh, khong dung gia von thap de ep grind.
- Dung modifier de doi demand mix va risk profile.
- QR/vi dien tu ban bia co the tang tip/thanh toan nhanh, nhung nen synergy voi VIP.
- Flyer/marketing nen dung reputation de doi lay demand spike.
- Rent/location chi nen loi khi player da co throughput du.
- Daily cap/stamina can co de tranh farm inflation.
- Late-game sink nen la cosmetic, prestige, mat bang premium, giay phep, nhan vien, decor, social showcase.

### 3.6. MVP Scope

MVP nen bat dau nho:
- 3 menu items: bia hoi, lac rang, nem chua.
- 4 customer types: normal, rush, VIP, drunk/stubborn.
- 4 resources: bia, da, do nhau, coc sach.
- 4 upgrades: voi bia, rua coc, ban ghe, tu lanh/keg.
- 3 business modifiers: bien hieu, QR, marketing flyer.
- 2 events: gio cao diem bong da, kiem tra/phat.
- 1 meta currency: reputation.
- 1 daily/shift cap.

Muc tieu cua MVP la chung minh core loop va economy bottleneck, chua can day du social/shrine/AI assistant.

### 3.7. Metrics Can Track

Can log cac chi so sau de dieu phoi economy:
- coins earned per minute.
- coins spent per minute.
- net profit per shift.
- COGS ratio.
- rent burden ratio.
- time to next upgrade.
- lost customer rate.
- VIP served/lost rate.
- tip customer rate.
- stockout rate.
- glass/cup bottleneck rate.
- table occupancy/turnover.
- flyer campaign ROI.
- sign style selection and ROI.
- daily cap hit rate.
- churn after bottleneck.

Canh bao lam phat:
- p90 coin balance tang nhanh hon next meaningful upgrade cost.
- players dat daily cap qua som.
- upgrade purchase rate giam vi player da du tien nhung khong co sink hap dan.
- location premium bi thue dai tra ma van loi qua cao.
