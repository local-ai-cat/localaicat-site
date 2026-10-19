import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {catStorageKey, describeCat, previewCatCode, readSavedCat, saveCat} from "./cadet-runtime.ts";
import type {CatRuntime} from "./cadet-runtime.ts";

const sandbox = {TextEncoder, TextDecoder, atob, btoa} as typeof globalThis & {CadetModel:CatRuntime["model"]; CadetPassport:CatRuntime["passport"]};
for (const name of ["cadet-model.js","cadet-passport.js"]) runInNewContext(readFileSync(new URL(`../public/space-demo/${name}`,import.meta.url),"utf8"),sandbox);
const runtime:CatRuntime = {model:sandbox.CadetModel,passport:sandbox.CadetPassport};

test("live cat codes round-trip every editable appearance field and birthday without saving", () => {
  const source=runtime.model.normalizeDesign(null);
  const original=previewCatCode(runtime,source).code;
  const changes={name:"Moonbean",fur:"#123456",helmet:"#654321",eyes:"#abcdef",accent:"#fedcba",gear:"#aabbcc",headwear:"pirate",eyewear:"patch",neckwear:"scarf",expression:"sleepy",badge:"stripe",motion:false} as const;
  for(const [key,value] of Object.entries(changes)) {
    const design={...source,appearance:{...source.appearance,[key]:value}};
    const preview=previewCatCode(runtime,design);
    assert.equal(preview.error,"");
    assert.notEqual(preview.code,original,key);
    assert.equal(preview.code,runtime.passport.encode(design));
    assert.equal(runtime.passport.decode(preview.code).appearance[key as keyof typeof changes],value,key);
  }
  const birthday=previewCatCode(runtime,{...source,birthday:"2024-02-29"});
  assert.equal(runtime.passport.decode(birthday.code).birthday,"2024-02-29");
});

test("invalid drafts show a hint instead of a misleading or stale portable code", () => {
  const source=runtime.model.normalizeDesign(null);
  for(const design of [
    {...source,appearance:{...source.appearance,name:"   "}},
    {...source,appearance:{...source.appearance,name:"bad\u0001name"}},
    {...source,birthday:"2025-02-29"}
  ]) {
    const preview=previewCatCode(runtime,design);
    assert.equal(preview.code,"");
    assert.ok(preview.error);
  }
  assert.ok(previewCatCode(runtime,source).code,"correcting the draft restores its code");
});

test("cat descriptions follow the visible outfit and keep custom art distinct", () => {
  const source=runtime.model.normalizeDesign({appearance:{...runtime.model.defaults(),expression:"sleepy",headwear:"captain",neckwear:"chain"}});
  assert.equal(describeCat(runtime,source),"Sleepy lilac explorer. Captain · Moon chain");
  assert.match(describeCat(runtime,{...source,appearance:{...source.appearance,fur:"#123456"}}),/custom-coloured/);
  assert.equal(describeCat(runtime,{...source,mode:"drawing"}),"Hand-drawn stardust. One of a kind.");
  const drawn={...source,mode:"drawing" as const,drawing:runtime.model.grid(source.appearance)};
  const decoded=runtime.passport.decode(previewCatCode(runtime,drawn).code);
  assert.equal(JSON.stringify(decoded.pixels),JSON.stringify(drawn.drawing.map(row=>row.map(colour=>colour?.toUpperCase()??null))));
});

test("Done saves the exact portable cat that reload and the native importer receive", () => {
  const storage = new Map<string,string>();
  const before = Object.getOwnPropertyDescriptor(globalThis,"localStorage");
  Object.defineProperty(globalThis,"localStorage",{configurable:true,value:{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)}});
  try {
    const source=runtime.model.normalizeDesign({appearance:{...runtime.model.defaults(),name:"Moonbean",headwear:"pirate",eyewear:"patch",fur:"#91c8aa"},birthday:"2024-02-29"});
    const result=saveCat(runtime,source);
    assert.equal(result.persisted,true);
    assert.ok(result.code.startsWith("SC2."));
    assert.equal(JSON.stringify(readSavedCat(runtime)?.pixels),JSON.stringify(runtime.passport.decode(result.code).pixels));
    assert.equal(readSavedCat(runtime)?.appearance.name,"Moonbean");
    assert.equal(readSavedCat(runtime)?.birthday,"2024-02-29");
    const previous=storage.get(catStorageKey);
    assert.throws(()=>saveCat(runtime,{...source,appearance:{...source.appearance,name:"bad\u0001name"}}));
    assert.equal(storage.get(catStorageKey),previous,"invalid code never replaces the saved cat");
    storage.set(catStorageKey,"{invalid");
    assert.equal(readSavedCat(runtime),null);
  } finally {if(before)Object.defineProperty(globalThis,"localStorage",before);else Reflect.deleteProperty(globalThis,"localStorage");}
});
test("blocked browser storage still returns a valid recovery code and reports that it is not persisted", () => {
  const before=Object.getOwnPropertyDescriptor(globalThis,"localStorage");
  Object.defineProperty(globalThis,"localStorage",{configurable:true,value:{getItem:()=>{throw new Error("denied");},setItem:()=>{throw new Error("quota");}}});
  try {
    assert.equal(readSavedCat(runtime),null);
    const saved=saveCat(runtime,runtime.model.normalizeDesign(null));
    assert.equal(saved.persisted,false);
    assert.equal(runtime.passport.decode(saved.code).appearance.name,"Cadet");
  } finally {if(before)Object.defineProperty(globalThis,"localStorage",before);else Reflect.deleteProperty(globalThis,"localStorage");}
});
