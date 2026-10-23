// Treatment case library (data only) (split out of linac-delivery.ts, #77).
import type { TreatmentCase } from './types';

export const PATIENT_POSITIONS = ['HFS', 'HFP', 'FFS', 'FFP'];

export const PATIENT_POS_NAMES = {
	HFS: 'Head-First Supine',
	HFP: 'Head-First Prone',
	FFS: 'Feet-First Supine',
	FFP: 'Feet-First Prone'
};

export const PATIENT_ROT = {
	HFS: [0, 0, 0],
	HFP: [0, 0, Math.PI],
	FFS: [0, Math.PI, 0],
	FFP: [0, Math.PI, Math.PI]
};

// Treatment sites: z = body-region position (head -0.93 ... feet +0.97); orient = clinically sensible setups
export const IMAGING_SITES = [
	{ key: 'brain', name: 'Brain', z: -0.86, orient: ['HFS'] },
	{ key: 'hneck', name: 'Head & Neck', z: -0.72, orient: ['HFS'] },
	{ key: 'chest', name: 'Chest', z: -0.45, orient: ['HFS'] },
	{ key: 'breast', name: 'Left Breast / Thorax', z: -0.45, orient: ['HFS'] },
	{ key: 'abdomen', name: 'Abdomen', z: -0.05, orient: ['HFS'] },
	{ key: 'pelvis', name: 'Pelvis', z: 0.18, orient: ['HFS'] },
	{ key: 'spine', name: 'Spine', z: -0.28, orient: ['HFS', 'HFP'] },
	{ key: 'femur', name: 'Femur (leg)', z: 0.58, orient: ['FFS', 'FFP'] }
];

export const TREATMENT_CASES: TreatmentCase[] = [
	{
		patient: 'Michael Carter',
		mrn: 'AU-24031',
		siteLabel: 'Prostate',
		siteKey: 'pelvis',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		technique: '3DCRT AP/PA',
		energy: '6 MV',
		fraction: '12 / 28',
		billing: {
			treatmentCode: '77407',
			level: 'Level 2',
			reason: 'Single-isocenter 3D CRT photon delivery'
		},
		note: 'Verify setup, field identity, jaws, and ODI prior to beam enable.',
		immobilization: {
			required: ['vacLok', 'kneeSupport'],
			orderSummary: 'Supine pelvic setup with indexed Vac-Lok molding and knee support.',
			instructions: [
				'Position the pelvis and lower body in the indexed Vac-Lok cushion used at simulation.',
				'Support both knees with the prescribed knee support/sponge to reduce lumbar strain and pelvic rotation.',
				'Confirm HFS orientation, tabletop index, and pelvic midline before imaging.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '10 × 10 cm',
			mlcAperture: '10 cm',
			mlcShape: 'Square',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'AP',
				mu: 185,
				doseRate: 600,
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '10 × 10 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Square'
				}
			},
			{
				name: 'PA',
				mu: 185,
				doseRate: 600,
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '10 × 10 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Square'
				}
			}
		]
	},
	{
		patient: 'Erica Johnson',
		mrn: 'AU-24108',
		siteLabel: 'Whole Brain',
		siteKey: 'brain',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		technique: 'Lateral Opposed',
		energy: '6 MV',
		fraction: '4 / 10',
		billing: {
			treatmentCode: '77402',
			level: 'Level 1',
			reason: '2D opposed photon treatment delivery'
		},
		note: 'Check field identity, MLC aperture, and lateral imaging setup.',
		immobilization: {
			required: ['headMask', 'headrest'],
			orderSummary: 'Rigid cranial fixation with indexed occipital support.',
			instructions: [
				'Use rigid fixation that conforms around the cranium and face.',
				'Support the occiput with an indexed insert that reproduces neutral head position.',
				'Confirm the head is straight and centered before lateral imaging.'
			]
		},
		planned: {
			gantry: '270°',
			collimator: '0°',
			jaws: '18 × 18 cm',
			mlcAperture: '16 cm',
			mlcShape: 'Conformal',
			imaging: 'MV panel extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Right Lateral',
				mu: 152,
				doseRate: 600,
				geometry: {
					gantry: '270°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Left Lateral',
				mu: 152,
				doseRate: 600,
				geometry: {
					gantry: '90°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Denise Walker',
		mrn: 'AU-24214',
		siteLabel: 'Right Lung',
		siteKey: 'chest',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		technique: 'Respiratory-Gated IMRT',
		energy: '6 MV',
		fraction: '7 / 30',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Single-isocenter photon treatment with active respiratory motion management'
		},
		note: 'Complete 4D respiratory characterization, approve the end-expiration gate, then verify selected field geometry and kV setup before treatment.',
		immobilization: {
			required: ['wingBoard', 'vacLok'],
			orderSummary: 'Arms-up thoracic immobilization with indexed posterior molding.',
			instructions: [
				'Elevate both arms in a reproducible overhead support.',
				'Use a moldable indexed cradle beneath the thorax to limit rotation.',
				'Confirm the respiratory monitoring region remains visible and unobstructed.'
			]
		},
		planned: {
			gantry: '45°',
			collimator: '30°',
			jaws: '14 × 14 cm',
			mlcAperture: '12 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '+2 / -3 / +1 mm'
		},
		motionManagement: {
			type: 'GATED',
			label: '4D phase-gated lung',
			period: 4.5,
			siExcursion: 10,
			apExcursion: 4,
			lrExcursion: 2,
			gateLow: 40,
			gateHigh: 60
		},
		fields: [
			{
				name: 'IMRT Field 1',
				mode: 'IMRT',
				mu: 412,
				doseRate: 600,
				geometry: {
					gantry: '45°',
					collimator: '30°',
					jaws: '14 × 14 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 12.0, mlcShape: 'Conformal', doseRate: 420 },
					{ muFraction: 0.2, mlcAperture: 9.5, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 0.45, mlcAperture: 7.0, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.7, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 500 },
					{ muFraction: 1.0, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 380 }
				]
			}
		]
	},
	{
		patient: 'Samuel Price',
		mrn: 'AU-24362',
		siteLabel: 'Left Femur',
		siteKey: 'femur',
		position: 'FFS',
		positionLabel: 'Feet-First Supine',
		technique: 'AP/PA Femur',
		energy: '10 MV',
		fraction: '3 / 10',
		billing: {
			treatmentCode: '77402',
			level: 'Level 1',
			reason: '2D AP/PA photon treatment delivery'
		},
		note: 'Verify feet-first setup, selected field direction, square jaw field, and asymmetric MLC shaping.',
		immobilization: {
			required: ['vacLok', 'footStocks'],
			orderSummary: 'Feet-first extremity setup with reproducible leg and foot positioning.',
			instructions: [
				'Use an indexed moldable support around the treated lower extremity.',
				'Use paired distal-foot positioning to reproduce limb rotation.',
				'Confirm the treated femur is centered and the opposite leg is outside the field.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '90°',
			jaws: '12 × 12 cm',
			mlcAperture: '14 cm',
			mlcShape: 'Asymmetric',
			imaging: 'MV panel extended',
			odi: 'On',
			couch: '-2 / +4 / 0 mm'
		},
		fields: [
			{
				name: 'AP',
				mu: 96,
				doseRate: 400,
				geometry: {
					gantry: '0°',
					collimator: '90°',
					jaws: '12 × 12 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Asymmetric'
				}
			},
			{
				name: 'PA',
				mu: 96,
				doseRate: 400,
				geometry: {
					gantry: '180°',
					collimator: '90°',
					jaws: '12 × 12 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Asymmetric'
				}
			}
		]
	},
	{
		patient: 'Robert Hayes',
		mrn: 'AU-24519',
		siteLabel: 'Prostate VMAT',
		siteKey: 'pelvis',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		technique: 'Dual-Arc VMAT',
		energy: '6 MV',
		fraction: '8 / 28',
		billing: {
			treatmentCode: '77407',
			level: 'Level 2',
			reason: 'Single-isocenter modulated photon delivery'
		},
		note: 'Verify arc start geometry, retract imaging hardware, then observe prescribed gantry, MLC, and dose-rate modulation during each arc.',
		immobilization: {
			required: ['kneeSupport', 'footStocks'],
			orderSummary: 'Supine pelvic VMAT setup with reproducible leg support.',
			instructions: [
				'Support the knees symmetrically to reduce pelvic rotation.',
				'Use paired distal-foot positioning to reproduce lower-extremity alignment.',
				'Confirm neutral pelvis and HFS orientation before CBCT.'
			]
		},
		planned: {
			gantry: '180°',
			collimator: '30°',
			jaws: '12 × 12 cm',
			mlcAperture: '11 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Arc 1',
				mode: 'VMAT',
				mu: 286,
				doseRate: 600,
				arc: { start: 180, stop: 185, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '180°',
					collimator: '30°',
					jaws: '12 × 12 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 11.0, mlcShape: 'Conformal', doseRate: 360 },
					{ muFraction: 0.12, mlcAperture: 8.5, mlcShape: 'Conformal', doseRate: 480 },
					{ muFraction: 0.25, mlcAperture: 6.5, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.38, mlcAperture: 9.0, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 0.5, mlcAperture: 7.5, mlcShape: 'Conformal', doseRate: 420 },
					{ muFraction: 0.63, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 580 },
					{ muFraction: 0.75, mlcAperture: 7.0, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.88, mlcAperture: 9.5, mlcShape: 'Conformal', doseRate: 460 },
					{ muFraction: 1.0, mlcAperture: 11.0, mlcShape: 'Conformal', doseRate: 340 }
				]
			},
			{
				name: 'Arc 2',
				mode: 'VMAT',
				mu: 274,
				doseRate: 600,
				arc: { start: 185, stop: 180, direction: 'CCW', fullArc: true },
				geometry: {
					gantry: '185°',
					collimator: '330°',
					jaws: '12 × 12 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 340 },
					{ muFraction: 0.12, mlcAperture: 7.5, mlcShape: 'Conformal', doseRate: 500 },
					{ muFraction: 0.25, mlcAperture: 9.0, mlcShape: 'Conformal', doseRate: 580 },
					{ muFraction: 0.38, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.5, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 450 },
					{ muFraction: 0.63, mlcAperture: 10.5, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.75, mlcAperture: 7.0, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.88, mlcAperture: 8.5, mlcShape: 'Conformal', doseRate: 480 },
					{ muFraction: 1.0, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 320 }
				]
			}
		]
	},
	{
		patient: 'Maya Reynolds',
		mrn: 'AU-24602',
		siteLabel: 'Brain Metastasis SRS',
		siteKey: 'brain',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		technique: 'Frameless SRS · Noncoplanar VMAT',
		energy: '6 MV FFF',
		fraction: '1 / 1',
		billing: {
			treatmentCode: '77372',
			level: 'LINAC-based SRS delivery',
			reason: 'Single-session cranial stereotactic radiosurgery delivered on a linear accelerator'
		},
		note: 'High-precision stereotactic workflow. Complete 6DOF CBCT alignment, set each prescribed treatment couch angle, perform a collision dry run, and complete the SRS timeout before beam enable.',
		stereotactic: {
			type: 'SRS',
			label: 'Frameless intracranial SRS',
			translationTolerance: 0.5,
			rotationTolerance: 0.25,
			immobilization: 'Frameless thermoplastic mask'
		},
		immobilization: {
			required: ['headMask', 'headrest'],
			orderSummary: 'High-precision cranial fixation with indexed occipital support.',
			instructions: [
				'Use rigid cranial fixation capable of stereotactic reproducibility.',
				'Use an indexed occipital support and confirm neutral head position.',
				'Verify the fixation is fully secured before 6DOF imaging and couch rotation.'
			]
		},
		planned: {
			gantry: '180°',
			collimator: '30°',
			jaws: '6 × 6 cm',
			mlcAperture: '5 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm',
			couchAngle: '0°'
		},
		fields: [
			{
				name: 'Arc 1 · Coplanar',
				mode: 'VMAT',
				mu: 865,
				doseRate: 1200,
				arc: { start: 180, stop: 185, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '180°',
					collimator: '30°',
					jaws: '6 × 6 cm',
					mlcAperture: '5 cm',
					mlcShape: 'Conformal',
					couchAngle: '0°'
				},
				controlPoints: [
					{ muFraction: 0, mlcAperture: 5, mlcShape: 'Conformal', doseRate: 800 },
					{ muFraction: 0.2, mlcAperture: 4.5, mlcShape: 'Conformal', doseRate: 1100 },
					{ muFraction: 0.4, mlcAperture: 4, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 0.6, mlcAperture: 4.8, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 0.8, mlcAperture: 4.2, mlcShape: 'Conformal', doseRate: 1000 },
					{ muFraction: 1, mlcAperture: 5, mlcShape: 'Conformal', doseRate: 800 }
				]
			},
			{
				name: 'Arc 2 · Couch +45°',
				mode: 'VMAT',
				mu: 515,
				doseRate: 1200,
				arc: { start: 300, stop: 60, direction: 'CCW', fullArc: false },
				geometry: {
					gantry: '300°',
					collimator: '330°',
					jaws: '6 × 6 cm',
					mlcAperture: '5 cm',
					mlcShape: 'Conformal',
					couchAngle: '45°'
				},
				controlPoints: [
					{ muFraction: 0, mlcAperture: 5, mlcShape: 'Conformal', doseRate: 700 },
					{ muFraction: 0.25, mlcAperture: 4.2, mlcShape: 'Conformal', doseRate: 1050 },
					{ muFraction: 0.5, mlcAperture: 4, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 0.75, mlcAperture: 4.6, mlcShape: 'Conformal', doseRate: 1050 },
					{ muFraction: 1, mlcAperture: 5, mlcShape: 'Conformal', doseRate: 700 }
				]
			},
			{
				name: 'Arc 3 · Couch −45°',
				mode: 'VMAT',
				mu: 502,
				doseRate: 1200,
				arc: { start: 60, stop: 300, direction: 'CW', fullArc: false },
				geometry: {
					gantry: '60°',
					collimator: '30°',
					jaws: '6 × 6 cm',
					mlcAperture: '5 cm',
					mlcShape: 'Conformal',
					couchAngle: '315°'
				},
				controlPoints: [
					{ muFraction: 0, mlcAperture: 5, mlcShape: 'Conformal', doseRate: 700 },
					{ muFraction: 0.25, mlcAperture: 4.5, mlcShape: 'Conformal', doseRate: 1000 },
					{ muFraction: 0.5, mlcAperture: 4, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 0.75, mlcAperture: 4.4, mlcShape: 'Conformal', doseRate: 1050 },
					{ muFraction: 1, mlcAperture: 5, mlcShape: 'Conformal', doseRate: 700 }
				]
			}
		]
	},
	{
		patient: 'Anthony Brooks',
		mrn: 'AU-24631',
		siteLabel: 'Right Upper Lobe Lung SBRT',
		siteKey: 'chest',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		technique: 'SBRT · Respiratory-Gated Dual-Arc VMAT',
		energy: '6 MV FFF',
		fraction: '1 / 5',
		billing: {
			treatmentCode: '77373',
			level: 'SBRT treatment delivery per fraction',
			reason:
				'Extracranial stereotactic body treatment delivered per fraction in a five-fraction course',
			igrtHandling: 'not-assessed'
		},
		note: 'SBRT workflow: complete 4D respiratory characterization, high-precision 6DOF CBCT, arc clearance dry run, SBRT timeout, and gated dual-arc VMAT delivery.',
		stereotactic: {
			type: 'SBRT',
			label: 'Peripheral lung SBRT · 50 Gy / 5 fx',
			translationTolerance: 1.0,
			rotationTolerance: 0.5,
			immobilization: 'Indexed vacuum immobilization'
		},
		motionManagement: {
			type: 'GATED',
			label: '4D phase-gated lung SBRT',
			period: 4.2,
			siExcursion: 12,
			apExcursion: 5,
			lrExcursion: 2,
			gateLow: 40,
			gateHigh: 60
		},
		immobilization: {
			required: ['wingBoard', 'vacLok'],
			orderSummary: 'Indexed arms-up thoracic SBRT immobilization.',
			instructions: [
				'Elevate both arms in a reproducible overhead support.',
				'Use a moldable indexed vacuum cradle around the thorax/upper abdomen.',
				'Confirm the respiratory monitoring region is unobstructed and the body is centered.'
			]
		},
		planned: {
			gantry: '180°',
			collimator: '30°',
			jaws: '8 × 8 cm',
			mlcAperture: '6 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm',
			couchAngle: '0°'
		},
		fields: [
			{
				name: 'SBRT Arc 1 · CW',
				mode: 'VMAT',
				mu: 1460,
				doseRate: 1400,
				arc: { start: 180, stop: 185, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '180°',
					collimator: '30°',
					jaws: '8 × 8 cm',
					mlcAperture: '6 cm',
					mlcShape: 'Conformal',
					couchAngle: '0°'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 800 },
					{ muFraction: 0.15, mlcAperture: 5.2, mlcShape: 'Conformal', doseRate: 1100 },
					{ muFraction: 0.3, mlcAperture: 4.4, mlcShape: 'Conformal', doseRate: 1400 },
					{ muFraction: 0.5, mlcAperture: 3.8, mlcShape: 'Conformal', doseRate: 1400 },
					{ muFraction: 0.7, mlcAperture: 4.6, mlcShape: 'Conformal', doseRate: 1250 },
					{ muFraction: 0.85, mlcAperture: 5.3, mlcShape: 'Conformal', doseRate: 1050 },
					{ muFraction: 1.0, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 800 }
				]
			},
			{
				name: 'SBRT Arc 2 · CCW',
				mode: 'VMAT',
				mu: 1435,
				doseRate: 1400,
				arc: { start: 185, stop: 180, direction: 'CCW', fullArc: true },
				geometry: {
					gantry: '185°',
					collimator: '330°',
					jaws: '8 × 8 cm',
					mlcAperture: '6 cm',
					mlcShape: 'Conformal',
					couchAngle: '0°'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 800 },
					{ muFraction: 0.15, mlcAperture: 5.0, mlcShape: 'Conformal', doseRate: 1150 },
					{ muFraction: 0.3, mlcAperture: 4.2, mlcShape: 'Conformal', doseRate: 1400 },
					{ muFraction: 0.5, mlcAperture: 3.6, mlcShape: 'Conformal', doseRate: 1400 },
					{ muFraction: 0.7, mlcAperture: 4.5, mlcShape: 'Conformal', doseRate: 1300 },
					{ muFraction: 0.85, mlcAperture: 5.1, mlcShape: 'Conformal', doseRate: 1100 },
					{ muFraction: 1.0, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 800 }
				]
			}
		]
	},
	{
		patient: 'Rachel Morgan',
		mrn: 'AU-24710',
		siteLabel: 'Left Breast + Supraclavicular',
		siteKey: 'breast',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.68,
		setupBodyX: 0.1,
		technique: '3-Field Breast · SCV + Tangent Matchline',
		energy: '6 MV',
		fraction: '9 / 25',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Multiple-isocenter photon treatment with matched supraclavicular and tangent fields'
		},
		note: 'Verify the supraclavicular-to-tangent junction before treating. The simulator uses a simplified half-beam matchline exercise to teach gap/overlap recognition.',
		specialSetup: {
			type: 'BREAST_MATCH',
			label: 'SCV / tangent matchline',
			toleranceMm: 1,
			matchTechnique: 'Half-beam field-edge match'
		},
		immobilization: {
			required: ['breastBoard', 'armSupport'],
			orderSummary: 'Inclined breast/nodal setup with bilateral arm elevation.',
			instructions: [
				'Use an indexed inclined support appropriate for breast and nodal treatment.',
				'Elevate both arms with the dedicated bilateral support.',
				'Confirm the head is turned away from the treated side and the SCV/tangent junction is reproducible.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '16 × 16 cm',
			mlcAperture: '14 cm',
			mlcShape: 'Conformal',
			imaging: 'None',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Supraclavicular AP',
				mu: 112,
				doseRate: 600,
				targetRegion: 'Supraclavicular / low neck',
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '16 × 16 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Conformal',
					couch: '0 / 0 / 0 mm',
					couchAngle: '0°'
				}
			},
			{
				name: 'Medial Tangent',
				mu: 174,
				doseRate: 600,
				targetRegion: 'Left breast / chest wall',
				geometry: {
					gantry: '300°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal',
					couch: '0 / +2 / 0 mm',
					couchAngle: '355°'
				}
			},
			{
				name: 'Lateral Tangent',
				mu: 181,
				doseRate: 600,
				targetRegion: 'Left breast / chest wall',
				geometry: {
					gantry: '120°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal',
					couch: '0 / +2 / 0 mm',
					couchAngle: '5°'
				}
			}
		]
	},
	{
		patient: 'Evan Cole',
		mrn: 'AU-24724',
		siteLabel: 'Craniospinal Axis',
		siteKey: 'spine',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.86,
		setupBodyX: 0,
		technique: 'Total Craniospinal Irradiation · Matched Fields',
		energy: '6 MV',
		fraction: '5 / 13',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Multiple-isocenter photon treatment across cranial and spinal treatment regions'
		},
		note: 'Verify cranial and spinal indexing plus both field junctions before delivery. The lateral cranial fields use plan-specific couch/collimator kicks to account for divergence at the PA-spine junction.',
		specialSetup: {
			type: 'CSI',
			label: 'Craniospinal multi-isocenter junctions',
			toleranceMm: 1,
			junctionA: 'Cranial / Upper Spine',
			junctionB: 'Upper / Lower Spine'
		},
		immobilization: {
			required: ['hnMask', 'headrest'],
			orderSummary: 'Cranial fixation with reproducible head/shoulder position for CSI.',
			instructions: [
				'Use rigid fixation covering the cranium and upper shoulder region.',
				'Use an indexed occipital support to reproduce head position.',
				'Keep the body straight with arms at the sides before verifying cranial/spine junctions.'
			]
		},
		planned: {
			gantry: '270°',
			collimator: '0°',
			jaws: '20 × 20 cm',
			mlcAperture: '18 cm',
			mlcShape: 'Conformal',
			imaging: 'None',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Cranial Right Lateral',
				station: 'Cranial',
				mu: 118,
				doseRate: 600,
				targetRegion: 'Cranial contents / cervical junction',
				geometry: {
					gantry: '270°',
					collimator: '5°',
					jaws: '20 × 20 cm',
					mlcAperture: '18 cm',
					mlcShape: 'Conformal',
					couch: '0 / 0 / 0 mm',
					couchAngle: '355°'
				}
			},
			{
				name: 'Cranial Left Lateral',
				station: 'Cranial',
				mu: 118,
				doseRate: 600,
				targetRegion: 'Cranial contents / cervical junction',
				geometry: {
					gantry: '90°',
					collimator: '355°',
					jaws: '20 × 20 cm',
					mlcAperture: '18 cm',
					mlcShape: 'Conformal',
					couch: '0 / 0 / 0 mm',
					couchAngle: '5°'
				}
			},
			{
				name: 'Upper Spine PA',
				station: 'Upper Spine',
				mu: 146,
				doseRate: 600,
				targetRegion: 'Upper spinal canal',
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '20 × 20 cm',
					mlcAperture: '18 cm',
					mlcShape: 'Conformal',
					couch: '0 / +6 / 0 mm',
					couchAngle: '0°'
				}
			},
			{
				name: 'Lower Spine PA',
				station: 'Lower Spine',
				mu: 152,
				doseRate: 600,
				targetRegion: 'Lower spinal canal',
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '20 × 20 cm',
					mlcAperture: '18 cm',
					mlcShape: 'Conformal',
					couch: '0 / +12 / 0 mm',
					couchAngle: '0°'
				}
			}
		]
	},
	{
		patient: 'Patricia Moore',
		mrn: 'AU-24739',
		siteLabel: 'Left Chest Wall Scar · Electron',
		siteKey: 'chest',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.45,
		setupBodyX: 0.12,
		technique: 'Custom Electron Cutout',
		energy: '9 MeV electrons',
		fraction: '3 / 10',
		billing: {
			treatmentCode: '77402',
			level: 'Level 1',
			reason: 'Single electron treatment field'
		},
		note: 'Create and verify the custom cutout before treatment. The electron applicator/cutout defines the final field; MLC verification is not used for this electron beam.',
		specialSetup: {
			type: 'ELECTRON',
			label: 'Electron cutout creation & fabrication',
			shape: 'Oval',
			widthCm: 6,
			heightCm: 4,
			cone: '10 × 10 cm',
			ssdCm: 100,
			bolusThicknessCm: 0.5
		},
		immobilization: {
			required: ['breastBoard', 'armSupport'],
			orderSummary: 'Breast-treatment position retained for the electron scar field.',
			instructions: [
				'Use an indexed inclined support matching the breast-treatment posture.',
				'Elevate both arms with the bilateral support.',
				'Center the chest-wall scar beneath the electron central ray before accessory and bolus setup.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '10 × 10 cm',
			mlcAperture: '10 cm',
			mlcShape: 'Square',
			imaging: 'None',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: '9 MeV Electron · Custom Cutout',
				electron: true,
				mu: 205,
				doseRate: 400,
				targetRegion: 'Left chest-wall scar',
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '10 × 10 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Square',
					couch: '0 / 0 / 0 mm',
					couchAngle: '0°'
				}
			}
		]
	},
	{
		patient: 'Noah Patel',
		mrn: 'AU-24782',
		siteLabel: 'Bladder Adaptive RT',
		siteKey: 'pelvis',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		technique: 'Adaptive RT · Bladder Plan-of-the-Day',
		energy: '6 MV',
		fraction: '8 / 20',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Adaptive multi-field photon treatment delivery after daily anatomy review'
		},
		note: 'Assess the daily pelvic anatomy, select the correct adaptive bladder plan, and approve the adapted treatment before beam enable.',
		immobilization: {
			required: ['kneeSupport', 'footStocks'],
			orderSummary: 'Supine pelvic adaptive setup with reproducible lower-extremity position.',
			instructions: [
				'Support the knees symmetrically to reduce pelvic rotation.',
				'Use paired distal-foot positioning to reproduce leg alignment.',
				'Confirm the pelvis is neutral before daily CBCT and adaptive-plan selection.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '12 × 12 cm',
			mlcAperture: '12 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		adaptive: {
			label: 'Daily bladder plan selection',
			defaultPlanKey: 'medium',
			course: {
				prescriptionGy: 55,
				totalFractions: 20,
				dosePerFractionGy: 2.75,
				rectumTeachingReferenceGy: 24,
				bowelTeachingReferenceGy: 15,
				seedHistory: [
					{ fx: 1, scenarioIndex: 1, planKey: 'medium' },
					{ fx: 2, scenarioIndex: 0, planKey: 'small' },
					{ fx: 3, scenarioIndex: 1, planKey: 'medium' },
					{ fx: 4, scenarioIndex: 2, planKey: 'large' },
					{ fx: 5, scenarioIndex: 1, planKey: 'medium' },
					{ fx: 6, scenarioIndex: 0, planKey: 'small' },
					{ fx: 7, scenarioIndex: 1, planKey: 'medium' }
				]
			},
			scenarios: [
				{
					title: 'Daily CBCT: small bladder / fuller rectum',
					summary:
						'The bladder is underfilled and the posterior contour sits closer to the high-dose region than on the reference plan.',
					findings: [
						'Reduced bladder filling compared with simulation.',
						'Posterior bladder wall lies closer to the rectum.',
						'Small-volume target envelope best reproduces today’s anatomy.'
					],
					recommendedPlan: 'small'
				},
				{
					title: 'Daily CBCT: medium bladder / expected anatomy',
					summary:
						'Today’s bladder and rectal filling are close to the reference simulation dataset.',
					findings: [
						'Bladder volume approximates the simulation scan.',
						'Target/OAR relationship is near baseline.',
						'The reference-size plan should provide the most balanced coverage.'
					],
					recommendedPlan: 'medium'
				},
				{
					title: 'Daily CBCT: large bladder / bowel displaced superiorly',
					summary:
						'The bladder is more distended than at simulation and a larger anterior-superior target envelope is needed.',
					findings: [
						'Increased bladder filling with superior/anterior expansion.',
						'Small bowel is displaced superiorly.',
						'Largest treatment envelope best matches the current target shape.'
					],
					recommendedPlan: 'large'
				}
			],
			plans: {
				small: {
					title: 'Small bladder plan',
					summary: 'Tighter target envelope for underfilled bladder anatomy.',
					metrics: [
						'Smaller target envelope',
						'Lower normal-tissue exposure when anatomy is small',
						'May under-cover a distended bladder'
					],
					planned: {
						gantry: '0°',
						collimator: '0°',
						jaws: '10 × 10 cm',
						mlcAperture: '10 cm',
						mlcShape: 'Conformal',
						imaging: 'kV arms extended',
						odi: 'On',
						couch: '0 / 0 / 0 mm'
					},
					fields: [
						{
							name: 'AP',
							mu: 108,
							doseRate: 600,
							geometry: {
								gantry: '0°',
								collimator: '0°',
								jaws: '10 × 10 cm',
								mlcAperture: '10 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'PA',
							mu: 102,
							doseRate: 600,
							geometry: {
								gantry: '180°',
								collimator: '0°',
								jaws: '10 × 10 cm',
								mlcAperture: '10 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'Right Lateral',
							mu: 94,
							doseRate: 600,
							geometry: {
								gantry: '270°',
								collimator: '0°',
								jaws: '10 × 10 cm',
								mlcAperture: '10 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'Left Lateral',
							mu: 94,
							doseRate: 600,
							geometry: {
								gantry: '90°',
								collimator: '0°',
								jaws: '10 × 10 cm',
								mlcAperture: '10 cm',
								mlcShape: 'Conformal'
							}
						}
					]
				},
				medium: {
					title: 'Medium bladder plan',
					summary: 'Reference adaptive plan matching simulation-sized bladder.',
					metrics: [
						'Reference-size target envelope',
						'Balanced bowel/rectum exposure',
						'Best when anatomy approximates simulation'
					],
					planned: {
						gantry: '0°',
						collimator: '0°',
						jaws: '12 × 12 cm',
						mlcAperture: '12 cm',
						mlcShape: 'Conformal',
						imaging: 'kV arms extended',
						odi: 'On',
						couch: '0 / 0 / 0 mm'
					},
					fields: [
						{
							name: 'AP',
							mu: 116,
							doseRate: 600,
							geometry: {
								gantry: '0°',
								collimator: '0°',
								jaws: '12 × 12 cm',
								mlcAperture: '12 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'PA',
							mu: 108,
							doseRate: 600,
							geometry: {
								gantry: '180°',
								collimator: '0°',
								jaws: '12 × 12 cm',
								mlcAperture: '12 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'Right Lateral',
							mu: 100,
							doseRate: 600,
							geometry: {
								gantry: '270°',
								collimator: '0°',
								jaws: '12 × 12 cm',
								mlcAperture: '12 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'Left Lateral',
							mu: 100,
							doseRate: 600,
							geometry: {
								gantry: '90°',
								collimator: '0°',
								jaws: '12 × 12 cm',
								mlcAperture: '12 cm',
								mlcShape: 'Conformal'
							}
						}
					]
				},
				large: {
					title: 'Large bladder plan',
					summary: 'Expanded target envelope for a distended bladder.',
					metrics: [
						'Expanded target envelope',
						'Protects coverage when bladder is distended',
						'Can increase OAR exposure when anatomy is small'
					],
					planned: {
						gantry: '0°',
						collimator: '0°',
						jaws: '14 × 14 cm',
						mlcAperture: '14 cm',
						mlcShape: 'Conformal',
						imaging: 'kV arms extended',
						odi: 'On',
						couch: '0 / 0 / 0 mm'
					},
					fields: [
						{
							name: 'AP',
							mu: 124,
							doseRate: 600,
							geometry: {
								gantry: '0°',
								collimator: '0°',
								jaws: '14 × 14 cm',
								mlcAperture: '14 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'PA',
							mu: 116,
							doseRate: 600,
							geometry: {
								gantry: '180°',
								collimator: '0°',
								jaws: '14 × 14 cm',
								mlcAperture: '14 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'Right Lateral',
							mu: 108,
							doseRate: 600,
							geometry: {
								gantry: '270°',
								collimator: '0°',
								jaws: '14 × 14 cm',
								mlcAperture: '14 cm',
								mlcShape: 'Conformal'
							}
						},
						{
							name: 'Left Lateral',
							mu: 108,
							doseRate: 600,
							geometry: {
								gantry: '90°',
								collimator: '0°',
								jaws: '14 × 14 cm',
								mlcAperture: '14 cm',
								mlcShape: 'Conformal'
							}
						}
					]
				}
			}
		},
		fields: [
			{
				name: 'AP',
				mu: 116,
				doseRate: 600,
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '12 × 12 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'PA',
				mu: 108,
				doseRate: 600,
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '12 × 12 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Right Lateral',
				mu: 100,
				doseRate: 600,
				geometry: {
					gantry: '270°',
					collimator: '0°',
					jaws: '12 × 12 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Left Lateral',
				mu: 100,
				doseRate: 600,
				geometry: {
					gantry: '90°',
					collimator: '0°',
					jaws: '12 × 12 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Daniel Cho',
		mrn: 'AU-24801',
		siteLabel: 'Left Frontal Glioblastoma',
		siteKey: 'brain',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.84,
		technique: 'Primary Brain 3-Field',
		energy: '6 MV',
		fraction: '14 / 30',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Multi-field photon treatment delivery to a primary brain tumor'
		},
		note: 'Primary brain treatment. Reproduce the thermoplastic mask setup, confirm field identity, and verify conventional multi-field brain geometry before beam enable.',
		immobilization: {
			required: ['headMask', 'headrest'],
			orderSummary: 'Rigid cranial fixation with indexed occipital support.',
			instructions: [
				'Use rigid fixation that conforms around the cranium and face.',
				'Use an indexed support beneath the occiput to reproduce neutral head position.',
				'Confirm HFS orientation and that the fixation is locked to the tabletop index.'
			]
		},
		planned: {
			gantry: '270°',
			collimator: '0°',
			jaws: '16 × 18 cm',
			mlcAperture: '14 cm',
			mlcShape: 'Conformal',
			imaging: 'MV panel extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Right Lateral',
				mu: 154,
				doseRate: 600,
				targetRegion: 'Left frontal lobe / whole target envelope',
				geometry: {
					gantry: '270°',
					collimator: '0°',
					jaws: '16 × 18 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Left Lateral',
				mu: 148,
				doseRate: 600,
				targetRegion: 'Left frontal lobe / whole target envelope',
				geometry: {
					gantry: '90°',
					collimator: '0°',
					jaws: '16 × 18 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'AP Boost',
				mu: 96,
				doseRate: 600,
				targetRegion: 'Left frontal boost volume',
				geometry: {
					gantry: '0°',
					collimator: '90°',
					jaws: '10 × 12 cm',
					mlcAperture: '9 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Marcus Lee',
		mrn: 'AU-24812',
		siteLabel: 'Oropharynx + Bilateral Neck',
		siteKey: 'hneck',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.72,
		technique: 'Head & Neck Multi-Field',
		energy: '6 MV',
		fraction: '18 / 35',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Multi-field photon treatment delivery to the head and neck'
		},
		note: 'Use a head-and-shoulder mask with indexed shoulder pull-downs. Verify the AP low-neck field and the opposed upper-neck laterals before treatment.',
		immobilization: {
			required: ['hnMask', 'headrest', 'shoulderPull'],
			orderSummary: 'Rigid head-and-shoulder fixation with reproducible shoulder depression.',
			instructions: [
				'Use rigid fixation extending from the cranium through the shoulders.',
				'Use an indexed occipital support to reproduce neck extension.',
				'Add the device that maintains inferior shoulder position and verify bilateral symmetry.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '14 × 18 cm',
			mlcAperture: '12 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'AP Low Neck',
				mu: 112,
				doseRate: 600,
				targetRegion: 'Lower cervical lymphatics',
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '14 × 18 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Right Lateral Upper Neck',
				mu: 136,
				doseRate: 600,
				targetRegion: 'Primary site / upper neck',
				geometry: {
					gantry: '270°',
					collimator: '0°',
					jaws: '14 × 14 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Left Lateral Upper Neck',
				mu: 136,
				doseRate: 600,
				targetRegion: 'Primary site / upper neck',
				geometry: {
					gantry: '90°',
					collimator: '0°',
					jaws: '14 × 14 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Helen Garcia',
		mrn: 'AU-24820',
		siteLabel: 'Mid-Thoracic Esophagus',
		siteKey: 'chest',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.42,
		technique: 'Thorax Multi-Field 3DCRT',
		energy: '10 MV',
		fraction: '11 / 28',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Conventional multi-field thoracic photon treatment delivery'
		},
		note: 'Conventional thoracic case intended to contrast with IMRT/VMAT. Verify the AP/PA fields and weighted oblique fields for an esophageal target.',
		immobilization: {
			required: ['wingBoard', 'vacLok'],
			orderSummary: 'Arms-up thoracic immobilization with indexed posterior support.',
			instructions: [
				'Elevate both arms using a support that keeps elbows and hands reproducible.',
				'Add a moldable indexed posterior cradle for the upper torso.',
				'Keep the thorax centered and shoulders symmetric before imaging.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '12 × 18 cm',
			mlcAperture: '11 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'AP',
				mu: 88,
				doseRate: 600,
				targetRegion: 'Mid-thoracic esophagus',
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '12 × 18 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'PA',
				mu: 96,
				doseRate: 600,
				targetRegion: 'Mid-thoracic esophagus',
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '12 × 18 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'RPO',
				mu: 74,
				doseRate: 600,
				targetRegion: 'Mid-thoracic esophagus',
				geometry: {
					gantry: '140°',
					collimator: '0°',
					jaws: '11 × 16 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'LPO',
				mu: 74,
				doseRate: 600,
				targetRegion: 'Mid-thoracic esophagus',
				geometry: {
					gantry: '220°',
					collimator: '0°',
					jaws: '11 × 16 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Dana Collins',
		mrn: 'AU-24831',
		siteLabel: 'Right Breast IMRT',
		siteKey: 'breast',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.48,
		setupBodyX: -0.08,
		technique: 'Breast IMRT · Fixed-Field',
		energy: '6 MV',
		fraction: '10 / 28',
		billing: {
			treatmentCode: '77407',
			level: 'Level 2',
			reason: 'Single-isocenter modulated photon delivery to the breast'
		},
		note: 'Breast IMRT case. Use the breast board setup, verify the fixed-field start geometry, then observe step-and-shoot IMRT leaf shaping through the beam delivery sequence.',
		immobilization: {
			required: ['breastBoard', 'armSupport'],
			orderSummary: 'Inclined breast setup with both arms elevated and reproducibly supported.',
			instructions: [
				'Use an indexed inclined support appropriate for breast treatment.',
				'Elevate both arms with the dedicated bilateral arm support.',
				'Rotate the head slightly away from the treated side and reproduce board index/angle.'
			]
		},
		planned: {
			gantry: '300°',
			collimator: '15°',
			jaws: '18 × 18 cm',
			mlcAperture: '16 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'IMRT Field 1',
				mode: 'IMRT',
				mu: 128,
				doseRate: 600,
				geometry: {
					gantry: '300°',
					collimator: '15°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 16.0, mlcShape: 'Conformal', doseRate: 360 },
					{ muFraction: 0.33, mlcAperture: 12.5, mlcShape: 'Conformal', doseRate: 500 },
					{ muFraction: 0.66, mlcAperture: 10.5, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 1.0, mlcAperture: 16.0, mlcShape: 'Conformal', doseRate: 360 }
				]
			},
			{
				name: 'IMRT Field 2',
				mode: 'IMRT',
				mu: 122,
				doseRate: 600,
				geometry: {
					gantry: '315°',
					collimator: '10°',
					jaws: '18 × 18 cm',
					mlcAperture: '15 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 15.0, mlcShape: 'Conformal', doseRate: 360 },
					{ muFraction: 0.35, mlcAperture: 11.0, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 0.7, mlcAperture: 9.5, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 1.0, mlcAperture: 15.0, mlcShape: 'Conformal', doseRate: 360 }
				]
			},
			{
				name: 'IMRT Field 3',
				mode: 'IMRT',
				mu: 118,
				doseRate: 600,
				geometry: {
					gantry: '120°',
					collimator: '345°',
					jaws: '18 × 18 cm',
					mlcAperture: '15 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 15.0, mlcShape: 'Conformal', doseRate: 340 },
					{ muFraction: 0.34, mlcAperture: 11.8, mlcShape: 'Conformal', doseRate: 480 },
					{ muFraction: 0.67, mlcAperture: 10.2, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 1.0, mlcAperture: 15.0, mlcShape: 'Conformal', doseRate: 340 }
				]
			},
			{
				name: 'IMRT Field 4',
				mode: 'IMRT',
				mu: 114,
				doseRate: 600,
				geometry: {
					gantry: '135°',
					collimator: '350°',
					jaws: '18 × 18 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 14.0, mlcShape: 'Conformal', doseRate: 340 },
					{ muFraction: 0.33, mlcAperture: 10.8, mlcShape: 'Conformal', doseRate: 500 },
					{ muFraction: 0.66, mlcAperture: 9.6, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 1.0, mlcAperture: 14.0, mlcShape: 'Conformal', doseRate: 340 }
				]
			}
		]
	},
	{
		patient: 'Maria Santos',
		mrn: 'AU-24845',
		siteLabel: 'Pancreas',
		siteKey: 'abdomen',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.02,
		technique: 'Abdomen 4-Field Box',
		energy: '10 MV',
		fraction: '9 / 25',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Conventional multi-field abdominal photon treatment delivery'
		},
		note: 'Abdominal multi-field case. Verify the 4-field box geometry and ensure the selected field is directed to the upper abdominal target volume.',
		immobilization: {
			required: ['vacLok', 'kneeSupport'],
			orderSummary:
				'Supine upper-abdominal immobilization with posterior molding and knee support.',
			instructions: [
				'Use a moldable indexed cradle beneath the torso to limit rotation.',
				'Support the knees to reduce lumbar strain and improve reproducibility.',
				'Keep arms out of the treatment field and verify midline alignment.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '14 × 14 cm',
			mlcAperture: '12 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'AP',
				mu: 102,
				doseRate: 600,
				targetRegion: 'Pancreatic bed / upper abdomen',
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '14 × 14 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'PA',
				mu: 112,
				doseRate: 600,
				targetRegion: 'Pancreatic bed / upper abdomen',
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '14 × 14 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Right Lateral',
				mu: 94,
				doseRate: 600,
				targetRegion: 'Pancreatic bed / upper abdomen',
				geometry: {
					gantry: '270°',
					collimator: '0°',
					jaws: '12 × 14 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Left Lateral',
				mu: 94,
				doseRate: 600,
				targetRegion: 'Pancreatic bed / upper abdomen',
				geometry: {
					gantry: '90°',
					collimator: '0°',
					jaws: '12 × 14 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'James Foster',
		mrn: 'AU-24856',
		siteLabel: 'Rectum · Prone Belly Board',
		siteKey: 'pelvis',
		position: 'HFP',
		positionLabel: 'Head-First Prone',
		setupSiteZ: 0.18,
		technique: 'Pelvis Multi-Field Prone',
		energy: '10 MV',
		fraction: '8 / 28',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Prone multi-field pelvic photon treatment delivery'
		},
		note: 'Prone pelvic case. The learner should recognize the belly-board setup and verify the prone field arrangement before beam enable.',
		immobilization: {
			required: ['bellyBoard'],
			orderSummary:
				'Prone pelvic setup using a board designed to displace bowel away from the pelvis.',
			instructions: [
				'Position the patient prone on the board with the abdominal/pelvic opening centered correctly.',
				'Confirm the pelvis is level and the lower abdomen can fall into the opening without pressure points.',
				'Index the board before confirming field geometry.'
			]
		},
		planned: {
			gantry: '180°',
			collimator: '0°',
			jaws: '14 × 16 cm',
			mlcAperture: '12 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'PA',
				mu: 124,
				doseRate: 600,
				targetRegion: 'Rectum / presacral pelvis',
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '14 × 16 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Right Lateral',
				mu: 98,
				doseRate: 600,
				targetRegion: 'Rectum / presacral pelvis',
				geometry: {
					gantry: '270°',
					collimator: '0°',
					jaws: '12 × 16 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Left Lateral',
				mu: 98,
				doseRate: 600,
				targetRegion: 'Rectum / presacral pelvis',
				geometry: {
					gantry: '90°',
					collimator: '0°',
					jaws: '12 × 16 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Olivia Chen',
		mrn: 'AU-24867',
		siteLabel: 'Thoracic Spine',
		siteKey: 'spine',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.24,
		technique: 'Skeletal Spine Multi-Field',
		energy: '10 MV',
		fraction: '4 / 10',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Multi-field spine photon treatment delivery'
		},
		note: 'Thoracic spine palliation case. Verify the selected field direction and ensure the beam is centered on the thoracic vertebral target rather than a generic torso region.',
		immobilization: {
			required: ['vacLok', 'kneeSupport'],
			orderSummary: 'Supine thoracic-spine setup with indexed posterior support and knee support.',
			instructions: [
				'Use a moldable indexed posterior support to reduce thoracic rotation.',
				'Support the knees for comfort and reproducibility while keeping the spine neutral.',
				'Verify the thoracic target remains centered after immobilization is secured.'
			]
		},
		planned: {
			gantry: '180°',
			collimator: '0°',
			jaws: '10 × 18 cm',
			mlcAperture: '9 cm',
			mlcShape: 'Conformal',
			imaging: 'MV panel extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'PA',
				mu: 110,
				doseRate: 600,
				targetRegion: 'Thoracic vertebral bodies',
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '10 × 18 cm',
					mlcAperture: '9 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Right Lateral',
				mu: 78,
				doseRate: 600,
				targetRegion: 'Thoracic vertebral bodies',
				geometry: {
					gantry: '270°',
					collimator: '90°',
					jaws: '10 × 14 cm',
					mlcAperture: '9 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Left Lateral',
				mu: 78,
				doseRate: 600,
				targetRegion: 'Thoracic vertebral bodies',
				geometry: {
					gantry: '90°',
					collimator: '90°',
					jaws: '10 × 14 cm',
					mlcAperture: '9 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Laura Bennett',
		mrn: 'AU-24644',
		siteLabel: 'Left Breast DIBH',
		siteKey: 'breast',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		technique: '3DCRT Tangents · DIBH',
		energy: '6 MV',
		fraction: '6 / 20',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Single-isocenter photon treatment with active DIBH motion management'
		},
		note: 'Verify reproducible deep-inspiration breath hold before treating the left-breast tangents. Beam delivery must remain inside the approved DIBH level.',
		immobilization: {
			required: ['breastBoard', 'armSupport'],
			orderSummary: 'Inclined breast DIBH setup with bilateral arm elevation.',
			instructions: [
				'Use an indexed inclined support appropriate for breast treatment.',
				'Elevate both arms with the dedicated bilateral support.',
				'Confirm the respiratory monitoring surface remains visible and head position is reproducible.'
			]
		},
		planned: {
			gantry: '300°',
			collimator: '0°',
			jaws: '18 × 18 cm',
			mlcAperture: '16 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm'
		},
		motionManagement: {
			type: 'DIBH',
			label: 'Deep Inspiration Breath Hold',
			period: 4.8,
			dibhTarget: 80,
			dibhTolerance: 5,
			practiceHolds: 3
		},
		fields: [
			{
				name: 'Medial Tangent',
				mu: 168,
				doseRate: 600,
				geometry: {
					gantry: '300°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Lateral Tangent',
				mu: 171,
				doseRate: 600,
				geometry: {
					gantry: '120°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	// ===== Rad Onc EMR Patient Library (integrated daily-treatment charts) =====
	{
		patient: 'John Smith',
		mrn: 'AU-24901',
		siteLabel: 'Glioblastoma (Post-op Tumor Bed)',
		siteKey: 'brain',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.86,
		technique: 'Dual-Arc VMAT',
		energy: '6 MV',
		fraction: '11 / 30',
		billing: {
			treatmentCode: '77386',
			level: 'Complex IMRT/VMAT delivery',
			reason: 'Single-isocenter modulated photon delivery to the post-operative brain'
		},
		note: 'EMR chart · Dr. Evelyn Reed · chart MRN 44556. Adjuvant GBM with concurrent temozolomide. Verify Aquaplast mask fixation and daily CBCT to skull anatomy before each arc.',
		immobilization: {
			required: ['headMask', 'headrest'],
			orderSummary: 'Rigid thermoplastic cranial fixation with indexed occipital support.',
			instructions: [
				'Seat the patient supine with the head neutral in the Aquaplast mask, arms down.',
				'Reproduce the indexed headrest and align to lateral / sagittal lasers on the anterior and lateral tattoos.',
				'Confirm mask lock before daily CBCT to skull anatomy.'
			]
		},
		planned: {
			gantry: '181°',
			collimator: '0°',
			jaws: '15 × 15 cm',
			mlcAperture: '13 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Arc 1 · CW',
				mode: 'VMAT',
				mu: 305,
				doseRate: 600,
				arc: { start: 181, stop: 179, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '181°',
					collimator: '0°',
					jaws: '15 × 15 cm',
					mlcAperture: '13 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 13.0, mlcShape: 'Conformal', doseRate: 420 },
					{ muFraction: 0.25, mlcAperture: 9.5, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.5, mlcAperture: 7.5, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.75, mlcAperture: 9.0, mlcShape: 'Conformal', doseRate: 540 },
					{ muFraction: 1.0, mlcAperture: 12.5, mlcShape: 'Conformal', doseRate: 420 }
				]
			},
			{
				name: 'Arc 2 · CCW',
				mode: 'VMAT',
				mu: 298,
				doseRate: 600,
				arc: { start: 179, stop: 181, direction: 'CCW', fullArc: true },
				geometry: {
					gantry: '179°',
					collimator: '0°',
					jaws: '15 × 15 cm',
					mlcAperture: '13 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 12.5, mlcShape: 'Conformal', doseRate: 420 },
					{ muFraction: 0.25, mlcAperture: 9.0, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.5, mlcAperture: 7.0, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.75, mlcAperture: 9.5, mlcShape: 'Conformal', doseRate: 540 },
					{ muFraction: 1.0, mlcAperture: 13.0, mlcShape: 'Conformal', doseRate: 420 }
				]
			}
		]
	},
	{
		patient: 'Maria Garcia',
		mrn: 'AU-24902',
		siteLabel: 'Whole Brain (Brain Metastases)',
		siteKey: 'brain',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.86,
		technique: 'Opposed Lateral 3DCRT',
		energy: '6 MV',
		fraction: '3 / 10',
		billing: {
			treatmentCode: '77402',
			level: 'Level 1',
			reason: '2D opposed photon treatment delivery to the whole brain'
		},
		note: 'EMR chart · Dr. Samuel Green · chart MRN 11223. Palliative WBRT for multiple NSCLC brain metastases (patient on pembrolizumab). Daily kV/MV field verification to skull.',
		immobilization: {
			required: ['headMask', 'headrest'],
			orderSummary: 'Thermoplastic cranial fixation with indexed occipital support.',
			instructions: [
				'Position supine with the head neutral in the thermoplastic mask, arms down.',
				'Align to lateral / sagittal lasers using the simulation skin marks.',
				'Confirm the head is straight and centered before lateral imaging.'
			]
		},
		planned: {
			gantry: '270°',
			collimator: '0°',
			jaws: '18 × 18 cm',
			mlcAperture: '16 cm',
			mlcShape: 'Conformal',
			imaging: 'MV panel extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Right Lateral',
				mu: 158,
				doseRate: 600,
				targetRegion: 'Whole brain',
				geometry: {
					gantry: '270°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Left Lateral',
				mu: 158,
				doseRate: 600,
				targetRegion: 'Whole brain',
				geometry: {
					gantry: '90°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Sarah Chen',
		mrn: 'AU-24903',
		siteLabel: 'Left Tonsil + Bilateral Neck',
		siteKey: 'hneck',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.72,
		technique: 'IMRT · Simultaneous Integrated Boost',
		energy: '6 MV',
		fraction: '20 / 35',
		billing: {
			treatmentCode: '77386',
			level: 'Complex IMRT/VMAT delivery',
			reason: 'Single-isocenter modulated photon delivery with simultaneous integrated boost'
		},
		note: 'EMR chart · Dr. James Miller · chart MRN 77889. HPV+ SCC left tonsil, SIB to 70/63/56 Gy with concurrent cisplatin. Head-and-shoulder mask; daily kV/CBCT before delivery.',
		immobilization: {
			required: ['hnMask', 'headrest', 'shoulderPull'],
			orderSummary: 'Rigid head-and-shoulder mask with indexed occipital support.',
			instructions: [
				'Position supine, head first, arms down, in the head-and-shoulder thermoplastic mask.',
				'Reproduce the indexed headrest and align to the mask tattoos (anterior, lateral R/L).',
				'Confirm bilateral shoulder symmetry before daily kV/CBCT.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '16 × 20 cm',
			mlcAperture: '14 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'IMRT Field 1',
				mode: 'IMRT',
				mu: 168,
				doseRate: 600,
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '16 × 20 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 14.0, mlcShape: 'Conformal', doseRate: 360 },
					{ muFraction: 0.33, mlcAperture: 10.5, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 0.66, mlcAperture: 8.5, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 1.0, mlcAperture: 14.0, mlcShape: 'Conformal', doseRate: 360 }
				]
			},
			{
				name: 'IMRT Field 2',
				mode: 'IMRT',
				mu: 154,
				doseRate: 600,
				geometry: {
					gantry: '120°',
					collimator: '0°',
					jaws: '15 × 18 cm',
					mlcAperture: '13 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 13.0, mlcShape: 'Conformal', doseRate: 360 },
					{ muFraction: 0.35, mlcAperture: 9.5, mlcShape: 'Conformal', doseRate: 540 },
					{ muFraction: 0.7, mlcAperture: 7.5, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 1.0, mlcAperture: 13.0, mlcShape: 'Conformal', doseRate: 360 }
				]
			},
			{
				name: 'IMRT Field 3',
				mode: 'IMRT',
				mu: 150,
				doseRate: 600,
				geometry: {
					gantry: '240°',
					collimator: '0°',
					jaws: '15 × 18 cm',
					mlcAperture: '13 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 13.0, mlcShape: 'Conformal', doseRate: 360 },
					{ muFraction: 0.34, mlcAperture: 9.8, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 0.67, mlcAperture: 7.8, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 1.0, mlcAperture: 13.0, mlcShape: 'Conformal', doseRate: 360 }
				]
			}
		]
	},
	{
		patient: 'Robert Miller',
		mrn: 'AU-24904',
		siteLabel: 'Right Upper Lobe Lung SBRT',
		siteKey: 'chest',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.45,
		technique: 'SBRT · Gated Dual-Arc VMAT',
		energy: '6 MV FFF',
		fraction: '2 / 3',
		billing: {
			treatmentCode: '77373',
			level: 'SBRT treatment delivery per fraction',
			reason:
				'Extracranial stereotactic body treatment delivered per fraction (three-fraction course)'
		},
		note: 'EMR chart · Dr. Evelyn Reed · chart MRN 99001. Medically inoperable Stage IA NSCLC, 54 Gy / 3 fx every other day. Daily CBCT ± 4D / respiratory gating.',
		stereotactic: {
			type: 'SBRT',
			label: 'Peripheral lung SBRT · 54 Gy / 3 fx',
			translationTolerance: 1.0,
			rotationTolerance: 0.5,
			immobilization: 'BodyFix / Vac-Lok with abdominal compression'
		},
		motionManagement: {
			type: 'GATED',
			label: '4D phase-gated lung SBRT',
			period: 4.2,
			siExcursion: 12,
			apExcursion: 5,
			lrExcursion: 2,
			gateLow: 40,
			gateHigh: 60
		},
		immobilization: {
			required: ['wingBoard', 'vacLok'],
			orderSummary:
				'Arms-up thoracic SBRT immobilization with indexed vacuum bag and optional abdominal compression.',
			instructions: [
				'Elevate both arms overhead on the wing board with the BodyFix / Vac-Lok bag.',
				'Apply abdominal compression if used at simulation and reproduce the index.',
				'Confirm the respiratory surrogate is unobstructed before daily CBCT.'
			]
		},
		planned: {
			gantry: '180°',
			collimator: '30°',
			jaws: '8 × 8 cm',
			mlcAperture: '6 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm',
			couchAngle: '0°'
		},
		fields: [
			{
				name: 'SBRT Arc 1 · CW',
				mode: 'VMAT',
				mu: 1520,
				doseRate: 1400,
				arc: { start: 180, stop: 185, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '180°',
					collimator: '30°',
					jaws: '8 × 8 cm',
					mlcAperture: '6 cm',
					mlcShape: 'Conformal',
					couchAngle: '0°'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 800 },
					{ muFraction: 0.2, mlcAperture: 5.0, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 0.45, mlcAperture: 4.2, mlcShape: 'Conformal', doseRate: 1400 },
					{ muFraction: 0.7, mlcAperture: 4.8, mlcShape: 'Conformal', doseRate: 1300 },
					{ muFraction: 1.0, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 800 }
				]
			},
			{
				name: 'SBRT Arc 2 · CCW',
				mode: 'VMAT',
				mu: 1495,
				doseRate: 1400,
				arc: { start: 185, stop: 180, direction: 'CCW', fullArc: true },
				geometry: {
					gantry: '185°',
					collimator: '330°',
					jaws: '8 × 8 cm',
					mlcAperture: '6 cm',
					mlcShape: 'Conformal',
					couchAngle: '0°'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 800 },
					{ muFraction: 0.2, mlcAperture: 4.9, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 0.45, mlcAperture: 4.0, mlcShape: 'Conformal', doseRate: 1400 },
					{ muFraction: 0.7, mlcAperture: 4.7, mlcShape: 'Conformal', doseRate: 1300 },
					{ muFraction: 1.0, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 800 }
				]
			}
		]
	},
	{
		patient: 'David Garcia',
		mrn: 'AU-24905',
		siteLabel: 'Right Lower Lobe Lung (3DCRT)',
		siteKey: 'chest',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.42,
		technique: 'Multi-Field 3DCRT',
		energy: '6 MV',
		fraction: '15 / 33',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Conventional multi-field thoracic photon treatment delivery'
		},
		note: 'EMR chart · Dr. Sarah Jenkins · chart MRN 55667. RLL NSCLC with involved hilar / mediastinal nodes, 66 Gy / 33 with concurrent carbo/taxol. AP/PA plus obliques; daily CBCT or kV pair.',
		immobilization: {
			required: ['wingBoard', 'vacLok'],
			orderSummary: 'Arms-up thoracic immobilization with indexed vacuum bag.',
			instructions: [
				'Elevate both arms overhead on the wing board with the BodyFix vacuum bag.',
				'Align to lateral / sagittal lasers on the anterior and lateral tattoos.',
				'Keep the thorax centered and shoulders symmetric before imaging.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '14 × 16 cm',
			mlcAperture: '12 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'AP',
				mu: 92,
				doseRate: 600,
				targetRegion: 'RLL primary + nodes',
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '14 × 16 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'PA',
				mu: 104,
				doseRate: 600,
				targetRegion: 'RLL primary + nodes',
				geometry: {
					gantry: '180°',
					collimator: '0°',
					jaws: '14 × 16 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'RPO',
				mu: 78,
				doseRate: 600,
				targetRegion: 'RLL primary + nodes',
				geometry: {
					gantry: '140°',
					collimator: '0°',
					jaws: '12 × 15 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'LPO',
				mu: 70,
				doseRate: 600,
				targetRegion: 'RLL primary + nodes',
				geometry: {
					gantry: '220°',
					collimator: '0°',
					jaws: '12 × 15 cm',
					mlcAperture: '11 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Linda Jones',
		mrn: 'AU-24906',
		siteLabel: 'Left Hilum NSCLC (VMAT)',
		siteKey: 'chest',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.44,
		technique: 'Dual-Arc VMAT',
		energy: '6 MV',
		fraction: '12 / 30',
		billing: {
			treatmentCode: '77386',
			level: 'Complex IMRT/VMAT delivery',
			reason: 'Single-isocenter modulated photon delivery to the thorax'
		},
		note: 'EMR chart · Dr. Sarah Jenkins · chart MRN 33445. Stage IIIA SCC left hilum / mediastinum, 60 Gy high / 50 Gy elective with concurrent carbo/taxol. Daily kV/CBCT.',
		immobilization: {
			required: ['wingBoard', 'vacLok'],
			orderSummary: 'Arms-up thoracic immobilization with indexed vacuum bag.',
			instructions: [
				'Elevate both arms overhead on the wing board with the vacuum bag.',
				'Center the thorax without shoulder rotation and reproduce the index.',
				'Confirm setup to tattoos before daily kV/CBCT.'
			]
		},
		planned: {
			gantry: '181°',
			collimator: '15°',
			jaws: '14 × 16 cm',
			mlcAperture: '12 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Arc 1 · CW',
				mode: 'VMAT',
				mu: 352,
				doseRate: 600,
				arc: { start: 181, stop: 179, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '181°',
					collimator: '15°',
					jaws: '14 × 16 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 12.0, mlcShape: 'Conformal', doseRate: 400 },
					{ muFraction: 0.25, mlcAperture: 8.5, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.5, mlcAperture: 6.5, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.75, mlcAperture: 9.0, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 1.0, mlcAperture: 12.0, mlcShape: 'Conformal', doseRate: 400 }
				]
			},
			{
				name: 'Arc 2 · CCW',
				mode: 'VMAT',
				mu: 338,
				doseRate: 600,
				arc: { start: 179, stop: 181, direction: 'CCW', fullArc: true },
				geometry: {
					gantry: '179°',
					collimator: '345°',
					jaws: '14 × 16 cm',
					mlcAperture: '12 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 12.0, mlcShape: 'Conformal', doseRate: 400 },
					{ muFraction: 0.25, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.5, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.75, mlcAperture: 9.5, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 1.0, mlcAperture: 12.0, mlcShape: 'Conformal', doseRate: 400 }
				]
			}
		]
	},
	{
		patient: 'Mary Peterson',
		mrn: 'AU-24907',
		siteLabel: 'Right Breast · Tangents',
		siteKey: 'breast',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.48,
		setupBodyX: -0.08,
		technique: '3DCRT Opposed Tangents',
		energy: '6 MV',
		fraction: '8 / 16',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Single-isocenter photon treatment delivery to the whole breast'
		},
		note: 'EMR chart · Dr. Angela Rossi · chart MRN 66778. Adjuvant hypofractionated whole-breast RT (42.56 Gy / 16) post-lumpectomy. Daily kV/MV pair to chest wall / ribs.',
		immobilization: {
			required: ['breastBoard', 'armSupport'],
			orderSummary: 'Inclined breast-board setup with both arms elevated.',
			instructions: [
				'Position supine on the breast board with both arms elevated in the arm support.',
				'Turn the head away from the treated right side and align to lateral / sagittal lasers.',
				'Reproduce the board angle / index using the central sternum and mid-axillary tattoos.'
			]
		},
		planned: {
			gantry: '60°',
			collimator: '0°',
			jaws: '18 × 18 cm',
			mlcAperture: '16 cm',
			mlcShape: 'Conformal',
			imaging: 'None',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Medial Tangent',
				mu: 172,
				doseRate: 600,
				targetRegion: 'Right whole breast',
				geometry: {
					gantry: '60°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Lateral Tangent',
				mu: 176,
				doseRate: 600,
				targetRegion: 'Right whole breast',
				geometry: {
					gantry: '240°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'Barbara Davis',
		mrn: 'AU-24908',
		siteLabel: 'Left Breast + Supraclavicular',
		siteKey: 'breast',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.68,
		setupBodyX: 0.1,
		technique: '3-Field Breast · SCV + Tangents',
		energy: '6 MV',
		fraction: '14 / 25',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Multiple-isocenter photon treatment with matched supraclavicular and tangent fields'
		},
		note: 'EMR chart · Dr. Angela Rossi · chart MRN 11223. HER2+ IDC left breast, 50 Gy + 10 Gy boost with nodal SCV field. Verify SCV / tangent matchline before treating.',
		specialSetup: {
			type: 'BREAST_MATCH',
			label: 'SCV / tangent matchline',
			toleranceMm: 1,
			matchTechnique: 'Half-beam field-edge match'
		},
		immobilization: {
			required: ['wingBoard', 'armSupport'],
			orderSummary: 'Inclined breast / nodal setup with bilateral arm elevation.',
			instructions: [
				'Position supine on the wing board with both arms elevated and the head turned slightly right.',
				'Align to the sternal notch, mid-axillary, and SCV-border tattoos.',
				'Confirm the supraclavicular-to-tangent junction is reproducible before treatment.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '16 × 16 cm',
			mlcAperture: '14 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Supraclavicular AP',
				mu: 118,
				doseRate: 600,
				targetRegion: 'Left supraclavicular / low neck',
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '16 × 16 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Conformal',
					couchAngle: '0°'
				}
			},
			{
				name: 'Medial Tangent',
				mu: 178,
				doseRate: 600,
				targetRegion: 'Left breast / chest wall',
				geometry: {
					gantry: '300°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal',
					couchAngle: '355°'
				}
			},
			{
				name: 'Lateral Tangent',
				mu: 184,
				doseRate: 600,
				targetRegion: 'Left breast / chest wall',
				geometry: {
					gantry: '120°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal',
					couchAngle: '5°'
				}
			}
		]
	},
	{
		patient: 'Anna Bellwether',
		mrn: 'AU-24909',
		siteLabel: 'Right Breast Boost · Electron',
		siteKey: 'breast',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.48,
		setupBodyX: -0.08,
		technique: 'Custom Electron Cutout',
		energy: '9 MeV electrons',
		fraction: '3 / 5',
		billing: {
			treatmentCode: '77402',
			level: 'Level 1',
			reason: 'Single electron treatment field to the lumpectomy cavity'
		},
		note: 'EMR chart · Dr. Angela Rossi · chart MRN 55443. Lumpectomy-cavity boost following whole-breast RT. Create and verify the cutout; match to cavity clips / chest wall.',
		specialSetup: {
			type: 'ELECTRON',
			label: 'Electron cutout creation & fabrication',
			shape: 'Oval',
			widthCm: 6,
			heightCm: 5,
			cone: '10 × 10 cm',
			ssdCm: 100,
			bolusThicknessCm: 0.5
		},
		immobilization: {
			required: ['breastBoard', 'armSupport'],
			orderSummary: 'Breast-board position retained from whole-breast RT for the electron boost.',
			instructions: [
				'Reproduce the original breast-board setup and arm support.',
				'Align to the original central-sternum and mid-axillary tattoos.',
				'Center the lumpectomy cavity beneath the electron central ray before cone / cutout setup.'
			]
		},
		planned: {
			gantry: '0°',
			collimator: '0°',
			jaws: '10 × 10 cm',
			mlcAperture: '10 cm',
			mlcShape: 'Square',
			imaging: 'None',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: '9 MeV Electron · Custom Cutout',
				electron: true,
				mu: 210,
				doseRate: 400,
				targetRegion: 'Right lumpectomy cavity',
				geometry: {
					gantry: '0°',
					collimator: '0°',
					jaws: '10 × 10 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Square',
					couchAngle: '0°'
				}
			}
		]
	},
	{
		patient: 'Susan Miller',
		mrn: 'AU-24910',
		siteLabel: 'Left Breast · Prone Setup',
		siteKey: 'breast',
		position: 'HFP',
		positionLabel: 'Head-First Prone',
		setupSiteZ: -0.48,
		setupBodyX: 0.1,
		technique: '3DCRT Tangents · Prone',
		energy: '6 MV',
		fraction: '9 / 16',
		billing: {
			treatmentCode: '77412',
			level: 'Level 3',
			reason: 'Single-isocenter photon treatment delivery to the whole breast in the prone position'
		},
		note: 'EMR chart · Dr. Angela Rossi · chart MRN 88776. DCIS w/ microinvasion, hypofractionated prone whole-breast RT (42.56 Gy / 16). Recognize the prone breast-board setup before verifying tangents.',
		immobilization: {
			required: ['breastBoard', 'armSupport'],
			orderSummary:
				'Prone breast-board setup with the treated breast dependent through the board aperture.',
			instructions: [
				'Position the patient prone on the breast board with the left breast falling through the aperture.',
				'Reproduce arm and head position and confirm the board index.',
				'Verify the prone tangent arrangement before imaging.'
			]
		},
		planned: {
			gantry: '130°',
			collimator: '0°',
			jaws: '18 × 18 cm',
			mlcAperture: '16 cm',
			mlcShape: 'Conformal',
			imaging: 'MV panel extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Medial Tangent',
				mu: 170,
				doseRate: 600,
				targetRegion: 'Left whole breast (prone)',
				geometry: {
					gantry: '130°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			},
			{
				name: 'Lateral Tangent',
				mu: 174,
				doseRate: 600,
				targetRegion: 'Left whole breast (prone)',
				geometry: {
					gantry: '310°',
					collimator: '0°',
					jaws: '18 × 18 cm',
					mlcAperture: '16 cm',
					mlcShape: 'Conformal'
				}
			}
		]
	},
	{
		patient: 'David Garcia',
		mrn: 'AU-24911',
		siteLabel: 'Pancreas Head SBRT',
		siteKey: 'abdomen',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: -0.02,
		technique: 'SBRT · Gated Dual-Arc VMAT',
		energy: '6 MV FFF',
		fraction: '3 / 5',
		billing: {
			treatmentCode: '77373',
			level: 'SBRT treatment delivery per fraction',
			reason:
				'Extracranial stereotactic body treatment delivered per fraction (five-fraction course)'
		},
		note: 'EMR chart · Dr. Robert Evans · chart MRN 22334. Borderline-resectable pancreatic head adenocarcinoma s/p FOLFIRINOX, neoadjuvant SBRT 33 Gy / 5. Daily volumetric CBCT required.',
		stereotactic: {
			type: 'SBRT',
			label: 'Pancreas SBRT · 33 Gy / 5 fx',
			translationTolerance: 1.0,
			rotationTolerance: 0.5,
			immobilization: 'Indexed vacuum immobilization'
		},
		motionManagement: {
			type: 'GATED',
			label: '4D phase-gated upper abdomen',
			period: 4.6,
			siExcursion: 9,
			apExcursion: 4,
			lrExcursion: 2,
			gateLow: 40,
			gateHigh: 60
		},
		immobilization: {
			required: ['wingBoard', 'vacLok'],
			orderSummary: 'Arms-up upper-abdominal SBRT immobilization with indexed vacuum bag.',
			instructions: [
				'Elevate both arms overhead on the wing board with the indexed vacuum bag.',
				'Reproduce any prescribed breath-hold or gating surrogate from simulation.',
				'Confirm the upper-abdomen surrogate is unobstructed before daily volumetric CBCT.'
			]
		},
		planned: {
			gantry: '180°',
			collimator: '30°',
			jaws: '10 × 10 cm',
			mlcAperture: '8 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'Off',
			couch: '0 / 0 / 0 mm',
			couchAngle: '0°'
		},
		fields: [
			{
				name: 'SBRT Arc 1 · CW',
				mode: 'VMAT',
				mu: 1180,
				doseRate: 1400,
				arc: { start: 180, stop: 185, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '180°',
					collimator: '30°',
					jaws: '10 × 10 cm',
					mlcAperture: '8 cm',
					mlcShape: 'Conformal',
					couchAngle: '0°'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 800 },
					{ muFraction: 0.25, mlcAperture: 6.4, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 0.5, mlcAperture: 5.2, mlcShape: 'Conformal', doseRate: 1400 },
					{ muFraction: 0.75, mlcAperture: 6.6, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 1.0, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 800 }
				]
			},
			{
				name: 'SBRT Arc 2 · CCW',
				mode: 'VMAT',
				mu: 1155,
				doseRate: 1400,
				arc: { start: 185, stop: 180, direction: 'CCW', fullArc: true },
				geometry: {
					gantry: '185°',
					collimator: '330°',
					jaws: '10 × 10 cm',
					mlcAperture: '8 cm',
					mlcShape: 'Conformal',
					couchAngle: '0°'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 800 },
					{ muFraction: 0.25, mlcAperture: 6.2, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 0.5, mlcAperture: 5.0, mlcShape: 'Conformal', doseRate: 1400 },
					{ muFraction: 0.75, mlcAperture: 6.5, mlcShape: 'Conformal', doseRate: 1200 },
					{ muFraction: 1.0, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 800 }
				]
			}
		]
	},
	{
		patient: 'James Wilson',
		mrn: 'AU-24912',
		siteLabel: 'Prostate + Seminal Vesicles (VMAT)',
		siteKey: 'pelvis',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: 0.18,
		technique: 'Dual-Arc VMAT',
		energy: '6 MV',
		fraction: '22 / 44',
		billing: {
			treatmentCode: '77386',
			level: 'Complex IMRT/VMAT delivery',
			reason: 'Single-isocenter modulated photon delivery to the prostate'
		},
		note: 'EMR chart · Dr. Maria Garcia · chart MRN 44556. Gleason 4+3 prostate adenocarcinoma, 79.2 Gy / 44 with ADT. Daily fiducial-based CBCT / kV before each arc.',
		immobilization: {
			required: ['kneeSupport', 'footStocks'],
			orderSummary:
				'Supine pelvic VMAT setup with reproducible lower-extremity support and bladder/rectal preparation.',
			instructions: [
				'Support both knees symmetrically and use paired foot stocks to reproduce leg rotation.',
				'Confirm the prescribed bladder-filling and rectal-emptying protocol before imaging.',
				'Match to implanted fiducial markers on daily CBCT / kV.'
			]
		},
		planned: {
			gantry: '181°',
			collimator: '15°',
			jaws: '11 × 11 cm',
			mlcAperture: '10 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Arc 1 · CW',
				mode: 'VMAT',
				mu: 392,
				doseRate: 600,
				arc: { start: 181, stop: 179, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '181°',
					collimator: '15°',
					jaws: '11 × 11 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 400 },
					{ muFraction: 0.25, mlcAperture: 7.5, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.5, mlcAperture: 6.0, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.75, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 1.0, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 400 }
				]
			},
			{
				name: 'Arc 2 · CCW',
				mode: 'VMAT',
				mu: 381,
				doseRate: 600,
				arc: { start: 179, stop: 181, direction: 'CCW', fullArc: true },
				geometry: {
					gantry: '179°',
					collimator: '345°',
					jaws: '11 × 11 cm',
					mlcAperture: '10 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 400 },
					{ muFraction: 0.25, mlcAperture: 7.2, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.5, mlcAperture: 5.8, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.75, mlcAperture: 8.2, mlcShape: 'Conformal', doseRate: 520 },
					{ muFraction: 1.0, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 400 }
				]
			}
		]
	},
	{
		patient: 'Elizabeth Green',
		mrn: 'AU-24913',
		siteLabel: 'Endometrial · Pelvic Nodes (VMAT)',
		siteKey: 'pelvis',
		position: 'HFS',
		positionLabel: 'Head-First Supine',
		setupSiteZ: 0.18,
		technique: 'Dual-Arc VMAT',
		energy: '6 MV',
		fraction: '10 / 25',
		billing: {
			treatmentCode: '77386',
			level: 'Complex IMRT/VMAT delivery',
			reason: 'Single-isocenter modulated photon delivery to the pelvis'
		},
		note: 'EMR chart · Dr. Susan Clark · chart MRN 77665. Adjuvant post-op endometrial adenocarcinoma (upper vagina + pelvic nodes), 45 Gy / 25. Daily CBCT; reproduce bladder-filling protocol.',
		immobilization: {
			required: ['kneeSupport', 'footStocks'],
			orderSummary:
				'Supine pelvic setup with reproducible lower-extremity support and bladder/rectal preparation.',
			instructions: [
				'Support both knees and use paired foot stocks to reproduce leg position.',
				'Confirm the prescribed bladder-filling protocol to displace small bowel.',
				'Confirm rectal preparation before daily CBCT.'
			]
		},
		planned: {
			gantry: '181°',
			collimator: '15°',
			jaws: '16 × 18 cm',
			mlcAperture: '14 cm',
			mlcShape: 'Conformal',
			imaging: 'kV arms extended',
			odi: 'On',
			couch: '0 / 0 / 0 mm'
		},
		fields: [
			{
				name: 'Arc 1 · CW',
				mode: 'VMAT',
				mu: 368,
				doseRate: 600,
				arc: { start: 181, stop: 179, direction: 'CW', fullArc: true },
				geometry: {
					gantry: '181°',
					collimator: '15°',
					jaws: '16 × 18 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 14.0, mlcShape: 'Conformal', doseRate: 420 },
					{ muFraction: 0.25, mlcAperture: 10.5, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.5, mlcAperture: 8.5, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.75, mlcAperture: 11.0, mlcShape: 'Conformal', doseRate: 540 },
					{ muFraction: 1.0, mlcAperture: 14.0, mlcShape: 'Conformal', doseRate: 420 }
				]
			},
			{
				name: 'Arc 2 · CCW',
				mode: 'VMAT',
				mu: 357,
				doseRate: 600,
				arc: { start: 179, stop: 181, direction: 'CCW', fullArc: true },
				geometry: {
					gantry: '179°',
					collimator: '345°',
					jaws: '16 × 18 cm',
					mlcAperture: '14 cm',
					mlcShape: 'Conformal'
				},
				controlPoints: [
					{ muFraction: 0.0, mlcAperture: 14.0, mlcShape: 'Conformal', doseRate: 420 },
					{ muFraction: 0.25, mlcAperture: 10.0, mlcShape: 'Conformal', doseRate: 560 },
					{ muFraction: 0.5, mlcAperture: 8.0, mlcShape: 'Conformal', doseRate: 600 },
					{ muFraction: 0.75, mlcAperture: 11.5, mlcShape: 'Conformal', doseRate: 540 },
					{ muFraction: 1.0, mlcAperture: 14.0, mlcShape: 'Conformal', doseRate: 420 }
				]
			}
		]
	}
];

export const SETUP_REFINEMENTS = {
	'AU-24031': {
		required: ['vacLok', 'kneeSupport'],
		orderSummary:
			'Supine pelvic setup with indexed Vac-Lok immobilization, knee support, and documented bladder/rectal preparation.',
		positionInstructions: [
			'HFS supine with the pelvis neutral and the lower body molded reproducibly in the Vac-Lok.',
			'Arms positioned comfortably on the chest or outside the treatment field.'
		],
		indexingInstructions: [
			'Reproduce the Vac-Lok index and knee-support/sponge position used at simulation.',
			'Confirm tabletop longitudinal index and pelvic midline before imaging.'
		],
		preparationInstructions: [
			'Confirm the prescribed bladder-filling protocol was completed.',
			'Confirm rectal-emptying / bowel preparation instructions according to the treatment record before image guidance.'
		]
	},
	'AU-24108': {
		required: ['headMask', 'headrest'],
		orderSummary: 'Rigid cranial fixation with indexed occipital support.',
		positionInstructions: [
			'HFS supine with the head straight, centered, and in the simulation position.'
		],
		indexingInstructions: [
			'Reproduce the indexed headrest and mask/baseplate location.',
			'Verify mask fixation before lateral imaging.'
		],
		preparationInstructions: []
	},
	'AU-24214': {
		required: ['wingBoard', 'vacLok'],
		orderSummary:
			'Arms-up thoracic immobilization with indexed posterior molding and respiratory-gating access.',
		positionInstructions: [
			'HFS supine with both arms elevated reproducibly above the head.',
			'Center the thorax without shoulder rotation.'
		],
		indexingInstructions: ['Reproduce the wing-board and Vac-Lok indices used at simulation.'],
		preparationInstructions: [
			'Confirm the respiratory monitoring region/surrogate is unobstructed.',
			'Complete the prescribed 4D/gating verification before treatment.'
		]
	},
	'AU-24362': {
		required: ['vacLok', 'legPositioner'],
		orderSummary:
			'Feet-first unilateral extremity setup with individualized leg molding and ankle/foot rotation control.',
		positionInstructions: [
			'FFS with the treated left femur centered and the opposite leg displaced outside the treatment field.',
			'Reproduce the documented left-leg rotation rather than forcing bilateral symmetry.'
		],
		indexingInstructions: [
			'Reproduce the Vac-Lok index and the dedicated ankle/foot-positioner setting for the treated leg.'
		],
		preparationInstructions: []
	},
	'AU-24519': {
		required: ['kneeSupport', 'footStocks'],
		orderSummary:
			'Supine pelvic VMAT setup with reproducible leg support and bladder/rectal preparation.',
		positionInstructions: ['HFS supine with pelvis neutral and lower extremities symmetric.'],
		indexingInstructions: ['Reproduce knee-support and paired foot-stock indices before CBCT.'],
		preparationInstructions: [
			'Confirm the prescribed bladder-filling protocol.',
			'Confirm rectal preparation/emptying instructions before CBCT.'
		]
	},
	'AU-24602': {
		required: ['srsMask', 'headrest'],
		orderSummary:
			'High-precision stereotactic cranial fixation using a dedicated mask/baseplate and indexed head support.',
		positionInstructions: [
			'HFS supine with neutral stereotactic head position and no unintended rotation.'
		],
		indexingInstructions: [
			'Lock the SRS mask/baseplate and reproduce the indexed headrest position.',
			'Verify fixation before 6DOF imaging and noncoplanar couch motion.'
		],
		preparationInstructions: [
			'Complete high-precision image guidance and the stereotactic timeout before beam delivery.'
		]
	},
	'AU-24631': {
		required: ['wingBoard', 'vacLok'],
		orderSummary:
			'Indexed arms-up thoracic SBRT immobilization with respiratory-management access.',
		positionInstructions: ['HFS supine with both arms elevated and thorax centered.'],
		indexingInstructions: ['Reproduce the wing-board and upper-body Vac-Lok indices.'],
		preparationInstructions: [
			'Confirm respiratory monitoring equipment can observe the prescribed region.',
			'Complete 4D motion verification before the SBRT timeout.'
		]
	},
	'AU-24710': {
		required: ['breastBoard', 'armSupport'],
		orderSummary:
			'Indexed inclined breast/nodal setup with bilateral arm elevation and reproducible head/chin position.',
		positionInstructions: [
			'HFS on the prescribed breast-board angle with both arms elevated.',
			'Turn the head away from the treated left side and reproduce chin position.'
		],
		indexingInstructions: [
			'Reproduce breast-board angle/index and bilateral arm-support index.',
			'Confirm lateral body alignment and the SCV/tangent junction reference.'
		],
		preparationInstructions: ['Review the field-junction / matchline setup before nodal treatment.']
	},
	'AU-24724': {
		required: ['hnMask', 'headrest', 'vacLok'],
		orderSummary:
			'Craniospinal setup with cranial fixation plus reproducible whole-body longitudinal alignment.',
		positionInstructions: [
			'HFS supine with head fixed, spine straight, pelvis neutral, and arms at the sides.',
			'Keep the legs straight and aligned with the longitudinal treatment axis.'
		],
		indexingInstructions: [
			'Reproduce headrest/mask indexing and the long-body Vac-Lok index.',
			'Confirm longitudinal station references before cranial/spine junction verification.'
		],
		preparationInstructions: [
			'Review the cranial/upper-spine and upper/lower-spine junction plan before treatment.'
		]
	},
	'AU-24739': {
		required: ['breastBoard', 'armSupport'],
		orderSummary: 'Breast-treatment position retained for the electron chest-wall scar field.',
		positionInstructions: [
			'HFS on the prescribed breast-board angle with both arms elevated.',
			'Reproduce head rotation and chest-wall exposure from simulation.'
		],
		indexingInstructions: ['Reproduce breast-board and arm-support indices.'],
		preparationInstructions: [
			'Center the chest-wall scar beneath the electron central ray.',
			'Complete cone/cutout verification and the separate delivery-stage bolus placement task.'
		]
	},
	'AU-24782': {
		required: ['kneeSupport', 'footStocks'],
		orderSummary:
			'Supine adaptive bladder setup with reproducible lower-extremity position and daily bladder/rectal preparation.',
		positionInstructions: ['HFS supine with pelvis neutral and legs symmetric.'],
		indexingInstructions: ['Reproduce knee-support and foot-stock indices before daily CBCT.'],
		preparationInstructions: [
			'Confirm the prescribed bladder-filling state before imaging.',
			'Confirm rectal/bowel preparation and document deviations that could affect plan-of-day selection.',
			'Use the daily CBCT anatomy—not the setup note alone—to select the adaptive plan.'
		]
	},
	'AU-24801': {
		required: ['headMask', 'headrest'],
		orderSummary: 'Rigid primary-brain fixation with indexed occipital support.',
		positionInstructions: ['HFS supine with the head in the documented simulation position.'],
		indexingInstructions: ['Reproduce headrest and mask/baseplate index.'],
		preparationInstructions: []
	},
	'AU-24812': {
		required: ['hnMask', 'headrest'],
		optional: ['shoulderPull'],
		orderSummary:
			'Head-and-shoulder fixation with plan-specific head/neck position; shoulder depression is used only when documented.',
		positionInstructions: [
			'HFS supine with the head and neck reproduced from simulation rather than assuming universal extension.',
			'Confirm chin position and bilateral shoulder symmetry.'
		],
		indexingInstructions: [
			'Reproduce the indexed headrest and long-mask/baseplate position.',
			'Use the shoulder pull-down only when the setup record specifically prescribes it.'
		],
		preparationInstructions: [
			'Confirm oral cavity/airway accessories, bite block, or other site-specific devices if documented in the treatment record.'
		]
	},
	'AU-24820': {
		required: ['wingBoard', 'vacLok'],
		orderSummary: 'Arms-up conventional thoracic setup with indexed posterior torso support.',
		positionInstructions: [
			'HFS supine with arms above the head and shoulders symmetric.',
			'Center the thorax to the documented esophageal setup marks.'
		],
		indexingInstructions: ['Reproduce wing-board and Vac-Lok indices.'],
		preparationInstructions: []
	},
	'AU-24831': {
		required: ['breastBoard', 'armSupport'],
		orderSummary: 'Indexed inclined right-breast IMRT setup with bilateral arm elevation.',
		positionInstructions: [
			'HFS at the prescribed breast-board angle with both arms elevated.',
			'Turn the head away from the treated right side and reproduce chin position.'
		],
		indexingInstructions: ['Reproduce board angle/index and bilateral arm-support index.'],
		preparationInstructions: [
			'Confirm the breast surface and imaging region are unobstructed before treatment.'
		]
	},
	'AU-24845': {
		required: ['wingBoard', 'vacLok'],
		orderSummary:
			'Supine upper-abdominal setup with both arms elevated and indexed posterior torso molding.',
		positionInstructions: [
			'HFS supine with both arms above the head to clear AP/PA and lateral upper-abdominal fields.',
			'Center the torso and avoid rotation.'
		],
		indexingInstructions: ['Reproduce wing-board and Vac-Lok indices.'],
		preparationInstructions: [
			'Confirm any prescribed fasting, contrast, or stomach/bowel preparation documented for the treatment course before imaging.'
		]
	},
	'AU-24856': {
		required: ['bellyBoard', 'armSupport'],
		orderSummary:
			'Prone pelvic belly-board setup with reproducible arm, pelvis, and lower-extremity alignment.',
		positionInstructions: [
			'HFP prone with the lower abdomen centered over the belly-board opening.',
			'Position arms above the head in the prescribed support and keep legs straight/symmetric.'
		],
		indexingInstructions: [
			'Index the belly board and reproduce the arm-support position.',
			'Confirm pelvis level and longitudinal midline before imaging.'
		],
		preparationInstructions: [
			'Confirm bowel/bladder preparation according to the pelvic treatment record.',
			'Check for pressure points and ensure the abdomen can fall freely into the opening.'
		]
	},
	'AU-24867': {
		required: ['wingBoard', 'kneeSupport'],
		orderSummary:
			'Supine thoracic-spine setup with arms elevated out of the lateral treatment fields and reproducible knee support.',
		positionInstructions: [
			'HFS supine with both arms elevated above the head to clear the opposed lateral fields.',
			'Keep the thoracic spine neutral and centered.'
		],
		indexingInstructions: ['Reproduce wing-board and knee-support indices.'],
		preparationInstructions: []
	},
	'AU-24644': {
		required: ['breastBoard', 'armSupport'],
		orderSummary:
			'Inclined left-breast DIBH setup with bilateral arm elevation and reproducible head rotation.',
		positionInstructions: [
			'HFS at the prescribed board angle with both arms elevated.',
			'Turn the head away from the treated left side and reproduce chin position.'
		],
		indexingInstructions: ['Reproduce breast-board angle/index and bilateral arm-support index.'],
		preparationInstructions: [
			'Confirm the surface-guidance / respiratory monitoring region is visible.',
			'Complete the prescribed DIBH reproducibility workflow before beam delivery.'
		]
	}
};
