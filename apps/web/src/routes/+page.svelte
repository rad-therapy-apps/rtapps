<!--
	What this file does: Public landing page at `/`. Renders the web/API health status returned
	by +page.server.ts's load.

	Used here and why: Svelte 5 runes (`$props()`); no form, no navigation-only concerns here.

	How it fits the project: reachable without a session (see `guard.ts` public paths); signed-in
	users never see this page because the server load redirects them to `/home` first.

	Used by: nothing links here directly other than the browser's own root navigation and the
	header brand link (`resolve('/')` in `+layout.svelte`).
-->
<script lang="ts">
	let { data } = $props();
</script>

<div>
	<h1>RTTLearn</h1>
	<p>Web: ok</p>
	<p>API: {data.api.status}{data.api.database ? ` (database ${data.api.database})` : ''}</p>
</div>
