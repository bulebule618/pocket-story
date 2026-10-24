import {createD1API} from './api.mjs';
const headers={
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin',
 'Content-Security-Policy':"default-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
};
export default {async fetch(request,env){
 try{
  let response;
  if(env.SERVICE_ENABLED==='false')response=new Response('服务已停止，不会自动升级收费',{status:503});
  else if(new URL(request.url).pathname.startsWith('/api/'))response=await createD1API(env)(request);
  else response=await env.ASSETS.fetch(request);
  const out=new Response(response.body,response);for(const [key,value]of Object.entries(headers))out.headers.set(key,value);return out;
 }catch{return Response.json({error:'服务暂不可用，不会自动切换收费方案'},{status:503,headers});}
}};
