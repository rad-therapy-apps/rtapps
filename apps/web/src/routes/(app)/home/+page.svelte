<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Home — RTApps</title>
</svelte:head>

<h1>Welcome, {data.user.display_name}</h1>
<p>Role: {data.user.role}</p>
