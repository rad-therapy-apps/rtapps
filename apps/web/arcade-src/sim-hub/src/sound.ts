/* Sound on and off (sim-hub menu, task 1a): the department ambience (scene.ts AMBIENCE, a WebAudio room
   tone). Off also silences the intercom beeps and speech (journey.ts playIntercomAudio checks
   AMBIENCE.on). It is off by default; Settings > Sound remembers the choice in PREF.sound. Browsers
   start audio only from a user gesture, so a remembered "on" is applied on the first click or key
   press of the visit. */
import { AMBIENCE, initAmbience, updateAmbience, ambienceProfile } from './scene';
import { toast } from './interact';
import { PREF, readPref } from './prefs';

export async function setSound(on: boolean): Promise<boolean> {
	if (on) {
		initAmbience();
		if (!AMBIENCE.ctx) {
			toast('<b>Sound is not available in this browser.</b>');
			return false;
		}
		try {
			if (AMBIENCE.ctx.state !== 'running') await AMBIENCE.ctx.resume();
		} catch {
			toast('<b>Sound could not be started.</b><br>Click the page once and try again.');
			return false;
		}
	}
	AMBIENCE.on = on;
	if (!AMBIENCE.ctx) return on; // off before it ever started: nothing to fade
	const t = AMBIENCE.ctx.currentTime;
	AMBIENCE.master.gain.cancelScheduledValues(t);
	if (on) {
		updateAmbience();
		AMBIENCE.master.gain.setTargetAtTime(ambienceProfile().master, t, 0.08);
	} else {
		AMBIENCE.master.gain.setTargetAtTime(0, t, 0.1);
		if ('speechSynthesis' in window) window.speechSynthesis.cancel();
	}
	return on;
}

export function applySoundPrefOnFirstGesture(): void {
	const apply = () => {
		document.removeEventListener('pointerdown', apply, true);
		document.removeEventListener('keydown', apply, true);
		if (readPref<unknown>(PREF.sound, false) === true && !AMBIENCE.on) void setSound(true);
	};
	document.addEventListener('pointerdown', apply, true);
	document.addEventListener('keydown', apply, true);
}
