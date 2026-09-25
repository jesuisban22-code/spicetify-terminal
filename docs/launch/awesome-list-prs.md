# Curated lists: PRs

## State of the landscape (checked 2026-09-25)

- **No "awesome-spicetify" list exists.** A GitHub repository search for `awesome spicetify` returned 0 results, and `spicetify in:name awesome` returned 0 too.
- **spicetify/spicetify-themes** does **not** accept new themes: *"This repository no longer accepts new theme submissions. If you want to publish a new theme, please use the Marketplace publishing guide instead"*. Source: <https://github.com/spicetify/spicetify-themes/blob/master/CONTRIBUTING.md>. For us, "being listed" = being in the Marketplace (GitHub topic `spicetify-themes` + valid `manifest.json`): <https://github.com/spicetify/marketplace/wiki/Publishing-to-Marketplace>. That is already set up.
- Two real, maintained venues could take a PR. **Neither is ready today**, for the reasons below.

---

## 1. avtzis/awesome-linux-ricing: ⏳ not before 2027-01-19

- **Repo:** <https://github.com/avtzis/awesome-linux-ricing> (~1.3k★, pushed 2026-09-24, not archived)
- **Section:** `### Spotify`, under the `[Spicetify](https://github.com/spicetify/spicetify-cli)` entry, which already lists comfy, fluent, catppuccin, bloom, nord, dribbblish-dynamic and lucid.
- **Rules** (<https://github.com/avtzis/awesome-linux-ricing/blob/main/CONTRIBUTING.md>):
  - Format: `- [Item Name](link) - Description.`
  - Must work on Linux ✅
  - **"project should be at least 4 month old to avoid slop"**. The repo was created on **2026-09-19**, so the earliest date is **2027-01-19**.
  - **"If you are a vibe coder, and want to share something AI generated to win points, please don't bother."** Be honest with yourself here: this theme was built with heavy AI assistance, so this list may not want it. Submit only if you're comfortable that it meets the maintainer's standard, and say so if asked. Otherwise skip this list.

### PR (to open on or after 2027-01-19, only if the conditions above hold)

**Title:** `Add Terminal spicetify theme`

**Body:**
```markdown
Adds **Terminal**, a hacker/terminal-style Spicetify theme, to the Spotify → Spicetify section.

- Repo: https://github.com/jesuisban22-code/spicetify-terminal
- Works on Linux (also Windows); installable from the Spicetify Marketplace
- Features beyond CSS: shell-like command palette, live block-character cover art, visualizer driven by the track's audio analysis, matrix-rain idle screensaver
- Project started September 2026, actively maintained

I'm the author. Happy to adjust the wording.
```

**Exact line.** Insert it right after the `lucid` line, keeping the 2-space indent the other themes use:
```markdown
  - [terminal](https://github.com/jesuisban22-code/spicetify-terminal) - Hacker/terminal theme with a shell-like command palette, live ASCII cover art and matrix rain.
```

---

## 2. Gerg-L/spicetify-nix: ⏳ after v1.1.0 is stable (optional, technical)

- **Repo:** <https://github.com/Gerg-L/spicetify-nix> (~430★, ~1k commits, active). It isn't an awesome-list: it's a Nix flake that **packages** Spicetify themes. Its theme catalogue is `pkgs/themes.nix` (<https://github.com/Gerg-L/spicetify-nix/blob/master/pkgs/themes.nix>), and sources are pinned in `pkgs/npins/sources.json`.
- No CONTRIBUTING.md was found (404). **Open an issue first** ("Would you accept a theme entry for Terminal?") before sending a PR, and **test the build with Nix yourself**. Don't send untested Nix code.
- Wait until `main` is stable, so the pinned revision isn't obsolete within a week.

### PR

**Title:** `themes: add Terminal`

**Body:**
```markdown
Adds the **Terminal** theme (https://github.com/jesuisban22-code/spicetify-terminal).

- Pinned with npins as `terminalSrc` (branch `main`)
- The theme ships a `theme.js` (boot sequence, command palette, cover-art rendering, visualizer), added via `requiredExtensions` like Comfy
- Color scheme: `terminal`
- Tested with: `<your nix build / home-manager test command and result>`

I'm the theme author.
```

**Changes:**

1. Pin the source. Check the flags with `npins add --help`; the repo's other entries use `branch: main`, `submodules: false`:
   ```bash
   npins -d pkgs/npins add --name terminalSrc github jesuisban22-code spicetify-terminal -b main
   ```
2. In `pkgs/themes.nix`, add this to the attribute set (e.g. after `tokyoNight`):
   ```nix
       terminal = {
         name = "Terminal";
         src = sources.terminalSrc;
         requiredExtensions = [
           {
             src = sources.terminalSrc;
             name = "theme.js";
           }
         ];
       };
   ```
3. Check whether `docs/` has a themes page that lists entries, and add one there too if so.

---

## Lists checked and **not** worth a PR

| List | Why not |
|---|---|
| <https://github.com/fosslife/awesome-ricing> | No Spotify or app-theme section |
| <https://github.com/myugan/awesome-linux-customization> | Short list of desktop tools (file managers, bars, terminals…), no app-theme section |
| <https://github.com/LarissaGuder/spotify-awesome-list> | Spotify web apps (discovery, playlists), not client themes |
| <https://github.com/zemmsoares/awesome-rices> | Lists full user rices/dotfiles, not individual app themes |
