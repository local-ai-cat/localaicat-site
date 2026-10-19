const model = CadetModel;
const storageKey = 'space-cadet-appearance-v1';
const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let saved = model.normalizeDesign(null);
try { saved = model.normalizeDesign(JSON.parse(localStorage.getItem(storageKey))); } catch {}
let appearance = saved.appearance;
let mode = saved.mode;
let drawing = saved.drawing;
let birthday = saved.birthday;
let lastCodeDesign = '';
function refreshCode() {
  const signature = JSON.stringify(design());
  if (signature === lastCodeDesign) return;
  lastCodeDesign = signature;
  try { $('cat-code').value = CadetPassport.encode(design()); }
  catch { $('cat-code').value = ''; }
  $('passport-status').textContent = '';
}
let blink = false, timer, tool = 'brush';
let undoStack = [], redoStack = [], strokeStart = null, lastPixel = null, pointerId = null;
let cursor = {x:7,y:7};
const historyLimit = 60;
function copy(grid) { return grid.map(row => [...row]); }
function currentPixels() { return mode === 'drawing' ? drawing : model.grid(appearance,blink); }
function paintPixels(canvas, pixels) {
  pixels=model.framePixels(pixels);
  canvas.width=canvas.height=pixels.length;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  pixels.forEach((row,y) => row.forEach((color,x) => {
    if(color) { ctx.fillStyle=color;ctx.fillRect(x,y,1,1); }
  }));
}
function paint(canvas, config=appearance) { paintPixels(canvas,model.grid(config)); }
function draw() {
  document.querySelectorAll('#hero,#menubar-cat,[data-size]').forEach(c => paintPixels(c,currentPixels()));
  $('cat-name').textContent=appearance.name;
  $('stage').classList.toggle('float',mode==='cadet'&&appearance.motion&&!reduced.matches&&!document.hidden);
  const worn=Object.keys(model.options).filter(k=>appearance[k]!=='none').map(k=>model.options[k][appearance[k]]);
  $('accessory-summary').textContent=mode==='drawing'?`Freehand · static · ${drawing.length} × ${drawing.length} pixels`:worn.join(' · ')||'Space Cadet · full helmet';
  refreshCode();
  $('motion').disabled=mode==='drawing';
  $('motion').checked=mode==='cadet'&&appearance.motion;
}
function blinkLater() {
  clearTimeout(timer);blink=false;draw();
  if(mode==='drawing'||!appearance.motion||reduced.matches||document.hidden)return;
  timer=setTimeout(()=>{blink=true;draw();timer=setTimeout(blinkLater,180);},6000);
}
function updateChoices() {
  document.querySelectorAll('[data-preset]').forEach(b=>{
    const preset=model.presets[b.dataset.preset];
    const same=['helmet','fur','eyes','accent'].every(k=>preset[k].toLowerCase()===appearance[k].toLowerCase());
    b.classList.toggle('active',same);b.setAttribute('aria-pressed',String(same));
    paint(b.querySelector('canvas'),{...model.defaults(),...preset});
  });
  document.querySelectorAll('[data-category]').forEach(b=>{
    const category=b.dataset.category,id=b.dataset.option,selected=appearance[category]===id;
    b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));
    paint(b.querySelector('canvas'),{...appearance,[category]:id});
  });
  document.querySelectorAll('[data-outfit]').forEach(b=>paint(b.querySelector('canvas'),model.wearOutfit(appearance,b.dataset.outfit)));
}
function sync() {
  $('birthday').value=birthday||'';
  for(const id of ['name','helmet','fur','eyes','accent','gear','expression','badge'])$(id).value=appearance[id];
  updateChoices();blinkLater();
}
function changed() { appearance=model.normalize(appearance);$('status').textContent='';updateChoices();draw(); }
function thumbnail(label) {
  const button=document.createElement('button'),canvas=document.createElement('canvas');
  canvas.width=canvas.height=16;canvas.setAttribute('aria-hidden','true');
  button.append(canvas,document.createTextNode(label));return button;
}
for(const [id,preset] of Object.entries(model.presets)) {
  const button=thumbnail(preset.name);button.className='option';button.dataset.preset=id;
  button.setAttribute('aria-label',preset.name+' palette');
  button.onclick=()=>{appearance={...appearance,...preset,name:appearance.name};$('status').textContent='';sync();};
  $('presets').append(button);
}
for(const [category,choices] of Object.entries(model.options)) for(const [id,label] of Object.entries(choices)) {
  const button=thumbnail(label);button.className='option';button.dataset.category=category;button.dataset.option=id;
  button.onclick=()=>{appearance[category]=id;changed();};$(category).append(button);
}
for(const [id,outfit] of Object.entries(model.outfits)) {
  const button=thumbnail(outfit.label);button.dataset.outfit=id;
  button.onclick=()=>{appearance=model.wearOutfit(appearance,id);$('status').textContent='';selectTab('gear');sync();};
  $('outfits').append(button);
}
for(const id of ['name','helmet','fur','eyes','accent','gear','expression','badge']) {
  $(id).addEventListener('input',()=>{appearance[id]=$(id).value;changed();});
}
function selectTab(tab) {
  const nextMode=tab==='draw'?'drawing':'cadet';
  if(nextMode==='drawing'&&!drawing)drawing=model.grid(appearance);
  mode=nextMode;
  for(const id of ['look','gear','draw']) {
    const selected=id===tab;$(id+'-tab').setAttribute('aria-selected',String(selected));
    $(id+'-tab').tabIndex=selected?0:-1;$(id+'-panel').hidden=!selected;
  }
  if(mode==='drawing')drawBoard();
  blinkLater();
}
const tabs=['look','gear','draw'];
for(const id of tabs) {
  $(id+'-tab').onclick=()=>selectTab(id);
  $(id+'-tab').onkeydown=event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();let index=tabs.indexOf(id);
    if(event.key==='ArrowLeft')index=(index+2)%3;
    if(event.key==='ArrowRight')index=(index+1)%3;
    if(event.key==='Home')index=0;
    if(event.key==='End')index=2;
    selectTab(tabs[index]);$(tabs[index]+'-tab').focus();
  };
}
$('clear-gear').onclick=()=>{appearance={...appearance,headwear:'none',eyewear:'none',neckwear:'none'};changed();};
function randomItem(list) { return list[Math.floor(Math.random()*list.length)]; }
$('surprise').onclick=()=>{
  const p=randomItem(Object.values(model.presets));appearance={...appearance,...p,name:appearance.name,gear:p.accent};
  for(const category of Object.keys(model.options))appearance[category]=randomItem(Object.keys(model.options[category]));
  $('status').textContent='';selectTab('gear');sync();
};
$('motion').onchange=()=>{appearance.motion=$('motion').checked;$('status').textContent='';blinkLater();};
function design() { return {appearance,mode,drawing,birthday}; }
$('birthday').oninput=()=>{
  birthday=model.validBirthday($('birthday').value)?$('birthday').value:null;
  $('status').textContent='';refreshCode();
};
$('show-code').onclick=()=>{
  const expanded=$('code-details').hidden;
  $('code-details').hidden=!expanded;$('show-code').setAttribute('aria-expanded',String(expanded));
  $('show-code').textContent=expanded?'Hide code':'Show code';
};
$('copy-code').onclick=async()=>{
  refreshCode();
  if(!$('cat-code').value){$('passport-status').textContent='Check the cat name before copying.';return;}
  try { await navigator.clipboard.writeText($('cat-code').value);$('passport-status').textContent='Cat code copied. Keep it for your next adventure.'; }
  catch {
    $('code-details').hidden=false;$('show-code').setAttribute('aria-expanded','true');$('show-code').textContent='Hide code';
    $('cat-code').focus();$('cat-code').select();$('passport-status').textContent='Your code is selected. Copy it with ⌘C or Ctrl+C.';
  }
};
$('restore-code').onclick=()=>{
  try {
    const restored=CadetPassport.decode($('import-code').value);
    appearance=restored.appearance;mode=restored.mode;drawing=restored.drawing;birthday=restored.birthday;
    undoStack=[];redoStack=[];strokeStart=null;lastPixel=null;pointerId=null;
    selectTab(mode==='drawing'?'draw':'look');sync();
    $('status').textContent='Imported preview. Save my Cadet to keep this cat in this browser.';
    $('passport-status').textContent=appearance.name+' is back. Name, birthday and design restored.';
  } catch(error) { $('passport-status').textContent=error.message; }
};
$('save').onclick=()=>{
  try { localStorage.setItem(storageKey,JSON.stringify(model.serializeDesign(design())));$('status').textContent=appearance.name+' is saved in this browser.'; }
  catch { $('status').textContent='Browser storage is unavailable. Save the design file instead.'; }
};
$('reset').onclick=()=>{appearance=model.defaults();$('status').textContent='Default Cadet restored. Your drawing draft is kept.';selectTab('look');sync();};
function download(url,name) {
  const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
}
$('png').onclick=()=>{
  const c=document.createElement('canvas');c.width=c.height=16;
  paintPixels(c,model.serializeDesign(design()).pixels);download(c.toDataURL('image/png'),`space-cadet-cat-${c.width}.png`);
};
$('design').onclick=()=>{
  const blob=new Blob([JSON.stringify(model.serializeDesign(design()),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
  download(url,'space-cadet-cat.json');setTimeout(()=>URL.revokeObjectURL(url),1000);
};
function drawBoard() {
  cursor={x:Math.min(cursor.x,drawing.length-1),y:Math.min(cursor.y,drawing.length-1)};
  $('pixel-board').setAttribute('aria-label',`${drawing.length} by ${drawing.length} freehand pixel drawing canvas`);
  const canvas=$('pixel-board'),ctx=canvas.getContext('2d'),cell=canvas.width/drawing.length;
  for(let y=0;y<drawing.length;y++)for(let x=0;x<drawing.length;x++) {
    ctx.fillStyle=drawing[y][x]||((x+y)%2?'#30273a':'#3c3148');ctx.fillRect(x*cell,y*cell,cell,cell);
  }
  if($('pixel-grid').checked) {
    ctx.strokeStyle='#15101f77';ctx.lineWidth=1;ctx.beginPath();
    for(let i=1;i<drawing.length;i++){ctx.moveTo(i*cell+.5,0);ctx.lineTo(i*cell+.5,320);ctx.moveTo(0,i*cell+.5);ctx.lineTo(320,i*cell+.5);}ctx.stroke();
  }
  if(document.activeElement===canvas) {
    ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.strokeRect(cursor.x*cell+1,cursor.y*cell+1,cell-2,cell-2);
  }
  $('undo').disabled=!undoStack.length;$('redo').disabled=!redoStack.length;
}
function commit(before) {
  if(JSON.stringify(before)===JSON.stringify(drawing))return;
  undoStack.push(before);if(undoStack.length>historyLimit)undoStack.shift();redoStack=[];$('status').textContent='';
}
function refreshDrawing() { drawBoard();draw(); }
function replaceDrawing(next) { const before=copy(drawing);drawing=next;commit(before);refreshDrawing(); }
$('copy-cadet').onclick=()=>replaceDrawing(model.grid(appearance));
$('blank-drawing').onclick=()=>replaceDrawing(model.blankDrawing());
$('undo').onclick=()=>{if(!undoStack.length)return;redoStack.push(copy(drawing));drawing=undoStack.pop();$('status').textContent='';refreshDrawing();};
$('redo').onclick=()=>{if(!redoStack.length)return;undoStack.push(copy(drawing));drawing=redoStack.pop();$('status').textContent='';refreshDrawing();};
$('pixel-grid').onchange=drawBoard;
function setTool(value) { tool=value;for(const id of ['brush','eraser','picker'])$(id).setAttribute('aria-pressed',String(id===tool)); }
for(const id of ['brush','eraser','picker'])$(id).onclick=()=>setTool(id);
for(const color of ['#e9e3ff','#b798ed','#211a32','#7bd8c2','#f1d593','#ecaeaa','#93b9d7','#ffffff']) {
  const b=document.createElement('button');b.style.background=color;b.setAttribute('aria-label','Paint '+color);
  b.onclick=()=>{$('paint-color').value=color;setTool('brush');};$('paint-swatches').append(b);
}
const board=$('pixel-board');
function pixelAt(event) {
  const r=board.getBoundingClientRect();
  return{x:Math.max(0,Math.min(drawing.length-1,Math.floor((event.clientX-r.left)/r.width*drawing.length))),y:Math.max(0,Math.min(drawing.length-1,Math.floor((event.clientY-r.top)/r.height*drawing.length)))};
}
function applyPixel(point, erase=false) {
  cursor=point;
  if(tool==='picker'&&!erase) { const color=drawing[point.y][point.x];if(color)$('paint-color').value=color;setTool('brush');return; }
  let color=$('paint-color').value;if(tool==='eraser'||erase)color=null;
  drawing=model.stroke(drawing,lastPixel||point,point,color);lastPixel=point;
}
board.onpointerdown=event=>{
  if(pointerId!==null||![0,2].includes(event.button))return;
  event.preventDefault();board.focus();
  if(tool==='picker'&&event.button===0){applyPixel(pixelAt(event));refreshDrawing();return;}
  pointerId=event.pointerId;board.setPointerCapture(pointerId);
  strokeStart=copy(drawing);lastPixel=null;applyPixel(pixelAt(event),event.button===2);refreshDrawing();
};
board.onpointermove=event=>{
  if(event.pointerId!==pointerId||strokeStart===null)return;
  applyPixel(pixelAt(event),(event.buttons&2)!==0);refreshDrawing();
};
function endStroke(event) {
  if(event.pointerId!==pointerId)return;
  if(strokeStart)commit(strokeStart);strokeStart=null;lastPixel=null;pointerId=null;drawBoard();
}
board.onpointerup=endStroke;board.onpointercancel=endStroke;board.onlostpointercapture=endStroke;
board.oncontextmenu=event=>event.preventDefault();
board.onfocus=drawBoard;board.onblur=drawBoard;
board.onkeydown=event=>{
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='z'){event.preventDefault();if(event.shiftKey)$('redo').click();else $('undo').click();return;}
  const step={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
  if(step){event.preventDefault();cursor={x:Math.max(0,Math.min(drawing.length-1,cursor.x+step[0])),y:Math.max(0,Math.min(drawing.length-1,cursor.y+step[1]))};drawBoard();return;}
  if(event.key===' '||event.key==='Enter'){event.preventDefault();const before=copy(drawing);lastPixel=null;applyPixel(cursor);lastPixel=null;commit(before);refreshDrawing();}
};
document.addEventListener('visibilitychange',blinkLater);reduced.addEventListener('change',blinkLater);
sync();selectTab(mode==='drawing'?'draw':'look');
