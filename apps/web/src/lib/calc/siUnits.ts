/**
 * What this file does: SI unit and metric-prefix conversion tables for six clinical quantities —
 * absorbed dose, equivalent dose, radioactivity, exposure, length, and energy.
 * Used here and why: `SiConverter.svelte` reads `Object.keys(UNITS)` for the quantity select and
 * `UNITS[quantity].factors` for the from/to unit selects and the conversion factors passed to
 * `siConvert` (audit §11).
 * How it fits the project: plan 3c Task 3, Step 1 — unit names and multipliers transcribed
 * verbatim from the legacy page `Radiation_Physics/units_of_measurement/index.html`'s inline
 * `unitsData` object (script lines ~158-189); quantity order here matches that legacy page's
 * quantity `<select>` (lines 113-118: absorbedDose, equivalentDose, radioactivity, exposure,
 * length, energy), not `unitsData`'s own declaration order (length, energy, absorbedDose,
 * equivalentDose, radioactivity, exposure).
 * Depends on: nothing (pure data).
 * Used by: `./siUnits.test.ts`, `./SiConverter.svelte`.
 */

export const UNITS: Record<string, { label: string; factors: Record<string, number> }> = {
	absorbedDose: {
		label: 'Absorbed Dose',
		factors: {
			'Gray (Gy)': 1,
			'centigray (cGy)': 1e-2,
			'milligray (mGy)': 1e-3
		}
	},
	equivalentDose: {
		label: 'Equivalent Dose',
		factors: {
			'Sievert (Sv)': 1,
			'millisievert (mSv)': 1e-3,
			'microsievert (μSv)': 1e-6
		}
	},
	radioactivity: {
		label: 'Radioactivity',
		factors: {
			'Becquerel (Bq)': 1,
			'kilobecquerel (kBq)': 1e3,
			'megabecquerel (MBq)': 1e6,
			'gigabecquerel (GBq)': 1e9
		}
	},
	exposure: {
		label: 'Exposure',
		factors: {
			'Coulomb/kg (C/kg)': 1,
			'milliC/kg (mC/kg)': 1e-3,
			'microC/kg (μC/kg)': 1e-6
		}
	},
	length: {
		label: 'Length (Distance)',
		factors: {
			'meter (m)': 1,
			'centimeter (cm)': 1e-2,
			'millimeter (mm)': 1e-3
		}
	},
	energy: {
		label: 'Energy',
		factors: {
			'Joule (J)': 1,
			'electron-Volt (eV)': 1.602e-19,
			'kilo-electron-Volt (keV)': 1.602e-16,
			'mega-electron-Volt (MeV)': 1.602e-13
		}
	}
};
