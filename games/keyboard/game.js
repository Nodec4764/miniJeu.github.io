/**
 * Mini-Jeu: Clavier Alarme (Simon Says)
 */

// DOM Elements
const displayGrid = document.getElementById('display-grid');
const keypadGrid = document.getElementById('keypad-grid');
const leds = [
    document.getElementById('led-1'),
    document.getElementById('led-2'),
    document.getElementById('led-3'),
    document.getElementById('led-4')
];
const timerDisplay = document.getElementById('timer-display');

// Game State
let state = {
    round: 1, // 1 to 4
    sequence: [],
    playerIndex: 0,
    isPlaying: false,
    isGameOver: false,
    flashSpeed: 600, // ms between flashes
    flashDuration: 300, // ms the light stays on
    timeRemaining: 0,
    timerInterval: null
};

const ROUND_LENGTHS = [3, 4, 5, 6]; // Number of flashes per round

// Initialize Grids (4x4 = 16 cells)
function initGrids() {
    for (let i = 0; i < 16; i++) {
        // Display cell
        const displayCell = document.createElement('div');
        displayCell.className = 'display-cell';
        displayCell.id = `display-${i}`;
        displayGrid.appendChild(displayCell);

        // Keypad button
        const keypadBtn = document.createElement('button');
        keypadBtn.className = 'keypad-btn';
        keypadBtn.dataset.index = i;
        keypadBtn.addEventListener('mousedown', () => handleKeyPress(i, keypadBtn));

        // Touch support for fast mobile interaction
        keypadBtn.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent double firing
            handleKeyPress(i, keypadBtn);
        }, { passive: false });

        keypadGrid.appendChild(keypadBtn);
    }
}

// Generate a completely new random sequence for the current round
function generateSequence(length) {
    const seq = [];
    for (let i = 0; i < length; i++) {
        seq.push(Math.floor(Math.random() * 16));
    }
    return seq;
}

// Flash a specific display cell
function flashDisplayCell(index) {
    return new Promise(resolve => {
        const cell = document.getElementById(`display-${index}`);
        cell.classList.add('active-blue');

        setTimeout(() => {
            cell.classList.remove('active-blue');
            resolve();
        }, state.flashDuration);
    });
}

// Play the sequence on the display
async function playSequence() {
    state.isPlaying = true;
    keypadGrid.classList.remove('active'); // Disable input

    // Small delay before starting
    await new Promise(r => setTimeout(r, 1000));

    for (let i = 0; i < state.sequence.length; i++) {
        if (state.isGameOver) return; // Abort if game ended unexpectedly

        await flashDisplayCell(state.sequence[i]);

        // Delay between flashes
        await new Promise(r => setTimeout(r, state.flashSpeed - state.flashDuration));
    }

    // Sequence done, player's turn
    state.isPlaying = false;
    state.playerIndex = 0;
    keypadGrid.classList.add('active'); // Enable input

    // Start Global Timer
    const roundTime = state.sequence.length * 4;
    startTimer(roundTime);
}

// Format seconds to MM:SS
function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// Timer logic
function startTimer(seconds) {
    state.timeRemaining = seconds;
    timerDisplay.textContent = formatTime(state.timeRemaining);

    state.timerInterval = setInterval(() => {
        state.timeRemaining--;
        timerDisplay.textContent = formatTime(state.timeRemaining);

        if (state.timeRemaining <= 0) {
            stopTimer();
            gameOver(false); // Time out = Failure
        }
    }, 1000);
}

function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

// Handle player input
function handleKeyPress(index, btnElement) {
    if (state.isPlaying || state.isGameOver || !keypadGrid.classList.contains('active')) return;

    // Visual feedback
    btnElement.classList.add('active-blue');
    setTimeout(() => btnElement.classList.remove('active-blue'), 150);

    // Check logic
    const expectedIndex = state.sequence[state.playerIndex];

    if (index === expectedIndex) {
        // Correct press
        state.playerIndex++;

        // Did player finish the sequence for this round?
        if (state.playerIndex === state.sequence.length) {
            handleRoundWin();
        }
    } else {
        // Wrong press
        gameOver(false);
    }
}

// Round Success
function handleRoundWin() {
    keypadGrid.classList.remove('active'); // Disable input
    stopTimer();


    // Light up the corresponding LED
    leds[state.round - 1].classList.add('green');

    if (state.round === 4) {
        // All rounds completed!
        gameOver(true);
    } else {
        // Next round
        state.round++;
        setTimeout(startRound, 1000);
    }
}

// Start a specific round
function startRound() {
    if (state.isGameOver) return;
    const currentLength = ROUND_LENGTHS[state.round - 1];
    state.sequence = generateSequence(currentLength);
    playSequence();
}

/**
 * NOTIFICATION FIVEM EXTERNE
 */
function sendCloseSignal(isSuccess) {
    setTimeout(() => {
        fetch('https://external-iframe/leave', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ success: isSuccess })
        }).catch(() => {
            // Silencieux : Ignore l'erreur réseau lors de tests hors FiveM
        });
    }, 1000); // Délai de 1 seconde pour laisser le temps de lire l'écran LCD
}

// End Game
function gameOver(win) {
    state.isGameOver = true;
    state.isPlaying = false;
    keypadGrid.classList.remove('active');
    stopTimer();

    if (win) {
        // Flash all LEDs green
        leds.forEach(led => {
            led.className = 'led blink-green';
        });
        sendCloseSignal(true);
    } else {
        // Flash all LEDs red
        leds.forEach(led => {
            led.className = 'led blink-red';
        });
        sendCloseSignal(false);
    }
}

// Boot
initGrids();
startRound();
