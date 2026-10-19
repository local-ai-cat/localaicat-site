(()=>{
"use strict";
const CAT=['....########....','..##........##..','.#............#.','.#............#.','#...##....##...#','#...###..###...#','#...########...#','#...#..##..#...#','#...#..##..#...#','#...########...#','#...########...#','#..............#','.##..........##.','...##########...','....#......#....','....########....'];
const $=s=>document.querySelector(s);
const utilities=[['afk','♧','AFK','Cat’s on watch.','Away mode, safely covered.'],['sentry','◉','Sentry','Perimeter check.','Cat is keeping a lookout.'],['focus','◴','Pomodoro','One mission at a time.','Focus face: activated.'],['eye','◎','Eye Care','A little further out.','Time to look beyond the screen.'],['sleep','☾','Cat Nap','The galaxy can wait.','Wake me when it’s snack time.'],['awake','♨','Screen Awake','Fuelled by tiny coffees.','Keeping you company.'],['clean','⌨','Keyboard Cleaning','Paws off the keyboard.','A clean cockpit is a happy cockpit.']];
let mode='idle',momentUntil=0,active=new Set(),anim=!matchMedia('(prefers-reduced-motion: reduce)').matches,recording=false,loaded=false,loadTimer=null,fuel=0,timer=null,remaining=1500,lastSecond=0;
$('#motion').checked=anim;
function caption(title,copy){$('#reaction-status').textContent=title+' '+copy;}
function react(next,title,copy,duration=0){mode=next;momentUntil=duration?performance.now()+duration:0;caption(title,copy);}
function restore(){const item=utilities.find(x=>active.has(x[0]));if(item)react(item[0],item[3],item[4]);else if(recording)react('listen','All ears, cadet.','Your voice is coming in clearly.');else react('idle','All systems cosy.','Your little co-pilot is here.');}
function focusLabel(){const b=$('[data-mode="focus"] small');b.textContent=active.has('focus')?`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`:'Off';}
for(const [id,icon,label,title,copy] of utilities){$(`[data-mode="${id}"]`).onclick=()=>{if(active.has(id)){active.delete(id);restore();}else{active.add(id);react(id,title,copy);}const b=$(`[data-mode="${id}"]`);b.setAttribute('aria-pressed',String(active.has(id)));b.querySelector('small').textContent=active.has(id)?'On':'Off';if(id==='focus'){remaining=1500;focusLabel();}};}
const moments={wave:['Hello again.','A little wave, just for you.'],drift:['Checking the lifeline.','Quiet cord. Very important cargo.'],sneeze:['Ah… pixel-choo!','Space dust. Gets everywhere.'],sleep:['Just five more seconds.','Even co-pilots need a micro nap.']};
document.querySelectorAll('[data-moment]').forEach(b=>b.onclick=()=>react(b.dataset.moment,...moments[b.dataset.moment],6000));
$('#motion').onchange=e=>{anim=e.target.checked;};
document.querySelectorAll('[data-machine]').forEach(b=>b.onclick=()=>react('signal','Calling '+b.dataset.machine+'.','A little ping across the fleet. Demo only.',4500));
$('#record').onclick=()=>{recording=!recording;$('#record small').textContent=recording?'Listening':'Off';$('#record').setAttribute('aria-pressed',String(recording));restore();if(recording)react('listen','All ears, cadet.','A pretend signal. No microphone needed.');};
$('#model').onclick=()=>{if(loadTimer)return;if(loaded){loaded=false;fuel=0;$('#fuel').style.width='0%';$('#model small').textContent='Tap to load';restore();return;}react('load','Precious cargo coming aboard.','Fuelling up the local model.');loadTimer=setInterval(()=>{fuel=Math.min(100,fuel+5);$('#fuel').style.width=fuel+'%';$('#model small').textContent=fuel+'%';if(fuel===100){clearInterval(loadTimer);loadTimer=null;loaded=true;$('#model small').textContent='Ready · unload';react('wave','Ready for your next idea.','Model aboard. All paws accounted for.',5000);}},160);};
$('#brightness').oninput=e=>{$('#brightness-value').textContent=e.target.value+'%';};
$('#volume').oninput=e=>{$('#volume-label').textContent=e.target.value==='0'?'Muted':e.target.value+'%';};
let thrust=1,destination='This Mac',battery=67,powerSource='battery';
let supportedModes=[0,1,2];
const shipColours=[SpaceRocket.colours.lowPower,SpaceRocket.colours.neutral,SpaceRocket.colours.highPower];
function powerLabel(){if(powerSource==='charging')return battery+'% · Charging';if(powerSource==='full')return '100% · Plugged in';return battery+'% · Battery';}
function syncPower(){document.querySelector('.power .pill').textContent=powerLabel();$('#orbit-charge').textContent=powerLabel();$('#battery-mode').textContent=profiles[thrust].name+' · '+powerLabel();document.body.dataset.power=powerSource;$('#battery-detail-status').textContent=powerSource==='battery'?'Discharging':powerSource==='charging'?'Charging':'Fully charged';$('#battery-detail-source').textContent=powerSource==='battery'?'Battery':'Power adapter';$('#battery-detail-flow').textContent=powerSource==='battery'?['−6 W','−12 W','−24 W'][thrust]:powerSource==='charging'?'+28 W':'0 W';$('#battery-detail-adapter').textContent=powerSource==='battery'?'Not connected':'65 W · USB-C';}
const profiles=[{name:'Low Power',copy:'A quiet little orbit.\nBattery comes first.',speed:'Gentle',draw:'Low',status:'Taking the scenic route.'},{name:'Automatic',copy:'A little speed.\nA little staying power.',speed:'Balanced',draw:'Moderate',status:'Cruising comfortably.'},{name:'High Power',copy:'A short burst of speed.\nMore power, more battery.',speed:'Fast',draw:'High',status:'All paws on deck.'}];
function setThrust(value){thrust=Number(value);if(!supportedModes.includes(thrust))thrust=supportedModes[0];const p=profiles[thrust];for(const id of ['throttle','orbit-throttle']){const slider=$('#'+id);slider.max=supportedModes.length-1;slider.value=supportedModes.indexOf(thrust);}$('#orbit-throttle').setAttribute('aria-valuetext',p.name);$('#orbit-power').textContent=p.name;$('#throttle').setAttribute('aria-valuetext',p.name);$('#power-name').textContent=p.name;$('#power-copy').textContent=p.copy;$('#speed-label').textContent=p.speed;$('#draw-label').textContent=p.draw;$('#speed-meter').value=thrust+1;$('#draw-meter').value=thrust+1;$('#flight-status').textContent=powerSource==='battery'?p.status:powerSource==='charging'?'Refuelling through the connected pipe.':'Fully charged. Ready when you are.';$('#profile-summary').textContent=destination+' · '+p.name;syncPower();document.documentElement.style.setProperty('--ship-colour',shipColours[thrust]);document.querySelectorAll('[data-thrust]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.thrust)===thrust)));}
function showMenus(which){$('#menu').hidden=which==='compute';$('#compute-panel').hidden=which==='tools';$('#menu-toggle').setAttribute('aria-expanded','true');}
$('#menu-toggle').onclick=()=>{showMenus('tools');react('wave','Welcome back.','Kept your seat warm.',3500);};
$('#menu-toggle').oncontextmenu=e=>{e.preventDefault();showMenus('compute');};
$('#menu-toggle').onkeydown=e=>{if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){e.preventDefault();showMenus('compute');$('#throttle').focus();}};
$('#show-both').onclick=()=>showMenus('both');
$('#close-compute').onclick=()=>showMenus('tools');$('#open-tools').onclick=()=>showMenus('tools');
for(const id of ['battery-button'])$('#'+id).onclick=()=>{showMenus('compute');$('#throttle').focus();};
$('#open-compute').onclick=()=>showMenus('tools');$('#compute-button').onclick=()=>{document.querySelector('[data-destination="This Mac"]').focus();};
$('#throttle').oninput=e=>setThrust(supportedModes[Number(e.target.value)]);$('#orbit-throttle').oninput=e=>setThrust(supportedModes[Number(e.target.value)]);document.querySelectorAll('[data-thrust]').forEach(b=>b.onclick=()=>setThrust(b.dataset.thrust));
document.querySelectorAll('[data-destination]').forEach(b=>b.onclick=()=>{destination=b.dataset.destination;document.querySelectorAll('[data-destination]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('#destination-status').textContent=destination==='This Mac'?'Running locally. Your ideas stay aboard.':'Remote compute selected. Connection is simulated.';setThrust(thrust);});
function limits(){$('#memory-value').textContent=$('#memory').value+' GB';$('#limit-status').textContent=$('#memory').value+' GB · '+$('#jobs').value+' jobs · '+$('#context').value+' context';}
for(const id of ['memory','jobs','context'])$('#'+id).oninput=limits;
$('#low-battery').onclick=()=>{battery=battery===67?18:67;powerSource='battery';$('#power-source').value='battery';syncPower();if(battery<20&&$('#battery-guard').checked){setThrust(0);$('#flight-status').textContent='Low battery. Cat eased off the throttle.';}else setThrust(thrust);$('#low-battery').textContent=battery===18?'Restore battery to 67%':'Try low-battery event';};
function dialog(title,copy){$('#ssh-command').hidden=true;$('#copy-status').textContent='';$('#dialog-title').textContent=title;$('#dialog-copy').textContent=copy;$('#action-dialog').showModal();}
$('#main-window').onclick=()=>dialog('Hello, cadet.','This opens the main app in the real menu. This demo keeps you here.');
const actionCopy={'Terminal':'A terminal connection to this machine would open here.','Mouse control':'Remote mouse control would start here. No input is sent by this demo.','Screen sharing':'The selected machine’s screen would open here.','Remote terminal':'A terminal for Mac mini de x would open here.','Remote mouse':'Mouse control for Mac mini de x would start here.','Remote screen':'The Mac mini desktop would open here.','Desktop background':'Your desktop wallpaper picker would open here.','Clipboard item':'This sample stays in the demo; your clipboard is unchanged.','Local CLI':'The app’s local command-line setup would open here.','API Docs':'API documentation and token setup would open here.','Quit Apps':'The app chooser for quitting running apps would open here.','All Settings':'The app settings window would open here.','Quit Local AI Cat':'This would quit the app. The demo remains open.'};
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>dialog(b.dataset.action,actionCopy[b.dataset.action]));
$('#close-dialog').onclick=$('#dismiss-dialog').onclick=()=>$('#action-dialog').close();
document.querySelectorAll('[data-clean]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-clean]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));react('clean','Paws off the keyboard.',b.dataset.clean+' cleaning tint selected. Demo only.',4000);});
$('#reset').onclick=()=>location.reload();
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#device-menu').hidden){e.preventDefault();closeDeviceMenu();}});
$('#screen-control').onclick=()=>{$('#display-details').open=true;$('#brightness').focus();react('wave','A brighter little world.','Display controls are ready.',3500);};
$('#keyboard-control').onclick=()=>{$('#keyboard-details').open=true;$('#keyboard-details input').focus();react('clean','Light up the cockpit.','Keyboard backlight controls are ready.',3500);};
function variant(classic){document.body.classList.toggle('classic',classic);$('#classic-option').setAttribute('aria-pressed',String(classic));$('#v2-option').setAttribute('aria-pressed',String(!classic));if(classic)showMenus('tools');else showMenus('both');}
$('#classic-option').onclick=()=>variant(true);$('#v2-option').onclick=()=>variant(false);
$('#power-source').onchange=e=>{powerSource=e.target.value;syncPower();$('#flight-status').textContent=powerSource==='battery'?'Back in orbit.':powerSource==='charging'?'Refuelling through the connected pipe.':'Fully charged. Ready when you are.';};
$('#tailscale').onchange=e=>{document.body.classList.toggle('networked',e.target.checked);$('#network-label').textContent=e.target.checked?'4 DEVICES':'THIS MAC';};
$('#network-laptop').onclick=e=>openDeviceMenu('iphone',e.currentTarget);
$('#network-control').onclick=e=>openDeviceMenu('mini',e.currentTarget);
$('#network-phone').onclick=e=>openDeviceMenu('pixel',e.currentTarget);
$('#power-capability').onchange=e=>{
 const choices={all:[0,1,2],ends:[0,2],standard:[0,1]};supportedModes=choices[e.target.value];
 const adjusted=!supportedModes.includes(thrust);setThrust(thrust);
 document.querySelectorAll('[data-thrust]').forEach(b=>b.hidden=!supportedModes.includes(Number(b.dataset.thrust)));
 $('#capability-status').textContent=supportedModes.map(i=>profiles[i].name).join(' / ')+(adjusted?' · switched to Low Power.':'.');
};
const devices={macbook:{name:'MacBook Pro',os:'macOS',host:'macbook.demo.example',mac:true,online:true},mini:{name:'Mac mini de x',os:'macOS',host:'mac-mini.demo.example',mac:true,online:true},iphone:{name:'iPhone',os:'iOS',host:'iphone.demo.example',mac:false,online:true},pixel:{name:'Pixel',os:'Android',host:'pixel.demo.example',mac:false,online:false}};
let selectedDevice='macbook',menuTrigger=null;
function closeDeviceMenu(){if($('#device-menu').hidden)return;$('#device-menu').hidden=true;if(menuTrigger)menuTrigger.focus();}
function openDeviceMenu(id,trigger,event){
 selectedDevice=id;menuTrigger=trigger;const device=devices[id],menu=$('#device-menu');
 $('#device-menu-title').textContent=device.name;$('#copy-ssh').hidden=!device.mac;$('#share-screen').hidden=!device.mac;
 menu.hidden=false;const rect=trigger.getBoundingClientRect();
 const left=event?event.clientX:rect.left;const top=event?event.clientY:rect.bottom;
 menu.style.left=Math.max(8,Math.min(left,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(top,innerHeight-menu.offsetHeight-8))+'px';
 menu.querySelector('button:not([hidden])').focus();
}
document.querySelectorAll('.tail-device').forEach(row=>{
 row.oncontextmenu=e=>{e.preventDefault();openDeviceMenu(row.dataset.device,row,e);};
 row.onkeydown=e=>{if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')||e.key==='Enter'){e.preventDefault();openDeviceMenu(row.dataset.device,row);}};
});
document.querySelectorAll('[data-device-menu]').forEach(b=>b.onclick=e=>{e.stopPropagation();openDeviceMenu(b.dataset.device,b);});
$('#device-menu').onkeydown=e=>{const items=[...$('#device-menu').querySelectorAll('button:not([hidden])')];const i=items.indexOf(document.activeElement);if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();items[(i+(e.key==='ArrowDown'?1:items.length-1))%items.length].focus();}};
document.addEventListener('pointerdown',e=>{if(!$('#device-menu').hidden&&!$('#device-menu').contains(e.target)&&!e.target.closest('[data-device-menu],.remote-computer'))$('#device-menu').hidden=true;});
$('#copy-ssh').onclick=async()=>{const d=devices[selectedDevice],command='ssh '+d.host;closeDeviceMenu();dialog('SSH · '+d.name,'Sample command for this demo device. Real integration would use its tailnet hostname and configured SSH user.');$('#ssh-command').hidden=false;$('#ssh-command').value=command;try{await navigator.clipboard.writeText(command);$('#copy-status').textContent='Copied SSH command.';}catch{$('#copy-status').textContent='Select and copy the command below.';$('#ssh-command').focus();$('#ssh-command').select();}};
$('#share-screen').onclick=()=>{const d=devices[selectedDevice];closeDeviceMenu();dialog('Screen Sharing · '+d.name,'In the native app this would open macOS Screen Sharing for '+d.host+'. This web demo does not start a connection.');};
$('#device-info').onclick=()=>{const d=devices[selectedDevice];closeDeviceMenu();dialog(d.name,d.os+' · '+(d.online?'Online':'Last seen 2 hours ago')+' · '+d.host+(d.mac?' · SSH and Screen Sharing actions available.':' · Listed in your tailnet. Mac-only actions are not offered.'));};
setThrust(1);
// Port of SpaceCadetPixelArt standard rocket, cable and pulse geometry.
function nativeRocket(c,x,y,scale,t){
 const energyMode=['lowPower','automatic','highPower'][thrust];
 let power='battery';if(powerSource==='charging')power='charging';else if(powerSource==='full')power='pluggedIn';
 const cpuFraction=Number($('#cpu-load').value)/3;
 SpaceRocket.draw(c,{chargePercent:powerSource==='full'?100:battery,energyMode,power,cpuFraction},x,y,scale,anim?t:0);
}

function sprite(c,rows,x,y,s,ink='#e9e3ff'){c.fillStyle=ink;rows.forEach((row,j)=>[...row].forEach((v,i)=>{if(v!=='.'){c.fillStyle=v==='u'?shipColours[thrust]:ink;c.fillRect(Math.round(x+i*s),Math.round(y+j*s),s,s);}}));}
function line(c,x,y,a,b,color){c.strokeStyle=color;c.lineWidth=1;c.beginPath();c.moveTo(x,y);c.lineTo(a,b);c.stroke();}
function draw(now){const t=anim?now/1000:0;if(momentUntil&&now>momentUntil)restore();if(now-lastSecond>=1000){lastSecond=now;if(active.has('focus')&&remaining>0){remaining--;focusLabel();if(remaining===0){active.delete('focus');$('[data-mode="focus"]').setAttribute('aria-pressed','false');react('wave','Mission complete.','Time for a little break.',6000);}}}
const c=$('#pet').getContext('2d');c.clearRect(0,0,360,90);for(let i=0;i<20;i++){c.fillStyle=i%3?'#4e455e':'#8e79a2';c.fillRect(((i*73-(powerSource==='battery'?t*(thrust+1)*15:0))%360+360)%360,(i*i*19)%78,powerSource==='battery'&&thrust===2?7:1,1);}let x=23+(powerSource==='battery'?Math.sin(t)*2:0),y=22;if(mode==='drift'&&powerSource==='battery')x+=Math.sin(t*1.8)*10;if(mode==='sneeze')x+=Math.sin(t*36)*3;if(powerSource==='battery')line(c,x+47,y+32,104,54,'#635970');nativeRocket(c,104,22,3,t);sprite(c,CAT,x,y,3);
if(mode==='sleep'||(mode==='idle'&&Math.floor(t)%9===7)){c.fillStyle='#e9e3ff';c.fillRect(x+15,y+21,6,6);c.fillRect(x+27,y+21,6,6);c.fillStyle='#272633';c.fillRect(x+15,y+24,6,2);c.fillRect(x+27,y+24,6,2);}
c.font='11px monospace';c.fillStyle='#c8b1eb';if(mode==='sleep')c.fillText('z Z',x+35,y-5-Math.sin(t)*3);
if(mode==='wave'||mode==='afk'||mode==='sentry')line(c,x,y+22,x-8,y+12+Math.sin(t*5)*5,'#e9e3ff');
if(mode==='focus'){c.fillStyle='#9875e4aa';c.fillRect(x+7,y+12,20,8);c.fillStyle='#d7c7ff';c.fillRect(x+9,y+15,16,1);}
if(mode==='awake')c.fillText('☕',x+34,y+21);
if(mode==='eye'){c.strokeStyle='#6ccad1';c.beginPath();c.arc(x-26,y+16,12,0,Math.PI*2);c.stroke();c.fillText('✦',x-29,y+20);}
if(mode==='clean'){c.fillText('✧',x+36,y+Math.sin(t*3)*6);}
if(mode==='listen'||mode==='signal'){for(let i=0;i<12;i++){const h=3+Math.abs(Math.sin(t*5+i))*15;c.fillStyle='#36ccef';c.fillRect(75+i*4,45-h/2,2,h);}}
if(mode==='load'){c.fillStyle='#ffc398';c.fillRect(234,55,8,3+Math.sin(t*18)*3);}
const b=$('#bar-cat').getContext('2d');b.clearRect(0,0,42,22);sprite(b,CAT,1,1,1);if(powerSource==='battery')line(b,17,12,23,12,'#8d819c');nativeRocket(b,23,1,1,t);document.body.classList.add('ready');requestAnimationFrame(draw);}
document.querySelectorAll('.ship').forEach(c=>{const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);nativeRocket(g,4,1,1.6,0);});requestAnimationFrame(draw);

})();