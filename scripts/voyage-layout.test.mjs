import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../public/space-demo/lockscreen.html', import.meta.url), 'utf8');
const bootstrap = html.match(/<body><script id="voyage-layout">([\s\S]*?)<\/script>/);

test('the voyage applies its layout before demo content or renderer scripts load', () => {
  assert.ok(bootstrap, 'the layout must run first in the body');
  for (const [search, expected] of [
    ['?homepage', ['embedded', 'homepage']],
    ['?embedded', ['embedded']],
    ['?seed=4&homepage&paused=1', ['embedded', 'homepage']],
    ['', []],
    ['?seed=4', []],
  ]) {
    const classes = new Set();
    runInNewContext(bootstrap[1], {
      URLSearchParams,
      location: { search },
      document: { body: { classList: { add: name => classes.add(name) } } },
    });
    assert.deepEqual([...classes], expected, search);
  }
});
