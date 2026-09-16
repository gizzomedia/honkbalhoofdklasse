// Fresh browser profile: guest-only live service smoke test, never writes cloud saves.
import {chromium,webkit,firefox,expect} from '@playwright/test';
import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
const origin=process.env.FRANCHISE_URL||'http://127.0.0.1:3100';
const engine=process.env.FRANCHISE_BROWSER||'chrome';
const browserType=({chrome:chromium,webkit,firefox})[engine];if(!browserType)throw Error('Unknown test browser');
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'hk-franchise-deployed-'));
const context=await browserType.launchPersistentContext(profile,{...(engine==='chrome'?{channel:'chrome'}:{}),headless:true,viewport:{width:1600,height:930}});
try{
 const session=await context.request.get(origin+'/api/franchise/session');expect(session.status()).toBe(200);if(!session.headers()['content-type']?.includes('application/json'))throw Error('Preview requires Vercel authentication; no guest test executed');expect((await session.json()).user).toBeNull();
 expect((await context.request.get(origin+'/api/franchise/saves')).status()).toBe(401);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/franchise');await expect(page.getByRole('button',{name:'DOORGAAN MET GOOGLE'})).toBeEnabled();
 await page.getByRole('link',{name:'SPELEN ALS GAST →'}).click();
 await page.locator('[data-action="careers"]').click({timeout:90000});await page.locator('[data-action="new:1"]').click();await page.locator('[data-action="create"]').click();await page.locator('[data-action="tour:skip"]').click();
 await expect(page.locator('#sync')).toContainText('Lokaal opgeslagen');
 await page.reload();await page.locator('[data-action="careers"]').click({timeout:90000});await page.locator('[data-action="load:1"]').click();
 await expect(page.locator('[data-action="group:1"]')).toBeVisible();expect(errors).toEqual([]);
 console.log('PASS: live anonymous APIs, Google entrance, engine/assets, career creation, local save and reload:',origin);
}finally{await context.close();await fs.rm(profile,{recursive:true,force:true});}
