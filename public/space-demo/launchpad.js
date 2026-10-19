(function(){
  const model=CadetModel;
  let design=model.normalizeDesign(null);
  try{design=model.normalizeDesign(JSON.parse(localStorage.getItem('space-cadet-appearance-v1')));}catch{}
  const custom=model.serializeDesign(design).pixels;
  const rocket=['.....##.....','....####....','...######...','...#AAAA#...','...#AAAA#...','...#AHHA#...','...#AHHA#...','...#AAAA#...','..##AAAA##..','.###AAAA###.','.##########.','....#..#....'];
  function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);}
  function cat(c,grid,x,y,s){grid.forEach((r,j)=>r.forEach((v,i)=>{if(v)rect(c,x+i*s,y+j*s,s,s,v);}));}
  function ship(c,x,y,s){rocket.forEach((r,j)=>[...r].forEach((v,i)=>{if(v!=='.'){let color='#e9e3ff';if(v==='A')color='#a9e5ce';rect(c,x+i*s,y+j*s,s,s,color);}}));}
  function stars(c,w,h){for(let i=0;i<40;i++)rect(c,(i*137+31)%w,(i*i*17+11)%h,i%9===0?2:1,1,i%4===0?'#ad96c7':'#5b4a6c');}
  function planet(c,x,y,r,ink){for(let dy=-r;dy<r;dy+=4){const half=Math.floor(Math.sqrt(Math.max(0,r*r-dy*dy))/4)*4;rect(c,x-half,y+dy,half*2,4,ink);}for(let i=0;i<9;i++)rect(c,x-r/2+(i*29)%r,y-r/2+(i*31)%r,10+(i%3)*4,3,'#ffffff16');}
  const home=document.getElementById('home-scene'),c=home.getContext('2d');
  stars(c,480,290);planet(c,361,221,72,'#756081');planet(c,48,48,12,'#6f6a78');
  c.strokeStyle='#8c7897';c.lineWidth=1;c.beginPath();c.moveTo(203,139);c.quadraticCurveTo(260,157,292,131);c.stroke();
  cat(c,custom,146,104,4);ship(c,290,92,4);rect(c,310,145,8,8,'#ffc398');
  if(design.appearance.name!=='Cadet')document.getElementById('welcome-cadet').textContent=design.appearance.name+' is ready when you are.';
  for(const canvas of document.querySelectorAll('[data-world]')){
    const g=canvas.getContext('2d'),w=canvas.width;stars(g,w,150);
    switch(canvas.dataset.world){
      case 'voyage':planet(g,510,142,100,'#6b5978');planet(g,95,47,21,'#708e91');cat(g,model.grid(model.defaults()),260,53,3);ship(g,350,48,3);g.strokeStyle='#746381';g.beginPath();g.moveTo(303,87);g.quadraticCurveTo(328,104,350,78);g.stroke();break;
      case 'menu':rect(g,46,24,230,116,'#34303e');rect(g,46,24,230,21,'#494052');cat(g,custom,211,27,1);rect(g,61,54,200,73,'#292331');cat(g,model.grid(model.defaults()),79,67,2);ship(g,145,66,2);rect(g,226,72,6,39,'#5a486c');rect(g,218,79,22,6,'#bda4eb');break;
      case 'studio':['pirate','wizard','royal'].forEach((id,i)=>cat(g,model.grid(model.wearOutfit(model.defaults(),id)),44+i*88,48,3));break;
      case 'paper':rect(g,40,34,242,87,'#eee5d6');rect(g,49,45,100,3,'#5a4a60');rect(g,49,54,65,2,'#8d7b90');rect(g,195,34,1,87,'#ac9ba9');cat(g,model.grid({...model.defaults(),helmet:'#47394f',fur:'#47394f',eyes:'#eee5d6',accent:'#47394f'}),219,57,2);ship(g,144,64,2);rect(g,51,93,78,3,'#8d7b90');break;
      case 'missions':cat(g,model.grid({...model.defaults(),expression:'wink'}),54,47,3);cat(g,model.grid({...model.defaults(),expression:'sleepy',fur:'#ecaeaa'}),138,62,2);cat(g,model.grid({...model.defaults(),fur:'#91c8aa'}),211,42,3);break;
    }
  }
})();
