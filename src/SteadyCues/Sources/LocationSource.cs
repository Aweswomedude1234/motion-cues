using System;
using Windows.Devices.Geolocation;
using Windows.Foundation;

namespace SteadyCues
{
    /// <summary>
    /// Derives vehicle acceleration from satellite positioning (built-in GNSS, LTE modems with
    /// GPS, or a USB GPS receiver exposed as a Windows location sensor). Speed changes give the
    /// forward/backward force; heading changes times speed give the sideways (cornering) force.
    /// Updates arrive about once per second, so cues are smoother but slower than accelerometers.
    /// </summary>
    internal sealed class LocationSource : IDisposable
    {
        private readonly MotionHub _hub;
        private Geolocator _geo;
        private TypedEventHandler<Geolocator, PositionChangedEventArgs> _posHandler;
        private TypedEventHandler<Geolocator, StatusChangedEventArgs> _statusHandler;
        private double _lastT = -1, _lastSpeed, _lastHeading = double.NaN, _fx, _fy;

        public LocationSource(MotionHub hub) { _hub = hub; }

        public bool Running { get { return _geo != null; } }

        public void Start()
        {
            if (_geo != null) return;
            try
            {
                _geo = new Geolocator();
                _geo.DesiredAccuracy = PositionAccuracy.High;
                _geo.ReportInterval = 1000;
                _geo.MovementThreshold = 0;
                _posHandler = OnPosition;
                _statusHandler = OnStatus;
                _geo.StatusChanged += _statusHandler;
                _geo.PositionChanged += _posHandler;
                _hub.SetPresent(ActiveSource.Location, false, "Waiting for location…");
            }
            catch (Exception ex)
            {
                _geo = null;
                _hub.SetPresent(ActiveSource.Location, false, "Location unavailable: " + ex.Message);
            }
        }

        public void Stop()
        {
            if (_geo == null) return;
            try { _geo.PositionChanged -= _posHandler; _geo.StatusChanged -= _statusHandler; } catch { }
            _geo = null;
            _lastT = -1;
            _hub.SetPresent(ActiveSource.Location, false, "Off");
        }

        private void OnStatus(Geolocator sender, StatusChangedEventArgs e)
        {
            string s;
            switch (e.Status)
            {
                case PositionStatus.Ready: s = "Location ready"; break;
                case PositionStatus.Initializing: s = "Acquiring satellites…"; break;
                case PositionStatus.NoData: s = "No position data yet"; break;
                case PositionStatus.Disabled: s = "Location is off for desktop apps (Settings › Privacy › Location)"; break;
                case PositionStatus.NotAvailable: s = "No location hardware on this PC"; break;
                default: s = "Location: " + e.Status; break;
            }
            _hub.SetPresent(ActiveSource.Location, e.Status == PositionStatus.Ready, s);
        }

        private void OnPosition(Geolocator sender, PositionChangedEventArgs e)
        {
            var c = e.Position.Coordinate;
            double now = Clock.Now;
            double? speed = c.Speed, heading = c.Heading;
            if (!speed.HasValue || double.IsNaN(speed.Value))
            {
                _hub.SetPresent(ActiveSource.Location, true, "Position has no speed (not satellite based)");
                return;
            }
            double v = Math.Max(0, speed.Value);
            double h = heading.HasValue && !double.IsNaN(heading.Value) && v > 2.0 ? heading.Value : double.NaN;

            if (_lastT > 0)
            {
                double dt = now - _lastT;
                if (dt > 0.2 && dt < 5)
                {
                    double lon = (v - _lastSpeed) / dt;
                    double lat = 0;
                    if (!double.IsNaN(h) && !double.IsNaN(_lastHeading))
                    {
                        double dh = h - _lastHeading;
                        while (dh > 180) dh -= 360;
                        while (dh < -180) dh += 360;
                        double yaw = dh * Math.PI / 180.0 / dt; // clockwise (right turn) positive
                        lat = v * yaw;                          // centripetal accel, right positive
                    }
                    lon = Clamp(lon, -8, 8);
                    lat = Clamp(lat, -8, 8);
                    // Light smoothing across consecutive fixes; GNSS speed is noisy.
                    _fx += (-lat - _fx) * 0.6;
                    _fy += (lon - _fy) * 0.6;
                    _hub.Push(ActiveSource.Location, _fx, _fy, dt, v > 2.5);
                }
            }
            _lastT = now;
            _lastSpeed = v;
            _lastHeading = h;
            _hub.SetPresent(ActiveSource.Location, true, string.Format("{0:0} km/h", v * 3.6));
        }

        private static double Clamp(double v, double lo, double hi) { return v < lo ? lo : v > hi ? hi : v; }

        public void Dispose() { Stop(); }
    }
}
