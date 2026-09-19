# Terminal

Un thème [Spicetify](https://spicetify.app) pour Spotify desktop, esthétique hacker/terminal : fond sombre, police monospace, pochettes d'album converties en art ASCII en direct, pluie matrix, et une vraie palette de commandes façon shell.

![Accueil avec pochettes ASCII et visualiseur](screenshots/home.png)

## Fonctionnalités

- **Séquence de démarrage** façon boot terminal au lancement de Spotify
- **Art de couverture ASCII** en direct sur les pochettes (accueil, recherche, bibliothèque, en-têtes de playlist/album, mini-lecteur)
- **Palette de commandes** (`Ctrl+Shift+K`) — un vrai mini-shell : `play`/`pause`/`next`/`back`, `goto <home|search|library>`, `search <requête>`, `stats`, `history`, `neofetch`, `uptime`, `whoami`, `cowsay [texte]`, `clear`, et quelques easter eggs (`sudo`, `42`, `coffee`, `hack`, `matrix`, `egg`)
- **Visualiseur audio** dans la vue "En cours de lecture" — piloté par les vraies données d'analyse audio du morceau (enveloppe de volume réelle, timbre et hauteur des notes), pas une animation générique
- **Pulsation "now playing"** synchronisée à la couleur dominante de la pochette et au tempo réel du morceau
- **Pluie matrix** en économiseur d'écran, déclenchée par inactivité (réglable)
- **Overlay CRT** (lignes de balayage) optionnel
- **Marqueurs de tempo** sur la barre de lecture
- **Navigation clavier façon vim** (`j`/`k`/`Enter`/`/`)
- **Thème appliqué au mini-lecteur** (Picture-in-Picture)
- Tous les réglages sont accessibles et activables/désactivables individuellement depuis le panneau de paramètres du thème (bouton dans la barre du haut)

## Captures d'écran

| Accueil | Palette de commandes | Pluie matrix |
|---|---|---|
| ![Accueil](screenshots/home.png) | ![Palette](screenshots/command-palette.png) | ![Matrix](screenshots/matrix-rain.png) |

## Installation

### Via le Spicetify Marketplace (recommandé)

1. Installe le [Spicetify Marketplace](https://github.com/spicetify/marketplace) si ce n'est pas déjà fait.
2. Ouvre le Marketplace dans Spotify, onglet **Themes**, cherche **Terminal**, clique **Install**.

### Manuellement

```bash
git clone https://github.com/jesuisban22-code/spicetify-terminal.git "$(spicetify -c | xargs dirname)/Themes/Terminal"
spicetify config current_theme Terminal color_scheme terminal
spicetify apply
```

Sur Windows (PowerShell), remplace la première commande par un clone dans `%APPDATA%\spicetify\Themes\Terminal`.

## Prérequis

- [Spicetify](https://spicetify.app) installé et fonctionnel (`spicetify -v`)
- Le thème injecte du JavaScript (`inject_theme_js = 1`, activé automatiquement par `spicetify apply` avec ce thème)

## Licence

[MIT](LICENSE)
