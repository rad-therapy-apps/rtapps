const vocabulary = [
    { term: "Radiation Therapy Prescription", definition: "A communication tool between the radiation Oncologist and the Radiation Therapist. It defines treatment site, tumor dose, # of treatments, dose per treatment, frequency of treatments, type and energy of treatment, and is a legal document. It does not include monitor units." },
    { term: "Isodose Plan", definition: "Contains field sizes, machine angles, doses, beam weighting, wedges, compensators, or blocks. It is considered part of the radiation therapy prescription and should be signed by the radiation oncologist." },
    { term: "Absorbed Dose", definition: "Measured at a specific point in a medium (typically a patient) and refers to the energy deposited at that point." },
    { term: "Depth", definition: "The distance beneath the skin surface where the prescribed dose is to be delivered. The radiation oncologist will state an exact point or depth of treatment." },
    { term: "Separation (intrafield distance (IFD))", definition: "Measurement of the patient’s thickness from the point of beam entry to the point of beam exit." },
    { term: "Source to Skin Distance (SSD)", definition: "The distance from the source or target of the treatment machine to the surface of the patient. Measured using the optical distance indicator (ODI)." },
    { term: "Isocenter", definition: "Intersection of the axis of rotation of the gantry and the axis of rotation of the collimator for the treatment unit. It is the point in space at a specified distance from the source or target that the gantry rotates around (e.g., Cobalt 60 distance 80 cm, Modern linear accelerators 100 cm)." },
    { term: "Field Size", definition: "Physical size set on the collimator of the Therapy Unit that delineates size of the treatment field at a reference distance." },
    { term: "Scatter", definition: "When the primary beam interacts with matter, the result is scatter radiation made up of photons or electrons. Radiation that is scattered back toward the surface of the patient is called backscatter." },
    { term: "Dmax", definition: "The depth of maximum equilibrium, the point where the maximum absorbed dose occurs for single field photon beams and chiefly depends on the energy of the beam." },
    { term: "Output", definition: "The amount of radiation exposure produced by a treatment machine or source as specified at a reference Field Size and distance." },
    { term: "Output Factor", definition: "The ratio of dose rate of a given Field Size to dose rate of the reference Field Size (10x10)." },
    { term: "Inverse Square Law", definition: "Mathematical relationship that describes the change in beam intensity caused by the divergence of the beam. As the beam of Radiation diverges or spreads out, there is a decrease in Intensity. Used for dose rate when there is a change in distance." },
    { term: "Equivalent Square", definition: "Taking different rectangular field sizes and comparing them to square fields that demonstrate the same measurable scatter characteristics. Used to find output, output factor, tissue absorption factors." },
    { term: "Effective Field Size", definition: "Also called blocked field size – area of open or treated area within the collimator field dimension; will be smaller than the Equivalent Square. Used to determine: Percent Depth Dose (PDD), Tissue-Air Ratio (TAR), Tissue Phantom Ratio (TPR), Tissue Maximum Ratio (TMR)." },
    { term: "Tissue Absorption Factors", definition: "Used for measuring the attenuation of a beam as it travels through tissue. For SSD setups, PDD (Percentage Depth Dose) is used. For SAD setups, one of the following is used: TAR, TPR, TMR." },
    { term: "PDD", definition: "The ratio, expressed as a percentage, of the absorbed dose at a given depth to the absorbed dose at a fixed reference depth, usually Dmax. PDD = (Absorbed dose at depth / Absorbed dose at Dmax) x 100%. PDD is dependent on: energy, FS, depth, SSD." },
    { term: "TAR", definition: "The ratio of the absorbed dose at a given depth in a phantom to the absorbed dose at the same point in free space. TAR = Dose in tissue / Dose in Air. Depends on: Energy, FS and depth. Used to perform low energy SAD treatment calculations with Co60 and 4MV linear accelerators." },
    { term: "BSF/PSF", definition: "Backscatter Factor also called Peak Scatter Factor – Ratio of the dose rate with a scattering medium to the dose rate at the same point without a scatter medium at the level of maximum equilibrium. Backscatter is a TAR at the level of Dmax." },
    { term: "TPR/TMR", definition: "The ratio of the absorbed dose at a given depth in phantom to the absorbed dose at the same point at a reference depth in phantom." },
    { term: "Dose Rate Modification Factors", definition: "Any device placed in the path of the Radiation beam will attenuate some of it (e.g., Tray transmission, wedge, and compensating filters). The transmission factor is the ratio of the radiation dose with the device to the radiation dose without the device." },
    { term: "Given Dose", definition: "The dose absorbed by tissue at the depth of Dmax." }
];

let currentGameMode = null;
let currentQuestionIndex = 0;
let currentFlashcardIndex = 0;
let score = 0;
let shuffledVocabulary = [];
let matchingPairs = []; // Stores terms and definitions for matching
let selectedMatchingCard = null; // Stores the currently dragged card

const synth = window.speechSynthesis; // For Audio Quiz mode

// Function to shuffle the vocabulary array
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function startGame(mode) {
    currentGameMode = mode;
    document.querySelectorAll('.game-container').forEach(container => container.style.display = 'none');
    document.getElementById(`${mode}-game`).style.display = 'block';

    // Shuffle vocabulary for new game start
    shuffledVocabulary = shuffleArray(vocabulary);
    currentQuestionIndex = 0;
    currentFlashcardIndex = 0;
    score = 0;
    
    resetGameSpecifics(mode);
    updateScore(mode); // Initialize score display for the chosen mode

    switch (mode) {
        case 'multiple-choice':
            loadMultipleChoiceQuestion();
            break;
        case 'matching':
            loadMatchingPairs();
            break;
        case 'flashcards':
            showFlashcard();
            break;
        case 'audio-quiz':
            loadAudioQuestion();
            break;
    }
}

function resetGameSpecifics(mode) {
    document.getElementById('mc-feedback').textContent = '';
    document.getElementById('matching-feedback').textContent = '';
    document.getElementById('audio-feedback').textContent = '';
    document.getElementById('audio-answer').value = '';

    // Specific resets for each mode
    if (mode === 'matching') {
        const termsContainer = document.getElementById('matching-terms');
        const definitionsContainer = document.getElementById('matching-definitions');
        termsContainer.innerHTML = '';
        definitionsContainer.innerHTML = '';
        matchingPairs = [];
        selectedMatchingCard = null;
    }
}

function updateScore(mode) {
    let scoreElementId;
    switch (mode) {
        case 'multiple-choice': scoreElementId = 'mc-score'; break;
        case 'matching': scoreElementId = 'matching-score'; break;
        case 'flashcards': scoreElementId = 'flashcard-score'; break;
        case 'audio-quiz': scoreElementId = 'audio-score'; break;
        default: return;
    }
    document.getElementById(scoreElementId).textContent = `Score: ${score} / ${vocabulary.length}`;
}

// --- Multiple Choice Mode (Visual Learning) ---
function loadMultipleChoiceQuestion() {
    const feedbackElement = document.getElementById('mc-feedback');
    feedbackElement.textContent = ''; // Clear previous feedback

    if (currentQuestionIndex >= shuffledVocabulary.length) {
        document.getElementById('mc-question').textContent = 'Quiz Finished! Your final score is shown below.';
        document.getElementById('mc-options').innerHTML = '';
        // RTApps platform integration (plan 4b): report the run's score to the embedding page.
        if (window.RTApps) window.RTApps.reportResult(score, vocabulary.length);
        return;
    }

    const currentQuestion = shuffledVocabulary[currentQuestionIndex];
    const questionText = `What is the definition of "${currentQuestion.term}"?`;
    document.getElementById('mc-question').textContent = questionText;

    const correctOption = currentQuestion.definition;
    const incorrectOptions = shuffleArray(vocabulary.filter(vocab => vocab.definition !== correctOption))
        .slice(0, 3) // Get 3 unique incorrect options
        .map(vocab => vocab.definition);
    const allOptions = shuffleArray([...incorrectOptions, correctOption]);

    const optionsContainer = document.getElementById('mc-options');
    optionsContainer.innerHTML = '';

    allOptions.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option;
        button.classList.add('option-button');
        button.onclick = () => checkMultipleChoiceAnswer(option, correctOption);
        optionsContainer.appendChild(button);
    });
}

function checkMultipleChoiceAnswer(selectedAnswer, correctAnswer) {
    const feedbackElement = document.getElementById('mc-feedback');
    if (selectedAnswer === correctAnswer) {
        feedbackElement.textContent = 'Correct!';
        feedbackElement.className = 'answer-feedback correct';
        score++;
    } else {
        feedbackElement.textContent = `Incorrect. The correct answer is: ${correctAnswer}`;
        feedbackElement.className = 'answer-feedback incorrect';
    }
    // Disable all buttons after an answer is chosen
    document.querySelectorAll('#mc-options .option-button').forEach(button => button.disabled = true);
    updateScore('multiple-choice');
}

function nextQuestion() {
    currentQuestionIndex++;
    loadMultipleChoiceQuestion();
    // Re-enable buttons for next question if any
    document.querySelectorAll('#mc-options .option-button').forEach(button => button.disabled = false);
}

// --- Matching Pairs Mode (Visual/Kinesthetic Learning) ---
function loadMatchingPairs() {
    // Build base pairs (each with a unique id for the term)
    const pairs = vocabulary.map(v => ({
        term: v.term,
        definition: v.definition,
        termId: crypto.randomUUID(),
        matched: false
    }));

    // Shuffle terms and definitions independently
    const termsData = shuffleArray(pairs.map(p => ({
        id: p.termId,
        text: p.term,
        type: 'term',
        matched: false
    })));

    const definitionsData = shuffleArray(pairs.map(p => ({
        id: crypto.randomUUID(),
        text: p.definition,
        type: 'definition',
        matched: false,
        correctTermId: p.termId
    })));

    matchingPairs = { terms: termsData, definitions: definitionsData };

    const termsContainer = document.getElementById('matching-terms');
    const definitionsContainer = document.getElementById('matching-definitions');

    termsContainer.innerHTML = '';
    definitionsContainer.innerHTML = '';

    matchingPairs.terms.forEach(item => {
        const div = document.createElement('div');
        div.textContent = item.text;
        div.classList.add('match-card');
        div.draggable = true;
        div.dataset.id = item.id;
        div.dataset.type = item.type;
        div.addEventListener('dragstart', dragStartMatching);
        termsContainer.appendChild(div);
    });

    matchingPairs.definitions.forEach(item => {
        const div = document.createElement('div');
        div.textContent = item.text;
        div.classList.add('match-card');
        div.dataset.id = item.id;
        div.dataset.type = item.type;
        div.dataset.correctTermId = item.correctTermId; // Store the ID of the correct term for matching
        div.addEventListener('dragover', dragOverMatching);
        div.addEventListener('drop', dropMatching);
        definitionsContainer.appendChild(div);
    });
}

function dragStartMatching(event) {
    selectedMatchingCard = event.target;
    event.dataTransfer.setData('text/plain', event.target.dataset.id); // Transfer the ID of the dragged term
}

function dragOverMatching(event) {
    event.preventDefault(); // Allow drop
}

function dropMatching(event) {
    event.preventDefault();
    const draggedTermId = event.dataTransfer.getData('text/plain');
    const droppedOnDefinitionCard = event.target;

    const draggedTermCard = document.querySelector(`.match-card[data-id="${draggedTermId}"][data-type="term"]`);

    if (draggedTermCard && droppedOnDefinitionCard.dataset.type === 'definition') {
        const feedbackElement = document.getElementById('matching-feedback');
        if (droppedOnDefinitionCard.dataset.correctTermId === draggedTermId) {
            droppedOnDefinitionCard.style.backgroundColor = '#d4edda'; // Correct color
            draggedTermCard.style.backgroundColor = '#d4edda'; // Correct color
            draggedTermCard.draggable = false;
            droppedOnDefinitionCard.removeEventListener('dragover', dragOverMatching);
            droppedOnDefinitionCard.removeEventListener('drop', dropMatching);
            score++;
            updateScore('matching');
            feedbackElement.textContent = 'Match found!';
            feedbackElement.className = 'answer-feedback correct';
        } else {
            droppedOnDefinitionCard.style.backgroundColor = '#f8d7da'; // Incorrect color
            feedbackElement.textContent = 'Incorrect match. Try again.';
            feedbackElement.className = 'answer-feedback incorrect';
            setTimeout(() => {
                droppedOnDefinitionCard.style.backgroundColor = '#f9f9f9'; // Reset color
            }, 500);
        }
    }
    selectedMatchingCard = null;
}


function checkMatching() {
    const feedbackElement = document.getElementById('matching-feedback');
    if (score === vocabulary.length) {
        feedbackElement.textContent = 'All matches correct! Well done!';
        feedbackElement.className = 'answer-feedback correct';
        // RTApps platform integration (plan 4b): report the run's score to the embedding page.
        if (window.RTApps) window.RTApps.reportResult(score, vocabulary.length);
    } else {
        feedbackElement.textContent = `You have ${score} correct matches. Keep going!`;
        feedbackElement.className = 'answer-feedback';
    }
}

// --- Flashcards Mode (Visual Learning) ---
function showFlashcard() {
    const termDisplay = document.getElementById('flashcard-term');
    const definitionDisplay = document.getElementById('flashcard-definition');

    if (currentFlashcardIndex >= shuffledVocabulary.length) {
        termDisplay.textContent = 'Flashcards Finished!';
        definitionDisplay.style.display = 'none';
        return;
    }
    const currentCard = shuffledVocabulary[currentFlashcardIndex];
    termDisplay.textContent = currentCard.term;
    definitionDisplay.textContent = currentCard.definition;
    definitionDisplay.style.display = 'none'; // Hide definition by default
    updateScore('flashcards');
}

function toggleDefinition() {
    const definitionElement = document.getElementById('flashcard-definition');
    definitionElement.style.display = definitionElement.style.display === 'none' ? 'block' : 'none';
}

function nextFlashcard() {
    // In flashcard mode, score is not based on correct answer but on completion
    // You could add a "I got it right" button to count for a score if desired.
    currentFlashcardIndex++;
    showFlashcard();
}

// --- Audio Quiz Mode (Auditory Learning) ---
let recognition; // Declare SpeechRecognition object
let recognizing = false; // Flag to indicate if recognition is active

function setupSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn("Speech Recognition not supported in this browser.");
        const audioQuizButton = Array.from(document.querySelectorAll('.game-mode-button')).find(button => button.textContent === 'Audio Quiz');
        if (audioQuizButton) {
            audioQuizButton.disabled = true;
            audioQuizButton.textContent = 'Audio Quiz (Not Supported)';
        }
        return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false; // Only recognize a single phrase
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        recognizing = true;
        document.getElementById('audio-feedback').textContent = 'Listening... Say the term.';
        document.getElementById('audio-feedback').className = 'answer-feedback';
    };

    recognition.onresult = (event) => {
        recognizing = false;
        const spokenText = event.results[0][0].transcript.trim().toLowerCase();
        console.log('Spoken text:', spokenText);
        checkAudioAnswer(spokenText);
    };

    recognition.onerror = (event) => {
        recognizing = false;
        console.error('Speech recognition error:', event.error);
        document.getElementById('audio-feedback').textContent = `Error: ${event.error}. Try again.`;
        document.getElementById('audio-feedback').className = 'answer-feedback incorrect';
    };

    recognition.onend = () => {
        recognizing = false;
        if (document.getElementById('audio-feedback').textContent === 'Listening... Say the term.') {
             document.getElementById('audio-feedback').textContent = 'No speech detected.';
             document.getElementById('audio-feedback').className = 'answer-feedback incorrect';
        }
    };
    return recognition;
}

function loadAudioQuestion() {
    document.getElementById('audio-answer').value = ''; // Clear input field
    document.getElementById('audio-feedback').textContent = ''; // Clear feedback

    if (currentQuestionIndex >= shuffledVocabulary.length) {
        document.getElementById('audio-definition').textContent = 'Quiz Finished! Your final score is shown below.';
        // Hide relevant buttons/input
        document.querySelector('#audio-quiz-game button:nth-child(2)').style.display = 'none'; // Play Definition
        document.getElementById('audio-answer').style.display = 'none'; // Input field
        document.querySelector('#audio-quiz-game button:nth-child(4)').style.display = 'none'; // Check Answer
        document.querySelector('#audio-quiz-game button:nth-child(5)').style.display = 'none'; // Next Question
        // RTApps platform integration (plan 4b): report the run's score to the embedding page.
        if (window.RTApps) window.RTApps.reportResult(score, vocabulary.length);
        return;
    }

    currentAudioQuestion = shuffledVocabulary[currentQuestionIndex];
    document.getElementById('audio-definition').textContent = currentAudioQuestion.definition;
    document.getElementById('audio-answer').focus(); // Focus input for manual typing if desired
    updateScore('audio-quiz');
}

function speakDefinition() {
    if (synth.speaking) {
        synth.cancel(); // Stop any ongoing speech
    }
    const utterThis = new SpeechSynthesisUtterance(currentAudioQuestion.definition);
    utterThis.onend = () => {
        // Once speech ends, trigger recognition
        if (recognition && !recognizing) {
            try {
                 recognition.start();
            } catch (e) {
                 console.warn("Recognition start failed:", e);
                 document.getElementById('audio-feedback').textContent = "Microphone busy or recognition failed to start. Try again.";
                 document.getElementById('audio-feedback').className = 'answer-feedback incorrect';
            }
        }
    };
    utterThis.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
    };
    synth.speak(utterThis);
}

function checkAudioAnswer(spokenText = '') {
    const userAnswer = spokenText || document.getElementById('audio-answer').value.trim().toLowerCase();
    const correctAnswer = currentAudioQuestion.term.toLowerCase();
    const feedbackElement = document.getElementById('audio-feedback');

    // Simple comparison. Could enhance with fuzzy matching if needed.
    if (userAnswer === correctAnswer) {
        feedbackElement.textContent = 'Correct!';
        feedbackElement.className = 'answer-feedback correct';
        score++;
    } else {
        feedbackElement.textContent = `Incorrect. You said "${userAnswer}". The correct answer is: "${currentAudioQuestion.term}"`;
        feedbackElement.className = 'answer-feedback incorrect';
    }
    updateScore('audio-quiz');
}

function nextAudioQuestion() {
    currentQuestionIndex++;
    loadAudioQuestion();
}

// Initial setup on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.game-container').forEach(container => container.style.display = 'none');
    setupSpeechRecognition(); // Initialize speech recognition API
});
