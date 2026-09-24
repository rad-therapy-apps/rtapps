// --- DOM Elements ---
export const viewerContainer = document.getElementById('viewerContainer');
export const taskSelect = document.getElementById('taskSelect') as HTMLSelectElement | null;
export const startQuizButton = document.getElementById(
	'startQuizButton'
) as HTMLButtonElement | null;
export const quizArea = document.getElementById('quizArea');
export const quizQuestionElem = document.getElementById('quizQuestion');
export const quizOptionsElem = document.getElementById('quizOptions');
export const submitAnswerButton = document.getElementById('submitAnswerButton');
export const messageArea = document.getElementById('messageArea');
export const balanceDisplay = document.getElementById('balanceDisplay');
export const enhancementStoreElem = document.getElementById('enhancementStore');
export const resetButton = document.getElementById('resetButton');
// RTApps (#77 phase 2 task 19): cast to HTMLSelectElement (not just HTMLElement):
// linac-delivery.ts reads/sets `.value`/`.options`/`.disabled` on these.
export const treatmentCaseSelect = document.getElementById(
	'treatmentCaseSelect'
) as HTMLSelectElement | null;
export const loadTreatmentCaseBtn = document.getElementById('loadTreatmentCaseBtn');
export const nextTreatmentCaseBtn = document.getElementById('nextTreatmentCaseBtn');
export const ctSuiteLaunchButton = document.getElementById('ctSuiteLaunchButton');
export const ctSuitePanel = document.getElementById('ctSuitePanel');
export const ctSuiteClose = document.getElementById('ctSuiteClose');
export const igrtLaunchButton = document.getElementById('igrtLaunchButton');
export const igrtPanel = document.getElementById('igrtPanel');
export const igrtClose = document.getElementById('igrtClose');
export const igrtNewSetup = document.getElementById('igrtNewSetup');
export const igrtAcquire = document.getElementById('igrtAcquire');
export const igrtVerify = document.getElementById('igrtVerify');
export const motionLaunchButton = document.getElementById('motionLaunchButton');
export const motionPanel = document.getElementById('motionPanel');
export const motionClose = document.getElementById('motionClose');
export const motionAcquire = document.getElementById('motionAcquire');
export const motionVerify = document.getElementById('motionVerify');
export const motionHold = document.getElementById('motionHold');
export const motionRelease = document.getElementById('motionRelease');
export const motionReset = document.getElementById('motionReset');
export const motionRecheck = document.getElementById('motionRecheck');
// RTApps (#77 phase 2 task 19): cast to HTMLCanvasElement/HTMLInputElement (not just
// HTMLElement): linac-delivery.ts reads `.getContext`/`.width`/`.height`/`.value` on these.
export const motionWaveCanvas = document.getElementById(
	'motionWaveCanvas'
) as HTMLCanvasElement | null;
export const motionGateLow = document.getElementById('motionGateLow') as HTMLInputElement | null;
export const motionGateHigh = document.getElementById('motionGateHigh') as HTMLInputElement | null;
export const motionDibhTarget = document.getElementById(
	'motionDibhTarget'
) as HTMLInputElement | null;
export const motionDibhTolerance = document.getElementById(
	'motionDibhTolerance'
) as HTMLInputElement | null;
export const adaptiveLaunchButton = document.getElementById('adaptiveLaunchButton');
export const adaptivePanel = document.getElementById('adaptivePanel');
export const adaptiveClose = document.getElementById('adaptiveClose');
export const adaptiveAssess = document.getElementById('adaptiveAssess');
export const adaptiveCompare = document.getElementById('adaptiveCompare');
export const adaptiveApprove = document.getElementById('adaptiveApprove');
export const oisLaunchButton = document.getElementById('oisLaunchButton');
export const oisPanel = document.getElementById('oisPanel');
export const oisClose = document.getElementById('oisClose');
// RTApps (#77 phase 2 task 19): cast to HTMLTextAreaElement/HTMLInputElement/
// HTMLButtonElement/HTMLCanvasElement (not just HTMLElement): linac-delivery.ts reads/sets
// `.value`/`.checked`/`.disabled`/`.getContext` on these.
export const oisNote = document.getElementById('oisNote') as HTMLTextAreaElement | null;
export const oisTherapist = document.getElementById('oisTherapist') as HTMLInputElement | null;
export const oisReviewCheck = document.getElementById('oisReviewCheck') as HTMLInputElement | null;
export const oisOverrideCard = document.getElementById('oisOverrideCard');
export const oisOverrideSummary = document.getElementById('oisOverrideSummary');
export const oisOverrideReviewCheck = document.getElementById(
	'oisOverrideReviewCheck'
) as HTMLInputElement | null;
export const oisSignOff = document.getElementById('oisSignOff') as HTMLButtonElement | null;
export const adaptiveNextFraction = document.getElementById(
	'adaptiveNextFraction'
) as HTMLButtonElement | null;
export const adaptiveResetCourse = document.getElementById(
	'adaptiveResetCourse'
) as HTMLButtonElement | null;
export const adaptiveDoseCanvas = document.getElementById(
	'adaptiveDoseCanvas'
) as HTMLCanvasElement | null;
export const srsLaunchButton = document.getElementById('srsLaunchButton');
export const srsPanel = document.getElementById('srsPanel');
export const srsClose = document.getElementById('srsClose');
export const srsClearanceCheck = document.getElementById('srsClearanceCheck');
export const srsDryRun = document.getElementById('srsDryRun') as HTMLButtonElement | null;
export const srsVerifyTimeout = document.getElementById(
	'srsVerifyTimeout'
) as HTMLButtonElement | null;
export const specialSetupLaunchButton = document.getElementById('specialSetupLaunchButton');
export const specialSetupPanel = document.getElementById('specialSetupPanel');
export const specialSetupClose = document.getElementById('specialSetupClose');
export const specialSetupContent = document.getElementById('specialSetupContent');
export const deliveryLaunchButton = document.getElementById('deliveryLaunchButton');
// RTApps (#77 phase 2 task 19): cast to HTMLButtonElement (not just HTMLElement):
// linac-delivery.ts sets `.disabled` on this.
export const immobilizationLaunchButton = document.getElementById(
	'immobilizationLaunchButton'
) as HTMLButtonElement | null;
export const immobilizationPanel = document.getElementById('immobilizationPanel');
export const immobilizationClose = document.getElementById('immobilizationClose');
export const immobilizationShelf = document.getElementById('immobilizationShelf');
export const immobilizationTableDrop = document.getElementById('immobilizationTableDrop');
export const immobilizationPlacedList = document.getElementById('immobilizationPlacedList');
export const immobilizationVerify = document.getElementById('immobilizationVerify');
export const immobilizationReset = document.getElementById('immobilizationReset');
export const deliveryPanel = document.getElementById('deliveryPanel');
export const deliveryClose = document.getElementById('deliveryClose');
export const deliveryRecheck = document.getElementById('deliveryRecheck');
// RTApps (#77 phase 2 task 19): cast to HTMLButtonElement (not just HTMLElement):
// linac-delivery.ts sets `.disabled` on these.
export const deliveryArm = document.getElementById('deliveryArm') as HTMLButtonElement | null;
export const clearanceOverrideCard = document.getElementById('clearanceOverrideCard');
export const clearanceOverrideReason = document.getElementById('clearanceOverrideReason');
// RTApps (#77 phase 2 task 19): cast to HTMLTextAreaElement/HTMLInputElement/
// HTMLButtonElement (not just HTMLElement): linac-safety.ts reads/sets
// `.value`/`.checked`/`.disabled` on these.
export const clearanceOverrideRationale = document.getElementById(
	'clearanceOverrideRationale'
) as HTMLTextAreaElement | null;
export const clearanceOverrideAck = document.getElementById(
	'clearanceOverrideAck'
) as HTMLInputElement | null;
export const clearanceOverrideApply = document.getElementById(
	'clearanceOverrideApply'
) as HTMLButtonElement | null;
export const clearanceOverrideWithdraw = document.getElementById(
	'clearanceOverrideWithdraw'
) as HTMLButtonElement | null;
export const clearanceOverrideStatus = document.getElementById('clearanceOverrideStatus');
// RTApps (#77 phase 2 task 19): cast to HTMLButtonElement (not just HTMLElement):
// linac-delivery.ts sets `.disabled` on these.
export const deliveryStart = document.getElementById('deliveryStart') as HTMLButtonElement | null;
export const deliveryHold = document.getElementById('deliveryHold') as HTMLButtonElement | null;
export const deliveryTerminate = document.getElementById(
	'deliveryTerminate'
) as HTMLButtonElement | null;
// RTApps (#77 phase 2 task 19): cast to HTMLSelectElement (not just HTMLElement):
// linac-delivery.ts reads/sets `.value`/`.options`/`.disabled` on this.
export const deliveryFieldSelect = document.getElementById(
	'deliveryFieldSelect'
) as HTMLSelectElement | null;
// RTApps (#77 phase 2 task 19): cast to HTMLButtonElement/HTMLSelectElement (not just
// HTMLElement): sdk.ts reads/sets `.disabled`/`.value` on these.
export const deliveryCompleteSession = document.getElementById(
	'deliveryCompleteSession'
) as HTMLButtonElement | null;
export const deliveryReviewCharges = document.getElementById(
	'deliveryReviewCharges'
) as HTMLButtonElement | null;
export const chargeCapturePanel = document.getElementById('chargeCapturePanel');
export const chargeCaptureClose = document.getElementById('chargeCaptureClose');
export const chargeTreatmentCode = document.getElementById(
	'chargeTreatmentCode'
) as HTMLSelectElement | null;
export const chargeIgrtHandling = document.getElementById(
	'chargeIgrtHandling'
) as HTMLSelectElement | null;
export const chargeVerify = document.getElementById('chargeVerify') as HTMLButtonElement | null;
export const chargePost = document.getElementById('chargePost') as HTMLButtonElement | null;
export const loadingScreen = document.getElementById('loadingScreen');
export const tabButtons = document.querySelectorAll('.tab-button');
export const tabContentPanels = document.querySelectorAll('.tab-content-panel');
export const bottomMachineControls = document.getElementById('bottomMachineControls');
export const gantryRotatePlusButton = document.getElementById(
	'gantryRotatePlusButton'
) as HTMLButtonElement | null;
export const gantryRotateMinusButton = document.getElementById(
	'gantryRotateMinusButton'
) as HTMLButtonElement | null;
export const collimatorRotatePlusButton = document.getElementById('collimatorRotatePlusButton');
export const collimatorRotateMinusButton = document.getElementById('collimatorRotateMinusButton');
export const pendantMotionEnable = document.getElementById('pendantMotionEnable');
export const couchUpButton = document.getElementById('couchUpButton') as HTMLButtonElement | null;
export const couchDownButton = document.getElementById(
	'couchDownButton'
) as HTMLButtonElement | null;
export const couchInButton = document.getElementById('couchInButton') as HTMLButtonElement | null;
export const couchOutButton = document.getElementById('couchOutButton') as HTMLButtonElement | null;
export const couchLeftButton = document.getElementById(
	'couchLeftButton'
) as HTMLButtonElement | null;
export const couchRightButton = document.getElementById(
	'couchRightButton'
) as HTMLButtonElement | null;
export const couchRollPlusButton = document.getElementById(
	'couchRollPlusButton'
) as HTMLButtonElement | null;
export const couchRollMinusButton = document.getElementById(
	'couchRollMinusButton'
) as HTMLButtonElement | null;
export const couchPitchPlusButton = document.getElementById(
	'couchPitchPlusButton'
) as HTMLButtonElement | null;
export const couchPitchMinusButton = document.getElementById(
	'couchPitchMinusButton'
) as HTMLButtonElement | null;
export const couchYawPlusButton = document.getElementById(
	'couchYawPlusButton'
) as HTMLButtonElement | null;
export const couchYawMinusButton = document.getElementById(
	'couchYawMinusButton'
) as HTMLButtonElement | null;
export const couchTreatmentAnglePlusButton = document.getElementById(
	'couchTreatmentAnglePlusButton'
) as HTMLButtonElement | null;
export const couchTreatmentAngleMinusButton = document.getElementById(
	'couchTreatmentAngleMinusButton'
) as HTMLButtonElement | null;
export const jawsOpenButton = document.getElementById('jawsOpenButton') as HTMLButtonElement | null;
export const jawsCloseButton = document.getElementById(
	'jawsCloseButton'
) as HTMLButtonElement | null;
export const jawX1InButton = document.getElementById('jawX1InButton') as HTMLButtonElement | null;
export const jawX1OutButton = document.getElementById('jawX1OutButton') as HTMLButtonElement | null;
export const jawX2InButton = document.getElementById('jawX2InButton') as HTMLButtonElement | null;
export const jawX2OutButton = document.getElementById('jawX2OutButton') as HTMLButtonElement | null;
export const jawY1InButton = document.getElementById('jawY1InButton') as HTMLButtonElement | null;
export const jawY1OutButton = document.getElementById('jawY1OutButton') as HTMLButtonElement | null;
export const jawY2InButton = document.getElementById('jawY2InButton') as HTMLButtonElement | null;
export const jawY2OutButton = document.getElementById('jawY2OutButton') as HTMLButtonElement | null;
export const mlcOpenButton = document.getElementById('mlcOpenButton');
export const mlcCloseButton = document.getElementById('mlcCloseButton');
export const mlcShapeButton = document.getElementById('mlcShapeButton');
export const detectorToggleButton = document.getElementById(
	'detectorToggleButton'
) as HTMLButtonElement | null;
// RTApps (#77 phase 2 task 19): cast to HTMLButtonElement (not just HTMLElement):
// linac-delivery.ts sets `.disabled` on this.
export const beamOnButton = document.getElementById('beamOnButton') as HTMLButtonElement | null;
export const lasersToggleButton = document.getElementById(
	'lasersToggleButton'
) as HTMLButtonElement | null;
export const odiToggleButton = document.getElementById('odiToggleButton');
export const bonusChallengeButton = document.getElementById('bonusChallengeButton');
export const roomLightsToggleButton = document.getElementById('roomLightsToggleButton');
export const viewVaultButton = document.getElementById('viewVaultButton');
export const viewControlRoomButton = document.getElementById('viewControlRoomButton');
export const kvToggleButton = document.getElementById('kvToggleButton') as HTMLButtonElement | null;
export const operatorConsolePanel = document.getElementById('operatorConsolePanel');
export const consoleActivePatient = document.getElementById('consoleActivePatient');
export const consoleActiveField = document.getElementById('consoleActiveField');
export const consoleRoomStatus = document.getElementById('consoleRoomStatus');
export const consoleMotionStatus = document.getElementById('consoleMotionStatus');
export const consoleQueue = document.getElementById('consoleQueue');
export const consoleMotionEnable = document.getElementById('consoleMotionEnable');
export const consoleImmoButton = document.getElementById('consoleImmoButton');
export const consoleIGRTButton = document.getElementById('consoleIGRTButton');
export const consoleDeliveryButton = document.getElementById('consoleDeliveryButton');
export const consoleOISButton = document.getElementById('consoleOISButton');
export const consoleGantryMinus = document.getElementById('consoleGantryMinus');
export const consoleGantryPlus = document.getElementById('consoleGantryPlus');
export const consoleCollMinus = document.getElementById('consoleCollMinus');
export const consoleCollPlus = document.getElementById('consoleCollPlus');
export const consoleVrtMinus = document.getElementById('consoleVrtMinus');
export const consoleVrtPlus = document.getElementById('consoleVrtPlus');
export const consoleLngMinus = document.getElementById('consoleLngMinus');
export const consoleLngPlus = document.getElementById('consoleLngPlus');
export const consoleLatMinus = document.getElementById('consoleLatMinus');
export const consoleLatPlus = document.getElementById('consoleLatPlus');
export const consoleKV = document.getElementById('consoleKV');
export const consoleMV = document.getElementById('consoleMV');
export const consoleLasers = document.getElementById('consoleLasers');
export const consoleBeamVisual = document.getElementById('consoleBeamVisual');
export const consoleRoomLights = document.getElementById('consoleRoomLights');
export const consoleTravelVault = document.getElementById('consoleTravelVault');
export const consoleTravelControl = document.getElementById('consoleTravelControl');
export const consoleJawsClose = document.getElementById('consoleJawsClose');
export const consoleJawsOpen = document.getElementById('consoleJawsOpen');
export const consoleMLCClose = document.getElementById('consoleMLCClose');
export const consoleMLCOpen = document.getElementById('consoleMLCOpen');
export const consoleMLCShape = document.getElementById('consoleMLCShape');
export const consoleOdi = document.getElementById('consoleOdi');
export const consoleJawX1In = document.getElementById('consoleJawX1In');
export const consoleJawX1Out = document.getElementById('consoleJawX1Out');
export const consoleJawX2In = document.getElementById('consoleJawX2In');
export const consoleJawX2Out = document.getElementById('consoleJawX2Out');
export const consoleJawY1In = document.getElementById('consoleJawY1In');
export const consoleJawY1Out = document.getElementById('consoleJawY1Out');
export const consoleJawY2In = document.getElementById('consoleJawY2In');
export const consoleJawY2Out = document.getElementById('consoleJawY2Out');
export const consoleRollMinus = document.getElementById('consoleRollMinus');
export const consoleRollPlus = document.getElementById('consoleRollPlus');
export const consolePitchMinus = document.getElementById('consolePitchMinus');
export const consolePitchPlus = document.getElementById('consolePitchPlus');
export const consoleYawMinus = document.getElementById('consoleYawMinus');
export const consoleYawPlus = document.getElementById('consoleYawPlus');
export const consoleTableMinus = document.getElementById('consoleTableMinus');
export const consoleTablePlus = document.getElementById('consoleTablePlus');
export const consoleReadoutGantry = document.getElementById('consoleReadoutGantry');
export const consoleReadoutColl = document.getElementById('consoleReadoutColl');
export const consoleReadoutJaws = document.getElementById('consoleReadoutJaws');
export const consoleReadoutMLC = document.getElementById('consoleReadoutMLC');
export const consoleCameraAStatus = document.getElementById('consoleCameraAStatus');
export const consoleCameraAInfo = document.getElementById('consoleCameraAInfo');
export const consoleCameraBStatus = document.getElementById('consoleCameraBStatus');
export const consoleCameraBInfo = document.getElementById('consoleCameraBInfo');
export const consoleCameraCStatus = document.getElementById('consoleCameraCStatus');
export const consoleCameraCInfo = document.getElementById('consoleCameraCInfo');
export const consolePatientClock = document.getElementById('consolePatientClock');
export const consolePatientRefName = document.getElementById('consolePatientRefName');
export const consolePatientRefSubtitle = document.getElementById('consolePatientRefSubtitle');
export const consoleRefMRN = document.getElementById('consoleRefMRN');
export const consoleRefFraction = document.getElementById('consoleRefFraction');
export const consoleRefPosition = document.getElementById('consoleRefPosition');
export const consoleRefEnergy = document.getElementById('consoleRefEnergy');
export const consoleRefTechnique = document.getElementById('consoleRefTechnique');
export const consoleRefField = document.getElementById('consoleRefField');
export const consolePlanGantry = document.getElementById('consolePlanGantry');
export const consolePlanColl = document.getElementById('consolePlanColl');
export const consolePlanJaws = document.getElementById('consolePlanJaws');
export const consolePlanMLC = document.getElementById('consolePlanMLC');
export const consolePlanImaging = document.getElementById('consolePlanImaging');
export const consolePlanCouch = document.getElementById('consolePlanCouch');
export const consoleImmoSummary = document.getElementById('consoleImmoSummary');
export const consoleImmoList = document.getElementById('consoleImmoList');
export const consoleBeamStatusChip = document.getElementById('consoleBeamStatusChip');
export const consoleDoorStatusChip = document.getElementById('consoleDoorStatusChip');
export const consoleIGRTStatusChip = document.getElementById('consoleIGRTStatusChip');
export const consoleLightsStatusChip = document.getElementById('consoleLightsStatusChip');
export const cameraSceneA = document.getElementById('cameraSceneA');
export const cameraSceneB = document.getElementById('cameraSceneB');
export const cameraSceneC = document.getElementById('cameraSceneC');
export const internalViewButton = document.getElementById(
	'internalViewButton'
) as HTMLButtonElement | null;
// Cast to HTMLButtonElement (not just HTMLElement): scene.ts sets `.disabled` on these.
export const beamStagePrevButton = document.getElementById(
	'beamStagePrevButton'
) as HTMLButtonElement | null;
export const beamStageNextButton = document.getElementById(
	'beamStageNextButton'
) as HTMLButtonElement | null;
export const asmBeamButton = document.getElementById('asmBeamButton') as HTMLButtonElement | null;
export const asmStandButton = document.getElementById('asmStandButton') as HTMLButtonElement | null;
export const asmElectronButton = document.getElementById(
	'asmElectronButton'
) as HTMLButtonElement | null;
export const asmAccessoryButton = document.getElementById(
	'asmAccessoryButton'
) as HTMLButtonElement | null;
export const internalOverlay = document.getElementById('internalOverlay');
export const internalStageTitle = document.getElementById('internalStageTitle');
export const internalStageDesc = document.getElementById('internalStageDesc');
export const internalStageCounter = document.getElementById('internalStageCounter');
export const bevInset = document.getElementById('bevInset');
export const bevCollapseButton = document.getElementById('bevCollapseButton');
export const bevFieldGroup = document.getElementById('bevFieldGroup');
export const bevFieldLight = document.getElementById('bevFieldLight');
export const bevMlcLeaves = document.getElementById('bevMlcLeaves');
export const bevJawMasks = document.getElementById('bevJawMasks');
export const bevJawOutline = document.getElementById('bevJawOutline');
