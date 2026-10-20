import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commentedAssertions, lineComment, scanRepo } from './commented-assertions';

test('a line comment in the middle of a line swallows the assertions after it, and the scanner says so', () => {
  const bad = "const f = fixture('x'); expect(f.coins).toBe(1750); // the wallet expect(f.tables).toEqual([1, 1]);";
  assert.deepEqual(commentedAssertions(bad).map(h => h.line), [1]);
  assert.deepEqual(commentedAssertions(`a();\n${bad}\nb();`).map(h => h.line), [2]);
  assert.equal(commentedAssertions("await x.click(); // then assert.equal(a, b)").length, 1);
  assert.equal(commentedAssertions("await x.click(); // then assert(a)").length, 1);
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
