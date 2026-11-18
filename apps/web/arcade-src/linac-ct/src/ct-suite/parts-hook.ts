/* The CT suite's model-export hook, for apps/web/scripts/export-ct-model.mjs. Present only when the
   suite is opened with `?export-parts`; otherwise it adds nothing to the page. The last line of
   room.ts initThree calls installPartsHook, once the scan room is built.

   It names the parts the center (sim-hub ct-room-look.ts) drives, from the suite's own objects in
   room.ts, and puts `window.__ctExportParts()` on the page: it returns the gantry, rotor, table and
   lasers as one binary glTF (GLB), each a named root node in the suite's own units and frame (bore
   axis along z, the bore centre at the origin, the table at couchZ 0, the rotor at angle 0). The
   suite's translucent patient and its anatomy stay behind; the center has its own people.

   Names: gantry (housingShell, boreWall, frontFace, backFace, bezel, statusStrip), rotor (tube,
   detector), table (tableBase, tableTop, headPad), lasers (laserX, laserY, laserZ, each along that
   axis). */
import * as THREE from 'three-ct';
import {
	BORE_R,
	HOUSING_R,
	couchGroup,
	detectorMesh,
	gantryHousing,
	gantryRotor,
	laserGroup,
	patientGroup,
	tableTop,
	tubeMesh
} from './room';

/* The housing's meshes by their geometry: the two open cylinders by radius, the two ring faces by
   which side of the bore they sit on, the bezel torus and the status strip plane. */
function nameGantryParts(housing: THREE.Group) {
	for (const o of housing.children) {
		const m = o as THREE.Mesh,
			p = (m.geometry as THREE.BufferGeometry & { parameters?: Record<string, number> }).parameters;
		if (m.geometry instanceof THREE.CylinderGeometry)
			m.name =
				p.radiusTop === HOUSING_R ? 'housingShell' : p.radiusTop === BORE_R ? 'boreWall' : '';
		else if (m.geometry instanceof THREE.RingGeometry)
			m.name = m.position.z > 0 ? 'frontFace' : 'backFace';
		else if (m.geometry instanceof THREE.TorusGeometry) m.name = 'bezel';
		else if (m.geometry instanceof THREE.PlaneGeometry) m.name = 'statusStrip';
	}
}

/* The couch's meshes: the top (room.ts tableTop), the pedestal (the tall box) and the head pad (the
   half cylinder). The patient group is not a mesh and is left unnamed. */
function nameTableParts(couch: THREE.Group, top: THREE.Mesh) {
	for (const o of couch.children) {
		const m = o as THREE.Mesh;
		if (m === top) m.name = 'tableTop';
		else if (m.geometry instanceof THREE.BoxGeometry) m.name = 'tableBase';
		else if (m.geometry instanceof THREE.CylinderGeometry) m.name = 'headPad';
	}
}

/* Each laser line by the axis it runs along (createLasers draws one per axis through the origin). */
function nameLasers(lasers: THREE.Group) {
	for (const o of lasers.children) {
		const pos = ((o as THREE.Line).geometry as THREE.BufferGeometry).getAttribute('position');
		const span = [0, 1, 2].map((k) => Math.abs(pos.getComponent(1, k) - pos.getComponent(0, k)));
		o.name = 'laser' + 'XYZ'[span.indexOf(Math.max(...span))];
	}
}

async function exportParts(): Promise<string> {
	const { GLTFExporter } = await import('three-ct/addons/exporters/GLTFExporter.js');
	gantryHousing.name = 'gantry';
	gantryRotor.name = 'rotor';
	tubeMesh.name = 'tube';
	detectorMesh.name = 'detector';
	couchGroup.name = 'table';
	laserGroup.name = 'lasers';
	nameGantryParts(gantryHousing);
	nameTableParts(couchGroup, tableTop);
	nameLasers(laserGroup);
	// the export's frame: table at couchZ 0, rotor at angle 0, no patient
	const keep = {
		couchZ: couchGroup.position.clone(),
		rotor: gantryRotor.rotation.z,
		patient: patientGroup.visible
	};
	couchGroup.position.set(0, 0, 0);
	gantryRotor.rotation.z = 0;
	patientGroup.visible = false;
	// glTF has no back-side-only material: the bore wall (drawn from inside) goes out double-sided
	const backSided = new Set<THREE.Material>();
	gantryHousing.traverse((o) => {
		const mat = (o as THREE.Mesh).material as THREE.Material | undefined;
		if (mat && mat.side === THREE.BackSide) backSided.add(mat);
	});
	backSided.forEach((m) => (m.side = THREE.DoubleSide));
	try {
		const glb = (await new GLTFExporter().parseAsync(
			[gantryHousing, gantryRotor, couchGroup, laserGroup],
			{ binary: true, onlyVisible: true }
		)) as ArrayBuffer;
		const bytes = new Uint8Array(glb);
		let bin = '';
		for (let i = 0; i < bytes.length; i += 8192)
			bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
		return btoa(bin);
	} finally {
		backSided.forEach((m) => (m.side = THREE.BackSide));
		couchGroup.position.copy(keep.couchZ);
		gantryRotor.rotation.z = keep.rotor;
		patientGroup.visible = keep.patient;
	}
}

export function installPartsHook() {
	if (!new URLSearchParams(location.search).has('export-parts')) return;
	Object.assign(window, { __ctExportParts: exportParts });
}
