import { readFileSync, readdirSync } from 'node:fs';
import { parseSync } from 'rolldown/utils';
import assert from 'node:assert/strict';
const base = 'apps/web/src', vi = JSON.parse(readFileSync(`${base}/i18n/vi.json`)), en = JSON.parse(readFileSync(`${base}/i18n/en.json`));
assert.deepEqual(Object.keys(vi).sort(), Object.keys(en).sort(), 'VI/EN keys differ');
for (const key of Object.keys(vi)) assert.deepEqual(vi[key].match(/\{\w+\}/g)?.sort() ?? [], en[key].match(/\{\w+\}/g)?.sort() ?? [], `Interpolation mismatch: ${key}`);
const files = readdirSync(base).filter(file => file.endsWith('.tsx') && !file.startsWith('Admin')).concat('admin-api.ts');
const failures = [];
for (const file of files) {
  const source = readFileSync(`${base}/${file}`, 'utf8'), parsed = parseSync(file, source, { lang: file.endsWith('tsx') ? 'tsx' : 'ts' });
  assert.equal(parsed.errors.length, 0, `Cannot parse ${file}`);
  const fail = (node, value) => failures.push(`${file}:${source.slice(0, node.start).split('\n').length}: ${value}`);
  const literal = node => {
    if (!node) return;
    if (typeof node.value === 'string' && /\p{L}/u.test(node.value)) fail(node, node.value);
    if (node.type === 'TemplateLiteral') for (const q of node.quasis) if (/\p{L}/u.test(q.value.cooked)) fail(q, q.value.cooked);
    if (node.type === 'ConditionalExpression') { literal(node.consequent); literal(node.alternate); }
    if (node.type === 'LogicalExpression') literal(node.right);
    if (node.type === 'BinaryExpression' && node.operator === '+') { literal(node.left); literal(node.right); }
  };
  const walk = (node, parent) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'JSXText') literal(node);
    if (node.type === 'JSXExpressionContainer' && parent?.type !== 'JSXAttribute') literal(node.expression);
    if (node.type === 'JSXAttribute' && ['aria-label', 'title', 'placeholder', 'alt'].includes(node.name.name)) literal(node.value?.expression ?? node.value);
    if (node.type === 'AssignmentExpression' && ['textContent', 'innerText', 'placeholder', 'title'].includes(node.left?.property?.name)) literal(node.right);
    if (node.type === 'CallExpression' && node.callee?.name === 't' && typeof node.arguments[0]?.value === 'string' && !(node.arguments[0].value in vi)) fail(node, `Missing key: ${node.arguments[0].value}`);
    for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(child => walk(child, node)); else if (value && typeof value === 'object') walk(value, node);
  };
  walk(parsed.program);
}
assert.deepEqual(failures, [], 'Hardcoded player copy or missing keys');
console.log(`PASS: ${files.length} player/native-form source files, ${Object.keys(vi).length} paired VI/EN keys; JSX text/attributes/inline literals and native text setters.`);
