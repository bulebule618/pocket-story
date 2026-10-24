import {runtimeConfig} from './runtime-config.js';
import {apiHref,setMediaLinks,mediaLinkFresh,clearMediaLinks} from './location.js';
let sessionToken='',refreshDocument=null;
const tokenKey=()=> 'pocket-author-session:'+runtimeConfig.apiBase;
const storage=()=>typeof window!=='undefined'?window.sessionStorage:null;
function token(){if(!sessionToken){try{sessionToken=storage()?.getItem(tokenKey())||'';}catch{}}return sessionToken;}
function clearSession(){sessionToken='';try{storage()?.removeItem(tokenKey());}catch{}clearMediaLinks();refreshDocument=null;}
function pages(){return runtimeConfig.hosting==='github-pages';}
export async function prepareAuthorMedia(document){
 if(!pages()||!token())return;
 refreshDocument=document;
 const ids=[...new Set([...JSON.stringify(document).matchAll(/\/api\/assets\/([\w-]+)\/file/g)].map(m=>m[1]))].filter(id=>!mediaLinkFresh('/api/assets/'+id+'/file'));
 for(let i=0;i<ids.length;i+=100){const out=await api('assets/access',{method:'POST',body:{ids:ids.slice(i,i+100)}});setMediaLinks(out.links);}
}
export async function api(path,{method='GET',body,headers={}}={}){
 if(pages()&&!runtimeConfig.apiBase){if(path==='auth/me'&&method==='GET')return {user:null,onlineReady:false};throw Object.assign(Error('线上后端尚未连接，正式登录、在线保存与发布暂不可用'),{status:503});}
 if(body instanceof Blob){const health=await api('health');if(health.maxUploadBytes&&body.size>health.maxUploadBytes)throw Error('当前托管支持单个文件最大 '+health.maxUploadBytes/1024/1024+' MB，请压缩图片或缩短音频后重试');}
 const bearer=pages()?token():'';
 const r=await fetch(apiHref(path),{method,credentials:pages()?'omit':'same-origin',headers:{...(body&&!(body instanceof Blob)?{'Content-Type':'application/json'}:{}),...(bearer?{Authorization:'Bearer '+bearer}:{}),...headers},body:body instanceof Blob?body:body?JSON.stringify(body):undefined});
 let data;try{data=await r.json();}catch{throw Error('服务响应无效');}
 if(!r.ok){if(r.status===401&&pages())clearSession();throw Object.assign(Error(data.error||'请求失败'),{status:r.status});}
 if(path==='auth/verify'&&pages()&&data.sessionToken){sessionToken=data.sessionToken;try{storage()?.setItem(tokenKey(),sessionToken);}catch{}delete data.sessionToken;}
 if(path==='auth/logout'||path==='auth/me'&&data.user===null)clearSession();
 if(data.document&&!path.startsWith('read/'))await prepareAuthorMedia(data.document);
 if(path==='assets'&&Array.isArray(data))await prepareAuthorMedia(data);
 return data;
}
// Refresh scoped preview grants while the author is actively using this tab.
if(typeof window!=='undefined'){
 window.addEventListener('focus',()=>{if(refreshDocument)prepareAuthorMedia(refreshDocument).catch(()=>{});});
 window.addEventListener('pointerdown',()=>{if(refreshDocument)prepareAuthorMedia(refreshDocument).catch(()=>{});},{passive:true});
}
export function localRead(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
export const trialKey='pocket-v3-trials';
export async function prepareImage(file,compress){if(!compress||!file.type.startsWith('image/'))return file;const bitmap=await createImageBitmap(file),ratio=Math.min(1,1920/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.84));return blob&&blob.size<file.size?blob:file;}
