# Demo video

The demo video is a web page ([`composition.html`](composition.html)) rendered frame by frame
in headless Chrome and encoded with ffmpeg. The cue dots use the same spring model and
"felt force" convention as the Windows overlay, the phone scene loads the real phone page, and
the app scenes use the real screenshots from `website/public`.

```bash
cd tools/video
npm install
npm run render                         # 16:9 + 9:16 MP4s, README GIF, poster and web copies → out/
npm run render -- --stills 3,15,28     # PNG stills at those seconds, to check a scene quickly
npm run render -- --social             # link-preview images (og.png, social-preview.png)
```

Needs Google Chrome and ffmpeg (on PATH, or set `CHROME` / `FFMPEG`). To preview in real time,
serve the repo root with any static server and open `/tools/video/composition.html?play`
(add `&format=vertical` for the 9:16 cut).

After rendering, copy the outputs into place:

| Output | Goes to |
| --- | --- |
| `web-landscape.mp4` | `website/public/media/steadycues-demo.mp4` |
| `web-vertical.mp4` | `website/public/media/steadycues-demo-vertical.mp4` |
| `steadycues-demo-poster.jpg` | `website/public/media/` |
| `steadycues-demo.gif`, `social-preview.png` | `press/` |
| `og.png` | `website/public/og.png` |

Photograph: Fritz Bielmeier on Unsplash (Unsplash License).
