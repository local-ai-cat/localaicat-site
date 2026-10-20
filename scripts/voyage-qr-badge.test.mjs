import test from 'node:test';
import assert from 'node:assert/strict';
import '../public/space-demo/rocket-renderer.js';
const rocket=globalThis.SpaceRocket;
// The plaque's code: version 3 (29 modules) with a four-module quiet zone, two pixels a module.
const quiet=4,symbol=29,size=2,side=(symbol+2*quiet)*size;
const maximumCleared=.2;
function clearedSymbolModules(badge){
 return [...badge.cleared].map(key=>key.split(',').map(Number)).map(([i,j])=>[i-quiet,j-quiet]).filter(([x,y])=>x>=0&&y>=0&&x<symbol&&y<symbol);
}
// Finder patterns with separators, timing rows, format information and the one alignment pattern.
function isFunctionModule(x,y){
 const finder=(x<9&&y<9)||(x>=symbol-8&&y<9)||(x<9&&y>=symbol-8);
 const timing=x===6||y===6;
 const alignment=Math.abs(x-22)<=2&&Math.abs(y-22)<=2;
 return finder||timing||alignment;
}
// The middle of the topmost row of pixels, i.e. where the nose points.
function noseX(pixels){
 const top=Math.min(...pixels.map(pixel=>pixel.y)),row=pixels.filter(pixel=>pixel.y===top);
 return row.reduce((sum,pixel)=>sum+pixel.x+.5,0)/row.length;
}
test('the plaque rocket clears at most a fifth of the code and none of its function patterns',()=>{
 const modules=clearedSymbolModules(rocket.qrBadge(side,size));
 assert.ok(modules.length>0);
 assert.ok(modules.length/(symbol*symbol)<=maximumCleared,`${modules.length} of ${symbol*symbol} modules cleared`);
 for(const [x,y] of modules)assert.ok(!isFunctionModule(x,y),`function module ${x},${y} cleared`);
});
test('a 2.5x rocket would clear more than a fifth, so the bound can fail',()=>{
 const modules=clearedSymbolModules(rocket.qrBadge(side,size,{scale:2.5}));
 assert.ok(modules.length/(symbol*symbol)>maximumCleared);
});
test('every rocket pixel sits on a cleared module, centred and tilted towards the upper right',()=>{
 const badge=rocket.qrBadge(side,size);
 for(const pixel of badge.pixels)assert.ok(badge.cleared.has(`${Math.floor(pixel.x/size)},${Math.floor(pixel.y/size)}`));
 const roles=new Set(badge.pixels.map(pixel=>pixel.role));
 assert.deepEqual([...roles].sort(),['#','u']);
 const meanX=badge.pixels.reduce((sum,pixel)=>sum+pixel.x,0)/badge.pixels.length;
 const meanY=badge.pixels.reduce((sum,pixel)=>sum+pixel.y,0)/badge.pixels.length;
 assert.ok(Math.abs(meanX-side/2)<3&&Math.abs(meanY-side/2)<3,`centre ${meanX},${meanY}`);
 assert.ok(noseX(badge.pixels)>side/2+3,'the nose leans right of centre');
 assert.ok(Math.abs(noseX(rocket.qrBadge(side,size,{angle:0}).pixels)-side/2)<=1,'unrotated, the nose is on the centre line');
});
test('the badge is deterministic',()=>{
 const a=rocket.qrBadge(side,size),b=rocket.qrBadge(side,size);
 assert.deepEqual(a.pixels,b.pixels);assert.deepEqual([...a.cleared],[...b.cleared]);
});
