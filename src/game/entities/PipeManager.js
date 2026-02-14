export class PipeManager {
  constructor({ W, ground }) {
    this.W = W;
    this.ground = ground;

    this.PIPE_W = 80;
    this.PIPE_GAP = 170;
    this.PIPE_SPACING = 320;
    this.SCROLL_SPEED = 3.3;

    this.items = [];
  }

  reset() {
    this.items = [];
    for (let i = 0; i < 4; i++) this.spawn(this.W + i * this.PIPE_SPACING);
  }

  spawn(x) {
    const margin = 70;
    const gapY = margin + Math.random() * (this.ground - margin - this.PIPE_GAP);
    this.items.push({ x, gapY, passed: false });
  }

  update(dt) {
    // dt exists if later you want framerate-independent speed
    for (const p of this.items) p.x -= this.SCROLL_SPEED;

    // recycle
    if (this.items.length && this.items[0].x + this.PIPE_W < -10) {
      this.items.shift();
      const lastX = this.items[this.items.length - 1].x;
      this.spawn(lastX + this.PIPE_SPACING);
    }
  }
}
