import test from 'node:test';
import assert from 'node:assert/strict';
import '../public/space-demo/story-engine.js';
import '../public/space-demo/voyage-fuel.js';
import '../public/space-demo/rocket-renderer.js';
import '../public/space-demo/world-renderer.js';

const {createRoute,settings}=globalThis.SpaceVoyageFuel;
const story=globalThis.SpaceStory,rocket=globalThis.SpaceRocket,renderer=globalThis.SpaceWorld;

test('long seeded expeditions divert to fuel before empty, then depart full',()=>{
 for(let seed=0;seed<50;seed++){
  const route=createRoute(seed);
  let lastDeparture=100,refuels=0;
  for(let leg=0;leg<150;leg++){
   const visit=route.plan(leg),world=route.world(leg),start=leg*300;
   assert.equal(visit.departure,lastDeparture);
   assert.ok(visit.arrival>0&&visit.arrival<visit.departure);
   assert.equal(Boolean(story.fuelDepot(world)),visit.refuel);
   assert.equal(visit.refuel,visit.arrival<=settings.reserve);
   if(visit.refuel){
    refuels++;
    assert.equal(route.sample(start+239).chargePercent,100);
    assert.equal(route.sample(start+274).power,'pluggedIn');
   }else assert.equal(route.sample(start+239).chargePercent,visit.arrival);
   lastDeparture=route.sample(start+299.999).chargePercent;
  }
  assert.ok(refuels>25&&refuels<60);
 }
});

test('tank drains only in flight and fills only during a connected depot visit',()=>{
 const route=createRoute(4);
 for(let leg=0;leg<12;leg++){
  const start=leg*300,visit=route.plan(leg);
  let last=route.sample(start).chargePercent;
  for(let local=.5;local<300;local+=.5){
   const sample=route.sample(start+local),world=route.world(leg);
   const connected=story.fuelService(world,local).connected;
   assert.ok(sample.chargePercent>0&&sample.chargePercent<=100);
   if(local<=85)assert.ok(sample.chargePercent<last);
   else if(visit.refuel&&local>91&&local<=239){
    assert.ok(sample.chargePercent>last);assert.ok(connected);
   }else assert.equal(sample.chargePercent,last);
   assert.equal(sample.power==='charging',visit.refuel&&local>=91&&local<239);
   if(!connected)assert.equal(sample.power,'battery');
   last=sample.chargePercent;
  }
  const before=route.sample(start+299.999),after=route.sample(start+300);
  assert.equal(before.chargePercent,after.chargePercent,'no magic refill at a chapter boundary');
 }
});

test('seeking, cache eviction and repeated frames preserve the exact planet and tank',()=>{
 const a=createRoute(42),b=createRoute(42);
 const times=[0,35,91,139,239,299.999,300,650,990,3599,3600,300*100,35,300*100];
 for(const time of times){
  const leg=story.state(time).leg;
  assert.deepEqual(a.sample(time),b.sample(time));
  assert.deepEqual(a.world(leg),b.world(leg));
 }
 const reference=createRoute(42);
 assert.deepEqual(a.sample(35),reference.sample(35));
 assert.deepEqual(a.world(0),reference.world(0));
 assert.notDeepEqual(a.world(0),createRoute(43).world(0));
 const refuelLeg=Array.from({length:6},(_,i)=>i).find(i=>a.plan(i).refuel);
 assert.equal(a.world(refuelLeg),a.world(refuelLeg),'same object during approach, landing and departure');
 assert.equal(a.world(refuelLeg).actions[0].type==='repair'||a.world(refuelLeg).actions[0].type==='groom'||a.world(refuelLeg).kind==='home',true);
});

test('visible rocket tank gains rows during refuelling and loses them during travel',()=>{
 const route=createRoute(4);
 let leg=0;while(!route.plan(leg).refuel)leg++;
 const rows=local=>rocket.frame(route.sample(leg*300+local)).filledRows;
 assert.ok(rows(92)<rows(164));assert.ok(rows(164)<rows(239));
 assert.equal(rows(239),7);
 const departure=leg*300+300;
 assert.ok(rocket.frame(route.sample(departure)).filledRows>rocket.frame(route.sample(departure+85)).filledRows);
});

test('fuel packet goes pump to ship and up the cable into its tank',()=>{
 const port={x:534,y:367},ship={x:502.25,y:391.25};
 assert.deepEqual(renderer.fuelFlowPoint(port,ship,0),port);
 let lastX=port.x;
 for(let t=0;t<2.8;t+=.1){const point=renderer.fuelFlowPoint(port,ship,t);assert.ok(point.x<=lastX);lastX=point.x;}
 const bottom=renderer.fuelFlowPoint(port,ship,2.8),elbow=renderer.fuelFlowPoint(port,ship,3.6),inlet=renderer.fuelFlowPoint(port,ship,3.999);
 assert.ok(Math.abs(bottom.x-ship.x)<1e-9&&Math.abs(bottom.y-ship.y)<1e-9);
 assert.ok(elbow.y<bottom.y&&inlet.x<elbow.x);
 assert.equal(inlet.y,elbow.y);
 const pixels=rocket.frame({power:'charging'},.5,{chargingPulse:false}).pixels;
 assert.ok(pixels.some(p=>p.role==='c'));
 assert.equal(pixels.some(p=>p.role==='pulse'),false,'no second packet competing with the hose animation');
});

test('a pinned home seed fixes only the Cat HQ the voyage leaves from',()=>{
 const first=createRoute(11,{homeSeed:7}),second=createRoute(4242,{homeSeed:7});
 assert.deepEqual(first.world(-1),second.world(-1));
 assert.deepEqual(first.world(-1),createRoute(7).world(-1));
 assert.equal(first.world(-1).kind,'home');
 assert.notDeepEqual(first.world(0),second.world(0));
 assert.deepEqual(first.world(0),createRoute(11).world(0),'the stops themselves still follow the route seed');
});
