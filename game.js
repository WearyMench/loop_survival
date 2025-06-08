const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let isGameOver = false;
let startTime = 0;
let score = 0;
let gameState = "start"; // puede ser "start", "playing", "gameover"
const BASE_PLAYER_SPEED = 3;
const BASE_ENEMY_SPEED = 1.5;


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
    ctx.fillStyle = enemy.color;
    ctx.fillRect(enemy.x, enemy.y, enemy.size, enemy.size);
  });
}

// ===================
// UTILIDADES
// ===================
function clear() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawPlayer() {
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.size, player.size);
}

function newPos() {
  player.x += player.dx;
  player.y += player.dy;

  player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.size, player.y));
}

function checkCollisions() {
  for (const enemy of enemies) {
    const collideX =
      player.x < enemy.x + enemy.size && player.x + player.size > enemy.x;
    const collideY =
      player.y < enemy.y + enemy.size && player.y + player.size > enemy.y;
    if (collideX && collideY) {
      gameOver();
      break;
    }
  }
}

function gameOver() {
  isGameOver = true;
  gameState = "gameover";
}

function drawScore() {
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`Tiempo: ${score}s`, 10, 25);
}

function drawStartScreen() {
  ctx.fillStyle = "white";
  ctx.font = "30px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Loop Survival", canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = "20px Arial";
  ctx.fillText("Presiona ESPACIO para comenzar", canvas.width / 2, canvas.height / 2 + 20);
}

function drawGameOverScreen() {
  ctx.fillStyle = "white";
  ctx.font = "30px Arial";
  ctx.textAlign = "center";
  ctx.fillText("¡Has perdido!", canvas.width / 2, canvas.height / 2 - 30);
  ctx.font = "20px Arial";
  ctx.fillText(`Sobreviviste ${score} segundos`, canvas.width / 2, canvas.height / 2);
  ctx.fillText("Presiona ESPACIO para reiniciar", canvas.width / 2, canvas.height / 2 + 30);
}

function resetGame() {
  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.dx = 0;
  player.dy = 0;
  player.speed = BASE_PLAYER_SPEED;

  enemies.length = 0;
  isGameOver = false;
  startTime = 0;
  score = 0;
  spawnInterval = 2000;
  lastSpawnTime = 0;
}


// ===================
// GAME LOOP
// ===================
function update(timestamp) {
  clear();

  if (gameState === "start") {
    drawStartScreen();
    return requestAnimationFrame(update);
  }

  if (gameState === "gameover") {
    drawGameOverScreen();
    return requestAnimationFrame(update);
  }

  // JUGANDO
  if (startTime === 0) {
    startTime = Date.now();
  }
  score = Math.floor((Date.now() - startTime) / 1000);
  drawScore();
  newPos();
  drawPlayer();

  if (!lastSpawnTime || timestamp - lastSpawnTime > spawnInterval) {
    createEnemy();
    lastSpawnTime = timestamp;
  }

  updateEnemies();
  drawEnemies();
  checkCollisions();

  // Aumentar dificultad progresiva
  if (score > 0 && score % 10 === 0 && spawnInterval > 500) {
    spawnInterval -= 5;
  }

  requestAnimationFrame(update);
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

requestAnimationFrame(update);

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    if (gameState === "start") {
      gameState = "playing";
      requestAnimationFrame(update);
    } else if (gameState === "gameover") {
      resetGame();
      gameState = "playing";
      requestAnimationFrame(update);
    }
  }
});
