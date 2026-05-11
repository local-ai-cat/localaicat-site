import type { Metadata } from "next";
import { ContentPage } from "../../_components/content-page";
import { SiteShell } from "../../_components/site-shell";

export const metadata: Metadata = {
  title: "SSH from iPhone — file access on macOS",
  description:
    "Why protected folders like ~/Documents, ~/Desktop and ~/Downloads return 'Operation not permitted' when you SSH into your Mac from Local AI Cat, and how to grant access."
};

export default function SshHelpPage() {
  return (
    <SiteShell>
      <ContentPage
        kicker="Help"
        title="SSH from iPhone — file access on macOS"
        intro="If you SSH into your Mac and see “Operation not permitted” inside Documents, Desktop, Downloads or iCloud Drive, that’s a macOS privacy gate, not a bug. Here’s the one-time fix."
        callout={
          <p>
            <strong>Symptom:</strong>{" "}
            <code>ls</code> works in your home folder but{" "}
            <code>cd ~/Documents && ls</code> returns{" "}
            <code>ls: .: Operation not permitted</code>. Tools like Claude
            Code, Codex, or anything that reads the current folder exit
            silently because they can’t even list it.
          </p>
        }
      >
        <section className="contentCard">
          <h2>Why this happens</h2>
          <p>
            macOS gates access to certain folders behind a privacy permission
            called Full Disk Access. By default the SSH daemon —{" "}
            <code>sshd</code> — is <em>not</em> on the list, so any shell it
            spawns is treated like a random untrusted process. Your local
            Terminal.app session is fine because Terminal already has the
            permissions it needs; the SSH session is a different process
            with a different sandbox.
          </p>
          <p>
            The protected folders include:
          </p>
          <ul>
            <li><code>~/Documents</code></li>
            <li><code>~/Desktop</code></li>
            <li><code>~/Downloads</code></li>
            <li>iCloud Drive</li>
            <li>External volumes and removable storage</li>
            <li>Some app sandboxes (Photos, Mail, Messages, etc.)</li>
          </ul>
        </section>

        <section className="contentCard">
          <h2>Fix: grant SSH Full Disk Access</h2>
          <p>One-time setup on the Mac you’re SSH-ing into:</p>
          <ol>
            <li>
              Open <strong>System Settings</strong> →{" "}
              <strong>Privacy &amp; Security</strong> →{" "}
              <strong>Full Disk Access</strong>.
            </li>
            <li>
              Click the <strong>+</strong> button. macOS will open a Finder
              picker.
            </li>
            <li>
              Press <strong>⌘&nbsp;⇧&nbsp;G</strong> to “Go to Folder” and
              paste:
              <pre><code>/usr/libexec/sshd-keygen-wrapper</code></pre>
            </li>
            <li>
              Click <strong>Open</strong>. The wrapper appears in the list
              with its toggle <em>on</em>.
            </li>
            <li>
              Disconnect any existing SSH sessions and reconnect. The next
              shell will inherit the new permission.
            </li>
          </ol>
          <p>
            That single entry covers all protected folders for every future
            SSH session. You don’t need to grant per-folder access.
          </p>
        </section>

        <section className="contentCard">
          <h2>How to confirm it worked</h2>
          <p>
            After reconnecting, run:
          </p>
          <pre><code>cd ~/Documents{"\n"}ls</code></pre>
          <p>
            If you see your files instead of <code>Operation not permitted</code>,
            you’re done. Claude Code, Codex and any other tool that touches
            the working directory will now launch normally.
          </p>
        </section>

        <section className="contentCard">
          <h2>If you don’t want to grant access</h2>
          <p>
            Keep your SSH-from-iPhone work in unprotected folders. Anything
            under your home folder that isn’t in the list above will work
            without granting permissions:
          </p>
          <pre><code>mkdir ~/work{"\n"}cd ~/work{"\n"}claude</code></pre>
          <p>
            Or clone repos into <code>~/code</code>, <code>~/projects</code>,
            etc. — those paths aren’t TCC-protected.
          </p>
        </section>

        <section className="contentCard">
          <h2>Security note</h2>
          <p>
            Granting <code>sshd-keygen-wrapper</code> Full Disk Access means
            <em>anyone who successfully authenticates over SSH to this Mac</em>
            can read every file on it. That’s the trade-off. If you only use
            password or public-key auth from devices you control, and your
            Mac is on a trusted network, it’s a reasonable choice — and it’s
            no different from the access a local Terminal.app session has.
            If your Mac is internet-exposed or shared, prefer the
            unprotected-folder workaround above.
          </p>
        </section>
      </ContentPage>
    </SiteShell>
  );
}
