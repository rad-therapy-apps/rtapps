/* RTApps (#77 sim-hub modularization, task 5): world geometry and room builders — the ROOMS
   layout table, room-shell construction (walls, doors, floors, ceilings, lighting, decor,
   furnishing dispatch), the hub lobby, exterior grounds, and the hub-and-wings corridor
   network. Verbatim extractions from main.js. Furnishing calls out to ./props.js for the
   individual prop/furniture builders. A handful of symbols stay owned by main.js — either
   because other still-resident systems (walk-mode collision/raycasting, the door-open/close
   animation loop, the future npc/journey/equipment modules) read or write them too, or because
   they weren't part of this task's anchor list — and are imported back from there: `add`/`MAT`/
   `C` (shared scene-building helpers/colors), `registerInteractable` (interaction registry),
   `roomFloors`/`ceilings`/`doors` (walk-mode collision + door-animation state), `doorNormal`/
   `doorCenter` (already exported from main.js per task 3's helpers.js), `roomById` (looks up
   `ROOMS`, this module's own export), and `buildEngineeringWallSchematics`/
   `buildLinacHeadWallStation` (entangled with the future LINAC-head-lab module's
   `LINAC_HEAD_LAB` state, called from `furnish`). */
import * as THREE from 'three';
import {
	box,
	cyl,
	std,
	wall,
	makeWallSign,
	makeDoorHeaderSign,
	makeLobbyEntranceSign,
	architecturalWallMaterial
} from './helpers.js';
import { scene } from './scene.js';
import {
	lampPost,
	wheelchairObject,
	ivPoleObject,
	medCartObject,
	plant,
	wallArt,
	benchSeat,
	brochureRack,
	tree,
	desk,
	monitor,
	chair,
	couch,
	examTable,
	workstationRow,
	taskChair,
	cabinetBank,
	stool,
	gurneyObject,
	monitorWall,
	wallShelf,
	framedWallMonitor,
	interiorRoomSign,
	sinkStation,
	immobilizationStorage,
	wallClock,
	sanitizerDispenser,
	emergencyStopPanel,
	wallSpeaker,
	warningPlaque,
	aedWallBox,
	cctvCamera,
	gloveBoxRack,
	biohazardBox,
	ctScanner,
	emulatorLinacShell,
	hdrSuite
} from './props.js';
import {
	add,
	MAT,
	C,
	registerInteractable,
	roomFloors,
	ceilings,
	doors,
	doorNormal,
	doorCenter,
	roomById,
	buildEngineeringWallSchematics,
	buildLinacHeadWallStation
} from './main.js';

export const ROOMS = [
	{
		id: 'lobby',
		hub: true,
		wing: 'hub',
		zone: 'front',
		name: 'Reception / Waiting Lobby',
		kicker: 'Front of House · Patient Access',
		x: 0,
		z: 0,
		w: 24,
		d: 20,
		color: C.front,
		cam: [0, 1.72, 5.4],
		look: [0, 1.35, 0],
		desc: 'The main arrival and wayfinding hub. Patient access staff support check-in, identity verification, scheduling and the first handoff to the oncology team.',
		what: 'Patients commonly begin here before moving to consultation, simulation or treatment areas.'
	},
	{
		id: 'consult',
		wing: 'patient',
		zone: 'front',
		name: 'Consult / Exam Room',
		kicker: 'Patient Services · Consultation',
		x: -18,
		z: -7.5,
		w: 10,
		d: 9,
		doorSide: 'zmax',
		color: C.front,
		cam: [-18, 1.68, -4.05],
		look: [-18, 1.25, -8.1],
		desc: 'A private space where the radiation oncologist reviews the diagnosis, medical history, treatment goals and options with the patient and family.',
		what: 'This is where the physician evaluates whether radiation is appropriate and discusses the proposed course of care.'
	},
	{
		id: 'social',
		wing: 'patient',
		zone: 'front',
		name: 'Social Services / Counseling',
		kicker: 'Patient Support Services',
		x: -30,
		z: -7.5,
		w: 10,
		d: 9,
		doorSide: 'zmax',
		color: C.front,
		cam: [-30, 1.66, -4.05],
		look: [-30, 1.22, -8.0],
		desc: 'A private supportive-care space for psychosocial concerns, transportation, financial stress, work leave, caregiver needs and community resources.',
		what: 'Cancer care can affect daily life well beyond treatment. Social work helps patients and caregivers address those barriers.'
	},
	{
		id: 'education',
		wing: 'patient',
		zone: 'front',
		name: 'Patient Education / Follow-Up',
		kicker: 'Patient Services · Navigation',
		x: -42,
		z: -7.5,
		w: 10,
		d: 9,
		doorSide: 'zmax',
		color: C.front,
		cam: [-42, 1.66, -4.05],
		look: [-42, 1.3, -8.0],
		desc: 'A teaching and navigation space where patients and caregivers can review the treatment process, schedules, contact information and practical care instructions.',
		what: 'Patient navigation helps turn a complicated sequence of appointments into an understandable care pathway.'
	},
	{
		id: 'patientcare',
		wing: 'patient',
		zone: 'front',
		name: 'Patient Care Skills Room',
		kicker: 'Clinical Support · Nursing',
		x: -28,
		z: 8.5,
		w: 14,
		d: 11,
		doorSide: 'zmin',
		color: C.front,
		cam: [-28, 1.68, 3.95],
		look: [-28, 1.2, 8.5],
		desc: 'A clinical support room representing nursing assessment, vital signs, symptom evaluation, medication review, mobility support and other patient-care needs.',
		what: 'Nursing and patient-care staff help manage symptoms and make sure the patient is medically and physically ready for care.'
	},
	{
		id: 'safety',
		wing: 'technical',
		zone: 'technical',
		name: 'Radiation Safety Office',
		kicker: 'Technical Services · Radiation Safety',
		x: -7.5,
		z: -18,
		w: 9,
		d: 10,
		doorSide: 'xmax',
		color: C.technical,
		cam: [-3.75, 1.66, -18],
		look: [-7.5, 1.25, -18],
		desc: 'The radiation-protection workspace for occupational monitoring, regulatory compliance, source safety, shielding practices and ALARA oversight.',
		what: 'Radiation safety specialists help protect patients, staff and the public while supporting the safe use of radiation.'
	},
	{
		id: 'physics',
		wing: 'technical',
		zone: 'technical',
		name: 'Physics Learning Laboratory',
		kicker: 'Technical Services · Medical Physics',
		x: 7.5,
		z: -18,
		w: 9,
		d: 10,
		doorSide: 'xmin',
		color: C.technical,
		cam: [3.75, 1.67, -18],
		look: [7.5, 1.2, -18],
		desc: 'A medical-physics workspace representing radiation measurement, machine calibration, dosimetric verification and technical problem solving.',
		what: 'Medical physicists verify that radiation-producing equipment and dose-delivery systems perform accurately and safely.'
	},
	{
		id: 'radbio',
		wing: 'technical',
		zone: 'technical',
		name: 'Radiobiology Laboratory',
		kicker: 'Academic / Research Support',
		x: -7.5,
		z: -31,
		w: 9,
		d: 10,
		doorSide: 'xmax',
		color: C.technical,
		cam: [-3.75, 1.66, -31],
		look: [-7.5, 1.2, -31],
		desc: 'An academic-style laboratory illustrating the biology behind radiation response, including DNA damage, cell survival, fractionation and normal-tissue effects.',
		what: 'Dedicated radiobiology laboratories are most common in academic or research settings, but the science informs clinical radiation therapy everywhere.'
	},
	{
		id: 'engineering',
		wing: 'technical',
		zone: 'technical',
		name: 'LINAC Engineering / Service Lab',
		kicker: 'Technical Services · Engineering',
		x: 8,
		z: -31,
		w: 10,
		d: 10,
		doorSide: 'xmin',
		color: C.technical,
		cam: [3.8, 1.66, -31],
		look: [8, 1.3, -31],
		desc: 'A service and machine-anatomy area representing the engineering support required to maintain complex treatment equipment.',
		what: 'Field service engineers and biomedical/technical specialists maintain, diagnose and repair treatment systems in coordination with physics and clinical staff.'
	},
	{
		id: 'qa',
		wing: 'technical',
		zone: 'technical',
		name: 'Machine QA Laboratory',
		kicker: 'Technical Services · Quality Assurance',
		x: -7.5,
		z: -44,
		w: 9,
		d: 10,
		doorSide: 'xmax',
		color: C.technical,
		cam: [-3.75, 1.66, -44],
		look: [-7.5, 1.2, -44],
		desc: 'A measurement and quality-assurance laboratory with representative phantoms, detectors and analysis workstations.',
		what: 'Routine quality assurance checks output, geometry, imaging and safety systems before equipment is relied on for patient treatment.'
	},
	{
		id: 'dosimetry',
		wing: 'technical',
		zone: 'technical',
		name: 'Dosimetry / Treatment Planning Suite',
		kicker: 'Technical Services · Treatment Planning',
		x: 9,
		z: -49,
		w: 14,
		d: 15,
		doorSide: 'xmin',
		color: C.technical,
		cam: [2.9, 1.68, -49],
		look: [8.8, 1.35, -49],
		desc: 'The treatment-planning workspace where medical dosimetrists develop beam arrangements and optimize dose distributions from the physician prescription.',
		what: 'Planning balances target coverage with dose limits to nearby normal tissues and is reviewed collaboratively before treatment.'
	},
	{
		id: 'commons',
		wing: 'technical',
		zone: 'technical',
		name: 'Learning Commons / Staff Education',
		kicker: 'Professional Development',
		x: -8,
		z: -60,
		w: 12,
		d: 12,
		doorSide: 'xmax',
		color: C.technical,
		cam: [-2.9, 1.7, -60],
		look: [-8, 1.3, -60],
		desc: 'A flexible staff/student education and collaboration area representing continuing education, orientation, case review and interprofessional learning.',
		what: 'Radiation oncology is team-based and technology-intensive, so ongoing training and supervised learning are routine parts of professional practice.'
	},
	{
		id: 'manager',
		wing: 'clinical',
		zone: 'clinical',
		name: 'Rad Onc Manager / Lead Therapist Office',
		kicker: 'Clinical Operations · Leadership',
		x: 20,
		z: 8,
		w: 10,
		d: 9,
		doorSide: 'zmin',
		doorType: 'leadershipSwing',
		color: C.leadership,
		cam: [20, 1.66, 4.05],
		look: [20, 1.25, 8.1],
		desc: 'The clinical-operations office for staff coordination, chart review, workflow oversight, quality follow-up and escalation of treatment concerns.',
		what: 'The manager or lead therapist helps coordinate safe day-to-day treatment operations and supports patients and staff when concerns need escalation.'
	},
	{
		id: 'ctcontrol',
		wing: 'clinical',
		zone: 'clinical',
		name: 'CT Control Room',
		kicker: 'Clinical Wing · CT Simulation',
		x: 31.5,
		z: -9,
		w: 9,
		d: 10,
		doorSide: 'zmax',
		windowSide: 'xmax',
		color: C.clinical,
		cam: [31.5, 1.68, -4.25],
		look: [35.1, 1.35, -9],
		desc: 'The CT operator workspace where simulation staff monitor the patient, select acquisition parameters and observe the scanner through shielded glass.',
		what: 'The therapist communicates with the patient throughout imaging while building the dataset used for treatment planning.'
	},
	{
		id: 'ctsim',
		wing: 'clinical',
		zone: 'clinical',
		name: 'CT Simulator Room',
		kicker: 'Clinical Wing · Simulation',
		x: 44,
		z: -11,
		w: 16,
		d: 16,
		doorSide: 'zmax',
		windowSide: 'xmin',
		color: C.clinical,
		cam: [44, 1.7, -3.85],
		look: [44, 1.25, -11],
		desc: 'The simulation room where therapists reproduce the intended treatment position, select immobilization, establish reference marks and obtain planning CT images.',
		what: 'Simulation creates the geometric foundation that connects the physician prescription to treatment planning and daily patient setup.'
	},
	{
		id: 'linaccontrol',
		wing: 'clinical',
		zone: 'clinical',
		name: 'LINAC Control Area',
		kicker: 'Clinical Wing · Treatment Operations',
		x: 51,
		z: 9,
		w: 14,
		d: 10,
		doorSide: 'zmin',
		color: C.clinical,
		cam: [51, 1.7, 4.15],
		look: [51, 1.35, 9],
		desc: 'The therapist control area serving the treatment vaults. Staff verify the treatment record, review imaging, monitor the patient by CCTV and communicate by intercom.',
		what: 'Therapists leave the vault during beam delivery but continuously monitor the patient and machine from this protected control area.'
	},
	{
		id: 'vault1',
		wing: 'treatment',
		zone: 'clinical',
		name: 'Treatment Vault 1 — LINAC',
		kicker: 'Clinical Wing · External Beam Treatment',
		x: 79,
		z: -18,
		w: 30,
		d: 26,
		doorSide: 'xmin',
		vault: true,
		doorType: 'vaultSlide',
		color: C.vault,
		cam: [64.8, 1.76, -18],
		look: [79, 1.45, -18],
		desc: 'A shielded external-beam treatment vault with a modern medical linear accelerator, treatment couch and image-guidance equipment.',
		what: 'Radiation therapists position the patient, verify setup and imaging, then deliver the prescribed treatment while monitoring from the control area.'
	},
	{
		id: 'vault2',
		wing: 'treatment',
		zone: 'clinical',
		name: 'Treatment Vault 2 — LINAC',
		kicker: 'Clinical Wing · External Beam Treatment',
		x: 79,
		z: 18,
		w: 30,
		d: 26,
		doorSide: 'xmin',
		vault: true,
		doorType: 'vaultSlide',
		color: C.vault,
		cam: [64.8, 1.76, 18],
		look: [79, 1.45, 18],
		desc: 'A second shielded external-beam treatment vault using the same modern LINAC shell to illustrate a multi-machine radiation oncology department.',
		what: 'Multiple vaults allow a department to manage treatment capacity, maintenance and varied clinical schedules while preserving the same core safety workflow.'
	},
	{
		id: 'hdr',
		wing: 'treatment',
		zone: 'clinical',
		name: 'HDR / Special Procedures Suite',
		kicker: 'Clinical Wing · Brachytherapy',
		x: 56,
		z: 25,
		w: 11,
		d: 12,
		doorSide: 'xmax',
		special: true,
		doorType: 'hdrSlide',
		color: C.special,
		cam: [60.8, 1.68, 25],
		look: [56, 1.25, 25],
		desc: 'A shielded special-procedures suite representing high-dose-rate brachytherapy, where a temporary radioactive source is remotely transferred through applicators for treatment.',
		what: 'HDR care combines physician procedures, nursing support, medical physics, radiation therapy and strict source-safety procedures.'
	}
];

export function addCirculationProps() {
	const w1 = wheelchairObject(0.95, false);
	w1.position.set(-7.6, 0, 7.2);
	w1.rotation.y = 0.7;
	scene.add(w1);
	const w2 = wheelchairObject(0.95, false);
	w2.position.set(28.6, 0, -1.4);
	w2.rotation.y = -1.2;
	scene.add(w2);
	const cart1 = medCartObject(0.95, 0x82aeca);
	cart1.position.set(-28.0, 0, 4.4);
	cart1.rotation.y = Math.PI;
	scene.add(cart1);
	const cart2 = medCartObject(0.92, 0x77b59b);
	cart2.position.set(55.3, 0, 23.8);
	cart2.rotation.y = Math.PI / 2;
	scene.add(cart2);
	const iv1 = ivPoleObject(0.95);
	iv1.position.set(43.5, 0, -5.6);
	scene.add(iv1);
	const iv2 = ivPoleObject(0.9);
	iv2.position.set(-18.9, 0, -4.8);
	scene.add(iv2);
	const hall = new THREE.Group();
	scene.add(hall);
	aedWallBox(hall, -4.6, 1.62, 3.02, Math.PI, 'AED');
	aedWallBox(hall, 13.9, 1.62, 3.92, Math.PI, 'AED');
	aedWallBox(hall, 3.05, 1.62, -12.92, 0, 'AED');
	aedWallBox(hall, 60.05, 1.62, 6.82, -Math.PI / 2, 'AED');
	const cameraPole = medCartObject(0.82, 0x98adb7);
	cameraPole.position.set(61.6, 0, -23.2);
	cameraPole.rotation.y = Math.PI / 2;
	scene.add(cameraPole);
}

export function doorTypeFor(room) {
	if (room.doorType) return room.doorType;
	if (room.vault) return 'vaultSlide';
	if (room.special) return 'hdrSlide';
	if (room.zone === 'front') return 'patientSwing';
	if (room.zone === 'technical') return 'technicalDouble';
	return 'clinicalSlide';
}

export function addDoorWindow(parent, x, y, z, w, h) {
	const win = box(
		w,
		h,
		0.018,
		std(0x9bc3d2, 0.12, 0.04, { transparent: true, opacity: 0.36 }),
		x,
		y,
		z
	);
	parent.add(win);
}

export function buildDoor(room, side, gap) {
	const type = doorTypeFor(room),
		g = new THREE.Group();
	const h = room.vault ? 3.15 : 2.55,
		t = 0.09;
	let cx = room.x,
		cz = room.z;
	const hx = room.w / 2,
		hz = room.d / 2;
	if (side === 'zmin') cz -= hz;
	if (side === 'zmax') cz += hz;
	if (side === 'xmin') cx -= hx;
	if (side === 'xmax') cx += hx;
	g.position.set(cx, h / 2, cz);
	if (side[0] === 'x') g.rotation.y = Math.PI / 2;
	const frameMat = room.vault ? std(0x59656d, 0.55, 0.45) : std(0x596a74, 0.55, 0.28);
	const head = box(gap + 0.22, 0.16, 0.18, frameMat, 0, h / 2 + 0.08, 0);
	g.add(head);
	g.add(
		box(0.14, h + 0.1, 0.18, frameMat, -gap / 2 - 0.07, 0, 0),
		box(0.14, h + 0.1, 0.18, frameMat, gap / 2 + 0.07, 0, 0)
	);
	const d = { group: g, side, type, progress: 0, target: 0, openSeconds: 2.0, parts: [], gap };
	if (type === 'patientSwing' || type === 'leadershipSwing') {
		const mat = type === 'leadershipSwing' ? std(0x705943, 0.78, 0.04) : std(0x8a755f, 0.82, 0.03);
		const pivot = new THREE.Group();
		pivot.position.x = -gap / 2;
		const leaf = box(gap * 0.88, h, 0.08, mat, gap * 0.44, 0, 0);
		pivot.add(leaf);
		if (type === 'patientSwing') addDoorWindow(pivot, gap * 0.49, 0.35, 0.046, gap * 0.22, 0.72);
		g.add(pivot);
		d.parts = [pivot];
		d.openSeconds = type === 'leadershipSwing' ? 1.8 : 2.15;
	} else if (type === 'technicalDouble') {
		const mat = std(0x697984, 0.64, 0.22);
		const lp = new THREE.Group(),
			rp = new THREE.Group();
		lp.position.x = -gap / 2;
		rp.position.x = gap / 2;
		const lw = box(gap * 0.48, h, 0.08, mat, gap * 0.24, 0, 0),
			rw = box(gap * 0.48, h, 0.08, mat, -gap * 0.24, 0, 0);
		lp.add(lw);
		rp.add(rw);
		addDoorWindow(lp, gap * 0.24, 0.28, 0.046, gap * 0.18, 0.75);
		addDoorWindow(rp, -gap * 0.24, 0.28, 0.046, gap * 0.18, 0.75);
		g.add(lp, rp);
		d.parts = [lp, rp];
		d.openSeconds = 2.4;
	} else if (type === 'clinicalSlide') {
		const mat = std(0x9db2ba, 0.36, 0.35, { transparent: true, opacity: 0.82 });
		const lw = box(gap * 0.47, h, 0.07, mat, -gap * 0.245, 0, 0),
			rw = box(gap * 0.47, h, 0.07, mat, gap * 0.245, 0, 0);
		g.add(lw, rw);
		d.parts = [lw, rw];
		d.openSeconds = 2.15;
	} else {
		const mat = type === 'hdrSlide' ? std(0x75867f, 0.68, 0.42) : std(0x7f898f, 0.72, 0.48);
		const leaf = box(gap * 0.94, h, 0.18, mat, 0, 0, 0);
		g.add(leaf);
		const inset = box(
			gap * 0.6,
			h * 0.58,
			0.02,
			type === 'hdrSlide' ? std(0x356d5b, 0.45, 0.1) : std(0x424d54, 0.5, 0.2),
			0,
			0.05,
			0.105
		);
		g.add(inset);
		d.parts = [leaf, inset];
		d.openSeconds = type === 'vaultSlide' ? 3.8 : 3.0;
		const beacon = cyl(
			0.1,
			0.1,
			0.14,
			std(type === 'vaultSlide' ? 0xff504e : 0xffb84d, 0.3, 0.05, {
				emissive: type === 'vaultSlide' ? 0xff302d : 0xff8a00,
				emissiveIntensity: 1.5
			}),
			18
		);
		beacon.rotation.z = Math.PI / 2;
		beacon.position.set(gap / 2 + 0.28, h / 2 + 0.18, 0);
		g.add(beacon);
	}
	scene.add(g);
	doors.set(room.id, d);
	makeWallSign(room, side, gap);
	makeDoorHeaderSign(room, side, gap);
}

export function buildSide(room, side, h, t, mat) {
	const hx = room.w / 2,
		hz = room.d / 2,
		isDoor = room.doorSide === side,
		isWindow = room.windowSide === side,
		gap = room.vault ? 4.8 : 2.6,
		win = 4.5;
	if (side === 'zmin' || side === 'zmax') {
		const z = room.z + (side === 'zmin' ? -hz : hz);
		if (isDoor) {
			const sw = (room.w - gap) / 2;
			wall(room.x - (gap / 2 + sw / 2), z, sw, t, h, mat);
			wall(room.x + (gap / 2 + sw / 2), z, sw, t, h, mat);
			scene.add(box(gap, h - 2.65, t, mat, room.x, 2.65 + (h - 2.65) / 2, z));
			buildDoor(room, side, gap);
		} else if (isWindow) {
			const sw = (room.w - win) / 2;
			wall(room.x - (win / 2 + sw / 2), z, sw, t, h, mat);
			wall(room.x + (win / 2 + sw / 2), z, sw, t, h, mat);
			wall(room.x, z, win, t, 1.0, mat);
			const hdr = box(win, h - 2.82, t, mat, room.x, 2.82 + (h - 2.82) / 2, z);
			scene.add(hdr);
			scene.add(box(win, 1.65, t * 0.45, MAT.glass, room.x, 2.0, z));
		} else wall(room.x, z, room.w, t, h, mat);
	} else {
		const x = room.x + (side === 'xmin' ? -hx : hx);
		if (isDoor) {
			const sd = (room.d - gap) / 2;
			wall(x, room.z - (gap / 2 + sd / 2), t, sd, h, mat);
			wall(x, room.z + (gap / 2 + sd / 2), t, sd, h, mat);
			const lint = box(t, h - 2.65, gap, mat, x, 2.65 + (h - 2.65) / 2, room.z);
			scene.add(lint);
			buildDoor(room, side, gap);
		} else if (isWindow) {
			const sd = (room.d - win) / 2;
			wall(x, room.z - (win / 2 + sd / 2), t, sd, h, mat);
			wall(x, room.z + (win / 2 + sd / 2), t, sd, h, mat);
			wall(x, room.z, t, win, 1.0, mat);
			scene.add(box(t, h - 2.82, win, mat, x, 2.82 + (h - 2.82) / 2, room.z));
			scene.add(box(t * 0.45, 1.65, win, MAT.glass, x, 2.0, room.z));
		} else wall(x, room.z, t, room.d, h, mat);
	}
}

export function roomLightProfile(room) {
	if (room.vault) return { c: 0xe8f6ff, i: 0.78 };
	if (room.id === 'social' || room.id === 'education') return { c: 0xffe8c8, i: 0.68 };
	if (room.id === 'manager' || room.id === 'commons') return { c: 0xffedd4, i: 0.65 };
	if (room.zone === 'technical') return { c: 0xfff0d8, i: 0.67 };
	if (room.zone === 'clinical') return { c: 0xe5fbff, i: 0.74 };
	return { c: 0xf4fbff, i: 0.68 };
}

export function floorMatFor(room) {
	const c = zoneFloorColor(room);
	const rough = room.vault
		? 0.48
		: room.zone === 'clinical'
			? 0.52
			: room.zone === 'technical'
				? 0.62
				: 0.66;
	return new THREE.MeshPhysicalMaterial({
		color: c,
		roughness: rough,
		metalness: 0.015,
		clearcoat: room.vault ? 0.24 : 0.12,
		clearcoatRoughness: 0.65
	});
}

export function addRoomBaseboards(room) {
	const hx = room.w / 2,
		hz = room.d / 2,
		y = 0.12,
		hh = 0.18,
		m = std(room.vault ? 0x4e5961 : 0x839198, 0.72, 0.08);
	scene.add(box(room.w - 0.28, hh, 0.07, m, room.x, y, room.z - hz + 0.1));
	scene.add(box(room.w - 0.28, hh, 0.07, m, room.x, y, room.z + hz - 0.1));
	scene.add(box(0.07, hh, room.d - 0.28, m, room.x - hx + 0.1, y, room.z));
	scene.add(box(0.07, hh, room.d - 0.28, m, room.x + hx - 0.1, y, room.z));
}

export function addRoomLighting(room, h) {
	const prof = roomLightProfile(room);
	const count = Math.max(1, Math.floor(room.w / 4.5));
	for (let i = 0; i < count; i++) {
		const lx = room.x - room.w / 2 + 2 + (room.w - 4) * (count === 1 ? 0.5 : i / (count - 1 || 1));
		const fixture = box(
			1.45,
			0.035,
			0.32,
			std(prof.c, 0.26, 0, { emissive: prof.c, emissiveIntensity: 1.9 }),
			lx,
			h - 0.08,
			room.z
		);
		fixture.castShadow = false;
		scene.add(fixture);
	}
	const accent = zoneAccentColor(room);
	const cove = box(
		Math.max(2.2, room.w * 0.48),
		0.025,
		0.08,
		std(accent, 0.25, 0, { emissive: accent, emissiveIntensity: 0.7 }),
		room.x,
		h - 0.19,
		room.z - room.d / 2 + 0.18
	);
	cove.castShadow = false;
	scene.add(cove);
}

export function zoneFloorColor(room) {
	if (room.vault) return 0x3f4850;
	if (room.special) return 0x65766e;
	if (room.id === 'manager') return 0x85808f;
	if (room.zone === 'technical') return 0x8f887a;
	if (room.zone === 'clinical') return 0x7f9494;
	return 0x8d9ba2;
}

export function zoneAccentColor(room) {
	if (room.vault) return 0x8f3944;
	if (room.special) return 0x3d8467;
	if (room.id === 'manager') return 0x74639b;
	if (room.zone === 'technical') return 0xb17a2e;
	if (room.zone === 'clinical') return 0x2a8585;
	return 0x4279a0;
}

export function buildRoom(room) {
	const h = room.vault ? 5.7 : 3.75,
		t = room.vault ? 0.58 : 0.16,
		mat = room.vault ? MAT.wallVault : MAT.wall;
	const floor = box(room.w - 0.15, 0.07, room.d - 0.15, floorMatFor(room), room.x, 0.03, room.z);
	floor.userData.roomId = room.id;
	scene.add(floor);
	roomFloors.push(floor);
	const stripe = box(
		room.w - 1.1,
		0.025,
		0.32,
		std(room.color, 0.58, 0.04),
		room.x,
		0.085,
		room.z - room.d / 2 + 0.44
	);
	scene.add(stripe);
	['zmin', 'zmax', 'xmin', 'xmax'].forEach((s) => buildSide(room, s, h, t, mat));
	if (room.vault) addVaultDoorwaySigns(room);
	addRoomBaseboards(room);
	const ceiling = box(room.w - 0.2, 0.08, room.d - 0.2, std(0xe9edef, 0.95, 0), room.x, h, room.z);
	ceiling.castShadow = false;
	ceiling.receiveShadow = false;
	scene.add(ceiling);
	ceilings.push(ceiling);
	addRoomLighting(room, h);
	addRoomDecor(room, h);
	furnish(room);
}

export function lobbyWallWithGap(side, gap, h = 4.15, t = 0.18) {
	const r = roomById('lobby'),
		hx = r.w / 2,
		hz = r.d / 2,
		mat = MAT.wall;
	if (side === 'zmin' || side === 'zmax') {
		const z = r.z + (side === 'zmin' ? -hz : hz),
			sw = (r.w - gap) / 2;
		wall(r.x - (gap / 2 + sw / 2), z, sw, t, h, mat);
		wall(r.x + (gap / 2 + sw / 2), z, sw, t, h, mat);
		scene.add(box(gap, h - 2.75, t, mat, r.x, 2.75 + (h - 2.75) / 2, z));
	} else {
		const x = r.x + (side === 'xmin' ? -hx : hx),
			sd = (r.d - gap) / 2;
		wall(x, r.z - (gap / 2 + sd / 2), t, sd, h, mat);
		wall(x, r.z + (gap / 2 + sd / 2), t, sd, h, mat);
		scene.add(box(t, h - 2.75, gap, mat, x, 2.75 + (h - 2.75) / 2, r.z));
	}
}

export function buildLobbyEntrance(r) {
	const side = 'zmax',
		gap = 5.2,
		h = 2.7,
		g = new THREE.Group();
	g.position.set(r.x, h / 2, r.z + r.d / 2);
	const frame = std(0x526a75, 0.4, 0.35),
		glass = std(0x9bcbd9, 0.12, 0.04, { transparent: true, opacity: 0.34 });
	g.add(
		box(gap + 0.25, 0.15, 0.18, frame, 0, h / 2 + 0.05, 0),
		box(0.14, h, 0.18, frame, -gap / 2 - 0.07, 0, 0),
		box(0.14, h, 0.18, frame, gap / 2 + 0.07, 0, 0)
	);
	const l = box(gap * 0.47, h, 0.05, glass, -gap * 0.245, 0, 0),
		rr = box(gap * 0.47, h, 0.05, glass, gap * 0.245, 0, 0);
	g.add(l, rr);
	scene.add(g);
	makeLobbyEntranceSign(r);
}

export function buildHubLobby(room) {
	const h = 4.15,
		t = 0.18;
	const floorMat = new THREE.MeshPhysicalMaterial({
		color: 0x9ea9a7,
		roughness: 0.58,
		metalness: 0.01,
		clearcoat: 0.14,
		clearcoatRoughness: 0.7
	});
	const floor = box(room.w - 0.12, 0.08, room.d - 0.12, floorMat, room.x, 0.035, room.z);
	floor.userData.roomId = room.id;
	scene.add(floor);
	roomFloors.push(floor);
	lobbyWallWithGap('xmin', 7.2, h, t);
	lobbyWallWithGap('xmax', 8.0, h, t);
	lobbyWallWithGap('zmin', 7.0, h, t);
	lobbyWallWithGap('zmax', 5.2, h, t);
	buildLobbyEntrance(room);
	const ceiling = box(room.w - 0.2, 0.08, room.d - 0.2, std(0xf0f3f4, 0.95, 0), room.x, h, room.z);
	scene.add(ceiling);
	ceilings.push(ceiling);
	for (let x = -8; x <= 8; x += 4)
		for (let z = -5; z <= 5; z += 5) {
			const light = box(
				1.7,
				0.03,
				0.34,
				std(0xfff7e8, 0.25, 0, { emissive: 0xfff7e8, emissiveIntensity: 2.0 }),
				x,
				h - 0.08,
				z
			);
			scene.add(light);
		}
	addRoomDecor(room, h);
	furnish(room);
}

export function addVaultDoorwaySigns(room) {
	const side = room.doorSide,
		gap = 4.8,
		normal = doorNormal(room),
		tangent = side[0] === 'z' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1),
		dc = doorCenter(room, 2.45);
	let rot = 0;
	if (side === 'zmin') rot = Math.PI;
	else if (side === 'zmax') rot = 0;
	else if (side === 'xmin') rot = -Math.PI / 2;
	else rot = Math.PI / 2;
	const p1 = dc
		.clone()
		.add(tangent.clone().multiplyScalar(-2.2))
		.add(normal.clone().multiplyScalar(0.12));
	const p2 = dc
		.clone()
		.add(tangent.clone().multiplyScalar(2.2))
		.add(normal.clone().multiplyScalar(0.12));
	warningPlaque(scene, p1.x, 2.32, p1.z, rot, 'CAUTION', 'RADIATION AREA');
	warningPlaque(scene, p2.x, 2.32, p2.z, rot, 'DO NOT ENTER', 'BEAM ON WHEN LIGHT IS ON');
}

export function addRoomDecor(room, h) {
	const g = new THREE.Group();
	scene.add(g);
	const ac = zoneAccentColor(room);
	const hx = room.w / 2,
		hz = room.d / 2;
	const panelMat = std(ac, 0.76, 0.02);
	if (room.hub) {
		const rug = box(7.4, 0.018, 4.2, std(0x668981, 0.92, 0.01), 2.2, 0.09, -0.2);
		add(g, rug);
		plant(g, 8.6, 6.7, 1.2);
		plant(g, 8.6, -6.4, 1.15);
		plant(g, -8.4, 6.3, 1.05);
		wallArt(g, 7.8, 2.25, -9.86, 0, 2.8, 1.1, 0x347e91);
		return;
	}
	const backSide =
		room.doorSide === 'zmax'
			? 'zmin'
			: room.doorSide === 'zmin'
				? 'zmax'
				: room.doorSide === 'xmin'
					? 'xmax'
					: 'xmin';
	if (backSide === 'zmin' || backSide === 'zmax') {
		const zz = room.z + (backSide === 'zmin' ? -hz + 0.1 : hz - 0.1);
		const p = box(Math.max(2.4, room.w * 0.48), 1.1, 0.035, panelMat, room.x, 1.95, zz);
		add(g, p);
		wallArt(
			g,
			room.x,
			1.95,
			zz + (backSide === 'zmin' ? 0.03 : -0.03),
			backSide === 'zmin' ? 0 : Math.PI,
			Math.min(2.0, room.w * 0.32),
			0.72,
			ac
		);
	} else {
		const xx = room.x + (backSide === 'xmin' ? -hx + 0.1 : hx - 0.1);
		const p = box(0.035, 1.1, Math.max(2.4, room.d * 0.48), panelMat, xx, 1.95, room.z);
		add(g, p);
		wallArt(
			g,
			xx + (backSide === 'xmin' ? 0.03 : -0.03),
			1.95,
			room.z,
			backSide === 'xmin' ? Math.PI / 2 : -Math.PI / 2,
			Math.min(2.0, room.d * 0.32),
			0.72,
			ac
		);
	}
	if (room.zone === 'front' && !['patientcare'].includes(room.id))
		plant(g, room.x + hx - 1.0, room.z + hz - 1.0, 0.82);
	if (room.id === 'manager' || room.id === 'dosimetry' || room.id === 'commons')
		plant(g, room.x - hx + 1.0, room.z + hz - 1.0, 0.78);
}

export function buildExteriorAmbient() {
	const ground = new THREE.Mesh(new THREE.PlaneGeometry(360, 300), std(0x6f8d69, 0.98, 0));
	ground.rotation.x = -Math.PI / 2;
	ground.position.y = -0.08;
	ground.receiveShadow = true;
	scene.add(ground);
	const apron = box(40, 0.018, 18, std(0xc6cac4, 0.96, 0.01), 0, -0.01, 18);
	scene.add(apron);
	const cross = box(10, 0.014, 1.5, std(0xece8dd, 0.94, 0.0), 0, -0.005, 10.2);
	scene.add(cross);
	for (let i = -3; i <= 3; i++) {
		const bar = box(0.55, 0.016, 1.1, std(0xffffff, 0.92, 0.0), i * 1.45, -0.004, 10.2);
		scene.add(bar);
	}
	const drive = box(94, 0.014, 18, std(0x4d565d, 0.98, 0.01), 10, -0.025, 30);
	scene.add(drive);
	const curb = box(96, 0.08, 0.22, std(0xadb4af, 0.9, 0.02), 10, 0.04, 20.95);
	scene.add(curb);
	const curb2 = box(96, 0.08, 0.22, std(0xadb4af, 0.9, 0.02), 10, 0.04, 39.05);
	scene.add(curb2);
	for (let i = -42; i <= 42; i += 12) {
		const stripe = box(0.18, 0.016, 4.8, std(0xe4e2c7, 0.9, 0.0), i, -0.012, 30);
		scene.add(stripe);
	}
	for (let x = -34; x <= 46; x += 10) {
		const stop = box(1.9, 0.018, 0.18, std(0xf2f1ea, 0.9, 0.0), x, -0.011, 21.8);
		scene.add(stop);
		const stop2 = stop.clone();
		stop2.position.z = 38.2;
		scene.add(stop2);
	}
	for (const [x, z, s] of [
		[-18, 20, 1.0],
		[-30, 15, 0.9],
		[21, 20, 1.1],
		[34, 16, 0.9],
		[-45, -8, 0.9],
		[45, -58, 1.0],
		[92, 42, 1.2],
		[105, -28, 1.0],
		[-65, -38, 1.1],
		[-80, 18, 1.0]
	])
		tree(x, z, s);
	for (const [x, z] of [
		[-20, 14],
		[0, 14],
		[20, 14],
		[-20, 42],
		[0, 42],
		[20, 42],
		[40, 42]
	])
		lampPost(x, z);
	for (const [x, z, w, d, h, c] of [
		[-92, -18, 28, 34, 11, 0x83909a],
		[112, 3, 30, 46, 13, 0x71828d],
		[28, -100, 54, 24, 10, 0x89969b]
	]) {
		const b = box(w, h, d, std(c, 0.92, 0.02), x, h / 2, z);
		b.castShadow = false;
		scene.add(b);
	}
	const skyGeo = new THREE.SphereGeometry(220, 32, 18);
	const skyMat = new THREE.ShaderMaterial({
		side: THREE.BackSide,
		depthWrite: false,
		uniforms: {
			top: { value: new THREE.Color(0x6da5c4) },
			bottom: { value: new THREE.Color(0xd9e6df) },
			offset: { value: 25 },
			exponent: { value: 0.75 }
		},
		vertexShader: `varying vec3 vWorldPosition;void main(){vec4 wp=modelMatrix*vec4(position,1.0);vWorldPosition=wp.xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
		fragmentShader: `uniform vec3 top;uniform vec3 bottom;uniform float offset;uniform float exponent;varying vec3 vWorldPosition;void main(){float h=normalize(vWorldPosition+vec3(0.,offset,0.)).y;gl_FragColor=vec4(mix(bottom,top,max(pow(max(h,0.0),exponent),0.0)),1.0);}`
	});
	const sky = new THREE.Mesh(skyGeo, skyMat);
	scene.add(sky);
}

export function furnish(room) {
	const g = new THREE.Group();
	g.userData.roomId = room.id;
	scene.add(g);
	switch (room.id) {
		case 'lobby':
			desk(g, room.x - 6.0, room.z - 3.4, 5.0, 1.0);
			monitor(g, room.x - 6.5, 1.45, room.z - 3.72, 0, 1.05, 0.58);
			monitor(g, room.x - 4.8, 1.45, room.z - 3.72, 0, 1.05, 0.58);
			for (let i = 0; i < 4; i++) chair(g, room.x - 6.2 + i * 1.45, room.z + 3.6);
			for (let i = 0; i < 3; i++) chair(g, room.x + 3.0 + i * 1.4, room.z + 3.4, Math.PI);
			couch(g, room.x + 5.5, room.z + 0.8, Math.PI / 2);
			couch(g, room.x + 5.5, room.z - 2.0, Math.PI / 2);
			add(g, box(2.2, 0.62, 1.2, std(0x4a7a62, 0.9, 0.01), room.x + 1.0, 0.33, room.z + 1.0));
			benchSeat(g, room.x + 9.2, room.z - 4.8, Math.PI / 2, 2.4, 0x82939a);
			brochureRack(g, room.x + 8.8, room.z + 4.6, Math.PI / 2);
			const wc = wheelchairObject(0.9, false);
			wc.position.set(room.x - 8.5, 0, room.z + 5.3);
			wc.rotation.y = 0.9;
			g.add(wc);
			break;
		case 'consult':
			examTable(g, room.x, room.z + 1);
			desk(g, room.x - 2.5, room.z - 1.8, 1.8, 0.7);
			monitor(g, room.x - 2.5, 1.35, room.z - 2.0);
			chair(g, room.x + 2.3, room.z - 1.6);
			brochureRack(g, room.x + 4.0, room.z - 2.8, Math.PI);
			const iv = ivPoleObject(0.88);
			iv.position.set(room.x + 3.0, 0, room.z + 1.4);
			g.add(iv);
			cabinetBank(g, room.x + 3.2, room.z - 2.6, 1.5, 1.45, 0.42, Math.PI, 0xe4eaed);
			break;
		case 'social':
			couch(g, room.x, room.z + 1.7);
			chair(g, room.x - 1.5, room.z - 0.5, 0.35);
			chair(g, room.x + 1.5, room.z - 0.5, -0.35);
			desk(g, room.x - 2.8, room.z - 2.2, 1.5, 0.65);
			benchSeat(g, room.x + 3.5, room.z - 2.5, 0, 1.8, 0x8b7a93);
			brochureRack(g, room.x + 4.0, room.z + 2.6, Math.PI / 2);
			break;
		case 'education':
			desk(g, room.x, room.z + 1.3, 3.8, 1.1);
			for (let i = -1; i <= 1; i++) {
				chair(g, room.x + i * 1.3, room.z - 0.2);
			}
			monitor(g, room.x, 1.7, room.z + 3.9, 0, 1.8, 0.95);
			benchSeat(g, room.x + 4.0, room.z - 2.8, Math.PI / 2, 1.8, 0x6e8390);
			break;
		case 'patientcare':
			examTable(g, room.x - 2.6, room.z + 1.3);
			examTable(g, room.x + 2.6, room.z + 1.3);
			add(g, box(2.2, 0.95, 0.55, MAT.white, room.x, 0.55, room.z - 3));
			const mc = medCartObject(0.92, 0x7eaec1);
			mc.position.set(room.x + 4.6, 0, room.z - 2.9);
			g.add(mc);
			const wc2 = wheelchairObject(0.9, false);
			wc2.position.set(room.x - 5.4, 0, room.z - 3.1);
			wc2.rotation.y = 0.2;
			g.add(wc2);
			registerInteractable(wc2, 'Wheelchair', 'Mobility device used for safe patient transport.');
			break;
		case 'safety':
			desk(g, room.x, room.z - 1.5, 2.4, 0.8);
			monitor(g, room.x, 1.35, room.z - 1.75);
			for (let i = -1; i <= 1; i++)
				add(g, box(0.45, 0.8, 0.25, MAT.trim, room.x + i * 0.65, 0.5, room.z + 2.8));
			break;
		case 'physics':
			desk(g, room.x - 2.3, room.z - 2.2, 2, 0.75);
			const atom = cyl(1.0, 1.0, 0.06, MAT.water, 34);
			atom.rotation.x = Math.PI / 2;
			atom.position.set(room.x + 1.7, 1.3, room.z + 0.5);
			add(g, atom);
			break;
		case 'radbio':
			for (let i = -1; i <= 1; i++) {
				desk(g, room.x + i * 2.2, room.z, 1.6, 0.7);
				const mic = cyl(0.12, 0.18, 0.55, MAT.black);
				mic.position.set(room.x + i * 2.2, 1.2, room.z);
				add(g, mic);
			}
			break;
		case 'engineering':
			desk(g, room.x - 1.3, room.z + 2.25, 3.8, 0.92, Math.PI / 10);
			const head = cyl(0.65, 0.85, 1.25, MAT.metal);
			head.position.set(room.x + 3.2, 1.25, room.z + 2.15);
			add(g, head);
			add(g, box(1.4, 1.0, 1.1, std(0xc9d6dd, 0.72, 0.06), room.x + 3.2, 0.5, room.z + 2.15));
			cabinetBank(g, room.x + 3.95, room.z - 2.0, 1.4, 1.42, 0.42, -Math.PI / 2, 0xdbe4e8);
			cabinetBank(g, room.x - 3.95, room.z - 1.9, 1.4, 1.42, 0.42, Math.PI / 2, 0xdbe4e8);
			buildLinacHeadWallStation(g, room);
			buildEngineeringWallSchematics(g, room);
			break;
		case 'qa':
			const tank = box(3.1, 1.55, 2.8, MAT.water, room.x, 1.0, room.z + 0.7);
			add(g, tank);
			registerInteractable(
				tank,
				'Water Phantom',
				'QA phantom used for beam-data and dosimetric measurements.'
			);
			desk(g, room.x - 2.8, room.z - 2.8, 1.8, 0.7);
			monitor(g, room.x - 2.8, 1.35, room.z - 3);
			break;
		case 'dosimetry':
			workstationRow(g, room.x, room.z - 2.0, 4, 2.3);
			monitor(g, room.x, 2.2, room.z + 4.55, 0, 2.5, 1.3);
			desk(g, room.x, room.z + 1.4, 4.4, 1.0);
			cabinetBank(g, room.x - 5.2, room.z + 3.7, 1.6, 1.6, 0.45, 0, 0xe1e7ea);
			cabinetBank(g, room.x + 5.2, room.z + 3.7, 1.6, 1.6, 0.45, 0, 0xe1e7ea);
			break;
		case 'manager':
			desk(g, room.x, room.z - 1.5, 2.5, 0.85);
			monitor(g, room.x, 1.4, room.z - 1.8, 0, 1.0, 0.55);
			chair(g, room.x - 1.0, room.z + 1.5);
			chair(g, room.x + 1.0, room.z + 1.5);
			break;
		case 'ctcontrol':
			desk(g, room.x - 1.2, room.z - 0.2, 4.8, 1.15, Math.PI / 2);
			monitorWall(g, room.x - 1.55, 1.68, room.z, 0.5 * Math.PI, 2, 2, 0.95, 0.54, 0.1);
			for (let i = -1; i <= 1; i++)
				taskChair(g, room.x + 0.95, room.z + i * 1.15, -Math.PI / 2, 0x4c6776);
			monitor(g, room.x, 2.05, room.z - 4.15, 0, 1.9, 1.05);
			cabinetBank(g, room.x + 1.1, room.z + 3.45, 1.6, 1.5, 0.45, 0, 0xdbe3e8);
			interiorRoomSign(
				g,
				room.x,
				3.06,
				room.z - room.d / 2 + 0.12,
				0,
				'CT CONTROL ROOM',
				'Simulation operation and observation'
			);
			wallClock(g, room.x + 2.9, 2.65, room.z - room.d / 2 + 0.13, 0);
			sanitizerDispenser(g, room.x - 2.9, 1.55, room.z - room.d / 2 + 0.13, 0);
			wallSpeaker(g, room.x + 3.75, 2.65, room.z, Math.PI / 2);
			const ccart = medCartObject(0.88, 0x9db4bf);
			ccart.position.set(room.x + 0.8, 0, room.z - 3.25);
			g.add(ccart);
			registerInteractable(
				ccart,
				'CT Supply Cart',
				'Mobile CT-simulation supply and accessory cart.'
			);
			break;
		case 'ctsim':
			ctScanner(g, room);
			const simwc = wheelchairObject(0.88, false);
			simwc.position.set(room.x + 5.4, 0, room.z + 5.0);
			simwc.rotation.y = -0.8;
			g.add(simwc);
			registerInteractable(simwc, 'Wheelchair', 'Patient mobility and transport equipment.');
			const simiv = ivPoleObject(0.9);
			simiv.position.set(room.x + 4.7, 0, room.z + 3.9);
			g.add(simiv);
			registerInteractable(
				simiv,
				'IV Pole',
				'Mobile support for IV fluids or contrast-related care.'
			);
			gurneyObject(g, room.x + 4.5, room.z - 4.8, 0);
			cabinetBank(g, room.x + 6.2, room.z - 5.2, 2.2, 1.8, 0.5, Math.PI, 0xe2e8eb);
			cabinetBank(g, room.x + 6.2, room.z + 4.8, 2.2, 1.8, 0.5, Math.PI, 0xe2e8eb);
			immobilizationStorage(g, room.x + 6.05, room.z - 0.15, Math.PI / 2, 'CT IMMOBILIZATION');
			sinkStation(g, room.x + 4.6, room.z - 6.55, 0);
			framedWallMonitor(
				g,
				room.x + 7.78,
				2.0,
				room.z + 1.35,
				-Math.PI / 2,
				2.2,
				1.22,
				'CT SIM PATIENT INFO',
				'Simulation setup parameters',
				[
					['Patient', 'Simulation patient'],
					['Position', 'Head-First Supine'],
					['Immobilization', 'Indexed support / custom device'],
					['Planning scan', 'Reference CT acquisition']
				]
			);
			interiorRoomSign(
				g,
				room.x,
				3.06,
				room.z - room.d / 2 + 0.12,
				0,
				'CT SIMULATOR ROOM',
				'Positioning, immobilization and CT acquisition'
			);
			wallClock(g, room.x - 2.8, 2.7, room.z - room.d / 2 + 0.13, 0);
			sanitizerDispenser(g, room.x - 4.2, 1.55, room.z - room.d / 2 + 0.13, 0);
			gloveBoxRack(g, room.x - 5.1, 1.6, room.z - room.d / 2 + 0.13, 0);
			wallSpeaker(g, room.x + 7.78, 2.85, room.z - 2.2, -Math.PI / 2);
			warningPlaque(
				g,
				room.x + 7.77,
				2.25,
				room.z - 4.3,
				-Math.PI / 2,
				'CT SIMULATION',
				'LASERS MAY BE ACTIVE'
			);
			wallShelf(g, room.x + 5.3, 1.35, room.z - 1.4, 1.2, Math.PI);
			stool(g, room.x + 4.9, room.z - 1.5, 0x688596);
			const laser1 = box(
				0.12,
				0.12,
				0.12,
				std(0x57d6cf, 0.1, 0.0, { emissive: 0x57d6cf, emissiveIntensity: 1.6 }),
				room.x + 7.65,
				1.45,
				room.z + 1.5
			);
			add(g, laser1);
			const laser2 = box(
				0.12,
				0.12,
				0.12,
				std(0x57d6cf, 0.1, 0.0, { emissive: 0x57d6cf, emissiveIntensity: 1.6 }),
				room.x - 7.65,
				1.45,
				room.z + 1.5
			);
			add(g, laser2);
			const laser3 = box(
				0.12,
				0.12,
				0.12,
				std(0x57d6cf, 0.1, 0.0, { emissive: 0x57d6cf, emissiveIntensity: 1.6 }),
				room.x,
				2.98,
				room.z + 1.5
			);
			add(g, laser3);
			break;
		case 'commons':
			desk(g, room.x, room.z, 5.2, 1.25);
			for (let i = -2; i <= 2; i++) chair(g, room.x + i * 1.15, room.z - 1.3);
			monitor(g, room.x - 4.9, 2.0, room.z, Math.PI / 2, 1.8, 1.0);
			break;
		case 'linaccontrol':
			desk(g, room.x - 1.0, room.z, 6.0, 1.25, Math.PI / 2);
			monitorWall(g, room.x - 1.55, 1.78, room.z, 0.5 * Math.PI, 2, 2, 0.92, 0.52, 0.12);
			for (let i = -2; i <= 2; i++)
				taskChair(g, room.x + 0.95, room.z + i * 1.05, -Math.PI / 2, 0x4d6877);
			monitor(g, room.x + 4.45, 2.2, room.z + 2.0, Math.PI / 2, 1.7, 0.95);
			monitor(g, room.x + 4.45, 2.2, room.z - 2.0, Math.PI / 2, 1.7, 0.95);
			cabinetBank(g, room.x + 4.9, room.z, 1.7, 1.5, 0.45, Math.PI / 2, 0xdfe7ea);
			wallClock(g, room.x + 4.9, 2.85, room.z - 3.65, Math.PI / 2);
			sanitizerDispenser(g, room.x - 4.6, 1.55, room.z - room.d / 2 + 0.13, 0);
			break;
		case 'vault1':
			emulatorLinacShell(g, room);
			framedWallMonitor(
				g,
				room.x + room.w / 2 - 0.32,
				2.18,
				room.z + 5.0,
				-Math.PI / 2,
				4.25,
				2.28,
				'IN-ROOM PATIENT INFO',
				'Treatment setup and verification',
				[
					['Patient', 'LINAC treatment patient'],
					['Position', 'Supine, treatment couch'],
					['Immobilization', 'Site-specific device indexed'],
					['Status', 'Setup ready / verify imaging']
				]
			);
			framedWallMonitor(
				g,
				room.x + room.w / 2 - 0.32,
				2.18,
				room.z - 4.8,
				-Math.PI / 2,
				4.0,
				2.18,
				'SETUP CHECKLIST',
				'Pre-treatment room tasks',
				[
					['Identity', '2 identifiers verified'],
					['Couch', 'Indexed / accessory check'],
					['Imaging', 'Verification pending'],
					['Beam status', 'Standby']
				]
			);
			framedWallMonitor(
				g,
				room.x - 0.55,
				2.18,
				room.z - room.d / 2 + 0.35,
				0,
				4.55,
				1.95,
				'VAULT STATUS',
				'Room observation',
				[
					['Camera feeds', 'Ceiling and wall CCTV active'],
					['Intercom', 'Two-way communication ready'],
					['Safety', 'Emergency OFF locations marked']
				]
			);
			immobilizationStorage(
				g,
				room.x + 7.6,
				room.z + room.d / 2 - 0.95,
				Math.PI,
				'VAULT 1 IMMOBILIZATION'
			);
			biohazardBox(g, room.x + 10.25, room.z + room.d / 2 - 2.05, Math.PI, 'BIOHAZARD');
			sinkStation(g, room.x - room.w / 2 + 2.2, room.z - room.d / 2 + 2.1, 0);
			interiorRoomSign(
				g,
				room.x,
				3.58,
				room.z - room.d / 2 + 0.34,
				0,
				'VAULT 1 · LINAC',
				'External beam treatment vault'
			);
			wallClock(g, room.x + 8.7, 3.2, room.z - room.d / 2 + 0.35, 0);
			sanitizerDispenser(g, room.x - 4.4, 1.6, room.z - room.d / 2 + 0.34, 0);
			gloveBoxRack(g, room.x - 5.3, 1.65, room.z - room.d / 2 + 0.34, 0);
			emergencyStopPanel(g, room.x + room.w / 2 - 0.34, 1.55, room.z - 1.6, -Math.PI / 2);
			emergencyStopPanel(g, room.x - room.w / 2 + 0.45, 1.55, room.z + 1.2, Math.PI / 2);
			wallSpeaker(g, room.x + room.w / 2 - 0.34, 3.15, room.z + 1.8, -Math.PI / 2);
			warningPlaque(
				g,
				room.x - room.w / 2 + 0.32,
				2.65,
				room.z + 4.8,
				Math.PI / 2,
				'CAUTION',
				'HIGH RADIATION AREA'
			);
			warningPlaque(
				g,
				room.x - room.w / 2 + 0.32,
				1.65,
				room.z + 2.95,
				Math.PI / 2,
				'NO ENTRY',
				'WHEN BEAM ON'
			);
			cctvCamera(g, room.x + room.w / 2 - 0.55, 4.25, room.z + 9.2, -Math.PI / 2, -0.46);
			cctvCamera(g, room.x + room.w / 2 - 0.55, 4.25, room.z - 9.2, -Math.PI / 2, -0.46);
			cctvCamera(g, room.x - 5.4, 3.55, room.z - room.d / 2 + 0.32, 0, -0.44);
			wallArt(g, room.x + room.w / 2 - 0.35, 3.15, room.z - 6.0, -Math.PI / 2, 1.2, 0.52, 0x5b7381);
			break;
		case 'vault2':
			emulatorLinacShell(g, room);
			framedWallMonitor(
				g,
				room.x + room.w / 2 - 0.32,
				2.18,
				room.z + 5.0,
				-Math.PI / 2,
				4.25,
				2.28,
				'IN-ROOM PATIENT INFO',
				'Treatment setup and verification',
				[
					['Patient', 'LINAC treatment patient'],
					['Position', 'Supine, treatment couch'],
					['Immobilization', 'Site-specific device indexed'],
					['Status', 'Setup ready / verify imaging']
				]
			);
			framedWallMonitor(
				g,
				room.x + room.w / 2 - 0.32,
				2.18,
				room.z - 4.8,
				-Math.PI / 2,
				4.0,
				2.18,
				'SETUP CHECKLIST',
				'Pre-treatment room tasks',
				[
					['Identity', '2 identifiers verified'],
					['Couch', 'Indexed / accessory check'],
					['Imaging', 'Verification pending'],
					['Beam status', 'Standby']
				]
			);
			framedWallMonitor(
				g,
				room.x - 0.55,
				2.18,
				room.z - room.d / 2 + 0.35,
				0,
				4.55,
				1.95,
				'VAULT STATUS',
				'Room observation',
				[
					['Camera feeds', 'Ceiling and wall CCTV active'],
					['Intercom', 'Two-way communication ready'],
					['Safety', 'Emergency OFF locations marked']
				]
			);
			immobilizationStorage(
				g,
				room.x + 7.6,
				room.z + room.d / 2 - 0.95,
				Math.PI,
				'VAULT 2 IMMOBILIZATION'
			);
			biohazardBox(g, room.x + 10.25, room.z + room.d / 2 - 2.05, Math.PI, 'BIOHAZARD');
			sinkStation(g, room.x - room.w / 2 + 2.2, room.z - room.d / 2 + 2.1, 0);
			interiorRoomSign(
				g,
				room.x,
				3.58,
				room.z - room.d / 2 + 0.34,
				0,
				'VAULT 2 · LINAC',
				'External beam treatment vault'
			);
			wallClock(g, room.x + 8.7, 3.2, room.z - room.d / 2 + 0.35, 0);
			sanitizerDispenser(g, room.x - 4.4, 1.6, room.z - room.d / 2 + 0.34, 0);
			gloveBoxRack(g, room.x - 5.3, 1.65, room.z - room.d / 2 + 0.34, 0);
			emergencyStopPanel(g, room.x + room.w / 2 - 0.34, 1.55, room.z - 1.6, -Math.PI / 2);
			emergencyStopPanel(g, room.x - room.w / 2 + 0.45, 1.55, room.z + 1.2, Math.PI / 2);
			wallSpeaker(g, room.x + room.w / 2 - 0.34, 3.15, room.z + 1.8, -Math.PI / 2);
			warningPlaque(
				g,
				room.x - room.w / 2 + 0.32,
				2.65,
				room.z + 4.8,
				Math.PI / 2,
				'CAUTION',
				'HIGH RADIATION AREA'
			);
			warningPlaque(
				g,
				room.x - room.w / 2 + 0.32,
				1.65,
				room.z + 2.95,
				Math.PI / 2,
				'NO ENTRY',
				'WHEN BEAM ON'
			);
			cctvCamera(g, room.x + room.w / 2 - 0.55, 4.25, room.z + 9.2, -Math.PI / 2, -0.46);
			cctvCamera(g, room.x + room.w / 2 - 0.55, 4.25, room.z - 9.2, -Math.PI / 2, -0.46);
			cctvCamera(g, room.x - 5.4, 3.55, room.z - room.d / 2 + 0.32, 0, -0.44);
			wallArt(g, room.x + room.w / 2 - 0.35, 3.15, room.z - 6.0, -Math.PI / 2, 1.2, 0.52, 0x5b7381);
			break;
		case 'hdr':
			hdrSuite(g, room);
			const hcart = medCartObject(0.9, 0x90b98d);
			hcart.position.set(room.x + 3.8, 0, room.z - 3.8);
			g.add(hcart);
			registerInteractable(
				hcart,
				'HDR Procedure Cart',
				'Procedure supplies and brachytherapy support equipment.'
			);
			break;
	}
}

const INFILL_MAT = architecturalWallMaterial();

export function infillH(x1, x2, z, h = 3.75, t = 0.18) {
	if (x2 <= x1) return;
	wall((x1 + x2) / 2, z, x2 - x1, t, h, INFILL_MAT, true);
}

export function infillV(z1, z2, x, h = 3.75, t = 0.18) {
	if (z2 <= z1) return;
	wall(x, (z1 + z2) / 2, t, z2 - z1, h, INFILL_MAT, true);
}

export function buildCorridorInfillWalls() {
	// Patient-services corridor: close the wall faces between individual rooms.
	[
		[-52, -47],
		[-37, -35],
		[-25, -23],
		[-13, -12]
	].forEach((s) => infillH(s[0], s[1], -3));
	[
		[-52, -35],
		[-21, -12]
	].forEach((s) => infillH(s[0], s[1], 3));
	// Technical corridor: continuous wall texture between lab door frontages.
	[
		[-13, -10],
		[-26, -23],
		[-39, -36],
		[-54, -49],
		[-70, -66]
	].forEach((s) => infillV(s[0], s[1], -3));
	[
		[-13, -10],
		[-26, -23],
		[-41.5, -36],
		[-66, -56.5]
	].forEach((s) => infillV(s[0], s[1], 3));
	// Clinical corridor and transition toward treatment branch.
	[
		[12, 15],
		[25, 44],
		[58, 60]
	].forEach((s) => infillH(s[0], s[1], 4));
	[
		[12, 27],
		[52, 60]
	].forEach((s) => infillH(s[0], s[1], -4));
	// Treatment branch between the two vault entrances.
	infillV(-7, 7, 67, 5.7, 0.42);
}

export function buildVaultMazeEntries() {
	const h = 4.55,
		m = MAT.wallVault;
	function straightHallWithTurn(z, turnPositive = true) {
		const hallCenterX = 67.9,
			hallLength = 7.2,
			halfWidth = 2.55;
		// long straight shielded hall from entry door
		wall(hallCenterX, z - halfWidth, hallLength, 0.42, h, m, true);
		wall(hallCenterX, z + halfWidth, hallLength, 0.42, h, m, true);
		// single inside corner / baffle that creates the L-turn before the room opens up
		const cornerZ = turnPositive ? z - 1.3 : z + 1.3;
		wall(71.65, cornerZ, 0.42, 2.7, h, m, true);
		// floor guidance stripe showing straight hall and corner turn
		const stripe = box(7.05, 0.02, 0.22, std(0xff737b, 0.52, 0.02), 67.8, 0.07, z);
		scene.add(stripe);
		const turnStripe = turnPositive
			? box(0.22, 0.02, 2.65, std(0xff737b, 0.52, 0.02), 71.85, 0.07, z + 1.5)
			: box(0.22, 0.02, 2.65, std(0xff737b, 0.52, 0.02), 71.85, 0.07, z - 1.5);
		scene.add(turnStripe);
		const marker = box(0.24, 3.0, 0.05, std(0x88434a, 0.65, 0.02), 63.88, 2.0, z);
		scene.add(marker);
	}
	// Vault 1 turns toward higher Z into the open treatment space; Vault 2 mirrors toward lower Z.
	straightHallWithTurn(-18, true);
	straightHallWithTurn(18, false);
}

// hub-and-wings corridors
export function corridorFloor(x, z, w, d, color) {
	const base =
		color === C.front
			? 0x778891
			: color === C.technical
				? 0x837d70
				: color === C.clinical
					? 0x70898a
					: 0x59636a;
	const floor = box(w, 0.06, d, std(base, 0.89, 0.03), x, 0.02, z);
	scene.add(floor);
	const accent = box(
		w >= d ? w * 0.92 : 0.22,
		0.018,
		w >= d ? 0.22 : d * 0.92,
		std(color, 0.52, 0.03),
		x,
		0.065,
		z
	);
	scene.add(accent);
}

export function corridorLightsHorizontal(x0, x1, z, y = 3.72) {
	for (let x = x0; x <= x1; x += 5) {
		const l = box(
			2.1,
			0.025,
			0.24,
			std(0xffffff, 0.3, 0, { emissive: 0xffffff, emissiveIntensity: 1.35 }),
			x,
			y,
			z
		);
		scene.add(l);
	}
}

export function corridorLightsVertical(z0, z1, x, y = 3.72) {
	for (let z = z0; z <= z1; z += 5) {
		const l = box(
			0.24,
			0.025,
			2.1,
			std(0xffffff, 0.3, 0, { emissive: 0xffffff, emissiveIntensity: 1.35 }),
			x,
			y,
			z
		);
		scene.add(l);
	}
}

export function clinicalCeilingAccents(roomId) {
	const r = roomById(roomId);
	if (!r) return;
	const h = r.vault ? 5.55 : 3.62;
	const g = new THREE.Group();
	scene.add(g);
	const lightMat = std(0xeafcff, 0.22, 0, { emissive: 0xd9fbff, emissiveIntensity: 1.55 });
	const trimMat = std(0x70878f, 0.62, 0.08);
	if (roomId === 'vault1' || roomId === 'vault2') {
		for (const z of [r.z - 6.5, r.z - 2.2, r.z + 2.2, r.z + 6.5]) {
			const p = box(5.6, 0.025, 0.42, lightMat, r.x, h, z);
			g.add(p);
		}
		for (const sx of [-1, 1]) {
			const c = box(0.18, 0.025, r.d - 3.2, lightMat, r.x + sx * (r.w / 2 - 1.3), h - 0.04, r.z);
			g.add(c);
		}
	} else {
		for (let i = -1; i <= 1; i++) {
			const p = box(Math.min(3.2, r.w - 2), 0.025, 0.38, lightMat, r.x, h, r.z + i * 2.15);
			g.add(p);
		}
		const edge = box(r.w - 1.2, 0.045, 0.08, trimMat, r.x, h + 0.015, r.z - r.d / 2 + 0.7);
		g.add(edge);
	}
}

export function addClinicalWallPolish() {
	const g = new THREE.Group();
	scene.add(g);
	const glow = std(0x78e8e0, 0.28, 0, { emissive: 0x3accc6, emissiveIntensity: 1.15 });
	const dark = std(0x31444d, 0.58, 0.12);
	// Flat, thin backplates behind the monitor banks. The previous rotated geometry projected into the room.
	const linacPlate = box(0.08, 2.35, 5.4, dark, 49.72, 1.75, 9);
	g.add(linacPlate);
	const linacAccent = box(0.035, 0.07, 5.0, glow, 49.78, 2.92, 9);
	g.add(linacAccent);
	const ctPlate = box(0.08, 2.35, 4.2, dark, 30.02, 1.75, -9);
	g.add(ctPlate);
	const ctAccent = box(0.035, 0.07, 3.8, glow, 30.08, 2.92, -9);
	g.add(ctAccent);
	const v1 = roomById('vault1');
	if (v1) {
		for (const z of [v1.z - 7.8, v1.z + 7.8]) {
			const l = box(9.0, 0.05, 0.06, glow, v1.x, 3.95, z);
			g.add(l);
		}
	}
	const ct = roomById('ctsim');
	if (ct) {
		const l = box(7.2, 0.04, 0.08, glow, ct.x, 3.15, ct.z + 5.8);
		g.add(l);
	}
}

export function corridorAnchor(room) {
	if (!room || room.hub) return { p: new THREE.Vector3(0, 1.66, 0), line: 'main' };
	if (room.wing === 'patient') return { p: new THREE.Vector3(room.x, 1.66, 0), line: 'main' };
	if (room.wing === 'technical')
		return { p: new THREE.Vector3(0, 1.66, room.z), line: 'technical' };
	if (room.id === 'vault1') return { p: new THREE.Vector3(63.15, 1.66, -18), line: 'treatment' };
	if (room.id === 'vault2') return { p: new THREE.Vector3(63.15, 1.66, 18), line: 'treatment' };
	if (room.id === 'hdr') return { p: new THREE.Vector3(64, 1.66, room.z), line: 'treatment' };
	return { p: new THREE.Vector3(room.x, 1.66, 0), line: 'main' };
}

export function doorLabel(type) {
	return type === 'patientSwing'
		? 'patient-room swing door'
		: type === 'technicalDouble'
			? 'double laboratory doors'
			: type === 'leadershipSwing'
				? 'office door'
				: type === 'clinicalSlide'
					? 'automatic clinical doors'
					: type === 'vaultSlide'
						? 'shielded vault door'
						: 'shielded HDR door';
}
