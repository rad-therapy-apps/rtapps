// Furniture for the sim-hub NPC check (scripts/sim-hub-npc-check.mjs, checks k, l and m): which
// meshes count as furniture, the signed distance from a point to one, a person's body points and
// the seat meshes a sitter may touch. Every function takes the page's test hook object
// (window.__NPC, src/npc-check-hook.ts) or what buildFurniture returned; nothing is imported from
// the bundle.

/* The furniture: every mesh that is not a person, a mover, hidden, a floor, wall or ceiling part, a
   mat, a glass pane, a plane or a wall item above 2 m. Each record keeps the mesh `o`, its world box
   `b`, its geometry type and parameters, its world-matrix inverse and scale (for sdf), its size in
   metres `dims`, its `top` and `bot`, and its material. near(x, z) gives the indices into `list` of
   the records whose box comes within 0.5 m of the 1 m cell holding (x, z). */
export function buildFurniture(NPC) {
	const scene = NPC.scene;
	scene.updateMatrixWorld(true);
	const M4 = scene.matrixWorld.constructor,
		moverMeshes = new Set(),
		list = [];
	NPC.movers.forEach((m) => m.group.traverse((o) => moverMeshes.add(o)));
	const nearRoomWall = (cx, cz, L) =>
		NPC.ROOMS.some((r) => {
			const lx = [r.x - r.w / 2, r.x + r.w / 2],
				lz = [r.z - r.d / 2, r.z + r.d / 2];
			return (
				(L[0] < L[2] &&
					lx.some((x) => Math.abs(cx - x) < 0.15) &&
					cz > lz[0] - 1 &&
					cz < lz[1] + 1) ||
				(L[2] < L[0] && lz.some((z) => Math.abs(cz - z) < 0.15) && cx > lx[0] - 1 && cx < lx[1] + 1)
			);
		});
	const insideCollider = (b, cx, cz) =>
		NPC.colliders.some(
			(c) =>
				cx >= c.x - c.hw - 0.03 &&
				cx <= c.x + c.hw + 0.03 &&
				cz >= c.z - c.hd - 0.03 &&
				cz <= c.z + c.hd + 0.03 &&
				b.min.x >= c.x - c.hw - 0.1 &&
				b.max.x <= c.x + c.hw + 0.1 &&
				b.min.z >= c.z - c.hd - 0.1 &&
				b.max.z <= c.z + c.hd + 0.1
		);
	scene.traverse((o) => {
		if (!o.isMesh) return;
		for (let p = o; p; p = p.parent) {
			// people (walking figures and lying patients) are what is measured
			if (p.userData?.walkRig || p.userData?.lying) return;
			// movers (their walkers, vehicles and carts) are check (a)'s
			if (moverMeshes.has(p)) return;
			// anything hidden, itself or by an ancestor
			if (p.visible === false) return;
		}
		if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
		const gb = o.geometry.boundingBox,
			e = o.matrixWorld.elements,
			sc = [
				Math.hypot(e[0], e[1], e[2]),
				Math.hypot(e[4], e[5], e[6]),
				Math.hypot(e[8], e[9], e[10])
			],
			b = gb.clone().applyMatrix4(o.matrixWorld),
			L = [gb.max.x - gb.min.x, gb.max.y - gb.min.y, gb.max.z - gb.min.z].map((v, i) => v * sc[i]),
			ext = b.max.y - b.min.y,
			thin = Math.min(L[0], L[2]),
			longh = Math.max(L[0], L[2]),
			cx = (b.min.x + b.max.x) / 2,
			cz = (b.min.z + b.max.z) / 2,
			gtype = o.geometry.type;
		if (
			// glass: a see-through pane (opacity under 0.5), over 0.5 m tall and at most 0.15 m thick
			(o.material?.transparent && o.material.opacity < 0.5 && ext > 0.5 && thin <= 0.15) ||
			// mats, decals and markings: under 0.03 m tall
			ext < 0.03 ||
			// ceilings, lights and wall items above 2 m: the bottom above 2 m
			b.min.y > 2.0 ||
			// floor trim: the top under 0.12 m
			b.max.y < 0.12 ||
			// floor slabs: over 2.5 m both ways and under 0.35 m tall
			(longh > 2.5 && thin > 2.5 && ext < 0.35) ||
			// walls, doors and posts: over 2 m tall, at most 0.3 m thick, from below 0.5 m
			(ext > 2.0 && thin <= 0.3 && b.min.y < 0.5) ||
			// anything over 3 m tall but a torus (the gantry rings)
			(ext > 3.0 && gtype !== 'TorusGeometry') ||
			// planes: decals and signs
			gtype === 'PlaneGeometry' ||
			// baseboards and trim: at most 0.2 m tall and 0.1 m thick, over 1.5 m long
			(ext <= 0.2 && thin <= 0.1 && longh > 1.5) ||
			// wall-hosted panels and windows: at most 0.12 m thick, 0.6 m tall and 0.8 m long, on a room wall
			(thin <= 0.12 && ext >= 0.6 && longh >= 0.8 && nearRoomWall(cx, cz, L)) ||
			// parts of a wall: centred in a wall collider (+0.03 m) and inside it (+0.1 m)
			insideCollider(b, cx, cz)
		)
			return;
		const half = [0, 1, 2].map(
			(i) => ((gb.max.getComponent(i) - gb.min.getComponent(i)) / 2) * sc[i]
		);
		list.push({
			o,
			b,
			sc,
			gtype,
			par: o.geometry.parameters || {},
			inv: new M4().copy(o.matrixWorld).invert(),
			cen: [0, 1, 2].map((i) => (gb.min.getComponent(i) + gb.max.getComponent(i)) / 2),
			half,
			mat: o.material,
			dims: L.map((v) => +v.toFixed(2)),
			top: b.max.y,
			bot: b.min.y
		});
	});
	// spatial hash on 1 m cells; each record is filed in every cell within 0.5 m of its box
	const grid = new Map(),
		key = (i, j) => i * 100003 + j;
	list.forEach((r, idx) => {
		for (let i = Math.floor(r.b.min.x - 0.5); i <= Math.floor(r.b.max.x + 0.5); i++)
			for (let j = Math.floor(r.b.min.z - 0.5); j <= Math.floor(r.b.max.z + 0.5); j++) {
				const k = key(i, j);
				if (!grid.has(k)) grid.set(k, []);
				grid.get(k).push(idx);
			}
	});
	return { list, near: (x, z) => grid.get(key(Math.floor(x), Math.floor(z))) || [] };
}

/* Signed distance in metres from the world point p ({ x, y, z }) to the record's volume: negative
   inside (the depth is -sdf). Cylinders (tapered too), tori and spheres by their parameters, every
   other geometry by its box. Worked in the mesh's own frame, scaled to metres. */
export function sdf(r, p) {
	const e = r.inv.elements,
		x = (e[0] * p.x + e[4] * p.y + e[8] * p.z + e[12] - r.cen[0]) * r.sc[0],
		y = (e[1] * p.x + e[5] * p.y + e[9] * p.z + e[13] - r.cen[1]) * r.sc[1],
		z = (e[2] * p.x + e[6] * p.y + e[10] * p.z + e[14] - r.cen[2]) * r.sc[2],
		[hx, hy, hz] = r.half;
	if (r.gtype === 'CylinderGeometry') {
		const t = (y + hy) / (2 * hy),
			R = (r.par.radiusBottom + (r.par.radiusTop - r.par.radiusBottom) * t) * r.sc[0],
			dr = Math.hypot(x, z) - Math.max(R, 0),
			dy = Math.abs(y) - hy;
		if (dr <= 0 && dy <= 0) return Math.max(dr, dy);
		return Math.hypot(Math.max(dr, 0), Math.max(dy, 0));
	}
	if (r.gtype === 'TorusGeometry')
		return Math.hypot(Math.hypot(x, y) - r.par.radius * r.sc[0], z) - r.par.tube * r.sc[0];
	if (r.gtype === 'SphereGeometry') return Math.hypot(x, y, z) - r.par.radius * r.sc[0];
	const dx = Math.abs(x) - hx,
		dy = Math.abs(y) - hy,
		dz = Math.abs(z) - hz;
	if (dx <= 0 && dy <= 0 && dz <= 0) return Math.max(dx, dy, dz);
	return Math.hypot(Math.max(dx, 0), Math.max(dy, 0), Math.max(dz, 0));
}

/* A person's body: the meshes under its leg pivots (walkRig.legLP/legRP) and its torso
   (faceRig.torso), each sampled on an n x n x n grid over its geometry box, in world coordinates,
   as { x, y, z, part }. Arms and head are not checked. */
export function bodyPoints(g, n) {
	g.updateWorldMatrix(true, true);
	const rig = g.userData.walkRig,
		parts = [],
		pts = [];
	for (const [part, leg] of [
		['legL', rig.legLP],
		['legR', rig.legRP]
	])
		leg.traverse((o) => {
			if (o.isMesh) parts.push([part, o]);
		});
	parts.push(['torso', g.userData.faceRig.torso]);
	for (const [part, o] of parts) {
		if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
		const { min, max } = o.geometry.boundingBox,
			e = o.matrixWorld.elements;
		for (let i = 0; i < n; i++)
			for (let j = 0; j < n; j++)
				for (let k = 0; k < n; k++) {
					const x = min.x + ((max.x - min.x) * i) / (n - 1),
						y = min.y + ((max.y - min.y) * j) / (n - 1),
						z = min.z + ((max.z - min.z) * k) / (n - 1);
					pts.push({
						part,
						x: e[0] * x + e[4] * y + e[8] * z + e[12],
						y: e[1] * x + e[5] * y + e[9] * z + e[13],
						z: e[2] * x + e[6] * y + e[10] * z + e[14]
					});
				}
	}
	return pts;
}

/* The meshes of the seats at the world seat anchors `anchors` ({ x, z, top }, as seatInWorld gives
   them): the pan (a record whose top is within 0.04 m of the anchor's and that comes within 0.06 m
   of the point 0.02 m under the anchor) and the frame (records of the pan's material under 1.3 m
   that come within 0.45 m of the anchor's vertical at their own mid-height: legs, back, arms). */
export function seatMeshes(F, anchors) {
	const out = new Set();
	for (const s of anchors) {
		const pan = { x: s.x, y: s.top - 0.02, z: s.z };
		let mat = null;
		for (const r of F.list)
			if (Math.abs(r.top - s.top) < 0.04 && sdf(r, pan) <= 0.06) {
				out.add(r);
				mat = r.mat;
			}
		if (mat)
			for (const r of F.list)
				if (
					r.mat === mat &&
					r.top < 1.3 &&
					sdf(r, { x: s.x, y: (r.bot + r.top) / 2, z: s.z }) < 0.45
				)
					out.add(r);
	}
	return out;
}

/* Person g against the furniture, leaving out the records in `skip`: `depth`, the deepest any body
   point is inside a record (0 when none is); `clearance`, the least signed distance (negative when
   inside; Infinity with no furniture within 0.5 m); `nearest`, the record and body part giving it;
   and `hits`, one per record entered ({ rec, depth, part, at }), deepest first. */
export function measure(F, g, skip, pts = bodyPoints(g, 6)) {
	const per = new Map();
	let clearance = Infinity,
		nearest = null;
	for (const p of pts)
		for (const idx of F.near(p.x, p.z)) {
			const r = F.list[idx];
			if (skip.has(r)) continue;
			const sd = sdf(r, p);
			if (sd < clearance) {
				clearance = sd;
				nearest = { rec: r, part: p.part };
			}
			if (sd < 0 && -sd > (per.get(r)?.depth ?? 0))
				per.set(r, { rec: r, depth: -sd, part: p.part, at: [p.x, p.y, p.z] });
		}
	const hits = [...per.values()].sort((a, b) => b.depth - a.depth);
	return { depth: hits.length ? hits[0].depth : 0, clearance, nearest, hits };
}

/** One line for a furniture record: geometry, size, top, centre and colour. */
export function describe(r) {
	const cx = (r.b.min.x + r.b.max.x) / 2,
		cz = (r.b.min.z + r.b.max.z) / 2,
		colour = r.mat?.color?.getHexString?.();
	return `${r.gtype.replace('Geometry', '')} ${r.dims.join(' x ')} m, top ${r.top.toFixed(2)}, at (${cx.toFixed(2)}, ${cz.toFixed(2)})${colour ? `, #${colour}` : ''}`;
}
