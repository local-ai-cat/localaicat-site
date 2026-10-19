import test from 'node:test';
import assert from 'node:assert/strict';
import '../public/space-demo/story-engine.js';
const story=globalThis.SpaceStory;
test('journey progresses through travel, landing, exploration and rest',()=>{assert.equal(story.state(0).phase,'launch');assert.equal(story.state(20).phase,'cruise');assert.equal(story.state(65).phase,'landing');assert.equal(story.state(85).phase,'explore');assert.equal(story.state(115).phase,'rest');assert.equal(story.state(280).phase,'boarding');assert.equal(story.state(300).leg,1);assert.equal(story.state(3600).leg,12);});
test('seeded destinations reproduce and successive hours generate new worlds',()=>{assert.deepEqual(story.destination(42,0),story.destination(42,0));assert.notDeepEqual(story.destination(42,0),story.destination(43,0));assert.notDeepEqual(story.destination(42,0),story.destination(42,12));});
test('rest sleeps until boarding and active render stays capped',()=>{assert.equal(story.delay(115),165000);assert.equal(story.delay(115,{speed:20}),8250);assert.equal(story.delay(0),1000/12);assert.equal(story.delay(0,{low:true}),1000/6);for(const o of [{playing:false},{visible:false},{reduced:true},{still:true}])assert.equal(story.delay(0,o),null);});
test('generated antics stay inside the visit, never overlap, and return to a neutral pose',()=>{
 for(let seed=0;seed<100;seed++){
  const w=story.destination(seed,seed%12);assert.equal(w.actions.length,3);assert.equal(new Set(w.actions.map(a=>a.type)).size,3);
  for(let i=0;i<w.actions.length;i++){
   const a=w.actions[i];assert.ok(a.start>=115&&a.start+a.duration<280);assert.ok(story.actionNames[a.type]);
   if(i)assert.ok(a.start>w.actions[i-1].start+w.actions[i-1].duration);
   assert.equal(story.actionAt(w,a.start).type,a.type);
   assert.equal(story.actionAt(w,a.start+a.duration),null);
   assert.equal(story.pose(w,a.start+a.duration).lift,0);
  }
 }
});
test('scheduler wakes for an antic then sleeps until the next one',()=>{
 const w=story.destination(12,2),a=w.actions[0];
 assert.equal(story.delay(115,{world:w}),(a.start-115)*1000);
 assert.equal(story.delay(a.start+.1,{world:w}),1000/12);
 assert.equal(story.delay(a.start+.1,{world:w,low:true}),1000/6);
 assert.equal(story.delay(a.start+.1,{world:w,reduced:true}),null);
 const end=w.actions[2].start+w.actions[2].duration;
 assert.equal(story.delay(end,{world:w}),(280-end)*1000);
});
test('surface contacts track the sampled texture rather than a fixed horizontal line',()=>{
 const profile=[6,3,2,5];
 assert.equal(story.surfaceY(profile,0,{cx:2,cy:4,rx:2,ry:2}),8);
 assert.equal(story.surfaceY(profile,2,{cx:2,cy:4,rx:2,ry:2}),4);
 assert.equal(story.surfaceY(profile,3,{cx:2,cy:4,rx:2,ry:2}),7);
});
test('planet camera and ship angle are continuous at every travel boundary',()=>{
 for(const boundary of [20,65,85]){
  const before=story.travelLayout(boundary-0.00001),after=story.travelLayout(boundary);
  for(const planet of ['origin','destination'])for(const key of ['cx','cy','rx','ry'])assert.ok(Math.abs(before[planet][key]-after[planet][key])<0.01,`${boundary} ${planet} ${key}`);
  assert.ok(Math.abs(before.angle-after.angle)<0.001);
 }
});
test('approach grows the same destination monotonically into its landing surface',()=>{
 let radius=0;
 for(let time=20;time<=85;time+=.5){const pose=story.travelLayout(time);assert.ok(pose.destination.rx>=radius);radius=pose.destination.rx;}
 assert.equal(story.travelLayout(20).destination.rx,8);assert.equal(story.travelLayout(85).destination.rx,600);
 assert.deepEqual(story.travelLayout(300).origin,story.travelLayout(299).destination);
});
test('each encounter has a specific activity in its generated visit',()=>{
 const expected={arcade:['dance'],farm:['water','harvest'],garage:['watchFlip'],garden:['water','firefly'],signal:['listen','wave'],parcel:['pounce','unpack'],comet:['stargaze','hop'],relay:['listen','dish'],fuel:['repair','groom'],nap:['nap','stretch'],home:['flag','wave'],ruins:['trace','stargaze']};
 for(let seed=0;seed<100;seed++){const w=story.destination(seed,0);assert.ok(expected[w.kind].includes(w.actions[0].type));}
});

test('ambient motion stays capped and all suspension preferences still stop it',()=>{
 assert.equal(story.delay(120,{ambient:true}),1000/6);
 assert.equal(story.delay(30,{ambient:true}),1000/12);
 for(const stop of [{playing:false},{visible:false},{reduced:true},{still:true}]){
  assert.equal(story.delay(120,{ambient:true,...stop}),null);
  assert.equal(story.delay(30,{ambient:true,...stop}),null);
 }
});
test('pyramid encounters occur, have specific antics, and routes do not repeat after an hour',()=>{
 const ruins=[];
 for(let seed=0;seed<200;seed++)if(story.destination(seed,0).kind==='ruins')ruins.push(seed);
 assert.ok(ruins.length>0&&ruins.length<15);
 for(const seed of ruins){
  const world=story.destination(seed,0);
  assert.ok(['trace','stargaze'].includes(world.actions[0].type));
  assert.notDeepEqual(world,story.destination(seed,12));
 }
});
