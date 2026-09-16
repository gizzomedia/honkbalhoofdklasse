import {chromium,expect}from '@playwright/test';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import sharp from 'sharp';
import {photos}from '../public/franchise/photo-assets.js';
const entries=Object.entries(photos),profile=await fs.mkdtemp(path.join(os.tmpdir(),'hk-photo-test-'));
const context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:{width:1600,height:900}});
try{
 const page=await context.newPage(),requests=[];let release;const delayed=new Promise(r=>release=r);
 await context.route('**/api/franchise/**',r=>r.fulfill({json:{user:null,saves:[]}}));
 await page.route('**/franchise/game.html',r=>r.fulfill({contentType:'text/html',body:'<body style="margin:0;background:#07131c"><canvas id="game" width="1600" height="900" style="width:1600px;height:900px"></canvas><div id="controls" hidden></div><p id="announcer" hidden></p></body>'}));
 await page.route('**'+entries[1][1].full,async r=>{await delayed;await r.continue();});
 page.on('request',r=>requests.push(r.url()));
 await page.goto('http://127.0.0.1:3100/franchise/game.html');
 await page.evaluate(async()=>{const {Renderer}=await import('/franchise/renderer.js');window.renderer=new Renderer(document.querySelector('canvas'),document.querySelector('#controls'),()=>{});window.drawPhoto=(path,w=1600,h=900)=>window.renderer.paint({page:'title',areas:[],commands:[['fill',0,0,1600,900,'#07131c'],['image',path,0,0,w,h,1,true,.5]]});});
 const ready=async key=>page.waitForFunction(key=>{const c=window.renderer.cache;return c.ready.has(c.images.get(key));},key);
 await page.evaluate(p=>window.drawPhoto(p),entries[0][0]);await ready(entries[0][1].full);
 const initial=await page.locator('canvas').screenshot();
 await page.evaluate(p=>window.drawPhoto(p),entries[1][0]);
 assert.ok((await page.locator('canvas').screenshot()).equals(initial),'Previous photo disappears during the next download');
 release();await ready(entries[1][1].full);assert.ok(!(await page.locator('canvas').screenshot()).equals(initial),'Photo did not change after decode');
 await page.evaluate(p=>window.drawPhoto(p,204,222),entries[0][0]);await ready(entries[0][1].card);
 assert.ok(requests.some(u=>u.endsWith(entries[0][1].card)));assert.ok(!requests.some(u=>u.includes('/Assets/Photos/')),'Normal rendering fetched original JPEG');
 await page.evaluate(()=>window.renderer.cache.maxPhotos=4);
 for(const [p,asset]of entries.slice(3,13)){await page.evaluate(p=>window.drawPhoto(p),p);await ready(asset.full);}
 assert.ok(await page.evaluate(()=>window.renderer.cache.photoKeys.size<=4),'Decoded photo cache grew without limit');
 const [failed,asset]=entries[14];await page.route('**'+asset.full,r=>r.fulfill({status:404,body:'missing'}));
 await page.evaluate(p=>window.drawPhoto(p),failed);await ready(asset.full);
 assert.ok(requests.some(u=>u.endsWith('/franchise/'+failed)),'Missing WebP did not fall back to original');
 const source=await sharp('public/franchise/'+entries[0][0]).metadata(),optimized=await sharp('public'+entries[0][1].full).metadata();
 assert.equal(optimized.width,source.width);assert.equal(optimized.height,source.height);
 console.log('PASS: full-resolution WebP, card variants, delayed-image continuity, decoded cache bound and original-image fallback');
}finally{await context.close();await fs.rm(profile,{recursive:true,force:true});}
