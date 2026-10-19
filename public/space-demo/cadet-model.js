(function (root) {
  const pixels = ['....########....','..##........##..','.#............#.','.#............#.','#...##....##...#','#...###..###...#','#...########...#','#...#..##..#...#','#...#..##..#...#','#...########...#','#...########...#','#..............#','.##..........##.','...##########...','....#......#....','....########....'];
  const presets = {
    classic: {name:'Cadet',helmet:'#e9e3ff',fur:'#b798ed',eyes:'#211a32',accent:'#7bd8c2'},
    moon: {name:'Luna',helmet:'#d8edff',fur:'#93b9d7',eyes:'#20324a',accent:'#f1d593'},
    peach: {name:'Peaches',helmet:'#f6e9f5',fur:'#ecaeaa',eyes:'#3d2346',accent:'#b39eef'},
    citrus: {name:'Pip',helmet:'#e5efd9',fur:'#e5c976',eyes:'#25342a',accent:'#8cc8ac'},
    mint: {name:'Matcha',helmet:'#e1f5ec',fur:'#91c8aa',eyes:'#163e38',accent:'#e9c9e4'},
    dusk: {name:'Nova',helmet:'#e8d5f7',fur:'#ac83b8',eyes:'#34213f',accent:'#f6c787'},
    ember: {name:'Ember',helmet:'#ffe5d1',fur:'#d89670',eyes:'#40283b',accent:'#97c8e1'},
    ghost: {name:'Ghost',helmet:'#eeeef8',fur:'#c4c1dd',eyes:'#3a3653',accent:'#c1dfa2'}
  };
  const options = {
    headwear: {none:'No hat',captain:'Captain',pirate:'Pirate hat',beanie:'Beanie',wizard:'Wizard',crown:'Crown',flower:'Flower',antenna:'Antenna',galactic:'Galactic crown'},
    eyewear: {none:'Bare face',patch:'Eyepatch',shades:'Shades',goggles:'Goggles',monocle:'Monocle'},
    neckwear: {none:'No extra',scarf:'Scarf',bow:'Bow tie',medal:'Medal',chain:'Moon chain'}
  };
  const outfits = {
    pirate: {label:'Space pirate',palette:'ember',headwear:'pirate',eyewear:'patch',neckwear:'scarf',gear:'#e6a3b4'},
    wizard: {label:'Moon wizard',palette:'dusk',headwear:'wizard',eyewear:'none',neckwear:'medal',gear:'#ac95ec'},
    captain: {label:'First officer',palette:'moon',headwear:'captain',eyewear:'none',neckwear:'medal',gear:'#f1d593'},
    royal: {label:'Royal orbit',palette:'peach',headwear:'crown',eyewear:'monocle',neckwear:'bow',gear:'#f1d593'},
    garden: {label:'Flower power',palette:'mint',headwear:'flower',eyewear:'none',neckwear:'none',gear:'#edaecb'},
    cosy: {label:'Cosy explorer',palette:'ghost',headwear:'beanie',eyewear:'none',neckwear:'scarf',gear:'#a7d5bf'}
  };
  function defaults() {
    return {...presets.classic,expression:'awake',badge:'pip',motion:true,headwear:'none',eyewear:'none',neckwear:'none',gear:'#f1d593'};
  }
  function normalize(input) {
    const value = defaults();
    if (!input || typeof input !== 'object') return value;
    for (const key of ['helmet','fur','eyes','accent','gear']) {
      if (/^#[0-9a-f]{6}$/i.test(input[key] || '')) value[key] = input[key];
    }
    if (typeof input.name === 'string') value.name = [...input.name.trim()].slice(0,24).join('') || 'Cadet';
    if (['awake','wink','sleepy'].includes(input.expression)) value.expression = input.expression;
    if (['pip','stripe','none'].includes(input.badge)) value.badge = input.badge;
    for (const category of Object.keys(options)) {
      if (Object.hasOwn(options[category], input[category])) value[category] = input[category];
    }
    if (typeof input.motion === 'boolean') value.motion = input.motion;
    return value;
  }
  function wearOutfit(input, id) {
    const current = normalize(input), outfit = outfits[id];
    if (!outfit) return current;
    return normalize({...current,...presets[outfit.palette],...outfit,name:current.name});
  }
  // The master uses layout coordinates, not a raster resolution limit.
  const rig = {"id":"space-cadet-v1","version":1,"artboard":{"width":768,"height":768},"body":{"x":128,"y":256,"width":512,"height":512},"anchors":{"crown":{"x":384,"y":256},"eyes":{"x":384,"y":480},"collar":{"x":384,"y":608},"feet":{"x":384,"y":768},"tether":{"x":608,"y":512}},"slots":{"headwear":{"anchor":"crown","bounds":{"x":128,"y":0,"width":512,"height":256},"order":1},"eyewear":{"anchor":"eyes","bounds":{"x":256,"y":448,"width":256,"height":160},"order":2},"neckwear":{"anchor":"collar","bounds":{"x":256,"y":608,"width":256,"height":64},"order":3}},"profiles":{"pixel":{"columns":24,"rows":24,"unit":32,"sampling":"nearest"},"image":{"sampling":"smooth","sourceResolution":"independent","allowedSampling":["smooth","nearest"]},"g2":{"width":48,"height":48,"tones":2,"minimumFilledBlock":2,"separateExport":true}}};
  function freezeTree(value) {
    if (value && typeof value === 'object') { Object.values(value).forEach(freezeTree); Object.freeze(value); }
    return value;
  }
  freezeTree(rig);
  function framePixels(input) {
    const source = normalizeDrawing(input);
    if (!source) throw new Error('Use a 16 or 24 cell pixel design. Image assets use the master artboard instead.');
    if (source.length === rig.profiles.pixel.columns) return source;
    const unit = rig.profiles.pixel.unit;
    const output = Array.from({length:rig.profiles.pixel.rows},()=>Array(rig.profiles.pixel.columns).fill(null));
    source.forEach((row,y)=>row.forEach((colour,x)=>{output[y+rig.body.y/unit][x+rig.body.x/unit]=colour;}));
    return output;
  }
  function accessoryErrors(asset) {
    const errors = [];
    if (!asset || typeof asset !== 'object') return ['Accessory must be an object.'];
    if (asset.rig !== rig.id) errors.push('Accessory uses a different rig.');
    if (typeof asset.id !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(asset.id)) errors.push('Accessory needs a stable id.');
    const slot = rig.slots[asset.slot];
    if (!slot || !Object.hasOwn(rig.slots,asset.slot)) return [...errors,'Unknown accessory slot.'];
    const frame = asset.frame;
    if (!frame || !['x','y','width','height'].every(key=>Number.isFinite(frame[key])) || frame.width<=0 || frame.height<=0) return [...errors,'Accessory needs a finite positive frame.'];
    const bounds = slot.bounds;
    if (frame.x<bounds.x || frame.y<bounds.y || frame.x+frame.width>bounds.x+bounds.width || frame.y+frame.height>bounds.y+bounds.height) errors.push('Accessory exceeds its attachment region.');
    if (asset.kind === 'pixel') {
      const unit = asset.pixelUnit ?? rig.profiles.pixel.unit;
      if (!Number.isInteger(unit) || unit < 1 || rig.artboard.width % unit !== 0) return [...errors,'Invalid pixel unit.'];
      if (!['x','y','width','height'].every(key=>Number.isInteger(frame[key]/unit))) errors.push('Pixel accessories must align to the pixel profile.');
      if (!Array.isArray(asset.rows) || !asset.rows.length || asset.rows.length>rig.artboard.height/unit || asset.rows.length*unit!==frame.height || asset.rows.some(row=>typeof row!=='string'||row.length*unit!==frame.width||!/^[.AHDFC]+$/.test(row))) errors.push('Invalid pixel rows or colour roles.');
    } else if (asset.kind === 'image') {
      if (asset.sampling !== undefined && !rig.profiles.image.allowedSampling.includes(asset.sampling)) errors.push('Unknown image sampling.');
      // Source pixel density is independent of placement. No 24px cap on real assets.
      if (!asset.source || ![asset.source.width,asset.source.height].every(n=>Number.isInteger(n)&&n>0)) errors.push('Image assets need source dimensions.');
    } else errors.push('Use a pixel or image accessory.');
    return errors;
  }
  function accessoryFrame(slotName, offset, size) {
    const slot = rig.slots[slotName];
    if (!slot || !Object.hasOwn(rig.slots,slotName)) throw new Error('Unknown accessory slot.');
    const anchor=rig.anchors[slot.anchor];
    return {x:anchor.x+offset.x,y:anchor.y+offset.y,width:size.width,height:size.height};
  }
  function accessoryRects(asset, appearance) {
    const errors=accessoryErrors(asset);
    if(errors.length)throw new Error(errors.join(' '));
    if(asset.kind!=='pixel')throw new Error('Image accessories render as image layers.');
    const c=normalize(appearance),unit=asset.pixelUnit ?? rig.profiles.pixel.unit;
    const ink={A:c.gear,H:c.helmet,D:c.eyes,F:c.fur,C:c.accent};
    return asset.rows.flatMap((row,y)=>[...row].flatMap((role,x)=>ink[role]?[{x:asset.frame.x+x*unit,y:asset.frame.y+y*unit,width:unit,height:unit,fill:ink[role]}]:[]));
  }
  function overlayAccessory(input, asset, appearance) {
    const errors=accessoryErrors(asset);
    if(errors.length)throw new Error(errors.join(' '));
    if(asset.kind!=='pixel')throw new Error('Image accessories render as image layers; do not rasterize them into the pixel cat.');
    if ((asset.pixelUnit ?? rig.profiles.pixel.unit)!==rig.profiles.pixel.unit) throw new Error('High-density pixels render as separate layers with accessoryRects.');
    const output=framePixels(input), c=normalize(appearance),unit=rig.profiles.pixel.unit;
    const ink={A:c.gear,H:c.helmet,D:c.eyes,F:c.fur,C:c.accent};
    asset.rows.forEach((row,y)=>[...row].forEach((role,x)=>{if(ink[role])output[asset.frame.y/unit+y][asset.frame.x/unit+x]=ink[role];}));
    return output;
  }
  function grid(input, blink = false) {
    const c = normalize(input);
    const hasHat = c.headwear !== 'none', top = hasHat ? 8 : 0, left = hasHat ? 4 : 0;
    const dimension = hasHat ? 24 : 16;
    const out = Array.from({length:dimension},()=>Array(dimension).fill(null));
    pixels.forEach((row,y)=>[...row].forEach((pixel,x)=>{
      if(pixel==='#') out[y+top][x+left] = y>=4 && y<=10 && x>=4 && x<=11 ? c.fur : c.helmet;
    }));
    for (const x of [5,6,9,10]) for (const y of [7,8]) {
      let closed = blink || c.expression === 'sleepy';
      if (c.expression === 'wink' && x >= 9) closed = true;
      out[y+top][x+left] = closed && y === 7 ? c.fur : c.eyes;
    }
    if (c.badge === 'pip') out[14+top][7+left] = out[14+top][8+left] = c.accent;
    if (c.badge === 'stripe') for(let x=5;x<=10;x++) out[14+top][x+left] = c.accent;
    const ink = {A:c.gear,H:c.helmet,D:c.eyes,F:c.fur,C:c.accent};
    function stamp(rows, xOrigin, yOrigin, slot) {
      const unit=rig.profiles.pixel.unit;
      const asset={rig:rig.id,id:'built-in',slot,kind:'pixel',rows,frame:{x:rig.body.x+xOrigin*unit,y:rig.body.y+yOrigin*unit,width:rows[0].length*unit,height:rows.length*unit}};
      const errors=accessoryErrors(asset);
      if(errors.length)throw new Error(errors.join(' '));
      rows.forEach((row,y) => [...row].forEach((p,x) => {
        if (ink[p]) out[top+yOrigin+y][left+xOrigin+x] = ink[p];
      }));
    }
    // Extra space above the original helmet, which remains completely intact.
    switch (c.headwear) {
      case 'captain': stamp(['..AAAAAAAA..', '.AAAHHHHAAA.', 'AAAAHHHHAAAA', 'AAAAAAAAAAAA', '..DDDDDDDD..'],2,-5,'headwear'); break;
      case 'pirate': stamp(['....AAAAAA....', '..AADDDDDDAA..', '.ADDDDHHDDDDA.', 'ADDDDDHHDDDDDA', 'AADDHDDDDHDDAA', '..AAAAAAAAAA..'],1,-6,'headwear'); break;
      case 'beanie': stamp(['....AA....', '....AA....', '..AAAAAA..', '.AAAAAAAA.', 'ACCCCCCCCA'],3,-5,'headwear'); break;
      case 'wizard': stamp(['......A.....', '.....AAA....', '....AAHA....', '....AAAAA...', '...AAAAAAA..', 'AAAAAAAAAAAA'],2,-6,'headwear'); break;
      case 'crown': stamp(['A..AA..A', 'A..AA..A', 'AAAAAAAA', 'AHCAACHA', 'AAAAAAAA'],4,-5,'headwear'); break;
      case 'galactic': stamp(['A...AA...A', 'A.A.AA.A.A', 'AAAAAAAAAA', 'AHCAAAACHA', 'AAAACCAAAA', '.AAAAAAAA.'],3,-6,'headwear'); break;
      case 'flower': stamp(['.AAA.', 'AACAA', '.AAA.', '..H..'],8,-4,'headwear'); break;
      case 'antenna': stamp(['ACC', 'ACC', '.H.', '.H.', '.H.'],7,-5,'headwear'); break;
    }
    switch (c.eyewear) {
      case 'patch': stamp(['...D', 'DDD.', 'DDD.'],8,6,'eyewear'); break;
      case 'shades': stamp(['DDDDDDDD', '.CD..CD.'],4,7,'eyewear'); break;
      case 'goggles': stamp(['.AA..AA.', 'A..AA..A', 'A......A', '.AA..AA.'],4,6,'eyewear'); break;
      case 'monocle': stamp(['.AA.', 'A..A', 'A..A', '.AAA', '...A'],8,6,'eyewear'); break;
    }
    switch (c.neckwear) {
      case 'scarf': stamp(['AAAAAA', '....AA'],5,11,'neckwear'); break;
      case 'bow': stamp(['AA..AA', '.AAAA.'],5,11,'neckwear'); break;
      case 'medal': stamp(['A..A', '.CC.'],6,11,'neckwear'); break;
      case 'chain': stamp(['A......A', '.AAAAAA.'],4,11,'neckwear'); break;
    }
    return out;
  }
  const size = 16;
  function blankDrawing() { return Array.from({length:size},()=>Array(size).fill(null)); }
  function normalizeDrawing(input) {
    if (!Array.isArray(input) || ![16,24].includes(input.length) || input.some(row=>!Array.isArray(row)||row.length!==input.length)) return null;
    return input.map(row=>row.map(color=>typeof color==='string'&&/^#[0-9a-f]{6}$/i.test(color)?color:null));
  }
  function validBirthday(value) {
    if (typeof value !== 'string' || !/^[1-9][0-9]{3}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
    const date = new Date(value + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
  }
  function normalizeDesign(input) {
    const raw = input && typeof input === 'object' ? input : {};
    const appearance = normalize(raw.appearance || raw);
    const drawing = normalizeDrawing(raw.drawing);
    return {appearance,drawing,birthday:validBirthday(raw.birthday)?raw.birthday:null,mode:raw.mode==='drawing'&&drawing?'drawing':'cadet'};
  }
  function stroke(input, from, to, color) {
    const output = normalizeDrawing(input) || blankDrawing();
    if (color !== null && !/^#[0-9a-f]{6}$/i.test(color || '')) return output;
    if (![from?.x,from?.y,to?.x,to?.y].every(Number.isFinite)) return output;
    const bound = n=>Math.max(0,Math.min(output.length-1,Math.round(n)));
    let x=bound(from.x),y=bound(from.y),endX=bound(to.x),endY=bound(to.y);
    const dx=Math.abs(endX-x),dy=-Math.abs(endY-y),sx=x<endX?1:-1,sy=y<endY?1:-1;
    let error=dx+dy;
    while (true) {
      output[y][x]=color;
      if(x===endX&&y===endY)break;
      const twice=2*error;
      if(twice>=dy){error+=dy;x+=sx;}
      if(twice<=dx){error+=dx;y+=sy;}
    }
    return output;
  }
  function serializeDesign(input) {
    const d=normalizeDesign(input),freehand=d.mode==='drawing';
    const pixels=freehand?d.drawing:grid(d.appearance);
    return {schemaVersion:3,theme:'space-cadet',width:pixels.length,height:pixels.length,...d,motion:!freehand&&d.appearance.motion,pixels};
  }
  function serialize(input) { return serializeDesign({appearance:input}); }
  root.CadetModel = {rig,framePixels,accessoryErrors,accessoryFrame,accessoryRects,overlayAccessory,presets,options,outfits,defaults,normalize,wearOutfit,grid,serialize,blankDrawing,normalizeDrawing,normalizeDesign,validBirthday,stroke,serializeDesign};
})(globalThis);
