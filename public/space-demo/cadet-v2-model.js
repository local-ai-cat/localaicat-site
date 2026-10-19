// Studio image accessories have their own format; pixel-studio designs stay unchanged.
(function (root) {
  const palettes = ['classic', 'moon', 'peach', 'mint'];
  const wardrobe = {
    hat: [
      { id: 'none', label: 'Just the helmet', note: 'A classic for a reason.' },
      { id: 'beanie', label: 'Cosmic cosy', note: 'For the chilly side of the moon.', image: 'studio-beanie.png', crop: [272, 61, 993, 904], frame: [174, 28, 164, 149] },
      { id: 'crown', label: 'Your Meowjesty', note: 'A completely reasonable amount of gold.', image: 'studio-crown.png', crop: [134, 141, 1268, 698], frame: [161, 71, 190, 105] }
    ],
    glasses: [
      { id: 'none', label: 'Bright eyes', note: 'Ready to see everything.' },
      { id: 'round', label: 'Orbital specs', note: 'Round lenses. Square little face.', image: 'studio-round-glasses.png', crop: [138, 159, 1499, 570], frame: [192, 280, 128, 49] }
    ],
    neck: [
      { id: 'none', label: 'Suit yourself', note: 'Nothing extra needed.' },
      { id: 'scarf', label: 'Mint condition', note: 'One very small, very cosy scarf.', image: 'studio-scarf.png', crop: [130, 247, 1008, 846], frame: [197, 408, 118, 99] }
    ]
  };
  const format = 'space-cadet-studio';
  const version = 2;
  const storageKey = 'space-cadet-studio-v2';
  const catFrame = { x: 128, y: 176, size: 256 };
  function defaults() {
    return { name: 'Cadet', birthday: '', palette: 'classic', fur: '#b798ed', hat: 'beanie', glasses: 'none', neck: 'none', motion: true };
  }
  function validBirthday(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
    const date = new Date(value + 'T12:00:00Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return '';
    return value;
  }
  function normalize(input) {
    const out = defaults();
    if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
    if (typeof input.name === 'string') out.name = input.name.trim().slice(0, 24) || 'Cadet';
    out.birthday = validBirthday(input.birthday);
    if (palettes.includes(input.palette)) out.palette = input.palette;
    if (typeof input.fur === 'string' && /^#[0-9a-f]{6}$/i.test(input.fur)) out.fur = input.fur;
    if (typeof input.motion === 'boolean') out.motion = input.motion;
    for (const [key, items] of Object.entries(wardrobe)) {
      if (items.some(item => item.id === input[key])) out[key] = input[key];
    }
    return out;
  }
  function item(category, id) {
    return wardrobe[category]?.find(option => option.id === id) || wardrobe[category]?.[0];
  }
  function cycle(input, category, delta) {
    const out = normalize(input);
    const options = wardrobe[category];
    if (!options) return out;
    const index = options.findIndex(option => option.id === out[category]);
    const next = ((index + delta) % options.length + options.length) % options.length;
    out[category] = options[next].id;
    return out;
  }
  function serialize(input) {
    return JSON.stringify({ format, version, design: normalize(input) }, null, 2);
  }
  function parse(text) {
    if (typeof text !== 'string' || text.length > 8192) throw new Error('Choose a Studio v2 design file under 8 KB.');
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('That file is not a valid Studio v2 design.'); }
    if (data?.format !== format || data.version !== version || !data.design || typeof data.design !== 'object' || Array.isArray(data.design)) {
      throw new Error('This studio opens Studio v2 designs. Open pixel designs in the original studio.');
    }
    return normalize(data.design);
  }
  root.CadetStudio = { palettes, wardrobe, catFrame, storageKey, defaults, normalize, item, cycle, serialize, parse };
})(globalThis);
