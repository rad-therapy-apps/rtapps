(function () {
	'use strict';
	const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
		document.getElementById(id) as T | null;
	const text = (id) => ($(id)?.textContent || '—').trim() || '—';
	const checkedIn = new Set();
	let openCaseValue = null;
	let activeWorkflow = 'chart';
	let rtv2MonitorHost = null;

	function esc(s) {
		return String(s ?? '').replace(
			/[&<>"']/g,
			(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
		);
	}
	function caseOptions() {
		const sel = $<HTMLSelectElement>('treatmentCaseSelect');
		if (!sel) return [];
		return Array.from(sel.options)
			.filter((o) => o.value !== '' && !/select/i.test(o.textContent || ''))
			.map((o, i) => ({
				value: o.value,
				label: (o.textContent || o.value).trim(),
				index: i
			}));
	}
	function splitLabel(label) {
		const parts = String(label).split(/\s+[·|–—-]\s+/);
		return {
			name: parts[0] || label,
			detail: parts.slice(1).join(' · ') || 'Treatment appointment'
		};
	}
	function queueSlot(i) {
		return `#${String(i + 1).padStart(2, '0')}`;
	}
	function renderQueue() {
		const host = $('rtv2QueueRows');
		if (!host) return;
		const opts = caseOptions();
		if (!opts.length) {
			host.innerHTML = '<div class="rtv2-empty">Treatment schedule is loading…</div>';
			return;
		}
		host.innerHTML = opts
			.map((item, i) => {
				const parsed = splitLabel(item.label);
				const isIn = checkedIn.has(item.value);
				const isOpen = openCaseValue === item.value;
				return `<div class="rtv2-queue-row ${isIn ? 'checked-in' : ''} ${isOpen ? 'active-patient' : ''}" data-case="${esc(item.value)}">
        <div class="rtv2-time">${queueSlot(i)}</div>
        <div class="rtv2-qpatient"><b>${esc(parsed.name)}</b><span>${esc(parsed.detail)}</span></div>
        <div class="rtv2-qstatus"><span class="rtv2-status-dot"></span>${isOpen ? 'In Treatment' : isIn ? 'Checked In' : 'Scheduled'}</div>
        <div class="rtv2-qactions">
          <button type="button" class="rtv2-checkin" data-value="${esc(item.value)}" ${isIn ? 'disabled' : ''}>${isIn ? 'Checked In' : 'Check In'}</button>
          <button type="button" class="rtv2-openchart" data-value="${esc(item.value)}" ${isIn ? '' : 'disabled'}>${isOpen ? 'Chart Open' : 'Open Chart'}</button>
        </div>
      </div>`;
			})
			.join('');
	}
	function buildShell() {
		const screen = document.querySelector('#workflowDeskMonitor .monitor-screen');
		if (!screen || $('rtv2ConsoleShell')) return;
		rtv2MonitorHost = screen;
		const shell = document.createElement('div');
		shell.id = 'rtv2ConsoleShell';
		shell.innerHTML = `
      <header class="rtv2-header">
        <div class="rtv2-brand"><span class="rtv2-radmark" aria-hidden="true">☢</span><div><b>RTApps LINAC Treatment</b><span>Record and Verify mode · Clinical Emulator</span></div></div>
        <div class="rtv2-header-mid"><span>Primary User: Therapist</span><b id="rtv2HeaderPatient">No patient open</b></div>
        <div class="rtv2-header-right"><span id="rtv2Clock">--:--:--</span><button id="rtv2HomeBtn" type="button">Home Queue</button></div>
      </header>
      <section id="rtv2Home" class="rtv2-view active" aria-label="LINAC treatment home queue">
        <div class="rtv2-queue-title"><div><span>LINAC 1</span><h3>Today's Treatment Queue</h3></div><div class="rtv2-legend"><span><i class="scheduled"></i>Scheduled</span><span><i class="ready"></i>Checked In</span><span><i class="active"></i>In Treatment</span></div></div>
        <div class="rtv2-queue-head"><span>Queue</span><span>Patient / Treatment Site</span><span>Status</span><span>Actions</span></div>
        <div id="rtv2QueueRows" class="rtv2-queue-rows"></div>
      </section>
      <section id="rtv2Chart" class="rtv2-view" aria-label="Treatment chart workstation">
        <div class="rtv2-chart-grid">
          <aside class="rtv2-patient-sidebar">
            <div class="rtv2-patient-block"><span>PATIENT</span><b id="rtv2PatientName">No patient loaded</b><small id="rtv2PatientSubtitle">Check in a patient and open the chart.</small></div>
            <div class="rtv2-side-data"><div><span>MRN</span><b id="rtv2MRN">—</b></div><div><span>Fraction</span><b id="rtv2Fraction">—</b></div><div><span>Position</span><b id="rtv2Position">—</b></div><div><span>Energy</span><b id="rtv2Energy">—</b></div><div><span>Technique</span><b id="rtv2Technique">—</b></div></div>
            <div class="rtv2-side-heading">Workflow</div>
            <nav class="rtv2-nav" aria-label="Clinical workflow">
              <button type="button" data-workflow="chart" class="active">1 <span>Chart Review</span></button>
              <button type="button" data-workflow="setup">2 <span>Patient Setup</span></button>
              <button type="button" data-workflow="igrt">3 <span>IGRT</span></button>
              <button type="button" data-workflow="machine">4 <span>Machine / Imaging</span></button>
              <button type="button" data-workflow="delivery">5 <span>Delivery</span></button>
              <button type="button" data-workflow="ois">6 <span>OIS / R&amp;V</span></button>
            </nav>
          </aside>
          <main class="rtv2-main">
            <div class="rtv2-flow" aria-label="Treatment state">
              <div class="flow-step done">Chart</div><div id="rtv2FlowSetup" class="flow-step">Setup</div><div id="rtv2FlowIGRT" class="flow-step">IGRT</div><div id="rtv2FlowReady" class="flow-step">Ready</div><div id="rtv2FlowBeam" class="flow-step beam">Beam On</div><div id="rtv2FlowRecord" class="flow-step">Record</div>
            </div>
            <div class="rtv2-work-top">
              <div><span class="rtv2-kicker">ACTIVE FIELD</span><h3 id="rtv2FieldTitle">No field selected</h3><p id="rtv2FieldMeta">Open a patient chart to begin.</p></div>
              <div class="rtv2-work-status"><span id="rtv2IGRTBadge">IGRT Pending</span><span id="rtv2DoorBadge">Door Secure</span></div>
            </div>
            <div class="rtv2-data-area">
              <section class="rtv2-data-panel">
                <div class="rtv2-panel-head"><b>Geometry</b><span>Plan</span><span>Actual</span></div>
                <div class="rtv2-param-grid">
                  <label>Gantry Rtn</label><div id="rtv2PlanGantry">—</div><div id="rtv2ActualGantry">—</div>
                  <label>Coll Rtn</label><div id="rtv2PlanColl">—</div><div id="rtv2ActualColl">—</div>
                  <label>Jaws</label><div id="rtv2PlanJaws">—</div><div id="rtv2ActualJaws">—</div>
                  <label>MLC</label><div id="rtv2PlanMLC">—</div><div id="rtv2ActualMLC">—</div>
                  <label>Couch</label><div id="rtv2PlanCouch">—</div><div id="rtv2ActualCouch">—</div>
                </div>
              </section>
              <section class="rtv2-data-panel beam-panel">
                <div class="rtv2-panel-head"><b>Beam</b><span>Plan</span><span>Actual</span></div>
                <div class="rtv2-param-grid">
                  <label>Energy</label><div id="rtv2PlanEnergy">—</div><div id="rtv2ActualEnergy">—</div>
                  <label>MU</label><div id="rtv2PlanMU">—</div><div id="rtv2ActualMU">0.0 MU</div>
                  <label>Delivery</label><div id="rtv2PlanMode">—</div><div id="rtv2DeliveryState">Standby</div>
                </div>
                <div class="rtv2-mu-progress"><div id="rtv2MUFill"></div></div>
                <small id="rtv2MUDetail">0 / 0 MU</small>
              </section>
            </div>
            <details id="rtv2MachinePanel" class="rtv2-control-drawer" open>
              <summary><b>Machine / Imaging Console</b><span>Console controls use the emulator's existing motion-enable and interlock logic</span></summary>
              <div class="rtv2-console-grid">
                <section class="rtv2-control-group">
                  <h4>Imaging / Room</h4>
                  <div class="rtv2-button-grid three">
                    <button type="button" data-console-target="consoleRoomLights">Room Lights</button>
                    <button type="button" data-console-target="consoleLasers">Lasers</button>
                    <button type="button" data-console-target="consoleOdi">ODI</button>
                    <button type="button" data-console-target="consoleKV">kV Imaging</button>
                    <button type="button" data-console-target="consoleMV">MV / EPID</button>
                    <button type="button" data-console-target="consoleBeamVisual">Beam View</button>
                  </div>
                  <h4 style="margin-top:7px;">Additional Workflow</h4>
                  <div class="rtv2-advanced-workflows">
                    <button type="button" data-workflow-launch="motion">4D Motion</button>
                    <button type="button" data-workflow-launch="adaptive">Adaptive</button>
                    <button type="button" data-workflow-launch="srs">SRS / SBRT</button>
                    <button type="button" data-workflow-launch="special">Setup Lab</button>
                  </div>
                </section>
                <section class="rtv2-control-group">
                  <h4>Beam Geometry</h4>
                  <div class="rtv2-button-grid three">
                    <button type="button" data-console-target="consoleGantryMinus">Gantry −</button>
                    <button type="button" data-console-target="consoleGantryPlus">Gantry +</button>
                    <span></span>
                    <button type="button" data-console-target="consoleCollMinus">Coll −</button>
                    <button type="button" data-console-target="consoleCollPlus">Coll +</button>
                    <span></span>
                    <button type="button" data-console-target="consoleJawsClose">Jaws −</button>
                    <button type="button" data-console-target="consoleJawsOpen">Jaws +</button>
                    <span></span>
                    <button type="button" data-console-target="consoleMLCClose">MLC −</button>
                    <button type="button" data-console-target="consoleMLCOpen">MLC +</button>
                    <button type="button" data-console-target="consoleMLCShape">MLC Shape</button>
                  </div>
                  <h4 style="margin-top:7px;">Asymmetric Jaws</h4>
                  <div class="rtv2-button-grid four">
                    <button type="button" data-console-target="consoleJawX1In">X1 −</button><button type="button" data-console-target="consoleJawX1Out">X1 +</button>
                    <button type="button" data-console-target="consoleJawX2In">X2 −</button><button type="button" data-console-target="consoleJawX2Out">X2 +</button>
                    <button type="button" data-console-target="consoleJawY1In">Y1 −</button><button type="button" data-console-target="consoleJawY1Out">Y1 +</button>
                    <button type="button" data-console-target="consoleJawY2In">Y2 −</button><button type="button" data-console-target="consoleJawY2Out">Y2 +</button>
                  </div>
                </section>
                <section class="rtv2-control-group">
                  <h4>Couch Translation / Rotation</h4>
                  <div class="rtv2-button-grid three">
                    <button type="button" data-console-target="consoleVrtMinus">Vert −</button><button type="button" data-console-target="consoleVrtPlus">Vert +</button><span></span>
                    <button type="button" data-console-target="consoleLngMinus">Long −</button><button type="button" data-console-target="consoleLngPlus">Long +</button><span></span>
                    <button type="button" data-console-target="consoleLatMinus">Lat −</button><button type="button" data-console-target="consoleLatPlus">Lat +</button><span></span>
                    <button type="button" data-console-target="consoleTableMinus">Table −</button><button type="button" data-console-target="consoleTablePlus">Table +</button><span></span>
                    <button type="button" data-console-target="consoleRollMinus">Roll −</button><button type="button" data-console-target="consoleRollPlus">Roll +</button><span></span>
                    <button type="button" data-console-target="consolePitchMinus">Pitch −</button><button type="button" data-console-target="consolePitchPlus">Pitch +</button><span></span>
                    <button type="button" data-console-target="consoleYawMinus">Yaw −</button><button type="button" data-console-target="consoleYawPlus">Yaw +</button><span></span>
                  </div>
                </section>
              </div>
              <div class="rtv2-console-note">Machine motion remains locked until <b>Motion Enable</b> is armed. Imaging hardware, collision clearance, door state, field identity, IGRT requirements, and treatment-delivery interlocks remain governed by the existing emulator logic.</div>
            </details>
            <div class="rtv2-machine-controls">
              <button id="rtv2MotionEnable" type="button" class="motion">MOTION ENABLE <span>Locked</span></button>
              <button id="rtv2EnableBeam" type="button">ENABLE BEAM</button>
              <button id="rtv2BeamOn" type="button" class="beam-on">BEAM ON</button>
              <button id="rtv2BeamHold" type="button">BEAM HOLD</button>
              <button id="rtv2Terminate" type="button" class="danger">TERMINATE</button>
            </div>
            <div id="rtv2ClinicalMessage" class="rtv2-message">Complete patient identification and setup before imaging and treatment delivery.</div>
          </main>
        </div>
      </section>`;
		screen.insertBefore(shell, screen.firstChild);
		if (!$('rtv2RoomNav')) {
			const roomNav = document.createElement('div');
			roomNav.id = 'rtv2RoomNav';
			roomNav.setAttribute('aria-label', 'Vault and console navigation');
			roomNav.innerHTML =
				'<div class="rtv2-room-state"><span>Current location</span><b id="rtv2RoomState">Console</b></div><button id="rtv2RoomToggle" type="button">ENTER VAULT</button><button id="rtv2RoomHome" type="button" class="secondary">HOME QUEUE</button>';
			document.body.appendChild(roomNav);
		}
		screen.closest('.monitor-shell')?.classList.add('rtv2-primary-monitor');
		document.body.classList.add('rt-v2-console');
		bindShell();
		renderQueue();
		syncMirror();
	}
	function mountConsoleShell() {
		const shell = $('rtv2ConsoleShell');
		if (!shell) return;
		rtv2MonitorHost =
			rtv2MonitorHost || document.querySelector('#workflowDeskMonitor .monitor-screen');
		if (rtv2MonitorHost && shell.parentNode !== rtv2MonitorHost)
			rtv2MonitorHost.insertBefore(shell, rtv2MonitorHost.firstChild);
	}
	function jumpToRoom(mode = 'control') {
		// Room state lives inside the emulator's ES-module scope. Use its existing
		// travel controls rather than duplicating or bypassing the vault/console mechanics.
		const target = mode === 'vault' ? $('viewVaultButton') : $('viewControlRoomButton');
		if (target) target.click();
	}
	function enterLandingQueue() {
		const shell = $('rtv2ConsoleShell');
		if (!shell) return;
		$('rtv2CTHome')?.classList.remove('active');
		$('rtv2Home')?.classList.add('active');
		$('rtv2Chart')?.classList.remove('active');
		document.body.classList.add('rtv2-landing');
		$('rtv2LINACQueueTab')?.classList.add('active');
		$('rtv2CTQueueTab')?.classList.remove('active');
		if (shell.parentNode !== document.body) document.body.appendChild(shell);
		renderQueue();
	}
	function showHome() {
		enterLandingQueue();
	}
	function showChart() {
		document.body.classList.remove('rtv2-landing');
		mountConsoleShell();
		$('rtv2Home')?.classList.remove('active');
		$('rtv2Chart')?.classList.add('active');
		syncMirror();
	}
	function openChart(value) {
		const sel = $<HTMLSelectElement>('treatmentCaseSelect');
		if (!sel) return;
		sel.value = value;
		openCaseValue = value;
		$('loadTreatmentCaseBtn')?.click();
		setTimeout(() => {
			showChart();
			jumpToRoom('control');
			syncMirror();
			renderQueue();
			const msg = $('rtv2ClinicalMessage');
			if (msg)
				msg.textContent =
					'Chart opened at the treatment console. Use the workflow and Machine / Imaging controls here; select ENTER VAULT when hands-on in-room setup is required.';
		}, 80);
	}
	function launchWorkflow(kind) {
		activeWorkflow = kind;
		document
			.querySelectorAll('.rtv2-nav button')
			.forEach((b: HTMLElement) => b.classList.toggle('active', b.dataset.workflow === kind));
		const map = {
			setup: 'consoleImmoButton',
			igrt: 'consoleIGRTButton',
			delivery: 'consoleDeliveryButton',
			ois: 'consoleOISButton'
		};
		if (map[kind]) $(map[kind])?.click();
		if (kind === 'chart') $('consoleDockClose')?.click();
		if (kind === 'machine') {
			$('consoleDockClose')?.click();
			const panel = $<HTMLDetailsElement>('rtv2MachinePanel');
			if (panel) {
				panel.open = true;
				panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
			}
		}
		updateFlow();
	}
	function bindShell() {
		$('rtv2HomeBtn')?.addEventListener('click', showHome);
		$('rtv2RoomHome')?.addEventListener('click', showHome);
		$('rtv2RoomToggle')?.addEventListener('click', () =>
			jumpToRoom(document.body.classList.contains('control-room-mode') ? 'vault' : 'control')
		);
		$('rtv2MachinePanel')?.addEventListener('click', (e: MouseEvent) => {
			const control = (e.target as HTMLElement).closest<HTMLElement>('[data-console-target]');
			if (control) {
				const target = $(control.dataset.consoleTarget);
				if (target) target.click();
				return;
			}
			const workflow = (e.target as HTMLElement).closest<HTMLElement>('[data-workflow-launch]');
			if (workflow) {
				const targetMap = {
					motion: 'motionLaunchButton',
					adaptive: 'adaptiveLaunchButton',
					srs: 'srsLaunchButton',
					special: 'specialSetupLaunchButton'
				};
				$(targetMap[workflow.dataset.workflowLaunch])?.click();
			}
		});
		$('rtv2QueueRows')?.addEventListener('click', (e: MouseEvent) => {
			const check = (e.target as HTMLElement).closest<HTMLElement>('.rtv2-checkin');
			const open = (e.target as HTMLElement).closest<HTMLButtonElement>('.rtv2-openchart');
			if (check) {
				checkedIn.add(check.dataset.value);
				renderQueue();
				return;
			}
			if (open && !open.disabled) {
				openChart(open.dataset.value);
			}
		});
		document
			.querySelectorAll('.rtv2-nav button')
			.forEach((b: HTMLElement) =>
				b.addEventListener('click', () => launchWorkflow(b.dataset.workflow))
			);
		$('rtv2MotionEnable')?.addEventListener('click', () => $('consoleMotionEnable')?.click());
		$('rtv2EnableBeam')?.addEventListener('click', () => {
			$('consoleDeliveryButton')?.click();
			setTimeout(() => $('deliveryArm')?.click(), 40);
		});
		$('rtv2BeamOn')?.addEventListener('click', () => {
			$('consoleDeliveryButton')?.click();
			setTimeout(() => $('deliveryStart')?.click(), 40);
		});
		$('rtv2BeamHold')?.addEventListener('click', () => $('deliveryHold')?.click());
		$('rtv2Terminate')?.addEventListener('click', () => $('deliveryTerminate')?.click());
		$('rtv2dActionPrep')?.addEventListener('click', () => $('deliveryRecheck')?.click());
		$('rtv2dActionReady')?.addEventListener('click', () => {
			$('consoleDeliveryButton')?.click();
			setTimeout(() => $('deliveryArm')?.click(), 40);
		});
		$('rtv2dActionBeam')?.addEventListener('click', () => {
			$('consoleDeliveryButton')?.click();
			setTimeout(() => $('deliveryStart')?.click(), 40);
		});
		$('rtv2dActionHold')?.addEventListener('click', () => $('deliveryHold')?.click());
		$('rtv2dActionRecord')?.addEventListener('click', () => {
			const t = $<HTMLButtonElement>('deliveryCompleteSession');
			if (t && !t.disabled) t.click();
			else $('deliveryReviewCharges')?.click();
		});
		$('rtv2dFieldList')?.addEventListener('click', (e: MouseEvent) => {
			const row = (e.target as HTMLElement).closest<HTMLElement>('.rtv2d-field-row[data-index]');
			if (
				!row ||
				!$<HTMLSelectElement>('deliveryFieldSelect') ||
				$<HTMLSelectElement>('deliveryFieldSelect').disabled
			)
				return;
			$<HTMLSelectElement>('deliveryFieldSelect').value = String(row.dataset.index);
			$<HTMLSelectElement>('deliveryFieldSelect').dispatchEvent(
				new Event('change', { bubbles: true })
			);
		});
	}
	function syncRoomNav() {
		const atConsole = document.body.classList.contains('control-room-mode');
		const state = $('rtv2RoomState'),
			toggle = $('rtv2RoomToggle');
		if (state) state.textContent = atConsole ? 'Control Console' : 'Treatment Vault';
		if (toggle) toggle.textContent = atConsole ? 'ENTER VAULT' : 'RETURN TO CONSOLE';
	}
	function syncMachineControlStates() {
		document
			.querySelectorAll('#rtv2MachinePanel [data-console-target]')
			.forEach((btn: HTMLButtonElement) => {
				const target = $<HTMLButtonElement>(btn.dataset.consoleTarget);
				if (!target) return;
				btn.disabled = !!target.disabled;
				btn.classList.toggle(
					'active-source',
					target.classList.contains('active-function') || target.classList.contains('active')
				);
			});
	}
	window.addEventListener('rtapps-linac-bridge-ready', () => {
		try {
			syncMirror();
		} catch (e) {
			console.warn('RTApps mirror startup refresh skipped.', e);
		}
	});
	function syncMirror() {
		syncRoomNav();
		syncMachineControlStates();
		const name = text('consoleActivePatient');
		$('rtv2HeaderPatient').textContent = name;
		$('rtv2PatientName').textContent = name;
		$('rtv2PatientSubtitle').textContent = text('consolePatientRefSubtitle');
		$('rtv2MRN').textContent = text('consoleRefMRN');
		$('rtv2Fraction').textContent = text('consoleRefFraction');
		$('rtv2Position').textContent = text('consoleRefPosition');
		$('rtv2Energy').textContent = text('consoleRefEnergy');
		$('rtv2Technique').textContent = text('consoleRefTechnique');
		$('rtv2FieldTitle').textContent = text('consoleRefField');
		$('rtv2FieldMeta').textContent = text('consoleActiveField');
		$('rtv2PlanGantry').textContent = text('consolePlanGantry');
		$('rtv2ActualGantry').textContent = text('consoleReadoutGantry');
		$('rtv2PlanColl').textContent = text('consolePlanColl');
		$('rtv2ActualColl').textContent = text('consoleReadoutColl');
		$('rtv2PlanJaws').textContent = text('consolePlanJaws');
		$('rtv2ActualJaws').textContent = text('consoleReadoutJaws');
		$('rtv2PlanMLC').textContent = text('consolePlanMLC');
		$('rtv2ActualMLC').textContent = text('consoleReadoutMLC');
		$('rtv2PlanCouch').textContent = text('consolePlanCouch');
		$('rtv2ActualCouch').textContent = text('hudCouch');
		$('rtv2PlanEnergy').textContent = text('consoleRefEnergy');
		$('rtv2ActualEnergy').textContent = text('consoleRefEnergy');
		const muValue = text('deliveryMUValue'),
			muDetail = text('deliveryMUDetail');
		$('rtv2ActualMU').textContent = muValue;
		$('rtv2MUDetail').textContent = muDetail;
		const planMu = (muDetail.match(/\/\s*([\d.]+)\s*MU/i) || [])[1];
		$('rtv2PlanMU').textContent = planMu ? `${planMu} MU` : '—';
		$('rtv2PlanMode').textContent = text('deliveryModeValue');
		$('rtv2DeliveryState').textContent = text('deliveryStatus');
		const fill = $('deliveryProgressBar');
		if (fill) $('rtv2MUFill').style.width = fill.style.width || getComputedStyle(fill).width;
		const motion = $('consoleMotionEnable'),
			motionBtn = $('rtv2MotionEnable');
		if (motion && motionBtn) {
			const on = motion.classList.contains('active');
			motionBtn.classList.toggle('active', on);
			motionBtn.querySelector('span').textContent = on ? 'Armed' : 'Locked';
		}
		const igrt = text('consoleIGRTStatusChip');
		$('rtv2IGRTBadge').textContent = igrt || 'IGRT Pending';
		$('rtv2DoorBadge').textContent = text('consoleDoorStatusChip');
		const msg = text('deliveryStatus');
		if (msg !== '—') $('rtv2ClinicalMessage').textContent = msg;
		syncDeliveryReferenceScreen();
		updateFlow();
	}

	function extractRadOnc(note) {
		const m = String(note || '').match(/Dr\.\s*[^·|]+/i);
		return m ? m[0].trim() : '—';
	}
	function setDeliveryText(id, val) {
		const el = $(id);
		if (el) el.textContent = val === undefined || val === null || val === '' ? '—' : String(val);
	}
	function jawExtents(raw) {
		const nums = String(raw || '').match(/-?\d+(?:\.\d+)?/g) || [];
		let x = 10,
			y = 10;
		if (nums.length >= 2) {
			x = Math.abs(Number(nums[0]) || 10);
			y = Math.abs(Number(nums[1]) || 10);
		}
		return {
			x1: (-x / 2).toFixed(2),
			x2: (x / 2).toFixed(2),
			y1: (-y / 2).toFixed(2),
			y2: (y / 2).toFixed(2)
		};
	}
	function couchCoords(raw) {
		const nums = String(raw || '').match(/-?\d+(?:\.\d+)?/g) || [];
		return {
			vrt: (Number(nums[0]) || 0).toFixed(2),
			lng: (Number(nums[1]) || 0).toFixed(2),
			lat: (Number(nums[2]) || 0).toFixed(2)
		};
	}
	function syncDeliveryReferenceScreen() {
		if (!$('rtv2DeliveryAlt')) return;
		const bridge = window.RTAppsLinacMirrorBridge;
		if (!bridge || typeof bridge.snapshot !== 'function') {
			// ES modules are deferred; the mirror script can initialize first.
			// Skip this paint safely and allow the normal mirror timer/observer to retry.
			return;
		}
		const bs = bridge.snapshot();
		if (!bs) return;
		const activeTreatmentCase = bs.activeTreatmentCase || null;
		const treatmentDelivery = bs.treatmentDelivery || {};
		const treatmentCompletion = bs.treatmentCompletion || {};
		const specialSetupWorkflow = bs.specialSetupWorkflow || {};
		const fundamentalState = bs.fundamentalState || {};
		const plan = bs.plan || { mu: 0, doseRate: 0, mode: 'STATIC', geometry: {} };
		const readyInfo = bs.readyInfo || { ready: false, checks: [] };
		const dyn = bs.dyn || null;
		const activeFields = Array.isArray(bs.activeFields) ? bs.activeFields : [];
		const hasCase = !!activeTreatmentCase;
		const delivered = Number(treatmentDelivery.muDelivered) || 0;
		const total = Number(plan.mu) || 0;
		const pct = total ? Math.max(0, Math.min(100, (delivered / total) * 100)) : 0;
		const activeIndex = Math.max(
			0,
			Math.min(
				Math.max(0, activeFields.length - 1),
				Number(treatmentDelivery.activeFieldIndex) || 0
			)
		);
		const courseLabel = hasCase
			? `${text('consoleRefMRN') || activeTreatmentCase.mrn || 'PLAN'}_${(activeTreatmentCase.siteKey || activeTreatmentCase.siteLabel || 'Course').replace(/\s+/g, '').slice(0, 10)}`
			: 'No plan';
		const fx = text('consoleRefFraction') || activeTreatmentCase?.fraction || '--';
		setDeliveryText('rtv2dPrimaryUser', `hub · ${new Date().toLocaleDateString()}`);
		setDeliveryText(
			'rtv2dOrientation',
			text('consoleRefPosition') || activeTreatmentCase?.positionLabel || '--'
		);
		setDeliveryText(
			'rtv2dClock',
			new Date().toLocaleTimeString([], {
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit'
			})
		);
		setDeliveryText('rtv2dName', hasCase ? activeTreatmentCase.patient : 'No patient');
		setDeliveryText('rtv2dID', text('consoleRefMRN') || activeTreatmentCase?.mrn || '--');
		setDeliveryText(
			'rtv2dSite',
			hasCase ? activeTreatmentCase.siteLabel || activeTreatmentCase.technique || '--' : '--'
		);
		setDeliveryText('rtv2dRadOnc', hasCase ? extractRadOnc(activeTreatmentCase.note) : '--');
		setDeliveryText('rtv2dCourse', courseLabel);
		setDeliveryText('rtv2dFx', `Fx: ${fx}`);
		const fieldList = $('rtv2dFieldList');
		if (fieldList) {
			if (!hasCase || !activeFields.length) {
				fieldList.innerHTML =
					'<div class="rtv2d-field-row"><div class="rtv2d-field-main"><b>No fields loaded</b><span>Open a patient chart from the home queue.</span></div></div>';
			} else
				fieldList.innerHTML = activeFields
					.map((f, i) => {
						const done = !!treatmentDelivery?.completedFields?.[i];
						const actual = i === activeIndex ? delivered : done ? Number(f.mu) || 0 : 0;
						const cls = ['rtv2d-field-row', i === activeIndex ? 'active' : '', done ? 'done' : '']
							.filter(Boolean)
							.join(' ');
						const ico = done ? '✓' : '≡';
						return `<button type="button" class="${cls}" data-index="${i}"><div class="rtv2d-field-ico">${ico}</div><div class="rtv2d-field-main"><b>${f.name || f.field || 'Field ' + (i + 1)}</b><span>${f.mode || 'STATIC'} · ${f.targetRegion || activeTreatmentCase.siteLabel || 'Treatment'}</span></div><div class="rtv2d-field-mu">${actual.toFixed(1)} / ${(Number(f.mu) || 0).toFixed(0)}</div></button>`;
					})
					.join('');
		}
		const isDelivering = !!treatmentDelivery?.delivering,
			isArmed = !!treatmentDelivery?.armed,
			isCompleted = !!treatmentDelivery?.completed,
			posted = !!treatmentCompletion?.posted,
			ready = !!readyInfo.ready;
		let hero = 'To begin, click Prepare.';
		if (!hasCase) hero = 'Open a patient chart to begin.';
		else if (isDelivering && treatmentDelivery?.held)
			hero = 'Beam hold active. Resolve hold or resume delivery.';
		else if (isDelivering) hero = 'Beam on. Monitor MU progression and treatment status.';
		else if (posted) hero = 'Fraction recorded. Session complete.';
		else if (isCompleted) hero = 'Field complete. Record the fraction or select the next field.';
		else if (isArmed) hero = 'Field enabled. Click Beam On to deliver.';
		else if (ready) hero = 'Patient ready. Click Ready to enable beam.';
		setDeliveryText('rtv2dHeroCaption', hero);
		[
			'rtv2dStepPreview',
			'rtv2dStepPrepare',
			'rtv2dStepReady',
			'rtv2dStepBeam',
			'rtv2dStepRecord'
		].forEach((id) => $(id)?.classList.remove('active', 'done', 'beam'));
		$('rtv2dStepPreview')?.classList.add(hasCase ? 'done' : 'active');
		if (hasCase && !ready && !isArmed && !isDelivering && !isCompleted && !posted)
			$('rtv2dStepPrepare')?.classList.add('active');
		else if (hasCase) $('rtv2dStepPrepare')?.classList.add('done');
		if (ready && !isArmed && !isDelivering && !isCompleted && !posted)
			$('rtv2dStepReady')?.classList.add('active');
		else if (isArmed || isDelivering || isCompleted || posted)
			$('rtv2dStepReady')?.classList.add('done');
		if (isDelivering) $('rtv2dStepBeam')?.classList.add('beam');
		else if (isCompleted || posted) $('rtv2dStepBeam')?.classList.add('done');
		if (posted || (isCompleted && (bs.allFieldsCompleted || false)))
			$('rtv2dStepRecord')?.classList.add('active');
		const beamTypePlan = plan.electron
			? 'STATIC (Electron)'
			: String(plan.mode || 'STATIC').toUpperCase() === 'VMAT'
				? 'ARC (VMAT)'
				: String(plan.mode || 'STATIC').toUpperCase() === 'IMRT'
					? 'IMRT'
					: 'STATIC (Photon)';
		const beamTypeActual = isDelivering ? beamTypePlan : isArmed ? 'READY' : '—';
		const energy = text('consoleRefEnergy') || activeTreatmentCase?.energy || '—';
		setDeliveryText('rtv2dBeamTypePlan', beamTypePlan);
		setDeliveryText('rtv2dBeamTypeActual', beamTypeActual);
		setDeliveryText('rtv2dEnergyPlan', energy);
		setDeliveryText('rtv2dEnergyActual', energy);
		setDeliveryText('rtv2dMUPlan', (Number(plan.mu) || 0).toFixed(1));
		setDeliveryText('rtv2dMUActual', delivered.toFixed(1));
		setDeliveryText('rtv2dDoseRatePlan', `${Math.round(Number(plan.doseRate) || 0)}`);
		setDeliveryText(
			'rtv2dDoseRateActual',
			`${Math.round(Number(dyn?.doseRate) || Number(plan.doseRate) || 0)}`
		);
		setDeliveryText(
			'rtv2dTimePlan',
			((Number(plan.mu) || 0) / Math.max(1, Number(plan.doseRate) || 600)).toFixed(2)
		);
		setDeliveryText(
			'rtv2dTimeActual',
			(
				(Number(delivered) || 0) /
				Math.max(1, Number(dyn?.doseRate) || Number(plan.doseRate) || 600)
			).toFixed(2)
		);
		const bolusPlan = plan?.electron
			? specialSetupWorkflow?.electron?.bolusRequired
				? 'Required'
				: 'None'
			: String(activeTreatmentCase?.note || '')
						.toLowerCase()
						.includes('bolus')
				? 'Present'
				: 'None';
		const bolusActual = specialSetupWorkflow?.electron?.bolusPlaced ? 'Placed' : bolusPlan;
		setDeliveryText('rtv2dWedgePlan', 'None');
		setDeliveryText('rtv2dWedgeActual', 'None');
		setDeliveryText('rtv2dBolusPlan', bolusPlan);
		setDeliveryText('rtv2dBolusActual', bolusActual);
		const plannedJaws = jawExtents(plan.geometry?.jaws || text('consolePlanJaws') || '10 × 10');
		const couchPlan = couchCoords(
			activeTreatmentCase?.planned?.couch || text('consolePlanCouch') || '0 / 0 / 0'
		);
		setDeliveryText('rtv2dGantryPlan', plan.geometry?.gantry || text('consolePlanGantry') || '0');
		setDeliveryText('rtv2dGantryActual', (Number(fundamentalState?.gantry) || 0).toFixed(1));
		setDeliveryText('rtv2dCollPlan', plan.geometry?.collimator || text('consolePlanColl') || '0');
		setDeliveryText('rtv2dCollActual', (Number(fundamentalState?.collimator) || 0).toFixed(1));
		setDeliveryText('rtv2dCouchRotPlan', plan.geometry?.couchAngle || '0');
		setDeliveryText('rtv2dCouchRotActual', (Number(fundamentalState?.couchAngle) || 0).toFixed(1));
		setDeliveryText('rtv2dY1Plan', plannedJaws.y1);
		setDeliveryText('rtv2dY2Plan', plannedJaws.y2);
		setDeliveryText('rtv2dX1Plan', plannedJaws.x1);
		setDeliveryText('rtv2dX2Plan', plannedJaws.x2);
		setDeliveryText('rtv2dY1Actual', (-Math.abs(Number(fundamentalState?.jawY1) || 0)).toFixed(2));
		setDeliveryText('rtv2dY2Actual', Math.abs(Number(fundamentalState?.jawY2) || 0).toFixed(2));
		setDeliveryText('rtv2dX1Actual', (-Math.abs(Number(fundamentalState?.jawX1) || 0)).toFixed(2));
		setDeliveryText('rtv2dX2Actual', Math.abs(Number(fundamentalState?.jawX2) || 0).toFixed(2));
		setDeliveryText('rtv2dVrtPlan', couchPlan.vrt);
		setDeliveryText('rtv2dLngPlan', couchPlan.lng);
		setDeliveryText('rtv2dLatPlan', couchPlan.lat);
		setDeliveryText('rtv2dVrtActual', (Number(fundamentalState?.vrt) || 0).toFixed(2));
		setDeliveryText('rtv2dLngActual', (Number(fundamentalState?.lng) || 0).toFixed(2));
		setDeliveryText('rtv2dLatActual', (Number(fundamentalState?.lat) || 0).toFixed(2));
		setDeliveryText('rtv2dPitchActual', (Number(fundamentalState?.pitch) || 0).toFixed(2));
		setDeliveryText('rtv2dRollActual', (Number(fundamentalState?.roll) || 0).toFixed(2));
		setDeliveryText('rtv2dYawActual', (Number(fundamentalState?.yaw) || 0).toFixed(2));
		const readyState = $('rtv2dReadyState');
		if (readyState) {
			readyState.textContent = text('consoleReadyState') || (ready ? 'READY' : 'TREATMENT HOLD');
			readyState.classList.toggle('good', ready);
		}
		setDeliveryText('rtv2dStatus', text('deliveryStatus') || 'Load and verify a treatment case.');
		setDeliveryText('rtv2dProgressMU', `${delivered.toFixed(1)} MU`);
		setDeliveryText('rtv2dProgressDetail', `${delivered.toFixed(1)} / ${total.toFixed(1)} MU`);
		const fill = $('rtv2dProgressFill');
		if (fill) fill.style.width = `${pct}%`;
		const prep = $<HTMLButtonElement>('rtv2dActionPrep'),
			readyBtn = $<HTMLButtonElement>('rtv2dActionReady'),
			beamBtn = $<HTMLButtonElement>('rtv2dActionBeam'),
			holdBtn = $<HTMLButtonElement>('rtv2dActionHold'),
			recordBtn = $<HTMLButtonElement>('rtv2dActionRecord');
		const srcPrep = $<HTMLButtonElement>('deliveryRecheck'),
			srcReady = $<HTMLButtonElement>('deliveryArm'),
			srcBeam = $<HTMLButtonElement>('deliveryStart'),
			srcHold = $<HTMLButtonElement>('deliveryHold');
		if (prep && srcPrep) prep.disabled = !!srcPrep.disabled;
		if (readyBtn && srcReady) {
			readyBtn.disabled = !!srcReady.disabled;
			readyBtn.textContent = (srcReady.textContent || 'READY').toUpperCase();
		}
		if (beamBtn && srcBeam) beamBtn.disabled = !!srcBeam.disabled;
		if (holdBtn && srcHold) {
			holdBtn.disabled = !!srcHold.disabled;
			holdBtn.textContent = (srcHold.textContent || 'BEAM HOLD').toUpperCase();
		}
		if (recordBtn) {
			recordBtn.disabled = !!(
				$<HTMLButtonElement>('deliveryCompleteSession')?.disabled &&
				$<HTMLButtonElement>('deliveryReviewCharges')?.disabled
			);
		}
		const checks = $('rtv2dChecklist');
		if (checks) {
			const items = (readyInfo.checks || []).slice(0, 8);
			checks.innerHTML =
				items
					.map(
						(c) =>
							`<div class="rtv2d-check ${c.ok ? 'good' : 'bad'}"><div class="lamp">${c.ok ? '✓' : '!'}</div><div><b>${c.name}</b><span>${c.detail}</span></div></div>`
					)
					.join('') ||
				'<div class="rtv2d-check"><div><b>No checks loaded</b><span>Open a patient chart and select the Treatment Delivery workflow.</span></div></div>';
		}
	}

	function updateFlow() {
		const ready =
			(text('consoleReadyState') || '').toLowerCase().includes('ready') &&
			!(text('consoleReadyState') || '').toLowerCase().includes('not ready');
		const igrt = (text('consoleIGRTStatusChip') || '').toLowerCase();
		const delivery = (text('deliveryStatus') || '').toLowerCase();
		const beam = (text('consoleBeamStatusChip') || '').toLowerCase();
		$('rtv2FlowSetup')?.classList.toggle('done', activeWorkflow !== 'chart');
		$('rtv2FlowIGRT')?.classList.toggle('done', /verified|complete|approved/.test(igrt));
		$('rtv2FlowReady')?.classList.toggle('ready', ready);
		$('rtv2FlowBeam')?.classList.toggle(
			'beam-active',
			/beam on|delivering/.test(delivery + ' ' + beam)
		);
		$('rtv2FlowRecord')?.classList.toggle('done', /complete|completed|recorded/.test(delivery));
	}
	function enhanceDock() {
		const dock = $('consoleWorkflowDock');
		if (!dock || $('rtv2DockFlow')) return;
		const bar = dock.querySelector('.console-dock-bar');
		if (!bar) return;
		const title = bar.querySelector('.console-dock-eyebrow');
		if (title) {
			title.innerHTML = '<b id="rtv2DockTitle">Treatment</b><span>Record and Verify mode</span>';
		}
		const flow = document.createElement('div');
		flow.id = 'rtv2DockFlow';
		flow.className = 'rtv2-dock-flow';
		flow.innerHTML =
			'<span data-step="setup">Setup</span><span data-step="igrt">IGRT</span><span data-step="ready">Ready</span><span data-step="delivery">Beam On</span><span data-step="record">Record</span>';
		bar.insertAdjacentElement('afterend', flow);
	}
	function updateDockTitle() {
		const title = $('rtv2DockTitle');
		if (!title) return;
		const ids = [
			['immobilizationPanel', 'Patient Setup'],
			['igrtPanel', 'IGRT / Image Guidance'],
			['deliveryPanel', 'Treatment Delivery'],
			['oisPanel', 'OIS / R&V'],
			['motionPanel', 'Motion Management'],
			['adaptivePanel', 'Adaptive Review'],
			['srsPanel', 'SRS Workflow'],
			['specialSetupPanel', 'Special Setup'],
			['chargeCapturePanel', 'Charge Capture']
		];
		const open = ids.find(([id]) => $(id)?.classList.contains('open'));
		title.textContent = open ? open[1] : 'Treatment';
		const type = open?.[0] || '';
		document
			.querySelectorAll('#rtv2DockFlow span')
			.forEach((s) => s.classList.remove('active', 'done'));
		const setup = document.querySelector('#rtv2DockFlow [data-step="setup"]'),
			igrt = document.querySelector('#rtv2DockFlow [data-step="igrt"]'),
			del = document.querySelector('#rtv2DockFlow [data-step="delivery"]');
		if (type === 'immobilizationPanel') setup?.classList.add('active');
		if (type === 'igrtPanel') {
			setup?.classList.add('done');
			igrt?.classList.add('active');
		}
		if (type === 'deliveryPanel') {
			setup?.classList.add('done');
			igrt?.classList.add('done');
			del?.classList.add('active');
		}
		if (type === 'oisPanel') {
			setup?.classList.add('done');
			igrt?.classList.add('done');
			del?.classList.add('done');
			document.querySelector('#rtv2DockFlow [data-step="record"]')?.classList.add('active');
		}
	}
	function observe() {
		const ids = [
			'consoleActivePatient',
			'consoleActiveField',
			'consoleRefMRN',
			'consoleRefFraction',
			'consoleRefPosition',
			'consoleRefEnergy',
			'consoleRefTechnique',
			'consoleRefField',
			'consolePlanGantry',
			'consolePlanColl',
			'consolePlanJaws',
			'consolePlanMLC',
			'consolePlanCouch',
			'consoleReadoutGantry',
			'consoleReadoutColl',
			'consoleReadoutJaws',
			'consoleReadoutMLC',
			'hudCouch',
			'deliveryMUValue',
			'deliveryMUDetail',
			'deliveryStatus',
			'deliveryProgressBar',
			'consoleMotionEnable',
			'consoleIGRTStatusChip',
			'consoleDoorStatusChip',
			'consoleReadyState',
			'consoleBeamStatusChip'
		];
		ids.forEach((id) => {
			const el = $(id);
			if (el)
				new MutationObserver(syncMirror).observe(el, {
					subtree: true,
					childList: true,
					characterData: true,
					attributes: true,
					attributeFilter: ['class', 'style']
				});
		});
		[
			'immobilizationPanel',
			'igrtPanel',
			'deliveryPanel',
			'oisPanel',
			'motionPanel',
			'adaptivePanel',
			'srsPanel',
			'specialSetupPanel',
			'chargeCapturePanel'
		].forEach((id) => {
			const el = $(id);
			if (el)
				new MutationObserver(() => {
					updateDockTitle();
					syncMirror();
				}).observe(el, { attributes: true, attributeFilter: ['class'] });
		});
		const select = $('treatmentCaseSelect');
		if (select)
			new MutationObserver(renderQueue).observe(select, { childList: true, subtree: true });
		new MutationObserver(() => {
			syncRoomNav();
			syncMirror();
		}).observe(document.body, { attributes: true, attributeFilter: ['class'] });
		[
			'consoleRoomLights',
			'consoleLasers',
			'consoleOdi',
			'consoleKV',
			'consoleMV',
			'consoleBeamVisual',
			'consoleGantryMinus',
			'consoleGantryPlus',
			'consoleCollMinus',
			'consoleCollPlus',
			'consoleJawsClose',
			'consoleJawsOpen',
			'consoleMLCClose',
			'consoleMLCOpen',
			'consoleMLCShape',
			'consoleVrtMinus',
			'consoleVrtPlus',
			'consoleLngMinus',
			'consoleLngPlus',
			'consoleLatMinus',
			'consoleLatPlus',
			'consoleTableMinus',
			'consoleTablePlus',
			'consoleRollMinus',
			'consoleRollPlus',
			'consolePitchMinus',
			'consolePitchPlus',
			'consoleYawMinus',
			'consoleYawPlus'
		].forEach((id) => {
			const el = $(id);
			if (el)
				new MutationObserver(syncMachineControlStates).observe(el, {
					attributes: true,
					attributeFilter: ['class', 'disabled']
				});
		});
	}
	function tick() {
		const now = new Date();
		const clock = $('rtv2Clock');
		if (clock)
			clock.textContent = now.toLocaleTimeString([], {
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit'
			});
	}
	function init() {
		buildShell();
		enhanceDock();
		observe();
		renderQueue();
		syncMirror();
		updateDockTitle();
		tick();
		setInterval(tick, 1000);
		enterLandingQueue();
		setTimeout(() => {
			renderQueue();
			enterLandingQueue();
		}, 350);
	}
	if (document.readyState === 'complete') init();
	else window.addEventListener('load', init, { once: true });
})();
