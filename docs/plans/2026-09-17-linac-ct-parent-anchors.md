# Linac-CT Parent Module Split — Extraction Anchor Map

<!--
Extraction anchor map for PR 2 of docs/specs/2026-09-17-linac-ct-and-typescript-design.md.
Generated from a line-numbered census of apps/web/arcade/linac-ct/index.html at commit b7140af (main).
All line numbers below refer to that file as of that commit. The main module script spans lines
3269-9986; every one of its 315 top-level function declarations is assigned to exactly one target
module below. Census artifacts: functions_real.txt (315 functions), lets_real.txt (59 let
statements), consts_real.txt (323 consts), recon-linac-parent.md.
-->

Assignment invariant: every top-level function appears in exactly one module section. Functions are
listed as `name` — `line N` (line of the `function` keyword in index.html @ b7140af).

**Const placement rule (applies everywhere a const is not explicitly listed):** unlisted top-level
consts move with their sole consumer; consts serving one cluster move to the module owning that
cluster's line range; consts shared across modules go to the module that owns their primary writer.
Notable cross-cutting const arrows that are NOT part of the 315 function count: `wrap360` (8623),
`setTextById` (8624), `imgCouch` (9006), `couchTilt` (9043), `safeTilt` (9044) — `wrap360`/`safeTilt`
land per the rule above (`safeTilt`/`couchTilt`/`imgCouch` write `fundamentalState` and call the
collision guards, so they follow `linac-safety.js`; `wrap360`/`setTextById` are cross-cutting utils
that stay in `main.js` per the design).

## dom.js

No functions. Owns the DOM-element-reference const block, **lines 3291-3673** (the flat
`const x = document.getElementById(...)` cache under the `// --- DOM Elements ---` header at 3289).
`dom.js` exports **every const declared in that block** verbatim; other modules import their element
references from here instead of re-querying the DOM.

### Named config tables
- None. (Everything in 3291-3673 is an element reference, not a data table.)

## state.js

No functions. Owns ALL 59 top-level `let` statements of the main module script as members of a
single `export const S = {}` object (mutable module state; multi-name `let` lines expand to one `S`
member per binding). The 59 statements, with the names each declares:

- `HUB_URL` — line 3278 (written by the sdk bootstrap promise at 3277-3283, which stays in main.js)
- `internalViewOn`, `stageIndex`, `activeAssembly` — line 3531
- `beamPathGroup`, `standPathGroup`, `standInternalsGroup` — line 3532
- `beamHighlight`, `standHighlight` — line 3533
- `detailGantryGroup`, `detailFilter`, `detailFoil`, `detailTarget`, `detailAccessoryTray`, `detailElectronCone` — line 3534
- `scene`, `camera`, `renderer`, `controls` — line 3536
- `staticSetupGroup`, `gantryRotatingGroup`, `couchGroup`, `couchTopGroup`, `patientGroup`, `patientHome`, `patientSetupRAF`, `patientErrorGroup`, `errorGroupHome`, `patientBodyGroup`, `couchTopHomePos`, `couchTopHomeRot`, `couchTreatmentPivot`, `electronBolusMesh`, `immobilizationShelf3D`, `immobilizationPatientGroup` — line 3537
- `patientAnatomyParts`, `specialAnatomyTargetMarker` — line 3538
- `linacHeadObject`, `jawXN`, `jawXP`, `jawYN`, `jawYP`, `electronApplicatorGroup` — line 3539
- `mlcGroup`, `mlcLeavesA`, `mlcLeavesB` — line 3540
- `odiLine`, `odiSpot`, `odiOn`, `lastODIcm` — line 3541
- `detectorPanel`, `detectorArm` — line 3550
- `beamCone`, `laserGroup` — line 3551
- `beamOn`, `lasersOn` — line 3552
- `kvGroup`, `kvOn` — line 3553
- `roomLightsOn` — line 3554
- `hemiLight`, `ambientRoomLight`, `keyRoomLight`, `fillRoomLight`, `rimRoomLight` — line 3555
- `vaultDoorGroup`, `vaultDoorPanel`, `vaultDoorIndicator`, `vaultDoorTrack` — line 3557
- `controlRoomGroup` — line 3558
- `cameraTravel`, `currentRoomView` — line 3560
- `vaultDoorProgress`, `vaultDoorTarget`, `travelRequest` — line 3561
- `consoleMotionArmed` — line 3562
- `treatmentMonitorCanvas` — line 3567
- `treatmentMonitorCtx` — line 3568
- `treatmentMonitorTexture` — line 3569
- `treatmentMonitorMesh` — line 3570
- `treatmentMonitorFrame` — line 3571
- `treatmentMonitorFrameSecondary` — line 3572
- `activeTreatmentCase` — line 3573
- `activeTreatmentCaseIndex` — line 3574
- `clinicalIGRT` — line 3577
- `treatmentDelivery` — line 3593
- `clearanceOverrideState` — line 3598
- `motionManagement` — line 3600
- `adaptiveWorkflow` — line 3601
- `adaptiveCourse` — line 3602
- `oisSession` — line 3603
- `immobilizationWorkflow` — line 3604
- `srsWorkflow` — line 3605
- `specialSetupWorkflow` — line 3606
- `motionTarget3D`, `motionTargetBase`, `motionSurfaceMarker`, `motionSurfaceBase`, `motionHeart3D`, `motionHeartBase` — line 3607
- `deliveryRAF`, `deliveryMonitorStamp` — line 3608
- `treatmentCompletion` — line 3610
- `quizMode` — line 3611
- `activeBonus` — line 3612
- `currentBalance` — line 3625
- `earnedParts` — line 3626
- `purchasedEnhancements` — line 3627
- `currentQuizPart` — line 3628
- `bdSyncFromMachine` — line 3629
- `bonusQuestionDeck` — line 3630
- `recentScenarioKeys` — line 3631
- `allCorePartsEarned` — line 3632
- `jawOffset` — line 3633
- `detectorExtended` — line 3636
- `epidReceptorY` — line 3639
- `ghostMat` — line 5675
- `pendantMotionArmed` — line 8587
- `collisionBannerTimer` — line 8622

### Named config tables
- None (state.js holds only mutable `let` state; const tables live with their owning modules).

## scene.js — 72 functions

Vault/room/machine geometry, textures, monitor rendering, three.js bootstrap.

- `roundedBox` — line 3676
- `makeFloorTexture` — line 3743
- `makeWallTexture` — line 3752
- `makeRadSignTexture` — line 3759
- `makeCeilingTexture` — line 3768
- `makeControlScreenTexture` — line 3777
- `makeCameraFeedTexture` — line 3809 (texture maker consumed by createRoom/createTreatmentMonitor3D, not by cctv.js)
- `createRoom` — line 3831
- `setRoomLightsState` — line 3998
- `createTreatmentMonitor3D` — line 4024
- `monitorPlannedDisplay` — line 4190
- `getTreatmentMonitorActual` — line 4207
- `monitorFitFont` — line 4223
- `drawMonitorCell` — line 4233
- `renderTreatmentMonitor` — line 4254
- `createVaultEnvironment` — line 5546
- `createKvImaging3D` — line 5562
- `setKvState` — line 5619
- `mkHighlight` — line 5677
- `tube` — line 5682
- `createBeamPathViz` — line 5692
- `createStandAssembly3D` — line 5710
- `createKlystron` — line 5756
- `createCirculator` — line 5762
- `createRFWaveguide` — line 5769
- `createElectronGun` — line 5773
- `createWaveguide` — line 5780
- `createIonPump` — line 5786
- `createSteeringCoils` — line 5792
- `createBendingMagnet` — line 5797
- `createPrimaryCollimator` — line 5803
- `createTargetDetail` — line 5808
- `createFlatteningFilter` — line 5813
- `createScatteringFoil` — line 5818
- `createMonitorChamber` — line 5823
- `createMirrorAssembly` — line 5828
- `createMLCDetail` — line 5834
- `createDetailedInternals3D` — line 5844
- `toggleSimpleInternals` — line 5874
- `ghostShells` — line 5883
- `setInternalView` — line 5897
- `setAssembly` — line 5914
- `beamStageStep` — line 5930
- `updateStage` — line 5937
- `initThreeJS` — line 6015
- `rbox` — line 6069
- `cyl` — line 6074
- `ring` — line 6078
- `makeSilhouette` — line 6173
- `createLinacPart3D` — line 6181
- `makeBellowsTexture` — line 6206
- `createCouch3DModels` — line 6216
- `updateCouchAccordion` — line 6290
- `createCollimatorJaws3D` — line 6300
- `jawEdgeCmToOffset` — line 6322
- `updateJawPositions` — line 6326
- `createElectronApplicator3D` — line 6337
- `updateElectronApplicator3D` — line 6371
- `createMLC3D` — line 6394
- `mlcGapForLeaf` — line 6415
- `updateMLCPositions` — line 6422
- `createODI3D` — line 6432
- `updateODIReadout` — line 6454
- `setODIState` — line 6466
- `createImagingPanel3D` — line 7766
- `applyDetectorCommandedPose` — line 7810
- `setDetectorStateGame` — line 7826
- `createBeam3D` — line 7836
- `setBeamState` — line 7848
- `createLasers3D` — line 7857
- `setLaserState` — line 7869
- `onWindowResize` — line 7876

### Named config tables
- `SHELL_PART_IDS` — line 5628
- `BEAM_STAGES` — line 5629
- `ACCESSORY_STAGES` — line 5657
- `STAND_STAGES` — line 5664
- `ASSEMBLIES` — line 5669
- `SHELL_MATS` — line 5676
- `SIMPLE_INTERNAL_IDS` — line 5873
- `partBuilders` — line 6087
- Also per the const rule: `linacPartsData` (3686) moves here (primary consumer `createLinacPart3D`; game.js imports it for quiz metadata), along with the `MAT` materials cache and other geometry const caches in the 5546-6500 range.

## cctv.js — 3 functions

- `setupCCTVFeeds` — line 5956
- `resizeCCTVFeeds` — line 5981
- `updateCCTVFeeds` — line 5990

### Named config tables
- None of the enumerated tables; the CCTV render-target/texture-cache const(s) adjacent to 5956-6014 move here per the const rule.

## travel.js — 7 functions

- `syncRoomViewButtons` — line 7883
- `getRoomViewPreset` — line 7888
- `beginTravelPath` — line 8079
- `travelToRoomView` — line 8161
- `updateTravelWorkflow` — line 8169
- `updateCameraTravel` — line 8190
- `updateVaultAesthetics` — line 8243

### Named config tables
- None of the enumerated tables; the room-view preset const in the 8079-8267 range moves here per the const rule.

## linac-delivery.js — 140 functions

Clinical delivery + case workflow (fields/special setups/SRS/motion/OIS/adaptive/bolus/immobilization,
delivery lifecycle, patient pose, case loading, delivery-only parse helpers).

- `fmtSignedInt` — line 4096
- `normalizeAngleValue` — line 4101
- `parseFirstNumber` — line 4106
- `parseJawPair` — line 4110
- `parseJawSpec` — line 4114
- `parseCouchTriplet` — line 4126
- `canonicalCouchDisplay` — line 4134
- `getPlannedCouchState` — line 4139
- `getIGRTExpectedAbsoluteCouch` — line 4145
- `couchStateMatchesPlan` — line 4153
- `treatmentParamMatches` — line 4158 (plan-vs-actual comparison; imported by scene.js monitor and linac-safety.js checks)
- `getTreatmentFields` — line 4340
- `deliveryCasePlan` — line 4346
- `isDynamicTreatmentField` — line 4353
- `deliveryProgressFraction` — line 4354
- `arcAngularState` — line 4359
- `getDynamicFieldState` — line 4367
- `getCurrentPlannedParameters` — line 4390
- `applyDynamicDeliveryMachineState` — line 4403
- `populateDeliveryFieldSelect` — line 4419
- `activeSpecialSetupSpec` — line 4443
- `specialSetupRequired` — line 4444
- `specialSetupVerified` — line 4445
- `specialRndNonzero` — line 4446
- `resetSpecialSetupForCase` — line 4447
- `specialMatchStatus` — line 4453
- `breastMatchDiagram` — line 4454
- `csiDiagram` — line 4458
- `electronDiagram` — line 4462
- `renderSpecialSetupPanel` — line 4467
- `syncSpecialCheckboxes` — line 4493
- `handleSpecialSetupAction` — line 4499
- `activeSRSConfig` — line 4531
- `srsRequired` — line 4532
- `cranialSRSRequired` — line 4533
- `sbrtRequired` — line 4534
- `stereotacticCaseLabel` — line 4535
- `activeIGRTTolerances` — line 4536 (SRS tolerance table, part of the SRS cluster, not linac-igrt)
- `resetSRSWorkflowForCase` — line 4537
- `srsCurrentFieldGeometryOK` — line 4543
- `srsChecklistData` — line 4544
- `renderSRSPanel` — line 4559
- `recheckSRSClearance` — line 4580
- `runSRSDryRun` — line 4593 (async)
- `verifySRSTimeout` — line 4647
- `activeMotionSpec` — line 4655
- `motionRequired` — line 4656
- `configureMotionPatientVisuals` — line 4657
- `resetMotionManagementForCase` — line 4673
- `respiratoryValueFromPhase` — line 4683
- `motionConditionOpen` — line 4684
- `currentMotionGateOpen` — line 4689
- `motion4DPhaseData` — line 4690
- `acquireMotionCharacterization` — line 4691
- `verifyMotionManagement` — line 4699
- `startDIBHHold` — line 4708
- `releaseDIBHHold` — line 4709
- `drawMotionWave` — line 4710
- `renderMotionPanel` — line 4715
- `updateMotionAnimation` — line 4723
- `oisSessionKey` — line 4731
- `readOISStore` — line 4732
- `writeOISStore` — line 4733
- `oisClock` — line 4734
- `loadOISSession` — line 4735
- `persistOISSession` — line 4743
- `oisLogEvent` — line 4744
- `buildOISSnapshot` — line 4749
- `fmtOISShift` — line 4761
- `renderOISPanel` — line 4762
- `signOffOISRecord` — line 4777
- `adaptiveSpec` — line 4779
- `adaptiveRequired` — line 4780
- `adaptiveCourseKey` — line 4781
- `adaptiveFractionNumber` — line 4782
- `adaptivePlanRank` — line 4783
- `adaptiveScenarioIndex` — line 4784
- `adaptivePredictedMetrics` — line 4785
- `loadAdaptiveCourse` — line 4799
- `persistAdaptiveCourse` — line 4808
- `accumulatedAdaptiveMetrics` — line 4809
- `drawAdaptiveDoseChart` — line 4813
- `renderAdaptiveCourse` — line 4820
- `applyAdaptivePlan` — line 4825
- `chooseNewAdaptiveScenario` — line 4829
- `resetAdaptiveWorkflowForCase` — line 4830
- `verifyAdaptivePlan` — line 4834
- `recordAdaptiveFractionDose` — line 4837
- `advanceAdaptiveFraction` — line 4840
- `resetAdaptiveCourseHistory` — line 4843
- `renderAdaptivePanel` — line 4846
- `activeElectronBolusSpec` — line 4856
- `electronBolusDeliveryRequired` — line 4861
- `electronBolusDeliveryOK` — line 4862
- `electronBolusShapeClass` — line 4867
- `renderElectronBolusDeliveryTask` — line 4871
- `wireElectronBolusDeliveryDrag` — line 4910
- `immoMeta` — line 4986
- `immobilizationSpec` — line 4988
- `immobilizationRequired` — line 4989
- `immobilizationVerified` — line 4990
- `shuffleImmo` — line 4991
- `resetImmobilizationWorkflowForCase` — line 4992
- `immobilizationDeviceSVG` — line 4998
- `renderImmobilizationPanel` — line 5018
- `wireImmobilizationVerificationChecks` — line 5049
- `wireImmobilizationDragDrop` — line 5054
- `addImmobilizationDevice` — line 5055
- `removeImmobilizationDevice` — line 5056
- `verifyImmobilizationSelection` — line 5057
- `clearImmobilizationSelection` — line 5075
- `createImmobilizationShelf3D` — line 5076 (immobilization-workflow geometry; kept with its Immobilization* cluster, not scene.js)
- `createImmobilizationPatientGroup` — line 5102
- `updateImmobilizationPatientVisuals` — line 5103
- `deliveredTreatmentMU` — line 5239
- `expectedTechnicalTreatmentCode` — line 5242
- `expectedTechnicalIGRTHandling` — line 5243
- `resetTreatmentDeliveryForCase` — line 5405
- `renderTreatmentDeliveryPanel` — line 5415
- `armTreatmentDelivery` — line 5477
- `holdTreatmentDelivery` — line 5482
- `resumeTreatmentDelivery` — line 5486
- `finishTreatmentDelivery` — line 5492
- `deliveryTick` — line 5501
- `startTreatmentDelivery` — line 5534
- `terminateTreatmentDelivery` — line 5540
- `getODIMeasurement` — line 6439
- `setBeamWidth` — line 6475
- `setReceptorSID` — line 6478
- `applyImmobilizationRules` — line 6945
- `populateTreatmentCaseSelect` — line 7122
- `loadTreatmentCase` — line 7132
- `isFixedElectronField` — line 7214 (field-mode predicate, sibling of isDynamicTreatmentField; imported by linac-safety.js trajectory clearance)
- `setPatientPosition` — line 7666
- `applyCasePatientPose` — line 7671
- `currentSpecialFieldTarget` — line 7696
- `updateSpecialAnatomyTargetMarker` — line 7712
- `updateElectronBolusMesh` — line 7718
- `runPatientSetup` — line 7735
- `setImagingError6DOF` — line 7754 (applies 6DOF setup error to the patient error group; part of the patient-pose cluster)

### Named config tables
- `PATIENT_POSITIONS` (+ `PATIENT_POS_NAMES`, same line) — line 6487
- `PATIENT_ROT` — line 6488
- `IMAGING_SITES` — line 6490 (consumers: loadTreatmentCase 7137, advanceAdaptiveFraction 4841, tail IIFE 9639)
- `SETUP_REFINEMENTS` — line 6978
- Also per the const rule: `OIS_STORE_KEY`, `IMMOBILIZATION_DEVICE_META`/`IMMOBILIZATION_DEVICE_IDS`, and the treatment-case data consts in the 4300-7160 range move here.

## linac-igrt.js — 17 functions

The clinicalIGRT* cluster (~7157-7660).

- `clinicalIGRTModeForCase` — line 7157
- `igrtHardwareReady` — line 7161
- `fmtIGRT` — line 7164
- `getIGRTApplied` — line 7169
- `getIGRTResidual` — line 7180
- `setClinicalIGRTError` — line 7185
- `randomIGRTError` — line 7298
- `correctionFromIGRTError` — line 7310
- `quietIGRTStep` — line 7317
- `isIGRTCorrectionAttainable` — line 7330
- `generateAttainableIGRTSetup` — line 7365
- `igrtAnatomyBody` — line 7391
- `renderClinicalIGRT` — line 7479
- `startClinicalIGRT` — line 7551
- `acquireClinicalIGRT` — line 7591
- `verifyClinicalIGRT` — line 7601
- `resetClinicalIGRTForCase` — line 7638

Note: the top-level global assignments `window.clinicalIGRTActive` (3592) and
`window.clinicalIGRTCouchShift = function(...)` (7632) are executable statements, not declarations —
they move to this module's init side-effects (or are re-exposed from main.js bootstrap).

### Named config tables
- None of the enumerated tables; IGRT tolerance/site consts inside 7157-7660 move here per the const rule.

## linac-safety.js — 42 functions

Clearance/readiness gating, trajectory clearance, collision system, jaw state, pendant LCD/BEV.

- `clearanceOverrideRecord` — line 5112
- `clearanceOverrideActive` — line 5113
- `clearanceOverrideUsedAny` — line 5114
- `igrtAlignmentReadyForDelivery` — line 5115 (readiness-gate predicate within the clearance cluster)
- `rawClearanceStatus` — line 5116
- `renderClearanceOverrideCard` — line 5126
- `applyClearanceOverride` — line 5144
- `withdrawClearanceOverride` — line 5168
- `deliveryGeometryChecks` — line 5177
- `getDeliveryReadiness` — line 5184
- `allTreatmentFieldsCompleted` — line 5235
- `treatmentTrajectorySamples` — line 7218 (feeds evaluateTreatmentTrajectoryClearance)
- `evaluateTreatmentTrajectoryClearance` — line 7231 (uses captureCollisionPose/getCollisionAssessment)
- `currentSelectedFieldClearance` — line 7257
- `prepareTreatmentClearanceBaseline` — line 7262
- `removeTreatmentClearancePlacement` — line 7288
- `ensureJawState` — line 8590
- `jawDimensions` — line 8593
- `jawsAreCentered` — line 8597
- `currentJawSpecString` — line 8601
- `currentJawSummary` — line 8605
- `syncLegacyJawValue` — line 8609
- `setCenteredJawField` — line 8610
- `nudgeJawEdge` — line 8615
- `setPendantLCD` — line 8625
- `updateBEVInset` — line 8630
- `syncFundamentalReadouts` — line 8744
- `captureCollisionPose` — line 8778
- `restoreCollisionPose` — line 8787
- `getCouchClearanceBox` — line 8798
- `getCouchClearanceVolumes` — line 8806
- `clearanceToProxy` — line 8824
- `getCollisionAssessment` — line 8839
- `detectCouchGantryCollision` — line 8887
- `setSafetyHUD` — line 8891
- `showCollisionBlocked` — line 8898
- `attemptCollisionSafeMotion` — line 8904
- `setPendantMotionArmed` — line 8930
- `requirePendantMotion` — line 8939
- `captureMechanicalGeometryState` — line 8949
- `restoreMechanicalGeometryState` — line 8962
- `runFunctionKeyIsolated` — line 8974

### Named config tables
- `ROTATION_STEP` (+ `MOVEMENT_STEP`, same line) — line 8586
- `fundamentalState` — line 8588 (primary writers: jaw cluster, safeTilt/imgCouch, runFunctionKeyIsolated)
- `ROT_DEG` (+ `ROT_RAD`, same line) — line 9042
- Also per the const rule: `TREATMENT_CLEARANCE_REQUIRED_MARGIN` / `ELECTRON_FIXED_CLEARANCE_REQUIRED_MARGIN` and the const arrows `imgCouch` (9006), `couchTilt` (9043), `safeTilt` (9044) move here.

## sdk.js — 9 functions

Treatment completion + charge capture; both `recordResult('sim-linac-fraction')` sites (5352, 5403)
live inside this cluster.

- `resetTreatmentCompletion` — line 5251
- `renderTreatmentCompletionControls` — line 5260
- `updateChargeEducation` — line 5287
- `renderChargeCapturePanel` — line 5325
- `completeFractionWithoutCurrentCPTModule` — line 5345
- `openChargeCapture` — line 5354
- `verifyChargeCapture` — line 5359
- `persistChargeRecord` — line 5388
- `postChargeAndCompleteFraction` — line 5392

### Named config tables
- `CPT_EDU` — line 5279
- `HUB_URL` — line 3278: NOT a const — it is top-level `let` #1 and therefore becomes `S.HUB_URL` in state.js; the `window.RTApps.activityUrl('sim-hub-qa')` bootstrap that writes it (3277-3283) stays with main.js bootstrap, and sdk.js is its conceptual consumer.
- `CT_CASES` — line 10463: NOT in the main module script — it belongs to the separate classic `rtappsCTQueueWorkspace` script (10458-10605), which is outside this split's 315/323/59 census and is left in index.html untouched.

## game.js — 16 functions

Arcade meta-layer: tabs, quiz, store, save/load.

- `openTab` — line 8304
- `updateBalanceDisplay` — line 8314
- `checkAllCorePartsEarned` — line 8316
- `populateTaskSelect` — line 8328
- `renderQuiz` — line 8347
- `displayQuiz` — line 8363
- `displayBonusChallenge` — line 8371
- `handleSubmitAnswer` — line 8382
- `showMessage` — line 8412
- `populateEnhancementStore` — line 8419
- `purchaseEnhancement` — line 8481
- `enableMovementControl` — line 8497
- `saveGameState` — line 8523
- `loadGameState` — line 8530
- `resetGame` — line 8560
- `updateUI` — line 8578

### Named config tables
- `CORE_PART_IDS` — line 3699 (derived from `linacPartsData`, which lives in scene.js)
- `BONUS_REWARD` — line 3714
- `BONUS_QUESTIONS` — line 3715
- Also per the const rule: enhancement-store and quiz-scenario const tables in the 3699-3730 and 8300-8580 ranges move here.

## main.js — 9 functions

Render loop, console docking, bootstrap. Also retains (not functions): the bootstrap executable
statements (3277-3283 sdk bootstrap, 3286, 4712, 5900, 8312, 9142-9274 init calls and listeners),
the four tail IIFEs (9277-9549, 9553-9582, 9585-9611, 9614-9940), the
`window.RTAppsLinacMirrorBridge = {...}` assignment (9946-9978), and the cross-cutting const utils
`wrap360` (8623) / `setTextById` (8624). The two classic scripts (`rtappsV2ConsolePatch`
9989-10432, `rtappsCTQueueWorkspace` 10458-10605) stay in index.html unchanged.

- `setConsoleMotionArmed` — line 7903 (console-side arming toggle, wired at 9086)
- `openWorkflowPanelFromConsole` — line 7912
- `setStatusChip` — line 7920
- `ensureConsoleDockSlot` — line 7936
- `dockConsoleWorkflowPanels` — line 7944
- `undockConsoleWorkflowPanels` — line 7954
- `refreshConsoleDockState` — line 7964
- `syncOperatorConsole` — line 7990
- `animate` — line 8267

### Named config tables
- `CONSOLE_DOCK_PANEL_IDS` — line 7931 (plus its 4 adjacent dock-slot element consts)

## Completeness check

| module | functions |
|---|---|
| dom.js | 0 |
| state.js | 0 |
| scene.js | 72 |
| cctv.js | 3 |
| travel.js | 7 |
| linac-delivery.js | 140 |
| linac-igrt.js | 17 |
| linac-safety.js | 42 |
| sdk.js | 9 |
| game.js | 16 |
| main.js | 9 |
| **total** | **315** |

72 + 3 + 7 + 140 + 17 + 42 + 9 + 16 + 9 = 315 = the full top-level function census of the main
module script (functions_real.txt @ b7140af). Every function appears in exactly one section; the
59 `let` statements are all accounted for in state.js; the 21 named const tables (plus HUB_URL and
CT_CASES, documented as non-consts above) are each assigned; all remaining consts follow the const
placement rule at the top of this appendix.

## Corrections (Task 4 review, 2026-09-17)

- `igrtViewSVG` (b7140af line 7441) was omitted from the original 315-function census — true total is 316. It belongs to **linac-igrt.js** (IGRT rendering cluster). Task 5 must move it with that group.
- Verified circular import edges after Task 4 (all function-body-only, eval-safe): `main.js ↔ scene.js`, `main.js ↔ travel.js`, `scene.js ↔ cctv.js`. Later extractions should expect to preserve these.
