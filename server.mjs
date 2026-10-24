import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {openStore} from './server/store.mjs';
import {createAPI,configuredMailer} from './server/api.mjs';
const base=path.dirname(fileURLToPath(import.meta.url)),root=path.join(base,'dist');
export function createServer({directory=process.env.DATA_DIR||path.join(base,'work','data'),origin=process.env.APP_ORIGIN||'http://127.0.0.1:4173',mailer=configuredMailer(),production=process.env.NODE_ENV==='production',now}={}){
 const db=openStore(directory),api=createAPI({db,directory,origin,mailer,production,now});
 const server=http.createServer(async(req,res)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'");try{const url=new URL(req.url,origin);if(await api(req,res,url))return;const p=decodeURIComponent(url.pathname),file=p==='/'||/^\/(studio|login|read)(\/|$)/.test(p)?'/index.html':p,target=path.resolve(root,'.'+file);if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}const bytes=await readFile(target);res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'})[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);}catch{res.writeHead(404);res.end('Not found');}});server.on('close',()=>db.close());return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT)||4173;createServer().listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));}
