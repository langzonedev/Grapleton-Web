// Run with Node.js and sharp installed: node scripts/export-icons.cjs
// Resampling only; artwork is the approved generated master, not redrawn here.
const sharp = require('sharp');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = path.join(root, 'assets/brand/grapleton-master.webp');
const outputs = [
  ['grapleton-v2-192.png',192], ['grapleton-v2-512.png',512],
  ['grapleton-v2-maskable-192.png',192], ['grapleton-v2-maskable-512.png',512],
  ['grapleton-v2-apple-touch-180.png',180],
  ['grapleton-v2-header-128.png',128],
  ['grapleton-v2-favicon-32.png',32], ['grapleton-v2-favicon-48.png',48],
];
async function main() {
  for (const [file,size] of outputs) {
    await sharp(source).resize(size,size,{kernel:'lanczos3'})
      .flatten({background:'#351d28'}).removeAlpha()
      .png({palette:true,colours:128,dither:0}).toFile(path.join(root,'assets',file));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
