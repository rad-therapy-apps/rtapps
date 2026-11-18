/// <reference types="vite/client" />
/* Where the center finds the LINAC app's exported vault: scripts/export-linac-model.mjs writes it
   to arcade-src/sim-hub/public/models/, which the build serves under the center's own base URL
   (/arcade/sim-hub/models/). vault-linac.ts loads the model, rooms.ts Vault 1's finish textures. */

/** The machine, couch and room parts (linac-vault.glb). */
export const LINAC_MODEL_URL = `${import.meta.env.BASE_URL}models/linac-vault.glb`;

/** One of the LINAC room's finish textures. */
export const linacTextureUrl = (kind: 'floor' | 'wall' | 'ceiling') =>
	`${import.meta.env.BASE_URL}models/linac-${kind}.png`;
