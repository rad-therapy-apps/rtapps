/**
 * What this file does: maps a calculator activity's `calc_type` to the player component that
 * renders it.
 * Used here and why: a plain lookup object (not a switch in the route) so adding a new
 * `calc_type` later is a one-line addition here rather than touching the route branch; every
 * entry shares `MuCalculator.svelte`'s `{ tables }` prop shape.
 * How it fits the project: plan 3b Task 17 — the student activity route
 * (`(app)/subjects/[slug]/activities/[id]/+page.svelte`) looks up
 * `registry[snapshot.calculator.calc_type]`, rendering a plain "not supported yet" message when
 * the key is missing (an authored calc_type this build doesn't (yet) have a player for).
 * Depends on: `./MuCalculator.svelte`, `./InverseSquareCalculator.svelte`,
 * `./ExtendedSsdCalculator.svelte`, `./GapCalculator.svelte`, `./MagnificationCalculator.svelte`,
 * `./SiConverter.svelte`, `./interpolate` (`Grid`).
 * Used by: the student activity route; `CALC_TYPES` by the authoring "New calculator" form.
 */
import type { Component } from 'svelte';
import MuCalculator from './MuCalculator.svelte';
import InverseSquareCalculator from './InverseSquareCalculator.svelte';
import ExtendedSsdCalculator from './ExtendedSsdCalculator.svelte';
import GapCalculator from './GapCalculator.svelte';
import MagnificationCalculator from './MagnificationCalculator.svelte';
import SiConverter from './SiConverter.svelte';
import type { Grid } from './interpolate';

export type CalcTables = Record<string, { title: string; grid: Grid }>;

export const registry: Record<string, Component<{ tables: CalcTables }>> = {
	mu: MuCalculator,
	inverse_square: InverseSquareCalculator,
	extended_ssd: ExtendedSsdCalculator,
	gap: GapCalculator,
	magnification: MagnificationCalculator,
	si_convert: SiConverter
};

// The authoritative list of calc_types this build can render — the authoring "New
// calculator" form's select reads this, so form and registry can never drift.
export const CALC_TYPES: string[] = Object.keys(registry);
