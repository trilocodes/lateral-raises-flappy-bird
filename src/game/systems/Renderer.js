export class Renderer {
  constructor({ ctx, W, H, ground }) {
    this.ctx = ctx;
    this.W = W;
    this.H = H;
    this.ground = ground;
  }

  draw({ running, poseOk, bird, pipes, armLevel, joints, elbowAngles }) {
    const ctx = this.ctx;

    // background
    ctx.clearRect(0, 0, this.W, this.H);
    const skyGradient = ctx.createLinearGradient(0, 0, 0, this.H);
    skyGradient.addColorStop(0, "#6cc7ff");
    skyGradient.addColorStop(1, "#2d8de0");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, this.W, this.H);

    // subtle grid
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = "#dff2ff";
    for (let x = 0; x < this.W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.H); ctx.stroke();
    }
    for (let y = 0; y < this.H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.W, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // ground
    ctx.fillStyle = "#2f8f3a";
    ctx.fillRect(0, this.ground, this.W, this.H - this.ground);
    ctx.strokeStyle = "#1f6a28";
    ctx.beginPath(); ctx.moveTo(0, this.ground); ctx.lineTo(this.W, this.ground); ctx.stroke();

    // pipes
    ctx.fillStyle = "#2fb84a";
    for (const p of pipes.items) {
      const gapTop = p.gapY;
      const gapBottom = p.gapY + pipes.PIPE_GAP;

      if (p.isTopGap) {
        // Top gap: render only lower pipe, no upper pipe
        ctx.fillRect(p.x, gapBottom, pipes.PIPE_W, this.ground - gapBottom);
        // lip only at bottom
        ctx.fillRect(p.x - 6, gapBottom, pipes.PIPE_W + 12, 10);
      } else {
        // Bottom gap: render only upper pipe, no lower pipe
        ctx.fillRect(p.x, 0, pipes.PIPE_W, gapTop);
        // lip only at top
        ctx.fillRect(p.x - 6, gapTop - 10, pipes.PIPE_W + 12, 10);
      }
    }

    ctx.fillStyle = "#27973d";
    for (const p of pipes.items) {
      const gapTop = p.gapY;
      const gapBottom = p.gapY + pipes.PIPE_GAP;

      if (p.isTopGap) {
        ctx.fillRect(p.x + pipes.PIPE_W - 10, gapBottom, 10, this.ground - gapBottom);
      } else {
        ctx.fillRect(p.x + pipes.PIPE_W - 10, 0, 10, gapTop);
      }
    }

    // bird (cartoon yellow with brown side wing lines)
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bird.r, 0, Math.PI * 2);
    ctx.fillStyle = poseOk ? "#ffd93a" : "#c5a72f";
    ctx.fill();

    // wing lines on either side
    ctx.strokeStyle = "#7a4a1d";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bird.x - bird.r + 4, bird.y - 5);
    ctx.lineTo(bird.x - bird.r - 5, bird.y);
    ctx.lineTo(bird.x - bird.r + 4, bird.y + 5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(bird.x + bird.r - 4, bird.y - 5);
    ctx.lineTo(bird.x + bird.r + 5, bird.y);
    ctx.lineTo(bird.x + bird.r - 4, bird.y + 5);
    ctx.stroke();

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
