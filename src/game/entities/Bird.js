import { lerp } from "../utils/math.js";

export class Bird {
  constructor({ x, y, r }) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.vy = 0;
    this.targetY = y;
  }

  reset(y = 220) {
    this.y = y;
    this.vy = 0;
    this.targetY = y;
  }

  followTarget({ targetY, smooth }) {
    this.targetY = targetY;
    // simple smooth follow (feels "reel-like")
    this.vy = lerp(this.vy, (this.targetY - this.y) * 0.18, smooth);
    this.y += this.vy;
  }
}
