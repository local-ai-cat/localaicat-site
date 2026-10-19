import test from 'node:test';
import assert from 'node:assert/strict';
import '../public/space-demo/story-engine.js';
import '../public/space-demo/voyage-artwork.js';
import '../public/space-demo/cadet-model.js';
import '../public/space-demo/cadet-passport.js';
const story=globalThis.SpaceStory;
const art=globalThis.SpaceVoyageArtwork;
const ship={x:460,y:350};
function cableAt(time){const crew=story.crewSequence(time);return story.tetherGeometry(crew,{x:crew.x,y:350-crew.lift},ship);}
test('landing unclips then reels a loose cable completely into the rocket before exploring',()=>{
 assert.equal(story.crewSequence(85).attached,true);
 assert.equal(story.crewSequence(87).attached,false);
 let last=Infinity;
 for(let t=87;t<=92;t+=.05){
  const cable=cableAt(t),length=Math.hypot(cable.end.x-cable.port.x,cable.end.y-cable.port.y);
  assert.ok(length<=last);last=length;
  assert.equal(story.crewSequence(t).x,376);
 }
 assert.equal(cableAt(92).visible,false);
 assert.deepEqual(cableAt(92).end,cableAt(92).port);
 assert.equal(story.crewSequence(115).x,323);
});
test('departure walks to the reel, hooks on, pays out cable, then waits clear before launch',()=>{
 assert.equal(story.crewSequence(280).stage,'returning');
 assert.equal(story.crewSequence(288).x,412);
 assert.equal(story.crewSequence(288).attached,false);
 assert.equal(story.crewSequence(290).stage,'hooking');
 assert.equal(story.crewSequence(291).attached,true);
 assert.equal(story.crewSequence(295).stage,'walking-clear');
 assert.ok(story.crewSequence(295).x<story.crewSequence(291).x);
 for(const time of [298,299,300])assert.equal(story.crewSequence(time).x,376);
 assert.equal(story.state(299).phase,'boarding');
 assert.equal(story.state(300).phase,'launch');
 assert.ok(cableAt(297).port.x-cableAt(297).end.x>cableAt(291).port.x-cableAt(291).end.x);
});
test('every tether cue and chapter boundary is position-continuous and deterministic when seeking',()=>{
 for(const time of Object.values(story.tetherTiming)){
  const a=cableAt(time-1e-6),b=cableAt(time);
  assert.ok(Math.hypot(a.end.x-b.end.x,a.end.y-b.end.y)<.001,`cable jumped at ${time}`);
  assert.ok(Math.abs(story.crewSequence(time-1e-6).x-story.crewSequence(time).x)<.001);
 }
 for(const time of [86,90,95,280,288,290,295,299])assert.deepEqual(story.crewSequence(time),story.crewSequence(time+300*132));
});
test('the cable reel rotates with the hull instead of floating free during takeoff',()=>{
 for(const angle of [0,Math.PI/4,Math.PI/2]){
  const {port}=story.tetherGeometry(story.crewSequence(10),{x:376,y:350},ship,angle);
  assert.ok(Math.abs(Math.hypot(port.x-478,port.y-374)-Math.hypot(10,4))<1e-8);
 }
});
test('portable cat pixels reach the voyage unchanged, including hats above the intact helmet',()=>{
 for(const headwear of Object.keys(CadetModel.options.headwear)){
  const design=CadetPassport.decode(CadetPassport.encode({appearance:{...CadetModel.defaults(),name:'Moonbean',headwear},birthday:'2024-02-29'}));
  const pixels=art.normalize(design.pixels),marks=[];
  assert.deepEqual(pixels,design.pixels);
  const ctx={fillRect:(...args)=>marks.push(args)};art.draw(ctx,pixels,100,100,3);
  assert.ok(marks.every(([x,y,w,h])=>Number.isFinite(x+y+w+h)));
  assert.equal(Math.max(...marks.map(([,y,,h])=>y+h)),148,'feet keep the same surface anchor');
  if(headwear!=='none')assert.ok(Math.min(...marks.map(([,y])=>y))<100,'hat remains above helmet');
 }
 assert.ok(art.normalize(CadetModel.grid({}).flat()));
 for(const bad of [[],Array(576).fill('#ffffff'),[['#ffffff']],Array.from({length:16},()=>Array(16).fill('url(x)'))])assert.equal(art.normalize(bad),null);
});
