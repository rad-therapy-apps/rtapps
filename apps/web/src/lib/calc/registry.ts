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
 * The keys must be exactly the API's `CalcType` (from `@rtapps/api-client`, generated from the
 * API's Literal): `satisfies` fails the type check if a calc_type is added or removed on only one
 * side (#47).
 * Depends on: `./MuCalculator.svelte`, `./InverseSquareCalculator.svelte`,
 * `./ExtendedSsdCalculator.svelte`, `./GapCalculator.svelte`, `./MagnificationCalculator.svelte`,
 * `./SiConverter.svelte`, `./interpolate` (`Grid`), `@rtapps/api-client` (`components`).
 * Used by: the student activity route; `CALC_TYPES` and `CALC_TYPE_LABELS` by the authoring
 * "New calculator" form.
 */
import type { Component } from 'svelte';
import type { components } from '@rtapps/api-client';
import MuCalculator from './MuCalculator.svelte';
import InverseSquareCalculator from './InverseSquareCalculator.svelte';
import ExtendedSsdCalculator from './ExtendedSsdCalculator.svelte';
import GapCalculator from './GapCalculator.svelte';
import MagnificationCalculator from './MagnificationCalculator.svelte';
import SiConverter from './SiConverter.svelte';
import type { Grid } from './interpolate';

export type CalcTables = Record<string, { title: string; grid: Grid }>;

export type CalcType = components['schemas']['CalculatorCreateIn']['calc_type'];
type CalcPlayer = Component<{ tables: CalcTables }>;

const players = {
	mu: MuCalculator,
	inverse_square: InverseSquareCalculator,
	extended_ssd: ExtendedSsdCalculator,
	gap: GapCalculator,
	magnification: MagnificationCalculator,
	si_convert: SiConverter
} satisfies Record<CalcType, CalcPlayer>;

// Looked up by a snapshot's calc_type, which is a plain string, hence the string-keyed view.
export const registry: Record<string, CalcPlayer> = players;

// The authoritative list of calc_types this build can render — the authoring "New
// calculator" form's select reads this, so form and registry can never drift. The cast is exact:
// `satisfies` above pins `players`' keys to CalcType.
export const CALC_TYPES = Object.keys(players) as CalcType[];

// What the authoring "New calculator" dropdown shows for each calc_type (#50); the value sent to
// the API stays the calc_type itself. `satisfies` makes a calc_type without a label a type error.
export const CALC_TYPE_LABELS = {
	mu: 'MU (monitor units)',
	inverse_square: 'Inverse square law',
	extended_ssd: 'Extended SSD',
	gap: 'Gap calculation',
	magnification: 'Magnification',
	si_convert: 'SI unit converter'
} satisfies Record<CalcType, string>;
