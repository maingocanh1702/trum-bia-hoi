import importlib.util
import sys
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("build_dashboard.py")
SPEC = importlib.util.spec_from_file_location("dashboard_build", MODULE_PATH)
assert SPEC and SPEC.loader
dashboard_build = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = dashboard_build
SPEC.loader.exec_module(dashboard_build)


class ParsePrsTests(unittest.TestCase):
    def test_phase_four_stops_before_progress_summary_table(self) -> None:
        tracker = """
### Phase 4: Event & sink

| PR | Wave | Feature | Status | Branch | Gates | Notes |
|---|---|---|---|---|---|---|
| F19 | Code | Event prototype | 🟡 | `prototype/` | gate | valid row |

## 5. Progress summary

| Phase | Total | Done (✅) | In progress (🟡) | Blocked (❌) | Deferred (⏸️) | Progress |
|---|---:|---:|---:|---:|---:|---:|
| Phase 4 | 8 | 0 | 0 | 0 | 8 | 0% |
"""

        prs = dashboard_build.parse_prs(tracker)

        self.assertEqual([pr.pr_id for pr in prs], ["F19"])

    def test_live_tracker_has_only_28_unique_feature_ids(self) -> None:
        # 28 = F01–F26 + F27 (onboarding) + F28 (leaderboard), tracker v0.7.0 (2026-09-08)
        tracker_path = MODULE_PATH.parents[2] / "docs" / "implementation-tracker.md"

        prs = dashboard_build.parse_prs(tracker_path.read_text(encoding="utf-8"))
        pr_ids = [pr.pr_id for pr in prs]

        self.assertEqual(len(pr_ids), 28)
        self.assertEqual(len(set(pr_ids)), 28)
        self.assertTrue(all(dashboard_build.FEATURE_ID_RE.fullmatch(pr_id) for pr_id in pr_ids))


if __name__ == "__main__":
    unittest.main()
