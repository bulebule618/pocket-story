import {randomBytes, randomInt, createHash, timingSafeEqual} from 'node:crypto';
import {asDatabase} from './database.mjs';
import {localFiles} from './files.mjs';
import {applyCors} from './cors.mjs';
import {validate, collections, copyModules} from '../dist/domain.js';
const hash = x => createHash('sha256').update(x).digest('hex'), id = () => randomBytes(18).toString('base64url');
const fail = (status, message) => {
  throw Object.assign(Error(message), {
    status
  });
};
export function createAPI({db, directory, origin, mailer, production = false, now = () => Date.now(), files = localFiles(directory), maxUploadBytes = 20 * 1024 * 1024, maxRequestBytes = 8 * 1024 * 1024, allowedOrigins=[]}) {
  const database = asDatabase(db), one = (sql, ...a) => database.one(sql, ...a), all = (sql, ...a) => database.all(sql, ...a), run = (sql, ...a) => database.run(sql, ...a);
  const tx = fn => database.transaction(fn);
  const json = (res, status, value, headers = {}) => {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers
    });
    res.end(JSON.stringify(value));
  };
  const body = async (req, limit = maxRequestBytes) => {
    if(req.body!==undefined){const bytes=Buffer.isBuffer(req.body)?req.body:Buffer.from(typeof req.body==='string'?req.body:JSON.stringify(req.body));if(bytes.length>limit)fail(413,'请求过大');return bytes;}
    const chunks = [];
    let n = 0;
    for await (const b of req) {
      n += b.length;
      if (n > limit) fail(413, '请求过大');
      chunks.push(b);
    }
    return Buffer.concat(chunks);
  };
  const parse = async req => {
    try {
      return JSON.parse((await body(req)).toString());
    } catch (e) {
      if (e.status) throw e;
      fail(400, 'JSON 格式错误');
    }
  };
  const basic = s => {
    if (!s || s.schemaVersion !== 3 || typeof s.title !== 'string' || !s.title.trim() || s.title.length > 200 || !s.phone || collections.some(k => !Array.isArray(s[k]))) fail(422, '作品结构无效');
  };
  const own = async (u, pid) => {
    const p = await one('SELECT * FROM projects WHERE id=? AND owner_id=? AND deleted=0', pid, u.id);
    if (!p) fail(404, '作品不存在');
    return p;
  };
  const project = p => ({
    id: p.id,
    title: p.title,
    document: JSON.parse(p.document),
    revision: p.revision,
    archived: !!p.archived,
    publicId: p.public_id,
    online: !!p.online,
    liveVersion: p.live_version,
    updated: p.updated
  });
  const assetIds = s => [...new Set([...JSON.stringify(s).matchAll(/\/api\/assets\/([\w-]+)\/file/g)].map(x => x[1]))];
  const checkAssets = async (s, u) => {
    if (JSON.stringify(s).includes('/local-assets/') || JSON.stringify(s).includes('blob:')) fail(422, '在线作品不能引用本机临时素材');
    for (const aid of assetIds(s)) if (!await one('SELECT id FROM assets WHERE id=? AND owner_id=?', aid, u.id)) fail(422, '素材引用无效');
  };
  const refs = async (s, pid, vid = '') => {
    await run('DELETE FROM asset_refs WHERE project_id=? AND version_id=?', pid, vid);
    for (const aid of assetIds(s)) await run('INSERT INTO asset_refs VALUES(?,?,?)', aid, pid, vid);
  };
  const handler = async (req, res, url) => {
    if (!url.pathname.startsWith('/api/')) return false;
    try {
      if(applyCors(req,res,{origin,allowedOrigins}))return true;
      if (!['GET', 'HEAD'].includes(req.method) && req.headers.origin !== origin&&!allowedOrigins.includes(req.headers.origin)) fail(403, '请求来源无效');
      const crossOrigin=!!req.headers.origin&&req.headers.origin!==origin&&allowedOrigins.includes(req.headers.origin);
      const r = url.pathname.split('/').filter(Boolean).slice(1), m = req.method;
      const cookie = String(req.headers.cookie || '').match(/(?:^|;\s*)pocket_session=([\w-]+)/)?.[1];
      const bearer=String(req.headers.authorization||'').match(/^Bearer ([\w-]+)$/)?.[1],sessionCredential=bearer||cookie;
      const u = sessionCredential ? await one('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.hash=? AND s.expires>?', hash(sessionCredential), now()) : null;
      if (r[0] === 'health') {
        await one('SELECT 1 AS ok');
        json(res, 200, {
          database: true,
          mailConfigured: !!mailer,
          production,
          databaseKind: database.kind,
          storageKind: files.kind,
          maxUploadBytes
        });
        return true;
      }
      if (r[0] === 'auth' && r[1] === 'request' && m === 'POST') {
        if (!mailer) fail(503, '邮件服务未配置，无法发送验证码');
        const b = await parse(req), email = String(b.email || '').trim().toLowerCase();
        if (!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).test(email) || email.length > 254) fail(422, '邮箱格式无效');
        const ip = hash(req.pocketClientAddress || req.socket?.remoteAddress || 'unknown'), bucket = Math.floor(now() / 3600000);
        await run('INSERT INTO request_limits(key,bucket,count) VALUES(?,?,1) ON CONFLICT(key,bucket) DO UPDATE SET count=count+1', ip, bucket);
        if ((await one('SELECT count FROM request_limits WHERE key=? AND bucket=?', ip, bucket)).count > 20) fail(429, '请求过于频繁');
        const cid = id(), code = String(randomInt(100000, 1000000));
        await tx(async()=>{if ((await one('SELECT count(*) n FROM challenges WHERE email=? AND created>?', email, now() - 3600000)).n >= 5 || await one('SELECT id FROM challenges WHERE email=? AND created>?', email, now() - 60000)) fail(429, '验证码请求过于频繁');await run('INSERT INTO challenges(id,email,hash,expires,created) VALUES(?,?,?,?,?)', cid, email, hash(cid + code), now() + 600000, now());});
        try {
          await mailer({
            email,
            code
          });
        } catch {
          await run('UPDATE challenges SET used=1 WHERE id=?', cid);
          fail(502, '邮件发送失败');
        }
        json(res, 200, {
          challengeId: cid,
          expiresIn: 600
        });
        return true;
      }
      if (r[0] === 'auth' && r[1] === 'verify' && m === 'POST') {
        const {challengeId, code} = await parse(req);
        if (typeof challengeId !== 'string' || typeof code !== 'string') fail(400, '参数无效');
        const token = id(), result = await tx(async () => {
          const c=await one('SELECT * FROM challenges WHERE id=?',challengeId);
          if(!c||c.used||c.expires<=now()||c.attempts>=5)return {error:'验证码无效或已过期'};
          await run('UPDATE challenges SET attempts=attempts+1 WHERE id=?',challengeId);
          if(!timingSafeEqual(Buffer.from(c.hash),Buffer.from(hash(challengeId+code))))return {error:'验证码错误'};
          await run('UPDATE challenges SET used=1 WHERE id=?', challengeId);
          await run('INSERT OR IGNORE INTO users VALUES(?,?)', id(), c.email);
          const user = await one('SELECT * FROM users WHERE email=?', c.email);
          await run('INSERT INTO sessions VALUES(?,?,?)', hash(token), user.id, now() + (crossOrigin?8*3600000:2592000000));
          return {user};
        });
        if(result.error)fail(401,result.error);const user=result.user;
        json(res, 200, {
          user,...(crossOrigin?{sessionToken:token}:{})
        }, {
          'Set-Cookie': `pocket_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${production ? '; Secure' : ''}`
        });
        return true;
      }
      if (r[0] === 'auth' && r[1] === 'me') {
        json(res, 200, {
          user: u || null
        });
        return true;
      }
      if (r[0] === 'auth' && r[1] === 'logout' && m === 'POST') {
        if (sessionCredential) await run('DELETE FROM sessions WHERE hash=?', hash(sessionCredential));
        json(res, 200, {
          ok: true
        }, {
          'Set-Cookie': 'pocket_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
        });
        return true;
      }
      if (r[0] === 'read' && m === 'GET') {
        const p = await one('SELECT * FROM projects WHERE public_id=? AND online=1', r[1]);
        if (!p?.live_version) fail(404, '作品已下线或不存在');
        const v = await one('SELECT * FROM versions WHERE id=?', p.live_version);
        json(res, 200, {
          publicId: p.public_id,
          versionId: v.id,
          version: v.number,
          document: JSON.parse(v.document)
        });
        return true;
      }
      if (r[0] === 'assets' && r[2] === 'file' && m === 'GET') {
        const a = await one('SELECT * FROM assets WHERE id=?', r[1]);
        if (!a) fail(404, '素材不存在');
        const publicRef = await one('SELECT r.asset_id FROM asset_refs r JOIN projects p ON p.id=r.project_id WHERE r.asset_id=? AND length(r.version_id)>0 AND p.online=1', a.id);
        const access=url.searchParams.get('access');
        const grant=access&&access.length<=128?await one('SELECT hash FROM media_access WHERE hash=? AND asset_id=? AND expires>?',hash(access),a.id,now()):null;
        if (a.owner_id !== u?.id && !publicRef&&!grant) fail(404, '素材不存在');
        const bytes = await files.get(a.path);
        res.writeHead(200, {
          'Content-Type': a.mime,
          'Content-Length': bytes.length,
          'Cache-Control': 'private,max-age=3600'
        });
        res.end(bytes);
        return true;
      }
      if (!u) fail(401, '请先邮箱验证码登录');
      if(r[0]==='assets'&&r[1]==='access'&&r.length===2&&m==='POST'){
        const b=await parse(req);if(!Array.isArray(b.ids)||b.ids.length>100||b.ids.some(id=>typeof id!=='string'||!/^[-\w]{1,80}$/.test(id)))fail(422,'素材列表无效');
        const links=[];await tx(async()=>{await run('DELETE FROM media_access WHERE expires<=?',now());for(const assetId of new Set(b.ids)){if(!await one('SELECT id FROM assets WHERE id=? AND owner_id=?',assetId,u.id))fail(404,'素材不存在');const access=id(),expires=now()+3600000;await run('INSERT INTO media_access VALUES(?,?,?)',hash(access),assetId,expires);links.push({path:'/api/assets/'+assetId+'/file',url:origin+'/api/assets/'+assetId+'/file?access='+access,expires});}});json(res,200,{links});return true;
      }
      if (r[0] === 'projects') {
        if (r.length === 1 && m === 'GET') {
          json(res, 200, (await all('SELECT * FROM projects WHERE owner_id=? AND deleted=0 ORDER BY updated DESC', u.id)).map(project));
          return true;
        }
        if (r.length === 1 && m === 'POST') {
          const b = await parse(req);
          basic(b.document);
          await checkAssets(b.document, u);
          const pid = id();
          await tx(async () => {
            await run('INSERT INTO projects(id,owner_id,title,document,public_id,updated) VALUES(?,?,?,?,?,?)', pid, u.id, b.document.title, JSON.stringify(b.document), id(), now());
            await run('INSERT INTO revisions VALUES(?,?,?)', pid, 1, now());
            await refs(b.document, pid);
          });
          json(res, 201, project(await own(u, pid)));
          return true;
        }
        const p = await own(u, r[1]);
        if (r.length === 2 && m === 'GET') {
          json(res, 200, project(p));
          return true;
        }
        if (r.length === 2 && m === 'PUT') {
          const b = await parse(req);
          if(!Number.isSafeInteger(b.revision)||b.revision<1)fail(422,'草稿修订号无效');
          basic(b.document);
          await checkAssets(b.document, u);
          await tx(async () => {
            if ((await run('UPDATE projects SET document=?,title=?,revision=revision+1,updated=? WHERE id=? AND owner_id=? AND revision=?', JSON.stringify(b.document), b.document.title, now(), p.id, u.id, b.revision)).changes !== 1) fail(409, '另一标签页已更新，当前修改未保存。请保留本页并核对。');
            await run('INSERT INTO revisions VALUES(?,?,?)', p.id, b.revision + 1, now());
            await refs(b.document, p.id);
          });
          json(res, 200, project(await own(u, p.id)));
          return true;
        }
        if (r[2] === 'copy' && m === 'POST') {
          const b = await parse(req), doc = copyModules(JSON.parse(p.document), b.modules || []), pid = id();
          await tx(async () => {
            await run('INSERT INTO projects(id,owner_id,title,document,public_id,updated) VALUES(?,?,?,?,?,?)', pid, u.id, doc.title, JSON.stringify(doc), id(), now());
            await run('INSERT INTO revisions VALUES(?,?,?)', pid, 1, now());
            await refs(doc, pid);
          });
          json(res, 201, project(await own(u, pid)));
          return true;
        }
        if (r[2] === 'state' && m === 'POST') {
          const b = await parse(req);
          if (b.online === true && !p.live_version) fail(422, '请先发布版本');
          await tx(async () => {
            if (typeof b.archived === 'boolean') await run('UPDATE projects SET archived=? WHERE id=?', Number(b.archived), p.id);
            if (typeof b.online === 'boolean') await run('UPDATE projects SET online=? WHERE id=?', Number(b.online), p.id);
          });
          json(res, 200, project(await own(u, p.id)));
          return true;
        }
        if (r.length === 2 && m === 'DELETE') {
          const b = await parse(req);
          if (typeof b.takeOffline !== 'boolean') fail(422, '请选择是否同时下线');
          await run('UPDATE projects SET deleted=1,online=? WHERE id=?', b.takeOffline ? 0 : p.online, p.id);
          json(res, 200, {
            ok: true
          });
          return true;
        }
        if (r[2] === 'versions' && m === 'GET') {
          json(res, 200, await all('SELECT id,number,created FROM versions WHERE project_id=? ORDER BY number DESC', p.id));
          return true;
        }
        if (r[2] === 'publish' && m === 'POST') {
          const b = await parse(req);
          if (!['keep', 'offline'].includes(b.failurePolicy)) fail(422, '请选择更新失败策略');
          try {
            await tx(async () => {
              const current = await own(u, p.id);
              if (b.revision !== current.revision) fail(409, '修订号已改变，请先保存');
              const doc = JSON.parse(current.document), errors = validate(doc);
              if (errors.length) fail(422, errors.join('；'));
              await checkAssets(doc, u);
              const vid = id(), n = (await one('SELECT COALESCE(MAX(number),0)+1 n FROM versions WHERE project_id=?', p.id)).n;
              await run('INSERT INTO versions VALUES(?,?,?,?,?)', vid, p.id, n, current.document, now());
              await refs(doc, p.id, vid);
              await run('UPDATE projects SET live_version=?,online=1 WHERE id=?', vid, p.id);
            });
            json(res, 201, {
              ...project(await own(u, p.id)),
              url: `/read/${p.public_id}`
            });
          } catch (e) {
            if (b.failurePolicy === 'offline') await run('UPDATE projects SET online=0 WHERE id=?', p.id);
            throw e;
          }
          return true;
        }
      }
      if (r[0] === 'characters') {
        if (m === 'GET') {
          json(res, 200, (await all('SELECT * FROM characters WHERE owner_id=? ORDER BY updated DESC', u.id)).map(x => ({
            ...JSON.parse(x.document),
            id: x.id
          })));
          return true;
        }
        if (['POST', 'PUT'].includes(m)) {
          const b = await parse(req);
          if (!b.name?.trim()) fail(422, '姓名必填');
          const cid = m === 'POST' ? id() : r[1];
          if (m === 'PUT' && !await one('SELECT id FROM characters WHERE id=? AND owner_id=?', cid, u.id)) fail(404, '人物不存在');
          await run('INSERT INTO characters VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document,updated=excluded.updated', cid, u.id, JSON.stringify({
            ...b,
            id: cid
          }), now());
          json(res, 200, {
            ...b,
            id: cid
          });
          return true;
        }
        if (m === 'DELETE') {
          await run('DELETE FROM characters WHERE id=? AND owner_id=?', r[1], u.id);
          json(res, 200, {
            ok: true
          });
          return true;
        }
      }
      if (r[0] === 'assets') {
        if (r.length === 1 && m === 'GET') {
          json(res, 200, (await all('SELECT id,name,mime,size,original_size FROM assets WHERE owner_id=? AND hidden=0 ORDER BY created DESC', u.id)).map(a => ({
            ...a,
            url: `/api/assets/${a.id}/file`
          })));
          return true;
        }
        if (r.length === 1 && m === 'POST') {
          const bytes = await body(req, maxUploadBytes), mime = String(req.headers['content-type'] || ''), name = decodeURIComponent(String(req.headers['x-file-name'] || '素材')).slice(0, 200), ascii = (a, b) => bytes.toString('ascii', a, b);
          const valid = mime === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || mime === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216 || mime === 'image/webp' && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP' || mime === 'image/gif' && ascii(0, 3) === 'GIF' || mime === 'audio/mpeg' && (ascii(0, 3) === 'ID3' || bytes[0] === 255) || ['audio/wav', 'audio/x-wav'].includes(mime) && ascii(0, 4) === 'RIFF' || ['audio/ogg', 'audio/opus'].includes(mime) && ascii(0, 4) === 'OggS' || ['audio/mp4', 'audio/x-m4a'].includes(mime) && ascii(4, 8) === 'ftyp';
          if (!valid || !bytes.length) fail(422, '文件类型或文件头不匹配');
          const aid = id();
          const storagePath = await files.put(aid, bytes, mime);
          await run('INSERT INTO assets VALUES(?,?,?,?,?,?,?,?,?)', aid, u.id, name, mime, bytes.length, Math.max(bytes.length, Number(req.headers['x-original-size']) || bytes.length), storagePath, 0, now());
          json(res, 201, {
            id: aid,
            name,
            mime,
            size: bytes.length,
            url: `/api/assets/${aid}/file`
          });
          return true;
        }
        const a = await one('SELECT * FROM assets WHERE id=? AND owner_id=?', r[1], u.id);
        if (!a) fail(404, '素材不存在');
        if (r[2] === 'references' && m === 'GET') {
          json(res, 200, await all('SELECT project_id,version_id FROM asset_refs WHERE asset_id=?', a.id));
          return true;
        }
        if (m === 'DELETE') {
          await run('UPDATE assets SET hidden=1 WHERE id=?', a.id);
          json(res, 200, {
            hidden: true,
            retained: true
          });
          return true;
        }
      }
      fail(404, '接口不存在');
    } catch (e) {
      json(res, e.status || 500, {
        error: e.status ? e.message : '服务端处理失败'
      });
    }
    return true;
  };
  return (req, res, url) => database.withRequest(() => handler(req, res, url));
}
export function configuredMailer(env = process.env) {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) return null;
  return async ({email, code}) => {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [email],
        subject: '剧情手机平台 · 登录验证码',
        text: `验证码 ${code}，10 分钟内有效。若非本人操作，请忽略。`
      })
    });
    if (!r.ok) throw Error('发送失败');
  };
}
