/* RTApps (#77 arcade tidy): shared type for the RTApps SDK on `window`.
   What this file does: declares `Window['RTApps']`, the two SDK members the arcade apps call.
   Used here and why: it was declared inside sim-hub's sdk-bridge.ts and linac-ct borrowed it by
   accident; one shared ambient declaration lets both apps type-check without that coupling.
   How it fits: mirrors the shipped contract (static/arcade/rtapps-sdk.js, checked against
   src/lib/arcade/sdk.spec.ts); `activityUrl` resolves to the player URL, `recordResult` submits a score.
   Depends on: nothing (types only; Vite strips types, so nothing imports it).
   Used by: arcade-src/sim-hub/src/sdk-bridge.ts, arcade-src/linac-ct/src/sdk.ts and
   linac-ct/src/workspace.ts (any arcade code reading window.RTApps). */
export {};

declare global {
	interface Window {
		RTApps?: {
			activityUrl: (slug: string) => Promise<string>;
			recordResult: (
				slug: string,
				opts?: { score?: number }
			) => Promise<{ percent: number | null }>;
		};
	}
}
