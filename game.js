const canvas = document.getElementById('table');
const ctx = canvas.getContext('2d');

const angleRange = document.getElementById('angleRange');
const angleInput = document.getElementById('angleInput');
const powerRange = document.getElementById('powerRange');
const shootBtn = document.getElementById('shootBtn');
const scoreEl = document.getElementById('score');
const remainingEl = document.getElementById('remaining');

const table = {
  x: 30,
  y: 30,
  w: canvas.width - 60,
  h: canvas.height - 60,
};

const POCKET_RADIUS = 24;
const BALL_RADIUS = 11;
const FRICTION = 0.992;
const STOP_EPS = 0.05;

let score = 0;

function makeBall(x, y, color, cue = false) {
  return { x, y, vx: 0, vy: 0, color, cue, active: true, r: BALL_RADIUS };
}

const cueBallStart = { x: table.x + table.w * 0.28, y: table.y + table.h / 2 };
const balls = [
  makeBall(cueBallStart.x, cueBallStart.y, '#ffffff', true),
  makeBall(table.x + table.w * 0.72, table.y + table.h / 2, '#f7c32f'),
  makeBall(table.x + table.w * 0.76, table.y + table.h / 2 - 14, '#3478f6'),
  makeBall(table.x + table.w * 0.76, table.y + table.h / 2 + 14, '#df4157'),
  makeBall(table.x + table.w * 0.80, table.y + table.h / 2 - 28, '#7fdb6a'),
  makeBall(table.x + table.w * 0.80, table.y + table.h / 2, '#8f52ff'),
  makeBall(table.x + table.w * 0.80, table.y + table.h / 2 + 28, '#ff9650'),
];

const pockets = [
  { x: table.x, y: table.y },
  { x: table.x + table.w / 2, y: table.y },
  { x: table.x + table.w, y: table.y },
  { x: table.x, y: table.y + table.h },
  { x: table.x + table.w / 2, y: table.y + table.h },
  { x: table.x + table.w, y: table.y + table.h },
];

const cueBall = () => balls.find((b) => b.cue);

function syncAngleFromRange() {
  angleInput.value = Number(angleRange.value).toFixed(1);
}

function syncAngleFromInput() {
  const parsed = Number(angleInput.value);
  if (Number.isNaN(parsed)) return;
  const bounded = ((parsed % 360) + 360) % 360;
  angleRange.value = bounded.toFixed(1);
  angleInput.value = bounded.toFixed(1);
}

function anyMoving() {
  return balls.some((b) => b.active && (Math.abs(b.vx) > STOP_EPS || Math.abs(b.vy) > STOP_EPS));
}

function shoot() {
  if (anyMoving()) return;
  const ball = cueBall();
  if (!ball?.active) return;

  const angleDeg = Number(angleRange.value);
  const angle = (angleDeg * Math.PI) / 180;
  const power = Number(powerRange.value) / 5;
  ball.vx = Math.cos(angle) * power;
  ball.vy = Math.sin(angle) * power;
}

function resolveWallCollision(ball) {
  if (ball.x - ball.r <= table.x) {
    ball.x = table.x + ball.r;
    ball.vx *= -1;
  } else if (ball.x + ball.r >= table.x + table.w) {
    ball.x = table.x + table.w - ball.r;
    ball.vx *= -1;
  }

  if (ball.y - ball.r <= table.y) {
    ball.y = table.y + ball.r;
    ball.vy *= -1;
  } else if (ball.y + ball.r >= table.y + table.h) {
    ball.y = table.y + table.h - ball.r;
    ball.vy *= -1;
  }
}

function resolveBallCollisions() {
  for (let i = 0; i < balls.length; i += 1) {
    const a = balls[i];
    if (!a.active) continue;
    for (let j = i + 1; j < balls.length; j += 1) {
      const b = balls[j];
      if (!b.active) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const minDist = a.r + b.r;

      if (dist === 0 || dist >= minDist) continue;

      const nx = dx / dist;
      const ny = dy / dist;
      const tx = -ny;
      const ty = nx;

      const dpTanA = a.vx * tx + a.vy * ty;
      const dpTanB = b.vx * tx + b.vy * ty;
      const dpNormA = a.vx * nx + a.vy * ny;
      const dpNormB = b.vx * nx + b.vy * ny;

      a.vx = tx * dpTanA + nx * dpNormB;
      a.vy = ty * dpTanA + ny * dpNormB;
      b.vx = tx * dpTanB + nx * dpNormA;
      b.vy = ty * dpTanB + ny * dpNormA;

      const overlap = minDist - dist;
      a.x -= (overlap / 2) * nx;
      a.y -= (overlap / 2) * ny;
      b.x += (overlap / 2) * nx;
      b.y += (overlap / 2) * ny;
    }
  }
}

function checkPockets(ball) {
  for (const pocket of pockets) {
    const d = Math.hypot(ball.x - pocket.x, ball.y - pocket.y);
    if (d < POCKET_RADIUS - 2) {
      if (ball.cue) {
        ball.x = cueBallStart.x;
        ball.y = cueBallStart.y;
        ball.vx = 0;
        ball.vy = 0;
      } else {
        ball.active = false;
        ball.vx = 0;
        ball.vy = 0;
        score += 1;
        scoreEl.textContent = score;
        remainingEl.textContent = balls.filter((b) => !b.cue && b.active).length;
      }
      break;
    }
  }
}

function update() {
  for (const ball of balls) {
    if (!ball.active) continue;
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vx *= FRICTION;
    ball.vy *= FRICTION;

    if (Math.abs(ball.vx) < STOP_EPS) ball.vx = 0;
    if (Math.abs(ball.vy) < STOP_EPS) ball.vy = 0;

    resolveWallCollision(ball);
    checkPockets(ball);
  }

  resolveBallCollisions();
}

function drawTable() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#4e2f19';
  ctx.fillRect(table.x - 18, table.y - 18, table.w + 36, table.h + 36);

  ctx.fillStyle = '#1a7a45';
  ctx.fillRect(table.x, table.y, table.w, table.h);

  for (const p of pockets) {
    ctx.beginPath();
    ctx.fillStyle = '#0d0d0d';
    ctx.arc(p.x, p.y, POCKET_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBalls() {
  for (const ball of balls) {
    if (!ball.active) continue;
    ctx.beginPath();
    ctx.fillStyle = ball.color;
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.stroke();
  }
}

function drawCueGuide() {
  if (anyMoving()) return;
  const ball = cueBall();
  if (!ball?.active) return;

  const angle = (Number(angleRange.value) * Math.PI) / 180;
  const len = 90;

  const x2 = ball.x + Math.cos(angle) * len;
  const y2 = ball.y + Math.sin(angle) * len;

  ctx.beginPath();
  ctx.moveTo(ball.x, ball.y);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function render() {
  drawTable();
  drawBalls();
  drawCueGuide();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

angleRange.addEventListener('input', syncAngleFromRange);
angleInput.addEventListener('change', syncAngleFromInput);
shootBtn.addEventListener('click', shoot);
window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    shoot();
  }
});

syncAngleFromRange();
render();
loop();
