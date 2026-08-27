# VHS tape for the Local AI Cat one-line install demo
# https://github.com/charmbracelet/vhs
# Render from this directory: `vhs install-demo.tape`
#
# The viewer sees — and the shell genuinely executes — the real one-liner:
#   curl -fsSL https://localaicat.com/install | sh
# A hidden `sh` shell function redirects the piped script into
# install-sandboxed.sh, which performs the real download/mount/copy but
# targets a temp directory and never launches the app (see README.md).

Output ../../public/assets/install-demo.gif
Output ../../public/assets/install-demo.mp4

# Site palette: --bg #090909-ish, --text #f0ece4, --accent #e8d5b0
Set Theme { "background": "#090909", "foreground": "#f0ece4", "cursor": "#e8d5b0", "selection": "#3a3630", "black": "#1a1a1a", "red": "#d19a9a", "green": "#7fae8b", "yellow": "#e8d5b0", "blue": "#6f9bd0", "magenta": "#d3a7c9", "cyan": "#8fc3c9", "white": "#f0ece4", "brightBlack": "#7a746a", "brightRed": "#d19a9a", "brightGreen": "#7fae8b", "brightYellow": "#e8d5b0", "brightBlue": "#6f9bd0", "brightMagenta": "#d3a7c9", "brightCyan": "#8fc3c9", "brightWhite": "#ffffff" }
Set FontSize 15
Set Width 1000
Set Height 560
Set Padding 24
Set TypingSpeed 90ms

# Hidden setup: intercept `sh` so the piped install script becomes the
# sandboxed one. `curl` still really fetches https://localaicat.com/install.
Hide
Type `sh() { command sh ./install-sandboxed.sh; }`
Enter
Type "clear"
Enter
Show

Sleep 800ms
Type "curl -fsSL https://localaicat.com/install | sh"
Sleep 1s
Enter

# The install prints the "meow~" done banner when finished.
Wait+Screen@120s /meow~/
Sleep 3s
