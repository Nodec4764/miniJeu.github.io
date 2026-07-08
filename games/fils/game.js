/**
 * GLOBAL VARIABLES (Easily modifiable)
 */
const MAX_ERRORS = 3;
const TIME_LIMIT = 24; // in seconds

/**
 * GAME STATE
 */
let state = {
    errors: 0,
    timeLeft: TIME_LIMIT,
    screwsUnscrewed: 0,
    wiresConnected: 0,
    phase: 1, // 1: plate, 2: wires
    timerInterval: null,
    isGameOver: false,
    colors: ["red", "blue", "green", "yellow"],
    wireColorsHex: {
        "red": "#ff3333",
        "blue": "#3366ff",
        "green": "#33ff33",
        "yellow": "#ffff33"
    },
    draggedWire: null,
    connections: {}
};

// DOM Elements
const elTime = document.getElementById('time-val');
const elErr = document.getElementById('err-val');
const elMaxErr = document.getElementById('max-err-val');
const elMetalPlate = document.getElementById('metal-plate');
const elLeftNodes = document.getElementById('left-nodes');
const elRightNodes = document.getElementById('right-nodes');
const elWiresSvg = document.getElementById('wires-svg');
const canvas = document.getElementById('sparks-canvas');
const ctx = canvas.getContext('2d');

// Init UI limits
elMaxErr.innerText = MAX_ERRORS;
elTime.innerText = state.timeLeft;

/**
 * PARTICLES SYSTEM (Sparks)
 */
canvas.width = 800;
canvas.height = 500;
let particles = [];

function createSparks(x, y) {
    for (let i = 0; i < 30; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15 - 5,
            life: 1,
            decay: Math.random() * 0.05 + 0.03,
            color: Math.random() > 0.5 ? '#ffea00' : '#ffffff',
            size: Math.random() * 4 + 1
        });
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.5; // gravity for sparks
        p.life -= p.decay;

        if (p.life <= 0) {
            particles.splice(i, 1);
        } else {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1;
    if (!state.isGameOver || particles.length > 0) {
        requestAnimationFrame(animateParticles);
    }
}
requestAnimationFrame(animateParticles);

/**
 * GAME LOGIC
 */
function logToConsole(text, cssClass = "") {
    const consoleEl = document.getElementById('lcd-console');
    const line = document.createElement('div');
    line.className = 'console-line ' + cssClass;
    line.innerText = "> " + text;

    const blinker = consoleEl.querySelector('.blink');
    consoleEl.insertBefore(line, blinker);

    consoleEl.scrollTop = consoleEl.scrollHeight;
}

function initGame() {
    buildScrews();
    buildWires();
    startTimer();
}

function startTimer() {
    state.timerInterval = setInterval(() => {
        if (state.isGameOver) return;
        state.timeLeft--;
        elTime.innerText = state.timeLeft < 10 ? '0' + state.timeLeft : state.timeLeft;
        if (state.timeLeft <= 0) {
            gameOver(false, "TEMPS ÉCOULÉ");
        }
    }, 1000);
}

function addError(x, y) {
    state.errors++;
    elErr.innerText = state.errors;
    createSparks(x, y);
    if (state.errors >= MAX_ERRORS) {
        gameOver(false, "SÉCURITÉ DÉCLENCHÉE");
    }
}

/**
 * NOTIFICATION FIVEM EXTERNE
 * Envoie une requête POST pour informer le script Lua (via NUI) que le jeu est terminé.
 * Le .catch() silencieux évite de spammer la console d'erreurs lors de tests locaux en dehors de FiveM.
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

function gameOver(win, reason) {
    state.isGameOver = true;
    clearInterval(state.timerInterval);

    if (win) {
        logToConsole("SECURITY_BREACHED", "console-success");
        logToConsole("ACCESS_GRANTED", "console-success");
        sendCloseSignal(true);
    } else {
        if (reason) logToConsole(reason, "console-error");
        logToConsole("CRITICAL_FAILURE", "console-error");
        logToConsole("SYSTEM_LOCKDOWN", "console-error");
        sendCloseSignal(false);
    }
}

/**
 * PHASE 1: SCREWS (Hold mechanics)
 */
function buildScrews() {
    const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    positions.forEach(pos => {
        const hole = document.createElement('div');
        hole.className = `screw-hole ${pos}`;
        elMetalPlate.appendChild(hole);

        const screw = document.createElement('div');
        screw.className = `screw-container ${pos}`;
        screw.innerHTML = `
            <svg class="screw-svg" width="40" height="40" viewBox="0 0 40 40">
                <!-- Screw body -->
                <circle cx="20" cy="20" r="18" fill="url(#silver-grad)" stroke="#111" stroke-width="2"/>
                <!-- Cross head -->
                <path d="M 12 20 L 28 20 M 20 12 L 20 28" stroke="#222" stroke-width="4" stroke-linecap="round"/>
                <!-- Center dot for depth -->
                <circle cx="20" cy="20" r="3" fill="#111"/>
            </svg>
        `;

        let progress = 0;
        let holdInterval = null;
        let isFinished = false;
        let isFallen = false;

        const screwSvg = screw.querySelector('.screw-svg');

        const updateVisuals = () => {
            // Rotate based on progress (up to 720 degrees)
            const rotation = (progress / 100) * 720;
            screwSvg.style.transform = `rotate(${rotation}deg)`;

            if (holdInterval && !isFinished) {
                // Subtle tremble effect
                const shakeX = (Math.random() - 0.5) * 1;
                const shakeY = (Math.random() - 0.5) * 1;
                screw.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
            } else if (!isFallen) {
                screw.style.transform = `translate(0px, 0px)`;
            }
        };

        const startHold = (e) => {
            if (isFinished || isFallen || state.isGameOver) return;
            e.preventDefault();

            holdInterval = setInterval(() => {
                progress += 3; // Filling speed

                if (progress >= 100) {
                    progress = 100;
                    isFinished = true;
                    clearInterval(holdInterval);
                    holdInterval = null;
                    updateVisuals();

                    // Make it fall without delay
                    isFallen = true;
                    screw.classList.add('fallen');
                    state.screwsUnscrewed++;
                    if (state.screwsUnscrewed === 4) {
                        setTimeout(dropPlate, 600);
                    }
                } else {
                    updateVisuals();
                }
            }, 30);
        };

        const stopHold = () => {
            if (isFinished || isFallen) return;
            clearInterval(holdInterval);
            holdInterval = null;

            // Gradually untighten if released early
            const emptyInterval = setInterval(() => {
                if (progress > 0 && holdInterval === null && !isFinished) {
                    progress -= 6;
                    if (progress < 0) progress = 0;
                    updateVisuals();
                } else {
                    clearInterval(emptyInterval);
                }
            }, 30);
        };

        // Mouse and touch events
        screw.addEventListener('mousedown', startHold);
        screw.addEventListener('mouseup', stopHold);
        screw.addEventListener('mouseleave', stopHold);

        screw.addEventListener('touchstart', startHold, { passive: false });
        screw.addEventListener('touchend', stopHold);
        screw.addEventListener('touchcancel', stopHold);

        elMetalPlate.appendChild(screw);
    });
}

function dropPlate() {
    elMetalPlate.classList.add('fallen');
    state.phase = 2;
    logToConsole("SYSTEM_READY");
    logToConsole("AWAITING_CONNECTION...");
}

/**
 * PHASE 2: WIRES
 */
function buildWires() {
    // Shuffle colors for right side targets internally
    let rightColors = [...state.colors].sort(() => Math.random() - 0.5);

    state.colors.forEach((color, i) => {
        // Left node (draggable wire start)
        const leftNode = document.createElement('div');
        leftNode.className = 'node source';
        leftNode.dataset.color = color;
        leftNode.dataset.index = i;

        leftNode.addEventListener('mousedown', startWireDrag);
        leftNode.addEventListener('touchstart', startWireDrag, { passive: false });
        elLeftNodes.appendChild(leftNode);

        // Target Node (Right) - Identical neutral holes
        const rightNode = document.createElement('div');
        rightNode.className = 'node target';
        rightNode.dataset.color = rightColors[i]; // Logical mapping only
        rightNode.dataset.index = i;
        elRightNodes.appendChild(rightNode);

        // Create placeholder path in SVG
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.classList.add('wire-line');
        path.setAttribute('id', `wire-${color}`);
        path.setAttribute('stroke', state.wireColorsHex[color]);
        elWiresSvg.appendChild(path);
    });
}

function getElementCenter(el) {
    const rect = el.getBoundingClientRect();
    const containerRect = document.getElementById('game-container').getBoundingClientRect();
    // Subtract 8px to account for the container's border width so the SVG path perfectly aligns
    return {
        x: rect.left - (containerRect.left + 8) + rect.width / 2,
        y: rect.top - (containerRect.top + 8) + rect.height / 2
    };
}

// Generate bezier curve path definition (Rigid cable effect)
function getWirePathDef(x1, y1, x2, y2) {
    const dx = Math.abs(x2 - x1);
    // Even stiffer sag for cable effect
    const sag = Math.max(5, dx * 0.05);
    return `M ${x1} ${y1} C ${x1 + dx * 0.3} ${y1 + sag}, ${x2 - dx * 0.3} ${y2 + sag}, ${x2} ${y2}`;
}

function startWireDrag(e) {
    if (state.phase !== 2 || state.isGameOver) return;
    e.preventDefault();

    let color = e.target.dataset.color;
    if (state.connections[color]) return;

    let sourceNode = e.target;
    let startPos = getElementCenter(sourceNode);

    state.draggedWire = {
        color: color,
        startNode: sourceNode,
        startX: startPos.x,
        startY: startPos.y,
        pathEl: document.getElementById(`wire-${color}`)
    };

    document.addEventListener('mousemove', dragWire);
    document.addEventListener('mouseup', dropWire);
    document.addEventListener('touchmove', dragWire, { passive: false });
    document.addEventListener('touchend', dropWire);
}

function dragWire(e) {
    if (!state.draggedWire) return;
    e.preventDefault();

    const containerRect = document.getElementById('game-container').getBoundingClientRect();
    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    let mouseX = clientX - (containerRect.left + 8);
    let mouseY = clientY - (containerRect.top + 8);

    const pathDef = getWirePathDef(
        state.draggedWire.startX,
        state.draggedWire.startY,
        mouseX,
        mouseY
    );
    state.draggedWire.pathEl.setAttribute('d', pathDef);
}

function dropWire(e) {
    if (!state.draggedWire) return;

    document.removeEventListener('mousemove', dragWire);
    document.removeEventListener('mouseup', dropWire);
    document.removeEventListener('touchmove', dragWire);
    document.removeEventListener('touchend', dropWire);

    if (state.isGameOver) {
        state.draggedWire.pathEl.removeAttribute('d');
        state.draggedWire = null;
        return;
    }

    let clientX, clientY;
    if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    const elementsUnder = document.elementsFromPoint(clientX, clientY);
    const targetNode = elementsUnder.find(el => el.classList && el.classList.contains('target'));

    const wire = state.draggedWire;
    state.draggedWire = null;

    if (targetNode) {
        const targetColor = targetNode.dataset.color;
        if (targetColor === wire.color) {
            const endPos = getElementCenter(targetNode);
            wire.pathEl.setAttribute('d', getWirePathDef(wire.startX, wire.startY, endPos.x, endPos.y));

            state.connections[wire.color] = true;
            state.wiresConnected++;

            logToConsole(`BYPASS_NODE_${state.wiresConnected}: OK`);
            logToConsole(`INTEGRITY: ${state.wiresConnected * 25}%`);

            if (state.wiresConnected === 4) {
                gameOver(true, "");
            }
        } else {
            wire.pathEl.removeAttribute('d');

            const containerRect = document.getElementById('game-container').getBoundingClientRect();
            const sparkX = clientX - containerRect.left;
            const sparkY = clientY - containerRect.top;

            addError(sparkX, sparkY);
        }
    } else {
        wire.pathEl.removeAttribute('d');
    }
}

initGame();
