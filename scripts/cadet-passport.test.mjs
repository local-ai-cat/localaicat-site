import test from 'node:test';
import assert from 'node:assert/strict';
import '../public/space-demo/cadet-model.js';
import '../public/space-demo/cadet-passport.js';
const model = globalThis.CadetModel;
const passport = globalThis.CadetPassport;
function uppercase(grid) { return grid.map(row => row.map(color => color?.toUpperCase() ?? null)); }
function rawCode(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit=0;bit<8;bit++) crc=(crc>>>1)^((crc&1)?0xedb88320:0); }
  return 'SC1.'+Buffer.from(bytes).toString('base64url')+'.'+((crc^0xffffffff)>>>0).toString(16).padStart(8,'0');
}
function payload(code) { return JSON.parse(Buffer.from(code.split('.')[1], 'base64url')); }

test('cat code preserves a named wardrobe, leap-day birthday and its exact visible pixels', () => {
  const appearance = {...model.wearOutfit(model.defaults(), 'pirate'),name:'Lúna 🐈'};
  const source = model.serializeDesign({appearance,birthday:'2024-02-29'});
  const restored = passport.decode(passport.encode(source));
  assert.deepEqual(restored.appearance, source.appearance);
  assert.equal(restored.birthday, '2024-02-29');
  assert.deepEqual(restored.pixels, uppercase(source.pixels));
  assert.equal(restored.mode, 'cadet');
});
test('freehand drawing round-trips every colour and transparency and remains static', () => {
  const drawing = Array.from({length:16}, (_,y) => Array.from({length:16}, (_,x) => '#'+(y*16+x).toString(16).padStart(6,'0')));
  drawing[0][0]=null;
  const restored = passport.decode(passport.encode({appearance:model.defaults(),mode:'drawing',drawing}));
  assert.deepEqual(restored.drawing, uppercase(drawing));
  assert.equal(restored.motion,false);
  assert.equal(restored.birthday,null);
});
test('wardrobe export retains an inactive freehand draft without making it the active cat', () => {
  const drawing=model.blankDrawing();drawing[2][3]='#abcdef';
  const restored=passport.decode(passport.encode({appearance:model.defaults(),drawing}));
  assert.equal(restored.mode,'cadet');assert.deepEqual(restored.drawing,uppercase(drawing));
});
test('blank art, every outfit and optional birthdays remain portable', () => {
  for(const outfit of Object.keys(model.outfits)) {
    const source={appearance:model.wearOutfit(model.defaults(),outfit)};
    assert.deepEqual(passport.decode(passport.encode(source)).pixels,uppercase(model.serializeDesign(source).pixels));
  }
  assert.deepEqual(passport.decode(passport.encode({mode:'drawing',drawing:model.blankDrawing()})).drawing,model.blankDrawing());
  assert.equal(model.validBirthday('2023-02-29'),false);
  assert.equal(model.validBirthday('2024-02-29'),true);
  assert.equal(model.validBirthday('2024-13-01'),false);
});
test('damaged, unsupported, oversized and truncated codes fail before replacing a cat', () => {
  const code=passport.encode({appearance:model.defaults()});
  assert.throws(()=>passport.decode(code.slice(0,-8)+'00000000'),/changed|incomplete/);
  assert.throws(()=>passport.decode(code.slice(0,90)),/incomplete/);
  assert.throws(()=>passport.decode('SC2.'+code),/incomplete/);
  assert.throws(()=>passport.decode('A'.repeat(24001)),/too long/);
  const value=payload(code);value.v=2;
  assert.throws(()=>passport.decode(rawCode(value)),/version/);
});
test('well-encoded but invalid pixel bounds, colours, dates and accessories are rejected', () => {
  const base=payload(passport.encode({appearance:model.defaults()}));
  for(const mutate of [
    v=>{v.s.r=[257,0];},v=>{v.s.r=[256,999];},v=>{v.s.r=[255,0];},
    v=>{v.s.p[1]='url(example)';},v=>{v.b='2023-02-29';},v=>{v.a.headwear='unknown';},
    v=>{v.a.name='x'.repeat(25);},v=>{v.a.motion='yes';},v=>{v.m='photo';}
  ]) { const value=structuredClone(base);mutate(value);assert.throws(()=>passport.decode(rawCode(value))); }
});

test('expanded hat and freehand codes use SC2 while old cats stay SC1',()=>{
  const appearance={...model.defaults(),headwear:'pirate'};
  const code=passport.encode({appearance});
  assert.ok(code.startsWith('SC2.'));
  const cat=passport.decode(code);
  assert.equal(cat.width,24);assert.deepEqual(cat.pixels,uppercase(model.grid(appearance)));
  const drawing=model.grid(appearance);drawing[23][23]='#abcdef';
  assert.deepEqual(passport.decode(passport.encode({mode:'drawing',drawing})).drawing,uppercase(drawing));
  assert.ok(passport.encode({appearance:model.defaults()}).startsWith('SC1.'));
  const invalid=payload(code);invalid.v=1;
  assert.throws(()=>passport.decode(rawCode(invalid)),/canvas/);
});
