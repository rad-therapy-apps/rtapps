/* The LINAC app's side of apps/web/scripts/export-linac-model.mjs, which exports the app's vault
   parts for the center's Vault 1 (docs/specs/2026-11-18-consoles-in-center-design.md, part 1).
   Opened with `?export-parts`, the page gets `window.__linacExportParts`: `ready()` says when the
   vault is built, and `collect()` names the parts the center (sim-hub vault-linac.ts) drives and
   hands them over, ready for GLTFExporter, with the floor, wall and ceiling textures. The app's own
   patient, the internal-view and quiz parts, the see-through support arms and everything else that
   is hidden stay out; so does the monitor's screen, which the center draws itself. Without the
   parameter this module does nothing. scene.ts imports it once; the export page is thrown away
   afterwards, so `collect()` takes the parts out of the live scene. */
import type * as THREE from 'three-linac';
import { S } from './state';

/** What `collect()` returns: the top-level parts, in the app's world coordinates, and the canvases
    of the floor, wall and ceiling textures. */
export interface ExportedParts {
	parts: THREE.Object3D[];
	textures: Record<'floor' | 'wall' | 'ceiling', HTMLCanvasElement>;
}

type Geo = THREE.BufferGeometry & { parameters?: Record<string, number> };
const geoOf = (o: THREE.Object3D) => (o as THREE.Mesh).geometry as Geo | undefined;
const near = (a: number | undefined, b: number) => a !== undefined && Math.abs(a - b) < 1e-6;
/** The scene's top-level meshes whose geometry is `type` with these parameters. */
function sceneMeshes(type: string, params: Record<string, number>): THREE.Mesh[] {
	return S.scene.children.filter((o): o is THREE.Mesh => {
		const g = geoOf(o);
		return (
			!!g && g.type === type && Object.entries(params).every(([k, v]) => near(g.parameters?.[k], v))
		);
	});
}

/* Takes out of `root` everything hidden (itself or a descendant) and every mesh drawn fully
   see-through, except the parts in `keep`, which the center shows when the console says so. */
function stripHidden(root: THREE.Object3D, keep: Set<THREE.Object3D>) {
	for (const child of [...root.children]) {
		const m = (child as THREE.Mesh).material as THREE.Material | undefined;
		if (!keep.has(child) && (!child.visible || (m && !Array.isArray(m) && m.opacity === 0)))
			root.remove(child);
		else stripHidden(child, keep);
	}
}

function collect(): ExportedParts {
	const named = (o: THREE.Object3D, name: string) => {
		o.name = name;
		return o;
	};
	// the driven parts (vault-linac-pose.ts maps the console's pose onto them)
	named(S.staticSetupGroup, 'linacMachine');
	named(S.gantryRotatingGroup, 'gantry');
	named(S.linacHeadObject, 'collimator');
	named(S.jawXN, 'jawX1');
	named(S.jawXP, 'jawX2');
	named(S.jawYN, 'jawY1');
	named(S.jawYP, 'jawY2');
	named(S.kvGroup, 'kvArms');
	named(S.detectorPanel, 'epid');
	named(S.beamCone, 'beam');
	named(S.laserGroup, 'lasers');
	named(S.couchGroup, 'couch');
	named(S.couchTreatmentPivot, 'couchRotation');
	named(S.couchTopGroup, 'couchTop');
	named(S.couchGroup.getObjectByName('couchAccordionVisual'), 'couchBellows');
	// the carbon board a patient lies on: the couch top's longest mesh
	const len = (o: THREE.Object3D) => {
		const g = geoOf(o);
		if (!g) return 0;
		g.computeBoundingBox();
		return g.boundingBox.max.z - g.boundingBox.min.z;
	};
	named(
		S.couchTopGroup.children.reduce((a, b) => (len(b) > len(a) ? b : a)),
		'couchTopBoard'
	);
	// the app's patient (and its target markers) stays out, and so do the parts inside the shells,
	// which only the app's internal view shows (scene.ts SIMPLE_INTERNAL_IDS, createStandAssembly3D)
	S.couchTopGroup.remove(S.patientErrorGroup);
	S.staticSetupGroup.remove(S.standInternalsGroup);
	for (const id of ['electronGun', 'waveguide', 'bendingMagnet', 'target', 'klystron']) {
		const part = S.staticSetupGroup.getObjectByName(id);
		part?.parent.remove(part);
	}
	// the monitor without its screen
	S.treatmentMonitorFrame.remove(S.treatmentMonitorMesh);
	named(S.treatmentMonitorFrame, 'treatmentMonitor');
	// scene-level parts that are not on S, found by their geometry (scene.ts createRoom,
	// createVaultEnvironment, createCouch3DModels)
	const [couchBase] = sceneMeshes('CylinderGeometry', { radiusTop: 0.62, radiusBottom: 0.7 });
	named(couchBase, 'couchBase');
	const pads = [
		['floorPadMachine', 2.3],
		['floorPadIso', 0.7],
		['floorPadCabinet', 0.8]
	].map(([name, r]: [string, number]) =>
		named(
			sceneMeshes('CylinderGeometry', { radiusTop: r, height: r === 2.3 ? 0.04 : 0.03 })[0],
			name
		)
	);
	const [sign] = sceneMeshes('PlaneGeometry', { width: 1.7, height: 1.7 });
	named(sign, 'radiationSign');
	const lights = sceneMeshes('PlaneGeometry', { width: 2.6, height: 0.72 }).map((p, i) =>
		named(p, `ceilingLight${i + 1}`)
	);
	const keep = new Set<THREE.Object3D>([
		S.kvGroup,
		S.beamCone,
		S.laserGroup,
		S.jawXN,
		S.jawXP,
		S.jawYN,
		S.jawYP,
		S.detectorPanel
	]);
	const parts = [
		S.staticSetupGroup,
		S.couchGroup,
		couchBase,
		...pads,
		S.laserGroup,
		S.treatmentMonitorFrame,
		sign,
		...lights
	];
	for (const p of parts) stripHidden(p, keep);
	const canvasOf = (mesh: THREE.Mesh) =>
		((mesh.material as THREE.MeshStandardMaterial).map as THREE.CanvasTexture)
			.image as HTMLCanvasElement;
	return {
		parts,
		textures: {
			floor: canvasOf(sceneMeshes('PlaneGeometry', { width: 60, height: 60 })[0]),
			wall: canvasOf(sceneMeshes('PlaneGeometry', { width: 24, height: 7.55 })[0]),
			ceiling: canvasOf(sceneMeshes('PlaneGeometry', { width: 24, height: 24 })[0])
		}
	};
}

if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('export-parts'))
	Object.assign(window, {
		__linacExportParts: {
			ready: () => !!(S.scene && S.couchTopGroup && S.linacHeadObject && S.laserGroup),
			collect
		}
	});
