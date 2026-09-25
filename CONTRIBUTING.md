# Contributing to SteadyCues

Thanks for helping people read on the road without feeling sick. All contributions are welcome:
bug reports, testing on different hardware, code, docs and design.

## The most useful thing you can do

**Test on real hardware in a real car** (as a passenger!) and tell us how it felt. Useful details:
PC model, whether it has a motion sensor, phone model and browser, how the device was held, and
whether the dots moved the right way.

## Building the app

You only need Windows 10 or 11. SteadyCues targets .NET Framework 4.8, which ships with Windows,
and is compiled with the C# compiler that comes with it: no SDK or Visual Studio needed.

```powershell
.\build.ps1          # builds dist\SteadyCues.exe
.\test.ps1           # builds and runs the test suite
.\build.ps1 -Run     # builds and launches it
```

Useful flags when running a build:

| Flag | Effect |
| --- | --- |
| `--portable` | Run in place instead of installing to `%LOCALAPPDATA%\Programs\SteadyCues` |
| `--loopback` | Phone link listens on 127.0.0.1 only (no firewall prompt while developing) |
| `--demo` | Start a demo drive immediately |
| `--background` | Start in the tray without opening the window |

Because the compiler is C# 5, please stick to C# 5 syntax (no `?.`, `$""`, `=>` members, or
`out var`). Keep the app dependency-free: one exe, nothing to install.

## Working on the website

The site lives in `website/` and uses [Astryx](https://github.com/facebook/astryx) with React
and Vite.

```bash
cd website
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm run build
```

Use Astryx components and tokens rather than custom CSS. `npm run astryx -- component <Name>`
prints any component's documentation.

## Pull requests

- Keep each PR focused on one change and describe how you tested it.
- Run `.\test.ps1` (and `npm run typecheck` for website changes) before opening it.
- For changes to how motion is interpreted, add or update a test in `tests/Tests.cs`.

## Releasing

Update `VERSION` and `CHANGELOG.md`, then push a tag such as `v1.0.1`. The release workflow
builds the exe, runs the tests and publishes a GitHub release with the exe and its SHA-256
checksum.
