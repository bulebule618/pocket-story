import {runtimeConfig} from './runtime-config.js';
export function sitePath(path){return runtimeConfig.siteBase.replace(/\/$/,'')+'/'+path.replace(/^\//,'');}
export function routeHref(path){return runtimeConfig.routing==='hash'?sitePath('')+'#'+path:path;}
export function routePath(){return runtimeConfig.routing==='hash'?(location.hash.startsWith('#/')?location.hash.slice(1):'/studio'):location.pathname;}
export function apiHref(path){return runtimeConfig.apiBase.replace(/\/$/,'')+'/api/'+path.replace(/^\//,'');}
const links=new Map();
export function setMediaLinks(items){for(const item of items)links.set(item.path,{url:item.url,expires:item.expires});}
export function resolveHostedMedia(src){
 if(src.startsWith('/api/assets/')){const link=links.get(src);return link&&link.expires>Date.now()?link.url:apiHref(src.slice(5));}
 if(src.startsWith('/assets/'))return sitePath(src.slice(1));
 return src;
}
export function mediaLinkFresh(path){return (links.get(path)?.expires||0)>Date.now()+120000;}
export function clearMediaLinks(){links.clear();}
