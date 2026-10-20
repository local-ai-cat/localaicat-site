import test from 'node:test';
import assert from 'node:assert/strict';
import '../public/space-demo/voyage-controls.js';
import '../public/space-demo/story-engine.js';
import '../public/space-demo/voyage-fuel.js';
import '../public/space-demo/rocket-renderer.js';
import '../public/space-demo/phone-renderer.js';

const controls=globalThis.SpaceVoyageControls;
const story=globalThis.SpaceStory;
const phone=globalThis.SpacePhone;
const rocket=globalThis.SpaceRocket;

test('the three-position throttle speeds one clock without a jump when the lever changes',()=>{
 let elapsed=0,anchor=1000,rate=controls.profile(1).rate;
 const before=controls.advance(elapsed,anchor,rate,5000);
 let next=controls.retime(elapsed,anchor,rate,5000,true,2);
 assert.equal(next.elapsed,before);
 assert.equal(next.energyMode,'highPower');
 assert.equal(controls.advance(next.elapsed,next.anchor,next.rate,6000),before+8);
 next=controls.retime(next.elapsed,next.anchor,next.rate,6000,true,0);
 assert.equal(next.elapsed,before+8);
 assert.equal(controls.advance(next.elapsed,next.anchor,next.rate,7000),before+10);
 assert.equal(next.energyMode,'lowPower');
 for(const invalid of [-1,3,1.5,'2',null,NaN])assert.equal(controls.profile(invalid).name,'Medium');
});

test('changing power while paused, hidden, editing or reduced-motion does not advance or resume the voyage',()=>{
 const next=controls.retime(82,1000,4,9000,false,2);
 assert.equal(next.elapsed,82);
 assert.equal(controls.advance(next.elapsed,next.anchor,next.rate,19000,false),82);
 const resumed=controls.retime(next.elapsed,next.anchor,next.rate,19000,false,0);
 assert.equal(controls.advance(resumed.elapsed,resumed.anchor,resumed.rate,20000,true),84);
 assert.equal(controls.advance(82,1000,4,999,true),82);
});

test('all power settings reach identical planets, fuel levels and activities after the same journey distance',()=>{
 for(let seed=0;seed<20;seed++){
  const route=globalThis.SpaceVoyageFuel.createRoute(seed);
  for(const time of [0,20,65,85,91,140,239,290,300,900,1200,3241]){
   const reference=route.sample(time);
   for(const {rate} of controls.profiles){
    const elapsed=controls.advance(0,1000,rate,1000+time/rate*1000);
    assert.equal(elapsed,time);
    assert.deepEqual(route.sample(elapsed),reference);
    assert.deepEqual(story.crewSequence(elapsed),story.crewSequence(time));
    assert.deepEqual(story.pose(route.world(story.state(elapsed).leg),elapsed%300),story.pose(route.world(story.state(time).leg),time%300));
   }
  }
 }
});

test('SVG and canvas previews use one native rocket geometry, mode palette and fuel fill',()=>{
 for(const energyMode of ['lowPower','automatic','highPower'])for(const power of ['battery','charging','pluggedIn']){
  const state={chargePercent:67,energyMode,power,cpuFraction:.8};
  const pixels=rocket.frame(state,.6).pixels;
  const svg=rocket.svg(state,.6);
  assert.equal([...svg.matchAll(/<rect /g)].length,pixels.length);
  for(const p of pixels)assert.ok(svg.includes(`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.colour}"/>`));
  for(const p of pixels)assert.ok(p.x>=0&&p.x+p.w<=17&&p.y>=0&&p.y+p.h<=21,'no clipping in the shared 18 by 22 view box');
 }
 assert.equal(rocket.colours.lowPower,'#ff9f0a');
 assert.equal(rocket.colours.highPower,'#bf5af2');
 assert.equal(rocket.frame({energyMode:'highPower',cpuFraction:1}).pixels.find(p=>p.role==='flame').colour,'#279cff');
 assert.equal(rocket.frame({chargePercent:10,energyMode:'highPower'}).fuelTint,'critical');
});

test('phone calls are occasional seeded surface activities and finish before boarding',()=>{
 let withCalls=0,withoutCalls=0,quietWorldCalls=0;
 for(let leg=0;leg<1000;leg++){
  const world=story.destination(42,leg),calls=world.actions.filter(action=>action.type==='listen');
  assert.deepEqual(world,story.destination(42,leg));
  if(calls.length)withCalls++;else withoutCalls++;
  if(calls.length&&!['relay','signal'].includes(world.kind))quietWorldCalls++;
  for(const action of calls){
   assert.ok(action.start>=115&&action.start+action.duration<280);
   assert.equal(action.duration,24);
   assert.equal(story.pose(world,action.start+12).action.type,'listen');
  }
  for(let i=1;i<world.actions.length;i++)assert.ok(world.actions[i-1].start+world.actions[i-1].duration<world.actions[i].start);
 }
 assert.ok(withCalls>200&&withCalls<550);
 assert.ok(withoutCalls>450&&quietWorldCalls>100);
});

test('native handset and paw ease into the cat’s hand and away without lingering at the boundaries',()=>{
 assert.equal(phone.rows.length,12);
 assert.ok(phone.rows.every(row=>row.length===6));
 assert.equal(phone.rows[9],'wwppp.');
 assert.equal(phone.colours.p,'#65e6ad');
 assert.equal(phone.pose(0).opacity,0);
 assert.equal(phone.pose(1).opacity,0);
 assert.equal(phone.pose(.5).opacity,1);
 assert.equal(phone.pose(.5).talking,true);
 assert.equal(phone.pose(.99).talking,false);
 assert.ok(phone.pose(.08).y>phone.pose(.5).y);
 assert.ok(phone.pose(.01).opacity<.02&&phone.pose(.99).opacity<.02);
});

test('the timeline counts on past the hour and rolls its slider into the next hour, so the voyage never ends',()=>{
 assert.equal(controls.clockLabel(5),'00:05 / ∞');
 assert.equal(controls.clockLabel(3599.9),'59:59 / ∞');
 assert.equal(controls.clockLabel(3735),'1:02:15 / ∞');
 assert.equal(controls.clockLabel(-4),'00:00 / ∞');
 assert.deepEqual(controls.timelineWindow(120),{min:0,max:3599});
 assert.deepEqual(controls.timelineWindow(3600),{min:3600,max:7199});
 assert.deepEqual(controls.timelineWindow(90061),{min:90000,max:93599});
});

test('scrolling travels forward or back through the voyage but never before the start',()=>{
 assert.equal(controls.scrub(100,400),300);
 assert.equal(controls.scrub(100,-400),0);
 assert.equal(controls.scrub(100,3,true),124);
 assert.equal(controls.scrub(1e7,2000),1e7+1000);
});
