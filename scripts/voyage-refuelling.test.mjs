import test from 'node:test';
import assert from 'node:assert/strict';
import '../public/space-demo/story-engine.js';
import '../public/space-demo/rocket-renderer.js';
import '../public/space-demo/world-renderer.js';

const story=globalThis.SpaceStory,rocket=globalThis.SpaceRocket,renderer=globalThis.SpaceWorld;
const worlds=new Map();
for(let seed=0;seed<1000;seed++){
 const world=story.destination(seed,0);
 worlds.set(world.kind,world);
}
const phases=[0,19.99,20,64.99,65,84.99,85,90.99,91,130,274.99,275,280,299.99];

test('charging telemetry never produces a flight cable or refuelling on an unserviced planet',()=>{
 assert.equal(worlds.size,12);
 for(const world of worlds.values())for(const local of phases)for(const power of ['battery','pluggedIn','charging']){
  const phase=story.state(local).phase,grounded=['explore','rest','boarding'].includes(phase);
  const input={chargePercent:53,power,energyMode:'highPower',cpuFraction:.8};
  const visual=rocket.voyageState(input,{grounded,connected:story.fuelService(world,local).connected});
  const eligible=['home','fuel'].includes(world.kind)&&local>=91&&local<275;
  const frame=rocket.frame(visual,.5);
  assert.equal(visual.power,eligible?power:'battery',`${world.kind} ${phase} ${power}`);
  assert.equal(frame.pixels.some(p=>p.role==='c'),eligible&&power!=='battery');
  assert.equal(frame.pixels.some(p=>p.role==='pulse'),eligible&&power==='charging');
  assert.equal(frame.pixels.some(p=>p.role==='flame'),!grounded);
  assert.equal(visual.chargePercent,53);
  assert.equal(frame.fuelTint,'highPower');
  assert.equal(input.power,power,'visual state must not overwrite device telemetry');
 }
});

test('only Cat HQ and outposts have a permanent fuel pump',()=>{
 const art={surface:Array(512).fill(0)};
 for(const world of worlds.values()){
  const commands=[];
  const ctx=new Proxy({}, {get:(_,key)=>(...args)=>commands.push([key,...args]),set:()=>true});
  renderer.drawScenery(ctx,world,art,0);
  const signs=commands.filter(([op])=>op==='fillText').map(([,label])=>label);
  if(world.kind==='home')assert.ok(signs.includes('CAT HQ'));
  else if(world.kind==='fuel')assert.ok(signs.includes('OUTPOST'));
  else assert.equal(renderer.depotPort(world,art),null);
  assert.equal(signs.length,['home','fuel'].includes(world.kind)?1:0);
 }
});

test('fuel hose joins the ship to the actual pump port and only flows while charging',()=>{
 const world=worlds.get('home'),art={surface:Array(512).fill(0)},ship={x:502.25,y:391.25};
 for(const power of ['battery','pluggedIn','charging']){
  const commands=[];
  const ctx=new Proxy({}, {get:(_,key)=>(...args)=>commands.push([key,...args]),set:()=>true});
  renderer.drawFuelHose(ctx,world,art,ship,.5,power);
  if(power==='battery'){assert.equal(commands.length,0);continue;}
  assert.deepEqual(commands.find(([op])=>op==='moveTo'),['moveTo',ship.x,ship.y]);
  const port=renderer.depotPort(world,art);
  assert.deepEqual(commands.find(([op])=>op==='quadraticCurveTo').slice(-2),[port.x,port.y]);
  assert.equal(commands.some(([op])=>op==='fillRect'),power==='charging');
 }
});

test('depot visits do not invent charge, and flight keeps critical battery and low-power colours',()=>{
 assert.equal(rocket.voyageState({}, {grounded:true,connected:true}).power,'battery');
 for(const [percent,mode,tint] of [[8,'highPower','critical'],[50,'lowPower','lowPower']]){
  const visual=rocket.voyageState({chargePercent:percent,energyMode:mode,power:'charging'},{grounded:false,connected:true});
  assert.equal(visual.power,'battery');
  assert.equal(rocket.frame(visual).fuelTint,tint);
 }
});
