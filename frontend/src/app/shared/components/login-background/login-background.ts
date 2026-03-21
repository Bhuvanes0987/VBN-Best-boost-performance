import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnDestroy, NgZone, OnChanges } from '@angular/core';

@Component({
  selector: 'app-login-background',
  imports: [],
  template: `<canvas #canvas style="display:block;width:100%;height:100%;"></canvas>`,
  styles: [`:host { display:block; width:100%; height:100%; }`]
})
export class LoginBackground implements AfterViewInit, OnDestroy, OnChanges {

  /** 'white' for left/orange panel, 'orange' for right/white panel */
  @Input() symbolColor: 'white' | 'orange' = 'orange';

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private animationId!: number;
  private particles: Particle[] = [];
  private W = 0;
  private H = 0;
  private t = 0;
  private ro!: ResizeObserver;

  private readonly SYMBOLS = [
    '+', '−', '×', '÷', '=',
    '∑', 'π', '√', '∫', '≈',
    '∞', 'Δ', 'α', 'β', 'θ',
    '²', '³', '%', '∂', 'λ',
  ];

  private get COLORS(): string[] {
    if (this.symbolColor === 'white') {
      // White shades for orange background
      return ['#ffffff', '#ffe8d6', '#ffcfad'];
    } else {
      // Orange shades for white background
      return ['#f97316', '#fb923c', '#ea580c', '#fdba74'];
    }
  }

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
    this.ngZone.runOutsideAngular(() => this.animate());
  }

  ngOnChanges() {
    // Re-spawn with new colors if input changes
    if (this.W && this.H) this.spawnParticles();
  }

  ngOnDestroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.ro) this.ro.disconnect();
  }

  private resize() {
    const canvas = this.canvasRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    this.W = canvas.offsetWidth;
    this.H = canvas.offsetHeight;
    canvas.width = this.W * dpr;
    canvas.height = this.H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.spawnParticles();
  }

  private spawnParticles() {
    const colors = this.COLORS;
    this.particles = Array.from({ length: 22 }, (_, i) => ({
      sym: this.SYMBOLS[i % this.SYMBOLS.length],
      baseX: Math.random() * this.W,
      baseY: Math.random() * this.H,
      size: 28 + Math.random() * 32,
      color: colors[Math.floor(Math.random() * colors.length)],
      phase: Math.random() * Math.PI * 2,
      phaseX: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.6,
      opacity: 0.3 + Math.random() * 0.45,
      rot: (Math.random() - 0.5) * 0.3,
      rotSpeed: (Math.random() - 0.5) * 0.008,
    }));
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    this.t += 0.012;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);

    for (const p of this.particles) {
      p.rot += p.rotSpeed;
      const px = p.baseX + Math.cos(this.t * p.speed * 0.6 + p.phaseX) * 12;
      const py = p.baseY + Math.sin(this.t * p.speed + p.phase) * 22;
      const pulse = 0.7 + 0.3 * Math.sin(this.t * 1.5 + p.phase);

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.opacity * pulse;
      ctx.font = `600 ${p.size}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = p.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.sym, 0, 0);
      ctx.restore();
    }
  };
}

interface Particle {
  sym: string;
  baseX: number;
  baseY: number;
  size: number;
  color: string;
  phase: number;
  phaseX: number;
  speed: number;
  opacity: number;
  rot: number;
  rotSpeed: number;
}