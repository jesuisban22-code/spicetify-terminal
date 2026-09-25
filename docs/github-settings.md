# GitHub settings and release checklist

Manual steps for the repository owner. None of this can be done from a commit.

## 1. Merge to `main` first

The Spicetify Marketplace reads everything from the **default branch**:

- `manifest.json` from `https://raw.githubusercontent.com/<user>/<repo>/<branch>/manifest.json`
- `user.css` from `https://cdn.jsdelivr.net/gh/<user>/<repo>@<branch>/user.css`
- the preview image and README from raw.githubusercontent.com on the same branch

(source: `src/logic/FetchRemotes.ts` and `src/logic/Utils.ts` in
[spicetify/marketplace](https://github.com/spicetify/marketplace)). Until the
Windows branch is merged into `main`, Marketplace users still get v1.0.

## 2. About panel (gear icon next to "About" on the repo page)

**Description** (English, 207 characters, limit 350):

```
Hacker/terminal theme for Spotify (Spicetify) on Windows and Linux: boot sequence, shell-style command palette, live ASCII-art album covers, matrix rain and an audio visualizer driven by real track analysis.
```

**Website**: the project has no site of its own, so point it at Spicetify, which
users need installed first:

```
https://spicetify.app
```

(Leaving it empty is also fine. The Marketplace does not read this field.)

**Topics** — type each one and press Enter. `spicetify-themes` is **required**:
the Marketplace lists themes by searching GitHub for
`topic:spicetify-themes` (`src/components/Grid.tsx`). Without it, the theme is
invisible in the Marketplace.

```
spicetify-themes
spicetify
spotify
spotify-theme
spicetify-theme
terminal
hacker
matrix
ascii-art
theme
```

Do not add `spicetify-extensions` or `spicetify-snippets`: those make the
Marketplace try to list the repo as an extension or snippet.

Also check that the repository is **public** and **not archived** (archived repos
are hidden by default in the Marketplace).

## 3. Social preview image

Settings → General → Social preview → Edit → Upload an image.

- Size: **1280 × 640 px** (2:1), PNG or JPG, under 1 MB (GitHub's recommendation;
  minimum 640 × 320).
- Use **`screenshots/home.png`**: it shows the ASCII covers, the visualizer and the
  overall look in one frame. The screenshot is 1585 × 706 (about 2.24:1), so crop
  the sides to 2:1 before uploading, for example with ImageMagick:

  ```bash
  magick screenshots/home.png -gravity center -crop 1412x706+0+0 +repage -resize 1280x640 social-preview.png
  ```

  Keep the output out of the repo (or at least out of `screenshots/`): it is only
  uploaded through the settings page.

## 4. Tags and the v1.1.0 release

Tag the initial release too, so the changelog compare links work.

```bash
git checkout main
git pull
# v1.0.0 = the initial Linux release
git tag -a v1.0.0 bb80cda -m "Terminal v1.0.0"
# v1.1.0 = main after the Windows branch is merged
git tag -a v1.1.0 -m "Terminal v1.1.0 - Windows support"
git push origin v1.0.0 v1.1.0
```

Then on GitHub: **Releases → Draft a new release**

1. Choose tag `v1.1.0`, target `main`.
2. Title: `Terminal v1.1.0 — Windows support`
3. Body: paste `docs/release-notes-v1.1.0.md`.
4. Attach nothing (the Marketplace does not use release assets). Keep
   "Set as the latest release" checked, then **Publish release**.

Or with the GitHub CLI:

```bash
gh release create v1.1.0 --title "Terminal v1.1.0 — Windows support" --notes-file docs/release-notes-v1.1.0.md
```

If the release date differs from 2026-09-25, update the date in `CHANGELOG.md`.

## 5. jsDelivr cache (theme.js)

Marketplace installs load `theme.js` from the `include` URL in `manifest.json`:

```
https://cdn.jsdelivr.net/gh/jesuisban22-code/spicetify-terminal@main/theme.js
```

jsDelivr caches branch URLs such as `@main` for up to **12 hours**. After pushing
to `main`, force the refresh by opening these purge links in a browser (each
returns a small JSON status):

- https://purge.jsdelivr.net/gh/jesuisban22-code/spicetify-terminal@main/theme.js
- https://purge.jsdelivr.net/gh/jesuisban22-code/spicetify-terminal@main/user.css

`user.css` is also served from jsDelivr `@main` by the Marketplace, so purge both
together so CSS and JS stay in sync. Purging is rate-limited (a few calls per URL
per hour). Check the result at
`https://cdn.jsdelivr.net/gh/jesuisban22-code/spicetify-terminal@main/theme.js`.

Why `@main` and not `@v1.1.0`: a tag URL returns 404 until the tag is pushed, so
publishing the manifest first would break every Marketplace install. The
Marketplace also always loads `user.css` from `@main`, so pinning only the JS to a
tag would let CSS and JS drift apart on the next release. `@main` cannot break
before a release exists and always matches the CSS.

Manual installs (`spicetify apply`) are not affected: they use the local
`theme.js` in the theme folder, not the `include` URL.
