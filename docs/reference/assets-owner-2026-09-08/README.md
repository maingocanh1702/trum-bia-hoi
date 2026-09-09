# Owner asset references — 2026-09-08

User direction: "tham khảo assets theo style này". These seven boards guide the ongoing game build.
`assets/glass-clean.png` remains the exact no-handle Hanoi recycled-glass anchor.

Latest designer direction (2026-09-09): "Portrait casual-management game UI with
edge-anchored HUD, rounded skeuomorphic panels, chunky pill controls, bold rounded
sans-serif typography, soft shadows, compact contextual actions, and Vietnamese
street-game visual language." See `../../features/F24-design-uiux-production.md`
for the current brief and constraints inherited from the service references.

- Use recognizable individual objects, a consistent three-quarter view, dark outlines, warm illustrated materials and expressive compact characters.
- Progress equipment through distinct silhouettes/materials. Keep detail readable at gameplay size, with transparent individual exports.
- Match the supplied glass closely; use the boards for tables, equipment, food, customers and environment atmosphere.
- A board is visual reference, not a production atlas. Its labels, logos, modern props and extra ingredients do not define game content or change the economy.
- Existing rules remain: six ingredients/menu entries, generic branding, Hanoi 2000s setting, no added gameplay systems from a board.

The supplied file ending `11_05_09 PM (1).png` contains a JSON download error, not an image; the other seven PNGs are usable. Originals in Downloads were not modified.

| File | Original filename suffix |
|---|---|
| board-02.png | 11_05_09 PM (2).png |
| board-03.png | 11_05_11 PM (3).png |
| board-04.png | 11_05_11 PM (4).png |
| board-05.png | 11_05_11 PM (5).png |
| board-06.png | 11_05_11 PM (6).png |
| board-07.png | 11_05_11 PM (7).png |
| board-08.png | 11_05_11 PM (8).png |

## Layout reference added 2026-09-09

`layout-owner.png` is the owner's full screenshot, copied unchanged from Desktop.
Use the game area as a composition reference: centered tall blue tiled yard, Hanoi
street illustration on both sides, compact top HUD, owner/counter/equipment above
the tables, inventory rail on the right, four bottom actions, and a dark green
selected-order panel. Browser chrome and surrounding desktop apps are not game UI.

The implementation keeps whole-table orders and actual configured chair counts.
It opens the order panel on table tap, restores focus on Escape, and auto-closes it
on order expiry so departure feedback remains only numeric coin/reputation loss.
The fourteen generated draft assets and their prompts are recorded in the adjacent
`generated-*.md` files. Original green glass PNGs remain unchanged. Illustrated
sprites use smooth display sampling; glass anchors keep their original pixel look.

| Date | Change |
|---|---|
| 2026-09-09 | Applied the owner's newer layout/style reference. Blue ground and green panels supersede the previous warm-ground/brown-panel suggestion for this screen. Internal placeholder IDs remain in the manifest, not visible in play. No economy/content rules changed. |

| 2026-09-09 customer set | Added four adult customer draft types after rejecting opaque checkerboard variants. Seat rendering uses either a customer-with-stool or an empty stool, never both. VIP soft halo and final image-size/family QA remain pending. |

## Mobile service sequence — owner update 2026-09-09

Five unchanged originals are archived as `service-owner-5002.png` through
`service-owner-5006.png` (Downloads `IMG_5002.PNG` … `IMG_5006.PNG`). They show:

1. Waiting guest: cream dish bubble, one patience bar and a subtle selection ring.
2. Tapped guest: dark green rounded panel, customer badge, dish/countdown and a large red serve action.
3. Successful service: panel/bubble closes, a compact numeric gain appears near the HUD, guest emotion replaces the order bubble.
4. Lingering guest: visible identity and the remaining occupied/consumption time.
5. Multiple dishes: names/checkmarks describe readiness; one action serves the order.

The images are static. Short arrival, bubble/panel entrance, emotion pop and
upward reward entrance animations are implementation interpretations, not
measured timing from the reference game. They use CSS only and respect reduced
motion. Browser chrome, tea/snack content and reference-game prices are excluded.
Trùm Bia Hơi keeps its own menu, whole-table rules, one warning ring/timer per table,
actual ledger amounts and the owner's numeric-only departure feedback.

| Date | Change |
|---|---|
| 2026-09-09 mobile service | Added the five owner screenshots and adapted the service sequence: actual dish bubbles, per-customer result emotions, serving readiness, table-level selection, numeric gain near HUD and consumption timer. Static-image motion interpretations are explicit; game/economy rules unchanged. |
| 2026-09-09 designer refinement | Recorded the owner’s latest portrait casual-management direction: edge HUD, rounded skeuomorphic panels, chunky pills, bold rounded sans-serif, soft shadows, compact contextual actions and Vietnamese street-game visual language. Supersedes the earlier concise HUD wording; menu and economy remain authoritative. |
