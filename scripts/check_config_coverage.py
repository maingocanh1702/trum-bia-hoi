#!/usr/bin/env python3
"""
check_config_coverage.py — Bảo đảm luật "KHÔNG HARDCODE" (founder 08/09).

Kiểm 5 điều:
  1. Mọi section top-level của docs/config/economy.tbh.json được xếp tier trong
     _meta.governance.tiers (A/B/C) hoặc nằm trong excludedFromRegistry.
  2. Mọi đường dẫn nhắc trong governance (sections có dấu chấm, featureFlags)
     phải resolve được trong JSON — chống typo khi thêm key.
  3. Mọi `config.get('<path>')` trong packages/engine/src trỏ tới key có thật trong JSON.
  4. Bảng registry ở 08-SPEC-economy-constants.md §22 nhắc đủ mọi section
     (thêm key vào JSON mà quên đăng ký ở doc = fail).
  5. (advisory) Đếm literal số trong packages/engine/src ngoài constants.ts —
     in cảnh báo, KHÔNG fail; bật --strict để fail khi có.

Dùng:
  python3 scripts/check_config_coverage.py
  npm run check:config-coverage            (repo root)

Bỏ qua 1 dòng khỏi kiểm (5): thêm `// config-exempt: <lý do>` ở cuối dòng đó.
Exit 1 nếu có lỗi (1–4).
"""
from __future__ import annotations
import json, re, sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CFG_PATH = REPO / "docs/config/economy.tbh.json"
SPEC_PATH = REPO / "08-SPEC-economy-constants.md"
SRC_DIR = REPO / "packages/engine/src"
ENGINE_DIR = SRC_DIR
STRICT = "--strict" in sys.argv

CFG = json.loads(CFG_PATH.read_text(encoding="utf-8"))
GOV = CFG.get("_meta", {}).get("governance")
errors: list[str] = []
warns: list[str] = []


def resolve(path: str):
    """Trả về (ok, value) cho đường dẫn dạng a.b.c trong CFG."""
    node = CFG
    for part in path.split("."):
        if isinstance(node, dict) and part in node:
            node = node[part]
        else:
            return False, None
    return True, node


if GOV is None:
    print("FAIL  _meta.governance thiếu trong economy.tbh.json (xem BRD §5.2 / 08-SPEC §22).")
    sys.exit(1)

# ---------- 1 + 2. tier coverage & path hợp lệ ----------
tiers = GOV.get("tiers", {})
classified: dict[str, list[str]] = {}   # section top-level -> danh sách entry đã xếp
gov_paths: list[tuple[str, str]] = []   # (tier, path) để kiểm typo

for tier_name, tier in tiers.items():
    for entry in list(tier.get("sections", [])) + list(tier.get("featureFlags", [])):
        root = entry.split(".")[0]
        classified.setdefault(root, []).append(f"{tier_name}:{entry}")
        gov_paths.append((tier_name, entry))

excluded = {e.split()[0].strip("`") for e in GOV.get("excludedFromRegistry", [])}

sections = [k for k in CFG.keys() if k != "_meta"]
for sec in sections:
    if sec in excluded:
        continue
    if sec not in classified:
        errors.append(
            f"[1] Section `{sec}` chưa được xếp tier. Thêm vào _meta.governance.tiers "
            f"(mặc định Tier B theo 08-SPEC §22) + bảng BRD §5.2.3."
        )

for tier_name, path in gov_paths:
    ok, _ = resolve(path)
    if not ok:
        errors.append(f"[2] Tier {tier_name} trỏ `{path}` nhưng key này không có trong economy.tbh.json (typo?).")

# section được xếp tier nhưng đã bị xoá khỏi JSON
for root in classified:
    if root not in CFG and root not in excluded:
        errors.append(f"[2] Governance xếp tier cho `{root}` nhưng JSON không còn section này.")

# ---------- 3. config.get() trong code ----------
get_calls = 0
if SRC_DIR.exists():
    for f in SRC_DIR.rglob("*.ts"):
        text = f.read_text(encoding="utf-8")
        for m in re.finditer(r"config\.get\(\s*['\"]([^'\"]+)['\"]", text):
            get_calls += 1
            path = m.group(1)
            ok, _ = resolve(path)
            if not ok:
                rel = f.relative_to(REPO)
                line = text[: m.start()].count("\n") + 1
                errors.append(f"[3] {rel}:{line} đọc `config.get('{path}')` nhưng key không có trong economy.tbh.json.")

# ---------- 4. bảng §22 của 08-SPEC ----------
if SPEC_PATH.exists():
    spec = SPEC_PATH.read_text(encoding="utf-8")
    if "## 22." not in spec:
        errors.append("[4] 08-SPEC-economy-constants.md thiếu §22 (bảng key → tier).")
    else:
        tail = spec[spec.index("## 22."):]
        tail = tail[: tail.index("\n## ")] if "\n## " in tail[3:] else tail
        for sec in sections:
            if f"`{sec}`" not in tail:
                errors.append(f"[4] §22 (08-SPEC) chưa có dòng cho section `{sec}`.")
else:
    errors.append("[4] Không thấy 08-SPEC-economy-constants.md.")

# ---------- 5. advisory: literal số trong engine ----------
ALLOWED = {"0", "1", "2", "-1", "100", "1000", "60", "24"}
SKIP_FILES = {"constants.ts", "types.ts", "rng.ts"}   # constants = fallback hợp lệ; rng = hằng số thuật toán


def strip_noise(text: str) -> str:
    """Bỏ comment và chuỗi (kể cả template) để không bắt nhầm số trong chú thích/UI text.

    Dòng có `// config-exempt: <lý do>` được bỏ qua (số không thuộc economy, vd buffer UI).
    """
    text = "\n".join("" if "config-exempt" in ln else ln for ln in text.split("\n"))
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"//.*", "", text)
    text = re.sub(r"`(?:[^`\\]|\\.)*`", "``", text, flags=re.S)
    text = re.sub(r"'(?:[^'\\\n]|\\.)*'", "''", text)
    text = re.sub(r'"(?:[^"\\\n]|\\.)*"', '""', text)
    return text


magic = 0
if ENGINE_DIR.exists():
    for f in sorted(ENGINE_DIR.glob("*.ts")):
        if f.name in SKIP_FILES or f.name.endswith(".probe.ts"):
            continue
        text = strip_noise(f.read_text(encoding="utf-8"))
        for m in re.finditer(r"(?<![\w.])(\d[\d_]*(?:\.\d+)?)(?![\w.])", text):
            if m.group(1).replace("_", "") in ALLOWED:
                continue
            magic += 1
            line = text[: m.start()].count("\n") + 1
            warns.append(f"[5] {f.relative_to(REPO)}:{line} literal `{m.group(1)}` — nên chuyển sang config key.")

# ---------- báo cáo ----------
print(f"Sections: {len(sections)} · đã xếp tier: {len(sections) - len([s for s in sections if s in excluded])}"
      f" · excluded: {sorted(excluded)}")
print(f"config.get() quét được: {get_calls} lời gọi")
if warns:
    print(f"\n⚠️  {len(warns)} literal số trong engine (advisory, xem no-magic-numbers ở 10-SPEC §12):")
    for w in warns[:15]:
        print("   ", w)
    if len(warns) > 15:
        print(f"    … và {len(warns) - 15} chỗ nữa")
if errors:
    print(f"\n❌ {len(errors)} lỗi coverage:")
    for e in errors:
        print("   ", e)
    sys.exit(1)
if STRICT and warns:
    print("\n❌ --strict: còn literal số trong engine.")
    sys.exit(1)
print("\n✅ Config coverage OK — mọi tham số đều có chỗ trong registry admin.")
