# Legacy content migration report

<!--
What this file does: the fix-list produced by running `tools/migrate-legacy scan` over the
real legacy workbook repo (`rtt_e_workbook`) -- every page it visited, what it converted, and
what it flagged for a human pass.
Used here and why: generated from `/tmp/legacy-scan-report.json` (the scanner's per-page
report), not hand-authored, so it stays traceable to one real scan run; regenerate rather
than hand-edit if the scanner or converters change.
How it fits the project: plan 3a Task 8's step 2 deliverable; plan 3b (content authoring)
works this needs-review list page by page, and the unsupported list scopes what's phase-4
(games/simulators/EMR) vs. still-missing content.
Depends on: `tools/migrate-legacy` (Tasks 6-7); the migrated JSON committed under
`apps/api/seed/content/`.
Used by: plan 3b authoring; anyone auditing migration coverage.
-->

This is plan 3b's authoring fix-list; `unsupported` pages (games, simulators, EMR, radio-quiz
variants) are phase-4 or fix-list material.

The scan converted **21** documents cleanly, flagged **71** for a needs-review human pass (imported, but with a lossy element mapping, a missing/ambiguous knowledge-check answer, or a
slug collision), and found **88** pages with no convertible pattern at all (unsupported -- nothing written). All 92 converted documents (converted + needs-review) pass the API's
Pydantic import validation (`app.content.activity_importer` / `app.content.importer`).

## Summary by subject

Per subject, per kind: converted / needs-review / unsupported counts (a dash means zero documents of that kind for that subject).

| Subject | lesson (c/nr) | quiz (c/nr) | flashcards (c/nr) | matching (c/nr) | unsupported |
|---|---|---|---|---|---|
| 3D LINAC | - | - | - | - | 1 |
| Clinical Practice | 0/5 | - | 0/1 | - | 8 |
| Ethics | 0/2 | 1/0 | - | - | 5 |
| Orientation to Radiation Therapy | 0/6 | - | 1/0 | - | 5 |
| Patient Care | 2/7 | - | - | - | 7 |
| Principles and Practice I | 1/2 | - | - | - | 4 |
| Quality Management and Safety | 1/0 | - | - | - | 1 |
| Radiation Biology | 2/7 | 3/0 | - | 3/0 | 1 |
| Radiation Physics | 0/4 | - | - | - | 11 |
| Radiation Protection | 3/3 | 1/0 | - | 1/0 | 3 |
| Research and Evidence Based Practice | 2/6 | - | - | - | 3 |
| Sectional Anatomy | 0/8 | - | - | - | 6 |
| Treatment Delivery Procedures | 0/8 | - | 0/1 | - | 9 |
| Treatment Planning | 0/11 | - | - | - | 24 |
| **Total** | 11/69 | 5/0 | 1/2 | 4/0 | 88 |

Grand totals across all 180 scanned pages: **21 converted**, **71 needs-review**, **88 unsupported**.

## Needs-review listing

Every document the scanner wrote but flagged for a human pass -- grouped by subject, in scan order. Each entry is the source page, the kind converted, and the notes the converter attached (lossy element mappings, missing/ambiguous answer keys, normalised knowledge-check keys, slug collisions).

### Clinical Practice

- **Clinical_Practice/Modalities_Equipment_Terminology/index.html** (lesson)
  - img placeholder (https://oncologymedicalphysics.com/wp-content/uploads/2021/04/Linac-Components-OMP.png)
  - unsupported inline element button
  - dropped non-https link
- **Clinical_Practice/Modalities_Equipment_Terminology/rt_terminology_challenge/index.html** (flashcards)
  - ambiguous term/definition array vocab; defaulted to flashcards
- **Clinical_Practice/Professional_Behavior_and_Boundaries/index.html** (lesson)
  - unsupported inline element textarea (×3)
- **Clinical_Practice/Professional_Organizations/index.html** (lesson)
  - mixed inline content wrapped in paragraph in div (×8)
- **Clinical_Practice/Professionalism_and_Success/index.html** (lesson)
  - highlight→bold (×8)
- **Clinical_Practice/Team_and_Roles/index.html** (lesson)
  - dropped non-https link

### Ethics

- **Ethics/ARRT_Ethics/index.html** (lesson)
  - mixed inline content wrapped in paragraph in div (×3)
- **Ethics/Medical_Law/index.html** (lesson)
  - highlight→bold (×10)

### Orientation to Radiation Therapy

- **Orientation_to_Radiation_Therapy/Becoming_a_Radiation_Therapist/index.html** (lesson)
  - highlight→bold (×6)
- **Orientation_to_Radiation_Therapy/Evolution_of_Radiation_Therapy/index.html** (lesson)
  - highlight→bold (×2)
  - dropped non-https link
- **Orientation_to_Radiation_Therapy/History_of_Radiologic_Technology/index.html** (lesson)
  - highlight→bold (×7)
  - dropped non-https link
- **Orientation_to_Radiation_Therapy/Study_Skills_and_Time_Management/index.html** (lesson)
  - highlight→bold (×3)
  - dropped non-https link
- **Orientation_to_Radiation_Therapy/Team_and_Roles/index.html** (lesson)
  - dropped non-https link
  - slug collision on 'team-and-roles'; renamed to 'orientation-to-radiation-therapy-team-and-roles'
- **Orientation_to_Radiation_Therapy/What_is_Oncology/index.html** (lesson)
  - highlight→bold (×14)
  - dropped non-https link

### Patient Care

- **Patient_Care/Clinical_Objectives/index.html** (lesson)
  - highlight→bold (×2)
  - dropped non-https link
- **Patient_Care/Communication_Patient_Education/index.html** (lesson)
  - highlight→bold (×4)
- **Patient_Care/Equipment_Monitoring_Emergencies/index.html** (lesson)
  - highlight→bold (×9)
- **Patient_Care/Infection_Control_Hazardous_Materials/index.html** (lesson)
  - highlight→bold (×3)
- **Patient_Care/Medical_Record_Documentation/index.html** (lesson)
  - highlight→bold (×2)
- **Patient_Care/Patient_Identifiers/index.html** (lesson)
  - highlight→bold (×12)
  - dropped non-https link
- **Patient_Care/Patient_Journey/index.html** (lesson)
  - highlight→bold (×5)
  - dropped non-https link

### Principles and Practice I

- **Principles_and_Practice_I/Imaging_and_Processing/index.html** (lesson)
  - highlight→bold (×2)
- **Principles_and_Practice_I/Math_Review/index.html** (lesson)
  - highlight→bold (×2)

### Radiation Biology

- **Radiation_Biology/Cell_Differentiation/index.html** (lesson)
  - highlight→bold
- **Radiation_Biology/Cell_Sensitivity/index.html** (lesson)
  - highlight→bold
- **Radiation_Biology/Cell_Survival_Curves/index.html** (lesson)
  - highlight→bold
- **Radiation_Biology/RBE_and_OER/index.html** (lesson)
  - highlight→bold (×3)
- **Radiation_Biology/Radiation_Effects/radiation_effects_lesson.html** (lesson)
  - highlight→bold
- **Radiation_Biology/Rs_of_Radiobiology/index.html** (lesson)
  - highlight→bold
- **Radiation_Biology/Tolerance_Dose/index.html** (lesson)
  - highlight→bold

### Radiation Physics

- **Radiation_Physics/Radioactivity/index.html** (lesson)
  - highlight→bold (×3)
- **Radiation_Physics/Sources_of_Radiation/index.html** (lesson)
  - img placeholder (https://placehold.co/600x250/E9D5FF/4C1D95?text=Electromagnetic+Spectrum+Diagram+(Ionizing+vs+Non-Ionizing))
  - img placeholder (https://placehold.co/500x250/E0E7FF/4338CA?text=Cosmic+Rays+Illustration)
  - img placeholder (https://placehold.co/500x250/E0E7FF/4338CA?text=Terrestrial+Radiation+Sources)
  - img placeholder (https://placehold.co/600x350/E9D5FF/4C1D95?text=Pie+Chart:+Typical+U.S.+Radiation+Exposure+Sources)
- **Radiation_Physics/em_spectrum/index.html** (lesson)
  - highlight→bold (×2)
- **Radiation_Physics/photon_interactions/index.html** (lesson)
  - highlight→bold

### Radiation Protection

- **Radiation_Protection/ALARA_and_Inverse_Square_Law/index.html** (lesson)
  - unsupported element hr on page 1
  - unsupported element hr on page 8
  - img placeholder (https://placehold.co/36x36/FBBF24/78350F?text=S)
  - mixed inline content wrapped in paragraph in div (×3)
  - unsupported inline element form
  - unsupported inline element h3 (×3)
  - unsupported inline element textarea (×16)
  - unsupported inline element button (×2)
- **Radiation_Protection/CT_and_Radioisotope_Safety/ct_radioisotope_safety_lesson.html** (lesson)
  - highlight→bold (×2)
- **Radiation_Protection/Personnel_Monitoring_Dosimetry/index.html** (lesson)
  - highlight→bold (×4)

### Research and Evidence Based Practice

- **Research_and_Evidence_Based_Practice/Data_Analysis_Statistics_Studio/index.html** (lesson)
  - dropped non-https link
- **Research_and_Evidence_Based_Practice/Hypotheses_Significance_Testing/index.html** (lesson)
  - highlight→bold (×2)
- **Research_and_Evidence_Based_Practice/Research_Ethics_IRB/index.html** (lesson)
  - highlight→bold (×2)
- **Research_and_Evidence_Based_Practice/Research_Questions_Literature_Searching/index.html** (lesson)
  - highlight→bold (×2)
- **Research_and_Evidence_Based_Practice/Variables_Measurement/index.html** (lesson)
  - highlight→bold (×2)
- **Research_and_Evidence_Based_Practice/What_is_Research/index.html** (lesson)
  - highlight→bold

### Sectional Anatomy

- **Sectional_Anatomy/Abdomen/index.html** (lesson)
  - unsupported element model-viewer on page 2
  - dropped non-https link (×2)
- **Sectional_Anatomy/Brain/index.html** (lesson)
  - unsupported inline element figure (×4)
  - img placeholder (img/ct_midventricular.png)
  - unsupported inline element figcaption (×4)
  - img placeholder (img/ct_bone_skullbase.png)
  - unsupported element figure on page 2
  - unsupported element figure on page 3
  - unsupported element figure on page 4
  - unsupported element figure on page 5
  - img placeholder (img/mr_t1ce_seg.png)
  - img placeholder (img/mr_flair_seg.png)
  - dropped non-https link (×2)
- **Sectional_Anatomy/Breast/index.html** (lesson)
  - unsupported element figure on page 1
  - unsupported inline element figure (×2)
  - img placeholder (img/breast_midbreast.png)
  - unsupported inline element figcaption (×2)
  - img placeholder (img/breast_lung_window.png)
  - unsupported element figure on page 3
  - unsupported element figure on page 4
  - dropped non-https link
- **Sectional_Anatomy/Foundations/index.html** (lesson)
  - dropped non-https link (×2)
- **Sectional_Anatomy/Head_and_Neck/index.html** (lesson)
  - unsupported element figure on page 1
  - unsupported element figure on page 2
  - unsupported element figure on page 3
  - unsupported element figure on page 4
  - dropped non-https link (×2)
- **Sectional_Anatomy/Pelvis/index.html** (lesson)
  - unsupported element figure on page 1
  - unsupported inline element figure (×2)
  - img placeholder (img/prostate_bladder.png)
  - unsupported inline element figcaption (×2)
  - img placeholder (img/prostate_gland.png)
  - unsupported element model-viewer on page 3
  - dropped non-https link (×2)
- **Sectional_Anatomy/Skeletal/index.html** (lesson)
  - unsupported element figure on page 1
  - unsupported inline element figure (×2)
  - img placeholder (img/spine_axial_bone.png)
  - unsupported inline element figcaption (×2)
  - img placeholder (img/spine_axial_soft.png)
  - unsupported element figure on page 4
  - dropped non-https link
- **Sectional_Anatomy/Thorax/index.html** (lesson)
  - unsupported element model-viewer on page 2
  - unsupported element model-viewer on page 3
  - dropped non-https link (×2)

### Treatment Delivery Procedures

- **Treatment_Delivery_Procedures/Field_Size/console_fieldsize_lesson.html** (lesson)
  - highlight→bold (×6)
  - duplicate lesson page dropped (page 6, 'What "Field Size" Means at the Console')
  - duplicate lesson page dropped (page 7, 'Jaws — Symmetric vs. Asymmetric')
  - duplicate lesson page dropped (page 8, 'Field Size Is Defined at Isocenter')
  - duplicate lesson page dropped (page 9, 'Collimator Rotation vs. Field Size')
  - duplicate lesson page dropped (page 10, 'Ready for the Simulator')
- **Treatment_Delivery_Procedures/Field_Size/index.html** (lesson)
  - highlight→bold (×13)
  - dropped non-https link
  - slug collision on 'field-size'; renamed to 'treatment-delivery-procedures-field-size'
- **Treatment_Delivery_Procedures/LINAC_Parts/Build_a_LINAC_Game.html** (flashcards)
  - ambiguous term/definition array enhancementsData; defaulted to flashcards
- **Treatment_Delivery_Procedures/LINAC_Parts/index.html** (lesson)
  - img placeholder (https://i.ibb.co/XtcC7N1/linac-overview-diagram.png)
  - highlight→bold (×7)
  - dropped non-https link
- **Treatment_Delivery_Procedures/LINAC_Parts/linear_accelerator_lesson.html** (lesson)
  - highlight→bold (×7)
  - slug collision on 'linac-parts'; renamed to 'treatment-delivery-procedures-linac-parts'
- **Treatment_Delivery_Procedures/LINAC_Parts/Console_Operations_and_Interlocks/index.html** (lesson)
  - highlight→bold
- **Treatment_Delivery_Procedures/LINAC_Parts/Image_Production/index.html** (lesson)
  - highlight→bold (×3)
- **Treatment_Delivery_Procedures/MLC/console_mlc_lesson.html** (lesson)
  - highlight→bold (×3)
- **Treatment_Delivery_Procedures/MLC/index.html** (lesson)
  - highlight→bold (×3)
  - dropped non-https link
  - slug collision on 'mlc'; renamed to 'treatment-delivery-procedures-mlc'

### Treatment Planning

- **Treatment_Planning/Beam_Energy_and_Dmax/index.html** (lesson)
  - highlight→bold (×14)
  - no correct answer for lq_page3_1
  - no correct answer for lq_page5_1
- **Treatment_Planning/Isodose_Distribution_lesson/index.html** (lesson)
  - highlight→bold (×3)
- **Treatment_Planning/Site_Specific_Planning/Abdomen/index.html** (lesson)
  - slug collision on 'abdomen'; renamed to 'treatment-planning-abdomen'
- **Treatment_Planning/Site_Specific_Planning/Brain/index.html** (lesson)
  - slug collision on 'brain'; renamed to 'treatment-planning-brain'
- **Treatment_Planning/Site_Specific_Planning/Breast/index.html** (lesson)
  - highlight→bold
  - slug collision on 'breast'; renamed to 'treatment-planning-breast'
- **Treatment_Planning/Site_Specific_Planning/Head_and_Neck/index.html** (lesson)
  - slug collision on 'head-and-neck'; renamed to 'treatment-planning-head-and-neck'
- **Treatment_Planning/Site_Specific_Planning/Pelvis/index.html** (lesson)
  - slug collision on 'pelvis'; renamed to 'treatment-planning-pelvis'
- **Treatment_Planning/Site_Specific_Planning/Skeletal/index.html** (lesson)
  - highlight→bold
  - slug collision on 'skeletal'; renamed to 'treatment-planning-skeletal'
- **Treatment_Planning/Site_Specific_Planning/Thorax/index.html** (lesson)
  - highlight→bold
  - dropped non-https link (×2)
  - slug collision on 'thorax'; renamed to 'treatment-planning-thorax'
- **Treatment_Planning/Treatment_Planning_Fundamentals/index.html** (lesson)
  - highlight→bold
- **Treatment_Planning/treatment_techniques_mu_lesson/index.html** (lesson)
  - highlight→bold (×6)
  - dropped non-https link

## Unsupported listing

Pages the scanner recognised no convertible pattern in at all (not the paged-lesson pattern, and no classifiable quiz/flashcards/matching/sequencing array) -- nothing was written for these. Per the note at the top of this document, most of these are phase-4 (games, simulators, EMR sim) or plan 3b fix-list material, not converter bugs.

### 3D LINAC

- **3D_LINAC/index.html** — unparseable array literal allImagerParts

### Clinical Practice

- **Clinical_Practice/index.html**
- **Clinical_Practice/ClinicalWorksheets_CTSimulation/index.html**
- **Clinical_Practice/ClinicalWorksheets_Treatment/index.html**
- **Clinical_Practice/Modalities_Equipment_Terminology/rt_linac_label_activity.html**
- **Clinical_Practice/Modalities_Equipment_Terminology/linac_diagram/index.html**
- **Clinical_Practice/Modalities_Equipment_Terminology/rt_modality_match_activity/index.html** — unparseable array literal allPairs
- **Clinical_Practice/Team_and_Roles/speech_quiz.html**
- **Clinical_Practice/interactive_CT_simulator/index.html**

### Ethics

- **Ethics/index.html**
- **Ethics/HIPAA/hipaa_cases/index.html**
- **Ethics/HIPAA/hipaa_game/index.html** — unparseable array literal scenarios
- **Ethics/HIPAA/hipaa_quiz/index.html**
- **Ethics/Legal_Doctrines_Assessment/index.html**

### Orientation to Radiation Therapy

- **Orientation_to_Radiation_Therapy/index.html**
- **Orientation_to_Radiation_Therapy/ARRT_Clinical_Competency_Requirements/index.html**
- **Orientation_to_Radiation_Therapy/History_of_Radiologic_Technology/history_timeline_activity.html** — unparseable array literal shuffledEvents
- **Orientation_to_Radiation_Therapy/Study_Skills_and_Time_Management/personal_success_plan_activity.html**
- **Orientation_to_Radiation_Therapy/Team_and_Roles/speech_quiz.html**

### Patient Care

- **Patient_Care/index.html**
- **Patient_Care/patient_care_skills_activity.html**
- **Patient_Care/Clinical_Objectives/venipuncture/index.html**
- **Patient_Care/Clinical_Objectives/venipuncture/lab_practicum/index.html**
- **Patient_Care/Clinical_Objectives/vital_signs_simulator/index.html**
- **Patient_Care/Patient_Identifiers/patient_safety_id_lab.html**
- **Patient_Care/Patient_Journey/patient_journey_sequencer_activity.html** — unparseable array literal shuffledStages

### Principles and Practice I

- **Principles_and_Practice_I/index.html**
- **Principles_and_Practice_I/MRI_Image_Production/index.html** — unparseable array literal pages
- **Principles_and_Practice_I/Math_Review/Math_Review_Practice_Worksheet/index.html**
- **Principles_and_Practice_I/Medical_Terminology_Simulator/index.html** — unparseable array literal a

### Quality Management and Safety

- **Quality_Management_and_Safety/index.html**

### Radiation Biology

- **Radiation_Biology/index.html**

### Radiation Physics

- **Radiation_Physics/index.html**
- **Radiation_Physics/atomic_structure/atomic_structure_lesson_index.html**
- **Radiation_Physics/atomic_structure/atomic_structure_simulator_index.html**
- **Radiation_Physics/atomic_structure/atomic_structure_worksheet_index.html**
- **Radiation_Physics/atomic_structure/index.html**
- **Radiation_Physics/atomic_structure/notation_game_index.html**
- **Radiation_Physics/photon_interactions/photon_interactions_simulator/index.html**
- **Radiation_Physics/room_shielding/index.html**
- **Radiation_Physics/units_of_measurement/index.html**
- **Radiation_Physics/units_of_measurement/units_of_measurement_game_index.html**
- **Radiation_Physics/units_of_measurement/units_of_measurement_worksheet_index.html**

### Radiation Protection

- **Radiation_Protection/index.html**
- **Radiation_Protection/MRI_in_Radiotherapy_Practice/index.html** — unparseable array literal pages; unparseable array literal content
- **Radiation_Protection/MRI_simulator/index.html** — unparseable array literal tabs

### Research and Evidence Based Practice

- **Research_and_Evidence_Based_Practice/index.html**
- **Research_and_Evidence_Based_Practice/Data_Analysis_Statistics_Studio/worksheet.html**
- **Research_and_Evidence_Based_Practice/Statistics_Studio/index.html**

### Sectional Anatomy

- **Sectional_Anatomy/index.html**
- **Sectional_Anatomy/3D_model_lymphatics/full_body/index.html** — unparseable array literal largeIntestinePoints; unparseable array literal thoracicDuctPoints; unparseable array literal rightLymphaticDuctPoints; unparseable array literal originalChildren
- **Sectional_Anatomy/3D_model_lymphatics/head_and_neck/index.html** — unparseable array literal originalChildren
- **Sectional_Anatomy/3D_model_lymphatics/pelvis/index.html**
- **Sectional_Anatomy/CT_Borders_Game/index.html** — unparseable array literal options
- **Sectional_Anatomy/dicom_viewer_demo/index.html**

### Treatment Delivery Procedures

- **Treatment_Delivery_Procedures/index.html**
- **Treatment_Delivery_Procedures/CT_Simulator/index.html** — unparseable array literal smallIntestinePoints
- **Treatment_Delivery_Procedures/Field_Size/field_size_simulator_activity.html**
- **Treatment_Delivery_Procedures/Gantry_Name_Game/index.html** — unparseable array literal allImagerParts
- **Treatment_Delivery_Procedures/LINAC_Parts/clinical_lab_worksheet.html**
- **Treatment_Delivery_Procedures/LINAC_Parts/equipment_review_quiz.html** — unparseable array literal correct
- **Treatment_Delivery_Procedures/LINAC_Parts/linac_operations_lab_activity.html**
- **Treatment_Delivery_Procedures/LINAC_Parts/build_linac_v2/index.html**
- **Treatment_Delivery_Procedures/MLC/mlc_field_shaping_activity.html**

### Treatment Planning

- **Treatment_Planning/index.html**
- **Treatment_Planning/Beam_Dose_Simulator/index.html**
- **Treatment_Planning/Brain_TPS/index.html**
- **Treatment_Planning/Breast_TPS/treatment_planning_suite.html** — unparseable array literal TL; unparseable array literal s; unparseable array literal imgs
- **Treatment_Planning/Extended_SSD/index.html**
- **Treatment_Planning/Gap_Calculation/index.html**
- **Treatment_Planning/Inverse_Square_Law/index.html**
- **Treatment_Planning/Isodose_Distribution/Depth_Dose_Worksheet/index.html**
- **Treatment_Planning/Lung_TPS/index.html**
- **Treatment_Planning/MU_Calculator/index.html** — unparseable array literal iTV
- **Treatment_Planning/Magnification/index.html**
- **Treatment_Planning/Math_Review/index.html**
- **Treatment_Planning/PDD_Explorer/index.html**
- **Treatment_Planning/Run_Plan/index.html**
- **Treatment_Planning/Site_Specific_Planning/index.html**
- **Treatment_Planning/TMR_PDD/index.html**
- **Treatment_Planning/TPS_Simulator/index.html**
- **Treatment_Planning/Technique_Simulator/index.html**
- **Treatment_Planning/Treatment_Planning_Fundamentals_worksheet/index.html**
- **Treatment_Planning/Treatment_Planning_Suite/index.html** — unparseable array literal TL; unparseable array literal s; unparseable array literal imgs
- **Treatment_Planning/bolus/index.html**
- **Treatment_Planning/dicom_viewer/index.html**
- **Treatment_Planning/tps_workbook/index.html**
- **Treatment_Planning/vocabulary/index.html**
