const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
let isGameOver = false;
let startTime = 0;
let score = 0;
let gameState = "start"; // puede ser "start", "playing", "gameover"
const BASE_PLAYER_SPEED = 3;
const BASE_ENEMY_SPEED = 1.5;
const particles = [];
let shakeDuration = 0;
let shakeMagnitude = 5;
const explosionSound = new Audio("sounds/explosion.mp3");
const backgroundMusic = new Audio("sounds/music.mp3");
const enemySpawnSound = new Audio("sounds/enemy_spawn.mp3");
const powerupSound = new Audio("sounds/powerup.mp3");
backgroundMusic.loop = true;
backgroundMusic.volume = 0.5; // puedes ajustar el volumen si quieres
let animationId = null;
const powerUps = [];
let highScore = localStorage.getItem("loopHighScore") || 0;
highScore = parseInt(highScore);
const spriteImages = {
  player: new Image(),
  enemy: new Image(),
  invincibility: new Image(),
  bomb: new Image(),
  background: new Image(),
};

spriteImages.player.src = "assets/player3.png";
spriteImages.enemy.src = "assets/enemy.png";
spriteImages.invincibility.src = "assets/power_invincibility.png";
spriteImages.bomb.src = "assets/power_bomb.png";
spriteImages.background.src = "assets/background.png";

// ===================
// JUGADOR
// ===================
const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 20,
  color: "lime",
  speed: 3,
  dx: 0,
  dy: 0,
};

// ===================
// ENEMIGOS
// ===================
const enemies = [];
let spawnInterval = 2000;
let lastSpawnTime = 0;

function createEnemy() {
  const size = 20;
  let x, y;

  // Randomly choose spawn position from edges
  const side = Math.floor(Math.random() * 4);
  switch (side) {
    case 0: // top
      x = Math.random() * canvas.width;
      y = -size;
      break;
    case 1: // right
      x = canvas.width;
      y = Math.random() * canvas.height;
      break;
    case 2: // bottom
      x = Math.random() * canvas.width;
      y = canvas.height;
      break;
    case 3: // left
      x = -size;
      y = Math.random() * canvas.height;
      break;
  }

  const speed = BASE_ENEMY_SPEED + Math.random() * 0.5;
  enemies.push({ x, y, size, speed });

  // Play spawn sound
  enemySpawnSound.currentTime = 0;
  enemySpawnSound.play();
}

function updateEnemies() {
  enemies.forEach((enemy) => {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const vx = (dx / dist) * enemy.speed;
    const vy = (dy / dist) * enemy.speed;
    enemy.x += vx;
    enemy.y += vy;
  });
}

function drawEnemies() {
  enemies.forEach((enemy) => {
    ctx.drawImage(spriteImages.enemy, enemy.x, enemy.y, enemy.size, enemy.size);
  });
}

// ===================
// UTILIDADES
// ===================
function clear() {
  if (shakeDuration > 0) {
    const dx = (Math.random() - 0.5) * shakeMagnitude;
    const dy = (Math.random() - 0.5) * shakeMagnitude;
    ctx.setTransform(1, 0, 0, 1, dx, dy);
    shakeDuration--;
  } else {
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
  }

  // Draw background
  ctx.drawImage(spriteImages.background, 0, 0, canvas.width, canvas.height);
}

// Directions: 0=down, 1=left, 2=right, 3=up
let playerAnim = {
  frame: 0,
  direction: 0, // 0=down, 1=left, 2=right, 3=up
  timer: 0,
  lastMoveX: 0,
  lastMoveY: 1, // Default facing down
};

function updatePlayerAnim(dx, dy) {
  // Determine direction
  if (dx !== 0 || dy !== 0) {
    if (Math.abs(dx) > Math.abs(dy)) {
      playerAnim.direction = dx > 0 ? 2 : 1; // right : left
    } else {
      playerAnim.direction = dy > 0 ? 0 : 3; // down : up
    }
    playerAnim.lastMoveX = dx;
    playerAnim.lastMoveY = dy;
    // Advance frame
    playerAnim.timer += PLAYER_ANIM_SPEED;
    if (playerAnim.timer >= 1) {
      playerAnim.frame = (playerAnim.frame + 1) % PLAYER_ANIM_FRAMES;
      playerAnim.timer = 0;
    }
  } else {
    // Idle: show first frame
    playerAnim.frame = 0;
    playerAnim.timer = 0;
  }
}

function drawPlayer() {
  ctx.save();
  if (player.invincible) {
    ctx.shadowColor = "cyan";
    ctx.shadowBlur = 15;
  }
  ctx.drawImage(
    spriteImages.player,
    player.x,
    player.y,
    player.size,
    player.size
  );
  ctx.restore();
}

function newPos() {
  const dx = player.dx + touchMovement.dx;
  const dy = player.dy + touchMovement.dy;
  player.x += dx;
  player.y += dy;
  player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.size, player.y));
}

function checkCollisions() {
  for (const enemy of enemies) {
    const collideX =
      player.x < enemy.x + enemy.size && player.x + player.size > enemy.x;
    const collideY =
      player.y < enemy.y + enemy.size && player.y + player.size > enemy.y;
    if (collideX && collideY && !player.invincible) {
      gameOver();
      break;
    }
  }
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const p = powerUps[i];
    const collideX = player.x < p.x + p.size && player.x + player.size > p.x;
    const collideY = player.y < p.y + p.size && player.y + player.size > p.y;

    if (collideX && collideY) {
      if (p.type === "invincibility") {
        player.invincible = true;
        player.invincibleTimer = 180;
        player.color = "cyan";
      } else if (p.type === "bomb") {
        triggerBombExplosion();
      }
      powerUps.splice(i, 1);
    }
  }
}

// Add these variables at the top with other game variables
let titleAnimation = 0;
let buttonPulse = 0;
let gameOverParticles = [];

function drawStartScreen() {
  // Draw background grid
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  const gridSize = 40;

  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Animate title
  titleAnimation += 0.05;
  const titleY = canvas.height / 2 - 60 + Math.sin(titleAnimation) * 5;

  // Draw title with glow effect
  ctx.shadowColor = "rgba(0, 255, 255, 0.8)";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "white";
  ctx.font = "bold 48px Arial";
  ctx.textAlign = "center";
  ctx.fillText("LOOP SURVIVAL", canvas.width / 2, titleY);

  // Reset shadow
  ctx.shadowBlur = 0;

  // Draw subtitle
  ctx.font = "20px Arial";
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.fillText("Survive as long as you can!", canvas.width / 2, titleY + 40);

  // Draw controls info
  ctx.font = "16px Arial";
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.fillText(
    "PC: Use ARROW KEYS or WASD to move",
    canvas.width / 2,
    canvas.height - 100
  );
  ctx.fillText(
    "Mobile: Use the joystick to move",
    canvas.width / 2,
    canvas.height - 80
  );
  ctx.fillText(
    "Press SPACE or click START to begin",
    canvas.width / 2,
    canvas.height - 60
  );

  // Draw power-up info
  ctx.fillStyle = "rgba(255, 255, 0, 0.8)";
  ctx.fillText("★", canvas.width / 2 - 100, canvas.height - 120);
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.fillText(
    "Collect power-ups to survive longer!",
    canvas.width / 2 - 80,
    canvas.height - 120
  );
}

function drawGameOverScreen() {
  // Draw dark overlay
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw game over text with glow
  ctx.shadowColor = "rgba(255, 0, 0, 0.8)";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "white";
  ctx.font = "bold 48px Arial";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 80);

  // Reset shadow
  ctx.shadowBlur = 0;

  // Draw score with animation
  const scoreY = canvas.height / 2 - 20;
  ctx.font = "bold 32px Arial";
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillText(`Time Survived: ${score}s`, canvas.width / 2, scoreY);

  // Draw high score
  ctx.font = "24px Arial";
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.fillText(`High Score: ${highScore}s`, canvas.width / 2, scoreY + 40);

  // Draw restart instruction with pulse effect
  buttonPulse += 0.1;
  const pulseOpacity = 0.5 + Math.sin(buttonPulse) * 0.3;
  ctx.font = "20px Arial";
  ctx.fillStyle = `rgba(255, 255, 255, ${pulseOpacity})`;
  ctx.fillText(
    "Press SPACE or click RESTART to play again",
    canvas.width / 2,
    scoreY + 100
  );

  // Draw particles
  updateGameOverParticles();
  drawGameOverParticles();
}

function createGameOverParticles() {
  for (let i = 0; i < 50; i++) {
    gameOverParticles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 3 + 1,
      speedX: (Math.random() - 0.5) * 2,
      speedY: (Math.random() - 0.5) * 2,
      color: `rgba(255, ${Math.random() * 100}, ${Math.random() * 100}, 0.5)`,
    });
  }
}

function updateGameOverParticles() {
  if (gameOverParticles.length === 0) {
    createGameOverParticles();
  }

  gameOverParticles.forEach((particle) => {
    particle.x += particle.speedX;
    particle.y += particle.speedY;

    // Wrap around screen
    if (particle.x < 0) particle.x = canvas.width;
    if (particle.x > canvas.width) particle.x = 0;
    if (particle.y < 0) particle.y = canvas.height;
    if (particle.y > canvas.height) particle.y = 0;
  });
}

function drawGameOverParticles() {
  gameOverParticles.forEach((particle) => {
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function gameOver() {
  isGameOver = true;
  createExplosion(player.x, player.y, player.color);
  explosionSound.currentTime = 0;
  explosionSound.play();
  backgroundMusic.pause();
  shakeDuration = 20;
  player.color = "black";
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("loopHighScore", highScore);
  }
  restartBtn.style.display = "block";
  startBtn.style.display = "none";
  gameOverParticles = []; // Reset particles
  setTimeout(() => {
    gameState = "gameover";
    drawGameOverScreen();
  }, 100);
}

function drawScore() {
  // Draw subtle background for main stats
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fillRect(10, 10, 180, 80);

  // Draw time and high score
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`⏱️ ${score}s`, 20, 35);
  ctx.fillText(`🏆 ${highScore}s`, 20, 65);

  // Draw difficulty level
  const difficulty = Math.max(1, Math.floor((2000 - spawnInterval) / 100));
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = "16px Arial";
  ctx.fillText(`Level ${difficulty}`, 20, 95);

  // Draw power-up status if active
  if (player.invincible) {
    // Draw invincibility timer bar
    const barWidth = 150;
    const barHeight = 6;
    const barX = canvas.width / 2 - barWidth / 2;
    const barY = 20;

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Progress
    const progress = player.invincibleTimer / 180;
    ctx.fillStyle = "rgba(0, 255, 255, 0.6)";
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);

    // Text
    ctx.fillStyle = "rgba(0, 255, 255, 0.8)";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("INVINCIBLE", canvas.width / 2, barY - 5);
  }

  // Draw controls reminder for mobile
  if (window.innerWidth <= 768) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Use joystick to move", canvas.width / 2, canvas.height - 20);
  }
}

function resetGame() {
  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.dx = 0;
  player.dy = 0;
  player.speed = BASE_PLAYER_SPEED;
  player.color = "lime";
  enemies.length = 0;
  isGameOver = false;
  startTime = 0;
  score = 0;
  spawnInterval = 2000;
  lastSpawnTime = 0;
  particles.length = 0;
  powerUps.length = [];
  player.invincible = false;
  restartBtn.style.display = "none";
  startBtn.style.display = "none";
  gameOverParticles = [];
  buttonPulse = 0;
  titleAnimation = 0;

  // Reset joystick position and touch movement
  if (joystickThumb) {
    joystickThumb.style.transform = "translate(-50%, -50%)";
  }
  touchMovement.dx = 0;
  touchMovement.dy = 0;
  isJoystickActive = false;
}

function createExplosion(x, y, color) {
  for (let i = 0; i < 20; i++) {
    particles.push({
      x: x + player.size / 2,
      y: y + player.size / 2,
      radius: Math.random() * 4 + 2,
      color: color,
      dx: (Math.random() - 0.5) * 5,
      dy: (Math.random() - 0.5) * 5,
      alpha: 1,
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.dx;
    p.y += p.dy;
    p.alpha -= 0.02;
    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawParticles() {
  particles.forEach((p) => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function createPowerUp() {
  const size = 15;
  const x = Math.random() * (canvas.width - size);
  const y = Math.random() * (canvas.height - size);
  const types = ["invincibility", "bomb"];
  const type = types[Math.floor(Math.random() * types.length)];
  const color = type === "invincibility" ? "yellow" : "red";

  powerUps.push({
    x,
    y,
    size,
    color,
    type,
    lifetime: 600, // 10 seconds
    fading: false,
    alpha: 1,
    spawnScale: 0.1, // Start small for spawn animation
  });

  // Play powerup spawn sound
  powerupSound.currentTime = 0;
  powerupSound.play();
}

function triggerBombExplosion() {
  enemies.forEach((enemy) => {
    createExplosion(enemy.x, enemy.y, "orange");
  });
  enemies.length = 0;
  explosionSound.currentTime = 0;
  explosionSound.play();
}

function drawPowerUps() {
  powerUps.forEach((p) => {
    ctx.save();
    ctx.globalAlpha = p.alpha !== undefined ? p.alpha : 1;

    const scale = p.spawnScale !== undefined ? p.spawnScale : 1;
    const centerX = p.x + p.size / 2;
    const centerY = p.y + p.size / 2;

    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    const img =
      p.type === "invincibility"
        ? spriteImages.invincibility
        : spriteImages.bomb;

    ctx.drawImage(img, -p.size / 2, -p.size / 2, p.size, p.size);
    ctx.restore();
  });
}

function updatePowerUps() {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const p = powerUps[i];
    p.lifetime--;

    if (p.spawnScale < 1) {
      p.spawnScale += 0.1;
      if (p.spawnScale > 1) p.spawnScale = 1;
    }

    if (p.lifetime <= 30) {
      // últimos 30 frames (~0.5s)
      p.fading = true;
      p.alpha = p.lifetime / 30;
      p.size *= 0.97; // se va achicando
    }

    if (p.lifetime <= 0) {
      powerUps.splice(i, 1);
    }
  }
}

// ===================
// GAME LOOP
// ===================
function update(timestamp) {
  clear();

  if (gameState === "start") {
    drawStartScreen();
    animationId = requestAnimationFrame(update);
    return;
  }

  if (gameState === "gameover") {
    drawGameOverScreen();
    animationId = requestAnimationFrame(update);
    return;
  }

  // JUGANDO
  if (startTime === 0) {
    startTime = timestamp;
  }
  score = Math.floor((timestamp - startTime) / 1000);
  drawScore();
  newPos();
  drawPlayer();

  if (!lastSpawnTime || timestamp - lastSpawnTime > spawnInterval) {
    createEnemy();
    lastSpawnTime = timestamp;
  }

  updateEnemies();
  drawEnemies();
  updatePowerUps();
  drawPowerUps();
  if (player.invincible) {
    player.invincibleTimer--;
    if (player.invincibleTimer <= 0) {
      player.invincible = false;
      player.color = "lime";
    }
  }
  checkCollisions();

  // Aumentar dificultad progresiva
  if (score > 0 && score % 10 === 0 && spawnInterval > 500) {
    spawnInterval -= 5;
  }

  updateParticles();
  drawParticles();

  if (score % 15 === 0 && score !== 0 && !update.lastPowerUpScore) {
    createPowerUp();
    update.lastPowerUpScore = score;
  } else if (score % 15 !== 0) {
    update.lastPowerUpScore = null;
  }

  animationId = requestAnimationFrame(update);
}

// ===================
// CONTROLES
// ===================
function movePlayer(e) {
  // Prevent default behavior for arrow keys and WASD
  if (
    [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "w",
      "a",
      "s",
      "d",
    ].includes(e.key)
  ) {
    e.preventDefault();
  }

  switch (e.key) {
    case "ArrowUp":
    case "w":
      player.dy = -player.speed;
      break;
    case "ArrowDown":
    case "s":
      player.dy = player.speed;
      break;
    case "ArrowLeft":
    case "a":
      player.dx = -player.speed;
      break;
    case "ArrowRight":
    case "d":
      player.dx = player.speed;
      break;
  }
}

function stopPlayer(e) {
  switch (e.key) {
    case "ArrowUp":
    case "w":
    case "ArrowDown":
    case "s":
      player.dy = 0;
      break;
    case "ArrowLeft":
    case "a":
    case "ArrowRight":
    case "d":
      player.dx = 0;
      break;
  }
}

document.addEventListener("keydown", movePlayer);
document.addEventListener("keyup", stopPlayer);

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    if (gameState === "start") {
      gameState = "playing";
      backgroundMusic.currentTime = 0;
      backgroundMusic.play();
      if (!animationId) animationId = requestAnimationFrame(update);
    } else if (gameState === "gameover") {
      cancelAnimationFrame(animationId);
      animationId = null;
      resetGame();
      gameState = "playing";
      backgroundMusic.currentTime = 0;
      backgroundMusic.play();
      animationId = requestAnimationFrame(update);
    }
  }
  if (e.code === "KeyM") {
    backgroundMusic.paused ? backgroundMusic.play() : backgroundMusic.pause();
  }
});

update();

startBtn.addEventListener("click", () => {
  if (animationId) cancelAnimationFrame(animationId);
  gameState = "playing";
  backgroundMusic.currentTime = 0;
  backgroundMusic.play();
  startBtn.style.display = "none";
  animationId = requestAnimationFrame(update);
});

restartBtn.addEventListener("click", () => {
  if (animationId) cancelAnimationFrame(animationId);
  resetGame();
  gameState = "playing";
  backgroundMusic.currentTime = 0;
  backgroundMusic.play();
  animationId = requestAnimationFrame(update);
});

const touchMovement = { dx: 0, dy: 0 };
let isJoystickActive = false;
let joystickBase = document.getElementById("joystick-base");
let joystickThumb = document.getElementById("joystick-thumb");
let joystickCenter = { x: 0, y: 0 };
let joystickRadius = 0;

// Initialize joystick
function initJoystick() {
  const rect = joystickBase.getBoundingClientRect();
  joystickCenter = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
  joystickRadius = rect.width / 2;
}

// Handle joystick touch events
function handleJoystickTouch(e) {
  if (gameState !== "playing") return;

  const touch = e.touches[0];
  const touchX = touch.clientX;
  const touchY = touch.clientY;

  // Calculate distance and angle from center
  const dx = touchX - joystickCenter.x;
  const dy = touchY - joystickCenter.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Normalize and limit to joystick radius
  const normalizedDistance = Math.min(distance, joystickRadius);
  const angle = Math.atan2(dy, dx);

  // Calculate normalized movement
  const normalizedX = (normalizedDistance * Math.cos(angle)) / joystickRadius;
  const normalizedY = (normalizedDistance * Math.sin(angle)) / joystickRadius;

  // Update thumb position
  const thumbX = normalizedX * joystickRadius;
  const thumbY = normalizedY * joystickRadius;
  joystickThumb.style.transform = `translate(calc(-50% + ${thumbX}px), calc(-50% + ${thumbY}px))`;

  // Update player movement
  touchMovement.dx = normalizedX * player.speed;
  touchMovement.dy = normalizedY * player.speed;
}

function handleJoystickRelease() {
  if (gameState !== "playing") return;

  // Reset thumb position
  joystickThumb.style.transform = "translate(-50%, -50%)";

  // Reset movement
  touchMovement.dx = 0;
  touchMovement.dy = 0;
}

// Add joystick event listeners
joystickThumb.addEventListener("touchstart", (e) => {
  e.preventDefault();
  isJoystickActive = true;
  handleJoystickTouch(e);
});

document.addEventListener("touchmove", (e) => {
  if (isJoystickActive) {
    e.preventDefault();
    handleJoystickTouch(e);
  }
});

document.addEventListener("touchend", () => {
  if (isJoystickActive) {
    isJoystickActive = false;
    handleJoystickRelease();
  }
});

// Initialize joystick on window load
window.addEventListener("load", initJoystick);
window.addEventListener("resize", initJoystick);

// Configure sounds
backgroundMusic.loop = true;
backgroundMusic.volume = 0.5;
enemySpawnSound.volume = 0.15; // Lowered from 0.3
powerupSound.volume = 0.4;
