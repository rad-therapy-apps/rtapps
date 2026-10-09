<!--
	What this file does: The signed-in page frame. A sidebar (brand, role-gated nav, account block)
	on desktop; below 50rem the same sidebar becomes a sticky top bar and the nav opens as a drawer
	from a menu button. Renders the page inside the single `<main id="main">`.

	Used here and why: there is exactly one `<nav>` in the DOM (CSS hides it on phones until the
	menu opens) so e2e's strict-mode link lookups never see duplicates. Role gating is
	presentation only — wayfinding; the real authorization is `guard.ts`. The sign-out form needs
	`$app/forms`' `enhance`, so it lives in the root layout and comes in as the `signOut` snippet,
	which also keeps this component testable in the browser project. Every href goes through
	`resolve()`.

	How it fits the project: shared UI kit, docs/specs/2026-10-01-ui-restyle-design.md (App shell).
	NFR-16/17/18: visible focus, keyboard operable (Escape closes the drawer and returns focus),
	no horizontal scroll at 360px.

	Depends on: `./Icon.svelte`, `./Logo.svelte`, `$app/paths`, tokens in `src/app.css`.
	Used by: `src/routes/+layout.svelte`.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import House from '@lucide/svelte/icons/house';
	import Menu from '@lucide/svelte/icons/menu';
	import Monitor from '@lucide/svelte/icons/monitor';
	import PenLine from '@lucide/svelte/icons/pen-line';
	import ScrollText from '@lucide/svelte/icons/scroll-text';
	import UserCog from '@lucide/svelte/icons/user-cog';
	import UserRound from '@lucide/svelte/icons/user-round';
	import X from '@lucide/svelte/icons/x';
	import Icon from './Icon.svelte';
	import Logo from './Logo.svelte';

	let {
		user,
		currentPath,
		signOut,
		children
	}: { user: App.User; currentPath: string; signOut: Snippet; children: Snippet } = $props();

	let menuOpen = $state(false);
	let menuButton: HTMLButtonElement | undefined = $state();
	let drawer: HTMLDivElement | undefined = $state();

	// Any navigation closes the phone drawer.
	$effect(() => {
		void currentPath;
		menuOpen = false;
	});

	// So does tapping any link in it, including one to the page already open, which leaves
	// `currentPath` unchanged. One listener on the drawer, attached in script rather than as
	// a template handler on a non-interactive element.
	$effect(() => {
		const el = drawer;
		if (!el) return;
		const closeOnLink = (event: MouseEvent) => {
			if (event.target instanceof Element && event.target.closest('a')) menuOpen = false;
		};
		el.addEventListener('click', closeOnLink);
		return () => el.removeEventListener('click', closeOnLink);
	});

	function isCurrent(href: string): 'page' | undefined {
		return currentPath === href || currentPath.startsWith(href + '/') ? 'page' : undefined;
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && menuOpen) {
			menuOpen = false;
			menuButton?.focus();
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- in-page fragment, not a route -->
<a class="skip-link" href="#main">Skip to content</a>

<div class="shell">
	<header class="sidebar">
		<div class="sidebar-head">
			<a class="brand" href={resolve('/')}>
				<Logo size={28} />
				<span>RTTLearn</span>
			</a>
			<button
				type="button"
				class="menu-button"
				aria-controls="app-nav"
				aria-expanded={menuOpen}
				aria-label={menuOpen ? 'Close menu' : 'Open menu'}
				bind:this={menuButton}
				onclick={() => (menuOpen = !menuOpen)}
			>
				<Icon icon={menuOpen ? X : Menu} size={22} />
			</button>
		</div>

		<div id="app-nav" class="sidebar-body" class:open={menuOpen} bind:this={drawer}>
			<nav aria-label="Main">
				<ul>
					<li>
						<a href={resolve('/(app)/home')} aria-current={isCurrent(resolve('/(app)/home'))}>
							<Icon icon={House} />Home
						</a>
					</li>
					<li>
						<a
							href={resolve('/(app)/subjects')}
							aria-current={isCurrent(resolve('/(app)/subjects'))}
						>
							<Icon icon={BookOpen} />Subjects
						</a>
					</li>
					<li>
						<a
							href={resolve('/(app)/simulator')}
							aria-current={isCurrent(resolve('/(app)/simulator'))}
						>
							<Icon icon={Monitor} />Simulator
						</a>
					</li>
					<!-- Educators and admins both get the educator and author areas; students don't.
					     Wayfinding only — guard.ts does the real authorization. -->
					{#if user.role !== 'student'}
						<li>
							<a
								href={resolve('/(app)/educator')}
								aria-current={isCurrent(resolve('/(app)/educator'))}
							>
								<Icon icon={GraduationCap} />Educator
							</a>
						</li>
						<li>
							<a href={resolve('/(app)/author')} aria-current={isCurrent(resolve('/(app)/author'))}>
								<Icon icon={PenLine} />Author
							</a>
						</li>
					{/if}
					{#if user.role === 'admin'}
						<li>
							<a
								href={resolve('/(app)/admin/users')}
								aria-current={isCurrent(resolve('/(app)/admin/users'))}
							>
								<Icon icon={UserCog} />Admin
							</a>
						</li>
						<li>
							<a
								href={resolve('/(app)/admin/audit')}
								aria-current={isCurrent(resolve('/(app)/admin/audit'))}
							>
								<Icon icon={ScrollText} />Audit log
							</a>
						</li>
					{/if}
				</ul>
			</nav>

			<div class="account">
				<span class="user-name">{user.display_name}</span>
				<a
					href={resolve('/(app)/account/password')}
					aria-current={isCurrent(resolve('/(app)/account/password'))}
				>
					<Icon icon={UserRound} />Account
				</a>
				{@render signOut()}
			</div>
		</div>
	</header>

	<main id="main" tabindex="-1">
		{@render children()}
	</main>
</div>

<style>
	.skip-link {
		position: absolute;
		left: var(--space-4);
		top: -4rem;
		z-index: 20;
		padding: var(--space-2) var(--space-4);
		background: var(--accent);
		color: var(--accent-contrast);
		border-radius: var(--radius-sm);
		font-weight: 600;
	}
	.skip-link:focus {
		top: var(--space-4);
	}

	.shell {
		display: grid;
		grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
		min-height: 100vh;
		min-height: 100dvh;
	}

	.sidebar {
		position: sticky;
		top: 0;
		height: 100vh;
		height: 100dvh;
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding: var(--space-5) var(--space-4);
		background: var(--surface);
		border-right: 1px solid var(--border);
		overflow-y: auto;
	}
	.sidebar-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--text);
		text-decoration: none;
		font-size: var(--text-lg);
		font-weight: 700;
		letter-spacing: -0.01em;
	}
	.menu-button {
		display: none;
		padding: 0;
		width: var(--control-height);
		background: transparent;
	}

	.sidebar-body {
		display: flex;
		flex: 1;
		flex-direction: column;
		justify-content: space-between;
		gap: var(--space-5);
	}
	ul {
		display: grid;
		gap: var(--space-1);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	nav a,
	.account a {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-height: var(--control-height);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-sm);
		color: var(--text-muted);
		text-decoration: none;
	}
	nav a:hover,
	.account a:hover {
		background: var(--surface-raised);
		color: var(--text);
	}
	/* Current section: tinted fill + accent bar + heavier weight, so colour is not the only cue. */
	a[aria-current='page'] {
		background: var(--accent-soft);
		box-shadow: inset 3px 0 0 var(--accent);
		color: var(--text);
		font-weight: 600;
	}
	.account {
		display: grid;
		gap: var(--space-1);
		padding-top: var(--space-4);
		border-top: 1px solid var(--border);
	}
	.account :global(form) {
		display: contents;
	}
	.account :global(.btn-ghost) {
		justify-content: flex-start;
	}
	.user-name {
		padding-inline: var(--space-3);
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	main {
		width: 100%;
		max-width: var(--content-max);
		padding: var(--space-6);
	}
	main:focus {
		outline: none;
	}

	/* Phones and narrow tablets: the sidebar becomes a sticky top bar; the same nav opens as a
	   drawer under it. 50rem is the shell breakpoint documented in app.css. */
	@media (max-width: 50rem) {
		.shell {
			grid-template-columns: minmax(0, 1fr);
		}
		.sidebar {
			z-index: 10;
			height: auto;
			padding: var(--space-3) var(--space-4);
			border-right: 0;
			border-bottom: 1px solid var(--border);
			overflow: visible;
		}
		.menu-button {
			display: inline-flex;
		}
		.sidebar-body {
			display: none;
		}
		.sidebar-body.open {
			display: flex;
			position: absolute;
			top: 100%;
			left: 0;
			right: 0;
			max-height: calc(100dvh - 4rem);
			overflow-y: auto;
			padding: var(--space-4);
			background: var(--surface);
			border-bottom: 1px solid var(--border);
			box-shadow: var(--shadow-2);
		}
		main {
			padding: var(--space-5) var(--space-4);
		}
	}
</style>
