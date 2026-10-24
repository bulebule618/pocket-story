import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {buildPages} from '../scripts/build-pages.mjs';
import {runtimeConfig} from '../dist/runtime-config.js';
import {routeHref,sitePath,apiHref,resolveHostedMedia,setMediaLinks,clearMediaLinks} from '../dist/location.js';
import {openStore} from '../server/store.mjs';
import {createAPI} from '../server/api.mjs';
import {allowedPageOrigins} from '../server/cors.mjs';

test('Pages构建使用仓库路径与hash阅读链接，仅包含公开网页文件，缺少后端拒绝发布',async()=>{
 await assert.rejects(buildPages(),/PAGES_API_BASE/);
 await assert.rejects(buildPages({apiBase:'https://backend.example/key?secret=x'}),/HTTPS/);
 const result=await buildPages({basePath:'/pocket-story/',apiBase:'https://backend.example',output:path.resolve('work/pages-test')});
 const html=await readFile(path.join(result.directory,'index.html'),'utf8');
 assert(html.includes('/pocket-story/app.js'));assert(html.includes('/pocket-story/styles.css'));assert(html.includes('Content-Security-Policy'));
 assert(!(await readdir(result.directory)).some(x=>/server|sqlite|env|node_modules/.test(x)));
 assert.equal(await readFile(path.join(result.directory,'404.html'),'utf8'),html);
 const original={...runtimeConfig};try{
 Object.assign(runtimeConfig,{siteBase:'/pocket-story/',apiBase:'https://backend.example',routing:'hash'});
 assert.equal(routeHref('/read/demo'),'/pocket-story/#/read/demo');assert.equal(sitePath('/assets/a.svg'),'/pocket-story/assets/a.svg');
 assert.equal(apiHref('auth/me'),'https://backend.example/api/auth/me');
 assert.equal(resolveHostedMedia('/api/assets/a/file'),'https://backend.example/api/assets/a/file');
 setMediaLinks([{path:'/api/assets/a/file',url:'https://backend.example/api/assets/a/file?access=grant',expires:Date.now()+60000}]);
 assert(resolveHostedMedia('/api/assets/a/file').endsWith('?access=grant'));
 }finally{Object.assign(runtimeConfig,original);clearMediaLinks();}
});

test('Pages跨域真实HTTP登录不依赖Cookie，私有素材授权有范围和有效期',async t=>{
 const directory=await mkdtemp(path.resolve('work/pages-api-')),db=openStore(directory),mail=[],page='https://bulebule618.github.io';let time=Date.now();
 const server=http.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const handler=createAPI({db,directory,origin,allowedOrigins:allowedPageOrigins(page),mailer:async m=>mail.push(m),now:()=>time});
 server.on('request',(req,res)=>handler(req,res,new URL(req.url,origin)));t.after(async()=>{await new Promise(r=>server.close(r));db.close();});
 const call=async(route,method='GET',body,token='',source=page)=>{const res=await fetch(origin+'/api/'+route,{method,headers:{Origin:source,...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':Buffer.isBuffer(body)?'image/png':'application/json'}:{})},body:body?Buffer.isBuffer(body)?body:JSON.stringify(body):undefined});return {status:res.status,headers:res.headers,data:res.headers.get('content-type')?.includes('json')?await res.json():await res.arrayBuffer()};};
 assert.equal((await call('auth/me','OPTIONS')).status,204);assert.equal((await call('auth/me','GET',null,'','https://evil.example')).status,403);
 const login=async email=>{const c=await call('auth/request','POST',{email});const v=await call('auth/verify','POST',{challengeId:c.data.challengeId,code:mail.at(-1).code});assert.equal(v.status,200);assert.equal(v.headers.get('access-control-allow-origin'),page);assert(v.data.sessionToken);return v.data.sessionToken;};
 const alice=await login('alice@pages.test'),bob=await login('bob@pages.test');assert((await call('auth/me','GET',null,alice)).data.user);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6WQAAAAASUVORK5CYII=','base64');
 const asset=await call('assets','POST',png,alice);assert.equal(asset.status,201);const assetRoute='assets/'+asset.data.id+'/file';assert.equal((await call(assetRoute)).status,404);
 assert.equal((await call('assets/access','POST',{ids:[asset.data.id]},bob)).status,404);
 const grants=await call('assets/access','POST',{ids:[asset.data.id]},alice),url=new URL(grants.data.links[0].url),grant=url.search;
 assert.equal((await call(assetRoute+grant)).status,200);assert.equal((await call('assets/missing/file'+grant)).status,404);
 time+=3600001;assert.equal((await call(assetRoute+grant)).status,404);
 assert.equal((await call('auth/logout','POST',{},alice)).status,200);assert.equal((await call('projects','GET',null,alice)).status,401);
});
