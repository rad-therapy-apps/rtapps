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

	async function post(url, idempotencyKey, body) {
		var init = {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Idempotency-Key': idempotencyKey }
		};
		if (body !== undefined) {
			init.headers['Content-Type'] = 'application/json';
			init.body = JSON.stringify(body);
		}
		var res = await fetch(url, init);
		if (!res.ok) throw new Error('RTApps: request failed (' + res.status + ')');
		return res.json();
	}

	// Resolve + attempt-start: resume-safe against the API's own in-progress lookup, so
	// retrying this whole phase on failure is safe — a lost-response retry lands on the same
	// in-progress attempt (or the resolver cache) rather than creating a duplicate. Scored
	// activities must be given a real score before an attempt is even opened.
	async function startPhase(slug, opts) {
		var info = await resolve(slug);
		if (
			!info.completion_only &&
			(opts == null || typeof opts.score !== 'number' || !isFinite(opts.score))
		) {
			throw new Error('RTApps: a numeric score is required for ' + slug);
		}
		var attempt = await post(
			'/api/v1/activities/' + info.activity_id + '/attempts',
			crypto.randomUUID()
		);
		return { info: info, attempt: attempt };
	}

	// Submit is NOT resume-safe the same way: once a submit request has actually reached the
	// server, retrying with a fresh key would open a second submitted attempt for the same
	// event. Reusing the same Idempotency-Key means a lost-response retry replays the original
	// result instead (submit_attempt's same-key branch), making this exactly-once rather than
	// at-least-once.
	async function submitWithRetry(attemptId, submitKey, body) {
		try {
			return await post('/api/v1/attempts/' + attemptId + '/submit', submitKey, body);
		} catch {
			// One retry for flaky-wifi resilience; never re-enter attempt-start from here.
			return post('/api/v1/attempts/' + attemptId + '/submit', submitKey, body);
		}
	}

	async function recordOnce(slug, opts) {
		var started;
		try {
			started = await startPhase(slug, opts);
		} catch {
			// One retry for flaky-wifi resilience; resume-safe since no submit has been sent yet.
			started = await startPhase(slug, opts);
		}
		var info = started.info;
		var submitKey = crypto.randomUUID();
		var body = info.completion_only ? undefined : { score: opts.score };
		var submitted = await submitWithRetry(started.attempt.id, submitKey, body);
		return { percent: submitted.percent };
	}

	window.RTApps = window.RTApps || {};
	// One attempt per completed event; call as many times per session as events complete.
	window.RTApps.recordResult = function (slug, opts) {
		return recordOnce(slug, opts);
	};
	// Player URL for an activity, for door/back navigation (no UUIDs in app code).
	window.RTApps.activityUrl = function (slug) {
		return resolve(slug).then(function (info) {
			return '/subjects/' + info.subject_slug + '/activities/' + info.activity_id;
		});
	};
})();
