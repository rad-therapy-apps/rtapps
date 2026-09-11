// ===========================
// LINAC Console Emulator Logic (Three Monitor Layout, Beam On MLC Animation by Technique, Cleaned Up)
// ===========================

/* -----------------------------
   GLOBAL VARIABLES & CONSTANTS
------------------------------*/
// Energy and machine parameters
const energyOptions = ['6 MV', '10 MV', '15 MV', '18 MV', '6 MeV', '9 MeV', '12 MeV', '15 MeV', '18 MeV'];
let currentEnergyIndex = 0;
let selectedEnergy = energyOptions[0];

let isPrepared = false;
let isBeaming = false;
let isDoorOpen = true;
let deliveredMU = 0;
let setMU = 0;
let beamTimeoutId = null;
let gantryAngle = 0;
let collimatorAngle = 0;
let couchAngle = 0;
let jawX1 = 5.0, jawX2 = 5.0, jawY1 = 5.0, jawY2 = 5.0;
let fieldAdjustmentLocked = false;
let currentLoadedPlan = null;
let loadedFieldIndex = -1;
let overrideActive = false;
let audioBeam, audioMLC;
/* --- MLC/Field Visualizer --- */
const NUM_LEAF_PAIRS = 60; // More realistic
const fieldDisplayContainerSize = 320;
const maxJawDistance = 20.0;
const centerPx = fieldDisplayContainerSize / 2.0;
const scaleFactor = fieldDisplayContainerSize / (maxJawDistance * 2);
let leftLeafPositions = Array(NUM_LEAF_PAIRS).fill(jawX1);
let rightLeafPositions = Array(NUM_LEAF_PAIRS).fill(jawX2);
let rotatingContainerLeft = 0, rotatingContainerTop = 0;

/* --- Image alignment --- */
let overlayOffsetX = 0, overlayOffsetY = 0, initialOverlayShiftX = 0, initialOverlayShiftY = 0;
let overlayOpacity = 0.5, overlayRotationAngle = 0, overlayScale = 1.0;
const alignmentTolerance = 2;
let correctCaseAlignments = 0;
const defaultImageUrl = "https://via.placeholder.com/400x300.png?text=Load+Case";

/* --- EMR/Patient Data for Case Generation --- */
const msccImageUrls = [
  "https://dizziness-and-balance.com/disorders/central/images/cervical-MRI.jpg",
  "https://www.wikidoc.org/images/7/7e/CT_spine.gif.gif",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/CoalitionCervicalCageL.png/1200px-CoalitionCervicalCageL.png",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS2Y6OxtDNC-P5iSe_fThxG9YObCyAS6xheaHFOEaHcuud3ujFmQlo1d6UA2hLYL2auCYA&usqp=CAU",
  "https://mrimaster.com/wp-content/uploads/2023/11/T1-TSE-axial-image-shows-Metastatic-Spinal-Cord-Compression-1024x601.jpg.webp"
];
const svcsImageUrls = [
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRClKqn7zvFDw6GRWq18Gu-hLAvDW7FmzLlXg&s",
  "https://prod-images-static.radiopaedia.org/images/832357/d98d7c55811dc0fc35e02d6e218bf3_gallery.jpg",
  "https://ajronline.org/cms/10.2214/AJR.09.2894/asset/images/04_09_2894_03a.jpeg",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQlH2yihr02Vjyt1C2rkCyFE6dHp8HrtUfZssfNRkFftqNovHztGdNFTS1S43vmM4lvAlk&usqp=CAU",
  "https://www.jto.org/cms/10.1016/j.jtho.2019.09.010/asset/123a5f83-20e9-49fc-87d2-0a283220a360/main.assets/gr1_lrg.jpg"
];
const msccData = {
  patientType: "MSCC",
  primaries: ["Lung cancer", "Breast cancer", "Prostate cancer", "Kidney cancer", "Unknown primary"],
  prescriptions: [
    { text: "30 Gy / 10 fx", energy: "6 MV", muPerFx: 150, technique: "3DCRT", numFields: 1 },
    { text: "30 Gy / 10 fx", energy: "10 MV", muPerFx: 140, technique: "3DCRT", numFields: 1 },
    { text: "20 Gy / 5 fx", energy: "6 MV", muPerFx: 200, technique: "3DCRT", numFields: 1 },
    { text: "20 Gy / 5 fx", energy: "10 MV", muPerFx: 190, technique: "3DCRT", numFields: 1 },
    { text: "8 Gy / 1 fx", energy: "6 MV", muPerFx: 450, technique: "3DCRT", numFields: 1 }
  ],
  fieldSetups: [
    { name: "Post Spine", gantry: 0, coll: 0, couch: 0, xSizeRange: [6, 10], ySizeRange: [15, 25] }
  ],
  imageUrls: msccImageUrls
};
const svcsData = {
  patientType: "SVCS",
  primaries: ["Small cell lung cancer", "Non-Hodgkin lymphoma", "Non-small cell lung cancer (NSCLC)", "Breast cancer"],
  prescriptions: [
    { text: "20 Gy / 5 fx AP/PA", energy: "6 MV", muPerFx: 110, technique: "3DCRT", numFields: 2 },
    { text: "3 Gy x 3 fx -> 1.8 Gy daily to 36 Gy", energy: "6 MV", muPerFx: 100, technique: "3DCRT", numFields: 2 },
    { text: "8 Gy / 1 fx AP/PA", energy: "6 MV", muPerFx: 450, technique: "3DCRT", numFields: 2 },
    { text: "30 Gy / 10 fx AP/PA", energy: "6 MV", muPerFx: 160, technique: "3DCRT", numFields: 2 },
    { text: "4 Gy x 2 fx -> 2 Gy daily to 40 Gy", energy: "6 MV", muPerFx: 110, technique: "3DCRT", numFields: 2 }
  ],
  fieldSetups: [
    { name: "AP Chest", gantry: 180, coll: 0, couch: 0, xSizeRange: [8, 15], ySizeRange: [10, 20] },
    { name: "PA Chest", gantry: 0, coll: 0, couch: 0, xSizeRange: [8, 15], ySizeRange: [10, 20] }
  ],
  imageUrls: svcsImageUrls
};

/* -----------------------------
   UTILITY FUNCTIONS
------------------------------*/
function getRandomInt(min, max) {
  min = Math.ceil(min); max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getRandomFloat(min, max, decimals) {
  const factor = Math.pow(10, decimals);
  const value = Math.random() * (max - min) + min;
  return Math.round(value * factor) / factor;
}
function getRandomElement(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[getRandomInt(0, arr.length - 1)];
}
function roundToDecimalPlace(num, places) { const factor = 10 ** places; return Math.round(num * factor) / factor; }
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

/* -----------------------------
   DOM REFERENCES
------------------------------*/
let treatmentTabContent, baseImageElement, overlayImageElement, alignmentMessage, shiftFeedback, alignmentCounterDisplay, statusBar;
let generateCaseBtn, energyToggleButton, btnSetMU, btnPrepare, btnBeamOn, btnBeamOff, btnReset, btnDoorControl, btnOverride, btnConesize;
let currentEnergyDisplay, collimatorDisplay, collimatorDisplay2;
let fieldDisplayContainer, rotatingElementsContainer, fieldRectEl, drrImageSelect;
let presetMatchJawBtn, presetSquareBtn, presetOffsetBtn, presetBlockBtn, presetCshapeBtn, presetDiagonalBtn, presetDiagRevBtn, presetDiagShallowBtn;
let animateSquareRandBtn, animateOffsetRandBtn, animateDiagonalRandBtn, slidingWindowBtn, imrtDemoBtn, presetMultiBlockBtn;
let collRotateNegBtn, collRotatePosBtn;
let opacitySlider, rotationDisplay, scaleDisplay, opacityValue, couchShiftX, couchShiftY, couchRotation, couchZoom;

function wireDomReferences() {
  treatmentTabContent = document.getElementById('treatment');
  baseImageElement = document.getElementById('baseImage');
  overlayImageElement = document.getElementById('overlayImage');
  alignmentMessage = document.getElementById('alignmentMessage');
  shiftFeedback = document.getElementById('shiftFeedback');
  alignmentCounterDisplay = document.getElementById('alignmentCounterDisplay');
  statusBar = document.getElementById('local-status-bar');

  generateCaseBtn = document.getElementById('generateCaseBtn');
  energyToggleButton = document.getElementById('energyToggleButton');
  btnSetMU = document.getElementById('btn-set-mu');
  btnPrepare = document.getElementById('btn-prepare');
  btnBeamOn = document.getElementById('btn-beam-on');
  btnBeamOff = document.getElementById('btn-beam-off');
  btnReset = document.getElementById('btn-reset');
  btnDoorControl = document.getElementById('btn-door-control');
  btnOverride = document.getElementById('btn-override');
  btnConesize = document.getElementById('btn-conesize');

  currentEnergyDisplay = document.getElementById('currentEnergyDisplay');
  collimatorDisplay = document.getElementById('collimatorDisplay');
  collimatorDisplay2 = document.getElementById('collimatorDisplay2');
  drrImageSelect = document.getElementById('drrImageSelect');

  fieldDisplayContainer = document.getElementById('fieldDisplayContainer');
  rotatingElementsContainer = document.getElementById('rotatingElementsContainer');
  fieldRectEl = document.getElementById('fieldDisplayRect');

  presetMatchJawBtn = document.getElementById('presetMatchJaw');
  presetSquareBtn = document.getElementById('presetSquare');
  presetOffsetBtn = document.getElementById('presetOffset');
  presetBlockBtn = document.getElementById('presetBlock');
  presetCshapeBtn = document.getElementById('presetCshape');
  presetDiagonalBtn = document.getElementById('presetDiagonal');
  presetDiagRevBtn = document.getElementById('presetDiagRev');
  presetDiagShallowBtn = document.getElementById('presetDiagShallow');
  animateSquareRandBtn = document.getElementById('animateSquareRandBtn');
  animateOffsetRandBtn = document.getElementById('animateOffsetRandBtn');
  animateDiagonalRandBtn = document.getElementById('animateDiagonalRandBtn');
  slidingWindowBtn = document.getElementById('slidingWindowBtn');
  imrtDemoBtn = document.getElementById('imrtDemoBtn');
  presetMultiBlockBtn = document.getElementById('presetMultiBlock');
  collRotateNegBtn = document.getElementById('collRotateNegBtn');
  collRotatePosBtn = document.getElementById('collRotatePosBtn');

  opacitySlider = document.getElementById('opacitySlider');
  rotationDisplay = document.getElementById('rotationDisplay');
  scaleDisplay = document.getElementById('scaleDisplay');
  opacityValue = document.getElementById('opacityValue');
  couchShiftX = document.getElementById('couchShiftX');
  couchShiftY = document.getElementById('couchShiftY');
  couchRotation = document.getElementById('couchRotation');
  couchZoom = document.getElementById('couchZoom');
   
  audioBeam = document.getElementById('audio-beam');
  audioMLC = document.getElementById('audio-mlc');
}

/* -----------------------------
   EMR Tabs & Patient Case Generation
------------------------------*/
function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  const content = document.getElementById(tabId);
  const button = document.querySelector(`.tab-button[onclick="showTab('${tabId}')"]`);
  if(content) content.classList.add('active');
  if(button) button.classList.add('active');
}

function generateAndDisplayPatientCase() {
  const plan = generateRandomTreatmentPlan();
  displayTreatmentPlan(plan);
}

function generateRandomTreatmentPlan() {
  const caseTypeData = Math.random() < 0.5 ? msccData : svcsData;
  const randomPrimary = getRandomElement(caseTypeData.primaries);
  const randomRx = getRandomElement(caseTypeData.prescriptions);
  const planEnergy = randomRx.energy;
  const planTechnique = randomRx.technique;
  const alignmentImgUrl = getRandomElement(caseTypeData.imageUrls);

  let planFields = [];
  const numFields = randomRx.numFields || 1;
  const fieldSetupTemplates = caseTypeData.fieldSetups;
  for (let i = 0; i < numFields; i++) {
    const setupTemplate = fieldSetupTemplates[i % fieldSetupTemplates.length];
    const xSize = getRandomFloat(setupTemplate.xSizeRange[0], setupTemplate.xSizeRange[1], 1);
    const ySize = getRandomFloat(setupTemplate.ySizeRange[0], setupTemplate.ySizeRange[1], 1);
    const muPerField = Math.round((randomRx.muPerFx / numFields) * getRandomFloat(0.95, 1.05, 2));
    planFields.push({
      name: setupTemplate.name || `Field ${i+1}`, mu: muPerField,
      gantry: setupTemplate.gantry, collimator: setupTemplate.coll, couch: setupTemplate.couch,
      x1: xSize/2, x2: xSize/2, y1: ySize/2, y2: ySize/2,
      energy: planEnergy, technique: planTechnique
    });
  }
  const firstNames = ["John", "Jane", "Alex", "Sarah", "Michael", "Emily", "David", "Linda", "Robert", "Maria"];
  const lastNames = ["Smith", "Doe", "Jones", "Chen", "Williams", "Brown", "Davis", "Miller", "Wilson", "Garcia"];
  const randomName = getRandomElement(firstNames) + " " + getRandomElement(lastNames);
  const randomDOB = `${getRandomInt(1, 12)}/${getRandomInt(1, 28)}/${getRandomInt(1940, 1985)}`;
  const diagnosisText = `${caseTypeData.patientType} - ${randomPrimary}`;
  const randomCreat = getRandomFloat(0.6, 1.5, 1);
  const randomWBC = getRandomFloat(3.0, 11.0, 1);

  return {
    patientName: randomName, patientDOB: randomDOB, patientDiagnosis: diagnosisText,
    patientType: caseTypeData.patientType, prescriptionText: randomRx.text,
    technique: planTechnique, energy: planEnergy, fields: planFields,
    labCreat: randomCreat, labWBC: randomWBC,
    alignmentImageUrl: alignmentImgUrl
  };
}

function displayTreatmentPlan(plan) {
  currentLoadedPlan = plan;
  loadedFieldIndex = -1;
  document.getElementById('patientName').textContent = plan.patientName;
  document.getElementById('patientDOB').textContent = plan.patientDOB;
  document.getElementById('patientDiagnosis').textContent = plan.patientDiagnosis;
  document.getElementById('patientType').textContent = plan.patientType;
  document.getElementById('labCreat').textContent = plan.labCreat + " mg/dL";
  document.getElementById('labWBC').textContent = plan.labWBC + " K/uL";
  const imageUrl = plan.alignmentImageUrl || defaultImageUrl;
  if (baseImageElement) baseImageElement.src = imageUrl;
  if (overlayImageElement) overlayImageElement.src = imageUrl;

  initialOverlayShiftX = getRandomInt(-20, 20);
  initialOverlayShiftY = getRandomInt(-20, 20);
  overlayOffsetX = initialOverlayShiftX; overlayOffsetY = initialOverlayShiftY;
  if (overlayImageElement) overlayImageElement.style.transform = `translate(${overlayOffsetX}px, ${overlayOffsetY}px)`;
  if (alignmentMessage) alignmentMessage.textContent = "Adjust overlay using arrow keys.";
  if (shiftFeedback) shiftFeedback.textContent = "";

  // Update Treatment Tab with clickable fields
  let html = `<h4>Plan Details</h4>
    <p><strong>Prescription:</strong> ${plan.prescriptionText}</p>
    <p><strong>Technique:</strong> ${plan.technique}</p>
    <p><strong>Nominal Energy:</strong> ${plan.energy}</p>
    <h4>Fields (Click to Load)</h4>`;
  plan.fields.forEach((field, index) => {
    const fieldSizeDisplay = `${(field.x1 + field.x2).toFixed(1)} x ${(field.y1 + field.y2).toFixed(1)}`;
    html += `<div class="treatment-field" onclick="loadFieldToConsole(${index})">
      <h5>${field.name}</h5>
      <p>Energy: ${field.energy} | MU: ${field.mu}</p>
      <p>Gantry: ${field.gantry}° | Coll: ${field.collimator}° | Couch: ${field.couch}°</p>
      <p>Field Size (X x Y): ${fieldSizeDisplay} cm</p>
    </div>`;
  });
  treatmentTabContent.innerHTML = html;
  showTab('treatment');
  partialResetConsoleForNewPlan();
  updateConsoleDisplay();
  updateStatusBar();
  updateCaseAlignmentCounterDisplay();
}

function updateCaseAlignmentCounterDisplay() {
  if (alignmentCounterDisplay) {
    alignmentCounterDisplay.textContent = `Correct Case Alignments: ${correctCaseAlignments}`;
  }
}

window.loadFieldToConsole = loadFieldToConsole;
function loadFieldToConsole(fieldIndex) {
  if (!currentLoadedPlan || !currentLoadedPlan.fields[fieldIndex]) return;
  if (isBeaming) {
    alert("Cannot load new field while beam is active!");
    return;
  }
  const field = currentLoadedPlan.fields[fieldIndex];
  loadedFieldIndex = fieldIndex;
  const energyIndex = energyOptions.findIndex(e => e === field.energy);
  if (energyIndex !== -1) {
    currentEnergyIndex = energyIndex; selectedEnergy = field.energy;
  } else {
    currentEnergyIndex = energyOptions.findIndex(e => e === '6 MV');
    selectedEnergy = currentEnergyIndex !== -1 ? '6 MV' : "---";
  }
  currentEnergyDisplay.textContent = selectedEnergy;
  document.getElementById('mp-energy').textContent = selectedEnergy;
  setMU = field.mu; deliveredMU = 0;
  gantryAngle = field.gantry; collimatorAngle = field.collimator; couchAngle = field.couch;
  jawX1 = field.x1; jawX2 = field.x2; jawY1 = field.y1; jawY2 = field.y2;
  updateControlPanelDisplays(); updateMachineParameterDisplays();
  isPrepared = false; isBeaming = false;
  if(beamTimeoutId) clearInterval(beamTimeoutId); beamTimeoutId = null;
  enableParameterSettingButtons(true); updateConsoleDisplay();
  document.querySelectorAll('.treatment-field').forEach((el, idx) => {
    el.style.border = idx === fieldIndex ? '2px solid #003366' : '1px solid #ddd';
  });
  updateStatusBar();
}

/* -----------------------------
   MACHINE PARAMETER & DISPLAY LOGIC
------------------------------*/
function updateMachineParameterDisplays() {
  document.getElementById('mp-energy').textContent = selectedEnergy || '---';
  document.getElementById('mp-collimator').textContent = collimatorAngle + '°';
  document.getElementById('mp-gantry').textContent = gantryAngle + '°';
  document.getElementById('mp-couch').textContent = couchAngle + '°';
  document.getElementById('jawX1').textContent = jawX1.toFixed(1);
  document.getElementById('jawX2').textContent = jawX2.toFixed(1);
  document.getElementById('jawY1').textContent = jawY1.toFixed(1);
  document.getElementById('jawY2').textContent = jawY2.toFixed(1);
}

function updateControlPanelDisplays() {
  currentEnergyDisplay.textContent = selectedEnergy || '---';
  collimatorDisplay.textContent = collimatorAngle + '°';
  collimatorDisplay2.textContent = collimatorAngle + '°';
  document.getElementById('control-jawX1').textContent = jawX1.toFixed(1);
  document.getElementById('control-jawX2').textContent = jawX2.toFixed(1);
  document.getElementById('control-jawY1').textContent = jawY1.toFixed(1);
  document.getElementById('control-jawY2').textContent = jawY2.toFixed(1);
}

function updateConsoleDisplay() {
  const energyStr = selectedEnergy || "---";
  const muStr = setMU.toString().padStart(3, '0');
  const deliveredMuStr = deliveredMU.toString().padStart(3, '0');
  const fieldStr = `${(jawX1 + jawX2).toFixed(1)}x${(jawY1 + jawY2).toFixed(1)}`;
  document.getElementById('console-parameters').textContent = `Energy: ${energyStr} | MU: ${muStr} | Field: ${fieldStr}`;
  const consoleStatus = document.getElementById('console-status');
  let statusMsg = "Status: Idle";
  if (isBeaming) statusMsg = "Status: Beam On Active";
  else if (isPrepared) statusMsg = "Status: Prepared";
  else if (fieldAdjustmentLocked) statusMsg = "Status: Field Locked (Electron)";
  if (consoleStatus) {
    if (statusMsg.includes("INTERLOCK") || statusMsg.includes("FAIL")) {
      consoleStatus.classList.add('interlock');
    } else {
      consoleStatus.classList.remove('interlock');
    }
    consoleStatus.textContent = statusMsg;
  }
  document.getElementById('console-reading').textContent = `Delivered MU: ${deliveredMuStr} | Dose Rate: ${isBeaming ? "Active" : "---"}`;
  updateStatusBar();
}

function updateStatusBar() {
  let statusText = "";
  let fieldName = (currentLoadedPlan && loadedFieldIndex !== -1 && currentLoadedPlan.fields && currentLoadedPlan.fields[loadedFieldIndex])
    ? currentLoadedPlan.fields[loadedFieldIndex].name : "Field ?";
  if (isDoorOpen) statusText = "INTERLOCK: Door Open";
  else if (isBeaming) statusText = `Beam Active - Delivering ${setMU} MU - ${fieldName}`;
  else if (isPrepared) statusText = `Prepared - ${fieldName} - ${setMU} MU`;
  else if (loadedFieldIndex !== -1) statusText = `${fieldName} loaded. Adjust parameters or Prepare.`;
  else if (currentLoadedPlan) statusText = `${currentLoadedPlan.patientType} Case "${currentLoadedPlan.patientName}" generated. Select a field to load.`;
  else statusText = "Emulator Ready. Generate a patient case or set parameters manually.";
  if (statusBar) statusBar.textContent = statusText;
  if (statusBar) statusBar.style.backgroundColor = isDoorOpen ? "#dc3545" : "#003366";
}

function enableParameterSettingButtons(enable) {
  btnPrepare.classList.toggle('disabled', !enable);
  btnSetMU.classList.toggle('disabled', !enable);
  btnConesize.classList.toggle('disabled', !enable);
}

/* -----------------------------
   ENERGY, MU, PREPARE, BEAM CONTROLS
------------------------------*/
function cycleEnergy() {
  if (isBeaming || fieldAdjustmentLocked) return;
  currentEnergyIndex = (currentEnergyIndex + 1) % energyOptions.length;
  selectedEnergy = energyOptions[currentEnergyIndex];
  updateControlPanelDisplays();
  updateMachineParameterDisplays();
  updateConsoleDisplay();
}

function setMuClicked() {
  if (isBeaming || fieldAdjustmentLocked) return;
  let mu = prompt("Enter prescribed MU (Monitor Units) for this field:", setMU || 0);
  if (mu !== null && !isNaN(parseInt(mu))) {
    setMU = Math.max(0, parseInt(mu));
    updateConsoleDisplay();
  }
}

/* -----------------------------
   FIELD/MLC VISUALIZER: Presets and Animations
------------------------------*/
function getActualCoords() {
  const actual_x1 = -jawX1, actual_x2 = jawX2, actual_y1 = -jawY1, actual_y2 = jawY2;
  return { actual_x1, actual_x2, actual_y1, actual_y2 };
}

function getFieldDimensionsPx() {
  const { actual_x1, actual_x2, actual_y1, actual_y2 } = getActualCoords();
  const leftPx = centerPx + (actual_x1 * scaleFactor);
  const rightPx = centerPx + (actual_x2 * scaleFactor);
  const topPx = centerPx - (actual_y2 * scaleFactor);
  const bottomPx = centerPx - (actual_y1 * scaleFactor);
  const widthPx = Math.max(0, rightPx - leftPx);
  const heightPx = Math.max(0, bottomPx - topPx);
  return { leftPx, topPx, widthPx, heightPx };
}

function updateOuterVisualsAndContainers() {
  document.getElementById('control-jawX1').textContent = jawX1.toFixed(1);
  document.getElementById('control-jawX2').textContent = jawX2.toFixed(1);
  document.getElementById('control-jawY1').textContent = jawY1.toFixed(1);
  document.getElementById('control-jawY2').textContent = jawY2.toFixed(1);
  const { actual_x1, actual_x2, actual_y1, actual_y2 } = getActualCoords();
  document.getElementById('totalFieldX').textContent = (actual_x2 - actual_x1).toFixed(1);
  document.getElementById('totalFieldY').textContent = (actual_y2 - actual_y1).toFixed(1);
  collimatorDisplay.textContent = `${collimatorAngle}°`;
  collimatorDisplay2.textContent = `${collimatorAngle}°`;
  const dims = getFieldDimensionsPx();
  fieldRectEl.style.width = `${dims.widthPx}px`;
  fieldRectEl.style.height = `${dims.heightPx}px`;
  fieldRectEl.style.left = `${dims.leftPx}px`;
  fieldRectEl.style.top = `${dims.topPx}px`;
  const leafPairHeight = (NUM_LEAF_PAIRS > 0 && dims.heightPx >= 0) ? (dims.heightPx / NUM_LEAF_PAIRS) : 0;
  for (let i = 0; i < NUM_LEAF_PAIRS; i++) {
    const outerLeftEl = document.getElementById(`outerLeftLeaf_${i}`);
    const outerRightEl = document.getElementById(`outerRightLeaf_${i}`);
    const pairContainerEl = document.getElementById(`leafPairContainer_${i}`);
    if (!outerLeftEl || !outerRightEl || !pairContainerEl) continue;
    const pairTop = dims.topPx + (i * leafPairHeight);
    pairContainerEl.style.top = `${pairTop}px`;
    pairContainerEl.style.height = `${leafPairHeight}px`;
    outerLeftEl.style.left = '0px';
    outerLeftEl.style.width = `${Math.max(0, dims.leftPx)}px`;
    const fieldRightEdgePx = dims.leftPx + dims.widthPx;
    outerRightEl.style.left = `${fieldRightEdgePx}px`;
    outerRightEl.style.width = `${Math.max(0, fieldDisplayContainerSize - fieldRightEdgePx)}px`;
  }
  rotatingElementsContainer.style.transform = `rotate(${collimatorAngle}deg) translate(${rotatingContainerLeft}px, ${rotatingContainerTop}px)`;
}

function updateInnerLeafVisuals(currentLeft, currentRight, disableTransitions = false) {
  const dims = getFieldDimensionsPx();
  if (scaleFactor <= 0 || fieldDisplayContainerSize <= 0 || dims.widthPx < 0 || dims.heightPx < 0) { return; }
  const leafPairHeight = (NUM_LEAF_PAIRS > 0 && dims.heightPx >= 0) ? (dims.heightPx / NUM_LEAF_PAIRS) : 0;
  for (let i = 0; i < NUM_LEAF_PAIRS; i++) {
    const innerLeftEl = document.getElementById(`innerLeftLeaf_${i}`);
    const innerRightEl = document.getElementById(`innerRightLeaf_${i}`);
    const pairContainerEl = document.getElementById(`leafPairContainer_${i}`);
    if (!innerLeftEl || !innerRightEl || !pairContainerEl) continue;
    const pairTop = dims.topPx + (i * leafPairHeight);
    pairContainerEl.style.top = `${pairTop}px`;
    pairContainerEl.style.height = `${leafPairHeight}px`;
    let clampedLeftDist = Math.min(jawX1, currentLeft[i] ?? jawX1);
    let clampedRightDist = Math.min(jawX2, currentRight[i] ?? jawX2);
    if (!disableTransitions) { leftLeafPositions[i] = clampedLeftDist; rightLeafPositions[i] = clampedRightDist; }
    const leftTipPx_relCenter = -(clampedLeftDist * scaleFactor);
    const rightTipPx_relCenter = (clampedRightDist * scaleFactor);
    const leftTipPx_abs = centerPx + leftTipPx_relCenter;
    const rightTipPx_abs = centerPx + rightTipPx_relCenter;
    innerLeftEl.style.left = `${dims.leftPx}px`;
    innerLeftEl.style.width = `${Math.max(0, leftTipPx_abs - dims.leftPx)}px`;
    const fieldRightEdgePx = dims.leftPx + dims.widthPx;
    innerRightEl.style.left = `${rightTipPx_abs}px`;
    innerRightEl.style.width = `${Math.max(0, fieldRightEdgePx - rightTipPx_abs)}px`;
    innerLeftEl.style.transition = disableTransitions ? 'none' : 'width 1s ease-in-out, left 1s ease-in-out';
    innerRightEl.style.transition = disableTransitions ? 'none' : 'width 1s ease-in-out, left 1s ease-in-out';
    innerLeftEl.classList.add('inner'); innerRightEl.classList.add('inner');
  }
}

function handleImageChange() {
  if (!drrImageSelect || !fieldDisplayContainer) return;
  const imageUrl = drrImageSelect.value;
  if (imageUrl) {
    fieldDisplayContainer.style.backgroundImage = `url('${imageUrl}')`;
    fieldDisplayContainer.style.backgroundColor = '#111';
  } else {
    fieldDisplayContainer.style.backgroundImage = 'none';
    fieldDisplayContainer.style.backgroundColor = '#111';
  }
}

function changeFieldSize(jawLabel, delta) {
  let controlDisplayId = 'control-jaw' + jawLabel;
  let currentValue = 0;
  const step = 0.5;
  delta = Math.sign(delta) * step;
  const minDistance = 0.1;
  switch(jawLabel) {
    case 'X1': jawX1 = clamp(roundToDecimalPlace(jawX1 + delta, 1), minDistance, maxJawDistance); currentValue = jawX1; break;
    case 'X2': jawX2 = clamp(roundToDecimalPlace(jawX2 + delta, 1), minDistance, maxJawDistance); currentValue = jawX2; break;
    case 'Y1': jawY1 = clamp(roundToDecimalPlace(jawY1 + delta, 1), minDistance, maxJawDistance); currentValue = jawY1; break;
    case 'Y2': jawY2 = clamp(roundToDecimalPlace(jawY2 + delta, 1), minDistance, maxJawDistance); currentValue = jawY2; break;
    default: return;
  }
  for (let i = 0; i < NUM_LEAF_PAIRS; i++) {
    leftLeafPositions[i] = jawX1;
    rightLeafPositions[i] = jawX2;
  }
  document.getElementById(controlDisplayId).textContent = currentValue.toFixed(1);
  updateOuterVisualsAndContainers();
  updateInnerLeafVisuals(leftLeafPositions, rightLeafPositions, false);
}

function changeCollimator(delta) {
  collimatorAngle = (collimatorAngle + delta + 360) % 360;
  collimatorDisplay.textContent = `${collimatorAngle}°`;
  collimatorDisplay2.textContent = `${collimatorAngle}°`;
  updateOuterVisualsAndContainers();
}

function calculatePresetPositions(presetType) {
  const targetLeft = [];
  const targetRight = [];
  const currentJawX1 = jawX1, currentJawX2 = jawX2, currentJawY1 = jawY1, currentJawY2 = jawY2;
  const totalWidth = currentJawX1 + currentJawX2;
  const squareDist = Math.min(currentJawX1, currentJawX2, currentJawY1, currentJawY2, 4.0);
  const offsetDistR = Math.min(currentJawX2, 2.0);
  const blockDist = Math.min(currentJawX1, currentJawX2, 1.0);
  const cShapeInnerDist = Math.min(currentJawX1, currentJawX2, 3.0);
  const cShapeOuterDist = Math.min(currentJawX1, currentJawX2, 8.0);
  const minGap = 0.5;
  for (let i = 0; i < NUM_LEAF_PAIRS; i++) {
    let leftDist, rightDist;
    switch (presetType) {
      case 'match': leftDist = currentJawX1; rightDist = currentJawX2; break;
      case 'square': leftDist = squareDist; rightDist = squareDist; break;
      case 'offset': leftDist = currentJawX1; rightDist = offsetDistR; break;
      case 'block': leftDist = blockDist; rightDist = blockDist; break;
      case 'cshape': {
        const numEnds = Math.max(1, Math.floor(NUM_LEAF_PAIRS / 4));
        if (i < numEnds || i >= NUM_LEAF_PAIRS - numEnds) { leftDist = cShapeOuterDist; rightDist = cShapeOuterDist; }
        else { leftDist = cShapeInnerDist; rightDist = cShapeOuterDist; }
        break;
      }
      case 'diagonal': {
        let l_target = currentJawX1 - (i / Math.max(1, NUM_LEAF_PAIRS - 1)) * totalWidth;
        let r_target = currentJawX2 - ((NUM_LEAF_PAIRS - 1 - i) / Math.max(1, NUM_LEAF_PAIRS - 1)) * totalWidth;
        leftDist = Math.max(0, -l_target);
        rightDist = Math.max(0, r_target);
        if (leftDist + rightDist < minGap) {
          const adjustment = (minGap - (leftDist + rightDist)) / 2;
          leftDist += adjustment;
          rightDist += adjustment;
        }
        break;
      }
      case 'diagRev': {
        let l_target = currentJawX1 - ((NUM_LEAF_PAIRS - 1 - i) / Math.max(1, NUM_LEAF_PAIRS - 1)) * totalWidth;
        let r_target = currentJawX2 - (i / Math.max(1, NUM_LEAF_PAIRS - 1)) * totalWidth;
        leftDist = Math.max(0, -l_target);
        rightDist = Math.max(0, r_target);
        if (leftDist + rightDist < minGap) {
          const adjustment = (minGap - (leftDist + rightDist)) / 2;
          leftDist += adjustment;
          rightDist += adjustment;
        }
        break;
      }
      case 'diagShallow': {
        let m = 0.3;
        let l_target = currentJawX1 - (i / Math.max(1, NUM_LEAF_PAIRS - 1)) * totalWidth * m;
        let r_target = currentJawX2 - ((NUM_LEAF_PAIRS - 1 - i) / Math.max(1, NUM_LEAF_PAIRS - 1)) * totalWidth * m;
        leftDist = Math.max(0, -l_target);
        rightDist = Math.max(0, r_target);
        if (leftDist + rightDist < minGap) {
          const adjustment = (minGap - (leftDist + rightDist)) / 2;
          leftDist += adjustment;
          rightDist += adjustment;
        }
        break;
      }
      case 'multiBlock': {
        leftDist = (i % 4 < 2) ? currentJawX1 : blockDist * 1.2;
        rightDist = (i % 4 < 2) ? currentJawX2 : blockDist * 1.2;
        break;
      }
      default: leftDist = currentJawX1; rightDist = currentJawX2;
    }
    targetLeft[i] = Math.min(currentJawX1, Math.max(0, leftDist ?? currentJawX1));
    targetRight[i] = Math.min(currentJawX2, Math.max(0, rightDist ?? currentJawX2));
  }
  return { targetLeft, targetRight };
}

function setLeafPreset(presetType) {
  const { targetLeft, targetRight } = calculatePresetPositions(presetType);
  leftLeafPositions = targetLeft;
  rightLeafPositions = targetRight;
  updateOuterVisualsAndContainers();
  updateInnerLeafVisuals(leftLeafPositions, rightLeafPositions, false);
}

/* -----------------------------
   MLC Animation (IMRT/VMAT/3DCRT wiring to Beam On)
------------------------------*/
let mlcAnimFrame = null;
let mlcSeqTimeout = null;
let mlcAutoMode = null;

function animateMLCToPreset(targetLeft, targetRight, duration = 1000, cb) {
  const startLeft = [...leftLeafPositions];
  const startRight = [...rightLeafPositions];
  const startTime = performance.now();

  function step(now) {
    let t = Math.min(1, (now - startTime) / duration);
    for (let i = 0; i < NUM_LEAF_PAIRS; i++) {
      leftLeafPositions[i] = lerp(startLeft[i], targetLeft[i], t);
      rightLeafPositions[i] = lerp(startRight[i], targetRight[i], t);
    }
    updateInnerLeafVisuals(leftLeafPositions, rightLeafPositions, false);
    if (t < 1) {
      mlcAnimFrame = requestAnimationFrame(step);
    } else {
      mlcAnimFrame = null;
      if (cb) cb();
    }
  }
  if (mlcAnimFrame) cancelAnimationFrame(mlcAnimFrame);
  mlcAnimFrame = requestAnimationFrame(step);
}

function startImrtBeamAutoAnimation() {
  if (audioMLC) {
  audioMLC.currentTime = 0;
  audioMLC.play();
}
   cancelMLCAnimation();
  mlcAutoMode = "IMRT";
  const sequence = ['block', 'offset', 'square', 'diagonal', 'multiBlock'];
  let idx = 0;
  function next() {
    if (!isBeaming || mlcAutoMode !== "IMRT") return;
    const { targetLeft, targetRight } = calculatePresetPositions(sequence[idx]);
    animateMLCToPreset(targetLeft, targetRight, 1000, () => {
      idx = (idx + 1) % sequence.length;
      mlcSeqTimeout = setTimeout(next, 200);
    });
  }
if (audioMLC) {
  audioMLC.pause();
  audioMLC.currentTime = 0;
} 
   next();
}

function setMLC3DCRTPreset() {
  cancelMLCAnimation();
  mlcAutoMode = "STATIC";
  const isBlock = Math.random() > 0.5;
  const preset = isBlock ? 'block' : 'match';
  const { targetLeft, targetRight } = calculatePresetPositions(preset);
  animateMLCToPreset(targetLeft, targetRight, 900);
}

function cancelMLCAnimation() {
  mlcAutoMode = null;
  if (mlcAnimFrame) cancelAnimationFrame(mlcAnimFrame);
  mlcAnimFrame = null;
  if (mlcSeqTimeout) clearTimeout(mlcSeqTimeout);
  mlcSeqTimeout = null;
}

/* -----------------------------
   IMAGE ALIGNMENT CONTROLS
------------------------------*/
let isAlignmentVerified = false;
function resetAlignmentVerification() {
  isAlignmentVerified = false;
  btnBeamOn.classList.add('disabled');
  if (alignmentMessage) alignmentMessage.textContent = "Alignment must be re-checked after any adjustment.";
}

function moveOverlay(dx, dy) {
  overlayOffsetX += dx;
  overlayOffsetY += dy;
  applyOverlayTransformsAndFilters();
  updateShiftFeedback();
  resetAlignmentVerification();
}
function rotateOverlay(deltaAngle) {
  overlayRotationAngle = (overlayRotationAngle + deltaAngle + 360) % 360;
  applyOverlayTransformsAndFilters();
  updateShiftFeedback();
  resetAlignmentVerification();
}
function scaleOverlay(zoomIn) {
  const SCALE_STEP_MULTIPLIER = 1.1, MIN_SCALE = 0.2, MAX_SCALE = 5.0;
  if (zoomIn) overlayScale = Math.min(MAX_SCALE, overlayScale * SCALE_STEP_MULTIPLIER);
  else overlayScale = Math.max(MIN_SCALE, overlayScale / SCALE_STEP_MULTIPLIER);
  applyOverlayTransformsAndFilters();
  updateShiftFeedback();
  resetAlignmentVerification();
}
function handleOpacityChange() {
  if (overlayImageElement && opacitySlider) {
    overlayOpacity = opacitySlider.value / 100;
    applyOverlayTransformsAndFilters();
  }
}
function applyOverlayTransformsAndFilters() {
  if (!overlayImageElement || !baseImageElement) return;
  baseImageElement.style.transform = `scale(${overlayScale})`;
  const overlayTransform =
    `scale(${overlayScale}) ` +
    `translate(${overlayOffsetX}px, ${overlayOffsetY}px) ` +
    `rotate(${overlayRotationAngle}deg)`;
  overlayImageElement.style.transform = overlayTransform;
  overlayImageElement.style.opacity = overlayOpacity;
  rotationDisplay.textContent = `${overlayRotationAngle}°`;
  scaleDisplay.textContent = `${overlayScale.toFixed(2)}x`;
  opacityValue.textContent = `${Math.round(overlayOpacity * 100)}%`;
  couchShiftX.textContent = overlayOffsetX;
  couchShiftY.textContent = overlayOffsetY;
  couchRotation.textContent = `${overlayRotationAngle}°`;
  couchZoom.textContent = `${overlayScale.toFixed(2)}x`;
}
function updateShiftFeedback() {
  if(shiftFeedback) {
    shiftFeedback.textContent = `Corrected Offset: X=${overlayOffsetX}, Y=${overlayOffsetY} | Rotation: ${overlayRotationAngle}°`;
  }
}

/* -----------------------------
   ALIGNMENT CHECK LOGIC
------------------------------*/
function checkAlignmentClicked() {
  if (
    Math.abs(overlayOffsetX) <= alignmentTolerance &&
    Math.abs(overlayOffsetY) <= alignmentTolerance &&
    (overlayRotationAngle % 360 === 0 || Math.abs(overlayRotationAngle % 360) <= 2) &&
    Math.abs(overlayScale - 1) <= 0.05
  ) {
    isAlignmentVerified = true;
    btnBeamOn.classList.remove('disabled');
    if (alignmentMessage) alignmentMessage.textContent = "Alignment Verified! You may now Beam On.";
    correctCaseAlignments++;
    updateCaseAlignmentCounterDisplay?.();
  } else {
    isAlignmentVerified = false;
    btnBeamOn.classList.add('disabled');
    if (alignmentMessage) alignmentMessage.textContent =
      "Alignment not within tolerance. Adjust overlay (shift/rotate/zoom) and try again.";
  }
}

/* -----------------------------
   BEAM & PREPARE LOGIC (with MLC Animation wiring)
------------------------------*/
function prepareClicked() {
  if (isBeaming || isPrepared || isDoorOpen) return;
  isPrepared = true;
  isAlignmentVerified = false;
  btnBeamOn.classList.add('disabled');
  updateConsoleDisplay();
}

function beamOnClicked() {
  if (isBeaming || !isPrepared || isDoorOpen || !isAlignmentVerified) return;
  isBeaming = true;
  btnBeamOn.classList.add('disabled');
  btnBeamOff.classList.remove('disabled');

  // --- MLC Animation wiring based on technique ---
  let technique = "";
  if (currentLoadedPlan) {
    technique = (currentLoadedPlan.technique || "").toUpperCase();
  }
  if (technique.includes("IMRT") || technique.includes("VMAT")) {
    startImrtBeamAutoAnimation();
  } else {
    setMLC3DCRTPreset();
  }
  if (audioBeam) {
  audioBeam.currentTime = 0;
  audioBeam.play();
}
  let doseRate = 300; // MU/minute, ~5 MU/sec
  let intervalMs = 200; // 0.2s increments
  let muPerTick = doseRate / 60 * (intervalMs / 1000);
  beamTimeoutId = setInterval(() => {
    deliveredMU += muPerTick;
    if (deliveredMU >= setMU) {
      deliveredMU = setMU;
      beamOffClicked();
      // RTApps (plan 4d): one completion per successfully delivered beam (not
      // beamOffClicked, which also fires on manual abort).
      if (window.RTApps) window.RTApps.recordResult('sim-console').catch(function () {});
    }
    updateConsoleDisplay();
  }, intervalMs);
  updateConsoleDisplay();
}

function beamOffClicked() {
  isBeaming = false;
  isPrepared = false;
  btnBeamOn.classList.remove('disabled');
  btnBeamOff.classList.add('disabled');
  if (beamTimeoutId) clearInterval(beamTimeoutId);
  beamTimeoutId = null;
  cancelMLCAnimation();
  updateConsoleDisplay();
}

function resetClicked() {
  if (beamTimeoutId) clearInterval(beamTimeoutId);
  beamTimeoutId = null;
  isPrepared = false; isBeaming = false; deliveredMU = 0; setMU = 0;
  currentLoadedPlan = null; loadedFieldIndex = -1;
  selectedEnergy = energyOptions[0]; currentEnergyIndex = 0;
  gantryAngle = collimatorAngle = couchAngle = 0;
  jawX1 = jawX2 = jawY1 = jawY2 = 5.0;
  leftLeafPositions = Array(NUM_LEAF_PAIRS).fill(jawX1);
  rightLeafPositions = Array(NUM_LEAF_PAIRS).fill(jawX2);
  fieldAdjustmentLocked = false; overrideActive = false;
  cancelMLCAnimation();
  updateControlPanelDisplays(); updateMachineParameterDisplays();
  updateOuterVisualsAndContainers(); updateInnerLeafVisuals(leftLeafPositions, rightLeafPositions, false);
  updateConsoleDisplay(); updateStatusBar();
  showTab('demographics');
  if (audioBeam) {
  audioBeam.pause();
  audioBeam.currentTime = 0;
}
}

function partialResetConsoleForNewPlan() {
  if(beamTimeoutId) clearInterval(beamTimeoutId);
  beamTimeoutId = null;
  isPrepared = false; isBeaming = false; deliveredMU = 0; setMU = 0;
  selectedEnergy = "---"; gantryAngle = 0; collimatorAngle = 0; couchAngle = 0;
  jawX1 = 0; jawX2 = 0; jawY1 = 0; jawY2 = 0; currentEnergyIndex = -1;
  fieldAdjustmentLocked = false; loadedFieldIndex = -1;
  document.getElementById('currentEnergyDisplay').textContent = '---';
  document.getElementById('mp-energy').textContent = '---';
  cancelMLCAnimation();
  updateControlPanelDisplays();
  updateMachineParameterDisplays();
  enableParameterSettingButtons(false);
  updateConsoleDisplay();
  updateStatusBar();
  isAlignmentVerified = false;
  btnBeamOn.classList.add('disabled');
}

function doorControlClicked() {
  isDoorOpen = !isDoorOpen;
  document.getElementById('dot-door').style.backgroundColor = isDoorOpen ? "#dc3545" : "#0f7c2d";
  document.getElementById('doorStatus').textContent = isDoorOpen ? "Open" : "Closed";
  if (isDoorOpen && isBeaming) beamOffClicked();
  updateConsoleDisplay();
}

function overrideClicked() {
  overrideActive = !overrideActive;
  document.getElementById('dot-override').style.backgroundColor = overrideActive ? "#ffc107" : "#888";
  document.getElementById('overrideStatus').textContent = overrideActive ? "Active" : "Inactive";
}

/* -----------------------------
   INIT & EVENT BINDINGS
------------------------------*/
document.addEventListener('DOMContentLoaded', () => {
  wireDomReferences();

  // EMR/Case generation
  generateCaseBtn?.addEventListener('click', generateAndDisplayPatientCase);

  // Energy/MU/Prepare/Beam/Reset
  energyToggleButton?.addEventListener('click', cycleEnergy);
  btnSetMU?.addEventListener('click', setMuClicked);
  btnPrepare?.addEventListener('click', prepareClicked);
  btnBeamOn?.addEventListener('click', beamOnClicked);
  btnBeamOff?.addEventListener('click', beamOffClicked);
  btnReset?.addEventListener('click', resetClicked);
  btnDoorControl?.addEventListener('click', doorControlClicked);
  btnOverride?.addEventListener('click', overrideClicked);

  // Jaws/collimator
  collRotateNegBtn?.addEventListener('click', () => changeCollimator(-5));
  collRotatePosBtn?.addEventListener('click', () => changeCollimator(5));
  drrImageSelect?.addEventListener('change', handleImageChange);

  // MLC Presets
  presetMatchJawBtn?.addEventListener('click', () => setLeafPreset('match'));
  presetSquareBtn?.addEventListener('click', () => setLeafPreset('square'));
  presetOffsetBtn?.addEventListener('click', () => setLeafPreset('offset'));
  presetBlockBtn?.addEventListener('click', () => setLeafPreset('block'));
  presetCshapeBtn?.addEventListener('click', () => setLeafPreset('cshape'));
  presetDiagonalBtn?.addEventListener('click', () => setLeafPreset('diagonal'));
  presetDiagRevBtn?.addEventListener('click', () => setLeafPreset('diagRev'));
  presetDiagShallowBtn?.addEventListener('click', () => setLeafPreset('diagShallow'));
  presetMultiBlockBtn?.addEventListener('click', () => setLeafPreset('multiBlock'));

  // MLC Animations: Panel controls, not Beam On
  animateSquareRandBtn?.addEventListener('click', () => setLeafPreset('square'));
  animateOffsetRandBtn?.addEventListener('click', () => setLeafPreset('offset'));
  animateDiagonalRandBtn?.addEventListener('click', () => setLeafPreset('diagonal'));
  slidingWindowBtn?.addEventListener('click', () => setLeafPreset('block')); // Replace with sliding window demo if desired
  imrtDemoBtn?.addEventListener('click', startImrtBeamAutoAnimation);

  // Alignment: Button and controls
  const btnCheckAlignment = document.getElementById('btn-check-alignment');
  btnCheckAlignment?.addEventListener('click', checkAlignmentClicked);

  // Field/MLC Visualizer drag
  for (let i = 0; i < NUM_LEAF_PAIRS; i++) {
    leftLeafPositions[i] = jawX1; rightLeafPositions[i] = jawX2;
    const pairContainer = document.createElement('div'); pairContainer.className = 'leaf-pair-container'; pairContainer.id = `leafPairContainer_${i}`;
    const outerLeftLeaf = document.createElement('div'); outerLeftLeaf.className = 'leaf-section outer left'; outerLeftLeaf.id = `outerLeftLeaf_${i}`;
    const innerLeftLeaf = document.createElement('div'); innerLeftLeaf.className = 'leaf-section inner left'; innerLeftLeaf.id = `innerLeftLeaf_${i}`;
    const innerRightLeaf = document.createElement('div'); innerRightLeaf.className = 'leaf-section inner right'; innerRightLeaf.id = `innerRightLeaf_${i}`;
    const outerRightLeaf = document.createElement('div'); outerRightLeaf.className = 'leaf-section outer right'; outerRightLeaf.id = `outerRightLeaf_${i}`;
    pairContainer.appendChild(outerLeftLeaf); pairContainer.appendChild(innerLeftLeaf); pairContainer.appendChild(innerRightLeaf); pairContainer.appendChild(outerRightLeaf);
    rotatingElementsContainer.appendChild(pairContainer);
  }

  let isDragging = false, dragOffsetX = 0, dragOffsetY = 0;
  rotatingElementsContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    rotatingElementsContainer.classList.add('dragging');
    dragOffsetX = e.clientX - rotatingElementsContainer.getBoundingClientRect().left;
    dragOffsetY = e.clientY - rotatingElementsContainer.getBoundingClientRect().top;
  });
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    let x = e.clientX - dragOffsetX;
    let y = e.clientY - dragOffsetY;
    const containerRect = fieldDisplayContainer.getBoundingClientRect();
    const draggableRect = rotatingElementsContainer.getBoundingClientRect();
    const minX = 0, maxX = containerRect.width - draggableRect.width;
    const minY = 0, maxY = containerRect.height - draggableRect.height;
    x = Math.max(minX, Math.min(maxX, x));
    y = Math.max(minY, Math.min(maxY, y));
    rotatingElementsContainer.style.left = `${x}px`;
    rotatingElementsContainer.style.top = `${y}px`;
    rotatingContainerLeft = x;
    rotatingContainerTop = y;
  });
  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    rotatingElementsContainer.classList.remove('dragging');
  });

  // Alignment controls
  opacitySlider?.addEventListener('input', handleOpacityChange);

  // Alignment arrows/zoom/rotate from control panel
  window.moveOverlay = moveOverlay;
  window.rotateOverlay = rotateOverlay;
  window.scaleOverlay = scaleOverlay;

  // Keyboard shortcuts for alignment
  document.addEventListener('keydown', function(e) {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
    let step = 1, handled = false;
    switch (e.key) {
      case 'ArrowUp': moveOverlay(0, -step); handled = true; break;
      case 'ArrowDown': moveOverlay(0, step); handled = true; break;
      case 'ArrowLeft': moveOverlay(-step, 0); handled = true; break;
      case 'ArrowRight': moveOverlay(step, 0); handled = true; break;
      case '[': rotateOverlay(-1); handled = true; break;
      case ']': rotateOverlay(1); handled = true; break;
      case '-': if(e.ctrlKey || e.metaKey) { scaleOverlay(false); handled = true; } break;
      case '=': if(e.ctrlKey || e.metaKey) { scaleOverlay(true); handled = true; } break;
      case '+': if(e.ctrlKey || e.metaKey) { scaleOverlay(true); handled = true; } break;
    }
    if (handled) e.preventDefault();
  });

  // Initial UI
  updateControlPanelDisplays();
  updateMachineParameterDisplays();
  updateOuterVisualsAndContainers();
  updateInnerLeafVisuals(leftLeafPositions, rightLeafPositions, false);
  applyOverlayTransformsAndFilters();
  updateConsoleDisplay();
  updateStatusBar();
  enableParameterSettingButtons(true);
});
