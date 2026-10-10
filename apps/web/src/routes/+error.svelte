<!--
	What this file does: The app's error page. Shows the HTTP status as the heading, the error
	message, and a link back to the home page.

	Used here and why: `page` from `$app/state` for the status and error; the `$lib/ui` kit
	(PageHeader, Button as a link, Icon); `resolve()` for the home link; the decorative Lucide
	`circle-alert` icon.

	How it fits the project: SvelteKit renders this inside whichever layout applies (the signed-in
	AppShell or the public layout), so it adds no `<main>` of its own.

	Works with: `$app/state`, `$app/paths`, `$lib/ui`. Used by: SvelteKit, for any 4xx/5xx thrown
	during load or render.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Button from '$lib/ui/Button.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
</script>

<svelte:head>
	<title>{page.status} — RTTLearn</title>
</svelte:head>

<PageHeader title={String(page.status)} />
<p class="message">
	<Icon icon={CircleAlert} size={20} />
	<span>{page.error?.message ?? 'Something went wrong.'}</span>
</p>
<p><Button href={resolve('/')}>Back to home</Button></p>

<style>
	.message {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
</style>
