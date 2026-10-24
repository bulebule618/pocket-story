export function allowedPageOrigins(value=''){
 return value?value.split(',').map(s=>{const origin=s.trim(),url=new URL(origin);if(url.protocol!=='https:'||url.origin!==origin||url.username||url.password)throw Error('PAGES_ORIGIN 必须填写精确 HTTPS 源，不能使用通配符或路径');return origin;}):[];
}
export function applyCors(req,res,{origin,allowedOrigins=[]}){
 const source=req.headers.origin,trusted=typeof source==='string'&&(source===origin||allowedOrigins.includes(source));
 if(source&&!trusted)throw Object.assign(Error('请求来源无效'),{status:403});
 if(trusted){res.setHeader('Access-Control-Allow-Origin',source);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, DELETE, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type, X-File-Name, X-Original-Size');res.setHeader('Access-Control-Max-Age','600');}
 if(req.method==='OPTIONS'){if(!trusted)throw Object.assign(Error('请求来源无效'),{status:403});res.writeHead(204);res.end();return true;}return false;
}
