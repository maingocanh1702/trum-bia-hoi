#!/usr/bin/env python3
"""Validate the actual new-engine loader, schema and initialization against the seed."""
from pathlib import Path
import subprocess
import sys

repo = Path(__file__).resolve().parent.parent
runner = repo / "node_modules" / ".bin" / "tsx"
if not runner.exists():
    sys.exit("Missing tsx. Run npm install at the repo root first.")
sys.exit(subprocess.call([str(runner), "scripts/check_engine_config.ts"], cwd=repo))
