import test from 'node:test';
import assert from 'node:assert/strict';
import '../public/space-demo/story-engine.js';
import '../public/space-demo/world-renderer.js';
const story=globalThis.SpaceStory,worldRenderer=globalThis.SpaceWorld;
const size=512;

// The planet as the voyage drew it before: three fillRects per two-pixel cell, composited source-over in 8 bits.
function fillRectPlanet(w){
 const pixels=new Uint8ClampedArray(size*size*4);
 function fill(x,y,[r,g,b,a]){
  for(let row=y;row<y+2;row++)for(let column=x;column<x+2;column++){
   const at=(row*size+column)*4,under=pixels[at+3]/255,out=a+under*(1-a);
   [r,g,b].forEach((channel,i)=>{pixels[at+i]=(channel*a+pixels[at+i]*under*(1-a))/out;});
   pixels[at+3]=out*255;
  }
 }
 const hex=(colour,alpha=1)=>[1,3,5].map(i=>parseInt(colour.slice(i,i+2),16)).concat(alpha);
 for(let y=0;y<512;y+=2){for(let x=0;x<512;x+=2){
  const nx=(x-256)/248,ny=(y-256)/248,d=nx*nx+ny*ny;if(d>1)continue;
  const noise=Math.sin(x*.043*w.textureScale+w.terrain[0]*40)*Math.cos(y*.033*w.textureScale+w.terrain[1]*20);
  let band=noise>.3?1:0;
  if(w.biome==='ocean')band=Math.sin(x*.028+Math.sin(y*.035)*2)>0.35?1:0;
  if(w.biome==='dunes')band=Math.sin(y*.08+Math.sin(x*.02)*2)>.2?1:0;
  if(w.biome==='crystal')band=(Math.floor(x/32)+Math.floor(y/24))%3===0?1:0;
  fill(x,y,hex(w.palette[band]));
  const shadow=Math.max(0,(nx*.6+ny*.25+.2));fill(x,y,[12,8,22,shadow*.8]);
  if(d>.90&&nx<0)fill(x,y,hex(w.palette[2],0x88/255));
 }}
 return pixels;
}

function worldsOfEveryBiome(){
 const found=new Map();
 for(let leg=0;found.size<4&&leg<200;leg++){const world=story.destination(7,leg);if(!found.has(world.biome))found.set(world.biome,world);}
 return [...found.values()];
}

test('planet pixels match the per-cell fillRect planet for every biome', () => {
 const worlds=worldsOfEveryBiome();
 assert.deepEqual(worlds.map(world=>world.biome).sort(),['crater','crystal','dunes','ocean']);
 for(const world of worlds){
  const actual=worldRenderer.planetPixels(world),expected=fillRectPlanet(world);
  assert.equal(actual.length,expected.length);
  let worst=0;
  for(let i=0;i<actual.length;i++){
   if(i%4===3)assert.equal(actual[i],expected[i],`${world.biome} coverage at ${i}`);
   else worst=Math.max(worst,Math.abs(actual[i]-expected[i]));
  }
  assert.ok(worst<=1,`${world.biome} differs by ${worst}`);
 }
});

test('planet pixels are opaque inside the disc and clear outside it', () => {
 const pixels=worldRenderer.planetPixels(story.destination(7,0));
 const alpha=(x,y)=>pixels[(y*size+x)*4+3];
 assert.equal(alpha(256,256),255);
 assert.equal(alpha(0,0),0);
 assert.equal(alpha(256,2),0);
 assert.equal(alpha(256,8),255);
});
