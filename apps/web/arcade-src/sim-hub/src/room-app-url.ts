/* Where a LINAC/CT door leads (Free Mode fixes). The CT Control Room and CT Simulator Room doors open
   the CT simulation activity's player on the CT side; the LINAC Control Area door opens the
   Treatment delivery activity's player on the LINAC side. Both players run the same LINAC/CT app,
   so a CT door whose CT URL did not resolve uses the Treatment delivery player, still on the CT
   side. `side` rides in the player page's query: the app reads it there (linac-ct side.ts) and opens
   on that side's queue only. Free of scene and DOM imports so it is unit tested in Node
   (room-app-url.spec.ts); interact.ts performInteraction calls it with the URLs sdk-bridge.ts
   resolves. */

const CT_DOORS = new Set(['ctcontrol', 'ctsim']);

/** The URL to leave the hub by through room-app door `roomId` (a room id), absolute against `base`. */
export function roomAppHref(
	roomId: string,
	urls: { linac: string; ct: string | null },
	base: string
): string {
	const side = CT_DOORS.has(roomId) ? 'ct' : 'linac',
		url = new URL(side === 'ct' ? (urls.ct ?? urls.linac) : urls.linac, base);
	url.searchParams.set('side', side);
	return url.href;
}
