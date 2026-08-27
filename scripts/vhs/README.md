# VHS Terminal Recording

VHS tape for the Outdoor Cat one-line install demo shown on the homepage and
`/download/direct` (`public/assets/install-demo.{gif,mp4}`).

## How it stays honest

The tape types — and genuinely executes — the real one-liner
`curl -fsSL https://localaicat.com/install | sh`. A hidden `sh` shell function
(defined in the tape before recording starts) redirects the piped script into
`install-sandboxed.sh`, which does the real download/mount/copy/xattr work but
targets a temp directory instead of `/Applications` and never launches the app.
`install-sandboxed.sh` mirrors the served script; keep it in sync with
`lib/install-script.ts` (banner text and `RELEASE_META`) when that changes.

## Re-recording when the release changes

```bash
cd scripts/vhs
vhs install-demo.tape   # needs: brew install vhs; downloads the real DMG
```

The tape waits for the "meow~" done banner, so total runtime tracks the real
download (~30s on a fast connection).
