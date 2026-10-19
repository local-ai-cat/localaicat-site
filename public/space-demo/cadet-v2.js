(function () {
  'use strict';
  const model = window.CadetStudio;
  const pixelCat = window.CadetModel;
  const images = new Map();
  const portrait = document.querySelector('#portrait');
  const stage = document.querySelector('#preview-stage');
  const status = document.querySelector('#studio-status');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const shelfLabels = { hat: 'On the helmet', glasses: 'Over the eyes', neck: 'Around the collar' };
  let design = model.defaults();
  let ready = false;
  let blinkTimer;
  let blinkEnd;
  try {
    const saved = localStorage.getItem(model.storageKey);
    if (saved) design = model.parse(saved);
  } catch { status.textContent = 'Your previous save could not be opened. Starting with a fresh cat.'; }

  function catAppearance() {
    return { ...pixelCat.defaults(), ...pixelCat.presets[design.palette], name: design.name, fur: design.fur };
  }

  function paintPixels(ctx, appearance, x, y, size, blink = false) {
    const grid = pixelCat.grid(appearance, blink);
    const block = size / grid.length;
    ctx.imageSmoothingEnabled = false;
    grid.forEach((row, rowIndex) => row.forEach((colour, colIndex) => {
      if (!colour) return;
      ctx.fillStyle = colour;
      ctx.fillRect(x + colIndex * block, y + rowIndex * block, block, block);
    }));
  }

  function selectedAssets() {
    return Object.keys(model.wardrobe).map(category => model.item(category, design[category])).filter(item => item.image);
  }

  function paintAccessory(ctx, asset, frame = asset.frame) {
    const image = images.get(asset.id);
    if (!image) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, ...asset.crop, ...frame);
  }

  function render(canvas, blink = false) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { x, y, size } = model.catFrame;
    const bounds = [0, 0, 512, 512];
    const scale = Math.min(canvas.width / bounds[2], canvas.height / bounds[3]);
    ctx.save();
    ctx.translate((canvas.width - bounds[2] * scale) / 2, (canvas.height - bounds[3] * scale) / 2);
    ctx.scale(scale, scale);
    ctx.translate(-bounds[0], -bounds[1]);
    paintPixels(ctx, catAppearance(), x, y, size, blink);
    selectedAssets().forEach(asset => paintAccessory(ctx, asset));
    ctx.restore();
  }

  function renderPreviews(blink = false) {
    render(portrait, blink);
    for (const canvas of document.querySelectorAll('#menu-cat, [data-size]')) render(canvas, blink);
  }

  function updateMotion() {
    clearTimeout(blinkTimer);
    clearTimeout(blinkEnd);
    const moving = design.motion && !reducedMotion.matches && !document.hidden;
    stage.classList.toggle('floating', moving);
    if (!moving) {
      renderPreviews();
      return;
    }
    blinkTimer = setTimeout(function blink() {
      renderPreviews(true);
      blinkEnd = setTimeout(function openEyes() {
        renderPreviews(false);
        updateMotion();
      }, 170);
    }, 6200);
  }

  function updatePaletteButtons() {
    document.querySelectorAll('[data-palette]').forEach(button => {
      const preset = pixelCat.presets[button.dataset.palette];
      const selected = design.palette === button.dataset.palette && design.fur.toLowerCase() === preset.fur;
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function updateShelves() {
    for (const category of Object.keys(model.wardrobe)) {
      const asset = model.item(category, design[category]);
      const shelf = document.querySelector(`[data-shelf="${category}"]`);
      shelf.querySelector('strong').textContent = asset.label;
      shelf.querySelector('p').textContent = asset.note;
      const canvas = shelf.querySelector('canvas');
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (asset.image) {
        const ratio = Math.min(84 / asset.crop[2], 84 / asset.crop[3]);
        const width = asset.crop[2] * ratio;
        const height = asset.crop[3] * ratio;
        paintAccessory(ctx, asset, [(100 - width) / 2, (100 - height) / 2, width, height]);
      } else {
        ctx.strokeStyle = '#93819f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(50, 50, 14, 0, Math.PI * 2);
        ctx.moveTo(40, 60);
        ctx.lineTo(60, 40);
        ctx.stroke();
      }
    }
  }

  function refresh(syncInputs = true) {
    if (syncInputs) {
      document.querySelector('#cat-name').value = design.name;
      document.querySelector('#birthday').value = design.birthday;
      document.querySelector('#custom-colour').value = design.fur;
      document.querySelector('#motion').checked = design.motion;
    }
    document.querySelector('#preview-name').textContent = design.name;
    const names = selectedAssets().map(asset => asset.label);
    document.querySelector('#preview-outfit').textContent = names.join(' · ') || 'Space Cadet · full helmet';
    updatePaletteButtons();
    updateShelves();
    renderPreviews();
    updateMotion();
  }

  function changed(syncInputs = true) {
    refresh(syncInputs);
    status.textContent = 'Looking good. Keep this cat when you’re ready.';
  }

  function buildControls() {
    const palettes = document.querySelector('#palettes');
    for (const id of model.palettes) {
      const preset = pixelCat.presets[id];
      const button = document.createElement('button');
      button.className = 'palette';
      button.dataset.palette = id;
      button.setAttribute('aria-pressed', 'false');
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      canvas.setAttribute('aria-hidden', 'true');
      paintPixels(canvas.getContext('2d'), { ...pixelCat.defaults(), ...preset }, 0, 0, 64);
      const label = document.createElement('span');
      label.textContent = preset.name;
      button.append(canvas, label);
      button.addEventListener('click', function choosePalette() {
        const previousDefault = pixelCat.presets[design.palette].name;
        if (design.name === previousDefault) design.name = preset.name;
        design.palette = id;
        design.fur = preset.fur;
        changed();
      });
      palettes.append(button);
    }
    for (const [category, label] of Object.entries(shelfLabels)) {
      const shelf = document.createElement('div');
      shelf.className = 'shelf';
      shelf.dataset.shelf = category;
      shelf.innerHTML = '<div class="shelf-art"><canvas width="100" height="100" aria-hidden="true"></canvas></div><div class="shelf-copy"><small></small><strong></strong><p></p></div>';
      shelf.querySelector('small').textContent = label;
      for (const [direction, symbol, delta] of [['Previous', '‹', -1], ['Next', '›', 1]]) {
        const arrow = document.createElement('button');
        arrow.className = 'shelf-arrow';
        arrow.textContent = symbol;
        arrow.setAttribute('aria-label', direction + ' ' + category);
        arrow.addEventListener('click', function chooseAccessory() {
          design = model.cycle(design, category, delta);
          changed();
        });
        shelf.append(arrow);
      }
      document.querySelector('#shelves').append(shelf);
    }
  }

  function download(blob, extension) {
    const anchor = document.createElement('a');
    const filename = design.name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '') || 'cadet';
    const url = URL.createObjectURL(blob);
    anchor.href = url;
    anchor.download = filename + '-studio-v2.' + extension;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  buildControls();
  document.querySelectorAll('[data-size]').forEach(canvas => {
    canvas.style.width = canvas.dataset.size + 'px';
    canvas.style.height = canvas.dataset.size + 'px';
  });
  refresh();
  document.querySelector('#cat-name').addEventListener('input', function nameCat(event) {
    design.name = event.target.value.trim().slice(0, 24) || 'Cadet';
    changed(false);
  });
  document.querySelector('#birthday').addEventListener('change', function birthday(event) {
    design = model.normalize({ ...design, birthday: event.target.value });
    changed();
  });
  document.querySelector('#custom-colour').addEventListener('input', function colour(event) {
    design.fur = event.target.value;
    changed(false);
  });
  document.querySelector('#motion').addEventListener('change', function motion(event) {
    design.motion = event.target.checked;
    changed(false);
  });
  document.querySelector('#undress').addEventListener('click', function undress() {
    design.hat = 'none';
    design.glasses = 'none';
    design.neck = 'none';
    changed();
  });
  document.querySelector('#surprise').addEventListener('click', function surprise() {
    const choose = options => options[Math.floor(Math.random() * options.length)];
    design.palette = choose(model.palettes);
    design.fur = pixelCat.presets[design.palette].fur;
    for (const category of Object.keys(model.wardrobe)) design[category] = choose(model.wardrobe[category]).id;
    changed();
  });
  document.querySelector('#save-cat').addEventListener('click', function save() {
    try {
      localStorage.setItem(model.storageKey, model.serialize(design));
      status.textContent = design.name + ' is saved in this browser. See you next orbit.';
    } catch { status.textContent = 'Browser storage is unavailable. Use Save design to keep your cat.'; }
  });
  document.querySelector('#export-png').addEventListener('click', function exportPNG() {
    if (!ready) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    render(canvas);
    canvas.toBlob(blob => {
      if (!blob) { status.textContent = 'The image could not be exported. Please try again.'; return; }
      download(blob, 'png');
      status.textContent = 'Saved a 1024 × 1024 transparent PNG.';
    }, 'image/png');
  });
  document.querySelector('#export-design').addEventListener('click', function exportDesign() {
    download(new Blob([model.serialize(design)], { type: 'application/json' }), 'json');
    status.textContent = 'Saved your Studio v2 design. Reopen it here any time.';
  });
  document.querySelector('#import-design').addEventListener('click', () => document.querySelector('#design-file').click());
  document.querySelector('#design-file').addEventListener('change', async function importDesign(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 8192) throw new Error('Choose a Studio v2 design file under 8 KB.');
      design = model.parse(await file.text());
      refresh();
      status.textContent = 'Welcome back, ' + design.name + '. Keep this cat to save it in this browser.';
    } catch (error) { status.textContent = error.message; }
    event.target.value = '';
  });
  document.addEventListener('visibilitychange', function visibility() {
    document.body.classList.toggle('page-hidden', document.hidden);
    updateMotion();
  });
  reducedMotion.addEventListener('change', updateMotion);
  document.querySelector('#export-png').disabled = true;
  const assets = Object.values(model.wardrobe).flat().filter(asset => asset.image);
  Promise.all(assets.map(asset => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => { images.set(asset.id, image); resolve(); };
    image.onerror = () => reject(new Error('Could not load ' + asset.label));
    image.src = asset.image;
  }))).then(() => {
    ready = true;
    document.querySelector('#export-png').disabled = false;
    refresh();
    status.textContent = 'All dressed up. Nowhere you can’t go.';
  }).catch(() => {
    refresh();
    status.textContent = 'An accessory could not load. Reload this page before exporting.';
  });
})();
