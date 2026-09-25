# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] - 2026-09-25

### Fixed

- Boot sequence: the log could fade out mid-line ("the text loads but never
  finishes") when Spotify started busy, hidden or behind other windows. Typing
  used one timer per character while the 3.2s safety net counted wall-clock
  time, so any timer delay (Windows' 15.6ms timer granularity, a busy main
  thread during startup, ~1s timers in a hidden window) let the cutoff win.
  Progress is now computed from elapsed visible time, the animation waits
  until the window is actually shown, and the safety net completes the text
  and holds it briefly instead of cutting it.
- The theme script now runs only once per page, even if it is injected twice
  (Marketplace include plus a local copy), so there is a single boot overlay
  and no doubled listeners.

## [1.1.1] - 2026-09-25

### Fixed

- Boot sequence: the ASCII "Terminal" logo was misaligned (the dot of the
  "i" and the top of the "l" sat in the wrong columns, and the second row was
  shifted by one character).
- Boot sequence: the logo no longer jumps upward while the log lines are
  typed; the log now reserves its full final height from the first frame.
- Boot log and `neofetch` showed "v1.0"; both now read the theme version.

## [1.1.0] - 2026-09-25

Windows support. Linux rendering is unchanged.

### Added

- OS detection: `<html>` is tagged with `terminal-os-windows`, `terminal-os-linux`
  or `terminal-os-mac` (from `Spicetify.Platform.operatingSystem`, then Spotify's
  own body class, then `navigator`), so platform-specific fixes stay scoped.
- Windows font fallbacks: Cascadia Mono / Cascadia Code and Consolas (plus Menlo
  on macOS) after DejaVu Sans Mono, shared with the mini-player. Matrix rain adds
  MS Gothic / Yu Gothic / Meiryo for katakana on Windows.
- Window drag strip on Windows: the boot sequence and command palette overlays
  keep a 32px draggable strip at the top, so the window can still be moved while
  they cover the title bar.
- HiDPI rendering: the visualizer and matrix rain canvases render at the device
  pixel ratio and resync when the DPI changes (e.g. moving the window to another
  monitor). Output at 100% scaling is unchanged.
- PowerShell install instructions and a fonts note in the README.
- `.gitattributes` enforcing LF line endings, so theme files stay intact when
  cloned on Windows.
- English Marketplace description in `manifest.json`.

### Fixed

- The "compiling" badge no longer sits under the Windows caption buttons
  (minimize / maximize / close), even when Spotify is zoomed out.
- The visualizer is no longer stretched: its backing store follows the canvas'
  own displayed width.
- Matrix rain recomputes its column count on resize and DPI change, so it always
  fills the full width.
- `Ctrl+Shift+K` no longer triggers on AltGr (reported as Ctrl+Alt on Windows),
  so typing characters such as `@`, `#` or `{` on AZERTY/QWERTZ layouts does not
  open the palette.

## [1.0.0] - 2026-09-19

Initial release (Linux).

### Added

- Terminal boot sequence on startup.
- Live ASCII-art album covers (home, search, library, playlist/album headers,
  mini-player).
- Shell-style command palette (`Ctrl+Shift+K`): `play`, `pause`, `next`, `back`,
  `goto`, `search`, `stats`, `history`, `neofetch`, `uptime`, `whoami`, `cowsay`,
  `clear` and a few easter eggs.
- Now Playing audio visualizer driven by the track's real audio analysis.
- "Now playing" pulse synced to the cover's dominant color and the track tempo.
- Matrix rain screensaver on inactivity, optional CRT scanlines, tempo markers on
  the progress bar, vim-style keyboard navigation, themed mini-player.
- Settings panel to toggle every feature individually.

[1.1.2]: https://github.com/jesuisban22-code/spicetify-terminal/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/jesuisban22-code/spicetify-terminal/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/jesuisban22-code/spicetify-terminal/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/jesuisban22-code/spicetify-terminal/releases/tag/v1.0.0
