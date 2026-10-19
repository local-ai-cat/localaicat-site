"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  isSupportChatPath, supportChatEvent, supportChatInitialMessages,
  supportChatOrigin, supportChatUrl, supportChatVisibilityMessage
} from "../../lib/support-chat";
import styles from "./support-chat.module.css";

// Opening chat after a reload that the trigger asked for.
const reopenAfterLoadKey = "support-chat-reopen";

/** Route changes unmount the frame, including on client navigation to private pages. */
export function SupportChat(): React.JSX.Element | null {
  const pathname = usePathname();
  // A document keeps the CSP of the page it was loaded as. One that started on a private
  // page forbids the chat frame even after a client navigation to a public page.
  const [documentPath] = useState(() => (typeof window === "undefined" ? null : window.location.pathname));
  if (!isSupportChatPath(pathname)) return null;
  const needsFreshDocument = documentPath !== null && !isSupportChatPath(documentPath);
  return <SupportChatDialog key={pathname} needsFreshDocument={needsFreshDocument} />;
}

function SupportChatDialog({ needsFreshDocument }: { needsFreshDocument: boolean }): React.JSX.Element {
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [started, setStarted] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "slow">("loading");

  useEffect(() => {
    if (!started) return;
    const timeout = window.setTimeout(() => setLoadState("slow"), 15_000);
    function receiveMessage(event: MessageEvent): void {
      const widget = frame.current?.contentWindow;
      const message = supportChatEvent(event.origin, Boolean(widget && event.source === widget), event.data);
      if (message === "loaded") {
        for (const config of supportChatInitialMessages) {
          frame.current?.contentWindow?.postMessage(config, supportChatOrigin);
        }
        window.clearTimeout(timeout);
        setLoadState("ready");
      } else if (message === "close") {
        dialog.current?.close();
      }
    }
    window.addEventListener("message", receiveMessage);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("message", receiveMessage);
    };
  }, [started]);

  useEffect(() => {
    if (window.sessionStorage.getItem(reopenAfterLoadKey) === null) return;
    window.sessionStorage.removeItem(reopenAfterLoadKey);
    openSupport();
  }, []);

  function openSupport(): void {
    if (needsFreshDocument) {
      window.sessionStorage.setItem(reopenAfterLoadKey, "1");
      window.location.reload();
      return;
    }
    setStarted(true);
    dialog.current?.showModal();
    frame.current?.contentWindow?.postMessage(supportChatVisibilityMessage(true), supportChatOrigin);
  }

  function didCloseSupport(): void {
    frame.current?.contentWindow?.postMessage(supportChatVisibilityMessage(false), supportChatOrigin);
    trigger.current?.focus();
  }

  return (
    <>
      <button ref={trigger} type="button" className={styles.trigger} onClick={openSupport}
        aria-haspopup="dialog" aria-controls="support-chat-dialog">
        <span aria-hidden="true">☏</span> Chat support
      </button>
      <dialog ref={dialog} id="support-chat-dialog" className={styles.dialog}
        aria-labelledby="support-chat-title" onClose={didCloseSupport}
        onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
        <div className={styles.panel}>
          <header className={styles.header}>
            <h2 id="support-chat-title">Chat with us</h2>
            <button type="button" className={styles.close} aria-label="Close chat support"
              onClick={() => dialog.current?.close()} autoFocus>×</button>
          </header>
          <div className={styles.chat}>
            {loadState !== "ready" && <p className={styles.loading} role="status">
              {loadState === "slow" ? "Chat is taking a little longer. You can email us below." : "Opening chat…"}
            </p>}
            {started && <iframe ref={frame} src={supportChatUrl} title="Local AI Cat support conversation"
              className={styles.frame} referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-forms"
              allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'" />}
          </div>
          <footer className={styles.footer}>
            <span>Prefer email?</span>
            <a href="mailto:support@localaicat.com">Email instead</a>
          </footer>
        </div>
      </dialog>
    </>
  );
}
