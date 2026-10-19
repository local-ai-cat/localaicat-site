// The app's SpaceCadetPixelArt and BatteryColorPolicy, shared by both web voyages.
(function(root){
const art=['................','.....##.........','.....##.........','...##..##.......','...##..##.......','..#uuuuuu#......','..#uuuuuu#......','..#uuuuuu#cccc..','..#uuuuuu#ccccc.','..#uuuuuu#....c.','..#uuuuuu#....c.','###uuuuuu###..c.','############..c.','###......###..c.','###......###..c.','..............c.','..............c.','..............c.','..............c.','..............c.'];
const colours={neutral:'#e9e3ff',critical:'#ff453a',lowPower:'#ff9f0a',highPower:'#bf5af2',pulse:'#ffd60a',flame:'#f28c28',core:'#ffd36a',highFlame:'#279cff',highCore:'#99edff'};
const flames=[
 [[[5,15,2,2]],[[4,15,3,1],[5,16,1,1]],[[5,15,3,1]]],
 [[[4,15,4,2],[5,17,2,1]],[[4,15,4,1],[4,16,3,2]],[[4,15,4,1],[5,16,3,2]]],
 [[[3,15,6,1],[4,16,4,2],[5,18,2,2]],[[3,15,6,1],[4,16,4,1],[4,17,3,2],[5,19,1,1]],[[3,15,6,1],[4,16,4,2],[6,18,2,1],[6,19,1,1]]]
];
function normalize(value){
 const input=value&&typeof value==='object'?value:{};
 const state={chargePercent:null,power:'battery',energyMode:'automatic',cpuFraction:null};
 if(typeof input.chargePercent==='number'&&Number.isFinite(input.chargePercent))state.chargePercent=Math.round(Math.max(0,Math.min(100,input.chargePercent)));
 if(['battery','pluggedIn','charging'].includes(input.power))state.power=input.power;
 if(['automatic','lowPower','highPower'].includes(input.energyMode))state.energyMode=input.energyMode;
 if(typeof input.cpuFraction==='number'&&Number.isFinite(input.cpuFraction))state.cpuFraction=Math.max(0,Math.min(1,input.cpuFraction));
 return state;
}
function frame(input,time=0,{chargingPulse=true}={}){
 const state=normalize(input),critical=state.chargePercent!==null&&state.chargePercent<=10;
 let fuel='neutral';if(critical)fuel='critical';else if(state.energyMode!=='automatic')fuel=state.energyMode;
 let hull='neutral';if(critical)hull='critical';
 const filled=Math.round((state.chargePercent??100)/100*7),pixels=[];
 for(let y=0;y<art.length;y++)for(let x=0;x<art[y].length;x++){
  const cell=art[y][x];let colour=null;
  if(cell==='#')colour=colours[hull];
  if(cell==='u'&&y>=12-filled)colour=colours[fuel];
  if(cell==='c'&&state.power!=='battery'&&y<=15)colour=colours.neutral;
  if(colour)pixels.push({x,y,w:1,h:1,colour,role:cell});
 }
 let slowdown=1;if(state.energyMode==='lowPower')slowdown=2;
 if(state.power==='charging'&&chargingPulse){
  const step=Math.floor(time/(.15*slowdown))%4;
  for(let y=15-step;y>=9;y-=4)pixels.push({x:13,y:y-1,w:3,h:2,colour:colours.pulse,role:'pulse'});
 }
 const cpu=state.cpuFraction;
 let strength=0;if(cpu>=.7)strength=3;else if(cpu>=.35)strength=2;else if(cpu>=.08)strength=1;
 if(strength){
  const interval=(.4-(cpu-.08)/.92*.3)*slowdown,index=Math.floor(time/interval)%3;
  let tint=colours.flame,core=colours.core;if(state.energyMode==='highPower'){tint=colours.highFlame;core=colours.highCore;}
  for(const [x,y,w,h] of flames[strength-1][index])pixels.push({x,y,w,h,colour:tint,role:'flame'});
  let x=5,height=1;if(index===2)x=6;if(strength===3)height=2;
  pixels.push({x,y:15,w:1,h:height,colour:core,role:'core'});
 }
 return {pixels,filledRows:filled,fuelTint:fuel,hullTint:hull};
}
// Telemetry remains real; the story only shows a cable at a landed service stop.
function voyageState(input,{grounded=false,connected=false}={}){
 const state=normalize(input);
 if(!grounded||!connected)state.power='battery';
 if(grounded)state.cpuFraction=null;
 return state;
}
function draw(ctx,input,x,y,scale,time,options){
 // Draw the original contour as vector rectangles, without a low-resolution image upscale.
 const result=frame(input,time,options);
 const layers=new Map();
 for(const pixel of result.pixels){
  if(!layers.has(pixel.colour))layers.set(pixel.colour,[]);
  layers.get(pixel.colour).push(pixel);
 }
 // Fill each colour once so adjacent cells do not acquire seams at fractional scales.
 for(const [colour,pixels] of layers){
  ctx.fillStyle=colour;ctx.beginPath();
  for(const pixel of pixels)ctx.rect(x+pixel.x*scale,y+pixel.y*scale,pixel.w*scale,pixel.h*scale);
  ctx.fill();
 }
}
// Extents around the flight pivot include rotated fins, cable and any CPU flame.
function bounds(input,angle,scale,time=0){
 const result={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};
 for(const pixel of frame(input,time).pixels)for(const dx of [0,pixel.w])for(const dy of [0,pixel.h]){
  const x=-12+(pixel.x+dx)*scale,y=-14+(pixel.y+dy)*scale;
  const px=x*Math.cos(angle)-y*Math.sin(angle),py=x*Math.sin(angle)+y*Math.cos(angle);
  result.minX=Math.min(result.minX,px);result.maxX=Math.max(result.maxX,px);
  result.minY=Math.min(result.minY,py);result.maxY=Math.max(result.maxY,py);
 }
 return result;
}
function svg(input,time=0,{monochrome=false}={}){
 const pixels=frame(input,time).pixels;
 const markup=pixels.map(p=>`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${monochrome?'currentColor':p.colour}"/>`).join('');
 return `<svg viewBox="-1 -1 18 22" shape-rendering="crispEdges" aria-hidden="true">${markup}</svg>`;
}
root.SpaceRocket={art,colours,normalize,frame,draw,bounds,voyageState,svg};
})(globalThis);
