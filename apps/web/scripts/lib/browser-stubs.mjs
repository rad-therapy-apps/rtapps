/* eslint-disable @typescript-eslint/no-unused-vars -- stub API surface: interface-required callback params are unused, prefixed `_` (moved verbatim from arcade-smoke.mjs). */
// Browser-global stubs shared by the Node harnesses (arcade-smoke.mjs, sim-hub-npc-check.mjs).
// Stubs a minimal DOM/browser environment so a built bundle can be imported in Node.

function makeStyle() {
	return new Proxy(
		{
			setProperty: () => {},
			removeProperty: () => '',
			getPropertyValue: () => ''
		},
		{
			get(target, prop) {
				if (prop in target) return target[prop];
				return '';
			},
			set() {
				return true;
			}
		}
	);
}

function makeClassList() {
	const set = new Set();
	return {
		add: (...c) => c.forEach((x) => set.add(x)),
		remove: (...c) => c.forEach((x) => set.delete(x)),
		toggle: (c, force) => {
			if (force === undefined) {
				if (set.has(c)) {
					set.delete(c);
					return false;
				}
				set.add(c);
				return true;
			}
			if (force) set.add(c);
			else set.delete(c);
			return force;
		},
		contains: (c) => set.has(c)
	};
}

function makeGradientStub() {
	return { addColorStop: () => {} };
}

function make2dContext() {
	return new Proxy(
		{},
		{
			get(_t, prop) {
				if (prop === 'measureText') return () => ({ width: 0 });
				if (prop === 'canvas') return { width: 0, height: 0 };
				if (
					prop === 'createLinearGradient' ||
					prop === 'createRadialGradient' ||
					prop === 'createConicGradient'
				) {
					return () => makeGradientStub();
				}
				// any other method called: return a no-op function
				return (..._args) => undefined;
			},
			set() {
				return true;
			}
		}
	);
}

function makeGlContext() {
	// Generic GLenum emulation: any ALL_CAPS property access is treated as a GLenum
	// constant and assigned a unique synthetic id; getParameter() then answers based
	// on the constant's *name* (version/vendor strings, range/box arrays, else a
	// generic safe number) instead of a hand-maintained table of every enum THREE
	// might touch.
	const nameByValue = new Map();
	let nextId = 1000;
	function constFor(name) {
		const id = nextId++;
		nameByValue.set(id, name);
		return id;
	}
	function valueForName(name) {
		if (/SHADING_LANGUAGE_VERSION/.test(name)) return 'WebGL GLSL ES 3.00';
		if (/VERSION/.test(name)) return 'WebGL 2.0';
		if (/VENDOR|RENDERER/.test(name)) return 'node-smoke-test';
		if (/RANGE|DIMS|BOX|VIEWPORT/.test(name)) return [0, 0, 8192, 8192];
		return 64;
	}
	const base = {
		canvas: { width: 0, height: 0 },
		drawingBufferWidth: 0,
		drawingBufferHeight: 0,
		getContextAttributes: () => ({ alpha: true, antialias: true, stencil: true, depth: true }),
		getExtension: () => null,
		getSupportedExtensions: () => [],
		getParameter: (p) => valueForName(nameByValue.get(p) || ''),
		getShaderPrecisionFormat: () => ({ precision: 1, rangeMin: 1, rangeMax: 1 }),
		createTexture: () => ({}),
		createBuffer: () => ({}),
		createFramebuffer: () => ({}),
		createRenderbuffer: () => ({}),
		createProgram: () => ({}),
		createShader: () => ({}),
		getShaderParameter: () => true,
		getProgramParameter: (_program, pname) => {
			const name = nameByValue.get(pname) || '';
			if (name === 'ACTIVE_UNIFORMS' || name === 'ACTIVE_ATTRIBUTES') return 0;
			return true;
		},
		getShaderInfoLog: () => '',
		getProgramInfoLog: () => '',
		isContextLost: () => false,
		bindFramebuffer: () => {}
	};
	return new Proxy(base, {
		get(target, prop) {
			if (prop in target) return target[prop];
			if (typeof prop === 'string' && /^[A-Z][A-Z0-9_]*$/.test(prop)) return constFor(prop);
			return (..._args) => undefined;
		}
	});
}

function makeElementStub(tag) {
	const listeners = {};
	const el = new Proxy(
		{
			tagName: (tag || 'div').toUpperCase(),
			style: makeStyle(),
			classList: makeClassList(),
			children: [],
			childNodes: [],
			dataset: {},
			attributes: {},
			_text: '',
			get textContent() {
				return this._text;
			},
			set textContent(v) {
				this._text = v;
			},
			get innerHTML() {
				return this._html || '';
			},
			set innerHTML(v) {
				this._html = v;
			},
			appendChild(child) {
				this.children.push(child);
				return child;
			},
			removeChild() {},
			insertBefore(child) {
				this.children.push(child);
				return child;
			},
			prepend(...nodes) {
				this.children.unshift(...nodes);
			},
			matches() {
				return false;
			},
			addEventListener(type, fn) {
				(listeners[type] = listeners[type] || []).push(fn);
			},
			removeEventListener() {},
			dispatchEvent() {
				return true;
			},
			setAttribute() {},
			getAttribute() {
				return null;
			},
			removeAttribute() {},
			click() {},
			focus() {},
			blur() {},
			getRootNode() {
				return documentStub;
			},
			getContext(type) {
				if (type === '2d') return make2dContext();
				if (type === 'webgl2' || type === 'webgl' || type === 'experimental-webgl') {
					return makeGlContext();
				}
				return null;
			},
			getBoundingClientRect() {
				return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
			},
			querySelector() {
				return makeElementStub('span');
			},
			querySelectorAll() {
				return [];
			},
			cloneNode() {
				return makeElementStub(tag);
			},
			get selectedOptions() {
				return [{ text: '' }];
			},
			get options() {
				return this.children;
			},
			get value() {
				return this._value || '';
			},
			set value(v) {
				this._value = v;
			},
			get checked() {
				return !!this._checked;
			},
			set checked(v) {
				this._checked = v;
			},
			get disabled() {
				return !!this._disabled;
			},
			set disabled(v) {
				this._disabled = v;
			},
			width: 0,
			height: 0,
			clientWidth: 0,
			clientHeight: 0,
			parentNode: null,
			parentElement: { clientWidth: 0, clientHeight: 0 },
			offsetWidth: 0,
			offsetHeight: 0
		},
		{}
	);
	return el;
}

const documentStub = {
	createElement: (tag) => makeElementStub(tag),
	createElementNS: (_ns, tag) => makeElementStub(tag),
	getElementById: (_id) => makeElementStub('div'),
	querySelector: (_sel) => null,
	querySelectorAll: (_sel) => [],
	addEventListener: () => {},
	removeEventListener: () => {},
	body: makeElementStub('body'),
	documentElement: makeElementStub('html'),
	hidden: false,
	pointerLockElement: null,
	exitPointerLock: () => {}
};

export function installBrowserStubs({ search = '' } = {}) {
	global.document = documentStub;

	global.window = global;
	global.self = global;
	Object.defineProperty(global, 'navigator', {
		value: { userAgent: 'node-smoke-test', platform: 'node' },
		writable: true,
		configurable: true
	});
	Object.defineProperty(global, 'location', {
		value: { search, href: 'http://localhost/', pathname: '/' },
		writable: true,
		configurable: true
	});
	global.requestAnimationFrame = () => 0;
	global.cancelAnimationFrame = () => {};
	global.addEventListener = () => {};
	global.removeEventListener = () => {};
	global.fetch = () => new Promise(() => {});
	global.localStorage = {
		getItem: () => null,
		setItem: () => {},
		removeItem: () => {}
	};
	global.AudioContext = undefined;
	global.webkitAudioContext = undefined;
	global.HTMLCanvasElement = function () {};
	global.Image = function () {
		return makeElementStub('img');
	};
	global.performance = global.performance || { now: () => Date.now() };
	global.devicePixelRatio = 1;
	global.innerWidth = 1280;
	global.innerHeight = 800;
	global.MutationObserver = class {
		observe() {}
		disconnect() {}
		takeRecords() {
			return [];
		}
	};
	global.ResizeObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	};

	// window.RTApps is read (`if (window.RTApps)`) — leave undefined intentionally,
	// matching the real "activity unseeded/offline" fallback path.
}
