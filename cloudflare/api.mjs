import {randomBytes,randomInt,createHash,timingSafeEqual} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {validate,collections,copyModules} from '../dist/domain.js';
import {d1Files} from '../server/d1-files.mjs';
const id=()=>randomBytes(18).toString('base64url'),hash=x=>createHash('sha256').update(x).digest('hex');
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const maxUploadBytes=4*1024*1024,maxDocumentBytes=1024*1024,documentBudget=80*1024*1024;
export function createD1API(env,{mailer,now=()=>Date.now()}={}){
 const database=env.DB,files=d1Files(database),p=(sql,...args)=>database.prepare(sql).bind(...args),one=(sql,...args)=>p(sql,...args).first(),all=async(sql,...args)=>(await p(sql,...args).all()).results,run=(sql,...args)=>p(sql,...args).run();
 mailer??=env.RESEND_API_KEY&&env.MAIL_FROM?async({email,code})=>{const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:env.MAIL_FROM,to:[email],subject:'口袋叙事登录验证码',text:'你的验证码是 '+code+'，10分钟内有效。'})});if(!res.ok)throw Error('Email delivery failed');}:null;
 const guards={revision:(project,revision)=>({sql:'SELECT COUNT(*)=1 FROM projects WHERE id=? AND revision=? AND deleted=0',args:[project,revision]}),budget:bytes=>({sql:'SELECT COALESCE((SELECT SUM(length(CAST(document AS BLOB))) FROM projects),0)+COALESCE((SELECT SUM(length(CAST(document AS BLOB))) FROM versions),0)+COALESCE((SELECT SUM(length(CAST(document AS BLOB))) FROM characters),0)+?<=?',args:[bytes,documentBudget]})};
 // D1 batches are transactional. Assertions and writes occur in the same batch,
 // so two invocations cannot both accept the same revision or consume one OTP.
 const atomic=async(statements,checks=[],status=409,message='数据已改变，请重新加载核对')=>{
  const tokens=checks.map(()=>id()),assertions=checks.map((g,i)=>p('INSERT INTO mutation_checks(token,ok) VALUES(?, CASE WHEN ('+g.sql+') THEN 1 ELSE 0 END)',tokens[i],...g.args));
  try{await database.batch([...assertions,...statements,...tokens.map(t=>p('DELETE FROM mutation_checks WHERE token=?',t))]);}catch(e){if(String(e.message).includes('CHECK constraint'))fail(status,message);throw e;}
 };
 const serialize=doc=>{if(!doc||doc.schemaVersion!==3||typeof doc.title!=='string'||!doc.title.trim()||doc.title.length>200||!doc.phone||collections.some(k=>!Array.isArray(doc[k])))fail(422,'作品结构无效');const text=JSON.stringify(doc);if(Buffer.byteLength(text)>maxDocumentBytes)fail(413,'作品文本超过当前免费单文档1MiB限制');if(text.includes('/local-assets/')||text.includes('blob:'))fail(422,'正式作品不能引用本机素材');return text;};
 const assets=doc=>[...new Set([...JSON.stringify(doc).matchAll(/\/api\/assets\/([\w-]+)\/file/g)].map(x=>x[1]))];
 const assetGuard=(doc,user)=>{const ids=assets(doc);return {sql:'SELECT COUNT(*)=? FROM assets WHERE owner_id=? AND id IN (SELECT value FROM json_each(?))',args:[ids.length,user.id,JSON.stringify(ids)]};};
 const refs=(doc,pid,vid='')=>[p('DELETE FROM asset_refs WHERE project_id=? AND version_id=?',pid,vid),p('INSERT INTO asset_refs SELECT value,?,? FROM json_each(?)',pid,vid,JSON.stringify(assets(doc)))];
 const project=x=>({id:x.id,title:x.title,document:JSON.parse(x.document),revision:x.revision,archived:!!x.archived,publicId:x.public_id,online:!!x.online,liveVersion:x.live_version,updated:x.updated});
 const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});
 const bytesOf=async(req,limit)=>{if(Number(req.headers.get('content-length'))>limit)fail(413,'请求过大');const reader=req.body?.getReader();if(!reader)return Buffer.alloc(0);let size=0;const chunks=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();fail(413,'请求过大');}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}return Buffer.concat(chunks);};
 const read=async req=>{const bytes=await bytesOf(req,maxDocumentBytes+65536);try{return JSON.parse(bytes.toString());}catch{fail(400,'JSON格式错误');}};
 return async request=>{
  const url=new URL(request.url),origin=url.origin,r=url.pathname.split('/').filter(Boolean).slice(1),m=request.method;
  try{
   if(env.SERVICE_ENABLED==='false')fail(503,'服务已停止，不会自动升级收费');
   if(!['GET','HEAD'].includes(m)&&request.headers.get('origin')!==origin)fail(403,'请求来源无效');
   if(r[0]==='health')return json({database:!!await one('SELECT 1 ok'),databaseKind:'cloudflare-d1',storageKind:files.kind,mailConfigured:!!mailer,production:true,maxUploadBytes,freeOnly:true});
   const credential=request.headers.get('cookie')?.match(/(?:^|;\s*)pocket_session=([\w-]+)/)?.[1];
   const user=credential?await one('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.hash=? AND s.expires>?',hash(credential),now()):null;
   if(r[0]==='auth'&&r[1]==='me')return json({user:user||null,onlineReady:!!mailer});
   if(r[0]==='auth'&&r[1]==='logout'&&m==='POST'){if(credential)await run('DELETE FROM sessions WHERE hash=?',hash(credential));return json({ok:true},200,{'Set-Cookie':'pocket_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'});}
   if(r[0]==='auth'&&r[1]==='request'&&m==='POST'){
    if(!mailer)fail(503,'真实邮件服务尚未配置，无法登录；没有模拟验证码');
    const b=await read(request),email=String(b.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)fail(422,'邮箱格式无效');
    const ip=hash(request.headers.get('cf-connecting-ip')||'unknown'),bucket=Math.floor(now()/3600000),cid=id(),code=String(randomInt(100000,1000000));
    await atomic([p('INSERT INTO request_limits VALUES(?,?,1) ON CONFLICT(key,bucket) DO UPDATE SET count=count+1',ip,bucket),p('INSERT INTO challenges(id,email,hash,expires,created) VALUES(?,?,?,?,?)',cid,email,hash(cid+code),now()+600000,now())],[{sql:'SELECT COALESCE((SELECT count FROM request_limits WHERE key=? AND bucket=?),0)<20',args:[ip,bucket]},{sql:'SELECT COUNT(*)<5 AND COALESCE(SUM(CASE WHEN created>? THEN 1 ELSE 0 END),0)=0 FROM challenges WHERE email=? AND created>?',args:[now()-60000,email,now()-3600000]}],429,'验证码请求过于频繁');
    try{await mailer({email,code});}catch{await run('UPDATE challenges SET used=1 WHERE id=?',cid);fail(502,'邮件发送失败');}return json({challengeId:cid,expiresIn:600});
   }
   if(r[0]==='auth'&&r[1]==='verify'&&m==='POST'){
    const b=await read(request);if(typeof b.challengeId!=='string'||typeof b.code!=='string')fail(400,'参数无效');const c=await one('SELECT * FROM challenges WHERE id=?',b.challengeId);
    if(!c||c.used||c.expires<=now()||c.attempts>=5)fail(401,'验证码无效或已过期');
    if(!timingSafeEqual(Buffer.from(c.hash),Buffer.from(hash(b.challengeId+b.code)))){await run('UPDATE challenges SET attempts=attempts+1 WHERE id=? AND attempts<5',c.id);fail(401,'验证码错误');}
    const token=id();await atomic([p('UPDATE challenges SET used=1,attempts=attempts+1 WHERE id=?',c.id),p('INSERT OR IGNORE INTO users VALUES(?,?)',id(),c.email),p('INSERT INTO sessions SELECT ?,id,? FROM users WHERE email=?',hash(token),now()+2592000000,c.email)],[{sql:'SELECT COUNT(*)=1 FROM challenges WHERE id=? AND used=0 AND attempts<5 AND expires>?',args:[c.id,now()]}],401,'验证码无效或已使用');
    return json({user:await one('SELECT * FROM users WHERE email=?',c.email)},200,{'Set-Cookie':`pocket_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`});
   }
   if(r[0]==='read'&&m==='GET'){const x=await one('SELECT p.public_id,v.* FROM projects p JOIN versions v ON v.id=p.live_version WHERE p.public_id=? AND p.online=1',r[1]);if(!x)fail(404,'作品不存在或已下线');return json({publicId:x.public_id,versionId:x.id,version:x.number,document:JSON.parse(x.document)});}
   if(r[0]==='assets'&&r[2]==='file'&&m==='GET'){
    const a=await one('SELECT * FROM assets WHERE id=?',r[1]);if(!a)fail(404,'素材不存在');const publicRef=await one('SELECT 1 ok FROM asset_refs a JOIN projects p ON p.id=a.project_id WHERE a.asset_id=? AND length(a.version_id)>0 AND p.online=1',a.id);
    if(a.owner_id!==user?.id&&!publicRef)fail(404,'素材不存在');const bytes=await files.get(a.path);return new Response(bytes,{headers:{'Content-Type':a.mime,'Content-Length':String(bytes.length),'Cache-Control':'private, no-store'}});
   }
   if(!user)fail(401,'请先登录；正式内容保存在服务端');
   const own=async pid=>{const x=await one('SELECT * FROM projects WHERE id=? AND owner_id=? AND deleted=0',pid,user.id);if(!x)fail(404,'作品不存在');return x;};
   if(r[0]==='projects'){
    if(r.length===1&&m==='GET')return json((await all('SELECT * FROM projects WHERE owner_id=? AND deleted=0 ORDER BY updated DESC',user.id)).map(project));
    if(r.length===1&&m==='POST'){const b=await read(request),text=serialize(b.document),pid=id();await atomic([p('INSERT INTO projects(id,owner_id,title,document,public_id,updated) VALUES(?,?,?,?,?,?)',pid,user.id,b.document.title,text,id(),now()),p('INSERT INTO revisions VALUES(?,?,?)',pid,1,now()),...refs(b.document,pid)],[assetGuard(b.document,user),guards.budget(Buffer.byteLength(text))],422,'素材引用无效或免费文档容量不足');return json(project(await own(pid)),201);}
    const x=await own(r[1]);
    if(r.length===2&&m==='GET')return json(project(x));
    if(r.length===2&&m==='PUT'){const b=await read(request);if(!Number.isSafeInteger(b.revision)||b.revision<1)fail(422,'修订号无效');const text=serialize(b.document);await atomic([p('UPDATE projects SET title=?,document=?,revision=revision+1,updated=? WHERE id=?',b.document.title,text,now(),x.id),p('INSERT INTO revisions VALUES(?,?,?)',x.id,b.revision+1,now()),...refs(b.document,x.id)],[guards.revision(x.id,b.revision),assetGuard(b.document,user),guards.budget(Buffer.byteLength(text))]);return json(project(await own(x.id)));}
    if(r[2]==='copy'&&m==='POST'){const b=await read(request),doc=copyModules(JSON.parse(x.document),b.modules||[]),text=serialize(doc),pid=id();await atomic([p('INSERT INTO projects(id,owner_id,title,document,public_id,updated) VALUES(?,?,?,?,?,?)',pid,user.id,doc.title,text,id(),now()),p('INSERT INTO revisions VALUES(?,?,?)',pid,1,now()),...refs(doc,pid)],[assetGuard(doc,user),guards.budget(Buffer.byteLength(text))],507,'免费容量不足或素材引用无效');return json(project(await own(pid)),201);}
    if(r[2]==='state'&&m==='POST'){const b=await read(request);if(b.online===true&&!x.live_version)fail(422,'请先发布版本');const statements=[];if(typeof b.archived==='boolean')statements.push(p('UPDATE projects SET archived=? WHERE id=?',Number(b.archived),x.id));if(typeof b.online==='boolean')statements.push(p('UPDATE projects SET online=? WHERE id=?',Number(b.online),x.id));if(statements.length)await database.batch(statements);return json(project(await own(x.id)));}
    if(r.length===2&&m==='DELETE'){const b=await read(request);if(typeof b.takeOffline!=='boolean')fail(422,'请选择是否下线');await run('UPDATE projects SET deleted=1,online=? WHERE id=?',b.takeOffline?0:x.online,x.id);return json({ok:true});}
    if(r[2]==='versions'&&m==='GET')return json(await all('SELECT id,number,created FROM versions WHERE project_id=? ORDER BY number DESC',x.id));
    if(r[2]==='publish'&&m==='POST'){
     const b=await read(request);if(!['keep','offline'].includes(b.failurePolicy))fail(422,'请选择失败策略');try{
      if(b.revision!==x.revision)fail(409,'修订号已改变，请先保存');const doc=JSON.parse(x.document),errors=validate(doc);if(errors.length)fail(422,errors.join('；'));const ids=assets(doc);if(ids.length){const stored=await all('SELECT a.id,f.size,COALESCE(SUM(length(c.bytes)),0) actual FROM assets a JOIN media_files f ON f.id=a.path LEFT JOIN media_chunks c ON c.file_id=f.id WHERE a.owner_id=? AND a.id IN (SELECT value FROM json_each(?)) GROUP BY a.id,f.size',user.id,JSON.stringify(ids));if(stored.length!==ids.length||stored.some(a=>Number(a.actual)!==Number(a.size)))fail(422,'素材引用无效或文件不完整');}
      const vid=id();await atomic([p('INSERT INTO versions SELECT ?,?,COALESCE(MAX(number),0)+1,?,? FROM versions WHERE project_id=?',vid,x.id,x.document,now(),x.id),...refs(doc,x.id,vid),p('UPDATE projects SET live_version=?,online=1 WHERE id=?',vid,x.id)],[guards.revision(x.id,b.revision),assetGuard(doc,user),guards.budget(Buffer.byteLength(x.document))]);return json({...project(await own(x.id)),url:'/read/'+x.public_id},201);
     }catch(e){if(b.failurePolicy==='offline')await run('UPDATE projects SET online=0 WHERE id=?',x.id);throw e;}
    }
   }
   if(r[0]==='characters'){
    if(m==='GET')return json((await all('SELECT * FROM characters WHERE owner_id=? ORDER BY updated DESC',user.id)).map(x=>({...JSON.parse(x.document),id:x.id})));
    if(['POST','PUT'].includes(m)){const b=await read(request);if(!b.name?.trim())fail(422,'姓名必填');const cid=m==='POST'?id():r[1];if(m==='PUT'&&!await one('SELECT 1 ok FROM characters WHERE id=? AND owner_id=?',cid,user.id))fail(404,'人物不存在');const text=JSON.stringify({...b,id:cid});await atomic([p('INSERT INTO characters VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document,updated=excluded.updated',cid,user.id,text,now())],[guards.budget(Buffer.byteLength(text))],507,'免费文档容量不足');return json({...b,id:cid});}
    if(m==='DELETE'){await run('DELETE FROM characters WHERE id=? AND owner_id=?',r[1],user.id);return json({ok:true});}
   }
   if(r[0]==='assets'){
    if(r.length===1&&m==='GET')return json((await all('SELECT id,name,mime,size,original_size FROM assets WHERE owner_id=? AND hidden=0 ORDER BY created DESC',user.id)).map(a=>({...a,url:'/api/assets/'+a.id+'/file'})));
    if(r.length===1&&m==='POST'){
     const bytes=await bytesOf(request,maxUploadBytes);const mime=request.headers.get('content-type')||'',ascii=(a,b)=>bytes.toString('ascii',a,b);
     const valid=mime==='image/png'&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||mime==='image/jpeg'&&bytes[0]===255&&bytes[1]===216||mime==='image/webp'&&ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP'||mime==='image/gif'&&ascii(0,3)==='GIF'||mime==='audio/mpeg'&&(ascii(0,3)==='ID3'||bytes[0]===255)||['audio/wav','audio/x-wav'].includes(mime)&&ascii(0,4)==='RIFF'||['audio/ogg','audio/opus'].includes(mime)&&ascii(0,4)==='OggS'||['audio/mp4','audio/x-m4a'].includes(mime)&&ascii(4,8)==='ftyp';if(!valid||!bytes.length)fail(422,'文件类型或文件头不匹配');
     const aid=id(),name=decodeURIComponent(request.headers.get('x-file-name')||'素材').slice(0,200),storagePath=await files.put(aid,bytes,mime);await run('INSERT INTO assets VALUES(?,?,?,?,?,?,?,?,?)',aid,user.id,name,mime,bytes.length,Math.max(bytes.length,Number(request.headers.get('x-original-size'))||bytes.length),storagePath,0,now());return json({id:aid,name,mime,size:bytes.length,url:'/api/assets/'+aid+'/file'},201);
    }
    const a=await one('SELECT * FROM assets WHERE id=? AND owner_id=?',r[1],user.id);if(!a)fail(404,'素材不存在');if(r[2]==='references'&&m==='GET')return json(await all('SELECT project_id,version_id FROM asset_refs WHERE asset_id=?',a.id));if(m==='DELETE'){await run('UPDATE assets SET hidden=1 WHERE id=?',a.id);return json({hidden:true,retained:true});}
   }
   fail(404,'接口不存在');
  }catch(e){return json({error:e.status?e.message:'在线操作失败，可能已达到免费额度；不会自动升级收费'},e.status||503);}
 };
}
