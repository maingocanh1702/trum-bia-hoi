// The patch of dotted paths that turns one economy file into another (plan S5): every leaf that differs, arrays element by element, `_meta` and the description
// strings (`_rule` ...) left out. A key the target does not have cannot be removed by a patch and is reported on stderr.
//   node packages/engine/sim/plans/patch-between.mjs <from.json> <to.json> [out.json]
import { readFileSync, writeFileSync } from 'node:fs';

export function patchBetween(from, to) {
  const patch = {}, missing = [];
  const walk = (a, b, path) => {
    if (b !== null && typeof b === 'object' && a !== null && typeof a === 'object' && Array.isArray(a) === Array.isArray(b)) {
      for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (key.startsWith('_')) continue;
        const next = path ? `${path}.${key}` : key;
        if (!(key in b)) { missing.push(next); continue; }
        if (!(key in a)) { patch[next] = b[key]; continue; }
        walk(a[key], b[key], next);
      }
    } else if (JSON.stringify(a) !== JSON.stringify(b)) patch[path] = b;
  };
  walk(from, to, '');
  return { patch, missing };
}

if (process.argv[1] && process.argv[1].endsWith('patch-between.mjs')) {
  const [fromFile, toFile, outFile] = process.argv.slice(2);
  const { patch, missing } = patchBetween(JSON.parse(readFileSync(fromFile, 'utf8')), JSON.parse(readFileSync(toFile, 'utf8')));
  if (missing.length) console.error(`not in the target (left as they are): ${missing.join(', ')}`);
  const text = JSON.stringify(patch, null, 1) + '\n';
  if (outFile) writeFileSync(outFile, text); else process.stdout.write(text);
  console.error(`${Object.keys(patch).length} paths`);
}
