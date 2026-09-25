using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using Microsoft.Win32;

namespace SteadyCues
{
    /// <summary>
    /// Zero-click, per-user install. Running the downloaded exe copies it to
    /// %LOCALAPPDATA%\Programs\SteadyCues, adds a Start menu shortcut and an entry in
    /// Settings › Apps, then relaunches from there. No admin rights, no installer wizard.
    /// Launch with --portable to skip this and run in place.
    /// </summary>
    internal static class Installer
    {
        private const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
        private const string UninstallKey = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\SteadyCues";

        public static string InstallDir
        {
            get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "SteadyCues"); }
        }
        public static string InstalledExe { get { return Path.Combine(InstallDir, "SteadyCues.exe"); } }
        public static string CurrentExe { get { return Assembly.GetEntryAssembly().Location; } }
        private static string ShortcutPath
        {
            get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), "SteadyCues.lnk"); }
        }

        public static bool IsInstalledCopy
        {
            get { return string.Equals(Path.GetFullPath(CurrentExe), Path.GetFullPath(InstalledExe), StringComparison.OrdinalIgnoreCase); }
        }

        /// <summary>Copies this exe into place. Returns false if the copy failed (we then just run portable).</summary>
        public static bool Install()
        {
            try
            {
                Directory.CreateDirectory(InstallDir);
                // The previous version may still be shutting down; retry briefly while the file is locked.
                for (int i = 0; ; i++)
                {
                    try { File.Copy(CurrentExe, InstalledExe, true); break; }
                    catch (IOException) { if (i > 20) throw; System.Threading.Thread.Sleep(250); }
                }
                // The user already chose to run this download; drop its "from the internet" mark on our
                // own installed copy so SmartScreen doesn't ask a second time from the Start menu.
                DeleteFile(InstalledExe + ":Zone.Identifier");
                CreateShortcut(ShortcutPath, InstalledExe);
                RegisterUninstall();
                if (AutoStartEnabled) SetAutoStart(true); // repoint an existing entry at the installed copy
                return true;
            }
            catch { return false; }
        }

        public static void Relaunch(string args)
        {
            Process.Start(new ProcessStartInfo(InstalledExe, args) { UseShellExecute = false, WorkingDirectory = InstallDir });
        }

        // ------------------------------------------------------------------ start with Windows

        public static bool AutoStartEnabled
        {
            get
            {
                try
                {
                    using (var k = Registry.CurrentUser.OpenSubKey(RunKey))
                        return k != null && k.GetValue("SteadyCues") != null;
                }
                catch { return false; }
            }
        }

        public static void SetAutoStart(bool on)
        {
            try
            {
                using (var k = Registry.CurrentUser.CreateSubKey(RunKey))
                {
                    string exe = File.Exists(InstalledExe) ? InstalledExe : CurrentExe;
                    if (on) k.SetValue("SteadyCues", "\"" + exe + "\" --background");
                    else k.DeleteValue("SteadyCues", false);
                }
            }
            catch { }
        }

        // ------------------------------------------------------------------ uninstall

        private static void RegisterUninstall()
        {
            using (var k = Registry.CurrentUser.CreateSubKey(UninstallKey))
            {
                k.SetValue("DisplayName", "SteadyCues");
                k.SetValue("DisplayVersion", Program.Version);
                k.SetValue("Publisher", "SteadyCues contributors");
                k.SetValue("DisplayIcon", InstalledExe + ",0");
                k.SetValue("InstallLocation", InstallDir);
                k.SetValue("UninstallString", "\"" + InstalledExe + "\" --uninstall");
                k.SetValue("QuietUninstallString", "\"" + InstalledExe + "\" --uninstall --quiet");
                k.SetValue("URLInfoAbout", Program.Website);
                k.SetValue("NoModify", 1, RegistryValueKind.DWord);
                k.SetValue("NoRepair", 1, RegistryValueKind.DWord);
                try { k.SetValue("EstimatedSize", (int)(new FileInfo(InstalledExe).Length / 1024), RegistryValueKind.DWord); } catch { }
            }
        }

        /// <summary>Removes everything SteadyCues created, then deletes its own folder after exit.</summary>
        public static void Uninstall()
        {
            SetAutoStart(false);
            try { File.Delete(ShortcutPath); } catch { }
            try { Registry.CurrentUser.DeleteSubKeyTree(UninstallKey, false); } catch { }
            try { Directory.Delete(Settings.Folder, true); } catch { }
            if (Directory.Exists(InstallDir))
            {
                // A running exe can't delete itself; a hidden shell finishes the job a moment later.
                string cmd = "/c ping 127.0.0.1 -n 3 >nul & rmdir /s /q \"" + InstallDir + "\"";
                try
                {
                    Process.Start(new ProcessStartInfo("cmd.exe", cmd)
                    {
                        CreateNoWindow = true, UseShellExecute = false, WorkingDirectory = Path.GetTempPath(),
                    });
                }
                catch { }
            }
        }

        [System.Runtime.InteropServices.DllImport("kernel32.dll", CharSet = System.Runtime.InteropServices.CharSet.Unicode)]
        private static extern bool DeleteFile(string path);

        private static void CreateShortcut(string lnkPath, string target)
        {
            var type = Type.GetTypeFromProgID("WScript.Shell");
            if (type == null) return;
            object shell = Activator.CreateInstance(type);
            try
            {
                object lnk = type.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, shell, new object[] { lnkPath });
                var lt = lnk.GetType();
                lt.InvokeMember("TargetPath", BindingFlags.SetProperty, null, lnk, new object[] { target });
                lt.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, lnk, new object[] { Path.GetDirectoryName(target) });
                lt.InvokeMember("Description", BindingFlags.SetProperty, null, lnk, new object[] { "Motion cues to reduce car sickness" });
                lt.InvokeMember("IconLocation", BindingFlags.SetProperty, null, lnk, new object[] { target + ",0" });
                lt.InvokeMember("Save", BindingFlags.InvokeMethod, null, lnk, null);
                System.Runtime.InteropServices.Marshal.FinalReleaseComObject(lnk);
            }
            finally { System.Runtime.InteropServices.Marshal.FinalReleaseComObject(shell); }
        }
    }
}
