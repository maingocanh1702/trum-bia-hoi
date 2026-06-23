import random, statistics
random.seed(7)

# ---------- Customer type weights (trumviahe gốc, bỏ shipper riêng) ----------
# Thường 1.0, Vội 0.3, VIP 0.1, ChiPheo 0.03, NgoiLy 0.1
types = {
    'thuong': 1.0, 'voi': 0.3, 'vip': 0.1, 'chipheo': 0.03, 'ngoily': 0.1
}
total_w = sum(types.values())

# ---------- TRÀ ĐÁ (gốc) ----------
# Món base: trà 50, kẹo 30, hạt 20. Khách thường chủ yếu 1 trà; rush thêm món phụ.
# Giả định món/khách (pre-tip): phần lớn 1 trà (50); một phần gọi thêm 1 đồ nhắm (~25).
def tra_da_order():
    val = 50  # trà đá
    if random.random() < 0.35:   # 35% gọi thêm 1 đồ nhắm
        val += random.choice([30,20])
    return val

# ---------- BIA HƠI (đề xuất) ----------
# Bia 50 (workhorse). Mồi: lạc75, đậu100, nem150, tóp165, lòng280.
moi_prices = [75,100,150,165,280]
moi_w =      [0.30,0.20,0.20,0.15,0.15]
def pick_moi():
    return random.choices(moi_prices, weights=moi_w, k=1)[0]

def bia_order(p_moi=0.70, max_moi=1):
    val = 50  # 1 cốc bia
    n = 0
    while n < max_moi and random.random() < p_moi:
        val += pick_moi(); n+=1
    return val

def sim(order_fn, vip_premium=False, ngoily_reorder=1.0):
    """avg revenue/khách (món + tip), theo weight; tip=30% nếu phục vụ tốt (giả định 90% phục vụ kịp)."""
    N=300000
    tot=0.0
    keys=list(types.keys()); ws=[types[k] for k in keys]
    for _ in range(N):
        t=random.choices(keys, weights=ws, k=1)[0]
        if t=='chipheo':
            tot+=0; continue
        served_well = random.random()<0.90    # 90% phục vụ >60% patience -> có tip
        if t=='ngoily':
            mon = order_fn()*ngoily_reorder    # bàn lai rai gọi nhiều đợt
        elif t=='vip' and vip_premium:
            mon = order_fn()                   # vip cũng gọi như thường (có thể premium hơn)
        elif t=='voi':
            mon = order_fn()                   # khách vội
        else:
            mon = order_fn()
        tip = 0.30*mon if served_well else 0
        if t=='vip': tip*=10                   # VIP tip x10
        tot += mon+tip
    return tot/N

# Trà đá: ngồi lỳ gọi như thường (gốc: ngồi lỳ trả/tip bình thường, chỉ chiếm ghế)
avg_trada = sim(tra_da_order, vip_premium=False, ngoily_reorder=1.0)

# Bia hơi base (ngồi lỳ gọi như thường để so công bằng "per serve")
avg_bia_base = sim(lambda: bia_order(0.70,1), ngoily_reorder=1.0)

# Bia hơi với bàn lai rai gọi nhiều đợt hơn (đặc thù bia hơi) + cho phép tới 2 mồi
avg_bia_rich = sim(lambda: bia_order(0.75,2), ngoily_reorder=1.6)

k_base = avg_bia_base/avg_trada
k_rich = avg_bia_rich/avg_trada

print(f"Avg revenue/khách (món+tip, weighted):")
print(f"  Trà đá (gốc)          : {avg_trada:7.1f} xu")
print(f"  Bia hơi (base,≤1 mồi) : {avg_bia_base:7.1f} xu   -> k = {k_base:.2f}")
print(f"  Bia hơi (rich,≤2 mồi, bàn lai rai) : {avg_bia_rich:7.1f} xu   -> k = {k_rich:.2f}")
print()
print("=== Sensitivity: p_moi (xác suất gọi mồi) ===")
for p in [0.5,0.6,0.7,0.8,0.9]:
    a=sim(lambda p=p: bia_order(p,1), ngoily_reorder=1.0)
    print(f"  p_moi={p:.1f} (≤1 mồi): avg={a:6.1f}  k={a/avg_trada:.2f}")
print()
# ── RECOMMENDATION ───────────────────────────────────────────────
# Triết lý: rescale economy CHỈ theo k_value (giá trị/lượt phục vụ).
# Throughput (bàn lai rai gọi nhiều đợt) KHÔNG được cộng vào k — nó là
# đòn bẩy thưởng giúp chạm trần nhanh hơn (giống số ghế ở trà đá, trần cố định).
# => k chính = k_base. Kịch bản "rich" chỉ để THAM KHẢO mức throughput tối đa.
k_pick = round(k_base * 2) / 2            # làm tròn 0.5 -> 2.5
print(f">>> ĐỀ XUẤT k = {k_pick}  (= k_base, k_value)")
print(f"    - k_base (per-serve value)        = {k_base:.2f}  <-- DÙNG SỐ NÀY để rescale")
print(f"    - k_rich (gồm throughput lai rai) = {k_rich:.2f}  (chỉ tham khảo, KHÔNG dùng làm k)")
print(f"    Lý do: trần ngày cố định; throughput là đòn bẩy thưởng, không bù vào k.")
print()
print("=== Rescale theo k chính ===")
def rs(x): 
    v=x*k_pick
    return f"{v:,.0f}"
print(f"  Trần ngày: 200,000 -> {rs(200000)}")
print(f"  League (Bạc 20k / Vàng 60k / Titan 120k / BạchKim 180k / HồngNgọc 300k / KimCương 500k / HuyềnThoại 1M):")
for name,v in [('Bạc',20000),('Vàng',60000),('Titan',120000),('BạchKim',180000),('HồngNgọc',300000),('KimCương',500000),('HuyềnThoại',1000000)]:
    print(f"     {name:10s}: {v:>9,} -> {rs(v)}")
print(f"  Ghế/bàn ví dụ 10.000 -> {rs(10000)}; Ấm/bom 200k -> {rs(200000)}")
