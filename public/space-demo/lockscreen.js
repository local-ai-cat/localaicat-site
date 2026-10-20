'use strict';
let nativeCatPixels=null,catName='Space Cadet';
const CAT=['....########....','..##........##..','.#............#.','.#............#.','#...##....##...#','#...###..###...#','#...########...#','#...#..##..#...#','#...#..##..#...#','#...########...#','#...########...#','#..............#','.##..........##.','...##########...','....#......#....','....########....'];
// Generated locally with qrcode 8.2, error correction H and a four-module quiet zone.
const PROMO_QR=["0000000000000000000000000000000000000", "0000000000000000000000000000000000000", "0000000000000000000000000000000000000", "0000000000000000000000000000000000000", "0000111111100000100010101011111110000", "0000100000100011101110011010000010000", "0000101110100000101100101010111010000", "0000101110100100111111010010111010000", "0000101110101101101001010010111010000", "0000100000100010101110011010000010000", "0000111111101010101010101011111110000", "0000000000001001110001110000000000000", "0000001100111010011100000110100000000", "0000001111001101101001000110100010000", "0000010100110100111010100011011100000", "0000110000010111000100011001000010000", "0000010011101101111100010101001110000", "0000100111000001001010010011011010000", "0000101100101001110010010101110110000", "0000101111001110010111101110110100000", "0000101010101101111111111100110110000", "0000011011010001111110101001011000000", "0000101111100000010111101011110000000", "0000000110000101000001010111011010000", "0000011100111010000110001111111110000", "0000000000001000111110101000110110000", "0000111111101100100100111010101100000", "0000100000100111011100101000100110000", "0000101110100001110110101111111100000", "0000101110101001111111010000101100000", "0000101110101100101101001001001010000", "0000100000100010100100001100110100000", "0000111111100100000001011111000100000", "0000000000000000000000000000000000000", "0000000000000000000000000000000000000", "0000000000000000000000000000000000000", "0000000000000000000000000000000000000"];
// The Cadet's rocket launches from the middle of the plaque's code (two pixels per module).
const PROMO_ROCKET=SpaceRocket.qrBadge(PROMO_QR.length*2,2);
const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d'),engine=SpaceStory;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let motionReduced=reduced.matches;
const parameters=new URLSearchParams(location.search);
const homepage=parameters.has('homepage');
const embedded=parameters.has('embedded')||homepage;
if(homepage){$('promo').checked=false;$('dim').value='0';$('clock').checked=false;$('guides').hidden=true;}
let parentSuspended=homepage;
const editCat=$('edit-cadet');
let catTarget=null,sceneViewport=null;
function placeCatTarget(){
 if(!homepage||!catTarget||!sceneViewport)return;
 const {x,y}=catTarget,{left,top,scale}=sceneViewport;
 // Include the full helmet and hats; touch targets never shrink below 44 CSS pixels.
 editCat.style.left=(left+(x+24)*scale)+'px';
 editCat.style.top=(top+(y+12)*scale)+'px';
 editCat.style.width=Math.max(44,72*scale)+'px';
 editCat.style.height=Math.max(44,88*scale)+'px';
}
if(homepage){
 editCat.hidden=false;
 editCat.addEventListener('click',()=>parent.postMessage({type:'voyage-edit-cat'},location.origin));
 const observer=new ResizeObserver(()=>{
  const frame=canvas.getBoundingClientRect(),screen=$('screen').getBoundingClientRect();
  sceneViewport={left:frame.left-screen.left,top:frame.top-screen.top,scale:frame.width/canvas.width};
  placeCatTarget();
 });
 observer.observe(canvas);observer.observe($('screen'));
}

let elapsed=homepage?0:35,anchor=performance.now(),playing=true,speed=homepage?4:1,timer=null,lastChapter=-1,live=true;
if(!embedded&&/^\d+(\.\d+)?$/.test(parameters.get('at')||''))elapsed=Math.min(3599,Number(parameters.get('at')));
if(!embedded&&parameters.get('paused')==='1')playing=false;
function isRunning(){return playing&&!document.hidden&&!parentSuspended&&!motionReduced&&live;}
function now(){return SpaceVoyageControls.advance(elapsed,anchor,speed,performance.now(),isRunning());}
function capture(){elapsed=now();anchor=performance.now();}
function setThrottle(index){
 const next=SpaceVoyageControls.retime(elapsed,anchor,speed,performance.now(),isRunning(),index);
 elapsed=next.elapsed;anchor=next.anchor;speed=next.rate;powerState.energyMode=next.energyMode;
 $('energy-mode').value=next.energyMode;lastInstruments='';schedule();
}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
function sprite(rows,x,y,scale,color){
 rows.forEach((row,j)=>[...row].forEach((cell,i)=>{if(cell!=='#')return;let ink=color;if(homepage&&i>=4&&i<=11&&j>=4&&j<=10)ink='#b798ed';rect(x+i*scale,y+j*scale,scale,scale,ink);}));
}
let powerState=SpaceRocket.normalize({});
let powerProvider='expedition';
function setPower(snapshot,provider){
 const routeChanged=(powerProvider==='expedition')!==(provider==='expedition');
 powerState=SpaceRocket.normalize(snapshot);powerProvider=provider;
 $('battery-level').value=powerState.chargePercent??100;
 $('battery-source').value=powerState.power;
 $('energy-mode').value=powerState.energyMode;
 if(routeChanged){cachedLeg=-1;routeButtons();}
 schedule();
}
window.SpaceVoyagePower={setNativeSnapshot(snapshot){setPower(snapshot,'native');}};
let seed=crypto.getRandomValues(new Uint32Array(1))[0],cachedLeg=-1,world,previous;
// Reproducible review links; normal visits keep a fresh random seed.
if(/^\d{1,10}$/.test(parameters.get('seed')||''))seed=Number(parameters.get('seed'))>>>0;
let fuelRoute=SpaceVoyageFuel.createRoute(seed);
function routeWorld(leg){return powerProvider==='expedition'?fuelRoute.world(leg):engine.destination(seed,leg);}
let lastHomeStatus='',lastInstruments='';
function circle(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
// Cached once per destination, not generated on every frame.
let planetArt,previousArt,starField;
function makePlanet(w){
 const c=document.createElement('canvas');c.width=512;c.height=512;const g=c.getContext('2d');
 g.imageSmoothingEnabled=false;
 for(let y=0;y<512;y+=2){for(let x=0;x<512;x+=2){
  const nx=(x-256)/248,ny=(y-256)/248,d=nx*nx+ny*ny;if(d>1)continue;
  const noise=Math.sin(x*.043*w.textureScale+w.terrain[0]*40)*Math.cos(y*.033*w.textureScale+w.terrain[1]*20);
  let band=noise>.3?1:0;
  if(w.biome==='ocean')band=Math.sin(x*.028+Math.sin(y*.035)*2)>0.35?1:0;
  if(w.biome==='dunes')band=Math.sin(y*.08+Math.sin(x*.02)*2)>.2?1:0;
  if(w.biome==='crystal')band=(Math.floor(x/32)+Math.floor(y/24))%3===0?1:0;
  g.fillStyle=w.palette[band];g.fillRect(x,y,2,2);
  const shadow=Math.max(0,(nx*.6+ny*.25+.2));g.fillStyle=`rgba(12,8,22,${shadow*.8})`;g.fillRect(x,y,2,2);
  if(d>.90&&nx<0){g.fillStyle=w.palette[2]+'88';g.fillRect(x,y,2,2);}
 }}
 if(w.biome==='crater'){g.save();g.beginPath();g.arc(256,256,248,0,Math.PI*2);g.clip();for(let i=0;i<8;i++){const x=100+w.terrain[i]*288,y=100+w.terrain[i+8]*288,r=12+w.terrain[i+16]*24;g.strokeStyle=w.palette[1];g.lineWidth=2;g.beginPath();g.ellipse(x,y,r,r*.65,0,0,Math.PI*2);g.stroke();g.fillStyle='#17132166';g.fill();}g.restore();}
 const pixels=g.getImageData(0,0,512,512).data;
 c.surface=Array.from({length:512},(_,x)=>{for(let y=0;y<512;y++){if(pixels[(y*512+x)*4+3])return y;}return 512;});
 return c;
}
function draw(){
 const frameTime=now(),s=engine.state(frameTime);
 if(cachedLeg!==s.leg){cachedLeg=s.leg;world=routeWorld(s.leg);previous=routeWorld(s.leg-1);planetArt=makePlanet(world);previousArt=makePlanet(previous);starField=engine.destination(seed,0).stars;updateAntics();}
 const activeAction=engine.actionAt(world,s.local);
 const grounded=['explore','rest','boarding'].includes(s.phase);
 const service=engine.fuelService(world,s.local);
 const expedition=powerProvider==='expedition';
 let sourcePower=powerState;
 if(expedition)sourcePower={...fuelRoute.sample(frameTime),energyMode:powerState.energyMode};
 const shipState=SpaceRocket.voyageState(sourcePower,{grounded,connected:service.connected});
 const moving=(s.active||Boolean(activeAction)||shipState.power==='charging'||shipState.cpuFraction>=.08)&&!motionReduced&&live;
 const p=s.progress,e=p*p*(3-2*p),phase=s.phase;
 ctx.fillStyle=homepage?'#17131f':'#171321';ctx.fillRect(0,0,960,600);
 const travel=frameTime*5;
 for(const [sx,sy,size] of starField){rect((sx-travel*(size/2)%960+960)%960,sy,size,size,size===2?'#ac91c5':'#665574');}
 const layout=engine.travelLayout(frameTime);
 // Keep the website crew in view as the landscape grows underneath them.
 ctx.save();
 if(homepage){
  let cameraProgress=1;
  if(phase==='cruise')cameraProgress=0;
  else if(phase==='launch')cameraProgress=1-e;
  else if(phase==='landing')cameraProgress=e;
  const landingCameraLift=110;
  ctx.translate(0,-landingCameraLift*cameraProgress);
 }
 if(['launch','cruise','landing'].includes(phase)){
  SpaceWorld.draw(ctx,previous,previousArt,layout.origin,300);
 }
 SpaceWorld.draw(ctx,world,planetArt,layout.destination,s.local);
 SpaceWorld.drawFlyby(ctx,world,s.local);
 const ground=x=>engine.surfaceY(planetArt.surface,x);
 const oldGround=x=>engine.surfaceY(previousArt.surface,x);
 const shipFeet=47.5,catFeet=48;
 let shipX=460,shipY=ground(478)-shipFeet;
 if(phase==='launch'){shipX=460-e*110;shipY=(oldGround(478)-shipFeet)*(1-e)+250*e;}
 if(phase==='cruise'){shipX=350+Math.sin(p*Math.PI)*55;shipY=250+Math.sin(p*Math.PI*2)*12;}
 if(phase==='landing'){shipX=350+e*110;shipY=250*(1-e)+(ground(478)-shipFeet)*e;}
 let catX=shipX-84,catY=shipY+2;
 const catPose=engine.pose(world,s.local);
 const crew=engine.crewSequence(frameTime);
 if(!grounded){
  const float=Math.sin(s.local*.7)*4;
  catY+=float;
  if(phase==='launch')catY=(oldGround(400)-catFeet)*(1-e)+(shipY+2+float)*e;
  if(phase==='landing')catY=(shipY+2+float)*(1-e)+(ground(400)-catFeet)*e;
 }
 if(phase==='landing'){
  const clearance=12*Math.sin(p*Math.PI);
  const bounds=SpaceRocket.bounds(shipState,layout.angle,2.5,moving?frameTime:0);
  for(const x of [bounds.minX,0,bounds.maxX])shipY=engine.clearanceY(planetArt.surface,shipX+18+x,shipY,24+bounds.maxY,layout.destination,clearance);
  catY=engine.clearanceY(planetArt.surface,catX+24,catY,catFeet,layout.destination,clearance);
 }
 if(grounded){catX=crew.x+catPose.x;catY=ground(catX+24)-catFeet-catPose.lift-crew.lift;}
 if(grounded){
  // Contact shadows are on the same sampled terrain as feet and props.
  ctx.fillStyle='#17132166';ctx.beginPath();ctx.ellipse(catX+24,ground(catX+24)+2,17,3,0,0,Math.PI*2);ctx.fill();
 }
 ctx.save();ctx.translate(shipX+18,shipY+24);ctx.rotate(layout.angle);
 SpaceRocket.draw(ctx,shipState,-12,-14,2.5,moving?frameTime:0,{chargingPulse:false});ctx.restore();
 // Fuel packets move at a readable visual speed even in the accelerated website loop.
 const flowTime=frameTime/4;
 if(grounded)SpaceWorld.drawFuelHose(ctx,world,planetArt,{x:shipX+42.25,y:shipY+48.75},moving?flowTime:0,shipState.power);
 drawTether(crew,{x:catX,y:catY},{x:shipX,y:shipY},layout.angle);
 if(!grounded){catSprite(catX,catY,3,'#e9e3ff');}
 else {drawSurfaceActivity(ground,catX,catY,catPose,s.local);drawCat(catX,catY,catPose);if(crew.reach>0){rect(catX+43,catY+25,5+crew.reach*5,3,'#e9e3ff');}}
 if(homepage){const point=ctx.getTransform().transformPoint({x:catX,y:catY});catTarget={x:point.x,y:point.y};placeCatTarget();}
 ctx.restore();
 rect(0,0,960,600,`rgba(0,0,0,${Number($('dim').value)/100})`);drawBeacon(s,moving);
 $('position').textContent=SpaceVoyageControls.clockLabel(frameTime);const hour=SpaceVoyageControls.timelineWindow(frameTime);$('seek').min=hour.min;$('seek').max=hour.max;$('seek').value=Math.floor(frameTime);
 $('render-status').textContent=motionReduced?'Reduced motion · still frame':!live?'Still wallpaper':!playing?'Paused':moving?`${activeAction?engine.actionNames[activeAction.type]:phase} · ${$('gentle').checked?6:12} fps ceiling`:'Landed · gentle 6 fps';
 $('chapter-number').textContent=`EXPEDITION ${seed.toString(16).toUpperCase()} · STOP ${s.leg+1}`;
 $('chapter-title').textContent=world.name;
 let shipActivity='In flight · disconnected';
 if(shipState.power==='charging')shipActivity='Refuelling at '+service.depot.label;
 else if(shipState.power==='pluggedIn')shipActivity='Docked at '+service.depot.label;
 else if(grounded)shipActivity='Parked · disconnected';
 const fuelLabel=expedition?'Expedition fuel':'Battery',charge=shipState.chargePercent;
 canvas.dataset.tether=crew.stage;canvas.dataset.catName=catName;
 canvas.dataset.leg=s.leg;canvas.dataset.phase=phase;canvas.dataset.fuel=charge??'unavailable';canvas.dataset.power=shipState.power;canvas.dataset.planetKind=world.kind;canvas.dataset.powerProvider=powerProvider;
 canvas.dataset.time=frameTime.toFixed(3);canvas.dataset.rate=speed;canvas.dataset.energyMode=shipState.energyMode;canvas.dataset.activity=activeAction?.type||'idle';
 canvas.setAttribute('aria-label',`${catName} exploring ${world.name}. Rocket: ${shipActivity}. Tether: ${crew.stage}. ${fuelLabel}: ${charge??'unavailable'}; ${shipState.energyMode}.`);
 $('battery-status').textContent=`${fuelLabel} · ${charge===null?'unavailable':charge+'%'} · ${shipActivity}`;
 $('fuel-mode').value=powerProvider;
 $('battery-level').disabled=powerProvider!=='preview';$('battery-source').disabled=powerProvider!=='preview';
 if(powerProvider!=='preview'){$('battery-level').value=charge??100;$('battery-source').value=shipState.power;}
 const stories={ruins:'Older than Earth. Cat remembers who built these.',garden:'A garden that has never seen a pawprint.',signal:'A mysterious signal. Probably snacks.',parcel:'One small delivery, a very long way from home.',comet:'A front-row seat for a passing comet.',relay:'Calling the neighbours. Anyone home?',fuel:'A quiet refuelling stop for the next adventure.',nap:'New planet. Excellent napping conditions.',home:'Someone left the landing lights on.',arcade:'Somebody left a dance machine out here. Cat knows the steps.',farm:'A little greenhouse. A very ambitious carrot harvest.',garage:'A silver Roadster, cold-gas thrusters, and absolutely no reason to do a flip.'};
 $('chapter-copy').textContent=world.biome[0].toUpperCase()+world.biome.slice(1)+' world. '+stories[world.kind];$('caption').textContent=`${activeAction?engine.actionNames[activeAction.type].toUpperCase():phase.toUpperCase()} · ${previous.name} → ${world.name}`;
 if(homepage){
  const labels={launch:'Lifting off',cruise:'On a little spacewalk',landing:'Coming in to land',explore:'A new world to explore',rest:world.kind==='ruins'?'Cat remembers these pyramids':'Taking a little look around',boarding:'One more planet?'};
  const crewLabels={unclipping:'Boots down. Unclip.',reeling:'Reeling in the spacewalk cable',returning:'Back to the rocket',hooking:'Clipping in for the next adventure','walking-clear':'A few steps. Ready for liftoff.',ready:'All hooked up. Here we go.'};
  let label=crewLabels[crew.stage]||(activeAction?engine.actionNames[activeAction.type]:labels[phase]);
  if(shipState.power==='charging')label=`Refuelling at ${service.depot.label} · ${charge}%`;
  else if(shipState.power==='pluggedIn'&&expedition)label='Tank full. Ready for more little planets.';
  else if(!grounded&&expedition&&fuelRoute.plan(s.leg).refuel)label='Fuel stop ahead';
  const message=label+' · '+world.name;
  if(message!==lastHomeStatus){lastHomeStatus=message;parent.postMessage({type:'voyage-status',label,planet:world.name,phase},location.origin);}
  const instruments=JSON.stringify({fuel:charge,energyMode:shipState.energyMode,power:shipState.power,cpuFraction:shipState.cpuFraction});
  if(instruments!==lastInstruments){
   lastInstruments=instruments;
   const gauge=SpaceRocket.frame(shipState,0,{chargingPulse:false});
   parent.postMessage({type:'voyage-instruments',fuel:charge,energyMode:shipState.energyMode,colour:SpaceRocket.colours[gauge.fuelTint],pixels:gauge.pixels},location.origin);
  }
 }
 document.querySelectorAll('#chapters button').forEach((b,i)=>b.classList.toggle('active',i===s.index));
}
function drawTether(crew,cat,ship,angle){
 const cable=engine.tetherGeometry(crew,cat,ship,angle);
 ctx.fillStyle='#b5a2c9';ctx.fillRect(cable.port.x-1.5,cable.port.y-1.5,3,3);
 if(!cable.visible)return;
 ctx.strokeStyle='#a192b2';ctx.lineWidth=1.25;ctx.beginPath();ctx.moveTo(cable.port.x,cable.port.y);
 ctx.quadraticCurveTo(cable.control.x,cable.control.y,cable.end.x,cable.end.y);ctx.stroke();
 // The loose carabiner follows the end all the way into the reel.
 ctx.fillStyle=crew.attached?'#a6d6c5':'#d9c9e8';
 const clipSize=Math.min(2,crew.extension*8);ctx.fillRect(cable.end.x-clipSize/2,cable.end.y-clipSize/2,clipSize,clipSize);
}
function drawCat(x,y,pose){
 ctx.save();ctx.translate(Math.round(x+24),Math.round(y+48));ctx.rotate(pose.angle);ctx.scale(1,pose.scaleY);
 if(pose.action?.type==='rover'){drawRover(pose.progress);ctx.restore();return;}
 catSprite(-24,-48,3,'#e9e3ff');
 const a=pose.action?.type,p=pose.progress,pulse=Math.sin(p*Math.PI),wiggle=Math.sin(p*Math.PI*10);
 if(a==='trace'){rect(-34,-27+wiggle*2,12,5,'#e9e3ff');rect(-42,-25,6,3,'#e3c897');}
 if(a==='wave'||a==='groom'||a==='watchFlip'){const armX=a==='groom'?11:25,armY=-24+wiggle*5;rect(armX,armY,7,5,'#e9e3ff');rect(armX+3,armY-5,4,6,'#e9e3ff');}
 if(a==='dance')for(const side of [-1,1]){rect(side*29-3,-24+side*wiggle*7,7,5,'#e9e3ff');rect(side*33-3,-27+side*wiggle*7,6,6,'#e9e3ff');}
 if(a==='harvest'){rect(-31,-14,8,5,'#e9e3ff');rect(-36,-21,5,11,'#edb36e');rect(-35,-27,2,7,'#8bc7a1');rect(-40,-26,5,3,'#8bc7a1');}
 if(a==='nap'){rect(-12,-27,9,3,'#e9e3ff');rect(3,-27,9,3,'#e9e3ff');ctx.fillStyle='#bda4da';ctx.font='12px monospace';ctx.fillText('z',30,-40-pulse*8);}
 if(a==='sniff'){rect(-33,-18,3,3,'#bba1de');rect(-39,-20,2,2,'#bba1de');}
 if(a==='listen')drawPhone(p);
 if(a==='firefly'){const fx=40+Math.sin(p*9)*14,fy=-42+Math.cos(p*7)*12;rect(fx,fy,4,4,'#efcc7b');rect(fx-2,fy+1,8,2,'#ffe7a566');}
 if(a==='stargaze'){const sx=35+p*30,sy=-52-Math.sin(p*Math.PI)*15;rect(sx,sy,3,3,'#f0d18c');rect(sx-8,sy+2,6,1,'#a78669');}
 if(a==='water'){rect(-37,-15,13,9,'#8bd2c4');rect(-43,-12,9,3,'#8bd2c4');for(let i=0;i<3;i++)rect(-45-i*3,-5+(p*30+i*6)%17,2,3,'#8bd2c4');}
 if(a==='unpack'){rect(30,-12,22,12,'#d6ad79');rect(38,-35,5,23,'#d6c5ec');rect(27,-37,30,7,'#e9e3ff');}
 if(a==='dish'){ctx.strokeStyle='#8bd2c4';ctx.lineWidth=2;ctx.beginPath();ctx.arc(39,-26,10+Math.sin(p*Math.PI)*8,-1.3,1.3);ctx.stroke();rect(28,-20,4,20,'#c5b5dd');}
 if(a==='repair'){rect(24,-23,17,4,'#f4cb8d');rect(37,-28,4,14,'#f4cb8d');}
 if(a==='hop'||a==='pounce'){rect(-24,0,3,2,'#ad99bd');rect(22,0,3,2,'#ad99bd');}
 ctx.restore();
}
function drawPhone(progress){
 const pose=SpacePhone.pose(progress);
 ctx.save();ctx.globalAlpha=pose.opacity;
 SpacePhone.draw(ctx,pose.x,pose.y,3);
 if(pose.talking){
  ctx.strokeStyle=SpacePhone.colours.p;ctx.lineWidth=1.5;
  for(let i=0;i<2;i++){
   ctx.globalAlpha=(.35+.3*Math.sin(progress*30-i))*pose.opacity;
   ctx.beginPath();ctx.arc(pose.x+17,pose.y+12,6+i*6,-.8,.8);ctx.stroke();
  }
 }
 ctx.restore();
}
function drawRover(progress){
 // A seated helmet, pale chassis, suspension and chunky lunar wheels.
 catSprite(-16,-58,2,'#e9e3ff');
 rect(-34,-24,66,10,'#bca0ee');rect(-27,-14,48,5,'#82669c');
 rect(21,-38,3,16,'#e9e3ff');rect(11,-38,16,3,'#e9e3ff');
 rect(-38,-32,3,9,'#e9e3ff');rect(-40,-36,7,5,'#ffd372');
 for(const x of [-28,22]){rect(x-7,-14,14,14,'#e9e3ff');rect(x-4,-11,8,8,'#453254');const turn=Math.floor(progress*24)%2;rect(x-1,-10+turn*4,3,3,'#bca0ee');}
}
function drawSurfaceActivity(ground,catX,catY,pose,local){
 if(pose.action?.type==='golf'){
  const p=pose.progress,start=357,end=425,base=ground(end);
  rect(end-4,base,10,3,'#171321');rect(end+4,base-23,2,24,'#e9e3ff');rect(end+6,base-23,10,7,'#7adbcf');
  const flight=Math.max(0,Math.min(1,(p-.3)/.6)),x=start+(end-start)*flight;
  const y=ground(x)-5-Math.sin(flight*Math.PI)*48;
  if(p<.9)rect(x,y,4,4,'#ffffff');
  ctx.save();ctx.translate(catX+43,catY+31);ctx.rotate(-1.2+Math.min(1,p/.35)*1.8);
  rect(0,0,3,23,'#e9e3ff');rect(0,20,10,4,'#7adbcf');ctx.restore();
 }
}
function updateAntics(){
 $('antics-list').textContent=world.actions.map(a=>engine.actionNames[a.type]).join(' · ');
}
function routeButtons(){
 $('chapters').replaceChildren();
 for(let i=0;i<12;i++){const destination=routeWorld(i),b=document.createElement('button');b.innerHTML=`<span>${String(i*5).padStart(2,'0')}:00 · ${destination.kind}</span>${destination.name}`;b.onclick=()=>{elapsed=i*300;anchor=performance.now();schedule();};$('chapters').append(b);}
}
function schedule(){clearTimeout(timer);draw();const wait=engine.delay(now(),{playing,visible:!document.hidden&&!parentSuspended,reduced:motionReduced,still:$('mode').value==='still',low:$('gentle').checked||powerState.energyMode==='lowPower',speed,world,ambient:true});if(wait!==null)timer=setTimeout(schedule,wait);}
routeButtons();
if(!playing){$('play').textContent='▶';$('play').setAttribute('aria-label','Play story');}
$('play').onclick=()=>{capture();playing=!playing;$('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'Pause story':'Play story');schedule();};
$('seek').oninput=()=>{elapsed=Number($('seek').value);anchor=performance.now();schedule();};
// In the site's overlay, scrolling over the scene travels through the voyage, as far as you like.
if(embedded&&!homepage){
 const travel=pixels=>{elapsed=SpaceVoyageControls.scrub(now(),pixels);anchor=performance.now();schedule();};
 $('screen').addEventListener('wheel',event=>{event.preventDefault();travel((event.deltaY+event.deltaX)*(event.deltaMode===1?16:1));},{passive:false});
 let touchY=null;
 $('screen').addEventListener('touchstart',event=>{touchY=event.touches[0].clientY;},{passive:true});
 $('screen').addEventListener('touchmove',event=>{if(touchY===null)return;event.preventDefault();const y=event.touches[0].clientY;travel(touchY-y);touchY=y;},{passive:false});
 $('screen').addEventListener('touchend',()=>{touchY=null;});
}
$('speed').onchange=()=>{capture();speed=Number($('speed').value);schedule();};
$('mode').onchange=()=>{capture();live=$('mode').value==='live';schedule();};
$('gentle').onchange=schedule;$('dim').oninput=schedule;$('clock').onchange=()=>{$('guides').hidden=!$('clock').checked;};
$('preview').onclick=()=>document.body.classList.add('immersive');$('exit').onclick=()=>document.body.classList.remove('immersive');document.addEventListener('keydown',e=>{if(e.key==='Escape')document.body.classList.remove('immersive');});
$('export').onclick=()=>{draw();const a=document.createElement('a');a.download='space-cadet-wallpaper.png';a.href=canvas.toDataURL('image/png');a.click();};
// Hidden tabs cancel all scene work and resume from the last visible frame.
document.addEventListener('visibilitychange',()=>{if(document.hidden){elapsed+=(playing&&!parentSuspended&&!motionReduced&&live?(performance.now()-anchor)/1000*speed:0);}anchor=performance.now();schedule();});reduced.addEventListener('change',()=>{capture();motionReduced=reduced.matches;anchor=performance.now();schedule();});
function clock(){const d=new Date();$('time').textContent=d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});$('date').textContent=d.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'});}if(!homepage){clock();setInterval(()=>{if(!document.hidden)clock();},60000);}schedule();

function drawBeacon(){
 if(!$('promo').checked)return;
 // A single stationary mission plaque. The QR quiet zone is preserved; the rocket sits on a
 // clear pad of modules at the code's centre, tilted 30° like a launch.
 const x=661,y=497,size=2;
 ctx.fillStyle='#242031';ctx.strokeStyle='#675679';ctx.lineWidth=1;
 ctx.beginPath();ctx.roundRect(x,y,275,86,12);ctx.fill();ctx.stroke();
 ctx.fillStyle='#c8b7e1';ctx.fillRect(x+6,y+6,74,74);
 PROMO_QR.forEach((row,j)=>{for(let i=0;i<row.length;i++)if(row[i]==='1'&&!PROMO_ROCKET.cleared.has(`${i},${j}`))rect(x+6+i*size,y+6+j*size,size,size,'#211a2d');});
 for(const pixel of PROMO_ROCKET.pixels)rect(x+6+pixel.x,y+6+pixel.y,1,1,pixel.role==='#'?'#211a2d':'#9a80b2');
 ctx.textAlign='left';ctx.fillStyle='#eee7fb';ctx.font='600 16px -apple-system, sans-serif';ctx.fillText('Take a little',x+93,y+29);
 ctx.fillText('space cat home.',x+93,y+49);
 ctx.fillStyle='#9a8aa8';ctx.font='11px -apple-system, sans-serif';ctx.fillText('localaicat.com',x+93,y+67);
}
$('promo').onchange=schedule;

$('new-route').onclick=()=>{seed=crypto.getRandomValues(new Uint32Array(1))[0];fuelRoute=SpaceVoyageFuel.createRoute(seed);cachedLeg=-1;elapsed=0;anchor=performance.now();routeButtons();schedule();};

// Find a real seeded encounter instead of manufacturing a separate demo-only world.
$('meet-encounter').onclick=()=>{
 const kind=$('encounter-preview').value,start=crypto.getRandomValues(new Uint32Array(1))[0];
 for(let offset=0;offset<4096;offset++){
  const candidateSeed=(start+offset)>>>0,candidateRoute=SpaceVoyageFuel.createRoute(candidateSeed);
  let leg=0;
  if(powerProvider==='expedition'&&['home','fuel'].includes(kind))while(!candidateRoute.plan(leg).refuel)leg++;
  const candidate=powerProvider==='expedition'?candidateRoute.world(leg):engine.destination(candidateSeed,leg);
  const call=candidate.actions.find(action=>action.type==='listen');
  if(kind==='call'){if(!call)continue;}
  else if(kind==='flyby'?!candidate.flyby:candidate.kind!==kind)continue;
  seed=candidateSeed;fuelRoute=candidateRoute;cachedLeg=-1;
  let local=candidate.actions[0].start;
  if(kind==='flyby')local=candidate.flyby.start;
  else if(kind==='call')local=call.start+5;
  else if(['home','fuel'].includes(kind))local=85;
  elapsed=leg*300+local;
  anchor=performance.now();playing=true;speed=1;$('speed').value='1';$('play').textContent='Ⅱ';$('play').setAttribute('aria-label','Pause story');
  routeButtons();schedule();return;
 }
};

$('next-antic').onclick=()=>{const s=engine.state(now());const action=world.actions.find(a=>a.start>s.local+.1)||world.actions[0];elapsed=s.leg*300+action.start;anchor=performance.now();playing=true;$('play').textContent='Ⅱ';$('play').setAttribute('aria-label','Pause story');schedule();};

function jumpTo(seconds){elapsed=Math.floor(now()/300)*300+seconds;anchor=performance.now();schedule();}
$('arrival').onclick=()=>jumpTo(62);
$('liftoff').onclick=()=>jumpTo(0);
$('landed').onclick=()=>jumpTo(130);
// A parent tab can suspend an embedded preview so hidden iframes consume no scene work.

addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==parent)return;
 if(homepage&&event.data?.type==='voyage-throttle'&&Number.isInteger(event.data.index)&&event.data.index>=0&&event.data.index<=2)setThrottle(event.data.index);
 if(event.data?.type==='voyage-visibility'){capture();parentSuspended=!event.data.visible;anchor=performance.now();schedule();}
 if(event.data?.type==='voyage-cat'){
  const pixels=SpaceVoyageArtwork.normalize(event.data.pixels);
  if(!pixels)return;
  nativeCatPixels=pixels;
  if(typeof event.data.name==='string')catName=[...event.data.name.trim()].slice(0,24).join('')||'Space Cadet';
  draw();
 }
});


function previewPower(){setPower({chargePercent:Number($('battery-level').value),power:$('battery-source').value,energyMode:$('energy-mode').value,cpuFraction:.25},'preview');}
$('battery-level').oninput=previewPower;$('battery-source').onchange=previewPower;
$('energy-mode').onchange=()=>{powerState.energyMode=$('energy-mode').value;schedule();};
let batteryController=null;
$('fuel-mode').onchange=()=>{
 const selected=$('fuel-mode').value;
 if(selected==='device'){setPower({},'device');connectBattery();}
 else if(selected==='preview')previewPower();
 else setPower({energyMode:powerState.energyMode},'expedition');
};
async function connectBattery(){
 if(!navigator.getBattery){$('battery-status').textContent='Device battery unavailable in this browser. Choose Expedition fuel for the story.';return;}
 try {
  if(batteryController){batteryController();return;}
  const battery=await navigator.getBattery();
  function update(){
   if(powerProvider!=='device')return;
   let power='battery';if(battery.charging)power=battery.level>=1?'pluggedIn':'charging';
   setPower({chargePercent:Math.round(battery.level*100),power,energyMode:powerState.energyMode},'device');
  }
  batteryController=update;
  battery.addEventListener('levelchange',update);battery.addEventListener('chargingchange',update);update();
 }catch{$('battery-status').textContent='Device battery unavailable. Choose Expedition fuel for the story.';}
}

function catSprite(x,y,scale,color) {
 if (!nativeCatPixels) { sprite(CAT,x,y,scale,color); return; }
 SpaceVoyageArtwork.draw(ctx,nativeCatPixels,x,y,scale);
}
window.catVoyageArtwork = pixels => {
 nativeCatPixels = SpaceVoyageArtwork.normalize(pixels);
 draw();
};

window.catVoyagePlayback=(active,fps)=>{capture();playing=active;live=active;$('mode').value=active?'live':'still';$('gentle').checked=fps<=6;anchor=performance.now();schedule();};
canvas.addEventListener('contextlost',event=>{event.preventDefault();clearTimeout(timer);});
canvas.addEventListener('contextrestored',()=>{cachedLeg=-1;schedule();});
