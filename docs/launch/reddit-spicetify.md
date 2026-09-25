# r/spicetify

**Subreddit:** <https://www.reddit.com/r/spicetify/>
**Rules:** <https://www.reddit.com/r/spicetify/about/rules> — ⚠ could not be read live during research (reddit.com unreachable from the research environment). **Read the sidebar and the post-flair list before posting**; adjust the flair below to whatever exists (typically something like "Theme" / "Showcase" / "Release").

Sitewide Reddit rules that apply regardless: no vote manipulation, no alt accounts, promotional posts are fine if not repetitive — <https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam>.

## Post type

**Image gallery** (native upload), in this order:
1. `screenshots/home.png`
2. `screenshots/command-palette.png`
3. `screenshots/matrix-rain.png`

(If the sub allows video/GIF in galleries, put `screenshots/boot.gif` first.)

**Flair:** `Theme` (or the closest existing flair — check).

## Title (pick one)

- `Terminal — a hacker/terminal theme with a real command palette, live ASCII cover art and a visualizer driven by the track's actual audio analysis`
- `I made "Terminal": boot sequence, shell-like command palette (neofetch, cowsay…), ASCII covers and matrix-rain screensaver`

## Body (if the post type allows text) — otherwise paste as first comment

```markdown
Hi r/spicetify! I've been building **Terminal**, a hacker/terminal-style theme. Monospace everything, dark background, and a few things that go beyond CSS:

- **Boot sequence** when Spotify starts (can be turned off)
- **Command palette** on `Ctrl+Shift+K` — a small shell: `play`, `pause`, `next`, `goto library`, `search <query>`, `stats`, `history`, `neofetch`, `cowsay`, `uptime`, `whoami`… plus a few easter eggs (try `sudo` or `matrix`)
- **Live "ASCII" cover art** — album covers are re-rendered as block-character pixel art (home, search, library, headers, now-playing)
- **Visualizer** in the Now Playing view driven by the track's **real audio analysis** (loudness + pitch data per segment), not a looping animation
- **Now-playing pulse** synced to the cover's dominant color and the track's real tempo
- **Matrix rain screensaver** when playback is paused and you're idle (delay + speed configurable)
- Optional **CRT scanlines**, tempo markers on the progress bar, **vim-style navigation** (`j`/`k`/`Enter`/`/`), and theming for the **mini-player (PiP)**
- Every effect can be toggled individually from the settings panel (button in the top bar). `prefers-reduced-motion` disables the animations.

**Install:** Marketplace → Themes → search "Terminal". Manual install instructions are in the README.

Tested on Linux and Windows. macOS untested, feedback welcome.

Repo: https://github.com/jesuisban22-code/spicetify-terminal

Bug reports and ideas for new palette commands are very welcome. Open an issue or reply here.
```

## Notes

- Post from your main account. Stay in the thread for 2–3 h and answer using [faq-replies.md](faq-replies.md).
- If the rules require a specific format (e.g. "[Theme] Name"), follow it over the titles above.
- The settings panel labels are currently in **French**. Say so if people ask, or add English labels before launch.
