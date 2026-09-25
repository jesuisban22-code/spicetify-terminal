# r/unixporn

**Subreddit:** <https://www.reddit.com/r/unixporn/>
**Rules:** <https://www.reddit.com/r/unixporn/about/rules> · details-comment template: <https://www.reddit.com/r/unixporn/wiki/info/template>

## Does a Spotify theme fit? Yes, as `[OC]`, with conditions

reddit.com was unreachable from the research environment, so this summary comes from the sub's **public moderation bot source code** (`unixporn/upmo`, `bot.py`): <https://github.com/unixporn/upmo/blob/master/bot.py>. That code may be older than the current rules. **Re-read the live rules before posting.**

What the bot enforces:

| Rule | Detail |
|---|---|
| Title tag required | *"Screenshots requires [WM/DE] … Material requires [OC]"*. A theme you made is **Material**, so use **`[OC]`**. For a regular screenshot post you'd name your actual WM/DE, e.g. `[Hyprland]`. |
| Forbidden tags | Literal generic tags are removed: `[WM]`, `[DE]`, `[WM/DE]`, `[Material]`, `[Screenshot]`, `[Question]`, `[Help]`… Also **OS tags** like `[Arch]`, which were replaced by user flair. |
| Details comment | Warned after 15 min, **post removed after 30 min** without a details comment from OP. Have it ready to paste as soon as you submit. |
| Image hosts | Screenshot posts must use approved hosts (i.redd.it / v.redd.it, imgur…). `[OC]` material *"can come from any website"*, but native upload is still safest. |
| Karma | Removed if combined link + comment karma < 5. |
| Help requests | Go in the weekly workshop thread, not in a post. |

**Conditions for this post:**
1. The screenshot must be taken **on Linux** (Unix-like). Not Windows, even though the theme works there.
2. Show the **whole desktop** (WM, bar, terminal), with Spotify + Terminal as the focus. A desktop that matches the theme (green on black, monospace) fits the sub much better than a lone Spotify window.
3. One post only. Don't repost a variant a few days later.

## Media

- Link post: `screenshots/matrix.gif` (convert to mp4 if > ~10 MB), or a full-desktop screenshot that includes `home.png`-style Spotify.
- Put the other screenshots and `boot.gif` in the details comment (any host is fine in comments).

## Title

`[OC] Terminal — a Spicetify theme for Spotify with a shell-like command palette, live ASCII covers and matrix rain`

(Do **not** add `[Hyprland]` / `[Arch]` next to `[OC]` unless the live rules say combined tags are OK.)

## Details comment (paste within 30 min, ideally right away)

```markdown
**Details**

- **Theme:** Terminal (Spicetify theme, my OC): https://github.com/jesuisban22-code/spicetify-terminal
- **App:** Spotify desktop + [Spicetify](https://spicetify.app)
- **WM/DE:** <your WM, e.g. Hyprland>
- **Bar:** <your bar>
- **Terminal:** <your terminal>
- **Font:** JetBrains Mono (the theme falls back to Fira Code / Hack / DejaVu Sans Mono / monospace)
- **Colors:** the theme's own `terminal` color scheme (color.ini)
- **Wallpaper:** <source/credit>

**What the theme does**
- Boot sequence on launch
- `Ctrl+Shift+K` command palette, a small shell (`play`, `next`, `goto`, `search`, `neofetch`, `cowsay`, `history`, `matrix`…)
- Album covers re-rendered live as block-character pixel art
- Visualizer driven by the track's real audio analysis (loudness + pitch per segment)
- Now-playing pulse synced to the cover color and real tempo
- Matrix-rain screensaver when paused + idle, optional CRT scanlines, vim keys (`j`/`k`/`Enter`/`/`)
- Every effect can be toggled; honors `prefers-reduced-motion`

**Install:** Spicetify Marketplace → Themes → "Terminal", or manually (instructions in the README).

More media: boot sequence GIF <link>, command palette <link>
```

## If it doesn't fit

If the live rules say app themes alone are off-topic (e.g. "full desktop only"), post only a **full desktop** screenshot tagged with your WM, and mention the theme in the details comment. Or skip r/unixporn and share it in the **weekly thread** instead.
