#!/usr/bin/env python3
"""
check_economy_config.py — Đối chiếu docs/config/economy.tbh.json với prototype/src/engine/constants.ts.
Fail (exit 1) nếu số Phase 0 đang chạy lệch config. Dùng trong verification của mọi slice economy.
  python3 scripts/check_economy_config.py
"""
from __future__ import annotations
import json, re, sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CFG = json.loads((REPO / "docs/config/economy.tbh.json").read_text(encoding="utf-8"))
TS = (REPO / "prototype/src/engine/constants.ts").read_text(encoding="utf-8")

def ts_num(name: str) -> float:
    m = re.search(rf"export const {name}\s*=\s*([0-9_.]+)", TS)
    if not m:
        raise KeyError(name)
    return float(m.group(1).replace("_", ""))

def ts_obj(name: str) -> dict:
    m = re.search(rf"export const {name}\s*=\s*\{{([^}}]*)\}}", TS)
    if not m:
        raise KeyError(name)
    return {k: float(v) for k, v in re.findall(r"(\w+):\s*([0-9_.]+)", m.group(1).replace("_", ""))}

def menu_price(dish: str, field: str) -> float:
    m = re.search(rf"{dish}:\s*\{{[^}}]*{field}:\s*([0-9_.]+)", TS)
    if not m:
        raise KeyError(f"MENU.{dish}.{field}")
    return float(m.group(1).replace("_", ""))

k = CFG["k"]["value"]
checks: list[tuple[str, float, float]] = [
    ("K_ANCHOR", ts_num("K_ANCHOR"), CFG["k"]["anchorValuePerServe"]),
    ("SPAWN_BASE_MS", ts_num("SPAWN_BASE_MS"), CFG["spawn"]["baseMs"]),
    ("SPAWN_WARMUP_MULT", ts_num("SPAWN_WARMUP_MULT"), CFG["spawn"]["warmupMult"]),
    ("PEAK_SPAWN_MULT", ts_num("PEAK_SPAWN_MULT"), CFG["rush"]["peak"]["spawnIntervalMult"]),
    ("PATIENCE_THUONG_MS", ts_num("PATIENCE_THUONG_MS"), CFG["patience"]["thuongMs"]),
    ("PATIENCE_RUSH_MULT", ts_num("PATIENCE_RUSH_MULT"), CFG["patience"]["rushTypeMult"]),
    ("ENJOY_MIN_MS", ts_num("ENJOY_MIN_MS"), CFG["enjoy"]["minMs"]),
    ("ENJOY_MAX_MS", ts_num("ENJOY_MAX_MS"), CFG["enjoy"]["maxMs"]),
    ("GLASS_COUNT", ts_num("GLASS_COUNT"), CFG["glasses"]["start"]),
    ("POUR_MS", ts_num("POUR_MS"), CFG["upgrades"]["keg"]["pourMs"][0]),
    ("WASH_BASE.slots", ts_obj("WASH_BASE")["slots"], CFG["upgrades"]["washer"]["slots"][0]),
    ("WASH_BASE.washMs", ts_obj("WASH_BASE")["washMs"], CFG["upgrades"]["washer"]["washMs"][0]),
    ("WASH_UPGRADED.slots", ts_obj("WASH_UPGRADED")["slots"], CFG["prototypePhase0"]["washUpgradedToggle"]["slots"]),
    ("WASH_UPGRADED.washMs", ts_obj("WASH_UPGRADED")["washMs"], CFG["prototypePhase0"]["washUpgradedToggle"]["washMs"]),
    ("FRESHNESS_MS", ts_num("FRESHNESS_MS"), CFG["freshness"]["baseMs"]),
    ("FRESHNESS_WARN_MS", ts_num("FRESHNESS_WARN_MS"), CFG["freshness"]["warnMs"]),
    ("TIP_PATIENCE_THRESHOLD", ts_num("TIP_PATIENCE_THRESHOLD"), CFG["tip"]["patienceThreshold"]),
    ("TIP_RATE", ts_num("TIP_RATE"), CFG["tip"]["rate"]),
    ("TIP_VIP_MULT", ts_num("TIP_VIP_MULT"), CFG["tip"]["vipMult"]),
    ("TABLE_COUNT", ts_num("TABLE_COUNT"), CFG["prototypePhase0"]["tableCount"]),
    ("SEATS_PER_TABLE", ts_num("SEATS_PER_TABLE"), CFG["prototypePhase0"]["seatsPerTable"]),
    ("SHIFT_DURATION_MS", ts_num("SHIFT_DURATION_MS"), CFG["shift"]["durationMs"]),
    ("DAILY_EARN_CAP", ts_num("DAILY_EARN_CAP"), round(CFG["shift"]["dailyEarnCapBase"] * k)),
    ("P_MOI", ts_num("P_MOI"), CFG["demandMix"]["pMoi"]),
    ("P_NEM_GIVEN_MOI", ts_num("P_NEM_GIVEN_MOI"), CFG["demandMix"]["pNemGivenMoi"]),
    ("P_SECOND_ROUND", ts_num("P_SECOND_ROUND"), CFG["demandMix"]["pSecondRound"]),
    ("GROUP_SIZE_MIN", ts_num("GROUP_SIZE_MIN"), CFG["spawn"]["groupSizePhase0"][0]),
    ("GROUP_SIZE_MAX", ts_num("GROUP_SIZE_MAX"), CFG["spawn"]["groupSizePhase0"][1]),
]
for dish in ("bia", "lac", "nem"):
    checks.append((f"MENU.{dish}.price", menu_price(dish, "price"), CFG["menu"][dish]["price"]))
    checks.append((f"MENU.{dish}.cost", menu_price(dish, "cost"), CFG["menu"][dish]["bulkCost"]))
w = ts_obj("CUSTOMER_WEIGHTS")
for t in ("thuong", "voi", "vip"):
    checks.append((f"CUSTOMER_WEIGHTS.{t}", w[t], CFG["customerTypes"][t]["weight"]))

bad = 0
for name, ts_v, cfg_v in checks:
    ok = abs(float(ts_v) - float(cfg_v)) < 1e-9
    bad += 0 if ok else 1
    print(f"{'OK ' if ok else 'BAD'} {name:28s} constants.ts={ts_v:<12g} config={cfg_v}")
print(f"\n{len(checks) - bad}/{len(checks)} khớp; k={k}")
sys.exit(1 if bad else 0)
