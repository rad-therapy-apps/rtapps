// --- Anatomy Quiz Question Bank with Images and Sections ---

const imagingPlaneImages = {
    sagittal: "https://www.humanbiomedia.org/illustrations/body-introduction/anatomical-planes/sagittal-plane.png",
    coronal: "https://www.humanbiomedia.org/illustrations/body-introduction/anatomical-planes/frontal-plane.png",
    axial: "https://www.humanbiomedia.org/illustrations/body-introduction/anatomical-planes/transverse-plane.png",
    oblique: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT6IF265roHOKuUmouXRg36s5PZDCWRl7F4PA&s"
};

const anatomyQuestions = {
    imagingPlanes: [
        {
            question: "Which anatomical plane divides the body into left and right sections?",
            options: ["Coronal (frontal)", "Sagittal", "Transverse (axial)", "Oblique"],
            correctAnswer: "Sagittal",
            imageUrl: imagingPlaneImages.sagittal
        },
        {
            question: "The coronal (frontal) plane divides the body into:",
            options: ["Superior and inferior parts", "Anterior and posterior parts", "Left and right parts", "Medial and lateral parts"],
            correctAnswer: "Anterior and posterior parts",
            imageUrl: imagingPlaneImages.coronal
        },
        {
            question: "A CT scan image obtained parallel to the ground when a patient is supine is in which plane?",
            options: ["Sagittal", "Coronal", "Transverse (axial)", "Oblique"],
            correctAnswer: "Transverse (axial)",
            imageUrl: imagingPlaneImages.axial
        },
        {
            question: "Which plane is also called the horizontal plane?",
            options: ["Transverse (axial)", "Sagittal", "Coronal", "Oblique"],
            correctAnswer: "Transverse (axial)",
            imageUrl: imagingPlaneImages.axial
        },
        {
            question: "The sagittal plane that divides the body exactly at the midline is called the:",
            options: ["Midsagittal plane", "Parasagittal plane", "Coronal plane", "Oblique plane"],
            correctAnswer: "Midsagittal plane",
            imageUrl: imagingPlaneImages.sagittal
        },
        {
            question: "A cut made at an angle that is not perpendicular or parallel to the body planes is called:",
            options: ["Sagittal", "Coronal", "Transverse", "Oblique"],
            correctAnswer: "Oblique",
            imageUrl: imagingPlaneImages.oblique
        },
        {
            question: "Which plane would show both right and left kidneys in a single image slice?",
            options: ["Sagittal", "Coronal", "Transverse (axial)", "Oblique"],
            correctAnswer: "Coronal",
            imageUrl: imagingPlaneImages.coronal
        },
        {
            question: "In medical imaging, the plane running perpendicular to both the sagittal and coronal planes is the:",
            options: ["Oblique", "Transverse (axial)", "Coronal", "Parasagittal"],
            correctAnswer: "Transverse (axial)",
            imageUrl: imagingPlaneImages.axial
        }
    ],
    terminology: [
        {
            question: "The term 'medial' refers to:",
            options: ["Toward the side", "Toward the midline", "Toward the back", "Toward the head"],
            correctAnswer: "Toward the midline"
        },
        {
            question: "Which term best describes 'away from the midline'?",
            options: ["Medial", "Lateral", "Inferior", "Superior"],
            correctAnswer: "Lateral"
        },
        {
            question: "A structure located toward the front of the body is described as:",
            options: ["Posterior", "Anterior", "Inferior", "Superficial"],
            correctAnswer: "Anterior"
        },
        {
            question: "The term 'superior' refers to a structure:",
            options: ["Closer to the feet", "Closer to the head", "Closer to the midline", "Closer to the back"],
            correctAnswer: "Closer to the head"
        },
        {
            question: "The opposite of 'proximal' is:",
            options: ["Distal", "Medial", "Superior", "Anterior"],
            correctAnswer: "Distal"
        },
        {
            question: "A lesion located on the surface of the skin is described as:",
            options: ["Deep", "Superficial", "Medial", "Distal"],
            correctAnswer: "Superficial"
        },
        {
            question: "The term 'contralateral' means:",
            options: ["On the same side", "On the opposite side", "Toward the midline", "Toward the surface"],
            correctAnswer: "On the opposite side"
        },
        {
            question: "Which term refers to 'closer to the point of attachment'?",
            options: ["Distal", "Proximal", "Inferior", "Posterior"],
            correctAnswer: "Proximal"
        },
        {
            question: "The dorsal aspect of the body refers to the:",
            options: ["Front", "Back", "Side", "Top"],
            correctAnswer: "Back"
        },
        {
            question: "Which direction does 'caudal' refer to?",
            options: ["Toward the head", "Toward the feet", "Toward the midline", "Toward the front"],
            correctAnswer: "Toward the feet"
        },
        {
            question: "In CT images, which orientation label usually means 'toward the patient's feet'?",
            options: ["Cephalad", "Caudal", "Posterior", "Lateral"],
            correctAnswer: "Caudal"
        },
        {
            question: "The ventral aspect of the body is also known as the:",
            options: ["Posterior", "Anterior", "Superior", "Deep"],
            correctAnswer: "Anterior"
        }
    ]
};

// --- Quiz Mode Selection and Question Pooling ---

// Read mode from URL
const mode = new URLSearchParams(window.location.search).get('mode') || 'comprehensive';
let questionsBank = [];
if (mode === 'planes') {
    questionsBank = anatomyQuestions.imagingPlanes.slice();
} else if (mode === 'terminology') {
    questionsBank = anatomyQuestions.terminology.slice();
} else {
    questionsBank = [...anatomyQuestions.imagingPlanes, ...anatomyQuestions.terminology];
}

// --- Quiz Game Logic ---

let currentQuestionIndex = 0;
let score = 0;
let shuffledQuestions = [];

// DOM references (assume these exist in your HTML)
const questionElement = document.querySelector('.question');
const optionsContainer = document.querySelector('.options-container');
const feedbackElement = document.querySelector('.feedback');
const nextButton = document.querySelector('.next-button');
const restartButton = document.querySelector('.restart-button');
const scoreElement = document.querySelector('.score-value');
const progressElement = document.querySelector('.progress');
const imageContainerClass = 'image-plane-container';
const menuButton = document.querySelector('.menu-button');

// Shuffle function
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Setup or restart game
function setupGame() {
    shuffledQuestions = questionsBank.map(q => Object.assign({}, q));
    shuffleArray(shuffledQuestions);
    currentQuestionIndex = 0;
    score = 0;
    scoreElement.textContent = score;
    nextButton.style.display = "";
    restartButton.style.display = "none";
    if (menuButton) menuButton.style.display = "none";
    feedbackElement.textContent = "";
    loadQuestion();
}

// Display current question, including an image if provided
function loadQuestion() {
    const currentQuestion = shuffledQuestions[currentQuestionIndex];
    // Remove any previous image
    const prevImage = document.querySelector('.' + imageContainerClass);
    if (prevImage) prevImage.remove();

    questionElement.textContent = currentQuestion.question;
    // Insert image if available
    if (currentQuestion.imageUrl) {
        const imgDiv = document.createElement('div');
        imgDiv.className = imageContainerClass;
        imgDiv.innerHTML = `<img src="${currentQuestion.imageUrl}" alt="Imaging plane" style="max-width:250px;max-height:180px;display:block;margin:0 auto 12px;"/>`;
        questionElement.parentNode.insertBefore(imgDiv, questionElement);
    }

    optionsContainer.innerHTML = "";
    feedbackElement.textContent = "";
    progressElement.textContent = `Question ${currentQuestionIndex + 1} of ${shuffledQuestions.length}`;

    // Shuffle options per question
    const shuffledOptions = currentQuestion.options.slice();
    shuffleArray(shuffledOptions);

    shuffledOptions.forEach(option => {
        const optionElement = document.createElement('div');
        optionElement.classList.add('option');
        optionElement.textContent = option;
        optionElement.setAttribute('tabindex', 0);
        optionElement.addEventListener('click', () => checkAnswer(option));
        optionsContainer.appendChild(optionElement);
    });

    nextButton.disabled = true;
    document.onkeydown = function(e) {
        if (nextButton.disabled) {
            const key = e.key.toLowerCase();
            let idx = -1;
            if (key >= '1' && key <= String(shuffledOptions.length)) {
                idx = parseInt(key) - 1;
            } else if (key >= 'a' && key <= 'd') {
                idx = key.charCodeAt(0) - 'a'.charCodeAt(0);
            }
            if (idx >= 0 && idx < shuffledOptions.length) {
                checkAnswer(shuffledOptions[idx]);
            }
        }
    };
}

function checkAnswer(selectedOption) {
    const currentQuestion = shuffledQuestions[currentQuestionIndex];
    const options = document.querySelectorAll('.option');
    options.forEach(option => {
        option.classList.remove('correct', 'incorrect');
        option.style.pointerEvents = 'none';
    });

    if (selectedOption === currentQuestion.correctAnswer) {
        options.forEach(option => {
            if (option.textContent === selectedOption) {
                option.classList.add('correct');
            }
        });
        feedbackElement.textContent = "✓ Correct!";
        score++;
        scoreElement.textContent = score;
    } else {
        options.forEach(option => {
            if (option.textContent === selectedOption) {
                option.classList.add('incorrect');
            }
            if (option.textContent === currentQuestion.correctAnswer) {
                option.classList.add('correct');
            }
        });
        feedbackElement.textContent = "✗ Incorrect. The correct answer is " + currentQuestion.correctAnswer;
    }
    nextButton.disabled = false;
    document.onkeydown = null;
}

// --- Speech Recognition Option ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let isListening = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        isListening = true;
        document.getElementById('mic-icon').textContent = '🎙️';
    };
    recognition.onend = () => {
        isListening = false;
        document.getElementById('mic-icon').textContent = '🎤';
    };
    recognition.onerror = (event) => {
        alert('Speech recognition error: ' + event.error);
    };
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim().toLowerCase();
        matchSpokenOption(transcript);
    };
}

const micBtn = document.getElementById('mic-btn');
if (micBtn) {
    micBtn.onclick = () => {
        if (!recognition) return alert('Speech recognition not supported in this browser.');
        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    };
}

function matchSpokenOption(transcript) {
    // Match the spoken answer to option text or option number/letter
    const options = Array.from(document.querySelectorAll('.option'));
    let found = false;
    options.forEach((option, idx) => {
        const optText = option.textContent.trim().toLowerCase();
        // Accept "first/second/third/fourth" or "one/two/three/four" or "a/b/c/d"
        const spokenNumber = ['first', 'second', 'third', 'fourth', 'one', 'two', 'three', 'four', 'a', 'b', 'c', 'd'];
        if (
            transcript === optText ||
            transcript === (idx + 1).toString() ||
            transcript === String.fromCharCode(97 + idx) || // 'a' = 97
            transcript === spokenNumber[idx] // Accept word numbers
        ) {
            option.click();
            found = true;
        }
    });
    if (!found) {
        // Try partial match
        const match = options.find(option => transcript.includes(option.textContent.trim().toLowerCase()));
        if (match) match.click();
        else alert('Could not match your answer. Please try again.');
    }
}

function loadNextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < shuffledQuestions.length) {
        loadQuestion();
    } else {
        showResults();
        questionElement.textContent = "Quiz Completed!";
        optionsContainer.innerHTML = "";
        progressElement.textContent = "";
        nextButton.style.display = "none";
        restartButton.style.display = "";
        if (menuButton) menuButton.style.display = "";
        document.onkeydown = null;
    }
}

function showResults() {
    feedbackElement.textContent = `Your final score is ${score} out of ${shuffledQuestions.length}`;
    // Optionally display a badge or certificate here
    // RTApps platform integration (plan 4b): report the run's score to the embedding page.
    if (window.RTApps) window.RTApps.reportResult(score, shuffledQuestions.length);
}

if (menuButton) {
    menuButton.addEventListener('click', () => {
        window.location.href = "index.html";
    });
}

nextButton.addEventListener('click', loadNextQuestion);
restartButton.addEventListener('click', setupGame);
setupGame();
