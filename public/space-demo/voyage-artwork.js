(function(root){
 'use strict';
 function normalize(input){
  let pixels=input;
  if(Array.isArray(input)&&input.length===256)pixels=Array.from({length:16},(_,y)=>input.slice(y*16,y*16+16));
  if(!Array.isArray(pixels)||![16,24].includes(pixels.length))return null;
  if(!pixels.every(row=>Array.isArray(row)&&row.length===pixels.length&&row.every(color=>color===null||(typeof color==='string'&&/^#[0-9a-f]{6}$/i.test(color)))))return null;
  return pixels.map(row=>row.slice());
 }
 function draw(ctx,pixels,x,y,scale){
  // Expanded hats live above the unchanged 16x16 helmet. The feet and tether keep their anchors.
  const left=pixels.length===24?4:0,top=pixels.length===24?8:0;
  pixels.forEach((row,j)=>row.forEach((color,i)=>{
   if(!color)return;
   ctx.fillStyle=color;
   ctx.fillRect(Math.round(x+(i-left)*scale),Math.round(y+(j-top)*scale),scale,scale);
  }));
 }
 root.SpaceVoyageArtwork={normalize,draw};
})(globalThis);
