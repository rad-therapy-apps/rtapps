/* RTApps (#77 sim-hub modularization, task 8): interactables, prompts, staff dialogues,
   procedure/QA labs, the LINAC-head-lab dialog, equipment/kiosk panels, and room info/UI —
   the interactable registry (`registerInteractable`/`nearestInteractable`), the walk-mode
   interact/door prompt (`performInteraction`/`updateInteractionUI`), the `toast` widget, staff
   conversation dialogs (`STAFF_GUIDES` const and `open/close/resetStaffDialogue`), the wayfinding
   kiosk dialog, the CT/QA Procedures Lab (`open/closeProcedureLab`, `proc*` helpers), the
   LINAC-head-lab teaching dialog (`open/closeLinacHeadLab`, `lh*` helpers), the equipment detail
   panel (`showEquipmentPanel`/`closeEquipmentPanel`), room inspection/composition
   (`enable/disableRoomInspection`, `roomInspectPose`). Verbatim
   extractions from main.js. `ROOM_APP_DOORS` (read only by `performInteraction`) and
   `LH_COMPONENTS`/`PROC_CHOICES` (read only by their respective moved functions) moved along
   with their sole consumers and are not exported. A handful of symbols stay owned by main.js
   because still-resident journey/booking systems read or write them too:
   `player`/`HANDOFFS`/`REACH_Y` (already exported from main.js per
   earlier tasks — task 9 moved `focusTargetsForRoom`/`focusConversationCamera`/
   `applyWalkConversationComposition` to ./journey.js and `PROC_STATE`/`PROC_SITES` to
   ./sdk-bridge.js, both imported back here).
   `doorCenter`/`doorNormal`/`nearestDoor`/`getColliders` are owned by
   ./walk.js (task 8's companion module) and imported back here. */
import * as THREE from 'three';
import type { Room } from './rooms';
import { isPaused } from './pause';
import { getPlayMode } from './play-mode';
import { PREF, writePref } from './prefs';
import { SIGHT_END_CLEARANCE, inFront, segmentBlocked } from './prompt-math';
import { S } from './state';
import { camera, orbit } from './scene';
import { bubble } from './npc';
import { startActorHandoff } from './npc-behavior';
import {
	EQUIPMENT_BY_ID,
	EQUIPMENT_EXPLORED,
	EQUIPMENT_SPECS,
	equipmentRoomName
} from './equipment';
import { doorCenter, doorNormal, nearestDoor, getColliders, requestWalkPointerLock } from './walk';
import { player, HANDOFFS, REACH_Y } from './main';
import { PROC_STATE, PROC_SITES, getCtAppUrl } from './sdk-bridge';
import { roomAppHref } from './room-app-url';
import { createPager } from './pager';
import {
	focusConversationCamera,
	applyWalkConversationComposition,
	focusTargetsForRoom
} from './journey';

/* === Department orientation: staff roles and common patient questions === */
export const STAFF_GUIDES = {
	lobby: {
		name: 'Maya Brooks',
		role: 'Patient Access Coordinator',
		initials: 'MB',
		intro:
			'Welcome. I help patients check in, verify registration information, coordinate scheduling and make sure the right clinical team knows the patient has arrived.',
		questions: [
			[
				'What should I bring to my first visit?',
				'Bring the information your clinic requested, such as identification, insurance information, medication details and any outside records or imaging the team asked you to provide. Requirements vary by center, so the appointment instructions are the best guide.'
			],
			[
				'Who do I call if I am late or cannot come?',
				'Call the radiation oncology department as soon as you can. Patient access or scheduling staff can notify the clinical team and help determine the next step.'
			],
			[
				'Why do you verify my identity so often?',
				'Repeated identity checks are an important safety practice. Different staff verify identifiers before appointments, imaging, procedures and treatment so the correct care is matched to the correct patient.'
			]
		]
	},
	consult: {
		name: 'Dr. Elena Ramirez',
		role: 'Radiation Oncologist',
		initials: 'ER',
		intro:
			'I am the physician who evaluates whether radiation therapy is appropriate, explains treatment goals and risks, prescribes the radiation course and oversees the patient throughout treatment.',
		questions: [
			[
				'Why is radiation being recommended for me?',
				'Radiation may be used to cure or control cancer, reduce the risk of recurrence, or relieve symptoms. The reason is specific to the diagnosis, stage, prior treatments and overall goals of care, which your oncologist will review with you.'
			],
			[
				'Who decides the dose and number of treatments?',
				'The radiation oncologist prescribes the treatment course. Dosimetrists and medical physicists help turn that prescription into a safe technical plan, and the physician reviews and approves the plan before treatment.'
			],
			[
				'Will external-beam radiation make me radioactive?',
				'No. Standard external-beam radiation does not make the patient radioactive. Internal-source or radiopharmaceutical treatments are different and may involve specific precautions that the care team explains when relevant.'
			]
		]
	},
	social: {
		name: 'Nia Carter, LCSW',
		role: 'Oncology Social Worker',
		initials: 'NC',
		intro:
			'I help patients and caregivers with the practical and emotional effects of cancer care, including distress, transportation, finances, work concerns, family needs and connections to community resources.',
		questions: [
			[
				'I am worried about rides to treatment. Can anyone help?',
				'Yes. Transportation barriers are common. Social work can help identify hospital, community, insurance or nonprofit transportation resources that may be available in your area.'
			],
			[
				'What if treatment is creating financial or work problems?',
				'Tell us early. We can help connect you with financial counseling, benefits information, workplace or leave resources and community programs. Available assistance varies by location and eligibility.'
			],
			[
				'I feel overwhelmed. Is counseling part of cancer care?',
				'It can be. Emotional distress is common during cancer care. Social workers can provide support, help with coping and connect patients or caregivers with counseling or other behavioral-health resources when needed.'
			]
		]
	},
	education: {
		name: 'Sam Nguyen',
		role: 'Patient Navigator',
		initials: 'SN',
		intro:
			'I help patients understand the sequence of care, keep track of appointments and connect with reliable education, contact information and support resources.',
		questions: [
			[
				'What happens after my consultation?',
				'The exact sequence varies, but many patients next have simulation, then treatment planning and quality checks, followed by scheduled treatment. Your team will tell you which steps apply to you.'
			],
			[
				'Who should I call when I have a question?',
				'Use the contact information your department provides. Navigators help direct questions to the right person—such as the nurse for symptoms, the therapist for treatment-day logistics or the physician for medical decisions.'
			],
			[
				'Can a family member be involved?',
				'Usually, yes, and many patients find that helpful. Visitor access can differ by room and procedure, and no one other than the patient remains in a treatment vault during radiation delivery.'
			]
		]
	},
	patientcare: {
		name: 'Taylor Morgan, RN',
		role: 'Oncology Nurse',
		initials: 'TM',
		intro:
			'I assess symptoms, review medications, reinforce patient teaching and coordinate supportive care with the physician and the rest of the radiation oncology team.',
		questions: [
			[
				'What should I do if I start feeling sick during treatment?',
				'Tell your treatment team. Nurses and physicians want to know about new or worsening symptoms so they can assess the cause and recommend appropriate supportive care.'
			],
			[
				'Should I keep taking my regular medications?',
				'Do not make medication changes based only on general information. Bring an accurate medication list and ask your oncology team about your specific medications, supplements and treatment plan.'
			],
			[
				'Who helps with skin, nutrition, pain or fatigue concerns?',
				'Start by telling the radiation oncology team. The nurse and physician can assess the problem and may involve dietitians, social work, rehabilitation, pain specialists or other support services as needed.'
			]
		]
	},
	safety: {
		name: 'Casey Hall',
		role: 'Radiation Safety Officer',
		initials: 'CH',
		intro:
			'I focus on safe use of radiation and radioactive material, including monitoring, procedures, regulatory requirements, shielding and the ALARA principle.',
		questions: [
			[
				'How is radiation kept from reaching people outside the treatment room?',
				'Treatment rooms are designed with shielding, controlled access and safety interlocks. Radiation surveys and quality checks confirm that barriers and operating procedures provide the required protection.'
			],
			[
				'Are staff exposed to radiation every day?',
				'Radiation workers follow time, distance and shielding practices and occupational monitoring requirements. Treatment staff leave the vault during external-beam delivery and monitor the patient remotely.'
			],
			[
				'What is different when radioactive sources are used?',
				'Radioactive-source procedures have additional controls for source accountability, storage, transfer and emergency response. The exact precautions depend on the source and procedure.'
			]
		]
	},
	physics: {
		name: 'Avery Patel, MS',
		role: 'Medical Physicist',
		initials: 'AP',
		intro:
			'I apply radiation physics to patient care. Medical physicists calibrate treatment equipment, develop and oversee quality assurance, support treatment planning and verify that dose-delivery systems perform accurately.',
		questions: [
			[
				'How do you know the machine gives the correct dose?',
				'Medical physicists perform calibrated measurements and a structured quality-assurance program. They compare machine performance with established tolerances and investigate results that fall outside expected limits.'
			],
			[
				'Do physicists check every patient plan?',
				'Physics involvement depends on the treatment technique and local workflow, but physicists oversee the dosimetric and technical integrity of treatment planning and perform patient-specific checks when required by the procedure or program.'
			],
			[
				'Why are there so many machine tests?',
				'A treatment machine combines radiation production, mechanical motion, imaging, software and safety systems. Regular QA verifies that these systems continue to agree with the clinical baseline.'
			]
		]
	},
	radbio: {
		name: 'Dr. Priya Shah',
		role: 'Radiobiology Educator / Scientist',
		initials: 'PS',
		intro:
			'In an academic center, radiobiology educators and scientists study how radiation affects cells and tissues. That science helps clinicians understand tumor response, normal-tissue effects and fractionation.',
		questions: [
			[
				'How does radiation damage cancer cells?',
				'Radiation deposits energy that can damage critical cellular molecules, especially DNA. If damage is severe or cannot be repaired successfully, the cell may lose the ability to keep dividing.'
			],
			[
				'Why is treatment often divided into many sessions?',
				'Fractionation allows the prescribed dose to be delivered over time. The schedule is chosen to balance tumor control with normal-tissue tolerance and depends on the disease site, treatment intent and technique.'
			],
			[
				'Why can normal tissues recover differently from tumors?',
				'Tumors and normal tissues differ in repair capacity, cell-cycle behavior, repopulation and other biological characteristics. Those differences are part of the rationale for clinically selected dose and fractionation schedules.'
			]
		]
	},
	engineering: {
		name: 'Alex Kim',
		role: 'LINAC Field Service Engineer',
		initials: 'AK',
		intro:
			'I maintain and repair the complex mechanical, electronic, RF, cooling and computer systems that allow the treatment machine to operate reliably.',
		questions: [
			[
				'Who fixes the treatment machine if something breaks?',
				'Therapists first stop and report a problem. Medical physics evaluates clinical performance and safety, while trained service engineers diagnose and repair hardware or system faults.'
			],
			[
				'What happens if the machine stops during my treatment?',
				'The team will assess the interruption and only continue when the equipment and treatment conditions are safe. Your therapists will explain what is happening and whether any schedule adjustment is needed.'
			],
			[
				'Why does the machine need preventive maintenance?',
				'These systems contain many moving and electronic components. Preventive maintenance helps identify wear, preserve reliability and reduce unexpected downtime.'
			]
		]
	},
	qa: {
		name: 'Avery Patel, MS',
		role: 'Medical Physicist · Quality Assurance',
		initials: 'AP',
		intro:
			'In QA, I use phantoms, detectors and analysis tools to verify radiation output, mechanical geometry, imaging performance and safety systems.',
		questions: [
			[
				'What kinds of things are checked?',
				'Examples include dose output, beam characteristics, imaging alignment, lasers, mechanical motion and safety interlocks. The exact test schedule depends on equipment, regulations and professional guidance.'
			],
			[
				'What happens if a QA test fails?',
				'The result is evaluated before the affected function is used clinically. Depending on the finding, the team may repeat the test, restrict use, adjust or repair the system and verify performance before returning it to service.'
			],
			[
				'Why check lasers and imaging if the radiation beam is the treatment?',
				'Accurate treatment depends on the whole chain: patient positioning, imaging, mechanical geometry and radiation delivery must reference the same intended treatment coordinates.'
			]
		]
	},
	dosimetry: {
		name: 'Morgan Ellis',
		role: 'Medical Dosimetrist',
		initials: 'ME',
		intro:
			'I create the technical treatment plan from the radiation oncologist’s prescription. I design beam arrangements and optimize dose so the target receives the intended treatment while nearby normal tissues are protected as much as possible.',
		questions: [
			[
				'What exactly is treatment planning?',
				'Planning uses the simulation images, physician-defined targets and normal structures to calculate and compare possible ways of delivering the prescription.'
			],
			[
				'How do you protect normal organs?',
				'The planning team shapes and modulates beams, selects angles and applies dose objectives or constraints. The final balance depends on anatomy, prescription, technique and clinical priorities.'
			],
			[
				'Who approves the plan before I am treated?',
				'The radiation oncologist reviews and approves the clinical treatment plan. Dosimetry and medical physics perform their respective planning and technical checks according to the department workflow.'
			]
		]
	},
	commons: {
		name: 'Jamie Reed',
		role: 'Clinical Education Coordinator',
		initials: 'JR',
		intro:
			'I support staff orientation, continuing education and supervised clinical learning so team members and trainees develop skills without compromising patient safety.',
		questions: [
			[
				'Are students allowed to participate in my care?',
				'Students may participate under appropriate supervision when permitted by the institution and clinical program. Patients can ask who is involved in their care and discuss concerns with the clinical team.'
			],
			[
				'Who supervises trainees?',
				'Licensed or credentialed clinical staff supervise learners according to their role, level of training, institutional policy and program requirements.'
			],
			[
				'Can I ask what each person in the room is doing?',
				'Absolutely. Clear introductions and role explanations are part of respectful team-based care, and you can ask who is involved and why.'
			]
		]
	},
	manager: {
		name: 'Chris Wallace, RTT',
		role: 'Rad Onc Manager / Lead Therapist',
		initials: 'CW',
		intro:
			'I coordinate treatment operations, staffing, workflow, chart-review processes and escalation of clinical or service concerns across the radiation oncology department.',
		questions: [
			[
				'Who can I speak with if I have a concern about my experience?',
				'Tell any member of the care team. A lead therapist or manager can help address operational concerns and connect you with the appropriate clinical, patient-relations or support resource.'
			],
			[
				'Who coordinates the treatment staff and daily schedule?',
				'Lead therapists and managers commonly coordinate staffing and operational flow with therapists, physicians, nurses, physics, dosimetry and scheduling staff.'
			],
			[
				'What happens if the team finds a treatment problem?',
				'The immediate priority is patient safety. Staff stop or hold the affected process, verify the issue, escalate it through the appropriate clinical and quality channels, and determine safe next steps.'
			]
		]
	},
	ctcontrol: {
		name: 'Jordan Lee, RTT',
		role: 'CT Simulation Therapist · Control Room',
		initials: 'JL',
		intro:
			'From the CT control room I operate the scanner, watch the patient through the observation window, communicate by intercom and confirm that the imaging needed for planning is acquired correctly.',
		questions: [
			[
				'What are you watching from behind the glass?',
				'I watch the patient, scanner and acquisition process while monitoring the images and technical parameters at the console.'
			],
			[
				'How long will the scan take?',
				'The imaging portion can be relatively brief, but the full simulation appointment may take longer because positioning, immobilization, contrast or motion-management preparation can require additional time.'
			],
			[
				'What if I need you to stop?',
				'Tell the therapist before the scan how you prefer to communicate, and speak up if you are uncomfortable. Staff can communicate with you throughout the simulation and respond if the scan needs to pause.'
			]
		]
	},
	ctsim: {
		name: 'Jordan Lee, RTT',
		role: 'Radiation Therapist · CT Simulation',
		initials: 'JL',
		intro:
			'I create a reproducible treatment position, prepare immobilization when needed, establish reference marks and acquire planning images for the treatment-planning team.',
		questions: [
			[
				'Why do I need a mask, cradle or other immobilization?',
				'Immobilization helps reproduce the planned position and reduce unwanted motion. The device selected depends on the body site, treatment technique and individual patient needs.'
			],
			[
				'Why do you make marks or tiny tattoos?',
				'Reference marks can help the treatment team reproduce the planned setup and relate the patient to room lasers or other positioning systems. Practices vary by site and department.'
			],
			[
				'Am I getting radiation treatment today?',
				'A CT simulation is usually a planning appointment rather than the treatment itself. After simulation, the images are used to create and verify the treatment plan before the first treatment, although exact workflows vary.'
			]
		]
	},
	linaccontrol: {
		name: 'Morgan Reed, RTT',
		role: 'Radiation Therapist · Treatment Control',
		initials: 'MR',
		intro:
			'From the LINAC control area I verify the treatment record, review setup imaging, monitor the machine and watch and communicate with the patient during treatment.',
		questions: [
			[
				'Why do you leave the room when treatment starts?',
				'The patient must be alone in the treatment vault during radiation delivery so staff do not receive unnecessary occupational exposure. We remain in continuous control of the treatment from outside the shielded room.'
			],
			[
				'Can you see and hear me while I am alone?',
				'Yes. Treatment rooms use cameras and intercom systems so therapists can monitor and communicate with the patient throughout the treatment.'
			],
			[
				'Why do you take images before treatment?',
				'Image guidance helps verify that the patient and internal anatomy are aligned with the planned treatment position before radiation is delivered.'
			]
		]
	},
	vault1: {
		name: 'Jamie Williams, RTT',
		role: 'Radiation Therapist · Treatment Vault 1',
		initials: 'JW',
		intro:
			'I position patients on the LINAC couch, reproduce the simulation setup, acquire verification imaging and deliver the prescribed external-beam treatment.',
		questions: [
			[
				'Will the LINAC touch me?',
				'The gantry and imaging devices move around the patient and may come close, but they are planned to avoid contact. Therapists check clearance carefully before and during machine motion.'
			],
			[
				'Can I feel the radiation?',
				'The radiation beam itself is not something patients normally feel as it is delivered. Positioning or holding still may be uncomfortable, and treatment side effects can develop over time depending on the area treated.'
			],
			[
				'How long do I have to stay still?',
				'That depends on the treatment. The team will tell you when to remain still, and most of the appointment includes positioning and verification in addition to the actual beam-delivery time.'
			]
		]
	},
	vault2: {
		name: 'Dana Foster, RTT',
		role: 'Radiation Therapist · Treatment Vault 2',
		initials: 'DF',
		intro:
			'This second vault follows the same core external-beam workflow: verify the patient and prescription, reproduce setup, perform image guidance and safely deliver the planned treatment.',
		questions: [
			[
				'Why are there two treatment machines?',
				'Larger departments may operate multiple treatment units to support patient volume, different schedules, maintenance needs and clinical capabilities.'
			],
			[
				'Are the safety checks the same on both machines?',
				'The underlying safety principles are the same, but each machine has equipment-specific procedures, quality assurance and operating limits that staff are trained to follow.'
			],
			[
				'What happens if my usual machine is unavailable?',
				'The team evaluates whether treatment can safely continue on another compatible unit or whether the schedule should be adjusted. That decision requires clinical and technical verification rather than simply moving a patient to another machine.'
			]
		]
	},
	hdr: {
		name: 'Riley Chen, RN',
		role: 'Brachytherapy / Special Procedures Nurse',
		initials: 'RC',
		intro:
			'I support patients through HDR and special procedures by coordinating preparation, monitoring, education and recovery with the radiation oncologist, physicist and radiation therapy team.',
		questions: [
			[
				'What is HDR brachytherapy?',
				'High-dose-rate brachytherapy uses a highly active radioactive source that is remotely moved from a shielded afterloader through applicators placed in or near the treatment area for precisely timed positions.'
			],
			[
				'Will I stay radioactive after an HDR treatment?',
				'With temporary HDR brachytherapy, the source is returned to the shielded afterloader at the end of treatment, so the patient does not remain radioactive from that HDR source. Other types of internal or systemic radiation can have different precautions.'
			],
			[
				'Why is this room shielded?',
				'The shielding protects staff and others while the HDR source is outside the afterloader during treatment. Staff monitor and communicate with the patient from the protected control area.'
			]
		]
	}
};

// `opts.enabled`: the target takes part only while it returns true (the tutorial's own targets, PR 3).
// An object whose own `visible` is false (an actor the player is playing) is never offered either.
const interactables = [];
export function registerInteractable(
	object,
	label,
	detail = '',
	range = 2.5,
	guideKey = null,
	action = null,
	opts: { enabled?: () => boolean } = {}
) {
	interactables.push({ object, label, detail, range, guideKey, action, enabled: opts.enabled });
	return object;
}
// E works on an object within its own range but never past 2.8 m (the old nearestInteractable cap),
// and on a door within 2.6 m (walk.ts nearestDoor). Equipment is measured in 3D from a fixed 1.65 m
// (main.ts REACH_Y), not the eye (PLAYER_EYE_Y), so its range feels as before. A person is measured
// along the floor, from the player to their feet: their group origin sits at the floor, so the 3D
// measure would cut a 2.4 m range to about 1.7 m, short of where the prompt shows.
const REACH_CAP = 2.8,
	DOOR_REACH = 2.6;
// Line of sight on the floor plan: a target with a wall between it and the player is skipped, so
// people in the next room never show a prompt through the wall.
const inSight = (x: number, z: number) =>
	!segmentBlocked(player.pos.x, player.pos.z, x, z, getColliders(), SIGHT_END_CLEARANCE);
// Only what is in front of the player is offered (prompt-math.ts inFront, on the floor plan), so a
// person behind them never hides the prompt for someone in view, and E never talks to someone unseen.
const viewDir = new THREE.Vector3();
const inView = (x: number, z: number) => {
	camera.getWorldDirection(viewDir);
	return inFront(viewDir.x, viewDir.z, player.pos.x, player.pos.z, x, z);
};
const doorInSight = (room: Room) => {
	const c = doorCenter(room);
	return inSight(c.x, c.z) && inView(c.x, c.z);
};
// A later registration wins a tie within this many metres: the tutorial's E target over a person
// (tutorial.ts ensureAnchors) sits at the same floor distance as the person's own interactable.
const TIE_EPS = 1e-6;
function nearestInteractable() {
	let best = null,
		bd = Infinity;
	const wp = new THREE.Vector3(),
		from = new THREE.Vector3(player.pos.x, REACH_Y, player.pos.z);
	for (const it of interactables) {
		if (it.object.visible === false || (it.enabled && !it.enabled())) continue;
		it.object.getWorldPosition(wp);
		const d = it.object.userData?.npcRole
				? Math.hypot(wp.x - player.pos.x, wp.z - player.pos.z)
				: from.distanceTo(wp),
			reach = Math.min(REACH_CAP, it.range || REACH_CAP);
		if (d <= bd + TIE_EPS && d <= reach && inView(wp.x, wp.z) && inSight(wp.x, wp.z)) {
			bd = d;
			best = { ...it, d, reach, pos: wp.clone() };
		}
	}
	return best;
}
/** The nearest interactable or door within its reach, decided as before: the interactable
    wins unless the door is more than 0.25 m nearer. */
function nearestTarget() {
	const it = nearestInteractable(),
		// only doors that leave the hub for another simulator: every other door opens by itself as
		// the player walks up (walk.ts updateWalk), so it gets no prompt and E leaves it alone
		door = nearestDoor(DOOR_REACH, (room) => leavesHub(room) && doorInSight(room));
	if (it && (!door || it.d <= door.d + 0.25)) return { it, door: null };
	return door ? { it: null, door } : null;
}

const ROOM_APP_DOORS = new Set(['LINAC Control Area', 'CT Control Room', 'CT Simulator Room']);
/** A door that leaves the hub for another simulator, once that simulator's player URL resolved;
    none in the tutorial, where leaving would end the chapter (no prompt, and E leaves it alone). */
const leavesHub = (room: Room) =>
	getPlayMode() !== 'tutorial' &&
	((!!S.ROOM_APP_URL && ROOM_APP_DOORS.has(room.name)) ||
		(!!S.CONSOLE_APP_URL && S.CONSOLE_APP_DOORS.has(room.name)));

export function performInteraction() {
	if (S.mode !== 'walk' || isPaused()) return;
	const t = nearestTarget();
	if (t?.it) {
		const it = t.it;
		if (it.guideKey && STAFF_GUIDES[it.guideKey]) {
			openStaffDialogue(it.guideKey);
			return;
		}
		if (typeof it.action === 'function') {
			it.action(it);
			return;
		}
		toast(`<b>${it.label}</b><br>${it.detail || 'Interactive object'}`);
		return;
	}
	if (!t?.door) return;
	const room = t.door.room;
	if (S.ROOM_APP_URL && ROOM_APP_DOORS.has(room.name)) {
		// RTApps (plan 4c): these three doors leave the hub for the LINAC/CT room app, the CT doors on
		// its CT side and LINAC Control on its LINAC side (room-app-url.ts). Its Back to the Center
		// button brings the player back outside this door (return-door.ts).
		writePref(PREF.returnDoor, room.id, 'session');
		window.top.location.href = roomAppHref(
			room.id,
			{ linac: S.ROOM_APP_URL, ct: getCtAppUrl() },
			window.location.href
		);
		return;
	}
	if (S.CONSOLE_APP_URL && S.CONSOLE_APP_DOORS.has(room.name)) {
		// RTApps (plan 4d): the Learning Commons door leaves the hub for the console emulator.
		window.top.location.href = S.CONSOLE_APP_URL;
		return;
	}
}

/** What the E prompt shows; hud-prompt.ts places it beside `object` (or the door) every frame. */
export type PromptTarget =
	| {
			kind: 'thing';
			object: THREE.Object3D;
			person: boolean;
			title: string;
			sub: string;
	  }
	| { kind: 'door'; room: Room; title: string; sub: string };
let promptTarget: PromptTarget | null = null;
export const getPromptTarget = (): PromptTarget | null => promptTarget;
function pickPromptTarget(): PromptTarget | null {
	// only what E acts on right now, so the prompt and E always agree
	const t = nearestTarget();
	if (!t) return null;
	if (t.door) {
		const room = t.door.room;
		return {
			kind: 'door',
			room,
			title: `Enter ${room.name}`,
			sub: ''
		};
	}
	const it = t.it,
		guide = it.guideKey ? STAFF_GUIDES[it.guideKey] : null;
	return {
		kind: 'thing',
		object: it.object,
		person: !!it.object.userData?.npcRole,
		title: guide ? `Talk to ${guide.name}` : it.label,
		sub: guide ? guide.role : ''
	};
}
/** Every third frame (main.ts stepSimulation): the crosshair, and the E prompt's target. */
export function updateInteractionUI() {
	const walking = S.mode === 'walk' && !S.travel;
	document.getElementById('walkReticle')?.classList.toggle('show', walking);
	promptTarget = walking ? pickPromptTarget() : null;
}

export const LINAC_HEAD_LAB = {
	mode: 'photon',
	energy: '6 MV',
	animating: false,
	progress: 0,
	start: 0,
	selected: null,
	hit: [],
	previewTexture: null
};
const LH_COMPONENTS = {
	bending: {
		title: 'Bending Magnet',
		photon:
			'Turns the accelerated electron beam toward the treatment-head axis and helps direct the selected beam into the head.',
		electron:
			'Turns/directs the accelerated electron beam toward the treatment-head axis before electron-mode beam modification.'
	},
	target: {
		title: 'X-ray Target / Electron Bypass',
		photon:
			'High-energy electrons strike a high-Z target to generate bremsstrahlung photons. The emerging photon beam then enters the treatment head.',
		electron:
			'In this generic teaching model the x-ray target is removed from the electron beam path so clinical electrons continue toward the electron scattering system.'
	},
	primary: {
		title: 'Primary Collimator',
		photon: 'Provides the first fixed collimation of the photon beam downstream of the target.',
		electron:
			'Defines and shields the upstream treatment-head aperture while the electron beam continues toward its scattering system.'
	},
	carousel: {
		title: 'Beam-Modifier Carousel',
		photon:
			'Positions the selected photon beam modifier. This teaching model shows a flattening filter for conventional flattened photon mode.',
		electron:
			'Positions an electron scattering foil appropriate to the selected nominal electron energy.'
	},
	chamber: {
		title: 'Monitor Ion Chamber',
		photon:
			'Monitors treatment-beam output and related delivery parameters as the beam passes through the head.',
		electron:
			'Monitors electron-beam output and delivery parameters after the electron beam has been broadened.'
	},
	jaws: {
		title: 'Secondary Collimator Jaws',
		photon:
			'Movable high-density collimators establish a rectangular aperture and provide additional field shaping/shielding.',
		electron:
			'Jaws generally open to an electron-mode setting that works with the downstream electron applicator/insert system.'
	},
	mlc: {
		title: 'Multileaf Collimator (MLC)',
		photon:
			'Individually controlled leaves shape the photon field and can modulate fluence during IMRT/VMAT delivery.',
		electron:
			'In the conventional electron mode represented in this simulator, the MLC leaves are fully retracted and are not used to shape or modulate the electron field. Electron field definition is provided downstream by the electron applicator/cone and its insert.'
	},
	applicator: {
		title: 'Electron Applicator / Insert',
		photon: 'Not used in the photon beam path shown here.',
		electron:
			'A downstream applicator/cone and patient-specific or standard insert help define the clinical electron field near the patient.'
	}
};
export function lhPreviewTexture() {
	const c = document.createElement('canvas');
	c.width = 1200;
	c.height = 700;
	const q = c.getContext('2d');
	q.fillStyle = '#0b1720';
	q.fillRect(0, 0, c.width, c.height);
	q.fillStyle = '#37c8c0';
	q.fillRect(0, 0, c.width, 28);
	q.fillStyle = '#eff9fb';
	q.font = '900 54px Arial';
	q.fillText('LINAC TREATMENT HEAD', 55, 92);
	q.fillStyle = '#9fc4ce';
	q.font = '700 28px Arial';
	q.fillText('Interactive photon / electron beam-path teaching station', 55, 134);
	const x = 580;
	const items: [string, number][] = [
		['BENDING MAGNET', 190],
		['TARGET / BYPASS', 270],
		['PRIMARY COLLIMATOR', 345],
		['FILTER / FOIL CAROUSEL', 420],
		['MONITOR CHAMBER', 495],
		['JAWS + MLC', 570]
	];
	q.strokeStyle = '#2f7de1';
	q.lineWidth = 14;
	q.beginPath();
	q.moveTo(330, 190);
	q.bezierCurveTo(430, 190, 500, 165, x, 190);
	q.lineTo(x, 610);
	q.stroke();
	items.forEach(([s, y], i) => {
		q.fillStyle = i === 3 ? '#8158cf' : '#dce9ed';
		q.fillRect(x - 95, y - 18, 190, 36);
		q.fillStyle = '#f5fbfc';
		q.font = '800 25px Arial';
		q.fillText(s, x + 125, y + 8);
	});
	q.fillStyle = '#42d5cf';
	q.font = '900 32px Arial';
	q.fillText('WALK MODE: PRESS E TO EXPLORE', 55, 640);
	q.fillStyle = '#8aa7b1';
	q.font = '700 23px Arial';
	q.fillText('Photon Mode · Electron Mode · Animated beam path · Component details', 55, 678);
	const tx = new THREE.CanvasTexture(c);
	tx.colorSpace = THREE.SRGBColorSpace;
	return tx;
}
export function openLinacHeadLab() {
	if (document.pointerLockElement) document.exitPointerLock();
	document.getElementById('linacHeadDialog')?.classList.add('show');
	lhReset(false);
	lhPager.open();
	setTimeout(() => lhDraw(), 30);
}
export function closeLinacHeadLab() {
	document.getElementById('linacHeadDialog')?.classList.remove('show');
	LINAC_HEAD_LAB.animating = false;
}
export function lhSetMode(mode) {
	LINAC_HEAD_LAB.mode = mode;
	LINAC_HEAD_LAB.energy = mode === 'photon' ? '6 MV' : '9 MeV';
	LINAC_HEAD_LAB.animating = false;
	LINAC_HEAD_LAB.progress = 0;
	LINAC_HEAD_LAB.selected = null;
	document.getElementById('lhPhoton').classList.toggle('active', mode === 'photon');
	document.getElementById('lhElectron').classList.toggle('active', mode === 'electron');
	document.getElementById('lhPhotonEnergies').hidden = mode !== 'photon';
	document.getElementById('lhElectronEnergies').hidden = mode !== 'electron';
	document
		.querySelectorAll<HTMLElement>('[data-lhenergy]')
		.forEach((b) => b.classList.toggle('active', b.dataset.lhenergy === LINAC_HEAD_LAB.energy));
	lhUpdateText();
	lhDraw();
}
export function lhSetEnergy(e) {
	LINAC_HEAD_LAB.energy = e;
	LINAC_HEAD_LAB.animating = false;
	LINAC_HEAD_LAB.progress = 0;
	document
		.querySelectorAll<HTMLElement>('[data-lhenergy]')
		.forEach((b) => b.classList.toggle('active', b.dataset.lhenergy === e));
	lhUpdateText();
	lhDraw();
}
export function lhReset(draw = true) {
	LINAC_HEAD_LAB.animating = false;
	LINAC_HEAD_LAB.progress = 0;
	LINAC_HEAD_LAB.selected = null;
	lhUpdateText();
	if (draw) lhDraw();
}
export function lhUpdateText() {
	const m = LINAC_HEAD_LAB.mode,
		e = LINAC_HEAD_LAB.energy;
	document.getElementById('lhModeTitle').textContent =
		`${m === 'photon' ? 'Photon' : 'Electron'} Mode · ${e}`;
	document.getElementById('lhNarrative').textContent =
		m === 'photon'
			? `Accelerated electrons are bent toward the treatment head and strike the x-ray target. The resulting photon beam is collimated, modified, monitored, and shaped before exiting toward the patient.`
			: `Accelerated electrons are bent toward the treatment head, bypass the x-ray target in this teaching model, pass through the selected scattering foil, and are monitored. The jaws move to the electron-mode setting, the MLC leaves remain fully retracted and inactive, and the beam continues to the electron applicator/cone and insert for clinical field definition.`;
	document.getElementById('lhCompareText').textContent =
		m === 'photon'
			? 'Photon mode converts accelerated electrons into bremsstrahlung x-rays at the target. A conventional flattened beam uses a flattening filter before the monitor chamber; jaws and the MLC shape the clinical field.'
			: 'Conventional electron mode keeps electrons as the treatment radiation. The target is bypassed/retracted and a scattering foil broadens the beam. In this simulator, the MLC is fully retracted and inactive in electron mode; the applicator/cone and insert define the clinical electron field.';
	if (!LINAC_HEAD_LAB.selected) {
		document.getElementById('lhComponentTitle').textContent = 'Select a component';
		document.getElementById('lhComponentText').textContent =
			'Click any labeled component in the treatment-head schematic to review its role in the beam path.';
	}
}
function lhRound(ctx, x, y, w, h, r = 8) {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, r);
	ctx.fill();
	ctx.stroke();
}
type LhText = {
	t: string;
	font: string;
	color: string;
	x: number;
	y: number;
	align: CanvasTextAlign;
};
// Clear space (px) between a box's text and its border, left and right.
const LH_PAD = 24;
function lhWrap(ctx, text: string, maxW: number) {
	const lines: string[] = [];
	let cur = '';
	for (const word of text.split(' ')) {
		const t = cur ? `${cur} ${word}` : word;
		if (cur && ctx.measureText(t).width > maxW) {
			lines.push(cur);
			cur = word;
		} else cur = t;
	}
	if (cur) lines.push(cur);
	return lines;
}
// Draws a box sized to its label (never narrower than minW); the text is queued so it
// can be painted after the beam highlight. Returns the box width.
function lhBox(
	ctx,
	texts: LhText[],
	id,
	label,
	cx,
	cy,
	minW,
	h,
	fill = '#e6edf1',
	stroke = '#7b929e',
	color = '#213944'
) {
	const font = '800 18px Arial';
	ctx.font = font;
	const w = Math.max(minW, Math.ceil(ctx.measureText(label).width) + 2 * LH_PAD);
	const x = cx - w / 2,
		y = cy - h / 2;
	ctx.fillStyle = fill;
	ctx.strokeStyle = stroke;
	ctx.lineWidth = 2;
	lhRound(ctx, x, y, w, h, 8);
	texts.push({ t: label, font, color, x: cx, y: cy, align: 'center' });
	LINAC_HEAD_LAB.hit.push({ id, x, y, w, h });
	return w;
}
export function lhDraw() {
	const c = document.getElementById('linacHeadCanvas') as HTMLCanvasElement | null;
	if (!c) return;
	const q = c.getContext('2d'),
		m = LINAC_HEAD_LAB.mode,
		p = LINAC_HEAD_LAB.progress;
	q.clearRect(0, 0, c.width, c.height);
	q.fillStyle = '#ffffff';
	q.fillRect(0, 0, c.width, c.height);
	LINAC_HEAD_LAB.hit = [];
	const texts: LhText[] = [];
	q.fillStyle = '#173844';
	q.font = '900 28px Arial';
	q.textAlign = 'left';
	q.fillText(`${m === 'photon' ? 'PHOTON' : 'ELECTRON'} MODE · ${LINAC_HEAD_LAB.energy}`, 30, 40);
	q.fillStyle = '#607b86';
	q.font = '700 16px Arial';
	q.fillText('Generic educational treatment-head schematic · click components for details', 30, 67);
	// accelerator / bending section
	const wgY = 150,
		magX = 240,
		magY = 88,
		magH = 156,
		exitY = 192;
	q.font = '900 19px Arial';
	const magW = Math.max(220, Math.ceil(q.measureText('BENDING MAGNET').width) + 2 * LH_PAD);
	const magCx = magX + magW / 2;
	q.strokeStyle = '#8ba0aa';
	q.lineWidth = 15;
	q.beginPath();
	q.moveTo(70, wgY);
	q.lineTo(magX + 10, wgY);
	q.stroke();
	q.fillStyle = '#dfe8ec';
	q.strokeStyle = '#728a96';
	q.lineWidth = 2;
	lhRound(q, magX, magY, magW, magH, 16);
	q.strokeStyle = '#2f7de1';
	q.lineWidth = 5;
	q.beginPath();
	q.moveTo(95, wgY);
	q.lineTo(magCx - 60, wgY);
	q.quadraticCurveTo(magCx, wgY, magCx, exitY);
	q.stroke();
	texts.push(
		{ t: 'Accelerating', font: '800 19px Arial', color: '#3f5a66', x: 70, y: 100, align: 'left' },
		{ t: 'waveguide', font: '800 19px Arial', color: '#3f5a66', x: 70, y: 122, align: 'left' },
		{
			t: 'BENDING MAGNET',
			font: '900 19px Arial',
			color: '#183943',
			x: magCx,
			y: magY + 26,
			align: 'center'
		},
		{
			t: 'turns/directs e⁻ beam',
			font: '700 15px Arial',
			color: '#45626f',
			x: magCx,
			y: magY + magH - 18,
			align: 'center'
		}
	);
	LINAC_HEAD_LAB.hit.push({ id: 'bending', x: magX, y: magY, w: magW, h: magH });
	const cx = 610;
	const ys = {
		target: 155,
		primary: 245,
		carousel: 322,
		chamber: 407,
		jaws: 485,
		mlc: 558,
		applicator: 620
	};
	const half: Record<string, number> = {};
	// electron incoming path to head
	q.strokeStyle = '#2f7de1';
	q.lineWidth = 5;
	q.beginPath();
	q.moveTo(magCx, exitY);
	q.lineTo(cx, exitY);
	q.lineTo(cx, ys.target + 26);
	q.stroke();
	// Target / bypass
	if (m === 'photon') {
		half.target =
			lhBox(q, texts, 'target', 'X-RAY TARGET', cx, ys.target, 200, 52, '#ffe0c5', '#db7a31') / 2;
	} else {
		q.save();
		q.setLineDash([8, 6]);
		q.strokeStyle = '#9aa9af';
		q.lineWidth = 2;
		q.strokeRect(cx - 105, ys.target - 30, 210, 60);
		q.restore();
		texts.push(
			{
				t: 'TARGET RETRACTED',
				font: '800 16px Arial',
				color: '#566f7a',
				x: cx,
				y: ys.target - 10,
				align: 'center'
			},
			{
				t: '/ BYPASS',
				font: '800 16px Arial',
				color: '#566f7a',
				x: cx,
				y: ys.target + 10,
				align: 'center'
			}
		);
		half.target = 105;
		LINAC_HEAD_LAB.hit.push({ id: 'target', x: cx - 105, y: ys.target - 30, w: 210, h: 60 });
	}
	half.primary =
		lhBox(
			q,
			texts,
			'primary',
			'PRIMARY COLLIMATOR',
			cx,
			ys.primary,
			230,
			50,
			'#dce6ea',
			'#607985'
		) / 2;
	half.carousel =
		lhBox(
			q,
			texts,
			'carousel',
			m === 'photon' ? 'FLATTENING FILTER' : 'SCATTERING FOIL',
			cx,
			ys.carousel,
			230,
			56,
			m === 'photon' ? '#eadbff' : '#fff2b7',
			m === 'photon' ? '#7d57ba' : '#c39a16'
		) / 2;
	half.chamber =
		lhBox(
			q,
			texts,
			'chamber',
			'MONITOR ION CHAMBER',
			cx,
			ys.chamber,
			240,
			50,
			'#d6ebff',
			'#4387be'
		) / 2;
	// jaws: dark blocks, so the label sits to their left on white
	q.fillStyle = '#434f56';
	q.strokeStyle = '#252d31';
	q.lineWidth = 2;
	q.fillRect(cx - 150, ys.jaws - 22, 112, 44);
	q.fillRect(cx + 38, ys.jaws - 22, 112, 44);
	q.strokeRect(cx - 150, ys.jaws - 22, 112, 44);
	q.strokeRect(cx + 38, ys.jaws - 22, 112, 44);
	half.jaws = 150;
	const sideLabel = (id: string, label: string, hw: number, y: number, color: string) => {
		const font = '900 18px Arial';
		q.font = font;
		const endX = cx - hw - 16,
			tw = Math.ceil(q.measureText(label).width);
		texts.push({ t: label, font, color, x: endX, y, align: 'right' });
		LINAC_HEAD_LAB.hit.push({ id, x: endX - tw - 8, y: y - 16, w: tw + 16, h: 32 });
	};
	LINAC_HEAD_LAB.hit.push({ id: 'jaws', x: cx - 150, y: ys.jaws - 26, w: 300, h: 52 });
	sideLabel('jaws', 'SECONDARY JAWS', 150, ys.jaws, '#263c46');
	// MLC leaves: active field shaping for photon mode; fully retracted/inactive for the conventional electron mode represented here.
	if (m === 'photon') {
		q.fillStyle = '#6b7680';
		q.strokeStyle = '#374047';
		for (let i = 0; i < 7; i++) {
			q.fillRect(cx - 162, ys.mlc - 29 + i * 8, 127 - i * 7, 6);
			q.fillRect(cx + 35 + i * 7, ys.mlc - 29 + i * 8, 127 - i * 7, 6);
		}
		half.mlc = 162;
		LINAC_HEAD_LAB.hit.push({ id: 'mlc', x: cx - 183, y: ys.mlc - 32, w: 366, h: 82 });
		sideLabel('mlc', 'MULTILEAF COLLIMATOR (MLC)', 162, ys.mlc, '#263c46');
	} else {
		q.fillStyle = '#9ba7ad';
		q.strokeStyle = '#65757d';
		for (let i = 0; i < 7; i++) {
			q.fillRect(cx - 178, ys.mlc - 29 + i * 8, 50, 6);
			q.fillRect(cx + 128, ys.mlc - 29 + i * 8, 50, 6);
		}
		q.save();
		q.setLineDash([8, 6]);
		q.strokeStyle = '#7f929b';
		q.lineWidth = 2;
		q.strokeRect(cx - 116, ys.mlc - 32, 232, 58);
		q.restore();
		half.mlc = 178;
		LINAC_HEAD_LAB.hit.push({ id: 'mlc', x: cx - 183, y: ys.mlc - 32, w: 366, h: 82 });
		sideLabel('mlc', 'MLC RETRACTED · INACTIVE', 178, ys.mlc, '#3f5560');
	}
	if (m === 'electron') {
		half.applicator =
			lhBox(
				q,
				texts,
				'applicator',
				'ELECTRON APPLICATOR / INSERT',
				cx,
				ys.applicator,
				232,
				42,
				'#dff3ec',
				'#47947f',
				'#1f6b59'
			) / 2;
	}
	// labels right side, level with their parts
	const labels = [
		['target', m === 'photon' ? 'Target: e⁻ → x-rays' : 'Target bypass'],
		['primary', 'Fixed primary collimation'],
		['carousel', m === 'photon' ? 'Photon modifier' : 'Electron scattering system'],
		['chamber', 'Output monitoring'],
		['jaws', 'Rectangular collimation'],
		['mlc', m === 'photon' ? 'Field shaping / modulation' : 'MLC retracted / inactive']
	];
	if (m === 'electron') labels.push(['applicator', 'Electron field definition']);
	const lblX = 812,
		lblFont = '700 16px Arial';
	q.font = lblFont;
	labels.forEach(([id, lab]) => {
		const y = ys[id];
		const lines = lhWrap(q, lab, 980 - lblX - 10);
		lines.forEach((ln, i) =>
			texts.push({
				t: ln,
				font: lblFont,
				color: '#35505c',
				x: lblX,
				y: y + (i - (lines.length - 1) / 2) * 20,
				align: 'left'
			})
		);
		q.strokeStyle = '#b4c3c9';
		q.lineWidth = 1.5;
		q.beginPath();
		q.moveTo(cx + half[id] + 8, y);
		q.lineTo(lblX - 8, y);
		q.stroke();
	});
	// beam path and progress highlight
	const points: [number, number][] =
		m === 'photon'
			? [
					[magCx, exitY],
					[cx, exitY],
					[cx, ys.target],
					[cx, ys.primary],
					[cx, ys.carousel],
					[cx, ys.chamber],
					[cx, ys.jaws],
					[cx, ys.mlc],
					[cx, 646]
				]
			: [
					[magCx, exitY],
					[cx, exitY],
					[cx, ys.target],
					[cx, ys.primary],
					[cx, ys.carousel],
					[cx, ys.chamber],
					[cx, ys.jaws],
					[cx, ys.mlc],
					[cx, ys.applicator],
					[cx, 646]
				];
	q.strokeStyle = m === 'photon' ? 'rgba(242,190,39,.34)' : 'rgba(54,168,141,.34)';
	q.lineWidth = 18;
	q.beginPath();
	points.forEach((pt, i) => (i ? q.lineTo(...pt) : q.moveTo(...pt)));
	q.stroke();
	if (p > 0) {
		const total = points.length - 1,
			scaled = Math.min(total, p * total),
			seg = Math.min(total - 1, Math.floor(scaled)),
			f = scaled - seg;
		q.strokeStyle = m === 'photon' ? '#f2be27' : '#36a88d';
		q.lineWidth = 7;
		q.beginPath();
		q.moveTo(...points[0]);
		for (let i = 1; i <= seg; i++) q.lineTo(...points[i]);
		if (seg < total) {
			const a = points[seg],
				b = points[seg + 1];
			q.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f);
		}
		q.stroke();
	}
	// all labels last, so the beam highlight never dims them
	q.textBaseline = 'middle';
	texts.forEach((tx) => {
		q.font = tx.font;
		q.fillStyle = tx.color;
		q.textAlign = tx.align;
		q.fillText(tx.t, tx.x, tx.y);
	});
	q.textBaseline = 'alphabetic';
	q.textAlign = 'left';
	// selected component outline
	const hit = LINAC_HEAD_LAB.hit.find((h) => h.id === LINAC_HEAD_LAB.selected);
	if (hit) {
		q.strokeStyle = '#8b5cf6';
		q.lineWidth = 5;
		q.strokeRect(hit.x - 5, hit.y - 5, hit.w + 10, hit.h + 10);
	}
}
export function lhAnimate() {
	LINAC_HEAD_LAB.animating = true;
	LINAC_HEAD_LAB.progress = 0;
	LINAC_HEAD_LAB.start = performance.now();
	const run = (now) => {
		if (!LINAC_HEAD_LAB.animating) return;
		LINAC_HEAD_LAB.progress = Math.min(1, (now - LINAC_HEAD_LAB.start) / 6500);
		lhDraw();
		if (LINAC_HEAD_LAB.progress < 1) requestAnimationFrame(run);
		else LINAC_HEAD_LAB.animating = false;
	};
	requestAnimationFrame(run);
}
const LH_SIDE_MIN = 300; // the side notes' narrowest column beside the schematic
/** Fits the head lab to the frame (pager.ts runs it before laying out the side notes): the schematic
    scales to the room under the controls, keeping its shape (never stretched), and the side notes
    take the rest. Narrow frames (index.html, max-width 900px) stack the notes under the schematic. */
function lhFit() {
	const canvas = document.getElementById('linacHeadCanvas') as HTMLCanvasElement,
		wrap = canvas.parentElement,
		grid = wrap.parentElement,
		card = grid.parentElement,
		px = (v: string) => parseFloat(v) || 0,
		c = getComputedStyle(card),
		w = getComputedStyle(wrap),
		ratio = canvas.width / canvas.height;
	// the grid's room: the card at its tallest, less what sits above the grid and the card's bottom
	const room =
		px(c.maxHeight) -
		(grid.getBoundingClientRect().top - card.getBoundingClientRect().top) -
		px(c.paddingBottom) -
		px(c.borderBottomWidth);
	const frameW =
			px(w.paddingLeft) + px(w.paddingRight) + px(w.borderLeftWidth) + px(w.borderRightWidth),
		frameH =
			px(w.paddingTop) + px(w.paddingBottom) + px(w.borderTopWidth) + px(w.borderBottomWidth),
		gap = px(getComputedStyle(grid).columnGap);
	let cw: number;
	if (matchMedia('(max-width: 900px)').matches) {
		// stacked: the schematic takes the width, or 60% of the height, whichever is less
		cw = Math.min(grid.clientWidth - frameW, (room * 0.6 - frameH) * ratio);
		grid.style.gridTemplateColumns = '';
		grid.style.gridTemplateRows = `${cw / ratio + frameH}px minmax(0, 1fr)`;
		grid.style.height = `${room}px`;
	} else {
		cw = Math.min(grid.clientWidth - gap - LH_SIDE_MIN - frameW, (room - frameH) * ratio);
		grid.style.gridTemplateColumns = `${cw + frameW}px minmax(0, 1fr)`;
		grid.style.gridTemplateRows = '';
		grid.style.height = `${cw / ratio + frameH}px`;
	}
	canvas.style.width = `${cw}px`;
	canvas.style.height = `${cw / ratio}px`;
}
// the canvas is drawn at 980 × 650 and shown scaled: a click is mapped back through its on-screen box
export function lhCanvasClick(e) {
	const c = e.currentTarget,
		r = c.getBoundingClientRect(),
		sx = c.width / r.width,
		sy = c.height / r.height,
		x = (e.clientX - r.left) * sx,
		y = (e.clientY - r.top) * sy;
	const h = [...LINAC_HEAD_LAB.hit]
		.reverse()
		.find((a) => x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h);
	if (!h) return;
	LINAC_HEAD_LAB.selected = h.id;
	const d = LH_COMPONENTS[h.id];
	if (d) {
		document.getElementById('lhComponentTitle').textContent = d.title;
		document.getElementById('lhComponentText').textContent =
			LINAC_HEAD_LAB.mode === 'photon' ? d.photon : d.electron;
	}
	lhDraw();
}

// Clinical interaction and equipment
export function showEquipmentPanel(id) {
	if (id === 'engineering_head_station') {
		openLinacHeadLab();
		return;
	}
	const item = EQUIPMENT_BY_ID[id];
	if (!item) return;
	if (document.pointerLockElement) document.exitPointerLock();
	EQUIPMENT_EXPLORED.add(id);
	document.getElementById('eqTitle').textContent = item.label;
	document.getElementById('eqRoom').textContent = equipmentRoomName(item);
	document.getElementById('eqPurpose').textContent = item.purpose;
	document.getElementById('eqUsers').textContent = item.users;
	document.getElementById('eqNotice').textContent = item.notice;
	document.getElementById('eqSafety').textContent = item.safety;
	document.getElementById('eqProgress').textContent =
		`Equipment explored: ${EQUIPMENT_EXPLORED.size} of ${EQUIPMENT_SPECS.length}`;
	document.getElementById('equipmentPanel').classList.add('show');
	eqPager.open();
}
export function closeEquipmentPanel() {
	document.getElementById('equipmentPanel').classList.remove('show');
}
export function openKioskDialog() {
	if (document.pointerLockElement) document.exitPointerLock();
	document.getElementById('kioskDialog').classList.add('show');
}
export function closeKioskDialog() {
	document.getElementById('kioskDialog').classList.remove('show');
}

export function roomInspectPose(r) {
	const f = focusTargetsForRoom(r);
	if (r.hub) {
		const target = f?.target || new THREE.Vector3(0, 1.24, 0);
		return { pos: new THREE.Vector3(-8.0, 1.82, 7.4), target, fov: 64 };
	}
	const target = f?.target || new THREE.Vector3(r.x, 1.2, r.z);
	if (r.id === 'vault1') return { pos: new THREE.Vector3(81.4, 1.96, -13.9), target, fov: 58 };
	if (r.id === 'vault2') return { pos: new THREE.Vector3(81.4, 1.96, 13.9), target, fov: 58 };
	const dc = doorCenter(r, 1.78),
		n = doorNormal(r),
		tangent = Math.abs(n.x) > 0.5 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
	let inside = dc
		.clone()
		.add(n.clone().multiplyScalar(-0.9))
		.add(tangent.multiplyScalar(-Math.min(2.8, (Math.abs(n.x) > 0.5 ? r.d : r.w) * 0.22)));
	if (r.id === 'ctsim') inside = new THREE.Vector3(r.x + 6.1, 1.92, r.z + 5.0);
	if (r.id === 'ctcontrol') inside = new THREE.Vector3(r.x + 3.2, 1.82, r.z + 2.9);
	if (r.id === 'dosimetry') inside = new THREE.Vector3(r.x + 4.9, 1.82, r.z + 4.5);
	if (r.id === 'linaccontrol') inside = new THREE.Vector3(r.x + 4.9, 1.82, r.z + 3.3);
	if (r.id === 'hdr') inside = new THREE.Vector3(r.x + 4.3, 1.86, r.z + 4.0);
	return { pos: inside, target, fov: Math.max(r.w, r.d) >= 14 ? 64 : 60 };
}
export function enableRoomInspection(r) {
	const pose = roomInspectPose(r);
	camera.fov = pose.fov;
	camera.updateProjectionMatrix();
	camera.position.copy(pose.pos);
	orbit.target.copy(pose.target);
	const dist = camera.position.distanceTo(pose.target);
	orbit.minDistance = Math.max(2.2, dist * 0.62);
	orbit.maxDistance = Math.max(3.0, dist * 1.06);
	orbit.minPolarAngle = 0.46;
	orbit.maxPolarAngle = Math.PI * 0.49;
	orbit.enableZoom = true;
	orbit.enableRotate = true;
	orbit.enablePan = false;
	orbit.enabled = true;
	orbit.update();
}

export function disableRoomInspection() {
	if (S.mode !== 'overview') orbit.enabled = false;
}

const PROC_CHOICES = [
	['mask', 'Thermoplastic mask'],
	['headrest', 'Custom headrest'],
	['breastboard', 'Breast board'],
	['arms', 'Arm positioners / arms up'],
	['wingboard', 'Wingboard'],
	['motion', '4D / respiratory-motion assessment'],
	['vacbag', 'Vacuum immobilization'],
	['contrast', 'Oral / IV contrast when ordered'],
	['legs', 'Leg positioner'],
	['belly', 'Belly board']
];
export function openProcedureLab(tab = 'startup') {
	document.getElementById('procedureLab')?.classList.add('show');
	procSetTab(tab);
	procRefreshRelease();
	procPager.open();
}
export function closeProcedureLab() {
	document.getElementById('procedureLab')?.classList.remove('show');
}
export function procSetTab(id) {
	document
		.querySelectorAll<HTMLElement>('#procTabs button')
		.forEach((b) => b.classList.toggle('active', b.dataset.proc === id));
	document
		.querySelectorAll<HTMLElement>('.procPane')
		.forEach((p) => p.classList.toggle('active', p.dataset.pane === id));
	if (id === 'sitesim') procRenderSite();
	if (id === 'release') procRefreshRelease();
	procPager.go(0);
}
function procMarkDone(id, done = true) {
	document.querySelector(`#procTabs button[data-proc="${id}"]`)?.classList.toggle('done', !!done);
}
export function procSetResult(id, msg, ok = null) {
	const el = document.getElementById(id);
	if (!el) return;
	el.className = 'procResult' + (ok === true ? ' pass' : ok === false ? ' fail' : '');
	el.innerHTML = msg;
}
export function procRefreshRelease() {
	const map = {
		relStartup: PROC_STATE.startup,
		relLaser: PROC_STATE.laser === true,
		relWater: PROC_STATE.water === true,
		relSite: PROC_STATE.site
	};
	Object.entries(map).forEach(([id, val]) => {
		const e = document.getElementById(id);
		if (e)
			e.textContent = val
				? 'PASS'
				: (id === 'relLaser' && PROC_STATE.laser === false) ||
					  (id === 'relWater' && PROC_STATE.water === false)
					? 'FAIL'
					: 'PENDING';
	});
	const all = PROC_STATE.startup && PROC_STATE.laser === true && PROC_STATE.water === true;
	const final = document.getElementById('relFinal');
	if (final) final.textContent = PROC_STATE.released && all ? 'RELEASED' : 'HOLD';
	['startup', 'laser', 'water', 'sitesim'].forEach((k) =>
		procMarkDone(
			k,
			k === 'startup'
				? PROC_STATE.startup
				: k === 'laser'
					? PROC_STATE.laser !== null
					: k === 'water'
						? PROC_STATE.water !== null
						: PROC_STATE.site
		)
	);
}
export function procRenderSite() {
	const key = (document.getElementById('siteCase') as HTMLSelectElement | null)?.value || 'hn',
		s = PROC_SITES[key];
	const p = document.getElementById('sitePrompt');
	if (p) p.innerHTML = s.prompt;
	const host = document.getElementById('siteChoices');
	if (host)
		host.innerHTML = PROC_CHOICES.map(
			([id, label]) =>
				`<label><input type="checkbox" value="${id}" name="siteChoice"> ${label}</label>`
		).join('');
}
export function procResetAll() {
	(window as unknown as { __rtappsVerdictLocked?: boolean }).__rtappsVerdictLocked = false; // #73: fresh scenario re-arms the verdict buttons
	const rcBtn = document.getElementById('releaseClinical') as HTMLButtonElement | null;
	if (rcBtn) rcBtn.disabled = false;
	const hcBtn = document.getElementById('holdClinical') as HTMLButtonElement | null;
	if (hcBtn) hcBtn.disabled = false;
	Object.assign(PROC_STATE, {
		startup: false,
		laser: null,
		water: null,
		site: false,
		released: false,
		laserValues: null,
		waterValues: null
	});
	document.querySelectorAll<HTMLInputElement>('[data-startup]').forEach((x) => (x.checked = false));
	['procStartupResult', 'laserResult', 'waterResult', 'siteResult', 'releaseResult'].forEach((id) =>
		procSetResult(id, 'Reset. Complete the procedure station.', null)
	);
	['laserLat', 'laserVrt', 'laserLng', 'waterHU', 'waterUniform', 'waterNoise'].forEach((id) => {
		const e = document.getElementById(id);
		if (e) e.textContent = '--';
	});
	const s = document.getElementById('startupScanner');
	if (s) s.textContent = 'HOLD';
	const q = document.getElementById('startupQC');
	if (q) q.textContent = 'PENDING';
	const p = document.getElementById('startupPatients');
	if (p) p.textContent = 'LOCKED';
	procRefreshRelease();
	procRenderSite();
}

/** One exchange of the conversation (the intro, or a question and its answer), a page of its own:
    shown at once, with the earlier ones a page back each. */
function staffExchange(...lines: [kind: string, who: string, msg: string][]) {
	const host = document.getElementById('staffTranscript'),
		ex = document.createElement('div');
	ex.className = 'sdExchange';
	for (const [kind, who, msg] of lines) {
		bubble(kind, who, msg); // npc.ts adds the bubble to the transcript: move it into the exchange
		ex.appendChild(host.lastElementChild);
	}
	host.appendChild(ex);
	staffPager.go(Infinity);
}
export function resetStaffDialogue(key) {
	const g = STAFF_GUIDES[key];
	if (!g) return;
	S.activeGuideKey = key;
	document.getElementById('staffTranscript').innerHTML = '';
	staffExchange(['staff', g.name, g.intro]);
	const q = document.getElementById('sdQuestions');
	q.innerHTML = '';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- legacy pattern, index 'i' unused here
	g.questions.forEach(([question, answer], i) => {
		const b = document.createElement('button');
		b.textContent = question;
		b.onclick = () => {
			staffExchange(['patient', 'Patient', question], ['staff', g.name, answer]);
			b.disabled = true;
		};
		q.appendChild(b);
	});
	const hh = document.getElementById('sdHandoffs'),
		next = document.getElementById('sdNext');
	hh.innerHTML = '';
	const handoffs = HANDOFFS[key] || [];
	next.style.display = handoffs.length ? 'block' : 'none';
	handoffs.forEach((h) => {
		const b = document.createElement('button');
		b.textContent = h.label;
		b.onclick = () => {
			const lines: [string, string, string][] = [['staff', g.name, h.staff]];
			if (h.patient) lines.unshift(['patient', 'Patient', h.patient]);
			staffExchange(...lines);
			[...hh.querySelectorAll('button')].forEach((x) => (x.disabled = true));
			setTimeout(() => {
				closeStaffDialogue(false);
				// back to looking around: the button's click still counts as the gesture 1.15 s later
				requestWalkPointerLock();
				// the staff member walks to the target room; the camera stays with the player
				startActorHandoff(key, h);
			}, 1150);
		};
		hh.appendChild(b);
	});
}
function openStaffDialogue(key) {
	const g = STAFF_GUIDES[key];
	if (!g) return;
	if (document.pointerLockElement) document.exitPointerLock();
	focusConversationCamera(key);
	document.getElementById('sdAvatar').textContent =
		g.initials ||
		g.name
			.split(/\s+/)
			.map((x) => x[0])
			.slice(0, 2)
			.join('');
	document.getElementById('sdName').textContent = g.name;
	document.getElementById('sdRole').textContent = g.role;
	resetStaffDialogue(key);
	document.getElementById('staffDialog').classList.add('show');
	staffPager.open();
}
export function closeStaffDialogue(restore = true) {
	document.getElementById('staffDialog').classList.remove('show');
	S.activeGuideKey = null;
	if (restore && S.activeRoom && !S.travel) {
		if (S.mode === 'walk') applyWalkConversationComposition(S.activeRoom, false, false);
		else enableRoomInspection(S.activeRoom);
	}
}

/* Pop-up pages (pager.ts): the staff dialogue a page an exchange; the equipment panel, the head
   lab's side notes and the CT QA lab's active tab a page of blocks at a time when they do not fit. */
const shown = (id: string) => () =>
	document.getElementById(id)?.classList.contains('show') ?? false;
const staffPager = createPager({
	isOpen: shown('staffDialog'),
	body: document.getElementById('staffTranscript'),
	bar: document.getElementById('sdPager'),
	each: true
});
const eqPager = createPager({
	isOpen: shown('equipmentPanel'),
	body: document.getElementById('eqBody'),
	bar: document.getElementById('eqPager'),
	card: document.getElementById('equipmentPanel')
});
const lhPager = createPager({
	isOpen: shown('linacHeadDialog'),
	body: document.getElementById('lhNotes'),
	bar: document.getElementById('lhPager'),
	prepare: lhFit
});
const procBody = document.getElementById('procBody');
const procPager = createPager({
	isOpen: shown('procedureLab'),
	body: procBody,
	blocks: () => [...(procBody.querySelector('.procPane.active')?.children ?? [])] as HTMLElement[],
	bar: document.getElementById('procPager'),
	card: procBody.parentElement
});

export function toast(html) {
	const t = document.getElementById('toast');
	t.innerHTML = html;
	t.classList.add('show');
	clearTimeout((toast as typeof toast & { _t?: ReturnType<typeof setTimeout> })._t);
	(toast as typeof toast & { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(
		() => t.classList.remove('show'),
		2300
	);
}
