// ============ Data ============
const radUnitsQuestions = [
    { question: "Which SI unit is used to measure absorbed dose?", options: ["Sievert", "Gray", "Becquerel", "Coulomb/kg"], correct: "Gray" },
    { question: "The Sievert (Sv) is the SI unit for:", options: ["Absorbed dose", "Equivalent dose", "Radioactivity", "Exposure"], correct: "Equivalent dose" },
    { question: "The SI unit for radioactivity is:", options: ["Becquerel", "Sievert", "Gray", "Coulomb/kg"], correct: "Becquerel" },
    { question: "What does 1 Becquerel represent?", options: ["1 J/kg", "1 decay/second", "1 C/kg", "1 Sievert"], correct: "1 decay/second" },
    { question: "The SI unit for exposure (air ionization) is:", options: ["Coulomb/kg", "Gray", "Sievert", "Becquerel"], correct: "Coulomb/kg" },
    { question: "How many Joules per kilogram are in 1 Gray?", options: ["1", "10", "100", "1000"], correct: "1" },
    { question: "Which quantity does the Gray (Gy) measure?", options: ["Absorbed dose", "Equivalent dose", "Radioactivity", "Exposure"], correct: "Absorbed dose" },
    { question: "Which SI unit is used to express the biological effect of radiation?", options: ["Sievert", "Gray", "Becquerel", "Coulomb/kg"], correct: "Sievert" },
    { question: "A dose of 2 Gy is equal to how many Joules absorbed per kg?", options: ["2 J/kg", "20 J/kg", "0.2 J/kg", "200 J/kg"], correct: "2 J/kg" },
    { question: "What does a reading of 1000 Bq mean?", options: ["1000 decays per minute", "1000 decays per second", "1000 J/kg", "1000 C/kg"], correct: "1000 decays per second" },
    { question: "What is the SI unit symbol for exposure?", options: ["C/kg", "Gy", "Sv", "Bq"], correct: "C/kg" },
    { question: "Which unit is used for activity concentration in SI?", options: ["Bq/kg", "Sv/kg", "Gy/kg", "C/kg"], correct: "Bq/kg" },
    { question: "Which of the following is a derived SI unit?", options: ["Gray", "Sievert", "Becquerel", "All of the above"], correct: "All of the above" },
    { question: "Which SI unit is equivalent to 1 J/kg?", options: ["1 Gray", "1 Sievert", "1 Becquerel", "1 C/kg"], correct: "1 Gray" },
    { question: "Which SI unit is used for effective dose?", options: ["Sievert", "Gray", "Becquerel", "Coulomb/kg"], correct: "Sievert" },
    { question: "The SI unit for measuring the rate of nuclear decay is:", options: ["Becquerel", "Gray", "Sievert", "Coulomb/kg"], correct: "Becquerel" },
    { question: "Which of the following is NOT an SI unit?", options: ["Gray", "Sievert", "Becquerel", "Rem"], correct: "Rem" },
    { question: "Which SI unit replaced the traditional unit 'rad'?", options: ["Gray", "Sievert", "Becquerel", "Coulomb/kg"], correct: "Gray" },
    { question: "Which SI unit replaced the traditional unit 'rem'?", options: ["Sievert", "Gray", "Becquerel", "Coulomb/kg"], correct: "Sievert" },
    { question: "Which SI unit replaced the traditional unit 'Curie'?", options: ["Becquerel", "Sievert", "Gray", "Coulomb/kg"], correct: "Becquerel" }
];

const radUnitsPairs = radUnitsQuestions.map(q => ({
    term: q.correct,
    definition: q.question
}));

// ============ Utility ============
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
function playAudio(id) {
    let audio = document.getElementById(id);
    if (audio) { audio.currentTime = 0; audio.play(); }
}
function getQSParam(name) {
    let params = new URLSearchParams(window.location.search);
    return params.get(name);
}

// ============ Badge Logic ============
function badgeHTML(score, total) {
    let percent = (score / total) * 100;
    if (percent === 100) return `<div class="badge gold">🏆 Gold Badge: Radiation Master!</div>`;
    if (percent >= 80) return `<div class="badge silver">🥈 Silver Badge: Radiation Scholar!</div>`;
    if (percent >= 60) return `<div class="badge bronze">🥉 Bronze Badge: Radiation Learner!</div>`;
    return `<div class="badge">Keep practicing to earn a badge!</div>`;
}

// ============ Main App ============
document.addEventListener('DOMContentLoaded', () => {
    const mode = getQSParam('mode');
    if (!mode) return; // On menu.html, do nothing

    const gameArea = document.getElementById('game-area');
    const badgeArea = document.getElementById('badge-area');
    const scoreArea = document.getElementById('score-area');

    // ========== MULTIPLE CHOICE ==========
    if (mode === "choice") {
        let questions = radUnitsQuestions.slice();
        shuffle(questions);
        let idx = 0;
        let score = 0;
        let difficulty = "practice";
        let timer = null, timeLeft = 0;
        let timeLimit = 0;
        let allowTime = false;

        function renderSettings() {
            return `
                <div class="difficulty-select">
                    <label for="difficulty">Difficulty:</label>
                    <select id="difficulty">
                        <option value="practice">Practice/Easy (No Timer)</option>
                        <option value="medium">Medium (20s per Q)</option>
                        <option value="hard">Hard (12s per Q)</option>
                    </select>
                </div>
            `;
        }

        function renderQuestion() {
            const q = questions[idx];
            let opts = q.options.slice();
            shuffle(opts);
            return `
                <div class="progress">Question ${idx + 1} of ${questions.length}</div>
                <div class="timer" id="timer"></div>
                <div class="question">${q.question}</div>
                <div class="options">
                    ${opts.map(opt => `<button class="option-btn">${opt}</button>`).join('')}
                </div>
                <div class="feedback" id="feedback"></div>
                <div class="controls">
                    <button id="next-btn" disabled>Next</button>
                    <button id="restart-btn" style="display:none;">Restart</button>
                </div>
            `;
        }

        function setDifficultyFromSelect() {
            difficulty = document.getElementById('difficulty').value;
            allowTime = (difficulty !== "practice");
            timeLimit = (difficulty === "medium") ? 20 : (difficulty === "hard") ? 12 : 0;
        }

        function startTimer() {
            if (!allowTime) return;
            timeLeft = timeLimit;
            const timerDiv = document.getElementById('timer');
            timerDiv.textContent = `⏳ Time: ${timeLeft}s`;
            timer = setInterval(() => {
                timeLeft--;
                timerDiv.textContent = `⏳ Time: ${timeLeft}s`;
                if (timeLeft <= 5 && timeLeft > 0) playAudio('audio-tick');
                if (timeLeft <= 0) {
                    stopTimer();
                    checkAnswer(null, true);
                }
            }, 1000);
        }
        function stopTimer() { if (timer) clearInterval(timer); timer = null; }

        function checkAnswer(selected, timedOut = false) {
            stopTimer();
            const q = questions[idx];
            const opts = Array.from(document.querySelectorAll('.option-btn'));
            opts.forEach(btn => {
                btn.disabled = true;
                if (btn.textContent === q.correct) btn.classList.add('correct');
                if (btn.textContent === selected && btn.textContent !== q.correct) btn.classList.add('incorrect');
            });
            const feedback = document.getElementById('feedback');
            if (timedOut) {
                playAudio('audio-timeup');
                feedback.textContent = `⏰ Time's up! Correct: ${q.correct}`;
            } else if (selected === q.correct) {
                playAudio('audio-correct');
                feedback.textContent = "✓ Correct!";
                score++;
            } else {
                playAudio('audio-incorrect');
                feedback.textContent = `✗ Incorrect. Correct: ${q.correct}`;
            }
            document.getElementById('next-btn').disabled = false;
        }

        function render() {
            gameArea.innerHTML = renderSettings() + renderQuestion();
            document.getElementById('difficulty').value = difficulty;
            document.getElementById('difficulty').onchange = () => {
                setDifficultyFromSelect();
                idx = 0; score = 0;
                shuffle(questions);
                render();
                updateScore();
            };
            document.querySelectorAll('.option-btn').forEach(btn => {
                btn.onclick = () => {
                    if (btn.disabled) return;
                    checkAnswer(btn.textContent);
                };
            });
            document.getElementById('next-btn').onclick = () => {
                idx++;
                if (idx < questions.length) {
                    render();
                    startTimer();
                    updateScore();
                } else {
                    finish();
                }
            };
            document.getElementById('restart-btn').onclick = () => {
                idx = 0; score = 0;
                shuffle(questions);
                render();
                updateScore();
                badgeArea.innerHTML = "";
            };
            setDifficultyFromSelect();
            startTimer();
            updateScore();
        }

        function finish() {
            playAudio('audio-complete');
            gameArea.innerHTML = `
                <div class="feedback">Quiz Completed! Your score: ${score} / ${questions.length}</div>
                <button id="restart-btn">Restart</button>
            `;
            badgeArea.innerHTML = badgeHTML(score, questions.length);
            document.getElementById('restart-btn').onclick = () => {
                idx = 0; score = 0;
                shuffle(questions);
                render();
                badgeArea.innerHTML = "";
            };
            updateScore();
            // RTApps platform integration (plan 4b): report the run's score to the embedding page.
            if (window.RTApps) window.RTApps.reportResult(score, questions.length);
        }

        function updateScore() {
            scoreArea.innerHTML = `<div class="score">Score: ${score} / ${questions.length}</div>`;
        }

        render();
    }

    // ========== MATCHING PAIRS ==========
    else if (mode === "matching") {
        let pairs = radUnitsPairs.slice();
        shuffle(pairs);
        let terms = pairs.map((p, i) => ({ ...p, id: i + "-t" }));
        let defs = pairs.map((p, i) => ({ ...p, id: i + "-d", termId: i + "-t" }));
        shuffle(terms);
        shuffle(defs);
        let matches = {};
        let score = 0;

        function renderMatching() {
            gameArea.innerHTML = `
                <div class="progress">Match all pairs</div>
                <div class="matching-area">
                    <div class="matching-terms">${terms.map(t =>
                        `<div class="match-term" draggable="true" data-id="${t.id}">${t.term}</div>`
                    ).join('')}</div>
                    <div class="matching-defs">${defs.map(d =>
                        `<div class="match-def" data-id="${d.id}" data-termid="${d.termId}">${d.definition}</div>`
                    ).join('')}</div>
                </div>
                <div class="feedback" id="feedback"></div>
                <button id="restart-btn">Restart</button>
            `;
            attachMatchingEvents();
            updateScore();
        }

        let dragged = null;
        function attachMatchingEvents() {
            document.querySelectorAll('.match-term').forEach(term => {
                term.ondragstart = (e) => {
                    dragged = term;
                    e.dataTransfer.effectAllowed = "move";
                };
            });
            document.querySelectorAll('.match-def').forEach(def => {
                def.ondragover = e => { e.preventDefault(); };
                def.ondrop = e => {
                    e.preventDefault();
                    if (!dragged) return;
                    if (def.dataset.termid === dragged.dataset.id) {
                        def.classList.add('correct');
                        dragged.style.visibility = "hidden";
                        score++;
                        playAudio('audio-correct');
                        document.getElementById('feedback').textContent = "Correct!";
                        if (score === terms.length) finishMatching();
                    } else {
                        def.classList.add('incorrect');
                        playAudio('audio-incorrect');
                        document.getElementById('feedback').textContent = "Try again.";
                        setTimeout(() => def.classList.remove('incorrect'), 700);
                    }
                    dragged = null;
                    updateScore();
                };
            });
            document.getElementById('restart-btn').onclick = () => {
                pairs = radUnitsPairs.slice();
                shuffle(pairs);
                terms = pairs.map((p, i) => ({ ...p, id: i + "-t" }));
                defs = pairs.map((p, i) => ({ ...p, id: i + "-d", termId: i + "-t" }));
                shuffle(terms);
                shuffle(defs);
                score = 0;
                renderMatching();
                badgeArea.innerHTML = "";
            };
        }
        function finishMatching() {
            badgeArea.innerHTML = badgeHTML(score, terms.length);
            document.getElementById('feedback').textContent = "All matched!";
            // RTApps platform integration (plan 4b): report the run's score to the embedding page.
            if (window.RTApps) window.RTApps.reportResult(score, terms.length);
        }
        function updateScore() {
            scoreArea.innerHTML = `<div class="score">Matches: ${score} / ${terms.length}</div>`;
        }
        renderMatching();
    }

    // ========== FLASHCARDS ==========
    else if (mode === "flashcards") {
        let cards = radUnitsPairs.slice();
        shuffle(cards);
        let idx = 0;

        function renderFlashcard() {
            let card = cards[idx];
            gameArea.innerHTML = `
                <div class="progress">Card ${idx+1} of ${cards.length}</div>
                <div class="flashcard">
                    <div class="term">${card.term}</div>
                    <button id="show-def">Show Definition</button>
                    <div class="definition" id="definition" style="display:none;">${card.definition}</div>
                </div>
                <div class="controls">
                    <button id="prev-card"${idx === 0 ? " disabled" : ""}>Previous</button>
                    <button id="next-card"${idx === cards.length - 1 ? " disabled" : ""}>Next</button>
                    <button id="restart-btn">Restart</button>
                </div>
            `;
            document.getElementById('show-def').onclick = () => {
                document.getElementById('definition').style.display = "";
            };
            document.getElementById('prev-card').onclick = () => { if (idx > 0) { idx--; renderFlashcard(); } };
            document.getElementById('next-card').onclick = () => { if (idx < cards.length - 1) { idx++; renderFlashcard(); } };
            document.getElementById('restart-btn').onclick = () => {
                shuffle(cards); idx = 0; renderFlashcard(); badgeArea.innerHTML = "";
            };
            scoreArea.innerHTML = "";
        }

        renderFlashcard();
    }

    // ========== AUDIO QUIZ ==========
    else if (mode === "audio") {
        let cards = radUnitsPairs.slice();
        shuffle(cards);
        let idx = 0;
        let score = 0;

        function renderAudioQuiz() {
            let card = cards[idx];
            gameArea.innerHTML = `
                <div class="progress">Question ${idx+1} of ${cards.length}</div>
                <div class="definition">${card.definition}</div>
                <button id="play-def">🔊 Play Definition</button>
                <input type="text" id="audio-answer" placeholder="Type your answer">
                <button id="submit-audio">Submit</button>
                <div class="feedback" id="feedback"></div>
                <div class="controls">
                    <button id="next-audio" disabled>Next</button>
                    <button id="restart-btn">Restart</button>
                </div>
            `;
            document.getElementById('play-def').onclick = () => {
                let synth = window.speechSynthesis;
                let utter = new SpeechSynthesisUtterance(card.definition);
                synth.speak(utter);
            };
            document.getElementById('submit-audio').onclick = () => {
                let ans = document.getElementById('audio-answer').value.trim().toLowerCase();
                let correct = card.term.toLowerCase();
                let fb = document.getElementById('feedback');
                if (ans === correct) {
                    fb.textContent = "Correct!";
                    playAudio('audio-correct');
                    score++;
                } else {
                    fb.textContent = `Incorrect. The correct answer is: ${card.term}`;
                    playAudio('audio-incorrect');
                }
                document.getElementById('next-audio').disabled = false;
            };
            document.getElementById('next-audio').onclick = () => {
                idx++;
                if (idx < cards.length) renderAudioQuiz();
                else finishAudio();
            };
            document.getElementById('restart-btn').onclick = () => {
                idx = 0; score = 0; shuffle(cards); renderAudioQuiz(); badgeArea.innerHTML = "";
            };
            scoreArea.innerHTML = `<div class="score">Score: ${score} / ${cards.length}</div>`;
        }
        function finishAudio() {
            playAudio('audio-complete');
            gameArea.innerHTML = `
                <div class="feedback">Quiz Finished! Final Score: ${score} / ${cards.length}</div>
                <button id="restart-btn">Restart</button>
            `;
            badgeArea.innerHTML = badgeHTML(score, cards.length);
            document.getElementById('restart-btn').onclick = () => {
                idx = 0; score = 0; shuffle(cards); renderAudioQuiz(); badgeArea.innerHTML = "";
            };
            scoreArea.innerHTML = `<div class="score">Score: ${score} / ${cards.length}</div>`;
            // RTApps platform integration (plan 4b): report the run's score to the embedding page.
            if (window.RTApps) window.RTApps.reportResult(score, cards.length);
        }
        renderAudioQuiz();
    }

});