// Terminal theme — theme.js
// Auto-injected by spicetify (inject_theme_js = 1) as
// <script defer src="extensions/theme.js"></script>, so window.Spicetify
// exists as a global but individual namespaces (CosmosAsync, Platform.History,
// colorExtractor...) are not guaranteed ready the instant this file runs —
// every Spicetify.* access below is guarded accordingly.
//
// Design intent (see the approved plan): one bold non-user-triggered moment
// (the boot sequence), one continuous ambient signal (the now-playing pulse,
// driven by the track's real color + tempo), everything else triggered by an
// actual user action (navigation, song change, the command palette). Matrix
// rain is the one deliberate exception — a spectacle effect, opt-in and
// idle-only so it never fights the rest of the theme for attention.

(function TerminalTheme() {
	"use strict";

	var REDUCED_MOTION =
		window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	var SESSION_START = Date.now();

	// Same stack as --term-font in user.css — keep the two in sync. The
	// injected mini-player CSS can't read that variable (it lives in a
	// separate document), hence the copy. Order matters: the Linux fonts
	// (JetBrains Mono → DejaVu Sans Mono) come first so a Linux machine
	// resolves exactly the same face it always has, even if it happens to
	// have Cascadia installed; Cascadia/Consolas only get reached on
	// Windows (Menlo on macOS), where none of the Linux faces exist.
	var TERM_FONT_STACK =
		"'JetBrains Mono', 'Fira Code', 'Hack', 'DejaVu Sans Mono', " +
		"'Cascadia Mono', 'Cascadia Code', 'Consolas', 'Menlo', monospace";

	// Real logged-in display name for the palette's `whoami`/`neofetch`/
	// `sudo` easter egg — reads the actual Spicetify session instead of a
	// hardcoded name, so it shows *this* user's own account on every
	// install rather than the original author's. Falls back to "user" if
	// the platform object isn't ready yet (very early boot) or the field is
	// missing for some account type.
	function currentDisplayName() {
		try {
			var iu = Spicetify.Platform && Spicetify.Platform.initialUser;
			return (iu && iu.displayName) || "user";
		} catch (e) {
			return "user";
		}
	}

	// ---------------------------------------------------------------------
	// Settings — plain window.localStorage (not Spicetify.LocalStorage) so
	// reading them never depends on Spicetify being ready yet, and the boot
	// sequence (which must not flash unstyled/undecided) can read them
	// synchronously on the very first line of this file.
	// ---------------------------------------------------------------------
	var SETTINGS_KEY = "spicetify-terminal-theme:settings";

	// ---------------------------------------------------------------------
	// Feature registry — the single source of truth for every toggleable
	// feature: its default, its settings-panel row, and the setup call it
	// gets at init. Previously these three things lived in three separate
	// places (DEFAULT_SETTINGS, the waitFor init list, and buildSettingsPanel's
	// row list) that had to be kept in sync by hand on every new feature —
	// this is that sync, done once. `setup` is a hoisted function reference
	// (safe to use here even though those functions are defined later in the
	// file — function declarations are hoisted before this line runs), called
	// unconditionally at init; each feature's own listeners are the ones that
	// check `settings[key]` before actually doing anything, exactly as
	// before. `onToggle` runs any extra live side effect a checkbox needs
	// beyond just flipping the setting (e.g. stopping Matrix rain the moment
	// it's unchecked). `hasDelay` marks the one row (Matrix rain) that also
	// shows a numeric delay input.
	//
	// Always-on features with no user-facing toggle (ASCII cover art, the
	// glitch flash, vim nav, the download-bar tooltip, play history
	// tracking) are NOT here — they're called directly in the init list
	// below, same as before.
	// ---------------------------------------------------------------------
	var FEATURE_REGISTRY = [
		{ key: "boot", label: "séquence de démarrage au lancement", default: true },
		{ key: "pulse", label: "pulsation lecture en cours (couleur + tempo)", default: true, setup: function () { setupNowPlayingPulse(); } },
		{ key: "transitions", label: "transitions de page", default: true, setup: function () { setupPageTransitions(); } },
		{ key: "typewriter", label: "titres façon machine à écrire", default: true, setup: function () { setupTypewriter(); } },
		{ key: "palette", label: "palette de commandes (ctrl+maj+k)", default: true, setup: function () { setupCommandPalette(); } },
		{ key: "tempoMarkers", label: "marqueurs de tempo sur la barre de lecture", default: true, setup: function () { setupTempoMarkersWatchdog(); }, onToggle: function () { renderTempoMarkers(); } },
		{ key: "visualizer", label: "visualiseur de fréquence (synchronisé à la musique)", default: true, setup: function () { setupVisualizer(); } },
		{ key: "streamBadge", label: "flash \"connexion établie\"", default: true, setup: function () { setupStreamBadge(); } },
		{ key: "cursor", label: "curseur bloc terminal", default: true, setup: function () { setupCursor(); }, onToggle: function () { applyCursorSetting(); } },
		{ key: "crtScanlines", label: "overlay lignes de balayage CRT", default: true, setup: function () { setupCrt(); }, onToggle: function () { applyCrtSetting(); } },
		{
			key: "miniPlayerTheme",
			label: "thème appliqué au lecteur réduit",
			default: true,
			setup: function () { setupMiniPlayerTheme(); },
			onToggle: function (checked) { applyMiniPlayerThemeSetting(checked); }
		},
		{
			key: "matrixRain",
			label: "économiseur d'écran pluie matrix (inactivité)",
			default: true,
			setup: function () { setupMatrixRain(); },
			onToggle: function (checked) { if (!checked) stopMatrixRain(); },
			hasDelay: true,
			hasSpeed: true
		}
	];

	function buildDefaultSettings() {
		var defaults = { matrixRainDelayMin: 2, matrixRainSpeed: 1 };
		FEATURE_REGISTRY.forEach(function (f) {
			defaults[f.key] = f.default;
		});
		return defaults;
	}

	var DEFAULT_SETTINGS = buildDefaultSettings();

	function loadSettings() {
		try {
			var raw = window.localStorage.getItem(SETTINGS_KEY);
			if (!raw) return assign({}, DEFAULT_SETTINGS);
			var parsed = JSON.parse(raw);
			return assign(assign({}, DEFAULT_SETTINGS), parsed);
		} catch (e) {
			return assign({}, DEFAULT_SETTINGS);
		}
	}

	function saveSettings() {
		try {
			window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
		} catch (e) {
			/* storage unavailable — settings just won't persist, non-fatal */
		}
	}

	function assign(target, src) {
		for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
		return target;
	}

	var settings = loadSettings();

	// ---------------------------------------------------------------------
	// Readiness poll — the pattern used by every extension already installed
	// on this machine (bookmark.js, fullAppDisplay.js, loopyLoop.js): retry
	// on a short timer until the specific Spicetify namespace needed exists.
	// ---------------------------------------------------------------------
	function waitFor(checkFn, cb, attemptsLeft) {
		if (attemptsLeft === undefined) attemptsLeft = 100; // ~20s at 200ms
		try {
			if (checkFn()) return cb();
		} catch (e) {
			/* Spicetify namespace half-initialized — keep polling */
		}
		if (attemptsLeft <= 0) return;
		setTimeout(function () {
			waitFor(checkFn, cb, attemptsLeft - 1);
		}, 200);
	}

	// ---------------------------------------------------------------------
	// Platform detection — tags <html> with exactly one of
	// terminal-os-windows / terminal-os-linux / terminal-os-mac so user.css
	// can scope OS-specific fixes (Windows' in-page window buttons and
	// title-bar drag region) without touching how any other OS renders.
	// The theme was built on Linux, where native window decorations sit
	// outside the page entirely; every Windows-only rule in user.css is
	// gated on html.terminal-os-windows, so Linux (and an OS we fail to
	// identify, which gets no class at all) stays pixel-identical.
	//
	// Sources, most to least authoritative:
	//   1. Spicetify.Platform.operatingSystem — what Spotify itself reports
	//      (also shown by the palette's `neofetch`), but Platform may not
	//      exist yet at the very first line of this file.
	//   2. Spotify's own body class (spotify__os--is-windows etc.), set by
	//      the desktop client before its React tree mounts.
	//   3. navigator.userAgent / navigator.platform — always available, so
	//      the boot overlay (which runs synchronously below) already gets
	//      the right class on its first paint.
	// We apply the best answer immediately, then re-evaluate once Platform
	// is ready in case an earlier fallback guessed differently.
	// ---------------------------------------------------------------------
	var OS_CLASSES = { windows: "terminal-os-windows", linux: "terminal-os-linux", mac: "terminal-os-mac" };
	var currentOs = "unknown";

	// Maps any free-form OS string onto windows/linux/mac. Mac is tested
	// before Windows on purpose: "Darwin" contains the substring "win".
	function normalizeOs(s) {
		s = String(s || "").toLowerCase();
		if (!s) return "unknown";
		if (/mac|os ?x|darwin/.test(s)) return "mac";
		if (/win/.test(s)) return "windows";
		if (/linux|x11|cros/.test(s)) return "linux";
		return "unknown";
	}

	function detectOs() {
		var os = "unknown";
		try {
			os = normalizeOs(Spicetify.Platform && Spicetify.Platform.operatingSystem);
		} catch (e) {
			/* Spicetify global not there yet — fall through */
		}
		if (os !== "unknown") return os;
		try {
			var m = document.body && /(?:^|\s)spotify__os--is-([a-z]+)/.exec(document.body.className);
			if (m) os = normalizeOs(m[1]);
		} catch (e) {
			/* no body yet — fall through */
		}
		if (os !== "unknown") return os;
		return normalizeOs(navigator.platform) !== "unknown"
			? normalizeOs(navigator.platform)
			: normalizeOs(navigator.userAgent);
	}

	function applyOsClass() {
		currentOs = detectOs();
		var root = document.documentElement;
		for (var k in OS_CLASSES) {
			if (Object.prototype.hasOwnProperty.call(OS_CLASSES, k)) {
				root.classList.toggle(OS_CLASSES[k], k === currentOs);
			}
		}
	}

	// For JS-side checks elsewhere in this file. A function rather than a
	// snapshot var so it reflects the re-evaluation below.
	function IS_WINDOWS() {
		return currentOs === "windows";
	}

	applyOsClass();
	waitFor(
		function () { return window.Spicetify && Spicetify.Platform && Spicetify.Platform.operatingSystem; },
		applyOsClass
	);

	// =======================================================================
	// A. Boot sequence — the one bold, non-user-triggered moment. Pure DOM,
	//    zero Spicetify dependency, so it can run on the very first paint.
	// =======================================================================
	function runBootSequence() {
		if (!settings.boot) return;

		var LOGO = [
			" _____                   _             _ ",
			"|_   _|__ _ _ _ __  (_)_ _  __ _| |",
			"  | |/ -_) '_| '  \\| | ' \\/ _` | |",
			"  |_|\\___|_| |_|_|_|_|_||_\\__,_|_|"
		].join("\n");

		var LINES = [
			"spicetify-terminal v1.0",
			"mounting /library ......... OK",
			"establishing session ...... OK",
			"loading audio subsystem ... OK",
			"ready."
		];

		var overlay = document.createElement("div");
		overlay.id = "terminal-boot-overlay";

		var logo = document.createElement("pre");
		logo.className = "terminal-boot-logo";
		logo.textContent = LOGO;
		overlay.appendChild(logo);

		var log = document.createElement("div");
		log.className = "terminal-boot-log";
		overlay.appendChild(log);

		var hint = document.createElement("div");
		hint.className = "terminal-boot-hint";
		hint.textContent = "click anywhere or press any key to skip";
		overlay.appendChild(hint);

		document.body.appendChild(overlay);

		var dismissed = false;
		var timers = [];

		function dismiss() {
			if (dismissed) return;
			dismissed = true;
			timers.forEach(clearTimeout);
			overlay.classList.add("terminal-boot-hide");
			setTimeout(function () {
				if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
			}, 300);
			document.removeEventListener("keydown", dismiss);
			overlay.removeEventListener("click", dismiss);
		}

		document.addEventListener("keydown", dismiss);
		overlay.addEventListener("click", dismiss);

		if (REDUCED_MOTION) {
			log.innerHTML = LINES.map(function (l) {
				return '<div class="ok">' + escapeHtml(l) + "</div>";
			}).join("");
			timers.push(setTimeout(dismiss, 400));
			return;
		}

		// Type out each line, then blink a cursor briefly, then fade out.
		// Hard-capped at ~2s total regardless of how far the typing got.
		var lineIndex = 0;
		var charIndex = 0;
		var currentLineEl = null;

		function typeNext() {
			if (dismissed) return;
			if (lineIndex >= LINES.length) {
				var cursor = document.createElement("span");
				cursor.className = "terminal-boot-cursor";
				cursor.textContent = "█";
				log.appendChild(cursor);
				timers.push(setTimeout(dismiss, 700));
				return;
			}
			var line = LINES[lineIndex];
			if (charIndex === 0) {
				currentLineEl = document.createElement("div");
				if (line.indexOf("OK") !== -1 || line === "ready.") {
					currentLineEl.className = "ok";
				}
				log.appendChild(currentLineEl);
			}
			charIndex++;
			currentLineEl.textContent = line.slice(0, charIndex);
			if (charIndex >= line.length) {
				lineIndex++;
				charIndex = 0;
				timers.push(setTimeout(typeNext, 90));
			} else {
				timers.push(setTimeout(typeNext, 10));
			}
		}
		typeNext();

		// Absolute safety net: never let this block the app for more than ~3.2s.
		timers.push(setTimeout(dismiss, 3200));
	}

	function escapeHtml(s) {
		return s.replace(/[&<>"']/g, function (c) {
			return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
		});
	}

	runBootSequence();

	// =======================================================================
	// Everything below needs Spicetify.Player at minimum.
	// =======================================================================
	waitFor(
		function () {
			return window.Spicetify && Spicetify.Player && Spicetify.Player.addEventListener;
		},
		function () {
			// Toggleable features — one call each, driven by the registry
			// above instead of a hand-maintained list.
			FEATURE_REGISTRY.forEach(function (f) {
				if (f.setup) f.setup();
			});
			// Always-on features (no settings-panel row, no default to track).
			setupSettingsPanel();
			setupDownloadBarFlavor();
			setupGlitchFlash();
			setupAsciiCoverArt();
			setupVimNav();
			setupPlayHistory();
		}
	);

	// =======================================================================
	// Progress bar flavor text — the bar itself is restyled in CSS to look
	// like a blocky terminal download bar; this adds a hover tooltip with a
	// matching "fetching stream..." readout. Deliberately just a `title`
	// attribute (zero extra DOM, zero layout risk) updated on a slow timer
	// rather than on every `onprogress` tick, to avoid fighting React's own
	// re-renders of this area.
	// =======================================================================
	function setupDownloadBarFlavor() {
		setInterval(function () {
			if (!Spicetify.Player.data || !Spicetify.Player.data.item) return;
			var bar = document.querySelector('[data-testid="progress-bar"]');
			if (!bar) return;
			var pct = Math.round(Spicetify.Player.getProgressPercent() * 100);
			var pos = Spicetify.Player.formatTime(Spicetify.Player.getProgress());
			var dur = Spicetify.Player.formatTime(Spicetify.Player.getDuration());
			bar.title = "fetching stream... " + pct + "% (" + pos + " / " + dur + ")";
		}, 3000);
	}

	// =======================================================================
	// B. Now-playing pulse — the one continuous ambient signal. Real color
	//    (Spicetify.colorExtractor) + real tempo (Cosmos audio-features,
	//    the same endpoint lyrics-plus already uses on this machine) drive
	//    a single CSS animation defined in user.css. The track's real
	//    energy/valence (same audio-features response, no extra request)
	//    then nudges that color's hue/saturation — a calm track leans cool,
	//    an energetic one leans warm/saturated. One system, not a second one.
	// =======================================================================
	var lastExtractedColor = null; // last raw hex from colorExtractor, pre-mood-tint
	var lastAudioFeatures = null;

	// Cover color + audio-features by track URI, so replaying a track this
	// session re-applies instantly from memory instead of re-fetching both
	// over the network. Cleared only by reloading the theme (session-scoped,
	// matches playHistory's lifetime).
	var trackDataCache = {};

	function setupNowPlayingPulse() {
		function apply(uri) {
			if (!settings.pulse || !uri) return;
			var trackId = uri.split(":")[2];
			lastExtractedColor = null;
			lastAudioFeatures = null;

			var cached = trackDataCache[uri];
			if (cached) {
				if (cached.color) {
					lastExtractedColor = cached.color;
					document.documentElement.style.setProperty("--track-accent", cached.color);
				}
				if (cached.features) {
					lastAudioFeatures = cached.features;
					var cachedTempo = cached.features.tempo;
					if (cachedTempo && cachedTempo > 20 && cachedTempo < 300) {
						document.documentElement.style.setProperty("--track-bpm-ms", Math.round((60000 / cachedTempo) * 2) + "ms");
					}
				}
				if (lastExtractedColor && lastAudioFeatures) applyMoodTint(lastAudioFeatures);
				renderTempoMarkers();
				return; // already fetched this track this session — no network needed
			}
			trackDataCache[uri] = {};

			if (window.Spicetify.colorExtractor) {
				Spicetify.colorExtractor(uri)
					.then(function (colors) {
						var accent = (colors && (colors.VIBRANT || colors.PROMINENT || colors.LIGHT_VIBRANT)) || null;
						if (accent) {
							lastExtractedColor = accent;
							trackDataCache[uri].color = accent;
							document.documentElement.style.setProperty("--track-accent", accent);
							if (lastAudioFeatures) applyMoodTint(lastAudioFeatures);
						}
					})
					.catch(function () {
						/* extraction can fail for local files/podcasts — keep the
						   terminal-green fallback already set in CSS */
					});
			}

			if (window.Spicetify.CosmosAsync && trackId) {
				Spicetify.CosmosAsync.get(
					"https://spclient.wg.spotify.com/audio-attributes/v1/audio-features/" +
						trackId +
						"?format=json"
				)
					.then(function (data) {
						var tempo = data && data.tempo;
						if (tempo && tempo > 20 && tempo < 300) {
							// 2 beats per breathing cycle — max-intensity pass: faster,
							// more visibly "alive" than the original 4-beat cycle.
							var ms = Math.round((60000 / tempo) * 2);
							document.documentElement.style.setProperty("--track-bpm-ms", ms + "ms");
						}
						lastAudioFeatures = data;
						trackDataCache[uri].features = data;
						if (lastExtractedColor) applyMoodTint(data);
						renderTempoMarkers();
					})
					.catch(function () {
						/* no audio-features for this track (local file, podcast...) —
						   keep the fixed 2.4s fallback already set in CSS */
					});
			}
		}

		Spicetify.Player.addEventListener("songchange", function (event) {
			var item = (event && event.data && event.data.item) || (Spicetify.Player.data && Spicetify.Player.data.item);
			if (item) apply(item.uri);
		});

		if (Spicetify.Player.data && Spicetify.Player.data.item) {
			apply(Spicetify.Player.data.item.uri);
		}
	}

	function applyMoodTint(features) {
		if (!lastExtractedColor || typeof features.valence !== "number" || typeof features.energy !== "number") return;
		var hsl = hexToHsl(lastExtractedColor);
		if (!hsl) return;
		var hueShift = (features.valence - 0.5) * 30; // sad -15deg .. happy +15deg
		var satBoost = features.energy * 15;
		var h = (hsl.h + hueShift + 360) % 360;
		var s = Math.min(100, hsl.s + satBoost);
		document.documentElement.style.setProperty(
			"--track-accent",
			"hsl(" + h.toFixed(0) + ", " + s.toFixed(0) + "%, " + hsl.l.toFixed(0) + "%)"
		);
	}

	function hexToHsl(hex) {
		var m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
		if (!m) return null;
		var r = parseInt(m[1].substr(0, 2), 16) / 255;
		var g = parseInt(m[1].substr(2, 2), 16) / 255;
		var b = parseInt(m[1].substr(4, 2), 16) / 255;
		var max = Math.max(r, g, b),
			min = Math.min(r, g, b);
		var h,
			s,
			l = (max + min) / 2;
		if (max === min) {
			h = s = 0;
		} else {
			var d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
			else if (max === g) h = (b - r) / d + 2;
			else h = (r - g) / d + 4;
			h *= 60;
		}
		return { h: h, s: s * 100, l: l * 100 };
	}

	// Small deterministic PRNG (mulberry32) seeded from a track URI, shared
	// by the stream badge and the visualizer — same track always produces
	// the same "random" flavor numbers/bar heights rather than re-rolling.
	function hashStr(s) {
		var h = 0;
		for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
		return h;
	}

	function mulberry32(seed) {
		return function () {
			seed = (seed + 0x6d2b79f5) | 0;
			var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	// =======================================================================
	// Tempo markers — small ticks on the progress bar at real bar boundaries
	// (4 beats, from the track's real tempo), so the seek bar itself reads
	// as tied to the music rather than a generic loading bar. Rebuilt every
	// time real tempo data arrives (see the audio-features fetch above);
	// capped so a long track can't spam hundreds of ticks.
	// =======================================================================
	function clearTempoMarkers() {
		var old = document.querySelectorAll(".terminal-tempo-markers");
		for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
	}

	function renderTempoMarkers() {
		clearTempoMarkers();
		if (!settings.tempoMarkers) return;
		var tempo = lastAudioFeatures && lastAudioFeatures.tempo;
		if (!tempo) return;
		var bar = document.querySelector('[data-testid="progress-bar"]');
		var duration = Spicetify.Player.getDuration();
		if (!bar || !duration) return;

		var barMs = (60000 / tempo) * 4; // 4 beats per bar
		var wrap = document.createElement("div");
		wrap.className = "terminal-tempo-markers";
		var t = barMs;
		var count = 0;
		while (t < duration && count < 200) {
			var tick = document.createElement("div");
			tick.className = "terminal-tempo-tick";
			tick.style.left = ((t / duration) * 100).toFixed(3) + "%";
			wrap.appendChild(tick);
			t += barMs;
			count++;
		}
		bar.appendChild(wrap);
	}

	// The progress bar is a live-updating React component; if it ever
	// re-renders its children wholesale, the appended markers would vanish
	// silently. Cheap periodic self-heal rather than trying to hook every
	// possible re-render.
	function setupTempoMarkersWatchdog() {
		setInterval(function () {
			if (!settings.tempoMarkers || !lastAudioFeatures || !lastAudioFeatures.tempo) return;
			var bar = document.querySelector('[data-testid="progress-bar"]');
			if (bar && !bar.querySelector(".terminal-tempo-markers")) renderTempoMarkers();
		}, 4000);
	}

	// =======================================================================
	// Glitch flash — a brief RGB-split jitter on the cover art at the instant
	// a track changes. Self-cleaning (removes its own class), so there is no
	// persistent state to manage.
	// =======================================================================
	function setupGlitchFlash() {
		Spicetify.Player.addEventListener("songchange", function () {
			if (REDUCED_MOTION) return;
			var art = document.querySelector(".main-nowPlayingWidget-coverArt");
			if (!art) return;
			art.classList.remove("terminal-glitch");
			void art.offsetWidth;
			art.classList.add("terminal-glitch");
			setTimeout(function () {
				art.classList.remove("terminal-glitch");
			}, 420);
		});
	}

	// =======================================================================
	// ASCII/ANSI cover art — renders real cover art as true-color terminal
	// art using the "quadrant block" technique real terminal image viewers
	// use (chafa's symbol mode): each character represents a 2x2 block of
	// source pixels, split into a foreground/background pair by luminance,
	// rendered as whichever of the 16 Unicode block-element glyphs matches
	// that block's filled quadrants (█▘▝▖▗▌▐▀▄▚▞▛▜▙▟ + space). That's twice
	// the resolution in both directions of a plain half-block, and reads as
	// a real (if mosaic'd) image rather than a blurry sketch. Pixel values
	// are box-averaged manually from a high-quality intermediate downsample
	// rather than trusting the canvas's default "low" resize quality, and
	// get a small contrast boost so flat source images don't look washed
	// out at this scale.
	// Applied everywhere real cover art appears: the now-playing bar
	// (bottom-left), the sidebar/fullscreen Now Playing view, playlist/
	// album header banners (including Liked Songs), grid cards, track list
	// rows, and the shared EntityImage component (library rail, queue
	// panel, search results all use it). Falls back silently (real art
	// stays visible) if a given image can't be read back from canvas
	// (cross-origin restriction).
	// =======================================================================
	var ASCII_TARGETS = [
		{ selector: ".main-nowPlayingWidget-coverArtContainer", cols: 18 },
		{ selector: ".main-nowPlayingView-coverArtContainer", cols: 48 },
		{ selector: ".main-entityHeader-imageContainer", cols: 48 },
		{ selector: ".main-card-imageContainer", cols: 40 },
		{ selector: ".main-trackList-rowImage", cols: 16 },
		{ selector: ".x-entityImage-imageContainer", cols: 18 }
	];

	// Rendered directly on a <canvas> as filled rectangles (one per
	// quadrant), not as font glyphs — a first attempt used the Unicode
	// block-element characters (█▘▝▖▗▌▐▀▄▚▞▛▜▙▟) in a <pre>, scaled up with
	// CSS transform: scale() to fill the container. That scale() stretches
	// vector font glyphs, and browsers anti-alias/blur text under a
	// non-1:1 transform — soft edges on what should read as sharp pixel
	// art. Drawing flat-colored rects on a canvas and scaling *that* with
	// `image-rendering: pixelated` (CSS, set once) gives genuinely crisp,
	// hard-edged output regardless of scale factor, and sidesteps monospace
	// glyph-metric guessing entirely.
	function boostContrast(c) {
		return Math.max(0, Math.min(255, Math.round((c - 128) * 1.12 + 128)));
	}

	function colorDist2(a, b) {
		var dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
		return dr * dr + dg * dg + db * db;
	}

	function setupAsciiCoverArt() {
		function renderInto(container, cols) {
			var img = container.querySelector("img");
			var srcUrl = img && (img.currentSrc || img.src);
			if (!srcUrl) return;
			if (container._terminalAsciiSrc === srcUrl) return; // already rendered
			container._terminalAsciiSrc = srcUrl;

			var w = Math.max(16, container.clientWidth || 96);
			var h = Math.max(16, container.clientHeight || 96);
			var rows = Math.max(4, Math.round(cols * (h / w)));

			var probe = new Image();
			probe.crossOrigin = "anonymous";
			probe.onload = function () {
				try {
					// Stage 1: let the canvas do a high-quality resize down to a
					// fixed, moderate intermediate buffer — cheap and avoids
					// ever running a manual average over a huge native image.
					var INTER = 240;
					var sampleCanvas = document.createElement("canvas");
					sampleCanvas.width = INTER;
					sampleCanvas.height = INTER;
					var sctx = sampleCanvas.getContext("2d");
					sctx.imageSmoothingEnabled = true;
					sctx.imageSmoothingQuality = "high";
					sctx.drawImage(probe, 0, 0, INTER, INTER);
					var buf = sctx.getImageData(0, 0, INTER, INTER).data;

					// Stage 2: manually box-average that buffer down to the
					// sub-pixel grid we actually need (2 samples per cell in
					// each direction, for the quadrant split) — a true average
					// of every source pixel in each region, not another lossy
					// canvas resize.
					var gridW = cols * 2;
					var gridH = rows * 2;

					function sampleAt(sx, sy) {
						var x0 = Math.floor((sx * INTER) / gridW);
						var x1 = Math.max(x0 + 1, Math.floor(((sx + 1) * INTER) / gridW));
						var y0 = Math.floor((sy * INTER) / gridH);
						var y1 = Math.max(y0 + 1, Math.floor(((sy + 1) * INTER) / gridH));
						var r = 0, g = 0, b = 0, n = 0;
						for (var yy = y0; yy < y1 && yy < INTER; yy++) {
							for (var xx = x0; xx < x1 && xx < INTER; xx++) {
								var i = (yy * INTER + xx) * 4;
								r += buf[i];
								g += buf[i + 1];
								b += buf[i + 2];
								n++;
							}
						}
						if (!n) return [0, 0, 0];
						return [r / n, g / n, b / n];
					}

					// Stage 3: for each cell, split its 4 sub-samples into a
					// foreground/background pair by actual color distance (not
					// just luminance) — the two most different samples become
					// the seeds, the other two join whichever seed they're
					// closer to. Catches hue-only edges (e.g. equal-brightness
					// red vs green) that a luminance threshold would flatten.
					var cells = new Array(cols * rows);
					for (var cy = 0; cy < rows; cy++) {
						for (var cx = 0; cx < cols; cx++) {
							var px = [
								sampleAt(cx * 2, cy * 2),
								sampleAt(cx * 2 + 1, cy * 2),
								sampleAt(cx * 2, cy * 2 + 1),
								sampleAt(cx * 2 + 1, cy * 2 + 1)
							];
							var maxD = -1, seedA = 0, seedB = 1;
							for (var i = 0; i < 4; i++) {
								for (var j = i + 1; j < 4; j++) {
									var d = colorDist2(px[i], px[j]);
									if (d > maxD) { maxD = d; seedA = i; seedB = j; }
								}
							}
							var mask = 0;
							var fg = [0, 0, 0], fgN = 0;
							var bg = [0, 0, 0], bgN = 0;
							for (var k = 0; k < 4; k++) {
								var closerToB = colorDist2(px[k], px[seedB]) < colorDist2(px[k], px[seedA]);
								if (closerToB) {
									mask |= 1 << k;
									fg[0] += px[k][0]; fg[1] += px[k][1]; fg[2] += px[k][2]; fgN++;
								} else {
									bg[0] += px[k][0]; bg[1] += px[k][1]; bg[2] += px[k][2]; bgN++;
								}
							}
							if (!fgN) { fg = bg; fgN = bgN; }
							if (!bgN) { bg = fg; bgN = fgN; }
							cells[cy * cols + cx] = {
								mask: mask,
								fg: [boostContrast(fg[0] / fgN), boostContrast(fg[1] / fgN), boostContrast(fg[2] / fgN)],
								bg: [boostContrast(bg[0] / bgN), boostContrast(bg[1] / bgN), boostContrast(bg[2] / bgN)]
							};
						}
					}
					drawAsciiCanvas(container, cells, cols, rows);
				} catch (e) {
					/* tainted canvas (CORS) — real cover art just stays visible */
				}
			};
			probe.onerror = function () {
				container._terminalAsciiSrc = null; // allow retry on next pass
			};
			probe.src = srcUrl;
		}

		function drawAsciiCanvas(container, cells, cols, rows) {
			var canvas = container.querySelector(".terminal-ascii-art");
			if (!canvas) {
				canvas = document.createElement("canvas");
				canvas.className = "terminal-ascii-art";
				canvas.title = "click to toggle cover art";
				container.style.position = container.style.position || "relative";
				container.appendChild(canvas);
				canvas.addEventListener("click", function (e) {
					e.stopPropagation();
					canvas.classList.toggle("terminal-ascii-hidden");
				});
			}
			// 2 quadrant-pixels per cell in each direction; CSS scales this
			// canvas up to fill the container with image-rendering:pixelated,
			// so this internal resolution only needs to be a small multiple —
			// not the container's real pixel size — to stay crisp.
			var QPX = 2;
			canvas.width = cols * 2 * QPX;
			canvas.height = rows * 2 * QPX;
			var ctx = canvas.getContext("2d");
			ctx.imageSmoothingEnabled = false;
			for (var cy = 0; cy < rows; cy++) {
				for (var cx = 0; cx < cols; cx++) {
					var cell = cells[cy * cols + cx];
					var x0 = cx * 2 * QPX, y0 = cy * 2 * QPX;
					ctx.fillStyle = "rgb(" + cell.bg[0] + "," + cell.bg[1] + "," + cell.bg[2] + ")";
					ctx.fillRect(x0, y0, 2 * QPX, 2 * QPX);
					ctx.fillStyle = "rgb(" + cell.fg[0] + "," + cell.fg[1] + "," + cell.fg[2] + ")";
					if (cell.mask & 1) ctx.fillRect(x0, y0, QPX, QPX);
					if (cell.mask & 2) ctx.fillRect(x0 + QPX, y0, QPX, QPX);
					if (cell.mask & 4) ctx.fillRect(x0, y0 + QPX, QPX, QPX);
					if (cell.mask & 8) ctx.fillRect(x0 + QPX, y0 + QPX, QPX, QPX);
				}
			}
		}

		function renderAll() {
			ASCII_TARGETS.forEach(function (target) {
				var nodes = document.querySelectorAll(target.selector);
				nodes.forEach(function (node) {
					renderInto(node, target.cols);
				});
			});
		}

		// Header/cover images often finish loading slightly after the
		// triggering event (route change, song change), so retry a few
		// times rather than relying on one fixed delay. renderInto() is a
		// no-op once a given container's current image is already rendered,
		// so repeat calls are cheap.
		function renderWithRetries() {
			[300, 800, 1500].forEach(function (delay) {
				setTimeout(renderAll, delay);
			});
		}

		// Track lists and card grids are virtualized (only visible rows
		// exist in the DOM), so new thumbnails keep mounting as the user
		// scrolls — catch them without re-scanning constantly.
		var scrollTimer = null;
		document.addEventListener(
			"scroll",
			function () {
				clearTimeout(scrollTimer);
				scrollTimer = setTimeout(renderAll, 150);
			},
			{ capture: true, passive: true }
		);

		// songchange/appchange only cover player-state changes, not regular
		// SPA navigation (Home <-> Search <-> Library <-> playlist pages) —
		// without this, shelf cards on a freshly-routed page (e.g. Home's
		// "Vendredi = nouveautés") never got their first renderAll() pass
		// and stayed as plain cover art forever.
		Spicetify.Player.addEventListener("songchange", renderWithRetries);
		Spicetify.Player.addEventListener("appchange", renderWithRetries);
		// Spicetify.Platform.History can still be unready at this exact
		// point even though Spicetify.Player already is (the two ready up
		// independently) — a one-shot truthiness check here would then
		// silently skip attaching the listener forever. waitFor retries
		// until it's actually there.
		waitFor(
			function () { return Spicetify.Platform && Spicetify.Platform.History && Spicetify.Platform.History.listen; },
			function () { Spicetify.Platform.History.listen(renderWithRetries); }
		);

		// Belt-and-suspenders catch-all: shelf content on Home/Search often
		// finishes an async fetch and mounts well after both the route
		// change and the retry window above. Observe the main view for any
		// subtree growth and re-scan, debounced so a big list mount (e.g.
		// scrolling Liked Songs) only triggers one pass.
		var mainView = document.querySelector(".Root__main-view") || document.querySelector("#main") || document.body;
		var mutTimer = null;
		new MutationObserver(function () {
			clearTimeout(mutTimer);
			mutTimer = setTimeout(renderAll, 250);
		}).observe(mainView, { childList: true, subtree: true });

		renderWithRetries();
	}

	// =======================================================================
	// D. Track title typewriter — triggered by an actual action (song
	//    change), finishes in under a second, treated as a confirmation
	//    rather than a decorative loop.
	// =======================================================================
	function setupTypewriter() {
		Spicetify.Player.addEventListener("songchange", function (event) {
			if (!settings.typewriter || REDUCED_MOTION) return;
			var item = (event && event.data && event.data.item) || (Spicetify.Player.data && Spicetify.Player.data.item);
			if (!item || !item.name) return;

			// Let React finish rendering the new title first, then hijack it.
			requestAnimationFrame(function () {
				requestAnimationFrame(function () {
					var el = document.querySelector(".main-nowPlayingWidget-trackInfo a:first-child");
					if (!el) return;
					var full = item.name;
					var speed = Math.max(9, Math.min(22, 650 / Math.max(full.length, 1)));
					var i = 0;
					if (el._terminalTypewriterTimer) clearInterval(el._terminalTypewriterTimer);
					el.textContent = "";
					el._terminalTypewriterTimer = setInterval(function () {
						i++;
						el.textContent = full.slice(0, i);
						if (i >= full.length) {
							clearInterval(el._terminalTypewriterTimer);
							el._terminalTypewriterTimer = null;
						}
					}, speed);
				});
			});
		});
	}

	// =======================================================================
	// C. Page transitions — triggered by an actual action (navigation). Also
	// fires a brief corner badge first ("compiling module...", or
	// "fetching artist metadata..." specifically when the new page is an
	// artist page), purely cosmetic, pointer-events:none, so it can never
	// block or collide with real controls.
	// =======================================================================
	function setupPageTransitions() {
		// Spicetify.Player's "appchange" only fires for player-level app
		// switches, not plain SPA route changes (Home <-> Search <-> a
		// playlist page) — the exact same gap that silently broke ASCII-art
		// coverage on freshly-routed pages earlier. Platform.History.listen
		// fires on every real navigation and hands back the new pathname
		// directly, so it replaces appchange here rather than supplementing
		// it.
		function onNavigate(path) {
			if (!settings.transitions || REDUCED_MOTION) return;
			if (path.indexOf("/artist/") !== -1) {
				showCompilingBadge("fetching artist metadata...");
			} else {
				showCompilingBadge("compiling module...");
			}
			var view = document.querySelector(".main-view-container");
			if (!view) return;
			view.classList.remove("terminal-view-enter");
			void view.offsetWidth; // force reflow so the animation restarts
			view.classList.add("terminal-view-enter");
		}
		// See the matching comment in setupAsciiCoverArt — Platform.History
		// can still be unready here even though Player already is, and a
		// one-shot check would then permanently skip attaching this
		// listener (which is exactly what happened: this used to be a bare
		// `if`, and transitions silently never fired).
		waitFor(
			function () { return Spicetify.Platform && Spicetify.Platform.History && Spicetify.Platform.History.listen; },
			function () {
				Spicetify.Platform.History.listen(function (location) {
					onNavigate((location && location.pathname) || "");
				});
			}
		);
	}

	function showCompilingBadge(text) {
		var badge = document.getElementById("terminal-compiling-badge");
		if (!badge) {
			badge = document.createElement("div");
			badge.id = "terminal-compiling-badge";
			document.body.appendChild(badge);
		}
		badge.textContent = text || "compiling module...";
		badge.classList.remove("terminal-compiling-show");
		void badge.offsetWidth;
		badge.classList.add("terminal-compiling-show");
		clearTimeout(badge._hideTimer);
		badge._hideTimer = setTimeout(function () {
			badge.classList.remove("terminal-compiling-show");
		}, 380);
	}

	// =======================================================================
	// Stream badge — a brief "stream established" flash near the progress
	// bar on song change, in the same boot-log voice as the rest of the
	// theme. Latency/bitrate are flavor text (no such data is actually
	// exposed for a given stream), seeded per-track so the same song shows
	// the same numbers rather than re-rolling on every replay.
	// =======================================================================
	function setupStreamBadge() {
		Spicetify.Player.addEventListener("songchange", function (event) {
			if (!settings.streamBadge || REDUCED_MOTION) return;
			var item = (event && event.data && event.data.item) || (Spicetify.Player.data && Spicetify.Player.data.item);
			if (!item) return;
			var rng = mulberry32(hashStr(item.uri));
			var latency = 8 + Math.floor(rng() * 30);
			var bitrate = [160, 256, 320][Math.floor(rng() * 3)];
			showStreamBadge("[latency: " + latency + "ms] [" + bitrate + "kbps] stream established");
		});
	}

	function showStreamBadge(text) {
		var badge = document.getElementById("terminal-stream-badge");
		if (!badge) {
			badge = document.createElement("div");
			badge.id = "terminal-stream-badge";
			document.body.appendChild(badge);
		}
		badge.textContent = text;
		badge.classList.remove("terminal-stream-show");
		void badge.offsetWidth;
		badge.classList.add("terminal-stream-show");
		clearTimeout(badge._hideTimer);
		badge._hideTimer = setTimeout(function () {
			badge.classList.remove("terminal-stream-show");
		}, 2400);
	}

	// =======================================================================
	// Terminal cursor — replaces the system cursor with a small green block
	// (classic terminal caret look) app-wide. Off by default (cursor
	// replacement is a strong preference either way), toggled live from the
	// settings panel via a class on <html>, no listener wiring needed.
	// =======================================================================
	function setupCursor() {
		applyCursorSetting();
	}

	function applyCursorSetting() {
		document.documentElement.classList.toggle("terminal-cursor-enabled", !!settings.cursor);
	}

	// =======================================================================
	// CRT scanline overlay — pure CSS (see html.terminal-crt-enabled in
	// user.css), just a class toggle on <html> like the cursor above.
	// =======================================================================
	function setupCrt() {
		applyCrtSetting();
	}

	function applyCrtSetting() {
		document.documentElement.classList.toggle("terminal-crt-enabled", !!settings.crtScanlines);
	}

	// =======================================================================
	// Mini player ("lecteur réduit") — Spotify opens this via the Document
	// Picture-in-Picture API (window.documentPictureInPicture), which is a
	// genuinely separate top-level document with its own stylesheets
	// (pip-mini-player-snapshot.css) — confirmed live that neither
	// spicetify's injected user.css nor this script reach it on their own.
	// But since IT'S the same page's `window` that called
	// requestWindow(), `window.documentPictureInPicture.window` gives a
	// direct handle to that document from here, and it uses the exact same
	// Encore design-token system (confirmed: same --background-base/
	// --text-base/--essential-* custom properties, "encore-dark-theme"
	// root class) as the main app — so the same recolor block works,
	// injected as a plain <style> tag rather than a whole stylesheet swap.
	// =======================================================================
	function injectMiniPlayerStyle(win) {
		if (!win || !win.document || !win.document.head) return;
		if (win.document.getElementById("terminal-mini-player-style")) return;
		var style = win.document.createElement("style");
		style.id = "terminal-mini-player-style";
		style.textContent = [
			":root, .encore-dark-theme {",
			"  --background-base: #15171c !important;",
			"  --background-elevated-base: #20232c !important;",
			"  --background-tinted-base: #1a1c22 !important;",
			"  --background-tinted-highlight: #21242c !important;",
			"  --background-highlight: #1f2229 !important;",
			"  --background-press: #101216 !important;",
			"  --text-base: #e6e6e6 !important;",
			"  --text-subdued: #8a93a6 !important;",
			"  --text-bright-accent: #5ebdab !important;",
			"  --essential-base: #e6e6e6 !important;",
			"  --essential-subdued: #8a93a6 !important;",
			"  --essential-bright-accent: #5ebdab !important;",
			"  --decorative-base: #e6e6e6 !important;",
			"  --decorative-subdued: #2b2e38 !important;",
			"}",
			"* { font-family: " + TERM_FONT_STACK + " !important; }",
			"body { border: 2px solid #5ebdab; box-sizing: border-box; }",
			"img.main-image-image, [data-encore-id=\"buttonPrimary\"] { border-radius: 0 !important; }",
			".x-progressBar-progressFillColor, .x-progressBar-fillColor { background-color: #5ebdab !important; }"
		].join("\n");
		win.document.head.appendChild(style);
	}

	function setupMiniPlayerTheme() {
		if (!window.documentPictureInPicture) return; // older/unsupported browser build
		if (settings.miniPlayerTheme && window.documentPictureInPicture.window) {
			injectMiniPlayerStyle(window.documentPictureInPicture.window);
		}
		window.documentPictureInPicture.addEventListener("enter", function (event) {
			if (!settings.miniPlayerTheme) return;
			// The window exists immediately but Spotify's own React tree can
			// still be mounting into it — a microtask delay is enough in
			// testing, and injectMiniPlayerStyle() is idempotent either way.
			setTimeout(function () {
				injectMiniPlayerStyle(event.window);
			}, 50);
		});
	}

	function applyMiniPlayerThemeSetting(checked) {
		var win = window.documentPictureInPicture && window.documentPictureInPicture.window;
		if (!win || !win.document) return;
		if (checked) {
			injectMiniPlayerStyle(win);
		} else {
			var style = win.document.getElementById("terminal-mini-player-style");
			if (style) style.remove();
		}
	}

	// =======================================================================
	// HiDPI canvas sizing — shared by the visualizer and matrix rain (NOT
	// the ASCII cover-art canvas, which is deliberately a tiny grid blown
	// up with image-rendering:pixelated and must stay that way).
	// A canvas' backing store is in *device* pixels, but everything here
	// was written (on Linux, devicePixelRatio 1) in CSS pixels. At
	// Windows' usual 125%/150% scaling that mismatch means a 300px-wide
	// backing store stretched over 375/450 physical pixels — soft, smeared
	// bars and glyphs. Fix: size the backing store to cssSize * dpr and
	// pre-scale the context by dpr, so all drawing code keeps talking CSS
	// pixels and just comes out sharp. At dpr 1 this is exactly the old
	// behavior: width/height = the CSS size, identity transform.
	// Assigning canvas.width/height (even to the same value) clears the
	// canvas and resets the context state, transform included, so the
	// transform is reapplied here every time — callers must always resize
	// through this helper, never by touching canvas.width directly.
	// setStyle: also pin the CSS size inline, for canvases with no CSS
	// width/height of their own (matrix rain — a replaced element's
	// displayed size otherwise follows its backing store, which would make
	// it dpr times too big). Leave it off when user.css already sizes the
	// canvas (.terminal-visualizer), so the stylesheet stays in charge.
	// Stashes the logical size on the element (_cssW/_cssH) — drawing code
	// reads those, never canvas.width/height. Returns the dpr used.
	// =======================================================================
	function currentDpr() {
		var dpr = window.devicePixelRatio || 1;
		return dpr > 0 && isFinite(dpr) ? dpr : 1;
	}

	function sizeCanvasForDpr(canvas, cssW, cssH, setStyle) {
		var dpr = currentDpr();
		canvas.width = Math.max(1, Math.round(cssW * dpr));
		canvas.height = Math.max(1, Math.round(cssH * dpr));
		if (setStyle) {
			canvas.style.width = cssW + "px";
			canvas.style.height = cssH + "px";
		}
		canvas._cssW = cssW;
		canvas._cssH = cssH;
		canvas._dpr = dpr;
		var ctx = canvas.getContext("2d");
		if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		return dpr;
	}

	// True when the backing store no longer matches cssW x cssH at the
	// current dpr (panel resized, or window moved to a monitor with a
	// different scale factor).
	function canvasNeedsDprResize(canvas, cssW, cssH) {
		var dpr = currentDpr();
		return (
			canvas._dpr !== dpr ||
			canvas._cssW !== cssW ||
			canvas._cssH !== cssH ||
			canvas.width !== Math.max(1, Math.round(cssW * dpr)) ||
			canvas.height !== Math.max(1, Math.round(cssH * dpr))
		);
	}

	// Calls cb each time devicePixelRatio changes (window dragged to a
	// monitor with a different scale, or zoom). A resolution media query
	// only matches one exact value, so after every change the listener is
	// re-armed against the *new* dpr. Returns a cancel() function.
	function onDprChange(cb) {
		var mql = null;
		var cancelled = false;
		function handler() {
			disarm();
			if (cancelled) return;
			cb();
			arm();
		}
		function arm() {
			if (!window.matchMedia) return;
			mql = window.matchMedia("(resolution: " + currentDpr() + "dppx)");
			if (mql.addEventListener) mql.addEventListener("change", handler);
			else if (mql.addListener) mql.addListener(handler);
		}
		function disarm() {
			if (!mql) return;
			if (mql.removeEventListener) mql.removeEventListener("change", handler);
			else if (mql.removeListener) mql.removeListener(handler);
			mql = null;
		}
		arm();
		return function cancel() {
			cancelled = true;
			disarm();
		};
	}

	// Clears/fills the *entire* backing store regardless of the dpr
	// transform. Math.round(cssW * dpr) can exceed cssW * dpr by up to half
	// a device pixel, and a CSS-space rect would leave that edge sliver only
	// partly covered (e.g. a ghost column in the matrix trail). At dpr 1
	// this is identical to fillRect/clearRect(0, 0, canvas.width, canvas.height).
	function paintWholeCanvas(ctx, canvas, clear) {
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		if (clear) ctx.clearRect(0, 0, canvas.width, canvas.height);
		else ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.restore();
	}

	// =======================================================================
	// Frequency visualizer — real per-instant audio data, not a generic
	// pulse. Spotify's internal audio-analysis endpoint (confirmed reachable
	// live via Spicetify.CosmosAsync — the same one the official desktop
	// client's own canvas visualizers use) returns hundreds of "segments"
	// per track, each timestamped with a 12-bin pitch-class vector (chroma
	// — how much of each of the 12 notes is present in that instant) and a
	// peak loudness. Indexing that array by the track's real live playback
	// position (Spicetify.Player.getProgress()) and spreading the 12 pitch
	// bins across the bar count via interpolation gives bars that actually
	// track what's playing right now — silence during a break, a spike on
	// a hit, different shapes across a song — rather than a generic wave
	// that just repeats every beat regardless of what's actually happening
	// in the mix. Falls back to the old tempo/energy sine pulse only for
	// tracks with no analysis available (podcasts, local files).
	// =======================================================================
	var analysisCache = {}; // uri -> segments[] | null (null = unavailable, use fallback)

	function fetchAnalysis(uri, trackId) {
		if (Object.prototype.hasOwnProperty.call(analysisCache, uri)) return;
		analysisCache[uri] = undefined; // in-flight marker (still falsy, treated as "no data yet")
		if (!window.Spicetify.CosmosAsync || !trackId) {
			analysisCache[uri] = null;
			return;
		}
		Spicetify.CosmosAsync.get(
			"https://spclient.wg.spotify.com/audio-attributes/v1/audio-analysis/" + trackId + "?format=json"
		)
			.then(function (data) {
				analysisCache[uri] = data && data.segments && data.segments.length ? data.segments : null;
			})
			.catch(function () {
				analysisCache[uri] = null; // no analysis for this track — draw() falls back
			});
	}

	function setupVisualizer() {
		var BARS = 48;
		var barBases = [];
		var barCurrent = new Array(BARS).fill(0);
		var currentUri = null;
		var segCursor = 0;
		var rafId = null;

		function rebuildBases(uri) {
			currentUri = uri;
			segCursor = 0;
			var rng = mulberry32(hashStr(uri));
			barBases = [];
			for (var i = 0; i < BARS; i++) barBases.push(0.35 + rng() * 0.65);
			fetchAnalysis(uri, uri.split(":")[2]);
		}

		function ensureCanvas() {
			var cover = document.querySelector(".main-nowPlayingView-coverArtContainer");
			if (!cover || !cover.parentNode) return null;
			var canvas = document.querySelector(".terminal-visualizer");
			// isConnected + same parent, not strict previousElementSibling
			// identity — React can reorder/reinsert siblings around the
			// cover during its own re-renders without actually remounting
			// either element, which made the old identity check spuriously
			// decide "stale" and tear down + recreate the canvas repeatedly,
			// fighting the draw loop for who's the "real" one (a plausible
			// cause of the reported freeze: draw() kept getting a fresh,
			// blank canvas instead of the one actually on screen).
			if (canvas && canvas.isConnected && canvas.parentNode === cover.parentNode) {
				// Resync width if the panel was resized — the canvas'
				// internal resolution otherwise stays locked to whatever it
				// was at creation time. Also catches a dpr change (window
				// moved to a differently-scaled monitor), since this runs
				// every frame anyway — no separate listener needed here.
				var targetW = Math.max(64, cover.clientWidth || 260);
				if (canvasNeedsDprResize(canvas, targetW, 64)) sizeCanvasForDpr(canvas, targetW, 64, false);
				return canvas;
			}
			if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
			canvas = document.createElement("canvas");
			canvas.className = "terminal-visualizer";
			// Displayed size comes from user.css (width:100%; height:64px),
			// so no inline style — only the backing store is dpr-scaled.
			sizeCanvasForDpr(canvas, Math.max(64, cover.clientWidth || 260), 64, false);
			cover.parentNode.insertBefore(canvas, cover.nextSibling);
			return canvas;
		}

		function loudnessDb(db) {
			// -35..-5 window plus a sqrt-ish curve gives the loud/quiet
			// contrast actual punch instead of everything clustering in the
			// middle (most segments' loudness sits around -25..-10 dB).
			return Math.pow(Math.max(0, Math.min(1, (db + 35) / 30)), 0.6);
		}

		// Real per-frame targets from the analysis segment covering the
		// track's current playback second. segCursor tracks forward with
		// playback so most frames are an O(1) check, not a re-scan; a seek
		// (forward or backward) is caught by the two while-loops below and
		// re-syncs the cursor either direction.
		//
		// Two real-data upgrades over a flat-per-segment target:
		//
		// 1) Loudness ENVELOPE, not a flat scalar. Each segment carries its
		// own real attack shape — loudness_start, loudness_max, and
		// loudness_max_time (how many seconds into the segment the peak
		// actually lands, typically 10-100ms — a real transient, not a
		// guess). Riding that curve (fast rise to the measured peak, then
		// decay toward the *next* segment's loudness_start) makes the pulse
		// itself land exactly when the transient does, instead of one flat
		// brightness held for the whole ~0.2-0.3s segment — this is most of
		// what "not fast enough" meant: the brightness was real but slow to
		// move. (loudness_end is not used — Spotify's analysis leaves it at
		// a placeholder 0 for effectively every segment, not real data.)
		//
		// 2) pitches AND timbre, split across bars, not pitches alone. With
		// only pitches (12 values) spread over 48 bars via modulo, bars
		// 12 apart read the exact same value every frame — same shape,
		// different amplitude, moving in lockstep, which is what made it
		// look static/repetitive rather than like independent frequency
		// bins. timbre is a second, independent 12-value real descriptor
		// (MFCC-like texture/brightness, not tied to pitch) already present
		// in the same segment data. Alternating which 12-bar quarter reads
		// pitches vs. timbre means adjacent groups now move to genuinely
		// different real signals instead of a copy of each other.
		function segmentLoudness(seg, next, tSecIntoSeg) {
			var peakT = seg.loudness_max_time || 0;
			var startDb = typeof seg.loudness_start === "number" ? seg.loudness_start : seg.loudness_max;
			var nextStartDb = next && typeof next.loudness_start === "number" ? next.loudness_start : seg.loudness_max;
			var db;
			if (tSecIntoSeg <= peakT && peakT > 0) {
				db = startDb + (seg.loudness_max - startDb) * (tSecIntoSeg / peakT);
			} else {
				var decayDur = Math.max(0.02, (seg.duration || 0.2) - peakT);
				var frac = Math.max(0, Math.min(1, (tSecIntoSeg - peakT) / decayDur));
				db = seg.loudness_max + (nextStartDb - seg.loudness_max) * frac;
			}
			return loudnessDb(db);
		}

		function normTimbre(v) {
			// Timbre coefficients are unbounded (roughly -100..100 in
			// practice; the first coefficient trends positive — it's an
			// average-loudness-like component of an MFCC-style basis).
			// Centering on a working range and clamping gives something
			// comparable in scale to pitches (already 0..1).
			return Math.max(0, Math.min(1, ((v || 0) + 50) / 100));
		}

		function sampleTargets(segments, timeSec) {
			if (segCursor >= segments.length) segCursor = segments.length - 1;
			while (segCursor < segments.length - 1 && segments[segCursor + 1].start <= timeSec) segCursor++;
			while (segCursor > 0 && segments[segCursor].start > timeSec) segCursor--;
			var seg = segments[segCursor];
			var next = segments[segCursor + 1] || seg;
			var tIntoSeg = Math.max(0, timeSec - seg.start);

			var loud = segmentLoudness(seg, next, tIntoSeg);
			var segDur = Math.max(0.05, seg.duration || next.start - seg.start || 0.2);
			var t = Math.max(0, Math.min(1, tIntoSeg / segDur));

			var pitchesA = seg.pitches || [];
			var pitchesB = next.pitches || pitchesA;
			var timbreA = seg.timbre || [];
			var timbreB = next.timbre || timbreA;
			var targets = new Array(BARS);
			for (var i = 0; i < BARS; i++) {
				var idx = i % 12;
				var useTimbre = Math.floor(i / 12) % 2 === 1;
				var a = useTimbre ? normTimbre(timbreA[idx]) : pitchesA[idx] || 0;
				var b = useTimbre ? normTimbre(timbreB[idx]) : pitchesB[idx] || 0;
				var v = a + (b - a) * t;
				targets[i] = Math.pow(v, 0.7) * loud * (barBases[i] || 0.6);
			}
			return targets;
		}

		function draw() {
			rafId = requestAnimationFrame(draw);
			if (document.hidden || REDUCED_MOTION || !settings.visualizer) {
				var stale = document.querySelector(".terminal-visualizer");
				if (stale && !settings.visualizer) stale.parentNode.removeChild(stale);
				return;
			}
			var canvas = ensureCanvas();
			if (!canvas) return;
			var item = Spicetify.Player.data && Spicetify.Player.data.item;
			if (item && item.uri !== currentUri) rebuildBases(item.uri);

			var ctx = canvas.getContext("2d");
			// Logical (CSS-pixel) size — the context is pre-scaled by dpr.
			var w = canvas._cssW, h = canvas._cssH;
			paintWholeCanvas(ctx, canvas, true);
			// No ctx.shadowBlur here (was 4) — a shadow forces the canvas to
			// re-rasterize a blur kernel on *every single* fillRect call, and
			// this draws up to 48 of them per frame at 60fps. That's one of
			// the most expensive things you can ask Canvas2D to do
			// repeatedly, and sustained over a whole track (plus the CRT
			// sweep, matrix rain, and ASCII rescans all sharing the same
			// main thread) is a credible cause of the reported freeze —
			// accumulating jank rather than an actual stuck state. A flat
			// fill costs a small fraction of a blurred one.
			ctx.fillStyle = "#5ebdab";
			var barW = w / BARS;
			var isPaused = !!(Spicetify.Player.data && Spicetify.Player.data.isPaused);
			var segments = currentUri ? analysisCache[currentUri] : null;
			var i;

			if (!isPaused && segments) {
				var targets = sampleTargets(segments, Spicetify.Player.getProgress() / 1000);
				// Asymmetric attack/decay (snap up fast, ease down slow) —
				// the classic VU-meter technique. A single symmetric lerp
				// factor made every bar move as one smooth, slow-rolling
				// wave; real audio meters *jump* on a hit and *fall* after,
				// which is what actually reads as "reacting to the music"
				// rather than gently breathing.
				for (i = 0; i < BARS; i++) {
					// Faster on both sides than the original tuning — with
					// the envelope/timbre changes above the targets
					// themselves now carry real fast transients, and a slow
					// decay (was 0.12, ~300ms to fall 90%) was blunting them
					// back down into a blur. 0.22 (~160ms) still isn't a bare
					// 1:1 strobe but reads as a real meter falling, not a
					// bar breathing.
					var rate = targets[i] > barCurrent[i] ? 0.85 : 0.22;
					barCurrent[i] += (targets[i] - barCurrent[i]) * rate;
					var barH = Math.max(2, Math.min(h, barCurrent[i] * h));
					ctx.fillRect(i * barW + 1, h - barH, Math.max(1, barW - 2), barH);
				}
			} else if (!isPaused) {
				// Covers both segments === null (no analysis for this track —
				// podcast, local file) AND segments === undefined (analysis
				// fetch still in flight). That second case fell through this
				// whole if/else-if chain unmatched before (undefined is
				// falsy, so it matched neither the `segments` branch above
				// nor a `=== null` check here), meaning nothing got drawn at
				// all for however long the fetch took — a real gap, not just
				// a rare edge case, since it hit on every single song
				// change. Falls back to the tempo/energy sine pulse so it
				// still moves with real track data rather than going blank.
				var tempo = (lastAudioFeatures && lastAudioFeatures.tempo) || 120;
				var energy = lastAudioFeatures && typeof lastAudioFeatures.energy === "number" ? lastAudioFeatures.energy : 0.5;
				var beatMs = 60000 / tempo;
				var ts = performance.now();
				for (i = 0; i < BARS; i++) {
					var phase = (ts / beatMs) * Math.PI * 2 + i * 0.35;
					var pulse = Math.sin(phase) * 0.5 + 0.5;
					barCurrent[i] = (barBases[i] || 0.5) * (0.4 + 0.9 * pulse) * (0.35 + energy * 0.9);
					var barH2 = Math.max(2, Math.min(h, barCurrent[i] * h));
					ctx.fillRect(i * barW + 1, h - barH2, Math.max(1, barW - 2), barH2);
				}
			} else if (isPaused) {
				// Paused — settle to a small flat idle floor per bar, not to
				// zero. A fully blank canvas is indistinguishable from the
				// visualizer being broken; a flatlined-but-visible row reads
				// unambiguously as "alive, nothing playing right now".
				for (i = 0; i < BARS; i++) {
					var floor = (barBases[i] || 0.5) * 0.06;
					barCurrent[i] += (floor - barCurrent[i]) * 0.15;
					var barH3 = Math.max(1, barCurrent[i] * h);
					ctx.fillRect(i * barW + 1, h - barH3, Math.max(1, barW - 2), barH3);
				}
			} else {
				// Playing, analysis still in flight (first second or two of a
				// track) — brief, self-resolving, fine to just settle low.
				for (i = 0; i < BARS; i++) {
					barCurrent[i] += (0 - barCurrent[i]) * 0.15;
					var barH4 = barCurrent[i] * h;
					if (barH4 > 1) ctx.fillRect(i * barW + 1, h - barH4, Math.max(1, barW - 2), barH4);
				}
			}
		}

		rafId = requestAnimationFrame(draw);
	}

	// =======================================================================
	// Vim-style keyboard navigation — j/k moves a highlighted-row cursor
	// through the visible track list, Enter plays the highlighted row, /
	// focuses search. Disabled whenever focus is in any text input/textarea/
	// contenteditable, or the command palette is open, so it never steals
	// keystrokes from normal typing.
	// =======================================================================
	var vimIndex = -1;

	function isTypingContext() {
		var el = document.activeElement;
		if (!el) return false;
		var tag = el.tagName;
		return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
	}

	function setupVimNav() {
		Spicetify.Player.addEventListener("appchange", function () {
			vimIndex = -1;
		});

		document.addEventListener("keydown", function (e) {
			if (paletteOverlay || isTypingContext()) return;

			if (e.key === "/") {
				var search = document.querySelector(".main-topBar-searchBar, [data-testid=\"search-input\"]");
				if (search) {
					e.preventDefault();
					search.focus();
				}
				return;
			}

			if (e.key !== "j" && e.key !== "k" && e.key !== "Enter") return;
			var rows = document.querySelectorAll(".main-trackList-trackListRow");
			if (!rows.length) return;

			if (e.key === "Enter") {
				var current = rows[vimIndex];
				if (current) {
					e.preventDefault();
					current.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
				}
				return;
			}

			e.preventDefault();
			vimIndex = Math.max(0, Math.min(rows.length - 1, vimIndex + (e.key === "j" ? 1 : -1)));
			rows.forEach(function (r) {
				r.classList.remove("terminal-vim-cursor");
			});
			var row = rows[vimIndex];
			row.classList.add("terminal-vim-cursor");
			row.scrollIntoView({ block: "nearest" });
		});
	}

	// =======================================================================
	// E. Command palette — the fully user-triggered, standout feature.
	// =======================================================================
	var paletteOverlay = null;

	function setupCommandPalette() {
		// Ctrl+Shift+K, not Ctrl+` — a symbol key's physical position (and
		// its `code` value) can differ across keyboard layouts (AZERTY vs
		// QWERTY), which made the original backtick binding unreliable.
		// Letter keys keep the same `code` (KeyK) regardless of layout, so
		// this combo is layout-independent.
		document.addEventListener("keydown", function (e) {
			if (e.ctrlKey && e.shiftKey && e.code === "KeyK") {
				if (!settings.palette) return;
				e.preventDefault();
				toggleCommandPalette();
			}
		});
	}

	function toggleCommandPalette() {
		if (paletteOverlay) {
			closeCommandPalette();
		} else {
			openCommandPalette();
		}
	}

	function openCommandPalette() {
		paletteOverlay = document.createElement("div");
		paletteOverlay.id = "terminal-palette-overlay";
		paletteOverlay.innerHTML =
			'<div class="terminal-palette">' +
			'<div class="terminal-palette-history"></div>' +
			'<div class="terminal-palette-inputRow">' +
			'<span class="terminal-palette-prompt">&gt;</span>' +
			'<input class="terminal-palette-input" spellcheck="false" autocomplete="off" placeholder="type a command, or \'help\'" />' +
			"</div></div>";

		document.body.appendChild(paletteOverlay);

		var history = paletteOverlay.querySelector(".terminal-palette-history");
		var input = paletteOverlay.querySelector(".terminal-palette-input");

		function print(text, cls) {
			var line = document.createElement("div");
			if (cls) line.className = cls;
			line.textContent = text;
			history.appendChild(line);
			history.scrollTop = history.scrollHeight;
		}

		print("terminal command palette — type 'help' for commands", "ok");

		input.addEventListener("keydown", function (e) {
			if (e.key === "Escape") {
				closeCommandPalette();
				return;
			}
			if (e.key !== "Enter") return;
			var raw = input.value.trim();
			input.value = "";
			if (!raw) return;
			var line = document.createElement("div");
			line.className = "cmd";
			line.textContent = raw;
			history.appendChild(line);
			runCommand(raw, print);
			history.scrollTop = history.scrollHeight;
		});

		paletteOverlay.addEventListener("mousedown", function (e) {
			if (e.target === paletteOverlay) closeCommandPalette();
		});

		setTimeout(function () {
			input.focus();
		}, 0);
	}

	function closeCommandPalette() {
		if (!paletteOverlay) return;
		paletteOverlay.parentNode.removeChild(paletteOverlay);
		paletteOverlay = null;
	}

	function runCommand(raw, print) {
		// Accept a leading "/" out of Discord/Slack muscle memory (/egg,
		// /sudo...) as equivalent to typing the bare command name.
		var parts = raw.replace(/^\//, "").split(/\s+/);
		var cmd = parts[0].toLowerCase();
		var arg = parts.slice(1).join(" ");
		var handler = COMMANDS[cmd];
		if (!handler) {
			print("command not found: " + cmd, "err");
			return;
		}
		try {
			var result = handler(arg);
			if (result) print(result, "ok");
		} catch (e) {
			print("error: " + (e && e.message ? e.message : String(e)), "err");
		}
	}

	// Session play history — not Spotify's real listening history (no API
	// exposes that here), just what's played since this launch. Capped so
	// it can't grow unbounded over a long session.
	var playHistory = [];

	function setupPlayHistory() {
		Spicetify.Player.addEventListener("songchange", function (event) {
			var item = (event && event.data && event.data.item) || (Spicetify.Player.data && Spicetify.Player.data.item);
			if (!item) return;
			var artists = (item.artists || []).map(function (a) { return a.name; }).join(", ");
			playHistory.unshift({ time: new Date(), name: item.name, artist: artists });
			if (playHistory.length > 50) playHistory.length = 50;
		});
	}

	var COMMANDS = {
		help: function () {
			return "play · pause · next · back · shuffle · repeat · goto <home|search|library> · search <query> · stats · history · neofetch · uptime · cowsay [text] · whoami · clear";
		},
		play: function () {
			Spicetify.Player.play();
			return "playing";
		},
		pause: function () {
			Spicetify.Player.pause();
			return "paused";
		},
		next: function () {
			Spicetify.Player.next();
			return "skipped to next track";
		},
		back: function () {
			Spicetify.Player.back();
			return "skipped to previous track";
		},
		shuffle: function () {
			Spicetify.Player.toggleShuffle();
			return "shuffle " + (Spicetify.Player.getShuffle() ? "on" : "off");
		},
		repeat: function () {
			Spicetify.Player.toggleRepeat();
			return "repeat mode: " + Spicetify.Player.getRepeat();
		},
		goto: function (arg) {
			var routes = { home: "/", search: "/search", library: "/collection/tracks" };
			var route = routes[(arg || "").toLowerCase()];
			if (!route) return "usage: goto <home|search|library>";
			if (window.Spicetify.Platform && Spicetify.Platform.History) {
				Spicetify.Platform.History.push(route);
				return "→ " + (arg || "").toLowerCase();
			}
			return "navigation unavailable";
		},
		search: function (arg) {
			if (!arg) return "usage: search <query>";
			if (window.Spicetify.Platform && Spicetify.Platform.History) {
				Spicetify.Platform.History.push("/search/" + encodeURIComponent(arg));
				return 'searching "' + arg + '"';
			}
			return "search unavailable";
		},
		whoami: function () {
			return currentDisplayName();
		},
		stats: function () {
			var item = Spicetify.Player.data && Spicetify.Player.data.item;
			if (!item) return "no track playing";
			var artists = (item.artists || []).map(function (a) { return a.name; }).join(", ");
			var pos = Spicetify.Player.formatTime(Spicetify.Player.getProgress());
			var dur = Spicetify.Player.formatTime(Spicetify.Player.getDuration());
			var lines = [
				"track     " + item.name,
				"artist    " + (artists || "—"),
				"album     " + ((item.album && item.album.name) || "—"),
				"position  " + pos + " / " + dur,
				"tempo     " + (lastAudioFeatures && lastAudioFeatures.tempo ? Math.round(lastAudioFeatures.tempo) + " bpm" : "—"),
				"energy    " + (lastAudioFeatures && typeof lastAudioFeatures.energy === "number" ? Math.round(lastAudioFeatures.energy * 100) + "%" : "—"),
				"shuffle   " + (Spicetify.Player.getShuffle() ? "on" : "off"),
				"repeat    " + Spicetify.Player.getRepeat()
			];
			return lines.join("\n");
		},
		clear: function () {
			var historyEl = document.querySelector(".terminal-palette-history");
			if (historyEl) historyEl.innerHTML = "";
			return null;
		},
		history: function () {
			if (!playHistory.length) return "cat: ~/.history: no entries this session yet";
			return playHistory
				.slice(0, 15)
				.map(function (h) {
					var t = h.time.toTimeString().slice(0, 8);
					return t + "  " + h.name + (h.artist ? " — " + h.artist : "");
				})
				.join("\n");
		},
		// neofetch/uptime — same "real data + terminal flavor" pattern as
		// stats/stream badge: every line here is either genuinely queryable
		// from the browser (cores, resolution, memory when Chrome exposes
		// it, uptime) or clearly real theme state (feature count), nothing
		// invented.
		neofetch: function () {
			var mem = performance.memory
				? Math.round(performance.memory.usedJSHeapSize / 1048576) + "MB / " + Math.round(performance.memory.jsHeapSizeLimit / 1048576) + "MB"
				: "n/a (not exposed by this browser)";
			var uptimeMs = Date.now() - SESSION_START;
			var mins = Math.floor(uptimeMs / 60000);
			var upStr = mins < 60 ? mins + "m" : Math.floor(mins / 60) + "h " + (mins % 60) + "m";
			var enabledCount = FEATURE_REGISTRY.filter(function (f) { return !!settings[f.key]; }).length;
			var lines = [
				currentDisplayName() + "@spicetify",
				"----------------",
				"OS        spicetify-terminal v1.0 (" + (Spicetify.Platform && Spicetify.Platform.operatingSystem ? Spicetify.Platform.operatingSystem : "unknown") + ")",
				"host      Spotify " + (Spicetify.Config && Spicetify.Config.version ? Spicetify.Config.version : "web"),
				"uptime    " + upStr,
				"shell     terminal command palette",
				"resolution " + window.innerWidth + "x" + window.innerHeight,
				"cpu       " + (navigator.hardwareConcurrency || "?") + " cores",
				"memory    " + mem,
				"features  " + enabledCount + "/" + FEATURE_REGISTRY.length + " enabled (~/.terminalrc)"
			];
			return lines.join("\n");
		},
		uptime: function () {
			var uptimeMs = Date.now() - SESSION_START;
			var mins = Math.floor(uptimeMs / 60000);
			var secs = Math.floor((uptimeMs % 60000) / 1000);
			var upStr = mins < 60 ? mins + "m " + secs + "s" : Math.floor(mins / 60) + "h " + (mins % 60) + "m";
			return "up " + upStr + " — " + playHistory.length + " track" + (playHistory.length === 1 ? "" : "s") + " played this session";
		},
		// cowsay <text> — classic terminal ritual. With no argument, says the
		// current track (real data, same "real data + flavor" pattern as
		// neofetch/stats), falling back to a plain "moo." if nothing is
		// playing. Bubble width is derived from the text itself, capped so a
		// long title still fits the palette's fixed-width history pane
		// without wrapping mid-border.
		cowsay: function (arg) {
			var text = arg;
			if (!text) {
				var item = Spicetify.Player.data && Spicetify.Player.data.item;
				if (item) {
					var artists = (item.artists || []).map(function (a) { return a.name; }).join(", ");
					text = item.name + (artists ? " — " + artists : "");
				} else {
					text = "moo.";
				}
			}
			var maxWidth = 40;
			if (text.length > maxWidth) text = text.slice(0, maxWidth - 1) + "…";
			var border = new Array(text.length + 3).join("_");
			var borderBottom = new Array(text.length + 3).join("-");
			return [
				" " + border,
				"< " + text + " >",
				" " + borderBottom,
				"        \\   ^__^",
				"         \\  (oo)\\_______",
				"            (__)\\       )\\/\\",
				"                ||----w |",
				"                ||     ||"
			].join("\n");
		},
		// A few easter eggs. Kept short and self-contained — none of these
		// touch real state beyond what's documented.
		sudo: function (arg) {
			return currentDisplayName() + " is not in the sudoers file. This incident will be reported.";
		},
		42: function () {
			return "the answer to life, the universe, and everything.";
		},
		coffee: function () {
			return "418 I'm a teapot.";
		},
		matrix: function () {
			settings.matrixRain = true;
			saveSettings();
			return "matrix rain armed — triggers after " + (settings.matrixRainDelayMin || 5) + " min idle+paused";
		},
		hack: function (arg) {
			var target = arg || "the mainframe";
			return (
				"connecting to " + target + " ...\n" +
				"bypassing firewall ......... OK\n" +
				"cracking encryption ........ OK\n" +
				"access granted.\n" +
				"(nothing was actually hacked)"
			);
		},
		// Not listed in `help` on purpose — this is the easter egg that
		// reveals the other easter eggs. Works as "egg" or "/egg".
		egg: function () {
			return [
				"sudo <cmd>   — try running something as root",
				"42            — the answer to everything",
				"coffee        — brew status",
				"hack <target> — totally real hacking",
				"matrix        — arm the idle screensaver early"
			].join("\n");
		}
	};

	// =======================================================================
	// F. Matrix rain — opt-in, idle-and-paused-only screensaver. Off by
	//    default. Canvas + requestAnimationFrame, paused when the window is
	//    hidden (per the throttling note found in popupLyrics.js).
	// =======================================================================
	var matrixState = { canvas: null, ctx: null, rafId: null, lastActivity: Date.now() };

	function setupMatrixRain() {
		["mousemove", "mousedown", "keydown", "wheel", "touchstart"].forEach(function (evt) {
			document.addEventListener(
				evt,
				function () {
					matrixState.lastActivity = Date.now();
					if (matrixState.canvas) stopMatrixRain();
				},
				{ passive: true }
			);
		});

		document.addEventListener("visibilitychange", function () {
			if (document.hidden && matrixState.rafId) {
				cancelAnimationFrame(matrixState.rafId);
				matrixState.rafId = null;
			} else if (!document.hidden && matrixState.canvas && !matrixState.rafId) {
				drawMatrixFrame();
			}
		});

		setInterval(function () {
			if (!settings.matrixRain || REDUCED_MOTION) return;
			if (matrixState.canvas) return;
			var isPaused = Spicetify.Player.data && Spicetify.Player.data.isPaused;
			var idleMs = (settings.matrixRainDelayMin || 5) * 60000;
			if (isPaused && Date.now() - matrixState.lastActivity > idleMs) {
				startMatrixRain();
			}
		}, 15000);
	}

	function startMatrixRain() {
		var canvas = document.createElement("canvas");
		canvas.id = "terminal-matrix-rain";
		document.body.appendChild(canvas);
		matrixState.canvas = canvas;
		matrixState.ctx = canvas.getContext("2d");

		// #terminal-matrix-rain is position:fixed; inset:0 but has no CSS
		// width/height, and a canvas is a replaced element — its displayed
		// size would follow the (dpr-scaled) backing store — so pin the CSS
		// size inline (setStyle = true). Same size as before at dpr 1.
		function resize() {
			sizeCanvasForDpr(canvas, window.innerWidth, window.innerHeight, true);
		}
		resize();
		window.addEventListener("resize", resize);
		matrixState.resize = resize;
		// Resizing wipes the canvas, which the fading trail recovers from
		// on its own within a few frames, so a dpr change just re-sizes.
		matrixState.cancelDprWatch = onDprChange(resize);

		var fontSize = 14;
		var columns = Math.floor(canvas._cssW / fontSize);
		matrixState.drops = new Array(columns).fill(1);
		matrixState.fontSize = fontSize;

		requestAnimationFrame(function () {
			canvas.classList.add("terminal-matrix-visible");
		});

		drawMatrixFrame();
	}

	var MATRIX_CHARS = "アイウエオカキクケコサシスセソ0123456789$#@!><+-";

	function drawMatrixFrame() {
		var ctx = matrixState.ctx;
		var canvas = matrixState.canvas;
		if (!ctx || !canvas) return;
		ctx.fillStyle = "rgba(21, 23, 28, 0.15)";
		paintWholeCanvas(ctx, canvas, false);
		// Generic "monospace" stays FIRST on purpose: on Linux it's what the
		// rain has always used (fontconfig → DejaVu Sans Mono), so digits and
		// symbols render identically there. DejaVu has no katakana, so those
		// glyphs fall through the list per-glyph; on a stock Linux box none
		// of the named Japanese faces below exist, so they land on the same
		// system fallback as before. On Windows "monospace" is Consolas (also
		// no katakana) and the explicit MS Gothic / Yu Gothic / Meiryo give
		// the rain a proper fixed-width-ish Japanese face instead of whatever
		// Chromium's generic fallback picks. (A generic family doesn't have
		// to be last in a font list; later names are still consulted for
		// any glyph it lacks.)
		ctx.font = matrixState.fontSize + "px monospace, 'MS Gothic', 'Yu Gothic', 'Meiryo'";
		// No ctx.shadowBlur (was 3) — verified live (screenshot, ~35s after
		// trigger, well past any startup transient) that with ~110+ columns
		// all drawing a glyph every single frame, a blur radius on every one
		// of them bleeds into its neighbors and merges the whole thing into
		// a flat teal wash rather than distinct falling characters — this
		// was the real cause of the reported "green background" bug, not
		// the fade alpha (already tuned once, alone it didn't fix it). Flat
		// fill keeps characters crisp and distinct against the dark trail.
		for (var i = 0; i < matrixState.drops.length; i++) {
			var text = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
			var y = matrixState.drops[i] * matrixState.fontSize;
			// Occasional bright near-white glyph mixed into the green stream —
			// reads as the "hot" leading edge of a drop, like real chafa/cmatrix.
			ctx.fillStyle = Math.random() > 0.94 ? "#d6fff5" : "#5ebdab";
			ctx.fillText(text, i * matrixState.fontSize, y);
			if (y > canvas._cssH && Math.random() > 0.97) {
				matrixState.drops[i] = 0;
			}
			matrixState.drops[i] += settings.matrixRainSpeed || 1;
		}
		matrixState.rafId = requestAnimationFrame(drawMatrixFrame);
	}

	function stopMatrixRain() {
		if (matrixState.rafId) cancelAnimationFrame(matrixState.rafId);
		if (matrixState.resize) window.removeEventListener("resize", matrixState.resize);
		if (matrixState.cancelDprWatch) matrixState.cancelDprWatch();
		matrixState.cancelDprWatch = null;
		if (matrixState.canvas && matrixState.canvas.parentNode) {
			matrixState.canvas.parentNode.removeChild(matrixState.canvas);
		}
		matrixState.canvas = null;
		matrixState.ctx = null;
		matrixState.rafId = null;
	}

	// =======================================================================
	// Settings panel — Topbar button opening a PopupModal with checkboxes.
	// Every feature above reads `settings.*` live at the point it fires, so
	// toggling here takes effect immediately without touching listeners.
	// =======================================================================
	function setupSettingsPanel() {
		if (!window.Spicetify.Topbar || !window.Spicetify.PopupModal) return;

		var TERMINAL_ICON =
			'<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">' +
			'<rect x="1" y="1" width="14" height="14" stroke="currentColor" stroke-width="1.3"/>' +
			'<path d="M3.5 5.5L6 8l-2.5 2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>' +
			'<path d="M8 10.5H12.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' +
			"</svg>";

		new Spicetify.Topbar.Button("Réglages Terminal", TERMINAL_ICON, function () {
			Spicetify.PopupModal.display({
				title: "~/.terminalrc",
				content: buildSettingsPanel()
			});
		});
	}

	function buildSettingsPanel() {
		var wrap = document.createElement("div");
		wrap.className = "terminal-settings";

		FEATURE_REGISTRY.forEach(function (feature) {
			var key = feature.key;
			// A plain <div> row, not a <label> — the matrixRain row also holds a
			// number input, and nesting it inside a <label> bound to the checkbox
			// would toggle the checkbox on every click into the number field.
			var line = document.createElement("div");
			line.className = "terminal-settings-row";

			var innerLabel = document.createElement("label");

			var cb = document.createElement("input");
			cb.type = "checkbox";
			cb.checked = !!settings[key];
			cb.addEventListener("change", function () {
				settings[key] = cb.checked;
				saveSettings();
				if (feature.onToggle) feature.onToggle(cb.checked);
			});

			innerLabel.appendChild(cb);
			innerLabel.appendChild(document.createTextNode(" " + feature.label));
			line.appendChild(innerLabel);

			if (feature.hasDelay) {
				var delay = document.createElement("input");
				delay.type = "number";
				delay.min = "1";
				delay.max = "60";
				delay.className = "terminal-settings-delay";
				delay.value = settings.matrixRainDelayMin;
				delay.addEventListener("change", function () {
					var v = parseInt(delay.value, 10);
					settings.matrixRainDelayMin = v > 0 ? v : DEFAULT_SETTINGS.matrixRainDelayMin;
					saveSettings();
				});
				// Grouped in one span (rather than loose text nodes) so the row
				// wraps as a whole unit onto its own line at narrow widths —
				// three separate flex children each line-wrapping independently
				// produced a jumbled "— after / [1] min / idle+paused" mess.
				var delayGroup = document.createElement("span");
				delayGroup.className = "terminal-settings-delay-group";
				delayGroup.appendChild(document.createTextNode("après "));
				delayGroup.appendChild(delay);
				delayGroup.appendChild(document.createTextNode(" min inactif+pause"));
				line.appendChild(delayGroup);
			}

			if (feature.hasSpeed) {
				var speed = document.createElement("input");
				speed.type = "number";
				speed.min = "0.5";
				speed.max = "4";
				speed.step = "0.5";
				speed.className = "terminal-settings-delay";
				speed.value = settings.matrixRainSpeed;
				speed.addEventListener("change", function () {
					var v = parseFloat(speed.value);
					settings.matrixRainSpeed = v > 0 ? v : DEFAULT_SETTINGS.matrixRainSpeed;
					saveSettings();
				});
				var speedGroup = document.createElement("span");
				speedGroup.className = "terminal-settings-delay-group";
				speedGroup.appendChild(document.createTextNode("vitesse ×"));
				speedGroup.appendChild(speed);
				line.appendChild(speedGroup);
			}

			wrap.appendChild(line);
		});

		var hint = document.createElement("div");
		hint.className = "terminal-settings-hint";
		hint.textContent = "les changements s'appliquent immédiatement, sauf la séquence de démarrage (au prochain lancement).";
		wrap.appendChild(hint);

		return wrap;
	}
})();
