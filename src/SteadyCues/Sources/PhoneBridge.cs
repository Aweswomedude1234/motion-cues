using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Security;
using System.Net.Sockets;
using System.Reflection;
using System.Security.Authentication;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading;

namespace SteadyCues
{
    /// <summary>
    /// Lets a phone act as the motion sensor. The PC serves a small web page over HTTPS on the
    /// local network (Wi-Fi or the phone's own hotspot); the phone opens it by scanning a QR code
    /// and streams accelerometer samples back. Browsers only expose motion sensors to secure
    /// pages, hence HTTPS with a certificate generated on this PC. The link contains a random
    /// token so other devices on the network can't feed in data.
    /// </summary>
    internal sealed class PhoneBridge : IDisposable
    {
        private readonly Settings _settings;
        private readonly MotionHub _hub;
        private readonly DeviceFrameProcessor _proc = new DeviceFrameProcessor();
        private readonly object _procGate = new object();
        private TcpListener _listener;
        private Thread _acceptThread;
        private X509Certificate2 _cert;
        private volatile bool _running;
        private int _clients;
        private byte[] _pageTemplate, _icon;
        private double _lastPostT;

        public PhoneBridge(Settings settings, MotionHub hub)
        {
            _settings = settings;
            _hub = hub;
        }

        public bool Running { get { return _running; } }
        public string Error { get; private set; }
        public int Port { get { return _settings.PhonePort; } }
        public ForwardAdjust Adjust { set { lock (_procGate) _proc.Adjust = value; } }

        /// <summary>True once a phone has sent data in the last few seconds.</summary>
        public bool PhoneConnected { get { return _hub.IsFresh(ActiveSource.Phone, 3); } }

        /// <summary>True if the phone page was loaded at least once this session (network path works).</summary>
        public bool PageEverLoaded { get; private set; }

        public void Start()
        {
            if (_running) return;
            Error = null;
            try
            {
                _cert = LoadOrCreateCertificate();
                _listener = new TcpListener(Program.LoopbackOnly ? IPAddress.Loopback : IPAddress.Any, _settings.PhonePort);
                _listener.Start(8);
                _running = true;
                _acceptThread = new Thread(AcceptLoop) { IsBackground = true, Name = "Phone bridge" };
                _acceptThread.Start();
                _hub.SetPresent(ActiveSource.Phone, false, "Waiting for phone");
            }
            catch (Exception ex)
            {
                _running = false;
                Error = ex is SocketException && ((SocketException)ex).SocketErrorCode == SocketError.AddressAlreadyInUse
                    ? "Port " + _settings.PhonePort + " is already in use by another app."
                    : ex.Message;
                _hub.SetPresent(ActiveSource.Phone, false, "Phone link failed: " + Error);
            }
        }

        public void Stop()
        {
            _running = false;
            try { if (_listener != null) _listener.Stop(); } catch { }
            _listener = null;
            _hub.SetPresent(ActiveSource.Phone, false, "Phone link off");
        }

        public void Dispose() { Stop(); }

        // ---------------------------------------------------------------- addresses & links

        public sealed class LocalAddress
        {
            public string Ip, Adapter;
            public bool Wireless;
            public override string ToString() { return Ip + "  (" + Adapter + ")"; }
        }

        /// <summary>IPv4 addresses a phone could reach, best guess first (Wi-Fi, then Ethernet).</summary>
        public static List<LocalAddress> LocalAddresses()
        {
            var list = new List<LocalAddress>();
            try
            {
                foreach (var ni in NetworkInterface.GetAllNetworkInterfaces())
                {
                    if (ni.OperationalStatus != OperationalStatus.Up) continue;
                    if (ni.NetworkInterfaceType == NetworkInterfaceType.Loopback || ni.NetworkInterfaceType == NetworkInterfaceType.Tunnel) continue;
                    string d = (ni.Description + " " + ni.Name).ToLowerInvariant();
                    bool virt = d.Contains("virtual") || d.Contains("vethernet") || d.Contains("hyper-v") || d.Contains("vmware") ||
                                d.Contains("virtualbox") || d.Contains("wsl") || d.Contains("docker") || d.Contains("vpn") ||
                                d.Contains("tap-") || d.Contains("wireguard") || d.Contains("tailscale") || d.Contains("zerotier");
                    if (virt) continue;
                    foreach (var ua in ni.GetIPProperties().UnicastAddresses)
                    {
                        if (ua.Address.AddressFamily != AddressFamily.InterNetwork) continue;
                        var b = ua.Address.GetAddressBytes();
                        if (b[0] == 169 && b[1] == 254) continue; // link-local: no DHCP
                        list.Add(new LocalAddress
                        {
                            Ip = ua.Address.ToString(),
                            Adapter = ni.Name,
                            Wireless = ni.NetworkInterfaceType == NetworkInterfaceType.Wireless80211,
                        });
                    }
                }
            }
            catch { }
            return list.OrderByDescending(a => a.Wireless).ThenBy(a => a.Adapter).ToList();
        }

        public string LinkFor(string ip)
        {
            return "https://" + ip + ":" + _settings.PhonePort + "/m/" + _settings.PhoneToken;
        }

        /// <summary>Adds an inbound firewall rule for all network profiles (asks for admin via UAC).</summary>
        public static bool AllowThroughFirewall(int port)
        {
            string exe = Assembly.GetEntryAssembly().Location;
            string args = string.Format(CultureInfo.InvariantCulture,
                "/c netsh advfirewall firewall delete rule name=\"SteadyCues phone link\" >nul 2>&1 & " +
                "netsh advfirewall firewall add rule name=\"SteadyCues phone link\" dir=in action=allow protocol=TCP localport={0} program=\"{1}\" profile=any enable=yes",
                port, exe);
            try
            {
                var p = Process.Start(new ProcessStartInfo("cmd.exe", args) { Verb = "runas", UseShellExecute = true, WindowStyle = ProcessWindowStyle.Hidden });
                if (p == null) return false;
                p.WaitForExit(15000);
                return p.ExitCode == 0;
            }
            catch { return false; } // user declined UAC
        }

        // ---------------------------------------------------------------- certificate

        private static string CertPath { get { return Path.Combine(Settings.Folder, "phone-link.cert"); } }

        private static X509Certificate2 LoadOrCreateCertificate()
        {
            // The certificate is kept between runs so the phone only has to accept it once.
            try
            {
                if (File.Exists(CertPath))
                {
                    byte[] pfx = ProtectedData.Unprotect(File.ReadAllBytes(CertPath), null, DataProtectionScope.CurrentUser);
                    var existing = new X509Certificate2(pfx, "", X509KeyStorageFlags.UserKeySet | X509KeyStorageFlags.Exportable);
                    if (existing.NotAfter > DateTime.Now.AddDays(14) && existing.HasPrivateKey) return existing;
                }
            }
            catch { }

            using (var rsa = RSA.Create())
            {
                rsa.KeySize = 2048;
                var req = new CertificateRequest("CN=SteadyCues on " + Environment.MachineName + ", O=SteadyCues (local only)",
                    rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
                req.CertificateExtensions.Add(new X509BasicConstraintsExtension(false, false, 0, true));
                req.CertificateExtensions.Add(new X509KeyUsageExtension(X509KeyUsageFlags.DigitalSignature | X509KeyUsageFlags.KeyEncipherment, true));
                req.CertificateExtensions.Add(new X509EnhancedKeyUsageExtension(new OidCollection { new Oid("1.3.6.1.5.5.7.3.1") }, false));
                var san = new SubjectAlternativeNameBuilder();
                san.AddDnsName("localhost");
                san.AddDnsName(Environment.MachineName);
                foreach (var a in LocalAddresses()) { IPAddress ip; if (IPAddress.TryParse(a.Ip, out ip)) san.AddIpAddress(ip); }
                req.CertificateExtensions.Add(san.Build());
                // Apple rejects server certificates valid for more than 825 days, even self-signed ones.
                using (var cert = req.CreateSelfSigned(DateTimeOffset.Now.AddDays(-1), DateTimeOffset.Now.AddDays(800)))
                {
                    byte[] pfx = cert.Export(X509ContentType.Pfx, "");
                    try
                    {
                        Directory.CreateDirectory(Settings.Folder);
                        File.WriteAllBytes(CertPath, ProtectedData.Protect(pfx, null, DataProtectionScope.CurrentUser));
                    }
                    catch { }
                    // Re-import so SChannel gets a key container it can use.
                    return new X509Certificate2(pfx, "", X509KeyStorageFlags.UserKeySet | X509KeyStorageFlags.Exportable);
                }
            }
        }

        // ---------------------------------------------------------------- HTTP server

        private void AcceptLoop()
        {
            while (_running)
            {
                TcpClient client;
                try { client = _listener.AcceptTcpClient(); }
                catch { if (_running) Thread.Sleep(200); continue; }
                if (Interlocked.Increment(ref _clients) > 16)
                {
                    Interlocked.Decrement(ref _clients);
                    client.Close();
                    continue;
                }
                var t = new Thread(() => Serve(client)) { IsBackground = true, Name = "Phone client" };
                t.Start();
            }
        }

        private void Serve(TcpClient client)
        {
            try
            {
                client.NoDelay = true;
                using (client)
                using (var ssl = new SslStream(client.GetStream(), false))
                {
                    ssl.ReadTimeout = 30000;
                    ssl.WriteTimeout = 10000;
                    ssl.AuthenticateAsServer(_cert, false, SslProtocols.Tls12, false);
                    while (_running)
                    {
                        string method, path;
                        byte[] body;
                        if (!ReadRequest(ssl, out method, out path, out body)) break;
                        Route(ssl, method, path, body);
                    }
                }
            }
            catch { /* phone went away, TLS handshake refused before the user accepted the cert, ... */ }
            finally { Interlocked.Decrement(ref _clients); }
        }

        private static bool ReadRequest(Stream s, out string method, out string path, out byte[] body)
        {
            method = path = null;
            body = null;
            var head = new MemoryStream();
            int last4 = 0;
            while (last4 != 0x0D0A0D0A) // "\r\n\r\n" ends the header block
            {
                int b = s.ReadByte();
                if (b < 0) return false;
                head.WriteByte((byte)b);
                if (head.Length > 16384) return false;
                last4 = (last4 << 8) | b;
            }
            var lines = Encoding.ASCII.GetString(head.ToArray()).Split(new[] { "\r\n" }, StringSplitOptions.None);
            var first = lines[0].Split(' ');
            if (first.Length < 2) return false;
            method = first[0];
            path = first[1];
            int len = 0;
            foreach (var l in lines)
                if (l.StartsWith("Content-Length:", StringComparison.OrdinalIgnoreCase))
                    int.TryParse(l.Substring(15).Trim(), out len);
            if (len < 0 || len > 262144) return false;
            body = new byte[len];
            int read = 0;
            while (read < len)
            {
                int n = s.Read(body, read, len - read);
                if (n <= 0) return false;
                read += n;
            }
            return true;
        }

        private void Route(Stream s, string method, string path, byte[] body)
        {
            int q = path.IndexOf('?');
            if (q >= 0) path = path.Substring(0, q);
            string root = "/m/" + _settings.PhoneToken;

            if (method == "GET" && (path == root || path == root + "/"))
            {
                PageEverLoaded = true;
                _hub.SetPresent(ActiveSource.Phone, false, "Phone opened the page — tap Start on the phone");
                Respond(s, 200, "text/html; charset=utf-8", Page());
            }
            else if (method == "POST" && path == root + "/data")
            {
                string reply = Ingest(Encoding.ASCII.GetString(body));
                Respond(s, 200, "application/json", Encoding.UTF8.GetBytes(reply));
            }
            else if (method == "GET" && (path == "/favicon.ico" || path == root + "/icon.ico"))
            {
                Respond(s, 200, "image/x-icon", Icon());
            }
            else
            {
                Respond(s, 404, "text/plain", Encoding.ASCII.GetBytes("Not found. Scan the QR code in SteadyCues on your PC."));
            }
        }

        private static void Respond(Stream s, int status, string type, byte[] content)
        {
            string reason = status == 200 ? "OK" : "Not Found";
            string head = "HTTP/1.1 " + status + " " + reason + "\r\n" +
                          "Content-Type: " + type + "\r\n" +
                          "Content-Length: " + content.Length + "\r\n" +
                          "Cache-Control: no-store\r\n" +
                          "X-Content-Type-Options: nosniff\r\n" +
                          "Referrer-Policy: no-referrer\r\n" +
                          "Connection: keep-alive\r\n\r\n";
            var h = Encoding.ASCII.GetBytes(head);
            s.Write(h, 0, h.Length);
            s.Write(content, 0, content.Length);
            s.Flush();
        }

        /// <summary>
        /// Body format, one sample per line: "ax,ay,az,dt[,gx,gy,gz]" — proper acceleration in the
        /// phone's frame (m/s², at rest pointing up), the time since the previous sample (s) and,
        /// when the phone has a gyroscope, its rotation rate (rad/s).
        /// </summary>
        private string Ingest(string text)
        {
            var ci = CultureInfo.InvariantCulture;
            double fx = 0, fy = 0;
            int n = 0;
            double now = Clock.Now;
            lock (_procGate)
            {
                bool gap = now - _lastPostT > 2.0;
                _lastPostT = now;
                if (gap) _proc.Reset(); // phone was re-placed or the page restarted
                foreach (var line in text.Split('\n'))
                {
                    var p = line.Split(',');
                    if (p.Length < 4) continue;
                    double ax, ay, az, dt;
                    if (!double.TryParse(p[0], NumberStyles.Float, ci, out ax) || !double.TryParse(p[1], NumberStyles.Float, ci, out ay) ||
                        !double.TryParse(p[2], NumberStyles.Float, ci, out az) || !double.TryParse(p[3], NumberStyles.Float, ci, out dt)) continue;
                    if (Math.Abs(ax) > 200 || Math.Abs(ay) > 200 || Math.Abs(az) > 200) continue;
                    // Optional gyroscope columns: rotation rate in rad/s about the phone's x, y, z axes.
                    Vec3? gyro = null;
                    double gx, gy, gz;
                    if (p.Length >= 7 && double.TryParse(p[4], NumberStyles.Float, ci, out gx) &&
                        double.TryParse(p[5], NumberStyles.Float, ci, out gy) && double.TryParse(p[6], NumberStyles.Float, ci, out gz))
                        gyro = new Vec3(gx, gy, gz);
                    double sfx, sfy;
                    if (_proc.Process(new Vec3(ax, ay, az), gyro, dt, out sfx, out sfy))
                    {
                        fx = sfx; fy = sfy; n++;
                        _hub.Push(ActiveSource.Phone, sfx, sfy, dt, false);
                    }
                }
            }
            if (n > 0)
                _hub.SetPresent(ActiveSource.Phone, true, string.Format(ci, "Phone connected · {0:0} Hz", _hub.GetRate(ActiveSource.Phone)));
            var snap = _hub.Snapshot();
            return string.Format(ci, "{{\"ok\":true,\"fx\":{0:0.###},\"fy\":{1:0.###},\"active\":{2},\"moving\":{3},\"mode\":\"{4}\"}}",
                fx, fy, snap.Source == ActiveSource.Phone ? "true" : "false", snap.Moving ? "true" : "false", _settings.Mode);
        }

        private byte[] Page()
        {
            if (_pageTemplate == null) _pageTemplate = Resource("SteadyCues.phone.html");
            string html = Encoding.UTF8.GetString(_pageTemplate)
                .Replace("{{PC_NAME}}", WebUtility.HtmlEncode(Environment.MachineName))
                .Replace("{{VERSION}}", Program.Version);
            return Encoding.UTF8.GetBytes(html);
        }

        private byte[] Icon()
        {
            if (_icon == null) _icon = Resource("SteadyCues.icon.ico");
            return _icon;
        }

        private static byte[] Resource(string name)
        {
            using (var st = Assembly.GetExecutingAssembly().GetManifestResourceStream(name))
            {
                if (st == null) return new byte[0];
                var ms = new MemoryStream();
                st.CopyTo(ms);
                return ms.ToArray();
            }
        }
    }
}
