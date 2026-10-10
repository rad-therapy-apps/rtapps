/**
 * What this file does: browser component tests for the shared UI kit in `src/lib/ui/`.
 * Used here and why: vitest-browser-svelte renders each component in real Chromium and asserts
 * through roles and names (no class or colour assertions), matching the repo's other
 * `*.svelte.spec.ts` files; `createRawSnippet` supplies children.
 * How it fits the project: docs/specs/2026-10-01-ui-restyle-design.md (Architecture 3).
 * Depends on: `vitest/browser`, `vitest-browser-svelte`, the kit components.
 * Used by: `pnpm --filter web test` (client project).
 */
import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import Check from '@lucide/svelte/icons/check';
import Alert from './Alert.svelte';
import Button from './Button.svelte';
import Card from './Card.svelte';
import Feedback from './Feedback.svelte';
import Field from './Field.svelte';
import Icon from './Icon.svelte';
import PageHeader from './PageHeader.svelte';
import SubjectTag from './SubjectTag.svelte';
import Tabs from './Tabs.svelte';

const text = (t: string) => createRawSnippet(() => ({ render: () => `<span>${t}</span>` }));

describe('Icon', () => {
	it('is hidden from assistive tech by default', async () => {
		const { container } = await render(Icon, { icon: Check });
		expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
	});

	it('is an image with a name when labelled', async () => {
		render(Icon, { icon: Check, label: 'Done' });
		await expect.element(page.getByRole('img', { name: 'Done' })).toBeVisible();
	});
});

describe('Button', () => {
	it('defaults to type="button" and fires onclick', async () => {
		const onclick = vi.fn();
		render(Button, { children: text('Save'), onclick });
		const button = page.getByRole('button', { name: 'Save' });
		await expect.element(button).toHaveAttribute('type', 'button');
		await button.click();
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('passes type="submit" and disabled through', async () => {
		render(Button, {
			children: text('Send'),
			type: 'submit',
			disabled: true,
			variant: 'primary'
		});
		const button = page.getByRole('button', { name: 'Send' });
		await expect.element(button).toHaveAttribute('type', 'submit');
		await expect.element(button).toBeDisabled();
	});

	it('with href renders a link with btn classes and no type', async () => {
		render(Button, { children: text('Data tables'), href: '/author/data-tables' });
		const link = page.getByRole('link', { name: 'Data tables' });
		await expect.element(link).toHaveAttribute('href', '/author/data-tables');
		await expect.element(link).toHaveClass('btn', 'btn-secondary');
		await expect.element(link).not.toHaveAttribute('type');
	});

	it('without href is still a type="button" button', async () => {
		render(Button, { children: text('Save') });
		await expect
			.element(page.getByRole('button', { name: 'Save' }))
			.toHaveAttribute('type', 'button');
		await expect.element(page.getByRole('link')).not.toBeInTheDocument();
	});

	it('keeps the accessible name to the text when an icon is set', async () => {
		render(Button, {
			children: text('Sign out'),
			icon: Check,
			variant: 'ghost'
		});
		await expect.element(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
	});
});

describe('Alert', () => {
	it('passes id and role through and shows its text', async () => {
		render(Alert, {
			tone: 'danger',
			id: 'login-error',
			role: 'alert',
			children: text('Bad password')
		});
		const alert = page.getByRole('alert');
		await expect.element(alert).toHaveAttribute('id', 'login-error');
		await expect.element(alert).toHaveTextContent('Bad password');
	});
});

describe('Feedback', () => {
	it('renders the caller’s exact text for a correct answer', async () => {
		render(Feedback, { correct: true, children: text('Correct') });
		await expect.element(page.getByText('Correct', { exact: true })).toBeVisible();
	});

	it('renders the caller’s exact text for an incorrect answer', async () => {
		render(Feedback, { correct: false, children: text('Incorrect') });
		await expect.element(page.getByText('Incorrect', { exact: true })).toBeVisible();
	});
});

describe('PageHeader', () => {
	it('renders one h1 with the title and the subtitle', async () => {
		render(PageHeader, { title: 'Subjects', subtitle: 'Pick a subject' });
		await expect.element(page.getByRole('heading', { level: 1, name: 'Subjects' })).toBeVisible();
		await expect.element(page.getByText('Pick a subject')).toBeVisible();
	});
});

describe('Field', () => {
	it('labels the control it wraps', async () => {
		render(Field, {
			label: 'Email',
			id: 'email',
			children: createRawSnippet(() => ({
				render: () => '<input id="email" type="email" />'
			}))
		});
		await expect.element(page.getByLabelText('Email')).toBeVisible();
	});
});

describe('Card and SubjectTag', () => {
	it('Card renders as the requested element', async () => {
		const { container } = await render(Card, {
			as: 'section',
			children: text('Body')
		});
		expect(container.querySelector('section')).not.toBeNull();
	});

	it('SubjectTag shows its label', async () => {
		render(SubjectTag, {
			slug: 'radiation-biology',
			label: 'Radiation Biology'
		});
		await expect.element(page.getByText('Radiation Biology')).toBeVisible();
	});
});

describe('Tabs', () => {
	const tabs = [
		{ id: 'edit', label: 'Edit' },
		{ id: 'preview', label: 'Preview' },
		{ id: 'publish', label: 'Publish' }
	];

	it('renders a tablist with the selected tab marked and the only tab stop', async () => {
		render(Tabs, { tabs, selected: 'edit', label: 'Editor tabs' });
		await expect.element(page.getByRole('tablist', { name: 'Editor tabs' })).toBeVisible();
		const edit = page.getByRole('tab', { name: 'Edit' });
		const preview = page.getByRole('tab', { name: 'Preview' });
		await expect.element(edit).toHaveAttribute('aria-selected', 'true');
		await expect.element(edit).toHaveAttribute('tabindex', '0');
		await expect.element(preview).toHaveAttribute('aria-selected', 'false');
		await expect.element(preview).toHaveAttribute('tabindex', '-1');
	});

	it('clicking selects and reports the id', async () => {
		const onselect = vi.fn();
		render(Tabs, { tabs, selected: 'edit', label: 'Editor tabs', onselect });
		await page.getByRole('tab', { name: 'Publish' }).click();
		expect(onselect).toHaveBeenCalledWith('publish');
		await expect
			.element(page.getByRole('tab', { name: 'Publish' }))
			.toHaveAttribute('aria-selected', 'true');
	});

	it('arrows wrap, Home/End jump, and moving focus does not select', async () => {
		const onselect = vi.fn();
		render(Tabs, { tabs, selected: 'edit', label: 'Editor tabs', onselect });
		const edit = page.getByRole('tab', { name: 'Edit' });
		await edit.click();
		onselect.mockClear();
		await userEvent.keyboard('{ArrowLeft}');
		await expect.element(page.getByRole('tab', { name: 'Publish' })).toHaveFocus();
		await userEvent.keyboard('{ArrowRight}');
		await expect.element(edit).toHaveFocus();
		await userEvent.keyboard('{ArrowRight}');
		await expect.element(page.getByRole('tab', { name: 'Preview' })).toHaveFocus();
		await userEvent.keyboard('{End}');
		await expect.element(page.getByRole('tab', { name: 'Publish' })).toHaveFocus();
		await userEvent.keyboard('{Home}');
		await expect.element(edit).toHaveFocus();
		expect(onselect).not.toHaveBeenCalled();
		await expect.element(edit).toHaveAttribute('aria-selected', 'true');
	});

	it('Enter selects the focused tab', async () => {
		const onselect = vi.fn();
		render(Tabs, { tabs, selected: 'edit', label: 'Editor tabs', onselect });
		await page.getByRole('tab', { name: 'Edit' }).click();
		await userEvent.keyboard('{ArrowRight}{Enter}');
		expect(onselect).toHaveBeenLastCalledWith('preview');
		await expect
			.element(page.getByRole('tab', { name: 'Preview' }))
			.toHaveAttribute('aria-selected', 'true');
	});

	it('leaves modified arrows alone (Alt+Left is browser Back)', async () => {
		render(Tabs, { tabs, selected: 'edit', label: 'Editor tabs' });
		const edit = page.getByRole('tab', { name: 'Edit' });
		await edit.click();
		const event = new KeyboardEvent('keydown', {
			key: 'ArrowLeft',
			altKey: true,
			bubbles: true,
			cancelable: true
		});
		edit.element().dispatchEvent(event);
		expect(event.defaultPrevented).toBe(false);
		await expect.element(edit).toHaveFocus();
	});
});
