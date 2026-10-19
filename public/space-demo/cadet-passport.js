(function (root) {
  'use strict';
  const model = root.CadetModel;
  const maxCodeLength = 24000;
  function assert(condition, message) { if (!condition) throw new Error(message); }
  function checksum(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
  }
  function pack(grid) {
    const palette = [null], runs = [];
    for (const raw of grid.flat()) {
      const color = raw === null ? null : raw.toUpperCase();
      let index = palette.indexOf(color);
      if (index === -1) { index = palette.length; palette.push(color); }
      if (runs.length && runs[runs.length - 1] === index) runs[runs.length - 2]++;
      else runs.push(1, index);
    }
    return grid.length===24 ? {p:palette,r:runs,n:24} : {p:palette,r:runs};
  }
  function unpack(value, version) {
    const dimension=value?.n ?? 16;
    assert(dimension===16 || (version===2 && dimension===24), 'Unsupported cat canvas.');
    const pixelCount=dimension*dimension;
    assert(value && Array.isArray(value.p) && value.p.length >= 1 && value.p.length <= pixelCount+1 && value.p[0] === null, 'This cat has an invalid colour palette.');
    assert(value.p.slice(1).every(color => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)), 'This cat contains an invalid colour.');
    assert(Array.isArray(value.r) && value.r.length > 0 && value.r.length <= pixelCount * 2 && value.r.length % 2 === 0, 'This cat has invalid pixels.');
    const pixels = [];
    for (let i = 0; i < value.r.length; i += 2) {
      const count = value.r[i], index = value.r[i + 1];
      assert(Number.isInteger(count) && count > 0 && count <= pixelCount && Number.isInteger(index) && index >= 0 && index < value.p.length && pixels.length + count <= pixelCount, 'This cat has invalid pixels.');
      pixels.push(...Array(count).fill(value.p[index]));
    }
    assert(pixels.length === pixelCount, 'This cat has incomplete pixels.');
    return Array.from({length:dimension}, (_, y) => pixels.slice(y * dimension, y * dimension + dimension));
  }
  function validateAppearance(value) {
    assert(value && typeof value === 'object' && !Array.isArray(value), 'This cat is missing its appearance.');
    assert(typeof value.name === 'string' && value.name.trim().length > 0 && [...value.name].length <= 24 && !/[\u0000-\u001f\u007f]/.test(value.name), 'The cat name must be 1–24 characters.');
    for (const key of ['helmet','fur','eyes','accent','gear']) assert(typeof value[key] === 'string' && /^#[0-9a-f]{6}$/i.test(value[key]), 'This cat contains an invalid colour.');
    for (const key of Object.keys(model.options)) assert(Object.hasOwn(model.options[key], value[key]), 'This accessory is not supported yet.');
    assert(['awake','wink','sleepy'].includes(value.expression) && ['pip','stripe','none'].includes(value.badge) && typeof value.motion === 'boolean', 'This cat has an unsupported expression or motion setting.');
    return model.normalize(value);
  }
  function encode(input) {
    const design = model.serializeDesign(input);
    validateAppearance(design.appearance);
    const version=design.pixels.length===24 || design.drawing?.length===24 ? 2 : 1;
    const payload = {v:version, a:design.appearance, b:design.birthday, m:design.mode, s:pack(design.pixels)};
    if (design.mode === 'cadet' && design.drawing) payload.d = pack(design.drawing);
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    const encoded = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const code = `SC${version}.${encoded}.${checksum(bytes)}`;
    assert(code.length <= maxCodeLength, 'This cat code is too large.');
    return code;
  }
  function decode(input) {
    assert(typeof input === 'string' && input.length <= maxCodeLength, 'That cat code is too long.');
    const code = input.trim();
    assert(/^SC[12]\./.test(code), 'Use a Space Cadet code beginning SC1 or SC2.');
    const parts = code.split('.');
    assert(parts.length === 3 && /^[A-Za-z0-9_-]+$/.test(parts[1]) && /^[0-9a-f]{8}$/.test(parts[2]) && parts[1].length % 4 !== 1, 'This cat code looks incomplete. Copy the whole code.');
    let bytes;
    try { bytes = Uint8Array.from(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)); }
    catch { throw new Error('This cat code looks incomplete. Copy the whole code.'); }
    assert(checksum(bytes) === parts[2], 'This cat code has changed or is incomplete. Copy it again.');
    let value;
    try { value = JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(bytes)); }
    catch { throw new Error('This cat code could not be read.'); }
    assert(value && [1,2].includes(value.v) && parts[0] === 'SC'+value.v, 'This cat code version is not supported yet.');
    const appearance = validateAppearance(value.a);
    assert(value.b === null || model.validBirthday(value.b), 'Use a real birthday in YYYY-MM-DD format.');
    assert(['cadet','drawing'].includes(value.m), 'This cat mode is not supported yet.');
    const pixels = unpack(value.s,value.v);
    let drawing = null;
    if (value.m === 'drawing') drawing = pixels;
    else if (value.d !== undefined) drawing = unpack(value.d,value.v);
    return {schemaVersion:3, theme:'space-cadet', width:pixels.length, height:pixels.length, appearance, birthday:value.b, mode:value.m, drawing, pixels, motion:value.m === 'cadet' && appearance.motion};
  }
  root.CadetPassport = {encode, decode};
})(globalThis);
