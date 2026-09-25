using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.Linq;
using Microsoft.Win32;

namespace SteadyCues.UI
{
    /// <summary>Colours and type. Follows the Windows light/dark app setting.</summary>
    internal static class Theme
    {
        public static bool Dark;
        public static Color Bg, Surface, Subtle, Border, Text, Muted, Accent, AccentText, AccentSoft, Ok, Warn, Error, Focus;

        private static readonly Dictionary<string, Font> Fonts = new Dictionary<string, Font>();
        private static string _textFamily, _displayFamily;

        static Theme() { Refresh(); }

        public static void Refresh()
        {
            Dark = false;
            try
            {
                var v = Registry.GetValue(@"HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize", "AppsUseLightTheme", 1);
                Dark = v is int && (int)v == 0;
            }
            catch { }

            if (Dark)
            {
                // Neutral graphite (Windows 11 dark) with a sage accent.
                Bg = Hex(0x202020); Surface = Hex(0x2B2B2B); Subtle = Hex(0x333333); Border = Hex(0x3D3D3D);
                Text = Hex(0xF3F3F3); Muted = Hex(0xA3A3A3); Accent = Hex(0xA9BD93); AccentText = Hex(0x1C1C1C);
                AccentSoft = Hex(0x2F3629); Ok = Hex(0x9CC08A); Warn = Hex(0xE0B15C); Error = Hex(0xE0826B); Focus = Hex(0xC8D8B4);
            }
            else
            {
                // Neutral light (Windows 11) with a moss accent.
                Bg = Hex(0xF3F3F3); Surface = Hex(0xFFFFFF); Subtle = Hex(0xEBEBEB); Border = Hex(0xE0E0E0);
                Text = Hex(0x1B1B1B); Muted = Hex(0x5F5F5F); Accent = Hex(0x4A6340); AccentText = Hex(0xFFFFFF);
                AccentSoft = Hex(0xE4E9DA); Ok = Hex(0x4A6B3A); Warn = Hex(0x9A6414); Error = Hex(0xA8412B); Focus = Hex(0x3E5636);
            }
        }

        public static Font Font(float size, FontStyle style = FontStyle.Regular)
        {
            if (_textFamily == null)
            {
                var installed = new InstalledFontCollection().Families.Select(fam => fam.Name).ToList();
                _textFamily = installed.Contains("Segoe UI Variable Text") ? "Segoe UI Variable Text" : "Segoe UI";
                _displayFamily = installed.Contains("Segoe UI Variable Display") ? "Segoe UI Variable Display" : _textFamily;
            }
            string family = size >= 13 ? _displayFamily : _textFamily;
            bool semibold = (style & FontStyle.Bold) != 0 && family.StartsWith("Segoe UI Variable");
            string key = family + size + style;
            Font f;
            if (!Fonts.TryGetValue(key, out f))
            {
                // "Segoe UI Variable * Semibold" is exposed as its own family on Windows 11.
                if (semibold)
                {
                    try { f = new Font(family + " Semibold", size, style & ~FontStyle.Bold); }
                    catch { f = null; }
                    if (f != null && f.Name != family + " Semibold") { f.Dispose(); f = null; }
                }
                if (f == null) f = new Font(family, size, style);
                Fonts[key] = f;
            }
            return f;
        }

        public static Color Hex(int rgb) { return Color.FromArgb((rgb >> 16) & 0xFF, (rgb >> 8) & 0xFF, rgb & 0xFF); }

        public static Color Mix(Color a, Color b, double t)
        {
            return Color.FromArgb((int)(a.R + (b.R - a.R) * t), (int)(a.G + (b.G - a.G) * t), (int)(a.B + (b.B - a.B) * t));
        }

        public static GraphicsPath Round(RectangleF r, float radius)
        {
            var p = new GraphicsPath();
            float d = Math.Min(radius * 2, Math.Min(r.Width, r.Height));
            if (d <= 0.5f) { p.AddRectangle(r); return p; }
            p.AddArc(r.X, r.Y, d, d, 180, 90);
            p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
            p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
            p.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
            p.CloseFigure();
            return p;
        }
    }
}
