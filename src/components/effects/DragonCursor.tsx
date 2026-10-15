import React, { useEffect, useRef } from 'react';
import { useSettings } from '../../lib/settings';

/**
 * Decorative "dragon skeleton" that trails the mouse pointer.
 *
 * - Canvas only, `pointer-events: none`, so it can never block a click.
 * - Desktop / fine pointers only (hidden on touch screens).
 * - Off when the user enables Reduced Motion (app setting or OS setting) or Data Saver.
 * - Can be turned off in Settings → "Dragon cursor".
 * - Stops its animation loop when the pointer is idle, so it costs no CPU at rest.
 */

const SEGMENTS = 56; // vertebrae from head to tail tip
const WING_AT = [7, 19]; // vertebra indexes that carry a fan of "feathers"
const FEATHERS = 7; // arcs per side of each fan
const IDLE_STOP_MS = 3000;

type Pt = { x: number; y: number };

function segmentSpacing(i: number): number {
  return Math.max(5, 18 - i * 0.22);
}

export const DragonCursor: React.FC = () => {
  const { settings } = useSettings();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const enabled =
    settings.dragonCursor !== false && !settings.reducedMotion && !settings.dataSaverMode;

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const osReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!finePointer.matches || osReduced.matches) return;

    const context2d = canvas.getContext('2d');
    if (!context2d) return;
    const ctx: CanvasRenderingContext2D = context2d;

    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const pts: Pt[] = [];
    const target: Pt = { x: -999, y: -999 };
    let started = false;
    let running = false;
    let raf = 0;
    let lastMove = 0;
    let speed = 0;

    const inkColor = (): string => (document.documentElement.classList.contains('dark') ? '226,232,240' : '28,27,25');

    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      target.x = e.clientX;
      target.y = e.clientY;
      lastMove = performance.now();
      if (!started) {
        started = true;
        for (let i = 0; i < SEGMENTS; i++) pts[i] = { x: e.clientX - i, y: e.clientY };
      }
      start();
    };

    const drawVertebra = (x: number, y: number, angle: number, s: number, alpha: number, ink: string) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      const g = ctx.createLinearGradient(-s, 0, s * 1.2, 0);
      g.addColorStop(0, `rgba(${ink},${(alpha * 0.25).toFixed(3)})`);
      g.addColorStop(1, `rgba(${ink},${alpha.toFixed(3)})`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(s * 1.2, 0);
      ctx.quadraticCurveTo(s * 0.2, -s * 0.95, -s * 0.9, -s * 0.6);
      ctx.quadraticCurveTo(-s * 0.35, 0, -s * 0.9, s * 0.6);
      ctx.quadraticCurveTo(s * 0.2, s * 0.95, s * 1.2, 0);
      ctx.fill();
      ctx.restore();
    };

    const drawFan = (x: number, y: number, angle: number, scale: number, alpha: number, ink: string, time: number, phase: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.6;
      const flutter = Math.sin(time * 0.004 + phase) * 0.06;
      for (const side of [-1, 1]) {
        for (let j = 0; j < FEATHERS; j++) {
          const t = j / (FEATHERS - 1);
          const reach = (95 + 85 * (1 - Math.abs(t - 0.4))) * scale;
          const spread = (0.35 + t * 1.15 + flutter) * side;
          const sx = 8 - j * 9;
          const ex = sx - Math.cos(spread) * reach * 0.55 - reach * 0.35;
          const ey = Math.sin(spread) * reach;
          const cx = sx + reach * 0.35;
          const cy = side * reach * 0.55;
          const g = ctx.createLinearGradient(sx, 0, ex, ey);
          g.addColorStop(0, `rgba(${ink},${(alpha * 0.8).toFixed(3)})`);
          g.addColorStop(1, `rgba(${ink},0)`);
          ctx.strokeStyle = g;
          ctx.beginPath();
          ctx.moveTo(sx, 0);
          ctx.quadraticCurveTo(cx, cy, ex, ey);
          ctx.stroke();
        }
      }
      ctx.restore();
    };

    const drawHead = (x: number, y: number, angle: number) => {
      const h = 16;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.moveTo(h * 1.1, h * 0.1);
      ctx.quadraticCurveTo(h * 0.5, -h * 0.85, -h * 0.9, -h * 0.55);
      ctx.quadraticCurveTo(-h * 0.35, 0, -h * 0.9, h * 0.6);
      ctx.quadraticCurveTo(h * 0.6, h * 0.8, h * 1.1, h * 0.1);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(h * 0.1, -h * 0.18, h * 0.28, h * 0.12, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    function frame(now: number) {
      raf = 0;
      if (document.hidden) {
        running = false;
        return;
      }

      // Head eases toward the pointer; every other vertebra follows the one in front.
      const head = pts[0];
      const px = head.x;
      const py = head.y;
      head.x += (target.x - head.x) * 0.22;
      head.y += (target.y - head.y) * 0.22;
      const moved = Math.hypot(head.x - px, head.y - py);
      speed += (Math.min(moved / 12, 1) - speed) * 0.15;

      for (let i = 1; i < SEGMENTS; i++) {
        const prev = pts[i - 1];
        const cur = pts[i];
        const dx = cur.x - prev.x;
        const dy = cur.y - prev.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        const k = segmentSpacing(i) / d;
        cur.x = prev.x + dx * k;
        cur.y = prev.y + dy * k;
      }

      ctx.clearRect(0, 0, width, height);
      const ink = inkColor();

      // Tail first, head last, so the head sits on top.
      for (let i = SEGMENTS - 1; i >= 1; i--) {
        const p = pts[i];
        const ahead = pts[i - 1];
        const angle = Math.atan2(ahead.y - p.y, ahead.x - p.x);
        const t = i / SEGMENTS;
        const size = 2.5 + 12 * Math.pow(1 - t, 1.1);
        const alpha = 0.95 - t * 0.8;
        const wave = Math.sin(now * 0.006 - i * 0.45) * speed * 3 * t;
        const ox = -Math.sin(angle) * wave;
        const oy = Math.cos(angle) * wave;

        if (WING_AT.includes(i)) {
          const scale = i === WING_AT[0] ? 1 : 0.85;
          drawFan(p.x + ox, p.y + oy, angle, scale, Math.max(alpha, 0.35), ink, now, i);
        }
        drawVertebra(p.x + ox, p.y + oy, angle, size, alpha, ink);
      }

      const neck = pts[1];
      drawHead(head.x, head.y, Math.atan2(head.y - neck.y, head.x - neck.x));

      const settled = moved < 0.05 && now - lastMove > IDLE_STOP_MS;
      if (settled) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    const onVisibility = () => {
      if (!document.hidden && started) start();
    };
    const onLeave = () => {
      lastMove = performance.now();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    document.documentElement.addEventListener('pointerleave', onLeave);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
      running = false;
      ctx.clearRect(0, 0, width, height);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 2147483000 }}
    />
  );
};
