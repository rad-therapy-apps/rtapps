/* The screen of Vault 1's two in-room treatment monitors (props.ts linacVaultFitOut hangs them, and
   vault-linac.ts frames them with the LINAC app's monitor): one canvas, drawn in the app's monitor
   colours, naming the patient on the couch, or a neutral "No patient" screen. The Tutorial sets
   Jordan Ellis with setVaultMonitorPatient (vault-linac.ts passes it on). What the screen says is
   monitorLines, a plain function tested in vault-linac-monitor.spec.ts; the drawing needs a 2D
   canvas, which the Node checks stub. */
import * as THREE from 'three';

/** The screen's text for a patient name, or for none. */
export function monitorLines(name: string | null): {
	patient: string;
	detail: string;
	status: string;
} {
	const who = name?.trim();
	return who
		? { patient: who, detail: 'On the treatment couch', status: 'PATIENT IN THE ROOM' }
		: { patient: 'No patient', detail: 'The couch is empty', status: 'ROOM READY' };
}

const W = 1280,
	H = 720;
let canvas: HTMLCanvasElement | null = null;
let texture: THREE.CanvasTexture | null = null;
let patient: string | null = null;

function draw() {
	if (!canvas || !texture) return;
	const g = canvas.getContext('2d'),
		t = monitorLines(patient);
	// scene.ts renderTreatmentMonitor's layout: a navy screen, a header with a blue edge, a banner
	g.fillStyle = '#071019';
	g.fillRect(0, 0, W, H);
	g.fillStyle = '#102538';
	g.fillRect(16, 16, W - 32, 92);
	g.fillStyle = '#4cc2ff';
	g.fillRect(16, 16, 10, 92);
	g.textAlign = 'left';
	g.fillStyle = '#f7fbff';
	g.font = '800 40px Segoe UI, Arial';
	g.fillText('IN-ROOM TREATMENT MONITOR', 48, 62);
	g.fillStyle = '#a9c4d9';
	g.font = '600 24px Segoe UI, Arial';
	g.fillText('Vault 1 · LINAC', 50, 94);
	g.fillStyle = '#0d1924';
	g.fillRect(16, 136, W - 32, 330);
	g.fillStyle = '#7fa3bd';
	g.font = '700 30px Segoe UI, Arial';
	g.fillText('PATIENT', 52, 196);
	g.fillStyle = patient ? '#f7fbff' : '#8aa0b2';
	g.font = '800 96px Segoe UI, Arial';
	g.fillText(t.patient, 48, 316, W - 100);
	g.fillStyle = '#a9c4d9';
	g.font = '600 36px Segoe UI, Arial';
	g.fillText(t.detail, 52, 400);
	g.fillStyle = patient ? '#1f6b45' : '#22384a';
	g.fillRect(16, 500, W - 32, 84);
	g.fillStyle = '#e8fff2';
	g.font = '800 38px Segoe UI, Arial';
	g.fillText(t.status, 48, 556);
	texture.needsUpdate = true;
}

/** The monitors' shared screen texture, made on first use. */
export function vaultMonitorTexture(): THREE.CanvasTexture {
	if (!texture) {
		canvas = document.createElement('canvas');
		canvas.width = W;
		canvas.height = H;
		texture = new THREE.CanvasTexture(canvas);
		texture.colorSpace = THREE.SRGBColorSpace;
		texture.anisotropy = 8;
		draw();
	}
	return texture;
}

/** Names the patient on Vault 1's couch on both in-room monitors; null shows "No patient". */
export function setVaultMonitorPatient(name: string | null): void {
	patient = name?.trim() || null;
	draw();
}
