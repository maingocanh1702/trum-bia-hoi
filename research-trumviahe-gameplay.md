# Research: Trumviahe Gameplay & Economy

Ngay tham chieu: 2026-06-03

Nguon tham khao:
- https://trumviahe.com/
- Public client bundle: https://trumviahe.com/assets/index-BWec7RjV.js

Ghi chu: Tai lieu nay duoc tong hop tu website va bundle client public, khong phai design doc noi bo cua game.

## 1. Tong Quan Gameplay

Trumviahe la game web casual simulation/time-management ve quan tra da via he. Nguoi choi dieu hanh quan, phuc vu khach, quan ly nguyen lieu, nang cap thiet bi va doi pho rui ro.

Core loop:
1. Mua nguyen lieu.
2. Pha tra, chuan bi mon, rua ly.
3. Phuc vu khach truoc khi het kien nhan.
4. Nhan xu, tip va reputation.
5. Dung xu/reputation de nang cap, mo khoa tinh nang va tang throughput.
6. Doi pho thoi tiet, cao diem, khach kho va rui ro nhu bao ke.

## 2. Unit Economy

Gia mon va gia von:

| Mon | Gia ban | Gia von le | Margin le | Gia von si | Margin si |
|---|---:|---:|---:|---:|---:|
| Tra da | 50 | 10 | 80% | 8 | 84% |
| Keo lac | 30 | 15 | 50% | 12 | 60% |
| Hat huong duong | 20 | 8 | 60% | 6.5 | 67.5% |

Nhan xet:
- Game cho margin rat cao, dac biet la tra da.
- Gia von khong phai burn chinh.
- Burn chinh nam o upgrade, rent, rui ro, bottleneck va daily cap.

## 3. Throughput Economy

Tra da co margin cao nhung bi khoa boi nhieu nut that van hanh:
- Can tra + nuoc + da.
- Can pha tra.
- Can ly sach.
- Can rua ly sau khi khach dung.
- Can ghe trong.
- Khach co patience limit.

Mot so thong so public:
- Spawn khach base: khoang 10.5s/khach.
- Pha tra lv1: 1 ly / 15s.
- Rua ly lv1: 7s / ly.
- Tra da prep: 3s.
- Khach ngoi uong: 5-10s.

Ket luan:
- Early game khong ngheo vi thieu margin.
- Early game ngheo vi nghe throughput: pha tra, ly, rua ly, ghe, patience.
- Day la thiet ke tot vi nguoi choi luon thay ro nen nang cap gi tiep theo.

## 4. Customer Mix

Public spawn weight co cac loai khach:

| Loai khach | Weight | Tac dong economy |
|---|---:|---|
| Normal | 1.0 | Baseline |
| Rush | 0.3 | It patience hon, ep toc do phuc vu |
| VIP | 0.1 | Tip x10, lost penalty x10 |
| Chi Pheo | 0.03 | Khong tra tien, chiem tai nguyen/khong gian |
| Stubborn | 0.1 | O lau, chiem ghe lau |

VIP la faucet manh nhung co rui ro:
- VIP tip multiplier x10.
- VIP lost penalty multiplier x10.
- Vi vay cac modifier tang VIP chi tot khi player da co throughput du tot.

## 5. Tip & Reputation

Tip:
- Neu phuc vu khi khach con du patience, tip base khoang 30% payment.
- Neu patience xuong thap, tip = 0.
- QR tang tip them 20%.
- VIP nhan tip multiplier x10.

Reputation:
- Serve khong tip: +1 reputation.
- Serve co tip: +3 reputation.

Nhan xet:
- Reputation tach khoi coin de lam meta currency.
- Coin dung cho mua/nang cap.
- Reputation dung de gate progression, flyer, league va mot so unlock.
- Viec tach 2 tien te giup giam ap luc lam phat coin.

## 6. Upgrade & Sink Chinh

Core upgrade sinks:

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

Chuc nang tung nhom:
- Thung da: tang suc chua da, giam toc do tan da.
- Binh pha tra: tang batch size, storage, giam brew time.
- Khu rua ly: giam wash time, tang slots.
- Ly/tai nguyen: giam stockout va bottleneck.
- Dien thoai: gateway unlock.
- QR: tang tip.
- Bang hieu: doi customer mix.
- Cho: insurance/risk mitigation.

## 7. Bang Hieu & Demand-Mix Economy

Bang hieu khong chi la cosmetic. No la modifier tac dong vao cau truc khach hang.

Unlock:
- Gia lap bang hieu: 20,000 xu.
- Yeu cau stall lv3.
- Mo khoa style va social preview utility.

Style effects:

| Style | Cost | Economy effect |
|---|---:|---|
| Wood | 0 | VIP spawn weight x2 |
| Neon | 15,000 | VIP x2, shipper +20% |
| Calligraphy | 25,000 | VIP x2, stubborn x0.8 |
| Vintage | 20,000 | VIP x2, rush x0.5 |
| Golden | 30,000 + 5,000 reputation gate | VIP x3 |

Uoc tinh VIP probability:
- Khong bang hieu: VIP = 0.1 / 1.53 ~= 6.5%.
- Wood x2: VIP = 0.2 / 1.63 ~= 12.3%.
- Golden x3: VIP = 0.3 / 1.73 ~= 17.3%.

Nhan xet:
- Bang hieu tang EV doanh thu qua VIP va tip.
- Nhung cung tang exposure voi VIP penalty.
- Day la risk/reward modifier, khong phai simple +income.

## 8. QR Payment

QR:
- Gia: 8,000 xu.
- Can phone.
- Can milestone "Quen Tay".
- Tang tip +20%.

Tac dong:
- Voi khach thuong, QR tang gross nhe.
- Voi VIP, QR rat manh vi tip da duoc nhan x10.
- QR co synergy tot voi bang hieu va Golden sign.

## 9. Flyers

Flyer la he marketing dung reputation thay vi coin:
- Mo/mua flyer bang reputation, khoang 300 reputation.
- Ton kho cap: 5 flyers.
- Campaign duration: 90s.
- Khi active, thu hut stream khach va mo/increase queue.

Tac dong economy:
- Flyer khong bơm coin truc tiep.
- Flyer tang demand trong thoi gian ngan.
- Neu player thieu nguyen lieu, ly, ghe hoac throughput, flyer co the gay lost customers va penalty.
- Day la co che doi reputation -> coin opportunity, co dieu kien.

## 10. Location & Rent

Location la payment multiplier kem rent. Chi loi khi player co du throughput.

| Location | Rent/ngay | Multiplier | Gross can de hoa rent |
|---|---:|---:|---:|
| Cong Truong | 770 | x1.05 | ~15.4k |
| Chung Cu Cu | 1.68k | x1.10 | ~16.8k |
| Cong Truong/Cong Truong hoc | 2.73k | x1.15 | ~18.2k |
| Cho Dem | 3.92k | x1.20 | ~19.6k |
| Khu Van Phong | 6.72k | x1.30 | ~22.4k |
| Pho Co | 11.97k | x1.45 | ~26.6k |
| Ga Metro | 18.48k | x1.60 | ~30.8k |
| Khu Pho Tay | 29.12k | x1.80 | ~36.4k |

Nhan xet:
- Location la sink dinh ky.
- Neu thue som, no lam giam net profit.
- Neu thue dung luc, no la multiplier tot.
- Day la co che chong lam phat tu mid/late game.

## 11. Weather Economy

Weather tac dong vao demand, patience, cost va bottleneck:

| Weather | Tac dong chinh |
|---|---|
| Sunny | Baseline |
| Hot | Spawn +15%, patience -15%, da tan x1.5, snack demand x0.4, tip x1.15, shipper x1.5 |
| Humid | Spawn +5%, patience -25%, da tan x2, snack demand x0.25, tip x1.2, shipper x2, Chi Pheo x1.5 |
| Light rain | Spawn x0.8, patience x1.15, da tan x0.85, shipper x3, stubborn x2 |
| Cold | Spawn x0.9, patience -20%, khong can da, tra per drink x2, snack demand x1.5, brew/wash cham hon |

Nhan xet:
- Weather lam thay doi optimal strategy.
- Khong co mot build toi uu cho moi dieu kien.
- Player can stock va upgrade tuy tinh huong.

## 12. Rush Hour

Rush hour co cac muc light/heavy/lunchLight:
- Tang customer rush density.
- Tang base payment 5-10%.
- Tang tip 10-18%.
- Tang lost customer penalty 1.8-2.5x.
- Tang rush customer spawn weight.

Nhan xet:
- Rush hour la faucet co rui ro.
- Neu throughput tot, rush la co hoi kiem tien nhanh.
- Neu throughput kem, rush bien thanh penalty sink.

## 13. Dog & Risk Insurance

Dog:
- Gia mua: 2,000 xu + 20 da.
- Nang cap tiep bang xu + keo.
- Dong vai tro phong thu/risk mitigation.

Tac dong:
- Khong tang gross revenue truc tiep.
- Bao ve net profit truoc theft/bangster/rui ro.
- La dieu kien LP1, ep player dau tu vao phong thu som.

## 14. Stamina & Daily Cap

Thong so:
- Max stamina: 12 phut.
- Daily shift cap: newbie 8, regular 6, veteran 5.
- Daily hard cap: 200,000 xu.
- Well-rested bonus: x1.1 trong mot khoang thoi gian.

Vai tro:
- Gioi han faucet moi ngay.
- Ngan player gioi farm vo han.
- Giu progression khong bi pha boi long-session grinding.

## 15. Life Path & Meta Progression

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

Nhan xet:
- Reward coin nho hon nhieu so voi threshold.
- Milestone chu yeu dung de gate tinh nang va meta status.
- Dieu nay giup han che lam phat coin.

## 16. Cong Thuc Economy Tong Hop

Co the mo hinh hoa expected net nhu sau:

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
- order_value: tra/snack/don 2 mon.
- payment_multipliers: location, rush, weather, well-rested.
- tip: patience, VIP, QR, weather, rush.
- expected_penalty: lost customer, VIP lost, queue overflow, gangster.
- COGS: nguyen lieu, da tan, snack.
- sinks: upgrade, sign, QR, dog, rent, cosmetics.

## 17. Bai Hoc Ap Dung Cho Game Bia Hoi

Nen giu 5 lop economy:

1. Unit economy
   - Bia hoi, lac rang, nem chua, banh da, da.
   - Margin du cao de nguoi choi thay vui.

2. Throughput economy
   - Voi bia, keg, coc sach, ban ghe, nhan vien rua coc.
   - Bottleneck la diem tao gameplay.

3. Demand-mix economy
   - Bien hieu, man chieu bong da, nhac song, combo nhậu, reviewer/khach VIP.
   - Modifier nen doi loai khach, khong chi cong tien thang.

4. Risk economy
   - Khach say, vo coc, cong an/phuong kiem tra, bao ke, mua lon.
   - Bao ve/giay phep/cho giu quan dong vai tro insurance sink.

5. Meta economy
   - Reputation, danh tieng quan, league, milestones, location.
   - Dung de gate progression va chong lam phat.

Khuyen nghi:
- Dung margin cao o early game de tao cam giac "ban la co lai".
- Dung throughput bottleneck de tao challenge.
- Dung modifiers nhu bien hieu/QR/flyer de tao strategy khac nhau.
- Dung rent, risk va daily cap de chong inflation.
- Khong nen cho upgrade chi la "+income"; nen la "doi customer mix", "giam risk", "tang throughput", hoac "mo opportunity".

