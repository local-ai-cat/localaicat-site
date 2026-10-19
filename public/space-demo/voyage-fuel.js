// Fictional expedition fuel. Device battery telemetry stays in SpaceRocket.
(function(root){
const settings=Object.freeze({full:100,reserve:27,minBurn:17,maxBurn:27,touchdown:85,fillStart:91,fillEnd:239,cacheSize:64});
const wildKinds=['garden','signal','parcel','comet','relay','nap'];
function roll(seed,leg,salt){
 let n=(seed^Math.imul(leg+2,2654435761)^salt)>>>0;
 n=Math.imul(n^(n>>>16),0x21f0aaad);n=Math.imul(n^(n>>>15),0x735a2d97);
 return ((n^(n>>>15))>>>0)/4294967296;
}
function createRoute(seed){
 const cache=new Map();
 let latest=-1,departure=settings.full;
 function plan(leg){
  if(!Number.isSafeInteger(leg)||leg<0)throw new RangeError('A voyage leg must be a non-negative integer');
  if(cache.has(leg))return cache.get(leg);
  // Old review seeks replay compact fuel decisions, not every planet's artwork.
  if(leg<latest){cache.clear();latest=-1;departure=settings.full;}
  while(latest<leg){
   latest++;
   const burn=settings.minBurn+roll(seed,latest,0x6275726e)*(settings.maxBurn-settings.minBurn);
   const arrival=departure-burn,refuel=arrival<=settings.reserve;
   const next={leg:latest,departure,arrival,burn,refuel};
   cache.set(latest,next);
   if(cache.size>settings.cacheSize)cache.delete(cache.keys().next().value);
   departure=refuel?settings.full:arrival;
  }
  return cache.get(leg);
 }
 function world(leg){
  if(leg<0)return root.SpaceStory.destination(seed,leg,{kind:'home'});
  const visit=plan(leg);
  if(visit.world)return visit.world;
  const candidate=root.SpaceStory.destination(seed,leg);
  let kind=candidate.kind;
  if(visit.refuel){
   kind=roll(seed,leg,0x6465706f)<.35?'home':'fuel';
  }else if(root.SpaceStory.fuelDepot(candidate)){
   kind=wildKinds[Math.floor(roll(seed,leg,0x77696c64)*wildKinds.length)];
  }
  visit.world=kind===candidate.kind?candidate:root.SpaceStory.destination(seed,leg,{kind});
  return visit.world;
 }
 function sample(time){
  const s=root.SpaceStory.state(time),visit=plan(s.leg),destination=world(s.leg);
  const flightProgress=Math.min(1,s.local/settings.touchdown);
  let chargePercent=visit.departure-visit.burn*flightProgress;
  const fillProgress=Math.max(0,Math.min(1,(s.local-settings.fillStart)/(settings.fillEnd-settings.fillStart)));
  if(visit.refuel)chargePercent+=(settings.full-visit.arrival)*fillProgress;
  let power='battery';
  if(root.SpaceStory.fuelService(destination,s.local).connected){
   power=fillProgress<1?'charging':'pluggedIn';
  }
  return {chargePercent,power,cpuFraction:s.local<settings.touchdown?.35:null,refuel:visit.refuel};
 }
 return {plan,world,sample};
}
root.SpaceVoyageFuel={createRoute,settings};
})(globalThis);
