# Canned replies (EN + FR)

Keep them honest. If you don't know, say so and invite an issue. Adapt the tone to the comment; don't paste the same block ten times in one thread.

Issues: https://github.com/jesuisban22-code/spicetify-terminal/issues

---

## How do I install it? / Comment on l'installe ?

**EN**
> Easiest: open the Spicetify **Marketplace** → Themes → search "Terminal" → Install.
> Manual (Linux/macOS shell):
> ```
> git clone https://github.com/jesuisban22-code/spicetify-terminal.git "$(dirname "$(spicetify -c)")/Themes/Terminal"
> spicetify config current_theme Terminal color_scheme terminal inject_theme_js 1
> spicetify apply
> ```
> On Windows (PowerShell) clone into `$env:APPDATA\spicetify\Themes\Terminal` instead, then run the same two `spicetify` commands.

**FR**
> Le plus simple : **Marketplace** Spicetify → Themes → cherche « Terminal » → Install.
> À la main : clone le dépôt dans le dossier `Themes/Terminal` de Spicetify (sous Windows : `$env:APPDATA\spicetify\Themes\Terminal`), puis
> `spicetify config current_theme Terminal color_scheme terminal inject_theme_js 1` et `spicetify apply`.

## It only changed the colors, none of the effects work / Seules les couleurs changent

**EN**
> The effects live in `theme.js`, so Spicetify needs `inject_theme_js = 1`. Run `spicetify config inject_theme_js 1` then `spicetify apply`. If Spotify just updated, run `spicetify backup apply`. If it still fails, please open an issue with your Spotify + Spicetify versions (`spicetify -v`) and any DevTools console errors.

**FR**
> Les effets sont dans `theme.js` : il faut `inject_theme_js = 1`. Lance `spicetify config inject_theme_js 1` puis `spicetify apply`. Si Spotify vient de se mettre à jour : `spicetify backup apply`. Sinon, ouvre une issue avec tes versions (`spicetify -v`) et les erreurs de la console.

## Does it work on Windows? macOS? / Ça marche sous Windows ? macOS ?

**EN**
> Yes on Windows. I've tested it on Linux and Windows. macOS should work, since it's the same Spotify/Spicetify stack, but I haven't tested it myself. If you try it on a Mac, I'd love to hear how it goes.

**FR**
> Oui sous Windows, testé sous Linux et Windows. macOS devrait fonctionner (même base Spotify/Spicetify), mais je ne l'ai pas testé moi-même. Si tu essaies sur Mac, dis-moi ce que ça donne !

## Is it heavy? Performance? / C'est lourd ?

**EN**
> I tried to keep it light:
> - Covers are converted **once per image** (cached per URL), from a small 240×240 downsample, not continuously.
> - The visualizer and the matrix rain use `requestAnimationFrame` and **stop when the window is hidden**. Matrix rain only starts when playback is **paused** and you've been idle.
> - Every effect (visualizer, pulse, CRT scanlines, transitions, matrix rain…) can be switched off individually in the settings panel (button in the top bar).
> - With the OS "reduce motion" setting on, the animations are disabled.
> If you still see high CPU/GPU usage, please open an issue with your specs and which effects are on.

**FR**
> J'ai essayé de rester léger : les pochettes sont converties **une seule fois** par image (cache), le visualiseur et la pluie matrix s'arrêtent quand la fenêtre est cachée, la pluie ne démarre que **en pause** + inactivité, et chaque effet se désactive dans le panneau de réglages (bouton dans la barre du haut). « Réduire les animations » côté système coupe les animations. Si ça rame chez toi, ouvre une issue avec ta config.

## What font is that? / Quelle police ?

**EN**
> It uses whatever monospace font you have, in this order: **JetBrains Mono** → Fira Code → Hack → DejaVu Sans Mono → system monospace. The theme doesn't bundle or download fonts, so install JetBrains Mono (free, OFL) to get the screenshot look.

**FR**
> Elle prend la première police monospace installée parmi : **JetBrains Mono** → Fira Code → Hack → DejaVu Sans Mono → monospace système. Le thème n'embarque ni ne télécharge de police : installe JetBrains Mono (gratuite) pour avoir le rendu des captures.

## How does the ASCII cover art work? / Comment marche l'art ASCII ?

**EN**
> To be precise, it's block-character "pixel art" rather than classic `@#%.` ASCII. Each cover is drawn onto a canvas and box-averaged down to a grid where every character cell has 2×2 sub-pixels. For each cell, the two most different sub-pixels (by actual color distance, not just brightness) become the foreground/background colors, and the cell is drawn as the matching quadrant block (▘▝▖▗▌▐▀▄▚▞…). The result is drawn as flat rectangles on a canvas and scaled with `image-rendering: pixelated`, so it stays crisp at any size. It's done once per image and cached.

**FR**
> Pour être précis, c'est du « pixel art » en caractères blocs plutôt que de l'ASCII classique `@#%.`. La pochette est dessinée sur un canvas, moyennée vers une grille où chaque case a 2×2 sous-pixels ; les deux sous-pixels les plus différents (distance de couleur réelle, pas seulement la luminosité) donnent les couleurs avant/arrière-plan, et la case devient le bloc quadrant correspondant (▘▝▖▗▌▐▀▄…). Rendu en rectangles sur canvas, agrandi en `pixelated`, donc net à toutes les tailles. Une seule fois par image, avec cache.

## Is the visualizer real or just an animation? / Le visualiseur est-il vrai ?

**EN**
> It's driven by real data, but not by a live FFT of the audio stream. It reads Spotify's audio-analysis data for the track (per-segment loudness and 12-bin pitch data) and indexes it by the current playback position, so it follows breaks, drops and quiet parts. Tracks with no analysis (podcasts, local files) fall back to a tempo-based pulse.

**FR**
> Piloté par de vraies données, mais pas une FFT en direct du son : il lit l'analyse audio Spotify du morceau (volume et hauteur des notes par segment) et la suit selon la position de lecture, donc il suit les breaks et les passages calmes. Sans analyse (podcasts, fichiers locaux), il retombe sur une pulsation au tempo.

## Matrix rain never shows up / La pluie matrix n'apparaît jamais

**EN**
> It's an idle screensaver: it only starts when playback is **paused** and there's been no mouse/keyboard input for the configured delay (settings panel). It's also disabled if your OS has "reduce motion" on, or if you turned it off in settings. Typing `matrix` in the command palette (`Ctrl+Shift+K`) re-enables it and tells you the current delay.

**FR**
> C'est un économiseur d'écran : il faut que la lecture soit **en pause** et aucune activité souris/clavier pendant le délai réglé (panneau de réglages). Désactivé si « réduire les animations » est actif ou si tu l'as coupé dans les réglages. Taper `matrix` dans la palette (`Ctrl+Maj+K`) le réactive et affiche le délai actuel.

## Settings are in French? / Les réglages sont en français ?

**EN**
> Yes, the settings panel labels are currently French (I'm French 🇫🇷). The command palette is in English. English labels are on the list, and PRs are welcome.

**FR**
> Oui, le panneau de réglages est en français pour l'instant ; la palette de commandes est en anglais.

## Can I get banned for this? / Risque de ban ?

**EN**
> Honest answer: Spicetify modifies the official client, which Spotify's terms don't allow, so I can't promise anything. The theme only changes the UI locally and doesn't touch playback, ads or Premium features. For the general risk, see Spicetify's own docs/FAQ.

**FR**
> Honnêtement : Spicetify modifie le client officiel, ce que les conditions de Spotify n'autorisent pas, donc je ne peux rien garantir. Le thème ne change que l'interface en local, sans toucher à la lecture, aux pubs ni au Premium. Pour le risque général, voir la doc/FAQ de Spicetify.

## Did you use AI to make this? / C'est fait avec une IA ?

Only if someone asks. Answer truthfully, and adapt the wording to how you actually worked.

**EN**
> Yes, I used AI assistance heavily while building it. I've reviewed and tested it on my machines, and I'm maintaining it. Bug reports are welcome.

**FR**
> Oui, je me suis beaucoup aidé d'une IA pour le développer ; je l'ai relu, testé sur mes machines, et je le maintiens. Les rapports de bugs sont bienvenus.

## How do I uninstall? / Désinstaller ?

**EN**
> Marketplace → Installed → Terminal → Remove. Or run `spicetify config current_theme ""` then `spicetify apply`. To remove Spicetify entirely: `spicetify restore`.

**FR**
> Marketplace → Installed → Terminal → Remove, ou `spicetify config current_theme ""` puis `spicetify apply`. Pour retirer complètement Spicetify : `spicetify restore`.
