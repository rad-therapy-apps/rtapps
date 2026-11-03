/* Vault 2's status board. Vault 2 has a patient on the couch and a therapist beside them but no
   journey, so its board steps through that patient's setup on a loop, on the sim clock. The therapist
   never leaves the room, so the loop never reaches beam on. Plain data, so its spec runs without the
   scene. */
export interface SetupStep {
	state: string;
	color: string;
	rows: [string, string][];
}

export const VAULT2_STEP_SEC = 25;

export const VAULT2_SETUP_STEPS: SetupStep[] = [
	{
		state: 'IDENTITY CHECK',
		color: '#42d5cf',
		rows: [
			['Patient', 'Name and date of birth · 2 identifiers'],
			['Couch', 'Preparing for setup'],
			['Imaging', 'Pending']
		]
	},
	{
		state: 'POSITIONING',
		color: '#42d5cf',
		rows: [
			['Patient', 'Identity verified'],
			['Couch', 'Indexed immobilization · aligning to marks'],
			['Imaging', 'Pending']
		]
	},
	{
		state: 'SETUP IMAGING',
		color: '#ffb454',
		rows: [
			['Patient', 'Positioned on the couch'],
			['Couch', 'Indexed'],
			['Imaging', 'Matching to the plan']
		]
	},
	{
		state: 'SETUP VERIFIED',
		color: '#65dda0',
		rows: [
			['Patient', 'Positioned · comfortable'],
			['Imaging', 'Matched to the plan'],
			['Therapist', 'In the room · final checks']
		]
	}
];

/** The setup step shown at sim time `sec` (seconds): each lasts VAULT2_STEP_SEC, then it starts over. */
export function vault2StepAt(sec: number): number {
	return Math.floor(Math.max(0, sec) / VAULT2_STEP_SEC) % VAULT2_SETUP_STEPS.length;
}
