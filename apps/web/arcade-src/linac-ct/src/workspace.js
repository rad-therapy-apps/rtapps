// @ts-nocheck -- verbatim legacy move; removed at TS conversion (PR 4)
(function () {
	'use strict';
	const $ = (id) => document.getElementById(id);
	const CT_CASES = [
		{
			key: 'prostate',
			patient: 'SBRT PROSTATE · de-identified',
			detail: 'Prostate SBRT · pelvis simulation',
			series: 'Real planning CT · body-habitus technique case'
		},
		{
			key: 'spine',
			patient: 'SBRT SPINE · de-identified',
			detail: 'Spine SBRT · immobilized simulation',
			series: 'Real planning CT · body-habitus technique case'
		},
		{
			key: 'cranio',
			patient: 'CRANIOPHARYNGIOMA · de-identified',
			detail: 'Cranial simulation · precision setup',
			series: 'Real planning CT · body-habitus technique case'
		},
		{
			key: 'skin',
			patient: 'SKIN CANCER · de-identified',
			detail: 'Superficial site simulation',
			series: 'Real planning CT · body-habitus technique case'
		},
		{
			key: 'breast',
			patient: 'INTACT BREAST · de-identified',
			detail: 'Breast simulation · reproducible setup',
			series: 'Real planning CT · body-habitus technique case'
		}
	];
	const ctCheckedIn = new Set();
	const ctComplete = new Set();
	let ctOpenKey = '';
	let ctView = 'room';
	let ctFrameReady = false;

	let pendingCase = '';

	function esc(s) {
		return String(s ?? '').replace(
			/[&<>"']/g,
			(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
		);
	}
	function ensureCTHome() {
		const shell = $('rtv2ConsoleShell');
		if (!shell || $('rtv2CTHome')) return !!$('rtv2CTHome');
		const home = document.createElement('section');
		home.id = 'rtv2CTHome';
		home.className = 'rtv2-view';
		home.setAttribute('aria-label', 'CT Simulation home queue');
		home.innerHTML = `
    <div class="rtv2-queue-title">
      <div><span>CT SIMULATION</span><h3>Today's CT Simulation Queue</h3></div>
      <div class="ctq-title-extra">
        <span class="ctq-pill">1 · Check In</span>
        <span class="ctq-pill">2 · Open Simulation</span>
        <span class="ctq-pill">CT Sim Room ↔ CT Console</span>
        <span class="ctq-pill">Habitus + technique validation</span>
      </div>
    </div>
    <div class="rtv2-queue-head"><span>Queue</span><span>Patient / Simulation</span><span>Status</span><span>Actions</span></div>
    <div id="rtv2CTQueueRows" class="rtv2-queue-rows"></div>`;
		shell.appendChild(home);
		const headerRight = shell.querySelector('.rtv2-header-right');
		if (headerRight && !$('rtv2QueueSwitcher')) {
			const sw = document.createElement('div');
			sw.id = 'rtv2QueueSwitcher';
			sw.setAttribute('aria-label', 'Select clinical queue');
			sw.innerHTML =
				'<button id="rtv2LINACQueueTab" type="button" class="active">LINAC Treatment Queue</button><button id="rtv2CTQueueTab" type="button">CT Simulation Queue</button>';
			const homeBtn = $('rtv2HomeBtn');
			headerRight.insertBefore(sw, homeBtn || headerRight.firstChild);
			$('rtv2LINACQueueTab')?.addEventListener('click', () => {
				$('rtv2HomeBtn')?.click();
			});
			$('rtv2CTQueueTab')?.addEventListener('click', showCTQueue);
		}
		home.addEventListener('click', (e) => {
			const check = e.target.closest('[data-ct-checkin]');
			const open = e.target.closest('[data-ct-open]');
			if (check) {
				ctCheckedIn.add(check.dataset.ctCheckin);
				renderCTQueue();
				return;
			}
			if (open && !open.disabled) openCTCase(open.dataset.ctOpen);
		});
		renderCTQueue();
		return true;
	}
	function renderCTQueue() {
		const host = $('rtv2CTQueueRows');
		if (!host) return;
		host.innerHTML = CT_CASES.map((c, i) => {
			const checked = ctCheckedIn.has(c.key),
				done = ctComplete.has(c.key),
				open = ctOpenKey === c.key;
			const status = done
				? 'Simulation Complete'
				: open
					? 'In Simulation'
					: checked
						? 'Checked In'
						: 'Scheduled';
			return `<div class="rtv2-queue-row ${done ? 'ctq-complete' : open ? 'ctq-open' : checked ? 'checked-in' : ''}">
      <div class="rtv2-time">#${String(i + 1).padStart(2, '0')}</div>
      <div class="rtv2-qpatient"><b>${esc(c.patient)}</b><span>${esc(c.detail)} · ${esc(c.series)}</span></div>
      <div class="rtv2-qstatus"><span class="rtv2-status-dot"></span>${status}</div>
      <div class="rtv2-qactions">
        <button type="button" data-ct-checkin="${esc(c.key)}" ${checked || done ? 'disabled' : ''}>${checked || done ? 'Checked In' : 'Check In'}</button>
        <button type="button" class="${done ? 'ctq-review' : 'ctq-open-sim'}" data-ct-open="${esc(c.key)}" ${checked || done ? '' : 'disabled'}>${done ? 'Review Sim' : open ? 'Simulation Open' : 'Open Simulation'}</button>
      </div>
    </div>`;
		}).join('');
	}
	function showCTQueue() {
		if (!ensureCTHome()) return;
		const shell = $('rtv2ConsoleShell');
		if (!shell) return;
		document.body.classList.add('rtv2-landing');
		if (shell.parentNode !== document.body) document.body.appendChild(shell);
		$('rtv2Home')?.classList.remove('active');
		$('rtv2Chart')?.classList.remove('active');
		$('rtv2CTHome')?.classList.add('active');
		$('rtv2LINACQueueTab')?.classList.remove('active');
		$('rtv2CTQueueTab')?.classList.add('active');
		$('ctSimWorkspace')?.classList.remove('open');
		renderCTQueue();
	}
	function initFrame() {
		const fr = $('rtappsCTFrame');
		if (!fr || fr.dataset.loaded) return;
		fr.dataset.loaded = '1';
		fr.src = '/arcade/linac-ct/ct-suite.html';
	}
	function postToCT(msg) {
		const fr = $('rtappsCTFrame');
		if (fr?.contentWindow) fr.contentWindow.postMessage(msg, '*');
	}
	function setCTView(view) {
		ctView = view === 'console' ? 'console' : 'room';
		$('ctwsRoomBtn')?.classList.toggle('active', ctView === 'room');
		$('ctwsConsoleBtn')?.classList.toggle('active', ctView === 'console');
		if ($('ctwsStatus'))
			$('ctwsStatus').textContent =
				(ctView === 'room' ? 'CT Sim Room' : 'CT Console') +
				(ctOpenKey
					? ' · ' + (CT_CASES.find((c) => c.key === ctOpenKey)?.patient || ctOpenKey)
					: '');
		if (ctFrameReady) postToCT({ type: 'rtapps-ct-view', view: ctView });
	}
	function openCTCase(key) {
		const c = CT_CASES.find((x) => x.key === key);
		if (!c) return;
		ctOpenKey = key;
		pendingCase = key;
		initFrame();
		$('ctwsPatient').textContent = c.patient;
		$('ctwsDetail').textContent = c.detail + ' · ' + c.series;
		$('ctSimWorkspace').classList.add('open');
		setCTView('room');
		if (ctFrameReady) {
			postToCT({ type: 'rtapps-ct-case', key });
			pendingCase = '';
		}
		renderCTQueue();
	}
	function closeWorkspace() {
		$('ctSimWorkspace')?.classList.remove('open');
	}
	function bindWorkspace() {
		$('ctwsRoomBtn')?.addEventListener('click', () => setCTView('room'));
		$('ctwsConsoleBtn')?.addEventListener('click', () => setCTView('console'));
		$('ctwsQueueBtn')?.addEventListener('click', showCTQueue);
		$('ctwsCloseBtn')?.addEventListener('click', () => {
			closeWorkspace();
			showCTQueue();
		});
	}
	window.addEventListener('message', (ev) => {
		const d = ev.data || {};
		if (d.type === 'rtapps-ct-ready') {
			ctFrameReady = true;
			$('ctwsLoading')?.classList.add('hidden');
			setCTView(ctView);
			if (pendingCase) {
				postToCT({ type: 'rtapps-ct-case', key: pendingCase });
				pendingCase = '';
			}
		}
		if (d.type === 'rtapps-ct-case-loaded') {
			if ($('ctwsStatus'))
				$('ctwsStatus').textContent =
					(ctView === 'room' ? 'CT Sim Room' : 'CT Console') +
					' · ' +
					(d.patient || 'Patient loaded');
		}
		if (d.type === 'rtapps-ct-complete' && d.key) {
			const rtappsIsNewCompletion = !ctComplete.has(d.key);
			ctComplete.add(d.key);
			ctCheckedIn.add(d.key);
			if ($('ctwsStatus'))
				$('ctwsStatus').textContent =
					`Scan complete · ${d.images || 0} reconstructed images · review series`;
			renderCTQueue();
			// RTApps (plan 4c): one completion per finished CT scan workflow.
			if (rtappsIsNewCompletion && window.RTApps)
				window.RTApps.recordResult('sim-ct-scan').catch(function () {});
		}
	});
	function boot() {
		if (!ensureCTHome()) {
			setTimeout(boot, 150);
			return;
		}
		bindWorkspace();
		if ($('rtv2CTHome')?.classList.contains('active')) {
			$('rtv2LINACQueueTab')?.classList.remove('active');
			$('rtv2CTQueueTab')?.classList.add('active');
		} else {
			$('rtv2LINACQueueTab')?.classList.add('active');
			$('rtv2CTQueueTab')?.classList.remove('active');
		}
	}
	boot();
})();
