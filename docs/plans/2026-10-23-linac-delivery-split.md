# Split linac-delivery.ts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `apps/web/arcade-src/linac-ct/src/linac-delivery.ts` (7,469 lines) into 12 feature files under `linac-ct/src/delivery/`, verbatim, with proof that the built simulator contains exactly the same code.

**Architecture:**
- **A generator script does the move,** not hand edits. It uses the TypeScript compiler API to:
  - assign every top-level statement, with its leading comments, to a file by its start line;
  - write each file's import block;
  - add `export` only where a name is now used across files;
  - rewrite the six importers' `./linac-delivery` imports.
- **Two scripts prove the result:** one checks the source is verbatim, the other compares the unminified bundles before and after.

Spec: `docs/specs/2026-10-23-linac-delivery-split-design.md`.

**Tech Stack:** TypeScript 6 compiler API (from `apps/web/node_modules`), Vite 8 / rolldown arcade builds, Prettier (tabs, single quotes, no trailing commas, width 100), ESLint.

## Global Constraints

- **New files:** exactly these 12 in `apps/web/arcade-src/linac-ct/src/delivery/`: `types.ts`, `plan.ts`, `special-setup.ts`, `stereotactic.ts`, `motion.ts`, `ois.ts`, `adaptive.ts`, `electron-bolus.ts`, `immobilization.ts`, `treatment-delivery.ts`, `cases.ts`, `case-setup.ts`.
- **Deleted:** `apps/web/arcade-src/linac-ct/src/linac-delivery.ts`.
- **Importers:** in `main.ts`, `linac-safety.ts`, `scene.ts`, `linac-igrt.ts`, `sdk.ts` and `state.ts` (all in `linac-ct/src/`), only `import` statements change. Nothing else in the repo changes.
- **Moved code is verbatim.** The only allowed text changes:
  1. the import blocks;
  2. `export ` added in front of exactly these 18 previously private names: CoordinateShift, FieldGeometry, DeliveryFieldPlan, PlannedParameters, renderAdaptiveCourse, AdaptiveCourseSpec, resetTreatmentDeliveryForCase, resetSRSWorkflowForCase, resetSpecialSetupForCase, loadOISSession, populateDeliveryFieldSelect, renderElectronBolusDeliveryTask, applyDynamicDeliveryMachineState, currentMotionGateOpen, isDynamicTreatmentField, resetImmobilizationWorkflowForCase, resetAdaptiveWorkflowForCase, PATIENT_ROT;
  3. one header line per new file, `// <what it holds> (split out of linac-delivery.ts, #77).`;
  4. Prettier re-wrapping a line that grew by `export `.
- **No barrel/index file.** No new dependencies. Pre-existing dead code (e.g. `setReceptorSID` with its eslint-disable comment) moves unchanged.
- **Built output:** the unminified linac-ct `index-*.js` has the same top-level statements before and after (`SAME STATEMENTS`). `ct-suite-*.js` is byte-identical.
- **Off-limits:** never read, create or edit any file whose name starts with `.env`. Never `git add` anything under `.superpowers/`.
- **Git:** stay on branch `refactor/linac-delivery-split`. Never switch branches, push, stash or force.
- **Commit trailer:** `Co-Authored-By: <your model name> <noreply@anthropic.com>`.

---

### Task 1: Generate, verify and commit the split

**Files:**
- Create: `apps/web/arcade-src/linac-ct/src/delivery/{types,plan,special-setup,stereotactic,motion,ois,adaptive,electron-bolus,immobilization,treatment-delivery,cases,case-setup}.ts`
- Modify (import statements only): `apps/web/arcade-src/linac-ct/src/{main,linac-safety,scene,linac-igrt,sdk,state}.ts`
- Delete: `apps/web/arcade-src/linac-ct/src/linac-delivery.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: the 12 modules. Each name that `linac-delivery.ts` exported is now exported from the file that holds it (the generator rewrites the importers accordingly).

All commands run from `apps/web`, with these variables:

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps/apps/web
S=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/split
TSP=$(node -p "require.resolve('typescript')")
```

- [ ] **Step 1: Make sure the three scripts exist.** `ls $S/split.cjs $S/verbatim.cjs $S/bundle-compare.cjs`. If any is missing, the scratch folder is wiped daily, so recreate it byte-for-byte from the Appendix at the end of this plan (`mkdir -p $S` first).

- [ ] **Step 2: Baseline, before any edit.**

```bash
git status --short                      # must print nothing
cp arcade-src/linac-ct/src/linac-delivery.ts $S/old-linac-delivery.ts
rm -rf $S/before && pnpm exec vite build -c vite.arcade.linac-ct.config.ts --minify false --outDir $S/before --emptyOutDir >/dev/null 2>&1 && ls $S/before/assets/*.js
```

Expected: an empty `git status`, then three `.js` files (`ct-suite-*`, `index-*`, `modulepreload-polyfill-*`).

- [ ] **Step 3: Run the generator, then format.**

```bash
node $S/split.cjs $TSP arcade-src/linac-ct/src
pnpm exec prettier --write arcade-src/linac-ct/src >/dev/null
git status --short
```

Expected:
- The generator prints `statements 173 -> 12 files; exports added:` followed by exactly the 18 names in Global Constraints.
- It then lists the 12 files with statement counts: types 23, plan 23, special-setup 14, stereotactic 13, motion 15, ois 12, adaptive 20, electron-bolus 7, immobilization 20, treatment-delivery 13, cases 6, case-setup 7.
- It prints one line per rewritten importer declaration.
- `git status` shows `D linac-delivery.ts`, ` M` for the six importers, and `?? arcade-src/linac-ct/src/delivery/`. Nothing else.

- [ ] **Step 4: Verbatim check, and "importers changed only imports".**

```bash
node $S/verbatim.cjs $TSP $S/old-linac-delivery.ts arcade-src/linac-ct/src/delivery/{types,plan,special-setup,stereotactic,motion,ois,adaptive,electron-bolus,immobilization,treatment-delivery,cases,case-setup}.ts
git diff -U0 -- arcade-src/linac-ct/src/{main,linac-safety,scene,linac-igrt,sdk,state}.ts | grep -E '^[-+]' | grep -vE '^(\+\+\+|---)' | grep -vE '^[-+](import |\} from |	[A-Za-z_$][A-Za-z0-9_$]*,?$|	type [A-Za-z_$][A-Za-z0-9_$]*,?$|$)' ; echo "importer check done"
```

Expected:
- `VERBATIM OK`. It may say `(N statement(s) differ only in line wrapping)`, with `REWRAPPED` lines. Each REWRAPPED line must be one of the 18 names that gained `export`; report them.
- The second command prints only `importer check done`. Any other line is a non-import change in an importer: STOP and report it. (The tab character inside the pattern is a literal tab: Prettier indents wrapped import names with tabs.)

- [ ] **Step 5: Gates.**

```bash
pnpm check 2>&1 | tail -1                                    # 0 ERRORS (23 pre-existing warnings)
pnpm exec eslint arcade-src src && echo "eslint ok"
pnpm exec prettier --check arcade-src | tail -1               # All matched files use Prettier code style!
pnpm test 2>&1 | grep -E "Test Files|Tests " | tail -2        # 326 passed
```

- **If `pnpm check` reports a missing name, or eslint an unused import** (possible when a local variable shadows an imported name), fix it ONLY by adding or removing that name in the affected file's import block. Never edit moved code. Then re-run Steps 4 and 5.
- **Anything else failing:** STOP and report.

- [ ] **Step 6: Built-output comparison.**

```bash
rm -rf $S/after && pnpm exec vite build -c vite.arcade.linac-ct.config.ts --minify false --outDir $S/after --emptyOutDir >/dev/null 2>&1
node $S/bundle-compare.cjs $TSP $S/before/assets/index-*.js $S/after/assets/index-*.js
cmp $S/before/assets/ct-suite-*.js $S/after/assets/ct-suite-*.js && echo "ct-suite identical"
```

Expected: `SAME STATEMENTS` with equal before/after counts, then `ct-suite identical`. If `BUNDLE DIFFERENCES` appear, STOP and report them verbatim.

- [ ] **Step 7: Normal build and smoke check** (a module-load-order crash would show here).

```bash
pnpm build:arcade >/dev/null 2>&1 && echo built
node scripts/arcade-smoke.mjs arcade/sim-hub/index.html arcade/linac-ct/index.html arcade/linac-ct/ct-suite.html 2>&1 | grep -E "SMOKE (OK|FAIL|TIMEOUT)"
```

Expected: `built`, then three `SMOKE OK` lines.

- [ ] **Step 8: Commit.**

```bash
cd /Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps
git add -A apps/web/arcade-src/linac-ct/src
git status --short        # 12 A (delivery/*), 6 M (importers), 1 D (linac-delivery.ts); nothing else
git commit -m "refactor(linac-ct): split linac-delivery.ts into delivery/ feature modules (#77)

Pure move of the 7,469-line file into 12 files (types, plan,
special-setup, stereotactic, motion, ois, adaptive, electron-bolus,
immobilization, treatment-delivery, cases, case-setup), generated by a
TypeScript-compiler script that slices statements with their comments.
Only import blocks, a one-line header per file, and 'export' on 18
helpers now shared across files changed. Verbatim check: all 173
statements and their comments match. The unminified linac-ct bundle has
the same top-level statements before and after; the CT-suite bundle is
byte-identical.

Co-Authored-By: <your model name> <noreply@anthropic.com>"
```

**Report:**
- the generator's output;
- the verbatim result (with any REWRAPPED lines) and the importer check;
- every gate's output;
- the bundle comparison counts plus the `ct-suite identical` line;
- the smoke lines;
- the final `git status`;
- the commit hash.

---

## Appendix: the three scripts (recreate byte-for-byte if missing)

### `split.cjs`

```js
// Split linac-delivery.ts into delivery/*.ts by statement start line, generate each file's
// imports, add `export` where a name is now used across files, and rewrite the importers.
// Usage: node split.cjs <typescript module path> <linac-ct/src dir> [--out <dir>] (dry run: write
// new files to <dir>, leave the source tree untouched).
const ts = require(process.argv[2]);
const fs = require('fs');
const path = require('path');
const SRC = process.argv[3];
const outIdx = process.argv.indexOf('--out');
const DRY = outIdx > 0 ? process.argv[outIdx + 1] : null;
const OLD = path.join(SRC, 'linac-delivery.ts');

const FILES = [
	['types', 'Shared types for the treatment-delivery modules', [[93, 352]]],
	['plan', 'Plan, field and couch geometry, arcs; ODI/jaw/SID drivers', [[356, 704], [3904, 3934]]],
	['special-setup', 'Special setups: breast match, CSI, electron fields', [[706, 1021], [7355, 7386]]],
	['stereotactic', 'SRS / SBRT checklist, dry run and clearance', [[1023, 1379]]],
	['motion', 'Motion management: 4D, DIBH hold, gating', [[1381, 1807]]],
	['ois', 'OIS record-and-verify and sign-off', [[1809, 2196]]],
	['adaptive', 'Adaptive replanning course and dose chart', [[2198, 2787]]],
	['electron-bolus', 'Electron bolus delivery task and bolus mesh', [[2789, 2983], [7388, 7415]]],
	['immobilization', 'Immobilization devices, verification and rules', [[2985, 3504], [6899, 6997]]],
	['treatment-delivery', 'Beam-on delivery: arm, hold, resume, terminate', [[354, 354], [3506, 3902]]],
	['cases', 'Treatment case library (data only)', [[3936, 6896], [6999, 7249]]],
	['case-setup', 'Case loading, patient pose and patient setup', [[7251, 7353], [7417, 7469]]]
];
const IMPORTERS = ['main.ts', 'linac-safety.ts', 'scene.ts', 'linac-igrt.ts', 'sdk.ts', 'state.ts'];

const text = fs.readFileSync(OLD, 'utf8');
const sf = ts.createSourceFile(OLD, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const lineOf = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;

// Old imports: local binding name -> { spec, imported, namespace, typeOnly }
const oldImports = new Map();
const importOrder = [];
const stmts = [];
for (const st of sf.statements) {
	if (ts.isImportDeclaration(st)) {
		const spec = st.moduleSpecifier.text;
		importOrder.push(spec);
		const cl = st.importClause;
		if (cl.namedBindings && ts.isNamespaceImport(cl.namedBindings))
			oldImports.set(cl.namedBindings.name.text, { spec, namespace: true });
		else if (cl.namedBindings)
			for (const el of cl.namedBindings.elements)
				oldImports.set(el.name.text, { spec, imported: el.propertyName?.text, typeOnly: cl.isTypeOnly || el.isTypeOnly });
		if (cl.name) throw new Error('default import not handled: ' + st.getText(sf));
		continue;
	}
	const names = ts.isVariableStatement(st)
		? st.declarationList.declarations.map((d) => d.name.text)
		: [st.name.text];
	const exported = !!st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
	const line = lineOf(st.getStart(sf));
	const file = FILES.find(([, , rs]) => rs.some(([a, b]) => line >= a && line <= b));
	if (!file) throw new Error(`statement at line ${line} (${names}) is not assigned to a file`);
	stmts.push({ st, names, exported, line, file: file[0], isType: ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st) });
}
const home = new Map(stmts.flatMap((s) => s.names.map((n) => [n, s])));

// Identifiers a statement references (not property names, not its own declarations).
function refs(node) {
	const out = new Set();
	const visit = (n) => {
		if (ts.isIdentifier(n)) {
			const p = n.parent;
			const isPropName =
				(ts.isPropertyAccessExpression(p) && p.name === n) ||
				(ts.isQualifiedName(p) && p.right === n) ||
				((ts.isPropertyAssignment(p) || ts.isPropertySignature(p) || ts.isMethodDeclaration(p) ||
					ts.isPropertyDeclaration(p) || ts.isMethodSignature(p) || ts.isGetAccessor(p) || ts.isSetAccessor(p)) && p.name === n) ||
				((ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isFunctionDeclaration(p) || ts.isBindingElement(p) ||
					ts.isInterfaceDeclaration(p) || ts.isTypeAliasDeclaration(p)) && p.name === n);
			if (!isPropName) out.add(n.text);
		}
		ts.forEachChild(n, visit);
	};
	visit(node);
	return out;
}

const byFile = new Map(FILES.map(([f]) => [f, []]));
for (const s of stmts) byFile.get(s.file).push(s);
const usedBy = new Map(); // file -> Set(names referenced from that file)
for (const [f, list] of byFile) {
	const u = new Set();
	for (const s of list) for (const r of refs(s.st)) if (!s.names.includes(r)) u.add(r);
	usedBy.set(f, u);
}
// Names needed from another delivery file must be exported.
const needsExport = new Set();
for (const [f, u] of usedBy) for (const n of u) { const h = home.get(n); if (h && h.file !== f) needsExport.add(h); }

const outDir = DRY || path.join(SRC, 'delivery');
fs.mkdirSync(outDir, { recursive: true });
const FILE_ORDER = FILES.map(([f]) => f);
for (const [f, header] of FILES.map(([f, h]) => [f, h])) {
	const list = byFile.get(f);
	const u = usedBy.get(f);
	const lines = [`// ${header} (split out of linac-delivery.ts, #77).`];
	for (const spec of importOrder) {
		const names = [...oldImports].filter(([n, i]) => i.spec === spec && u.has(n));
		if (!names.length) continue;
		const target = spec.startsWith('./') ? '../' + spec.slice(2) : spec;
		if (names[0][1].namespace) { lines.push(`import * as ${names[0][0]} from '${target}';`); continue; }
		const typeNames = names.filter(([, i]) => i.typeOnly), valueNames = names.filter(([, i]) => !i.typeOnly);
		const fmt = (arr) => arr.map(([n, i]) => (i.imported ? `${i.imported} as ${n}` : n)).join(', ');
		if (valueNames.length) lines.push(`import { ${fmt(valueNames)} } from '${target}';`);
		if (typeNames.length) lines.push(`import type { ${fmt(typeNames)} } from '${target}';`);
	}
	for (const other of FILE_ORDER) {
		if (other === f) continue;
		const fromOther = stmts.filter((s) => s.file === other).flatMap((s) => s.names.filter((n) => u.has(n)).map((n) => [n, s.isType]));
		const types = fromOther.filter(([, t]) => t).map(([n]) => n), values = fromOther.filter(([, t]) => !t).map(([n]) => n);
		if (values.length) lines.push(`import { ${values.join(', ')} } from './${other}';`);
		if (types.length) lines.push(`import type { ${types.join(', ')} } from './${other}';`);
	}
	let body = '';
	for (const s of list) {
		let full = text.slice(s.st.pos, s.st.end);
		if (!s.exported && needsExport.has(s)) {
			const startOff = s.st.getStart(sf) - s.st.pos;
			full = full.slice(0, startOff) + 'export ' + full.slice(startOff);
		}
		body += full;
	}
	fs.writeFileSync(path.join(outDir, f + '.ts'), lines.join('\n') + '\n' + body.replace(/^\n+/, '\n') + '\n');
}

// Rewrite importers: each `from './linac-delivery'` import becomes per-file imports.
const report = [];
for (const imp of IMPORTERS) {
	const p = path.join(SRC, imp);
	const t = fs.readFileSync(p, 'utf8');
	const isf = ts.createSourceFile(p, t, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	let next = t;
	const decls = isf.statements.filter((s) => ts.isImportDeclaration(s) && s.moduleSpecifier.text === './linac-delivery');
	for (const d of decls.reverse()) {
		const cl = d.importClause;
		const groups = new Map();
		for (const el of cl.namedBindings.elements) {
			const name = (el.propertyName || el.name).text;
			const h = home.get(name);
			if (!h) throw new Error(`${imp} imports ${name}, not defined in linac-delivery.ts`);
			const key = `${cl.isTypeOnly ? 'type ' : ''}${h.file}`;
			if (!groups.has(key)) groups.set(key, []);
			groups.get(key).push(el.getText(isf));
		}
		const out = [...groups].sort((a, b) => FILE_ORDER.indexOf(a[0].replace('type ', '')) - FILE_ORDER.indexOf(b[0].replace('type ', '')))
			.map(([k, els]) => `import ${k.startsWith('type ') ? 'type ' : ''}{ ${els.join(', ')} } from './delivery/${k.replace('type ', '')}';`).join('\n');
		next = next.slice(0, d.getStart(isf)) + out + next.slice(d.end);
		report.push(`${imp}: ${cl.namedBindings.elements.length} names -> ${groups.size} imports`);
	}
	if (!DRY) fs.writeFileSync(p, next);
	else fs.writeFileSync(path.join(DRY, '_importer_' + imp), next);
}
console.log(`statements ${stmts.length} -> ${FILES.length} files; exports added: ${needsExport.size ? [...needsExport].filter((s) => !s.exported).flatMap((s) => s.names).join(', ') : 'none'}`);
for (const [f] of FILES) console.log(`  ${f}.ts: ${byFile.get(f).length} statements`);
console.log(report.join('\n'));
if (!DRY) fs.unlinkSync(OLD);
```

### `verbatim.cjs`

```js
// Verbatim-move check. Usage: node verbatim.cjs <typescript module path> <old.ts> <new.ts>...
// Compares the multiset of top-level non-import statements, each keyed by its leading comments
// plus its text with one leading `export ` removed. The new files' one-line headers ("split out
// of linac-delivery.ts") are ignored. A statement that differs only in whitespace/line wrapping
// (Prettier re-wrapping a line that grew by `export `) is reported as REWRAPPED, not as a failure.
const ts = require(process.argv[2]);
const fs = require('fs');
const [oldFile, ...newFiles] = process.argv.slice(3);
function keys(file) {
	const text = fs.readFileSync(file, 'utf8');
	const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	const out = [];
	for (const st of sf.statements) {
		if (ts.isImportDeclaration(st)) continue;
		const leading = text.slice(st.pos, st.getStart(sf)).split('\n')
			.filter((l) => !l.includes('(split out of linac-delivery.ts, #77)')).join('\n').trim();
		out.push(leading + '\n' + st.getText(sf).replace(/^export /, ''));
	}
	const tail = text.slice(sf.endOfFileToken.pos).trim();
	if (tail) out.push('<EOF>\n' + tail);
	return out;
}
const norm = (k) => k.replace(/\s+/g, ' ').replace(/([([{]) /g, '$1').replace(/ ([)\]}])/g, '$1');
const count = (arr) => arr.reduce((m, k) => m.set(k, (m.get(k) || 0) + 1), new Map());
const a = count(keys(oldFile)), b = count(newFiles.flatMap(keys));
const onlyA = [], onlyB = [];
for (const k of new Set([...a.keys(), ...b.keys()])) {
	const d = (a.get(k) || 0) - (b.get(k) || 0);
	for (let i = 0; i < Math.abs(d); i++) (d > 0 ? onlyA : onlyB).push(k);
}
const rewrapped = [], unmatched = [];
const pool = onlyB.map(norm);
for (const k of onlyA) {
	const i = pool.indexOf(norm(k));
	if (i >= 0) { pool.splice(i, 1); rewrapped.push(k); } else unmatched.push('old only: ' + k);
}
for (const k of pool) unmatched.push('new only: ' + k);
const total = (m) => [...m.values()].reduce((s, n) => s + n, 0);
const first = (k) => k.split('\n').find((l) => l.trim() && !l.trim().startsWith('//')) || k;
console.log(`statements: old ${total(a)}, new ${total(b)}`);
for (const k of rewrapped) console.log('REWRAPPED (whitespace only): ' + first(k).slice(0, 120));
if (unmatched.length) {
	console.log(`VERBATIM DIFFERENCES (${unmatched.length}):\n` + unmatched.map((k) => k.slice(0, 200).replace(/\n/g, ' ⏎ ')).join('\n'));
	process.exit(1);
}
console.log(rewrapped.length ? `VERBATIM OK (${rewrapped.length} statement(s) differ only in line wrapping)` : 'VERBATIM OK');
```

### `bundle-compare.cjs`

```js
// Built-output check. Usage: node bundle-compare.cjs <typescript module path> <before.js> <after.js>
// Compares the multiset of top-level statements of two unminified bundles (comments and
// //#region markers dropped, rolldown collision suffixes like name$1 normalized).
const ts = require(process.argv[2]);
const fs = require('fs');
function stmts(file) {
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  return sf.statements.map((s) => s.getText(sf).replace(/\$\d+\b/g, ''));
}
const count = (arr) => arr.reduce((m, k) => m.set(k, (m.get(k) || 0) + 1), new Map());
const [before, after] = process.argv.slice(3).map((f) => count(stmts(f)));
const diffs = [];
for (const k of new Set([...before.keys(), ...after.keys()])) {
  const x = before.get(k) || 0, y = after.get(k) || 0;
  if (x !== y) diffs.push(`before×${x} after×${y}: ${k.slice(0, 160).replace(/\n/g, ' ⏎ ')}`);
}
const total = (m) => [...m.values()].reduce((s, n) => s + n, 0);
console.log(`top-level statements: before ${total(before)}, after ${total(after)}`);
console.log(diffs.length ? `BUNDLE DIFFERENCES (${diffs.length}):\n` + diffs.slice(0, 40).join('\n') : 'SAME STATEMENTS');
process.exit(diffs.length ? 1 : 0);
```
