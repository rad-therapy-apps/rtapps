<!--
	What this file does: Layout markup for the `(app)` route group. Renders a role-gated nav bar
	above every signed-in page (home, subjects, lessons, educator, admin).

	Used here and why: Svelte 5 runes (`$props()`); a route group layout — the `(app)` segment
	itself contributes nothing to the URL, only to which layout/guard applies; `resolve()` for
	every href, per `svelte/no-navigation-without-resolve`. The sign-out form already lives in the
	root layout (`routes/+layout.svelte`), so it isn't repeated here.

	How it fits the project: `data.user` comes from `(app)/+layout.server.ts`'s `load`; the
	Educator/Admin links are shown by role only for wayfinding — the actual authorization is
	`guard.ts`'s route-group gating. `docs/03-architecture.md` §4, §9.

	Works with: `$app/paths`, `(app)/+layout.server.ts`. Used by: every page under `(app)/` (home,
	subjects, subjects/[slug], lessons/[slug], educator, educator/cohorts/[id],
	educator/cohorts/[id]/students/[uid]).
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<nav>
	<a href={resolve('/(app)/home')}>Home</a>
	<a href={resolve('/(app)/subjects')}>Subjects</a>
	<!-- Educators and admins both get the educator area; students don't. -->
	{#if data.user.role !== 'student'}
		<a href={resolve('/(app)/educator')}>Educator</a>
	{/if}
	{#if data.user.role === 'admin'}
		<a href={resolve('/(app)/admin/users')}>Admin</a>
		<a href={resolve('/(app)/admin/audit')}>Audit log</a>
	{/if}
</nav>

<main>
	{@render children()}
</main>
