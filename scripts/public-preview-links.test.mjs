import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
const demoRoot = resolve(publicRoot, 'space-demo');

test('every bundled design page has shareable, available local assets and links', () => {
  for (const name of readdirSync(demoRoot).filter(name => name.endsWith('.html'))) {
    const file = resolve(demoRoot, name);
    const markup = readFileSync(file, 'utf8');
    for (const [, value] of markup.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
      const url = new URL(value, `https://preview.example/space-demo/${name}`);
      assert.ok(!['localhost', '127.0.0.1'].includes(url.hostname), `${name}: ${value}`);
      if (url.origin !== 'https://preview.example' || !url.pathname.startsWith('/space-demo/')) continue;
      assert.ok(!url.pathname.endsWith('.md'), `${name} links to excluded implementation notes`);
      const target = resolve(publicRoot, `.${decodeURIComponent(url.pathname)}`);
      assert.ok(existsSync(target), `${name}: missing ${value}`);
    }
  }
});

test('public documentation routes are included while private data and local evidence are excluded from uploads', () => {
  const rules = readFileSync(new URL('../.vercelignore', import.meta.url), 'utf8').split('\n');
  assert.ok(rules.includes('/app/internal/data/features.json'));
  assert.ok(!rules.includes('/app/internal/'), 'password-protected internal routes stay available');
  for (const path of ['/artifacts/', '/scratch/', '/sessions/', '.env*']) assert.ok(rules.includes(path));
  assert.ok(rules.includes('/app/shh/'));
  assert.ok(rules.includes('/docs/'));
  assert.ok(!rules.includes('docs'), 'a broad docs rule would exclude the public app/docs routes');
});
