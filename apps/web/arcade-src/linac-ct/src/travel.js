// @ts-nocheck -- verbatim legacy move; removed at TS conversion (PR 4)
import * as THREE from 'three-linac';
import { S } from './state.js';
import { viewVaultButton, viewControlRoomButton } from './dom.js';
import { ISOCENTER_Y_TARGET, GANTRY_PLANE_Z_TARGET, controlRoomAccentMats } from './scene.js';
import { syncOperatorConsole } from './main.js';
import { setPendantLCD } from './linac-safety.js';

export function syncRoomViewButtons(mode = S.currentRoomView) {
	if (viewVaultButton) viewVaultButton.classList.toggle('active-function', mode === 'vault');
	if (viewControlRoomButton)
		viewControlRoomButton.classList.toggle('active-function', mode === 'control');
	syncOperatorConsole();
}
function getRoomViewPreset(mode) {
	const presets = {
		vault: {
			pos: new THREE.Vector3(8.6, ISOCENTER_Y_TARGET + 2.8, GANTRY_PLANE_Z_TARGET + 7.2),
			target: new THREE.Vector3(-0.4, 1.15, GANTRY_PLANE_Z_TARGET - 0.3),
			label: 'VAULT'
		},
		control: {
			pos: new THREE.Vector3(-13.55, 2.02, -4.0),
			target: new THREE.Vector3(-15.55, 1.58, -4.0),
			label: 'CONTROL CONSOLE'
		}
	};
	return presets[mode] || presets.vault;
}

function beginTravelPath(toMode) {
	if (!S.camera || !S.controls) return;
	const dest = getRoomViewPreset(toMode);
	if (!dest?.pos?.isVector3 || !dest?.target?.isVector3) {
		console.warn('RTApps room travel cancelled: invalid destination preset.', toMode, dest);
		S.travelRequest = null;
		S.vaultDoorTarget = 0;
		return;
	}
	let positions = [S.camera.position.clone()];
	let targets = [S.controls.target.clone()];
	if (S.currentRoomView === 'vault' && toMode === 'control') {
		positions.push(
			new THREE.Vector3(4.8, 3.0, GANTRY_PLANE_Z_TARGET + 7.8),
			new THREE.Vector3(-2.0, 2.9, 7.8),
			new THREE.Vector3(-8.2, 2.7, 6.6),
			new THREE.Vector3(-11.6, 2.45, 5.15),
			new THREE.Vector3(-13.0, 2.35, 3.0),
			new THREE.Vector3(-13.8, 2.35, -0.8),
			dest.pos.clone()
		);
		targets.push(
			new THREE.Vector3(1.0, 1.1, 2.3),
			new THREE.Vector3(-4.0, 1.3, 6.2),
			new THREE.Vector3(-9.0, 1.35, 5.4),
			new THREE.Vector3(-12.3, 1.5, 5.1),
			new THREE.Vector3(-13.6, 1.5, 2.0),
			new THREE.Vector3(-14.7, 1.5, -1.6),
			dest.target.clone()
		);
	} else if (S.currentRoomView === 'control' && toMode === 'vault') {
		positions.push(
			new THREE.Vector3(-13.8, 2.35, -0.8),
			new THREE.Vector3(-13.0, 2.35, 3.0),
			new THREE.Vector3(-11.6, 2.45, 5.15),
			new THREE.Vector3(-8.2, 2.7, 6.6),
			new THREE.Vector3(-2.0, 2.9, 7.8),
			new THREE.Vector3(4.8, 3.0, GANTRY_PLANE_Z_TARGET + 7.8),
			dest.pos.clone()
		);
		targets.push(
			new THREE.Vector3(-14.7, 1.5, -1.6),
			new THREE.Vector3(-13.6, 1.5, 2.0),
			new THREE.Vector3(-12.3, 1.5, 5.1),
			new THREE.Vector3(-9.0, 1.35, 5.4),
			new THREE.Vector3(-4.0, 1.3, 6.2),
			new THREE.Vector3(1.0, 1.1, 2.3),
			dest.target.clone()
		);
	} else {
		positions.push(dest.pos.clone());
		targets.push(dest.target.clone());
	}

	// Keep only valid Vector3 pairs. A camera path is a paired position/target list;
	// a bad or missing entry must never be passed into Vector3.lerpVectors().
	const pairCount = Math.min(positions.length, targets.length);
	const cleanPositions = [];
	const cleanTargets = [];
	for (let i = 0; i < pairCount; i++) {
		const p = positions[i],
			q = targets[i];
		if (
			p?.isVector3 &&
			q?.isVector3 &&
			Number.isFinite(p.x) &&
			Number.isFinite(p.y) &&
			Number.isFinite(p.z) &&
			Number.isFinite(q.x) &&
			Number.isFinite(q.y) &&
			Number.isFinite(q.z)
		) {
			cleanPositions.push(p);
			cleanTargets.push(q);
		}
	}
	if (cleanPositions.length < 2) {
		cleanPositions.length = 0;
		cleanTargets.length = 0;
		cleanPositions.push(S.camera.position.clone(), dest.pos.clone());
		cleanTargets.push(S.controls.target.clone(), dest.target.clone());
	}
	S.cameraTravel = {
		mode: toMode,
		startTime: performance.now(),
		duration: S.currentRoomView === toMode ? 900 : 5200,
		positions: cleanPositions,
		targets: cleanTargets
	};
	setPendantLCD('DOOR OPEN', `Entering ${dest.label}`);
}
export function travelToRoomView(mode) {
	if (!S.camera || !S.controls || mode === S.currentRoomView || S.travelRequest || S.cameraTravel)
		return;
	const dest = getRoomViewPreset(mode);
	S.travelRequest = { fromMode: S.currentRoomView, toMode: mode, stage: 'opening', openAt: 0 };
	S.vaultDoorTarget = 1;
	syncRoomViewButtons(S.currentRoomView);
	setPendantLCD('VAULT DOOR', `Opening for ${dest.label}`);
}
export function updateTravelWorkflow(now) {
	if (!S.travelRequest) return;
	if (S.travelRequest.stage === 'opening') {
		if (S.vaultDoorProgress >= 0.985) {
			if (!S.travelRequest.openAt) {
				S.travelRequest.openAt = now;
				const dest = getRoomViewPreset(S.travelRequest.toMode);
				setPendantLCD('VAULT DOOR', `Open · Enter ${dest.label}`);
			}
			if (now - S.travelRequest.openAt >= 650) {
				S.travelRequest.stage = 'moving';
				beginTravelPath(S.travelRequest.toMode);
			}
		}
	} else if (S.travelRequest.stage === 'closing') {
		if (S.vaultDoorProgress <= 0.02) {
			setPendantLCD('ROOM VIEW', getRoomViewPreset(S.currentRoomView).label);
			S.travelRequest = null;
		}
	}
}
export function updateCameraTravel(now) {
	if (!S.cameraTravel || !S.camera || !S.controls) return;
	const travel = S.cameraTravel;
	const positions = Array.isArray(travel.positions) ? travel.positions : [];
	const targets = Array.isArray(travel.targets) ? travel.targets : [];
	const pointCount = Math.min(positions.length, targets.length);

	const validVector = (v) =>
		!!(v?.isVector3 && Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z));
	const finishTravelSafely = (reason = 'complete') => {
		const mode = travel.mode === 'control' ? 'control' : 'vault';
		const dest = getRoomViewPreset(mode);
		if (dest?.pos?.isVector3) S.camera.position.copy(dest.pos);
		if (dest?.target?.isVector3) S.controls.target.copy(dest.target);
		S.currentRoomView = mode;
		S.cameraTravel = null;
		syncRoomViewButtons(S.currentRoomView);
		S.vaultDoorTarget = 0;
		if (S.travelRequest) S.travelRequest.stage = 'closing';
		if (reason !== 'complete') console.warn('RTApps camera travel recovered safely:', reason);
	};

	if (pointCount < 2) {
		finishTravelSafely('camera path contained fewer than two waypoint pairs');
		return;
	}
	const startTime = Number(travel.startTime);
	const duration = Math.max(1, Number(travel.duration) || 1);
	const frameNow = Number.isFinite(now) ? now : performance.now();
	if (!Number.isFinite(startTime)) {
		finishTravelSafely('camera path start time was invalid');
		return;
	}

	const t = Math.max(0, Math.min(1, (frameNow - startTime) / duration));
	const easedGlobal = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
	const segCount = pointCount - 1;
	const scaled = Math.min(segCount - 1e-8, Math.max(0, easedGlobal * segCount));
	const seg = Math.max(0, Math.min(segCount - 1, Math.floor(scaled)));
	const localT = scaled - seg;
	const easedLocal = localT < 0.5 ? 2 * localT * localT : 1 - Math.pow(-2 * localT + 2, 2) / 2;
	const p0 = positions[seg],
		p1 = positions[seg + 1];
	const q0 = targets[seg],
		q1 = targets[seg + 1];

	if (![p0, p1, q0, q1].every(validVector)) {
		finishTravelSafely(`invalid waypoint pair at segment ${seg}`);
		return;
	}

	S.camera.position.lerpVectors(p0, p1, easedLocal);
	S.controls.target.lerpVectors(q0, q1, easedLocal);
	if (t >= 1) finishTravelSafely('complete');
}

export function updateVaultAesthetics(now) {
	const moveStep = 0.0055;
	if (S.vaultDoorTarget > S.vaultDoorProgress)
		S.vaultDoorProgress = Math.min(S.vaultDoorTarget, S.vaultDoorProgress + moveStep);
	else if (S.vaultDoorTarget < S.vaultDoorProgress)
		S.vaultDoorProgress = Math.max(S.vaultDoorTarget, S.vaultDoorProgress - moveStep);
	const easedDoor =
		S.vaultDoorProgress < 0.5
			? 2 * S.vaultDoorProgress * S.vaultDoorProgress
			: 1 - Math.pow(-2 * S.vaultDoorProgress + 2, 2) / 2;
	if (S.vaultDoorPanel) {
		S.vaultDoorPanel.position.z = 5.1 + 2.15 * easedDoor;
		S.vaultDoorPanel.position.x = -11.6 + 0.03 * easedDoor;
		if (S.vaultDoorIndicator && S.vaultDoorIndicator.material) {
			const activeColor =
				S.vaultDoorProgress > 0.95 ? 0x79f0ac : S.vaultDoorProgress > 0.05 ? 0xffcf74 : 0x7be09f;
			const col = new THREE.Color(activeColor);
			S.vaultDoorIndicator.material.color.copy(col);
			S.vaultDoorIndicator.material.emissive.copy(col);
			S.vaultDoorIndicator.material.emissiveIntensity =
				S.vaultDoorProgress > 0.05 && S.vaultDoorProgress < 0.95 ? 1.35 : 1.7;
		}
	}
	if (controlRoomAccentMats.length) {
		const pulse = 0.12 * (0.5 + 0.5 * Math.sin(now * 0.0011));
		controlRoomAccentMats.forEach((mat) => {
			mat.emissiveIntensity = (S.roomLightsOn ? 1.9 : 0.35) + pulse;
		});
	}
}
