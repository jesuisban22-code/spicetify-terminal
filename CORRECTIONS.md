# 🔧 Corrections Appliquées - Version 1.2.0+

Cette version corrige plusieurs problèmes d'usabilité sous Windows et améliore le support multilingue.

## ✅ Corrections Effectuées

### 1. **Raccourci clavier (CRITIQUE)**
- **Avant:** `palette de commandes (ctrl+maj+k)` (minuscules, abréviation française)
- **Après:** `palette de commandes (Ctrl+Shift+K)` (convention Windows, universelle)
- **Impact:** Les utilisateurs Windows voient maintenant le bon raccourci clavier

### 2. **Système de Localisation i18n (NOUVEAU)**
- Ajout d'un système de traduction automatique (EN/FR)
- Détecte la langue du navigateur (`navigator.language`)
- Tous les labels des paramètres sont maintenant traduits dynamiquement
- **Utilisateurs anglophones:** Interface entièrement en anglais
- **Utilisateurs francophones:** Interface entièrement en français
- Peut être étendu facilement pour d'autres langues

### 3. **Optimisation des Polices pour Windows**
- **Avant:** Cherchait DejaVu Sans Mono (n'existe pas sur Windows) avant Cascadia
- **Après:** OS-aware font stack
  - **Windows:** `JetBrains Mono → Cascadia Mono → Cascadia Code → Consolas`
  - **macOS:** `JetBrains Mono → Menlo`
  - **Linux:** `JetBrains Mono → Fira Code → Hack → DejaVu Sans Mono` (original)
- **Impact:** Rendu plus rapide sur Windows, moins de fallback

### 4. **Documentation d'Installation PowerShell Améliorée**
- Ajout de **vérifications d'erreur** après chaque commande
- Messages d'erreur clairs si Spicetify ou Git ne sont pas disponibles
- Instructions pour installer Git si absent
- Validation que l'installation a réussi

### 5. **Clarification du Paramètre Matrix Rain**
- **Avant:** `économiseur d'écran pluie matrix (inactivité)` (délai non spécifié)
- **Après:** `économiseur d'écran pluie matrix (inactivité, 2 min par défaut)`
- **Impact:** Les utilisateurs savent maintenant que le délai par défaut est 2 minutes

### 6. **Déduplication du Code OS Detection**
- Remplacement de la détection d'OS dupliquée par une fonction centralisée `getTERMFontStack()`
- Utilise la détection existante et robuste `detectOs()` du code
- TERM_FONT_STACK est maintenant mis à jour dynamiquement quand `currentOs` est connu

## 📝 Fichiers Modifiés

- ✏️ **theme.js** (lignes 65-130, 335, 1234)
  - Ajout système i18n (TRANSLATIONS, fonction t())
  - Ajout fonction getTERMFontStack()
  - Mise à jour FEATURE_REGISTRY avec traductions
  - Mise à jour applyOsClass() pour actualiser TERM_FONT_STACK

- ✏️ **README.md** (lignes 91-110)
  - Amélioration instructions PowerShell
  - Ajout vérifications d'erreur
  - Clarification du chemin de destination
  - Note sur Git installation

## 🌍 Support Linguistique

Le thème supporte maintenant automatiquement :
- **Anglais** (EN) - défaut pour utilisateurs avec `navigator.language` non-FR
- **Français** (FR) - pour utilisateurs avec langue navigateur commençant par "fr"

Extensible facilement : ajouter plus de langues dans l'objet `TRANSLATIONS` du theme.js.

## 🪟 Problèmes Windows Adressés

- ✅ Raccourci clavier confus (ctrl+maj+k → Ctrl+Shift+K)
- ✅ Polices non-optimales (DejaVu avant Cascadia)
- ✅ Installation PowerShell sans error-handling
- ✅ Interface uniquement en français pour utilisateurs anglophones
- ✅ Délai Matrix undocumented

## 🔄 Compatibilité Rétroactive

Toutes les corrections sont **100% rétro-compatibles** :
- Les paramètres utilisateurs existants sont préservés
- Pas de breaking changes
- Fonctionnement identique sur Linux et macOS

## 📊 Résumé des Changements

| Aspect | Avant | Après |
|--------|-------|-------|
| Raccourci affiché | `ctrl+maj+k` | `Ctrl+Shift+K` |
| Langue interface | Français fixe | Détection automatique |
| Polices Windows | DejaVu d'abord | Cascadia d'abord |
| Installation PowerShell | Sans erreurs | Avec vérifications |
| Délai Matrix | Non spécifié | `2 min par défaut` |

## 🚀 Migration depuis 1.2.0

Pour obtenir ces corrections :

1. **Option 1:** Mise à jour simple
   ```bash
   cd ~/.config/spicetify/Themes/Terminal  # Linux/macOS
   # ou
   cd %APPDATA%\spicetify\Themes\Terminal  # Windows
   git pull origin main
   spicetify apply
   ```

2. **Option 2:** Réinstallation
   ```bash
   # Suivre les instructions d'installation dans le README
   # Vos paramètres utilisateur seront conservés
   ```

---

**Date:** 2026-10-16
**Version:** 1.2.0 Corrected
**Compatibilité:** Windows | Linux | macOS
