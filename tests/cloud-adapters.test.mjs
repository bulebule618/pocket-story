import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createClient} from '@libsql/client';
import {createCloudRuntime,createCloudHandler} from '../server/cloud-runtime.mjs';
import {libsqlDatabase} from '../server/database.mjs';
import {seed} from '../dist/seed.js';
test('libSQL异步事务与私有Blob适配：独立调用实例保留账号、草稿、发布、素材和验证码限流',async t=>{
 const dir=await mkdtemp(path.resolve('work/libsql-')),url=pathToFileURL(path.join(dir,'cloud-test.sqlite')).href;
 const client1=createClient({url}),client2=createClient({url});
 await client1.executeMultiple(await readFile(new URL('../migrations/001_initial.sql',import.meta.url),'utf8'));
 await client1.executeMultiple(await readFile(new URL('../migrations/002_request_limits.sql',import.meta.url),'utf8'));
 await client1.executeMultiple(await readFile(new URL('../migrations/003_media_access.sql',import.meta.url),'utf8'));
 await client1.execute('CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY)');await client1.execute('INSERT INTO schema_migrations VALUES(3)');
 const blobMap=new Map(),mail=[];
 const blobSDK={put:async(key,bytes,opts)=>{assert.equal(opts.access,'private');assert.equal(opts.allowOverwrite,false);blobMap.set(key,Buffer.from(bytes));return {pathname:key};},get:async(key,opts)=>{assert.equal(opts.access,'private');return blobMap.has(key)?{statusCode:200,stream:new Response(blobMap.get(key)).body}:null;}};
 const env={APP_ORIGIN:'https://pocket.example',TURSO_DATABASE_URL:'libsql://configured.example',TURSO_AUTH_TOKEN:'test-injected-not-real',BLOB_READ_WRITE_TOKEN:'test-injected-not-real'};
 const runtimes=await Promise.all([client1,client2].map(client=>createCloudRuntime(env,{client,blobSDK,mailer:async x=>mail.push(x)})));
 let index=0;const server=http.createServer((req,res)=>{const runtime=runtimes[index++%2];runtime.handler(req,res,new URL(req.url,'https://pocket.example'));});await new Promise(r=>server.listen(4191,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>server.close(r));runtimes.forEach(x=>x.close());});
 const call=async(route,method='GET',body,cookie='')=>{const response=await fetch('http://127.0.0.1:4191/api/'+route,{method,headers:{Origin:env.APP_ORIGIN,...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':Buffer.isBuffer(body)?'image/png':'application/json'}:{})},body:Buffer.isBuffer(body)?body:body?JSON.stringify(body):undefined});return {status:response.status,data:response.headers.get('content-type')?.includes('json')?await response.json():Buffer.from(await response.arrayBuffer()),cookie:response.headers.get('set-cookie')?.split(';')[0],setCookie:response.headers.get('set-cookie')};};
 const c=await call('auth/request','POST',{email:'cloud@example.test'});assert.equal(c.status,200);const verify=await call('auth/verify','POST',{challengeId:c.data.challengeId,code:mail[0].code});assert.equal(verify.status,200);assert(verify.setCookie.includes('Secure'));const cookie=verify.cookie;
 const p=(await call('projects','POST',{document:seed()},cookie)).data;assert.equal((await call('projects/'+p.id,'GET',null,cookie)).data.id,p.id);
 const doc=seed();doc.title='异步事务草稿';const writes=await Promise.all([call('projects/'+p.id,'PUT',{document:doc,revision:1},cookie),call('projects/'+p.id,'PUT',{document:doc,revision:1},cookie)]);assert.deepEqual(writes.map(x=>x.status).sort(),[200,409]);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6WQAAAAASUVORK5CYII=','base64'),asset=await call('assets','POST',png,cookie);assert.equal(asset.status,201);assert.equal(blobMap.size,1);assert.equal((await call('assets/'+asset.data.id+'/file')).status,404);
 doc.photos[0].src=asset.data.url;assert.equal((await call('projects/'+p.id,'PUT',{document:doc,revision:2},cookie)).status,200);assert.equal((await call('projects/'+p.id+'/publish','POST',{revision:3,failurePolicy:'keep'},cookie)).status,201);assert.equal((await call('read/'+p.publicId)).data.document.title,doc.title);assert.deepEqual((await call('assets/'+asset.data.id+'/file')).data,png);
 await call('assets/'+asset.data.id,'DELETE',{},cookie);assert.equal((await call('assets/'+asset.data.id+'/file')).status,200);
 const attempts=await call('auth/request','POST',{email:'attempts@example.test'});for(let n=0;n<5;n++)assert.equal((await call('auth/verify','POST',{challengeId:attempts.data.challengeId,code:'000000'})).status,401);assert.equal((await call('auth/verify','POST',{challengeId:attempts.data.challengeId,code:mail.at(-1).code})).status,401);
 const before=(await client1.execute('SELECT count(*) n FROM users')).rows[0].n;const db=libsqlDatabase(client1);await assert.rejects(db.transaction(async()=>{await db.run('INSERT INTO users VALUES(?,?)','rollback','rollback@example.test');throw Error('rollback');}));assert.equal((await client1.execute('SELECT count(*) n FROM users')).rows[0].n,before);
});
test('线上缺少凭据不落到本机临时盘，不假装登录、保存或发布成功',async t=>{
 const handler=createCloudHandler({env:{}}),server=http.createServer(handler);await new Promise(r=>server.listen(4192,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const me=await fetch('http://127.0.0.1:4192/api/entry?route=auth/me');assert.deepEqual(await me.json(),{user:null,onlineReady:false});
 for(const route of ['health','projects','auth/request']){const res=await fetch('http://127.0.0.1:4192/api/entry?route='+route);assert.equal(res.status,503);assert(!(await res.json()).missing.includes('some-secret-value'));}
});
