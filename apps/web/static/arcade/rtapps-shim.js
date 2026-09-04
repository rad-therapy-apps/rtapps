/*
 * What this file does: the RTApps arcade shim — the ONLY integration a game needs. Exposes
 * window.RTApps.reportResult(score, max?) which posts one {type:"rtapps:result"} message to
 * the embedding platform page (ExternalPlayer.svelte), which owns the attempt lifecycle.
 * Used here and why: plain IIFE, no modules/deps, so any legacy single-file game can include
 * it with one <script> tag. Deliberately public (static/): it holds no secrets and makes no
 * API calls; posting is same-origin-targeted and once-only.
 * How it fits the project: plan 4a §2; the direct-API SDK for real applications is plan 4c.
 * Depends on: nothing. Used by: apps/web/arcade/<slug>/index.html game files.
 */
(function () {
	var sent = false;
	window.RTApps = {
		reportResult: function (score, max) {
			// Once per page load; harmless no-op when the game is opened outside an iframe.
			if (sent || window.parent === window) return;
			sent = true;
			window.parent.postMessage(
				{
					type: 'rtapps:result',
					score: Number(score),
					max: max == null ? null : Number(max)
				},
				window.location.origin
			);
		}
	};
})();
