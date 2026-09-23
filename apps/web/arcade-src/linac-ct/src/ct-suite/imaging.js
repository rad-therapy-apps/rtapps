// @ts-nocheck -- verbatim legacy move; removed at TS conversion (PR 4)
import {
	S,
	setStatus,
	setXray,
	log,
	$,
	setStep,
	updateRangeLabels,
	setWL,
	spanOf
} from './console';
/* ---------------- EMBEDDED REAL CT SERIES (all de-identified) ----------------
   Five real planning CTs, each downsampled to the 220^2 recon matrix and
   subsampled in slices. HU are packed loss-lessly into a PNG sprite (16-bit
   -> R,G) and decoded in-browser, so window/level + HU readout use genuine
   Hounsfield data. AP + lateral scouts are DRRs computed from each volume. */
export const REAL_DATA = {
	prostate: {
		meta: {
			size: 220,
			n: 110,
			cols: 11,
			rows: 10,
			off: 1024,
			kv: 120,
			mas: 51,
			dfov: 50,
			px: 2.2727,
			slice_sp: 1.25
		},
		png: 'assets/ct-1.png'
	},
	spine: {
		meta: {
			size: 220,
			n: 120,
			cols: 11,
			rows: 11,
			off: 1024,
			kv: 120,
			mas: 125,
			dfov: 60,
			px: 2.7273,
			slice_sp: 2.0
		},
		png: 'assets/ct-2.png'
	},
	cranio: {
		meta: {
			size: 220,
			n: 110,
			cols: 11,
			rows: 10,
			off: 1024,
			kv: 120,
			mas: 201,
			dfov: 65,
			px: 2.9545,
			slice_sp: 1.0
		},
		png: 'assets/ct-3.png'
	},
	skin: {
		meta: {
			size: 220,
			n: 100,
			cols: 10,
			rows: 10,
			off: 1024,
			kv: 130,
			mas: 3420,
			dfov: 60,
			px: 2.7273,
			slice_sp: 3.0
		},
		png: 'assets/ct-4.png'
	},
	breast: {
		meta: {
			size: 220,
			n: 110,
			cols: 11,
			rows: 10,
			off: 1024,
			kv: 140,
			mas: 200,
			dfov: 60,
			px: 2.7273,
			slice_sp: 2.0
		},
		png: 'assets/ct-5.png'
	}
};

export const REALV = {};
Object.keys(REAL_DATA).forEach(
	(k) =>
		(REALV[k] = {
			loaded: false,
			loading: false,
			slices: [],
			scoutAP: null,
			scoutLAT: null,
			meta: REAL_DATA[k].meta
		})
);

export function buildScout(slices, SZ, N, mode) {
	const w = SZ,
		h = N,
		cv = document.createElement('canvas');
	cv.width = w;
	cv.height = h;
	const ctx = cv.getContext('2d');
	const img = ctx.createImageData(w, h),
		att = new Float32Array(w * h);
	let mx = 1;
	for (let s = 0; s < N; s++) {
		const sl = slices[s];
		for (let u = 0; u < SZ; u++) {
			let a = 0;
			if (mode === 'ap') {
				for (let y = 0; y < SZ; y++) {
					const hh = sl[y * SZ + u];
					if (hh > -500) a += hh + 1000;
				}
			} else {
				for (let x = 0; x < SZ; x++) {
					const hh = sl[u * SZ + x];
					if (hh > -500) a += hh + 1000;
				}
			}
			att[s * w + u] = a;
			if (a > mx) mx = a;
		}
	}
	for (let i = 0; i < att.length; i++) {
		const v = Math.min(255, Math.pow(att[i] / mx, 0.6) * 255) | 0;
		const p = i * 4;
		img.data[p] = img.data[p + 1] = img.data[p + 2] = v;
		img.data[p + 3] = 255;
	}
	ctx.putImageData(img, 0, 0);
	return cv;
}

export async function decodeRealVolume(key) {
	const V = REALV[key];
	if (V.loaded || V.loading) return V.loaded;
	V.loading = true;
	const img = new Image();
	img.src = REAL_DATA[key].png;
	await img.decode();
	const M = REAL_DATA[key].meta,
		SZ = M.size,
		cols = M.cols,
		off = M.off;
	const cv = document.createElement('canvas');
	cv.width = img.width;
	cv.height = img.height;
	const cx = cv.getContext('2d', { willReadFrequently: true });
	cx.drawImage(img, 0, 0);
	const data = cx.getImageData(0, 0, img.width, img.height).data;
	for (let k = 0; k < M.n; k++) {
		const ty = Math.floor(k / cols) * SZ,
			tx = (k % cols) * SZ,
			out = new Int16Array(SZ * SZ);
		for (let r = 0; r < SZ; r++) {
			const base = ((ty + r) * img.width + tx) * 4;
			for (let c = 0; c < SZ; c++) {
				const p = base + c * 4;
				out[r * SZ + c] = ((data[p] << 8) | data[p + 1]) - off;
			}
		}
		V.slices.push(out);
	}
	V.scoutAP = buildScout(V.slices, SZ, M.n, 'ap');
	V.scoutLAT = buildScout(V.slices, SZ, M.n, 'lat');
	V.loaded = true;
	V.loading = false;
	return true;
}

/* ============================================================
   2) PROCEDURAL CT RECONSTRUCTION ENGINE
   ============================================================ */
export const REC = 220; // recon matrix
export const axCanvas = document.getElementById('axCanvas');
axCanvas.width = REC;
axCanvas.height = REC;
export const axCtx = axCanvas.getContext('2d');

export let noiseSeed = 1234567;
export function rnd() {
	noiseSeed = (noiseSeed * 1103515245 + 12345) & 0x7fffffff;
	return noiseSeed / 0x7fffffff;
}

export const ell = (x, y, cx, cy, rx, ry) => {
	const dx = (x - cx) / rx,
		dy = (y - cy) / ry;
	return dx * dx + dy * dy;
}; // <1 inside
export const lerp = (a, b, t) => a + (b - a) * t;

/* HU at patient-space (x lateral cm, y anterior +cm) for a region at normalized level t (0 sup →1 inf) */
export function sampleHU(region, t, x, y) {
	if (region === 'pelvis') return huPelvis(t, x, y);
	if (region === 'thorax') return huThorax(t, x, y);
	if (region === 'abdomen') return huAbdomen(t, x, y);
	return huHead(t, x, y);
}

export function bodyBase(x, y, rx, ry, fat) {
	// returns {out, hu} skin/fat/muscle shell
	if (ell(x, y, 0, 0, rx, ry) > 1) return -1000; // air outside body
	if (ell(x, y, 0, 0, rx - fat, ry - fat) > 1) return -95; // subcutaneous fat rim
	return 45; // muscle default
}

export function huPelvis(t, x, y) {
	const rx = lerp(18.5, 14.5, t),
		ry = lerp(12.5, 11.5, t);
	let hu = bodyBase(x, y, rx, ry, 1.7);
	if (hu <= -1000) return hu;
	// bladder (anterior) — fuller superiorly
	if (t > 0.28 && t < 0.78 && ell(x, y, 0, ry * 0.28, lerp(5.5, 3.2, t), lerp(4.2, 3.0, t)) < 1)
		hu = 10;
	// rectum (posterior)
	if (t > 0.34 && t < 0.82 && ell(x, y, 0, -ry * 0.3, 2.2, 2.0) < 1) hu = rnd() < 0.4 ? -45 : 20;
	// prostate / tumour target (between bladder & rectum, low pelvis)
	if (t > 0.5 && t < 0.74 && ell(x, y, 0, -ry * 0.02, 2.4, 2.2) < 1) hu = 48;
	if (t > 0.54 && t < 0.7 && ell(x, y, 0.6, -ry * 0.05, 1.1, 1.0) < 1) hu = 72; // tumour nodule
	// bowel gas bubbles (upper pelvis)
	if (
		t < 0.4 &&
		(ell(x, y, -6, ry * 0.35, 1.6, 1.3) < 1 || ell(x, y, 6.5, ry * 0.28, 1.4, 1.2) < 1)
	)
		hu = -780;
	// BONE
	if (t < 0.34) {
		// iliac wings + sacrum + L5
		const wing = (cx) => {
			const e = ell(x, y, cx, -ry * 0.15, 3.2, 5.0);
			return e < 1 && e > 0.42;
		};
		if (wing(rx * 0.55) || wing(-rx * 0.55)) hu = 560 + rnd() * 180;
		if (ell(x, y, 0, -ry * 0.55, 2.0, 1.6) < 1) hu = 430; // sacrum
		if (ell(x, y, 0, -ry * 0.32, 1.6, 1.3) < 1)
			hu = ell(x, y, 0, -ry * 0.32, 0.8, 0.7) < 1 ? 150 : 520; // L5 body+cortex
	} else if (t < 0.62) {
		// acetabula / femoral heads + pubis
		const head = (cx) => ell(x, y, cx, -ry * 0.02, 3.0, 3.0);
		if (head(rx * 0.58) < 1) {
			hu = head(rx * 0.58) > 0.5 ? 620 : 130;
		}
		if (head(-rx * 0.58) < 1) {
			hu = head(-rx * 0.58) > 0.5 ? 620 : 130;
		}
		if (ell(x, y, 0, ry * 0.42, 2.6, 1.1) < 1) hu = 560; // pubic rami
		if (ell(x, y, 0, -ry * 0.5, 1.6, 1.4) < 1) hu = 430; // sacrum/coccyx
	} else {
		// femoral shafts + ischium
		const shaft = (cx) => ell(x, y, cx, 0, 1.9, 1.9);
		if (shaft(rx * 0.5) < 1) {
			hu = shaft(rx * 0.5) > 0.45 ? 940 : 70;
		}
		if (shaft(-rx * 0.5) < 1) {
			hu = shaft(-rx * 0.5) > 0.45 ? 940 : 70;
		}
		if (
			ell(x, y, rx * 0.34, -ry * 0.45, 1.3, 1.2) < 1 ||
			ell(x, y, -rx * 0.34, -ry * 0.45, 1.3, 1.2) < 1
		)
			hu = 520; // ischial tuberosities
	}
	return hu;
}

export function huThorax(t, x, y) {
	const rx = lerp(15, 18, t),
		ry = lerp(11, 13, t);
	let hu = bodyBase(x, y, rx, ry, 1.3);
	if (hu <= -1000) return hu;
	const lungShrink = t > 0.78 ? lerp(1, 0.2, (t - 0.78) / 0.22) : 1;
	const lung = (cx) => ell(x, y, cx, ry * 0.05, rx * 0.4 * lungShrink, ry * 0.6 * lungShrink);
	if (lung(rx * 0.45) < 1) {
		hu = -780 + rnd() * 40;
		if (rnd() < 0.03) hu = 30;
	} // right lung + vessels
	if (lung(-rx * 0.45) < 1) {
		hu = -780 + rnd() * 40;
		if (rnd() < 0.03) hu = 30;
	} // left lung
	if (t > 0.2 && ell(x, y, -1.2, ry * 0.08, rx * 0.28, ry * 0.4) < 1) hu = 45; // heart/mediastinum (left)
	if (ell(x, y, 0, ry * 0.02, rx * 0.16, ry * 0.5) < 1) hu = 42; // mediastinum core / great vessels
	// spine posterior
	if (ell(x, y, 0, -ry * 0.62, 1.7, 1.5) < 1)
		hu = ell(x, y, 0, -ry * 0.62, 0.9, 0.8) < 1 ? 150 : 420;
	if (ell(x, y, 0, -ry * 0.5, 0.6, 0.6) < 1) hu = -30; // spinal canal
	// sternum anterior
	if (ell(x, y, 0, ry * 0.78, 1.4, 0.6) < 1) hu = 430;
	// rib dots around periphery
	for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
		const cx = Math.cos(a) * rx * 0.92,
			cy = Math.sin(a) * ry * 0.92 * 0.9;
		if (Math.sin(a) < 0.3 && ell(x, y, cx, cy, 0.7, 0.7) < 1) hu = 560;
	}
	return hu;
}

export function huAbdomen(t, x, y) {
	const rx = lerp(17, 18.5, t),
		ry = lerp(12, 13, t);
	let hu = bodyBase(x, y, rx, ry, 1.6);
	if (hu <= -1000) return hu;
	if (t < 0.55 && ell(x, y, rx * 0.4, ry * 0.08, rx * 0.5, ry * 0.55) < 1) hu = 60 + rnd() * 12; // liver (right)
	if (t < 0.32 && ell(x, y, -rx * 0.5, -ry * 0.1, rx * 0.22, ry * 0.3) < 1) hu = 52; // spleen
	if (t < 0.42 && ell(x, y, -rx * 0.35, ry * 0.35, 2.4, 2.0) < 1) hu = rnd() < 0.5 ? -780 : 20; // stomach gas/fluid
	const kid = (cx) => ell(x, y, cx, -ry * 0.28, 1.7, 2.4);
	if (t > 0.18 && t < 0.72) {
		if (kid(rx * 0.5) < 1) hu = kid(rx * 0.5) > 0.5 ? 32 : 12;
		if (kid(-rx * 0.5) < 1) hu = kid(-rx * 0.5) > 0.5 ? 32 : 12;
	}
	if (ell(x, y, 0, -ry * 0.6, 1.8, 1.6) < 1) hu = ell(x, y, 0, -ry * 0.6, 0.9, 0.8) < 1 ? 150 : 420; // vertebra
	if (ell(x, y, 0, -ry * 0.48, 0.6, 0.6) < 1) hu = -30; // canal
	if (ell(x, y, -1.2, -ry * 0.34, 0.7, 0.7) < 1) hu = 42; // aorta
	if (ell(x, y, 1.4, -ry * 0.32, 0.9, 0.7) < 1) hu = 40; // IVC
	// central bowel with gas
	if (ell(x, y, 0, ry * 0.15, rx * 0.5, ry * 0.5) < 1 && hu === 45) {
		if (rnd() < 0.12) hu = -820;
		else if (rnd() < 0.1) hu = 15;
	}
	return hu;
}

export function huHead(t, x, y) {
	const rx = lerp(6.5, 9, t),
		ry = lerp(7.5, 10, t);
	const e = ell(x, y, 0, 0, rx, ry);
	if (e > 1) return -1000;
	if (t > 0.82) {
		// orbit/sinus level
		if (ell(x, y, -3, ry * 0.2, 1.5, 1.5) < 1 || ell(x, y, 3, ry * 0.2, 1.5, 1.5) < 1) return 30; // globes
		if (ell(x, y, 0, ry * 0.35, 2.2, 1.6) < 1) return -900; // sinus air
	}
	if (ell(x, y, 0, 0, rx - 1.0, ry - 1.0) > 1) return 780 + rnd() * 120; // skull cortex
	let hu = 36 + rnd() * 6; // brain
	if (ell(x, y, 0, ry * 0.05, 0.35, 0.9) < 1) hu = 48; // falx (midline)
	if (
		t > 0.35 &&
		t < 0.75 &&
		(ell(x, y, -1.1, ry * 0.1, 0.9, 1.5) < 1 || ell(x, y, 1.1, ry * 0.1, 0.9, 1.5) < 1)
	)
		hu = 12; // lateral ventricles
	return hu;
}

/* build one axial slice HU buffer at normalized level t */
export function genSliceHU(region, t) {
	noiseSeed = ((t * 99991) | 0) ^ 0x5f3759df; // stable per level
	const dfov = S.proto.dfov,
		buf = new Float32Array(REC * REC);
	for (let r = 0; r < REC; r++) {
		const y = (0.5 - r / (REC - 1)) * dfov;
		for (let c = 0; c < REC; c++) {
			const x = (c / (REC - 1) - 0.5) * dfov;
			buf[r * REC + c] = sampleHU(region, t, x, y);
		}
	}
	return buf;
}

/* window/level → paint a HU buffer onto the axial canvas */
export function paintHU(buf) {
	const W = Math.max(1, S.ww),
		L = S.wl,
		low = L - 0.5 - (W - 1) / 2,
		high = L - 0.5 + (W - 1) / 2,
		img = axCtx.createImageData(REC, REC),
		d = img.data;
	for (let i = 0; i < buf.length; i++) {
		const h = buf[i];
		let v;
		if (h <= low) v = 0;
		else if (h > high) v = 255;
		else v = Math.round(((h - (L - 0.5)) / (W - 1) + 0.5) * 255);
		v = v < 0 ? 0 : v > 255 ? 255 : v;
		const k = i * 4;
		d[k] = d[k + 1] = d[k + 2] = v;
		d[k + 3] = 255;
	}
	axCtx.putImageData(img, 0, 0);
}

export function autoWindow() {
	if (!S.sliceHU || !S.sliceHU.length) return;
	const src = S.sliceHU[S.curSlice],
		vals = [];
	for (let i = 0; i < src.length; i += 2) {
		const h = src[i];
		if (h > -900 && h < 1800) vals.push(h);
	}
	if (vals.length < 20) return;
	vals.sort((a, b) => a - b);
	const q = (p) => vals[Math.max(0, Math.min(vals.length - 1, Math.floor((vals.length - 1) * p)))];
	const lo = q(0.06),
		hi = q(0.94);
	setWL(Math.max(60, Math.min(2500, Math.round(hi - lo))), Math.round((hi + lo) / 2));
	document.querySelectorAll('#wlGrid .chip').forEach((c) => c.classList.remove('active'));
}

export let hoverHU = null;
export function repaintCurrent() {
	if (!S.sliceHU || !S.sliceHU.length) {
		return;
	}
	paintHU(S.sliceHU[S.curSlice]);
	const t = S.sliceLevels[S.curSlice];
	const tablePos = levelToTablePos(t);
	document.getElementById('axTL').innerHTML =
		`${S.proto.name}<br>Slice ${S.curSlice + 1}/${S.sliceHU.length}`;
	document.getElementById('axTR').innerHTML =
		`WW ${S.ww} · WL ${S.wl}<br>${S.proto.slice.toFixed(1)} mm`;
	document.getElementById('axBL').innerHTML = `${S.techKv} kVp · ${S.techMas} mAs`;
	document.getElementById('axBR').innerHTML = `Table ${tablePos}<br>DFOV ${S.proto.dfov} cm`;
	document.getElementById('axMeta').textContent = hoverHU == null ? '— HU' : `${hoverHU} HU`;
}

export function levelToTablePos(t) {
	const [a, b] = spanOf(S.proto);
	const cm = lerp(a, b, t);
	return 'S' + cm.toFixed(1);
}

/* ---- topogram (scout) : stylised AP projection with scan-range brackets + slice line ---- */
export const topoCanvas = document.getElementById('topoCanvas'),
	topoCtx = topoCanvas.getContext('2d');
export const TOPO_W = topoCanvas.width,
	TOPO_H = topoCanvas.height;

export function drawScoutReal(sliceLineT = null) {
	const g = topoCtx,
		W = TOPO_W,
		H = TOPO_H;
	g.clearRect(0, 0, W, H);
	g.fillStyle = '#000';
	g.fillRect(0, 0, W, H);
	const V = REALV[S.proto.dataKey];
	if (!V || !V.loaded) return;
	const mTop = 30,
		mBot = H - 16,
		yOf = (t) => lerp(mTop, mBot, t),
		availH = mBot - mTop;
	const gap = 10,
		x0 = 18,
		colW = (W - 18 * 2 - gap) / 2;
	const panes = [
		['AP', V.scoutAP, x0],
		['LAT', V.scoutLAT, x0 + colW + gap]
	];
	g.imageSmoothingEnabled = true;
	panes.forEach(([lab, sc, px]) => {
		if (sc) g.drawImage(sc, px, mTop, colW, availH);
		g.strokeStyle = '#22323f';
		g.lineWidth = 1;
		g.strokeRect(px, mTop, colW, availH);
		g.fillStyle = '#8ff0e6';
		g.font = '700 10px ui-monospace,monospace';
		g.textAlign = 'center';
		g.fillText(lab, px + colW / 2, mTop - 9);
	});
	g.textAlign = 'left';
	const y1 = yOf(S.rangeStart / 100),
		y2 = yOf(S.rangeEnd / 100);
	g.fillStyle = 'rgba(53,214,196,0.10)';
	g.fillRect(x0, Math.min(y1, y2), W - 36, Math.abs(y2 - y1));
	g.strokeStyle = '#35d6c4';
	g.lineWidth = 2;
	[y1, y2].forEach((y) => {
		g.beginPath();
		g.moveTo(x0, y);
		g.lineTo(W - 18, y);
		g.stroke();
	});
	g.fillStyle = '#8ff0e6';
	g.font = '9px ui-monospace,monospace';
	g.fillText('START', x0 + 2, y1 - 3);
	g.fillText('END', x0 + 2, y2 + 11);
	if (sliceLineT != null) {
		const ys = yOf(sliceLineT);
		g.strokeStyle = '#f5b53d';
		g.lineWidth = 1.4;
		g.setLineDash([4, 3]);
		g.beginPath();
		g.moveTo(x0, ys);
		g.lineTo(W - 18, ys);
		g.stroke();
		g.setLineDash([]);
	}
	g.fillStyle = '#7f97ac';
	g.font = '9px ui-monospace,monospace';
	g.textAlign = 'center';
	g.fillText('SUP', W / 2, 14);
	g.fillText('INF', W / 2, H - 4);
	g.textAlign = 'left';
	const tp = document.getElementById('topoMeta');
	if (tp) tp.textContent = 'AP · LAT';
	document.getElementById('topoCornerTL').innerHTML = `${S.proto.name}<br>Scout · AP + Lateral DRR`;
}

export function drawTopogram(sliceLineT = null) {
	if (S.proto && S.proto.real) {
		return drawScoutReal(sliceLineT);
	}
	const g = topoCtx,
		W = TOPO_W,
		H = TOPO_H;
	g.clearRect(0, 0, W, H);
	g.fillStyle = '#000';
	g.fillRect(0, 0, W, H);
	const region = S.proto.region,
		mTop = 26,
		mBot = H - 16,
		cx = W / 2;
	// body silhouette (superior→inferior) as a filled path in grayscale
	const prof = []; // half-width per level
	const N = 40;
	for (let i = 0; i <= N; i++) {
		const t = i / N;
		let hw;
		if (region === 'pelvis') hw = lerp(46, 34, t) * (t < 0.15 ? lerp(0.7, 1, t / 0.15) : 1);
		else if (region === 'thorax') hw = lerp(38, 50, t);
		else if (region === 'abdomen') hw = lerp(48, 52, t);
		else hw = lerp(20, 30, t);
		prof.push(hw * 0.9);
	}
	const yOf = (t) => lerp(mTop, mBot, t);
	g.beginPath();
	g.moveTo(cx - prof[0], yOf(0));
	for (let i = 0; i <= N; i++) g.lineTo(cx - prof[i], yOf(i / N));
	for (let i = N; i >= 0; i--) g.lineTo(cx + prof[i], yOf(i / N));
	g.closePath();
	const grd = g.createLinearGradient(cx - 60, 0, cx + 60, 0);
	grd.addColorStop(0, '#3a3a3a');
	grd.addColorStop(0.5, '#8a8a8a');
	grd.addColorStop(1, '#3a3a3a');
	g.fillStyle = grd;
	g.fill();
	// spine column
	g.strokeStyle = '#dcdcdc';
	g.lineWidth = 6;
	g.beginPath();
	g.moveTo(cx, yOf(0.02));
	g.lineTo(cx, yOf(0.98));
	g.stroke();
	g.strokeStyle = '#111';
	g.lineWidth = 1;
	for (let i = 1; i < 24; i++) {
		const y = lerp(yOf(0.05), yOf(0.95), i / 24);
		g.beginPath();
		g.moveTo(cx - 4, y);
		g.lineTo(cx + 4, y);
		g.stroke();
	}
	// region-specific bright bone
	g.fillStyle = '#f2f2f2';
	if (region === 'pelvis') {
		g.beginPath();
		g.ellipse(cx, yOf(0.5), 34, 26, 0, 0, 7);
		g.fill('evenodd');
		g.strokeStyle = '#f4f4f4';
		g.lineWidth = 7;
		g.beginPath();
		g.arc(cx, yOf(0.45), 30, Math.PI * 0.15, Math.PI * 0.85);
		g.stroke();
		g.lineWidth = 8;
		g.beginPath();
		g.moveTo(cx - 8, yOf(0.86));
		g.lineTo(cx - 8, yOf(0.99));
		g.moveTo(cx + 8, yOf(0.86));
		g.lineTo(cx + 8, yOf(0.99));
		g.stroke();
	} else if (region === 'thorax') {
		g.fillStyle = '#111';
		g.beginPath();
		g.ellipse(cx - 20, yOf(0.5), 16, 44, 0, 0, 7);
		g.ellipse(cx + 20, yOf(0.5), 16, 44, 0, 0, 7);
		g.fill();
		g.strokeStyle = '#c9c9c9';
		g.lineWidth = 2;
		for (let i = 0; i < 9; i++) {
			const y = lerp(yOf(0.2), yOf(0.8), i / 9);
			g.beginPath();
			g.arc(cx - 22, y, 17, -0.6, 0.6);
			g.arc(cx + 22, y, 17, Math.PI - 0.6, Math.PI + 0.6);
			g.stroke();
		}
	} else if (region === 'head') {
		g.strokeStyle = '#f4f4f4';
		g.lineWidth = 6;
		g.beginPath();
		g.ellipse(cx, yOf(0.35), 24, 30, 0, 0, 7);
		g.stroke();
	}
	// scan-range brackets
	const y1 = yOf(S.rangeStart / 100),
		y2 = yOf(S.rangeEnd / 100);
	g.strokeStyle = '#35d6c4';
	g.lineWidth = 2;
	g.setLineDash([]);
	[y1, y2].forEach((y) => {
		g.beginPath();
		g.moveTo(18, y);
		g.lineTo(W - 18, y);
		g.stroke();
		g.fillStyle = '#35d6c4';
		g.fillRect(14, y - 1, 6, 2);
		g.fillRect(W - 20, y - 1, 6, 2);
	});
	g.fillStyle = 'rgba(53,214,196,0.10)';
	g.fillRect(18, Math.min(y1, y2), W - 36, Math.abs(y2 - y1));
	g.fillStyle = '#8ff0e6';
	g.font = '10px ui-monospace,monospace';
	g.fillText('START', 22, y1 - 4);
	g.fillText('END', 22, y2 + 12);
	// current slice line
	if (sliceLineT != null) {
		const ys = yOf(sliceLineT);
		g.strokeStyle = '#f5b53d';
		g.lineWidth = 1.5;
		g.setLineDash([4, 3]);
		g.beginPath();
		g.moveTo(14, ys);
		g.lineTo(W - 14, ys);
		g.stroke();
		g.setLineDash([]);
	}
	// orientation
	g.fillStyle = '#7f97ac';
	g.font = '9px ui-monospace,monospace';
	g.textAlign = 'center';
	g.fillText('SUP', cx, 16);
	g.fillText('INF', cx, H - 4);
	g.textAlign = 'left';
	document.getElementById('topoCornerTL').innerHTML = `${S.proto.name}<br>Scout · AP`;
}

/* topogram */
export function acquireTopogram() {
	if (!S.proto || S.scanning) return;
	if (!S.techniqueValidated) {
		setStatus('Validate habitus & technique first', 'busy');
		log('Imaging blocked — technique has not been validated.', 'warn');
		return;
	}
	if (!S.isoSet) {
		setStatus('Set isocenter before scout', 'busy');
		log('Imaging blocked — patient positioning/isocenter is incomplete.', 'warn');
		return;
	}
	setStatus('Acquiring topogram…', 'busy');
	setXray(true);
	log('Topogram (scout) acquisition…', 'warn');
	$('btnTopogram').disabled = true;
	let p = 0;
	const iv = setInterval(() => {
		p += 0.12;
		drawTopogram(p < 1 ? p : null);
		if (p >= 1) {
			clearInterval(iv);
			setXray(false);
			S.topoAcquired = true;
			$('topoHint').style.display = 'none';
			['rangeStart', 'rangeEnd'].forEach((id) => ($(id).disabled = false));
			$('btnScan').disabled = false;
			$('btnTopogram').disabled = false;
			drawTopogram();
			updateRangeLabels();
			setStatus('Topogram ready — plan range', 'rdy');
			setStep(5);
			log('Topogram ready. Define the scan range on the scout.', 'ok');
		}
	}, 40);
}

/* scan */
export let scanTimer = null;
export function startScan() {
	if (!S.topoAcquired || S.scanning) return;
	if (!S.techniqueValidated) {
		setStatus('Technique validation required', 'busy');
		log('Scan blocked — revalidate technique before acquisition.', 'warn');
		return;
	}
	const t0 = S.rangeStart / 100,
		t1 = S.rangeEnd / 100;
	let plan = [];
	if (S.proto.real) {
		const V = REALV[S.proto.dataKey],
			N = V.meta.n;
		const i0 = Math.round(t0 * (N - 1)),
			i1 = Math.round(t1 * (N - 1));
		const lo = Math.min(i0, i1),
			hi = Math.max(i0, i1);
		for (let idx = lo; idx <= hi; idx++) plan.push({ buf: V.slices[idx], t: idx / (N - 1) });
	} else {
		const [a, b] = spanOf(S.proto);
		const cmLen = lerp(a, b, t1) - lerp(a, b, t0);
		const nn = Math.max(4, Math.round((cmLen * 10) / S.proto.slice));
		for (let i = 0; i < nn; i++) {
			const f = i / (nn - 1 || 1);
			plan.push({ t: lerp(t0, t1, f), gen: true });
		}
	}
	const n = plan.length;
	S.scanning = true;
	S.sliceHU = [];
	S.sliceLevels = [];
	S.curSlice = 0;
	setStep(6);
	setStatus('Scanning…', 'busy');
	setXray(true);
	$('btnScan').disabled = true;
	$('btnStop').disabled = false;
	$('btnTopogram').disabled = true;
	document.querySelectorAll('.mb,[data-couch]').forEach((b) => (b.disabled = true));
	$('btnSetIso').disabled = true;
	$('axHint').style.display = 'none';
	$('progFill').classList.add('live');
	log(
		`${S.proto.real ? 'Loading real axial series' : 'Axial acquisition'} — ${n} slices @ ${S.proto.slice.toFixed(1)} mm, ${S.techKv} kVp / ${S.techMas} mAs.`,
		'warn'
	);
	const couchA = 12,
		couchB = -14;
	let i = 0;
	scanTimer = setInterval(
		() => {
			if (!S.scanning) {
				clearInterval(scanTimer);
				return;
			}
			const item = plan[i],
				f = i / (n - 1 || 1);
			S.couchZ = lerp(couchA, couchB, f); // index the table through the bore
			$('couchZval').textContent = 'Z ' + S.couchZ.toFixed(1);
			$('botCouchZ').textContent = S.couchZ.toFixed(1);
			const buf = item.gen ? genSliceHU(S.proto.region, item.t) : item.buf;
			S.sliceHU.push(buf);
			S.sliceLevels.push(item.t);
			S.curSlice = S.sliceHU.length - 1;
			repaintCurrent();
			drawTopogram(item.t);
			const pct = Math.round(((i + 1) / n) * 100);
			$('progFill').style.width = pct + '%';
			$('progPct').textContent = pct + '%';
			$('progText').textContent = `Acquiring slice ${i + 1} / ${n}`;
			$('acqSlices').textContent = S.sliceHU.length;
			i++;
			if (i >= n) {
				clearInterval(scanTimer);
				finishScan();
			}
		},
		S.proto.real ? 45 : 70
	);
}

export function finishScan() {
	S.scanning = false;
	setXray(false);
	$('progFill').classList.remove('live');
	$('btnStop').disabled = true;
	$('btnScan').disabled = false;
	$('btnTopogram').disabled = false;
	$('btnSetIso').disabled = false;
	document.querySelectorAll('.mb,[data-couch]').forEach((b) => (b.disabled = false));
	const n = S.sliceHU.length;
	$('sliceScroll').disabled = false;
	$('sliceScroll').max = n - 1;
	$('sliceScroll').value = n - 1;
	S.curSlice = n - 1;
	$('sliceLabel').textContent = `${n} / ${n}`;
	repaintCurrent();
	drawTopogram(S.sliceLevels[n - 1]);
	setStatus('Scan complete — review series', 'rdy');
	setStep(6);
	window.parent?.postMessage(
		{
			type: 'rtapps-ct-complete',
			key: S.proto?.key || '',
			patient: S.proto?.patient || '',
			series: S.proto?.series || '',
			images: n
		},
		'*'
	);
	$('progText').textContent = `Series complete · ${n} images`;
	log(`Reconstruction complete — <b>${n}</b> axial images. Scroll to review.`, 'ok');
}

export function stopScan() {
	if (!S.scanning) return;
	S.scanning = false;
	if (scanTimer) clearInterval(scanTimer);
	setXray(false);
	$('progFill').classList.remove('live');
	$('btnStop').disabled = true;
	$('btnScan').disabled = false;
	$('btnTopogram').disabled = false;
	$('btnSetIso').disabled = false;
	document.querySelectorAll('.mb,[data-couch]').forEach((b) => (b.disabled = false));
	const n = S.sliceHU ? S.sliceHU.length : 0;
	if (n > 0) {
		$('sliceScroll').disabled = false;
		$('sliceScroll').max = n - 1;
		$('sliceScroll').value = n - 1;
		S.curSlice = n - 1;
		$('sliceLabel').textContent = `${n} / ${n}`;
		repaintCurrent();
	}
	setStatus('Scan stopped', 'busy');
	log('Acquisition stopped by operator.', 'hot');
}

export function reviewSlice(i) {
	if (!S.sliceHU || !S.sliceHU.length) return;
	S.curSlice = Math.max(0, Math.min(S.sliceHU.length - 1, i));
	$('sliceLabel').textContent = `${S.curSlice + 1} / ${S.sliceHU.length}`;
	repaintCurrent();
	drawTopogram(S.sliceLevels[S.curSlice]);
}

/* ---- HU cursor on the axial image ---- */
axCanvas.addEventListener('mousemove', (e) => {
	if (!S.sliceHU || !S.sliceHU.length) {
		return;
	}
	const r = axCanvas.getBoundingClientRect();
	const cx = Math.floor(((e.clientX - r.left) / r.width) * REC),
		cy = Math.floor(((e.clientY - r.top) / r.height) * REC);
	if (cx < 0 || cy < 0 || cx >= REC || cy >= REC) {
		hoverHU = null;
	} else {
		hoverHU = Math.round(S.sliceHU[S.curSlice][cy * REC + cx]);
	}
	$('axMeta').textContent = hoverHU == null ? '— HU' : `${hoverHU} HU  (${cx},${cy})`;
});
axCanvas.addEventListener('mouseleave', () => {
	hoverHU = null;
	$('axMeta').textContent = '— HU';
});
