import test from 'node:test';
import assert from 'node:assert/strict';
import '../public/space-demo/story-engine.js';
import '../public/space-demo/world-renderer.js';
import '../public/space-demo/rocket-renderer.js';
const story=globalThis.SpaceStory,worldRenderer=globalThis.SpaceWorld,rocket=globalThis.SpaceRocket;
function recorder(){
 const commands=[];
 const ctx=new Proxy({}, {get(_,key){return (...args)=>commands.push([key,...args]);},set(_,key,value){commands.push([key,value]);return true;}});
 return {ctx,commands};
}
const art={surface:Array.from({length:512},(_,x)=>256-Math.sqrt(Math.max(0,248**2-(x-256)**2)))};
test('every world draws exactly the same local scenery at every travel scale, with no clipping or ring threshold',()=>{
 for(let seed=0;seed<250;seed++){
  const world=story.destination(seed,0);let reference;
  for(const radius of [8,82,100,129,130,131,300,600]){
   const {ctx,commands}=recorder();worldRenderer.draw(ctx,world,art,{cx:320,cy:750,rx:radius,ry:radius*.6});
   const painting=commands.filter(([operation])=>!['translate','scale'].includes(operation));
   if(reference)assert.deepEqual(painting,reference);else reference=painting;
   assert.ok(!commands.some(([operation])=>operation==='clip'));
   const rings=commands.filter(([operation,...args])=>operation==='ellipse'&&args[2]===930);
   assert.equal(rings.length,world.rings?2:0);
  }
 }
});
test('all landmark anchors are continuous through flight boundaries, including the next visit',()=>{
 const epsilon=.00001;
 for(const seed of [1,42,285,876,3000]){
  const world=story.destination(seed,0);
  for(const landmark of world.landmarks){
   const anchor={x:landmark.x,y:story.surfaceY(art.surface,landmark.x)-landmark.height};
   for(const boundary of [20,65,85])for(const key of ['origin','destination']){
    const a=story.projectPoint(anchor,story.travelLayout(boundary-epsilon)[key]);
    const b=story.projectPoint(anchor,story.travelLayout(boundary)[key]);
    assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.001);
   }
   assert.deepEqual(story.projectPoint(anchor,story.travelLayout(300-epsilon).destination),story.projectPoint(anchor,story.travelLayout(300).origin));
  }
 }
});
test('pyramids are a rare encounter across seeds and long running expeditions',()=>{
 let ruins=0;const signatures=new Set();
 for(let i=0;i<10000;i++){
  const world=story.destination(42,i);
  if(world.kind==='ruins')ruins++;
  signatures.add(JSON.stringify([world.palette,world.terrain,world.landmarks,world.ringWidth]));
 }
 assert.ok(ruins>150&&ruins<250,`got ${ruins} ruins in 10000 visits`);
 assert.equal(signatures.size,10000);
 assert.deepEqual(story.destination(42,19),story.destination(42,19));
});
test('battery tank tracks charge while energy and critical colours follow the app policy',()=>{
 for(const [percent,rows] of [[0,0],[10,1],[50,4],[100,7],[null,7]]){
  const frame=rocket.frame({chargePercent:percent});
  assert.equal(frame.filledRows,rows);
  assert.equal(frame.pixels.filter(p=>p.role==='u').length,rows*6);
 }
 assert.equal(rocket.frame({chargePercent:8,energyMode:'highPower'}).fuelTint,'critical');
 assert.equal(rocket.frame({chargePercent:8,energyMode:'lowPower'}).hullTint,'critical');
 assert.equal(rocket.frame({chargePercent:20}).fuelTint,'neutral');
 assert.equal(rocket.frame({chargePercent:50,energyMode:'lowPower'}).fuelTint,'lowPower');
 assert.equal(rocket.frame({chargePercent:50,energyMode:'highPower'}).fuelTint,'highPower');
 assert.equal(rocket.frame({chargePercent:50,power:'charging',energyMode:'highPower'}).fuelTint,'highPower');
});
test('on battery, connected paused and charging remain visually distinct even when still',()=>{
 const battery=rocket.frame({power:'battery'}).pixels,plugged=rocket.frame({power:'pluggedIn'}).pixels,charging=rocket.frame({power:'charging'}).pixels;
 assert.ok(!battery.some(p=>p.role==='c'||p.role==='pulse'));
 assert.ok(plugged.some(p=>p.role==='c'));assert.ok(!plugged.some(p=>p.role==='pulse'));
 assert.ok(charging.some(p=>p.role==='pulse'));
 assert.ok(charging.filter(p=>p.role==='c').every(p=>p.y<=15));
 assert.notDeepEqual(charging,rocket.frame({power:'charging'},.2).pixels);
});
test('unavailable or invalid telemetry never fabricates a percentage or CPU load',()=>{
 assert.deepEqual(rocket.normalize({chargePercent:NaN,power:'sunshine',cpuFraction:Infinity}),{chargePercent:null,power:'battery',energyMode:'automatic',cpuFraction:null});
 assert.equal(rocket.normalize({chargePercent:-10}).chargePercent,0);
 assert.equal(rocket.normalize({chargePercent:200}).chargePercent,100);
 assert.ok(!rocket.frame({}).pixels.some(p=>p.role==='flame'));
});

test('the approaching surface cannot overtake the cat or ship before touchdown',()=>{
 for(let t=65;t<=85;t+=.05){
  const pose=story.travelLayout(t).destination;
  for(const [x,bottom] of [[400,48],[478,47.5]]){
   const y=story.clearanceY(art.surface,x,450,bottom,pose);
   assert.ok(y+bottom<=story.surfaceY(art.surface,x,pose)+1e-8);
  }
 }
});

test('flight clearance includes every rotated fin, cable and flame pixel',()=>{
 for(const power of ['battery','pluggedIn','charging'])for(const chargePercent of [0,8,52,100])for(const cpuFraction of [null,.2,.5,.9]){
  const input={power,chargePercent,cpuFraction};
  for(let angle=0;angle<=Math.PI/2;angle+=.05){
   const bounds=rocket.bounds(input,angle,2.5,.4);
   for(const pixel of rocket.frame(input,.4).pixels)for(const dx of [0,pixel.w])for(const dy of [0,pixel.h]){
    const x=-12+(pixel.x+dx)*2.5,y=-14+(pixel.y+dy)*2.5;
    const rotated=x*Math.sin(angle)+y*Math.cos(angle);
    assert.ok(rotated<=bounds.maxY+1e-8);
   }
  }
 }
});
test('a planted flag remains attached on departure, with no scenery regeneration',()=>{
 let world;
 for(let seed=0;seed<200;seed++){const candidate=story.destination(seed,0);if(candidate.actions.some(a=>a.type==='flag')){world=candidate;break;}}
 assert.ok(world);
 const a=recorder(),b=recorder();
 worldRenderer.draw(a.ctx,world,art,story.travelLayout(299).destination,299);
 worldRenderer.draw(b.ctx,world,art,story.travelLayout(315).origin,300);
 const painting=commands=>commands.filter(([op])=>!['translate','scale'].includes(op));
 assert.deepEqual(painting(a.commands),painting(b.commands));
});
