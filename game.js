const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let isGameOver = false;

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
  dy: 0
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

  enemies.push({ x, y, size, speed: 1.5, color: "red" });
}

function updateEnemies() {
  enemies.forEach(enemy => {
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
  enemies.forEach(enemy => {
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
    const collideX = player.x < enemy.x + enemy.size && player.x + player.size > enemy.x;
    const collideY = player.y < enemy.y + enemy.size && player.y + player.size > enemy.y;
    if (collideX && collideY) {
      gameOver();
      break;
    }
  }
}

function gameOver() {
  isGameOver = true;
  setTimeout(() => {
    alert("¡Has perdido!");
    document.location.reload();
  }, 100); // pequeño retraso para evitar alert en medio del frame
}

// ===================
// GAME LOOP
// ===================
function update(timestamp) {
  if (isGameOver) return;

  clear();
  newPos();
  drawPlayer();

  if (!lastSpawnTime || timestamp - lastSpawnTime > spawnInterval) {
    createEnemy();
    lastSpawnTime = timestamp;
  }

  updateEnemies();
  drawEnemies();
  checkCollisions();

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
