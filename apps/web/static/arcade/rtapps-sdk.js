/*
 * What this file does: the RTApps simulator SDK (plan 4c, the "A pattern") — simulator
 * apps are real API clients: cookie-authenticated same-origin fetch, one attempt started
 * and submitted per completed event, multiple events per session.
 * Used here and why: unlike the games' shim (rtapps-shim.js, one postMessage to a parent
 * page), simulator apps run long sessions with many result moments and no wrapping
 * player logic to lean on. Public file: no secrets, session cookie carries auth.
 * How it fits the project: docs/specs/2026-09-10-plan-4c-simulator-design.md §2.
 * Depends on: /api/v1 (by-sdk-slug resolver, attempts start/submit).
 * Used by: apps/web/arcade/sim-hub/, apps/web/arcade/linac-ct/.
 */
(function () {
	var resolved = {}; // per-page-load cache: slug -> resolver response

	async function resolve(slug) {
		if (resolved[slug]) return resolved[slug];
		var res = await fetch('/api/v1/activities/by-sdk-slug/' + encodeURIComponent(slug), {
			credentials: 'same-origin'
		});
		if (!res.ok) throw new Error('RTApps: unknown activity slug ' + slug);
		resolved[slug] = await res.json();
		return resolved[slug];
	}

	async function post(url, body) {
		var init = {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Idempotency-Key': crypto.randomUUID() }
		};
		if (body !== undefined) {
			init.headers['Content-Type'] = 'application/json';
			init.body = JSON.stringify(body);
		}
		var res = await fetch(url, init);
		if (!res.ok) throw new Error('RTApps: request failed (' + res.status + ')');
		return res.json();
	}

	async function recordOnce(slug, opts) {
		var info = await resolve(slug);
		var attempt = await post('/api/v1/activities/' + info.activity_id + '/attempts');
		var submitted = await post(
			'/api/v1/attempts/' + attempt.id + '/submit',
			info.completion_only ? undefined : { score: Number((opts && opts.score) || 0) }
		);
		return { percent: submitted.percent };
	}

	window.RTApps = window.RTApps || {};
	// One attempt per completed event; call as many times per session as events complete.
	window.RTApps.recordResult = function (slug, opts) {
		return recordOnce(slug, opts).catch(function () {
			// One retry for flaky-wifi resilience; a second failure surfaces to the caller.
			return recordOnce(slug, opts);
		});
	};
	// Player URL for an activity, for door/back navigation (no UUIDs in app code).
	window.RTApps.activityUrl = function (slug) {
		return resolve(slug).then(function (info) {
			return '/subjects/' + info.subject_slug + '/activities/' + info.activity_id;
		});
	};
})();
