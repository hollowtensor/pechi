import type { AppState } from "../types";
import { Particle } from "./Particle";

const PARTICLE_COUNT = 140;
const TRANSITION_SPEED = 0.015; // how fast state transitions ease in

export class ParticleSystem {
  private particles: Particle[] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrame: number = 0;
  private state: AppState = "idle";
  private prevState: AppState = "idle";
  private transitionProgress: number = 1; // 1 = fully in current state
  private time: number = 0;
  private lastTimestamp: number = 0;
  private running: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.resize();
    this.initParticles();
  }

  private initParticles() {
    this.particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push(new Particle(this.canvas.width, this.canvas.height));
    }
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  setState(newState: AppState) {
    if (newState === this.state) return;
    this.prevState = this.state;
    this.state = newState;
    this.transitionProgress = 0;

    const rect = this.canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height * 0.35; // center of wave area

    for (const p of this.particles) {
      p.vx *= 0.2;
      p.vy *= 0.2;
      if (newState === "result") {
        // Burst outward from each particle's current position (wave scatter)
        p.initBurst(cx, cy);
      }
      if (this.prevState === "result") {
        p.resetBurst();
      }
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = performance.now();
    this.loop(this.lastTimestamp);
  }

  stop() {
    this.running = false;
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
    }
  }

  private loop = (timestamp: number) => {
    if (!this.running) return;

    const rawDt = (timestamp - this.lastTimestamp) / 16.67; // normalize to ~60fps
    const dt = Math.min(rawDt, 3); // cap to avoid jumps on tab switch
    this.lastTimestamp = timestamp;
    this.time += dt * 0.02;

    // Ease transition
    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + TRANSITION_SPEED * dt);
    }

    this.update(dt);
    this.draw();

    this.animFrame = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h * 0.35; // center of wave area

    for (const p of this.particles) {
      p.update(dt, this.state, this.time, cx, cy, this.easeTransition(), w, h);
    }
  }

  private easeTransition(): number {
    // Expo ease out
    const t = this.transitionProgress;
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  private draw() {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    // Full clear each frame — no trail artifacts
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.fillStyle = "#0d0c0f";
    this.ctx.fillRect(0, 0, w, h);

    // Draw connections between nearby particles (subtle)
    this.drawConnections(w, h);

    // Draw particles
    for (const p of this.particles) {
      p.draw(this.ctx);
    }

    // Horizontal wave glow during active states
    if (this.state !== "idle") {
      this.drawWaveGlow(w, h);
    }
  }

  private drawConnections(w: number, h: number) {
    let maxDist: number;
    let baseAlpha: number;
    let lineW: number;

    switch (this.state) {
      case "listening":
        maxDist = 120;
        baseAlpha = 0.15 + Math.sin(this.time * 4) * 0.05; // pulse
        lineW = 0.8;
        break;
      case "transcribing":
        maxDist = 140;
        baseAlpha = 0.2 + Math.sin(this.time * 8) * 0.08; // fast pulse
        lineW = 1.0;
        break;
      case "thinking":
        maxDist = 100;
        baseAlpha = 0.1 + Math.sin(this.time * 3) * 0.04; // slow pulse
        lineW = 0.6;
        break;
      case "result":
        maxDist = 100;
        baseAlpha = 0.12 * (1 - this.easeTransition()); // fade out during burst
        lineW = 0.6;
        break;
      case "connected":
        maxDist = 70;
        baseAlpha = 0.05;
        lineW = 0.4;
        break;
      default: // idle
        maxDist = 55;
        baseAlpha = 0.025;
        lineW = 0.3;
        break;
    }

    this.ctx.lineWidth = lineW;

    for (let i = 0; i < this.particles.length; i++) {
      const a = this.particles[i];
      for (let j = i + 1; j < this.particles.length; j++) {
        const b = this.particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < maxDist * maxDist) {
          const dist = Math.sqrt(distSq);
          const proximity = 1 - dist / maxDist;
          // Flicker: each connection has a unique phase from particle positions
          const flicker = (this.state === "listening" || this.state === "transcribing" || this.state === "thinking")
            ? 0.5 + 0.5 * Math.sin(this.time * 6 + a.phase + b.phase)
            : 1;
          const alpha = baseAlpha * proximity * flicker;
          const hue = a.hue === b.hue ? a.hue : 18;
          this.ctx.beginPath();
          this.ctx.moveTo(a.x, a.y);
          this.ctx.lineTo(b.x, b.y);
          this.ctx.strokeStyle = `hsla(${hue}, 60%, 55%, ${alpha})`;
          this.ctx.stroke();
        }
      }
    }
  }

  /**
   * Draws ambient glow bands along the three wave layers,
   * matching the horizontal sound-wave particle layout.
   */
  private drawWaveGlow(w: number, h: number) {
    const layerOffsets = [0.18, 0.35, 0.55]; // matches Particle.ts wave layers
    let glowSpread: number;
    let glowAlpha: number;

    switch (this.state) {
      case "connected":
        glowSpread = 60;
        glowAlpha = 0.025;
        break;
      case "listening":
        glowSpread = 90 + Math.sin(this.time * 3) * 20;
        glowAlpha = 0.04;
        break;
      case "transcribing":
        glowSpread = 70 + Math.sin(this.time * 6) * 15;
        glowAlpha = 0.06;
        break;
      case "thinking":
        glowSpread = 80 + Math.sin(this.time * 2) * 10;
        glowAlpha = 0.035;
        break;
      case "result": {
        const t = this.easeTransition();
        glowSpread = 120 * t;
        glowAlpha = 0.05 * (1 - t);
        break;
      }
      default:
        return;
    }

    for (let i = 0; i < layerOffsets.length; i++) {
      const cy = h * layerOffsets[i];
      // Horizontal band glow — wide elliptical gradient
      const gradient = this.ctx.createRadialGradient(
        w / 2, cy, 0,
        w / 2, cy, glowSpread * 2,
      );
      const layerAlpha = glowAlpha * (i === 1 ? 1.2 : 0.8); // center layer slightly brighter
      gradient.addColorStop(0, `hsla(6, 75%, 55%, ${layerAlpha})`);
      gradient.addColorStop(0.4, `hsla(35, 40%, 75%, ${layerAlpha * 0.3})`);
      gradient.addColorStop(1, "transparent");

      // Stretch horizontally to create a band effect
      this.ctx.save();
      this.ctx.scale(w / (glowSpread * 4), 1);
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, glowSpread * 4, h);
      this.ctx.restore();
    }
  }

  destroy() {
    this.stop();
    this.particles = [];
  }
}
