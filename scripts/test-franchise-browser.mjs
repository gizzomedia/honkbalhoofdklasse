import {chromium,expect} from '@playwright/test';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
// An explicitly new, empty browser profile: never the user's Chrome profile.
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'hk-franchise-browser-test-'));
const ctx=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:{width:1600,height:930}}),page=await ctx.newPage();
// All account/cloud endpoints are mocked. No authentication, email or cloud writes.
await ctx.route('**/api/franchise/**',r=>r.fulfill({contentType:'application/json',body:r.request().url().endsWith('/session')?JSON.stringify({user:null,configured:false}):JSON.stringify({saves:[]})}));
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:3100/franchise/game.html');
await expect(page.locator('[data-action="careers"]')).toBeVisible({timeout:60000});
const click=async a=>{await page.locator('[data-action="'+a+'"]').click();};
await click('careers');await click('new:1');await click('team:0');await click('create');await click('tour:skip');
await expect(page.locator('[data-action="simmonth"]')).toBeVisible();
await click('group:1');await click('tab:2');await click('fieldpos');await expect(page.locator('[data-action^="setfield:"]').first()).toBeVisible();await page.keyboard.press('Escape');
await click('group:2');await click('tab:4');await expect(page.locator('[data-action^="ability:"]').first()).toBeVisible();
await click('group:4');await click('tab:8');await click('statstype');await click('statstype');
await click('tab:17');await click('rosterclub:1');await expect(page.locator('[data-action^="profile:"]').first()).toBeVisible();await page.locator('[data-action^="profile:"]').first().click();await click('close');
await click('group:0');await click('tab:1');await click('simmonth');await page.waitForTimeout(1600);await page.keyboard.press(' ');
await page.locator('#account').click();await expect(page.locator('#account-dialog')).toBeVisible();const dl=page.waitForEvent('download');await page.locator('#export').click();const downloaded=await dl;await downloaded.saveAs('../work/web-parity/browser-save.json');await page.locator('#close-account').click();
const saved=await fs.readFile('../work/web-parity/browser-save.json','utf8');if(!/"rng":\d+/.test(saved))throw Error('Save does not contain exact RNG');
await page.screenshot({path:'../work/web-parity/browser-live.png'});
await page.reload();await expect(page.locator('[data-action="careers"]')).toBeVisible({timeout:60000});await click('careers');await click('load:1');await expect(page.locator('[data-action="simmonth"]')).toBeVisible();
if(errors.length)throw Error(errors.join('\n'));
console.log('PASS: isolated browser new career, tutorial, lineup positions, development, fielding stats, opponent profile, simulation pause, exact save export and reload');
await ctx.close();await fs.rm(profile,{recursive:true,force:true});
