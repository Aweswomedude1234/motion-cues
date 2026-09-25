using System;
using System.Threading;

namespace SteadyCues
{
    /// <summary>
    /// A scripted drive (pull away, bumps, bends, braking) so people can preview and tune the
    /// cues at their desk, and so the overlay can be tested on PCs without motion hardware.
    /// </summary>
    internal sealed class DemoSource : IDisposable
    {
        // duration (s), forward accel (m/s², + = speeding up), sideways accel (m/s², + = turning right)
        private static readonly double[,] Script =
        {
            { 2.0,  0.0,  0.0 },
            { 4.0,  2.6,  0.0 },   // pull away
            { 3.0,  0.4,  0.0 },
            { 4.0,  0.0, -2.8 },   // long left bend
            { 2.0,  0.0,  0.0 },
            { 3.5,  0.0,  3.2 },   // right bend
            { 2.0,  0.0,  0.0 },
            { 1.5,  0.0, -2.2 },   // quick S-bend
            { 1.5,  0.0,  2.2 },
            { 2.0,  0.0,  0.0 },
            { 3.0, -3.5,  0.0 },   // brake
            { 1.5,  0.0,  0.0 },   // stopped
            { 3.0,  2.2,  1.5 },   // accelerate out of a right turn
            { 2.5,  0.0,  0.0 },
            { 3.0, -2.8,  0.0 },   // brake to stop
            { 2.0,  0.0,  0.0 },
        };

        private readonly MotionHub _hub;
        private Thread _thread;
        private volatile bool _run;

        public DemoSource(MotionHub hub) { _hub = hub; }

        public bool Running { get { return _run; } }

        public void Start()
        {
            if (_run) return;
            _run = true;
            _hub.DemoRunning = true;
            _thread = new Thread(Loop) { IsBackground = true, Name = "Demo drive" };
            _thread.Start();
        }

        public void Stop()
        {
            _run = false;
            _hub.DemoRunning = false;
        }

        private void Loop()
        {
            var rnd = new Random();
            double t0 = Clock.Now, last = t0, lon = 0, lat = 0, bump = 0, total = 0;
            for (int i = 0; i < Script.GetLength(0); i++) total += Script[i, 0];

            while (_run)
            {
                Thread.Sleep(16);
                double now = Clock.Now, dt = now - last;
                last = now;
                double t = (now - t0) % total, acc = 0, tLon = 0, tLat = 0;
                for (int i = 0; i < Script.GetLength(0); i++)
                {
                    acc += Script[i, 0];
                    if (t < acc) { tLon = Script[i, 1]; tLat = Script[i, 2]; break; }
                }
                // Real vehicles ramp forces in over a fraction of a second.
                double k = 1 - Math.Exp(-dt / 0.45);
                lon += (tLon - lon) * k;
                lat += (tLat - lat) * k;
                // Road texture: a little filtered noise plus occasional bumps.
                bump += ((rnd.NextDouble() - 0.5) * 0.9 - bump) * (1 - Math.Exp(-dt / 0.08));
                if (rnd.NextDouble() < dt * 0.25) bump += (rnd.NextDouble() - 0.5) * 2.5;

                _hub.Push(ActiveSource.Demo, -lat + bump * 0.3, lon + bump, dt, true);
            }
        }

        public void Dispose() { Stop(); }
    }
}
