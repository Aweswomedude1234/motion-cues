# Changelog

All notable changes to SteadyCues are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-09-25

### Added
- Motion cue overlay: click-through dots on the left and right (or all four) screen edges that
  follow the force a passenger feels, synced to the display refresh rate.
- Automatic, Always on and Off modes, plus a global Ctrl + Alt + M shortcut.
- Motion sources: the PC's own accelerometer and gyroscope, a phone over Wi-Fi or hotspot
  (QR-code pairing, HTTPS with a certificate generated on the PC), and GPS / location receivers.
- Gyroscope-aware gravity tracking so long accelerations stay visible while picking up the
  device doesn't fling the dots around.
- Demo drive for previewing the cues without a car.
- Appearance options: strength, dot size, dots per column, opacity, color style, edges, displays.
- Dots hidden from screenshots and screen sharing by default.
- Zero-click per-user install, Start menu entry, start with Windows, and uninstall from
  Settings › Apps.
- Website built with the Astryx design system.
