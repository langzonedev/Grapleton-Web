import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import sharp from 'sharp';

await mkdir('dist-native', { recursive: true });
await cp('assets', 'dist-native/assets', { recursive: true });
for (const file of ['style.css', 'calendar.css', 'calendar.js']) await cp(file, 'dist-native/' + file);
await cp('privacy.html', 'dist-native/privacy.html');
await cp('native/ui.css', 'dist-native/native-ui.css');
const html = await readFile('index.html', 'utf8');
await writeFile('dist-native/index.html', html
  .replace('<link rel="manifest" href="./manifest.webmanifest">', '')
  .replace('viewport-fit=cover', 'viewport-fit=contain')
  .replace('<link rel="stylesheet" href="./calendar.css">', '<link rel="stylesheet" href="./calendar.css"><link rel="stylesheet" href="./native-ui.css">')
  .replace('Stored in this browser', 'Stored on this device'));
await build({
  entryPoints: ['native/entry.js'],
  outfile: 'dist-native/app.js',
  bundle: true,
  format: 'esm',
  target: 'chrome110',
  legalComments: 'eof',
});

// Export the approved glass artwork at Android's density-specific launcher sizes.
for (const [density, scale] of Object.entries({ mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 })) {
  const directory = 'android/app/src/main/res/mipmap-' + density;
  await mkdir(directory, { recursive: true });
  const source = 'assets/grapleton-v4-512.png';
  const size = 48 * scale;
  await sharp(source).resize(size, size).png().toFile(directory + '/ic_launcher.png');
  const circle = Buffer.from('<svg width="' + size + '" height="' + size + '"><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + size / 2 + '" fill="white"/></svg>');
  await sharp(source).resize(size, size).ensureAlpha().composite([{ input: circle, blend: 'dest-in' }])
    .png().toFile(directory + '/ic_launcher_round.png');
  await sharp(source).resize(108 * scale, 108 * scale).png().toFile(directory + '/ic_launcher_foreground.png');
}
