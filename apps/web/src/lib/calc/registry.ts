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
 * Depends on: `./MuCalculator.svelte`, `./interpolate` (`Grid`).
 * Used by: the student activity route.
 */
import type { Component } from 'svelte';
import MuCalculator from './MuCalculator.svelte';
import type { Grid } from './interpolate';

export type CalcTables = Record<string, { title: string; grid: Grid }>;

export const registry: Record<string, Component<{ tables: CalcTables }>> = {
	mu: MuCalculator
};
