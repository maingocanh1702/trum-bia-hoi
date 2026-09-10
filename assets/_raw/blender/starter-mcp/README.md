# Blender MCP starter batch — PAUSED, 2026-09-10

Owner decision at 10:50 supersedes the Blender-only rule: use image generation for subsequent UI/game assets. These original Blender MCP renders are retained as draft source studies; they are not selected by runtime asset IDs and have not passed final pixel/style QA.

Native connection verified: Blender 4.5.13 LTS, addon 1.6, protocol 5. Created with `execute_blender_code`, rendered with Eevee, original geometry only; no external models. Codex MCP configuration was already installed and was retained. The separate studio scene preserves the original startup scene.

Source script: `scripts/blender/tbh_starter_assets.py` (from repo root). The `.blend` stores the studio, camera, lights, materials and models. Creation calls were `setup()`, `build_world()`, `build_coin()`, four `render_asset(id)` calls and `save_source()`. Do not automatically run or rebuild this paused batch.

## Preserved SHA-256

- `chair-plastic.png`: `945951cb76a0104e92c729b06996281269ffd3c9cd698eda78c142201d44497f`
- `icon-coin.png`: `d12612536134cd49016a6b4a62e2bfaccd3fe5c313b9f6690ef274c5e18f73b0`
- `table-lv1-empty.png`: `29534c130b22ebffc2f5cd6047e3b3dafa5f01ab90bdf3b04431e1ab8688f0ad`
- `table-lv2-empty.png`: `0547a7b25f3beffee721491f745e5f9a4cb82c90197a483ad089d523bce49d9d`
- `tbh-starter-mcp.blend`: `32bfc60b888119027cf901f3eff022cc3467566775d3a2eb4e99b07cefdd2dbc`
