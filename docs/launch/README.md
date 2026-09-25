# Launch kit — Terminal (Spicetify theme)

Ready-to-paste texts, one file per channel. **Nothing here has been posted.** You post everything yourself, from your own account, following each community's rules.

| File | Channel | Verdict |
|---|---|---|
| [reddit-spicetify.md](reddit-spicetify.md) | r/spicetify | Recommended, primary channel |
| [reddit-unixporn.md](reddit-unixporn.md) | r/unixporn | Allowed as an `[OC]` post, with conditions |
| [discord.md](discord.md) | Official Spicetify Discord (+ r/unixporn Discord) | Recommended (EN; neither server is French-speaking) |
| [awesome-list-prs.md](awesome-list-prs.md) | avtzis/awesome-linux-ricing, Gerg-L/spicetify-nix | **Wait**: requirements not met yet |
| [social.md](social.md) | X/Twitter, Mastodon, Bluesky (EN + FR) | Recommended |
| [faq-replies.md](faq-replies.md) | Replies to comments (EN + FR) | Use everywhere |

## Venues ruled out (and why)

- **spicetify/spicetify-themes** (official community repo): *"This repository no longer accepts **new theme submissions**"* — new themes are to be published through the Marketplace. Source: <https://github.com/spicetify/spicetify-themes/blob/master/CONTRIBUTING.md>
- **r/Spotify**: official-product community; posts about a modified client are very likely removed. Live rules could not be read from the research environment (reddit.com was blocked) — check <https://www.reddit.com/r/spotify/about/rules> yourself, but the recommendation is **do not post there**.
- **r/linux**: desktop screenshots / ricing belong on r/unixporn, and this theme targets a proprietary app. Not appropriate. Rules: <https://www.reddit.com/r/linux/about/rules> (not verified live).
- **"awesome-spicetify"**: **no such list exists** on GitHub (repository search for `awesome spicetify` returned 0 results on 2026-09-25). Do not invent one.
- **LarissaGuder/spotify-awesome-list**: a list of Spotify *web apps* (discovery, playlists); no section for client themes. Off-topic. <https://github.com/LarissaGuder/spotify-awesome-list>
- **fosslife/awesome-ricing**: no Spotify/app-theme section. Off-topic for now. <https://github.com/fosslife/awesome-ricing>
- **AlternativeTo**: a directory of software *alternatives*; a theme is not a replacement for anything. Not appropriate.
- **Hacker News (Show HN)**: could not be verified (domain blocked during research), and the fit is weak. Skip, or read <https://news.ycombinator.com/showhn.html> first.

## Pre-launch checklist

Do not post anything until **every** box is ticked:

- [ ] Feature PR **merged into `main`** (the Marketplace reads the default branch, and `manifest.json` loads `theme.js` from jsDelivr `@main`).
- [ ] GitHub topic **`spicetify-themes`** present on the repo (already set as of 2026-09-25 — re-check). Required by <https://github.com/spicetify/marketplace/wiki/Publishing-to-Marketplace>.
- [ ] `manifest.json` valid: `name`, `description`, `preview`, `usercss`, `schemes`, `readme` are required (same source).
- [ ] Release **v1.1.0** published on GitHub (tag + notes + GIFs attached).
- [ ] Theme **visible in the Marketplace**: Spotify → Marketplace → Themes → search "Terminal" → Install works on a clean profile.
- [ ] jsDelivr cache purged after the merge (`https://purge.jsdelivr.net/gh/jesuisban22-code/spicetify-terminal@main/theme.js`) so the Marketplace does not serve a stale `theme.js`.
- [ ] Media present in the repo: `screenshots/home.png`, `command-palette.png`, `matrix-rain.png`, `boot.gif`, `matrix.gif`.
- [ ] Manual install tested **on Linux and on Windows** (the README covers both). macOS is untested — say so if asked.
- [ ] README shows the GIFs and has at least a short English section — most r/spicetify and r/unixporn readers are English speakers.
- [ ] You are available to **answer comments for 2–3 hours** after each post. Replies are what make or break a launch.

## Recommended schedule

Global rules:

- **At most one channel per day.** Never the same text twice — each post is adapted to its audience.
- **Never** ask for upvotes/stars, never use a second account, no mass DMs. Reddit treats that as manipulation/spam: <https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam> — it also asks you to *"be thoughtful about the frequency"* of posts linking to your own project.
- Do not delete and repost a post that didn't take off.

| Day | Channel | Time (UTC) | Why |
|---|---|---|---|
| D0 (Tue or Wed) | r/spicetify | 14:00–16:00 | Most targeted audience (everyone there already runs Spicetify). Mid-week, overlap of US morning + European evening (common heuristic, not official data). |
| D0 +1 h | Spicetify Discord (theme-sharing channel, if one exists) | same | Same audience, live. Link your Reddit post only if the channel allows it. |
| D1 | X / Mastodon / Bluesky | 15:00–17:00 | Reuses the GIFs; doesn't compete with Reddit. |
| D3–D5 (Sat or Sun) | r/unixporn `[OC]` | 14:00–17:00 | Broader ricing audience that browses more on weekends (heuristic). ≥ 72 h after r/spicetify so it doesn't read as a cross-post campaign, and so you can fix early feedback first. |
| D5+ | r/unixporn Discord (showcase channel, if one exists) | – | Optional, only if its rules allow. |
| ≥ 2027-01-19 | Awesome-list PRs | – | avtzis/awesome-linux-ricing requires projects ≥ 4 months old (repo created 2026-09-19). See [awesome-list-prs.md](awesome-list-prs.md). |

After launch: triage issues fast and ship a v1.1.x with the requested fixes. A follow-up post (e.g. v1.2) is only worth it for real new features, and not before several weeks.

## Media map

| File | Use for |
|---|---|
| `screenshots/boot.gif` | Social post #1, Discord |
| `screenshots/matrix.gif` | Social post #2, r/unixporn (convert to mp4 if heavy) |
| `screenshots/home.png` | r/spicetify (lead image), r/unixporn |
| `screenshots/command-palette.png` | r/spicetify gallery, Discord |
| `screenshots/matrix-rain.png` | r/spicetify gallery |

On Reddit, upload images **natively** (gallery / i.redd.it) and put the repo link in the first comment. r/unixporn only accepts approved image hosts for screenshots (see its file).
