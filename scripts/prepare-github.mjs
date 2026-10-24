import {mkdir,readdir,readFile,writeFile,copyFile,lstat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Source publication only. Never copy authors' drafts, uploads, credentials or trial data.
const entries=['.github','api','cloudflare/api.mjs','cloudflare/worker.mjs','cloudflare/wrangler.json','cloudflare/migrations','dist','docs','migrations','scripts','server','tests','.dockerignore','.env.example','.env.vercel.example','.gitignore','.vercelignore','Dockerfile','package.json','pnpm-lock.yaml','README.md','server.mjs','start.ps1','vercel.json'];
export async function prepareGitHub(){
 const output=path.join(root,'work','github-source-'+Date.now());await mkdir(output,{recursive:true});const manifest=[];
 async function copy(relative){
  const source=path.join(root,relative),target=path.join(output,relative),info=await lstat(source);
  if(info.isSymbolicLink())throw Error('拒绝发布符号链接：'+relative);
  if(info.isDirectory()){await mkdir(target,{recursive:true});for(const entry of await readdir(source,{withFileTypes:true})){if(entry.isSymbolicLink())throw Error('拒绝发布符号链接：'+relative);await copy(path.join(relative,entry.name));}return;}
  if(/(^|[/\\])(work|node_modules|\.git|\.openai)([/\\]|$)|\.sqlite|\.env.*\.local$/i.test(relative))throw Error('拒绝发布私有文件：'+relative);
  const bytes=await readFile(source);
  if(/\.(?:js|mjs|json|md|yml|yaml|example|ps1)$/.test(relative)&&/(?:github_pat_[A-Za-z0-9_]{30,}|gh[pousr]_[A-Za-z0-9]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(bytes.toString()))throw Error('检测到凭据，停止准备：'+relative);
  await mkdir(path.dirname(target),{recursive:true});await copyFile(source,target);manifest.push({path:relative.split(path.sep).join('/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
 }
 for(const entry of entries)await copy(entry);
 await writeFile(path.join(output,'source-manifest.json'),JSON.stringify({purpose:'Public application source; excludes runtime data',files:manifest},null,2)+'\n');
 return {directory:output,fileCount:manifest.length};
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(JSON.stringify(await prepareGitHub()));
