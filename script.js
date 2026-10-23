const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const remainingEl = document.getElementById("remaining");
const message = document.getElementById("message");

const cx = 250;
const cy = 210;
const radius = 105;

let score = 0;
let level = 1;
let remaining = 6;
let angle = 0;
let speed = 0.025;
let direction = 1;

let knives = [];
let flying = null;
let particles = [];
let running = true;
let transitioning = false;
let lastTime = 0;
let transitionTimer = null;
let directionTimer = 0;

// Jumlah pisau yang wajib dilempar per level
function knivesRequired() {
  return Math.min(6 + (level - 1) * 2, 24);
}

// Kecepatan target meningkat per level
function getLevelSpeed() {
  return Math.min(0.025 + (level - 1) * 0.006, 0.10);
}

function updateInfo() {
  scoreEl.textContent = score;
  levelEl.textContent = level;
  remainingEl.textContent = remaining;
}

function drawKnife(x, y, rotation, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);

  ctx.beginPath();
  ctx.moveTo(0, -27);
  ctx.lineTo(8, -5);
  ctx.lineTo(5, 8);
  ctx.lineTo(-5, 8);
  ctx.lineTo(-8, -5);
  ctx.closePath();

  ctx.fillStyle = "#e4edf7";
  ctx.fill();
  ctx.strokeStyle = "#71839a";
  ctx.stroke();

  ctx.fillStyle = "#e7aa55";
  ctx.fillRect(-5, 7, 10, 17);

  ctx.fillStyle = "#704a2a";
  ctx.fillRect(-4, 11, 8, 10);

  ctx.restore();
}

function drawTarget() {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // Bayangan
  ctx.beginPath();
  ctx.arc(4, 5, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#0005";
  ctx.fill();

  // Papan kayu
  const wood = ctx.createRadialGradient(
    -25, -30, 5, 0, 0, radius
  );

  wood.addColorStop(0, "#dfa15e");
  wood.addColorStop(1, "#8c4d29");

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = wood;
  ctx.fill();

  ctx.lineWidth = 7;
  ctx.strokeStyle = "#edbb7c";
  ctx.stroke();

  // Lingkaran kayu
  [30, 55, 80].forEach(r => {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = "#b87a43";
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fillStyle = "#713d23";
  ctx.fill();

  // Pisau yang sudah menancap
  knives.forEach(k => {
    const x = Math.cos(k.angle) * (radius - 5);
    const y = Math.sin(k.angle) * (radius - 5);

    drawKnife(x, y, k.angle + Math.PI / 2, 0.9);
  });

  ctx.restore();
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 35; i++) {
    const x = (i * 83 + 27) % canvas.width;
    const y = (i * 47 + 13) % canvas.height;

    ctx.fillStyle = "#ffffff22";
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function draw() {
  drawBackground();
  drawTarget();

  if (running && !flying && remaining > 0) {
    drawKnife(cx, 490, 0);
  }

  if (flying) {
    drawKnife(flying.x, flying.y, 0);
  }

  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life / 25);
    ctx.fillStyle = p.color;

    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.globalAlpha = 1;
  ctx.textAlign = "center";
  ctx.fillStyle = "#d4deed";
  ctx.font = "15px Arial";
  ctx.fillText("LEVEL " + level, cx, 30);
}

function throwKnife() {
  if (!running || transitioning || flying || remaining <= 0) {
    return;
  }

  remaining--;

  flying = {
    x: cx,
    y: 490,
    speed: 13
  };

  updateInfo();
}

function checkCollision(relativeAngle) {
  return knives.some(k => {
    const diff = Math.atan2(
      Math.sin(k.angle - relativeAngle),
      Math.cos(k.angle - relativeAngle)
    );

    // Jarak antarpisau makin ketat pada level tinggi
    const limit = Math.max(0.14, 0.22 - level * 0.003);
    return Math.abs(diff) < limit;
  });
}

function endGame() {
  running = false;
  transitioning = false;
  flying = null;

  message.textContent =
    "?? GAME OVER! Skor akhir: " + score +
    ". Tekan ULANGI untuk mencoba lagi.";
}

// Dipanggil saat semua pisau di level ini berhasil dilempar
function completeLevel() {
  if (transitioning || !running) return;

  transitioning = true;
  running = false;

  message.textContent =
    "?? Level " + level + " selesai! Bersiap ke level " +
    (level + 1) + "...";

  // Beri jeda sebelum level berikutnya
  transitionTimer = setTimeout(() => {
    level++;

    // Pisau di papan dibersihkan agar level tetap bisa diselesaikan
    knives = [];
    flying = null;
    remaining = knivesRequired();

    // Kecepatan baru sesuai level
    speed = getLevelSpeed();

    // Level lebih tinggi lebih sering berganti arah
    directionTimer = 0;

    transitioning = false;
    running = true;
    lastTime = 0;

    updateInfo();
    message.textContent =
      "?? Level " + level + "! Target makin sulit!";

    requestAnimationFrame(loop);
  }, 1500);
}

function update(dt) {
  if (!running) return;

  // Putaran target
  angle += speed * direction * dt;
  directionTimer += dt;

  // Mulai level 3, target dapat membalik arah
  if (level >= 3 && directionTimer > Math.max(45, 150 - level * 5)) {
    direction *= -1;
    directionTimer = 0;
  }

  if (flying) {
    flying.y -= flying.speed * dt;

    const dx = flying.x - cx;
    const dy = flying.y - cy;
    const distance = Math.hypot(dx, dy);

    if (distance <= radius + 12) {
      const actualAngle = Math.atan2(dy, dx);
      const relativeAngle = actualAngle - angle;

      if (checkCollision(relativeAngle)) {
        for (let i = 0; i < 20; i++) {
          particles.push({
            x: flying.x,
            y: flying.y,
            vx: (Math.random() - 0.5) * 7,
            vy: (Math.random() - 0.5) * 7,
            life: 25,
            color: i % 2 ? "#ffbd59" : "#ff6262"
          });
        }

        endGame();
      } else {
        knives.push({ angle: relativeAngle });
        flying = null;

        score += 10;
        updateInfo();

        // Level selesai hanya jika semua pisau sudah dilempar
        if (remaining === 0) {
          completeLevel();
        } else {
          message.textContent = "Mantap! Teruskan!";
        }
      }
    }
  }

  particles.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 0.12 * dt;
    p.life -= dt;
  });

  particles = particles.filter(p => p.life > 0);
}

function loop(time) {
  if (!running) {
    draw();
    return;
  }

  const dt = Math.min(
    2,
    (time - (lastTime || time)) / 16.67
  );

  lastTime = time;

  update(dt);
  draw();

  if (running) {
    requestAnimationFrame(loop);
  }
}

function restart() {
  clearTimeout(transitionTimer);

  score = 0;
  level = 1;
  remaining = knivesRequired();
  angle = 0;
  speed = getLevelSpeed();
  direction = 1;
  directionTimer = 0;

  knives = [];
  flying = null;
  particles = [];

  transitioning = false;
  running = true;
  lastTime = 0;

  updateInfo();
  message.textContent = "Klik LEMPAR atau tekan SPASI!";

  requestAnimationFrame(loop);
}

document.getElementById("throwBtn")
  .addEventListener("click", throwKnife);

document.getElementById("restartBtn")
  .addEventListener("click", restart);

canvas.addEventListener("click", throwKnife);

window.addEventListener("keydown", e => {
  if (e.code === "Space") {
    e.preventDefault();
    throwKnife();
  }
});

updateInfo();
draw();
requestAnimationFrame(loop);
