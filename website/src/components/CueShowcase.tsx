import {useEffect, useRef, useState} from 'react';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {MediaTheme} from '@astryxdesign/core/theme';
import {Text} from '@astryxdesign/core/Text';
import {useMediaQuery} from '@astryxdesign/core/hooks';

/**
 * A glass laptop screen floating over the hero photograph, with the same edge dots, spring
 * model and "felt force" convention as the Windows app (src/SteadyCues/Overlay.cs), and a
 * dock of controls underneath, driven by a scripted drive or by the visitor.
 */

type Mode = 'drive' | 'accelerate' | 'brake' | 'left' | 'right';

// Felt force in m/s²: x > 0 pushes you right, y > 0 pushes you back into the seat.
const MANUAL: Record<Exclude<Mode, 'drive'>, {fx: number; fy: number; caption: string}> = {
  accelerate: {fx: 0, fy: 2.8, caption: 'Speeding up. You sink into the seat, so the dots slide down.'},
  brake: {fx: 0, fy: -3.2, caption: 'Braking. You lean forward, so the dots drift up.'},
  left: {fx: 3, fy: 0, caption: 'Turning left. You’re pushed right, and so are the dots.'},
  right: {fx: -3, fy: 0, caption: 'Turning right. You’re pushed left, and so are the dots.'},
};

const DRIVE: Array<{t: number; lon: number; lat: number; caption: string}> = [
  {t: 1.6, lon: 0, lat: 0, caption: 'Waiting at the lights. Everything is still.'},
  {t: 3.4, lon: 2.6, lat: 0, caption: 'Pulling away. You sink into the seat, so the dots slide down.'},
  {t: 2, lon: 0.3, lat: 0, caption: 'Cruising. The dots settle back into place.'},
  {t: 3.4, lon: 0, lat: -2.8, caption: 'A long left bend. You’re pushed right, and so are the dots.'},
  {t: 1.4, lon: 0, lat: 0, caption: 'Straight road again.'},
  {t: 3, lon: 0, lat: 3, caption: 'A right bend. The dots lean left with you.'},
  {t: 1.4, lon: 0, lat: 0, caption: 'Straight road again.'},
  {t: 3, lon: -3.4, lat: 0, caption: 'Braking. You lean forward, so the dots drift up.'},
  {t: 1.6, lon: 0, lat: 0, caption: 'Stopped. The dots rest.'},
];
const DRIVE_LENGTH = DRIVE.reduce((s, x) => s + x.t, 0);

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
}

export function CueShowcase() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gaugeRef = useRef<SVGCircleElement>(null);
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const isNarrow = useMediaQuery('(max-width: 640px)');
  const [mode, setMode] = useState<Mode>('drive');
  const [caption, setCaption] = useState(DRIVE[0].caption);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const time = useClock();

  useEffect(() => {
    if (mode !== 'drive') setCaption(MANUAL[mode].caption);
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

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

    function target(dt: number) {
      const m = modeRef.current;
      if (m !== 'drive') return MANUAL[m];
      // Visitors who prefer reduced motion get a still scene until they pick a manoeuvre.
      if (reduceMotion) return {fx: 0, fy: 0};
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
      drawDots(ctx, canvas.clientWidth, canvas.clientHeight, ox, oy);
      gaugeRef.current?.setAttribute('transform', `translate(${(ox * 9).toFixed(2)} ${(oy * 9).toFixed(2)})`);
      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [reduceMotion]);

  return (
    <div className="showcase">
      <div className="screen">
        <div className="screen-bar" aria-hidden="true">
          <span className="screen-app"><img src="./icon-32.png" alt="" width={14} height={14} />SteadyCues</span>
          <span className="screen-status">Phone connected · {time}</span>
        </div>
        <article className="reader" aria-hidden="true">
          <p className="reader-kicker">Chapter three</p>
          <h3 className="reader-title">The long way round</h3>
          <p>
            We left the city before the fog had lifted, the road unspooling ahead of us like a pale ribbon laid
            across the hills. Somewhere past the second bridge the valley opened, and the morning came in all at
            once.
          </p>
          <p>
            I had meant to read the whole way. Usually that is where the trouble starts: a few pages in, the words
            begin to swim and the horizon tilts. Today the page stayed still, and so did I.
          </p>
          <p>
            Outside, sheep scattered from the verge. The driver hummed something tuneless. I turned the page.
          </p>
        </article>
        <canvas
          ref={canvasRef}
          className="screen-dots"
          role="img"
          aria-label="Animated preview: dots at the left and right edges of a laptop screen move with the car"
        />
      </div>

      <MediaTheme mode="dark">
        <div className="dock" role="group" aria-label="Try the motion cues">
          {!isNarrow ? (
            <div className="dock-tile dock-gauge" aria-hidden="true">
              <svg viewBox="-24 -24 48 48" width="44" height="44">
                <circle r="20" className="gauge-ring" />
                <circle r="10" className="gauge-ring gauge-inner" />
                <line x1="-20" x2="20" className="gauge-axis" />
                <line y1="-20" y2="20" className="gauge-axis" />
                <circle ref={gaugeRef} r="4.5" className="gauge-dot" />
              </svg>
            </div>
          ) : null}
          <div className="dock-tile dock-controls">
            <SegmentedControl label="Car motion" value={mode} onChange={v => setMode(v as Mode)} size={isNarrow ? 'sm' : 'md'}>
              <SegmentedControlItem value="drive" label="Drive" />
              <SegmentedControlItem value="accelerate" label="Speed up" />
              <SegmentedControlItem value="brake" label="Brake" />
              <SegmentedControlItem value="left" label="Left" />
              <SegmentedControlItem value="right" label="Right" />
            </SegmentedControl>
          </div>
          {!isNarrow ? (
            <div className="dock-tile dock-caption">
              <Text type="supporting" aria-live="polite">{caption}</Text>
            </div>
          ) : null}
        </div>
      </MediaTheme>
      {isNarrow ? (
        <Text type="supporting" color="secondary" justify="center" aria-live="polite">{caption}</Text>
      ) : null}
    </div>
  );
}

/** Edge dots: two columns per side, anchored to the outer edge, fading toward the middle. */
function drawDots(ctx: CanvasRenderingContext2D, W: number, H: number, ox: number, oy: number) {
  ctx.clearRect(0, 0, W, H);
  const s = Math.max(28, H / 7.2);
  const r = Math.max(3.2, Math.min(s * 0.11, 7));
  const depth = s * 2;
  const px = ox * s, py = oy * s;
  const wrapX = px - s * Math.round(px / s), wrapY = py - s * Math.round(py / s);
  ctx.lineWidth = Math.max(1.2, r * 0.3);
  for (const side of [0, 1]) {
    for (let k = -1; k <= 2; k++) {
      const fromEdge = s * (k + 0.5) + (side === 0 ? wrapX : -wrapX);
      const x = side === 0 ? fromEdge : W - fromEdge;
      const a = 1 - smoothstep(depth - s * 0.75, depth, fromEdge);
      if (a <= 0.01) continue;
      for (let j = -6; j <= 6; j++) {
        const y = H / 2 + s * (j - 0.5) + wrapY;
        if (y < -r * 2 || y > H + r * 2) continue;
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(24, 24, 24, 0.86)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
}
