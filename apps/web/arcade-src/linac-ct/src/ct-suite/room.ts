import * as THREE from 'three-ct';
import { OrbitControls } from 'three-ct/addons/controls/OrbitControls.js';
import { S } from './console';
/* ============================================================
   1) 3D SCAN ROOM
   ============================================================ */
export const BORE_R = 7.5,
	HOUSING_R = 11.5,
	GANTRY_DEPTH = 6.5,
	PATIENT_LEN = 34;
export let scene: THREE.Scene | undefined,
	camera: THREE.PerspectiveCamera | undefined,
	renderer: THREE.WebGLRenderer | undefined,
	controls: OrbitControls | undefined,
	clock: THREE.Clock | undefined;
export let gantryHousing: THREE.Group | undefined,
	gantryRotor: THREE.Group | undefined,
	tubeMesh: THREE.Mesh | undefined,
	detectorMesh: THREE.Mesh | undefined;
export let couchGroup: THREE.Group | undefined,
	tableTop: THREE.Mesh | undefined,
	patientGroup: THREE.Group | undefined,
	skinGroup: THREE.Group | undefined,
	boneGroup: THREE.Group | undefined,
	organGroup: THREE.Group | undefined,
	tumorMesh: THREE.Mesh | undefined;
export let laserGroup: THREE.Group | undefined;
export let gantryAngle = 0;

export function initThree() {
	const canvas = document.getElementById('scanCanvas') as HTMLCanvasElement;
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0x0a0f14);
	scene.fog = new THREE.Fog(0x0a0f14, 55, 110);
	clock = new THREE.Clock();
	camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
	renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
	renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.target.set(0, 0, 0);

	scene.add(new THREE.HemisphereLight(0xbcd3e6, 0x0a0f14, 0.7));
	const key = new THREE.DirectionalLight(0xffffff, 0.85);
	key.position.set(14, 22, 18);
	key.castShadow = true;
	key.shadow.mapSize.set(1024, 1024);
	key.shadow.camera.near = 1;
	key.shadow.camera.far = 90;
	key.shadow.camera.left = -30;
	key.shadow.camera.right = 30;
	key.shadow.camera.top = 30;
	key.shadow.camera.bottom = -30;
	scene.add(key);
	const fill = new THREE.DirectionalLight(0x88aacc, 0.4);
	fill.position.set(-16, 10, -12);
	scene.add(fill);
	const spot = new THREE.PointLight(0x35d6c4, 0.35, 60);
	spot.position.set(0, 9, 2);
	scene.add(spot);

	createRoom();
	createGantry();
	createCouchPatient();
	createLasers();
	setView('iso');
	addEventListener('resize', onResize);
	onResize();
	requestAnimationFrame(onResize);
	setTimeout(onResize, 120);
	renderer.setAnimationLoop(animate);
}

export function createRoom() {
	const floorMat = new THREE.MeshStandardMaterial({
		color: 0x141c24,
		roughness: 0.95,
		metalness: 0.05
	});
	const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), floorMat);
	floor.rotation.x = -Math.PI / 2;
	floor.position.y = -14;
	floor.receiveShadow = true;
	scene.add(floor);
	// subtle floor grid
	const grid = new THREE.GridHelper(120, 48, 0x1d2c3a, 0x142029);
	grid.position.y = -13.98;
	scene.add(grid);
	const wallMat = new THREE.MeshStandardMaterial({
		color: 0x101820,
		roughness: 1,
		side: THREE.DoubleSide
	});
	const back = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), wallMat);
	back.position.set(0, 16, -34);
	back.receiveShadow = true;
	scene.add(back);
	// control-room window glow on the back wall
	const win = new THREE.Mesh(
		new THREE.PlaneGeometry(26, 10),
		new THREE.MeshBasicMaterial({ color: 0x0e3a44 })
	);
	win.position.set(22, 9, -33.9);
	scene.add(win);
	const winFrame = new THREE.Mesh(
		new THREE.PlaneGeometry(27, 11),
		new THREE.MeshBasicMaterial({ color: 0x35d6c4, transparent: true, opacity: 0.15 })
	);
	winFrame.position.set(22, 9, -33.95);
	scene.add(winFrame);
}

export function createGantry() {
	gantryHousing = new THREE.Group();
	const shell = new THREE.MeshStandardMaterial({
		color: 0xdfe6ec,
		roughness: 0.55,
		metalness: 0.25
	});
	const shellDark = new THREE.MeshStandardMaterial({
		color: 0x2a333c,
		roughness: 0.8,
		metalness: 0.2,
		side: THREE.BackSide
	});
	// outer housing cylinder (axis Z)
	const outer = new THREE.Mesh(
		new THREE.CylinderGeometry(HOUSING_R, HOUSING_R, GANTRY_DEPTH, 64, 1, true),
		shell
	);
	outer.rotation.x = Math.PI / 2;
	outer.castShadow = true;
	gantryHousing.add(outer);
	// bore inner wall (dark)
	const bore = new THREE.Mesh(
		new THREE.CylinderGeometry(BORE_R, BORE_R, GANTRY_DEPTH + 0.1, 64, 1, true),
		shellDark
	);
	bore.rotation.x = Math.PI / 2;
	gantryHousing.add(bore);
	// front + back faces (ring)
	const faceMat = new THREE.MeshStandardMaterial({
		color: 0xeef2f5,
		roughness: 0.5,
		metalness: 0.2,
		side: THREE.DoubleSide
	});
	const faceMatBack = new THREE.MeshStandardMaterial({
		color: 0xc4ccd3,
		roughness: 0.6,
		metalness: 0.2,
		side: THREE.DoubleSide
	});
	const fGeo = new THREE.RingGeometry(BORE_R, HOUSING_R, 64);
	const front = new THREE.Mesh(fGeo, faceMat);
	front.position.z = GANTRY_DEPTH / 2;
	gantryHousing.add(front);
	const back = new THREE.Mesh(fGeo, faceMatBack);
	back.position.z = -GANTRY_DEPTH / 2;
	gantryHousing.add(back);
	// teal accent bezel around bore
	const bezel = new THREE.Mesh(
		new THREE.TorusGeometry(BORE_R + 0.18, 0.18, 12, 64),
		new THREE.MeshStandardMaterial({
			color: 0x35d6c4,
			emissive: 0x0c4c46,
			emissiveIntensity: 0.8,
			roughness: 0.4
		})
	);
	bezel.position.z = GANTRY_DEPTH / 2 + 0.02;
	gantryHousing.add(bezel);
	// little status strip on the housing face
	const strip = new THREE.Mesh(
		new THREE.PlaneGeometry(4, 0.7),
		new THREE.MeshBasicMaterial({ color: 0x0c1a22 })
	);
	strip.position.set(0, HOUSING_R - 1.2, GANTRY_DEPTH / 2 + 0.03);
	gantryHousing.add(strip);
	scene.add(gantryHousing);

	// rotor: tube + detector arc that spin inside the bore during scan
	gantryRotor = new THREE.Group();
	tubeMesh = new THREE.Mesh(
		new THREE.BoxGeometry(1.4, 1.0, 1.6),
		new THREE.MeshStandardMaterial({
			color: 0x2b6cff,
			emissive: 0x0a1c55,
			emissiveIntensity: 0.5,
			roughness: 0.5
		})
	);
	tubeMesh.position.set(0, BORE_R - 0.7, 0);
	tubeMesh.castShadow = true;
	gantryRotor.add(tubeMesh);
	const det = new THREE.Mesh(
		new THREE.CylinderGeometry(
			BORE_R - 0.4,
			BORE_R - 0.4,
			1.4,
			64,
			1,
			true,
			Math.PI * 0.72,
			Math.PI * 0.56
		),
		new THREE.MeshStandardMaterial({
			color: 0x4a1416,
			emissive: 0x1a0405,
			roughness: 0.6,
			side: THREE.DoubleSide
		})
	);
	det.rotation.x = Math.PI / 2;
	detectorMesh = det;
	gantryRotor.add(det);
	scene.add(gantryRotor);
}

export function createCouchPatient() {
	couchGroup = new THREE.Group();
	// pedestal (outside the bore, +Z side)
	const ped = new THREE.Mesh(
		new THREE.BoxGeometry(4, 9, 4),
		new THREE.MeshStandardMaterial({ color: 0x30393f, roughness: 0.8 })
	);
	ped.position.set(0, -9, PATIENT_LEN / 2 + 3);
	ped.castShadow = true;
	ped.receiveShadow = true;
	couchGroup.add(ped);
	// table top (long, along Z)
	tableTop = new THREE.Mesh(
		new THREE.BoxGeometry(TABLE_W(), 0.5, PATIENT_LEN + 8),
		new THREE.MeshStandardMaterial({ color: 0x0f5a63, roughness: 0.5, metalness: 0.2 })
	);
	tableTop.position.set(0, -4.4, 2);
	tableTop.castShadow = true;
	tableTop.receiveShadow = true;
	couchGroup.add(tableTop);
	// curved head-support pad
	const pad = new THREE.Mesh(
		new THREE.CylinderGeometry(2.2, 2.2, 3, 20, 1, false, 0, Math.PI),
		new THREE.MeshStandardMaterial({ color: 0x14343a, roughness: 0.9 })
	);
	pad.rotation.z = Math.PI / 2;
	pad.rotation.y = Math.PI / 2;
	pad.position.set(0, -3.9, -PATIENT_LEN / 2 + 1.5);
	couchGroup.add(pad);

	patientGroup = new THREE.Group();
	buildPatient();
	patientGroup.position.set(0, -3.0, 0);
	couchGroup.add(patientGroup);
	couchGroup.position.z = S.couchZ;
	scene.add(couchGroup);
}
export function TABLE_W() {
	return 5.2;
}

export function buildPatient() {
	skinGroup = new THREE.Group();
	boneGroup = new THREE.Group();
	organGroup = new THREE.Group();
	const skinMat = new THREE.MeshStandardMaterial({
		color: 0xe4b48f,
		roughness: 0.85,
		transparent: true,
		opacity: 0.5
	});
	const boneMat = new THREE.MeshStandardMaterial({ color: 0xeae4d2, roughness: 0.6 });
	const capsule = (rx: number, ry: number, len: number, z: number) => {
		const g = new THREE.CapsuleGeometry(1, 1, 4, 12);
		const m = new THREE.Mesh(g, skinMat);
		m.scale.set(rx, len / 2, ry);
		m.rotation.x = Math.PI / 2;
		m.position.z = z;
		m.castShadow = true;
		return m;
	};
	// torso (chest→abdomen), pelvis, thighs, lower legs
	skinGroup.add(capsule(3.4, 2.4, 15, -3)); // thorax/abdomen
	skinGroup.add(capsule(3.6, 2.5, 7, 6.5)); // pelvis
	const thighL = capsule(1.5, 1.7, 10, 12.5);
	thighL.position.x = -1.6;
	skinGroup.add(thighL);
	const thighR = thighL.clone();
	thighR.position.x = 1.6;
	skinGroup.add(thighR);
	// head + neck
	const head = new THREE.Mesh(new THREE.SphereGeometry(2.4, 20, 16), skinMat);
	head.position.set(0, 0.4, -15);
	head.scale.set(1, 1.15, 1.25);
	head.castShadow = true;
	skinGroup.add(head);
	const neck = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 2.6, 14), skinMat);
	neck.rotation.x = Math.PI / 2;
	neck.position.set(0, 0.1, -12.4);
	skinGroup.add(neck);
	// arms at sides
	const armL = capsule(0.9, 1.0, 12, -4);
	armL.position.x = -3.9;
	skinGroup.add(armL);
	const armR = armL.clone();
	armR.position.x = 3.9;
	skinGroup.add(armR);

	// skeleton: spine, ribcage hint, pelvis ring, femora, skull
	for (let i = 0; i < 20; i++) {
		const v = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.6), boneMat);
		v.position.set(0, -1.7, -10.5 + i * 0.95);
		boneGroup.add(v);
	}
	const skull = new THREE.Mesh(new THREE.SphereGeometry(2.2, 18, 14), boneMat);
	skull.position.set(0, 0.4, -15);
	skull.scale.set(1, 1.12, 1.2);
	boneGroup.add(skull);
	const pelvis = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.75, 12, 28), boneMat);
	pelvis.rotation.x = Math.PI / 2;
	pelvis.scale.set(1, 1, 0.6);
	pelvis.position.set(0, -1.4, 7.5);
	boneGroup.add(pelvis);
	const femL = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 9, 12), boneMat);
	femL.rotation.x = Math.PI / 2;
	femL.position.set(-1.6, -1.6, 13);
	boneGroup.add(femL);
	const femR = femL.clone();
	femR.position.x = 1.6;
	boneGroup.add(femR);
	for (let i = 0; i < 7; i++) {
		const rib = new THREE.Mesh(
			new THREE.TorusGeometry(2.9 - i * 0.06, 0.14, 8, 20, Math.PI * 1.3),
			boneMat
		);
		rib.rotation.y = Math.PI / 2;
		rib.rotation.z = Math.PI * 0.15;
		rib.position.set(0, -0.6, -9 + i * 1.1);
		boneGroup.add(rib);
	}

	// organs (region-representative internal structures, semi-transparent)
	const org = (
		c: number,
		rx: number,
		ry: number,
		rz: number,
		x: number,
		y: number,
		z: number,
		op = 0.75
	) => {
		const m = new THREE.Mesh(
			new THREE.SphereGeometry(1, 16, 12),
			new THREE.MeshStandardMaterial({
				color: c,
				roughness: 0.6,
				transparent: true,
				opacity: op,
				emissive: c,
				emissiveIntensity: 0.06
			})
		);
		m.scale.set(rx, ry, rz);
		m.position.set(x, y, z);
		return m;
	};
	organGroup.add(org(0xff8f9e, 2.0, 2.2, 3.0, -1.4, 0.2, -6.5)); // left lung
	organGroup.add(org(0xff8f9e, 2.0, 2.2, 3.0, 1.4, 0.2, -6.5)); // right lung
	organGroup.add(org(0xd23b45, 1.6, 1.5, 1.6, -0.6, -0.4, -4.6)); // heart
	organGroup.add(org(0x8a5a2b, 2.6, 1.9, 2.4, 1.2, -0.2, -0.5)); // liver
	organGroup.add(org(0xcaa24a, 1.1, 1.1, 1.4, -1.9, -1.0, 0.4)); // spleen/kidney L
	organGroup.add(org(0xf2d675, 1.2, 1.2, 1.2, 0, 1.0, 7.4, 0.8)); // bladder (anterior)
	organGroup.add(org(0x9e7b52, 0.8, 0.8, 1.6, 0, -1.2, 7.6, 0.8)); // rectum (posterior)
	tumorMesh = new THREE.Mesh(
		new THREE.SphereGeometry(0.55, 16, 14),
		new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0x5a0d08, emissiveIntensity: 0.8 })
	);
	tumorMesh.position.set(0, 0.1, 7.5);
	organGroup.add(tumorMesh);

	patientGroup.add(skinGroup, boneGroup, organGroup);
	boneGroup.visible = false;
	organGroup.visible = false;
}

export function createLasers() {
	laserGroup = new THREE.Group();
	const mat = new THREE.LineBasicMaterial({ color: 0x39ff8c, transparent: true, opacity: 0.85 });
	const E = 28;
	const line = (a, b) =>
		laserGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), mat));
	line(new THREE.Vector3(-E, 0, 0), new THREE.Vector3(E, 0, 0));
	line(new THREE.Vector3(0, -E, 0), new THREE.Vector3(0, E, 0));
	line(new THREE.Vector3(0, 0, -E), new THREE.Vector3(0, 0, E));
	scene.add(laserGroup);
}

export function setView(name: string) {
	if (!camera) return;
	const t = new THREE.Vector3(0, 0, 0);
	if (name === 'iso') camera.position.set(24, 17, 26);
	else if (name === 'front') camera.position.set(0.1, 1.5, 30);
	else if (name === 'side') camera.position.set(34, 3, 0.1);
	else if (name === 'top') camera.position.set(0.1, 38, 0.1);
	controls.target.copy(t);
	camera.lookAt(t);
}

export function onResize() {
	const c = document.getElementById('scanCanvas');
	if (!c || !renderer) return;
	const w = c.clientWidth || c.parentElement.clientWidth,
		h = c.clientHeight || c.parentElement.clientHeight;
	if (w < 2 || h < 2) return;
	renderer.setSize(w, h, false);
	camera.aspect = w / h;
	camera.updateProjectionMatrix();
}

let lastRoomAux = '';

export function animate() {
	const dt = clock.getDelta(),
		el = clock.elapsedTime;
	// RTApps perf pass: skip rendering while the room isn't visible (backgrounded tab, or
	// console-mode CSS hiding #scanCanvas). setAnimationLoop keeps ticking so it resumes on
	// its own; clock.getDelta() above still runs each tick so dt/elapsedTime don't jump on resume.
	if (document.hidden || document.body.classList.contains('rtapps-console-mode')) return;
	if ((S.scanning || S.rotating) && gantryRotor) {
		gantryAngle += (S.scanning ? 4.2 : 1.6) * dt;
		gantryRotor.rotation.z = gantryAngle;
	}
	if (S.motion && patientGroup) {
		patientGroup.position.y = -3.0 + Math.sin(el * 2.0) * S.motionAmp * 0.5;
	} else if (patientGroup) patientGroup.position.y = -3.0;
	if (couchGroup) couchGroup.position.z = S.couchZ;
	controls.update();
	renderer.render(scene, camera);
	const roomAuxText = `Gantry ${(THREE.MathUtils.radToDeg(gantryRotor ? gantryRotor.rotation.z : 0) % 360).toFixed(0)}° · ${S.scanning ? 'SCANNING' : S.rotating ? 'Rotating' : 'Idle'}`;
	if (roomAuxText !== lastRoomAux) {
		lastRoomAux = roomAuxText;
		document.getElementById('roomAux').textContent = roomAuxText;
	}
}
