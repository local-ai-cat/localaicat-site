// One coordinate system for body, rings and all surface objects. No phase-based visibility.
(function(root){
const engine=root.SpaceStory;
function shape(ctx,points,colour){
 ctx.fillStyle=colour;ctx.beginPath();ctx.moveTo(...points[0]);
 for(const point of points.slice(1))ctx.lineTo(...point);
 ctx.closePath();ctx.fill();
}
function box(ctx,x,y,w,h,colour){ctx.fillStyle=colour;ctx.fillRect(x,y,w,h);}
function wheel(ctx,x,y){
 ctx.fillStyle='#191623';ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#b5abc5';ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();
 box(ctx,x-1,y-3,2,6,'#e9e3ff');
}
// Hand-drawn silhouettes: cherry-red original and the angular silver thruster concept.
// They are encounters; the companion's canonical battery rocket is never replaced.
function drawRoadster(ctx,{original=false,thrust=0}={}){
 const body=original?'#bd4563':'#b9b8cf';
 if(original){
  shape(ctx,[[-44,2],[-35,-4],[-15,-7],[18,-7],[36,-2],[45,4],[43,10],[-43,10]],body);
  shape(ctx,[[-20,-5],[-14,-19],[5,-19],[22,-5]],'#d5cde6');
  shape(ctx,[[-16,-7],[-11,-16],[3,-16],[17,-7]],'#242334');
  // Starman in an open cockpit, attached to the upper stage below.
  ctx.fillStyle='#eee9f5';ctx.beginPath();ctx.arc(-5,-21,5,0,Math.PI*2);ctx.fill();
  box(ctx,-7,-23,5,3,'#282234');box(ctx,-7,-16,8,10,'#eee9f5');
 }else{
  shape(ctx,[[-44,1],[-31,-5],[-18,-19],[7,-21],[24,-6],[44,1],[40,11],[-41,11]],body);
  shape(ctx,[[-26,-6],[-15,-16],[5,-18],[18,-6]],'#363346');
  shape(ctx,[[-43,2],[42,2],[36,7],[-39,7]],'#81819b');
  box(ctx,-42,-2,3,4,'#ed91ab');box(ctx,33,-1,10,2,'#fff4d6');
  for(const x of [-24,24]){
   box(ctx,x-3,9,6,4,'#514e65');
   if(thrust>0){
    shape(ctx,[[x-3,13],[x+3,13],[x+8,13+thrust*22],[x-8,13+thrust*22]],'#bce6e850');
    shape(ctx,[[x-2,13],[x+2,13],[x+3,13+thrust*17],[x-3,13+thrust*17]],'#e4faf0aa');
   }
  }
 }
 wheel(ctx,-27,10);wheel(ctx,28,10);
 box(ctx,-13,5,29,2,original?'#f28396':'#e3deee');
}
function drawArcade(ctx,world,ground,local){
 const accent=world.encounter.accent,x=259,base=ground(x);
 shape(ctx,[[x-25,base],[x-24,base-76],[x+21,base-76],[x+25,base-46],[x+22,base]],'#30263f');
 box(ctx,x-24,base-75,45,8,accent);box(ctx,x-18,base-62,31,32,'#10141f');
 const dancing=engine.actionAt(world,local)?.type==='dance';
 const beat=dancing?Math.floor(local/world.encounter.danceBeat):0;
 for(let i=0;i<3;i++){
  const y=base-54+i*9;
  shape(ctx,[[x-11,y+3],[x-6,y-2],[x-1,y+3],[x-4,y+3],[x-4,y+6],[x-8,y+6],[x-8,y+3]],dancing&&i===beat%3?accent:'#786389');
 }
 box(ctx,x-15,base-24,28,3,'#8a779b');box(ctx,x-13,base-17,6,8,accent);box(ctx,x+6,base-17,6,8,accent);
 // Floor tiles follow the curve individually, so neither the cat nor the pad floats.
 for(let i=0;i<3;i++){
  const tx=318+i*20,ty=ground(tx+9)+2;
  box(ctx,tx,ty-3,19,6,'#51415e');box(ctx,tx+2,ty-2,15,3,dancing&&i===beat%3?accent:'#887198');
 }
 if(dancing){
  const drift=(local/world.encounter.danceBeat)%1;
  for(let i=0;i<2;i++){const nx=x+34+i*15,ny=base-67-drift*9-i*8;box(ctx,nx,ny,2,9,accent);box(ctx,nx-3,ny+7,5,3,accent);box(ctx,nx,ny,5,2,accent);}
 }
}
function drawFarm(ctx,world,ground,local){
 const x=161,base=ground(x);
 ctx.fillStyle='#78c7b128';ctx.strokeStyle='#9bc8bc';ctx.lineWidth=2;
 ctx.beginPath();ctx.ellipse(x,base-12,39,48,0,Math.PI,Math.PI*2);ctx.lineTo(x+39,base);ctx.lineTo(x-39,base);ctx.closePath();ctx.fill();ctx.stroke();
 box(ctx,x-40,base-2,80,4,'#82735e');box(ctx,x-1,base-57,2,55,'#9bc8bc88');
 box(ctx,x-32,base-20,65,2,'#9bc8bc88');box(ctx,x+16,base-25,16,25,'#477565');
 for(let i=0;i<world.encounter.cropCount;i++){
  const cx=204+i*12,cy=ground(cx)+2;
  box(ctx,cx-5,cy-3,10,5,'#584638');
  const h=8+world.terrain[i]*7;
  box(ctx,cx,cy-h,2,h,'#77b897');
  shape(ctx,[[cx,cy-h+5],[cx-6,cy-h],[cx-7,cy-h+5],[cx,cy-h+9]],'#8bc7a1');
  shape(ctx,[[cx+1,cy-h+4],[cx+6,cy-h-1],[cx+7,cy-h+3],[cx+1,cy-h+8]],world.encounter.accent);
 }
 const basketX=292,basketY=ground(basketX);
 box(ctx,basketX-10,basketY-10,21,11,'#bc9669');box(ctx,basketX-12,basketY-12,25,3,'#e0bc87');
 if(world.actions.some(a=>a.type==='harvest'&&local>=a.start+a.duration*.5)){
  for(let i=0;i<3;i++){box(ctx,basketX-7+i*6,basketY-16,4,6,'#edb36e');box(ctx,basketX-6+i*6,basketY-19,2,4,'#8bc7a1');}
 }
}
function drawGarage(ctx,world,ground,local){
 const car=engine.stuntPose(world,local),base=ground(car.x);
 // A small charging bollard stays behind on the planet throughout the stunt.
 box(ctx,car.x-62,ground(car.x-62)-31,9,31,'#82738f');box(ctx,car.x-60,ground(car.x-62)-27,5,10,'#7adbcf');
 ctx.fillStyle='#17132155';ctx.beginPath();ctx.ellipse(car.x,base+2,38-car.lift*.14,3,0,0,Math.PI*2);ctx.fill();
 const support=Math.min(ground(car.x-35),ground(car.x+35),base);
 ctx.save();ctx.translate(car.x,support-18-car.lift);ctx.rotate(car.angle);
 drawRoadster(ctx,{thrust:car.thrust});ctx.restore();
}
function drawFlyby(ctx,world,local){
 const pose=engine.flybyPose(world,local);if(!pose)return;
 ctx.save();ctx.translate(pose.x,pose.y);ctx.rotate(pose.angle);ctx.scale(.82,.82);
 // Exposed upper stage, payload adapter, and original Roadster travel as one object.
 box(ctx,-64,31,127,24,'#c4bed0');box(ctx,-61,48,121,7,'#777187');
 box(ctx,-15,20,32,11,'#b3a5bd');box(ctx,-44,16,88,5,'#82768e');
 shape(ctx,[[-64,35],[-80,29],[-80,58],[-64,51]],'#544c62');
 drawRoadster(ctx,{original:true});ctx.restore();
}
function depotPort(world,art){
 const depot=engine.fuelDepot(world);if(!depot)return null;
 return {x:depot.x-14,y:engine.surfaceY(art.surface,depot.x)-23};
}
function drawFuelDepot(ctx,world,ground){
 const depot=engine.fuelDepot(world);if(!depot)return;
 const x=depot.x,y=ground(x);
 box(ctx,x-18,y-3,36,6,'#665676');
 box(ctx,x-14,y-47,28,44,'#bca6cf');
 box(ctx,x-10,y-43,20,17,'#252338');
 box(ctx,x-7,y-39,14,3,'#7adbcf');box(ctx,x-7,y-33,9,3,'#7adbcf');
 box(ctx,x-8,y-20,16,13,'#6e587f');box(ctx,x-4,y-17,8,7,'#ead4a1');
 box(ctx,x-17,y-26,5,6,'#e9e3ff');
 // A stored hose and sign remain part of the planet even after the ship leaves.
 ctx.strokeStyle='#877297';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x+20,y-17,8,-Math.PI/2,Math.PI);ctx.stroke();
 box(ctx,x-1,y-65,2,18,'#bca6cf');box(ctx,x-31,y-78,62,15,'#292337');
 ctx.fillStyle='#d9c9ed';ctx.textAlign='center';ctx.font='8px monospace';ctx.fillText(depot.label,x,y-67);
}
function fuelFlowPoint(port,shipEnd,time){
 // One continuous packet: pump -> hose -> hull cable -> tank inlet.
 const cycle=4,progress=((time%cycle)+cycle)%cycle/cycle;
 const bend={x:(port.x+shipEnd.x)/2,y:Math.max(port.y,shipEnd.y)+12};
 const elbow={x:shipEnd.x,y:shipEnd.y-17.5};
 if(progress<.7){
  const p=progress/.7,q=1-p;
  return {x:q*q*port.x+2*q*p*bend.x+p*p*shipEnd.x,y:q*q*port.y+2*q*p*bend.y+p*p*shipEnd.y};
 }
 if(progress<.9){const p=(progress-.7)/.2;return {x:shipEnd.x,y:shipEnd.y+(elbow.y-shipEnd.y)*p};}
 return {x:elbow.x-13.75*(progress-.9)/.1,y:elbow.y};
}
function drawFuelHose(ctx,world,art,shipEnd,time,power){
 const port=depotPort(world,art);if(!port||power==='battery')return;
 const bend={x:(port.x+shipEnd.x)/2,y:Math.max(port.y,shipEnd.y)+12};
 ctx.strokeStyle='#a18aaf';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(shipEnd.x,shipEnd.y);ctx.quadraticCurveTo(bend.x,bend.y,port.x,port.y);ctx.stroke();
 if(power==='charging'){
  const point=fuelFlowPoint(port,shipEnd,time);
  box(ctx,point.x-2,point.y-2,4,4,'#ffd60a');
 }
}
function drawScenery(ctx,world,art,localTime=0){
 const ground=x=>engine.surfaceY(art.surface,x);
 function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
 for(let i=0;i<24;i++){const h=world.terrain[i];rect(40+i*24,ground(40+i*24)+18+h*90,8+h*18,3,world.palette[1]);}
  const kind=world.kind;
  for(let i=0;i<7;i++){
   const x=65+i*32,h=10+world.terrain[i]*28,base=ground(x+6)+2;
   if(world.biome==='crystal'){ctx.fillStyle=world.palette[2]+'99';ctx.beginPath();ctx.moveTo(x,base);ctx.lineTo(x+5,base-h);ctx.lineTo(x+12,base-12);ctx.lineTo(x+10,base);ctx.fill();}
   if(world.biome==='dunes'){ctx.fillStyle=world.palette[1];ctx.beginPath();ctx.ellipse(x,base+3,18,h*.4,0,Math.PI,Math.PI*2);ctx.fill();}
   if(world.biome==='ocean')rect(x,base+12+i%2*6,22,2,'#78c9c366');
  }
  if(kind==='ruins'){

   for(const [x,height,width] of world.landmarks.slice(0,3).map(mark=>[mark.x,mark.height+24,mark.width+18])){
    const base=ground(x)+6,apex=x-width*.06;
    ctx.fillStyle='#b5a086';ctx.beginPath();ctx.moveTo(x-width/2,base);ctx.lineTo(apex,base-height);ctx.lineTo(x+width/2,base);ctx.closePath();ctx.fill();
    ctx.fillStyle='#6a5870';ctx.beginPath();ctx.moveTo(apex,base-height);ctx.lineTo(apex+width*.12,base);ctx.lineTo(x+width/2,base);ctx.closePath();ctx.fill();
    rect(x-7,base-13,8,13,'#33273d');
   }
  }
  if(kind==='garden'){for(let i=0;i<9;i++){const x=160+i*19,base=ground(x+1)+2,h=9+world.terrain[i]*12;rect(x,base-h,2,h,'#609888');rect(x-3,base-h-4,8,5,world.palette[2]);}}
  if(kind==='signal'||kind==='relay'){const base=ground(228)+2;rect(210,base-39,36,39,world.palette[1]);rect(215,base-33,26,16,'#7adbcf');rect(226,base-56,3,17,'#c5b5dd');rect(218,base-58,19,3,'#c5b5dd');}
  if(kind==='parcel'){const base=ground(289)+2;rect(280,base-16,18,16,'#d8b273');rect(287,base-16,3,16,'#f3dfb5');}
  if(kind==='home'){const base=ground(233)+2;rect(200,base-45,66,45,world.palette[1]);rect(210,base-37,16,13,'#edc986');rect(239,base-23,15,23,'#211a2c');}
  drawFuelDepot(ctx,world,ground);
  if(kind==='arcade')drawArcade(ctx,world,ground,localTime);
  if(kind==='farm')drawFarm(ctx,world,ground,localTime);
  if(kind==='garage')drawGarage(ctx,world,ground,localTime);
 const flag=world.actions.find(action=>action.type==='flag');
 if(flag&&localTime>=flag.start){
  const progress=Math.min(1,(localTime-flag.start)/flag.duration),x=287;
  const bottom=ground(x)+3,top=bottom-56+(1-Math.min(1,progress*3))*16;
  rect(x,top,3,bottom-top,'#e9e3ff');rect(x+3,top+3,35,25,world.palette[2]);
  ['#...#','##.##','#####','#.#.#','#####'].forEach((row,j)=>[...row].forEach((cell,i)=>{if(cell==='#')rect(x+11+i*4,top+6+j*4,4,4,'#453254');}));
 }

}
// The planet body as raw RGBA in two-pixel cells: one putImageData per destination instead of ~200k
// fillRects, which held up the first frame and stalled every new leg. Same banding, shade and rim as before.
const planetSize=512,planetRadius=248,planetCell=2,shadeInk=[12,8,22],rimAlpha=0x88/255;
function rgb(hex){return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];}
function planetPixels(world){
 const pixels=new Uint8ClampedArray(planetSize*planetSize*4),centre=planetSize/2,palette=world.palette.map(rgb);
 for(let y=0;y<planetSize;y+=planetCell){for(let x=0;x<planetSize;x+=planetCell){
  const nx=(x-centre)/planetRadius,ny=(y-centre)/planetRadius,d=nx*nx+ny*ny;if(d>1)continue;
  const noise=Math.sin(x*.043*world.textureScale+world.terrain[0]*40)*Math.cos(y*.033*world.textureScale+world.terrain[1]*20);
  let band=noise>.3?1:0;
  if(world.biome==='ocean')band=Math.sin(x*.028+Math.sin(y*.035)*2)>0.35?1:0;
  if(world.biome==='dunes')band=Math.sin(y*.08+Math.sin(x*.02)*2)>.2?1:0;
  if(world.biome==='crystal')band=(Math.floor(x/32)+Math.floor(y/24))%3===0?1:0;
  const shade=Math.max(0,nx*.6+ny*.25+.2)*.8,rim=d>.90&&nx<0;
  const colour=palette[band].map((channel,i)=>{
   const shaded=channel*(1-shade)+shadeInk[i]*shade;
   return rim?shaded*(1-rimAlpha)+palette[2][i]*rimAlpha:shaded;
  });
  for(let row=y;row<y+planetCell;row++)for(let column=x;column<x+planetCell;column++){
   const at=(row*planetSize+column)*4;
   pixels[at]=colour[0];pixels[at+1]=colour[1];pixels[at+2]=colour[2];pixels[at+3]=255;
  }
 }}
 return pixels;
}
function draw(ctx,world,art,pose,localTime=0){
 const base=engine.surfacePose;
 ctx.save();ctx.translate(pose.cx,pose.cy);ctx.scale(pose.rx/base.rx,pose.ry/base.ry);ctx.translate(-base.cx,-base.cy);
 function ring(start,end,colour){
  if(!world.rings)return;
  ctx.strokeStyle=colour;ctx.lineWidth=base.rx*world.ringWidth;
  ctx.beginPath();ctx.ellipse(base.cx,base.cy,base.rx*1.55,base.ry*.34,world.tilt,start,end);ctx.stroke();
 }
 ring(Math.PI,Math.PI*2,world.palette[1]);
 ctx.imageSmoothingEnabled=true;
 ctx.drawImage(art,base.cx-base.rx,base.cy-base.ry,base.rx*2,base.ry*2);
 drawScenery(ctx,world,art,localTime);
 ring(0,Math.PI,world.palette[2]+'88');
 ctx.restore();
}
root.SpaceWorld={draw,drawScenery,drawFlyby,drawFuelHose,depotPort,fuelFlowPoint,planetPixels,planetSize};
})(globalThis);
