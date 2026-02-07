// ─── DOM References ─────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const highScoreDisplay = document.getElementById('highScoreDisplay');
const livesDisplay = document.getElementById('livesDisplay');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const muteBtn = document.getElementById('muteBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const pauseMenu = document.getElementById('pauseMenu');
const comboBar = document.getElementById('comboBar');
const comboFill = document.getElementById('comboFill');
const comboText = document.getElementById('comboText');
const gameContainer = document.getElementById('gameContainer');

// ─── Audio System (Web Audio API) ──────────────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const actx = new AudioCtx();
let isMuted = true; // Default muted for autoplay policy

function playTone(freq, type, duration, vol = 0.1) {
    if (isMuted) return;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, actx.currentTime);
    gain.gain.setValueAtTime(vol, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + duration);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start();
    osc.stop(actx.currentTime + duration);
}

function playEatSound() {
    playTone(600, 'square', 0.1, 0.1);
    setTimeout(() => playTone(800, 'square', 0.1, 0.1), 50);
}

function playDieSound() {
    playTone(150, 'sawtooth', 0.5, 0.2);
    playTone(100, 'sawtooth', 0.5, 0.2);
}

function playTurnSound() {
    playTone(200, 'triangle', 0.05, 0.05);
}

// Simple BGM Loop
let noteIndex = 0;
const melody = [
    { f: 220, d: 0.2 }, { f: 0, d: 0.2 }, { f: 220, d: 0.2 }, { f: 0, d: 0.2 },
    { f: 261, d: 0.2 }, { f: 0, d: 0.2 }, { f: 196, d: 0.2 }, { f: 0, d: 0.2 }
];
let bgmInterval = null;

function startBGM() {
    if (bgmInterval) clearInterval(bgmInterval);
    bgmInterval = setInterval(() => {
        if (isMuted || !isGameRunning) return;
        const note = melody[noteIndex % melody.length];
        if (note.f > 0) playTone(note.f, 'square', 0.1, 0.03);
        noteIndex++;
    }, 200);
}

function toggleMute() {
    isMuted = !isMuted;
    muteBtn.textContent = isMuted ? '🔇' : '🔊';
    muteBtn.style.opacity = isMuted ? 0.5 : 1;
    if (!isMuted && actx.state === 'suspended') actx.resume();
}

muteBtn.addEventListener('click', toggleMute);

// ─── Config ─────────────────────────────────────────────────────
const GRID_SIZE = 20;
const TILE_COUNT = 30;

const FOODS = [
    '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑', '🍍', '🥥', '🥝',
    '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌽', '🥕', '🥔', '🍠', '🥐', '🥯', '🍞',
    '🥖', '🥨', '🧀', '🥚', '🍳', '🥞', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟',
    '🍕', '🥪', '🥙', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣',
    '🍱', '🥟', '🍤', '🍙', '🍚', '🍘', '🍥', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦',
    '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🥠', '☕',
    '🍵', '🥣', '🍼', '🥤', '🧃', '🧉', '🥛', '🍺', '🍻', '🍷', '🥂', '🥃', '🍸',
    '🍹', '🍾', '🍶', '🧊', '🥄', '🍴', '🍽', '🥣', '🥡', '🥢'
];

// Power-up Definitions
const POWERUPS = {
    GHOST: { icon: '👻', color: '#a855f7', duration: 5000 },
    MAGNET: { icon: '🧲', color: '#3b82f6', duration: 6000 },
    DOUBLE: { icon: '✨', color: '#f59e0b', duration: 8000 }
};

// ─── State ──────────────────────────────────────────────────────
let snake = [];
let velocity = { x: 0, y: 0 };
let food = { x: 15, y: 15, type: '🍎' };
let score = 0;
let lives = 10;
let highScore = localStorage.getItem('cooperSnakeHigh') || 0;
let gameLoopId = null;
let isGameRunning = false;
let isAutoPlaying = false;
let nextVelocity = { x: 0, y: 0 };
let isBoosting = false;
let isPaused = false;
let particles = [];
let shakeIntensity = 0;
let powerupItem = null;
let activePowerups = [];
let comboMultiplier = 1;
let comboTimer = 0;
const maxComboTime = 150;

// Initialize high score display
highScoreDisplay.textContent = highScore;

// ─── Core Game Functions ────────────────────────────────────────
function initGame() {
    // Reset state
    score = 0;
    lives = 10;
    activePowerups = [];
    powerupItem = null;
    comboMultiplier = 1;
    comboTimer = 0;
    isPaused = false;
    particles = [];
    shakeIntensity = 0;
    isAutoPlaying = false;

    resetSnake();

    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
    spawnFood();
    isGameRunning = true;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseMenu.classList.remove('visible');

    // Audio (don't block game if this fails)
    try {
        if (actx.state === 'suspended') actx.resume();
        startBGM();
    } catch (e) {
        console.log('Audio init failed:', e);
    }

    // Force first render
    requestAnimationFrame(() => draw());

    if (gameLoopId) clearInterval(gameLoopId);
    gameLoopId = setInterval(gameLoop, 1000 / 30);
}

function resetSnake() {
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    velocity = { x: 1, y: 0 };
    nextVelocity = { x: 1, y: 0 };
}

function spawnFood() {
    food = {
        x: Math.floor(Math.random() * TILE_COUNT),
        y: Math.floor(Math.random() * TILE_COUNT),
        type: FOODS[Math.floor(Math.random() * FOODS.length)]
    };

    // Random Power-up Spawn (10% chance)
    if (Math.random() < 0.1 && !powerupItem) {
        const types = Object.keys(POWERUPS);
        const type = types[Math.floor(Math.random() * types.length)];
        powerupItem = {
            x: Math.floor(Math.random() * TILE_COUNT),
            y: Math.floor(Math.random() * TILE_COUNT),
            type: type,
            config: POWERUPS[type]
        };
    }

    // Don't spawn on snake
    for (let segment of snake) {
        if (segment.x === food.x && segment.y === food.y) {
            spawnFood();
            break;
        }
    }
}

function togglePause() {
    if (!isGameRunning) return;
    isPaused = !isPaused;

    if (isPaused) {
        pauseMenu.classList.add('visible');
        pauseBtn.textContent = '▶️';
    } else {
        pauseMenu.classList.remove('visible');
        pauseBtn.textContent = '⏸️';
    }
}

// ─── Game Loop ──────────────────────────────────────────────────
function gameLoop() {
    if (isPaused) return;
    if (isAutoPlaying) autoPlayAI();
    update();
    draw();
}

function autoPlayAI() {
    const head = snake[0];
    const dx = food.x - head.x;
    const dy = food.y - head.y;

    let moves = [];
    if (dx > 0) moves.push({ x: 1, y: 0 });
    if (dx < 0) moves.push({ x: -1, y: 0 });
    if (dy > 0) moves.push({ x: 0, y: 1 });
    if (dy < 0) moves.push({ x: 0, y: -1 });

    if (moves.length === 0) {
        moves.push({ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 });
    }

    // Filter out suicide moves
    moves = moves.filter(m => {
        if (m.x === -velocity.x && m.y === -velocity.y) return false;
        const nextX = head.x + m.x;
        const nextY = head.y + m.y;
        if (nextX < 0 || nextX >= TILE_COUNT || nextY < 0 || nextY >= TILE_COUNT) return false;
        for (let s of snake) {
            if (s.x === nextX && s.y === nextY) return false;
        }
        return true;
    });

    if (moves.length > 0) {
        nextVelocity = moves[0];
    }
}

function update() {
    velocity = nextVelocity;

    // Boost: move twice per frame
    const moveCount = isBoosting ? 2 : 1;
    for (let i = 0; i < moveCount; i++) {
        moveSnake();
    }

    // Combo Decay
    if (comboTimer > 0) {
        comboTimer--;
        comboFill.style.width = `${(comboTimer / maxComboTime) * 100}%`;
    } else {
        comboMultiplier = 1;
        comboBar.classList.remove('active');
        comboText.classList.remove('active');
        canvas.classList.remove('disco-bg');
    }

    // Power-up Timers
    activePowerups = activePowerups.filter(p => {
        p.timeLeft -= 33;
        return p.timeLeft > 0;
    });

    // Update Particles
    particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        if (p.life <= 0) particles.splice(i, 1);
    });

    // Screen Shake Decay
    if (shakeIntensity > 0) {
        shakeIntensity--;
        if (shakeIntensity <= 0) gameContainer.classList.remove('shake');
    }
}

function moveSnake() {
    const head = { x: snake[0].x + velocity.x, y: snake[0].y + velocity.y };
    const hasGhost = activePowerups.some(p => p.type === 'GHOST');
    const hasMagnet = activePowerups.some(p => p.type === 'MAGNET');

    // Magnet Effect
    if (hasMagnet) {
        const dx = food.x - head.x;
        const dy = food.y - head.y;
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
            if (Math.abs(dx) + Math.abs(dy) < 2) {
                head.x = food.x;
                head.y = food.y;
            }
        }
    }

    // Wall Collision
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        loseLife();
        return;
    }

    // Self Collision (unless Ghost)
    if (!hasGhost) {
        for (let segment of snake) {
            if (Math.round(head.x) === segment.x && Math.round(head.y) === segment.y) {
                loseLife();
                return;
            }
        }
    }

    snake.unshift(head);

    // Check Eat
    if (Math.round(head.x) === food.x && Math.round(head.y) === food.y) {
        eatFood();
    } else if (powerupItem && Math.round(head.x) === powerupItem.x && Math.round(head.y) === powerupItem.y) {
        activatePowerup();
        snake.pop();
    } else {
        snake.pop();
    }
}

function eatFood() {
    playEatSound();
    spawnParticles(food.x, food.y, '#f59e0b');

    // Combo Logic
    comboTimer = maxComboTime;
    if (comboMultiplier < 5) comboMultiplier++;

    // Multiplier
    const hasDouble = activePowerups.some(p => p.type === 'DOUBLE');
    const points = 10 * comboMultiplier * (hasDouble ? 2 : 1);

    score += points;
    scoreDisplay.textContent = score;

    // UI Updates
    comboBar.classList.add('active');
    comboText.textContent = `x${comboMultiplier} COMBO!`;
    comboText.classList.add('active');
    if (comboMultiplier >= 4) canvas.classList.add('disco-bg');

    spawnFood();
}

function activatePowerup() {
    const type = powerupItem.type;
    const config = powerupItem.config;

    activePowerups.push({ type: type, timeLeft: config.duration });

    spawnParticles(powerupItem.x, powerupItem.y, config.color);
    comboText.textContent = `${config.icon} ACTIVATED!`;
    comboText.classList.add('active');
    setTimeout(() => comboText.classList.remove('active'), 1000);

    powerupItem = null;
}

function spawnParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: x * GRID_SIZE + 10,
            y: y * GRID_SIZE + 10,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1,
            color: color
        });
    }
}

function loseLife() {
    playDieSound();
    lives--;
    livesDisplay.textContent = lives;
    gameContainer.classList.add('shake');
    shakeIntensity = 10;

    // Screen Flash
    canvas.style.boxShadow = '0 0 0 4px #ef4444, 0 0 50px #ef4444';
    setTimeout(() => {
        canvas.style.boxShadow = '0 0 0 4px #27272a, 0 20px 40px -10px rgba(0,0,0,0.5)';
    }, 200);

    if (lives <= 0) {
        gameOver();
    } else {
        resetSnake();
    }
}

// ─── Rendering ──────────────────────────────────────────────────
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Power-up
    if (powerupItem) {
        ctx.font = `${GRID_SIZE}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(powerupItem.config.icon, powerupItem.x * GRID_SIZE + 10, powerupItem.y * GRID_SIZE + 10);
    }

    // Draw Food
    ctx.font = `${GRID_SIZE}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(food.type, food.x * GRID_SIZE + 10, food.y * GRID_SIZE + 10);

    // Draw Snake
    snake.forEach((segment, index) => {
        const isGhost = activePowerups.some(p => p.type === 'GHOST');
        ctx.globalAlpha = isGhost ? 0.5 : 1;

        ctx.fillStyle = index === 0 ? '#22c55e' : '#4ade80';

        // Color tiers based on score
        if (score > 500) ctx.fillStyle = index === 0 ? '#ec4899' : '#f472b6';
        if (score > 1000) ctx.fillStyle = index === 0 ? '#3b82f6' : '#60a5fa';

        const px = Math.round(segment.x) * GRID_SIZE;
        const py = Math.round(segment.y) * GRID_SIZE;

        ctx.beginPath();
        ctx.roundRect(px + 1, py + 1, GRID_SIZE - 2, GRID_SIZE - 2, index === 0 ? 6 : 4);
        ctx.fill();

        ctx.globalAlpha = 1;
    });

    // Draw Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

function gameOver() {
    isGameRunning = false;
    clearInterval(gameLoopId);

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('cooperSnakeHigh', highScore);
        highScoreDisplay.textContent = highScore;
    }

    document.getElementById('finalScore').textContent = score;
    gameOverScreen.classList.remove('hidden');
}

// ─── Auto-Play Demo ─────────────────────────────────────────────
function startAutoPlay() {
    isAutoPlaying = true;
    score = 0;
    lives = 10;
    activePowerups = [];
    powerupItem = null;
    comboMultiplier = 1;
    comboTimer = 0;
    isPaused = false;
    particles = [];
    shakeIntensity = 0;

    resetSnake();
    spawnFood();
    isGameRunning = true;

    // Hide game over if showing, keep start screen visible
    gameOverScreen.classList.add('hidden');

    if (gameLoopId) clearInterval(gameLoopId);
    gameLoopId = setInterval(gameLoop, 1000 / 30);
}

// ─── Mobile Controls ────────────────────────────────────────────
const btnUp = document.getElementById('btnUp');
const btnDown = document.getElementById('btnDown');
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');
const btnA = document.getElementById('btnA');
const btnB = document.getElementById('btnB');
const btnStart = document.getElementById('btnStart');
const btnSelect = document.getElementById('btnSelect');

function handleDirection(dir) {
    if (!isGameRunning) return;
    playTurnSound();
    if (dir === 'up' && velocity.y !== 1) nextVelocity = { x: 0, y: -1 };
    if (dir === 'down' && velocity.y !== -1) nextVelocity = { x: 0, y: 1 };
    if (dir === 'left' && velocity.x !== 1) nextVelocity = { x: -1, y: 0 };
    if (dir === 'right' && velocity.x !== -1) nextVelocity = { x: 1, y: 0 };
}

// Touch events for D-Pad
[btnUp, btnDown, btnLeft, btnRight].forEach(btn => {
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (btn === btnUp) handleDirection('up');
        if (btn === btnDown) handleDirection('down');
        if (btn === btnLeft) handleDirection('left');
        if (btn === btnRight) handleDirection('right');
        btn.style.boxShadow = 'none';
        btn.style.transform = 'translateY(2px)';
    }, { passive: false });

    btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        btn.style.boxShadow = '0 4px 0 #000';
        btn.style.transform = 'translateY(0)';
    }, { passive: false });
});

// Action Buttons (Boost)
[btnA, btnB].forEach(btn => {
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isBoosting = true;
        btn.style.boxShadow = 'none';
        btn.style.transform = 'translateY(2px)';
    }, { passive: false });

    btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        isBoosting = false;
        btn.style.boxShadow = '0 4px 0 rgba(0,0,0,0.3)';
        btn.style.transform = 'translateY(0)';
    }, { passive: false });
});

// ─── Start / Pause Handlers ────────────────────────────────────
function handleStart() {
    if (isGameRunning && !isAutoPlaying) {
        togglePause();
    } else {
        initGame();
    }
}

startBtn.addEventListener('click', handleStart);
startBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleStart();
});

restartBtn.addEventListener('click', initGame);
restartBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    initGame();
});

pauseBtn.addEventListener('click', togglePause);
resumeBtn.addEventListener('click', togglePause);

btnStart.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleStart();
    btnStart.style.boxShadow = 'none';
    btnStart.style.transform = 'rotate(-20deg) translate(1px, 1px)';
});

btnStart.addEventListener('touchend', (e) => {
    e.preventDefault();
    btnStart.style.boxShadow = '1px 1px 0 rgba(0,0,0,0.5)';
    btnStart.style.transform = 'rotate(-20deg)';
});

btnSelect.addEventListener('touchstart', (e) => {
    e.preventDefault();
    toggleMute();
});

// ─── Keyboard Input ─────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'p' || e.key === 'Escape') {
        togglePause();
        return;
    }

    if (!isGameRunning || isPaused) return;

    playTurnSound();

    if (e.code === 'Space') isBoosting = true;

    switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
            handleDirection('up'); break;
        case 'ArrowDown': case 's': case 'S':
            handleDirection('down'); break;
        case 'ArrowLeft': case 'a': case 'A':
            handleDirection('left'); break;
        case 'ArrowRight': case 'd': case 'D':
            handleDirection('right'); break;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') isBoosting = false;
});

// ─── Swipe Controls ─────────────────────────────────────────────
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

document.addEventListener('touchend', (e) => {
    if (!isGameRunning) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > 30) {
            if (dx > 0 && velocity.x !== -1) nextVelocity = { x: 1, y: 0 };
            else if (dx < 0 && velocity.x !== 1) nextVelocity = { x: -1, y: 0 };
        }
    } else {
        if (Math.abs(dy) > 30) {
            if (dy > 0 && velocity.y !== -1) nextVelocity = { x: 0, y: 1 };
            else if (dy < 0 && velocity.y !== 1) nextVelocity = { x: 0, y: -1 };
        }
    }
});

// ─── Boot ───────────────────────────────────────────────────────
try {
    startAutoPlay();
} catch (e) {
    console.error('AutoPlay failed', e);
}
