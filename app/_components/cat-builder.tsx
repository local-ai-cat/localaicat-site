"use client";

import { trackSiteAction } from "../../lib/site-analytics";

import { useEffect, useMemo, useRef, useState } from "react";
import { cadetRig, portraitFrame } from "../../lib/cadet-composition";
import { describeCat, previewCatCode } from "../../lib/cadet-runtime";
import type { AccessoryCategory, CatAppearance, CatDesign, CatRuntime, PixelGrid } from "../../lib/cadet-runtime";

export function CatPortrait({ pixels, name }: {pixels: PixelGrid; name: string}) {
  const frame = portraitFrame(pixels.length);
  const cell = frame.width / pixels.length;
  return <svg className="catPortrait" viewBox={`0 0 ${cadetRig.artboard.width} ${cadetRig.artboard.height}`} role="img" aria-label={`${name}, your Space Cadet`} shapeRendering="crispEdges">
    {pixels.flatMap((row, y) => row.map((color, x) => color ? <rect key={`${x}-${y}`} x={frame.x + x * cell} y={frame.y + y * cell} width={cell} height={cell} fill={color}/> : null))}
  </svg>;
}

const categoryLabels: Record<AccessoryCategory, string> = {headwear: "Hat", eyewear: "Glasses", neckwear: "Neckwear"};
export function CatBuilder({ runtime, initial, onClose, onDone }: {
  runtime: CatRuntime; initial: CatDesign | null; onClose(): void;
  onDone(design: CatDesign): Promise<void>;
}) {
  const [design, setDesign] = useState<CatDesign>(() => runtime.model.normalizeDesign(initial));
  const [error, setError] = useState("");
  const [importCode, setImportCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [copyResult, setCopyResult] = useState<{code: string; success: boolean} | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLTextAreaElement>(null);
  const pixels = runtime.model.serializeDesign(design).pixels;
  const passport = useMemo(() => previewCatCode(runtime, design), [runtime, design]);
  const currentCopy = copyResult?.code === passport.code ? copyResult : null;
  let passportHint = "Updates as you create. Ready to import into the app.";
  if (passport.error) passportHint = passport.error;
  else if (currentCopy?.success) passportHint = "Copied. Your cat is ready to travel.";
  else if (currentCopy) passportHint = "Copy the selected code with ⌘C or Ctrl+C.";
  const {appearance} = design;

  useEffect(() => {
    const dialog = dialogRef.current;
    const focused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    trackSiteAction("creator_opened");
    document.body.style.overflow = "hidden";
    nameRef.current?.focus({preventScroll:true});
    return () => { dialog?.close(); document.body.style.overflow = previousOverflow; focused?.focus({preventScroll:true}); };
  }, []);

  function update(patch: Partial<CatAppearance>): void {
    setDesign(current => ({...current, appearance: {...current.appearance, ...patch}}));
    setError("");
  }
  function cycle(category: AccessoryCategory, direction: number): void {
    const choices = Object.keys(runtime.model.options[category]);
    const next = (choices.indexOf(appearance[category]) + direction + choices.length) % choices.length;
    update({[category]: choices[next]});
  }
  async function finish(): Promise<void> {
    if (!appearance.name.trim()) { setError("Give your cat a name first."); nameRef.current?.focus(); return; }
    if (design.birthday && !runtime.model.validBirthday(design.birthday)) { setError("Choose a real birthday, or leave it empty."); return; }
    setSaving(true);
    try { await onDone(design); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Your cat could not be saved. Try again."); setSaving(false); }
  }
  function importCat(): void {
    try { setDesign(runtime.passport.decode(importCode)); setError(""); setImportCode(""); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Check your cat code."); }
  }
  async function copyCode(): Promise<void> {
    if (!passport.code) return;
    try {
      await navigator.clipboard.writeText(passport.code);
      setCopyResult({code:passport.code, success:true});
    } catch {
      setCopyResult({code:passport.code, success:false});
      if (codeRef.current?.value === passport.code) {
        codeRef.current.focus();
        codeRef.current.select();
      }
    }
  }

  return <dialog ref={dialogRef} className="catBuilder" aria-labelledby="cat-builder-title"
    onCancel={event => {event.preventDefault(); if (!saving) onClose();}}
    onClick={event => {if (event.target === event.currentTarget && !saving) onClose();}}>
    <div className="catBuilderContent">
      <header className="catBuilderHeader"><div><h2 id="cat-builder-title">Make it a little you.</h2><p>A small cat. Your kind of weird.</p></div>
        <button className="catBuilderClose" onClick={onClose} disabled={saving} aria-label="Close cat builder">×</button></header>
      <div className="catBuilderBody">
        <div className="catBuilderPortrait">
          <div className="catBuilderOrbit"><CatPortrait pixels={pixels} name={appearance.name || "Your cat"}/></div>
          <h3>{appearance.name || "Your cat"}</h3><p className="catBuilderDescription">{describeCat(runtime, design)}</p>
          <div className="catBuilderPassport">
            <div className="catBuilderPassportHeading"><label htmlFor="cat-builder-code">Your cat code <span>A tiny passport.</span></label>
              <button onClick={copyCode} disabled={!passport.code} aria-label="Copy cat code">{currentCopy?.success ? "Copied ✓" : "Copy"}</button></div>
            <textarea ref={codeRef} id="cat-builder-code" readOnly spellCheck={false} rows={3} value={passport.code} placeholder="Your cat code will appear here." aria-describedby="cat-builder-code-hint"/>
            <p id="cat-builder-code-hint" role="status">{passportHint}</p>
          </div>
        </div>
        <div className="catBuilderControls">
          <div className="catBuilderIdentity"><label>Cat name<input ref={nameRef} value={appearance.name} maxLength={24} onChange={event => update({name:event.target.value})}/></label>
            <label><span className="catBuilderLabel">Birthday <small>(optional)</small></span><input type="date" min="1000-01-01" max="9999-12-31" value={design.birthday ?? ""} onInput={event => {const value=event.currentTarget.value;setDesign(current => ({...current,birthday:value || null}));}} onBlur={event => {const value=event.currentTarget.value;setDesign(current => ({...current,birthday:value || null}));}}/></label></div>
          {design.mode === "drawing" ? <div className="catBuilderDrawing"><p>Your hand-drawn cat is ready to travel.</p><button onClick={() => setDesign(current => ({...current,mode:"cadet"}))}>Use the Space Cadet base</button></div> : <>
            <fieldset className="catBuilderPalette"><legend>Pick a colour</legend><div className="catBuilderSwatches">
              {Object.entries(runtime.model.presets).map(([id, preset]) => <button key={id} title={preset.name} aria-label={`${preset.name} colours`} aria-pressed={appearance.fur.toLowerCase()===preset.fur.toLowerCase()} style={{"--swatch":preset.fur} as React.CSSProperties} onClick={() => update({...preset,name:appearance.name})}><span/><small>{preset.name}</small></button>)}
            </div></fieldset>
            <div className="catBuilderCustom"><label>Your own colour<input type="color" aria-label="Custom fur colour" value={appearance.fur} onChange={event => update({fur:event.target.value})}/></label><label>Accessory colour<input type="color" aria-label="Accessory colour" value={appearance.gear} onChange={event => update({gear:event.target.value})}/></label></div>
            <div className="catBuilderAccessories">{(Object.keys(categoryLabels) as AccessoryCategory[]).map(category => <div className="catBuilderAccessory" key={category}>
              <span>{categoryLabels[category]}</span><button onClick={() => cycle(category,-1)} aria-label={`Previous ${categoryLabels[category].toLowerCase()}`}>‹</button>
              <select aria-label={categoryLabels[category]} value={appearance[category]} onChange={event => update({[category]:event.target.value})}>{Object.entries(runtime.model.options[category]).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select>
              <button onClick={() => cycle(category,1)} aria-label={`Next ${categoryLabels[category].toLowerCase()}`}>›</button>
            </div>)}</div>
          </>}
          <details className="catBuilderMore"><summary>A few more details</summary><div className="catBuilderDetails">
            {(["helmet","eyes","accent"] as const).map(key=><label key={key}>{key === "accent" ? "Suit light" : key[0].toUpperCase()+key.slice(1)}<input type="color" value={appearance[key]} onChange={event=>update({[key]:event.target.value})}/></label>)}
            <label>Expression<select value={appearance.expression} onChange={event=>update({expression:event.target.value as CatAppearance["expression"]})}><option value="awake">Bright-eyed</option><option value="wink">Wink</option><option value="sleepy">Sleepy</option></select></label>
          </div></details>
          <details className="catBuilderImport"><summary>Already have a cat code?</summary><label>Cat code<textarea value={importCode} onChange={event => setImportCode(event.target.value)} placeholder="SC1… or SC2…"/></label><button onClick={importCat}>Import cat</button></details>
          {error && <p role="alert" className="catBuilderError">{error}</p>}
        </div>
      </div>
      <footer className="catBuilderFooter"><p>Yours here. Yours in the app.<small>Done copies your cat code, ready to import.</small></p><button className="catBuilderDone" onClick={finish} disabled={saving}>{saving ? "Saving your cat…" : "Done · copy cat code"}</button></footer>
    </div>
  </dialog>;
}
