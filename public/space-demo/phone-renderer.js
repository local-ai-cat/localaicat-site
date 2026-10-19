// SpaceCadetPixelArt handset crop, with the native dark-background phone colour.
(function(root){
const rows=['.ppp..','.pppp.','.pppp.','....pp','....pp','....pp','....pp','....pp','.pppp.','wwppp.','wwpp..','.www..'];
const colours={p:'#65e6ad',w:'#e9e3ff'};
function draw(ctx,x,y,scale=3){
 for(let row=0;row<rows.length;row++)for(let col=0;col<rows[row].length;col++){
  const ink=colours[rows[row][col]];if(!ink)continue;
  ctx.fillStyle=ink;ctx.fillRect(x+col*scale,y+row*scale,scale,scale);
 }
}
function pose(progress){
 const lift=Math.min(1,Math.max(0,progress/.16),Math.max(0,(1-progress)/.16));
 const eased=lift*lift*(3-2*lift);
 return {x:30+(1-eased)*7,y:-42+(1-eased)*20,opacity:eased,talking:progress>.18&&progress<.82};
}
root.SpacePhone={rows,colours,draw,pose};
})(globalThis);
