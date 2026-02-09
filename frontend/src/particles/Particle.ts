import type { AppState } from "../types";

const TWO_PI = Math.PI * 2;

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseX: number;
  baseY: number;
  radius: number;
  baseRadius: number;
  alpha: number;
  targetAlpha: number;
  hue: number;
  phase: number;
  waveLayer: number; // which wave layer (0, 1, 2) for multi-layer waves
  burstVx: number;
  burstVy: number;
  burstLife: number;

  constructor(canvasW: number, canvasH: number) {
    this.x = Math.random() * canvasW;
    this.y = Math.random() * canvasH;
    this.baseX = this.x;
    this.baseY = this.y;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    this.baseRadius = 1.5 + Math.random() * 2.5;
    this.radius = this.baseRadius;
    this.alpha = 0.15 + Math.random() * 0.2;
    this.targetAlpha = this.alpha;
    // Red-billed hornbill palette: warm red-coral (6) + cream-white (35)
    this.hue = Math.random() > 0.4 ? 6 : 35;
    this.phase = Math.random() * TWO_PI;
    this.waveLayer = Math.floor(Math.random() * 3); // 0, 1, or 2
    this.burstVx = 0;
    this.burstVy = 0;
    this.burstLife = 0;
  }

  update(
    dt: number,
    state: AppState,
    time: number,
    centerX: number,
    centerY: number,
    transition: number,
    canvasW: number,
    canvasH: number,
  ) {
    const t = transition;

    switch (state) {
      case "idle":
        this.updateIdle(dt);
        this.targetAlpha = 0.12 + Math.sin(time * 0.5 + this.phase) * 0.06;
        this.radius += (this.baseRadius - this.radius) * 0.02;
        break;

      case "connected":
        this.updateWave(dt, time, canvasW, canvasH, 0.4, 25, 15);
        this.targetAlpha = 0.2 + Math.sin(time * 0.8 + this.phase) * 0.08;
        this.radius += (this.baseRadius - this.radius) * 0.02;
        break;

      case "listening":
        this.updateWave(dt, time, canvasW, canvasH, 0.8, 50 + t * 40, 30 + t * 20);
        this.targetAlpha = 0.35 + Math.sin(time * 1.5 + this.phase) * 0.15;
        this.radius += (this.baseRadius * 1.1 - this.radius) * 0.03;
        break;

      case "transcribing":
        this.updateWave(dt, time, canvasW, canvasH, 1.4, 70 + t * 30, 45 + t * 15);
        this.targetAlpha = 0.5 + Math.sin(time * 3 + this.phase) * 0.2;
        this.radius += (this.baseRadius * 0.9 - this.radius) * 0.04;
        break;

      case "result":
        this.updateBurst(dt, t);
        this.targetAlpha = Math.max(0, 0.6 - t * 0.5);
        this.radius += (this.baseRadius * (1.3 + t * 1.5) - this.radius) * 0.04;
        break;
    }

    this.alpha += (this.targetAlpha - this.alpha) * 0.06;

    // Wrap horizontal (particles travel left to right)
    const pad = 40;
    if (this.x > canvasW + pad) this.x = -pad;
    if (this.x < -pad) this.x = canvasW + pad;
    // Soft vertical bounds — nudge back instead of wrapping
    if (this.y < -pad) this.vy += 0.1;
    if (this.y > canvasH + pad) this.vy -= 0.1;
  }

  private updateIdle(dt: number) {
    this.vx += (Math.random() - 0.5) * 0.02;
    this.vy += (Math.random() - 0.5) * 0.02;
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  /**
   * Sound-wave animation: particles form layered sine waves
   * traveling from left to right across the full screen width.
   */
  private updateWave(
    dt: number,
    time: number,
    canvasW: number,
    canvasH: number,
    speed: number,
    amplitude: number,
    secondaryAmp: number,
  ) {
    // Each layer has different vertical center, frequency, and speed
    const layerOffsets = [0.18, 0.35, 0.55]; // vertical positions (fraction of screen)
    const layerFreqs = [0.008, 0.012, 0.006]; // wave frequency
    const layerSpeeds = [1.0, 0.7, 1.3]; // speed multiplier

    const layerY = canvasH * layerOffsets[this.waveLayer];
    const freq = layerFreqs[this.waveLayer];
    const spdMul = layerSpeeds[this.waveLayer];

    // Traveling wave: y depends on x position and time
    const wave1 = Math.sin(this.x * freq - time * speed * spdMul + this.phase) * amplitude;
    const wave2 = Math.sin(this.x * freq * 2.3 - time * speed * spdMul * 1.5 + this.phase * 1.7) * secondaryAmp;
    const wave3 = Math.sin(this.x * freq * 0.5 + time * speed * 0.3 + this.phase * 0.5) * secondaryAmp * 0.4;

    const targetY = layerY + wave1 + wave2 + wave3;

    // Drift rightward (sound wave direction)
    const driftSpeed = 0.3 + speed * 0.4;
    this.vx += (driftSpeed - this.vx) * 0.02;

    // Pull toward wave position
    this.vy += (targetY - this.y) * 0.015;
    this.vy *= 0.9;
    this.vx *= 0.99;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  initBurst(centerX: number, centerY: number) {
    const dx = this.x - centerX;
    const dy = this.y - centerY;
    const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.8;
    const speed = 4 + Math.random() * 6;
    this.burstVx = Math.cos(angle) * speed;
    this.burstVy = Math.sin(angle) * speed;
    this.burstLife = 1;
    this.vx = 0;
    this.vy = 0;
  }

  private updateBurst(dt: number, t: number) {
    if (t < 0.5) {
      this.x += this.burstVx * dt;
      this.y += this.burstVy * dt;
      this.burstVx *= 0.96;
      this.burstVy *= 0.96;
    } else {
      const returnT = (t - 0.5) / 0.5;
      const eased = returnT * returnT;
      this.vx += (this.baseX - this.x) * 0.004 * eased;
      this.vy += (this.baseY - this.y) * 0.004 * eased;
      this.vx *= 0.95;
      this.vy *= 0.95;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.burstVx *= 0.9;
      this.burstVy *= 0.9;
      this.x += this.burstVx * dt * (1 - eased);
      this.y += this.burstVy * dt * (1 - eased);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.alpha < 0.01) return;

    const saturation = this.hue === 6 ? "75%" : "30%";
    const lightness = this.hue === 6 ? "55%" : "80%";

    // Glow
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 3, 0, TWO_PI);
    ctx.fillStyle = `hsla(${this.hue}, ${saturation}, ${lightness}, ${this.alpha * 0.15})`;
    ctx.fill();

    // Core
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, TWO_PI);
    ctx.fillStyle = `hsla(${this.hue}, ${saturation}, ${lightness}, ${this.alpha})`;
    ctx.fill();
  }

  resetBurst() {
    this.burstLife = 0;
    this.burstVx = 0;
    this.burstVy = 0;
  }
}
