// Renders the SteadyCues demo video from composition.html.
//
//   npm run render                      # 16:9 + 9:16 MP4s and a README GIF into ./out
//   npm run render -- --format vertical # just one format
//   npm run render -- --stills 3,15,28  # PNG stills at those seconds (for checking a scene)
//   npm run render -- --social          # link-preview images (og.png, social-preview.png)
//
// Needs Google Chrome and ffmpeg (on PATH, or set CHROME / FFMPEG).

import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {createReadStream, existsSync, mkdirSync, statSync} from 'node:fs';
import {extname, join, normalize, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';

const here = fileURLToPath(new URL('.', import.meta.url));
const repo = resolve(here, '../..');
const out = join(here, 'out');
mkdirSync(out, {recursive: true});

const CHROME = process.env.CHROME || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find(p => existsSync(p));
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = 30;
const FORMATS = {landscape: {width: 1920, height: 1080}, vertical: {width: 1080, height: 1920}};

const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const formats = opt('format') ? [opt('format')] : Object.keys(FORMATS);
const stills = opt('stills')?.split(',').map(Number);

// Serve the repository so the composition, the phone page and the app assets share one origin.
const types = {'.html': 'text/html', '.png': 'image/png', '.ico': 'image/x-icon', '.js': 'text/javascript', '.css': 'text/css'};
const server = createServer((req, res) => {
  const path = normalize(join(repo, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!path.startsWith(repo) || !existsSync(path) || statSync(path).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, {'Content-Type': types[extname(path)] || 'application/octet-stream'});
  createReadStream(path).pipe(res);
}).listen(0);
const base = `http://localhost:${server.address().port}/tools/video/composition.html`;

function run(cmd, cmdArgs) {
  return new Promise((ok, fail) => {
    const p = spawn(cmd, cmdArgs, {stdio: ['ignore', 'ignore', 'inherit']});
    p.on('exit', code => (code === 0 ? ok() : fail(new Error(`${cmd} exited with ${code}`))));
  });
}

async function render(format) {
  const {width, height} = FORMATS[format];
  const browser = await puppeteer.launch({executablePath: CHROME, headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb']});
  try {
    const page = await browser.newPage();
    await page.setViewport({width, height, deviceScaleFactor: 1});
    await page.goto(`${base}?format=${format}`, {waitUntil: 'networkidle0', timeout: 120000});
    await page.evaluate(() => window.ready);
    const duration = await page.evaluate(() => window.DURATION);

    if (stills) {
      for (const t of stills) {
        // The dot simulation is stateful, so replay up to t in frame-sized steps.
        for (let f = 0; f <= Math.round(t * FPS); f++) await page.evaluate(x => window.renderFrame(x), f / FPS);
        await page.screenshot({path: join(out, `still-${format}-${t}s.png`)});
        console.log(`still ${format} @ ${t}s`);
      }
      return;
    }

    const file = join(out, `steadycues-demo-${format}.mp4`);
    const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file],
      {stdio: ['pipe', 'ignore', 'inherit']});
    const done = new Promise((ok, fail) => ff.on('exit', c => (c === 0 ? ok() : fail(new Error(`ffmpeg exited with ${c}`)))));
    const frames = Math.round(duration * FPS);
    for (let f = 0; f < frames; f++) {
      await page.evaluate(x => window.renderFrame(x), f / FPS);
      const shot = await page.screenshot({type: 'jpeg', quality: 94});
      if (!ff.stdin.write(shot)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % (FPS * 5) === 0) process.stdout.write(`\r${format}: ${Math.round((f / frames) * 100)}%   `);
    }
    ff.stdin.end();
    await done;
    console.log(`\r${format}: done → ${file}`);
    return file;
  } finally {
    await browser.close();
  }
}

async function social() {
  // Link-preview images: Open Graph (1200×630) and GitHub's social preview (1280×640).
  const browser = await puppeteer.launch({executablePath: CHROME, headless: true, args: ['--hide-scrollbars']});
  try {
    for (const [name, width, height] of [['og.png', 1200, 630], ['social-preview.png', 1280, 640]]) {
      const page = await browser.newPage();
      await page.setViewport({width, height, deviceScaleFactor: 1});
      await page.goto(base.replace('composition.html', 'social.html'), {waitUntil: 'networkidle0', timeout: 120000});
      await page.evaluate(() => window.ready);
      await page.screenshot({path: join(out, name)});
      console.log(`${name} (${width}×${height})`);
    }
  } finally {
    await browser.close();
  }
}

try {
  if (args.includes('--social')) { await social(); process.exit(0); }
  const files = {};
  for (const f of formats) files[f] = await render(f);
  if (!stills && files.landscape) {
    // README GIF: the product scene, looped, small enough for GitHub.
    const gif = join(out, 'steadycues-demo.gif');
    await run(FFMPEG, ['-y', '-loglevel', 'error', '-ss', '14.2', '-t', '10', '-i', files.landscape, '-vf',
      'fps=12,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle',
      '-loop', '0', gif]);
    // Lighter copies for the website (the full-quality files are for YouTube, TikTok etc.).
    const web = (src, width, dest) => run(FFMPEG, ['-y', '-loglevel', 'error', '-i', src, '-vf', `scale=${width}:-2:flags=lanczos`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(out, dest)]);
    await web(files.landscape, 1600, 'web-landscape.mp4');
    if (files.vertical) await web(files.vertical, 900, 'web-vertical.mp4');
    // Poster frame for the website's <video>.
    await run(FFMPEG, ['-y', '-loglevel', 'error', '-ss', '17', '-i', files.landscape, '-frames:v', '1', '-q:v', '3', join(out, 'steadycues-demo-poster.jpg')]);
    console.log(`gif and poster → ${out}`);
  }
} finally {
  server.close();
}
