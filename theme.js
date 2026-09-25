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

	// Run once per page: the theme can be loaded twice (Marketplace's
	// jsDelivr include plus a local inject_theme_js copy). A second copy
	// would stack a second boot overlay and double every listener below.
	if (window.__spicetifyTerminalThemeLoaded) return;
	window.__spicetifyTerminalThemeLoaded = true;

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
	// Shown by the boot log and `neofetch`; keep in sync with CHANGELOG.md.
	var THEME_VERSION = "2.0.0";

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
		{
			key: "fullConversion",
			label: "mode terminal complet (interface entièrement refaite)",
			default: true,
			setup: function () { setupFullConversion(); },
			onToggle: function () { applyFullConversionSetting(); }
		},
		{ key: "boot", label: "séquence de démarrage au lancement", default: true },
		{ key: "pulse", label: "pulsation lecture en cours (couleur + tempo)", default: true, setup: function () { setupNowPlayingPulse(); }, onToggle: function () { applyPulseVisuals(); } },
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
	var fullConversionParts = []; // { setup: fn, teardown: fn }, registered in the FULL/* sections
	// Tag <html> right away so the full-conversion CSS applies from the
	// first paint instead of flashing the native UI until Spicetify is ready.
	document.documentElement.classList.toggle("terminal-full", !!settings.fullConversion);

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


	// Runs fn after the next paint. Navigation handlers are deferred with
	// this so a page change is drawn at native speed and the theme's
	// decorations (titles, tags, ASCII pass, transitions) land one frame
	// later — measured, doing them synchronously in the click task added
	// ~180 ms to input-to-paint on a page change.
	function afterPaint(fn) {
		requestAnimationFrame(function () {
			setTimeout(fn, 0);
		});
	}

	// History.listen, with the callback moved after the next paint.
	function tfListenHistory(cb) {
		return Spicetify.Platform.History.listen(function (location) {
			afterPaint(function () {
				cb(location);
			});
		});
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
		// Idempotent: the theme JS can be injected twice (local theme.js +
		// Marketplace's include URL). One overlay is enough.
		if (document.getElementById("terminal-boot-overlay")) return;
		if (!document.body) {
			document.addEventListener("DOMContentLoaded", runBootSequence);
			return;
		}

		var LOGO = [
			" _____              _           _ ",
			"|_   _|__ _ _ _ __ (_)_ _  __ _| |",
			"  | |/ -_) '_| '  \\| | ' \\/ _` | |",
			"  |_|\\___|_| |_|_|_|_|_||_\\__,_|_|"
		].join("\n");

		var LINES = [
			"spicetify-terminal v" + THEME_VERSION,
			"mounting /library ......... OK",
			"establishing session ...... OK",
			"loading audio subsystem ... OK",
			"ready."
		];

		var overlay = document.createElement("div");
		overlay.id = "terminal-boot-overlay";

		// Window-drag handle for the in-app title bar on Windows and macOS;
		// display:none on Linux (see .terminal-drag-strip in user.css).
		var dragStrip = document.createElement("div");
		dragStrip.className = "terminal-drag-strip";
		overlay.appendChild(dragStrip);

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
			document.removeEventListener("visibilitychange", onVisibilityChange);
			overlay.removeEventListener("click", dismiss);
		}

		var last = 0;
		function onVisibilityChange() {
			last = performance.now();
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
		// Progress is derived from elapsed *visible* time, not from how many
		// timers have fired: Chromium clamps timers to 1/s while the window is
		// hidden/occluded/minimized (Spotify often starts that way on Windows)
		// and Spotify's own startup blocks the main thread for seconds, so a
		// 10ms-per-char timer chain used to crawl and then get cut mid-line
		// by the safety net. Now a late tick just catches up, and whatever
		// ends the sequence always shows the full log first.
		var CHAR_MS = 10;
		var LINE_GAP_MS = 90;
		var HOLD_MS = 700; // cursor blink before the fade
		var SAFETY_MS = 3200; // hard cap on visible time
		var NEVER_SHOWN_MS = 8000; // window never shown: drop silently

		var lineStarts = [];
		var lineEls = [];
		var typeEnd = 0;
		LINES.forEach(function (line) {
			lineStarts.push(typeEnd);
			typeEnd += (line.length - 1) * CHAR_MS + LINE_GAP_MS;
			var el = document.createElement("div");
			if (line.indexOf("OK") !== -1 || line === "ready.") el.className = "ok";
			lineEls.push(el);
		});
		var cursor = document.createElement("span");
		cursor.className = "terminal-boot-cursor";
		cursor.textContent = "\u2588";

		function render(elapsed) {
			for (var i = 0; i < LINES.length; i++) {
				if (elapsed < lineStarts[i]) break;
				var n = Math.min(LINES[i].length, Math.floor((elapsed - lineStarts[i]) / CHAR_MS) + 1);
				if (!lineEls[i].parentNode) log.appendChild(lineEls[i]);
				if (lineEls[i].textContent.length !== n) lineEls[i].textContent = LINES[i].slice(0, n);
			}
			if (elapsed >= typeEnd && !cursor.parentNode) log.appendChild(cursor);
		}

		var started = false;
		var elapsed = 0;
		var finishing = false;
		var doneAt = null;

		function isVisible() {
			return document.visibilityState !== "hidden";
		}

		// Complete every line at once, hold briefly, then fade — never cut
		// the log mid-line.
		function finish(holdMs) {
			if (dismissed || finishing) return;
			finishing = true;
			render(typeEnd);
			timers.push(setTimeout(dismiss, holdMs));
		}

		function tick() {
			if (dismissed || finishing) return;
			var now = performance.now();
			if (!started) {
				if (!isVisible()) {
					timers.push(setTimeout(tick, 50));
					return;
				}
				started = true;
				last = now;
				timers.push(setTimeout(function () { finish(300); }, SAFETY_MS));
			}
			// Only visible time moves the animation forward.
			if (isVisible()) elapsed += now - last;
			last = now;
			render(elapsed);
			// Hold measured from when the full log was actually on screen, so
			// a long main-thread stall can't skip straight past it.
			if (doneAt === null && elapsed >= typeEnd) doneAt = elapsed;
			if (doneAt !== null && elapsed >= doneAt + HOLD_MS) return dismiss();
			timers.push(setTimeout(tick, 16));
		}

		document.addEventListener("visibilitychange", onVisibilityChange);
		timers.push(setTimeout(function () {
			if (!started) dismiss();
		}, NEVER_SHOWN_MS));
		tick();
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
	// URI of the track apply() last ran for. colorExtractor / audio-features
	// resolve asynchronously, so when skipping quickly the previous track's
	// response can land after the new track's — each .then() checks this
	// before touching the DOM or the last* globals (it still fills the cache
	// under its own URI, so replaying that track stays instant).
	var currentTrackUri = null;

	function isCurrentTrack(uri) {
		return uri === currentTrackUri;
	}

	// Cover color + audio-features by track URI, so replaying a track this
	// session re-applies instantly from memory instead of re-fetching both
	// over the network. Cleared only by reloading the theme (session-scoped,
	// matches playHistory's lifetime).
	var trackDataCache = {};

	// Drop everything the previous track left behind — the inline
	// --track-accent (raw or mood-tinted, see applyMoodTint) and
	// --track-bpm-ms on <html>, plus its tempo markers — so a track with no
	// color/audio-features (local file, podcast, nothing playing) falls back
	// to the CSS defaults in user.css instead of keeping stale values.
	// Called synchronously right before the new values are set (cached path),
	// so there is no paint in between and no visible flash.
	function resetTrackVisuals() {
		document.documentElement.style.removeProperty("--track-accent");
		document.documentElement.style.removeProperty("--track-bpm-ms");
		clearTempoMarkers();
	}

	function setupNowPlayingPulse() {
		// Track data (cover color + audio-features) is fetched and cached on
		// every track change regardless of settings.pulse: lastAudioFeatures
		// also feeds the tempo markers, the visualizer's fallback and the
		// palette's `stats`, which each check their own setting. Only the
		// pulse's CSS custom properties are gated on settings.pulse, in
		// applyPulseVisuals() — which the settings toggle also calls, so
		// flipping the pulse at runtime takes effect on the current track.
		function apply(uri) {
			// Set before anything else (and regardless of settings.pulse) so
			// in-flight responses for the previous track see they're stale.
			currentTrackUri = uri || null;
			lastExtractedColor = null;
			lastAudioFeatures = null;
			resetTrackVisuals();
			if (!uri) return; // nothing playing: CSS defaults, no markers

			var trackId = uri.split(":")[2];
			var cached = trackDataCache[uri];
			if (cached) {
				if (cached.color) lastExtractedColor = cached.color;
				if (cached.features) lastAudioFeatures = cached.features;
				applyPulseVisuals();
				renderTempoMarkers();
				return; // already fetched this track this session — no network needed
			}
			trackDataCache[uri] = {};

			if (window.Spicetify.colorExtractor) {
				Spicetify.colorExtractor(uri)
					.then(function (colors) {
						var accent = (colors && (colors.VIBRANT || colors.PROMINENT || colors.LIGHT_VIBRANT)) || null;
						if (!accent) return;
						trackDataCache[uri].color = accent;
						if (!isCurrentTrack(uri)) return; // skipped meanwhile: cache only
						lastExtractedColor = accent;
						applyPulseVisuals();
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
						trackDataCache[uri].features = data;
						if (!isCurrentTrack(uri)) return; // skipped meanwhile: cache only
						lastAudioFeatures = data;
						applyPulseVisuals();
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
			apply(item && item.uri);
		});

		if (Spicetify.Player.data && Spicetify.Player.data.item) {
			apply(Spicetify.Player.data.item.uri);
		}
	}

	// Writes the pulse's CSS custom properties from the current track data
	// (lastExtractedColor / lastAudioFeatures), or removes them when the
	// pulse is disabled so user.css falls back to terminal green / 2.4s.
	// Safe to call at any time: with data still missing it just sets what
	// it has, and it is idempotent (mood tint is recomputed from the raw
	// extracted color, never from the already-tinted value).
	function applyPulseVisuals() {
		var style = document.documentElement.style;
		if (!settings.pulse) {
			style.removeProperty("--track-accent");
			style.removeProperty("--track-bpm-ms");
			return;
		}
		if (lastExtractedColor) style.setProperty("--track-accent", lastExtractedColor);
		var tempo = lastAudioFeatures && lastAudioFeatures.tempo;
		if (tempo && tempo > 20 && tempo < 300) {
			// 2 beats per breathing cycle — max-intensity pass: faster,
			// more visibly "alive" than the original 4-beat cycle.
			style.setProperty("--track-bpm-ms", Math.round((60000 / tempo) * 2) + "ms");
		}
		if (lastExtractedColor && lastAudioFeatures) applyMoodTint(lastAudioFeatures);
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

			// Spicetify virtualizes track lists / card grids and *recycles*
			// row DOM on scroll: the same container (and often the same <img>)
			// gets a new src while an earlier probe is still in flight. Loads
			// can resolve out of order (old, slow src landing after the new,
			// fast one), which used to paint the previous row's cover onto the
			// recycled row. container._terminalAsciiSrc doubles as the "which
			// src is this container supposed to show" token: a probe only draws
			// if it's still the requested src AND the live <img> still points
			// at it. Pure DOM/JS, no platform-specific behavior.
			function isStale() {
				if (container._terminalAsciiSrc !== srcUrl) return true;
				var liveImg = container.querySelector("img");
				if (!liveImg) return true;
				return (liveImg.currentSrc || liveImg.src) !== srcUrl && liveImg.src !== srcUrl;
			}

			var probe = new Image();
			probe.crossOrigin = "anonymous";
			probe.onload = function () {
				if (isStale()) return;
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
				// Only clear the token if it's still ours — a stale probe's
				// failure mustn't force a redundant re-render of the new src.
				if (container._terminalAsciiSrc !== srcUrl) return;
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
				// Class-based clip instead of a `:has(> .terminal-ascii-art)`
				// rule: a bare :has() subject is tested against every element
				// on every style change, which showed up at the top of the
				// selector cost profile.
				container.classList.add("terminal-ascii-host");
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
		Spicetify.Player.addEventListener("appchange", function () { afterPaint(renderWithRetries); });
		// Spicetify.Platform.History can still be unready at this exact
		// point even though Spicetify.Player already is (the two ready up
		// independently) — a one-shot truthiness check here would then
		// silently skip attaching the listener forever. waitFor retries
		// until it's actually there.
		waitFor(
			function () { return Spicetify.Platform && Spicetify.Platform.History && Spicetify.Platform.History.listen; },
			function () { tfListenHistory(renderWithRetries); }
		);

		// Belt-and-suspenders catch-all: shelf content on Home/Search often
		// finishes an async fetch and mounts well after both the route
		// change and the retry window above. Observe the main view for any
		// subtree growth and re-scan, debounced so a big list mount (e.g.
		// scrolling Liked Songs) only triggers one pass. Also watches img
		// src/srcset attribute changes: recycled virtualized rows keep the
		// same <img> node and just swap its src, which a childList-only
		// observer never sees — the row would keep the previous cover's art.
		var mainView = document.querySelector(".Root__main-view") || document.querySelector("#main") || document.body;
		var mutTimer = null;
		new MutationObserver(function () {
			clearTimeout(mutTimer);
			mutTimer = setTimeout(renderAll, 250);
		}).observe(mainView, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "srcset"] });

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
				tfListenHistory(function (location) {
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
	// Full conversion ("mode terminal complet") — re-skins the whole client
	// so it reads as a terminal OS instead of Spotify. Every rule lives
	// under html.terminal-full in user.css; this section only adds what CSS
	// can't do on its own. Turning the setting off removes the class and
	// calls each part's teardown, restoring the v1.2.0 look exactly.
	// Native Spotify nodes are never moved or removed — only restyled,
	// annotated (data-* / classes) or overlaid — so playback, menus and
	// Spicetify APIs that click native buttons keep working.
	// =======================================================================
	// fullConversionParts is declared near `settings` (top of file) so it
	// exists even when the init waitFor fires synchronously.

	function setupFullConversion() {
		// Deferred one tick: on the real client Spicetify.Player exists as
		// soon as this file runs, so the init waitFor fires synchronously —
		// before the FULL/* sections further down have registered their
		// parts. Applying right away ran an empty list (CSS on, every JS
		// part — pane titles, header metadata, playback sync, branding —
		// silently missing). By the next tick the whole file has executed.
		setTimeout(applyFullConversionSetting, 0);
	}

	function applyFullConversionSetting() {
		var on = !!settings.fullConversion;
		document.documentElement.classList.toggle("terminal-full", on);
		var pip = window.documentPictureInPicture && window.documentPictureInPicture.window;
		if (pip && settings.miniPlayerTheme) {
			var old = pip.document.getElementById("terminal-mini-player-style");
			if (old) old.parentNode.removeChild(old);
			injectMiniPlayerStyle(pip);
		}
		fullConversionParts.forEach(function (part) {
			try {
				if (on) part.setup();
				else if (part.teardown) part.teardown();
			} catch (e) {
				/* one part failing must not take the others (or the app) down */
			}
		});
	}

	// --- FULL/SHELL: layout, top bar, library (agent A) -------------------
	// The shell itself (tmux-style panes, prompt top bar, file-tree
	// library) is pure CSS under html.terminal-full. The only thing CSS
	// can't know is *where* the user is and *who* they are, so this part
	// publishes two strings as custom properties on <html>, read by
	// `content: var(...)` in user.css:
	//   --tf-main-title  "[1:~/playlist/Chill Mix]"  main pane title bar
	//   --tf-prompt      "hugo@terminal:~/playlist$"  top-bar prompt
	// Custom properties on <html> rather than data-* attributes on
	// Spotify's own nodes on purpose: React re-creates .Root__main-view /
	// the global nav subtree on some layout changes, which would silently
	// drop an attribute, while <html> is never re-rendered. It also keeps
	// teardown trivial (two removeProperty calls) and touches zero native
	// DOM.
	//
	// Cost: one History.listen callback per navigation plus at most four
	// short timed re-reads of the page name (Spotify renders the new page's
	// heading a few frames after the route changes). No MutationObserver.
	var shellState = { on: false, unlisten: null, keptListener: false, timers: [], navSeq: 0, lastName: "" };

	// Routes whose second segment is an opaque id that reads better as the
	// page's own name: /playlist/37i9dQZF1DX... -> ~/playlist/Chill Mix.
	var SHELL_NAMED_ROUTES = {
		playlist: 1, album: 1, artist: 1, show: 1, episode: 1, user: 1,
		genre: 1, track: 1, audiobook: 1, concert: 1, prerelease: 1
	};

	// Friendlier names for a few top-level routes whose raw path would be
	// cryptic (collection/tracks is Liked Songs, preferences is Settings).
	var SHELL_ROUTE_ALIASES = {
		"collection/tracks": "~/liked-songs",
		"collection/episodes": "~/episodes",
		"collection": "~/library",
		"preferences": "~/settings",
		"lyrics": "~/lyrics",
		"queue": "~/queue"
	};

	// Quote a JS string as a CSS <string> for `content:`. Backslashes and
	// quotes are escaped; newlines collapse to spaces (a raw newline would
	// end the string and invalidate the whole declaration).
	function shellCssString(s) {
		return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]+/g, " ") + '"';
	}

	function shellClip(s, max) {
		s = String(s || "").replace(/\s+/g, " ").trim();
		return s.length > max ? s.slice(0, max - 1) + "…" : s;
	}

	// Current page's human name. Spotify labels its <main> landmark
	// "Spotify – <page name>" on every route (see the main[tabindex="-1"]
	// note near :focus-visible in user.css) — the cheapest, locale-correct
	// source. The page's own <h1> is the fallback.
	function shellPageName() {
		var name = "";
		try {
			var main = document.querySelector(".Root__main-view main[aria-label]") || document.querySelector("main[aria-label]");
			if (main) name = main.getAttribute("aria-label") || "";
			name = name.replace(/^\s*Spotify\s*[\u2013\u2014\-:|]\s*/i, "");
			if (/^spotify$/i.test(name.trim())) name = "";
			if (!name) {
				var h1 = document.querySelector(".Root__main-view h1");
				if (h1) name = h1.textContent || "";
			}
		} catch (e) {
			name = "";
		}
		return shellClip(name, 40);
	}

	function shellSafeDecode(s) {
		try {
			return decodeURIComponent(s);
		} catch (e) {
			return s;
		}
	}

	// pathname -> { dir: "~/playlist", path: "~/playlist/Chill Mix" }.
	// `dir` (first segment only) feeds the short top-bar prompt, `path`
	// the main pane title.
	function shellRoute(pathname, pageName) {
		var segs = String(pathname || "/").split(/[?#]/)[0].split("/").filter(Boolean).map(shellSafeDecode);
		if (!segs.length) return { dir: "~/home", path: "~/home" };
		var two = segs.slice(0, 2).join("/");
		if (SHELL_ROUTE_ALIASES[two]) return { dir: SHELL_ROUTE_ALIASES[two], path: SHELL_ROUTE_ALIASES[two] };
		var kind = segs[0];
		if (SHELL_ROUTE_ALIASES[kind] && segs.length === 1) return { dir: SHELL_ROUTE_ALIASES[kind], path: SHELL_ROUTE_ALIASES[kind] };
		var dir = "~/" + shellClip(kind, 20);
		if (SHELL_NAMED_ROUTES[kind]) {
			// Ids are opaque; the page's own name is what the user recognizes.
			// Extra segments after the id (e.g. /artist/<id>/discography) are
			// kept as a readable suffix.
			var tail = segs.slice(2).join("/");
			var shown = pageName || (segs[1] ? shellClip(segs[1], 12) : "");
			return { dir: dir, path: shellClip(dir + (shown ? "/" + shown : "") + (tail ? "/" + tail : ""), 64) };
		}
		// search/<query>/<tab> and friends are already human-readable.
		return { dir: dir, path: shellClip("~/" + segs.join("/"), 64) };
	}

	function shellUserName() {
		var n = currentDisplayName();
		// Shell-style login: lower case, no spaces ("Hugo Ban" -> hugo-ban).
		n = String(n).toLowerCase().replace(/\s+/g, "-").replace(/[^\w.\-\u00C0-\u024F]/g, "");
		return shellClip(n || "user", 20);
	}

	function shellCurrentPath() {
		try {
			var loc = Spicetify.Platform && Spicetify.Platform.History && Spicetify.Platform.History.location;
			if (loc && typeof loc.pathname === "string") return loc.pathname;
		} catch (e) {
			/* History not ready — fall through to home */
		}
		return "/";
	}

	function shellApplyTitles(pathname, pageName) {
		if (!shellState.on) return;
		var route = shellRoute(pathname, pageName);
		// Kept in JS, not as custom properties on <html>: every write to a
		// root custom property restyles the entire app (all inherit it), and
		// this ran up to five times per navigation — measured as multi-second
		// freezes on a large page. The pane-title layer reads mainTitle from
		// here; the prompt vars go on the prompt's own small element.
		shellState.mainTitle = "[1:" + route.path + "]";
		var host = document.querySelector(".main-globalNav-historyButtons");
		if (host) {
			var full = shellCssString(shellUserName() + "@terminal:" + route.dir + "$");
			var short = shellCssString(route.dir + "$");
			if (host.style.getPropertyValue("--tf-prompt") !== full) host.style.setProperty("--tf-prompt", full);
			if (host.style.getPropertyValue("--tf-prompt-short") !== short) host.style.setProperty("--tf-prompt-short", short);
			shellState.promptHost = host;
		}
		schedulePaneTitles();
	}

	function shellClearTimers() {
		for (var i = 0; i < shellState.timers.length; i++) clearTimeout(shellState.timers[i]);
		shellState.timers = [];
	}

	// Title right away from the path alone (never shows a stale name), then
	// re-read the page name a few times as the new page mounts. A name equal
	// to the previous page's is treated as "not rendered yet" except on the
	// last attempt (two pages can legitimately share a name).
	function shellOnNavigate(pathname) {
		if (!shellState.on) return;
		shellClearTimers();
		var seq = ++shellState.navSeq;
		var previousName = shellState.lastName || "";
		shellApplyTitles(pathname, "");
		var kind = String(pathname || "").split("/").filter(Boolean)[0];
		if (!SHELL_NAMED_ROUTES[kind]) {
			shellState.lastName = "";
			return;
		}
		var delays = [120, 400, 1000, 2400];
		delays.forEach(function (ms, i) {
			shellState.timers.push(setTimeout(function () {
				if (!shellState.on || seq !== shellState.navSeq) return;
				var name = shellPageName();
				var last = i === delays.length - 1;
				if (!name || (name === previousName && !last)) return;
				shellState.lastName = name;
				shellApplyTitles(pathname, name);
			}, ms));
		});
	}

	function setupFullShell() {
		if (shellState.on) return; // setup can run again on every toggle-on
		shellState.on = true;
		shellOnNavigate(shellCurrentPath());
		waitFor(
			function () { return Spicetify.Platform && Spicetify.Platform.History && Spicetify.Platform.History.listen; },
			function () {
				// Torn down (or re-set-up) while we were still waiting.
				if (!shellState.on || shellState.unlisten || shellState.keptListener) return;
				var off = tfListenHistory(function (location) {
					if (!shellState.on) return;
					shellOnNavigate((location && location.pathname) || (location && location.location && location.location.pathname) || shellCurrentPath());
				});
				// history v4/v5 return an unlisten function. Should a build
				// ever not, the listener stays attached but inert (it checks
				// shellState.on first) and is never attached a second time.
				if (typeof off === "function") shellState.unlisten = off;
				else shellState.keptListener = true;
				// The display name may only have been ready now.
				shellOnNavigate(shellCurrentPath());
			}
		);
	}

	function teardownFullShell() {
		shellState.on = false;
		shellState.navSeq++;
		shellClearTimers();
		if (shellState.unlisten) {
			try {
				shellState.unlisten();
			} catch (e) {
				/* already detached */
			}
		}
		shellState.unlisten = null;
		shellState.lastName = "";
		shellState.mainTitle = "";
		var host = shellState.promptHost;
		if (host) {
			host.style.removeProperty("--tf-prompt");
			host.style.removeProperty("--tf-prompt-short");
			if (host.getAttribute("style") === "") host.removeAttribute("style");
			shellState.promptHost = null;
		}
	}

	fullConversionParts.push({ setup: setupFullShell, teardown: teardownFullShell });
	// Pane titles ([0:~/library] [1:~/…] [2:now-playing]) are drawn in our
	// own fixed layer, positioned from each pane's measured rect, rather
	// than as ::before pseudo-elements on Spotify's panes. A pseudo-element
	// only lands in the title bar if the pane's internal layout matches what
	// we expect; on the real client it could end up over the pane content
	// and overlap its text. Measuring the rect makes the position exact
	// whatever Spotify's markup, and the layer never takes clicks.
	var paneTitles = null; // { root, labels: {nav, main, right}, ro, timer, onResize, onOver }

	function layoutPaneTitles() {
		if (!paneTitles) return;
		var html = document.documentElement;
		var panes = {
			nav: document.querySelector(".Root__nav-bar"),
			main: document.querySelector(".Root__main-view"),
			right: document.querySelector(".Root__right-sidebar")
		};
		var hovered = paneTitles.hovered;
		Object.keys(panes).forEach(function (k) {
			var el = panes[k], label = paneTitles.labels[k];
			var r = el && el.getBoundingClientRect();
			var visible = !!(r && r.width > 40 && r.height > 40);
			if (visible && k === "right") {
				var aside = el.querySelector("aside");
				visible = !!(aside && aside.children.length);
			}
			label.style.display = visible ? "" : "none";
			if (!visible) return;
			// Read from inline style / the DOM, never getComputedStyle: that
			// forces a full style recalc whenever anything is dirty, which on
			// a 500ms poll made the whole client stutter.
			var text;
			if (k === "nav") text = r.width < 120 ? "[0]" : "[0:~/library]";
			else if (k === "main") text = shellState.mainTitle || "[1:~/home]";
			else if (el.querySelector("#queue-panel, [data-testid=\"queue-page\"]")) text = "[2:queue]";
			else if (el.querySelector("[data-testid=\"buddy-feed\"]")) text = "[2:friends]";
			else text = "[2:now-playing]";
			if (label.textContent !== text) label.textContent = text;
			label.style.transform = "translate(" + Math.round(r.left + 6) + "px," + Math.round(r.top + 3) + "px)";
			label.style.maxWidth = Math.max(0, Math.round(r.width - 12)) + "px";
			label.classList.toggle("is-active", hovered === k);
		});
	}

	function schedulePaneTitles() {
		if (!paneTitles || paneTitles.raf) return;
		paneTitles.raf = requestAnimationFrame(function () {
			if (!paneTitles) return;
			paneTitles.raf = 0;
			layoutPaneTitles();
		});
	}

	function setupPaneTitles() {
		if (paneTitles) return;
		var root = document.createElement("div");
		root.id = "tf-pane-titles";
		root.setAttribute("aria-hidden", "true");
		var labels = {};
		["nav", "main", "right"].forEach(function (k) {
			var s = document.createElement("span");
			s.className = "tf-pane-title tf-pane-title-" + k;
			root.appendChild(s);
			labels[k] = s;
		});
		document.body.appendChild(root);
		paneTitles = { root: root, labels: labels, hovered: null, raf: 0 };
		paneTitles.onResize = schedulePaneTitles;
		window.addEventListener("resize", paneTitles.onResize);
		paneTitles.onOver = function (e) {
			var t = e.target, k = null;
			if (t && t.closest) {
				if (t.closest(".Root__nav-bar")) k = "nav";
				else if (t.closest(".Root__main-view")) k = "main";
				else if (t.closest(".Root__right-sidebar")) k = "right";
			}
			if (k !== paneTitles.hovered) {
				paneTitles.hovered = k;
				schedulePaneTitles();
			}
		};
		document.addEventListener("pointerover", paneTitles.onOver, true);
		if (window.ResizeObserver) {
			paneTitles.ro = new ResizeObserver(schedulePaneTitles);
			[".Root__nav-bar", ".Root__main-view", ".Root__right-sidebar"].forEach(function (sel) {
				var el = document.querySelector(sel);
				if (el) paneTitles.ro.observe(el);
			});
		}
		// Titles also change on navigation and when the right panel switches
		// content; a slow poll covers both without a MutationObserver on the
		// whole app (it only writes when something actually changed).
		paneTitles.timer = setInterval(schedulePaneTitles, 1000);
		layoutPaneTitles();
	}

	function teardownPaneTitles() {
		if (!paneTitles) return;
		window.removeEventListener("resize", paneTitles.onResize);
		document.removeEventListener("pointerover", paneTitles.onOver, true);
		if (paneTitles.ro) paneTitles.ro.disconnect();
		clearInterval(paneTitles.timer);
		if (paneTitles.raf) cancelAnimationFrame(paneTitles.raf);
		if (paneTitles.root.parentNode) paneTitles.root.parentNode.removeChild(paneTitles.root);
		paneTitles = null;
	}

	fullConversionParts.push({ setup: setupPaneTitles, teardown: teardownPaneTitles });
	// --- END FULL/SHELL ----------------------------------------------------

	// --- FULL/PLAYER: status line, right sidebar, fullscreen (agent B) ----
	// The status line (user.css FULL/PLAYER) is almost all CSS. The one thing
	// CSS can't read reliably is playback state: Spotify renders play vs
	// pause as two different SVG paths, and the only other signal on the
	// button is a localized aria-label ("Play", "Lecture", …). Matching
	// either one is exactly what the brief rules out (path[d], localized
	// labels). Shuffle/repeat do carry aria-checked in current builds, but
	// that has moved between builds (class-only state in some), so this
	// mirrors all four from Spicetify.Player onto <html> as data-* attributes:
	//   data-tf-playback = playing | paused   (drives [ ▶ ] / [ ❚❚ ] and the
	//                                           mode tag)
	//   data-tf-shuffle  = 1 | 0
	//   data-tf-repeat   = 0 | 1 | 2          (2 = repeat one → ↻¹)
	//   data-tf-muted    = 1 | 0              ("vol" / "mute")
	// The CSS reads them alongside the native attributes (either one turns a
	// state on), and falls back to the native SVG when they're absent, so a
	// Spicetify API change degrades to "Spotify's icon in brackets", never
	// to a blank button.
	// Same attributes go onto the mini-player's document when it's open
	// (Document PiP is a separate document with its own <html>), so
	// FULL_PLAYER_PIP_CSS below can show the same glyphs there.
	// Updated on the player's own events (onplaypause, songchange), right
	// after a click on a transport / mute button (shuffle/repeat/mute have
	// no event), and by a cheap 1.5s poll that catches keyboard shortcuts
	// and changes made from another device. Every write is skipped when the
	// value is unchanged, so the poll causes no style recalcs.
	var fullPlayer = { active: false, timer: null, onEvent: null, onClick: null, onPipEnter: null };
	var FULL_PLAYER_ATTRS = ["data-tf-playback", "data-tf-shuffle", "data-tf-repeat", "data-tf-muted"];

	function fullPlayerRoots() {
		// The state goes on the playbar itself, not <html>: every consumer
		// lives inside the bar, and an attribute change on <html> restyles
		// the whole app on each play/pause/shuffle. The mini player is a
		// separate small document, so its root is fine.
		var bar = document.querySelector(".Root__now-playing-bar");
		var roots = [bar || document.documentElement];
		try {
			var pip = window.documentPictureInPicture && window.documentPictureInPicture.window;
			if (pip && pip.document && pip.document.documentElement) roots.push(pip.document.documentElement);
		} catch (e) {
			/* PiP window closing mid-call — just skip it */
		}
		return roots;
	}

	function fullPlayerSetAttr(roots, name, value) {
		for (var i = 0; i < roots.length; i++) {
			if (value === null) {
				if (roots[i].hasAttribute(name)) roots[i].removeAttribute(name);
			} else if (roots[i].getAttribute(name) !== value) {
				roots[i].setAttribute(name, value);
			}
		}
	}

	function fullPlayerSync() {
		if (!fullPlayer.active) return;
		var P = window.Spicetify && Spicetify.Player;
		if (!P) return;
		var roots = fullPlayerRoots();
		try {
			var paused = null;
			if (P.data && typeof P.data.isPaused === "boolean") paused = P.data.isPaused;
			else if (typeof P.isPlaying === "function") paused = !P.isPlaying();
			var hasItem = !!(P.data && P.data.item);
			// Nothing loaded: no attribute, so the mode tag reads "idle" and
			// the play button keeps its native icon.
			fullPlayerSetAttr(roots, "data-tf-playback", !hasItem || paused === null ? null : paused ? "paused" : "playing");
			if (typeof P.getShuffle === "function") fullPlayerSetAttr(roots, "data-tf-shuffle", P.getShuffle() ? "1" : "0");
			if (typeof P.getRepeat === "function") {
				var r = Number(P.getRepeat()) || 0;
				fullPlayerSetAttr(roots, "data-tf-repeat", String(r > 2 ? 2 : r < 0 ? 0 : r));
			}
			if (typeof P.getMute === "function") fullPlayerSetAttr(roots, "data-tf-muted", P.getMute() ? "1" : "0");
		} catch (e) {
			/* a Player getter throwing must not break the poll */
		}
	}

	function setupFullPlayer() {
		if (fullPlayer.active) return; // parts can be set up again on every toggle
		fullPlayer.active = true;
		var P = window.Spicetify && Spicetify.Player;

		fullPlayer.onEvent = function () {
			// songchange fires before Player.data reflects the new item on
			// some builds; one frame later it's settled.
			setTimeout(fullPlayerSync, 0);
		};
		if (P && typeof P.addEventListener === "function") {
			P.addEventListener("onplaypause", fullPlayer.onEvent);
			P.addEventListener("songchange", fullPlayer.onEvent);
		}

		fullPlayer.onClick = function (e) {
			var t = e.target;
			if (!t || !t.closest) return;
			if (t.closest('[data-testid^="control-button-"], [data-testid="volume-bar-toggle-mute-button"]')) {
				setTimeout(fullPlayerSync, 120);
			}
		};
		document.addEventListener("click", fullPlayer.onClick, true);

		if (window.documentPictureInPicture && window.documentPictureInPicture.addEventListener) {
			fullPlayer.onPipEnter = function () { setTimeout(fullPlayerSync, 60); };
			window.documentPictureInPicture.addEventListener("enter", fullPlayer.onPipEnter);
		}

		fullPlayer.timer = setInterval(fullPlayerSync, 1500);
		fullPlayerSync();
	}

	function teardownFullPlayer() {
		if (!fullPlayer.active) return;
		fullPlayer.active = false;
		var P = window.Spicetify && Spicetify.Player;
		if (P && typeof P.removeEventListener === "function" && fullPlayer.onEvent) {
			P.removeEventListener("onplaypause", fullPlayer.onEvent);
			P.removeEventListener("songchange", fullPlayer.onEvent);
		}
		// Without removeEventListener the handler stays registered, but it
		// only schedules fullPlayerSync, which returns early while inactive.
		fullPlayer.onEvent = null;
		if (fullPlayer.onClick) document.removeEventListener("click", fullPlayer.onClick, true);
		fullPlayer.onClick = null;
		if (fullPlayer.onPipEnter && window.documentPictureInPicture) {
			window.documentPictureInPicture.removeEventListener("enter", fullPlayer.onPipEnter);
		}
		fullPlayer.onPipEnter = null;
		clearInterval(fullPlayer.timer);
		fullPlayer.timer = null;
		var roots = fullPlayerRoots().concat([document.documentElement]);
		FULL_PLAYER_ATTRS.forEach(function (name) { fullPlayerSetAttr(roots, name, null); });
	}

	fullConversionParts.push({ setup: setupFullPlayer, teardown: teardownFullPlayer });

	// Mini player (Document PiP) in full-conversion mode. user.css never
	// reaches that document, and injectMiniPlayerStyle() (outside this
	// section) only recolors it. This is the status line look for it, meant
	// to be appended to that style tag when html.terminal-full is on:
	// square everything, bracketed play button, glyph transport, and the
	// block seek/volume bars. The PiP document can't see the main page's
	// :root variables, so the palette is restated here, with the same values
	// as user.css :root, which is also what injectMiniPlayerStyle already does.
	// Play/pause glyphs use the data-tf-playback attribute that
	// fullPlayerSync() also writes onto the PiP <html>; until it lands, the
	// native icon shows between the brackets.
	var FULL_PLAYER_PIP_CSS = [
		":root {",
		"  --term-bg: #15171c; --term-bg-tinted: #1a1c22; --term-bg-hi: #1f2229;",
		"  --term-text: #e6e6e6; --term-subdued: #8a93a6; --term-border: #2b2e38;",
		"  --term-green: #5ebdab;",
		"}",
		"*, *::before, *::after { border-radius: 0 !important; }",
		"body { background: var(--term-bg) !important; }",
		"img { outline: 1px solid var(--term-border); outline-offset: -1px; }",
		":is([data-testid=\"control-button-shuffle\"], [data-testid=\"control-button-skip-back\"], [data-testid=\"control-button-skip-forward\"], [data-testid=\"control-button-repeat\"]) {",
		"  min-width: 32px; height: 32px; display: inline-flex !important; align-items: center; justify-content: center;",
		"  background: transparent !important; border: 1px solid transparent !important; color: var(--term-subdued) !important;",
		"  font-size: 16px; line-height: 1; transform: none !important; transition: color 120ms, background-color 120ms;",
		"}",
		":is([data-testid=\"control-button-shuffle\"], [data-testid=\"control-button-skip-back\"], [data-testid=\"control-button-skip-forward\"], [data-testid=\"control-button-repeat\"]) svg { display: none !important; }",
		"[data-testid=\"control-button-shuffle\"]::before { content: \"⤮\"; }",
		"[data-testid=\"control-button-skip-back\"]::before { content: \"⏮\\FE0E\"; }",
		"[data-testid=\"control-button-skip-forward\"]::before { content: \"⏭\\FE0E\"; }",
		"[data-testid=\"control-button-repeat\"]::before { content: \"↻\"; }",
		"[data-testid=\"control-button-repeat\"][aria-checked=\"mixed\"]::before, html[data-tf-repeat=\"2\"] [data-testid=\"control-button-repeat\"]::before { content: \"↻¹\"; }",
		":is([data-testid=\"control-button-shuffle\"], [data-testid=\"control-button-skip-back\"], [data-testid=\"control-button-skip-forward\"], [data-testid=\"control-button-repeat\"])::after { display: none !important; }",
		":is([data-testid=\"control-button-shuffle\"], [data-testid=\"control-button-skip-back\"], [data-testid=\"control-button-skip-forward\"], [data-testid=\"control-button-repeat\"]):hover { color: var(--term-text) !important; background-color: var(--term-bg-hi) !important; }",
		":is([data-testid=\"control-button-shuffle\"], [data-testid=\"control-button-repeat\"]):is([aria-checked=\"true\"], [aria-checked=\"mixed\"]),",
		"html[data-tf-shuffle=\"1\"] [data-testid=\"control-button-shuffle\"],",
		"html:is([data-tf-repeat=\"1\"], [data-tf-repeat=\"2\"]) [data-testid=\"control-button-repeat\"] {",
		"  color: var(--term-bg) !important; background-color: var(--term-green) !important;",
		"}",
		"[data-testid=\"control-button-playpause\"] {",
		"  width: auto !important; min-width: 64px; height: 32px; padding: 0 8px !important; gap: 2px;",
		"  display: inline-flex !important; align-items: center; justify-content: center;",
		"  background: transparent !important; border: 1px solid var(--term-green) !important; color: var(--term-green) !important;",
		"  font-size: 14px; font-weight: 700; line-height: 1; transform: none !important; box-shadow: none !important;",
		"}",
		"[data-testid=\"control-button-playpause\"]::before { content: \"[\"; }",
		"[data-testid=\"control-button-playpause\"]::after { content: \"]\"; }",
		"[data-testid=\"control-button-playpause\"] > span { display: inline-flex !important; align-items: center; justify-content: center; min-width: 3ch; width: auto !important; height: auto !important; background: transparent !important; color: inherit !important; }",
		"[data-testid=\"control-button-playpause\"] svg { fill: currentColor; }",
		"html[data-tf-playback] [data-testid=\"control-button-playpause\"] > span > * { display: none !important; }",
		"html[data-tf-playback] [data-testid=\"control-button-playpause\"] > span::before { content: \"▶\\FE0E\"; }",
		"html[data-tf-playback=\"playing\"] [data-testid=\"control-button-playpause\"] > span::before { content: \"❚❚\"; }",
		"[data-testid=\"control-button-playpause\"]:hover { color: var(--term-bg) !important; background-color: var(--term-green) !important; }",
		":is([data-testid=\"progress-bar-background\"], .x-progressBar-progressBarBg, .x-progressBar-background) {",
		"  height: 8px !important; background-color: var(--term-border) !important;",
		"  -webkit-mask-image: repeating-linear-gradient(90deg, var(--term-bg) 0 6px, transparent 6px 8px);",
		"  mask-image: repeating-linear-gradient(90deg, var(--term-bg) 0 6px, transparent 6px 8px);",
		"}",
		":is(.x-progressBar-fillColor, .x-progressBar-foreground, .x-progressBar-progressFillColor) { background-color: var(--term-green) !important; }",
		"[data-testid=\"progress-bar-handle\"] { width: 4px !important; height: 14px !important; background-color: var(--term-text) !important; box-shadow: none !important; }"
	].join("\n");
	// --- END FULL/PLAYER ---------------------------------------------------

	// --- FULL/PAGES: home, search, headers, tracklists (agent C) ----------
	// Two things in the main view that CSS alone can't express:
	//
	// 1. Entity header metadata as `key: value` lines. Spotify renders
	//    "owner • 50 songs, 3 h 20 min" as a row of sibling pieces with no
	//    per-piece hook, and the keys we want (owner / year / tracks...)
	//    aren't in the DOM at all. So each native piece gets a
	//    data-tf-key attribute (read by CSS via attr()) and the container
	//    gets data-tf-meta — CSS only switches to the one-per-line layout
	//    when that marker exists, so if classification ever fails the
	//    header just keeps its native inline look. Nothing is moved, split
	//    or re-texted: the owner link stays the same clickable node.
	//    Classification is by structure first (links to /user/ or
	//    /artist/), then by shape of the text (a 4-digit year, "N x, d"),
	//    so it holds across UI languages.
	//
	// 2. The action-bar play label: `[ ▶ lire ]` vs `[ ❚❚ pause ]`. The
	//    native icon already flips on its own; the word needs to know
	//    whether THIS page's context is the one playing. That comes from
	//    comparing the route (/playlist/<id> -> spotify:playlist:<id>) with
	//    Player.data.context; routes we can't map get no attribute and CSS
	//    falls back to a neutral "lecture" rather than guessing wrong.
	//
	// One MutationObserver on .Root__main-view (childList only — never
	// attributes, so our own data-* writes can't retrigger it), coalesced
	// into at most one scan per 180ms; each scan is two small
	// querySelectorAll calls over a handful of nodes, and attributes are
	// only written when their value actually changes.
	var tfPages = {
		active: false,
		observer: null,
		timer: 0,
		rootTimer: 0,
		onPlayer: null
	};

	var TF_PAGES_PLAY_SELECTOR =
		".Root__main-view .main-actionBar-ActionBarPlayButtonContainer button, " +
		".Root__main-view .main-actionBar-ActionBarRow [data-testid=\"play-button\"]";

	function tfPagesSchedule() {
		if (!tfPages.active || tfPages.timer) return;
		tfPages.timer = setTimeout(function () {
			tfPages.timer = 0;
			tfPagesScan();
		}, 180);
	}

	function tfPagesScan() {
		if (!tfPages.active) return;
		try { tfAnnotateHeaderMeta(); } catch (e) { /* never let a header break the page */ }
		try { tfAnnotatePlayState(); } catch (e) { /* idem */ }
	}

	function tfMetaText(el) {
		return (el.textContent || "").replace(/[•·]/g, " ").replace(/\s+/g, " ").trim();
	}

	function tfClassifyMetaPiece(el) {
		var text = tfMetaText(el);
		if (!text) return "sep";
		if (el.matches("a[href*=\"/user/\"]") || el.querySelector("a[href*=\"/user/\"], [data-testid=\"creator-link\"]")) return "owner";
		if (el.matches("a[href*=\"/artist/\"]") || el.querySelector("a[href*=\"/artist/\"]")) return "artist";
		if (el.matches("a[href*=\"/show/\"]") || el.querySelector("a[href*=\"/show/\"]")) return "show";
		if (/^\d{4}$/.test(text)) return "year";
		if (/\d/.test(text) && /(like|save|j.aime|enregistr|sauvegard|guardad|gespeichert|me gusta|mi piace)/i.test(text)) return "saves";
		if (/\d/.test(text) && /,/.test(text)) return "tracks";
		if (/^(~|≈|about|environ|ca\.?|unos|circa)?\s*[\d\s:]+(h|hr|hrs|min|s|sec)\b/i.test(text)) return "duration";
		if (/\d/.test(text)) return "tracks";
		return "info";
	}

	function tfAnnotateHeaderMeta() {
		var metas = document.querySelectorAll(".Root__main-view .main-entityHeader-metaData");
		for (var i = 0; i < metas.length; i++) {
			var meta = metas[i];
			var pieces = meta.children;
			// Some builds wrap every piece in one extra span; look through it.
			if (pieces.length === 1 && pieces[0].children.length > 1) pieces = pieces[0].children;
			var labelled = 0;
			for (var j = 0; j < pieces.length; j++) {
				var key = tfClassifyMetaPiece(pieces[j]);
				if (pieces[j].getAttribute("data-tf-key") !== key) pieces[j].setAttribute("data-tf-key", key);
				if (key !== "sep") labelled++;
			}
			if (labelled) {
				if (meta.getAttribute("data-tf-meta") !== "1") meta.setAttribute("data-tf-meta", "1");
			} else {
				meta.removeAttribute("data-tf-meta");
			}
		}
	}

	// true / false when we know whether this page is the playing context,
	// null when the route isn't one we can map.
	function tfPageIsPlayingContext() {
		var history = Spicetify.Platform && Spicetify.Platform.History;
		var path = history && history.location && history.location.pathname;
		if (!path) return null;
		var data = Spicetify.Player && Spicetify.Player.data;
		var ctx = (data && ((data.context && data.context.uri) || data.context_uri)) || "";
		var item = (data && ((data.item && data.item.uri) || (data.track && data.track.uri))) || "";
		var m = /^\/(playlist|album|artist|show|episode)\/([A-Za-z0-9]+)/.exec(path);
		if (m) {
			var uri = "spotify:" + m[1] + ":" + m[2];
			return m[1] === "episode" ? item === uri : ctx === uri;
		}
		if (/^\/collection\/tracks/.test(path)) return /:collection$/.test(ctx);
		if (/^\/collection\/your-episodes/.test(path)) return /:collection:your-episodes$/.test(ctx);
		return null;
	}

	function tfAnnotatePlayState() {
		var buttons = document.querySelectorAll(TF_PAGES_PLAY_SELECTOR);
		if (!buttons.length) return;
		var match = tfPageIsPlayingContext();
		var data = Spicetify.Player && Spicetify.Player.data;
		var state = match === null ? "" : (match && data && !data.isPaused ? "pause" : "play");
		for (var i = 0; i < buttons.length; i++) {
			if (state) {
				if (buttons[i].getAttribute("data-tf-state") !== state) buttons[i].setAttribute("data-tf-state", state);
			} else {
				buttons[i].removeAttribute("data-tf-state");
			}
		}
	}

	function tfPagesAttachObserver(attemptsLeft) {
		if (!tfPages.active) return;
		var root = document.querySelector(".Root__main-view");
		if (!root) {
			// The main view mounts after theme.js on a cold start; poll for it
			// briefly (~20s), same budget as waitFor elsewhere.
			if (attemptsLeft > 0) {
				tfPages.rootTimer = setTimeout(function () {
					tfPages.rootTimer = 0;
					tfPagesAttachObserver(attemptsLeft - 1);
				}, 200);
			}
			return;
		}
		tfPages.observer = new MutationObserver(tfPagesSchedule);
		tfPages.observer.observe(root, { childList: true, subtree: true });
		tfPagesScan();
	}

	function setupFullPages() {
		if (tfPages.active) return;
		tfPages.active = true;
		tfPages.onPlayer = function () { tfPagesSchedule(); };
		if (Spicetify.Player && Spicetify.Player.addEventListener) {
			Spicetify.Player.addEventListener("onplaypause", tfPages.onPlayer);
			Spicetify.Player.addEventListener("songchange", tfPages.onPlayer);
		}
		tfPagesAttachObserver(100);
	}

	function teardownFullPages() {
		tfPages.active = false;
		if (tfPages.observer) tfPages.observer.disconnect();
		tfPages.observer = null;
		if (tfPages.timer) clearTimeout(tfPages.timer);
		if (tfPages.rootTimer) clearTimeout(tfPages.rootTimer);
		tfPages.timer = tfPages.rootTimer = 0;
		if (tfPages.onPlayer && Spicetify.Player && Spicetify.Player.removeEventListener) {
			Spicetify.Player.removeEventListener("onplaypause", tfPages.onPlayer);
			Spicetify.Player.removeEventListener("songchange", tfPages.onPlayer);
		}
		tfPages.onPlayer = null;
		var tagged = document.querySelectorAll("[data-tf-key], [data-tf-meta], [data-tf-state]");
		for (var i = 0; i < tagged.length; i++) {
			tagged[i].removeAttribute("data-tf-key");
			tagged[i].removeAttribute("data-tf-meta");
			tagged[i].removeAttribute("data-tf-state");
		}
	}

	fullConversionParts.push({ setup: setupFullPages, teardown: teardownFullPages });
	// --- END FULL/PAGES ----------------------------------------------------

	// --- FULL/CHROME: overlays, branding, page tags (agent D) -------------
	//
	// Four independent parts, each registered on its own so one failing
	// can't take the others down (applyFullConversionSetting wraps every
	// part in its own try/catch):
	//   1. page tag   — html[data-tf-page] from Platform.History
	//   2. window title — "terminal" / "♪ Title — Artist · terminal"
	//   3. UI strings — "Spotify" → "terminal" in Spicetify.Locale
	//   4. idle title — Spicetify.AppTitle override
	// plus two things that are NOT parts because they must work in BOTH
	// modes (they're how you get back from either one): the palette's
	// `mode` command and the Ctrl+Shift+Alt+N escape hatch.
	//
	// Every setup below is idempotent (safe to call again while already
	// on), since applyFullConversionSetting runs every part's setup each
	// time it's called with the mode on.
	// ---------------------------------------------------------------------

	// ---- 1. Page tag ------------------------------------------------------
	// Sets data-tf-page on <html> so the full-conversion CSS can target a
	// page type without relying on per-page hashed classes. Values (the
	// ONLY values ever written — keep user.css selectors to this list):
	//   home        /
	//   search      /search, /search/<q>/..., /genre/... (browse)
	//   playlist    /playlist/<id>
	//   album       /album/<id>
	//   artist      /artist/<id> (and /artist/<id>/discography etc.)
	//   show        /show/<id> (podcast)
	//   episode     /episode/<id>
	//   collection  /collection/... (liked songs, your episodes, library)
	//   lyrics      /lyrics
	//   queue       /queue
	//   settings    /preferences (Spotify's settings route), /settings
	//   profile     /user/<id>
	//   other       anything else (custom apps, /history, /concert...)
	// The attribute is removed on teardown, so no rule keyed on it can
	// leak into native mode even if it forgot the html.terminal-full scope.
	var TF_PAGE_RULES = [
		[/^\/?$/, "home"],
		[/^\/(search|genre)(\/|$)/, "search"],
		[/^\/playlist\//, "playlist"],
		[/^\/album\//, "album"],
		[/^\/artist\//, "artist"],
		[/^\/show\//, "show"],
		[/^\/episode\//, "episode"],
		[/^\/collection(\/|$)/, "collection"],
		[/^\/lyrics(\/|$)/, "lyrics"],
		[/^\/queue(\/|$)/, "queue"],
		[/^\/(preferences|settings)(\/|$)/, "settings"],
		[/^\/user\//, "profile"]
	];

	function tfPageFromPath(path) {
		path = String(path || "/");
		for (var i = 0; i < TF_PAGE_RULES.length; i++) {
			if (TF_PAGE_RULES[i][0].test(path)) return TF_PAGE_RULES[i][1];
		}
		return "other";
	}

	function tfHistoryReady() {
		return Spicetify.Platform && Spicetify.Platform.History && Spicetify.Platform.History.listen;
	}

	var tfPageTag = { active: false, unlisten: null, listening: false };

	// History.listen hands over the location in the v4 shape (location,
	// action) on current builds — which is what setupPageTransitions relies
	// on — but history v5 passes ({ location, action }). Accept both, and
	// fall back to History.location for anything else.
	function tfApplyPageTag(arg) {
		if (!tfPageTag.active) return;
		var loc = arg && arg.location && typeof arg.location.pathname === "string" ? arg.location : arg;
		var path = loc && typeof loc.pathname === "string" ? loc.pathname : null;
		if (path === null) {
			try {
				path = Spicetify.Platform.History.location.pathname;
			} catch (e) {
				path = "/";
			}
		}
		document.documentElement.setAttribute("data-tf-page", tfPageFromPath(path));
	}

	fullConversionParts.push({
		setup: function () {
			tfPageTag.active = true;
			waitFor(tfHistoryReady, function () {
				if (!tfPageTag.active) return;
				var H = Spicetify.Platform.History;
				tfApplyPageTag(H.location);
				// Subscribe once. If listen() returned an unsubscribe function we
				// drop it on teardown and re-subscribe on the next setup; if it
				// didn't (older builds), the one listener stays but goes inert via
				// tfPageTag.active, and is never stacked a second time.
				if (!tfPageTag.listening) {
					var un = H.listen(function (location) { afterPaint(function () { tfApplyPageTag(location); }); });
					tfPageTag.listening = true;
					tfPageTag.unlisten = typeof un === "function" ? un : null;
				}
			});
		},
		teardown: function () {
			tfPageTag.active = false;
			if (tfPageTag.unlisten) {
				try {
					tfPageTag.unlisten();
				} catch (e) {
					/* router already gone — nothing to unsubscribe from */
				}
				tfPageTag.unlisten = null;
				tfPageTag.listening = false;
			}
			document.documentElement.removeAttribute("data-tf-page");
		}
	});

	// ---- 2. Window title --------------------------------------------------
	// document.title is what the OS shows in the title bar, taskbar and
	// alt-tab on Windows and Linux. Spotify rewrites it on every track
	// change and on every idle/playing switch, so a one-shot write isn't
	// enough: a MutationObserver on <title> re-applies our version after
	// each of Spotify's writes.
	//
	// Formats Spotify has used (and what they become):
	//   "Spotify", "Spotify Premium", "Spotify Free"   → "terminal"
	//   "Title • Artist"  (current desktop/xpui)       → "♪ Title — Artist · terminal"
	//   "Artist - Title"  (legacy desktop)             → "♪ Title — Artist · terminal"
	//   "... - Spotify" / "Spotify – ..." (web-style)  → brand stripped first
	// The order ambiguity (title first or artist first) is settled with
	// the real current track from Spicetify.Player.data when it matches
	// the string; the separator-based guess is only the fallback.
	//
	// Loop safety: every string we write ends in TF_TITLE_TAIL (or is
	// exactly "terminal"), is recorded in tfTitle.written, and the observer
	// ignores both — so our own write never triggers a second rewrite.
	var TF_TITLE_TAIL = " · terminal";
	var TF_BRAND_ONLY = /^\s*Spotify(?:\s+(?:Premium|Free|Family|Duo|Student))?\s*$/i;
	var TF_BRAND_SUFFIX = /\s+[-–—|•·:]\s+Spotify(?:\s+(?:Premium|Free))?\s*$/i;
	var TF_BRAND_PREFIX = /^\s*Spotify(?:\s+(?:Premium|Free))?\s+[-–—|•·:]\s+/i;

	function tfCurrentTrack() {
		try {
			var item = Spicetify.Player && Spicetify.Player.data && Spicetify.Player.data.item;
			if (!item) return null;
			var name = item.name || (item.metadata && item.metadata.title) || "";
			var artists = (item.artists || [])
				.map(function (a) { return a && a.name; })
				.filter(Boolean);
			if (!artists.length && item.metadata && item.metadata.artist_name) artists = [item.metadata.artist_name];
			return name ? { name: name, artists: artists } : null;
		} catch (e) {
			return null;
		}
	}

	function tfTrackTitle(name, artist) {
		return "♪ " + name + (artist ? " — " + artist : "") + TF_TITLE_TAIL;
	}

	// Pure function: raw Spotify title in, terminal title out. Returns
	// the input unchanged when there's nothing to rebrand.
	function tfRewriteTitle(raw) {
		if (typeof raw !== "string" || !raw) return raw;
		if (raw === "terminal" || raw.slice(-TF_TITLE_TAIL.length) === TF_TITLE_TAIL) return raw;
		if (TF_BRAND_ONLY.test(raw)) return "terminal";
		var s = raw.replace(TF_BRAND_SUFFIX, "").replace(TF_BRAND_PREFIX, "").trim();
		var branded = s !== raw.trim();

		var t = tfCurrentTrack();
		if (t && s.indexOf(t.name) !== -1) {
			var matched = t.artists.filter(function (a) { return s.indexOf(a) !== -1; });
			if (matched.length) return tfTrackTitle(t.name, t.artists.join(", "));
		}
		// xpui order: "Title • Artist". A title may itself contain " - "
		// ("Song - Remastered 2011 • Artist"), so the bullet wins.
		var m = /^(.+?)\s+[•·]\s+(.+)$/.exec(s);
		if (m) return tfTrackTitle(m[1], m[2]);
		// Legacy order: "Artist - Title".
		m = /^(.+?)\s+[-–—]\s+(.+)$/.exec(s);
		if (m) return tfTrackTitle(m[2], m[1]);
		if (/\bSpotify\b/.test(s)) return s.replace(/\bSpotify\b/g, "terminal");
		if (branded) return s ? s + TF_TITLE_TAIL : "terminal";
		return raw;
	}

	var tfTitle = { active: false, obs: null, headObs: null, el: null, timer: null, written: null, original: null };

	function tfTitleRun() {
		tfTitle.timer = null;
		if (!tfTitle.active) return;
		var cur = document.title;
		if (cur === tfTitle.written) return;
		var next = tfRewriteTitle(cur);
		tfTitle.original = cur;
		if (next === cur) return;
		tfTitle.written = next;
		document.title = next;
	}

	// Debounced: Spotify sometimes writes the title twice in a row on a
	// track change; one rewrite 30ms later covers both.
	function tfTitleSchedule() {
		if (tfTitle.timer) clearTimeout(tfTitle.timer);
		tfTitle.timer = setTimeout(tfTitleRun, 30);
	}

	// Observes only the <title> element itself (its text), plus <head>'s
	// direct children (childList, no subtree) in case the element gets
	// replaced — never the whole document.
	function tfTitleBind() {
		var el = document.querySelector("head > title") || document.querySelector("title");
		if (el === tfTitle.el) return;
		if (tfTitle.obs) tfTitle.obs.disconnect();
		tfTitle.el = el;
		if (!el) return;
		tfTitle.obs = new MutationObserver(tfTitleSchedule);
		tfTitle.obs.observe(el, { childList: true, characterData: true, subtree: true });
	}

	fullConversionParts.push({
		setup: function () {
			if (tfTitle.active) return;
			tfTitle.active = true;
			tfTitleBind();
			if (document.head && !tfTitle.headObs) {
				tfTitle.headObs = new MutationObserver(function () {
					tfTitleBind();
					tfTitleSchedule();
				});
				tfTitle.headObs.observe(document.head, { childList: true });
			}
			tfTitleSchedule();
		},
		teardown: function () {
			tfTitle.active = false;
			if (tfTitle.timer) clearTimeout(tfTitle.timer);
			tfTitle.timer = null;
			if (tfTitle.obs) tfTitle.obs.disconnect();
			if (tfTitle.headObs) tfTitle.headObs.disconnect();
			tfTitle.obs = tfTitle.headObs = tfTitle.el = null;
			// Put Spotify's own last title back, but only if ours is still
			// showing — if Spotify wrote a newer one meanwhile, keep that.
			if (tfTitle.written !== null && document.title === tfTitle.written && tfTitle.original) {
				document.title = tfTitle.original;
			}
			tfTitle.written = null;
		}
	});

	// ---- 3. UI strings (Spicetify.Locale) ---------------------------------
	// Spicetify.Locale._dictionary is Spotify's live i18n map (key → string,
	// or key → { one, other } for plurals). Rewriting a value renames that
	// string everywhere it's rendered from then on ("About Spotify" →
	// "About terminal", "Spotify Connect" → "terminal Connect"...).
	// Strings already on screen keep their text until React re-renders
	// them (usually the next navigation), which is fine for a rename.
	//
	// Safety, since these strings are templates, not plain text:
	//   - only text at brace depth 0 is touched, so "{0}", "{name}" and
	//     ICU blocks like "{count, plural, one {…} other {…}}" keep their
	//     exact shape (a "Spotify" inside a plural branch is left as is);
	//   - case-sensitive "Spotify" as a whole word only, and never when a
	//     domain follows ("Spotify.com", "spotify.com/premium") so link
	//     text and URLs stay intact;
	//   - only string values change type-for-type; a frozen dictionary or a
	//     key that refuses the write is skipped, not forced;
	//   - every original value is kept and written back on teardown.
	var TF_BRAND_WORD = /\bSpotify\b(?!\.[A-Za-z])/g;

	function tfRebrandTemplate(str) {
		if (typeof str !== "string" || str.indexOf("Spotify") === -1) return str;
		var out = "";
		var depth = 0;
		var chunk = "";
		for (var i = 0; i < str.length; i++) {
			var c = str.charAt(i);
			if (c === "{" || c === "}") {
				out += depth === 0 ? chunk.replace(TF_BRAND_WORD, "terminal") : chunk;
				chunk = "";
				depth = Math.max(0, depth + (c === "{" ? 1 : -1));
				out += c;
			} else {
				chunk += c;
			}
		}
		out += depth === 0 ? chunk.replace(TF_BRAND_WORD, "terminal") : chunk;
		return out;
	}

	var tfLocale = { active: false, backup: null, dict: null };

	function tfRebrandLocale() {
		if (!tfLocale.active || tfLocale.backup) return;
		var L = Spicetify.Locale;
		var dict = L && L._dictionary;
		if (!dict || typeof dict !== "object" || Object.isFrozen(dict)) return;
		var backup = {};
		for (var key in dict) {
			if (!Object.prototype.hasOwnProperty.call(dict, key)) continue;
			var v = dict[key];
			var nv = v;
			if (typeof v === "string") {
				nv = tfRebrandTemplate(v);
			} else if (v && typeof v === "object") {
				var copy = null;
				for (var form in v) {
					if (!Object.prototype.hasOwnProperty.call(v, form) || typeof v[form] !== "string") continue;
					var f = tfRebrandTemplate(v[form]);
					if (f !== v[form]) {
						copy = copy || assign({}, v);
						copy[form] = f;
					}
				}
				if (copy) nv = copy;
			}
			if (nv === v) continue;
			try {
				dict[key] = nv;
				backup[key] = v;
			} catch (e) {
				/* read-only key — leave it */
			}
		}
		tfLocale.backup = backup;
		tfLocale.dict = dict;
	}

	fullConversionParts.push({
		setup: function () {
			tfLocale.active = true;
			waitFor(
				function () { return Spicetify.Locale && Spicetify.Locale._dictionary; },
				tfRebrandLocale
			);
		},
		teardown: function () {
			tfLocale.active = false;
			var dict = tfLocale.dict;
			var backup = tfLocale.backup;
			tfLocale.backup = tfLocale.dict = null;
			if (!dict || !backup) return;
			for (var key in backup) {
				if (!Object.prototype.hasOwnProperty.call(backup, key)) continue;
				try {
					dict[key] = backup[key];
				} catch (e) {
					/* same key refused the first write too — nothing to undo */
				}
			}
		}
	});

	// ---- 4. Idle window title (Spicetify.AppTitle) ------------------------
	// When nothing plays, Spotify's title comes from ProductState "name"
	// ("Spotify Premium"/"Spotify Free"). AppTitle.set overrides it and
	// keeps re-asserting the override; reset() hands it back. Resolves
	// only after UserAPI is up, hence the waitFor. The <title> observer in
	// part 2 already covers this visually — this just stops Spotify from
	// producing the branded string in the first place, so the taskbar
	// doesn't flash "Spotify Premium" for 30ms on every pause.
	var tfAppTitle = { active: false, applied: false };

	fullConversionParts.push({
		setup: function () {
			tfAppTitle.active = true;
			waitFor(
				function () { return Spicetify.AppTitle && typeof Spicetify.AppTitle.set === "function"; },
				function () {
					if (!tfAppTitle.active || tfAppTitle.applied) return;
					tfAppTitle.applied = true;
					try {
						var p = Spicetify.AppTitle.set("terminal");
						if (p && typeof p.catch === "function") p.catch(function () { tfAppTitle.applied = false; });
					} catch (e) {
						tfAppTitle.applied = false;
					}
				}
			);
		},
		teardown: function () {
			tfAppTitle.active = false;
			if (!tfAppTitle.applied) return;
			tfAppTitle.applied = false;
			try {
				var p = Spicetify.AppTitle.reset();
				if (p && typeof p.catch === "function") p.catch(function () {});
			} catch (e) {
				/* AppTitle gone — Spotify restores its own title on next launch */
			}
		}
	});

	// ---- Mode switch (both modes) ------------------------------------------
	// One function behind the palette command, the keyboard shortcut and
	// (indirectly, through the same setting) the settings-panel row.
	function tfSetFullMode(on) {
		settings.fullConversion = !!on;
		saveSettings();
		applyFullConversionSetting();
		// Keep an open settings panel honest: its first-registry-order row
		// is the fullConversion checkbox (rows are built from
		// FEATURE_REGISTRY in order).
		var idx = -1;
		for (var i = 0; i < FEATURE_REGISTRY.length; i++) {
			if (FEATURE_REGISTRY[i].key === "fullConversion") idx = i;
		}
		var rows = document.querySelectorAll(".terminal-settings > .terminal-settings-row");
		var cb = idx >= 0 && rows[idx] && rows[idx].querySelector("input[type=\"checkbox\"]");
		if (cb) cb.checked = !!on;
		return tfModeLabel();
	}

	function tfModeLabel() {
		return settings.fullConversion
			? "mode terminal complet : activé"
			: "mode natif (thème classique) : activé";
	}

	function tfShortcutLabel() {
		return currentOs === "mac" ? "cmd+maj+alt+n" : "ctrl+maj+alt+n";
	}

	function tfNotify(msg) {
		try {
			if (typeof Spicetify.showNotification === "function") Spicetify.showNotification(msg);
		} catch (e) {
			/* no toast API yet — the mode switch itself already happened */
		}
	}

	// Escape hatch: Ctrl+Shift+Alt+N (Cmd+Shift+Alt+N or Ctrl+… on macOS)
	// flips the mode from anywhere, including when full mode has made
	// something hard to reach. Clash check:
	//   - Spotify binds Ctrl+N (new playlist) and Ctrl+Shift+N (new
	//     folder); its Mousetrap matches modifiers exactly, so the extra
	//     Alt keeps this combo distinct from both.
	//   - No Windows, GNOME/KDE/Xfce or macOS system default uses it.
	//   - Windows reports AltGr as Ctrl+Alt, and AltGr+Shift+N types a
	//     letter on some layouts (Polish "Ń"). Chromium on Windows also
	//     reports AltGraph for a plain left Ctrl+Alt, so the AltGraph
	//     state can't be used to tell the two apart (it made the shortcut
	//     unreachable there). Instead, off macOS, the combo only counts
	//     when it still produces a plain "n": a layout where it types
	//     another character is left alone. Text fields are ignored too,
	//     so typing is never hijacked.
	// Registered once, outside the setup/teardown parts, because it has to
	// work in native mode too — that's how you come back.
	document.addEventListener("keydown", function (e) {
		if (e.code !== "KeyN" || !e.shiftKey || !e.altKey || e.repeat) return;
		var mod = currentOs === "mac" ? e.metaKey || e.ctrlKey : e.ctrlKey && !e.metaKey;
		if (!mod) return;
		if (currentOs !== "mac" && typeof e.key === "string" && e.key.length === 1 && e.key.toLowerCase() !== "n") return;
		if (isTypingContext()) return;
		e.preventDefault();
		tfNotify(tfSetFullMode(!settings.fullConversion) + " (" + tfShortcutLabel() + " pour basculer)");
	});

	// Palette: `mode full` / `mode native` / `mode toggle` / `mode`.
	// COMMANDS is a `var` assigned further down this file, so it's still
	// undefined while this section runs; waitFor's first retry (200ms)
	// finds it. Adds a key and wraps `help` rather than editing the
	// COMMANDS literal, so the palette section stays untouched.
	waitFor(
		function () { return typeof COMMANDS === "object" && COMMANDS && typeof COMMANDS.help === "function"; },
		function () {
			if (COMMANDS.mode) return;
			COMMANDS.mode = function (arg) {
				var a = String(arg || "").trim().toLowerCase();
				var usage = "usage: mode <full|native|toggle>  (raccourci " + tfShortcutLabel() + ")";
				if (!a || a === "status") return tfModeLabel() + "\n" + usage;
				if (/^(full|complet|terminal|on)$/.test(a)) return tfSetFullMode(true);
				if (/^(native|natif|classic|classique|off)$/.test(a)) return tfSetFullMode(false);
				if (a === "toggle") return tfSetFullMode(!settings.fullConversion);
				return usage;
			};
			var baseHelp = COMMANDS.help;
			COMMANDS.help = function () {
				return baseHelp.apply(this, arguments) + " · mode <full|native>";
			};
		}
	);

	// --- END FULL/CHROME ---------------------------------------------------

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
		// Full conversion: the mini player is a separate document that
		// user.css never reaches, so it gets the status-line styling here.
		if (document.documentElement.classList.contains("terminal-full") && typeof FULL_PLAYER_PIP_CSS === "string") {
			style.textContent += "\n" + FULL_PLAYER_PIP_CSS;
		}
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
				// Sized from the canvas' own displayed width (user.css gives
				// it width:100% of the parent, which can be wider than the
				// cover); sizing from the cover stretched the bars and
				// cancelled out the dpr-crisp backing store.
				var targetW = Math.max(64, canvas.clientWidth || cover.clientWidth || 260);
				if (canvasNeedsDprResize(canvas, targetW, 64)) sizeCanvasForDpr(canvas, targetW, 64, false);
				return canvas;
			}
			if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
			canvas = document.createElement("canvas");
			canvas.className = "terminal-visualizer";
			// Displayed size comes from user.css (width:100%; height:64px),
			// so no inline style — only the backing store is dpr-scaled.
			cover.parentNode.insertBefore(canvas, cover.nextSibling);
			// Sized after insertion so clientWidth reflects the real layout.
			sizeCanvasForDpr(canvas, Math.max(64, canvas.clientWidth || cover.clientWidth || 260), 64, false);
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

		// ~30 fps is plenty for bars driven by 1/10 s analysis segments and
		// halves the per-frame DOM query + canvas work on weaker machines.
		var lastVisFrame = 0;
		function draw() {
			rafId = requestAnimationFrame(draw);
			var nowT = performance.now();
			if (nowT - lastVisFrame < 32) return;
			lastVisFrame = nowT;
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
		// The highlighted row element itself, not just its index. The index
		// alone went stale on navigation: after j,j on one playlist, Enter on
		// the next one played rows[1] there — a row that was never
		// highlighted. Holding the element lets Enter check that the row is
		// still in the DOM and still carries the cursor class before acting.
		var vimRow = null;

		function clearVimCursor() {
			vimIndex = -1;
			vimRow = null;
			var marked = document.querySelectorAll(".terminal-vim-cursor");
			for (var i = 0; i < marked.length; i++) marked[i].classList.remove("terminal-vim-cursor");
		}

		// Returns the highlighted row only if it's still live: connected to
		// the document (React unmounts rows on route change and when the
		// virtualized list scrolls them out) and still marked. Anything else
		// means "no selection", and the stale state is dropped.
		function currentVimRow() {
			if (vimRow && vimRow.isConnected && vimRow.classList.contains("terminal-vim-cursor")) return vimRow;
			if (vimRow || vimIndex !== -1) clearVimCursor();
			return null;
		}

		// Enter on a focused button/link/control must keep its native
		// meaning (activate that control), so the Enter handler stands down
		// whenever focus is on anything interactive. isTypingContext only
		// covers text fields; this is broader.
		var INTERACTIVE_SELECTOR =
			"button, a[href], input, textarea, select, summary, [contenteditable]:not([contenteditable=\"false\"]), " +
			"[role=\"button\"], [role=\"link\"], [role=\"textbox\"], [role=\"searchbox\"], [role=\"combobox\"], " +
			"[role=\"menuitem\"], [role=\"menuitemcheckbox\"], [role=\"menuitemradio\"], [role=\"option\"], " +
			"[role=\"checkbox\"], [role=\"radio\"], [role=\"switch\"], [role=\"slider\"], [role=\"tab\"], [role=\"spinbutton\"]";

		function isInteractiveFocus() {
			var el = document.activeElement;
			if (!el || el === document.body || el === document.documentElement) return false;
			if (el.isContentEditable) return true;
			return !!(el.closest && el.closest(INTERACTIVE_SELECTOR));
		}

		Spicetify.Player.addEventListener("appchange", clearVimCursor);

		// appchange doesn't fire for ordinary in-app navigation (playlist ->
		// playlist), so also reset on every History route change. Same
		// waitFor pattern as setupAsciiCoverArt: Platform.History can still be
		// unready when this runs.
		waitFor(
			function () { return Spicetify.Platform && Spicetify.Platform.History && Spicetify.Platform.History.listen; },
			function () { Spicetify.Platform.History.listen(clearVimCursor); } // cheap (one class), kept synchronous so Enter never hits a stale row
		);

		document.addEventListener("keydown", function (e) {
			if (paletteOverlay || isTypingContext()) return;
			// Someone else already handled it, or an IME is mid-composition
			// (keyCode 229 covers Chromium builds that don't set isComposing
			// on the first keydown).
			if (e.defaultPrevented || e.isComposing || e.keyCode === 229) return;
			// Never hijack shortcuts: Ctrl+K is Spotify's quick search, and
			// Ctrl/Cmd/Alt + J/K/Enter/"/" belong to Spotify or the OS.
			// metaKey is Cmd on macOS and the Win key on Windows. Windows
			// also reports AltGr as Ctrl+Alt, which this rules out too.
			if (e.ctrlKey || e.metaKey || e.altKey) return;

			if (e.key === "/") {
				// Shift is allowed here: AZERTY types "/" as Shift+":".
				var search = document.querySelector(".main-topBar-searchBar, [data-testid=\"search-input\"]");
				if (search) {
					e.preventDefault();
					search.focus();
				}
				return;
			}

			if (e.shiftKey) return;
			if (e.key !== "j" && e.key !== "k" && e.key !== "Enter") return;

			if (e.key === "Enter") {
				// Only act on a row that is visibly highlighted right now, and
				// never steal Enter from a focused control.
				if (isInteractiveFocus()) return;
				var current = currentVimRow();
				if (current) {
					e.preventDefault();
					current.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
				}
				return;
			}

			var rows = document.querySelectorAll(".main-trackList-trackListRow");
			if (!rows.length) return;

			// Recompute the position from the live element; "no selection"
			// (or a stale row) starts at the first row for both j and k.
			var live = currentVimRow();
			var from = live ? Array.prototype.indexOf.call(rows, live) : -1;
			var next = from === -1 ? 0 : Math.max(0, Math.min(rows.length - 1, from + (e.key === "j" ? 1 : -1)));

			e.preventDefault();
			clearVimCursor();
			vimIndex = next;
			vimRow = rows[next];
			vimRow.classList.add("terminal-vim-cursor");
			vimRow.scrollIntoView({ block: "nearest" });
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
		// `code` is the physical key: KeyK types "k" on QWERTY, AZERTY and
		// QWERTZ alike (not on Dvorak). Alt is excluded because Windows
		// reports AltGr as Ctrl+Alt, so AltGr+Shift+K on some layouts
		// would otherwise open the palette while typing a character.
		//
		// macOS: Cmd+Shift+K (e.metaKey) is accepted too, since Mac users
		// reach for Cmd where others use Ctrl; Ctrl+Shift+K keeps working
		// there as well. Spotify's own Mac bindings use Cmd+K (quick search)
		// but nothing on Cmd+Shift+K, and macOS has no system-wide binding
		// for it (Finder's "Go to Network" only applies inside Finder).
		// Option (altKey) stays excluded, same as AltGr on Windows. Meta is
		// honored only on macOS: on Linux/Windows it is the Super/Windows
		// key, which the desktop or OS claims, so behavior there is
		// unchanged — Ctrl+Shift+K only.
		document.addEventListener("keydown", function (e) {
			var mod = e.ctrlKey || (currentOs === "mac" && e.metaKey);
			if (mod && e.shiftKey && !e.altKey && e.code === "KeyK") {
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
			"</div></div>" +
			'<div class="terminal-drag-strip"></div>';

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
		// Own-property check so Object.prototype members (constructor,
		// __proto__, toString...) aren't treated as commands.
		var handler = Object.prototype.hasOwnProperty.call(COMMANDS, cmd) ? COMMANDS[cmd] : null;
		if (typeof handler !== "function") {
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
				"OS        spicetify-terminal v" + THEME_VERSION + " (" + (Spicetify.Platform && Spicetify.Platform.operatingSystem ? Spicetify.Platform.operatingSystem : "unknown") + ")",
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
		var fontSize = 14;
		matrixState.fontSize = fontSize;
		matrixState.drops = [];
		// Column count follows the width: a wider window (maximize, move to
		// a bigger monitor) gets new columns on the right instead of an
		// empty band; a narrower one drops the extras. Existing columns keep
		// their position so the rain doesn't visibly restart.
		function resize() {
			sizeCanvasForDpr(canvas, window.innerWidth, window.innerHeight, true);
			var columns = Math.floor(canvas._cssW / fontSize);
			var drops = matrixState.drops;
			if (drops.length > columns) drops.length = columns;
			while (drops.length < columns) drops.push(1);
		}
		resize();
		window.addEventListener("resize", resize);
		matrixState.resize = resize;
		// Resizing wipes the canvas, which the fading trail recovers from
		// on its own within a few frames, so a dpr change just re-sizes.
		matrixState.cancelDprWatch = onDprChange(resize);

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
