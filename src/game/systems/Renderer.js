export class Renderer {
  constructor({ ctx, W, H, ground }) {
    this.ctx = ctx;
    this.W = W;
    this.H = H;
    this.ground = ground;
  }

  draw({ running, poseOk, bird, pipes, armLevel }) {
    const ctx = this.ctx;

    // background
    ctx.clearRect(0, 0, this.W, this.H);
    ctx.fillStyle = "#0b0b0b";
    ctx.fillRect(0, 0, this.W, this.H);

    // subtle grid
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "#ffffff";
    for (let x = 0; x < this.W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.H); ctx.stroke();
    }
    for (let y = 0; y < this.H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.W, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // ground
    ctx.fillStyle = "#141414";
    ctx.fillRect(0, this.ground, this.W, this.H - this.ground);
    ctx.strokeStyle = "#2b2b2b";
    ctx.beginPath(); ctx.moveTo(0, this.ground); ctx.lineTo(this.W, this.ground); ctx.stroke();

    // pipes
    ctx.fillStyle = "#d9d9d9";
    for (const p of pipes.items) {
      const gapTop = p.gapY;
      const gapBottom = p.gapY + pipes.PIPE_GAP;

      ctx.fillRect(p.x, 0, pipes.PIPE_W, gapTop);
      ctx.fillRect(p.x, gapBottom, pipes.PIPE_W, this.ground - gapBottom);

      // lip
      ctx.fillRect(p.x - 6, gapTop - 10, pipes.PIPE_W + 12, 10);
      ctx.fillRect(p.x - 6, gapBottom, pipes.PIPE_W + 12, 10);
    }

    // bird
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bird.r, 0, Math.PI * 2);
    ctx.fillStyle = poseOk ? "#ffffff" : "#777";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bird.x + 6, bird.y - 4, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#000";
    ctx.fill();

    // target indicator (based on armLevel)
    const topBand = 70;
    const bottomBand = this.ground - 40;
    const targetY = bottomBand + (topBand - bottomBand) * armLevel;
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(bird.x - 40, targetY);
    ctx.lineTo(bird.x + 40, targetY);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // overlay
    ctx.fillStyle = "#fff";
    ctx.font = "18px system-ui, Arial";
    ctx.fillText(running ? "Raise arms to fly" : "Press Start", 18, 28);
    ctx.font = "14px system-ui, Arial";
    ctx.globalAlpha = 0.75;
    ctx.fillText("Keep shoulders + wrists visible to camera", 18, 50);
    ctx.globalAlpha = 1;
  }
}
