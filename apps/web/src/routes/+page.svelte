<script lang="ts">
	let { data } = $props();
</script>

<main>
	<h1>RTApps</h1>
	<p>Web: ok</p>
	<p>API: {data.api.status}{data.api.database ? ` (database ${data.api.database})` : ''}</p>
</main>
