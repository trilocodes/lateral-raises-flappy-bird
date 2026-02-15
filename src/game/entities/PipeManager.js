export class PipeManager {
  constructor({ W, ground }) {
    this.W = W;
    this.ground = ground;

    this.PIPE_W = 80;
    this.PIPE_GAP = 220;
    this.PIPE_SPACING = 300; // Shortened gap between pipes
    this.SCROLL_SPEED = 3.1;

    this.items = [];
    this.spawnIndex = 0; // Track which pipe type to spawn next
  }

  reset() {
    this.items = [];
    this.spawnIndex = 0;
    for (let i = 0; i < 4; i++) this.spawn(this.W + i * this.PIPE_SPACING);
  }

  spawn(x) {
    // Alternate between gap at top and gap at bottom
    let gapY;
    let isTopGap = this.spawnIndex % 2 === 0;
    if (isTopGap) {
      // Gap at top
      gapY = 50;
    } else {
      // Gap at bottom
      gapY = this.ground - this.PIPE_GAP - 50;
    }
    this.spawnIndex++;
    this.items.push({ x, gapY, passed: false, isTopGap });
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
