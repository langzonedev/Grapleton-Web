import { chromium, devices } from 'playwright';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = process.env.TEST_URL || 'http://127.0.0.1:8000/';
const browser = await chromium.launch({ headless: true });
try {
 for (const device of [null, 'Pixel 7']) {
  const context = await browser.newContext({ ...(device ? devices[device] : {}), acceptDownloads:true });
  const page = await context.newPage();
  await page.goto(base+'#settings');
  await page.getByRole('button',{name:'Export backup'}).waitFor();
  const seed = await page.evaluate(async () => {
   const {readCellar,saveCellar}=await import('./store.js');
   const current=await readCellar();
   const canvas=document.createElement('canvas'); canvas.width=8; canvas.height=8;
   const ctx=canvas.getContext('2d'); ctx.fillStyle='red'; ctx.fillRect(0,0,8,8);
   const photo=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg'));
   const wine={name:'Test Shiraz',style:'Red',vintage:'2022',variety:'Shiraz / Syrah',purchased:'2026-11-24',purchasePrice:'49.95',drinkBy:'2029-01-01',reason:'Test',pairings:'Steak',notes:'Photo round trip',photo};
   await saveCellar({racks:[{id:'main',name:'Main rack',rows:3,columns:6,bottles:{'1:1':wine}},{id:'second',name:'Second rack',rows:2,columns:2,bottles:{'2:2':{...wine,name:'Second bottle',photo:null}}}]},current.revision);
   return true;
  });
  assert(seed);
  await page.reload(); await page.getByRole('button',{name:'Export backup'}).waitFor();
  const downloaded=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export backup'}).click();
  const download=await downloaded;
  const original=await readFile(await download.path(),'utf8');
  const backup=JSON.parse(original);
  assert.equal(backup.version,1);
  assert.equal(backup.racks.length,2);
  assert.equal(backup.racks[0].bottles['1:1'].purchasePrice,'49.95');
  assert.match(backup.racks[0].bottles['1:1'].photo,/^data:image\/jpeg;base64,/);
  const upload=async data=>page.locator('#backup-file').setInputFiles({name:'test.json',mimeType:'application/json',buffer:Buffer.from(typeof data==='string'?data:JSON.stringify(data))});
  // Install the real picker handler and supply the chosen file.
  const choose=async data=>{const chooser=page.waitForEvent('filechooser'); await page.getByRole('button',{name:'Restore backup'}).click(); await chooser; await upload(data);};
  const snapshot=()=>page.evaluate(async()=>{const {readCellar}=await import('./store.js');const c=await readCellar();return {revision:c.revision,names:c.racks.map(r=>r.name),wine:c.racks[0].bottles['1:1']?.name,photo:c.racks[0].bottles['1:1']?.photo?.size};});
  const before=await snapshot();
  await choose(backup);
  await page.getByRole('heading',{name:'Restore cellar?'}).waitFor();
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.deepEqual(await snapshot(),before);
  for(const mutate of [b=>b.version=2,b=>b.racks[0].bottles['1:1'].purchased='2026-02-30',b=>b.racks[0].bottles['1:1'].photo='data:image/jpeg;base64,/9gA',b=>b.racks[0].bottles['4:1']=b.racks[0].bottles['1:1']]){
   const bad=JSON.parse(original);mutate(bad);await choose(bad);
   await page.getByText('Invalid or unsupported Grapleton backup. Your cellar has not changed.').waitFor();
   assert.deepEqual(await snapshot(),before);
  }
  await page.evaluate(async()=>{const {readCellar,saveCellar}=await import('./store.js');const c=await readCellar();await saveCellar({racks:[{id:'main',name:'Empty rack',rows:1,columns:1,bottles:{}}]},c.revision);});
  await page.reload();
  await choose(backup);
  await page.getByRole('heading',{name:'Restore cellar?'}).waitFor();
  await page.getByRole('button',{name:'Replace cellar'}).click();
  await page.getByText('Cellar restored.',{exact:true}).waitFor();
  const after=await snapshot();
  assert.deepEqual(after.names,before.names); assert.equal(after.wine,before.wine); assert.equal(after.photo,before.photo);
  await page.reload(); assert.deepEqual(await snapshot(),after);
  const again=page.waitForEvent('download');await page.getByRole('button',{name:'Export backup'}).click();const reexport=JSON.parse(await readFile(await (await again).path(),'utf8'));
  assert.deepEqual(reexport.racks,backup.racks);
  console.log('PASS: '+(device||'desktop')+' photo round trip, cancellation, corruption rejection, persistence');
  await context.close();
 }
} finally { await browser.close(); }
