import { Bird } from "./entities/Bird.js";
import { PipeManager } from "./entities/PipeManager.js";
import { Renderer } from "./systems/Renderer.js";
import { circleRectCollide } from "./systems/Collision.js";
import { lerp } from "./utils/math.js";

export class Game {
  constructor({ canvas, ctx, onScore, onState }) {
    this.canvas = canvas;
    this.ctx = ctx;

    this.W = canvas.width;
    this.H = canvas.height;
    this.GROUND = this.H - 60;

    this.onScore = onScore ?? (() => {});
    this.onState = onState ?? (() => {});

    this.running = false;
    this.score = 0;

    this.bird = new Bird({ x: 220, y: 220, r: 18 });
    this.pipes = new PipeManager({ W: this.W, ground: this.GROUND });

    this.renderer = new Renderer({
      ctx: this.ctx,
      W: this.W,
      H: this.H,
      ground: this.GROUND,
    });

    // pose control state
    this.poseOk = false;
    this.armLevel = 0.5;
    this.smooth = 0.18;

    this._lastTs = 0;
  }

  setPoseControl({ ok, level, smooth }) {
    this.poseOk = !!ok;
    if (ok) this.armLevel = level;
    this.smooth = smooth;
  }

  start() {
    this.running = true;
    this.onState("running");
  }

  stop() {
    this.running = false;
    this.onState("idle");
  }

  reset() {
    this.score = 0;
    this.onScore(this.score);

    this.bird.reset(220);
    this.pipes.reset();

    this.onState(this.running ? "running" : "idle");
  }

  gameOver() {
    this.running = false;
    this.onState("game over");
  }

  update(dt) {
    if (!this.running) return;

    // map armLevel -> targetY
    const topBand = 70;
    const bottomBand = this.GROUND - 40;
    const targetY = lerp(bottomBand, topBand, this.armLevel);

    this.bird.followTarget({ targetY, smooth: this.smooth });

    // bounds / ground
    if (this.bird.y - this.bird.r < 0) this.bird.y = this.bird.r;
    if (this.bird.y + this.bird.r > this.GROUND) {
      this.bird.y = this.GROUND - this.bird.r;
      this.gameOver();
      return;
    }

    // move pipes and collisions
    this.pipes.update(dt);

    for (const p of this.pipes.items) {
      const gapTop = p.gapY;
      const gapBottom = p.gapY + this.pipes.PIPE_GAP;

      // score
      if (!p.passed && p.x + this.pipes.PIPE_W < this.bird.x) {
        p.passed = true;
        this.score += 1;
        this.onScore(this.score);
      }

      // collision rects
      const topRect = { x: p.x, y: 0, w: this.pipes.PIPE_W, h: gapTop };
      const botRect = { x: p.x, y: gapBottom, w: this.pipes.PIPE_W, h: this.GROUND - gapBottom };

      if (
        circleRectCollide(this.bird.x, this.bird.y, this.bird.r, topRect.x, topRect.y, topRect.w, topRect.h) ||
        circleRectCollide(this.bird.x, this.bird.y, this.bird.r, botRect.x, botRect.y, botRect.w, botRect.h)
      ) {
        this.gameOver();
        return;
      }
    }
  }

  draw() {
    this.renderer.draw({
      running: this.running,
      poseOk: this.poseOk,
      bird: this.bird,
      pipes: this.pipes,
      score: this.score,
      armLevel: this.armLevel,
    });
  }

  loop() {
    const tick = (ts) => {
      if (!this._lastTs) this._lastTs = ts;
      const dt = Math.min(33, ts - this._lastTs); // clamp to avoid jumps
      this._lastTs = ts;

      this.update(dt);
      this.draw();

      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
