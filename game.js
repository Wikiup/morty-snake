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
let isMuted = true;

function playTone(freq, type, duration, vol = 0.1) {
    if (isMuted) return;
    try {
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
    } catch (e) { /* swallow audio errors */ }
}

function playEatSound() {
    playTone(600, 'square', 0.1, 0.08);
    setTimeout(() => playTone(800, 'square', 0.08, 0.08), 50);
    setTimeout(() => playTone(1000, 'square', 0.06, 0.06), 100);
}

function playDieSound() {
    playTone(200, 'sawtooth', 0.3, 0.15);
    setTimeout(() => playTone(120, 'sawtooth', 0.4, 0.15), 100);
    setTimeout(() => playTone(80, 'sawtooth', 0.5, 0.12), 200);
}

function playTurnSound() {
    playTone(300, 'triangle', 0.04, 0.03);
}

function playPowerupSound() {
    playTone(400, 'sine', 0.1, 0.1);
    setTimeout(() => playTone(600, 'sine', 0.1, 0.1), 80);
    setTimeout(() => playTone(800, 'sine', 0.15, 0.08), 160);
}

function playGameOverSound() {
    playTone(300, 'square', 0.3, 0.12);
    setTimeout(() => playTone(200, 'square', 0.3, 0.12), 200);
    setTimeout(() => playTone(100, 'square', 0.5, 0.15), 400);
}

// BGM Loop
let noteIndex = 0;
const melody = [
    { f: 220, d: 0.15 }, { f: 0, d: 0.15 }, { f: 220, d: 0.15 }, { f: 0, d: 0.15 },
    { f: 261, d: 0.15 }, { f: 0, d: 0.15 }, { f: 196, d: 0.15 }, { f: 0, d: 0.15 },
    { f: 293, d: 0.15 }, { f: 0, d: 0.15 }, { f: 261, d: 0.15 }, { f: 0, d: 0.15 },
    { f: 220, d: 0.15 }, { f: 0, d: 0.15 }, { f: 196, d: 0.2 }, { f: 0, d: 0.15 }
];
let bgmInterval = null;

function startBGM() {
    if (bgmInterval) clearInterval(bgmInterval);
    noteIndex = 0;
    bgmInterval = setInterval(() => {
        if (isMuted || !isGameRunning) return;
        const note = melody[noteIndex % melody.length];
        if (note.f > 0) playTone(note.f, 'square', 0.08, 0.025);
        noteIndex++;
    }, 180);
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
    '🍵', '🥣', '🍼', '🥤', '🧃', '🧉', '🥛'
];

// Power-up Definitions
const POWERUPS = {
    GHOST: { icon: '👻', color: '#a855f7', duration: 5000, desc: 'Phase through yourself!' },
    MAGNET: { icon: '🧲', color: '#3b82f6', duration: 6000, desc: 'Attract nearby food!' },
    DOUBLE: { icon: '✨', color: '#f59e0b', duration: 8000, desc: 'Double points!' }
};

// Snake color tiers
const SNAKE_TIERS = [
    { threshold: 0, head: '#22c55e', body: '#4ade80', glow: '#22c55e' },
    { threshold: 200, head: '#f59e0b', body: '#fbbf24', glow: '#f59e0b' },
    { threshold: 500, head: '#ec4899', body: '#f472b6', glow: '#ec4899' },
    { threshold: 1000, head: '#3b82f6', body: '#60a5fa', glow: '#3b82f6' },
    { threshold: 2000, head: '#8b5cf6', body: '#a78bfa', glow: '#8b5cf6' }
];

// ─── State ──────────────────────────────────────────────────────
let snake = [];
let velocity = { x: 0, y: 0 };
let food = { x: 15, y: 15, type: '🍎' };
let score = 0;
let lives = 10;
let highScore = parseInt(localStorage.getItem('mortySnakeHigh')) || 0;
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
let floatingTexts = [];  // Score pop-up texts
let foodBounce = 0;      // Food animation counter
let trailParticles = []; // Snake trail

// Initialize high score display
highScoreDisplay.textContent = highScore;

// ─── Core Game Functions ────────────────────────────────────────
function initGame() {
    score = 0;
    lives = 10;
    activePowerups = [];
    powerupItem = null;
    comboMultiplier = 1;
    comboTimer = 0;
    isPaused = false;
    particles = [];
    trailParticles = [];
    floatingTexts = [];
    shakeIntensity = 0;
    isAutoPlaying = false;
    foodBounce = 0;

    resetSnake();

    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
    spawnFood();
    isGameRunning = true;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseMenu.classList.remove('visible');

    try {
        if (actx.state === 'suspended') actx.resume();
        startBGM();
    } catch (e) {
        console.log('Audio init failed:', e);
    }

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
    foodBounce = 0;

    // Random Power-up Spawn (12% chance)
    if (Math.random() < 0.12 && !powerupItem) {
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
            return;
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

    // Update Particles (iterate backwards for safe splice)
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.life -= 0.04;
        if (p.life <= 0) particles.splice(i, 1);
    }

    // Update Trail Particles
    for (let i = trailParticles.length - 1; i >= 0; i--) {
        trailParticles[i].life -= 0.06;
        if (trailParticles[i].life <= 0) trailParticles.splice(i, 1);
    }

    // Update Floating Texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y -= 1.2;
        ft.life -= 0.025;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
    }

    // Food bounce animation
    foodBounce += 0.12;

    // Screen Shake Decay
    if (shakeIntensity > 0) {
        shakeIntensity--;
        if (shakeIntensity <= 0) gameContainer.classList.remove('shake');
    }

    // Snake trail effect
    if (snake.length > 0) {
        const tail = snake[snake.length - 1];
        const tier = getSnakeTier();
        trailParticles.push({
            x: tail.x * GRID_SIZE + GRID_SIZE / 2,
            y: tail.y * GRID_SIZE + GRID_SIZE / 2,
            life: 0.6,
            color: tier.body
        });
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
        if (Math.abs(dx) + Math.abs(dy) < 3) {
            head.x = food.x;
            head.y = food.y;
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
            if (head.x === segment.x && head.y === segment.y) {
                loseLife();
                return;
            }
        }
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        eatFood();
    } else if (powerupItem && head.x === powerupItem.x && head.y === powerupItem.y) {
        activatePowerup();
        snake.pop();
    } else {
        snake.pop();
    }
}

function eatFood() {
    playEatSound();
    spawnParticles(food.x, food.y, '#f59e0b', 12);

    // Combo Logic
    comboTimer = maxComboTime;
    if (comboMultiplier < 5) comboMultiplier++;

    const hasDouble = activePowerups.some(p => p.type === 'DOUBLE');
    const points = 10 * comboMultiplier * (hasDouble ? 2 : 1);

    score += points;
    scoreDisplay.textContent = score;

    // Score Pop Animation
    scoreDisplay.classList.add('score-pop');
    setTimeout(() => scoreDisplay.classList.remove('score-pop'), 300);

    // Floating score text
    floatingTexts.push({
        x: food.x * GRID_SIZE + GRID_SIZE / 2,
        y: food.y * GRID_SIZE,
        text: `+${points}`,
        life: 1,
        color: comboMultiplier >= 3 ? '#f59e0b' : '#fff'
    });

    // UI Updates
    comboBar.classList.add('active');
    comboText.textContent = comboMultiplier > 1 ? `x${comboMultiplier} COMBO!` : '';
    if (comboMultiplier > 1) comboText.classList.add('active');
    if (comboMultiplier >= 4) canvas.classList.add('disco-bg');

    spawnFood();
}

function activatePowerup() {
    const type = powerupItem.type;
    const config = powerupItem.config;

    activePowerups.push({ type: type, timeLeft: config.duration });
    playPowerupSound();

    spawnParticles(powerupItem.x, powerupItem.y, config.color, 15);

    // Floating powerup text
    floatingTexts.push({
        x: powerupItem.x * GRID_SIZE + GRID_SIZE / 2,
        y: powerupItem.y * GRID_SIZE,
        text: `${config.icon} ${config.desc}`,
        life: 1.5,
        color: config.color
    });

    comboText.textContent = `${config.icon} ${type}!`;
    comboText.classList.add('active');
    setTimeout(() => comboText.classList.remove('active'), 1500);

    powerupItem = null;
}

function spawnParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 2 + Math.random() * 4;
        particles.push({
            x: x * GRID_SIZE + GRID_SIZE / 2,
            y: y * GRID_SIZE + GRID_SIZE / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            life: 1,
            color: color,
            size: 2 + Math.random() * 3
        });
    }
}

function loseLife() {
    playDieSound();
    lives--;
    livesDisplay.textContent = lives;
    gameContainer.classList.add('shake');
    shakeIntensity = 10;

    // Flash the lives display red
    livesDisplay.classList.add('lives-flash');
    setTimeout(() => livesDisplay.classList.remove('lives-flash'), 400);

    // Screen Flash
    canvas.style.boxShadow = '0 0 0 4px #ef4444, 0 0 50px #ef4444';
    setTimeout(() => {
        canvas.style.boxShadow = '0 0 0 4px #27272a, 0 20px 40px -10px rgba(0,0,0,0.5)';
    }, 200);

    // Death particles burst
    if (snake.length > 0) {
        spawnParticles(snake[0].x, snake[0].y, '#ef4444', 20);
    }

    if (lives <= 0) {
        gameOver();
    } else {
        resetSnake();
    }
}

// ─── Helper: Get Snake Color Tier ───────────────────────────────
function getSnakeTier() {
    let tier = SNAKE_TIERS[0];
    for (const t of SNAKE_TIERS) {
        if (score >= t.threshold) tier = t;
    }
    return tier;
}

// ─── Rendering ──────────────────────────────────────────────────
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const tier = getSnakeTier();

    // Draw Trail Particles
    trailParticles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life * 0.3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 * p.life, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Draw Power-up (with glow + bounce)
    if (powerupItem) {
        const px = powerupItem.x * GRID_SIZE + GRID_SIZE / 2;
        const py = powerupItem.y * GRID_SIZE + GRID_SIZE / 2;
        const bounce = Math.sin(foodBounce * 1.5) * 3;

        // Glow
        ctx.shadowColor = powerupItem.config.color;
        ctx.shadowBlur = 15 + Math.sin(foodBounce * 2) * 5;
        ctx.font = `${GRID_SIZE}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(powerupItem.config.icon, px, py + bounce);
        ctx.shadowBlur = 0;
    }

    // Draw Food (with bounce)
    {
        const fx = food.x * GRID_SIZE + GRID_SIZE / 2;
        const fy = food.y * GRID_SIZE + GRID_SIZE / 2;
        const bounce = Math.sin(foodBounce) * 2;
        const scale = 1 + Math.sin(foodBounce * 0.8) * 0.1;

        ctx.save();
        ctx.translate(fx, fy + bounce);
        ctx.scale(scale, scale);
        ctx.font = `${GRID_SIZE}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(food.type, 0, 0);
        ctx.restore();
    }

    // Draw Snake
    snake.forEach((segment, index) => {
        const isGhost = activePowerups.some(p => p.type === 'GHOST');
        ctx.globalAlpha = isGhost ? 0.4 : 1;

        const px = segment.x * GRID_SIZE;
        const py = segment.y * GRID_SIZE;

        // Body gradient: head color → fades toward tail
        const t = index / Math.max(snake.length - 1, 1);
        const headColor = tier.head;
        const bodyColor = tier.body;

        if (index === 0) {
            // Head with glow
            ctx.shadowColor = tier.glow;
            ctx.shadowBlur = 8;
            ctx.fillStyle = headColor;
        } else {
            ctx.shadowBlur = 0;
            ctx.fillStyle = bodyColor;
            ctx.globalAlpha = (isGhost ? 0.3 : 1) * (1 - t * 0.4); // fade toward tail
        }

        ctx.beginPath();
        ctx.roundRect(px + 1, py + 1, GRID_SIZE - 2, GRID_SIZE - 2, index === 0 ? 7 : 4);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw eyes on head
        if (index === 0) {
            ctx.globalAlpha = 1;
            const eyeSize = 3;
            const eyeOffset = 5;
            let ex1, ey1, ex2, ey2;

            // Position eyes based on direction
            if (velocity.x === 1) {       // right
                ex1 = px + 14; ey1 = py + 6;
                ex2 = px + 14; ey2 = py + 14;
            } else if (velocity.x === -1) { // left
                ex1 = px + 6; ey1 = py + 6;
                ex2 = px + 6; ey2 = py + 14;
            } else if (velocity.y === -1) { // up
                ex1 = px + 6; ey1 = py + 6;
                ex2 = px + 14; ey2 = py + 6;
            } else {                        // down
                ex1 = px + 6; ey1 = py + 14;
                ex2 = px + 14; ey2 = py + 14;
            }

            // Eye whites
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(ex1, ey1, eyeSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(ex2, ey2, eyeSize, 0, Math.PI * 2);
            ctx.fill();

            // Pupils
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(ex1 + velocity.x, ey1 + velocity.y, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(ex2 + velocity.x, ey2 + velocity.y, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
    });

    // Draw Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size || 3, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Draw Floating Texts
    floatingTexts.forEach(ft => {
        ctx.globalAlpha = ft.life;
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 14px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ft.text, ft.x, ft.y);
    });
    ctx.globalAlpha = 1;

    // Active power-up indicators (bottom-left corner)
    if (activePowerups.length > 0 && !isAutoPlaying) {
        activePowerups.forEach((p, i) => {
            const config = POWERUPS[p.type];
            const pct = p.timeLeft / config.duration;
            const bx = 10;
            const by = canvas.height - 30 - i * 25;

            // Background bar
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.beginPath();
            ctx.roundRect(bx, by, 100, 18, 4);
            ctx.fill();

            // Fill bar
            ctx.fillStyle = config.color;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.roundRect(bx, by, 100 * pct, 18, 4);
            ctx.fill();
            ctx.globalAlpha = 1;

            // Icon + label
            ctx.font = '12px Outfit, sans-serif';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${config.icon} ${p.type}`, bx + 5, by + 9);
        });
    }
}

function gameOver() {
    isGameRunning = false;
    clearInterval(gameLoopId);
    if (bgmInterval) clearInterval(bgmInterval);

    playGameOverSound();

    const isNewHigh = score > highScore;
    if (isNewHigh) {
        highScore = score;
        localStorage.setItem('mortySnakeHigh', highScore);
        highScoreDisplay.textContent = highScore;
    }

    // Update game over screen
    document.getElementById('finalScore').textContent = score;

    // Show/hide new high score badge
    const badge = document.getElementById('newHighBadge');
    if (badge) {
        badge.style.display = isNewHigh ? 'block' : 'none';
    }

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
    trailParticles = [];
    floatingTexts = [];
    shakeIntensity = 0;

    resetSnake();
    spawnFood();
    isGameRunning = true;

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
const btnStartMobile = document.getElementById('btnStart');
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

// ─── Start / Pause Handlers ─────────────────────────────────────
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

btnStartMobile.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleStart();
    btnStartMobile.style.boxShadow = 'none';
    btnStartMobile.style.transform = 'rotate(-20deg) translate(1px, 1px)';
});

btnStartMobile.addEventListener('touchend', (e) => {
    e.preventDefault();
    btnStartMobile.style.boxShadow = '1px 1px 0 rgba(0,0,0,0.5)';
    btnStartMobile.style.transform = 'rotate(-20deg)';
});

btnSelect.addEventListener('touchstart', (e) => {
    e.preventDefault();
    toggleMute();
});

// ─── Keyboard Input ─────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    // Start game on Enter/Space from start screen
    if (!isGameRunning || isAutoPlaying) {
        if (e.key === 'Enter' || e.code === 'Space') {
            e.preventDefault();
            initGame();
            return;
        }
    }

    if (e.key.toLowerCase() === 'p' || e.key === 'Escape') {
        togglePause();
        return;
    }

    if (!isGameRunning || isPaused) return;

    if (e.code === 'Space') {
        e.preventDefault();
        isBoosting = true;
    }

    switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
            e.preventDefault();
            handleDirection('up'); break;
        case 'ArrowDown': case 's': case 'S':
            e.preventDefault();
            handleDirection('down'); break;
        case 'ArrowLeft': case 'a': case 'A':
            e.preventDefault();
            handleDirection('left'); break;
        case 'ArrowRight': case 'd': case 'D':
            e.preventDefault();
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
