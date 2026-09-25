using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace SteadyCues
{
    /// <summary>
    /// Draws the motion cue dots. Each screen edge that shows dots gets one click-through,
    /// always-on-top layered window. A dedicated thread owns those windows, integrates a
    /// spring model that follows the felt force, renders with GDI+ into a DIB and presents with
    /// UpdateLayeredWindow, paced by DwmFlush so animation is locked to the display refresh.
    /// </summary>
    internal sealed class Overlay : IDisposable
    {
        private enum Edge { Left, Right, Top, Bottom }

        private sealed class Band : NativeWindow, IDisposable
        {
            public Edge Edge;
            public Rectangle Bounds;   // virtual-screen pixels
            public Rectangle Screen;   // bounds of the monitor it belongs to
            public float Spacing, Radius, Ring, BandDepth;
            public IntPtr MemDC, HBitmap, OldBitmap, Bits;
            public Bitmap Surface;
            public Graphics G;
            public bool Visible;
            public double DrawnOx = double.NaN, DrawnOy, DrawnAlpha, DrawnStamp;

            public void Create(bool excludeFromCapture)
            {
                var cp = new CreateParams
                {
                    Caption = "SteadyCues overlay",
                    X = Bounds.X, Y = Bounds.Y, Width = Bounds.Width, Height = Bounds.Height,
                    Style = Native.WS_POPUP,
                    ExStyle = Native.WS_EX_LAYERED | Native.WS_EX_TRANSPARENT | Native.WS_EX_TOOLWINDOW |
                              Native.WS_EX_TOPMOST | Native.WS_EX_NOACTIVATE,
                };
                CreateHandle(cp);
                try { Native.SetWindowDisplayAffinity(Handle, excludeFromCapture ? Native.WDA_EXCLUDEFROMCAPTURE : Native.WDA_NONE); }
                catch { }

                var bmi = new Native.BITMAPINFOHEADER
                {
                    biSize = Marshal.SizeOf(typeof(Native.BITMAPINFOHEADER)),
                    biWidth = Bounds.Width, biHeight = -Bounds.Height, biPlanes = 1, biBitCount = 32,
                };
                IntPtr screenDC = Native.GetDC(IntPtr.Zero);
                MemDC = Native.CreateCompatibleDC(screenDC);
                Native.ReleaseDC(IntPtr.Zero, screenDC);
                HBitmap = Native.CreateDIBSection(MemDC, ref bmi, 0, out Bits, IntPtr.Zero, 0);
                OldBitmap = Native.SelectObject(MemDC, HBitmap);
                Surface = new Bitmap(Bounds.Width, Bounds.Height, Bounds.Width * 4, PixelFormat.Format32bppPArgb, Bits);
                G = Graphics.FromImage(Surface);
                G.SmoothingMode = SmoothingMode.AntiAlias;
                G.CompositingQuality = CompositingQuality.HighQuality;
                G.PixelOffsetMode = PixelOffsetMode.HighQuality;
            }

            public void Present()
            {
                G.Flush(FlushIntention.Sync);
                var dst = new Native.POINT(Bounds.X, Bounds.Y);
                var size = new Native.SIZE(Bounds.Width, Bounds.Height);
                var src = new Native.POINT(0, 0);
                var blend = new Native.BLENDFUNCTION { BlendOp = Native.AC_SRC_OVER, SourceConstantAlpha = 255, AlphaFormat = Native.AC_SRC_ALPHA };
                Native.UpdateLayeredWindow(Handle, IntPtr.Zero, ref dst, ref size, MemDC, ref src, 0, ref blend, Native.ULW_ALPHA);
            }

            public void Show(bool show)
            {
                if (show == Visible) return;
                Visible = show;
                if (show) Native.SetWindowPos(Handle, Native.HWND_TOPMOST, 0, 0, 0, 0,
                    Native.SWP_NOMOVE | Native.SWP_NOSIZE | Native.SWP_NOACTIVATE | Native.SWP_SHOWWINDOW);
                else Native.ShowWindow(Handle, Native.SW_HIDE);
            }

            public void Dispose()
            {
                if (G != null) { G.Dispose(); G = null; }
                if (Surface != null) { Surface.Dispose(); Surface = null; }
                if (MemDC != IntPtr.Zero)
                {
                    Native.SelectObject(MemDC, OldBitmap);
                    Native.DeleteObject(HBitmap);
                    Native.DeleteDC(MemDC);
                    MemDC = IntPtr.Zero;
                }
                if (Handle != IntPtr.Zero) DestroyHandle();
            }
        }

        private readonly Settings _settings;
        private readonly MotionHub _hub;
        private readonly List<Band> _bands = new List<Band>();
        private Thread _thread;
        private volatile bool _run, _rebuild = true;
        private volatile int _settingsStamp;
        private string _builtLayout;

        // Spring state, in units of dot spacing so all monitors move together.
        private double _ox, _oy, _vx, _vy, _vis;

        public Overlay(Settings settings, MotionHub hub)
        {
            _settings = settings;
            _hub = hub;
            _settings.Changed += delegate { _settingsStamp++; };
            SystemEvents.DisplaySettingsChanged += OnDisplayChanged;
        }

        /// <summary>Visibility 0..1 as last rendered; used by the UI for status.</summary>
        public double Visibility { get { return _vis; } }

        private void OnDisplayChanged(object sender, EventArgs e) { _rebuild = true; }

        public void Start()
        {
            if (_run) return;
            _run = true;
            _thread = new Thread(RenderLoop) { IsBackground = true, Name = "Overlay", Priority = ThreadPriority.AboveNormal };
            _thread.SetApartmentState(ApartmentState.STA);
            _thread.Start();
        }

        public void Dispose()
        {
            SystemEvents.DisplaySettingsChanged -= OnDisplayChanged;
            _run = false;
            if (_thread != null) _thread.Join(1000);
        }

        private void RenderLoop()
        {
            Native.timeBeginPeriod(1);
            double last = Clock.Now, lastTopmost = 0, lastChange = last;
            try
            {
                while (_run)
                {
                    Native.MSG msg;
                    while (Native.PeekMessage(out msg, IntPtr.Zero, 0, 0, Native.PM_REMOVE))
                    {
                        Native.TranslateMessage(ref msg);
                        Native.DispatchMessage(ref msg);
                    }
                    string layout = LayoutKey();
                    if (_rebuild || layout != _builtLayout) { _rebuild = false; _builtLayout = layout; BuildBands(); }

                    double now = Clock.Now, dt = Math.Min(now - last, 0.05);
                    last = now;

                    var snap = _hub.Snapshot();
                    double target;
                    switch (_settings.Mode)
                    {
                        case CueMode.Off: target = 0; break;
                        case CueMode.AlwaysOn: target = 1; break;
                        default: target = snap.Moving ? 1 : 0; break;
                    }
                    if (_hub.DemoRunning && _settings.Mode != CueMode.Off) target = 1;
                    double fade = target > _vis ? dt / 0.45 : dt / 1.6;
                    _vis = target > _vis ? Math.Min(target, _vis + fade) : Math.Max(target, _vis - fade);

                    Step(snap, dt);

                    if (_vis <= 0.0005)
                    {
                        foreach (var b in _bands) b.Show(false);
                        _ox = _oy = _vx = _vy = 0;
                        Thread.Sleep(40);
                        continue;
                    }

                    bool anyDrawn = false;
                    foreach (var b in _bands)
                    {
                        if (Draw(b)) { b.Present(); anyDrawn = true; }
                        b.Show(true);
                    }
                    if (now - lastTopmost > 2.0)
                    {
                        // Other topmost windows (taskbar, flyouts) can end up above us; reassert.
                        lastTopmost = now;
                        foreach (var b in _bands)
                            Native.SetWindowPos(b.Handle, Native.HWND_TOPMOST, 0, 0, 0, 0,
                                Native.SWP_NOMOVE | Native.SWP_NOSIZE | Native.SWP_NOACTIVATE);
                    }
                    if (anyDrawn) lastChange = now;

                    // Locked to the compositor while animating; relaxed polling while idle.
                    if (now - lastChange < 0.5) { if (Native.DwmFlush() != 0) Thread.Sleep(8); }
                    else Thread.Sleep(30);
                }
            }
            finally
            {
                foreach (var b in _bands) b.Dispose();
                _bands.Clear();
                Native.timeEndPeriod(1);
            }
        }

        private void Step(MotionSnapshot snap, double dt)
        {
            // Displacement follows the felt force through a soft limit; a damped spring makes
            // the motion smooth and a little "physical" without lagging behind the car.
            double gain = 0.2 * _settings.Intensity;       // spacings per m/s²
            const double limit = 1.6;                       // max displacement, in spacings
            double tx = limit * Math.Tanh(snap.Fx * gain / limit);
            double ty = limit * Math.Tanh(snap.Fy * gain / limit);
            const double w = 2 * Math.PI * 1.1, zeta = 0.85;
            int steps = Math.Max(1, (int)Math.Ceiling(dt / 0.004));
            double h = dt / steps;
            for (int i = 0; i < steps; i++)
            {
                _vx += (w * w * (tx - _ox) - 2 * zeta * w * _vx) * h;
                _vy += (w * w * (ty - _oy) - 2 * zeta * w * _vy) * h;
                _ox += _vx * h;
                _oy += _vy * h;
            }
        }

        private string LayoutKey()
        {
            return string.Join("|", _settings.Rows, _settings.DotSize, _settings.Edges, _settings.Displays, _settings.HideFromCapture);
        }

        private void BuildBands()
        {
            foreach (var b in _bands) b.Dispose();
            _bands.Clear();

            var screens = _settings.Displays == DisplayTarget.All ? Screen.AllScreens : new[] { Screen.PrimaryScreen };
            foreach (var sc in screens)
            {
                var r = sc.Bounds;
                float scale = MonitorScale(r);
                float spacing = (float)r.Height / _settings.Rows;
                float radius = (float)Math.Min(6.5 * scale * _settings.DotSize, spacing * 0.3);
                float ring = Math.Max(1f, 1.4f * scale * (float)Math.Sqrt(_settings.DotSize));
                int side = (int)Math.Min(Math.Ceiling(spacing * 2), r.Width * 0.2);
                int topDepth = (int)Math.Min(Math.Ceiling(spacing * 2), r.Height * 0.2);

                AddBand(Edge.Left, new Rectangle(r.Left, r.Top, side, r.Height), r, spacing, radius, ring, side);
                AddBand(Edge.Right, new Rectangle(r.Right - side, r.Top, side, r.Height), r, spacing, radius, ring, side);
                if (_settings.Edges == EdgeLayout.AllEdges && r.Width > side * 3)
                {
                    AddBand(Edge.Top, new Rectangle(r.Left + side, r.Top, r.Width - 2 * side, topDepth), r, spacing, radius, ring, topDepth);
                    AddBand(Edge.Bottom, new Rectangle(r.Left + side, r.Bottom - topDepth, r.Width - 2 * side, topDepth), r, spacing, radius, ring, topDepth);
                }
            }
        }

        private void AddBand(Edge edge, Rectangle bounds, Rectangle screen, float spacing, float radius, float ring, float depth)
        {
            if (bounds.Width <= 0 || bounds.Height <= 0) return;
            var b = new Band { Edge = edge, Bounds = bounds, Screen = screen, Spacing = spacing, Radius = radius, Ring = ring, BandDepth = depth };
            try { b.Create(_settings.HideFromCapture); _bands.Add(b); }
            catch { b.Dispose(); }
        }

        /// <summary>Renders one band; returns false when nothing visibly changed since last time.</summary>
        private bool Draw(Band b)
        {
            double alpha = _vis * _settings.Opacity;
            double s = b.Spacing;
            double pxX = _ox * s, pxY = _oy * s;
            if (!double.IsNaN(b.DrawnOx) && Math.Abs(pxX - b.DrawnOx) < 0.04 && Math.Abs(pxY - b.DrawnOy) < 0.04 &&
                Math.Abs(alpha - b.DrawnAlpha) < 0.002 && b.DrawnStamp == _settingsStamp)
                return false;
            b.DrawnOx = pxX; b.DrawnOy = pxY; b.DrawnAlpha = alpha; b.DrawnStamp = _settingsStamp;

            var g = b.G;
            g.Clear(Color.Transparent);

            // Wrap the offset into one lattice cell; the lattice is infinite, so this is seamless.
            double wx = pxX - s * Math.Round(pxX / s);
            double wy = pxY - s * Math.Round(pxY / s);
            Color fill, ring;
            StyleColors(out fill, out ring);
            int W = b.Bounds.Width, H = b.Bounds.Height;
            double depth = b.BandDepth, fadeLen = s * 0.75;

            if (b.Edge == Edge.Left || b.Edge == Edge.Right)
            {
                // Rows are centred on the monitor so the pattern is symmetric top to bottom.
                double cy = b.Screen.Top + b.Screen.Height / 2.0 - b.Bounds.Top;
                int rows = (int)Math.Ceiling(H / s / 2) + 2;
                for (int k = -1; k <= (int)Math.Ceiling(depth / s); k++)
                {
                    double fromEdge = s * (k + 0.5) + (b.Edge == Edge.Left ? wx : -wx);
                    double x = b.Edge == Edge.Left ? fromEdge : W - fromEdge;
                    double a = alpha * (1 - SmoothStep(depth - fadeLen, depth, fromEdge));
                    if (a <= 0.004 || fromEdge < -b.Radius * 2) continue;
                    for (int j = -rows; j <= rows; j++)
                        Dot(g, x, cy + s * (j - 0.5) + wy, b.Radius, b.Ring, a, fill, ring);
                }
            }
            else
            {
                double cx = b.Screen.Left + b.Screen.Width / 2.0 - b.Bounds.Left;
                int cols = (int)Math.Ceiling(W / s / 2) + 2;
                for (int k = -1; k <= (int)Math.Ceiling(depth / s); k++)
                {
                    double fromEdge = s * (k + 0.5) + (b.Edge == Edge.Top ? wy : -wy);
                    double y = b.Edge == Edge.Top ? fromEdge : H - fromEdge;
                    double a = alpha * (1 - SmoothStep(depth - fadeLen, depth, fromEdge));
                    if (a <= 0.004 || fromEdge < -b.Radius * 2) continue;
                    for (int i = -cols; i <= cols; i++)
                    {
                        double x = cx + s * (i - 0.5) + wx;
                        // Fade toward the ends so top/bottom rows blend into the side columns.
                        double end = Math.Min(x, W - x);
                        double ea = a * SmoothStep(0, fadeLen, end);
                        if (ea > 0.004) Dot(g, x, y, b.Radius, b.Ring, ea, fill, ring);
                    }
                }
            }
            return true;
        }

        private static void Dot(Graphics g, double x, double y, float r, float ringW, double a, Color fill, Color ring)
        {
            if (y < -r * 2 || y > 1e5) return;
            int fa = (int)Math.Round(255 * a * fill.A / 255.0);
            int ra = (int)Math.Round(255 * a * ring.A / 255.0);
            float fx = (float)x - r, fy = (float)y - r, d = r * 2;
            using (var br = new SolidBrush(Color.FromArgb(Clamp255(fa), fill)))
                g.FillEllipse(br, fx, fy, d, d);
            if (ra > 0)
                using (var pen = new Pen(Color.FromArgb(Clamp255(ra), ring), ringW))
                    g.DrawEllipse(pen, fx, fy, d, d);
        }

        private void StyleColors(out Color fill, out Color ring)
        {
            switch (_settings.Style)
            {
                case DotStyle.Dark: fill = Color.FromArgb(240, 24, 24, 27); ring = Color.FromArgb(70, 255, 255, 255); break;
                case DotStyle.Light: fill = Color.FromArgb(245, 250, 250, 250); ring = Color.FromArgb(90, 0, 0, 0); break;
                case DotStyle.Accent: fill = Color.FromArgb(240, AccentColor()); ring = Color.FromArgb(200, 255, 255, 255); break;
                default: fill = Color.FromArgb(225, 32, 33, 36); ring = Color.FromArgb(235, 255, 255, 255); break;
            }
        }

        private static Color _accent = Color.Empty;
        private static Color AccentColor()
        {
            if (_accent.IsEmpty)
            {
                _accent = Color.FromArgb(0, 103, 192);
                try
                {
                    var v = Registry.GetValue(@"HKEY_CURRENT_USER\Software\Microsoft\Windows\DWM", "AccentColor", null);
                    if (v is int)
                    {
                        int abgr = (int)v;
                        _accent = Color.FromArgb(abgr & 0xFF, (abgr >> 8) & 0xFF, (abgr >> 16) & 0xFF);
                    }
                }
                catch { }
            }
            return _accent;
        }

        private static int Clamp255(int v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

        private static double SmoothStep(double e0, double e1, double x)
        {
            double t = Math.Max(0, Math.Min(1, (x - e0) / (e1 - e0)));
            return t * t * (3 - 2 * t);
        }

        [DllImport("user32.dll")] private static extern IntPtr MonitorFromPoint(Native.POINT pt, uint flags);
        [DllImport("shcore.dll")] private static extern int GetDpiForMonitor(IntPtr mon, int type, out uint dx, out uint dy);

        private static float MonitorScale(Rectangle r)
        {
            try
            {
                var mon = MonitorFromPoint(new Native.POINT(r.Left + r.Width / 2, r.Top + r.Height / 2), 2);
                uint dx, dy;
                if (GetDpiForMonitor(mon, 0, out dx, out dy) == 0 && dx > 0) return dx / 96f;
            }
            catch { }
            return 1f;
        }
    }
}
