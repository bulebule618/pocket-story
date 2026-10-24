import {createAPI,configuredMailer} from './api.mjs';
import {libsqlDatabase} from './database.mjs';
import {blobFiles} from './files.mjs';
import {applyCors,allowedPageOrigins} from './cors.mjs';
export const requiredCloudKeys=['APP_ORIGIN','TURSO_DATABASE_URL','TURSO_AUTH_TOKEN','BLOB_READ_WRITE_TOKEN'];
export function missingCloudKeys(env){return requiredCloudKeys.filter(k=>!env[k]);}
export async function createCloudRuntime(env=process.env,{client,blobSDK,mailer}={}){
 const missing=missingCloudKeys(env);if(missing.length)throw Object.assign(Error('线上服务未配置：'+missing.join('、')),{status:503});
 const origin=new URL(env.APP_ORIGIN);if(origin.protocol!=='https:')throw Object.assign(Error('线上 APP_ORIGIN 必须使用 HTTPS'),{status:503});
 if(!/^(libsql|https):\/\//.test(env.TURSO_DATABASE_URL))throw Object.assign(Error('线上数据库必须使用云端 HTTPS/libsql 地址'),{status:503});
 if(!client){const {createClient}=await import('@libsql/client/http');client=createClient({url:env.TURSO_DATABASE_URL,authToken:env.TURSO_AUTH_TOKEN});}
 const db=libsqlDatabase(client);const schema=await db.one('SELECT version FROM schema_migrations WHERE version=3');
 if(!schema)throw Object.assign(Error('线上数据库迁移尚未完成'),{status:503});
 blobSDK??=await import('@vercel/blob');
 const files=blobFiles({token:env.BLOB_READ_WRITE_TOKEN,put:blobSDK.put,get:blobSDK.get});
 return {handler:createAPI({db,origin:origin.origin,mailer:mailer??configuredMailer(env),production:true,files,maxUploadBytes:4*1024*1024,maxRequestBytes:4*1024*1024,allowedOrigins:allowedPageOrigins(env.PAGES_ORIGIN)}),db,close:()=>db.close()};
}
export function createCloudHandler({env=process.env,runtimeFactory=createCloudRuntime}={}){
 let runtimePromise;
 return async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
  try{
   if(applyCors(req,res,{origin:env.APP_ORIGIN,allowedOrigins:allowedPageOrigins(env.PAGES_ORIGIN)}))return;
   const url=new URL(req.url,'https://runtime.invalid');
   // Use the route captured by vercel.json. Application links always use the stable production origin.
   const route=url.searchParams.get('route');if(route!==null)url.pathname='/api/'+route.replace(/^\/+|\/+$/g,'');
   if(!url.pathname.startsWith('/api/')){res.writeHead(404);res.end();return;}
   const missing=missingCloudKeys(env);
   if(missing.length){const bootstrap=url.pathname==='/api/auth/me'&&req.method==='GET';res.writeHead(bootstrap?200:503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(bootstrap?{user:null,onlineReady:false}:{error:'线上服务尚未配置，在线保存与发布暂不可用',missing}));return;}
   runtimePromise??=runtimeFactory(env).catch(e=>{runtimePromise=null;throw e;});
   // Vercel supplies this header at its trusted edge; arbitrary client forwarding headers are ignored.
   req.pocketClientAddress=env.VERCEL==='1'?String(req.headers['x-vercel-forwarded-for']||'unknown').split(',')[0].trim():req.socket?.remoteAddress;
   const runtime=await runtimePromise;await runtime.handler(req,res,url);
  }catch(e){res.writeHead(e.status||503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({error:e.status?e.message:'线上服务初始化失败，请检查数据库与存储配置'}));}
 };
}
