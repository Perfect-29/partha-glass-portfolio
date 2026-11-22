import React, { useEffect, useRef } from 'react';
import { DEFAULT_FIRE_EFFECTS_SETTINGS, type FireEffectsSettings } from '../data/fireEffects';

const SPARK_POOL = 160;
const BRANCH_POOL = 24;

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  gravity: number;
  color: string;
}

interface Branch {
  pts: number[];
  life: number;
  max: number;
  width: number;
  bright: boolean;
  color: string;
}

interface TrailPoint {
  x: number;
  y: number;
  t: number;
}

function generateBranch(
  originX: number,
  originY: number,
  angle: number,
  length: number,
  pts: number[]
) {
  pts.length = 0;
  const segments = 4 + Math.floor(Math.random() * 4);
  let curX = originX;
  let curY = originY;
  pts.push(curX, curY);

  for (let i = 1; i <= segments; i++) {
    const a = angle + (Math.random() - 0.5) * 1.1;
    const segLen = length / segments;
    curX += Math.cos(a) * segLen;
    curY += Math.sin(a) * segLen;
    pts.push(curX, curY);
  }
}

function colorToRgb(color: string) {
  const value = Number.parseInt(color.slice(1), 16);
  return `${(value >> 16) & 255},${(value >> 8) & 255},${value & 255}`;
}

interface SparkCursorProps {
  settings?: FireEffectsSettings;
  preview?: boolean;
  onTop?: boolean;
}

export const SparkCursor: React.FC<SparkCursorProps> = ({
  settings = DEFAULT_FIRE_EFFECTS_SETTINGS,
  preview = false,
  onTop = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (
      !canvas ||
      (preview && !host) ||
      !settings.enabled ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    const sparkPoolSize = isCoarsePointer ? 88 : SPARK_POOL;
    const branchPoolSize = isCoarsePointer ? 12 : BRANCH_POOL;
    const trailLimit = settings.trailLength;
    const colors = settings.colors.map(colorToRgb);
    const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)] ?? colors[0];
    const sparks: Spark[] = Array.from({ length: sparkPoolSize }, () => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      max: 1,
      size: 1,
      gravity: 0,
      color: colors[0] ?? '255,112,24',
    }));

    const branches: Branch[] = Array.from({ length: branchPoolSize }, () => ({
      pts: [],
      life: 0,
      max: 1,
      width: 1,
      bright: false,
      color: colors[0],
    }));

    const trail: TrailPoint[] = [];
    let sparkIdx = 0;
    let branchIdx = 0;
    let mouseX = -9999;
    let mouseY = -9999;
    let prevX = -9999;
    let prevY = -9999;
    let speedNorm = 0;
    let auraPower = 0;
    let animId = 0;
    let active = false;
    let lastTime = performance.now();
    let dpr = 1;
    const activePointers = new Set<number>();
    let resizeObserver: ResizeObserver | null = null;
    const canvasWidth = () => preview ? host?.clientWidth ?? 0 : window.innerWidth;
    const canvasHeight = () => preview ? host?.clientHeight ?? 0 : window.innerHeight;

    const startLoop = (now: number) => {
      if (active) return;
      active = true;
      lastTime = now;
      animId = requestAnimationFrame(loop);
    };

    const onResize = () => {
      dpr = preview ? 1 : Math.min(window.devicePixelRatio || 1, isCoarsePointer ? 1.5 : 2);
      canvas.width = Math.round(canvasWidth() * dpr);
      canvas.height = Math.round(canvasHeight() * dpr);
    };
    onResize();

    const spawnSpark = (x: number, y: number, vx: number, vy: number, speed: number, burst = false) => {
      const s = sparks[sparkIdx];
      sparkIdx = (sparkIdx + 1) % sparkPoolSize;
      const angle = burst
        ? Math.random() * Math.PI * 2
        : Math.atan2(vy, vx) + Math.PI + (Math.random() - 0.5) * 2.6;
      const force = burst
        ? 0.12 + Math.random() * 0.28
        : 0.05 + Math.random() * 0.25 * (0.5 + speed);
      s.x = x;
      s.y = y;
      s.vx = Math.cos(angle) * force + vx * 0.02;
      s.vy = Math.sin(angle) * force + vy * 0.02;
      s.max = s.life = settings.lifetime * (0.6 + Math.random() * 0.4);
      s.size = (0.6 + Math.random() * 1.6) * settings.particleSize;
      s.gravity = 0.00025 + Math.random() * 0.00035;
      s.color = getRandomColor();
    };

    const spawnBranch = (x: number, y: number, speed: number, bright: boolean) => {
      const b = branches[branchIdx];
      branchIdx = (branchIdx + 1) % branchPoolSize;
      generateBranch(
        x,
        y,
        Math.random() * Math.PI * 2,
        (10 + Math.random() * 28) * (bright ? 1.8 : 1) * (0.6 + speed * 0.6),
        b.pts
      );
      b.max = b.life = settings.lifetime * (bright ? 0.25 : 0.15 + Math.random() * 0.12);
      b.width = bright ? 1.6 : 0.6 + Math.random() * 0.8;
      b.bright = bright;
      b.color = getRandomColor();
    };

    const getCanvasPoint = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch' && !e.isPrimary) return;
      activePointers.add(e.pointerId);
      const point = getCanvasPoint(e);
      mouseX = point.x;
      mouseY = point.y;
      prevX = point.x;
      prevY = point.y;
      const now = performance.now();
      trail.push({ x: point.x, y: point.y, t: now });
      const burstCount = Math.round((isCoarsePointer ? 7 : 10) * settings.density);
      for (let i = 0; i < burstCount; i++) {
        spawnSpark(point.x, point.y, 0, 0, 0.5, true);
      }
      spawnBranch(point.x, point.y, 0.4, true);
      auraPower = Math.min(1, auraPower + 0.55);
      startLoop(now);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' && !activePointers.has(e.pointerId)) return;
      const point = getCanvasPoint(e);
      mouseX = point.x;
      mouseY = point.y;
      if (prevX < -999) {
        prevX = mouseX;
        prevY = mouseY;
      }
      const dx = mouseX - prevX;
      const dy = mouseY - prevY;
      const dist = Math.hypot(dx, dy);

      speedNorm = Math.min(1.5, speedNorm * 0.6 + dist / 40);
      const now = performance.now();
      trail.push({ x: mouseX, y: mouseY, t: now });
      while (trail.length > trailLimit) trail.shift();

      const count = Math.min(
        Math.round((isCoarsePointer ? 4 : 8) * settings.density),
        Math.round((Math.floor(dist / (isCoarsePointer ? 10 : 6)) + (Math.random() < 0.4 ? 1 : 0)) * settings.density)
      );
      for (let i = 0; i < count; i++) {
        const t = Math.random();
        spawnSpark(prevX + dx * t, prevY + dy * t, dx, dy, speedNorm);
      }

      if (Math.random() < Math.min(1, ((isCoarsePointer ? 0.06 : 0.15) + speedNorm * (isCoarsePointer ? 0.2 : 0.4)) * settings.density)) {
        spawnBranch(mouseX, mouseY, speedNorm, false);
      }
      if (dist > 45 && Math.random() < Math.min(1, (isCoarsePointer ? 0.1 : 0.25) * settings.density)) {
        spawnBranch(mouseX, mouseY, speedNorm, true);
      }

      auraPower = Math.min(1, auraPower + dist / 120);
      prevX = mouseX;
      prevY = mouseY;

      startLoop(now);
    };

    const onPointerUp = (e: PointerEvent) => {
      activePointers.delete(e.pointerId);
      if (e.pointerType !== 'mouse' && activePointers.size === 0) {
        prevX = -9999;
        prevY = -9999;
      }
    };

    const handlePointerDown: EventListener = (event) => {
      if (event instanceof PointerEvent) onPointerDown(event);
    };
    const handlePointerMove: EventListener = (event) => {
      if (event instanceof PointerEvent) onPointerMove(event);
    };
    const handlePointerUp: EventListener = (event) => {
      if (event instanceof PointerEvent) onPointerUp(event);
    };

    const loop = (now: number) => {
      const dt = Math.min(48, now - lastTime) * settings.speed;
      lastTime = now;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvasWidth(), canvasHeight());
      ctx.globalCompositeOperation = 'lighter';

      let alive = false;
      auraPower *= Math.pow(0.992, dt);
      if (auraPower > 0.02) {
        alive = true;
        const grad = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 70);
        grad.addColorStop(0, `rgba(${colors[0]},${0.14 * auraPower * settings.glow})`);
        grad.addColorStop(1, 'rgba(255,0,30,0)');
        ctx.fillStyle = grad;
        const auraRadius = 70 * settings.glow;
        ctx.fillRect(mouseX - auraRadius, mouseY - auraRadius, auraRadius * 2, auraRadius * 2);
      }

      while (trail.length && now - trail[0].t > settings.lifetime) {
        trail.shift();
      }

      if (trail.length > 1) {
        alive = true;
        ctx.lineCap = 'round';
        for (let i = 1; i < trail.length; i++) {
          const ratio = 1 - (now - trail[i].t) / settings.lifetime;
          ctx.strokeStyle = `rgba(${colors[i % colors.length]},${ratio * 0.6 * settings.glow})`;
          ctx.lineWidth = 3 * ratio * settings.particleSize;
          ctx.beginPath();
          ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
          ctx.lineTo(trail[i].x, trail[i].y);
          ctx.stroke();

          ctx.strokeStyle = `rgba(${colors[(i + 1) % colors.length]},${ratio * 0.42 * settings.glow})`;
          ctx.lineWidth = 0.8 * ratio * settings.particleSize;
          ctx.stroke();
        }
      }

      for (const b of branches) {
        if (b.life <= 0) continue;
        b.life -= dt;
        alive = true;
        const ratio = Math.max(0, b.life / b.max) * (Math.random() < 0.25 ? 0.4 : 1) * settings.glow;
        ctx.beginPath();
        ctx.moveTo(b.pts[0], b.pts[1]);
        for (let j = 2; j < b.pts.length; j += 2) {
          ctx.lineTo(b.pts[j], b.pts[j + 1]);
        }
        ctx.shadowBlur = (b.bright ? 14 : 8) * settings.glow;
        ctx.shadowColor = `rgba(${b.color},0.35)`;
        ctx.strokeStyle = `rgba(${b.color},${ratio * 0.85})`;
        ctx.lineWidth = b.width * 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(${b.color},${ratio * (b.bright ? 0.8 : 0.45)})`;
        ctx.lineWidth = b.width * 0.5;
        ctx.stroke();
      }

      for (const s of sparks) {
        if (s.life <= 0) continue;
        s.life -= dt;
        alive = true;
        const ratio = Math.max(0, s.life / s.max);
        const oldX = s.x;
        const oldY = s.y;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= 0.985;
        s.vy = s.vy * 0.985 + s.gravity * dt;
        ctx.shadowBlur = s.size * 3 * settings.glow;
        ctx.shadowColor = `rgba(${s.color},${ratio * 0.75})`;
        ctx.strokeStyle = `rgba(${s.color},${ratio * 0.9})`;
        ctx.lineWidth = s.size * ratio;
        ctx.beginPath();
        ctx.moveTo(oldX - s.vx * 18, oldY - s.vy * 18);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      speedNorm *= Math.pow(0.95, dt / 16);

      if (alive) {
        animId = requestAnimationFrame(loop);
      } else {
        active = false;
        ctx.clearRect(0, 0, canvasWidth(), canvasHeight());
      }
    };

    const pointerTarget = preview ? host : window;
    pointerTarget?.addEventListener('pointerdown', handlePointerDown, { passive: true });
    pointerTarget?.addEventListener('pointermove', handlePointerMove, { passive: true });
    pointerTarget?.addEventListener('pointerup', handlePointerUp, { passive: true });
    pointerTarget?.addEventListener('pointercancel', handlePointerUp, { passive: true });
    if (preview && host) {
      resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(host);
    } else {
      window.addEventListener('resize', onResize, { passive: true });
    }

    return () => {
      cancelAnimationFrame(animId);
      pointerTarget?.removeEventListener('pointerdown', handlePointerDown);
      pointerTarget?.removeEventListener('pointermove', handlePointerMove);
      pointerTarget?.removeEventListener('pointerup', handlePointerUp);
      pointerTarget?.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('resize', onResize);
      resizeObserver?.disconnect();
      ctx.clearRect(0, 0, canvasWidth(), canvasHeight());
    };
  }, [preview, settings]);

  if (preview) {
    return (
      <div ref={hostRef} className="fire-spark-preview" aria-label="Interactive fire effect preview">
        <canvas ref={canvasRef} className="spark-cursor-preview" aria-hidden="true" />
      </div>
    );
  }
  return settings.enabled ? (
    <canvas
      ref={canvasRef}
      className={`spark-cursor${onTop ? ' spark-cursor--intro' : ''}`}
      aria-hidden="true"
    />
  ) : null;
};
