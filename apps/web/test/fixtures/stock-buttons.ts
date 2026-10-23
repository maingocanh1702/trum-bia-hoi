import { Game, config, loadConfig, encodeSave, stockCap, restockQuote, DISHES } from '../../../../packages/engine/src';
import { fullHud } from './full-hud';

// Founder 2026-10-22 (Part B2.7): the Nhập hàng sheet's rows in the states its two buttons speak about. A resting shop (onboarding off), real config prices;
// only the starting stock and wallet are test inputs.
//   stock-buttons room   -> beer 7 short of the cap: "+10" would overflow, "Đầy kho" buys the 7
//   stock-buttons empty  -> no beer: both buttons buy
//   stock-buttons full   -> every stock at its cap: nothing to buy
//   stock-buttons broke  -> no beer and a wallet below both prices but above one glass's
const mode = process.argv[2] ?? 'room';
const raw = fullHud(structuredClone(config.raw)); raw._meta.version = 'stock-buttons-fixture'; raw.onboarding.enabled = false;
const cap = raw.upgrades.stall.stockCap[0];
const beer = mode === 'room' ? cap - 7 : mode === 'full' ? cap : 0;
raw.inventory.startingStock.bia = [beer, beer];
if (mode === 'full') for (const dish of ['lac', 'nem'] as const) raw.inventory.startingStock[dish] = [cap, cap];
if (mode === 'broke') raw.shift.startingCoinsBase = 12; // ×k at load: about one glass's price, below a batch
const g = new Game(loadConfig(raw), 42, Date.parse('2026-10-23T10:00:00+07:00')), w = g.world;
const quotes = Object.fromEntries(DISHES.map(dish => [dish, Object.fromEntries((['one', 'bulk', 'full'] as const).map(m => [m, restockQuote(w, g.config, dish, m)]))]));
process.stdout.write(JSON.stringify({ save: encodeSave(g), now: w.now, coins: w.coins, cap: stockCap(w, g.config), stock: w.inventory, kitchen: w.equipment.kitchen, bulkSize: g.config.values.inventory.bulkSize, quotes }));
