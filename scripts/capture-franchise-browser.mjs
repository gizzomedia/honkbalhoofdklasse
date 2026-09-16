import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
await page.route('**/franchise/game.html',r=>r.fulfill({contentType:'text/html',body:'<body style="margin:0;background:#07131c"><canvas id="game" width="1600" height="900" style="width:1600px;height:900px"></canvas><div id="controls" hidden></div><p id="announcer" hidden></p></body>'}));
page.on('pageerror',e=>console.error(e));
await page.goto('http://127.0.0.1:3100/franchise/game.html');
await page.evaluate(async()=>{const {Renderer}=await import('/franchise/renderer.js');window.renderer=new Renderer(document.querySelector('canvas'),document.querySelector('#controls'),()=>{});await window.renderer.fonts();});
await fs.mkdir('../work/web-parity/browser-screens',{recursive:true});
for(let index=1;index<=50;index++){
 const name=String(index).padStart(2,'0');
 const commands=JSON.parse(await fs.readFile('../work/web-parity/capture-commands/'+name+'.json','utf8'));
 await page.evaluate(async f=>{window.renderer.paint(f);await Promise.all([...window.renderer.images.values()].map(im=>im.decode().catch(()=>{})));window.renderer.paint(f);},commands);
 await page.locator('canvas').screenshot({path:`../work/web-parity/browser-screens/${name}.png`});
}
await browser.close();console.log('PASS: 50 browser screen renders');
