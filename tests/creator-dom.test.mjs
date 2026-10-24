import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {indexedDB} from 'fake-indexeddb';
import {seed} from '../dist/seed.js';
import {putTrialAsset,trialAssets,resolveMedia,promoteTrialDocument} from '../dist/trial-assets.js';
test('中文三栏后台真实 DOM 事件：多作品、表单、逐条消息、撤销、相簿、事件、无假发布',async t=>{
 const window=new Window({url:'http://127.0.0.1:4173/studio'}),intervals=[];
 const originalInterval=globalThis.setInterval,originalTimeout=globalThis.setTimeout,timeouts=[];globalThis.setTimeout=(fn,ms,...args)=>{const id=originalTimeout(fn,ms,...args);timeouts.push(id);return id;};
 globalThis.setInterval=(fn,ms,...args)=>{const id=originalInterval(fn,ms,...args);intervals.push(id);return id;};
 const saved={};for(const key of ['document','window','location','history','localStorage','navigator','IntersectionObserver','BroadcastChannel','indexedDB','fetch','confirm'])saved[key]=Object.getOwnPropertyDescriptor(globalThis,key);
 Object.assign(globalThis,{document:window.document,window,location:window.location,history:window.history,localStorage:window.localStorage,IntersectionObserver:class{observe(){}disconnect(){}},BroadcastChannel:class{postMessage(){}},indexedDB,fetch:async url=>Response.json(String(url).endsWith('auth/me')?{user:null}:{}),confirm:()=>true});
 Object.defineProperty(globalThis,'navigator',{value:window.navigator,configurable:true});
 window.document.body.innerHTML='<div id="app"></div><dialog id="modal"></dialog><div id="toast"></div>';
 window.localStorage.setItem('pocket-v3-trials',JSON.stringify([{id:'trial-dom',document:seed(),trial:true,archived:false}]));
 t.after(()=>{intervals.forEach(clearInterval);timeouts.forEach(clearTimeout);globalThis.setInterval=originalInterval;globalThis.setTimeout=originalTimeout;window.happyDOM.abort();for(const[key,descriptor]of Object.entries(saved)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 const click=async selector=>{const el=window.document.querySelector(selector);assert(el,'missing '+selector);el.click();await flush();await flush();};
 const input=async(selector,value)=>{const el=window.document.querySelector(selector);assert(el,'missing '+selector);el.focus();el.value=value;el.dispatchEvent(new window.Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));await flush();};
 await import('../dist/app.js?creator-dom');for(let n=0;n<100&&!window.document.querySelector('.library');n++)await new Promise(resolve=>setTimeout(resolve,10));
 assert(window.document.body.textContent.includes('我的试用作品'),window.document.body.textContent);
 await click('[data-action="open-project"]');assert(window.document.querySelector('.directory'),window.document.body.textContent);assert(window.document.querySelector('.canvas'));assert(window.document.querySelector('.properties'));assert(window.document.querySelector('.phone-shell'));
 await input('[data-field="story.title"]','DOM 编辑后的作品');
 await click('[data-action="section"][data-kind="rooms"]');await click('[data-action="select-item"][data-kind="rooms"]');
 assert(window.document.querySelector('.chat-scroll'));await click('[data-action="add-message"]');assert(window.document.querySelector('[data-field="zh"]'));await input('[data-field="text"]','새로운 대화');await input('[data-field="zh"]','手动对照');
 await click('[data-action="undo"]');assert.notEqual(window.document.querySelector('[data-field="zh"]').value,'手动对照');await click('[data-action="redo"]');assert.equal(window.document.querySelector('[data-field="zh"]').value,'手动对照');
 for(const kind of ['characters','replyNodes','albums','photos','notes','sms','safari','calls','events','endings']){await click('[data-action="section"][data-kind="'+kind+'"]');assert(window.document.querySelector('#properties'),kind);assert(!window.document.body.innerHTML.includes('data-action="export"'));}
 await click('[data-action="section"][data-kind="events"]');await click('[data-action="add-condition"]');assert(window.document.querySelector('[data-condition]'));await click('[data-action="add-action"]');assert(window.document.querySelector('[data-event-action]'));
 await click('[data-action="publish"]');assert(window.document.querySelector('dialog').textContent.includes('发布需要邮箱登录'));assert(!window.document.querySelector('dialog a[href^="/read/"]'));
 await click('[data-action="close-modal"]');await click('[data-action="library"]');assert(window.document.body.textContent.includes('DOM 编辑后的作品'));
 await click('[data-action="new-guided"]');await input('[data-field="new.title"]','第二部试用作品');await input('[data-field="new.owner"]','새 주인');await click('[data-action="create-project"]');assert(window.document.querySelector('.studio-top').textContent.includes('第二部试用作品'));
 await click('[data-action="library"]');assert.equal(window.document.querySelectorAll('.project-card').length,2);
});
test('试用 Blob 在 IndexedDB 持久化，转入账号只上传引用素材并替换正式引用',async t=>{
 const prior=Object.getOwnPropertyDescriptor(globalThis,'indexedDB');Object.defineProperty(globalThis,'indexedDB',{value:indexedDB,configurable:true});t.after(()=>{if(prior)Object.defineProperty(globalThis,'indexedDB',prior);else delete globalThis.indexedDB;});
 const blob=new Blob([Buffer.from([137,80,78,71,13,10,26,10])],{type:'image/png'}),a=await putTrialAsset(blob,100,'photo.png');assert((await trialAssets()).some(x=>x.id===a.id));assert(resolveMedia(a.url).startsWith('blob:'));
 const doc=seed();doc.photos[0].src=a.url;const uploaded=[];const next=await promoteTrialDocument(doc,async(route,request)=>{uploaded.push({route,request});return {url:'/api/assets/cloud-id/file'};});assert.equal(uploaded.length,1);assert(uploaded[0].request.body instanceof Blob);assert.equal(next.photos[0].src,'/api/assets/cloud-id/file');assert.equal(doc.photos[0].src,a.url);
});




