/// <reference types="vite/client" />
/* Where the center finds the LINAC app's exported vault: scripts/export-linac-model.mjs writes it
   to arcade-src/sim-hub/src/models/. Vite bundles the files with a content hash in the name
   (/arcade/sim-hub/assets/linac-vault-<hash>.glb), so a deploy can never pair new code with a
   cached old model. vault-linac.ts loads the model, rooms.ts Vault 1's finish textures. */
import linacVaultUrl from './models/linac-vault.glb?url';
import linacFloorUrl from './models/linac-floor.png?url';
import linacWallUrl from './models/linac-wall.png?url';
import linacCeilingUrl from './models/linac-ceiling.png?url';

/** The machine, couch and room parts (linac-vault.glb). */
export const LINAC_MODEL_URL = linacVaultUrl;

const TEXTURE_URLS = { floor: linacFloorUrl, wall: linacWallUrl, ceiling: linacCeilingUrl };

/** One of the LINAC room's finish textures. */
export const linacTextureUrl = (kind: 'floor' | 'wall' | 'ceiling') => TEXTURE_URLS[kind];
