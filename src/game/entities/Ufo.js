import { CONFIG } from '../config.js';

export class Ufo {
  constructor(fromRight) {
    this.x = fromRight ? CONFIG.WIDTH + 30 : -30;
    this.y = 55;
    this.z = -2;
    this.speed = fromRight ? -CONFIG.UFO_SPEED : CONFIG.UFO_SPEED;
    this.alive = true;
  }

  update(dt) {
    this.x += this.speed * dt;
    if (this.x < -50 || this.x > CONFIG.WIDTH + 50) {
      this.alive = false;
    }
  }
}
