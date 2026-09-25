## Terminal v1.1.0 — Windows support

Terminal now runs on **Windows** as well as Linux. Linux rendering is unchanged.

> FR : le thème fonctionne désormais sous Windows ; rien ne change sous Linux.

### What's new

- **Windows-aware layout**: the theme detects the OS and only applies Windows fixes on Windows.
- **Fonts**: falls back to Cascadia Mono or Consolas when JetBrains Mono isn't installed (never Courier New).
- **Movable window**: the boot sequence and command palette keep a drag strip at the top, so you can still move the window while they're open.
- **Caption buttons**: the "compiling" badge no longer hides behind minimize / maximize / close.
- **Sharp on HiDPI**: the visualizer and matrix rain render at your display scaling (125%, 150%, 4K...) and follow you across monitors.
- **Visualizer** is no longer stretched, and **matrix rain** fills the full width after a resize.
- **AltGr-safe shortcut**: `Ctrl+Shift+K` no longer fires while typing `@`, `#`, `{`... on AZERTY/QWERTZ keyboards.
- **PowerShell install instructions** in the README, and LF line endings enforced for Windows clones.

### Install / update

- **Marketplace**: open Marketplace → Themes → **Terminal** → Install (already installed? reinstall it, or just restart Spotify).
- **Manual**: `git pull` inside your `Themes/Terminal` folder, then `spicetify apply`. See the [README](https://github.com/jesuisban22-code/spicetify-terminal#readme) for bash and PowerShell commands.

Full changelog: [CHANGELOG.md](https://github.com/jesuisban22-code/spicetify-terminal/blob/main/CHANGELOG.md) · [v1.0.0...v1.1.0](https://github.com/jesuisban22-code/spicetify-terminal/compare/v1.0.0...v1.1.0)
