import{readdir,readFile,writeFile,mkdir,rm,copyFile}from'node:fs/promises';
import path from'node:path';
import{fileURLToPath}from'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function buildPages({basePath,apiBase,allowUnconfigured=false,output=path.join(root,'work/pages-site')}={}){
 const base=basePath||'/pocket-story/';
 if(!/^\/(?:[A-Za-z0-9_.-]+\/)*$/.test(base)||base.split('/').includes('..'))throw Error('Pages 基础路径无效');
 if(!apiBase&&!allowUnconfigured)throw Error('尚未配置 PAGES_API_BASE，停止发布：不能把未接通在线服务的页面冒充完整平台');
 let api='';if(apiBase){const url=new URL(apiBase);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('PAGES_API_BASE 必须是无密钥、无路径的 HTTPS 后端源');api=url.origin;}
 const out=path.resolve(output),workRoot=path.join(root,'work')+path.sep;
 if(!out.startsWith(workRoot)||!path.basename(out).startsWith('pages-'))throw Error('构建输出必须在本项目 work/pages-* 内');
 // Only replace our own validated generated output, never the project source or runtime data.
 await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
 const copy=async(source,target)=>{for(const entry of await readdir(source,{withFileTypes:true})){const from=path.join(source,entry.name),to=path.join(target,entry.name);if(entry.isSymbolicLink())throw Error('发布目录不允许符号链接');if(entry.isDirectory()){await mkdir(to,{recursive:true});await copy(from,to);}else{if(!/\.(html|js|css|svg|png|jpe?g|webp|gif|mp3|ogg|wav|m4a)$/i.test(entry.name)||entry.name.startsWith('.'))throw Error('禁止发布非网页文件：'+entry.name);await copyFile(from,to);}}};
 await copy(path.join(root,'dist'),out);
 await writeFile(path.join(out,'runtime-config.js'),'// Public deployment settings; no credentials.\nexport const runtimeConfig='+JSON.stringify({siteBase:base,apiBase:api,routing:'hash',hosting:'github-pages'})+';\n');
 let html=await readFile(path.join(out,'index.html'),'utf8');
 html=html.replace('href="/styles.css"','href="'+base+'styles.css"').replace('src="/app.js"','src="'+base+'app.js"');
 const csp=`default-src 'self'; img-src 'self' blob: data: ${api}; media-src 'self' blob: ${api}; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' ${api}; object-src 'none'; base-uri 'self'`;
 html=html.replace('<meta charset="UTF-8">','<meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="'+csp.trim()+'"><meta name="referrer" content="same-origin">');
 await writeFile(path.join(out,'index.html'),html);await writeFile(path.join(out,'404.html'),html);await writeFile(path.join(out,'.nojekyll'),'');
 return {directory:out,basePath:base,apiBase:api};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const repo=(process.env.GITHUB_REPOSITORY||'').split('/').at(-1),basePath=process.env.PAGES_BASE_PATH||(repo?(repo.endsWith('.github.io')?'/':'/'+repo+'/'):'/pocket-story/');
 console.log(JSON.stringify(await buildPages({basePath,apiBase:process.env.PAGES_API_BASE,allowUnconfigured:process.env.ALLOW_UNCONFIGURED_PAGES==='1'})));
}
