/* The collision interlock's rule for one machine move. linac-safety.ts measures the clearance
   margin between the couch (with the patient and devices) and the treatment head and gantry
   proxies before and after a move (metres; below zero is an overlap), and this rule says whether
   the move is refused: a move into the collision zone is, and so is one that makes an overlap the
   couch is already in worse; any move that gains clearance always goes, so the learner can back
   the couch out from anywhere. Every gantry, couch and table move uses it, from the in-room
   pendant, the console's keys and Move to field (linac-safety.ts attemptCollisionSafeMotion), as
   does the image-guidance setup's check that today's correction can be reached
   (linac-igrt.ts). Free of scene and DOM imports so it is unit tested in Node
   (collision-rule.spec.ts). */

/** How far into a proxy the couch may go before it counts as a collision (m): the proxies are
    rough, so a near-tangent pose that is still visibly clear on screen does not trip. */
export const COLLISION_PROXY_TOL = 0.025;

/** Inside the zone, how much clearance a move may lose and still go (m): the proxies' noise on a
    sideways move. */
export const WORSEN_SLACK = 0.002;

/** Whether the interlock refuses a move whose clearance margin goes from `before` to `after`. */
export function collisionRefuses(before: number, after: number): boolean {
	const entered = before >= -COLLISION_PROXY_TOL && after < -COLLISION_PROXY_TOL;
	const worsened = before < -COLLISION_PROXY_TOL && after < before - WORSEN_SLACK;
	return entered || worsened;
}
