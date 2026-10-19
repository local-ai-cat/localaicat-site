(function(root){
const duration=3600,chapterLength=300;
const names=['Mallow','Juniper','Velvet','Clover','Luma','Pebble','Sorbet','Echo','Miso','Nimbus','Mochi','Nova'];
const kinds=['garden','signal','parcel','comet','relay','fuel','nap','home'];
const ruinsProbability=0.02;
const encounterRates={ruins:ruinsProbability,arcade:.09,farm:.12,garage:.05};
const palettes=[['#453254','#82669c','#bca0ee'],['#233f48','#466b72','#7adbcf'],['#493547','#885775','#e9a0ce'],['#473d31','#807054','#edc986']];
const antics={garden:['water','firefly'],signal:['listen','wave'],parcel:['pounce','unpack'],comet:['stargaze','hop'],relay:['listen','dish'],fuel:['repair','groom'],nap:['nap','stretch'],home:['flag','wave'],ruins:['trace','stargaze'],arcade:['dance','dance'],farm:['water','harvest'],garage:['watchFlip','watchFlip']};
const actionNames={trace:'Read an ancient pawprint',water:'Water a moon flower',unpack:'Unpack a tiny telescope',dish:'Tune a satellite dish',repair:'Check the fuel connection',flag:'Plant a little paw flag',rover:'Take the moon rover for a spin',golf:'One small putt for catkind',sniff:'Inspect a mysterious flower',firefly:'Chase a little firefly',listen:'A quick call home',wave:'Wave to the universe',pounce:'Pounce on a delivery',stargaze:'Make a tiny wish',hop:'Try the local gravity',stretch:'A very important stretch',groom:'Polish the space helmet',nap:'Sneak in a power nap'};
function random(seed){let n=seed>>>0;n=Math.imul(n^(n>>>16),0x21f0aaad);n=Math.imul(n^(n>>>15),0x735a2d97);n=(n^(n>>>15))>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
Object.assign(actionNames,{dance:'A small step. An excellent dance.',harvest:'Harvest the moon carrots',watchFlip:'One very unnecessary Roadster flip'});
function encounterKind(roll){
 let threshold=0;
 for(const [kind,chance] of Object.entries(encounterRates)){threshold+=chance;if(roll<threshold)return kind;}
 return kinds[Math.min(kinds.length-1,Math.floor((roll-threshold)/(1-threshold)*kinds.length))];
}
function destination(seed,leg,options={}){
 const r=random((seed^Math.imul(leg+2,2654435761))>>>0);
 const encounter=r();
 const kind=options.kind||encounterKind(encounter);
 const world={name:names[Math.floor(r()*names.length)]+' '+(1+Math.floor(r()*99)),kind,palette:palettes[Math.floor(r()*palettes.length)],moons:1+Math.floor(r()*3),biome:['crater','crystal','dunes','ocean'][Math.floor(r()*4)],rings:r()>.45,tilt:(r()-.5)*.26,terrain:Array.from({length:24},()=>r()),stars:Array.from({length:65},()=>[r()*960,r()*600,1+Math.floor(r()*2)])};
 const tint=Math.floor(r()*29)-14;
 world.palette=world.palette.map(hex=>'#'+hex.slice(1).match(/../g).map(part=>Math.max(0,Math.min(255,parseInt(part,16)+tint)).toString(16).padStart(2,'0')).join(''));
 world.landmarks=Array.from({length:3+Math.floor(r()*5)},(_,i)=>({x:80+i*30+r()*12,height:16+r()*48,width:22+r()*45}));
 world.ringWidth=.035+r()*.045;
 world.textureScale=.7+r()*.9;
 const choices=[...new Set([...antics[world.kind],'hop','groom','rover','golf'])];
 // Every visit has three distinct moments, beginning with one suited to its encounter.
 const first=antics[world.kind][Math.floor(r()*2)];
 world.actions=Array.from({length:3},(_,i)=>{
  const index=i===0?choices.indexOf(first):Math.floor(r()*choices.length);
  const type=choices.splice(index,1)[0];
  const duration=type==='watchFlip'?18:9+Math.floor(r()*6);
  return {start:130+i*48+Math.floor(r()*14),duration,type};
 });
 // A separate seeded stream keeps these details stable without tying them to terrain colours.
 const details=random(seed^Math.imul(leg+19,2246822519));
 world.encounter={accent:['#e9a0ce','#7adbcf','#edc986'][Math.floor(details()*3)],cropCount:5+Math.floor(details()*4),carX:190+details()*35,danceBeat:.5+details()*.2};
 world.flyby=details()<.035?{start:27+details()*5,duration:29,altitude:135+details()*35}:null;
 // The handset comes out occasionally on any world, after its own local activity.
 // Keep the first encounter intact and leave room to put the phone away before boarding.
 if(!world.actions.some(action=>action.type==='listen')&&details()<.24){
  world.actions[2]={...world.actions[2],type:'listen',duration:24};
 }
 for(const action of world.actions)if(action.type==='listen')action.duration=24;
 return world;
}
function state(time){const absolute=Math.max(0,time),leg=Math.floor(absolute/chapterLength),local=absolute%chapterLength;let phase='rest',progress=0;if(local<20){phase='launch';progress=local/20;}else if(local<65){phase='cruise';progress=(local-20)/45;}else if(local<85){phase='landing';progress=(local-65)/20;}else if(local<115){phase='explore';progress=(local-85)/30;}else if(local>=280){phase='boarding';progress=(local-280)/20;}return{seconds:absolute%duration,index:leg%12,leg,local,phase,progress,active:phase!=='rest'};}
// Choreography is sampled from voyage time, so pausing, scrubbing and replaying agree.
const tetherTiming={touchdown:85,unclip:87,stowed:92,explored:115,return:280,atShip:288,hooked:291,clear:298,launch:300};
const crewMarks={landing:376,exploring:323,hook:412};
function progressBetween(time,start,end){return smooth(Math.max(0,Math.min(1,(time-start)/(end-start))));}
function crewSequence(time){
 const s=state(time),t=s.local,T=tetherTiming;
 let x=crewMarks.landing,extension=1,attached=true,stage='spacewalk',walking=0,reach=0;
 if(t>=T.touchdown&&t<T.unclip){stage='unclipping';reach=Math.sin(progressBetween(t,T.touchdown,T.unclip)*Math.PI);}
 else if(t>=T.unclip&&t<T.stowed){stage='reeling';attached=false;extension=1-progressBetween(t,T.unclip,T.stowed);}
 else if(t>=T.stowed&&t<T.explored){
  stage='exploring';attached=false;extension=0;
  const p=progressBetween(t,T.stowed,T.explored);x=crewMarks.landing+(crewMarks.exploring-crewMarks.landing)*p;walking=Math.sin(p*Math.PI);
 }else if(t>=T.explored&&t<T.return){stage='exploring';x=crewMarks.exploring;attached=false;extension=0;}
 else if(t>=T.return&&t<T.atShip){
  stage='returning';attached=false;extension=0;
  const p=progressBetween(t,T.return,T.atShip);x=crewMarks.exploring+(crewMarks.hook-crewMarks.exploring)*p;walking=Math.sin(p*Math.PI);
 }else if(t>=T.atShip&&t<T.hooked){
  stage='hooking';x=crewMarks.hook;attached=false;
  extension=progressBetween(t,T.atShip,T.hooked);reach=Math.sin(extension*Math.PI);
 }else if(t>=T.hooked&&t<T.clear){
  stage='walking-clear';
  const p=progressBetween(t,T.hooked,T.clear);x=crewMarks.hook+(crewMarks.landing-crewMarks.hook)*p;walking=Math.sin(p*Math.PI);
 }else if(t>=T.clear){stage='ready';}
 return {x,extension,attached,stage,reach,walking,lift:Math.abs(Math.sin(t*4))*1.8*walking};
}
function tetherGeometry(crew,cat,ship,angle=0){
 // The reel is fixed to the hull and rotates with the rocket, never with the planet.
 const port={x:ship.x+18-10*Math.cos(angle)-4*Math.sin(angle),y:ship.y+24-10*Math.sin(angle)+4*Math.cos(angle)};
 const clip={x:cat.x+45,y:cat.y+25};
 const end={x:port.x+(clip.x-port.x)*crew.extension,y:port.y+(clip.y-port.y)*crew.extension};
 const slack=Math.min(16,Math.abs(clip.x-port.x)*.22)*crew.extension;
 return {port,end,control:{x:(port.x+end.x)/2,y:Math.max(port.y,end.y)+slack},visible:crew.extension>0};
}
function actionAt(world,local){return world.actions.find(a=>local>=a.start&&local<a.start+a.duration)||null;}
// Only established bases have somewhere to connect the ship. Other worlds stay wild.
function fuelDepot(world){
 if(world.kind==='home')return {label:'CAT HQ',x:548};
 if(world.kind==='fuel')return {label:'OUTPOST',x:548};
 return null;
}
function fuelService(world,local){
 const depot=fuelDepot(world);
 // Dock after touchdown and disconnect before boarding for the next launch.
 return {depot,connected:Boolean(depot)&&local>=91&&local<275};
}
function pose(world,local){
 const action=actionAt(world,local),result={x:0,lift:0,angle:0,scaleY:1,action,progress:0};if(!action)return result;
 const p=(local-action.start)/action.duration,envelope=Math.sin(p*Math.PI);result.progress=p;
 if(action.type==='hop'||action.type==='pounce'){result.lift=Math.abs(Math.sin(p*Math.PI*3))*23*envelope;if(action.type==='pounce')result.x=Math.sin(p*Math.PI*2)*24;}
 if(action.type==='sniff'){result.x=-envelope*20;result.angle=-envelope*.17;}
 if(action.type==='firefly'){result.x=Math.sin(p*Math.PI*2)*30;result.lift=Math.max(0,Math.sin(p*Math.PI*4))*9*envelope;}
 if(action.type==='rover')result.x=Math.sin(p*Math.PI*2)*78;
 if(action.type==='golf')result.angle=-Math.sin(Math.min(1,p*3)*Math.PI)*.12;
 if(action.type==='listen')result.angle=Math.sin(p*Math.PI*3)*.14*envelope;
 if(action.type==='stretch'){result.scaleY=1+envelope*.15;result.angle=envelope*.07;}
 if(action.type==='nap')result.scaleY=1-envelope*.25;
 if(action.type==='dance'){result.x=Math.sin(p*Math.PI*12)*6*envelope;result.lift=Math.max(0,Math.sin(p*Math.PI*12))*8*envelope;result.angle=Math.sin(p*Math.PI*12)*.12*envelope;}
 if(action.type==='harvest'){result.angle=-envelope*.18;result.x=-envelope*7;}
 if(action.type==='watchFlip')result.angle=-envelope*.06;
 return result;
}
// Keep the parked car present before/after the stunt. Rotation begins only after lift-off.
function stuntPose(world,local){
 const action=world.actions.find(a=>a.type==='watchFlip');
 const result={x:world.encounter.carX,lift:0,angle:0,thrust:0};
 if(!action||local<=action.start||local>=action.start+action.duration)return result;
 const p=(local-action.start)/action.duration;
 result.lift=126*Math.sin(p*Math.PI)**2;
 result.angle=-Math.PI*2*smooth(Math.max(0,Math.min(1,(p-.2)/.6)));
 result.thrust=Math.sin(p*Math.PI);
 return result;
}
function flybyPose(world,local){
 const event=world.flyby;if(!event||local<event.start||local>event.start+event.duration)return null;
 const p=(local-event.start)/event.duration;
 return {x:-220+p*1400,y:event.altitude-45*Math.sin(p*Math.PI),angle:-.14+Math.sin(p*Math.PI*2)*.035};
}
function delay(time,{playing=true,visible=true,reduced=false,still=false,low=false,speed=1,world=null,ambient=false}={}){
 if(!playing||!visible||reduced||still)return null;
 const s=state(time);if(s.active||(world&&actionAt(world,s.local)))return 1000/(low?6:12);
 const next=world?.actions.find(a=>a.start>s.local)?.start??280;
 const sleep=(Math.min(next,280)-s.local)*1000/speed;
 return ambient?Math.min(sleep,1000/6):sleep;
}
function smooth(value){return value*value*(3-2*value);}
function interpolate(from,to,progress){const result={};for(const key of Object.keys(from))result[key]=from[key]+(to[key]-from[key])*progress;return result;}
// Both worlds exist throughout travel. Shared endpoints keep the camera continuous.
function travelLayout(time){
 const s=state(time),p=smooth(s.progress);
 const surface={cx:320,cy:750,rx:600,ry:360};
 const departed={cx:60,cy:390,rx:82,ry:82};
 const distant={cx:1040,cy:270,rx:8,ry:8};
 const arrival={cx:500,cy:400,rx:100,ry:100};
 let origin={cx:-170,cy:390,rx:8,ry:8},destination=surface,angle=0;
 if(s.phase==='launch'){origin=interpolate(surface,departed,p);destination=distant;angle=p*Math.PI/2;}
 if(s.phase==='cruise'){origin=interpolate(departed,origin,p);destination=interpolate(distant,arrival,p);angle=Math.PI/2;}
 if(s.phase==='landing'){destination=interpolate(arrival,surface,p);angle=(1-p)*Math.PI/2;}
 return {origin,destination,angle};
}
const surfacePose={cx:320,cy:750,rx:600,ry:360};
function surfaceY(profile,x,{cx=320,cy=750,rx=600,ry=360}=surfacePose){
 const column=Math.max(0,Math.min(profile.length-1,(x-(cx-rx))/(rx*2)*profile.length));
 const left=Math.floor(column),right=Math.min(profile.length-1,left+1);
 const height=profile[left]+(profile[right]-profile[left])*(column-left);
 return cy-ry+height/profile.length*ry*2;
}
// Keep the flight path clear of the growing globe, not just the final landing plane.
function clearanceY(profile,x,y,bottom,pose,clearance=0){
 if(x<pose.cx-pose.rx||x>pose.cx+pose.rx)return y;
 return Math.min(y,surfaceY(profile,x,pose)-bottom-clearance);
}
// Landmarks use the same local coordinate system as the planet, at every scale.
function projectPoint(point,pose){return {x:pose.cx+(point.x-surfacePose.cx)*pose.rx/surfacePose.rx,y:pose.cy+(point.y-surfacePose.cy)*pose.ry/surfacePose.ry};}
root.SpaceStory={crewSequence,tetherGeometry,tetherTiming,crewMarks,travelLayout,duration,destination,state,delay,actionAt,pose,surfaceY,actionNames,projectPoint,surfacePose,ruinsProbability,clearanceY,encounterRates,stuntPose,flybyPose,fuelDepot,fuelService};
})(globalThis);
