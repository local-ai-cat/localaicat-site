import test from "node:test";
import assert from "node:assert/strict";
import {cadetRig, portraitFrame} from "./cadet-composition.ts";

test("plain and dressed cats share the exact helmet coordinates", () => {
  const plain = portraitFrame(16), dressed = portraitFrame(24);
  for (let y=0; y<16; y++) for(let x=0; x<16; x++) {
    assert.equal(plain.x+x*plain.width/16, dressed.x+(x+4)*dressed.width/24);
    assert.equal(plain.y+y*plain.height/16, dressed.y+(y+8)*dressed.height/24);
  }
});
test("source density can grow without changing the master frame", () => {
  for (const size of [24,48,768,1536,4096]) assert.deepEqual(portraitFrame(size), {x:0,y:0,...cadetRig.artboard});
  assert.throws(()=>portraitFrame(0));
});
