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
};

spriteImages.player.src = "assets/player.png";
spriteImages.enemy.src = "assets/enemy.png";
spriteImages.invincibility.src = "assets/power_invincibility.png";
spriteImages.bomb.src = "assets/power_bomb.png";

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

  const edge = Math.floor(Math.random() * 4);
  switch (edge) {
    case 0: // arriba
      x = Math.random() * canvas.width;
      y = -size;
      break;
    case 1: // abajo
      x = Math.random() * canvas.width;
      y = canvas.height + size;
      break;
    case 2: // izquierda
      x = -size;
      y = Math.random() * canvas.height;
      break;
    case 3: // derecha
      x = canvas.width + size;
      y = Math.random() * canvas.height;
      break;
  }

  const baseSpeed = BASE_ENEMY_SPEED + score * 0.05;
  enemies.push({ x, y, size, speed: baseSpeed, color: "red" });
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);
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
  setTimeout(() => {
    gameState = "gameover";
    drawGameOverScreen();
  }, 100);
}

function drawScore() {
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`Time: ${score}s`, 10, 25);
  ctx.fillText(`High Score: ${highScore}s`, 10, 50);
}

function drawStartScreen() {
  ctx.fillStyle = "white";
  ctx.font = "30px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Loop Survival", canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = "20px Arial";
  ctx.fillText(
    "Press SPACE to start",
    canvas.width / 2,
    canvas.height / 2 + 20
  );
}

function drawGameOverScreen() {
  ctx.fillStyle = "white";
  ctx.font = "30px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 50);
  ctx.font = "20px Arial";
  ctx.fillText(
    `You survived ${score} seconds`,
    canvas.width / 2,
    canvas.height / 2 - 10
  );
  ctx.fillText(
    `High Score: ${highScore} seconds`,
    canvas.width / 2,
    canvas.height / 2 + 20
  );
  ctx.fillText(
    "Press SPACE to restart",
    canvas.width / 2,
    canvas.height / 2 + 50
  );
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
    lifetime: 600, // 10 segundos
    fading: false,
    alpha: 1,
    spawnScale: 1,
  });
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

const arrows = {
  up: document.querySelector(".arrow.up"),
  down: document.querySelector(".arrow.down"),
  left: document.querySelector(".arrow.left"),
  right: document.querySelector(".arrow.right"),
};

let touchMovement = { dx: 0, dy: 0 };

// Asociar movimiento con botones táctiles
arrows.up.addEventListener(
  "touchstart",
  () => (touchMovement.dy = -player.speed)
);
arrows.down.addEventListener(
  "touchstart",
  () => (touchMovement.dy = player.speed)
);
arrows.left.addEventListener(
  "touchstart",
  () => (touchMovement.dx = -player.speed)
);
arrows.right.addEventListener(
  "touchstart",
  () => (touchMovement.dx = player.speed)
);

["up", "down"].forEach((dir) => {
  arrows[dir].addEventListener("touchend", () => (touchMovement.dy = 0));
});
["left", "right"].forEach((dir) => {
  arrows[dir].addEventListener("touchend", () => (touchMovement.dx = 0));
});

window.addEventListener(
  "keydown",
  function (e) {
    // Solo bloquear si se presionan flechas y estamos jugando
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code) &&
      gameState === "playing"
    ) {
      e.preventDefault(); // 🔒 Evita que el navegador haga scroll
    }
  },
  { passive: false }
);
