import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

await mkdir('dist-native', { recursive: true });
await cp('assets', 'dist-native/assets', { recursive: true });
await cp('style.css', 'dist-native/style.css');
await cp('privacy.html', 'dist-native/privacy.html');
const html = await readFile('index.html', 'utf8');
await writeFile('dist-native/index.html', html
  .replace('<link rel="manifest" href="./manifest.webmanifest">', '')
  .replace('Stored in this browser', 'Stored on this device'));
await build({
  entryPoints: ['native/entry.js'],
  outfile: 'dist-native/app.js',
  bundle: true,
  format: 'esm',
  target: 'chrome110',
  legalComments: 'eof',
});
