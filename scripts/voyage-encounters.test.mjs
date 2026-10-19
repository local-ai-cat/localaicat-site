import test from 'node:test';
import assert from 'node:assert/strict';
import '../public/space-demo/story-engine.js';
import '../public/space-demo/world-renderer.js';

const story=globalThis.SpaceStory;
const profile=Array.from({length:512},(_,x)=>256-Math.sqrt(Math.max(0,248**2-(x-256)**2)));
function findWorld(kind){
 for(let seed=0;seed<4096;seed++){
  const world=story.destination(seed,0);
  if(kind==='flyby'&&world.flyby)return world;
  if(world.kind===kind)return world;
 }
 throw new Error(`No generated ${kind} encounter`);
}
function record(world,pose,local){
 const commands=[];
 const ctx=new Proxy({}, {get:(_,key)=>(...args)=>commands.push([key,...args]),set:(_,key,value)=>{commands.push([key,value]);return true;}});
 globalThis.SpaceWorld.draw(ctx,world,{surface:profile},pose,local);
 return commands.filter(([op])=>!['translate','scale'].includes(op));
}

test('new encounters are occasional, pyramids stay rare, and quiet worlds remain the majority',()=>{
 const counts={ruins:0,arcade:0,farm:0,garage:0,flyby:0,ordinary:0};
 for(let leg=0;leg<10000;leg++){
  const world=story.destination(42,leg);
  if(world.kind in story.encounterRates)counts[world.kind]++;else counts.ordinary++;
  if(world.flyby)counts.flyby++;
 }
 for(const [kind,rate] of Object.entries(story.encounterRates))assert.ok(Math.abs(counts[kind]/10000-rate)<.012,`${kind}: ${counts[kind]}`);
 assert.ok(counts.ordinary>6800);
 assert.ok(counts.flyby>250&&counts.flyby<450);
});

test('encounter details, activity and flyby timing are reproducible without freezing later visits',()=>{
 const world=story.destination(29,3);
 assert.deepEqual(world,story.destination(29,3));
 assert.notDeepEqual(world.encounter,story.destination(29,15).encounter);
 for(const kind of ['arcade','farm','garage']){
  const w=findWorld(kind),action=w.actions[0];
  assert.ok({arcade:['dance'],farm:['water','harvest'],garage:['watchFlip']}[kind].includes(action.type));
  assert.ok(action.start+action.duration<w.actions[1].start);
 }
});

test('dance steps and farming poses ease in and return to the same grounded cat',()=>{
 for(const type of ['dance','harvest']){
  const w={actions:[{type,start:130,duration:12}]};
  for(const t of [130,142]){
   const pose=story.pose(w,t);
   assert.ok(Math.abs(pose.x)<1e-8&&Math.abs(pose.angle)<1e-8&&Math.abs(pose.lift)<1e-8);
  }
  const mid=story.pose(w,133.6);
  assert.ok(Math.abs(mid.x)>0);
 }
});

test('thruster car completes one flip with every chassis corner clear of the terrain',()=>{
 for(let seed=0;seed<300;seed++){
  const w=story.destination(seed,0);if(w.kind!=='garage')continue;
  const a=w.actions[0],ground=x=>story.surfaceY(profile,x);
  const support=Math.min(ground(w.encounter.carX-35),ground(w.encounter.carX+35),ground(w.encounter.carX));
  for(let t=a.start;t<=a.start+a.duration;t+=.025){
   const pose=story.stuntPose(w,t),cy=support-18-pose.lift;
   for(const [x,y] of [[-44,1],[44,1],[-41,11],[40,11],[-18,-21],[7,-21],[-35,18],[36,18]]){
    const px=pose.x+x*Math.cos(pose.angle)-y*Math.sin(pose.angle);
    const py=cy+x*Math.sin(pose.angle)+y*Math.cos(pose.angle);
    assert.ok(py<=ground(px)+.5,`seed ${seed}, time ${t}: car crossed ground`);
   }
  }
  assert.deepEqual(story.stuntPose(w,a.start-1),story.stuntPose(w,a.start+a.duration+1));
  assert.ok(Math.abs(story.stuntPose(w,a.start+a.duration*.5).angle+Math.PI)<1e-8);
 }
});

test('arcade, farm and parked car remain attached across landing and departure scales',()=>{
 for(const kind of ['arcade','farm','garage']){
  const w=findWorld(kind),full=record(w,story.surfacePose,299);
  for(const radius of [8,100,300,600]){
   assert.deepEqual(record(w,{cx:40,cy:390,rx:radius,ry:radius*.6},300),full);
  }
 }
});

test('original Roadster and its stage enter and leave fully offscreen during cruise',()=>{
 const w=findWorld('flyby'),event=w.flyby;
 assert.ok(event.start>=20&&event.start+event.duration<65);
 assert.equal(story.flybyPose(w,event.start-.01),null);
 assert.ok(story.flybyPose(w,event.start).x+100<0);
 assert.ok(story.flybyPose(w,event.start+event.duration).x-100>960);
 assert.equal(story.flybyPose(w,event.start+event.duration+.01),null);
});

test('new activities respect pause, hidden, reduced-motion and low-power frame budgets',()=>{
 for(const kind of ['arcade','farm','garage']){
  const w=findWorld(kind),time=w.actions[0].start+3;
  for(const option of [{playing:false},{visible:false},{reduced:true},{still:true}])assert.equal(story.delay(time,{world:w,...option}),null);
  assert.equal(story.delay(time,{world:w,low:true}),1000/6);
  assert.equal(story.delay(time,{world:w}),1000/12);
 }
});
