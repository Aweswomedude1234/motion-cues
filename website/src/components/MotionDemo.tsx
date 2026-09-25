import {useEffect, useRef, useState} from 'react';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {VStack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {useMediaQuery} from '@astryxdesign/core/hooks';

/**
 * A live, in-browser version of what SteadyCues draws on a Windows desktop: the same lattice of
 * edge dots, the same spring model and the same "felt force" convention as the app
 * (src/SteadyCues/Overlay.cs), driven by a scripted drive or by the visitor.
 */

type Mode = 'parked' | 'drive' | 'accelerate' | 'brake' | 'left' | 'right';

// Felt force in m/s²: x > 0 pushes you right, y > 0 pushes you back into the seat.
const MANUAL: Record<Exclude<Mode, 'drive'>, {fx: number; fy: number; caption: string}> = {
  parked: {fx: 0, fy: 0, caption: 'Parked. The dots sit still, just as your body does.'},
  accelerate: {fx: 0, fy: 2.8, caption: 'Speeding up: you are pressed back into the seat, so the dots slide down.'},
  brake: {fx: 0, fy: -3.2, caption: 'Braking: you lean forward, so the dots drift up.'},
  left: {fx: 3, fy: 0, caption: 'Turning left: you are pushed to the right, and so are the dots.'},
  right: {fx: -3, fy: 0, caption: 'Turning right: you are pushed to the left, and so are the dots.'},
};

const DRIVE: Array<{t: number; lon: number; lat: number; caption: string}> = [
  {t: 1.5, lon: 0, lat: 0, caption: 'Waiting at the lights.'},
  {t: 3.5, lon: 2.6, lat: 0, caption: 'Pulling away: you are pressed back, so the dots slide down.'},
  {t: 2, lon: 0.3, lat: 0, caption: 'Cruising: the dots settle back into place.'},
  {t: 3.5, lon: 0, lat: -2.8, caption: 'A left bend: you are pushed right, and so are the dots.'},
  {t: 1.5, lon: 0, lat: 0, caption: 'Straight road again.'},
  {t: 3, lon: 0, lat: 3, caption: 'A right bend: the dots lean left with you.'},
  {t: 1.5, lon: 0, lat: 0, caption: 'Straight road again.'},
  {t: 3, lon: -3.4, lat: 0, caption: 'Braking: you lean forward, so the dots drift up.'},
  {t: 1.5, lon: 0, lat: 0, caption: 'Stopped.'},
];
const DRIVE_LENGTH = DRIVE.reduce((s, x) => s + x.t, 0);

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

export function MotionDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [mode, setMode] = useState<Mode>(reduceMotion ? 'parked' : 'drive');
  const [caption, setCaption] = useState(reduceMotion ? MANUAL.parked.caption : DRIVE[0].caption);
  const isNarrow = useMediaQuery('(max-width: 480px)');
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    if (mode !== 'drive') setCaption(MANUAL[mode].caption);
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let visible = true;
    let last = performance.now();
    let driveT = 0;
    let lastCaption = '';
    // Spring state in units of dot spacing, exactly like the Windows overlay.
    let ox = 0, oy = 0, vx = 0, vy = 0, lon = 0, lat = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const io = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible) { last = performance.now(); raf = requestAnimationFrame(frame); }
    });
    io.observe(canvas);

    function target(dt: number): {fx: number; fy: number} {
      const m = modeRef.current;
      if (m !== 'drive') return MANUAL[m];
      driveT = (driveT + dt) % DRIVE_LENGTH;
      let acc = 0;
      let seg = DRIVE[0];
      for (const s of DRIVE) { acc += s.t; if (driveT < acc) { seg = s; break; } }
      if (seg.caption !== lastCaption) { lastCaption = seg.caption; setCaption(seg.caption); }
      const k = 1 - Math.exp(-dt / 0.45);
      lon += (seg.lon - lon) * k;
      lat += (seg.lat - lat) * k;
      return {fx: -lat, fy: lon};
    }

    function frame(now: number) {
      if (!visible || !canvas || !ctx) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const {fx, fy} = target(dt);

      const gain = 0.2, limit = 1.6, w = 2 * Math.PI * 1.1, z = 0.85;
      const tx = limit * Math.tanh((fx * gain) / limit), ty = limit * Math.tanh((fy * gain) / limit);
      for (let i = 0; i < 4; i++) {
        const h = dt / 4;
        vx += (w * w * (tx - ox) - 2 * z * w * vx) * h;
        vy += (w * w * (ty - oy) - 2 * z * w * vy) * h;
        ox += vx * h;
        oy += vy * h;
      }
      draw(ctx, canvas.clientWidth, canvas.clientHeight, ox, oy);
      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, []);

  return (
    <VStack gap={4}>
      <div className="demo-screen">
        <canvas
          ref={canvasRef}
          className="demo-canvas"
          role="img"
          aria-label="Animated preview: dots at the left and right edges of a laptop screen move with the car"
        />
      </div>
      <SegmentedControl label="Car motion" value={mode} onChange={v => setMode(v as Mode)} layout="fill" size={isNarrow ? 'sm' : 'md'}>
        <SegmentedControlItem value="drive" label="Drive" />
        <SegmentedControlItem value="accelerate" label="Speed" />
        <SegmentedControlItem value="brake" label="Brake" />
        <SegmentedControlItem value="left" label="Left" />
        <SegmentedControlItem value="right" label="Right" />
      </SegmentedControl>
      <Text type="supporting" color="secondary" justify="center" aria-live="polite" id="demo-caption">
        {caption}
      </Text>
    </VStack>
  );
}

function draw(ctx: CanvasRenderingContext2D, W: number, H: number, ox: number, oy: number) {
  // The palette lives in CSS (light-dark() tokens); let the browser resolve it to real colors.
  const css = getComputedStyle(ctx.canvas);
  const surface = css.backgroundColor;
  const win = css.color;
  const line = css.borderTopColor;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = surface;
  ctx.fillRect(0, 0, W, H);

  // A document window, so the dots have something to sit beside.
  const wx = W * 0.2, wy = H * 0.12, ww = W * 0.6, wh = H * 0.76;
  ctx.fillStyle = win;
  roundRect(ctx, wx, wy, ww, wh, 10);
  ctx.fill();
  ctx.fillStyle = line;
  const rows = 9;
  for (let i = 0; i < rows; i++) {
    const lw = i % 4 === 3 ? ww * 0.45 : ww * 0.78;
    roundRect(ctx, wx + ww * 0.1, wy + wh * (0.14 + i * 0.085), lw, Math.max(4, H * 0.014), 3);
    ctx.fill();
  }

  // Edge dots: two columns per side, anchored to the outer edge, fading toward the middle.
  const s = H / 7.5;
  const r = Math.max(3.5, Math.min(s * 0.12, 8));
  const depth = s * 2;
  const px = ox * s, py = oy * s;
  const wrapX = px - s * Math.round(px / s), wrapY = py - s * Math.round(py / s);
  for (const side of [0, 1]) {
    for (let k = -1; k <= 2; k++) {
      const fromEdge = s * (k + 0.5) + (side === 0 ? wrapX : -wrapX);
      const x = side === 0 ? fromEdge : W - fromEdge;
      const a = 1 - smoothstep(depth - s * 0.75, depth, fromEdge);
      if (a <= 0.01) continue;
      for (let j = -6; j <= 6; j++) {
        const y = H / 2 + s * (j - 0.5) + wrapY;
        ctx.globalAlpha = a * 0.92;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#202124';
        ctx.fill();
        ctx.lineWidth = Math.max(1.2, r * 0.28);
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
