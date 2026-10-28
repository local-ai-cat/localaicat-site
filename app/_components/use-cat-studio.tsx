"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { CatBuilder } from "./cat-builder";
import { catStorageKey, loadCatRuntime, readSavedCat, saveCat } from "../../lib/cadet-runtime";
import type { CatDesign, CatRuntime } from "../../lib/cadet-runtime";
import { getDownloadLinkUrl } from "../../lib/env";
import { trackSiteAction } from "../../lib/site-analytics";

type CatReceipt = { code: string; copied: boolean; persisted: boolean };
type CatStudio = {
  runtime: CatRuntime | null;
  cat: CatDesign | null;
  openBuilder(): Promise<void>;
  builderOpen: boolean;
  studioUI: ReactNode;
};

export function useCatStudio(): CatStudio {
  const [runtime, setRuntime] = useState<CatRuntime | null>(null);
  const [cat, setCat] = useState<CatDesign | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderError, setBuilderError] = useState("");
  const [receipt, setReceipt] = useState<CatReceipt | null>(null);

  useEffect(() => {
    let disposed = false;
    loadCatRuntime().then(api => {
      if (disposed) return;
      setRuntime(api);
      setCat(readSavedCat(api));
      if (new URLSearchParams(location.search).get("studio") === "1") setBuilderOpen(true);
    }).catch(() => {});
    return () => { disposed = true; };
  }, []);

  const openBuilder = useCallback(async (): Promise<void> => {
    setBuilderError("");
    try {
      const api = runtime ?? await loadCatRuntime();
      setRuntime(api);
      if (!runtime) setCat(readSavedCat(api));
      setBuilderOpen(true);
    } catch (failure) {
      setBuilderError(failure instanceof Error ? failure.message : "Please try opening the wardrobe again.");
    }
  }, [runtime]);

  useEffect(() => {
    function openFromPage(): void { void openBuilder(); }
    window.addEventListener("open-cat-builder", openFromPage);
    return () => window.removeEventListener("open-cat-builder", openFromPage);
  }, [openBuilder]);

  useEffect(() => {
    if (!runtime) return;
    function syncSaved(event: StorageEvent): void {
      if (event.key === catStorageKey && runtime) setCat(readSavedCat(runtime));
    }
    window.addEventListener("storage", syncSaved);
    return () => window.removeEventListener("storage", syncSaved);
  }, [runtime]);

  function closeBuilder(): void {
    setBuilderOpen(false);
    const url = new URL(location.href);
    if (url.searchParams.has("studio")) {
      url.searchParams.delete("studio");
      history.replaceState(history.state, "", url);
    }
  }

  async function finishCat(design: CatDesign): Promise<void> {
    if (!runtime) return;
    const saved = saveCat(runtime, design);
    // Keep the write inside the Done gesture, with a manual fallback if permission is denied.
    let copied = false;
    try {
      await navigator.clipboard.writeText(saved.code);
      copied = true;
      trackSiteAction("cat_code_copied");
    } catch {}
    setCat(saved.design);
    window.dispatchEvent(new CustomEvent("space-cadet-saved", { detail: saved.design }));
    setReceipt({ code: saved.code, copied, persisted: saved.persisted });
    closeBuilder();
  }

  async function copyAgain(): Promise<void> {
    if (!receipt) return;
    try {
      await navigator.clipboard.writeText(receipt.code);
      setReceipt({ ...receipt, copied: true });
      trackSiteAction("cat_code_copied");
    } catch {
      setReceipt({ ...receipt, copied: false });
    }
  }

  const studioUI = <>
    {builderError && <p className="catBuilderError" role="alert">{builderError}</p>}
    {receipt && <div className="catHomeReceipt">
      <div role="status"><strong>{cat?.appearance.name} is home.</strong><span>{receipt.copied ? "Cat code copied. Paste it into Customise / Import cat code in the app." : "Your cat is ready. Copy the code below to bring it into the app."}</span>
        {!receipt.persisted && <span>This browser could not save it. Keep your cat code before leaving.</span>}</div>
      <div className="catHomeReceiptActions"><a onClick={() => trackSiteAction("download_clicked", "mac")} href={getDownloadLinkUrl()}>Download Local AI Cat</a><button onClick={copyAgain}>{receipt.copied ? "Copy code again" : "Copy cat code"}</button></div>
      <details open={!receipt.copied}><summary>Your cat code</summary><textarea aria-label="Your saved cat code" readOnly value={receipt.code} onFocus={event => event.currentTarget.select()}/></details>
      <button className="catReceiptDismiss" aria-label="Dismiss cat confirmation" onClick={() => setReceipt(null)}>×</button>
    </div>}
    {builderOpen && runtime && <CatBuilder runtime={runtime} initial={cat} onClose={closeBuilder} onDone={finishCat}/>}
  </>;

  return { runtime, cat, openBuilder, builderOpen, studioUI };
}
