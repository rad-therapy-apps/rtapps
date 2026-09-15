import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { S } from './state.js';
import {
	box,
	cyl,
	sphere,
	eRbox,
	std,
	wall,
	makeCanvasPanel,
	makeSignTexture,
	makeWallSign,
	makeDirectionalSign,
	makeDoorHeaderSign,
	makeDoorHeaderTexture,
	makeDoorNameLabel,
	makeLobbyEntranceSign,
	chestBadgeTexture,
	escHtml,
	zeroY,
	samePoint,
	cleanPoints,
	commonPrefixLen,
	later,
	architecturalWallMaterial
} from './helpers.js';
import {
	renderer,
	scene,
	camera,
	labelRenderer,
	orbit,
	canvas,
	AMBIENCE,
	initAmbience,
	updateAmbience,
	ambienceProfile,
	updatePerfFloor
} from './scene.js';
import { vehicleObject, monumentSign, privacyChangingNook } from './props.js';
import {
	ROOMS,
	buildRoom,
	buildHubLobby,
	buildCorridorInfillWalls,
	buildVaultMazeEntries,
	corridorFloor,
	corridorLightsHorizontal,
	corridorLightsVertical,
	clinicalCeilingAccents,
	addCirculationProps,
	doorLabel,
	addClinicalWallPolish,
	buildExteriorAmbient,
	corridorAnchor
} from './rooms.js';
import {
	setPatientGown,
	setNpcRole,
	poseCharacter,
	npcBubble,
	bubbleVis,
	updateNpcLabels,
	faceNpcToward,
	departmentStaff,
	bubble
} from './npc.js';
import {
	movers,
	interactionScenes,
	updateMovers,
	addMovingActors,
	updateDutyAnimations,
	updateNpcExchanges,
	setActorSeated,
	startActorHandoff,
	updateHandoffTransitions
} from './npc-behavior.js';
import {
	buildClinicalEquipmentLayer,
	updateClinicalEquipment,
	setClinicalFocus,
	clearClinicalFocus,
	equipmentRoomName,
	updateStatusBeacons,
	updateAmbulance,
	renderOperatorLiveFeeds,
	buildOperatorLiveConsole,
	buildCtLiveConsole,
	updateCtCouchMotion,
	resetCtCouchMotion,
	startCtCouchScan,
	updateWallClocks,
	addJourneyWallClocks,
	buildPhase4WorkflowDisplays,
	updateWorkflowTransitions,
	buildPhase5Wayfinding,
	workflowState,
	flashCtScanner,
	pulseCtObject,
	EQUIPMENT_BY_ID,
	EQUIPMENT_BY_ROOM,
	EQUIPMENT_EXPLORED,
	EQUIPMENT_SPECS,
	CLINICAL_FOCUS
} from './equipment.js';

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

export const C = {
	front: 0x6fb6ff,
	technical: 0xffb454,
	clinical: 0x3fd6cf,
	leadership: 0xb59bff,
	vault: 0xff737b,
	special: 0x72df9f
};
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
		name: 'Morgan Reed, RTT',
		role: 'Radiation Therapist · Treatment Vault 1',
		initials: 'MR',
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
const ROOM_GUIDES = {
	lobby: 'lobby',
	consult: 'consult',
	social: 'social',
	education: 'education',
	patientcare: 'patientcare',
	safety: 'safety',
	physics: 'physics',
	radbio: 'radbio',
	engineering: 'engineering',
	qa: 'qa',
	dosimetry: 'dosimetry',
	commons: 'commons',
	manager: 'manager',
	ctcontrol: 'ctcontrol',
	ctsim: 'ctsim',
	linaccontrol: 'linaccontrol',
	vault1: 'vault1',
	vault2: 'vault2',
	hdr: 'hdr'
};
export const ROOM_CAST = {},
	PRIMARY_NPCS = {},
	PRIMARY_PATIENTS = {};
const HANDOFFS = {
	lobby: [
		{
			label: 'New patient visit → Consultation',
			patient: 'This is my first radiation oncology visit.',
			staff:
				'You are checked in. Dr. Ramirez and the consultation team are ready for you. I’ll let them know you are on the way.',
			target: 'consult',
			actor: 'patient',
			actorIndex: 0,
			follow: true
		},
		{
			label: 'Returning treatment visit → Have a seat',
			patient: 'I am here for today’s treatment.',
			staff:
				'You are checked in. Please have a seat in the waiting area. A radiation therapist will come for you when the treatment room is ready.',
			target: 'lobby',
			actor: 'patient',
			actorIndex: 1,
			final: [-2.8, 0, 3.4],
			follow: false
		}
	],
	consult: [
		{
			label: 'Continue to Patient Navigation',
			staff:
				'Before simulation, Sam can review the sequence of appointments, practical instructions and what happens next. Let’s connect you with Patient Navigation.',
			target: 'education',
			actor: 'patient',
			actorIndex: 0,
			follow: true
		},
		{
			label: 'Request support services first',
			staff:
				'Absolutely. Nia in Social Services can help with transportation, financial concerns, work issues and emotional support before we move forward.',
			target: 'social',
			actor: 'patient',
			actorIndex: 0,
			follow: true
		}
	],
	social: [
		{
			label: 'Continue with Patient Navigation',
			staff:
				'We have a support plan in place. Sam can now help you review the next steps in the treatment pathway.',
			target: 'education',
			actor: 'patient',
			actorIndex: 0,
			follow: true
		}
	],
	education: [
		{
			label: 'Proceed to CT Simulation',
			staff:
				'Your next clinical step is CT simulation. The simulation therapists will reproduce your treatment position, select immobilization and obtain the planning images.',
			target: 'ctsim',
			actor: 'patient',
			actorIndex: 0,
			follow: true
		}
	],
	patientcare: [
		{
			label: 'Return to the waiting area for treatment',
			staff:
				'Your assessment is complete. Please return to the waiting area. The treatment team will call you when the vault is ready.',
			target: 'lobby',
			actor: 'patient',
			actorIndex: 0,
			final: [-4.2, 0, 3.4],
			follow: true
		}
	],
	safety: [
		{
			label: 'Continue to Medical Physics',
			staff:
				'Radiation safety and medical physics work closely together. Let’s continue to Physics to see how measurement, calibration and technical verification support safe treatment.',
			target: 'physics',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		}
	],
	physics: [
		{
			label: 'Continue to Machine QA',
			staff:
				'The measurement is complete. The next stop is Machine QA, where the team verifies performance before clinical use.',
			target: 'qa',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		}
	],
	engineering: [
		{
			label: 'Send the machine back for QA verification',
			staff:
				'Service diagnostics are complete. Before the machine returns to patient use, QA verification is the next step.',
			target: 'qa',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		}
	],
	qa: [
		{
			label: 'Release to Treatment Operations',
			staff:
				'QA checks are complete and acceptable. Treatment Operations can now continue the clinical workflow.',
			target: 'linaccontrol',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		}
	],
	dosimetry: [
		{
			label: 'Continue to Physics plan review',
			staff:
				'The plan is ready for technical review. Dr. Shah will take the plan forward for physics verification before treatment.',
			target: 'physics',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		}
	],
	manager: [
		{
			label: 'Continue to Treatment Control',
			staff:
				'The staffing and schedule review is complete. Chris will return to the treatment control area to coordinate the day’s clinical operations.',
			target: 'linaccontrol',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		}
	],
	ctcontrol: [
		{
			label: 'Enter the CT room for final setup',
			staff:
				'The protocol is confirmed. Avery will join the simulation team in the scanner room for the final setup checks before acquisition.',
			target: 'ctsim',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		}
	],
	ctsim: [
		{
			label: 'Complete scan → therapist returns to CT Control',
			staff:
				'The simulation scan is complete. Jasmine will return to the control room while the image set is transferred for treatment planning.',
			target: 'ctcontrol',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		}
	],
	linaccontrol: [
		{
			label: 'Take the treatment team to Vault 1',
			staff:
				'The treatment record and imaging workflow are ready. Marcus will enter Vault 1 for the patient setup and verification sequence.',
			target: 'vault1',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		},
		{
			label: 'Take the treatment team to Vault 2',
			staff:
				'Vault 2 is ready. Marcus will enter the treatment room for setup and verification before delivery.',
			target: 'vault2',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		}
	],
	vault1: [
		{
			label: 'Treatment complete → therapist returns to control',
			staff:
				'Treatment is complete. We’ll assist the patient off the couch, then Elena will return to Treatment Control to document the session and prepare for the next patient.',
			target: 'linaccontrol',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		}
	],
	vault2: [
		{
			label: 'Treatment complete → therapist returns to control',
			staff:
				'Treatment is complete. We’ll assist the patient off the couch, then Devin will return to Treatment Control to document the session and prepare for the next patient.',
			target: 'linaccontrol',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		}
	],
	hdr: [
		{
			label: 'Procedure complete → Nursing follow-up',
			staff:
				'The procedure is complete and source safety checks are confirmed. I’ll transition with the patient to the nursing area for post-procedure assessment and recovery support.',
			target: 'patientcare',
			actor: 'staff',
			actorIndex: 0,
			follow: true
		}
	],
	commons: [
		{
			label: 'Return to the lobby / choose another department',
			staff:
				'That concludes this case discussion. You can return to the lobby and choose another department to explore.',
			target: 'lobby',
			actor: 'staff',
			actorIndex: 1,
			follow: true
		}
	]
};
export const roomById = (id) => ROOMS.find((r) => r.id === id);
const HUB = new THREE.Vector3(0, 1.68, 0);
const TREATMENT_JUNCTION_X = 64;

export const MAT = {};
MAT.floor = std(0x87939b, 0.82, 0.04);
MAT.floorDark = std(0x3b4650, 0.86, 0.04);
MAT.wall = std(0xd9e0e4, 0.92, 0.01);
MAT.wallVault = std(0xb7bec3, 0.95, 0.02);
MAT.trim = std(0x4b5962, 0.7, 0.1);
MAT.glass = std(0x79b9d1, 0.18, 0.05, { transparent: true, opacity: 0.27, side: THREE.DoubleSide });
MAT.screen = std(0x0b1f2d, 0.28, 0.02, { emissive: 0x0a4e71, emissiveIntensity: 0.75 });
MAT.metal = std(0xaeb9c0, 0.42, 0.55);
MAT.black = std(0x172028, 0.65, 0.15);
MAT.uphol = std(0x4f6b7d, 0.9, 0.0);
MAT.white = std(0xf1f4f5, 0.8, 0.02);
MAT.water = std(0x2e87b8, 0.15, 0.0, { transparent: true, opacity: 0.42 });
MAT.red = std(0xad3942, 0.68, 0.03);
MAT.green = std(0x3e9b6b, 0.68, 0.03);
MAT.wood = std(0x8b6a50, 0.78, 0.02);
export function add(g, o) {
	g.add(o);
	return o;
}

const interactables = [];
export function registerInteractable(
	object,
	label,
	detail = '',
	range = 2.5,
	guideKey = null,
	action = null
) {
	interactables.push({ object, label, detail, range, guideKey, action });
	return object;
}
function nearestInteractable(maxD = 2.8) {
	let best = null,
		bd = maxD;
	const wp = new THREE.Vector3();
	for (const it of interactables) {
		it.object.getWorldPosition(wp);
		const d = player.pos.distanceTo(wp),
			limit = Math.min(maxD, it.range || maxD);
		if (d < bd && d <= limit) {
			bd = d;
			best = { ...it, d, pos: wp.clone() };
		}
	}
	return best;
}
function nearestDoor(maxD = 2.6) {
	let best = null,
		bd = maxD;
	ROOMS.filter((r) => !r.hub).forEach((r) => {
		const p = doorPoint(r),
			d = player.pos.distanceTo(p);
		if (d < bd) {
			bd = d;
			best = { room: r, d };
		}
	});
	return best;
}
const ROOM_APP_DOORS = new Set(['LINAC Control Area', 'CT Control Room', 'CT Simulator Room']);
// RTApps (plan 4c): prefetch the room app's player URL once; if it can't resolve
// (activity unseeded/unpublished, or offline), ROOM_APP_URL stays null and the three
// wired doors keep their legacy in-hub behavior instead of going dead.
if (window.RTApps) {
	window.RTApps.activityUrl('sim-linac-fraction')
		.then(function (url) {
			S.ROOM_APP_URL = url;
		})
		.catch(function () {});
}
// RTApps (plan 4d): prefetch the console emulator's player URL once; if it can't resolve
// (activity unseeded/unpublished, or offline), CONSOLE_APP_URL stays null and the
// Learning Commons door keeps its legacy in-hub behavior instead of going dead. A
// parallel, independent pair alongside ROOM_APP_URL/ROOM_APP_DOORS (not merged into it) —
// that set's semantics are "leads to sim-linac-fraction" and this leads elsewhere.
window.CONSOLE_APP_URL = null; // also mirrored onto `window` (module scripts don't leak top-level vars there) so e2e can read the prefetch gate via frame.evaluate
if (window.RTApps && window.RTApps.activityUrl) {
	window.RTApps.activityUrl('sim-console')
		.then(function (url) {
			S.CONSOLE_APP_URL = url;
			window.CONSOLE_APP_URL = url;
		})
		.catch(function () {});
}
function performInteraction() {
	if (S.mode !== 'walk') return;
	const it = nearestInteractable();
	const dr = nearestDoor();
	if (it && (!dr || it.d <= dr.d + 0.25)) {
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
	if (dr) {
		if (S.ROOM_APP_URL && ROOM_APP_DOORS.has(dr.room.name)) {
			// RTApps (plan 4c): these three doors leave the hub for the LINAC/CT room app.
			window.top.location.href = S.ROOM_APP_URL;
			return;
		}
		if (S.CONSOLE_APP_URL && S.CONSOLE_APP_DOORS.has(dr.room.name)) {
			// RTApps (plan 4d): the Learning Commons door leaves the hub for the console emulator.
			window.top.location.href = S.CONSOLE_APP_URL;
			return;
		}
		const d = doors.get(dr.room.id);
		if (d) setDoorTarget(dr.room.id, d.target < 0.5);
		toast(`<b>${dr.room.name}</b> · ${d?.target > 0.5 ? 'opening' : 'closing'} door`);
	}
}
function updateInteractionUI() {
	const UI = updateInteractionUI,
		ret = document.getElementById('walkReticle'),
		p = document.getElementById('interactPrompt'),
		txt = document.getElementById('interactText'),
		apply = (retOn, pOn, label) => {
			if (UI._ret !== retOn) {
				ret.classList.toggle('show', retOn);
				UI._ret = retOn;
			}
			if (UI._p !== pOn) {
				p.classList.toggle('show', pOn);
				UI._p = pOn;
			}
			if (pOn && UI._txt !== label) {
				txt.textContent = label;
				UI._txt = label;
			}
		};
	if (S.mode !== 'walk' || S.travel) {
		apply(false, false);
		return;
	}
	const it = nearestInteractable(),
		dr = nearestDoor();
	if (it && (!dr || it.d <= dr.d + 0.25)) apply(true, true, `Interact · ${it.label}`);
	else if (dr) apply(true, true, `Door · ${dr.room.name}`);
	else apply(true, false);
}
const ground = box(200, 0.18, 150, std(0x151c22, 0.98, 0), 12, -0.12, -12);
ground.receiveShadow = true;
scene.add(ground);

export const roomFloors = [];
const colliders = [];
export const ceilings = [];
export const doors = new Map();
export function collider(x, z, w, d) {
	colliders.push({ x, z, hw: w / 2, hd: d / 2 });
}
export function doorNormal(room) {
	if (room.doorSide === 'zmin') return new THREE.Vector3(0, 0, -1);
	if (room.doorSide === 'zmax') return new THREE.Vector3(0, 0, 1);
	if (room.doorSide === 'xmin') return new THREE.Vector3(-1, 0, 0);
	return new THREE.Vector3(1, 0, 0);
}
export function doorCenter(room, y = 1.65) {
	const p = new THREE.Vector3(room.x, y, room.z),
		hx = room.w / 2,
		hz = room.d / 2;
	if (room.doorSide === 'zmin') p.z -= hz;
	if (room.doorSide === 'zmax') p.z += hz;
	if (room.doorSide === 'xmin') p.x -= hx;
	if (room.doorSide === 'xmax') p.x += hx;
	return p;
}
function updateDoorNameLabels() {}

buildExteriorAmbient();

const JOURNEY_ROOM_TIMING = { roomId: null, enteredAt: 0, lastPatient: null };
function activeJourneyPatientActor() {
	if (typeof JOURNEY === 'undefined' || !JOURNEY.active) return null;
	if (JOURNEY.kind === 'treatment')
		return JOURNEY.jordanOnCouch ? JOURNEY.couchPatient : JOURNEY.patient;
	if (JOURNEY.miaOnTreatmentCouch) return JOURNEY.miaTreatmentPatient;
	if (JOURNEY.miaOnTable) return JOURNEY.ctSimPatient;
	return JOURNEY.newPatient;
}
export function journeyActorRoom(actor) {
	if (!actor || actor.visible === false) return null;
	const p = new THREE.Vector3();
	actor.getWorldPosition(p);
	return (
		ROOMS.find(
			(r) =>
				p.x >= r.x - r.w / 2 - 0.25 &&
				p.x <= r.x + r.w / 2 + 0.25 &&
				p.z >= r.z - r.d / 2 - 0.25 &&
				p.z <= r.z + r.d / 2 + 0.25
		) || null
	);
}
function updateJourneyRoomTiming(now = performance.now()) {
	if (typeof JOURNEY === 'undefined' || !JOURNEY.active) {
		JOURNEY_ROOM_TIMING.roomId = null;
		JOURNEY_ROOM_TIMING.enteredAt = 0;
		JOURNEY_ROOM_TIMING.lastPatient = null;
		return;
	}
	const actor = activeJourneyPatientActor(),
		room = journeyActorRoom(actor),
		patient = currentJourneyMeta?.().patient || '';
	const id = room?.id || null;
	if (id !== JOURNEY_ROOM_TIMING.roomId || patient !== JOURNEY_ROOM_TIMING.lastPatient) {
		JOURNEY_ROOM_TIMING.roomId = id;
		JOURNEY_ROOM_TIMING.enteredAt = now;
		JOURNEY_ROOM_TIMING.lastPatient = patient;
	}
}
export function roomElapsedLabel(roomId, now = performance.now()) {
	if (!roomId || JOURNEY_ROOM_TIMING.roomId !== roomId || !JOURNEY_ROOM_TIMING.enteredAt) return '';
	const sec = Math.max(0, Math.floor((now - JOURNEY_ROOM_TIMING.enteredAt) / 1000)),
		m = Math.floor(sec / 60),
		s = sec % 60;
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} in room`;
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
	const items = [
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
	setTimeout(() => lhDraw(), 30);
}
function closeLinacHeadLab() {
	document.getElementById('linacHeadDialog')?.classList.remove('show');
	LINAC_HEAD_LAB.animating = false;
}
function lhSetMode(mode) {
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
		.querySelectorAll('[data-lhenergy]')
		.forEach((b) => b.classList.toggle('active', b.dataset.lhenergy === LINAC_HEAD_LAB.energy));
	lhUpdateText();
	lhDraw();
}
function lhSetEnergy(e) {
	LINAC_HEAD_LAB.energy = e;
	LINAC_HEAD_LAB.animating = false;
	LINAC_HEAD_LAB.progress = 0;
	document
		.querySelectorAll('[data-lhenergy]')
		.forEach((b) => b.classList.toggle('active', b.dataset.lhenergy === e));
	lhUpdateText();
	lhDraw();
}
function lhReset(draw = true) {
	LINAC_HEAD_LAB.animating = false;
	LINAC_HEAD_LAB.progress = 0;
	LINAC_HEAD_LAB.selected = null;
	lhUpdateText();
	if (draw) lhDraw();
}
function lhUpdateText() {
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
function lhBox(ctx, id, label, x, y, w, h, fill = '#e6edf1', stroke = '#7b929e') {
	ctx.fillStyle = fill;
	ctx.strokeStyle = stroke;
	ctx.lineWidth = 2;
	lhRound(ctx, x, y, w, h, 8);
	ctx.fillStyle = '#213944';
	ctx.font = '800 17px Arial';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(label, x + w / 2, y + h / 2);
	LINAC_HEAD_LAB.hit.push({ id, x, y, w, h });
}
function lhDraw() {
	const c = document.getElementById('linacHeadCanvas');
	if (!c) return;
	const q = c.getContext('2d'),
		m = LINAC_HEAD_LAB.mode,
		p = LINAC_HEAD_LAB.progress;
	q.clearRect(0, 0, c.width, c.height);
	q.fillStyle = '#ffffff';
	q.fillRect(0, 0, c.width, c.height);
	LINAC_HEAD_LAB.hit = [];
	q.fillStyle = '#173844';
	q.font = '900 28px Arial';
	q.textAlign = 'left';
	q.fillText(`${m === 'photon' ? 'PHOTON' : 'ELECTRON'} MODE · ${LINAC_HEAD_LAB.energy}`, 30, 40);
	q.fillStyle = '#607b86';
	q.font = '700 16px Arial';
	q.fillText('Generic educational treatment-head schematic · click components for details', 30, 67);
	// accelerator / bending section
	q.strokeStyle = '#8ba0aa';
	q.lineWidth = 15;
	q.beginPath();
	q.moveTo(70, 128);
	q.lineTo(260, 128);
	q.stroke();
	q.fillStyle = '#607782';
	q.font = '800 16px Arial';
	q.fillText('Accelerating waveguide', 72, 104);
	q.strokeStyle = '#2f7de1';
	q.lineWidth = 5;
	q.beginPath();
	q.moveTo(95, 128);
	q.lineTo(260, 128);
	q.quadraticCurveTo(338, 128, 338, 205);
	q.stroke();
	q.fillStyle = '#dfe8ec';
	q.strokeStyle = '#728a96';
	q.lineWidth = 2;
	lhRound(q, 255, 92, 166, 115, 16);
	q.fillStyle = '#183943';
	q.font = '900 18px Arial';
	q.textAlign = 'center';
	q.fillText('BENDING MAGNET', 338, 113);
	q.fillStyle = '#45626f';
	q.font = '700 15px Arial';
	q.fillText('turns/directs e⁻ beam', 338, 181);
	LINAC_HEAD_LAB.hit.push({ id: 'bending', x: 255, y: 92, w: 166, h: 115 });
	const cx = 500;
	const ys = {
		target: 155,
		primary: 235,
		carousel: 322,
		chamber: 407,
		jaws: 485,
		mlc: 558,
		applicator: 620
	};
	// electron incoming path to head
	q.strokeStyle = '#2f7de1';
	q.lineWidth = 5;
	q.beginPath();
	q.moveTo(338, 205);
	q.lineTo(cx, 205);
	q.lineTo(cx, ys.target - 26);
	q.stroke();
	// Target / bypass
	if (m === 'photon') {
		lhBox(q, 'target', 'X-RAY TARGET', cx - 85, ys.target - 24, 170, 48, '#ffe0c5', '#db7a31');
	} else {
		q.save();
		q.setLineDash([8, 6]);
		q.strokeStyle = '#9aa9af';
		q.strokeRect(cx - 85, ys.target - 24, 170, 48);
		q.restore();
		q.fillStyle = '#607782';
		q.font = '800 16px Arial';
		q.textAlign = 'center';
		q.fillText('TARGET RETRACTED / BYPASS', cx, ys.target);
		LINAC_HEAD_LAB.hit.push({ id: 'target', x: cx - 85, y: ys.target - 24, w: 170, h: 48 });
	}
	lhBox(
		q,
		'primary',
		'PRIMARY COLLIMATOR',
		cx - 112,
		ys.primary - 25,
		224,
		50,
		'#dce6ea',
		'#607985'
	);
	lhBox(
		q,
		'carousel',
		m === 'photon' ? 'FLATTENING FILTER' : 'SCATTERING FOIL',
		cx - 122,
		ys.carousel - 28,
		244,
		56,
		m === 'photon' ? '#eadbff' : '#fff2b7',
		m === 'photon' ? '#7d57ba' : '#c39a16'
	);
	lhBox(
		q,
		'chamber',
		'MONITOR ION CHAMBER',
		cx - 116,
		ys.chamber - 24,
		232,
		48,
		'#d6ebff',
		'#4387be'
	);
	// jaws
	q.fillStyle = '#434f56';
	q.strokeStyle = '#252d31';
	q.fillRect(cx - 150, ys.jaws - 22, 112, 44);
	q.fillRect(cx + 38, ys.jaws - 22, 112, 44);
	q.strokeRect(cx - 150, ys.jaws - 22, 112, 44);
	q.strokeRect(cx + 38, ys.jaws - 22, 112, 44);
	q.fillStyle = '#263c46';
	q.font = '900 17px Arial';
	q.textAlign = 'center';
	q.fillText('SECONDARY JAWS', cx, ys.jaws);
	LINAC_HEAD_LAB.hit.push({ id: 'jaws', x: cx - 150, y: ys.jaws - 26, w: 300, h: 52 });
	// MLC leaves: active field shaping for photon mode; fully retracted/inactive for the conventional electron mode represented here.
	if (m === 'photon') {
		q.fillStyle = '#6b7680';
		q.strokeStyle = '#374047';
		for (let i = 0; i < 7; i++) {
			q.fillRect(cx - 162, ys.mlc - 29 + i * 8, 127 - i * 7, 6);
			q.fillRect(cx + 35 + i * 7, ys.mlc - 29 + i * 8, 127 - i * 7, 6);
		}
		q.fillStyle = '#263c46';
		q.font = '900 17px Arial';
		q.fillText('MULTILEAF COLLIMATOR (MLC)', cx, ys.mlc + 42);
	} else {
		q.fillStyle = '#9ba7ad';
		q.strokeStyle = '#65757d';
		for (let i = 0; i < 7; i++) {
			q.fillRect(cx - 190, ys.mlc - 29 + i * 8, 62, 6);
			q.fillRect(cx + 128, ys.mlc - 29 + i * 8, 62, 6);
		}
		q.save();
		q.setLineDash([8, 6]);
		q.strokeStyle = '#7f929b';
		q.lineWidth = 2;
		q.strokeRect(cx - 116, ys.mlc - 32, 232, 58);
		q.restore();
		q.fillStyle = '#4f6570';
		q.font = '900 17px Arial';
		q.fillText('MLC RETRACTED · INACTIVE', cx, ys.mlc + 42);
	}
	LINAC_HEAD_LAB.hit.push({ id: 'mlc', x: cx - 195, y: ys.mlc - 32, w: 390, h: 82 });
	if (m === 'electron') {
		q.strokeStyle = '#47947f';
		q.lineWidth = 3;
		q.strokeRect(cx - 116, ys.applicator - 18, 232, 37);
		q.fillStyle = '#297865';
		q.font = '900 16px Arial';
		q.fillText('ELECTRON APPLICATOR / INSERT', cx, ys.applicator);
		LINAC_HEAD_LAB.hit.push({
			id: 'applicator',
			x: cx - 116,
			y: ys.applicator - 22,
			w: 232,
			h: 44
		});
	}
	// labels right side
	const labels = [
		['target', m === 'photon' ? 'Target: e⁻ → x-rays' : 'Target bypass'],
		['primary', 'Fixed primary collimation'],
		['carousel', m === 'photon' ? 'Photon modifier' : 'Electron scattering system'],
		['chamber', 'Output monitoring'],
		['jaws', 'Rectangular collimation'],
		['mlc', m === 'photon' ? 'Field shaping / modulation' : 'MLC retracted / inactive']
	];
	if (m === 'electron') labels.push(['applicator', 'Electron field definition']);
	q.textAlign = 'left';
	q.font = '700 15px Arial';
	labels.forEach(([id, lab], i) => {
		const y = 145 + i * 69;
		q.fillStyle = '#415b67';
		q.fillText(lab, 700, y);
		q.strokeStyle = '#b4c3c9';
		q.lineWidth = 1.5;
		q.beginPath();
		q.moveTo(662, y - 5);
		q.lineTo(690, y - 5);
		q.stroke();
	});
	// beam path and progress highlight
	const points =
		m === 'photon'
			? [
					[338, 205],
					[500, 131],
					[500, 180],
					[500, 235],
					[500, 322],
					[500, 407],
					[500, 485],
					[500, 558],
					[500, 646]
				]
			: [
					[338, 205],
					[500, 131],
					[500, 180],
					[500, 235],
					[500, 322],
					[500, 407],
					[500, 485],
					[500, 558],
					[500, 620],
					[500, 646]
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
	// selected component outline
	const hit = LINAC_HEAD_LAB.hit.find((h) => h.id === LINAC_HEAD_LAB.selected);
	if (hit) {
		q.strokeStyle = '#8b5cf6';
		q.lineWidth = 5;
		q.strokeRect(hit.x - 5, hit.y - 5, hit.w + 10, hit.h + 10);
	}
}
function lhAnimate() {
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
function lhCanvasClick(e) {
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

corridorFloor(-32, 0, 40, 7, C.front); // Patient Services west corridor
corridorFloor(0, -38, 7, 56, C.technical); // Technical / Education north corridor
corridorFloor(38, 0, 52, 8, C.clinical); // Main Clinical east corridor
corridorFloor(64, 0, 8, 62, C.vault); // Treatment branch
scene.add(box(9, 0.065, 9, std(0x627079, 0.82, 0.04), 64, 0.026, 0));
corridorLightsHorizontal(-50, -12, 0);
corridorLightsVertical(-66, -10, 0);
corridorLightsHorizontal(12, 64, 0);
corridorLightsVertical(-30, 30, 64);
buildCorridorInfillWalls();
buildVaultMazeEntries();
ROOMS.forEach((r) => (r.hub ? buildHubLobby(r) : buildRoom(r)));
addJourneyWallClocks();
addCirculationProps();
buildPhase4WorkflowDisplays();

buildOperatorLiveConsole();

buildCtLiveConsole();

addClinicalWallPolish();

departmentStaff();
addMovingActors();
clinicalCeilingAccents('ctcontrol');
clinicalCeilingAccents('ctsim');
clinicalCeilingAccents('linaccontrol');
clinicalCeilingAccents('vault1');
clinicalCeilingAccents('vault2');
privacyChangingNook('ctsim', 37.15, -4.7, 0, 'CT PATIENT CHANGING');
privacyChangingNook('vault1', 68.7, -14.2, Math.PI / 2, 'TREATMENT CHANGING', 1.16);
privacyChangingNook('vault2', 68.7, 14.2, Math.PI / 2, 'TREATMENT CHANGING', 1.16);

/* Patient journeys */
export const ROOM_WORKFLOW = {
	lobby: { state: 'OPEN', detail: 'Routine arrivals', color: '#42d5cf' },
	linaccontrol: { state: 'READY', detail: 'Treatment team available', color: '#42d5cf' },
	vault1: { state: 'AVAILABLE', detail: 'Room ready for next patient', color: '#65dda0' },
	consult: { state: 'READY', detail: 'Consult room available', color: '#42d5cf' },
	education: { state: 'READY', detail: 'Patient education available', color: '#42d5cf' },
	ctsim: { state: 'AVAILABLE', detail: 'CT simulator ready', color: '#65dda0' },
	ctcontrol: { state: 'READY', detail: 'CT control ready', color: '#42d5cf' }
};
export const workflowTransitions = [];
export const JOURNEY = {
	active: false,
	busy: false,
	kind: 'treatment',
	stage: 'idle',
	patientName: 'Jordan Ellis',
	patient: null,
	therapist: null,
	vaultTherapist: null,
	controlPartner: null,
	couchPatient: null,
	newPatient: null,
	consultStaff: null,
	navigator: null,
	ctTherapist: null,
	ctControlTherapist: null,
	ctControlPartner: null,
	dosimetrist: null,
	dosimetryPartner: null,
	physicist: null,
	physicsPartner: null,
	staticCtPatient: null,
	ctSimPatient: null,
	miaTreatmentPatient: null,
	jordanOnCouch: false,
	miaOnTable: false,
	miaOnTreatmentCouch: false,
	introPending: false,
	vaultMonitorPatientOnly: false,
	sceneTimer: 0,
	sceneTimers: [],
	cameraFollow: null,
	cameraRoomId: null
};
const JOURNEY_META = {
	treatment: {
		title: 'Returning Treatment Patient',
		patient: 'Jordan Ellis',
		type: 'Returning treatment patient',
		idle: 'Follow one patient from check-in through treatment and departure.',
		labels: {
			idle: 'Start at reception',
			checkin: 'Complete check-in and begin pickup',
			setup: 'Begin verification imaging',
			imaging: 'Deliver treatment',
			treatment: 'Complete treatment',
			returning: 'Assist patient after treatment',
			departure: 'Escort patient to exit',
			done: 'Journey complete'
		},
		desc: {
			idle: 'Follow one patient from check-in through treatment and departure.',
			checkin: 'Jordan is checking in for a scheduled treatment visit.',
			waiting: 'Jordan is seated in the waiting area while Treatment Control is alerted.',
			alert: 'The treatment therapist has been alerted and is heading to reception.',
			called: 'The therapist has greeted Jordan and is escorting him to Vault 1.',
			setup: 'Jordan is in Vault 1 while the therapists reproduce the treatment setup.',
			imaging: 'Verification imaging is underway before treatment delivery.',
			treatment: 'Therapists are outside the vault monitoring treatment from the control area.',
			returning: 'Treatment is complete; therapists are returning to the vault.',
			departure: 'Jordan is leaving the treatment area after today’s fraction.',
			done: 'Treatment-day journey complete. Reset to run it again.'
		}
	},
	newpatient: {
		title: 'Mia Reynolds · Consult to First Treatment',
		patient: 'Mia Reynolds',
		type: 'New patient · simulation · planning · first treatment',
		idle: 'Follow Mia from her first consultation through CT simulation, treatment planning, physics QA, and her return for the first radiation treatment.',
		labels: {
			idle: 'Start at reception',
			checkin: 'Complete check-in and begin consult',
			consult: 'Continue to patient education',
			education: 'Escort to CT simulation',
			ctsetup: 'Begin CT scan',
			ctscan: 'Complete simulation',
			ctdone: 'Review first-treatment instructions',
			instructions: 'Preparing to return to lobby',
			escort: 'Escorting Mia to reception',
			plantransfer: 'Send CT dataset to dosimetry',
			dosimetry: 'Create computer treatment plan',
			physicsqa: 'Perform physics QA',
			planrelease: 'Release plan to LINAC Control',
			firstreturn: 'Begin Tuesday first-treatment visit',
			firstcheckin: 'Complete check-in and call therapist',
			firstsetup: 'Acquire first-treatment verification imaging',
			firstimaging: 'Deliver first radiation treatment',
			firsttreatment: 'Complete first treatment',
			firstcomplete: 'Review post-treatment instructions',
			firstdeparture: 'Escort Mia to exit',
			done: 'Journey complete'
		},
		desc: {
			idle: 'Follow Mia from arrival through consultation, education, CT simulation, discharge, treatment planning, physics QA and her first radiation treatment.',
			checkin: 'Mia is checking in for her first consultation visit.',
			waiting: 'Mia is seated briefly while the consultation room is prepared.',
			consult: 'The radiation oncologist is meeting Mia for the initial consultation.',
			education: 'A navigator is reviewing the care pathway and preparing Mia for CT simulation.',
			ctsetup: 'Radiation therapists are reproducing immobilization and setup for the planning CT.',
			ctscan:
				'The CT couch is moving Mia through the gantry while the planning CT is acquired from the control room.',
			ctdone:
				'CT simulation is complete; the therapist is helping Mia off the table before discharge instructions.',
			instructions:
				'The therapist is reviewing general instructions and Mia’s simulated first-treatment appointment.',
			escort: 'The therapist is escorting Mia back to reception so she can leave the center.',
			plantransfer:
				'After Mia leaves, the CT team sends the image dataset plus indexed setup and immobilization instructions to Dosimetry.',
			dosimetry:
				'The medical dosimetrist is creating and evaluating the computer treatment plan from the physician prescription and CT dataset.',
			physicsqa:
				'Medical physics is performing the technical plan review and required QA before treatment release.',
			planrelease:
				'The verified plan is being released to LINAC Control for Mia’s scheduled first treatment.',
			firstreturn:
				'Time advances to Tuesday morning. Mia is returning for her scheduled 9:30 AM first treatment and is due to check in at 9:15 AM.',
			firstcheckin:
				'Mia has checked in for her first treatment. The treatment team will be alerted that she is waiting.',
			firstwaiting:
				'Mia is seated in reception while Treatment Control confirms that the approved plan, physics clearance, and simulation setup record are available.',
			firstpickup:
				'The treatment therapist is retrieving Mia and preparing to reproduce the simulation setup in Vault 1.',
			firstsetup:
				'Mia is in Vault 1 while the therapists reproduce the position, supports and indexing documented at CT simulation.',
			firstimaging:
				'The first-treatment setup is complete and verification imaging is being acquired before any treatment is delivered.',
			firsttreatment:
				'Mia’s first fraction is being delivered while the therapists monitor the treatment from the protected control area.',
			firstcomplete:
				'The first fraction is complete and the therapists are assisting Mia off the treatment couch.',
			firstdeparture:
				'Mia is leaving after her first treatment with instructions for subsequent visits and symptom reporting.',
			done: 'Mia’s longitudinal journey is complete: consultation, CT simulation, planning, physics QA, and first treatment have all been demonstrated.'
		}
	}
};
export function currentJourneyMeta() {
	return JOURNEY_META[JOURNEY.kind] || JOURNEY_META.treatment;
}
export const MIA_SIM_SETUP = {
	position: 'Head First Supine',
	headSupport: 'Indexed head support',
	lowerSupport: 'Indexed knee support',
	tableIndex: 'Recorded at CT simulation',
	reference: 'Simulation reference marks documented',
	plan: 'Approved',
	physicsQA: 'Passed',
	fraction: '1 / simulated course',
	appointment: 'Tuesday 9:30 AM',
	checkin: '9:15 AM',
	imaging: 'Verification imaging required'
};
function showDayTransition(title, sub, ms = 4200) {
	const box = document.getElementById('dayTransition');
	if (!box) return;
	document.getElementById('dayTransitionTitle').textContent = title;
	document.getElementById('dayTransitionSub').textContent = sub;
	box.classList.add('show');
	setTimeout(() => box.classList.remove('show'), ms);
}
function journeyProgress() {
	const stages =
		JOURNEY.kind === 'treatment'
			? [
					'idle',
					'checkin',
					'waiting',
					'alert',
					'called',
					'setup',
					'imaging',
					'treatment',
					'returning',
					'departure',
					'done'
				]
			: [
					'idle',
					'checkin',
					'waiting',
					'consult',
					'education',
					'ctsetup',
					'ctscan',
					'ctdone',
					'instructions',
					'escort',
					'plantransfer',
					'dosimetry',
					'physicsqa',
					'planrelease',
					'firstreturn',
					'firstcheckin',
					'firstwaiting',
					'firstpickup',
					'firstsetup',
					'firstimaging',
					'firsttreatment',
					'firstcomplete',
					'firstdeparture',
					'done'
				];
	const i = Math.max(0, stages.indexOf(JOURNEY.stage));
	return Math.round((i / (stages.length - 1)) * 100);
}
export function journeyNextLabel() {
	return currentJourneyMeta().labels[JOURNEY.stage] || 'Sequence running…';
}
export function updateJourneyUI() {
	const meta = currentJourneyMeta(),
		start = document.getElementById('journeyStart'),
		next = document.getElementById('journeyNext'),
		phase = document.getElementById('journeyPhaseLabel'),
		txt = document.getElementById('journeyStepText'),
		bar = document.getElementById('journeyProgress'),
		hud = document.getElementById('patientJourneyHUD');
	if (!start || !next) return;
	document.getElementById('journeyTitle').textContent = meta.title;
	document.getElementById('jhPatient').textContent = meta.patient;
	document.getElementById('jhType').textContent = meta.type;
	start.style.display = JOURNEY.active ? 'none' : 'block';
	next.disabled = !JOURNEY.active || JOURNEY.busy || JOURNEY.stage === 'done' || !!S.travel;
	next.textContent = JOURNEY.busy ? 'Sequence running…' : journeyNextLabel();
	phase.textContent = JOURNEY.active
		? JOURNEY.stage.toUpperCase().replaceAll('_', ' ')
		: 'Optional journey';
	txt.textContent = meta.desc[JOURNEY.stage] || meta.idle;
	bar.style.width = journeyProgress() + '%';
	hud.classList.toggle('show', JOURNEY.active);
	document.getElementById('jhPhase').textContent =
		JOURNEY.stage === 'idle' ? 'Check-in' : JOURNEY.stage.toUpperCase().replaceAll('_', ' ');
	document.getElementById('jhSub').textContent = txt.textContent;
	document
		.querySelectorAll('#journeyModes button')
		.forEach((b) => b.classList.toggle('active', b.dataset.journey === JOURNEY.kind));
}
function createJourneyLyingPatient(room, skin = 0xd7a17d, hairColor = 0x3a281f) {
	const cont = new THREE.Group(),
		topMat = std(0xd3d9dd, 0.78, 0.02),
		pantMat = std(0xc3cace, 0.82, 0.03),
		skinMat = std(skin, 0.9, 0.0),
		hairMat = std(hairColor, 0.82, 0.02),
		shoeMat = std(0x252b30, 0.85, 0.1),
		lift = 0.48;
	const torso = box(0.82, 0.22, 0.42, topMat, 0, 0.9 + lift, -0.05),
		pelvis = box(0.42, 0.2, 0.42, topMat, 0.5, 0.88 + lift, -0.02),
		neck = box(0.08, 0.06, 0.08, skinMat, -0.52, 0.92 + lift, 0);
	cont.add(torso, pelvis, neck);
	const hd = sphere(0.17, skinMat);
	hd.scale.y = 1.04;
	hd.position.set(-0.72, 0.92 + lift, 0);
	cont.add(hd);
	const hair = sphere(0.175, hairMat);
	hair.scale.set(1, 0.5, 1);
	hair.position.set(-0.73, 0.99 + lift, -0.01);
	cont.add(hair);
	const armL = box(0.44, 0.11, 0.11, topMat, -0.02, 0.86 + lift, -0.22),
		armR = box(0.44, 0.11, 0.11, topMat, -0.02, 0.86 + lift, 0.22),
		foreL = box(0.24, 0.1, 0.1, skinMat, 0.32, 0.84 + lift, -0.22),
		foreR = box(0.24, 0.1, 0.1, skinMat, 0.32, 0.84 + lift, 0.22),
		legL = box(0.62, 0.15, 0.16, pantMat, 0.98, 0.82 + lift, -0.1),
		legR = box(0.62, 0.15, 0.16, pantMat, 0.98, 0.82 + lift, 0.1),
		footL = box(0.18, 0.09, 0.18, shoeMat, 1.34, 0.77 + lift, -0.1),
		footR = box(0.18, 0.09, 0.18, shoeMat, 1.34, 0.77 + lift, 0.1);
	cont.add(armL, armR, foreL, foreR, legL, legR, footL, footR);
	cont.add(box(0.34, 0.055, 0.42, std(0xd7e1e5, 0.86, 0.02), -0.67, 0.73 + lift, 0));
	setNpcRole(cont, 'Patient', 'Mia Reynolds positioned for CT simulation.');
	cont.userData.clothingRig = {
		kind: 'lying',
		topParts: [torso, pelvis, armL, armR],
		bottomParts: [legL, legR],
		topColor: 0xd3d9dd,
		bottomColor: 0xc3cace
	};
	cont.position.set(room.x - 4.0, 0.02, room.z + 1.5);
	scene.add(cont);
	(ROOM_CAST.ctsim || (ROOM_CAST.ctsim = [])).push({ g: cont, kind: 'patient' });
	cont.visible = false;
	return cont;
}
function createJourneyTreatmentPatient(room, skin = 0xd7a17d, hairColor = 0x3a281f) {
	const cont = new THREE.Group(),
		topMat = std(0xd3d9dd, 0.78, 0.02),
		pantMat = std(0xc3cace, 0.82, 0.03),
		skinMat = std(skin, 0.9, 0.0),
		hairMat = std(hairColor, 0.82, 0.02),
		shoeMat = std(0x252b30, 0.85, 0.1),
		lift = 0.62;
	const torso = box(0.82, 0.22, 0.42, topMat, 0, 0.9 + lift, -0.05),
		pelvis = box(0.42, 0.2, 0.42, topMat, 0.5, 0.88 + lift, -0.02),
		neck = box(0.08, 0.06, 0.08, skinMat, -0.52, 0.92 + lift, 0);
	cont.add(torso, pelvis, neck);
	const hd = sphere(0.17, skinMat);
	hd.scale.y = 1.04;
	hd.position.set(-0.72, 0.92 + lift, 0);
	cont.add(hd);
	const hair = sphere(0.175, hairMat);
	hair.scale.set(1, 0.5, 1);
	hair.position.set(-0.73, 0.99 + lift, -0.01);
	cont.add(hair);
	const armL = box(0.44, 0.11, 0.11, topMat, -0.02, 0.86 + lift, -0.22),
		armR = box(0.44, 0.11, 0.11, topMat, -0.02, 0.86 + lift, 0.22),
		foreL = box(0.24, 0.1, 0.1, skinMat, 0.32, 0.84 + lift, -0.22),
		foreR = box(0.24, 0.1, 0.1, skinMat, 0.32, 0.84 + lift, 0.22),
		legL = box(0.62, 0.15, 0.16, pantMat, 0.98, 0.82 + lift, -0.1),
		legR = box(0.62, 0.15, 0.16, pantMat, 0.98, 0.82 + lift, 0.1),
		footL = box(0.18, 0.09, 0.18, shoeMat, 1.34, 0.77 + lift, -0.1),
		footR = box(0.18, 0.09, 0.18, shoeMat, 1.34, 0.77 + lift, 0.1);
	cont.add(armL, armR, foreL, foreR, legL, legR, footL, footR);
	cont.add(box(0.34, 0.055, 0.42, std(0xd7e1e5, 0.86, 0.02), -0.67, 0.73 + lift, 0));
	setNpcRole(cont, 'Patient', 'Mia Reynolds positioned for her first radiation treatment.');
	cont.userData.clothingRig = {
		kind: 'lying',
		topParts: [torso, pelvis, armL, armR],
		bottomParts: [legL, legR],
		topColor: 0xd3d9dd,
		bottomColor: 0xc3cace
	};
	cont.position.set(room.x - 1.25, 0.02, room.z - 0.05);
	scene.add(cont);
	(ROOM_CAST.vault1 || (ROOM_CAST.vault1 = [])).push({ g: cont, kind: 'patient' });
	cont.visible = false;
	return cont;
}
function journeyActors() {
	const lp = (ROOM_CAST.lobby || []).filter((x) => x.kind === 'patient');
	if (!JOURNEY.patient) JOURNEY.patient = lp[1]?.g || lp[0]?.g;
	if (!JOURNEY.newPatient) JOURNEY.newPatient = lp[0]?.g || lp[1]?.g;
	if (!JOURNEY.therapist) JOURNEY.therapist = PRIMARY_NPCS.linaccontrol;
	if (!JOURNEY.vaultTherapist) JOURNEY.vaultTherapist = PRIMARY_NPCS.vault1;
	if (!JOURNEY.controlPartner)
		JOURNEY.controlPartner =
			(ROOM_CAST.linaccontrol || []).filter(
				(x) => x.kind === 'staff' && x.g !== JOURNEY.therapist
			)[0]?.g || JOURNEY.vaultTherapist;
	if (!JOURNEY.couchPatient) JOURNEY.couchPatient = PRIMARY_PATIENTS.vault1;
	if (!JOURNEY.consultStaff) JOURNEY.consultStaff = PRIMARY_NPCS.consult;
	if (!JOURNEY.navigator) JOURNEY.navigator = PRIMARY_NPCS.education;
	if (!JOURNEY.ctTherapist) JOURNEY.ctTherapist = PRIMARY_NPCS.ctsim;
	if (!JOURNEY.ctControlTherapist) JOURNEY.ctControlTherapist = PRIMARY_NPCS.ctcontrol;
	if (!JOURNEY.ctControlPartner)
		JOURNEY.ctControlPartner =
			(ROOM_CAST.ctcontrol || []).filter(
				(x) => x.kind === 'staff' && x.g !== JOURNEY.ctControlTherapist
			)[0]?.g || JOURNEY.ctTherapist;
	if (!JOURNEY.dosimetrist) JOURNEY.dosimetrist = PRIMARY_NPCS.dosimetry;
	if (!JOURNEY.dosimetryPartner)
		JOURNEY.dosimetryPartner =
			(ROOM_CAST.dosimetry || []).filter(
				(x) => x.kind === 'staff' && x.g !== JOURNEY.dosimetrist
			)[0]?.g || null;
	if (!JOURNEY.physicist) JOURNEY.physicist = PRIMARY_NPCS.physics;
	if (!JOURNEY.physicsPartner)
		JOURNEY.physicsPartner =
			(ROOM_CAST.physics || []).filter((x) => x.kind === 'staff' && x.g !== JOURNEY.physicist)[0]
				?.g || null;
	if (!JOURNEY.staticCtPatient) JOURNEY.staticCtPatient = PRIMARY_PATIENTS.ctsim;
	if (!JOURNEY.ctSimPatient)
		JOURNEY.ctSimPatient = createJourneyLyingPatient(roomById('ctsim'), 0xd7a17d, 0x3a281f);
	if (!JOURNEY.miaTreatmentPatient)
		JOURNEY.miaTreatmentPatient = createJourneyTreatmentPatient(
			roomById('vault1'),
			0xd7a17d,
			0x3a281f
		);
	if (JOURNEY.patient) JOURNEY.patient.userData.journeyPatient = true;
	if (JOURNEY.newPatient) JOURNEY.newPatient.userData.journeyPatient = true;
	if (JOURNEY.miaTreatmentPatient) JOURNEY.miaTreatmentPatient.userData.journeyPatient = true;
}
export function journeySpeech(actor, text, kind = 'staff', ms = 10000) {
	if (!actor) return;
	const hold = Math.max(10000, ms);
	let el = actor.userData.journeyBubble;
	if (!el) {
		el = npcBubble(actor, kind);
		actor.userData.journeyBubble = el;
	}
	el.textContent = text;
	el.style.opacity = '1';
	clearTimeout(el._journeyTimer);
	el._journeyTimer = setTimeout(() => (el.style.opacity = '0'), hold);
}
function playIntercomAudio(text) {
	try {
		initAmbience();
		if (AMBIENCE.ctx && AMBIENCE.ctx.state !== 'running') AMBIENCE.ctx.resume().catch(() => {});
		if (AMBIENCE.ctx) {
			const ctx = AMBIENCE.ctx,
				t = ctx.currentTime + 0.02;
			const beep = (freq, delay = 0.0, dur = 0.12, gain = 0.035) => {
				const osc = ctx.createOscillator(),
					amp = ctx.createGain();
				osc.type = 'sine';
				osc.frequency.value = freq;
				amp.gain.setValueAtTime(0.0001, t + delay);
				amp.gain.linearRampToValueAtTime(gain, t + delay + 0.01);
				amp.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
				osc.connect(amp).connect(ctx.destination);
				osc.start(t + delay);
				osc.stop(t + delay + dur + 0.03);
			};
			beep(930, 0, 0.1, 0.028);
			beep(710, 0.16, 0.12, 0.022);
		}
	} catch (e) {}
	try {
		if ('speechSynthesis' in window) {
			window.speechSynthesis.cancel();
			const u = new SpeechSynthesisUtterance(text);
			u.rate = 0.96;
			u.pitch = 0.92;
			u.volume = 0.88;
			window.speechSynthesis.speak(u);
		}
	} catch (e) {}
}
function journeyIntercom(actor, text, ms = 12000) {
	journeySpeech(actor, text, 'staff', ms);
	playIntercomAudio(text);
}
function journeyAudioCue(actor, text, kind = 'staff', ms = 12000) {
	journeySpeech(actor, text, kind, ms);
	playIntercomAudio(text);
}
function setJourneySeated(seated) {
	setActorSeated(JOURNEY.patient, seated);
}
function clearJourneyTimer() {
	if (JOURNEY.sceneTimer) {
		clearTimeout(JOURNEY.sceneTimer);
		JOURNEY.sceneTimer = 0;
	}
	for (const id of JOURNEY.sceneTimers || []) clearTimeout(id);
	JOURNEY.sceneTimers = [];
}
function releaseJourneyAfter(ms) {
	JOURNEY.busy = true;
	updateJourneyUI();
	later(() => {
		JOURNEY.busy = false;
		updateJourneyUI();
	}, ms);
}
function clearJourneyCameraFollow() {
	JOURNEY.cameraFollow = null;
	JOURNEY.cameraRoomId = null;
}
function setJourneyCameraFollow(subject, companion = null, opts = {}) {
	if (!subject) return;
	const wp = new THREE.Vector3();
	subject.getWorldPosition(wp);
	JOURNEY.cameraFollow = {
		subject,
		companion,
		last: wp.clone(),
		distance: opts.distance || 3.65,
		side: opts.side ?? 1.35,
		height: opts.height || 1.82,
		lead: opts.lead || 1.0,
		patientPrimary: opts.patientPrimary !== false
	};
	if (document.pointerLockElement) document.exitPointerLock();
	orbit.enabled = false;
	document.getElementById('roomLookHint').classList.remove('show');
}
function updateJourneyCameraFollow() {
	const f = JOURNEY.cameraFollow;
	if (!JOURNEY.active || !f || !f.subject || f.subject.visible === false) return;
	const p = new THREE.Vector3(),
		q = new THREE.Vector3();
	f.subject.getWorldPosition(p);
	let target = p.clone();
	if (f.companion && f.companion.visible !== false) {
		f.companion.getWorldPosition(q);
		target.lerp(q, 0.32);
	}
	target.y = 1.3;
	let dir = p.clone().sub(f.last);
	dir.y = 0;
	if (dir.lengthSq() < 0.0004) {
		dir.set(Math.sin(f.subject.rotation.y), 0, Math.cos(f.subject.rotation.y));
	} else dir.normalize();
	const right = new THREE.Vector3(dir.z, 0, -dir.x);
	const desired = p.clone().addScaledVector(dir, -f.distance).addScaledVector(right, f.side);
	desired.y = f.height;
	camera.position.lerp(desired, 0.76);
	const look = target.clone().addScaledVector(dir, f.lead);
	camera.lookAt(look);
	f.last.copy(p);
	const here = roomContainingWalkPoint(p.x, p.z);
	if (here && here.id !== JOURNEY.cameraRoomId) {
		JOURNEY.cameraRoomId = here.id;
		S.activeRoom = here;
		updateRoomUI(here);
		renderRoomList();
		document.getElementById('locText').textContent =
			`Following ${currentJourneyMeta().patient} · ${here.name}`;
	}
}
function focusCtPatientFromControl() {
	clearJourneyCameraFollow();
	const patient = JOURNEY.ctSimPatient;
	if (!patient || patient.visible === false) return;
	const wp = new THREE.Vector3();
	patient.getWorldPosition(wp);
	camera.position.set(35.55, 1.78, -9.25);
	camera.lookAt(wp.clone().setY(1.25));
	orbit.target.copy(wp.clone().setY(1.25));
	orbit.enabled = false;
	S.activeRoom = roomById('ctcontrol');
	updateRoomUI(S.activeRoom);
	renderRoomList();
	document.getElementById('locText').textContent =
		'CT Control · observing Mia through the simulation-room window';
}

function setJourneyKind(kind, silent = false) {
	journeyActors();
	clearClinicalFocus();
	if (JOURNEY.active) resetTreatmentJourney(true);
	JOURNEY.kind = kind === 'newpatient' ? 'newpatient' : 'treatment';
	JOURNEY.stage = 'idle';
	JOURNEY.patientName = currentJourneyMeta().patient;
	applyJourneyPatientFocus();
	updateJourneyUI();
	if (!silent) toast(`<b>${currentJourneyMeta().title}</b><br>${currentJourneyMeta().idle}`);
}
function applyJourneyPatientFocus() {
	if (JOURNEY.active) {
		for (const sc of interactionScenes) {
			bubbleVis(sc.bubbleA, false);
			bubbleVis(sc.bubbleB, false);
		}
	}
	for (const arr of Object.values(ROOM_CAST))
		for (const e of arr) if (e.kind === 'patient') e.g.visible = true;
	for (const m of movers)
		m.group.visible = !(JOURNEY.active && m.group.userData?.suppressDuringJourney);
	if (!JOURNEY.active) {
		if (JOURNEY.ctSimPatient) JOURNEY.ctSimPatient.visible = false;
		if (JOURNEY.miaTreatmentPatient) JOURNEY.miaTreatmentPatient.visible = false;
		return;
	}
	const hideRooms =
		JOURNEY.kind === 'treatment'
			? ['lobby', 'vault1']
			: ['lobby', 'consult', 'education', 'ctsim', 'vault1'];
	const keep = new Set(
		JOURNEY.kind === 'treatment'
			? [JOURNEY.patient, JOURNEY.couchPatient]
			: [JOURNEY.newPatient, JOURNEY.ctSimPatient, JOURNEY.miaTreatmentPatient]
	);
	for (const id of hideRooms)
		for (const e of ROOM_CAST[id] || [])
			if (e.kind === 'patient' && !keep.has(e.g)) e.g.visible = false;
	if (JOURNEY.kind === 'treatment') {
		const onCouch = !!JOURNEY.jordanOnCouch;
		if (JOURNEY.patient) JOURNEY.patient.visible = !onCouch;
		if (JOURNEY.couchPatient) JOURNEY.couchPatient.visible = onCouch;
		if (JOURNEY.ctSimPatient) JOURNEY.ctSimPatient.visible = false;
		if (JOURNEY.miaTreatmentPatient) JOURNEY.miaTreatmentPatient.visible = false;
	} else {
		const onCt = !!JOURNEY.miaOnTable,
			onTx = !!JOURNEY.miaOnTreatmentCouch,
			behind = ['plantransfer', 'dosimetry', 'physicsqa', 'planrelease'].includes(JOURNEY.stage);
		if (JOURNEY.newPatient) JOURNEY.newPatient.visible = !onCt && !onTx && !behind;
		if (JOURNEY.ctSimPatient) JOURNEY.ctSimPatient.visible = onCt;
		if (JOURNEY.miaTreatmentPatient) JOURNEY.miaTreatmentPatient.visible = onTx;
		if (JOURNEY.staticCtPatient) JOURNEY.staticCtPatient.visible = false;
		if (JOURNEY.couchPatient) JOURNEY.couchPatient.visible = false;
	}
}
function moveJourneyActor(actor, fromId, toId, final, onComplete = null, speed = 1.95, opts = {}) {
	if (!actor) return;
	if (fromId && doors.has(fromId)) setDoorTarget(fromId, true);
	if (toId && doors.has(toId)) setDoorTarget(toId, true);
	actor.userData.inHandoff = true;
	const curve = movementPathFor(actor, fromId, toId, final),
		len = curve.getLength(),
		duration = Math.max(2.6, Math.min(32, len / speed));
	const cues = (opts.cues || []).map((c) => ({ ...c, fired: false }));
	workflowTransitions.push({
		actor,
		fromId,
		toId,
		curve,
		start: performance.now() / 1000,
		duration,
		onComplete,
		cues
	});
	if (opts.followCamera)
		setJourneyCameraFollow(
			opts.followSubject || actor,
			opts.followTarget || null,
			opts.cameraOptions || {}
		);
}
function journeyFocusActors(a, b, roomId) {
	clearJourneyCameraFollow();
	if (S.mode === 'overview') setMode('guided', false);
	const pa = new THREE.Vector3(),
		pb = new THREE.Vector3();
	a?.getWorldPosition(pa);
	b?.getWorldPosition(pb);
	const target =
		a && b
			? pa.clone().add(pb).multiplyScalar(0.5).setY(1.35)
			: a
				? pa
				: new THREE.Vector3(0, 1.35, 0);
	const r = roomById(roomId);
	if (!r) return;
	let pos;
	if (roomId === 'lobby') pos = target.clone().add(new THREE.Vector3(3.4, 0.45, 3.2));
	else if (roomId === 'linaccontrol') pos = target.clone().add(new THREE.Vector3(3.2, 0.5, -2.4));
	else if (roomId === 'vault1') pos = new THREE.Vector3(81.4, 1.96, -13.9);
	else if (roomId === 'vault2') pos = new THREE.Vector3(81.4, 1.96, 13.9);
	else if (roomId === 'consult') pos = target.clone().add(new THREE.Vector3(2.8, 0.45, 2.5));
	else if (roomId === 'education') pos = target.clone().add(new THREE.Vector3(2.8, 0.45, 2.3));
	else if (roomId === 'ctsim') pos = target.clone().add(new THREE.Vector3(3.0, 0.4, 2.0));
	else if (roomId === 'ctcontrol') pos = target.clone().add(new THREE.Vector3(2.8, 0.4, -2.2));
	else pos = target.clone().add(new THREE.Vector3(3.0, 0.5, 2.0));
	camera.position.copy(pos);
	camera.lookAt(target);
	orbit.target.copy(target);
	orbit.enabled = S.mode === 'guided';
	orbit.update();
	S.activeRoom = r;
	updateRoomUI(r);
	renderRoomList();
}
function resetTreatmentJourney(silent = false) {
	journeyActors();
	clearJourneyTimer();
	clearJourneyCameraFollow();
	JOURNEY.active = false;
	JOURNEY.busy = false;
	JOURNEY.stage = 'idle';
	JOURNEY.jordanOnCouch = false;
	JOURNEY.miaOnTable = false;
	JOURNEY.miaOnTreatmentCouch = false;
	JOURNEY.introPending = false;
	JOURNEY.vaultMonitorPatientOnly = false;
	workflowTransitions.length = 0;
	if (JOURNEY.patient) {
		JOURNEY.patient.position.set(-2.5, 0, 3.0);
		JOURNEY.patient.rotation.y = Math.PI;
		setJourneySeated(false);
	}
	if (JOURNEY.newPatient) {
		JOURNEY.newPatient.position.set(-6.2, 0, 3.3);
		JOURNEY.newPatient.rotation.y = Math.PI;
		setActorSeated(JOURNEY.newPatient, true);
	}
	if (JOURNEY.therapist) {
		JOURNEY.therapist.position.set(51.35, 0, 10.6);
		JOURNEY.therapist.rotation.y = -Math.PI / 2;
		poseCharacter(JOURNEY.therapist, 'console');
	}
	if (JOURNEY.vaultTherapist) {
		JOURNEY.vaultTherapist.position.set(75.5, 0, -14.75);
		JOURNEY.vaultTherapist.rotation.y = 0.6;
		poseCharacter(JOURNEY.vaultTherapist, 'support');
	}
	if (JOURNEY.couchPatient) JOURNEY.couchPatient.visible = true;
	if (JOURNEY.ctSimPatient) JOURNEY.ctSimPatient.visible = false;
	if (JOURNEY.miaTreatmentPatient) JOURNEY.miaTreatmentPatient.visible = false;
	setPatientGown(JOURNEY.patient, false);
	setPatientGown(JOURNEY.newPatient, false);
	setPatientGown(JOURNEY.couchPatient, false);
	setPatientGown(JOURNEY.ctSimPatient, false);
	setPatientGown(JOURNEY.miaTreatmentPatient, false);
	resetCtCouchMotion();
	workflowState('lobby', 'OPEN', 'Routine arrivals', '#42d5cf');
	workflowState('linaccontrol', 'READY', 'Treatment team available', '#42d5cf');
	workflowState('vault1', 'AVAILABLE', 'Room ready for next patient', '#65dda0');
	workflowState('consult', 'READY', 'Consult room available', '#42d5cf');
	workflowState('education', 'READY', 'Patient education available', '#42d5cf');
	workflowState('ctsim', 'AVAILABLE', 'CT simulator ready', '#65dda0');
	workflowState('ctcontrol', 'READY', 'CT control ready', '#42d5cf');
	workflowState('dosimetry', 'READY', 'Treatment planning workstations ready', '#42d5cf');
	workflowState('physics', 'READY', 'Physics plan review available', '#42d5cf');
	applyJourneyPatientFocus();
	updateJourneyUI();
	if (!silent) toast('<b>Patient journey reset.</b>');
}
function showJourneyCheckinIntro() {
	if (!JOURNEY.active || JOURNEY.stage !== 'checkin' || !JOURNEY.introPending) return;
	JOURNEY.introPending = false;
	JOURNEY.busy = true;
	if (JOURNEY.kind === 'treatment') {
		journeyFocusActors(PRIMARY_NPCS.lobby, JOURNEY.patient, 'lobby');
		journeySpeech(
			JOURNEY.patient,
			'Good morning. I’m here for my scheduled treatment. I haven’t had any appointment changes.',
			'patient',
			10500
		);
		later(
			() =>
				journeySpeech(
					PRIMARY_NPCS.lobby,
					'Good morning, Jordan. I have you on today’s treatment schedule. I’ll mark you arrived so the treatment team knows you’re here.',
					'staff',
					11000
				),
			6200
		);
		releaseJourneyAfter(17800);
	} else {
		journeyFocusActors(PRIMARY_NPCS.lobby, JOURNEY.newPatient, 'lobby');
		journeySpeech(
			JOURNEY.newPatient,
			'Hi. I’m Mia Reynolds. This is my first visit with radiation oncology.',
			'patient',
			10500
		);
		later(
			() =>
				journeySpeech(
					PRIMARY_NPCS.lobby,
					'Thanks, Mia. I found your consultation appointment. I’ll mark you arrived and let the physician team know you’re ready.',
					'staff',
					11000
				),
			6200
		);
		releaseJourneyAfter(17800);
	}
	updateJourneyUI();
}
function startTreatmentJourney() {
	if (JOURNEY.active) return;
	journeyActors();
	JOURNEY.active = true;
	JOURNEY.busy = true;
	JOURNEY.stage = 'checkin';
	JOURNEY.jordanOnCouch = false;
	JOURNEY.miaOnTable = false;
	JOURNEY.miaOnTreatmentCouch = false;
	JOURNEY.introPending = true;
	JOURNEY.vaultMonitorPatientOnly = false;
	setPatientGown(JOURNEY.patient, false);
	setPatientGown(JOURNEY.newPatient, false);
	setPatientGown(JOURNEY.couchPatient, false);
	setPatientGown(JOURNEY.ctSimPatient, false);
	setPatientGown(JOURNEY.miaTreatmentPatient, false);
	resetCtCouchMotion();
	applyJourneyPatientFocus();
	if (JOURNEY.kind === 'treatment') {
		if (JOURNEY.couchPatient) JOURNEY.couchPatient.visible = false;
		setJourneySeated(false);
		JOURNEY.patient.visible = true;
		JOURNEY.patient.position.set(-4.5, 0, -2.05);
		JOURNEY.patient.rotation.y = -1.15;
		workflowState('lobby', 'CHECK-IN', 'Jordan Ellis · arrived for treatment', '#6fb6ff');
		workflowState('linaccontrol', 'READY', 'Vault 1 scheduled for Jordan Ellis', '#42d5cf');
		workflowState('vault1', 'AVAILABLE', 'Awaiting patient arrival', '#65dda0');
	} else {
		if (JOURNEY.ctSimPatient) JOURNEY.ctSimPatient.visible = false;
		setActorSeated(JOURNEY.newPatient, false);
		JOURNEY.newPatient.visible = true;
		JOURNEY.newPatient.position.set(-4.45, 0, -2.15);
		JOURNEY.newPatient.rotation.y = -1.15;
		workflowState('lobby', 'CHECK-IN', 'Mia Reynolds · arrived for consultation', '#6fb6ff');
		workflowState('consult', 'READY', 'Consult room prepared', '#42d5cf');
		workflowState('education', 'READY', 'Education room available', '#42d5cf');
		workflowState('ctsim', 'AVAILABLE', 'CT simulator ready', '#65dda0');
	}
	applyJourneyPatientFocus();
	if (S.activeRoom?.id === 'lobby' && !S.travel) later(showJourneyCheckinIntro, 450);
	else if (!S.travel) beginTravel(roomById('lobby'), false);
	updateJourneyUI();
}
function beginJordanPickupSequence() {
	JOURNEY.busy = true;
	JOURNEY.stage = 'waiting';
	workflowState('lobby', 'WAITING', 'Jordan Ellis · seated in treatment waiting area', '#ffb454');
	journeySpeech(
		PRIMARY_NPCS.lobby,
		'You’re checked in, Jordan. Go ahead and have a seat. I’ve sent your arrival to the treatment team.',
		'staff',
		11000
	);
	moveJourneyActor(
		JOURNEY.patient,
		'lobby',
		'lobby',
		new THREE.Vector3(-2.8, 0, 3.4),
		() => {
			setJourneySeated(true);
			applyJourneyPatientFocus();
			journeyFocusActors(PRIMARY_NPCS.lobby, JOURNEY.patient, 'lobby');
			updateJourneyUI();
			later(() => {
				JOURNEY.stage = 'alert';
				workflowState(
					'linaccontrol',
					'PATIENT READY',
					'Jordan Ellis checked in · waiting in reception',
					'#6fb6ff'
				);
				journeyFocusActors(JOURNEY.therapist, JOURNEY.controlPartner, 'linaccontrol');
				journeySpeech(
					JOURNEY.controlPartner,
					'Jordan Ellis just checked in. His chart is open and Vault 1 is ready for setup.',
					'staff',
					11000
				);
				later(
					() =>
						journeySpeech(
							JOURNEY.therapist,
							'I’ll bring him back. I also want to follow up on the fatigue he reported yesterday before we start today’s fraction.',
							'staff',
							11000
						),
					7200
				);
				updateJourneyUI();
				later(() => {
					workflowState(
						'linaccontrol',
						'PATIENT CALL',
						'Therapist leaving control to retrieve Jordan',
						'#6fb6ff'
					);
					moveJourneyActor(
						JOURNEY.therapist,
						'linaccontrol',
						'lobby',
						new THREE.Vector3(-0.6, 0, 2.9),
						() => {
							JOURNEY.stage = 'called';
							faceNpcToward(JOURNEY.therapist, JOURNEY.patient);
							faceNpcToward(JOURNEY.patient, JOURNEY.therapist);
							journeyFocusActors(JOURNEY.therapist, JOURNEY.patient, 'lobby');
							journeySpeech(
								JOURNEY.therapist,
								'Jordan? Hi. Vault 1 is ready. Before we head back, I want to check how you’ve been doing since yesterday.',
								'staff',
								11000
							);
							later(
								() =>
									journeySpeech(JOURNEY.patient, 'Sure. I’m ready to go back.', 'patient', 10000),
								6800
							);
							updateJourneyUI();
							later(() => beginJordanEscortToVault(), 15000);
						},
						1.7,
						{
							followCamera: true,
							followSubject: JOURNEY.therapist,
							cameraOptions: { distance: 3.4, side: 1.2 }
						}
					);
				}, 15800);
			}, 7200);
		},
		1.25
	);
}
function beginJordanEscortToVault() {
	JOURNEY.stage = 'called';
	setJourneySeated(false);
	JOURNEY.busy = true;
	workflowState(
		'lobby',
		'IN TRANSIT',
		'Jordan and therapist en route to treatment changing area',
		'#42d5cf'
	);
	workflowState('vault1', 'PATIENT ARRIVING', 'Treatment team preparing room', '#6fb6ff');
	const cues = [
		{
			at: 0.1,
			actor: JOURNEY.therapist,
			text: 'Before we get to the room, how has your energy been since yesterday?',
			ms: 10500
		},
		{
			at: 0.4,
			actor: JOURNEY.patient,
			kind: 'patient',
			text: 'I’m more tired in the evenings, but I can still do my normal morning routine.',
			ms: 10500
		},
		{
			at: 0.68,
			actor: JOURNEY.therapist,
			text: 'Thanks. I’ll document that. No new pain, nausea, dizziness, or skin changes that we need to address before treatment?',
			ms: 11500
		}
	];
	let atChangeCount = 0;
	const atChange = () => {
		if (++atChangeCount < 2) return;
		workflowState('vault1', 'CHANGING', 'Jordan using treatment changing area', '#ffb454');
		journeyFocusActors(JOURNEY.therapist, JOURNEY.patient, 'vault1');
		journeySpeech(
			JOURNEY.therapist,
			'Here is the treatment changing area. Take your time changing into the hospital gown. I’ll wait just outside the privacy area and we’ll continue when you are ready.',
			'staff',
			13500
		);
		later(
			() =>
				journeySpeech(
					JOURNEY.patient,
					'Okay. I’ll change now and let you know when I’m ready.',
					'patient',
					10500
				),
			6500
		);
		later(() => {
			setPatientGown(JOURNEY.patient, true);
			setPatientGown(JOURNEY.couchPatient, true);
			journeySpeech(JOURNEY.patient, 'I’m changed and ready to continue.', 'patient', 10500);
		}, 13700);
		later(() => {
			journeySpeech(
				JOURNEY.therapist,
				'Great. We’ll continue into Vault 1 and reproduce your indexed treatment setup.',
				'staff',
				11500
			);
			workflowState(
				'vault1',
				'PATIENT ARRIVING',
				'Jordan changed into gown · entering treatment vault',
				'#6fb6ff'
			);
			let done = 0;
			const arrived = () => {
				if (++done < 2) return;
				JOURNEY.stage = 'setup';
				JOURNEY.jordanOnCouch = false;
				JOURNEY.busy = true;
				workflowState(
					'vault1',
					'PATIENT SETUP',
					'Preparing Jordan for daily treatment position',
					'#ffb454'
				);
				applyJourneyPatientFocus();
				faceNpcToward(JOURNEY.therapist, JOURNEY.patient);
				poseCharacter(JOURNEY.therapist, 'support');
				journeyFocusActors(JOURNEY.therapist, JOURNEY.patient, 'vault1');
				journeySpeech(
					JOURNEY.therapist,
					'We’re in Vault 1 now. Before you get onto the couch, we’ll confirm the treatment accessories and then help you into the same indexed position we used yesterday.',
					'staff',
					11500
				);
				later(() => {
					JOURNEY.jordanOnCouch = true;
					applyJourneyPatientFocus();
					faceNpcToward(JOURNEY.vaultTherapist, JOURNEY.couchPatient);
					faceNpcToward(JOURNEY.therapist, JOURNEY.couchPatient);
					poseCharacter(JOURNEY.vaultTherapist, 'support');
					poseCharacter(JOURNEY.therapist, 'support');
					journeyFocusActors(JOURNEY.vaultTherapist, JOURNEY.couchPatient, 'vault1');
					workflowState(
						'vault1',
						'PATIENT SETUP',
						'Jordan on couch · accessories and indexing verified',
						'#ffb454'
					);
					journeySpeech(
						JOURNEY.vaultTherapist,
						'You’re in position. I’m checking the support placement, couch index, and your alignment before we acquire the verification image.',
						'staff',
						11500
					);
					releaseJourneyAfter(12800);
				}, 11800);
			};
			moveJourneyActor(
				JOURNEY.therapist,
				'vault1',
				'vault1',
				new THREE.Vector3(76.0, 0, -14.25),
				arrived,
				1.48
			);
			moveJourneyActor(
				JOURNEY.patient,
				'vault1',
				'vault1',
				new THREE.Vector3(76.7, 0, -15.25),
				arrived,
				1.5,
				{
					followCamera: true,
					followSubject: JOURNEY.patient,
					followTarget: JOURNEY.therapist,
					cameraOptions: { distance: 3.6, side: 1.35, lead: 1.0 }
				}
			);
		}, 23200);
	};
	moveJourneyActor(
		JOURNEY.therapist,
		'lobby',
		'vault1',
		new THREE.Vector3(69.8, 0, -15.25),
		atChange,
		1.5
	);
	moveJourneyActor(
		JOURNEY.patient,
		'lobby',
		'vault1',
		new THREE.Vector3(68.8, 0, -14.15),
		atChange,
		1.52,
		{
			followCamera: true,
			followSubject: JOURNEY.patient,
			followTarget: JOURNEY.therapist,
			cues,
			cameraOptions: { distance: 3.6, side: 1.35, lead: 1.05 }
		}
	);
}
function advanceTreatmentJourney() {
	if (!JOURNEY.active || JOURNEY.busy || S.travel) return;
	if (JOURNEY.kind === 'newpatient') {
		advanceNewPatientJourney();
		return;
	}
	journeyActors();
	if (JOURNEY.stage === 'checkin') {
		beginJordanPickupSequence();
	} else if (JOURNEY.stage === 'setup') {
		JOURNEY.busy = true;
		faceNpcToward(JOURNEY.therapist, JOURNEY.couchPatient);
		faceNpcToward(JOURNEY.vaultTherapist, JOURNEY.couchPatient);
		poseCharacter(JOURNEY.therapist, 'support');
		workflowState('vault1', 'IMAGING', 'Verification imaging / daily position match', '#6fb6ff');
		journeySpeech(
			JOURNEY.therapist,
			'Your setup matches the indexed treatment position. We’re going to take today’s verification image now and compare it with the approved reference.',
			'staff',
			7200
		);
		JOURNEY.stage = 'imaging';
		releaseJourneyAfter(7600);
	} else if (JOURNEY.stage === 'imaging') {
		JOURNEY.busy = true;
		workflowState(
			'vault1',
			'READY TO TREAT',
			'Verification images complete · therapists moving to treatment control',
			'#ffb454'
		);
		workflowState(
			'linaccontrol',
			'IMAGE REVIEW',
			'Jordan Ellis · therapists reviewing alignment at the console',
			'#6fb6ff'
		);
		journeySpeech(
			JOURNEY.therapist,
			'The verification images are complete. We’re leaving the room now to review your alignment on the control-room monitors. Stay still and we will speak to you over the intercom before treatment begins.',
			'staff',
			12500
		);
		let done = 0;
		const atControl = () => {
			if (++done < 2) return;
			setDoorTarget('vault1', false);
			JOURNEY.vaultMonitorPatientOnly = true;
			poseCharacter(JOURNEY.therapist, 'console');
			poseCharacter(JOURNEY.vaultTherapist, 'console');
			journeyFocusActors(JOURNEY.therapist, JOURNEY.vaultTherapist, 'linaccontrol');
			journeySpeech(
				JOURNEY.controlPartner,
				'Jordan’s daily images are on screen. I’m confirming the image match, recorded couch correction, and treatment record before beam-on.',
				'staff',
				12000
			);
			later(
				() =>
					journeySpeech(
						JOURNEY.therapist,
						'The monitor review looks good. Alignment is verified and all treatment parameters are cleared. I’m going to talk with Jordan over the intercom now.',
						'staff',
						11500
					),
				8600
			);
			later(
				() =>
					journeyIntercom(
						JOURNEY.therapist,
						'Jordan, your alignment is verified. Please remain still. We are beginning your treatment now.',
						13000
					),
				17200
			);
			later(() => {
				JOURNEY.stage = 'treatment';
				JOURNEY.busy = true;
				workflowState(
					'vault1',
					'BEAM ON',
					'Treatment delivery · patient monitored remotely',
					'#ff737b'
				);
				workflowState(
					'linaccontrol',
					'MONITORING',
					'Vault 1 treatment in progress · CCTV and intercom active',
					'#ff737b'
				);
				journeyFocusActors(JOURNEY.therapist, JOURNEY.vaultTherapist, 'linaccontrol');
				journeySpeech(
					JOURNEY.therapist,
					'Beam-on has started. We are watching Jordan on the vault cameras and can communicate with him throughout treatment from the protected control area.',
					'staff',
					12000
				);
				releaseJourneyAfter(12600);
			}, 24800);
		};
		moveJourneyActor(
			JOURNEY.vaultTherapist,
			'vault1',
			'linaccontrol',
			new THREE.Vector3(50.8, 0, 8.6),
			atControl,
			1.88
		);
		moveJourneyActor(
			JOURNEY.therapist,
			'vault1',
			'linaccontrol',
			new THREE.Vector3(50.8, 0, 10.2),
			atControl,
			1.9,
			{
				followCamera: true,
				followSubject: JOURNEY.therapist,
				followTarget: JOURNEY.vaultTherapist,
				cameraOptions: { distance: 3.45, side: 1.25 }
			}
		);
	} else if (JOURNEY.stage === 'treatment') {
		JOURNEY.busy = true;
		workflowState(
			'vault1',
			'TREATMENT COMPLETE',
			'Beam delivery complete · room re-entry',
			'#65dda0'
		);
		workflowState('linaccontrol', 'COMPLETE', 'Therapists returning to Vault 1', '#65dda0');
		journeyIntercom(
			JOURNEY.therapist,
			'Jordan, your treatment is complete. Stay still and we will be back in the room in just a moment.',
			12000
		);
		setDoorTarget('vault1', true);
		let done = 0;
		const reenter = () => {
			if (++done < 2) return;
			JOURNEY.vaultMonitorPatientOnly = false;
			JOURNEY.stage = 'returning';
			JOURNEY.busy = true;
			faceNpcToward(JOURNEY.therapist, JOURNEY.couchPatient);
			faceNpcToward(JOURNEY.vaultTherapist, JOURNEY.couchPatient);
			poseCharacter(JOURNEY.therapist, 'support');
			poseCharacter(JOURNEY.vaultTherapist, 'support');
			journeyFocusActors(JOURNEY.therapist, JOURNEY.couchPatient, 'vault1');
			journeySpeech(
				JOURNEY.therapist,
				'Jordan, today’s treatment is complete. Stay where you are for a moment while we lower the couch and help you sit up safely.',
				'staff',
				7200
			);
			releaseJourneyAfter(7600);
		};
		moveJourneyActor(
			JOURNEY.vaultTherapist,
			'linaccontrol',
			'vault1',
			new THREE.Vector3(76.3, 0, -16.0),
			reenter,
			1.88
		);
		moveJourneyActor(
			JOURNEY.therapist,
			'linaccontrol',
			'vault1',
			new THREE.Vector3(76.0, 0, -14.3),
			reenter,
			1.9,
			{
				followCamera: true,
				followSubject: JOURNEY.therapist,
				followTarget: JOURNEY.vaultTherapist,
				cameraOptions: { distance: 3.45, side: 1.25 }
			}
		);
	} else if (JOURNEY.stage === 'returning') {
		JOURNEY.jordanOnCouch = false;
		JOURNEY.patient.position.set(77.0, 0, -15.25);
		setJourneySeated(false);
		applyJourneyPatientFocus();
		faceNpcToward(JOURNEY.therapist, JOURNEY.patient);
		faceNpcToward(JOURNEY.vaultTherapist, JOURNEY.patient);
		poseCharacter(JOURNEY.therapist, 'support');
		poseCharacter(JOURNEY.vaultTherapist, 'support');
		workflowState('vault1', 'ROOM TURNOVER', 'Patient leaving · room reset begins', '#42d5cf');
		journeySpeech(
			JOURNEY.therapist,
			'Everything is documented for today. Once you’re changed back into your clothes, you’re free to head out; if the fatigue changes before tomorrow, call us rather than waiting until the next appointment.',
			'staff',
			7600
		);
		JOURNEY.stage = 'departure';
		JOURNEY.busy = true;
		applyJourneyPatientFocus();
		journeyFocusActors(JOURNEY.therapist, JOURNEY.patient, 'vault1');
		releaseJourneyAfter(7800);
	} else if (JOURNEY.stage === 'departure') {
		JOURNEY.busy = true;
		workflowState('lobby', 'DEPARTING', 'Jordan Ellis · treatment complete', '#65dda0');
		workflowState('vault1', 'AVAILABLE', 'Room turnover complete', '#65dda0');
		workflowState('linaccontrol', 'READY', 'Preparing for next scheduled patient', '#42d5cf');
		journeySpeech(
			JOURNEY.therapist,
			'Take your time changing back into your clothes. We’ll head to the lobby when you’re ready.',
			'staff',
			12000
		);
		later(() => {
			setPatientGown(JOURNEY.patient, false);
			journeySpeech(JOURNEY.patient, 'I’m changed and ready to go.', 'patient', 10000);
		}, 7600);
		later(
			() =>
				moveJourneyActor(
					JOURNEY.patient,
					'vault1',
					'lobby',
					new THREE.Vector3(0, 0, 7.6),
					() => {
						JOURNEY.stage = 'done';
						JOURNEY.busy = false;
						journeyFocusActors(PRIMARY_NPCS.lobby, JOURNEY.patient, 'lobby');
						journeySpeech(
							JOURNEY.patient,
							'That went smoothly. I’ll let the team know if the fatigue changes before tomorrow.',
							'patient',
							6500
						);
						updateJourneyUI();
						toast('<b>Treatment-day journey complete.</b> Jordan has completed today’s fraction.');
					},
					1.85,
					{
						followCamera: true,
						followSubject: JOURNEY.patient,
						cameraOptions: { distance: 3.6, side: 1.25 }
					}
				),
			9800
		);
	}
}

function beginMiaConsultSequence() {
	JOURNEY.busy = true;
	JOURNEY.stage = 'waiting';
	workflowState('lobby', 'WAITING', 'Mia Reynolds · waiting for consultation', '#ffb454');
	journeySpeech(
		PRIMARY_NPCS.lobby,
		'You’re checked in, Mia. Please have a seat for a moment while the consultation room is prepared.',
		'staff',
		11000
	);
	moveJourneyActor(
		JOURNEY.newPatient,
		'lobby',
		'lobby',
		new THREE.Vector3(-6.2, 0, 3.3),
		() => {
			setActorSeated(JOURNEY.newPatient, true);
			journeyFocusActors(PRIMARY_NPCS.lobby, JOURNEY.newPatient, 'lobby');
			updateJourneyUI();
			later(() => {
				setActorSeated(JOURNEY.newPatient, false);
				workflowState(
					'consult',
					'CONSULT IN PROGRESS',
					'Initial radiation oncology consultation',
					'#6fb6ff'
				);
				moveJourneyActor(
					JOURNEY.newPatient,
					'lobby',
					'consult',
					new THREE.Vector3(-17.2, 0, -6.35),
					() => {
						JOURNEY.stage = 'consult';
						JOURNEY.busy = true;
						faceNpcToward(JOURNEY.consultStaff, JOURNEY.newPatient);
						faceNpcToward(JOURNEY.newPatient, JOURNEY.consultStaff);
						journeyFocusActors(JOURNEY.consultStaff, JOURNEY.newPatient, 'consult');
						journeySpeech(
							JOURNEY.consultStaff,
							'Mia, before we discuss scheduling, I want to review why radiation is being considered and what we are trying to accomplish with treatment.',
							'staff',
							11500
						);
						later(
							() =>
								journeySpeech(
									JOURNEY.newPatient,
									'I was worried I might be starting radiation today. I’m glad we can go through the plan first.',
									'patient',
									10500
								),
							7800
						);
						later(
							() =>
								journeySpeech(
									JOURNEY.consultStaff,
									'Today is for the treatment decision and planning. If we proceed, simulation is the next technical step so the team can reproduce your position and create a plan based on your anatomy.',
									'staff',
									12000
								),
							15800
						);
						releaseJourneyAfter(28800);
					},
					1.6,
					{
						followCamera: true,
						followSubject: JOURNEY.newPatient,
						cameraOptions: { distance: 3.5, side: 1.2 }
					}
				);
			}, 8200);
		},
		1.2
	);
}
function beginMiaFirstTreatmentReturn() {
	clearJourneyTimer();
	clearJourneyCameraFollow();
	JOURNEY.busy = true;
	JOURNEY.miaOnTable = false;
	JOURNEY.miaOnTreatmentCouch = false;
	JOURNEY.vaultMonitorPatientOnly = false;
	setPatientGown(JOURNEY.newPatient, false);
	setPatientGown(JOURNEY.miaTreatmentPatient, true);
	JOURNEY.newPatient.position.set(0.2, 0, 8.65);
	JOURNEY.newPatient.rotation.y = Math.PI;
	setActorSeated(JOURNEY.newPatient, false);
	applyJourneyPatientFocus();
	showDayTransition(
		'Tuesday · 9:15 AM',
		'Mia returns to the RTApps center for her scheduled 9:30 AM first radiation treatment.',
		5200
	);
	workflowState(
		'lobby',
		'FIRST TREATMENT ARRIVAL',
		'Mia Reynolds · 9:15 AM check-in for 9:30 AM first treatment',
		'#6fb6ff'
	);
	workflowState(
		'linaccontrol',
		'PLAN READY',
		'Mia Reynolds · approved plan · physics QA passed · Fraction 1',
		'#65dda0'
	);
	workflowState('vault1', 'AVAILABLE', 'Vault 1 prepared for Mia’s first fraction', '#65dda0');
	moveJourneyActor(
		JOURNEY.newPatient,
		'lobby',
		'lobby',
		new THREE.Vector3(-4.45, 0, -2.15),
		() => {
			JOURNEY.stage = 'firstcheckin';
			JOURNEY.busy = true;
			faceNpcToward(PRIMARY_NPCS.lobby, JOURNEY.newPatient);
			faceNpcToward(JOURNEY.newPatient, PRIMARY_NPCS.lobby);
			journeyFocusActors(PRIMARY_NPCS.lobby, JOURNEY.newPatient, 'lobby');
			journeySpeech(
				JOURNEY.newPatient,
				'Good morning. I’m back for my first radiation treatment. I was told to check in at 9:15 for my 9:30 appointment.',
				'patient',
				12500
			);
			later(
				() =>
					journeySpeech(
						PRIMARY_NPCS.lobby,
						'Good morning, Mia. You’re right on time. Your treatment appointment is on schedule, and I’ll mark you arrived so the treatment team can bring you back when the room is ready.',
						'staff',
						13500
					),
				8200
			);
			releaseJourneyAfter(22400);
		},
		1.35,
		{
			followCamera: true,
			followSubject: JOURNEY.newPatient,
			cameraOptions: { distance: 3.45, side: 1.1 }
		}
	);
}
function beginMiaFirstTreatmentPickup() {
	JOURNEY.busy = true;
	JOURNEY.stage = 'firstwaiting';
	workflowState('lobby', 'WAITING', 'Mia Reynolds · seated for first treatment', '#ffb454');
	journeySpeech(
		PRIMARY_NPCS.lobby,
		'You’re checked in, Mia. Please have a seat. The therapists now have your arrival status and will come get you shortly.',
		'staff',
		12000
	);
	moveJourneyActor(
		JOURNEY.newPatient,
		'lobby',
		'lobby',
		new THREE.Vector3(-2.8, 0, 3.4),
		() => {
			setActorSeated(JOURNEY.newPatient, true);
			applyJourneyPatientFocus();
			journeyFocusActors(PRIMARY_NPCS.lobby, JOURNEY.newPatient, 'lobby');
			later(() => {
				JOURNEY.stage = 'firstpickup';
				workflowState(
					'linaccontrol',
					'FIRST FRACTION READY',
					'Mia checked in · approved plan and simulation setup record available',
					'#6fb6ff'
				);
				journeyFocusActors(JOURNEY.therapist, JOURNEY.controlPartner, 'linaccontrol');
				journeySpeech(
					JOURNEY.controlPartner,
					'Mia Reynolds is checked in for her 9:30 first fraction. The approved plan is loaded, physics QA is complete, and the setup record from CT simulation is available.',
					'staff',
					13500
				);
				later(
					() =>
						journeySpeech(
							JOURNEY.therapist,
							'I’ll bring her back. Before setup I’ll confirm there have been no changes since simulation, then we’ll reproduce the indexed position and acquire verification imaging before treatment.',
							'staff',
							13500
						),
					9000
				);
				later(() => {
					workflowState(
						'linaccontrol',
						'PATIENT CALL',
						'Therapist leaving control to retrieve Mia',
						'#6fb6ff'
					);
					moveJourneyActor(
						JOURNEY.therapist,
						'linaccontrol',
						'lobby',
						new THREE.Vector3(-0.6, 0, 2.9),
						() => {
							faceNpcToward(JOURNEY.therapist, JOURNEY.newPatient);
							faceNpcToward(JOURNEY.newPatient, JOURNEY.therapist);
							journeyFocusActors(JOURNEY.therapist, JOURNEY.newPatient, 'lobby');
							journeySpeech(
								JOURNEY.therapist,
								'Mia? Good morning. Your first-treatment plan is ready. Before we go back, has anything changed medically or physically since your CT simulation?',
								'staff',
								13000
							);
							later(
								() =>
									journeySpeech(
										JOURNEY.newPatient,
										'No major changes. I’ve been following the instructions and I’m ready to start.',
										'patient',
										11500
									),
								8500
							);
							later(() => beginMiaFirstTreatmentEscort(), 18600);
						},
						1.68,
						{
							followCamera: true,
							followSubject: JOURNEY.therapist,
							cameraOptions: { distance: 3.45, side: 1.2 }
						}
					);
				}, 19200);
				updateJourneyUI();
			}, 7600);
		},
		1.25
	);
}
function beginMiaFirstTreatmentEscort() {
	setActorSeated(JOURNEY.newPatient, false);
	JOURNEY.stage = 'firstpickup';
	JOURNEY.busy = true;
	workflowState(
		'lobby',
		'IN TRANSIT',
		'Mia and therapist en route to treatment changing area',
		'#42d5cf'
	);
	workflowState(
		'vault1',
		'PATIENT ARRIVING',
		'Treatment team preparing simulation setup record',
		'#6fb6ff'
	);
	const cues = [
		{
			at: 0.1,
			actor: JOURNEY.therapist,
			text: 'We’ll use the same head-first supine position that was documented at simulation. I’ll explain each step again before we position you.',
			ms: 12500
		},
		{
			at: 0.36,
			actor: JOURNEY.newPatient,
			kind: 'patient',
			text: 'I remember the supports from the CT scan. Will they be set up the same way today?',
			ms: 11500
		},
		{
			at: 0.64,
			actor: JOURNEY.therapist,
			text: `Yes. Your record shows an ${MIA_SIM_SETUP.headSupport.toLowerCase()}, an ${MIA_SIM_SETUP.lowerSupport.toLowerCase()}, and the table index recorded at simulation. We’ll verify all of those before imaging.`,
			ms: 14000
		}
	];
	let atChangeCount = 0;
	const atChange = () => {
		if (++atChangeCount < 2) return;
		workflowState(
			'vault1',
			'CHANGING',
			'Mia using treatment changing area before first treatment',
			'#ffb454'
		);
		journeyFocusActors(JOURNEY.therapist, JOURNEY.newPatient, 'vault1');
		journeySpeech(
			JOURNEY.therapist,
			'This is the changing area. Take your time changing into the hospital gown. I’ll wait just outside, and we’ll enter the vault after you tell me you’re ready.',
			'staff',
			13500
		);
		later(
			() => journeySpeech(JOURNEY.newPatient, 'Okay. I’ll change now.', 'patient', 10000),
			6200
		);
		later(() => {
			setPatientGown(JOURNEY.newPatient, true);
			setPatientGown(JOURNEY.miaTreatmentPatient, true);
			journeySpeech(JOURNEY.newPatient, 'I’m changed and ready.', 'patient', 10000);
		}, 13400);
		later(() => {
			journeySpeech(
				JOURNEY.therapist,
				'Great. Now we’ll continue into Vault 1 and reproduce the setup recorded at simulation.',
				'staff',
				11500
			);
			workflowState(
				'vault1',
				'PATIENT ARRIVING',
				'Mia changed into gown · entering Vault 1',
				'#6fb6ff'
			);
			let done = 0;
			const arrived = () => {
				if (++done < 2) return;
				JOURNEY.stage = 'firstsetup';
				JOURNEY.miaOnTreatmentCouch = false;
				JOURNEY.busy = true;
				applyJourneyPatientFocus();
				workflowState(
					'vault1',
					'FIRST TREATMENT SETUP',
					'Mia standing · simulation accessories being confirmed',
					'#ffb454'
				);
				faceNpcToward(JOURNEY.therapist, JOURNEY.newPatient);
				faceNpcToward(JOURNEY.vaultTherapist, JOURNEY.newPatient);
				poseCharacter(JOURNEY.therapist, 'support');
				poseCharacter(JOURNEY.vaultTherapist, 'support');
				journeyFocusActors(JOURNEY.therapist, JOURNEY.newPatient, 'vault1');
				journeySpeech(
					JOURNEY.therapist,
					'Before you lie down, we’re checking the simulation record and placing the same indexed supports on the treatment couch. Once those are confirmed, we’ll help you into position.',
					'staff',
					14000
				);
				later(() => {
					JOURNEY.miaOnTreatmentCouch = true;
					applyJourneyPatientFocus();
					faceNpcToward(JOURNEY.therapist, JOURNEY.miaTreatmentPatient);
					faceNpcToward(JOURNEY.vaultTherapist, JOURNEY.miaTreatmentPatient);
					poseCharacter(JOURNEY.therapist, 'support');
					poseCharacter(JOURNEY.vaultTherapist, 'support');
					workflowState(
						'vault1',
						'FIRST TREATMENT SETUP',
						'Mia on couch · CT simulation position reproduced',
						'#ffb454'
					);
					journeyFocusActors(JOURNEY.vaultTherapist, JOURNEY.miaTreatmentPatient, 'vault1');
					journeySpeech(
						JOURNEY.vaultTherapist,
						`Mia is in the ${MIA_SIM_SETUP.position} position. The indexed supports and couch index match the simulation record, and the reference marks are aligned.`,
						'staff',
						14500
					);
					later(
						() =>
							journeySpeech(
								JOURNEY.therapist,
								'This is why the simulation setup was documented so carefully: today we can reproduce the same geometry before we compare verification images with the treatment reference.',
								'staff',
								14000
							),
						9400
					);
					releaseJourneyAfter(24800);
				}, 14200);
			};
			moveJourneyActor(
				JOURNEY.therapist,
				'vault1',
				'vault1',
				new THREE.Vector3(76.0, 0, -14.25),
				arrived,
				1.48
			);
			moveJourneyActor(
				JOURNEY.newPatient,
				'vault1',
				'vault1',
				new THREE.Vector3(76.7, 0, -15.25),
				arrived,
				1.5,
				{
					followCamera: true,
					followSubject: JOURNEY.newPatient,
					followTarget: JOURNEY.therapist,
					cameraOptions: { distance: 3.65, side: 1.35, lead: 1.0 }
				}
			);
		}, 22800);
	};
	moveJourneyActor(
		JOURNEY.therapist,
		'lobby',
		'vault1',
		new THREE.Vector3(69.8, 0, -15.25),
		atChange,
		1.48
	);
	moveJourneyActor(
		JOURNEY.newPatient,
		'lobby',
		'vault1',
		new THREE.Vector3(68.8, 0, -14.15),
		atChange,
		1.5,
		{
			followCamera: true,
			followSubject: JOURNEY.newPatient,
			followTarget: JOURNEY.therapist,
			cues,
			cameraOptions: { distance: 3.65, side: 1.35, lead: 1.05 }
		}
	);
}
function advanceNewPatientJourney() {
	if (!JOURNEY.active || JOURNEY.busy || S.travel) return;
	journeyActors();
	if (JOURNEY.stage === 'checkin') {
		beginMiaConsultSequence();
	} else if (JOURNEY.stage === 'consult') {
		JOURNEY.busy = true;
		workflowState('consult', 'COMPLETE', 'Consultation complete · education handoff', '#65dda0');
		workflowState(
			'education',
			'EDUCATION',
			'Navigator reviewing simulation preparation',
			'#42d5cf'
		);
		const cues = [
			{
				at: 0.2,
				actor: JOURNEY.newPatient,
				kind: 'patient',
				text: 'There was a lot of information in the consultation. What do I need to remember before simulation?',
				ms: 10500
			},
			{
				at: 0.58,
				actor: JOURNEY.navigator,
				text: 'I’ll focus on the practical pieces: preparation, clothing, whether contrast is planned, and how the simulation team will position you.',
				ms: 11500
			}
		];
		moveJourneyActor(
			JOURNEY.newPatient,
			'consult',
			'education',
			new THREE.Vector3(-40.9, 0, -6.1),
			() => {
				JOURNEY.stage = 'education';
				JOURNEY.busy = true;
				journeyFocusActors(JOURNEY.navigator, JOURNEY.newPatient, 'education');
				journeySpeech(
					JOURNEY.navigator,
					'At simulation, the therapists will find a position you can tolerate, make it reproducible, and document how each support is indexed.',
					'staff',
					11500
				);
				later(
					() =>
						journeySpeech(
							JOURNEY.newPatient,
							'So the setup they create today becomes the position I return to when treatment starts.',
							'patient',
							10500
						),
					7800
				);
				releaseJourneyAfter(19200);
			},
			1.55,
			{
				followCamera: true,
				followSubject: JOURNEY.newPatient,
				followTarget: JOURNEY.navigator,
				cues,
				cameraOptions: { distance: 3.5, side: 1.25 }
			}
		);
	} else if (JOURNEY.stage === 'education') {
		JOURNEY.busy = true;
		workflowState(
			'education',
			'COMPLETE',
			'Preparation reviewed · patient en route to CT changing area',
			'#65dda0'
		);
		workflowState('ctsim', 'PATIENT ARRIVAL', 'Mia approaching CT simulation', '#6fb6ff');
		const cues = [
			{
				at: 0.12,
				actor: JOURNEY.navigator,
				text: 'The simulation team has your order. I’ll take you to the CT area and show you where to change before the scan.',
				ms: 11000
			},
			{
				at: 0.42,
				actor: JOURNEY.newPatient,
				kind: 'patient',
				text: 'I’m a little nervous about whether I’ll be able to stay still long enough.',
				ms: 10500
			},
			{
				at: 0.7,
				actor: JOURNEY.navigator,
				text: 'Tell the therapists before you get onto the table. They can adjust the supports first so the position is reproducible without making you uncomfortable.',
				ms: 11500
			}
		];
		let changeCount = 0;
		const atChanging = () => {
			if (++changeCount < 2) return;
			workflowState('ctsim', 'CHANGING', 'Mia using CT patient changing area', '#ffb454');
			journeyFocusActors(JOURNEY.navigator, JOURNEY.newPatient, 'ctsim');
			journeySpeech(
				JOURNEY.navigator,
				'This is the CT changing area. Take your time changing into the hospital gown. I’ll give you privacy and wait just outside.',
				'staff',
				13000
			);
			later(
				() => journeySpeech(JOURNEY.newPatient, 'Okay. I’ll change now.', 'patient', 10000),
				6200
			);
			later(() => {
				setPatientGown(JOURNEY.newPatient, true);
				setPatientGown(JOURNEY.ctSimPatient, true);
				journeySpeech(
					JOURNEY.newPatient,
					'I’m changed and ready for the simulation.',
					'patient',
					10500
				);
			}, 13500);
			later(() => {
				journeySpeech(
					JOURNEY.navigator,
					'Great. We’ll go into the CT room now and meet the simulation therapist.',
					'staff',
					11000
				);
				let arrived = 0;
				const inCt = () => {
					if (++arrived < 2) return;
					JOURNEY.stage = 'ctsetup';
					JOURNEY.miaOnTable = false;
					JOURNEY.busy = true;
					applyJourneyPatientFocus();
					workflowState(
						'ctsim',
						'PRE-POSITIONING',
						'Therapist reviewing setup before Mia gets on the table',
						'#ffb454'
					);
					journeyFocusActors(JOURNEY.ctTherapist, JOURNEY.newPatient, 'ctsim');
					faceNpcToward(JOURNEY.ctTherapist, JOURNEY.newPatient);
					faceNpcToward(JOURNEY.newPatient, JOURNEY.ctTherapist);
					journeySpeech(
						JOURNEY.ctTherapist,
						'Mia, before you get on the CT table, I’ll explain the position we need and show you where your head, arms, and legs will be supported. Tell me immediately if anything feels strained or difficult to maintain.',
						'staff',
						12000
					);
					later(() => {
						JOURNEY.miaOnTable = true;
						applyJourneyPatientFocus();
						faceNpcToward(JOURNEY.ctTherapist, JOURNEY.ctSimPatient);
						poseCharacter(JOURNEY.ctTherapist, 'support');
						workflowState('ctsim', 'SETUP', 'Mia on CT table · supports being adjusted', '#ffb454');
						journeyFocusActors(JOURNEY.ctTherapist, JOURNEY.ctSimPatient, 'ctsim');
						journeySpeech(
							JOURNEY.ctTherapist,
							'Now that you’re on the table, I’m adjusting the supports and indexing them so we can reproduce this position later. Try to relax while I make the final adjustments.',
							'staff',
							12000
						);
						later(
							() =>
								journeySpeech(
									JOURNEY.ctSimPatient,
									'This position feels comfortable. I can stay like this for the scan.',
									'patient',
									10500
								),
							8200
						);
						later(
							() =>
								journeySpeech(
									JOURNEY.ctTherapist,
									'Good. I’ll record the indexing and reference information, then we’ll step into the control room for the planning scan.',
									'staff',
									11500
								),
							16800
						);
						releaseJourneyAfter(29200);
					}, 12800);
				};
				moveJourneyActor(
					JOURNEY.navigator,
					'ctsim',
					'ctsim',
					new THREE.Vector3(39.8, 0, -6.7),
					inCt,
					1.28
				);
				moveJourneyActor(
					JOURNEY.newPatient,
					'ctsim',
					'ctsim',
					new THREE.Vector3(40.4, 0, -7.2),
					inCt,
					1.3,
					{
						followCamera: true,
						followSubject: JOURNEY.newPatient,
						followTarget: JOURNEY.navigator,
						cameraOptions: { distance: 3.6, side: 1.25 }
					}
				);
			}, 22600);
		};
		moveJourneyActor(
			JOURNEY.navigator,
			'education',
			'ctsim',
			new THREE.Vector3(38.0, 0, -4.7),
			atChanging,
			1.43
		);
		moveJourneyActor(
			JOURNEY.newPatient,
			'education',
			'ctsim',
			new THREE.Vector3(37.15, 0, -4.7),
			atChanging,
			1.45,
			{
				followCamera: true,
				followSubject: JOURNEY.newPatient,
				followTarget: JOURNEY.navigator,
				cues,
				cameraOptions: { distance: 3.7, side: 1.35 }
			}
		);
	} else if (JOURNEY.stage === 'ctsetup') {
		JOURNEY.busy = true;
		JOURNEY.miaOnTable = true;
		applyJourneyPatientFocus();
		faceNpcToward(JOURNEY.ctTherapist, JOURNEY.ctSimPatient);
		workflowState('ctsim', 'SCANNING', 'Planning CT acquisition underway', '#ffb454');
		workflowState('ctcontrol', 'SCANNING', 'Therapists monitoring Mia and the scan', '#ffb454');
		journeyFocusActors(JOURNEY.ctTherapist, JOURNEY.ctSimPatient, 'ctsim');
		journeySpeech(
			JOURNEY.ctTherapist,
			'Your setup is documented and you are ready for imaging. We’re going behind the glass now. Stay in this position; you’ll hear us over the intercom before the scan begins.',
			'staff',
			12000
		);
		later(() => {
			let done = 0;
			const atControl = () => {
				if (++done < 2) return;
				JOURNEY.stage = 'ctscan';
				JOURNEY.busy = true;
				focusCtPatientFromControl();
				startCtCouchScan();
				journeySpeech(
					JOURNEY.ctControlTherapist,
					'Mia is centered and the scan extent is set. Watch the tabletop move her through the gantry while we acquire the planning CT; we can see her continuously through the observation window and can stop if she needs assistance.',
					'staff',
					14500
				);
				later(
					() =>
						journeyIntercom(
							JOURNEY.ctControlTherapist,
							'Mia, we are ready to begin the scan. Please remain still while the table moves through the scanner.',
							13000
						),
					3800
				);
				releaseJourneyAfter(19000);
			};
			moveJourneyActor(
				JOURNEY.ctTherapist,
				'ctsim',
				'ctcontrol',
				new THREE.Vector3(32.3, 0, -7.2),
				atControl,
				1.55
			);
			moveJourneyActor(
				JOURNEY.ctControlTherapist,
				'ctcontrol',
				'ctcontrol',
				new THREE.Vector3(31.1, 0, -7.8),
				atControl,
				1.25
			);
		}, 10800);
	} else if (JOURNEY.stage === 'ctscan') {
		JOURNEY.busy = true;
		workflowState('ctsim', 'COMPLETE', 'Planning CT complete · patient assistance', '#65dda0');
		workflowState(
			'ctcontrol',
			'COMPLETE',
			'Images ready for physician / dosimetry review',
			'#65dda0'
		);
		journeyIntercom(
			JOURNEY.ctControlTherapist,
			'Mia, the scan is complete. Stay still for a moment while we come back into the room to help you off the table.',
			12500
		);
		moveJourneyActor(
			JOURNEY.ctTherapist,
			'ctcontrol',
			'ctsim',
			new THREE.Vector3(41.2, 0, -8.4),
			() => {
				JOURNEY.stage = 'ctdone';
				JOURNEY.miaOnTable = true;
				JOURNEY.busy = true;
				applyJourneyPatientFocus();
				faceNpcToward(JOURNEY.ctTherapist, JOURNEY.ctSimPatient);
				poseCharacter(JOURNEY.ctTherapist, 'support');
				journeyFocusActors(JOURNEY.ctTherapist, JOURNEY.ctSimPatient, 'ctsim');
				journeySpeech(
					JOURNEY.ctTherapist,
					'The scan is complete, Mia. Stay where you are while I remove the supports and help you sit up safely.',
					'staff',
					11000
				);
				later(
					() =>
						journeySpeech(
							JOURNEY.ctSimPatient,
							'Okay. What happens with the images after I leave?',
							'patient',
							10500
						),
					7600
				);
				later(
					() =>
						journeySpeech(
							JOURNEY.ctTherapist,
							'They go to treatment planning. Your physician, dosimetry, and physics teams will use the CT and today’s setup information to build and verify the plan before your first treatment.',
							'staff',
							12000
						),
					15400
				);
				releaseJourneyAfter(27600);
			},
			1.55,
			{
				followCamera: true,
				followSubject: JOURNEY.ctTherapist,
				cameraOptions: { distance: 3.4, side: 1.2 }
			}
		);
	} else if (JOURNEY.stage === 'ctdone') {
		JOURNEY.busy = true;
		JOURNEY.miaOnTable = false;
		JOURNEY.newPatient.position.set(41.0, 0, -7.2);
		setActorSeated(JOURNEY.newPatient, false);
		JOURNEY.stage = 'instructions';
		applyJourneyPatientFocus();
		journeySpeech(
			JOURNEY.ctTherapist,
			'Take a few minutes in the changing area to get back into your clothes. I’ll wait here, and then we’ll review your instructions before you leave.',
			'staff',
			12500
		);
		later(() => {
			setPatientGown(JOURNEY.newPatient, false);
			journeySpeech(
				JOURNEY.newPatient,
				'I’m changed and ready for the instructions.',
				'patient',
				10500
			);
		}, 8500);
		faceNpcToward(JOURNEY.ctTherapist, JOURNEY.newPatient);
		poseCharacter(JOURNEY.ctTherapist, 'support');
		workflowState(
			'ctsim',
			'DISCHARGE INSTRUCTIONS',
			'Simulation complete · first-treatment instructions',
			'#6fb6ff'
		);
		journeyFocusActors(JOURNEY.ctTherapist, JOURNEY.newPatient, 'ctsim');
		journeySpeech(
			JOURNEY.ctTherapist,
			'You’re safely off the table, Mia. Today’s simulation is finished. Unless your physician or nurse gave you different instructions, you can return to your usual activities. If we placed temporary setup marks, avoid scrubbing them off, and call us if you have a new medical concern before treatment starts.',
			'staff',
			14500
		);
		later(
			() =>
				journeySpeech(
					JOURNEY.ctTherapist,
					'For this simulated schedule, your first radiation treatment is Tuesday at 9:30 AM. Please check in here by 9:15 AM. The first treatment visit may take a little longer because we will reproduce today’s setup and perform verification imaging before treatment.',
					'staff',
					15000
				),
			9800
		);
		later(
			() =>
				journeySpeech(
					JOURNEY.newPatient,
					'So I should be back at 9:15 AM Tuesday for a 9:30 treatment, and I should let the team know if anything changes before then.',
					'patient',
					12500
				),
			20200
		);
		later(
			() =>
				journeySpeech(
					JOURNEY.ctTherapist,
					'Exactly. Bring any questions with you, and continue any preparation instructions your care team gave you. I’ll walk you back to reception so you know where to check in when you return.',
					'staff',
					14000
				),
			29200
		);
		later(() => {
			JOURNEY.stage = 'escort';
			workflowState('ctsim', 'COMPLETE', 'Mia discharged from CT simulation', '#65dda0');
			workflowState(
				'lobby',
				'RETURNING TO LOBBY',
				'Mia Reynolds · escorted after simulation',
				'#42d5cf'
			);
			const cues = [
				{
					at: 0.24,
					actor: JOURNEY.ctTherapist,
					text: 'On your first treatment day, we’ll verify your identity and setup again before anything is delivered.',
					ms: 12000
				},
				{
					at: 0.62,
					actor: JOURNEY.newPatient,
					kind: 'patient',
					text: 'That helps. I’ll plan to arrive early and check in at the same desk.',
					ms: 11000
				}
			];
			let arrived = 0;
			const lobbyArrival = () => {
				if (++arrived < 2) return;
				JOURNEY.busy = true;
				journeyFocusActors(JOURNEY.ctTherapist, JOURNEY.newPatient, 'lobby');
				journeySpeech(
					JOURNEY.ctTherapist,
					'Here we are back at reception. This is where you’ll check in at 9:15 AM Tuesday. You’re finished for today, Mia.',
					'staff',
					13500
				);
				later(
					() =>
						journeySpeech(
							JOURNEY.newPatient,
							'Thank you. I’ll see the team Tuesday morning.',
							'patient',
							11000
						),
					9000
				);
				later(() => {
					workflowState('lobby', 'DEPARTING', 'Mia Reynolds · visit complete', '#65dda0');
					moveJourneyActor(
						JOURNEY.newPatient,
						'lobby',
						'lobby',
						new THREE.Vector3(0, 0, 8.9),
						() => {
							workflowState(
								'lobby',
								'COMPLETE',
								'Mia Reynolds · exited after CT simulation',
								'#65dda0'
							);
							journeySpeech(
								JOURNEY.newPatient,
								'I have my return time and know where to check in.',
								'patient',
								10500
							);
							JOURNEY.stage = 'plantransfer';
							JOURNEY.busy = true;
							updateJourneyUI();
							later(() => beginMiaPlanningHandoff(), 11200);
						},
						1.35,
						{
							followCamera: true,
							followSubject: JOURNEY.newPatient,
							cameraOptions: { distance: 3.4, side: 1.0 }
						}
					);
				}, 20500);
			};
			moveJourneyActor(
				JOURNEY.newPatient,
				'ctsim',
				'lobby',
				new THREE.Vector3(0.35, 0, 4.2),
				lobbyArrival,
				1.48,
				{
					followCamera: true,
					followSubject: JOURNEY.newPatient,
					followTarget: JOURNEY.ctTherapist,
					cues,
					cameraOptions: { distance: 3.7, side: 1.25 }
				}
			);
			moveJourneyActor(
				JOURNEY.ctTherapist,
				'ctsim',
				'lobby',
				new THREE.Vector3(-0.65, 0, 3.65),
				lobbyArrival,
				1.43,
				{ followCamera: false }
			);
		}, 41800);
		updateJourneyUI();
	} else if (JOURNEY.stage === 'firstreturn') {
		beginMiaFirstTreatmentReturn();
	} else if (JOURNEY.stage === 'firstcheckin') {
		beginMiaFirstTreatmentPickup();
	} else if (JOURNEY.stage === 'firstsetup') {
		JOURNEY.busy = true;
		JOURNEY.miaOnTreatmentCouch = true;
		applyJourneyPatientFocus();
		faceNpcToward(JOURNEY.therapist, JOURNEY.miaTreatmentPatient);
		faceNpcToward(JOURNEY.vaultTherapist, JOURNEY.miaTreatmentPatient);
		workflowState(
			'vault1',
			'VERIFICATION IMAGING',
			'Fraction 1 · simulation setup reproduced · image verification underway',
			'#6fb6ff'
		);
		journeyFocusActors(JOURNEY.therapist, JOURNEY.miaTreatmentPatient, 'vault1');
		journeySpeech(
			JOURNEY.therapist,
			'The simulation setup has been reproduced. We’ll acquire verification images now and compare Mia’s current treatment position with the approved reference before any radiation is delivered.',
			'staff',
			14000
		);
		later(
			() =>
				journeySpeech(
					JOURNEY.vaultTherapist,
					'The image review confirms the first-treatment position is acceptable for this simulated workflow. The next step is to clear the room and prepare for treatment delivery.',
					'staff',
					14000
				),
			9500
		);
		JOURNEY.stage = 'firstimaging';
		releaseJourneyAfter(24200);
	} else if (JOURNEY.stage === 'firstimaging') {
		JOURNEY.busy = true;
		workflowState(
			'vault1',
			'READY TO TREAT',
			'Fraction 1 · verification complete · therapists moving to treatment control',
			'#ffb454'
		);
		workflowState(
			'linaccontrol',
			'IMAGE REVIEW',
			'Mia Reynolds · first-fraction alignment under therapist review',
			'#6fb6ff'
		);
		journeySpeech(
			JOURNEY.therapist,
			'Your verification imaging is complete, Mia. We’re stepping out now to review the alignment on the control-room monitors. Stay in this position; we can see and hear you the entire time.',
			'staff',
			14000
		);
		let done = 0;
		const atControl = () => {
			if (++done < 2) return;
			setDoorTarget('vault1', false);
			JOURNEY.vaultMonitorPatientOnly = true;
			poseCharacter(JOURNEY.therapist, 'console');
			poseCharacter(JOURNEY.vaultTherapist, 'console');
			journeyFocusActors(JOURNEY.therapist, JOURNEY.vaultTherapist, 'linaccontrol');
			journeySpeech(
				JOURNEY.vaultTherapist,
				'Mia’s setup images are displayed. I’m confirming the first-treatment match and the plan parameters before we begin fraction one.',
				'staff',
				13500
			);
			later(
				() =>
					journeySpeech(
						JOURNEY.therapist,
						'The control-room review is complete. The approved plan, reproduced setup, and image verification all agree. I’ll let Mia know we are about to start.',
						'staff',
						13000
					),
				9200
			);
			later(
				() =>
					journeyIntercom(
						JOURNEY.therapist,
						'Mia, your setup and imaging are verified. Please continue to hold still. We are starting your first treatment now.',
						14000
					),
				18600
			);
			later(() => {
				JOURNEY.stage = 'firsttreatment';
				JOURNEY.busy = true;
				workflowState('vault1', 'BEAM ON', 'Mia Reynolds · first fraction in progress', '#ff737b');
				workflowState(
					'linaccontrol',
					'MONITORING',
					'Mia Reynolds · Fraction 1 · CCTV and intercom active',
					'#ff737b'
				);
				journeyFocusActors(JOURNEY.therapist, JOURNEY.vaultTherapist, 'linaccontrol');
				journeySpeech(
					JOURNEY.therapist,
					'Mia’s identity, approved plan, reproduced setup, and verification imaging are complete. Fraction 1 is now being delivered while we monitor her and the treatment system from the protected control area.',
					'staff',
					15000
				);
				releaseJourneyAfter(15800);
			}, 26800);
		};
		moveJourneyActor(
			JOURNEY.vaultTherapist,
			'vault1',
			'linaccontrol',
			new THREE.Vector3(50.8, 0, 8.6),
			atControl,
			1.82
		);
		moveJourneyActor(
			JOURNEY.therapist,
			'vault1',
			'linaccontrol',
			new THREE.Vector3(50.8, 0, 10.2),
			atControl,
			1.84,
			{
				followCamera: true,
				followSubject: JOURNEY.therapist,
				followTarget: JOURNEY.vaultTherapist,
				cameraOptions: { distance: 3.45, side: 1.25 }
			}
		);
	} else if (JOURNEY.stage === 'firsttreatment') {
		JOURNEY.busy = true;
		workflowState(
			'vault1',
			'FIRST FRACTION COMPLETE',
			'Beam delivery complete · therapist re-entry',
			'#65dda0'
		);
		workflowState(
			'linaccontrol',
			'COMPLETE',
			'Fraction 1 recorded · therapists returning to Mia',
			'#65dda0'
		);
		journeyIntercom(
			JOURNEY.therapist,
			'Mia, your first treatment is complete. Stay still and we will come back into the room to help you sit up.',
			12500
		);
		setDoorTarget('vault1', true);
		let done = 0;
		const reenter = () => {
			if (++done < 2) return;
			JOURNEY.vaultMonitorPatientOnly = false;
			JOURNEY.stage = 'firstcomplete';
			JOURNEY.busy = true;
			faceNpcToward(JOURNEY.therapist, JOURNEY.miaTreatmentPatient);
			faceNpcToward(JOURNEY.vaultTherapist, JOURNEY.miaTreatmentPatient);
			poseCharacter(JOURNEY.therapist, 'support');
			poseCharacter(JOURNEY.vaultTherapist, 'support');
			journeyFocusActors(JOURNEY.therapist, JOURNEY.miaTreatmentPatient, 'vault1');
			journeySpeech(
				JOURNEY.therapist,
				'Mia, your first treatment is complete. Stay where you are while we lower the couch and help you sit up.',
				'staff',
				13000
			);
			later(
				() =>
					journeySpeech(
						JOURNEY.vaultTherapist,
						'Your first fraction has been documented. We’ll remove the setup supports and make sure you feel steady before you stand.',
						'staff',
						12500
					),
				8600
			);
			releaseJourneyAfter(21800);
		};
		moveJourneyActor(
			JOURNEY.vaultTherapist,
			'linaccontrol',
			'vault1',
			new THREE.Vector3(76.3, 0, -16.0),
			reenter,
			1.82
		);
		moveJourneyActor(
			JOURNEY.therapist,
			'linaccontrol',
			'vault1',
			new THREE.Vector3(76.0, 0, -14.3),
			reenter,
			1.84,
			{
				followCamera: true,
				followSubject: JOURNEY.therapist,
				followTarget: JOURNEY.vaultTherapist,
				cameraOptions: { distance: 3.45, side: 1.25 }
			}
		);
	} else if (JOURNEY.stage === 'firstcomplete') {
		JOURNEY.busy = true;
		JOURNEY.miaOnTreatmentCouch = false;
		JOURNEY.newPatient.position.set(77.0, 0, -15.25);
		setActorSeated(JOURNEY.newPatient, false);
		applyJourneyPatientFocus();
		faceNpcToward(JOURNEY.therapist, JOURNEY.newPatient);
		faceNpcToward(JOURNEY.vaultTherapist, JOURNEY.newPatient);
		workflowState(
			'vault1',
			'POST-TREATMENT',
			'Mia standing · first-treatment instructions',
			'#42d5cf'
		);
		journeyFocusActors(JOURNEY.therapist, JOURNEY.newPatient, 'vault1');
		journeySpeech(
			JOURNEY.therapist,
			'That completes your first fraction. You may not notice an immediate change from the radiation itself. Continue the instructions your care team gave you and tell us about new fatigue, skin changes, pain, nausea, or other symptoms as the course continues.',
			'staff',
			15000
		);
		later(
			() =>
				journeySpeech(
					JOURNEY.newPatient,
					'I understand. I’ll check in the same way for my next treatment and let the team know if anything changes.',
					'patient',
					12500
				),
			10200
		);
		JOURNEY.stage = 'firstdeparture';
		releaseJourneyAfter(23200);
	} else if (JOURNEY.stage === 'firstdeparture') {
		JOURNEY.busy = true;
		workflowState(
			'vault1',
			'ROOM TURNOVER',
			'Mia changing after treatment · room reset begins',
			'#42d5cf'
		);
		journeySpeech(
			JOURNEY.therapist,
			'Take a few minutes to change back into your clothes. I’ll wait nearby, and then I’ll walk you to reception.',
			'staff',
			12000
		);
		later(() => {
			setPatientGown(JOURNEY.newPatient, false);
			setPatientGown(JOURNEY.miaTreatmentPatient, false);
			journeySpeech(JOURNEY.newPatient, 'I’m changed and ready to head out.', 'patient', 10000);
		}, 8000);
		workflowState(
			'linaccontrol',
			'READY',
			'Fraction 1 complete · preparing next treatment',
			'#65dda0'
		);
		workflowState('lobby', 'DEPARTING', 'Mia Reynolds · first treatment complete', '#65dda0');
		let arrived = 0;
		const lobbyArrival = () => {
			if (++arrived < 2) return;
			journeyFocusActors(JOURNEY.therapist, JOURNEY.newPatient, 'lobby');
			journeySpeech(
				JOURNEY.therapist,
				'You’re all set for today, Mia. Check in here for your next scheduled treatment, and contact the department sooner if you develop a concern that should not wait until the next visit.',
				'staff',
				14000
			);
			later(() => {
				moveJourneyActor(
					JOURNEY.newPatient,
					'lobby',
					'lobby',
					new THREE.Vector3(0, 0, 8.9),
					() => {
						JOURNEY.stage = 'done';
						JOURNEY.busy = false;
						workflowState(
							'lobby',
							'COMPLETE',
							'Mia Reynolds · first treatment visit complete',
							'#65dda0'
						);
						journeySpeech(
							JOURNEY.newPatient,
							'I know how simulation, planning, and today’s setup connected to my first treatment.',
							'patient',
							12000
						);
						updateJourneyUI();
						toast(
							'<b>Mia’s longitudinal journey is complete.</b> Consultation, CT simulation, planning, physics QA, and the first radiation treatment have all been demonstrated.'
						);
					},
					1.35,
					{
						followCamera: true,
						followSubject: JOURNEY.newPatient,
						cameraOptions: { distance: 3.4, side: 1.0 }
					}
				);
			}, 14800);
		};
		later(() => {
			moveJourneyActor(
				JOURNEY.newPatient,
				'vault1',
				'lobby',
				new THREE.Vector3(0.35, 0, 4.2),
				lobbyArrival,
				1.48,
				{
					followCamera: true,
					followSubject: JOURNEY.newPatient,
					followTarget: JOURNEY.therapist,
					cameraOptions: { distance: 3.7, side: 1.25 }
				}
			);
			moveJourneyActor(
				JOURNEY.therapist,
				'vault1',
				'lobby',
				new THREE.Vector3(-0.65, 0, 3.65),
				lobbyArrival,
				1.43
			);
		}, 9800);
	}
}

function beginMiaPlanningHandoff() {
	if (!JOURNEY.active || JOURNEY.kind !== 'newpatient') return;
	clearJourneyCameraFollow();
	JOURNEY.busy = true;
	JOURNEY.stage = 'plantransfer';
	workflowState(
		'ctcontrol',
		'TRANSFER TO PLANNING',
		'Mia CT dataset + indexed setup / immobilization record sent to Dosimetry',
		'#6fb6ff'
	);
	journeyFocusActors(JOURNEY.ctControlTherapist, JOURNEY.ctControlPartner, 'ctcontrol');
	journeySpeech(
		JOURNEY.ctControlTherapist,
		'Mia has left for the day. I’m sending her planning CT together with the indexed setup, immobilization details, treatment position, and reference information to the Dosimetry suite.',
		'staff',
		14500
	);
	later(() => {
		JOURNEY.stage = 'dosimetry';
		workflowState(
			'dosimetry',
			'COMPUTER PLAN',
			'Mia Reynolds · treatment plan calculation and optimization',
			'#ffb454'
		);
		journeyFocusActors(JOURNEY.dosimetrist, JOURNEY.dosimetryPartner, 'dosimetry');
		poseCharacter(JOURNEY.dosimetrist, 'desk');
		journeySpeech(
			JOURNEY.dosimetrist,
			'The CT dataset and simulation setup are here with the physician prescription. I’m building the computer treatment plan: selecting beam geometry, calculating dose, and optimizing target coverage while limiting dose to nearby normal tissues.',
			'staff',
			15000
		);
		later(
			() =>
				journeySpeech(
					JOURNEY.dosimetrist,
					'The plan meets the planning objectives. After the radiation oncologist’s clinical approval, I’m sending the approved plan and calculation data to Medical Physics for the independent technical review.',
					'staff',
					15000
				),
			11200
		);
		later(() => {
			JOURNEY.stage = 'physicsqa';
			workflowState(
				'dosimetry',
				'SENT TO PHYSICS',
				'Approved plan transferred for technical verification',
				'#65dda0'
			);
			workflowState(
				'physics',
				'PLAN QA',
				'Mia Reynolds · physics review / required QA in progress',
				'#6fb6ff'
			);
			journeyFocusActors(JOURNEY.physicist, JOURNEY.physicsPartner, 'physics');
			poseCharacter(JOURNEY.physicist, 'desk');
			journeySpeech(
				JOURNEY.physicist,
				'I’ve received Mia’s approved treatment plan. I’m verifying prescription and plan consistency, dose calculation, machine parameters, treatment geometry, and the required QA documentation before the plan can be released.',
				'staff',
				15000
			);
			later(
				() =>
					journeySpeech(
						JOURNEY.physicist,
						'The technical checks are acceptable. For techniques requiring patient-specific measurement, that QA must also pass. This simulated plan is cleared for transfer to the treatment system.',
						'staff',
						15000
					),
				11200
			);
			later(() => {
				JOURNEY.stage = 'planrelease';
				workflowState(
					'physics',
					'QA COMPLETE',
					'Plan verified · released to treatment operations',
					'#65dda0'
				);
				workflowState(
					'linaccontrol',
					'PLAN RECEIVED',
					'Mia Reynolds · approved plan available for first treatment',
					'#65dda0'
				);
				journeyFocusActors(JOURNEY.therapist, JOURNEY.controlPartner, 'linaccontrol');
				poseCharacter(JOURNEY.therapist, 'console');
				journeySpeech(
					JOURNEY.therapist,
					'Mia’s approved and physics-verified plan is now available in Treatment Control for her Tuesday 9:30 AM appointment. Before delivery, we will still verify her identity, reproduce the indexed setup, and perform the required treatment-room imaging.',
					'staff',
					15500
				);
				later(() => {
					JOURNEY.stage = 'firstreturn';
					JOURNEY.busy = false;
					workflowState(
						'linaccontrol',
						'READY FOR FIRST TREATMENT',
						'Mia Reynolds · approved plan + physics QA available · Tuesday 9:30 AM',
						'#65dda0'
					);
					applyJourneyPatientFocus();
					updateJourneyUI();
					toast(
						'<b>Planning workflow complete.</b> Mia’s approved, physics-cleared plan is ready. Continue the journey to advance to Tuesday morning and her first treatment.'
					);
				}, 16500);
			}, 28500);
		}, 28500);
	}, 15500);
	updateJourneyUI();
}

export function makePolylineCurve(points) {
	const path = new THREE.CurvePath();
	for (let i = 0; i < points.length - 1; i++)
		path.add(new THREE.LineCurve3(points[i].clone(), points[i + 1].clone()));
	return path;
}
function focusTargetsForRoom(r) {
	const arr = ROOM_CAST[r.id] || [],
		wp = new THREE.Vector3(),
		near = (e) => {
			if (e.g.visible === false) return false;
			e.g.getWorldPosition(wp);
			return (
				Math.abs(wp.x - r.x) <= r.w / 2 + 2.2 &&
				Math.abs(wp.z - r.z) <= r.d / 2 + 2.2 &&
				!e.g.userData?.inHandoff
			);
		},
		staff = arr.filter((e) => e.kind === 'staff' && near(e)),
		patients = arr.filter((e) => e.kind === 'patient' && near(e));
	let a = staff.find((e) => e.g === PRIMARY_NPCS[ROOM_GUIDES[r.id]])?.g || staff[0]?.g,
		b = patients[0]?.g || staff[1]?.g;
	if (JOURNEY.active) {
		if (JOURNEY.kind === 'treatment') {
			if (r.id === 'lobby' && JOURNEY.patient?.visible !== false) {
				a = PRIMARY_NPCS.lobby || a;
				b = JOURNEY.patient;
			} else if (r.id === 'linaccontrol') {
				a = JOURNEY.therapist || a;
				b = JOURNEY.controlPartner || JOURNEY.vaultTherapist || b;
			} else if (r.id === 'vault1' && JOURNEY.couchPatient?.visible !== false) {
				a = JOURNEY.therapist || PRIMARY_NPCS.vault1 || a;
				b = JOURNEY.couchPatient;
			}
		} else {
			if (r.id === 'lobby' && JOURNEY.newPatient?.visible !== false) {
				a = PRIMARY_NPCS.lobby || a;
				b = JOURNEY.newPatient;
			} else if (r.id === 'consult' && JOURNEY.newPatient?.visible !== false) {
				a = JOURNEY.consultStaff || a;
				b = JOURNEY.newPatient;
			} else if (r.id === 'education' && JOURNEY.newPatient?.visible !== false) {
				a = JOURNEY.navigator || a;
				b = JOURNEY.newPatient;
			} else if (r.id === 'ctsim' && JOURNEY.ctSimPatient?.visible !== false) {
				a = JOURNEY.ctTherapist || a;
				b = JOURNEY.ctSimPatient;
			} else if (r.id === 'ctcontrol') {
				a = JOURNEY.ctControlTherapist || a;
				b = JOURNEY.ctTherapist || b;
			} else if (r.id === 'linaccontrol') {
				a = JOURNEY.therapist || a;
				b = JOURNEY.controlPartner || b;
			} else if (r.id === 'vault1' && JOURNEY.miaTreatmentPatient?.visible !== false) {
				a = JOURNEY.vaultTherapist || JOURNEY.therapist || a;
				b = JOURNEY.miaTreatmentPatient;
			} else if (r.id === 'vault1' && JOURNEY.newPatient?.visible !== false) {
				a = JOURNEY.therapist || JOURNEY.vaultTherapist || a;
				b = JOURNEY.newPatient;
			}
		}
	}
	if (!a) return null;
	const pa = new THREE.Vector3(),
		pb = new THREE.Vector3();
	a.getWorldPosition(pa);
	if (b) b.getWorldPosition(pb);
	else pb.copy(pa).add(new THREE.Vector3(0.4, 0, 0));
	return { a, b, pa, pb, target: pa.clone().add(pb).multiplyScalar(0.5).setY(1.35) };
}
function conversationCameraPose(r) {
	const f = r ? focusTargetsForRoom(r) : null;
	if (!r || !f) return null;
	let pos;
	if (r.id === 'vault1') pos = new THREE.Vector3(81.4, 1.96, -13.9);
	else if (r.id === 'vault2') pos = new THREE.Vector3(81.4, 1.96, 13.9);
	else {
		const n = r.hub ? new THREE.Vector3(0, 0, 1) : doorNormal(r),
			tangent = Math.abs(n.x) > 0.5 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
		pos = f.target.clone().add(n.clone().multiplyScalar(3.5)).add(tangent.multiplyScalar(1.55));
		pos.y = 1.85;
	}
	return { pos, target: f.target.clone(), fov: r.vault ? 58 : 54 };
}
function focusConversationCamera(key) {
	const r = roomById(key),
		pose = conversationCameraPose(r);
	if (!r || !pose) return;
	camera.position.copy(pose.pos);
	camera.fov = pose.fov;
	camera.updateProjectionMatrix();
	orbit.target.copy(pose.target);
	orbit.minDistance = 2.0;
	orbit.maxDistance = 10;
	orbit.enableZoom = true;
	orbit.enableRotate = true;
	orbit.enabled = true;
	orbit.update();
}

// Environment, wayfinding, and ambience
async function toggleAmbience() {
	initAmbience();
	if (!AMBIENCE.ctx) {
		toast('<b>Ambient audio unavailable in this browser.</b>');
		return;
	}
	try {
		if (AMBIENCE.ctx.state !== 'running') await AMBIENCE.ctx.resume();
	} catch (e) {
		toast(
			'<b>Browser audio could not be started.</b><br>Click the page once and try Ambience again.'
		);
		return;
	}
	AMBIENCE.on = !AMBIENCE.on;
	const t = AMBIENCE.ctx.currentTime;
	AMBIENCE.master.gain.cancelScheduledValues(t);
	if (AMBIENCE.on) {
		updateAmbience();
		AMBIENCE.master.gain.setTargetAtTime(ambienceProfile().master, t, 0.08);
	} else AMBIENCE.master.gain.setTargetAtTime(0, t, 0.1);
	const b = document.getElementById('ambientBtn');
	b.classList.toggle('on', AMBIENCE.on);
	b.textContent = AMBIENCE.on ? '🔊 Ambience On' : '🔇 Ambience Off';
	if (AMBIENCE.on)
		toast(
			'<b>Department ambience enabled.</b><br>You should hear a low room tone that changes between reception, CT, control, and the treatment vaults.'
		);
}

makeDirectionalSign(
	'←  PATIENT SERVICES',
	'Consult · Counseling · Education · Patient Care',
	-11.25,
	2.82,
	0,
	Math.PI / 2,
	3.7
);
makeDirectionalSign(
	'TECHNICAL / EDUCATION  ↑',
	'Physics · RadBio · Engineering · QA · Dosimetry',
	0,
	2.82,
	-9.35,
	0,
	4.2
);
makeDirectionalSign(
	'CLINICAL SERVICES  →',
	'CT Simulation · Leadership · LINAC · HDR',
	11.25,
	2.82,
	0,
	-Math.PI / 2,
	3.7
);
buildPhase5Wayfinding();

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
}
function closeEquipmentPanel() {
	document.getElementById('equipmentPanel').classList.remove('show');
}
function roomEquipmentMarkup(roomId) {
	const items = EQUIPMENT_BY_ROOM[roomId] || [];
	if (!items.length) return '';
	return `<div class="eqList"><div class="eqLabel">Clinical equipment in this area</div><div class="eqRoomButtons">${items.map((x) => `<button data-eqid="${x.id}">${x.label}</button>`).join('')}</div></div>`;
}
function bindRoomEquipmentButtons() {
	document
		.querySelectorAll('[data-eqid]')
		.forEach((b) => (b.onclick = () => showEquipmentPanel(b.dataset.eqid)));
}
export function openKioskDialog() {
	if (document.pointerLockElement) document.exitPointerLock();
	document.getElementById('kioskDialog').classList.add('show');
}
function closeKioskDialog() {
	document.getElementById('kioskDialog').classList.remove('show');
}
function startJourneyFromKiosk(kind) {
	closeKioskDialog();
	setJourneyKind(kind, true);
	setMode('guided', false);
	startTreatmentJourney();
}
buildClinicalEquipmentLayer();

// lobby branding wall
const brandCanvas = document.createElement('canvas');
brandCanvas.width = 1024;
brandCanvas.height = 256;
const bc = brandCanvas.getContext('2d');
bc.fillStyle = '#eef4f5';
bc.fillRect(0, 0, 1024, 256);
bc.fillStyle = '#143845';
bc.font = '900 104px Arial';
bc.fillText('RT', 76, 150);
bc.fillStyle = '#1d9e99';
bc.fillText('Apps', 196, 150);
bc.fillStyle = '#506872';
bc.font = '600 35px Arial';
bc.fillText('SIMULATED RADIATION THERAPY CENTER', 76, 205);
const bt = new THREE.CanvasTexture(brandCanvas);
bt.colorSpace = THREE.SRGBColorSpace;
const sign = new THREE.Mesh(
	new THREE.PlaneGeometry(5.5, 1.38),
	new THREE.MeshBasicMaterial({ map: bt })
);
sign.position.set(-6.0, 2.32, 9.89);
sign.rotation.y = Math.PI;
scene.add(sign);
monumentSign(-1.8, 14.25);

export const player = {
	pos: new THREE.Vector3(0, 1.65, 5.5),
	yaw: Math.PI,
	pitch: 0,
	locked: false
};
const keys = {};
function aimPlayerAt(target) {
	const dx = target.x - player.pos.x,
		dy = target.y - player.pos.y,
		dz = target.z - player.pos.z,
		flat = Math.hypot(dx, dz) || 0.001;
	player.yaw = Math.atan2(-dx, -dz);
	player.pitch = Math.atan2(dy, flat);
	camera.position.copy(player.pos);
	camera.lookAt(target);
}
function roomContainingWalkPoint(x, z) {
	return (
		ROOMS.find(
			(r) =>
				!r.hub &&
				x > r.x - r.w / 2 + 0.35 &&
				x < r.x + r.w / 2 - 0.35 &&
				z > r.z - r.d / 2 + 0.35 &&
				z < r.z + r.d / 2 - 0.35
		) || (x > -11.5 && x < 11.5 && z > -9.5 && z < 9.5 ? roomById('lobby') : null)
	);
}
function walkCompositionReady(r) {
	if (!r) return false;
	if (r.id === 'vault1') return player.pos.x > 75.1 && player.pos.z > -17.5;
	if (r.id === 'vault2') return player.pos.x > 75.1 && player.pos.z < 17.5;
	return true;
}
function applyWalkConversationComposition(r, reposition = false) {
	const f = focusTargetsForRoom(r);
	if (!r || !f) return;
	if (reposition) {
		const pose = roomInspectPose(r);
		player.pos.copy(pose.pos);
		player.pos.y = 1.65;
	}
	S.activeRoom = r;
	updateRoomUI(r);
	renderRoomList();
	aimPlayerAt(f.target);
	S.walkCompositionRoomId = r.id;
	document.getElementById('locText').textContent =
		`Current location: ${r.name} · conversation view`;
}
export function doorPoint(room) {
	if (room.hub) return new THREE.Vector3(...room.cam);
	return doorCenter(room, 1.66).add(doorNormal(room).multiplyScalar(0.85));
}
function approachPoint(room) {
	if (room.hub) return new THREE.Vector3(...room.cam);
	return doorCenter(room, 1.66).add(doorNormal(room).multiplyScalar(room.vault ? 4.2 : 3.1));
}
function insidePoint(room) {
	if (room.hub) return new THREE.Vector3(...room.cam);
	if (room.id === 'vault1') return new THREE.Vector3(68.25, 1.66, -18);
	if (room.id === 'vault2') return new THREE.Vector3(68.25, 1.66, 18);
	return doorCenter(room, 1.66).add(doorNormal(room).multiplyScalar(-1.25));
}
export function corridorNodesFromHub(room) {
	if (room.hub) return [];
	if (room.wing === 'patient')
		return [new THREE.Vector3(-12.8, 1.66, 0), new THREE.Vector3(room.x, 1.66, 0)];
	if (room.wing === 'technical')
		return [new THREE.Vector3(0, 1.66, -10.8), new THREE.Vector3(0, 1.66, room.z)];
	if (room.id === 'vault1')
		return [
			new THREE.Vector3(12.8, 1.66, 0),
			new THREE.Vector3(64, 1.66, 0),
			new THREE.Vector3(64, 1.66, -18),
			new THREE.Vector3(62.8, 1.66, -18)
		];
	if (room.id === 'vault2')
		return [
			new THREE.Vector3(12.8, 1.66, 0),
			new THREE.Vector3(64, 1.66, 0),
			new THREE.Vector3(64, 1.66, 18),
			new THREE.Vector3(62.8, 1.66, 18)
		];
	if (room.wing === 'treatment')
		return [
			new THREE.Vector3(12.8, 1.66, 0),
			new THREE.Vector3(TREATMENT_JUNCTION_X, 1.66, 0),
			new THREE.Vector3(TREATMENT_JUNCTION_X, 1.66, room.z)
		];
	return [new THREE.Vector3(12.8, 1.66, 0), new THREE.Vector3(room.x, 1.66, 0)];
}
function nearestCorridorProjection(pos) {
	const clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
		y = 1.66;
	const candidates = [
		{ line: 'main', p: new THREE.Vector3(clamp(pos.x, -52, 64), y, 0) },
		{ line: 'technical', p: new THREE.Vector3(0, y, clamp(pos.z, -66, 0)) },
		{ line: 'treatment', p: new THREE.Vector3(64, y, clamp(pos.z, -30, 30)) }
	];
	let best = candidates[0],
		bd = Infinity;
	for (const c of candidates) {
		const d = Math.hypot(pos.x - c.p.x, pos.z - c.p.z);
		if (d < bd) {
			bd = d;
			best = c;
		}
	}
	return best;
}
export function shortestCorridorRouteFromPosition(pos, destRoom) {
	const a = nearestCorridorProjection(pos),
		pts = [];
	const start = new THREE.Vector3(pos.x, 1.66, pos.z);
	if (start.distanceTo(a.p) > 0.25) pts.push(start, a.p.clone());
	else pts.push(start);
	if (destRoom?.hub) {
		if (a.line === 'technical') pts.push(new THREE.Vector3(0, 1.66, -10.8));
		else if (a.line === 'treatment')
			pts.push(new THREE.Vector3(64, 1.66, 0), new THREE.Vector3(12.8, 1.66, 0));
		else pts.push(new THREE.Vector3(pos.x < 0 ? -12.8 : 12.8, 1.66, 0));
		return cleanPoints(pts);
	}
	const b = corridorAnchor(destRoom);
	if (a.line === b.line) {
		pts.push(b.p.clone());
		return cleanPoints(pts);
	}
	if (a.line === 'main' && b.line === 'technical')
		pts.push(new THREE.Vector3(0, 1.66, 0), b.p.clone());
	else if (a.line === 'technical' && b.line === 'main')
		pts.push(new THREE.Vector3(0, 1.66, 0), b.p.clone());
	else if (a.line === 'main' && b.line === 'treatment')
		pts.push(new THREE.Vector3(64, 1.66, 0), b.p.clone());
	else if (a.line === 'treatment' && b.line === 'main')
		pts.push(new THREE.Vector3(64, 1.66, 0), b.p.clone());
	else if (a.line === 'technical' && b.line === 'treatment')
		pts.push(new THREE.Vector3(0, 1.66, 0), new THREE.Vector3(64, 1.66, 0), b.p.clone());
	else if (a.line === 'treatment' && b.line === 'technical')
		pts.push(new THREE.Vector3(64, 1.66, 0), new THREE.Vector3(0, 1.66, 0), b.p.clone());
	return cleanPoints(pts);
}
export function shortestCorridorRoute(srcRoom, destRoom) {
	const a = corridorAnchor(srcRoom),
		b = corridorAnchor(destRoom),
		pts = [];
	if (a.line === b.line) {
		pts.push(a.p.clone(), b.p.clone());
		return cleanPoints(pts);
	}
	if (a.line === 'main' && b.line === 'technical')
		pts.push(a.p.clone(), new THREE.Vector3(0, 1.66, 0), b.p.clone());
	else if (a.line === 'technical' && b.line === 'main')
		pts.push(a.p.clone(), new THREE.Vector3(0, 1.66, 0), b.p.clone());
	else if (a.line === 'main' && b.line === 'treatment')
		pts.push(a.p.clone(), new THREE.Vector3(64, 1.66, 0), b.p.clone());
	else if (a.line === 'treatment' && b.line === 'main')
		pts.push(a.p.clone(), new THREE.Vector3(64, 1.66, 0), b.p.clone());
	else if (a.line === 'technical' && b.line === 'treatment')
		pts.push(
			a.p.clone(),
			new THREE.Vector3(0, 1.66, 0),
			new THREE.Vector3(64, 1.66, 0),
			b.p.clone()
		);
	else if (a.line === 'treatment' && b.line === 'technical')
		pts.push(
			a.p.clone(),
			new THREE.Vector3(64, 1.66, 0),
			new THREE.Vector3(0, 1.66, 0),
			b.p.clone()
		);
	return cleanPoints(pts);
}
function branchRouteBetween(srcRoom, destRoom) {
	return shortestCorridorRoute(srcRoom, destRoom);
}
function makeRouteToApproach(dest) {
	const pts = [camera.position.clone()];
	if (S.activeRoom && !S.activeRoom.hub) {
		pts.push(doorPoint(S.activeRoom));
		if (dest.hub) {
			pts.push(
				...corridorNodesFromHub(S.activeRoom).slice().reverse(),
				HUB.clone(),
				new THREE.Vector3(...dest.cam)
			);
		} else {
			pts.push(...branchRouteBetween(S.activeRoom, dest), approachPoint(dest));
		}
	} else if (S.activeRoom?.hub) {
		if (dest.hub) pts.push(new THREE.Vector3(...dest.cam));
		else pts.push(...corridorNodesFromHub(dest), approachPoint(dest));
	} else {
		pts.push(new THREE.Vector3(0, 7.2, 15), new THREE.Vector3(0, 2.2, 5.2), HUB.clone());
		if (dest.hub) pts.push(new THREE.Vector3(...dest.cam));
		else pts.push(...corridorNodesFromHub(dest), approachPoint(dest));
	}
	return new THREE.CatmullRomCurve3(cleanPoints(pts), false, 'catmullrom', 0.18);
}
export function setDoorTarget(id, v) {
	const d = doors.get(id);
	if (d) d.target = v ? 1 : 0;
}
function beginRoutePhase(now) {
	S.travel.curve = makeRouteToApproach(S.travel.room);
	const len = S.travel.curve.getLength();
	S.travel.routeStart = now;
	S.travel.routeDuration = Math.max(5200, Math.min(14500, 3500 + len * 92));
	S.travel.phase = 'route';
	S.travel.originClosed = false;
}
function roomInspectPose(r) {
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
function enableRoomInspection(r) {
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
	document.getElementById('roomLookHint').classList.add('show');
}
function enableGuidedConversationComposition(r) {
	const pose = conversationCameraPose(r) || roomInspectPose(r);
	if (!pose) return;
	camera.fov = pose.fov || 58;
	camera.updateProjectionMatrix();
	camera.position.copy(pose.pos);
	orbit.target.copy(pose.target);
	const dist = camera.position.distanceTo(pose.target);
	orbit.minDistance = Math.max(2.2, dist * 0.58);
	orbit.maxDistance = Math.max(3.2, dist * 1.16);
	orbit.minPolarAngle = 0.42;
	orbit.maxPolarAngle = Math.PI * 0.49;
	orbit.enableZoom = true;
	orbit.enableRotate = true;
	orbit.enablePan = false;
	orbit.enabled = true;
	orbit.update();
	document.getElementById('roomLookHint').classList.add('show');
}
function disableRoomInspection() {
	document.getElementById('roomLookHint').classList.remove('show');
	if (S.mode !== 'overview') orbit.enabled = false;
}
function beginTravel(room, push = true) {
	if (!room || S.travel) return;
	if (S.activeRoom?.id === 'ctsim' && room.id !== 'ctsim') showCtQaDock(false);
	disableRoomInspection();
	if (push && S.activeRoom && S.activeRoom.id !== room.id) S.history.push(S.activeRoom.id);
	if (S.mode === 'walk' && document.pointerLockElement) document.exitPointerLock();
	const fromOverview = S.mode === 'overview';
	if (fromOverview) {
		S.mode = 'guided';
		document
			.querySelectorAll('#modeSeg button')
			.forEach((b) => b.classList.toggle('active', b.dataset.mode === 'guided'));
		document.getElementById('walkHint').classList.remove('show');
		document.getElementById('overviewNote').style.display = 'none';
		orbit.enabled = false;
		ceilings.forEach((c) => (c.visible = true));
	} else setMode('guided', false);
	document.getElementById('roomLookHint').classList.remove('show');
	orbit.enabled = false;
	const origin =
		S.activeRoom && !S.activeRoom.hub && doors.has(S.activeRoom.id) ? S.activeRoom : null;
	S.travel = {
		room,
		origin,
		phase: origin ? 'exitDoor' : 'route',
		phaseStart: performance.now(),
		originClosed: false
	};
	if (origin) setDoorTarget(origin.id, true);
	else beginRoutePhase(performance.now());
	document.getElementById('travelName').textContent = `Route to ${room.name}`;
	document.getElementById('travelPct').textContent = '0%';
	document.getElementById('travelFill').style.width = '0%';
	document.getElementById('travelHUD').classList.add('show');
	orbit.enabled = false;
	toast(`Guided route to <b>${room.name}</b>`);
}
function beginEntryPhase(now) {
	const r = S.travel.room;
	let pts = [camera.position.clone(), doorPoint(r), insidePoint(r), new THREE.Vector3(...r.cam)],
		poly = false;
	if (r.id === 'vault1') {
		const pose = conversationCameraPose(r) || roomInspectPose(r);
		pts = [
			camera.position.clone(),
			new THREE.Vector3(63.15, 1.66, -18),
			new THREE.Vector3(65.1, 1.66, -18),
			new THREE.Vector3(70.5, 1.66, -18),
			new THREE.Vector3(71.25, 1.66, -15.3),
			new THREE.Vector3(73.15, 1.66, -15.3),
			pose.pos.clone()
		];
		poly = true;
	}
	if (r.id === 'vault2') {
		const pose = conversationCameraPose(r) || roomInspectPose(r);
		pts = [
			camera.position.clone(),
			new THREE.Vector3(63.15, 1.66, 18),
			new THREE.Vector3(65.1, 1.66, 18),
			new THREE.Vector3(70.5, 1.66, 18),
			new THREE.Vector3(71.25, 1.66, 15.3),
			new THREE.Vector3(73.15, 1.66, 15.3),
			pose.pos.clone()
		];
		poly = true;
	}
	const clean = cleanPoints(pts);
	S.travel.entryCurve = poly
		? makePolylineCurve(clean)
		: new THREE.CatmullRomCurve3(clean, false, 'catmullrom', 0.16);
	S.travel.entryStart = now;
	S.travel.entryDuration = r.vault ? 4450 : r.special ? 2850 : 2350;
	S.travel.phase = 'enter';
}
function finishTravel() {
	if (!S.travel) return;
	S.activeRoom = S.travel.room;
	const arrived = S.activeRoom;
	if (arrived && !arrived.hub && doors.has(arrived.id)) {
		const id = arrived.id;
		setTimeout(() => setDoorTarget(id, false), 1500);
	}
	S.travel = null;
	document.getElementById('travelHUD').classList.remove('show');
	enableGuidedConversationComposition(arrived);
	player.pos.copy(camera.position);
	updateRoomUI(arrived);
	renderRoomList();
	document.getElementById('backBtn').disabled = !S.history.length;
	document.getElementById('locText').textContent =
		`Current location: ${arrived.name} · initial view frames the staff interaction`;
	if (arrived.id === 'lobby' && JOURNEY.introPending) setTimeout(showJourneyCheckinIntro, 350);
	updateJourneyUI();
}
function updateTravel(now) {
	if (!S.travel) return;
	const r = S.travel.room;
	if (S.travel.phase === 'exitDoor') {
		const d = doors.get(S.travel.origin.id),
			elapsed = now - S.travel.phaseStart,
			wait = (d?.openSeconds || 2) * 1000 + 500;
		document.getElementById('travelName').textContent = `Opening ${doorLabel(d?.type)}…`;
		document.getElementById('travelPct').textContent = '5%';
		document.getElementById('travelFill').style.width = '5%';
		if (elapsed >= wait) beginRoutePhase(now);
		return;
	}
	if (S.travel.phase === 'route') {
		let t = (now - S.travel.routeStart) / S.travel.routeDuration;
		t = Math.max(0, Math.min(1, t));
		const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
			p = S.travel.curve.getPoint(e),
			ahead = S.travel.curve.getPoint(Math.min(1, e + 0.01));
		camera.position.copy(p);
		if (r.vault && t > 0.78) camera.lookAt(doorCenter(r, 1.58));
		else camera.lookAt(ahead);
		if (S.travel.origin && !S.travel.originClosed && t > 0.1) {
			setDoorTarget(S.travel.origin.id, false);
			S.travel.originClosed = true;
		}
		document.getElementById('travelName').textContent = `Traveling through the center · ${r.name}`;
		document.getElementById('travelPct').textContent = `${Math.round(8 + t * 62)}%`;
		document.getElementById('travelFill').style.width = `${8 + t * 62}%`;
		if (t >= 1) {
			if (r.hub) {
				finishTravel();
				return;
			}
			setDoorTarget(r.id, true);
			S.travel.phase = 'destDoor';
			S.travel.phaseStart = now;
		}
		return;
	}
	if (S.travel.phase === 'destDoor') {
		const d = doors.get(r.id),
			elapsed = now - S.travel.phaseStart,
			wait = (d?.openSeconds || 2) * 1000 + 650;
		camera.lookAt(doorCenter(r, 1.55));
		const q = Math.min(1, elapsed / wait);
		document.getElementById('travelName').textContent = `Opening ${doorLabel(d?.type)} · ${r.name}`;
		document.getElementById('travelPct').textContent = `${Math.round(70 + q * 15)}%`;
		document.getElementById('travelFill').style.width = `${70 + q * 15}%`;
		if (elapsed >= wait) beginEntryPhase(now);
		return;
	}
	if (S.travel.phase === 'enter') {
		let t = (now - S.travel.entryStart) / S.travel.entryDuration;
		t = Math.max(0, Math.min(1, t));
		const e = t * t * (3 - 2 * t),
			p = S.travel.entryCurve.getPoint(e),
			ahead = S.travel.entryCurve.getPoint(Math.min(1, e + 0.012));
		camera.position.copy(p);
		if (r.vault) {
			const door = doorCenter(r, 1.6),
				f = focusTargetsForRoom(r),
				finalTarget = f?.target || new THREE.Vector3(r.x, 1.35, r.z);
			if (p.x < 71.0) {
				camera.lookAt(door);
			} else if (e < 0.9) {
				camera.lookAt(ahead);
			} else {
				const blend = Math.max(0, Math.min(1, (e - 0.9) / 0.1)),
					look = ahead.clone().lerp(finalTarget, blend);
				camera.lookAt(look);
			}
		} else {
			const target = new THREE.Vector3(...r.look);
			camera.lookAt(ahead.lerp(target, Math.max(0, (e - 0.72) / 0.28)));
		}
		document.getElementById('travelName').textContent = `Entering ${r.name}`;
		document.getElementById('travelPct').textContent = `${Math.round(85 + t * 15)}%`;
		document.getElementById('travelFill').style.width = `${85 + t * 15}%`;
		if (t >= 1) finishTravel();
	}
}
function updateDoors(dt) {
	doors.forEach((d) => {
		const step = dt / Math.max(0.65, d.openSeconds);
		if (d.target > d.progress) d.progress = Math.min(d.target, d.progress + step);
		else d.progress = Math.max(d.target, d.progress - step);
		const p = d.progress * d.progress * (3 - 2 * d.progress);
		if (d.type === 'patientSwing' || d.type === 'leadershipSwing') {
			d.parts[0].rotation.y = -Math.PI * 0.48 * p;
		} else if (d.type === 'technicalDouble') {
			d.parts[0].rotation.y = -Math.PI * 0.46 * p;
			d.parts[1].rotation.y = Math.PI * 0.46 * p;
		} else if (d.type === 'clinicalSlide') {
			d.parts[0].position.x = -d.gap * 0.245 - d.gap * 0.48 * p;
			d.parts[1].position.x = d.gap * 0.245 + d.gap * 0.48 * p;
		} else {
			const off = d.gap * 1.02 * p;
			d.parts.forEach((part) => (part.position.x = off));
		}
	});
}

function setMode(m, announce = true) {
	S.mode = m;
	document
		.querySelectorAll('#modeSeg button')
		.forEach((b) => b.classList.toggle('active', b.dataset.mode === m));
	document.getElementById('walkHint').classList.toggle('show', m === 'walk');
	document.getElementById('overviewNote').style.display = m === 'overview' ? 'block' : 'none';
	ceilings.forEach((c) => (c.visible = m !== 'overview'));
	if (m === 'overview') {
		document.getElementById('roomLookHint').classList.remove('show');
		if (document.pointerLockElement) document.exitPointerLock();
		camera.fov = 52;
		camera.updateProjectionMatrix();
		camera.position.set(12, 82, 92);
		orbit.target.set(8, 0, -12);
		orbit.minDistance = 18;
		orbit.maxDistance = 155;
		orbit.minPolarAngle = 0;
		orbit.maxPolarAngle = Math.PI / 2.07;
		orbit.enablePan = false;
		orbit.enabled = true;
		orbit.update();
		S.activeRoom = null;
		showCtQaDock(false);
		document.getElementById('locText').textContent = 'Overview of the full facility.';
		updateFacilityInfo();
		renderRoomList();
	} else if (m === 'walk') {
		document.getElementById('roomLookHint').classList.remove('show');
		orbit.enabled = false;
		if (S.activeRoom) {
			applyWalkConversationComposition(S.activeRoom, true);
		} else {
			player.pos.set(0, 1.65, 5.5);
			camera.position.copy(player.pos);
			const f = focusTargetsForRoom(roomById('lobby'));
			if (f) aimPlayerAt(f.target);
			else {
				player.yaw = 0;
				player.pitch = 0;
			}
		}
		if (announce)
			toast('Walk mode: use WASD and the mouse to move and look around. Press E to interact.');
	} else if (m === 'guided') {
		if (S.activeRoom && !S.travel) enableRoomInspection(S.activeRoom);
		else {
			orbit.enabled = false;
			if (!S.activeRoom && !S.travel) {
				camera.position.set(0, 1.7, 5.5);
				camera.lookAt(0, 1.35, 0);
			}
		}
	}
}

function renderRoomList() {
	const zone = document.querySelector('#zoneChips button.active')?.dataset.zone || 'all';
	const host = document.getElementById('roomList');
	host.innerHTML = '';
	ROOMS.filter((r) => zone === 'all' || r.zone === zone).forEach((r) => {
		const b = document.createElement('button');
		b.className = 'roombtn' + (S.activeRoom?.id === r.id ? ' active' : '');
		b.style.setProperty('--rc', '#' + r.color.toString(16).padStart(6, '0'));
		b.innerHTML = `<span class="dot"></span><span><div class="nm">${r.name}</div><div class="sb">${r.kicker}</div></span><span class="arr">›</span>`;
		b.onclick = () => beginTravel(r);
		host.appendChild(b);
	});
}
function updateFacilityInfo() {
	document.getElementById('infoK').textContent = 'Welcome';
	document.getElementById('infoTitle').textContent = 'RTApps Radiation Oncology Center';
	document.getElementById('infoSub').textContent =
		'Explore departments, meet the team, and follow patient journeys.';
	document.getElementById('infoBody').innerHTML =
		`<div class="desc">Explore a simulated radiation oncology center to see how patients, staff, equipment, and departments connect across the care pathway.</div><div class="meta"><div class="mcell"><span>Departments</span><b>${ROOMS.length}</b></div><div class="mcell"><span>Staff conversations</span><b>${Object.keys(STAFF_GUIDES).length}</b></div><div class="mcell"><span>Navigation</span><b>Overview · Guided · Walk</b></div><div class="mcell"><span>Activities</span><b>Talk · Equipment · Journeys</b></div></div><div class="roomIntro"><b>Quick start</b><br>Select a room from the left for Guided Travel, choose Walk to move freely, or start one of the patient journeys below.</div>`;
}

/* ===== v41 · CT / QA Procedures Lab logic ===== */
const PROC_STATE = {
	startup: false,
	laser: null,
	water: null,
	site: false,
	released: false,
	laserValues: null,
	waterValues: null
};
const PROC_SITES = {
	hn: {
		prompt:
			'Supine head-and-neck simulation. Choose the immobilization and setup elements that support reproducibility.',
		correct: ['mask', 'headrest']
	},
	breast: {
		prompt: 'Supine breast simulation with arms elevated. Choose the positioning accessories.',
		correct: ['breastboard', 'arms']
	},
	lung: {
		prompt: 'Thoracic simulation where respiratory motion may affect target position.',
		correct: ['wingboard', 'motion']
	},
	abd: {
		prompt:
			'Abdomen / pelvis simulation. Select immobilization and contrast preparation when ordered.',
		correct: ['vacbag', 'contrast']
	},
	prostate: {
		prompt:
			'Supine prostate simulation. Choose leg-positioning / immobilization support and preparation option.',
		correct: ['vacbag', 'legs']
	}
};
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
function openProcedureLab(tab = 'startup') {
	document.getElementById('procedureLab')?.classList.add('show');
	procSetTab(tab);
	procRefreshRelease();
}
function closeProcedureLab() {
	document.getElementById('procedureLab')?.classList.remove('show');
}
function procSetTab(id) {
	document
		.querySelectorAll('#procTabs button')
		.forEach((b) => b.classList.toggle('active', b.dataset.proc === id));
	document
		.querySelectorAll('.procPane')
		.forEach((p) => p.classList.toggle('active', p.dataset.pane === id));
	if (id === 'sitesim') procRenderSite();
	if (id === 'release') procRefreshRelease();
}
function procedureRoomMarkup(roomId) {
	if (roomId !== 'ctsim') return '';
	return `<div class="procRoomLaunch"><button id="procedureRoomBtn">Open CT Room Menu / QA</button></div>`;
}
function bindProcedureRoomButtons(roomId) {
	const b = document.getElementById('procedureRoomBtn');
	if (!b) return;
	b.onclick = () => {
		if (roomId === 'ctsim') showCtQaDock(true);
	};
}
function procMarkDone(id, done = true) {
	document.querySelector(`#procTabs button[data-proc="${id}"]`)?.classList.toggle('done', !!done);
}
function procSetResult(id, msg, ok = null) {
	const el = document.getElementById(id);
	if (!el) return;
	el.className = 'procResult' + (ok === true ? ' pass' : ok === false ? ' fail' : '');
	el.innerHTML = msg;
}
function procRefreshRelease() {
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
function procRenderSite() {
	const key = document.getElementById('siteCase')?.value || 'hn',
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
function procResetAll() {
	window.__rtappsVerdictLocked = false; // #73: fresh scenario re-arms the verdict buttons
	const rcBtn = document.getElementById('releaseClinical');
	if (rcBtn) rcBtn.disabled = false;
	const hcBtn = document.getElementById('holdClinical');
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
	document.querySelectorAll('[data-startup]').forEach((x) => (x.checked = false));
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

/* ===== v42 · contextual CT QA menu and animation helpers ===== */
const CT_QA_ANIM = { running: false, phase: null };
function showCtQaDock(show = true) {
	const el = document.getElementById('ctQaDock');
	if (!el) return;
	const inCt = S.activeRoom?.id === 'ctsim';
	el.classList.toggle('show', !!show && inCt);
}

function focusCtQaEquipment(ids, note) {
	try {
		setClinicalFocus(ids, note);
		setTimeout(() => {
			if (!JOURNEY?.active) clearClinicalFocus();
		}, 1600);
	} catch (e) {}
}

function qaToast(msg) {
	try {
		toast(`<b>CT QA</b> · ${msg}`);
	} catch (e) {}
}
function syncCtQaProgress() {
	const map = {
		ctQaProgStartup: PROC_STATE.startup ? 'PASS' : 'PENDING',
		ctQaProgLaser:
			PROC_STATE.laser === true ? 'PASS' : PROC_STATE.laser === false ? 'FAIL' : 'PENDING',
		ctQaProgWater:
			PROC_STATE.water === true ? 'PASS' : PROC_STATE.water === false ? 'FAIL' : 'PENDING',
		ctQaProgFinal: PROC_STATE.released ? 'RELEASED' : 'HOLD'
	};
	Object.entries(map).forEach(([id, val]) => {
		const e = document.getElementById(id);
		if (e) e.textContent = val;
	});
}
async function ctQaAnimateStartup() {
	CT_QA_ANIM.running = true;
	CT_QA_ANIM.phase = 'startup';
	qaToast('Running CT morning start-up');
	focusCtQaEquipment(['ct_scanner', 'ct_table', 'ct_lasers'], 'CT morning start-up inspection');
	flashCtScanner(1100);
	procSetTab('startup');
	openProcedureLab('startup');
	const checks = [...document.querySelectorAll('[data-startup]')];
	for (const c of checks) {
		c.checked = true;
		flashCtScanner(420);
		pulseCtObject('#roomCard', 450);
		await new Promise((r) => setTimeout(r, 350));
	}
	document.getElementById('procStartupComplete')?.click();
	syncCtQaProgress();
	CT_QA_ANIM.running = false;
}
async function ctQaAnimateLaser() {
	CT_QA_ANIM.running = true;
	CT_QA_ANIM.phase = 'laser';
	qaToast('Running CT laser QC');
	focusCtQaEquipment(['ct_lasers', 'ct_scanner'], 'Laser-to-imaging-plane QC');
	flashCtScanner(900);
	procSetTab('laser');
	openProcedureLab('laser');
	pulseCtObject('#roomEquipment', 700);
	document.getElementById('laserNew')?.click();
	await new Promise((r) => setTimeout(r, 600));
	const vals = PROC_STATE.laserValues || { lat: 0, vrt: 0, lng: 0 };
	const actual = Math.max(Math.abs(vals.lat), Math.abs(vals.vrt), Math.abs(vals.lng)) <= 2;
	document.getElementById(actual ? 'laserPass' : 'laserHold')?.click();
	syncCtQaProgress();
	CT_QA_ANIM.running = false;
}
async function ctQaAnimateWater() {
	CT_QA_ANIM.running = true;
	CT_QA_ANIM.phase = 'water';
	qaToast('Running CT water phantom QC');
	focusCtQaEquipment(['ct_scanner', 'ct_table'], 'Water phantom image-quality QC');
	flashCtScanner(1200);
	procSetTab('water');
	openProcedureLab('water');
	pulseCtObject('#roomEquipment', 850);
	document.getElementById('waterNew')?.click();
	await new Promise((r) => setTimeout(r, 600));
	const v = PROC_STATE.waterValues || { hu: 0, uniform: 0, noise: 0 };
	const actual = Math.abs(v.hu) <= 5 && Math.abs(v.uniform) <= 5 && Math.abs(v.noise) <= 10;
	document.getElementById(actual ? 'waterPass' : 'waterHold')?.click();
	syncCtQaProgress();
	CT_QA_ANIM.running = false;
}
async function runCtQaSequence() {
	if (S.activeRoom?.id !== 'ctsim') {
		qaToast('Enter the CT Simulation Room first');
		return;
	}
	window.__rtappsVerdictLocked = false; // #73: every QA launch is a new scenario, entitled to one fresh verdict
	const rcBtn = document.getElementById('releaseClinical');
	if (rcBtn) rcBtn.disabled = false;
	const hcBtn = document.getElementById('holdClinical');
	if (hcBtn) hcBtn.disabled = false;
	showCtQaDock(true);
	await ctQaAnimateStartup();
	await new Promise((r) => setTimeout(r, 500));
	await ctQaAnimateLaser();
	await new Promise((r) => setTimeout(r, 500));
	await ctQaAnimateWater();
	await new Promise((r) => setTimeout(r, 500));
	openProcedureLab('release');
	procSetTab('release');
	const all = PROC_STATE.startup && PROC_STATE.laser === true && PROC_STATE.water === true;
	document.getElementById(all ? 'releaseClinical' : 'holdClinical')?.click();
	syncCtQaProgress();
	qaToast(all ? 'CT released for simulation' : 'CT remains on hold');
}

function updateRoomUI(r) {
	document.getElementById('infoK').textContent = r.kicker;
	document.getElementById('infoTitle').textContent = r.name;
	document.getElementById('infoSub').textContent =
		r.zone === 'front'
			? 'Patient services / front of house'
			: r.zone === 'technical'
				? 'Technical and support services'
				: 'Clinical treatment services';
	const key = ROOM_GUIDES[r.id],
		guide = key ? STAFF_GUIDES[key] : null;
	const profile =
		r.id === 'vault1' || r.id === 'vault2'
			? 'Modern LINAC treatment vault'
			: r.id === 'hdr'
				? 'HDR / special procedures'
				: r.id === 'ctcontrol'
					? 'CT operator control room'
					: r.id === 'ctsim'
						? 'CT simulation'
						: 'Department area';
	const staff = guide
		? `<div class="staffCard"><div class="av">${guide.initials}</div><div><b>${guide.name}</b><span>${guide.role}</span></div></div>`
		: '';
	document.getElementById('infoBody').innerHTML =
		`<div class="desc">${r.desc}</div><div class="meta"><div class="mcell"><span>Department zone</span><b>${r.zone === 'front' ? 'Patient Services' : r.zone === 'technical' ? 'Technical / Support' : 'Clinical'}</b></div><div class="mcell"><span>Room type</span><b>${profile}</b></div></div><div class="roomIntro"><b>What happens here</b><br>${r.what}</div>${staff}${roomEquipmentMarkup(r.id)}${procedureRoomMarkup(r.id)}<div class="iactions ${guide ? 'three' : ''}">${guide ? `<button class="talk" id="talkHere">Talk with staff</button>` : ''}<button class="primary" id="travelHere">Travel / Recenter</button><button id="overviewHere">Facility Overview</button></div>`;
	document.getElementById('travelHere').onclick = () => beginTravel(r, false);
	document.getElementById('overviewHere').onclick = () => setMode('overview');
	bindRoomEquipmentButtons();
	bindProcedureRoomButtons(r.id);
	showCtQaDock(r.id === 'ctsim');
	syncCtQaProgress();
	const tb = document.getElementById('talkHere');
	if (tb) tb.onclick = () => openStaffDialogue(key);
}

function resetStaffDialogue(key) {
	const g = STAFF_GUIDES[key];
	if (!g) return;
	S.activeGuideKey = key;
	document.getElementById('staffTranscript').innerHTML = '';
	bubble('staff', g.name, g.intro);
	const q = document.getElementById('sdQuestions');
	q.innerHTML = '';
	g.questions.forEach(([question, answer], i) => {
		const b = document.createElement('button');
		b.textContent = question;
		b.onclick = () => {
			bubble('patient', 'Patient', question);
			bubble('staff', g.name, answer);
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
			if (h.patient) bubble('patient', 'Patient', h.patient);
			bubble('staff', g.name, h.staff);
			[...hh.querySelectorAll('button')].forEach((x) => (x.disabled = true));
			setTimeout(() => {
				closeStaffDialogue(false);
				startActorHandoff(key, h);
				if (h.follow && h.target) {
					setTimeout(() => {
						if (!S.travel) beginTravel(roomById(h.target));
					}, 450);
				}
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
}
function closeStaffDialogue(restore = true) {
	document.getElementById('staffDialog').classList.remove('show');
	S.activeGuideKey = null;
	if (restore && S.activeRoom && !S.travel) {
		if (S.mode === 'walk') applyWalkConversationComposition(S.activeRoom, false);
		else enableRoomInspection(S.activeRoom);
	}
}
document.getElementById('sdClose').onclick = closeStaffDialogue;
document.getElementById('sdRestart').onclick = () =>
	S.activeGuideKey && resetStaffDialogue(S.activeGuideKey);

export function toast(html) {
	const t = document.getElementById('toast');
	t.innerHTML = html;
	t.classList.add('show');
	clearTimeout(toast._t);
	toast._t = setTimeout(() => t.classList.remove('show'), 2300);
}

function requestWalkPointerLock() {
	if (S.mode !== 'walk' || document.pointerLockElement === canvas) return;
	try {
		const p = canvas.requestPointerLock?.();
		if (p && typeof p.catch === 'function') p.catch(() => {});
	} catch (_) {
		/* drag-look fallback remains available */
	}
}
function applyWalkMouseDelta(dx, dy) {
	if (S.mode !== 'walk') return;
	player.yaw -= dx * 0.0024;
	player.pitch = Math.max(-1.12, Math.min(1.12, player.pitch - dy * 0.0024));
}

/* ===== v43 · CT/QA top-level UI wiring ===== */
document.getElementById('procedureLabClose')?.addEventListener('click', closeProcedureLab);
document.getElementById('ctQaClose')?.addEventListener('click', () => showCtQaDock(false));
document.getElementById('ctQaLaunch')?.addEventListener('click', runCtQaSequence);
document.getElementById('ctQaQuickStartup')?.addEventListener('click', ctQaAnimateStartup);
document.getElementById('ctQaQuickLaser')?.addEventListener('click', ctQaAnimateLaser);
document.getElementById('ctQaQuickWater')?.addEventListener('click', ctQaAnimateWater);
document.getElementById('ctQaGoRoom')?.addEventListener('click', () => {
	if (S.activeRoom?.id !== 'ctsim' && !S.travel) beginTravel(roomById('ctsim'));
	else showCtQaDock(true);
});

document.getElementById('procedureLab')?.addEventListener('click', (e) => {
	if (e.target?.id === 'procedureLab') closeProcedureLab();
});
document
	.querySelectorAll('#procTabs button')
	.forEach((b) => b.addEventListener('click', () => procSetTab(b.dataset.proc)));

document.getElementById('procStartupComplete')?.addEventListener('click', () => {
	const checks = [...document.querySelectorAll('[data-startup]')];
	const ok = checks.length && checks.every((x) => x.checked);
	PROC_STATE.startup = ok;
	procSetResult(
		'procStartupResult',
		ok
			? '<b>PASS.</b> Required morning start-up items are complete. Proceed to quantitative QC.'
			: '<b>Incomplete.</b> Finish every start-up check before continuing.',
		ok
	);
	if (ok) {
		document.getElementById('startupScanner').textContent = 'READY';
		document.getElementById('startupQC').textContent = 'NEXT';
		document.getElementById('startupPatients').textContent = 'LOCKED';
	}
	procRefreshRelease();
});

function genLaser() {
	const vals = [-2.7, -2.3, -1.8, -1.2, -0.7, 0.4, 0.9, 1.4, 1.9, 2.4];
	const pick = () => vals[Math.floor(Math.random() * vals.length)];
	PROC_STATE.laserValues = { lat: pick(), vrt: pick(), lng: pick() };
	document.getElementById('laserLat').textContent = PROC_STATE.laserValues.lat.toFixed(1) + ' mm';
	document.getElementById('laserVrt').textContent = PROC_STATE.laserValues.vrt.toFixed(1) + ' mm';
	document.getElementById('laserLng').textContent = PROC_STATE.laserValues.lng.toFixed(1) + ' mm';
	PROC_STATE.laser = null;
	procSetResult('laserResult', 'Measurement acquired. Decide PASS or HOLD using ±2.0 mm.', null);
	procRefreshRelease();
}
document.getElementById('laserNew')?.addEventListener('click', genLaser);
function judgeLaser(choice) {
	if (!PROC_STATE.laserValues) {
		procSetResult('laserResult', 'Acquire a measurement first.', false);
		return;
	}
	const actual = Math.max(...Object.values(PROC_STATE.laserValues).map(Math.abs)) <= 2;
	const correct = (choice === 'pass') === actual;
	PROC_STATE.laser = actual;
	procSetResult(
		'laserResult',
		correct
			? actual
				? '<b>Correct: PASS.</b> All axes are within ±2.0 mm.'
				: '<b>Correct: HOLD.</b> At least one axis exceeds the training tolerance.'
			: actual
				? '<b>Reconsider.</b> All axes are within the training tolerance.'
				: '<b>Reconsider.</b> One or more axes exceed ±2.0 mm.',
		correct
	);
	procRefreshRelease();
}
document.getElementById('laserPass')?.addEventListener('click', () => judgeLaser('pass'));
document.getElementById('laserHold')?.addEventListener('click', () => judgeLaser('hold'));

function genWater() {
	const huPool = [-7, -4, -2, 0, 2, 4, 7],
		uPool = [2, 3, 4, 5, 6, 7],
		nPool = [-13, -8, -4, 2, 6, 9, 14];
	const pick = (a) => a[Math.floor(Math.random() * a.length)];
	PROC_STATE.waterValues = { hu: pick(huPool), uniform: pick(uPool), noise: pick(nPool) };
	document.getElementById('waterHU').textContent = PROC_STATE.waterValues.hu + ' HU';
	document.getElementById('waterUniform').textContent = PROC_STATE.waterValues.uniform + ' HU';
	document.getElementById('waterNoise').textContent =
		(PROC_STATE.waterValues.noise > 0 ? '+' : '') + PROC_STATE.waterValues.noise + '%';
	PROC_STATE.water = null;
	procSetResult(
		'waterResult',
		'Phantom acquired. Decide PASS or HOLD using the displayed training criteria.',
		null
	);
	procRefreshRelease();
}
document.getElementById('waterNew')?.addEventListener('click', genWater);
function judgeWater(choice) {
	if (!PROC_STATE.waterValues) {
		procSetResult('waterResult', 'Acquire the phantom first.', false);
		return;
	}
	const v = PROC_STATE.waterValues,
		actual = Math.abs(v.hu) <= 5 && Math.abs(v.uniform) <= 5 && Math.abs(v.noise) <= 10;
	const correct = (choice === 'pass') === actual;
	PROC_STATE.water = actual;
	procSetResult(
		'waterResult',
		correct
			? actual
				? '<b>Correct: PASS.</b> CT number, uniformity, and noise are within the training limits.'
				: '<b>Correct: HOLD.</b> At least one image-quality metric is outside the training limit.'
			: actual
				? '<b>Reconsider.</b> All displayed values are within the training limits.'
				: '<b>Reconsider.</b> At least one displayed value is outside the training limits.',
		correct
	);
	procRefreshRelease();
}
document.getElementById('waterPass')?.addEventListener('click', () => judgeWater('pass'));
document.getElementById('waterHold')?.addEventListener('click', () => judgeWater('hold'));

document.getElementById('siteCase')?.addEventListener('change', () => {
	PROC_STATE.site = false;
	procRenderSite();
	procRefreshRelease();
});
document.getElementById('siteValidate')?.addEventListener('click', () => {
	const key = document.getElementById('siteCase').value,
		expected = PROC_SITES[key].correct;
	const selected = [...document.querySelectorAll('input[name="siteChoice"]:checked')].map(
		(x) => x.value
	);
	const ok =
		expected.every((x) => selected.includes(x)) && selected.every((x) => expected.includes(x));
	PROC_STATE.site = ok;
	procSetResult(
		'siteResult',
		ok
			? '<b>Correct setup.</b> The selected elements match this training simulation order.'
			: `<b>Not yet.</b> Reconsider the positioning / immobilization / preparation requirements for ${document.getElementById('siteCase').selectedOptions[0].text}.`,
		ok
	);
	procRefreshRelease();
});

document.getElementById('releaseClinical')?.addEventListener('click', () => {
	if (window.__rtappsVerdictLocked) return; // #73: one verdict per scenario
	window.__rtappsVerdictLocked = true; // reset path sets this back to false
	const rcBtn = document.getElementById('releaseClinical');
	if (rcBtn) rcBtn.disabled = true;
	const hcBtn = document.getElementById('holdClinical');
	if (hcBtn) hcBtn.disabled = true;
	const all = PROC_STATE.startup && PROC_STATE.laser === true && PROC_STATE.water === true;
	PROC_STATE.released = all;
	procSetResult(
		'releaseResult',
		all
			? '<b>CT RELEASED.</b> Morning start-up and required QC support clinical use in this simulation. The CT patient workflow may proceed.'
			: '<b>Release denied.</b> Required start-up/QC is incomplete or a QC result is outside tolerance. Keep the scanner on HOLD and escalate.',
		all
	);
	procRefreshRelease();
	if (all) toast('<b>CT Simulator RELEASED</b> · patient scanning available');
	// RTApps (plan 4c): score = QA checks passed (startup, laser, water, released), of 4.
	if (window.RTApps) {
		var released = PROC_STATE.released;
		var qaScore =
			(PROC_STATE.startup ? 1 : 0) +
			(PROC_STATE.laser === true ? 1 : 0) +
			(PROC_STATE.water === true ? 1 : 0) +
			(released ? 1 : 0);
		window.RTApps.recordResult('sim-hub-qa', { score: qaScore }).catch(function () {});
	}
});
document.getElementById('holdClinical')?.addEventListener('click', () => {
	if (window.__rtappsVerdictLocked) return; // #73: one verdict per scenario
	window.__rtappsVerdictLocked = true; // reset path sets this back to false
	const rcBtn = document.getElementById('releaseClinical');
	if (rcBtn) rcBtn.disabled = true;
	const hcBtn = document.getElementById('holdClinical');
	if (hcBtn) hcBtn.disabled = true;
	PROC_STATE.released = false;
	procSetResult(
		'releaseResult',
		'<b>CT ON HOLD.</b> Clinical scanning is suspended pending review / corrective action.',
		true
	);
	procRefreshRelease();
	toast('<b>CT Simulator HOLD</b> · QC review required');
	// RTApps (plan 4c): score = QA checks passed (startup, laser, water, released), of 4.
	if (window.RTApps) {
		var released = PROC_STATE.released;
		var qaScore =
			(PROC_STATE.startup ? 1 : 0) +
			(PROC_STATE.laser === true ? 1 : 0) +
			(PROC_STATE.water === true ? 1 : 0) +
			(released ? 1 : 0);
		window.RTApps.recordResult('sim-hub-qa', { score: qaScore }).catch(function () {});
	}
});
document.getElementById('resetProcedures')?.addEventListener('click', procResetAll);
procRenderSite();
procRefreshRelease();

const studentHelp = document.getElementById('studentHelp');
const openStudentHelp = () => {
	if (document.pointerLockElement) document.exitPointerLock();
	studentHelp?.classList.add('show');
};
const closeStudentHelp = () => studentHelp?.classList.remove('show');
document.getElementById('helpBtn').onclick = openStudentHelp;
document.getElementById('studentHelpClose').onclick = closeStudentHelp;
studentHelp?.addEventListener('click', (e) => {
	if (e.target === studentHelp) closeStudentHelp();
});
document.querySelectorAll('#modeSeg button').forEach(
	(b) =>
		(b.onclick = () => {
			setMode(b.dataset.mode);
			if (b.dataset.mode === 'walk') requestWalkPointerLock();
		})
);
document.querySelectorAll('#zoneChips button').forEach(
	(b) =>
		(b.onclick = () => {
			document
				.querySelectorAll('#zoneChips button')
				.forEach((x) => x.classList.toggle('active', x === b));
			renderRoomList();
		})
);
document.getElementById('homeBtn').onclick = () => beginTravel(roomById('lobby'));
document.getElementById('backBtn').onclick = () => {
	const id = S.history.pop();
	if (id) beginTravel(roomById(id), false);
	document.getElementById('backBtn').disabled = !S.history.length;
};
document.getElementById('linacHeadClose').onclick = closeLinacHeadLab;
document.getElementById('lhPhoton').onclick = () => lhSetMode('photon');
document.getElementById('lhElectron').onclick = () => lhSetMode('electron');
document
	.querySelectorAll('[data-lhenergy]')
	.forEach((b) => (b.onclick = () => lhSetEnergy(b.dataset.lhenergy)));
document.getElementById('lhAnimate').onclick = lhAnimate;
document.getElementById('lhReset').onclick = () => lhReset();
document.getElementById('linacHeadCanvas').onclick = lhCanvasClick;
document.getElementById('linacHeadDialog').addEventListener('click', (e) => {
	if (e.target.id === 'linacHeadDialog') closeLinacHeadLab();
});
document.addEventListener('keydown', (e) => {
	if (e.key === 'Escape' && document.getElementById('linacHeadDialog').classList.contains('show'))
		closeLinacHeadLab();
});
lhUpdateText();
lhDraw();
document.getElementById('ambientBtn').onclick = toggleAmbience;
document.getElementById('eqClose').onclick = closeEquipmentPanel;
document.getElementById('clinicalFocusDetails').onclick = () =>
	CLINICAL_FOCUS.primary && showEquipmentPanel(CLINICAL_FOCUS.primary);
document.getElementById('kioskClose').onclick = closeKioskDialog;
document.getElementById('kioskTreatment').onclick = () => startJourneyFromKiosk('treatment');
document.getElementById('kioskNewPatient').onclick = () => startJourneyFromKiosk('newpatient');
document.getElementById('kioskExplore').onclick = () => {
	closeKioskDialog();
	setMode('walk');
};
document.getElementById('kioskDialog').addEventListener('click', (e) => {
	if (e.target.id === 'kioskDialog') closeKioskDialog();
});
document
	.querySelectorAll('#journeyModes button')
	.forEach((b) => (b.onclick = () => setJourneyKind(b.dataset.journey)));
document.getElementById('journeyStart').onclick = startTreatmentJourney;
document.getElementById('journeyNext').onclick = advanceTreatmentJourney;
document.getElementById('journeyReset').onclick = () => resetTreatmentJourney(false);

function bindPanelToggle(panelId, buttonId, collapsedLabel, expandedLabel) {
	const panel = document.getElementById(panelId),
		btn = document.getElementById(buttonId);
	let handle = null;
	if (panelId === 'infoPanel') {
		handle = document.createElement('button');
		handle.id = 'infoPanelHandle';
		handle.className = 'panelToggle';
		handle.style.position = 'fixed';
		handle.style.right = '8px';
		handle.style.top = '86px';
		handle.style.zIndex = '78';
		handle.style.display = 'none';
		handle.textContent = '◂';
		handle.title = 'Expand info panel';
		document.body.appendChild(handle);
		handle.onclick = () => {
			panel.classList.remove('collapsed');
			sync();
		};
	}
	function sync() {
		const collapsed = panel.classList.contains('collapsed');
		btn.textContent = collapsed ? collapsedLabel : expandedLabel;
		btn.title = collapsed
			? panelId === 'roomRail'
				? 'Expand directory'
				: 'Expand info panel'
			: panelId === 'roomRail'
				? 'Collapse directory'
				: 'Collapse info panel';
		if (handle) handle.style.display = collapsed ? 'grid' : 'none';
	}
	btn.onclick = () => {
		panel.classList.toggle('collapsed');
		sync();
	};
	sync();
}
bindPanelToggle('roomRail', 'roomRailToggle', '▸', '◂');
bindPanelToggle('infoPanel', 'infoPanelToggle', '◂', '▸');

labelRenderer.domElement.addEventListener('click', () => {
	if (S.mode === 'walk') requestWalkPointerLock();
});
canvas.addEventListener('mousedown', (e) => {
	if (S.mode === 'walk' && e.button === 0) {
		S.walkDragLook = true;
		S.walkLastX = e.clientX;
		S.walkLastY = e.clientY;
		requestWalkPointerLock();
	}
});
canvas.addEventListener('click', (e) => {
	if (S.mode === 'walk') {
		requestWalkPointerLock();
		return;
	}
	if (S.mode !== 'overview' || S.travel) return;
	const rect = canvas.getBoundingClientRect();
	mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
	mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
	raycaster.setFromCamera(mouse, camera);
	const hit = raycaster.intersectObjects(roomFloors, false)[0];
	if (hit) {
		const r = roomById(hit.object.userData.roomId);
		if (r) beginTravel(r);
	}
});
document.addEventListener('pointerlockchange', () => {
	player.locked = document.pointerLockElement === canvas;
	S.walkDragLook = false;
});
document.addEventListener('mousemove', (e) => {
	if (S.mode !== 'walk') return;
	if (player.locked) {
		applyWalkMouseDelta(e.movementX, e.movementY);
		return;
	}
	if (S.walkDragLook) {
		const dx = e.clientX - S.walkLastX,
			dy = e.clientY - S.walkLastY;
		S.walkLastX = e.clientX;
		S.walkLastY = e.clientY;
		applyWalkMouseDelta(dx, dy);
	}
});
document.addEventListener('mouseup', () => (S.walkDragLook = false));
window.addEventListener('blur', () => (S.walkDragLook = false));
document.addEventListener('keydown', (e) => {
	const k = e.key.toLowerCase();
	keys[k] = true;
	if (k === 'e' && !e.repeat) performInteraction();
});
document.addEventListener('keyup', (e) => {
	keys[e.key.toLowerCase()] = false;
});
function canMove(x, z) {
	if (x < -58 || x > 94 || z < -70 || z > 38) return false;
	const rad = 0.32;
	for (const c of colliders) {
		if (Math.abs(x - c.x) < c.hw + rad && Math.abs(z - c.z) < c.hd + rad) return false;
	}
	return true;
}
function updateWalk(dt) {
	if (S.mode !== 'walk' || S.travel) return;
	const moving = keys.w || keys.s || keys.a || keys.d;
	const speed = (keys.shift ? 6.1 : 3.35) * dt;
	let f = (keys.w ? 1 : 0) - (keys.s ? 1 : 0),
		s = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
	if (f || s) {
		const l = Math.hypot(f, s) || 1;
		f /= l;
		s /= l;
		const dx = (-Math.sin(player.yaw) * f + Math.cos(player.yaw) * s) * speed,
			dz = (-Math.cos(player.yaw) * f - Math.sin(player.yaw) * s) * speed;
		const nx = player.pos.x + dx,
			nz = player.pos.z + dz;
		if (canMove(nx, player.pos.z)) player.pos.x = nx;
		if (canMove(player.pos.x, nz)) player.pos.z = nz;
	}
	const here = roomContainingWalkPoint(player.pos.x, player.pos.z);
	if (here && walkCompositionReady(here) && S.walkCompositionRoomId !== here.id)
		applyWalkConversationComposition(here, false);
	if (!here) S.walkCompositionRoomId = null;
	const bob = moving ? Math.sin(performance.now() * 0.01 * (keys.shift ? 1.25 : 1)) * 0.022 : 0;
	camera.position.copy(player.pos);
	camera.position.y += bob;
	const dir = new THREE.Vector3(
		-Math.sin(player.yaw) * Math.cos(player.pitch),
		Math.sin(player.pitch),
		-Math.cos(player.yaw) * Math.cos(player.pitch)
	);
	camera.lookAt(camera.position.clone().add(dir));
	let nearest = null,
		nd = 99;
	ROOMS.filter((r) => !r.hub).forEach((r) => {
		const dp = doorPoint(r);
		const d = Math.hypot(player.pos.x - dp.x, player.pos.z - dp.z);
		if (d < nd) {
			nd = d;
			nearest = r;
		}
	});
	if (nearest && nd < 2.15) setDoorTarget(nearest.id, true);
	doors.forEach((d, id) => {
		if (!nearest || id !== nearest.id || nd >= 2.15) setDoorTarget(id, false);
	});
}

function animate(now) {
	requestAnimationFrame(animate);
	if (document.hidden) return;
	const dt = Math.min(0.05, clock.getDelta()),
		sec = now * 0.001,
		f = (animate._f = (animate._f || 0) + 1);
	updateDoors(dt);
	updateWalk(dt);
	updateTravel(now);
	updateMovers(sec);
	updateDutyAnimations(sec);
	updateHandoffTransitions(sec);
	updateWorkflowTransitions(sec);
	updateCtCouchMotion(sec);
	updateJourneyCameraFollow();
	if (f % 2 === 0) updateNpcExchanges(sec);
	updateAmbulance(dt, sec);
	updateStatusBeacons(sec);
	if (f % 3 === 0) updateClinicalEquipment(sec);
	updateAmbience();
	if (f % 3 === 1) updateInteractionUI();
	updateNpcLabels();
	updateJourneyRoomTiming(now);
	updateWallClocks(now);
	updatePerfFloor(dt);
	if (
		!JOURNEY.cameraFollow &&
		(S.mode === 'overview' || (S.mode === 'guided' && S.activeRoom && !S.travel))
	)
		orbit.update();
	renderOperatorLiveFeeds(now);
	renderer.render(scene, camera);
	labelRenderer.render(scene, camera);
}
renderRoomList();
updateFacilityInfo();
journeyActors();
setJourneyKind('treatment', true);
workflowState('lobby', 'OPEN', 'Routine arrivals', '#42d5cf');
workflowState('linaccontrol', 'READY', 'Treatment team available', '#42d5cf');
workflowState('vault1', 'AVAILABLE', 'Room ready for next patient', '#65dda0');
workflowState('consult', 'READY', 'Consult room available', '#42d5cf');
workflowState('education', 'READY', 'Patient education available', '#42d5cf');
workflowState('ctsim', 'AVAILABLE', 'CT simulator ready', '#65dda0');
workflowState('ctcontrol', 'READY', 'CT control ready', '#42d5cf');
workflowState('dosimetry', 'READY', 'Treatment planning workstations ready', '#42d5cf');
workflowState('physics', 'READY', 'Physics plan review available', '#42d5cf');
applyJourneyPatientFocus();
updateJourneyUI();
ceilings.forEach((c) => (c.visible = false));
requestAnimationFrame(animate);
setTimeout(() => document.getElementById('loader').classList.add('hide'), 900);
setTimeout(() => document.getElementById('studentHelp')?.classList.add('show'), 1150);
