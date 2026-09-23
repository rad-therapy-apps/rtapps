// @ts-nocheck -- verbatim legacy move; removed at TS conversion (PR 4)
import { S } from './state';
import {
	balanceDisplay,
	beamOnButton,
	bonusChallengeButton,
	bottomMachineControls,
	couchDownButton,
	couchInButton,
	couchLeftButton,
	couchOutButton,
	couchPitchMinusButton,
	couchPitchPlusButton,
	couchRightButton,
	couchRollMinusButton,
	couchRollPlusButton,
	couchTreatmentAngleMinusButton,
	couchTreatmentAnglePlusButton,
	couchUpButton,
	couchYawMinusButton,
	couchYawPlusButton,
	detectorToggleButton,
	enhancementStoreElem,
	gantryRotateMinusButton,
	gantryRotatePlusButton,
	internalViewButton,
	jawsCloseButton,
	jawsOpenButton,
	jawX1InButton,
	jawX1OutButton,
	jawX2InButton,
	jawX2OutButton,
	jawY1InButton,
	jawY1OutButton,
	jawY2InButton,
	jawY2OutButton,
	kvToggleButton,
	lasersToggleButton,
	messageArea,
	quizArea,
	quizOptionsElem,
	quizQuestionElem,
	startQuizButton,
	tabButtons,
	tabContentPanels,
	taskSelect
} from './dom';
import {
	CORE_PART_IDS,
	linacPartsData,
	setBeamState,
	setDetectorStateGame,
	setInternalView,
	setKvState,
	setLaserState,
	updateCouchAccordion,
	updateJawPositions
} from './scene';
import { fundamentalState, setCenteredJawField, syncLegacyJawValue } from './linac-safety';

export const enhancementsData = [
	{
		id: 'gantryRotation',
		name: 'Gantry Rotation System',
		cost: 100,
		description: 'Unlocks controls to rotate the LINAC gantry.',
		type: 'movement'
	},
	{
		id: 'couchVertical',
		name: 'Couch Vertical Drive',
		cost: 75,
		description: 'Unlocks controls for up/down couch movement.',
		type: 'movement'
	},
	{
		id: 'couchLongitudinal',
		name: 'Couch Longitudinal Drive',
		cost: 75,
		description: 'Unlocks controls for in/out couch movement.',
		type: 'movement'
	},
	{
		id: 'couchLateral',
		name: 'Couch Lateral Drive',
		cost: 75,
		description: 'Unlocks controls for left/right couch movement.',
		type: 'movement'
	},
	{
		id: 'couchRotation',
		name: 'Couch 6DOF Rotation Drive',
		cost: 100,
		description: 'Unlocks roll, pitch, and yaw couch corrections for 6DOF image guidance.',
		type: 'movement'
	},
	{
		id: 'collimatorJaws',
		name: 'Collimator Jaws Control',
		cost: 80,
		description: 'Unlocks controls to open/close collimator jaws.',
		type: 'movement'
	},
	{
		id: 'imagingPanel',
		name: 'Imaging Panel System',
		cost: 120,
		description: 'Unlocks ability to extend/retract the imaging panel.',
		type: 'movement'
	},
	{
		id: 'beamDelivery',
		name: 'Beam Delivery System',
		cost: 150,
		description:
			'Brings the machine online — turn the treatment beam on/off to see it emanate from the collimator.',
		type: 'operational'
	},
	{
		id: 'alignmentLasers',
		name: 'Room Alignment Lasers',
		cost: 70,
		description: 'Projects positioning lasers that intersect at the machine isocenter.',
		type: 'operational'
	}
];

// Repeatable, post-assembly income so the full store is always attainable.
const BONUS_REWARD = 25;

const BONUS_QUESTIONS = [
	{
		question: 'Which interlock prevents beam-on when the treatment room door is open?',
		options: ['Door interlock', 'Collimator interlock', 'Couch interlock', 'Wedge interlock'],
		correctAnswerIndex: 0
	},
	{
		question: 'The flattening filter in a photon beam is used to:',
		options: [
			'Generate electrons',
			'Produce a uniform beam intensity across the field',
			'Bend the electron beam',
			'Cool the target'
		],
		correctAnswerIndex: 1
	},
	{
		question: 'Monitor units are measured by which device in the treatment head?',
		options: ['Ionization chamber', 'Klystron', 'Bending magnet', 'Electron gun'],
		correctAnswerIndex: 0
	},
	{
		question: 'For photon production, accelerated electrons strike a high-atomic-number:',
		options: ['Scattering foil', 'Target', 'Wedge', 'Collimator'],
		correctAnswerIndex: 1
	},
	{
		question: 'The multileaf collimator primarily provides:',
		options: [
			'Beam flattening',
			'Conformal field shaping',
			'Electron generation',
			'Microwave amplification'
		],
		correctAnswerIndex: 1
	},
	{
		question: 'An isocentric (source-to-axis) setup keeps which distance constant to the axis?',
		options: [
			'Source-to-skin distance',
			'Source-to-axis distance',
			'Source-to-collimator distance',
			'Source-to-tray distance'
		],
		correctAnswerIndex: 1
	},
	{
		question: 'Scattering foils replace the flattening filter for which treatment mode?',
		options: ['Photon mode', 'Electron mode', 'Imaging mode', 'Standby mode'],
		correctAnswerIndex: 1
	},
	{
		question: 'Cone-beam computed tomography on a linear accelerator is acquired using the:',
		options: ['Klystron', 'Kilovoltage imaging source and panel', 'Modulator', 'Bending magnet'],
		correctAnswerIndex: 1
	},
	{
		question:
			'Both the klystron and magnetron operate in which frequency band to power the waveguide?',
		options: ['Radio (kHz)', 'Microwave (RF)', 'Infrared', 'Ultraviolet'],
		correctAnswerIndex: 1
	},
	{
		question: 'The magnetron differs from the klystron in that it:',
		options: [
			'Only amplifies microwaves',
			'Generates microwaves (an oscillator)',
			'Produces electrons',
			'Bends the beam'
		],
		correctAnswerIndex: 1
	},
	{
		question:
			'A bending magnet that turns the electron beam through roughly 270° is chosen mainly to:',
		options: [
			'Increase beam energy',
			'Achieve achromatic focusing at the target',
			'Cool the waveguide',
			'Flatten the beam'
		],
		correctAnswerIndex: 1
	},
	{
		question: 'Standard machine (IEC) convention places gantry 0° with the beam pointing:',
		options: [
			'Straight down (vertically)',
			'Toward the floor at 45°',
			'Horizontally',
			'Straight up'
		],
		correctAnswerIndex: 0
	},
	{
		question: 'The percentage depth dose increases with all of the following EXCEPT:',
		options: [
			'Higher beam energy',
			'Larger field size',
			'Greater source-to-surface distance',
			'Shallower depth beyond dmax'
		],
		correctAnswerIndex: 3
	},
	{
		question: 'As photon beam energy increases, the depth of maximum dose (dmax):',
		options: ['Moves deeper', 'Moves shallower', 'Stays at the surface', 'Is unaffected'],
		correctAnswerIndex: 0
	},
	{
		question: "The 'skin-sparing' effect of megavoltage photons is due to:",
		options: [
			'The flattening filter',
			'Dose build-up below the surface',
			'The primary collimator',
			'Beam divergence'
		],
		correctAnswerIndex: 1
	},
	{
		question: 'A physical wedge is used to:',
		options: [
			'Increase output',
			'Tilt the isodose distribution',
			'Filter electrons',
			'Shield the target'
		],
		correctAnswerIndex: 1
	},
	{
		question: 'Bolus is applied to the skin surface primarily to:',
		options: [
			'Reduce skin dose',
			'Increase surface (skin) dose',
			'Harden the beam',
			'Collimate the field'
		],
		correctAnswerIndex: 1
	},
	{
		question: 'The primary collimator in the treatment head defines the:',
		options: ['Maximum available field size', 'Minimum leaf width', 'Wedge angle', 'Couch travel'],
		correctAnswerIndex: 0
	},
	{
		question: 'Electron beams are characterized clinically by their:',
		options: [
			'Rapid dose fall-off beyond a therapeutic range',
			'Deep penetration',
			'Skin sparing',
			'Lack of a target'
		],
		correctAnswerIndex: 0
	},
	{
		question: 'Daily output constancy of a linear accelerator is typically checked with a:',
		options: [
			'Farmer chamber traceable to calibration',
			'Klystron test',
			'Gantry star shot',
			'Door interlock test'
		],
		correctAnswerIndex: 0
	},
	{
		question: 'A star-shot test is used to verify the:',
		options: [
			'Radiation and mechanical isocenter coincidence',
			'Beam energy',
			'Monitor unit linearity',
			'Couch load limit'
		],
		correctAnswerIndex: 0
	},
	{
		question: 'The waveguide must be held under high vacuum so that:',
		options: [
			'Electrons accelerate without colliding with gas molecules',
			'Microwaves are generated',
			'The target stays cool',
			'The beam is flattened'
		],
		correctAnswerIndex: 0
	},
	{
		question: 'Volumetric-modulated arc therapy delivers dose while varying:',
		options: [
			'Only the couch angle',
			'Gantry rotation, dose rate, and MLC shape simultaneously',
			'Only the jaw positions',
			'Only the beam energy'
		],
		correctAnswerIndex: 1
	},
	{
		question:
			'The circulator (isolator) between the microwave source and waveguide protects the source from:',
		options: [
			'Reflected microwave power',
			'Stray electrons',
			'Excess coolant',
			'Scattered photons'
		],
		correctAnswerIndex: 0
	}
];

export function openTab(event) {
	const tabId = event.currentTarget.dataset.tab;
	tabContentPanels.forEach((panel) => {
		panel.classList.remove('active');
		panel.style.display = 'none';
	});
	tabButtons.forEach((button) => button.classList.remove('active'));
	const el = document.getElementById(tabId);
	if (el) {
		el.classList.add('active');
		el.style.display = 'block';
	}
	event.currentTarget.classList.add('active');
}

function updateBalanceDisplay() {
	balanceDisplay.textContent = `Balance: $${S.currentBalance}`;
}

export function checkAllCorePartsEarned() {
	S.allCorePartsEarned = CORE_PART_IDS.every((id) => S.earnedParts.includes(id));
	bottomMachineControls.style.display = S.allCorePartsEarned ? 'flex' : 'none'; // Use flex for the bottom panel
	if (bonusChallengeButton)
		bonusChallengeButton.style.display = S.allCorePartsEarned ? 'block' : 'none';
	if (internalViewButton) internalViewButton.disabled = !S.allCorePartsEarned;
	if (!S.allCorePartsEarned && S.internalViewOn) setInternalView(false);
	if (S.allCorePartsEarned && !localStorage.getItem('linacFullyAssembledMessageShown_v2')) {
		showMessage(
			'LINAC assembly complete! Movement & operational enhancements now available in store.',
			'correct'
		);
		localStorage.setItem('linacFullyAssembledMessageShown_v2', 'true');
	}
}

function populateTaskSelect() {
	taskSelect.innerHTML = '';
	const availableParts = linacPartsData.filter(
		(part) => !part.isSubComponent && !S.earnedParts.includes(part.id)
	);
	if (availableParts.length === 0) {
		const option = document.createElement('option');
		option.textContent = 'All LINAC parts assembled!';
		taskSelect.appendChild(option);
		startQuizButton.disabled = true;
	} else {
		availableParts
			.sort((a, b) => a.level - b.level)
			.forEach((part) => {
				const option = document.createElement('option');
				option.value = part.id;
				option.textContent = `${part.name} (Lvl ${part.level} - Reward: $${part.cost})`;
				taskSelect.appendChild(option);
			});
		startQuizButton.disabled = false;
	}
	checkAllCorePartsEarned();
}

function renderQuiz(quizObj) {
	quizQuestionElem.textContent = quizObj.question;
	quizOptionsElem.innerHTML = '';
	quizObj.options.forEach((option, index) => {
		const input = document.createElement('input');
		input.type = 'radio';
		input.name = 'quizOption';
		input.value = index;
		input.id = `option${index}`;
		const label = document.createElement('label');
		label.htmlFor = `option${index}`;
		label.textContent = option;
		label.style.marginLeft = '5px';
		const div = document.createElement('div');
		div.classList.add('quiz-option');
		div.appendChild(input);
		div.appendChild(label);
		quizOptionsElem.appendChild(div);
	});
	quizArea.style.display = 'block';
	messageArea.textContent = '';
	messageArea.className = 'messageArea';
}

export function displayQuiz() {
	const selectedPartId = taskSelect.value;
	S.currentQuizPart = linacPartsData.find((part) => part.id === selectedPartId);
	if (!S.currentQuizPart) {
		showMessage('Please select a valid part.', 'info');
		return;
	}
	S.quizMode = 'part';
	S.activeBonus = null;
	renderQuiz(S.currentQuizPart.quiz);
}

export function displayBonusChallenge() {
	if (!S.allCorePartsEarned) {
		showMessage('Assemble the LINAC first.', 'info');
		return;
	}
	if (!S.bonusQuestionDeck.length) {
		S.bonusQuestionDeck = BONUS_QUESTIONS.map((_, i) => i);
		for (let i = S.bonusQuestionDeck.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[S.bonusQuestionDeck[i], S.bonusQuestionDeck[j]] = [
				S.bonusQuestionDeck[j],
				S.bonusQuestionDeck[i]
			];
		}
	}
	S.activeBonus = BONUS_QUESTIONS[S.bonusQuestionDeck.pop()];
	S.quizMode = 'bonus';
	S.currentQuizPart = null;
	renderQuiz(S.activeBonus);
}

export function handleSubmitAnswer() {
	const selectedOption = document.querySelector('input[name="quizOption"]:checked');
	if (!selectedOption) {
		showMessage('Please select an answer.', 'info');
		return;
	}
	const answerIndex = parseInt(selectedOption.value);

	if (S.quizMode === 'bonus') {
		if (!S.activeBonus) {
			quizArea.style.display = 'none';
			return;
		}
		if (answerIndex === S.activeBonus.correctAnswerIndex) {
			S.currentBalance += BONUS_REWARD;
			showMessage(`Correct! Continuing-education credit earned: +$${BONUS_REWARD}.`, 'correct');
			updateBalanceDisplay();
			populateEnhancementStore();
			saveGameState();
		} else {
			showMessage('Incorrect. Review the concept and try another challenge.', 'incorrect');
		}
		quizArea.style.display = 'none';
		S.activeBonus = null;
		return;
	}

	if (!S.currentQuizPart) {
		showMessage('No quiz active.', 'info');
		quizArea.style.display = 'none';
		return;
	}
	if (answerIndex === S.currentQuizPart.quiz.correctAnswerIndex) {
		showMessage(
			`Correct! You've earned the ${S.currentQuizPart.name} and $${S.currentQuizPart.cost}.`,
			'correct'
		);
		S.currentBalance += S.currentQuizPart.cost;
		S.earnedParts.push(S.currentQuizPart.id);
		if (S.currentQuizPart.threeJSObject) S.currentQuizPart.threeJSObject.visible = true;
		if (S.currentQuizPart.silhouetteObject) S.currentQuizPart.silhouetteObject.visible = false;
		linacPartsData
			.filter((p) => p.isSubComponent && p.parentPart === S.currentQuizPart.id)
			.forEach((subPart) => {
				if (subPart.threeJSObject) subPart.threeJSObject.visible = true;
			});
		updateBalanceDisplay();
		populateTaskSelect();
		populateEnhancementStore();
		saveGameState();
	} else {
		showMessage('Incorrect. Try again.', 'incorrect');
	}
	quizArea.style.display = 'none';
	S.currentQuizPart = null;
}

function showMessage(msg, type = 'info') {
	messageArea.textContent = msg;
	messageArea.className = 'messageArea';
	if (type === 'correct') messageArea.classList.add('message-correct');
	else if (type === 'incorrect') messageArea.classList.add('message-incorrect');
	else messageArea.classList.add('message-info');
}

function populateEnhancementStore() {
	enhancementStoreElem.innerHTML = '';
	const ownedCount = enhancementsData.filter((e) => S.purchasedEnhancements.includes(e.id)).length;
	const total = enhancementsData.length;

	const progress = document.createElement('div');
	progress.style.cssText = 'margin-bottom:10px; font-weight:bold;';
	progress.textContent = `Systems installed: ${ownedCount} / ${total}`;
	enhancementStoreElem.appendChild(progress);

	if (!S.allCorePartsEarned) {
		const note = document.createElement('p');
		note.style.cssText = 'color:#a94442; margin:0 0 10px;';
		note.textContent = 'Assemble the full LINAC (Assembly tab) to unlock the store.';
		enhancementStoreElem.appendChild(note);
	} else if (ownedCount === total) {
		const win = document.createElement('div');
		win.style.cssText =
			'background:#dff0d8; color:#3c763d; border:1px solid #b2dba1; border-radius:6px; padding:10px; margin-bottom:12px; font-weight:bold; text-align:center;';
		win.textContent = '🏆 Fully operational LINAC! Every system is installed — congratulations.';
		enhancementStoreElem.appendChild(win);
	} else {
		const tip = document.createElement('p');
		tip.style.cssText = 'color:#31708f; margin:0 0 10px; font-size:0.85em;';
		tip.textContent =
			'Tip: earn more credits any time with Continuing-Ed Challenges on the Assembly tab.';
		enhancementStoreElem.appendChild(tip);
	}

	const categories = [
		{ type: 'movement', label: 'Movement Systems' },
		{ type: 'operational', label: 'Operational Systems' }
	];
	categories.forEach((cat) => {
		const items = enhancementsData.filter((e) => e.type === cat.type);
		if (!items.length) return;
		const heading = document.createElement('h4');
		heading.textContent = cat.label;
		heading.style.cssText =
			'margin:12px 0 6px; color:#4a90e2; border-bottom:1px solid #ddd; padding-bottom:3px;';
		enhancementStoreElem.appendChild(heading);
		items.forEach((enh) => {
			const owned = S.purchasedEnhancements.includes(enh.id);
			const itemDiv = document.createElement('div');
			itemDiv.classList.add('store-item');
			let canPurchase = true;
			if (!S.allCorePartsEarned) canPurchase = false;
			if (owned) canPurchase = false;
			else if (S.currentBalance < enh.cost) canPurchase = false;
			itemDiv.innerHTML = `<h4>${enh.name} - $${enh.cost} ${owned ? "<span style='color:green;'>(Owned)</span>" : ''}</h4><p>${enh.description}</p>`;
			const purchaseButton = document.createElement('button');
			purchaseButton.textContent = owned ? 'Purchased' : `Purchase ($${enh.cost})`;
			purchaseButton.disabled = !canPurchase || owned;
			if (purchaseButton.disabled && !owned) {
				let title = '';
				if (!S.allCorePartsEarned) title += 'Assemble LINAC first. ';
				if (S.currentBalance < enh.cost) title += 'Not enough funds.';
				purchaseButton.title = title.trim();
			}
			purchaseButton.onclick = () => purchaseEnhancement(enh.id);
			itemDiv.appendChild(purchaseButton);
			enhancementStoreElem.appendChild(itemDiv);
		});
	});
}

function purchaseEnhancement(enhId) {
	const enhancement = enhancementsData.find((e) => e.id === enhId);
	if (!enhancement) return;
	if (S.purchasedEnhancements.includes(enhId)) {
		showMessage('Already owned.', 'info');
		return;
	}
	if (!S.allCorePartsEarned) {
		showMessage('Assemble the LINAC first.', 'info');
		return;
	}
	if (S.currentBalance >= enhancement.cost) {
		S.currentBalance -= enhancement.cost;
		S.purchasedEnhancements.push(enhId);
		enableMovementControl(enhId, true);
		showMessage(`Purchased ${enhancement.name}!`, 'correct');
		updateBalanceDisplay();
		populateEnhancementStore();
		saveGameState();
		if (enhancementsData.every((e) => S.purchasedEnhancements.includes(e.id))) {
			showMessage('🏆 All systems installed — your LINAC is fully operational!', 'correct');
		}
	} else {
		showMessage('Not enough funds.', 'incorrect');
	}
}

export function enableMovementControl(enhId, isEnabled) {
	switch (enhId) {
		case 'gantryRotation':
			gantryRotatePlusButton.disabled = !isEnabled;
			gantryRotateMinusButton.disabled = !isEnabled;
			break;
		case 'couchVertical':
			couchUpButton.disabled = !isEnabled;
			couchDownButton.disabled = !isEnabled;
			break;
		case 'couchLongitudinal':
			couchInButton.disabled = !isEnabled;
			couchOutButton.disabled = !isEnabled;
			break;
		case 'couchLateral':
			couchLeftButton.disabled = !isEnabled;
			couchRightButton.disabled = !isEnabled;
			break;
		case 'couchRotation':
			[
				couchRollPlusButton,
				couchRollMinusButton,
				couchPitchPlusButton,
				couchPitchMinusButton,
				couchYawPlusButton,
				couchYawMinusButton,
				couchTreatmentAnglePlusButton,
				couchTreatmentAngleMinusButton
			].forEach((b) => {
				if (b) b.disabled = !isEnabled;
			});
			break;
		case 'collimatorJaws':
			[
				jawsOpenButton,
				jawsCloseButton,
				jawX1InButton,
				jawX1OutButton,
				jawX2InButton,
				jawX2OutButton,
				jawY1InButton,
				jawY1OutButton,
				jawY2InButton,
				jawY2OutButton
			].forEach((b) => {
				if (b) b.disabled = !isEnabled;
			});
			if (S.jawXN) [S.jawXN, S.jawXP, S.jawYN, S.jawYP].forEach((j) => (j.visible = isEnabled));
			break;
		case 'imagingPanel':
			// Enabling/disabling availability must not deploy, retract, or rotate imaging hardware.
			detectorToggleButton.disabled = !isEnabled;
			kvToggleButton.disabled = !isEnabled;
			break;
		case 'beamDelivery':
			beamOnButton.disabled = !isEnabled;
			if (!isEnabled) setBeamState(false);
			break;
		case 'alignmentLasers':
			lasersToggleButton.disabled = !isEnabled;
			if (!isEnabled) setLaserState(false);
			break;
	}
}

export function saveGameState() {
	try {
		const gameState = {
			balance: S.currentBalance,
			parts: S.earnedParts,
			enhancements: S.purchasedEnhancements,
			allCorePartsEarned: S.allCorePartsEarned,
			jawOffset: S.jawOffset,
			jawX1: fundamentalState.jawX1,
			jawX2: fundamentalState.jawX2,
			jawY1: fundamentalState.jawY1,
			jawY2: fundamentalState.jawY2
		};
		localStorage.setItem('linacGameState_v4', JSON.stringify(gameState));
	} catch (e) {
		console.error('Save failed:', e);
	}
}

export function loadGameState() {
	try {
		const savedState = localStorage.getItem('linacGameState_v4');
		if (savedState) {
			const gameState = JSON.parse(savedState);
			S.currentBalance = gameState.balance || 0;
			S.earnedParts = gameState.parts || [];
			S.purchasedEnhancements = gameState.enhancements || [];
			S.allCorePartsEarned = gameState.allCorePartsEarned || false;
			S.jawOffset = gameState.jawOffset !== undefined ? gameState.jawOffset : 0.1;
			if (Number.isFinite(Number(gameState.jawX1))) {
				fundamentalState.jawX1 = Number(gameState.jawX1);
				fundamentalState.jawX2 = Number(gameState.jawX2);
				fundamentalState.jawY1 = Number(gameState.jawY1);
				fundamentalState.jawY2 = Number(gameState.jawY2);
				syncLegacyJawValue();
			} else setCenteredJawField(10, 10);
			// EPID always initializes in its physical docked/home position on page load.
			S.detectorExtended = false;
		}
	} catch (e) {
		console.error('Load failed:', e);
	}
	linacPartsData.forEach((partData) => {
		const isEarned = S.earnedParts.includes(partData.id);
		if (partData.threeJSObject) partData.threeJSObject.visible = isEarned;
		if (partData.silhouetteObject)
			partData.silhouetteObject.visible = !isEarned && !partData.isSubComponent;
		if (isEarned && partData.isSubComponent) {
			const parent = linacPartsData.find((p) => p.id === partData.parentPart);
			if (parent && S.earnedParts.includes(parent.id) && partData.threeJSObject)
				partData.threeJSObject.visible = true;
		}
	});
	S.purchasedEnhancements.forEach((enhId) => enableMovementControl(enhId, true));
	updateJawPositions();
	setDetectorStateGame(S.detectorExtended);
	checkAllCorePartsEarned();
}

export function resetGame() {
	if (window.confirm('Reset all progress?')) {
		localStorage.removeItem('linacGameState_v4');
		localStorage.removeItem('linacFullyAssembledMessageShown_v2');
		S.currentBalance = 0;
		S.earnedParts = [];
		S.purchasedEnhancements = [];
		S.allCorePartsEarned = false;
		S.jawOffset = 0.1;
		setCenteredJawField(10, 10);
		S.detectorExtended = false;
		linacPartsData.forEach((partData) => {
			if (partData.threeJSObject) partData.threeJSObject.visible = false;
			if (partData.silhouetteObject) partData.silhouetteObject.visible = !partData.isSubComponent;
		});
		enhancementsData.forEach((enh) => enableMovementControl(enh.id, false));
		if (S.jawXN) [S.jawXN, S.jawXP, S.jawYN, S.jawYP].forEach((j) => (j.visible = false));
		setDetectorStateGame(false);
		setBeamState(false);
		setLaserState(false);
		setKvState(false);
		loadGameState();
		updateUI();
		showMessage('Game progress reset.', 'info');
	}
}

export function updateUI() {
	updateBalanceDisplay();
	populateTaskSelect();
	populateEnhancementStore();
	quizArea.style.display = 'none';
	messageArea.textContent = '';
	messageArea.className = 'messageArea';
	updateCouchAccordion();
}
