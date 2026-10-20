'use strict';
const $=id=>document.getElementById(id);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const state={view:'home',appearance:CadetModel.defaults(),icon:'night',colour:false,charging:false,modelLoaded:false,background:'quiet',device:'This Mac',sentry:false,suit:'original',motion:true};
const companionKey='space-direction-cadet-v1';
try {const saved=JSON.parse(localStorage.getItem(companionKey));if(saved){state.appearance=CadetModel.normalize(saved.appearance);state.motion=state.appearance.motion;state.suit=saved.suit||'original';}} catch {}
const paths={mic:'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5ZM6 10v2a6 6 0 0 0 12 0v-2M12 18v4M8 22h8',globe:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM2 12h20M12 2c-6 5-6 15 0 20 6-5 6-15 0-20ZM4 6h16M4 18h16',spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z',tools:'m4 3 5 5-1 3-3 1-4-4a6 6 0 0 0 7 8l6 6a3 3 0 0 0 4-4l-6-6a6 6 0 0 0-8-9ZM18 2l4 4-7 7',window:'M3 4h18v16H3V4ZM3 8h18M6 6h.1M9 6h.1',display:'M2 3h20v14H2V3ZM12 17v4M7 21h10',keyboard:'M2 5h20v14H2V5ZM5 9h1m3 0h1m3 0h1m3 0h1M5 12h1m3 0h1m3 0h1m3 0h1M6 16h12',audio:'m3 9 5 0 5-5v16l-5-5H3V9ZM17 8c3 2 3 6 0 8M20 5c5 4 5 10 0 14',clipboard:'M8 4H4v18h16V4h-4M8 2h8v5H8V2ZM8 11h8M8 15h6',eye:'M1 12c5-9 17-9 22 0-5 9-17 9-22 0ZM16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',timer:'M9 2h6M12 6a8 8 0 1 1-8 8 8 8 0 0 1 8-8ZM12 9v5l3 2',cup:'M3 5h14v9a7 7 0 0 1-14 0V5ZM17 6h2a4 4 0 0 1 0 8h-2M2 22h17',moon:'M20 16A10 10 0 0 1 8 2a10 10 0 1 0 12 14Z',camera:'M2 5h14v14H2V5ZM16 9l6-4v14l-6-4',walk:'M14 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM6 11l5-4 4 4h5M12 8l-2 7-5 7M10 15l6 2v5',power:'M12 2v9M5 5a10 10 0 1 0 14 0',phone:'M7 2h10v20H7V2ZM10 19h4',laptop:'M4 3h16v13H4V3ZM1 20h22l-3-4H4l-3 4Z',background:'M2 3h20v17H2V3ZM2 16l6-7 7 7 4-5 3 3M15 7h.1'};
function icon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.spark}"/></svg>`;}
function catSVG(colour=true,mono='currentColor',appearance=state.appearance){
 const pixels=CadetModel.framePixels(CadetModel.grid(appearance));let markup='';
 pixels.forEach((row,y)=>row.forEach((c,x)=>{if(c&&(colour||c!==appearance.eyes))markup+=`<rect x="${x}" y="${y}" width="1" height="1" fill="${colour?c:mono}"/>`;}));
 return `<svg viewBox="-1 -1 ${pixels.length+2} ${pixels.length+2}" shape-rendering="crispEdges" aria-hidden="true">${markup}</svg>`;
}
function rocketSVG(colour=true,charging=state.charging){
 const energyMode=['lowPower','automatic','highPower'][Number($('throttle').value)];
 return SpaceRocket.svg({chargePercent:67,energyMode,power:charging?'charging':'battery',cpuFraction:charging?0:.35},0,{monochrome:!colour});
}

let iconID=0;
function appIcon(kind){
 const id='icon-gradient-'+iconID++;let backdrop='';
 if(kind==='orbit')backdrop=`<defs><linearGradient id="${id}" x2=".8" y2="1"><stop stop-color="#514260"/><stop offset="1" stop-color="#292333"/></linearGradient></defs><rect x="4" y="4" width="120" height="120" rx="27" fill="url(#${id})" stroke="#9a80b27a"/><ellipse cx="64" cy="93" rx="47" ry="16" fill="none" stroke="#bda4eb22"/><circle cx="107" cy="86" r="2" fill="#7bd8c2"/>`;
 if(kind==='signal')backdrop='<rect x="4" y="4" width="120" height="120" rx="27" fill="#bda4eb" stroke="#d8c6f8"/>';
 if(kind==='night')backdrop='<rect x="4" y="4" width="120" height="120" rx="27" fill="#1c2035" stroke="#7d79a666"/><path d="M5 99Q61 61 123 100v1a27 27 0 0 1-27 23H31A27 27 0 0 1 5 99" fill="#3a354f"/><path d="M20 27h2v2h-2zm78 12h2v2h-2zM89 18h1v1h-1zM17 67h1v1h-1z" fill="#bda4eb"/><circle cx="102" cy="23" r="6" fill="#8e79a0"/>';
 const original=state.appearance;if(kind==='signal')state.appearance={...original,helmet:'#32233f',fur:'#32233f',eyes:'#bda4eb',accent:'#32233f'};
 const cat=catSVG(true).replace('<svg ','<svg x="26" y="23" width="76" height="76" ');state.appearance=original;
 return `<svg viewBox="0 0 128 128" aria-hidden="true">${backdrop}${cat}</svg>`;
}
function renderCats(){
 document.querySelectorAll('.chat-cadet,.watermark-cadet').forEach(el=>el.innerHTML=catSVG());
 document.querySelectorAll('.flight-scene').forEach(el=>el.innerHTML=flightSVG(el.classList.contains('menu-flight')&&state.charging));
 document.querySelectorAll('[data-cat-name]').forEach(el=>el.textContent=state.appearance.name);
 renderFlight(performance.now()/1000);
 $('status-item').innerHTML=catSVG(state.colour)+rocketSVG(state.colour);
 document.querySelectorAll('.icon-option').forEach(el=>{el.querySelector('.large-icon').innerHTML=appIcon(el.dataset.appIcon);const selected=el.dataset.appIcon===state.icon;el.classList.toggle('selected',selected);el.setAttribute('aria-pressed',String(selected));});
 document.querySelector('.selected-dock').innerHTML=appIcon(state.icon);
 document.querySelector('.icon-sizes').innerHTML=[16,32,64,96].map(size=>`<div><span style="width:${size}px;height:${size}px">${appIcon(state.icon)}</span><small>${size}</small></div>`).join('');
 document.querySelectorAll('.tiny-pair').forEach(el=>el.innerHTML=catSVG(state.colour)+rocketSVG(state.colour));
}
function setView(view){
 if(state.view!==view)cancelAFK();
 state.view=view;
 document.querySelectorAll('.proposal-view').forEach(el=>el.hidden=el.id!==view+'-view');
 document.querySelectorAll('[data-view]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.view===view)));
 const frame=$('voyage-frame');frame.contentWindow?.postMessage({type:'voyage-visibility',visible:view==='voyage'},location.origin);
 const url=new URL(location.href);url.hash=view;history.replaceState(null,'',url);
 scheduleFlight();
}
let toastTimer;
function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3000);}
const utilities=[['walk','AFK','Off'],['camera','Sentry','Off'],['keyboard','Keyboard Cleaning Mode',''],['eye','Eye Care (20-20-20)',''],['timer','Pomodoro',''],['moon','Cat Nap',''],['cup','Screen Awake','Off'],['background','Desktop background','']];
$('utility-rows').innerHTML=utilities.map(([glyph,label,value])=>{
 let extra='';
 if(label==='AFK')extra='<div id="afk-countdown" class="afk-countdown" hidden><div><b id="afk-seconds" role="status">Stepping away in 5…</b><button id="cancel-afk">Cancel</button></div><label><input id="afk-sentry" type="checkbox"> Enable Sentry while away</label><small>Escape cancels. This is a lock-screen preview.</small></div>';
 if(label==='Sentry')extra='<div id="sentry-controls" class="utility-panel" hidden><label><input id="sentry-enabled" type="checkbox"> Sentry while away</label><small>Preview only · camera stays off</small></div>';
 if(label==='Screen Awake')extra='<div id="awake-controls" class="utility-panel" hidden><div class="awake-durations" role="group" aria-label="Stay awake duration">'+['Off','15m','30m','1h','4h','∞'].map(value=>`<button data-awake="${value}" aria-pressed="${value==='Off'}">${value}</button>`).join('')+'</div><label><input id="awake-lid" type="checkbox" disabled> Keep awake with lid closed</label></div>';
 const disclosure=["Sentry","Screen Awake"].includes(label);
 const accessibility=disclosure?'aria-expanded="false"':'aria-pressed="false"';
 return `<button class="menu-row utility" data-utility="${label}" ${accessibility}><span>${icon(glyph)}</span>${label}<span class="row-value">${value}</span></button>`+extra;
}).join('');
const devices=[{name:'This Mac',symbol:'laptop',detail:'MacBook Pro · this device',address:'this-mac.example'},{name:'Mac mini',symbol:'display',detail:'Tailscale · online',address:'mac-mini.example'},{name:'iPhone',symbol:'phone',detail:'Tailscale · online',address:'iphone.example'}];
const deviceMarkup=devices.map(d=>`<button class="device-row" data-device="${d.name}" aria-label="${d.name} device actions"><span>${icon(d.symbol)}</span><span><strong>${d.name}</strong><small>${d.detail}</small></span><span class="device-more">⋯</span></button>`).join('');
$('device-rows').innerHTML=deviceMarkup;$('tailnet-devices').innerHTML=deviceMarkup;
function closeMenus(){cancelAFK();$('flight-menu').hidden=true;$('everyday-menu').hidden=true;$('device-menu').hidden=true;$('status-item').setAttribute('aria-expanded','false');scheduleFlight();}
function showFlight(flight){cancelAFK();$('flight-menu').hidden=!flight;$('everyday-menu').hidden=flight;$('device-menu').hidden=true;$('status-item').setAttribute('aria-expanded','true');scheduleFlight();}
function showDevice(name){state.device=name;$('device-title').textContent=name;$('copy-ssh').hidden=name==='iPhone';$('screen-sharing').hidden=name==='iPhone'||name==='This Mac';$('local-display').hidden=name!=='This Mac';$('local-keyboard').hidden=name!=='This Mac';$('device-menu').hidden=false;}
function updatePower(){
 const names=['Low power','Automatic','High power'];const value=Number($('throttle').value);$('throttle-name').textContent=names[value];$('throttle').setAttribute('aria-valuetext',names[value]);
 document.querySelectorAll('.power-caption').forEach(el=>el.textContent=state.charging?'67% · Charging':'67% · On battery');
 document.querySelector('.orbital-header').classList.toggle('charging',state.charging);renderCats();scheduleFlight();
}
function showChat(message,reply){$('user-message').textContent=message;$('chat-reply').textContent=reply;$('home-content').hidden=true;$('chat-content').hidden=false;}
function feature(name){
 if(name==='Utilities'){setView('menu');showFlight(false);return;}
 const replies={Transcribe:'Ready when you are. In the app, hold your recording shortcut to speak, then keep your words here as a draft.',Translate:'Choose the language you’d like to translate into, then type or speak. Your Cat will keep the conversation right here.',Create:'A song, an image, a small idea worth keeping. What would you like to make?'};
 showChat(name,replies[name]);
}
function setBackground(value){state.background=value;$('app-window').classList.toggle('deep',value==='deep');$('app-window').classList.toggle('plain',value==='plain');$('background-select').value=value;$('background-caption').textContent=$('background-select').selectedOptions[0].text;}
function applyMotion(){
 const toggle=$('ambient-motion');
 document.body.classList.toggle('with-motion',toggle.checked&&!reduced.matches);
 toggle.disabled=reduced.matches;
 if(reduced.matches){toggle.checked=false;toggle.parentElement.title='System Reduce Motion is enabled';}
 else toggle.parentElement.removeAttribute('title');
}
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>setView(el.dataset.view)));
document.querySelectorAll('[data-toast]').forEach(el=>el.addEventListener('click',()=>toast(el.dataset.toast)));
document.querySelectorAll('[data-feature]').forEach(el=>el.addEventListener('click',()=>feature(el.dataset.feature)));
document.querySelectorAll('[data-device]').forEach(el=>{el.addEventListener('click',()=>showDevice(el.dataset.device));el.addEventListener('contextmenu',event=>{event.preventDefault();showDevice(el.dataset.device);});});
document.querySelectorAll('[data-app-icon]').forEach(el=>el.addEventListener('click',()=>{state.icon=el.dataset.appIcon;renderCats();}));
document.querySelectorAll('.utility').forEach(el=>el.addEventListener('click',()=>{
 const label=el.dataset.utility;
 if(label==='AFK'){if(afk.active())cancelAFK();else startAFK();return;}
 if(label==='Sentry'){$('sentry-controls').hidden=!$('sentry-controls').hidden;el.setAttribute('aria-expanded',String(!$('sentry-controls').hidden));return;}
 if(label==='Screen Awake'){$('awake-controls').hidden=!$('awake-controls').hidden;el.setAttribute('aria-expanded',String(!$('awake-controls').hidden));return;}
 if(label==='Desktop background'){openSettings();return;}
 const active=el.getAttribute('aria-pressed')!=='true';el.setAttribute('aria-pressed',String(active));el.querySelector('.row-value').textContent=active?'On':'Off';
 if(label==='Pomodoro')el.querySelector('.row-value').textContent=active?'25:00':'Off';
 toast(label+(active?' started · preview':' stopped · preview'));
}));
$('hello-cat').onclick=()=>{const el=$('hello-cat');el.classList.remove('hello');void el.offsetWidth;el.classList.add('hello');toast('A tiny wave from your co-pilot.');};
$('back-home').onclick=()=>{$('home-content').hidden=false;$('chat-content').hidden=true;};
$('composer').onsubmit=event=>{event.preventDefault();const value=$('message').value.trim();if(!value)return;showChat(value,'This is how your conversation would feel: your chosen Cat beside the reply, a quiet sky behind it, and the same composer always within reach.');$('message').value='';};
$('model-select').onclick=()=>{const el=$('model-select');el.textContent=el.textContent.includes('Gemma')?'Qwen3.8 27B ⌄':'Gemma 4 12B ⌄';};
$('settings-preview').onclick=openSettings;
$('close-settings').onclick=()=>$('appearance').close();
$('customise-companion').onclick=()=>{$('appearance').close();setView('studio');};
$('background-select').onchange=()=>setBackground($('background-select').value);
$('ambient-motion').onchange=applyMotion;reduced.addEventListener('change',()=>{applyMotion();scheduleFlight();});
$('status-item').onclick=()=>{if(!$('everyday-menu').hidden||!$('flight-menu').hidden)closeMenus();else showFlight(false);};
$('status-item').oncontextmenu=event=>{event.preventDefault();showFlight(true);};
$('open-everyday').onclick=()=>showFlight(false);$('open-flight').onclick=()=>showFlight(true);$('close-flight').onclick=closeMenus;$('close-everyday').onclick=closeMenus;$('back-everyday').onclick=()=>showFlight(false);
$('menu-home').onclick=()=>{setView('home');$('back-home').click();};$('menu-settings').onclick=openSettings;
$('throttle').oninput=()=>{if($('power-support').value==='two'&&$('throttle').value==='1')$('throttle').value='2';updatePower();};
$('power-support').onchange=()=>{const two=$('power-support').value==='two';$('throttle').step=two?'2':'1';if(two&&$('throttle').value==='1')$('throttle').value='0';updatePower();};
$('charging').onchange=()=>{state.charging=$('charging').checked;updatePower();};
for(const [button,panel] of [['display-toggle','display-adjustment'],['keyboard-toggle','keyboard-adjustment'],['audio-toggle','audio-adjustment']])$(button).onclick=()=>{$(panel).hidden=!$(panel).hidden;};
$('brightness').oninput=()=>{$('display-value').textContent=$('brightness').value+'%';};$('volume').oninput=()=>{$('audio-value').textContent=Number($('volume').value)?$('volume').value+'%':'Muted';};
$('transcription').onclick=()=>{const el=$('transcription').querySelector('.row-value');el.textContent=el.textContent==='Off'?'Listening':'Off';toast(el.textContent==='Listening'?'Transcription preview · no microphone is recording':'Transcription preview stopped');};
$('load-model').onclick=()=>{state.modelLoaded=!state.modelLoaded;$('load-model').textContent=state.modelLoaded?'Unload model':'Load model';$('model-status').textContent=state.modelLoaded?'Loaded · demo':'Not loaded';};
$('add-compute').onclick=()=>toast('In the app, this opens Tailnet device setup.');$('device-close').onclick=()=>{$('device-menu').hidden=true;};
async function copy(text){try{await navigator.clipboard.writeText(text);toast('Copied demo command');}catch{toast(text);}}
$('copy-ssh').onclick=()=>copy('ssh user@'+devices.find(d=>d.name===state.device).address);
$('copy-address').onclick=()=>copy(devices.find(d=>d.name===state.device).address);
$('screen-sharing').onclick=()=>toast('Screen Sharing would open '+state.device+' in the app.');
$('menu-colour').onchange=()=>{state.colour=$('menu-colour').checked;renderCats();};
$('voyage-frame').addEventListener('load',()=>{$('voyage-frame').contentWindow.postMessage({type:'voyage-visibility',visible:state.view==='voyage'},location.origin);});
addEventListener('keydown',event=>{
 if(event.key!=='Escape'||$('appearance').open||$('crown-dialog').open)return;
 if(afk.active()){cancelAFK();return;}
 if(!$('device-menu').hidden){$('device-menu').hidden=true;return;}
 if(state.view==='voyage'&&!$('afk-return').hidden){returnFromAFK();return;}
 if(state.view==='menu'){closeMenus();$('status-item').focus();}
});
document.addEventListener('pointerdown',event=>{
 if(state.view==='menu'&&!event.target.closest('.cat-menu,.device-popover,#status-item,#open-everyday,#open-flight,[data-view],dialog'))closeMenus();
});
document.addEventListener('visibilitychange',()=>{document.body.classList.toggle('paused',document.hidden);if(document.hidden)cancelAFK();scheduleFlight();$('voyage-frame').contentWindow?.postMessage({type:'voyage-visibility',visible:!document.hidden&&state.view==='voyage'},location.origin);});
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('paused',!entry.isIntersecting)),{threshold:0});observer.observe($('app-window'));
let seed=701;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
document.querySelectorAll('.star-layer').forEach(el=>{for(let i=0;i<65;i++){const star=document.createElement('i');star.style.left=random()*100+'%';star.style.top=random()*100+'%';el.append(star);}});

// A single bounded clock drives the Cat, ship and attached cord together.
let flightTimer;
const visibleScenes=new Set();
const sceneObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting)visibleScenes.add(entry.target);else visibleScenes.delete(entry.target);}scheduleFlight();});
document.querySelectorAll('.flight-scene').forEach(el=>sceneObserver.observe(el));
function flightSVG(charging=false){
 return `<svg viewBox="0 0 240 115" aria-hidden="true"><g class="flight-ground" ${charging?'':'hidden'}><path d="M0 94Q115 69 240 93v22H0Z" fill="#5e4b72" opacity=".5"/><path d="M182 87h20v-13" fill="none" stroke="#d8ba7d" stroke-width="1.5"/><path d="M198 74h8v-7h-8z" fill="#e9e3ff"/></g><path class="flight-cord" d="" fill="none" stroke="#b6a1ce" stroke-opacity=".55" stroke-width=".7" ${charging?'hidden':''}/><g class="flight-cat">${catSVG().replace('<svg ','<svg width="64" height="64" ')}</g><g class="flight-ship">${rocketSVG(true,charging).replace('<svg ','<svg width="39" height="49" ')}</g></svg>`;
}
function renderFlight(seconds){
 const power=Number($('throttle').value);
 document.querySelectorAll('.flight-scene').forEach(el=>{
  if(el.closest('[hidden]'))return;
  const inMenu=el.classList.contains('menu-flight');
  const charging=inMenu&&state.charging;
  const posed=CompanionBehaviour.flightPose(seconds,inMenu?power:0,charging);
  const cat=el.querySelector('.flight-cat'),ship=el.querySelector('.flight-ship');if(!cat)return;
  cat.setAttribute('transform',`translate(${posed.cat.x} ${posed.cat.y})`);ship.setAttribute('transform',`translate(${posed.ship.x} ${posed.ship.y})`);
  el.querySelector('.flight-cord').setAttribute('d',posed.cord);
  el.querySelector('.flight-cord').toggleAttribute('hidden',charging);
  el.querySelector('.flight-ground').toggleAttribute('hidden',charging===false);
  const art=el.querySelector('.flight-ship svg');
  if(art){const energyMode=['lowPower','automatic','highPower'][power];art.innerHTML=SpaceRocket.svg({chargePercent:67,energyMode,power:charging?'charging':'battery',cpuFraction:charging?0:[.15,.4,.8][power]},seconds).replace(/^<svg[^>]*>|<\/svg>$/g,'');}
 });
}
function scheduleFlight(){
 clearTimeout(flightTimer);
 if(document.hidden||reduced.matches||!state.motion){renderFlight(0);return;}
 const anyVisible=[...visibleScenes].some(el=>!el.closest('[hidden]'));
 if(!anyVisible)return;
 if(state.view==='menu'&&state.charging){renderFlight(0);return;}
 renderFlight(performance.now()/1000);
 const fps=state.view==='menu'?CompanionBehaviour.powerProfiles[Number($('throttle').value)].fps:6;
 flightTimer=setTimeout(scheduleFlight,1000/fps);
}
const afk=CompanionBehaviour.createCountdown();let afkTimer;
function utilityValue(name,text){document.querySelector(`[data-utility="${name}"] .row-value`).textContent=text;}
function cancelAFK(){clearTimeout(afkTimer);afk.cancel();$('afk-countdown').hidden=true;utilityValue('AFK','Off');document.querySelector('[data-utility="AFK"]').setAttribute('aria-pressed','false');}
function startAFK(){document.querySelector('[data-utility="AFK"]').setAttribute('aria-pressed','true');afk.start(performance.now());$('afk-countdown').hidden=false;$('afk-sentry').checked=state.sentry;tickAFK();}
function tickAFK(){
 const now=performance.now();
 if(afk.due(now)){cancelAFK();setView('voyage');$('afk-return').hidden=false;$('afk-sentry-status').textContent=state.sentry?'· Sentry enabled (demo)':'· Sentry off';$('return-from-afk').focus();return;}
 const remaining=afk.remaining(now);$('afk-seconds').textContent=`Stepping away in ${remaining}…`;utilityValue('AFK',`${remaining}s`);afkTimer=setTimeout(tickAFK,100);
}
function returnFromAFK(){$('afk-return').hidden=true;setView('menu');showFlight(false);}
function setSentry(enabled){state.sentry=enabled;$('afk-sentry').checked=enabled;$('sentry-enabled').checked=enabled;utilityValue('Sentry',enabled?'On':'Off');}
$('cancel-afk').onclick=cancelAFK;$('afk-sentry').onchange=()=>setSentry($('afk-sentry').checked);$('sentry-enabled').onchange=()=>setSentry($('sentry-enabled').checked);$('return-from-afk').onclick=returnFromAFK;
$('tailnet-toggle').onclick=()=>{const show=$('tailnet-devices').hidden;$('tailnet-devices').hidden=!show;$('tailnet-toggle').setAttribute('aria-expanded',String(show));};
$('local-display').onclick=()=>{showFlight(false);$('display-adjustment').hidden=false;$('brightness').focus();};
$('local-keyboard').onclick=()=>{showFlight(false);$('keyboard-adjustment').hidden=false;$('keyboard-adjustment').querySelector('input').focus();};
$('quit-preview').onclick=()=>{closeMenus();toast('Menu closed · the app is still running');};
document.querySelectorAll('[data-awake]').forEach(el=>el.onclick=()=>{document.querySelectorAll('[data-awake]').forEach(b=>b.setAttribute('aria-pressed',String(b===el)));utilityValue('Screen Awake',el.dataset.awake);$('awake-lid').disabled=el.dataset.awake==='Off';if($('awake-lid').disabled)$('awake-lid').checked=false;});
function openSettings(){$('appearance').showModal();}
$('companion-motion').checked=state.motion;
$('companion-motion').onchange=()=>{state.motion=$('companion-motion').checked;state.appearance.motion=state.motion;scheduleFlight();};
for(const id of ['appearance','crown-dialog'])$(id).addEventListener('click',event=>{if(event.target===$(id))$(id).close();});
const basePalettes=['classic','mint','peach','moon'];
const categories={headwear:'Hats',eyewear:'Glasses & eye patches',neckwear:'Neck accessories'};
function initStudio(){
 $('base-palettes').innerHTML=basePalettes.map(key=>`<button data-palette="${key}" aria-pressed="false"><span>${catSVG(true,'currentColor',{...CadetModel.defaults(),...CadetModel.presets[key]})}</span>${CadetModel.presets[key].name}</button>`).join('');
 $('accessory-rails').innerHTML=Object.entries(categories).map(([key,label])=>`<section class="accessory-rail" aria-label="${label}"><div class="rail-title"><h3>${label}</h3><button data-clear="${key}">Remove</button></div><div class="rail-controls"><button class="rail-arrow" data-step="-1" data-category="${key}" aria-label="Previous ${label}">‹</button><div class="rail-items" id="rail-${key}"></div><button class="rail-arrow" data-step="1" data-category="${key}" aria-label="Next ${label}">›</button></div></section>`).join('');
 document.querySelectorAll('[data-palette]').forEach(el=>el.onclick=()=>{const previous=state.appearance.name;const isDefault=Object.values(CadetModel.presets).some(p=>p.name===previous);state.appearance={...state.appearance,...CadetModel.presets[el.dataset.palette]};if(!isDefault)state.appearance.name=previous;applySuit();changedCompanion();});
 document.querySelectorAll('[data-step]').forEach(el=>el.onclick=()=>{const key=el.dataset.category;state.appearance[key]=CompanionBehaviour.cycle(Object.keys(CadetModel.options[key]),state.appearance[key],Number(el.dataset.step));changedCompanion();});
 document.querySelectorAll('[data-clear]').forEach(el=>el.onclick=()=>{state.appearance[el.dataset.clear]='none';changedCompanion();});
 document.querySelectorAll('[data-suit]').forEach(el=>el.onclick=()=>{state.suit=el.dataset.suit;applySuit();changedCompanion();});
 $('companion-name').oninput=()=>{state.appearance.name=$('companion-name').value;changedCompanion(false);};
 $('companion-name').onblur=()=>{state.appearance=CadetModel.normalize(state.appearance);syncStudio();};
 $('companion-colour').oninput=()=>{state.appearance.fur=$('companion-colour').value;changedCompanion();};
 $('save-companion').onclick=()=>{state.appearance=CadetModel.normalize(state.appearance);try{localStorage.setItem(companionKey,JSON.stringify({appearance:state.appearance,suit:state.suit}));$('save-status').textContent=`${state.appearance.name} is saved on this browser.`;toast('Your Cat is ready. Say hello on the Home tab.');}catch{$('save-status').textContent='Browser storage is unavailable. Export your Cat to keep it.';}};
 $('export-companion').onclick=()=>{const data=CadetModel.serialize(state.appearance);const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='space-cadet.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('crown-details').onclick=()=>{$('crown-dialog').showModal();};$('close-crown').onclick=()=>$('crown-dialog').close();$('try-crown').onclick=()=>$('crown-dialog').close();syncStudio();
}
function applySuit(){
 if(state.suit==='night')state.appearance.helmet='#776a92';
 else if(state.suit==='moon')state.appearance.helmet='#cde8f2';
 else state.appearance.helmet='#e9e3ff';
}
function changedCompanion(syncName=true){state.appearance=CadetModel.normalize(state.appearance);renderCats();syncStudio(syncName);$('save-status').textContent='Changes are ready to save.';}
function syncStudio(syncName=true){
 if(syncName)$('companion-name').value=state.appearance.name;$('companion-colour').value=state.appearance.fur;
 document.querySelectorAll('[data-palette]').forEach(el=>el.setAttribute('aria-pressed',String(state.appearance.fur===CadetModel.presets[el.dataset.palette].fur)));
 document.querySelectorAll('[data-suit]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.suit===state.suit)));
 for(const key of Object.keys(categories)){
  const values=Object.keys(CadetModel.options[key]);const chosen=state.appearance[key];
  $('rail-'+key).innerHTML=[-1,0,1].map(offset=>{const value=CompanionBehaviour.cycle(values,chosen,offset);return `<button class="accessory-option ${offset===0?'chosen':''}" data-choice="${value}" aria-pressed="${offset===0}"><span>${catSVG(true,'currentColor',{...state.appearance,[key]:value})}</span><small>${CadetModel.options[key][value]}</small>${value==='galactic'?'<em>€100 · one time</em>':''}</button>`;}).join('');
  $('rail-'+key).querySelectorAll('[data-choice]').forEach(el=>el.onclick=()=>{state.appearance[key]=el.dataset.choice;changedCompanion();});
 }
 $('crown-offer').hidden=state.appearance.headwear!=='galactic';
 document.querySelector('.crown-showcase').innerHTML=catSVG(true,'currentColor',{...state.appearance,headwear:'galactic'});
}
initStudio();renderCats();applyMotion();setView(['home','menu','studio','icons','voyage'].includes(location.hash.slice(1))?location.hash.slice(1):'home');
