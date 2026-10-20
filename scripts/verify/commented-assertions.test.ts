import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commentedAssertions, lineComment, scanRepo } from './commented-assertions';

test('a line comment in the middle of a line swallows the assertions after it, and the scanner says so', () => {
  const bad = "const f = fixture('x'); expect(f.coins).toBe(1750); // the wallet expect(f.tables).toEqual([1, 1]);";
  assert.deepEqual(commentedAssertions(bad).map(h => h.line), [1]);
  assert.deepEqual(commentedAssertions(`a();\n${bad}\nb();`).map(h => h.line), [2]);
  assert.equal(commentedAssertions("await x.click(); // then assert.equal(a, b)").length, 1);
  assert.equal(commentedAssertions("await x.click(); // then assert(a)").length, 1);
  assert.equal(commentedAssertions("await upgrade.click(); // P0 owner decision expect.soft(upgraded, 'table 2').toBe(true);").length, 1, 'expect.soft is an assertion too (review round 2)');
  assert.equal(commentedAssertions("await upgrade.click(); // P0 owner decision, a soft assertion of table 2").length, 0, 'a comment that only talks about it is not a hit');
});

test('comments that only talk about an assertion, own-line comments and literals that contain // are not hits', () => {
  assert.equal(commentedAssertions("expect(a).toBe(1); // the expected value of a").length, 0);
  assert.equal(commentedAssertions("// expect(a).toBe(1) was replaced by the loop below").length, 0, 'an own-line comment is visible, not hidden after code');
  assert.equal(commentedAssertions("expect(page.url()).toBe('http://127.0.0.1:4173/'); expect(b).toBe(2);").length, 0);
  assert.equal(commentedAssertions("const url = `http://${host}/x`; expect(url).toBe(y);").length, 0);
  assert.equal(commentedAssertions("expect(a).toBe(1); // trailing note").length, 0);
  assert.equal(lineComment("a('//'); // note"), ' note');
  assert.equal(lineComment("a(\"it's // not\"); b();"), null);
});

test('no test or verification source of the repo hides an assertion behind a line comment (review round 1, plan S5)', () => {
  const { files, lines, hits } = scanRepo();
  assert.ok(files > 100 && lines > 10000, `the scan reads the test roots (${files} files, ${lines} lines)`);
  assert.deepEqual(hits.map(h => `${h.file}:${h.line}`), []);
});

test('the scan reads the sim directory (the evaluator and the career gates assert) and every root it names exists', async () => {
  const { TEST_ROOTS } = await import('./commented-assertions');
  assert.ok(TEST_ROOTS.includes('packages/engine/sim'), 'packages/engine/sim is a scanned root');
  const { existsSync } = await import('node:fs');
  assert.deepEqual(TEST_ROOTS.filter(root => !existsSync(root)), [], 'a root that does not exist would be scanned as nothing');
});
